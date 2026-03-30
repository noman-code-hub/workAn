const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const DEFAULT_PROD_API_BASE = 'https://bwrircyazzakdstjapxq.supabase.co/functions/v1/api';
const LOCAL_API_PREFIX = '/api';
const LOCAL_NODE_API_BASE = 'http://localhost:5000/api';

const ensureApiBase = (value: string) => {
  const trimmed = trimTrailingSlash(value);
  if (!trimmed) return trimmed;

  try {
    const url = new URL(trimmed);
    const isLocalApiHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (!isLocalApiHost) return trimmed;
    if (url.pathname === LOCAL_API_PREFIX || url.pathname.startsWith(`${LOCAL_API_PREFIX}/`)) {
      return trimmed;
    }
    return `${trimmed}${LOCAL_API_PREFIX}`;
  } catch {
    return trimmed;
  }
};

const envBaseUrl = (import.meta.env.VITE_API_BASE || '').trim();
const envPdfBaseUrl = (import.meta.env.VITE_PDF_API_BASE || '').trim();
const envSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const derivedSupabaseApiBase = envSupabaseUrl
  ? `${trimTrailingSlash(envSupabaseUrl)}/functions/v1/api`
  : '';
const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : '';
const isLocalRuntime = runtimeHost === 'localhost' || runtimeHost === '127.0.0.1';
const isLocalDevRuntime = isLocalRuntime && import.meta.env.DEV;
const fallbackBase = isLocalRuntime
  ? LOCAL_NODE_API_BASE
  : (derivedSupabaseApiBase || DEFAULT_PROD_API_BASE);
const localPdfBase = isLocalDevRuntime ? LOCAL_API_PREFIX : LOCAL_NODE_API_BASE;

export const API_BASE = envBaseUrl ? ensureApiBase(envBaseUrl) : fallbackBase;
export const PDF_API_BASE = envPdfBaseUrl
  ? ensureApiBase(envPdfBaseUrl)
  : (isLocalRuntime ? localPdfBase : API_BASE);

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${normalizedPath}` : normalizedPath;
};

export const pdfApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return PDF_API_BASE ? `${PDF_API_BASE}${normalizedPath}` : normalizedPath;
};

export const parseApiJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text().catch(() => '');
  let parsed: unknown = null;

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error('Invalid JSON:', text);
      const trimmed = text.trim().toLowerCase();
      const looksLikeHtml = trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html');
      const looksLikeVercelNotFound =
        trimmed.includes('the page could not be found') ||
        trimmed.includes('not_found');
      if (looksLikeHtml) {
        throw new Error('Received HTML instead of JSON. Verify VITE_API_BASE points to your backend API endpoint.');
      }
      if (looksLikeVercelNotFound) {
        throw new Error('Received Vercel NOT_FOUND instead of API JSON. Verify VITE_API_BASE points to Supabase Functions.');
      }
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
