import { AI_API_BASE, aiApiUrl, parseApiJson } from '../config/api';

export type ImproveTextType = 'summary' | 'experience' | 'skills';

export type ImproveTextPayload = {
  text: string;
  type: ImproveTextType;
};

export type ImproveTextResult = {
  improved_text: string;
};

export const AI_IMPROVE_MAX_INPUT_CHARS = 1000;

const isLocalRuntime = () => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
};

export const improveText = async (payload: ImproveTextPayload): Promise<ImproveTextResult> => {
  const normalizedText = payload.text.trim();
  if (!normalizedText) {
    throw new Error('Enter some text before asking AI to improve it.');
  }

  if (normalizedText.length > AI_IMPROVE_MAX_INPUT_CHARS) {
    throw new Error(`Keep the text under ${AI_IMPROVE_MAX_INPUT_CHARS} characters.`);
  }

  const response = await fetch(aiApiUrl('/ai/improve-text'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: normalizedText,
      type: payload.type,
    }),
  }).catch((error: unknown) => {
    if (!AI_API_BASE && !isLocalRuntime()) {
      throw new Error('AI improve-text backend is not configured. Set VITE_AI_API_BASE to your FastAPI deployment.');
    }

    const message = error instanceof Error ? error.message : 'Failed to reach the AI improve-text service.';
    throw new Error(message);
  });

  try {
    return await parseApiJson<ImproveTextResult>(response);
  } catch (error) {
    if (response.status === 404) {
      throw new Error('AI improve-text endpoint was not found. Verify VITE_AI_API_BASE or deploy /ai/improve-text.');
    }
    throw error;
  }
};
