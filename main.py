import asyncio
import logging
import os
from typing import Dict, List

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

# --- Basic Setup ---
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Environment & Constants ---
HF_TOKEN = os.getenv("HF_TOKEN")
API_URL = "https://api-inference.huggingface.co/meta-llama/Meta-Llama-3-8B-Instruct"
SYSTEM_PROMPT = "You are a professional AI career assistant that helps users build resumes, optimize CVs, suggest keywords, and prepare for jobs."
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 5
REQUEST_TIMEOUT_SECONDS = 30

# --- FastAPI App Initialization ---
app = FastAPI()

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for simplicity, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-memory Conversation History (for demonstration) ---
conversation_history: List[Dict[str, str]] = []

# --- Helper Functions ---
def format_conversation_for_api(history: List[Dict[str, str]], new_message: str) -> List[Dict[str, str]]:
    """Formats the conversation history and new message for the Hugging Face API."""
    # Add the system prompt at the beginning of the conversation
    formatted = [{"role": "system", "content": SYSTEM_PROMPT}]
    # Add the last 5 messages from history
    formatted.extend(history[-5:])
    # Add the new user message
    formatted.append({"role": "user", "content": new_message})
    return formatted

async def query_huggingface_api(payload: dict):
    """Sends a request to the Hugging Face Inference API with retry logic."""
    if not HF_TOKEN:
        logger.error(
            "HF_TOKEN is not configured. Set HF_TOKEN in the environment or a local .env file before starting the chatbot API."
        )
        raise HTTPException(
            status_code=500,
            detail="HF_TOKEN is not configured.",
        )

    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(API_URL, headers=headers, json=payload, timeout=REQUEST_TIMEOUT_SECONDS)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 503 and "is currently loading" in e.response.text:
                logging.warning(f"Model is loading. Retrying in {RETRY_DELAY_SECONDS} seconds... (Attempt {attempt + 1}/{MAX_RETRIES})")
                await asyncio.sleep(RETRY_DELAY_SECONDS)
                continue
            logging.error(f"HTTP Status Error: {e}")
            raise HTTPException(status_code=e.response.status_code, detail=f"Hugging Face API error: {e.response.text}")
        except httpx.RequestError as e:
            logging.error(f"Request Error: {e}")
            if attempt < MAX_RETRIES - 1:
                logging.warning(f"Request failed. Retrying... (Attempt {attempt + 1}/{MAX_RETRIES})")
                await asyncio.sleep(RETRY_DELAY_SECONDS)
                continue
            raise HTTPException(status_code=504, detail=f"Request to Hugging Face API timed out: {e}")
    raise HTTPException(status_code=503, detail="Model is unavailable after multiple retries.")


# --- API Endpoints ---
@app.post("/chat")
async def chat(request: Request):
    """
    Receives a user message, maintains conversation history,
    and returns a response from the AI model.
    """
    try:
        data = await request.json()
        user_message = data.get("message")

        if not user_message:
            raise HTTPException(status_code=400, detail="Message field is required.")

        # Format conversation for the API
        api_payload_messages = format_conversation_for_api(conversation_history, user_message)
        
        payload = {
            "inputs": api_payload_messages,
            "parameters": {
                "max_new_tokens": 512,
                "return_full_text": False,
            }
        }

        # Query the model
        api_response = await query_huggingface_api(payload)
        
        # Extract the generated text
        # The response structure can vary, adjust this based on the actual model output
        if api_response and isinstance(api_response, list) and api_response[0].get("generated_text"):
            ai_reply = api_response[0]["generated_text"].strip()
        else:
            logging.error(f"Unexpected API response format: {api_response}")
            raise HTTPException(status_code=500, detail="Failed to parse AI response.")

        # Update conversation history
        conversation_history.append({"role": "user", "content": user_message})
        conversation_history.append({"role": "assistant", "content": ai_reply})

        return {"reply": ai_reply}

    except HTTPException as e:
        # Re-raise HTTPException to let FastAPI handle it
        raise e
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")

@app.get("/")
def read_root():
    return {"status": "Chatbot API is running."}

# --- Running the App (for local development) ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
