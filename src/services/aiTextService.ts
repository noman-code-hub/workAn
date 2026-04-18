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

export const improveText = async (payload: ImproveTextPayload): Promise<ImproveTextResult> => {
  const normalizedText = payload.text.trim();
  if (!normalizedText) {
    throw new Error('Enter some text before asking AI to improve it.');
  }

  if (normalizedText.length > AI_IMPROVE_MAX_INPUT_CHARS) {
    throw new Error(`Keep the text under ${AI_IMPROVE_MAX_INPUT_CHARS} characters.`);
  }

  if (!AI_API_BASE) {
    throw new Error('AI improve-text backend is not configured. Set VITE_AI_API_BASE to your FastAPI deployment and redeploy.');
  }

  const requestUrl = aiApiUrl('/ai/improve-text');
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
      typeof window !== 'undefined' &&
      AI_API_BASE.includes('localhost:8000') &&
      /failed to fetch|networkerror|load failed|fetch failed/i.test(message)
    ) {
      throw new Error(
        'AI text improvement is configured to use http://localhost:8000, but that FastAPI service is not reachable. Start the Python AI backend locally or change VITE_AI_API_BASE to a live AI backend.',
      );
    }

    throw new Error(message);
  });

  if (response.status === 405 && typeof window !== 'undefined') {
    try {
      const url = new URL(requestUrl, window.location.origin);
      if (url.origin === window.location.origin) {
        throw new Error(
          'AI improve-text is posting to this frontend app instead of the FastAPI backend. Set VITE_AI_API_BASE to your FastAPI URL, then rebuild and redeploy.',
        );
      }
    } catch {
      // Ignore URL parsing issues and fall through to generic API parsing.
    }
  }

  try {
    return await parseApiJson<ImproveTextResult>(response);
  } catch (error) {
    if (response.status === 404) {
      throw new Error('AI improve-text endpoint was not found. Verify VITE_AI_API_BASE or deploy /ai/improve-text.');
    }
    throw error;
  }
};
