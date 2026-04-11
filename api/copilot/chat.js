const HUGGINGFACE_API_URL =
  process.env.HUGGINGFACE_INFERENCE_URL ||
  'https://router.huggingface.co/v1/chat/completions';
const HUGGINGFACE_MODEL_ID =
  process.env.HUGGINGFACE_MODEL_ID ||
  'meta-llama/Meta-Llama-3-8B-Instruct';
const HF_TOKEN =
  process.env.HF_TOKEN ||
  process.env.HUGGINGFACE_API_TOKEN ||
  '';

const json = (response, status, payload) => {
  response.status(status).json(payload);
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

const sanitizeMessages = (messages) => {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((message) => message && typeof message === 'object')
    .map((message) => ({
      role: ['user', 'assistant', 'system'].includes(message.role)
        ? message.role
        : 'user',
      content: typeof message.content === 'string' ? message.content.trim() : '',
    }))
    .filter((message) => message.content);
};

const buildSystemPrompt = (userProfile) => {
  const profileContext = [
    userProfile?.name ? `Name: ${userProfile.name}` : null,
    userProfile?.profession ? `Profession: ${userProfile.profession}` : null,
    userProfile?.country ? `Country: ${userProfile.country}` : null,
    Array.isArray(userProfile?.skills) && userProfile.skills.length
      ? `Skills: ${userProfile.skills.slice(0, 10).join(', ')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    role: 'system',
    content: [
      'You are Hirevo AI Career Copilot, a practical and encouraging career assistant.',
      'Give concise, actionable answers focused on jobs, resumes, interviews, career growth, and skills.',
      'Prefer specific next steps over generic motivation.',
      'Use short paragraphs or bullets when useful, but keep replies easy to scan.',
      profileContext ? `User profile:\n${profileContext}` : null,
    ]
      .filter(Boolean)
      .join('\n\n'),
  };
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
      message: 'Use POST for the copilot chat endpoint.',
    });
  }

  if (!HF_TOKEN) {
    console.error('HF_TOKEN is not configured for Vercel copilot function.');
    return json(response, 503, {
      error: 'Copilot service unavailable',
      details: 'HF_TOKEN is not configured on the server.',
    });
  }

  const { messages, userProfile } = request.body || {};
  const conversation = sanitizeMessages(messages);
  const latestUserMessage = [...conversation]
    .reverse()
    .find((message) => message.role === 'user');

  if (!latestUserMessage) {
    return json(response, 400, {
      error: 'A user message is required.',
    });
  }

  try {
    const upstreamResponse = await fetch(HUGGINGFACE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${HF_TOKEN}`,
      },
      body: JSON.stringify({
        model: HUGGINGFACE_MODEL_ID,
        messages: [buildSystemPrompt(userProfile), ...conversation],
        stream: false,
        max_tokens: 900,
        temperature: 0.7,
        top_p: 0.9,
      }),
    });

    const payload = await upstreamResponse.json().catch(() => ({}));

    if (!upstreamResponse.ok) {
      const providerMessage =
        payload?.error?.message ||
        payload?.error ||
        payload?.message ||
        `Hugging Face returned ${upstreamResponse.status}.`;

      console.error('Copilot chat error:', upstreamResponse.status, providerMessage);

      return json(response, upstreamResponse.status, {
        error: 'Failed to generate copilot response',
        details: providerMessage,
      });
    }

    const content = normalizeContent(payload?.choices?.[0]?.message?.content);
    if (!content) {
      return json(response, 502, {
        error: 'Failed to generate copilot response',
        details: 'Hugging Face returned an empty response.',
      });
    }

    return json(response, 200, {
      message: content,
      provider: 'huggingface',
      model: HUGGINGFACE_MODEL_ID,
    });
  } catch (error) {
    const details =
      error instanceof Error ? error.message : 'Chat request failed.';

    console.error('Copilot chat error:', details);

    return json(response, 500, {
      error: 'Failed to generate copilot response',
      details,
    });
  }
}
