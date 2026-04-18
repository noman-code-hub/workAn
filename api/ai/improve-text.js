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
const AI_IMPROVE_PROMPT_VERSION = 'v3';
const AI_IMPROVE_SYSTEM_PROMPT = [
  'You are a professional resume optimization AI trained to rewrite weak resume sentences into strong, results-driven bullet points.',
  'Your goal is to transform the input into a high-impact resume sentence.',
  'Start with a powerful action verb such as Managed, Developed, Led, Assisted, or Implemented.',
  'Improve clarity and professionalism.',
  'Make it concise and keep it to exactly one sentence.',
  'Use industry-relevant wording and keep it ATS-optimized.',
  'Preserve the original meaning.',
  'Do not hallucinate metrics, achievements, tools, or responsibilities.',
  'If the sentence is too basic, enhance it naturally without adding false claims.',
  'Return only the improved sentence with no explanations, headings, markdown, bullets, or quotation marks.',
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
      return [
        'Rewrite this weak resume sentence into one strong, professional, ATS-friendly sentence.',
        'Keep the original meaning, but make it more polished and results-oriented.',
        'Return only one improved sentence.',
        '',
        text,
      ].join('\n');
    case 'summary':
      return [
        'Rewrite this profile sentence into one concise, professional resume summary sentence.',
        'Avoid first-person phrases like "I", "my", or "my name is".',
        'Keep it polished, ATS-friendly, and natural.',
        'Return only one improved sentence.',
        '',
        text,
      ].join('\n');
    case 'skills':
      return [
        'Rewrite this skills statement into one concise, professional, ATS-friendly sentence.',
        'Return only one improved sentence.',
        '',
        text,
      ].join('\n');
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

const sanitizeImprovedSentence = (value) => {
  const cleaned = String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^[\s>*-]+/, '')
    .replace(/^"+|"+$/g, '')
    .replace(/^'+|'+$/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
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
      improved_text: sanitizeImprovedSentence(improvedText),
      provider: 'huggingface',
      model: AI_MODEL_ID,
      prompt_version: AI_IMPROVE_PROMPT_VERSION,
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
