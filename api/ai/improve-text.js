const AI_API_URL =
  process.env.AI_API_BASE ||
  process.env.HUGGINGFACE_INFERENCE_URL ||
  'https://router.huggingface.co/v1/chat/completions';
const AI_MODEL_ID =
  process.env.AI_MODEL ||
  process.env.HUGGINGFACE_MODEL_ID ||
  'meta-llama/Meta-Llama-3-8B-Instruct';
const AI_API_KEY =
  process.env.AI_API_KEY ||
  process.env.HF_TOKEN ||
  process.env.HUGGINGFACE_API_TOKEN ||
  '';
const AI_TEMPERATURE = Number.parseFloat(process.env.AI_TEMPERATURE || '0.7');
const AI_MAX_OUTPUT_TOKENS = Number.parseInt(process.env.AI_MAX_OUTPUT_TOKENS || '450', 10);
const AI_IMPROVE_MAX_INPUT_CHARS = Number.parseInt(process.env.AI_IMPROVE_MAX_INPUT_CHARS || '1000', 10);
const AI_IMPROVE_SYSTEM_PROMPT = [
  'You are a professional resume writer and ATS optimization expert.',
  'Improve the user\'s text to be clear, concise, impactful, and professional.',
  'Use strong action verbs and industry-standard language.',
  'Keep it relevant to resumes and do not invent facts.',
  'Preserve the original meaning while improving the wording.',
].join(' ');

const json = (response, status, payload) => {
  response.status(status).json(payload);
};

const normalizeText = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const buildUserPrompt = (type, text) => {
  switch (type) {
    case 'experience':
      return `Rewrite this job experience professionally with strong action verbs and measurable impact if possible:\n\n${text}`;
    case 'summary':
      return `Rewrite this professional summary to be concise, impactful, and ATS-friendly:\n\n${text}`;
    case 'skills':
      return `Improve and organize these skills into a professional format:\n\n${text}`;
    default:
      return '';
  }
};

const normalizeContent = (content) => {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && typeof item.text === 'string') {
        return item.text;
      }
      return '';
    })
    .join('\n')
    .trim();
};

export default async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    response.setHeader('Allow', 'POST, OPTIONS');
    return response.status(204).end();
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST, OPTIONS');
    return json(response, 405, {
      error: 'Method not allowed',
      message: 'Use POST for the AI improve-text endpoint.',
    });
  }

  if (!AI_API_KEY) {
    console.error('AI_API_KEY is not configured for Vercel improve-text function.');
    return json(response, 503, {
      error: 'AI improve-text unavailable',
      details: 'AI_API_KEY is not configured on the server.',
    });
  }

  const text = normalizeText(request.body?.text);
  const type = normalizeText(request.body?.type);
  const prompt = buildUserPrompt(type, text);

  if (!text) {
    return json(response, 400, {
      error: 'Text is required.',
    });
  }

  if (text.length > AI_IMPROVE_MAX_INPUT_CHARS) {
    return json(response, 400, {
      error: `Keep the text under ${AI_IMPROVE_MAX_INPUT_CHARS} characters.`,
    });
  }

  if (!prompt) {
    return json(response, 422, {
      error: 'Unsupported improve-text type.',
    });
  }

  try {
    const upstreamResponse = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL_ID,
        messages: [
          { role: 'system', content: AI_IMPROVE_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        stream: false,
        max_tokens: AI_MAX_OUTPUT_TOKENS,
        temperature: AI_TEMPERATURE,
      }),
    });

    const payload = await upstreamResponse.json().catch(() => ({}));

    if (!upstreamResponse.ok) {
      const providerMessage =
        payload?.error?.message ||
        payload?.error ||
        payload?.message ||
        `AI provider returned ${upstreamResponse.status}.`;

      console.error('Improve-text error:', upstreamResponse.status, providerMessage);

      return json(response, upstreamResponse.status, {
        error: 'Failed to improve text',
        details: providerMessage,
      });
    }

    const improvedText = normalizeContent(payload?.choices?.[0]?.message?.content);
    if (!improvedText) {
      return json(response, 502, {
        error: 'Failed to improve text',
        details: 'AI provider returned an empty response.',
      });
    }

    return json(response, 200, {
      improved_text: improvedText,
      provider: 'huggingface',
      model: AI_MODEL_ID,
    });
  } catch (error) {
    const details =
      error instanceof Error ? error.message : 'Improve-text request failed.';

    console.error('Improve-text error:', details);

    return json(response, 500, {
      error: 'Failed to improve text',
      details,
    });
  }
}
