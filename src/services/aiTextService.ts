import { parseApiJson } from '../config/api';

export type ImproveTextType = 'summary' | 'experience' | 'skills';

export type ImproveTextPayload = {
  text: string;
  type: ImproveTextType;
};

export type ImproveTextResult = {
  improved_text: string;
};

export const AI_IMPROVE_MAX_INPUT_CHARS = 1000;
const FASTAPI_LOCAL_BASE = 'http://127.0.0.1:8000';
const VERCEL_AI_IMPROVE_PATH = '/api/ai/improve-text';

const normalizeImproveEndpoint = (base: string) => {
  const trimmed = base.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/ai/improve-text') ? trimmed : `${trimmed}/ai/improve-text`;
};

const getImproveTextEndpoints = () => {
  const envBase = (import.meta.env.VITE_AI_API_BASE || '').trim();
  const envEndpoint = normalizeImproveEndpoint(envBase);
  if (envEndpoint) {
    return [envEndpoint];
  }

  if (typeof window !== 'undefined') {
    const isLocalRuntime = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalRuntime && import.meta.env.DEV) {
      return [`${FASTAPI_LOCAL_BASE}/ai/improve-text`];
    }
  }

  return [VERCEL_AI_IMPROVE_PATH];
};

export const improveText = async (payload: ImproveTextPayload): Promise<ImproveTextResult> => {
  const normalizedText = payload.text.trim();
  if (!normalizedText) {
    throw new Error('Enter some text before asking AI to improve it.');
  }

  if (normalizedText.length > AI_IMPROVE_MAX_INPUT_CHARS) {
    throw new Error(`Keep the text under ${AI_IMPROVE_MAX_INPUT_CHARS} characters.`);
  }

  let lastError: Error | null = null;

  for (const requestUrl of getImproveTextEndpoints()) {
    try {
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: normalizedText,
          type: payload.type,
        }),
      }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Failed to reach the AI improve-text service.';

        if (
          requestUrl.includes('127.0.0.1:8000') &&
          /failed to fetch|networkerror|load failed|fetch failed/i.test(message)
        ) {
          throw new Error(
            'AI text improvement is configured to use http://127.0.0.1:8000 in local development, but that FastAPI service is not reachable. Start the Python AI backend locally or set VITE_AI_API_BASE to a live AI backend.',
          );
        }

        throw new Error(message);
      });

      try {
        return await parseApiJson<ImproveTextResult>(response);
      } catch (error) {
        if (response.status === 404) {
          throw new Error('AI improve-text endpoint was not found. Set VITE_AI_API_BASE or deploy /api/ai/improve-text.');
        }
        throw error;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unable to improve the text right now.');
    }
  }

  throw lastError || new Error('Unable to improve the text right now.');
};
