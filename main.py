import asyncio
import hashlib
import logging
import os
import time
from dataclasses import dataclass
from typing import Dict, List, Literal

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

HF_INFERENCE_API_URL = "https://api-inference.huggingface.co/meta-llama/Meta-Llama-3-8B-Instruct"
HF_CHAT_SYSTEM_PROMPT = (
    "You are a professional AI career assistant that helps users build resumes, "
    "optimize CVs, suggest keywords, and prepare for jobs."
)
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 5
REQUEST_TIMEOUT_SECONDS = 30

AI_API_BASE = os.getenv(
    "AI_API_BASE",
    "https://router.huggingface.co/v1/chat/completions",
).strip()
AI_MODEL = os.getenv("AI_MODEL", "meta-llama/Meta-Llama-3-8B-Instruct").strip()
AI_TIMEOUT_SECONDS = float(os.getenv("AI_TIMEOUT_SECONDS", "15"))
AI_TEMPERATURE = float(os.getenv("AI_TEMPERATURE", "0.7"))
AI_MAX_OUTPUT_TOKENS = int(os.getenv("AI_MAX_OUTPUT_TOKENS", "450"))
AI_IMPROVE_MAX_INPUT_CHARS = int(os.getenv("AI_IMPROVE_MAX_INPUT_CHARS", "1000"))
AI_IMPROVE_RATE_LIMIT_PER_MINUTE = int(
    os.getenv("AI_IMPROVE_RATE_LIMIT_PER_MINUTE", "12")
)
AI_IMPROVE_CACHE_TTL_SECONDS = int(os.getenv("AI_IMPROVE_CACHE_TTL_SECONDS", "900"))
AI_IMPROVE_PROMPT_VERSION = "v2"
AI_IMPROVE_SYSTEM_PROMPT = (
    "You are a professional resume writer and ATS optimization expert. "
    "Improve the user's text to be clear, concise, impactful, and professional. "
    "Use strong action verbs and industry-standard language. Keep it relevant to resumes. "
    "Do not add fake information. Keep the same meaning but improve wording. "
    "Return only the final rewritten text. Do not include headings, introductions, "
    "explanations, markdown, bold formatting, or quotation marks."
)
AI_IMPROVE_USER_PROMPTS = {
    "experience": (
        "Rewrite this job experience so it is easy to read, professional, and "
        "resume-ready. Keep it concise and polished. Return only the improved "
        "experience text with no heading or extra commentary.\n\n{text}"
    ),
    "summary": (
        "Rewrite this into a short, easy-to-read, professional resume summary. "
        "Avoid first-person phrases like 'I am' or 'my name is'. Keep it natural, "
        "polished, and ATS-friendly. Return only the final summary paragraph with "
        "no heading or extra commentary.\n\n{text}"
    ),
    "skills": (
        "Rewrite these skills into a clean, professional, easy-to-read resume "
        "format. Return only the improved skills text with no heading or extra "
        "commentary.\n\n{text}"
    ),
}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

conversation_history: List[Dict[str, str]] = []


@dataclass
class CachedImproveText:
    improved_text: str
    expires_at: float


class ImproveTextRequest(BaseModel):
    text: str = Field(min_length=1, max_length=AI_IMPROVE_MAX_INPUT_CHARS)
    type: Literal["summary", "experience", "skills"]

    @field_validator("text", mode="before")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        text = str(value or "").strip()
        if not text:
            raise ValueError("Text is required.")
        return text


class ImproveTextResponse(BaseModel):
    improved_text: str


improve_text_cache: Dict[str, CachedImproveText] = {}
improve_text_rate_limit: Dict[str, List[float]] = {}
improve_text_lock = asyncio.Lock()


def get_hf_token() -> str | None:
    token = os.getenv("HF_TOKEN", "").strip()
    if token:
        return token

    logger.error(
        "HF_TOKEN is not configured. Set HF_TOKEN in the environment or a local .env file before starting the chatbot API."
    )
    return None


def get_ai_api_key() -> str | None:
    token = (
        os.getenv("AI_API_KEY", "").strip()
        or os.getenv("HF_TOKEN", "").strip()
    )
    if token:
        return token

    logger.error(
        "AI_API_KEY is not configured. Set AI_API_KEY in the environment or a local .env file before using /ai/improve-text."
    )
    return None


