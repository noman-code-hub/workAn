const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const envBaseUrl = (import.meta.env.VITE_API_BASE || '').trim();
const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : '';
const isLocalRuntime = runtimeHost === 'localhost' || runtimeHost === '127.0.0.1';
const fallbackBase = isLocalRuntime ? 'http://localhost:5000' : '';

export const API_BASE = envBaseUrl ? trimTrailingSlash(envBaseUrl) : fallbackBase;

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${normalizedPath}` : normalizedPath;
};

export const parseApiJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text().catch(() => '');
  let parsed: unknown = null;

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error('Invalid JSON:', text);
      throw new Error('Invalid JSON response from API. Verify VITE_API_BASE and backend CORS.');
    }
  }

  if (!response.ok) {
    const payload = parsed as Record<string, unknown> | null;
    const fallbackMessage = typeof payload?.message === 'string'
      ? payload.message
      : typeof payload?.error === 'string'
        ? payload.error
        : typeof payload?.details === 'string'
          ? payload.details
          : text.slice(0, 120);

    if (response.status === 404 && /Requested function was not found/i.test(String(fallbackMessage))) {
      throw new Error('Supabase Edge Function not found. Deploy function "api" or update VITE_API_BASE to the correct function path.');
    }

    throw new Error(`Server returned ${response.status}${fallbackMessage ? `: ${fallbackMessage}` : ''}`);
  }

  return parsed as T;
};