def format_conversation_for_api(
    history: List[Dict[str, str]],
    new_message: str,
) -> List[Dict[str, str]]:
    formatted = [{"role": "system", "content": HF_CHAT_SYSTEM_PROMPT}]
    formatted.extend(history[-5:])
    formatted.append({"role": "user", "content": new_message})
    return formatted


def build_improve_prompt(text_type: str, text: str) -> str:
    template = AI_IMPROVE_USER_PROMPTS.get(text_type)
    if not template:
        raise HTTPException(status_code=422, detail="Unsupported improve-text type.")
    return template.format(text=text)


def derive_client_id(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded_for.split(",")[0].strip() if forwarded_for else ""
    fallback_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    fingerprint = f"{client_ip or fallback_ip}|{user_agent}"
    return hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()


def build_improve_cache_key(text_type: str, text: str) -> str:
    payload = (
        f"{AI_IMPROVE_PROMPT_VERSION}\n{AI_MODEL}\n{text_type}\n{text}"
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def extract_chat_completion_text(payload: dict) -> str:
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""

    message = choices[0].get("message", {})
    content = message.get("content")
    if isinstance(content, str):
        return content.strip()

    if isinstance(content, list):
        parts: List[str] = []
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                text = part.get("text")
                if isinstance(text, str) and text.strip():
                    parts.append(text.strip())
        return "\n".join(parts).strip()

    return ""


async def get_cached_improvement(cache_key: str) -> str | None:
    now = time.time()
    async with improve_text_lock:
        cached = improve_text_cache.get(cache_key)
        if not cached:
            return None
        if cached.expires_at <= now:
            improve_text_cache.pop(cache_key, None)
            return None
        return cached.improved_text


async def set_cached_improvement(cache_key: str, improved_text: str) -> None:
    expires_at = time.time() + AI_IMPROVE_CACHE_TTL_SECONDS
    async with improve_text_lock:
        improve_text_cache[cache_key] = CachedImproveText(
            improved_text=improved_text,
            expires_at=expires_at,
        )


async def enforce_improve_rate_limit(client_id: str) -> None:
    now = time.time()
    window_start = now - 60

    async with improve_text_lock:
        recent_attempts = [
            timestamp
            for timestamp in improve_text_rate_limit.get(client_id, [])
            if timestamp >= window_start
        ]

        if len(recent_attempts) >= AI_IMPROVE_RATE_LIMIT_PER_MINUTE:
            logger.error("Improve text rate limit exceeded for client %s.", client_id)
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please wait a moment and try again.",
            )

        recent_attempts.append(now)
        improve_text_rate_limit[client_id] = recent_attempts


async def query_huggingface_api(payload: dict):
    hf_token = get_hf_token()
    if not hf_token:
        raise HTTPException(
            status_code=500,
            detail="HF_TOKEN is not configured.",
        )

    headers = {"Authorization": f"Bearer {hf_token}"}
    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    HF_INFERENCE_API_URL,
                    headers=headers,
                    json=payload,
                    timeout=REQUEST_TIMEOUT_SECONDS,
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as error:
            if (
                error.response.status_code == 503
                and "is currently loading" in error.response.text
            ):
                logger.warning(
                    "Model is loading. Retrying in %s seconds... (Attempt %s/%s)",
                    RETRY_DELAY_SECONDS,
                    attempt + 1,
                    MAX_RETRIES,
                )
                await asyncio.sleep(RETRY_DELAY_SECONDS)
                continue

            logger.error("HTTP Status Error: %s", error)
            raise HTTPException(
                status_code=error.response.status_code,
                detail=f"Hugging Face API error: {error.response.text}",
            ) from error
        except httpx.RequestError as error:
            logger.error("Request Error: %s", error)
            if attempt < MAX_RETRIES - 1:
                logger.warning(
                    "Request failed. Retrying... (Attempt %s/%s)",
                    attempt + 1,
                    MAX_RETRIES,
                )
                await asyncio.sleep(RETRY_DELAY_SECONDS)
                continue
            raise HTTPException(
                status_code=504,
                detail=f"Request to Hugging Face API timed out: {error}",
            ) from error

    raise HTTPException(
        status_code=503,
        detail="Model is unavailable after multiple retries.",
    )


async def request_improved_text(text_type: str, text: str, client_id: str) -> str:
    api_key = get_ai_api_key()
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="AI_API_KEY is not configured.",
        )

    normalized_text = text.strip()
    cache_key = build_improve_cache_key(text_type, normalized_text)
    cached_value = await get_cached_improvement(cache_key)
    if cached_value is not None:
        return cached_value

    await enforce_improve_rate_limit(client_id)

    payload = {
        "model": AI_MODEL,
        "messages": [
            {"role": "system", "content": AI_IMPROVE_SYSTEM_PROMPT},
            {"role": "user", "content": build_improve_prompt(text_type, normalized_text)},
        ],
        "temperature": AI_TEMPERATURE,
        "max_tokens": AI_MAX_OUTPUT_TOKENS,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    timeout = httpx.Timeout(
        AI_TIMEOUT_SECONDS,
        connect=min(AI_TIMEOUT_SECONDS, 5.0),
    )

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(AI_API_BASE, headers=headers, json=payload)
            response.raise_for_status()
    except httpx.TimeoutException as error:
        logger.error("Improve text request timed out after %ss.", AI_TIMEOUT_SECONDS)
        raise HTTPException(
            status_code=504,
            detail="The AI provider timed out while improving text.",
        ) from error
    except httpx.HTTPStatusError as error:
        status_code = error.response.status_code
        details = error.response.text[:500]
        if status_code in {401, 403}:
            logger.error("AI provider authentication failed: %s", details)
            raise HTTPException(
                status_code=502,
                detail="AI provider authentication failed.",
            ) from error

        logger.error(
            "AI provider returned %s for improve text: %s",
            status_code,
            details,
        )
        raise HTTPException(
            status_code=502,
            detail="AI provider request failed while improving text.",
        ) from error
    except httpx.RequestError as error:
        logger.error("Unable to reach AI provider: %s", error)
        raise HTTPException(
            status_code=502,
            detail="Unable to reach the AI provider.",
        ) from error

    try:
        response_data = response.json()
    except ValueError as error:
        logger.error("AI provider returned invalid JSON for improve text.")
        raise HTTPException(
            status_code=502,
            detail="AI provider returned invalid JSON.",
        ) from error

    improved_text = extract_chat_completion_text(response_data)
    if not improved_text:
        logger.error("AI provider returned empty content for improve text.")
        raise HTTPException(
            status_code=502,
            detail="AI provider returned an empty response.",
        )

    await set_cached_improvement(cache_key, improved_text)
    return improved_text


@app.post("/chat")
async def chat(request: Request):
    try:
        data = await request.json()
        user_message = data.get("message")

        if not user_message:
            raise HTTPException(status_code=400, detail="Message field is required.")

        api_payload_messages = format_conversation_for_api(
            conversation_history,
            user_message,
        )
        payload = {
            "inputs": api_payload_messages,
            "parameters": {
                "max_new_tokens": 512,
                "return_full_text": False,
            },
        }

        api_response = await query_huggingface_api(payload)
        if (
            api_response
            and isinstance(api_response, list)
            and api_response[0].get("generated_text")
        ):
            ai_reply = api_response[0]["generated_text"].strip()
        else:
            logger.error("Unexpected API response format: %s", api_response)
            raise HTTPException(status_code=500, detail="Failed to parse AI response.")

        conversation_history.append({"role": "user", "content": user_message})
        conversation_history.append({"role": "assistant", "content": ai_reply})

        return {"reply": ai_reply}
    except HTTPException:
        raise
    except Exception as error:
        logger.error("An unexpected error occurred: %s", error)
        raise HTTPException(
            status_code=500,
            detail="An internal server error occurred.",
        ) from error


@app.post("/ai/improve-text", response_model=ImproveTextResponse)
async def improve_text(payload: ImproveTextRequest, request: Request):
    improved_text = await request_improved_text(
        payload.type,
        payload.text,
        derive_client_id(request),
    )
    return ImproveTextResponse(improved_text=improved_text)


@app.get("/")
def read_root():
    return {"status": "Chatbot API is running."}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
