import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AlertCircle, ArrowLeft, Pencil, Settings, Trash2, Zap } from 'lucide-react';
import axios, { type AxiosResponse } from 'axios';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useResumeTemplate } from '../hooks/useResumeTemplate';
import { normalizeFieldKey, renderTemplateWithSchema } from '../services/resumeTemplateRenderer';
import { API_BASE, apiUrl, pdfApiUrl } from '../config/api';
import { AppLoader } from '../components/AppLoader';
import { RichTextEditor } from '../components/RichTextEditor';
import { ImageCropModal } from '../components/ImageCropModal';
import { ImproveTextAction } from '../components/resume/ImproveTextAction';
import { buildResumePdfHtml } from '../utils/resumePdfExport';

const RESUME_VIEW_STORAGE_KEY = 'careerpilot:resume-view';
const RESUME_UPLOAD_TIMEOUT_MS = Number(import.meta.env.VITE_RESUME_UPLOAD_TIMEOUT_MS || 90000);
const EXPLICIT_PDF_API_BASE = (import.meta.env.VITE_PDF_API_BASE || '').trim();
const LOCAL_PDF_ENDPOINT = 'http://localhost:5000/api/render-resume-pdf';
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;
const PAGE_SIZES = {
  a4: { label: 'A4', width: 794, height: 1123 },
  letter: { label: 'Letter', width: 816, height: 1056 },
} as const;
type PreviewPageSize = keyof typeof PAGE_SIZES;
const ENABLE_PREVIEW_PAGINATION = false;
const PAGE_GAP_PX = 24;
const PREVIEW_FONT_SCALES = [1, 0.93, 0.86, 0.79, 0.75];
const getPreviewDocumentSize = (doc: Document, fallback: { width: number; height: number }) => {
  const fitManagedRoot = doc.querySelector<HTMLElement>('[data-preview-fit-managed="true"]');
  if (fitManagedRoot) {
    const rect = fitManagedRoot.getBoundingClientRect();
    const width = Math.max(
      fitManagedRoot.scrollWidth || 0,
      fitManagedRoot.offsetWidth || 0,
      rect.width || 0
    );
    const height = Math.max(
      fitManagedRoot.scrollHeight || 0,
      fitManagedRoot.offsetHeight || 0,
      rect.height || 0
    );

    if (width > 0 && height > 0) {
      return {
        width: Math.ceil(width),
        height: Math.ceil(height),
      };
    }
  }

  const root = doc.documentElement;
  const body = doc.body;

  const width = Math.max(
    fallback.width,
    root?.scrollWidth ?? 0,
    root?.offsetWidth ?? 0,
    body?.scrollWidth ?? 0,
    body?.offsetWidth ?? 0
  );

  const height = Math.max(
    fallback.height,
    root?.scrollHeight ?? 0,
    root?.offsetHeight ?? 0,
    body?.scrollHeight ?? 0,
    body?.offsetHeight ?? 0
  );

  return {
    width: Math.ceil(width),
    height: Math.ceil(height),
  };
};
const TEMPLATE_COLOR_PRESETS = [
  { id: 'gold', label: 'Gold', accent: '#c3aa72' },
  { id: 'navy', label: 'Navy', accent: '#1d4d8f' },
  { id: 'emerald', label: 'Emerald', accent: '#0f8b6d' },
  { id: 'burgundy', label: 'Burgundy', accent: '#8b3a4b' },
] as const;
const CLASSIC_PORTRAIT_TEMPLATE_SLUG = 'classic-portrait-sidebar';
const CLASSIC_TEMPLATE_STYLE_TAG_ID = 'hirevo-classic-template-customization';
const CLASSIC_TEMPLATE_FONT_OPTIONS = [
  { label: 'Cormorant Garamond', value: '"Cormorant Garamond", Georgia, "Times New Roman", serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Arial', value: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", "Segoe UI", sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
] as const;
const CLASSIC_TEMPLATE_FONT_OPTION_SET = new Set<string>(
  CLASSIC_TEMPLATE_FONT_OPTIONS.map((option) => option.value)
);
const CLASSIC_TEMPLATE_WEIGHT_OPTIONS = [300, 400, 500, 600, 700, 800] as const;
const CLASSIC_TEMPLATE_NUMBER_LIMITS = {
  bodyFontSize: { min: 10, max: 18 },
  bodyFontWeight: { min: 300, max: 800 },
  headingFontWeight: { min: 300, max: 800 },
  h1Size: { min: 24, max: 44 },
  h2Size: { min: 20, max: 34 },
  h3Size: { min: 16, max: 28 },
  h4Size: { min: 14, max: 24 },
  h5Size: { min: 12, max: 20 },
  h6Size: { min: 10, max: 18 },
} as const;
const CLASSIC_TEMPLATE_HEADING_FIELDS = [
  { key: 'h1Size', label: 'H1', note: 'Largest rich-text heading' },
  { key: 'h2Size', label: 'H2', note: 'Large rich-text heading' },
  { key: 'h3Size', label: 'H3', note: 'Medium rich-text heading' },
  { key: 'h4Size', label: 'H4', note: 'Supporting rich-text heading' },
  { key: 'h5Size', label: 'H5', note: 'Small rich-text heading' },
  { key: 'h6Size', label: 'H6', note: 'Compact rich-text heading' },
] as const;
const DEFAULT_CUSTOM_TEMPLATE_COLOR = '#c3aa72';
const SECTION_RICH_TEXT_TOOLBAR_HOST_ID = 'resume-section-rich-text-toolbar';
type TemplateColorPresetId = (typeof TEMPLATE_COLOR_PRESETS)[number]['id'] | 'custom';
type ClassicTemplateHeadingKey = (typeof CLASSIC_TEMPLATE_HEADING_FIELDS)[number]['key'];
type ClassicTemplateStyleSettings = {
  bodyFontFamily: string;
  headingFontFamily: string;
  textColor: string;
  headingColor: string;
  highlightColor: string;
  bodyFontSize: number;
  bodyFontWeight: number;
  headingFontWeight: number;
  h1Size: number;
  h2Size: number;
  h3Size: number;
  h4Size: number;
  h5Size: number;
  h6Size: number;
};
type ClassicTemplateStyleColorKey = 'textColor' | 'headingColor' | 'highlightColor';
type ClassicTemplateStyleFontKey = 'bodyFontFamily' | 'headingFontFamily';
type ClassicTemplateStyleNumberKey = keyof typeof CLASSIC_TEMPLATE_NUMBER_LIMITS;
type RichTextLineStyle = {
  text: string;
  fontSize: string;
};
type ExperienceItem = {
  id: string;
  company: string;
  role: string;
  dates: string;
  details: string;
};
type EducationItem = {
  id: string;
  school: string;
  degree: string;
  dates: string;
  details: string;
};
const CLASSIC_TEMPLATE_HEADING_KEYS = CLASSIC_TEMPLATE_HEADING_FIELDS.map((field) => field.key) as ClassicTemplateHeadingKey[];
const DEFAULT_CLASSIC_TEMPLATE_STYLE_SETTINGS: ClassicTemplateStyleSettings = {
  bodyFontFamily: '"Cormorant Garamond", Georgia, "Times New Roman", serif',
  headingFontFamily: '"Cormorant Garamond", Georgia, "Times New Roman", serif',
  textColor: '#232323',
  headingColor: '#1c1c1c',
  highlightColor: '#f4dfa2',
  bodyFontSize: 13.5,
  bodyFontWeight: 400,
  headingFontWeight: 600,
  h1Size: 34,
  h2Size: 24,
  h3Size: 18,
  h4Size: 16,
  h5Size: 14.5,
  h6Size: 12.5,
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const roundHalfStep = (value: number) => Math.round(value * 2) / 2;

const normalizeHexColor = (value: string, fallback: string) => {
  const trimmed = value.trim();
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed : fallback;
};

const normalizeClassicTemplateHeadingSizes = (
  settings: ClassicTemplateStyleSettings
) => {
  const next = { ...settings };
  const sortedHeadingValues = CLASSIC_TEMPLATE_HEADING_KEYS
    .map((key) => next[key])
    .sort((left, right) => right - left);

  CLASSIC_TEMPLATE_HEADING_KEYS.forEach((key, index) => {
    const limit = CLASSIC_TEMPLATE_NUMBER_LIMITS[key];
    const previousKey = CLASSIC_TEMPLATE_HEADING_KEYS[index - 1];
    const previousValue = previousKey ? next[previousKey] : limit.max;
    const safeMax = Math.min(limit.max, previousValue);
    const fallback = clampNumber(DEFAULT_CLASSIC_TEMPLATE_STYLE_SETTINGS[key], limit.min, safeMax);
    const sourceValue = sortedHeadingValues[index] ?? fallback;
    next[key] = roundHalfStep(clampNumber(sourceValue, limit.min, safeMax));
  });

  return next;
};

const applyClassicTemplateHeadingSizeChange = (
  settings: ClassicTemplateStyleSettings,
  key: ClassicTemplateHeadingKey,
  value: number
) => {
  const next = { ...settings };
  const limit = CLASSIC_TEMPLATE_NUMBER_LIMITS[key];
  next[key] = roundHalfStep(clampNumber(value, limit.min, limit.max));

  const changedIndex = CLASSIC_TEMPLATE_HEADING_KEYS.indexOf(key);

  for (let index = changedIndex - 1; index >= 0; index -= 1) {
    const currentKey = CLASSIC_TEMPLATE_HEADING_KEYS[index];
    const lowerKey = CLASSIC_TEMPLATE_HEADING_KEYS[index + 1];
    const currentLimit = CLASSIC_TEMPLATE_NUMBER_LIMITS[currentKey];
    next[currentKey] = roundHalfStep(
      clampNumber(
        Math.max(next[currentKey], next[lowerKey]),
        currentLimit.min,
        currentLimit.max
      )
    );
  }

  for (let index = changedIndex + 1; index < CLASSIC_TEMPLATE_HEADING_KEYS.length; index += 1) {
    const currentKey = CLASSIC_TEMPLATE_HEADING_KEYS[index];
    const upperKey = CLASSIC_TEMPLATE_HEADING_KEYS[index - 1];
    const currentLimit = CLASSIC_TEMPLATE_NUMBER_LIMITS[currentKey];
    const safeMax = Math.min(currentLimit.max, next[upperKey]);
    next[currentKey] = roundHalfStep(
      clampNumber(
        Math.min(next[currentKey], next[upperKey]),
        currentLimit.min,
        safeMax
      )
    );
  }

  return next;
};

const sanitizeClassicTemplateStyleSettings = (value: unknown): ClassicTemplateStyleSettings => {
  const next = { ...DEFAULT_CLASSIC_TEMPLATE_STYLE_SETTINGS };
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return next;
  }

  const raw = value as Partial<ClassicTemplateStyleSettings>;
  if (
    typeof raw.bodyFontFamily === 'string'
    && CLASSIC_TEMPLATE_FONT_OPTION_SET.has(raw.bodyFontFamily)
  ) {
    next.bodyFontFamily = raw.bodyFontFamily;
  }
  if (
    typeof raw.headingFontFamily === 'string'
    && CLASSIC_TEMPLATE_FONT_OPTION_SET.has(raw.headingFontFamily)
  ) {
    next.headingFontFamily = raw.headingFontFamily;
  }

  next.textColor = normalizeHexColor(raw.textColor || '', next.textColor);
  next.headingColor = normalizeHexColor(raw.headingColor || '', next.headingColor);
  next.highlightColor = normalizeHexColor(raw.highlightColor || '', next.highlightColor);

  (Object.keys(CLASSIC_TEMPLATE_NUMBER_LIMITS) as ClassicTemplateStyleNumberKey[]).forEach((key) => {
    const limit = CLASSIC_TEMPLATE_NUMBER_LIMITS[key];
    const rawValue = raw[key];
    if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) return;
    next[key] = roundHalfStep(clampNumber(rawValue, limit.min, limit.max)) as never;
  });

  return normalizeClassicTemplateHeadingSizes(next);
};

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = normalizeHexColor(hex, DEFAULT_CUSTOM_TEMPLATE_COLOR);
  const safeAlpha = clampNumber(alpha, 0, 1);
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`;
};

const injectStyleIntoHtmlHead = (html: string, styleId: string, cssText: string) => {
  const styleTag = `<style id="${styleId}">\n${cssText}\n</style>`;
  const existingStyleRegex = new RegExp(`<style id="${styleId}">[\\s\\S]*?<\\/style>`, 'i');

  if (existingStyleRegex.test(html)) {
    return html.replace(existingStyleRegex, styleTag);
  }
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${styleTag}\n</head>`);
  }
  return `${styleTag}\n${html}`;
};

const applyClassicTemplateCustomization = (
  html: string,
  templateSlug: string,
  accentColor: string,
  settings: ClassicTemplateStyleSettings
) => {
  if (templateSlug !== CLASSIC_PORTRAIT_TEMPLATE_SLUG) return html;

  const sanitized = sanitizeClassicTemplateStyleSettings(settings);
  const accent = normalizeHexColor(accentColor, DEFAULT_CUSTOM_TEMPLATE_COLOR);
  const accentSoft = hexToRgba(accent, 0.16);
  const accentStrong = hexToRgba(accent, 0.28);

  const cssText = `
body {
  padding: 0 !important;
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] {
  --hirevo-accent-color: ${accent};
  --hirevo-accent-soft: ${accentSoft};
  --hirevo-accent-strong: ${accentStrong};
  --hirevo-body-font: ${sanitized.bodyFontFamily};
  --hirevo-heading-font: ${sanitized.headingFontFamily};
  --hirevo-text-color: ${sanitized.textColor};
  --hirevo-heading-color: ${sanitized.headingColor};
  --hirevo-highlight-color: ${sanitized.highlightColor};
  --hirevo-body-size: ${sanitized.bodyFontSize}px;
  --hirevo-body-weight: ${sanitized.bodyFontWeight};
  --hirevo-heading-weight: ${sanitized.headingFontWeight};
  --hirevo-h1-size: ${sanitized.h1Size}px;
  --hirevo-h2-size: ${sanitized.h2Size}px;
  --hirevo-h3-size: ${sanitized.h3Size}px;
  --hirevo-h4-size: ${sanitized.h4Size}px;
  --hirevo-h5-size: ${sanitized.h5Size}px;
  --hirevo-h6-size: ${sanitized.h6Size}px;
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .resume-content {
  color: var(--hirevo-text-color) !important;
  font-family: var(--hirevo-body-font) !important;
  padding-left: max(12px, calc(var(--page-pad-x) - 2.5mm)) !important;
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .body-copy,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .summary-copy,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .cert-copy,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .project-copy,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .skill-copy,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .education-school,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .education-highlight,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .contact-copy,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .language-copy,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .personal-copy,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .reference-meta,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .experience-list li,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .fallback-bullets li,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext {
  font-family: var(--hirevo-body-font) !important;
  font-size: var(--hirevo-body-size) !important;
  font-weight: var(--hirevo-body-weight) !important;
  color: var(--hirevo-text-color) !important;
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext p,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext li,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext span,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext strong,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext em,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext u,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext s,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext mark {
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  color: inherit;
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .header-name,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .header-role,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .section-title,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .experience-role,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .experience-company,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .experience-date,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .education-date,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .education-degree,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .reference-name,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext h1,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext h2,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext h3,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext h4,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext h5,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext h6 {
  font-family: var(--hirevo-heading-font);
  color: var(--hirevo-heading-color);
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .header-name {
  font-weight: var(--hirevo-heading-weight) !important;
  line-height: 1.15 !important;
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .header-role {
  font-weight: var(--hirevo-heading-weight) !important;
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .section-title {
  font-weight: var(--hirevo-heading-weight) !important;
  background: var(--hirevo-accent-soft) !important;
  border-left: 3px solid var(--hirevo-accent-color) !important;
  padding-left: 12px !important;
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .experience-role,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .experience-company,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .education-degree,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .reference-name {
  font-weight: var(--hirevo-heading-weight) !important;
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .experience-date,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .education-date {
  font-weight: var(--hirevo-heading-weight) !important;
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .top-divider,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .skill-line {
  border-color: var(--hirevo-accent-color) !important;
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .photo-shell {
  background: var(--hirevo-accent-strong) !important;
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext mark {
  background: var(--hirevo-highlight-color);
  color: inherit;
  padding: 0 0.14em;
  border-radius: 0.18em;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext h1,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext h2,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext h3,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext h4,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext h5,
[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext h6 {
  margin: 0 0 0.35em;
  line-height: 1.2;
  font-weight: var(--hirevo-heading-weight);
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext h1 {
  font-size: var(--hirevo-h1-size);
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext h2 {
  font-size: var(--hirevo-h2-size);
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext h3 {
  font-size: var(--hirevo-h3-size);
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext h4 {
  font-size: var(--hirevo-h4-size);
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext h5 {
  font-size: var(--hirevo-h5-size);
}

[data-template-slug="${CLASSIC_PORTRAIT_TEMPLATE_SLUG}"] .content-richtext h6 {
  font-size: var(--hirevo-h6-size);
}
`;

  return injectStyleIntoHtmlHead(html, CLASSIC_TEMPLATE_STYLE_TAG_ID, cssText);
};

const isLocalHostname = (hostname: string) => hostname === 'localhost' || hostname === '127.0.0.1';

const buildPdfEndpointCandidates = () => {
  const configuredEndpoint = pdfApiUrl('/render-resume-pdf');
  const localRuntime = typeof window !== 'undefined' && isLocalHostname(window.location.hostname);
  const looksLikeSupabaseFunctionEndpoint = /\/functions\/v1\/api\/render-resume-pdf$/i.test(configuredEndpoint);
  const usesSameOriginProxyEndpoint = /^\/api\/render-resume-pdf$/i.test(configuredEndpoint);

  const candidates = [
    ...(configuredEndpoint ? [configuredEndpoint] : []),
    ...(
      !EXPLICIT_PDF_API_BASE
      && localRuntime
      && !usesSameOriginProxyEndpoint
      && !looksLikeSupabaseFunctionEndpoint
      && configuredEndpoint !== LOCAL_PDF_ENDPOINT
        ? [LOCAL_PDF_ENDPOINT]
        : []
    ),
  ];

  return Array.from(new Set(candidates.filter(Boolean)));
};

const toUint8Array = (value: ArrayBuffer | Uint8Array) => {
  if (value instanceof Uint8Array) return value;
  return new Uint8Array(value);
};

const toPdfBlobPart = (bytes: Uint8Array): ArrayBuffer => {
  if (bytes.buffer instanceof ArrayBuffer) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  return Uint8Array.from(bytes).buffer;
};

const hasPdfSignature = (bytes: Uint8Array) =>
  bytes.length >= PDF_SIGNATURE.length
  && PDF_SIGNATURE.every((value, index) => bytes[index] === value);

const parseJsonEncodedPdfBytes = (payload: unknown): Uint8Array | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const numericEntries = Object.entries(payload)
    .filter(([key]) => /^\d+$/.test(key))
    .sort((left, right) => Number(left[0]) - Number(right[0]));

  if (!numericEntries.length) return null;

  const bytes = new Uint8Array(numericEntries.length);
  for (let index = 0; index < numericEntries.length; index += 1) {
    const [key, value] = numericEntries[index];
    if (Number(key) !== index || typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 255) {
      return null;
    }
    bytes[index] = value;
  }

  return hasPdfSignature(bytes) ? bytes : null;
};

const decodePdfResponse = (data: ArrayBuffer | Uint8Array, contentType: string) => {
  const bytes = toUint8Array(data);
  if (hasPdfSignature(bytes)) {
    return new Blob([toPdfBlobPart(bytes)], { type: 'application/pdf' });
  }

  const text = new TextDecoder().decode(bytes).trim();
  const lowerContentType = contentType.toLowerCase();
  const lowerText = text.toLowerCase();
  if (text.startsWith('{') || text.startsWith('[')) {
    const parsed = JSON.parse(text) as { error?: string; details?: string };
    const jsonPdfBytes = parseJsonEncodedPdfBytes(parsed);
    if (jsonPdfBytes) {
      return new Blob([toPdfBlobPart(jsonPdfBytes)], { type: 'application/pdf' });
    }

    throw new Error(parsed.details || parsed.error || 'PDF service returned JSON instead of a PDF file.');
  }

  const looksLikeHtml = lowerContentType.includes('text/html')
    || lowerText.startsWith('<!doctype html')
    || lowerText.startsWith('<html');
  if (looksLikeHtml) {
    const localRuntime = typeof window !== 'undefined' && isLocalHostname(window.location.hostname);
    if (localRuntime) {
      throw new Error('PDF request returned HTML instead of a PDF. Restart the frontend dev server so the /api proxy in vite.config.ts is active, then refresh and try again.');
    }
    throw new Error('PDF service returned HTML instead of a PDF file.');
  }

  const contentTypeHint = contentType ? ` (${contentType})` : '';
  throw new Error(`PDF service returned an invalid document${contentTypeHint}.`);
};

const parsePdfHttpFailure = (endpoint: string, status: number, data: ArrayBuffer | Uint8Array) => {
  const bytes = toUint8Array(data);
  const text = bytes.length ? new TextDecoder().decode(bytes).trim() : '';

  if (status === 404) {
    return `PDF route not found at ${endpoint}. Point VITE_PDF_API_BASE to the Node PDF service or run the local backend on port 5000.`;
  }

  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text) as { error?: string; details?: string; message?: string };
      return parsed.details || parsed.error || parsed.message || `PDF service returned ${status}.`;
    } catch {
      // Fall through to text fallback.
    }
  }

  return text || `PDF service returned ${status}.`;
};

const requestPdfBlob = async (endpoint: string, payload: { html: string; filenameBase: string }) => {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = window.setTimeout(() => controller?.abort(), 120000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/pdf',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: controller?.signal,
    });

    const data = await response.arrayBuffer();
    if (!response.ok) {
      throw new Error(parsePdfHttpFailure(endpoint, response.status, data));
    }

    return decodePdfResponse(data, response.headers.get('content-type') || '');
  } catch (error) {
    if ((error as DOMException | undefined)?.name === 'AbortError') {
      throw new Error('PDF generation timed out. Please try again.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

type TemplateListItem = {
  name: string;
  displayName: string;
  thumbnailUrl?: string;
};

const JSON_TEMPLATE_FIELD_LABELS: Record<string, string> = {
  about_myself_heading: 'About Myself Heading',
  additional_heading: 'Additional Information Heading',
  additional_skills_heading: 'Additional Skills Heading',
  certifications_heading: 'Certifications Heading',
  certifications_text: 'Certifications',
  contacts_heading: 'Contacts Heading',
  date_of_birth: 'Date of Birth',
  language_heading: 'Language Heading',
  languages: 'Languages',
  minimalist_experience_heading: 'Experience Heading',
  marital_status: 'Marital Status',
  nationality: 'Nationality',
  reference_heading: 'Reference Heading',
  references_heading: 'References Heading',
  reference_email_label: 'Reference Email Label',
  reference_phone_label: 'Reference Phone Label',
  reference_primary_email: 'Primary Reference Email',
  reference_primary_name: 'Primary Reference Name',
  reference_primary_phone: 'Primary Reference Phone',
  reference_primary_title: 'Primary Reference Title',
  reference_secondary_email: 'Secondary Reference Email',
  reference_secondary_name: 'Secondary Reference Name',
  reference_secondary_phone: 'Secondary Reference Phone',
  reference_secondary_title: 'Secondary Reference Title',
  summary_heading: 'Summary Heading',
};

const RESUME_SECTION_TITLES: Record<string, string> = {
  contact: 'Personal Details',
  personal_info: 'Personal Information',
  summary: 'Professional Summary',
  experience: 'Work Experience',
  education: 'Education',
  skills: 'Skills',
  languages: 'Languages',
  certifications: 'Certifications',
  awards: 'Achievements / Awards',
  references: 'References',
};

const REQUIRED_EDITOR_SECTION_IDS = new Set([
  'contact',
  'personal_info',
  'education',
  'experience',
  'skills',
]);

const JSON_TEMPLATE_PROTECTED_FIELD_KEYS = new Set([
  'first_name',
  'firstname',
  'last_name',
  'lastname',
  'name',
  'full_name',
  'fullname',
  'title',
  'role',
  'position',
  'email',
  'phone',
  'location',
  'photo_url',
  'summary',
  'profile',
  'objective',
  'skills',
  'skills_text',
  'languages',
  'languages_text',
  'projects',
  'projects_text',
  'experience',
  'education',
  'additional',
  'custom_details',
  'customdetails',
  'contact',
  'contact_line',
  'contactline',
  'website_line',
  'websiteline',
  'sidebar_contacts',
  'sidebarcontacts',
  'header_contact',
  'headercontact',
  'links',
].map((key) => normalizeFieldKey(key)));

const formatTemplateFieldLabel = (field: string) => {
  const normalized = normalizeFieldKey(field);
  if (JSON_TEMPLATE_FIELD_LABELS[normalized]) return JSON_TEMPLATE_FIELD_LABELS[normalized];
  return field
    .replace(/_/g, ' ')
    .replace(/\burl\b/gi, 'URL')
    .replace(/\bid\b/gi, 'ID')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const LEGACY_DEMO_SEED_MARKERS = [
  'Muhammad Usman Ahmed',
  'Software Engineer | Full Stack Developer',
  'muhammad.usman.ahmed@email.com',
  '+31 6 4827 1934',
  'Delft, Zuid-Holland, Netherlands',
  'www.usmanahmed.dev',
  'linkedin.com/in/muhammadusmanahmed',
];

const hasLegacyDemoSeedData = (raw: string) => {
  const normalized = raw.toLowerCase();
  const matches = LEGACY_DEMO_SEED_MARKERS.filter((marker) =>
    normalized.includes(marker.toLowerCase())
  ).length;
  return matches >= 3;
};

export const Resume = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { templateId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const templateQueryParam = searchParams.get('template') || '';
  const uploadQueryParam = searchParams.get('upload');
  const isBuilderEditorRoute = location.pathname.startsWith('/resume-builder/editor');
  const effectiveTemplateId = templateId || templateQueryParam || '';
  const isEditorRoute = Boolean(templateId) || isBuilderEditorRoute;
  const backTarget = isBuilderEditorRoute ? '/resume-builder/templates' : '/resume/templates';

  // Resume Builder state
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactLocation, setContactLocation] = useState('');
  const [contactPhotoUrl, setContactPhotoUrl] = useState("");
  const [contactPhotoName, setContactPhotoName] = useState("");
  const [pendingPhotoCropSrc, setPendingPhotoCropSrc] = useState<string | null>(null);
  const [pendingPhotoCropName, setPendingPhotoCropName] = useState("");
  const [summaryText, setSummaryText] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [skillsInput, setSkillsInput] = useState("");
  const [languagesInput, setLanguagesInput] = useState("");
  const [activeEditorTab, setActiveEditorTab] = useState<'edit' | 'customize' | 'review' | 'tailor'>('edit');
  const [hasUnlockedCustomize, setHasUnlockedCustomize] = useState(false);
  const [tailorRole, setTailorRole] = useState('');
  const [tailorKeywords, setTailorKeywords] = useState('');
  const [projectsText, setProjectsText] = useState('');
  const [additionalText] = useState("");
  const [customDetails, setCustomDetails] = useState<{ id: string; label: string; value: string }[]>([]);
  const [educationItems, setEducationItems] = useState<EducationItem[]>([]);
  const [experienceItems, setExperienceItems] = useState<ExperienceItem[]>([]);
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    'contact',
    'summary',
    'experience',
    'education',
    'skills',
    'certifications',
    'languages',
    'awards',
    'references',
  ]);
  const [draggingSection, setDraggingSection] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>('contact');
  const [unlockedSections, setUnlockedSections] = useState<string[]>([]);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const resumeUploadInputRef = useRef<HTMLInputElement | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const previewCardRef = useRef<HTMLDivElement | null>(null);
  const previewShellRef = useRef<HTMLDivElement | null>(null);
  const previewBodyRef = useRef<HTMLDivElement | null>(null);
  const previewContentObserverRef = useRef<ResizeObserver | null>(null);
  const previewFontScaleRef = useRef(1);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewPageCount, setPreviewPageCount] = useState(1);
  const [previewPageSizeMode, setPreviewPageSizeMode] = useState<'auto' | PreviewPageSize>('auto');
  const [autoDetectedPageSize, setAutoDetectedPageSize] = useState<PreviewPageSize>('a4');
  const previewContentHeightRef = useRef<number>(PAGE_SIZES.a4.height);
  const previewScaleRef = useRef(1);
  const autoDetectLockedRef = useRef(false);
  const showMobilePreview = false;
  const [templateStep, setTemplateStep] = useState<'choose' | 'edit'>('choose');
  const [selectedColorPreset, setSelectedColorPreset] = useState<TemplateColorPresetId>('gold');
  const [customTemplateColor, setCustomTemplateColor] = useState(DEFAULT_CUSTOM_TEMPLATE_COLOR);
  const [classicTemplateStyleSettings, setClassicTemplateStyleSettings] = useState<ClassicTemplateStyleSettings>(
    DEFAULT_CLASSIC_TEMPLATE_STYLE_SETTINGS
  );
  const [uploadingResume, setUploadingResume] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const historyTimerRef = useRef<number | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const isApplyingHistoryRef = useRef(false);
  const restoreKeyRef = useRef<string | null>(null);
  const defaultTemplateSeedRef = useRef<string | null>(null);
  const getEditorSnapshotRef = useRef<() => string>(() => '');

  const [activeTemplateFilter, setActiveTemplateFilter] = useState('All templates');
  const resumeViewRestoreRef = useRef(false);
  const [initialResumeReady, setInitialResumeReady] = useState(false);

  const {
    templates,
    selectedTemplate,
    templateLoading,
    templateError,
    templatePreviewHtml,
    templatePreviewLoading,
    templateFields,
    templateFieldValues,
    templateSourceHtml,
    selectTemplate,
    updateField,
    replaceFields: replaceTemplateFieldValues,
    refreshTemplates,
  } = useResumeTemplate(user);

  const getTemplateFieldValue = useCallback((key: string) => {
    if (templateFieldValues[key]) return templateFieldValues[key];
    const normalized = normalizeFieldKey(key);
    const match = Object.keys(templateFieldValues).find((k) => normalizeFieldKey(k) === normalized);
    return match ? templateFieldValues[match] : '';
  }, [templateFieldValues]);

  const setTemplateFieldValue = useCallback((key: string, value: string) => {
    updateField(key, value);
  }, [updateField]);

  useEffect(() => {
    if (!selectedTemplate) return;
    defaultTemplateSeedRef.current = `${effectiveTemplateId || 'default'}:${selectedTemplate}`;
  }, [
    effectiveTemplateId,
    selectedTemplate,
  ]);

  const defaultTemplateFields = useMemo(
    () => ([
      'name',
      'fullname',
      'full_name',
      'role',
      'title',
      'position',
      'company',
      'degree',
      'school',
      'dates',
      'email',
      'phone',
      'mobile',
      'location',
      'address',
      'city',
      'country',
      'website',
      'portfolio',
      'linkedin',
      'github',
      'photo_url',
      'summary',
      'profile',
      'objective',
      'skills',
      'experience',
      'work_experience',
      'education',
      'projects',
      'additionalinfo',
      'additional_info',
      'additional',
      'hassummary',
      'hasexperience',
      'haseducation',
      'hasskills',
      'hasprojects',
      'hasadditional',
      'customdetails',
      'custom_details',
      'hascustomdetails',
      'bullets',
      'hasbullets',
    ]),
    []
  );

  const activeTemplateFields = useMemo(
    () => (templateFields.length > 0 ? templateFields : defaultTemplateFields),
    [defaultTemplateFields, templateFields]
  );

  const templateFieldSet = useMemo(
    () => new Set(activeTemplateFields.map((field) => normalizeFieldKey(field))),
    [activeTemplateFields]
  );

  const contactNameParts = useMemo(() => {
    const parts = contactName.trim().split(/\s+/).filter(Boolean);
    return {
      first: parts[0] || '',
      last: parts.slice(1).join(' '),
    };
  }, [contactName]);

  const updateContactNameParts = useCallback((first: string, last: string) => {
    const next = [first.trim(), last.trim()].filter(Boolean).join(' ');
    setContactName(next);
  }, []);

  const selectedTemplateLabel = useMemo(() => {
    const match = templates.find((t) => t.name === selectedTemplate);
    return match?.displayName || selectedTemplate || 'Template';
  }, [selectedTemplate, templates]);

  const selectedColorPresetValue = useMemo(
    () => TEMPLATE_COLOR_PRESETS.find((preset) => preset.id === selectedColorPreset) || TEMPLATE_COLOR_PRESETS[0],
    [selectedColorPreset]
  );

  const normalizedCustomTemplateColor = useMemo(
    () => (/^#[0-9a-f]{6}$/i.test(customTemplateColor) ? customTemplateColor : DEFAULT_CUSTOM_TEMPLATE_COLOR),
    [customTemplateColor]
  );

  const activeTemplateAccentColor = useMemo(
    () => (selectedColorPreset === 'custom' ? normalizedCustomTemplateColor : selectedColorPresetValue.accent),
    [normalizedCustomTemplateColor, selectedColorPreset, selectedColorPresetValue.accent]
  );

  const updateClassicTemplateStyleColor = useCallback(
    (key: ClassicTemplateStyleColorKey, value: string) => {
      setClassicTemplateStyleSettings((prev) => ({
        ...prev,
        [key]: normalizeHexColor(value, prev[key]),
      }));
    },
    []
  );

  const updateClassicTemplateStyleFont = useCallback(
    (key: ClassicTemplateStyleFontKey, value: string) => {
      if (!CLASSIC_TEMPLATE_FONT_OPTION_SET.has(value)) return;
      setClassicTemplateStyleSettings((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const updateClassicTemplateStyleNumber = useCallback(
    (key: ClassicTemplateStyleNumberKey, value: number) => {
      if (!Number.isFinite(value)) return;
      setClassicTemplateStyleSettings((prev) => ({
        ...(() => {
          if (CLASSIC_TEMPLATE_HEADING_KEYS.includes(key as ClassicTemplateHeadingKey)) {
            return applyClassicTemplateHeadingSizeChange(
              prev,
              key as ClassicTemplateHeadingKey,
              value
            );
          }
          const limit = CLASSIC_TEMPLATE_NUMBER_LIMITS[key];
          return {
            ...prev,
            [key]: roundHalfStep(clampNumber(value, limit.min, limit.max)),
          };
        })(),
      }));
    },
    []
  );

  const templateFilters = [
    'All templates',
    'Simple',
    'Word',
    'Picture',
    'ATS',
    'Two-column',
    'Google Docs',
  ];

  const templateCatalog = useMemo<TemplateListItem[]>(() => {
    return templates.map((template) => ({
      name: template.name,
      displayName: template.displayName,
      thumbnailUrl: template.thumbnailUrl,
    }));
  }, [templates]);

  const combinedTemplateLoading = templateLoading;
  const combinedTemplateError = templateError;

  const filteredTemplates = useMemo(() => {
    if (templateCatalog.length === 0) return [];
    if (activeTemplateFilter === 'All templates') return templateCatalog;

    const filterKey = activeTemplateFilter.toLowerCase();
    const matches = (template: TemplateListItem) => {
      const haystack = `${template.displayName} ${template.name}`.toLowerCase();
      switch (filterKey) {
        case 'simple':
          return /simple|minimal|clean|basic/.test(haystack);
        case 'word':
          return /word|doc|docx/.test(haystack);
        case 'picture':
          return /photo|picture|image|profile/.test(haystack);
        case 'ats':
          return /ats/.test(haystack);
        case 'two-column':
          return /two[-\\s]?column|2[-\\s]?column|double/.test(haystack);
        case 'google docs':
          return /google|gdocs|docs/.test(haystack);
        default:
          return haystack.includes(filterKey);
      }
    };

    return templateCatalog.filter(matches);
  }, [activeTemplateFilter, templateCatalog]);

  const resolvedPageSize: PreviewPageSize = ENABLE_PREVIEW_PAGINATION
    ? (previewPageSizeMode === 'auto' ? autoDetectedPageSize : previewPageSizeMode)
    : 'a4';
  const activePageSize = PAGE_SIZES[resolvedPageSize];
  const previewShellBaseStyle = useMemo(() => ({
    ['--preview-shell-width' as any]: `${activePageSize.width}px`,
    ['--preview-shell-height' as any]: `${activePageSize.height}px`,
  }) as CSSProperties, [activePageSize.height, activePageSize.width]);
  const previewIframeBaseStyle = useMemo(() => ({
    width: `${activePageSize.width}px`,
    height: `${activePageSize.height}px`,
  }) as CSSProperties, [activePageSize.height, activePageSize.width]);
  const pageSizeOptions: Array<'auto' | PreviewPageSize> = ENABLE_PREVIEW_PAGINATION
    ? ['auto', 'a4', 'letter']
    : ['a4'];

  const slugifyTemplate = (value: string) =>
    value
      .toLowerCase()
      .replace(/\.html$/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

  const selectedTemplateSlug = useMemo(() => {
    const base = selectedTemplate.split('/').pop() || selectedTemplate;
    return slugifyTemplate(base);
  }, [selectedTemplate]);

  const supportsClassicTemplateCustomization = selectedTemplateSlug === CLASSIC_PORTRAIT_TEMPLATE_SLUG;

  const findTemplateBySlug = useCallback(
    (slug?: string | null) => {
      if (!slug) return null;
      const normalized = slugifyTemplate(slug);
      const directMatch = templates.find((t) => slugifyTemplate(t.name) === normalized);
      if (directMatch) return directMatch;
      return templates.find((t) => {
        const base = t.name.split('/').pop() || t.name;
        return slugifyTemplate(base) === normalized || slugifyTemplate(t.displayName) === normalized;
      }) || null;
    },
    [templates]
  );

  const isTemplateSelection =
    !isEditorRoute && (templateStep === 'choose' || !selectedTemplate);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const keysToRemove: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith('hirevo:resume-editor:')) continue;
      const value = window.localStorage.getItem(key);
      if (value && hasLegacyDemoSeedData(value)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  }, []);

  useEffect(() => {
    if (resumeViewRestoreRef.current) return;
    if (templateLoading) return;
    if (templates.length === 0) return;

    resumeViewRestoreRef.current = true;

    const raw = window.sessionStorage.getItem(RESUME_VIEW_STORAGE_KEY);
    if (!raw) return;

    try {
      const savedState = JSON.parse(raw) as {
        templateStep?: 'choose' | 'edit';
        selectedTemplate?: string;
      };

      if (savedState.templateStep === 'choose' || savedState.templateStep === 'edit') {
        setTemplateStep(savedState.templateStep);
      }

      if (
        savedState.selectedTemplate &&
        templates.some((template) => template.name === savedState.selectedTemplate) &&
        savedState.selectedTemplate !== selectedTemplate
      ) {
        selectTemplate(savedState.selectedTemplate);
      }
    } catch {
      // Ignore malformed saved state and continue with defaults.
    }
  }, [
    selectedTemplate,
    selectTemplate,
    templateLoading,
    templates,
  ]);

  useEffect(() => {
    if (!resumeViewRestoreRef.current) return;

    window.sessionStorage.setItem(
      RESUME_VIEW_STORAGE_KEY,
      JSON.stringify({
        templateStep,
        selectedTemplate,
      })
    );
  }, [selectedTemplate, templateStep]);

  const hasTemplateField = useCallback(
    (key: string) => activeTemplateFields.length > 0 && templateFieldSet.has(normalizeFieldKey(key)),
    [activeTemplateFields.length, templateFieldSet]
  );

  const hasAnyTemplateField = useCallback(
    (...keys: string[]) => keys.some((key) => hasTemplateField(key)),
    [hasTemplateField]
  );

  const showNameField = true;
  const showRoleField = true;
  const showEmailField = true;
  const showPhoneField = true;
  const showLocationField = true;
  const showPhotoField = useMemo(() => hasAnyTemplateField('photo_url'), [hasAnyTemplateField]);
  const showWebsiteField = true;
  const showLinkedInField = true;
  const showGitHubField = false;
  const showPostalCodeField = false;
  const showCountryField = false;

  const showContactSection = true;
  const showSummarySection = true;
  const showExperienceSection = true;
  const showEducationSection = true;
  const showSkillsSection = true;
  const personalInfoFields = useMemo(
    () => activeTemplateFields.filter((field) => {
      const normalized = normalizeFieldKey(field);
      return normalized === 'dateofbirth' || normalized === 'nationality' || normalized === 'maritalstatus';
    }),
    [activeTemplateFields]
  );
  const showPersonalInfoSection = personalInfoFields.length > 0;
  const showLanguagesSection = true;
  const showCertificationsSection = true;
  const showAwardsSection = true;
  const showReferencesSection = true;

  const languageFields = useMemo(() => ['languages'], []);
  const certificationFields = useMemo(() => ['certifications'], []);
  const awardFields = useMemo(() => ['awards'], []);
  const referenceFields = useMemo(
    () => [
      'reference_primary_name',
      'reference_primary_title',
      'reference_primary_phone',
      'reference_primary_email',
      'reference_secondary_name',
      'reference_secondary_title',
      'reference_secondary_phone',
      'reference_secondary_email',
      'references',
    ],
    []
  );

  const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

  const handlePhotoUpload = useCallback((file?: File) => {
    if (!file) {
      setContactPhotoUrl("");
      setContactPhotoName("");
      setPendingPhotoCropSrc(null);
      setPendingPhotoCropName("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        setPendingPhotoCropSrc(null);
        setPendingPhotoCropName("");
        return;
      }
      setPendingPhotoCropSrc(result);
      setPendingPhotoCropName(file.name);
    };
    reader.onerror = () => {
      setPendingPhotoCropSrc(null);
      setPendingPhotoCropName("");
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePhotoCropCancel = useCallback(() => {
    setPendingPhotoCropSrc(null);
    setPendingPhotoCropName("");
  }, []);

  const handlePhotoCropConfirm = useCallback((croppedImage: string) => {
    setContactPhotoUrl(croppedImage);
    setContactPhotoName(pendingPhotoCropName);
    setPendingPhotoCropSrc(null);
    setPendingPhotoCropName("");
  }, [pendingPhotoCropName]);

  const addExperienceItem = () =>
    setExperienceItems((prev) => [...prev, { id: makeId('exp'), company: '', role: '', dates: '', details: '' }]);

  const updateExperienceItem = (id: string, patch: Partial<typeof experienceItems[number]>) =>
    setExperienceItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const removeExperienceItem = (id: string) =>
    setExperienceItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));

  const addEducationItem = () =>
    setEducationItems((prev) => [...prev, { id: makeId('edu'), school: '', degree: '', dates: '', details: '' }]);

  const updateEducationItem = (id: string, patch: Partial<typeof educationItems[number]>) =>
    setEducationItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const removeEducationItem = (id: string) =>
    setEducationItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));

  const moveToNextSection = useCallback(() => {
    const currentIndex = sectionOrder.indexOf(activeSectionId || 'contact');
    if (currentIndex >= 0 && currentIndex < sectionOrder.length - 1) {
      const nextSectionId = sectionOrder[currentIndex + 1];
      setActiveSectionId(nextSectionId);
    }
  }, [activeSectionId, sectionOrder]);

  const handleSectionEnterKey = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter') return;
    if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (
      target.isContentEditable
      || target.closest('[contenteditable="true"]')
      || target.closest('.hirevo-rich-text-shell')
      || target.getAttribute('role') === 'textbox'
    ) {
      return;
    }

    const tag = target.tagName.toLowerCase();
    if (tag === 'textarea' || tag === 'input' || tag === 'select' || tag === 'button' || tag === 'a') return;

    event.preventDefault();
    moveToNextSection();
  }, [moveToNextSection]);

  const parseCommaOrNewline = (value: string) =>
    value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);

  const parseNewline = (value: string) =>
    value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);

  const parseRichTextLines = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return [] as string[];
    if (!/[<>]/.test(trimmed)) return parseNewline(trimmed);

    const htmlWithLineBreaks = trimmed
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, '\n')
      .replace(/<(p|div|ul|ol|h[1-6])\b[^>]*>/gi, '')
      .replace(/<li\b[^>]*>/gi, '');

    const textContent = typeof DOMParser === 'undefined'
      ? htmlWithLineBreaks.replace(/<[^>]+>/g, '')
      : new DOMParser().parseFromString(htmlWithLineBreaks, 'text/html').body.textContent || '';

    return textContent
      .split(/\r?\n/)
      .map((item) => item.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  };

  const parseRichTextInlineText = (value: string) =>
    parseRichTextLines(value).join(' ').trim();

  const parseRichTextMultilineText = (value: string) =>
    parseRichTextLines(value).join('\n').trim();

  const escapeEditorHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const stripLeadingBullet = (value: string) =>
    value.replace(/^[-*\u2022\u2023\u25e6]+\s*/, '').trim();

  const plainTextToParagraphHtml = (value: string) =>
    parseNewline(value)
      .map((line) => `<p>${escapeEditorHtml(line)}</p>`)
      .join('');

  const plainTextToBulletHtml = (value: string) => {
    const lines = parseNewline(value)
      .map(stripLeadingBullet)
      .filter(Boolean);

    if (lines.length === 0) return '';

    return `<ul>${lines.map((line) => `<li>${escapeEditorHtml(line)}</li>`).join('')}</ul>`;
  };

  const normalizeImprovedSkillsText = (value: string) =>
    parseCommaOrNewline(
      value
        .split(/\r?\n/)
        .map((line) => stripLeadingBullet(line))
        .join('\n')
    ).join(', ');

  const normalizeTemplateText = (value: string) =>
    value
      .replace(/^[-*\u2022\u2023\u25e6]+\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();

  const extractRichTextLineStyles = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || !/[<>]/.test(trimmed) || typeof DOMParser === 'undefined') {
      return [] as RichTextLineStyle[];
    }

    const doc = new DOMParser().parseFromString(trimmed, 'text/html');
    const listItems = Array.from(doc.body.querySelectorAll('li'));
    const lineElements = listItems.length > 0 ? listItems : Array.from(doc.body.children);

    return lineElements
      .map((element) => {
        const text = normalizeTemplateText(element.textContent || '');
        if (!text) return null;

        const fontSizeSource = [
          element instanceof HTMLElement ? element : null,
          ...Array.from(element.querySelectorAll<HTMLElement>('[style*="font-size"]')),
        ]
          .filter((candidate): candidate is HTMLElement => Boolean(candidate))
          .find((candidate) => candidate.style.fontSize.trim().length > 0);

        const fontSize = fontSizeSource?.style.fontSize.trim() || '';
        if (!fontSize) return null;

        return {
          text,
          fontSize,
        };
      })
      .filter((item): item is RichTextLineStyle => Boolean(item));
  };

  const applyRichTextLineStylesToTemplateHtml = useCallback((html: string) => {
    if (!html || typeof DOMParser === 'undefined') return html;

    const lineStyles = [
      ...experienceItems.flatMap((item) => extractRichTextLineStyles(item.details)),
      ...educationItems.flatMap((item) => extractRichTextLineStyles(item.details)),
    ];

    if (lineStyles.length === 0) return html;

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const candidateElements = Array.from(doc.body.querySelectorAll<HTMLElement>('li, p, span, div'))
      .filter((element) => normalizeTemplateText(element.textContent || '').length > 0);
    const usedElements = new Set<HTMLElement>();

    lineStyles.forEach((lineStyle) => {
      const matches = candidateElements
        .filter((element) => !usedElements.has(element))
        .filter((element) => normalizeTemplateText(element.textContent || '') === lineStyle.text)
        .sort((left, right) => {
          const leftLength = normalizeTemplateText(left.textContent || '').length;
          const rightLength = normalizeTemplateText(right.textContent || '').length;
          return leftLength - rightLength;
        });

      const match = matches[0];
      if (!match) return;

      match.style.fontSize = lineStyle.fontSize;
      usedElements.add(match);
    });

    return doc.documentElement.outerHTML;
  }, [educationItems, experienceItems]);

  const skillsList = useMemo(() => parseCommaOrNewline(skillsText), [skillsText]);

  const addSkill = useCallback(() => {
    const entries = parseCommaOrNewline(skillsInput);
    if (entries.length === 0) return;
    const updated = [...skillsList, ...entries];
    setSkillsText(updated.join(', '));
    setSkillsInput('');
  }, [skillsInput, skillsList]);

  const removeSkill = useCallback((index: number) => {
    const updated = skillsList.filter((_, idx) => idx !== index);
    setSkillsText(updated.join(', '));
  }, [skillsList]);

  const buildResumeView = useCallback(() => {
    const templateHasSection = (key: string) =>
      templateSourceHtml ? new RegExp(`{{\\s*#\\s*${key}\\s*}}`, 'i').test(templateSourceHtml) : false;

    const nonEmptyTemplateFieldValues = Object.fromEntries(
      Object.entries(templateFieldValues).filter(([, value]) => value.toString().trim().length > 0)
    );

    const photoValue = contactPhotoUrl.trim()
      || (templateFieldValues.photo_url || '').toString().trim();
    const countryValue = (templateFieldValues.country || templateFieldValues.Country || '').toString().trim();
    const cityValue = (templateFieldValues.city || '').toString().trim();
    const addressValue = (templateFieldValues.address || '').toString().trim();

    const skills = parseCommaOrNewline(skillsText);
    const projects = parseNewline(projectsText);
    const additional = parseNewline(additionalText);
    const languageSource = [
      templateFieldValues.languages,
      templateFieldValues.language,
      templateFieldValues.languages_text,
    ]
      .map((value) => parseRichTextMultilineText((value ?? '').toString()))
      .find(Boolean) || '';
    const languageLines = parseRichTextLines(languageSource);
    const customDetailLines = customDetails
      .map((item) => {
        const label = item.label.trim();
        const value = item.value.trim();
        if (!label && !value) return '';
        if (label && value) return `${label}: ${value}`;
        return label || value;
      })
      .filter(Boolean);
    const combinedAdditional = [...additional];

    const experienceItemsView = experienceItems
      .map((item) => {
        const bullets = parseRichTextLines(item.details);
        return {
          role: parseRichTextInlineText(item.role),
          company: parseRichTextInlineText(item.company),
          dates: parseRichTextInlineText(item.dates),
          bullets,
          hasBullets: bullets.length > 0,
        };
      })
      .filter((item) => [item.role, item.company, item.dates, item.bullets.length ? 'x' : ''].some((v) => v && v.toString().trim()));

    const educationItemsView = educationItems
      .map((item) => {
        const bullets = parseRichTextLines(item.details);
        return {
          degree: parseRichTextInlineText(item.degree),
          school: parseRichTextInlineText(item.school),
          dates: parseRichTextInlineText(item.dates),
          bullets,
          hasBullets: bullets.length > 0,
        };
      })
      .filter((item) => [item.degree, item.school, item.dates, item.bullets.length ? 'x' : ''].some((v) => v && v.toString().trim()));

    const formatBullets = (bullets: string[]) =>
      bullets.length ? bullets.map((line) => `- ${line}`).join('\n') : '';

    const experienceText = experienceItemsView
      .map((item) => {
        const header = [item.role, item.company].filter(Boolean).join(' - ');
        const lines = [header, item.dates, formatBullets(item.bullets)].filter(Boolean);
        return lines.join('\n');
      })
      .filter((block) => block.trim())
      .join('\n\n');

    const educationText = educationItemsView
      .map((item) => {
        const header = [item.degree, item.school].filter(Boolean).join(' - ');
        const lines = [header, item.dates, formatBullets(item.bullets)].filter(Boolean);
        return lines.join('\n');
      })
      .filter((block) => block.trim())
      .join('\n\n');

    const skillsValue = templateHasSection('skills') ? skills : skills.join(', ');
    const projectsValue = templateHasSection('projects') ? projects : projects.join('\n');
    const additionalValue = templateHasSection('additional') ? combinedAdditional : combinedAdditional.join('\n');
    const customDetailsValue = templateHasSection('custom_details')
      ? customDetailLines
      : customDetailLines.join('\n');
    const experienceValue = templateHasSection('experience') ? experienceItemsView : experienceText;
    const educationValue = templateHasSection('education') ? educationItemsView : educationText;

    const view: Record<string, any> = {
      ...nonEmptyTemplateFieldValues,
      first_name: contactNameParts.first,
      last_name: contactNameParts.last,
      name: contactName,
      full_name: contactName,
      fullname: contactName,
      role: contactRole,
      title: contactRole,
      position: contactRole,
      email: contactEmail,
      phone: contactPhone,
      mobile: contactPhone,
      location: contactLocation,
      address: addressValue || contactLocation,
      city: cityValue || contactLocation,
      country: countryValue || contactLocation,
      photo_url: photoValue,
      summary: summaryText,
      profile: summaryText,
      objective: summaryText,
      hasSummary: summaryText.trim().length > 0,
      skills: skillsValue,
      hasSkills: skills.length > 0,
      languages: templateHasSection('languages') ? languageLines : languageSource,
      language: languageSource,
      languages_text: languageSource,
      hasLanguages: languageLines.length > 0,
      experience: experienceValue,
      hasExperience: experienceItemsView.length > 0,
      education: educationValue,
      hasEducation: educationItemsView.length > 0,
      projects: projectsValue,
      hasProjects: projects.length > 0,
      custom_details: customDetailsValue,
      customdetails: customDetailsValue,
      hasCustomDetails: customDetailLines.length > 0,
      additional: additionalValue,
      hasAdditional: combinedAdditional.length > 0,
    };

    return view;
  }, [
    additionalText,
    customDetails,
    contactEmail,
    contactLocation,
    contactName,
    contactPhone,
    contactPhotoUrl,
    contactRole,
    educationItems,
    experienceItems,
    projectsText,
    skillsText,
    summaryText,
    templateFieldValues,
    templateSourceHtml,
  ]);

  const buildJsonResumeData = useCallback(() => {
    const skills = parseCommaOrNewline(skillsText).map((name) => ({ name, value: name, bullet: '\u2022' }));
    const projects = parseNewline(projectsText).map((title) => ({ title, name: title, value: title }));
    const additional = parseNewline(additionalText);
    const customDetailItems = customDetails
      .map((item) => ({
        id: item.id,
        label: item.label.trim(),
        value: item.value.trim(),
        label_with_colon: item.label.trim() ? `${item.label.trim()}:` : '',
        bullet: '\u2022',
      }))
      .filter((item) => item.label || item.value);

    const languageSource = [
      templateFieldValues.languages,
      templateFieldValues.language,
      templateFieldValues.languages_text,
    ]
      .map((value) => parseRichTextMultilineText((value ?? '').toString()))
      .find(Boolean) || '';
    const languageList = parseRichTextLines(languageSource);
    const languages = languageList.map((name) => ({ name, value: name }));

    const experience = experienceItems
      .map((item) => {
        const detailLines = parseRichTextLines(item.details);
        const roleText = parseRichTextInlineText(item.role);
        const companyText = parseRichTextInlineText(item.company);
        const datesText = parseRichTextInlineText(item.dates);
        return {
          id: item.id,
          role: roleText,
          role_html: item.role,
          company: companyText,
          company_html: item.company,
          role_company: [roleText, companyText].filter(Boolean).join(' , '),
          dates: datesText,
          dates_html: item.dates,
          date_range: datesText,
          date_range_html: item.dates,
          marker: '\u25cb',
          highlights: item.details,
          bullets: detailLines.map((line) => `- ${line}`),
          bullet_lines: detailLines.map((line) => `\u2022 ${line}`),
        };
      })
      .filter((item) =>
        [item.role, item.company, item.dates, item.highlights].some((value) => value && value.toString().trim())
      );

    const education = educationItems
      .map((item) => {
        const detailLines = parseRichTextLines(item.details);
        const degreeText = parseRichTextInlineText(item.degree);
        const schoolText = parseRichTextInlineText(item.school);
        const datesText = parseRichTextInlineText(item.dates);
        return {
          id: item.id,
          degree: degreeText,
          degree_html: item.degree,
          school: schoolText,
          school_html: item.school,
          dates: datesText,
          dates_html: item.dates,
          date_range: datesText,
          date_range_html: item.dates,
          highlights: item.details,
          bullets: detailLines.map((line) => `- ${line}`),
          bullet_lines: detailLines.map((line) => `\u2022 ${line}`),
        };
      })
      .filter((item) =>
        [item.degree, item.school, item.dates, item.highlights].some((value) => value && value.toString().trim())
      );

    const website = (templateFieldValues.website || templateFieldValues.portfolio || '').toString().trim();
    const linkedIn = (templateFieldValues.linkedin || '').toString().trim();
    const github = (templateFieldValues.github || '').toString().trim();

    const contact = [
      { label: 'Phone', value: contactPhone },
      { label: 'Email', value: contactEmail },
      { label: 'Location', value: contactLocation },
      ...(website ? [{ label: 'Portfolio', value: website }] : []),
      ...(linkedIn ? [{ label: 'LinkedIn', value: linkedIn }] : []),
      ...(github ? [{ label: 'GitHub', value: github }] : []),
    ].filter((item) => item.value && item.value.toString().trim());

    const headerContact = [
      {
        left: contactLocation || linkedIn || '',
        center: contactPhone || website || '',
        right: contactEmail || github || '',
      },
    ].filter((item) => item.left || item.center || item.right);

    const contactLine = [contactLocation, contactPhone, contactEmail]
      .map((value) => (value || '').toString().trim())
      .filter(Boolean)
      .join(' • ');
    const sidebarContacts = [
      contactPhone,
      website,
      contactEmail,
      linkedIn || github,
    ]
      .map((value) => (value || '').toString().trim())
      .filter(Boolean)
      .map((value) => ({ value }));
    const certificationsText = (
      templateFieldValues.certifications
      || templateFieldValues.certifications_text
      || customDetailItems.map((item) => [item.label, item.value].filter(Boolean).join(': ')).join(' ')
      || ''
    ).toString();
    const normalizedCertificationsText = parseRichTextMultilineText(certificationsText);
    const awardsText = (
      templateFieldValues.awards
      || templateFieldValues.awards_text
      || templateFieldValues.achievements
      || templateFieldValues.achievements_text
      || ''
    ).toString();
    const normalizedAwardsText = parseRichTextMultilineText(awardsText);

    const referencePrimaryName = (templateFieldValues.reference_primary_name || '').toString().trim();
    const referencePrimaryTitle = (templateFieldValues.reference_primary_title || '').toString().trim();
    const referencePrimaryPhone = (templateFieldValues.reference_primary_phone || '').toString().trim();
    const referencePrimaryEmail = (templateFieldValues.reference_primary_email || '').toString().trim();
    const referenceSecondaryName = (templateFieldValues.reference_secondary_name || '').toString().trim();
    const referenceSecondaryTitle = (templateFieldValues.reference_secondary_title || '').toString().trim();
    const referenceSecondaryPhone = (templateFieldValues.reference_secondary_phone || '').toString().trim();
    const referenceSecondaryEmail = (templateFieldValues.reference_secondary_email || '').toString().trim();
    const referencesText = [
      [referencePrimaryName, referencePrimaryTitle, referencePrimaryPhone, referencePrimaryEmail].filter(Boolean).join(' | '),
      [referenceSecondaryName, referenceSecondaryTitle, referenceSecondaryPhone, referenceSecondaryEmail].filter(Boolean).join(' | '),
    ]
      .filter(Boolean)
      .join('\n');
    const directReferencesText = parseRichTextMultilineText((templateFieldValues.references || '').toString());
    const normalizedReferencesText = directReferencesText || referencesText;
    const primaryEducation = education[0] || { degree: '', school: '', dates: '' };
    const skillNames = skills.map((item) => item.name || item.value).filter(Boolean);
    const experienceSlots = [experience[0], experience[1], experience[2]];
    const templateOverrides = Object.entries(templateFieldValues).reduce<Record<string, string>>((acc, [key, value]) => {
      if (JSON_TEMPLATE_PROTECTED_FIELD_KEYS.has(normalizeFieldKey(key))) return acc;
      acc[key] = value;
      return acc;
    }, {});

    return {
      first_name: contactNameParts.first,
      last_name: contactNameParts.last,
      name: contactName,
      full_name: contactName,
      fullname: contactName,
      title: contactRole,
      role: contactRole,
      position: contactRole,
      email: contactEmail,
      phone: contactPhone,
      location: contactLocation,
      address: templateFieldValues.address || contactLocation,
      portfolio: website,
      website,
      linkedin: linkedIn,
      city: templateFieldValues.city || contactLocation,
      country: templateFieldValues.country || '',
      photo_url: contactPhotoUrl,
      summary: summaryText,
      profile: summaryText,
      objective: summaryText,
      skills,
      skills_text: skillsText,
      languages,
      languages_text: languageSource,
      language_1: languageList[0] || '',
      language_2: languageList[1] || '',
      projects,
      projects_text: projectsText,
      experience,
      education,
      additional,
      awards: normalizedAwardsText,
      awards_text: normalizedAwardsText,
      achievements: normalizedAwardsText,
      achievements_text: normalizedAwardsText,
      custom_details: customDetailItems,
      customdetails: customDetailItems,
      contact,
      contact_line: contactLine,
      website_line: website || linkedIn || github || '',
      sidebar_contacts: sidebarContacts,
      about_heading: 'About Me',
      about_myself_heading: 'About Myself',
      summary_heading: 'Summary',
      contact_heading: 'Contact',
      contacts_heading: 'Contacts',
      career_summary_heading: 'Career Summary',
      experience_marker: 'o',
      skills_heading: 'Skills',
      additional_skills_heading: 'Additional Skills',
      custom_heading: 'Additional Details',
      additional_heading: 'Additional Information',
      education_heading: 'Education',
      certifications_heading: 'Certifications',
      language_heading: 'Language',
      profile_heading: 'Personal Profile',
      experience_heading: 'Work Experience',
      minimalist_experience_heading: 'Experience',
      awards_heading: 'Awards',
      reference_heading: 'Reference',
      references_heading: 'References',
      references: normalizedReferencesText,
      reference_phone_label: 'Phone:',
      reference_email_label: 'Email:',
      reference_primary_name: referencePrimaryName,
      reference_primary_title: referencePrimaryTitle,
      reference_primary_phone: referencePrimaryPhone,
      reference_primary_email: referencePrimaryEmail,
      reference_secondary_name: referenceSecondaryName,
      reference_secondary_title: referenceSecondaryTitle,
      reference_secondary_phone: referenceSecondaryPhone,
      reference_secondary_email: referenceSecondaryEmail,
      reference_1_name: referencePrimaryName,
      reference_1_title: referencePrimaryTitle,
      reference_1_phone: referencePrimaryPhone,
      reference_1_email: referencePrimaryEmail,
      reference_2_name: referenceSecondaryName,
      reference_2_title: referenceSecondaryTitle,
      reference_2_phone: referenceSecondaryPhone,
      reference_2_email: referenceSecondaryEmail,
      certifications: normalizedCertificationsText,
      certifications_text: normalizedCertificationsText,
      education_degree: primaryEducation.degree || '',
      education_school: primaryEducation.school || '',
      education_years: primaryEducation.dates || '',
      skill_1: skillNames[0] || '',
      skill_2: skillNames[1] || '',
      skill_3: skillNames[2] || '',
      skill_4: skillNames[3] || '',
      skill_5: skillNames[4] || '',
      skill_6: skillNames[5] || '',
      experience_1_dates: experienceSlots[0]?.dates || '',
      experience_1_company: experienceSlots[0]?.company || '',
      experience_1_role: experienceSlots[0]?.role || '',
      experience_1_bullet_1: experienceSlots[0]?.bullet_lines?.[0] || '',
      experience_1_bullet_2: experienceSlots[0]?.bullet_lines?.[1] || '',
      experience_1_bullet_3: experienceSlots[0]?.bullet_lines?.[2] || '',
      experience_2_dates: experienceSlots[1]?.dates || '',
      experience_2_company: experienceSlots[1]?.company || '',
      experience_2_role: experienceSlots[1]?.role || '',
      experience_2_bullet_1: experienceSlots[1]?.bullet_lines?.[0] || '',
      experience_2_bullet_2: experienceSlots[1]?.bullet_lines?.[1] || '',
      experience_2_bullet_3: experienceSlots[1]?.bullet_lines?.[2] || '',
      experience_3_dates: experienceSlots[2]?.dates || '',
      experience_3_company: experienceSlots[2]?.company || '',
      experience_3_role: experienceSlots[2]?.role || '',
      experience_3_bullet_1: experienceSlots[2]?.bullet_lines?.[0] || '',
      experience_3_bullet_2: experienceSlots[2]?.bullet_lines?.[1] || '',
      experience_3_bullet_3: experienceSlots[2]?.bullet_lines?.[2] || '',
      header_contact: headerContact,
      links: contact,
      ...templateOverrides,
    };
  }, [
    additionalText,
    contactEmail,
    contactLocation,
    contactName,
    contactNameParts.first,
    contactNameParts.last,
    contactPhone,
    contactPhotoUrl,
    contactRole,
    customDetails,
    educationItems,
    experienceItems,
    projectsText,
    skillsText,
    summaryText,
    parseRichTextMultilineText,
    templateFieldValues,
  ]);

  const jsonPreviewData = useMemo(() => buildJsonResumeData(), [buildJsonResumeData]);

  const buildTemplateRenderView = useCallback(() => {
    const baseView = buildResumeView();
    const richView = buildJsonResumeData();

    const experienceItems = Array.isArray(richView.experience)
      ? richView.experience.map((item) => {
        const bullets = Array.isArray(item?.bullets)
          ? item.bullets.map((value) => ({ value }))
          : [];
        const bulletLines = Array.isArray(item?.bullet_lines)
          ? item.bullet_lines.map((value) => ({ value }))
          : [];
        return {
          ...item,
          bullets,
          bullet_lines: bulletLines,
          has_bullets: bullets.length > 0,
          has_bullet_lines: bulletLines.length > 0,
        };
      })
      : [];
    const educationItemsView = Array.isArray(richView.education)
      ? richView.education.map((item) => {
        const bullets = Array.isArray(item?.bullets)
          ? item.bullets.map((value) => ({ value }))
          : [];
        const bulletLines = Array.isArray(item?.bullet_lines)
          ? item.bullet_lines.map((value) => ({ value }))
          : [];
        return {
          ...item,
          bullets,
          bullet_lines: bulletLines,
          has_bullets: bullets.length > 0,
          has_bullet_lines: bulletLines.length > 0,
        };
      })
      : [];
    const skillItems = Array.isArray(richView.skills) ? richView.skills : [];
    const languageItems = Array.isArray(richView.languages) ? richView.languages : [];
    const projectItems = Array.isArray(richView.projects) ? richView.projects : [];
    const additionalItems = Array.isArray(richView.additional)
      ? richView.additional.map((value) => ({ value }))
      : [];
    const customDetailItems = Array.isArray(richView.custom_details) ? richView.custom_details : [];
    const contactItems = Array.isArray(richView.contact) ? richView.contact : [];
    const linkItems = Array.isArray(richView.links) ? richView.links : [];
    const headerContactRows = Array.isArray(richView.header_contact) ? richView.header_contact : [];
    const sidebarContactItems = Array.isArray(richView.sidebar_contacts) ? richView.sidebar_contacts : [];

    return {
      ...richView,
      ...baseView,
      experience_items: experienceItems,
      education_items: educationItemsView,
      skills_items: skillItems,
      languages_items: languageItems,
      project_items: projectItems,
      additional_items: additionalItems,
      custom_detail_items: customDetailItems,
      contact_items: contactItems,
      link_items: linkItems,
      header_contact_rows: headerContactRows,
      sidebar_contact_items: sidebarContactItems,
      has_experience_items: experienceItems.length > 0,
      has_education_items: educationItemsView.length > 0,
      has_skills_items: skillItems.length > 0,
      has_languages_items: languageItems.length > 0,
      has_project_items: projectItems.length > 0,
      has_additional_items: additionalItems.length > 0,
      has_custom_detail_items: customDetailItems.length > 0,
      has_contact_items: contactItems.length > 0,
      has_link_items: linkItems.length > 0,
      has_header_contact_rows: headerContactRows.length > 0,
      has_sidebar_contact_items: sidebarContactItems.length > 0,
    };
  }, [buildJsonResumeData, buildResumeView]);

  const applyActiveTemplateCustomization = useCallback(
    (html: string) =>
      applyClassicTemplateCustomization(
        html,
        selectedTemplateSlug,
        activeTemplateAccentColor,
        classicTemplateStyleSettings
      ),
    [
      activeTemplateAccentColor,
      classicTemplateStyleSettings,
      selectedTemplateSlug,
    ]
  );

  const getDetectedFieldValue = useCallback((field: string) => {
    const stored = getTemplateFieldValue(field);
    if (stored) return stored;

    const normalized = normalizeFieldKey(field);
    if (['languages', 'language', 'languagestext'].includes(normalized)) {
      return (
        templateFieldValues.languages
        || templateFieldValues.language
        || templateFieldValues.languages_text
        || jsonPreviewData.languages_text
        || ''
      ).toString();
    }

    if (normalized === 'certifications' || normalized === 'certificationstext') {
      return (
        templateFieldValues.certifications
        || templateFieldValues.certifications_text
        || jsonPreviewData.certifications_text
        || ''
      ).toString();
    }

    if (
      normalized === 'awards'
      || normalized === 'awardstext'
      || normalized === 'achievements'
      || normalized === 'achievementstext'
    ) {
      return (
        templateFieldValues.awards
        || templateFieldValues.awards_text
        || templateFieldValues.achievements
        || templateFieldValues.achievements_text
        || jsonPreviewData.awards_text
        || ''
      ).toString();
    }

    const previewMatchKey = Object.keys(jsonPreviewData).find((key) => normalizeFieldKey(key) === normalized);
    const previewValue = previewMatchKey ? jsonPreviewData[previewMatchKey as keyof typeof jsonPreviewData] : '';

    if (typeof previewValue === 'string' || typeof previewValue === 'number') {
      return String(previewValue);
    }

    if (Array.isArray(previewValue)) {
      return previewValue
        .map((entry) => {
          if (typeof entry === 'string' || typeof entry === 'number') return String(entry);
          if (entry && typeof entry === 'object') {
            return (
              (entry as Record<string, unknown>).value
              || (entry as Record<string, unknown>).name
              || (entry as Record<string, unknown>).title
              || ''
            ).toString();
          }
          return '';
        })
        .filter(Boolean)
        .join('\n');
    }

    return '';
  }, [getTemplateFieldValue, jsonPreviewData, templateFieldValues]);

  const setDetectedFieldValue = useCallback((field: string, value: string) => {
    const normalized = normalizeFieldKey(field);
    if (normalized === 'language' || normalized === 'languages' || normalized === 'languagestext') {
      setTemplateFieldValue('languages', value);
      return;
    }
    if (normalized === 'certifications' || normalized === 'certificationstext') {
      setTemplateFieldValue('certifications', value);
      return;
    }
    if (
      normalized === 'awards'
      || normalized === 'awardstext'
      || normalized === 'achievements'
      || normalized === 'achievementstext'
    ) {
      setTemplateFieldValue('awards', value);
      return;
    }
    setTemplateFieldValue(field, value);
  }, [setTemplateFieldValue]);

  const languageList = useMemo(
    () => parseRichTextLines(getDetectedFieldValue('languages')),
    [getDetectedFieldValue]
  );

  const addLanguage = useCallback(() => {
    const entries = parseCommaOrNewline(languagesInput);
    if (entries.length === 0) return;
    const updated = [...languageList, ...entries];
    setDetectedFieldValue('languages', updated.join('\n'));
    setLanguagesInput('');
  }, [languageList, languagesInput, setDetectedFieldValue]);

  const removeLanguage = useCallback((index: number) => {
    const updated = languageList.filter((_, idx) => idx !== index);
    setDetectedFieldValue('languages', updated.join('\n'));
  }, [languageList, setDetectedFieldValue]);

  const isLongDetectedField = useCallback((field: string) => {
    const normalized = normalizeFieldKey(field);
    return (
      normalized === 'languages'
      || normalized === 'language'
      || normalized === 'languagestext'
      || normalized === 'references'
      || normalized === 'certifications'
      || normalized === 'certificationstext'
      || normalized === 'awards'
      || normalized === 'awardstext'
      || normalized === 'achievements'
      || normalized === 'achievementstext'
      || normalized.endsWith('text')
      || normalized.includes('summary')
      || normalized.includes('about')
      || normalized.includes('profile')
      || normalized.includes('objective')
      || normalized.includes('certification')
    );
  }, []);

  const getDetectedFieldInputType = useCallback((field: string) => {
    const normalized = normalizeFieldKey(field);
    if (normalized.includes('email')) return 'email';
    if (normalized.includes('phone') || normalized.includes('mobile')) return 'tel';
    if (
      normalized.includes('website')
      || normalized.includes('portfolio')
      || normalized.includes('linkedin')
      || normalized.includes('github')
      || normalized.endsWith('url')
    ) {
      return 'url';
    }
    return 'text';
  }, []);

  const sectionCompletion = useMemo(() => {
    const getPlainText = (value: string) => parseRichTextInlineText(value);
    const hasChars = (value: string, minChars = 2) => getPlainText(value).length >= minChars;
    const hasLongText = (value: string, minChars = 20) => getPlainText(value).length >= minChars;
    const parseItems = (value: string) =>
      value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter((item) => item.length >= 2);

    const anyExperienceFilled = experienceItems.some((item) => {
      const roleOk = hasChars(item.role, 2);
      const companyOk = hasChars(item.company, 2);
      const datesOk = hasChars(item.dates, 4);
      const detailsOk = hasLongText(item.details, 12);
      return roleOk && companyOk && datesOk && detailsOk;
    });

    const anyEducationFilled = educationItems.some((item) => {
      const degreeOk = hasChars(item.degree, 2);
      const schoolOk = hasChars(item.school, 2);
      const datesOk = hasChars(item.dates, 4);
      const detailsOk = hasLongText(item.details, 12);
      return degreeOk && schoolOk && datesOk && detailsOk;
    });

    const allPersonalInfoFilled = personalInfoFields.length > 0
      && personalInfoFields.every((field) => hasChars(getDetectedFieldValue(field), 2));
    const anyLanguagesFilled = languageFields.some((field) => hasChars(getDetectedFieldValue(field), 2));
    const anyCertificationsFilled = certificationFields.some((field) => hasChars(getDetectedFieldValue(field), 3));
    const anyAwardsFilled = awardFields.some((field) => hasChars(getDetectedFieldValue(field), 3));
    const anyReferencesFilled = referenceFields.some((field) => hasChars(getDetectedFieldValue(field), 3));
    const skillsCount = parseItems(skillsText).length;

    return {
      contact: (!showNameField || hasChars(contactName, 2)) && (!showRoleField || hasChars(contactRole, 2)),
      personal_info: allPersonalInfoFilled,
      summary: hasLongText(summaryText, 30),
      experience: anyExperienceFilled,
      education: anyEducationFilled,
      skills: skillsCount >= 2,
      languages: anyLanguagesFilled,
      certifications: anyCertificationsFilled,
      awards: anyAwardsFilled,
      references: anyReferencesFilled,
    } as Record<string, boolean>;
  }, [
    awardFields,
    contactName,
    contactRole,
    educationItems,
    experienceItems,
    certificationFields,
    getDetectedFieldValue,
    languageFields,
    personalInfoFields,
    referenceFields,
    showNameField,
    showRoleField,
    skillsText,
    summaryText,
  ]);

  const handleDragStart = (id: string) => setDraggingSection(id);

  const handleDrop = (targetId: string) => {
    if (!draggingSection || draggingSection === targetId) return;
    setSectionOrder((prev) => {
      const next = [...prev];
      const fromIndex = next.indexOf(draggingSection);
      const toIndex = next.indexOf(targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, draggingSection);
      return next;
    });
    setDraggingSection(null);
  };

  const availableSections = useMemo(() => ([
    showContactSection ? 'contact' : null,
    showPersonalInfoSection ? 'personal_info' : null,
    showSummarySection ? 'summary' : null,
    showExperienceSection ? 'experience' : null,
    showEducationSection ? 'education' : null,
    showSkillsSection ? 'skills' : null,
    showAwardsSection ? 'awards' : null,
    showLanguagesSection ? 'languages' : null,
    showCertificationsSection ? 'certifications' : null,
    showReferencesSection ? 'references' : null,
  ].filter(Boolean) as string[]), [
    showAwardsSection,
    showCertificationsSection,
    showContactSection,
    showEducationSection,
    showExperienceSection,
    showLanguagesSection,
    showPersonalInfoSection,
    showReferencesSection,
    showSkillsSection,
    showSummarySection,
  ]);

  useEffect(() => {
    setSectionOrder((prev) => {
      const next = prev.filter((id) => availableSections.includes(id));
      availableSections.forEach((id) => {
        if (!next.includes(id)) next.push(id);
      });
      return next;
    });
  }, [availableSections]);

  useEffect(() => {
    if (availableSections.length === 0) {
      setUnlockedSections([]);
      setActiveSectionId(null);
      return;
    }

    setUnlockedSections(availableSections);

    if (templateStep !== 'edit') {
      if (activeSectionId && !availableSections.includes(activeSectionId)) {
        setActiveSectionId(null);
      }
      return;
    }

    const defaultSectionId = availableSections.includes('contact')
      ? 'contact'
      : availableSections[0];

    // In edit mode, always open Personal Information/Contact by default.
    if (!activeSectionId || !availableSections.includes(activeSectionId)) {
      setActiveSectionId(defaultSectionId);
    }
  }, [activeSectionId, availableSections, templateStep]);

  const isStepMode = templateStep === 'edit';
  const showStepChrome = true;
  const showProgressCard = !isEditorRoute;
  const stepSections = useMemo(
    () => sectionOrder.filter((id) => availableSections.includes(id)),
    [sectionOrder, availableSections]
  );
  const currentStepIndex = Math.max(0, stepSections.indexOf(activeSectionId || stepSections[0]));
  const currentStepId = stepSections[currentStepIndex];
  const totalSteps = stepSections.length || 1;
  const isLastStep = currentStepIndex >= totalSteps - 1;

  useEffect(() => {
    if (stepSections.length === 0) return;
    if (!isLastStep) return;
    setHasUnlockedCustomize(true);
  }, [isLastStep, stepSections.length]);

  const goNextStep = () => {
    if (currentStepIndex < stepSections.length - 1) {
      setActiveSectionId(stepSections[currentStepIndex + 1]);
    }
  };

  const goPrevStep = () => {
    if (currentStepIndex > 0) {
      setActiveSectionId(stepSections[currentStepIndex - 1]);
    }
  };

  const handleTemplateSelect = useCallback((template: TemplateListItem) => {
    const templateSlug = slugifyTemplate(template.name.split('/').pop() || template.name);
    if (isEditorRoute) {
      const nextStorageKey = `hirevo:resume-editor:${templateSlug || 'default'}:${user?.id || 'anon'}`;
      window.localStorage.setItem(nextStorageKey, getEditorSnapshotRef.current());
      restoreKeyRef.current = nextStorageKey;
    }
    selectTemplate(template.name);
    setTemplateStep('edit');

    if (isBuilderEditorRoute) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('template', templateSlug);
      nextParams.delete('upload');
      const nextSearch = nextParams.toString();
      navigate(`/resume-builder/editor${nextSearch ? `?${nextSearch}` : ''}`, { replace: false });
      return;
    }

    if (templateId) {
      navigate(`/resume-editor/${encodeURIComponent(templateSlug)}`, { replace: false });
    }
  }, [isBuilderEditorRoute, isEditorRoute, navigate, searchParams, selectTemplate, templateId, user?.id]);

  const handleTemplatePickerSelect = useCallback((template: TemplateListItem) => {
    handleTemplateSelect(template);
    setShowTemplatePicker(false);
  }, [handleTemplateSelect]);

  const handleCustomizeTemplateSelect = useCallback((template: TemplateListItem) => {
    handleTemplateSelect(template);
    setActiveEditorTab('edit');
  }, [handleTemplateSelect]);

  const ensureEditModeReady = useCallback(() => {
    if (selectedTemplate) {
      setTemplateStep('edit');
      setActiveSectionId('contact');
      setGenerateError(null);
      return true;
    }
    const fallbackTemplate = filteredTemplates[0];
    if (!fallbackTemplate) {
      setGenerateError('No resume template is available yet.');
      return false;
    }
    handleTemplateSelect(fallbackTemplate);
    setActiveSectionId('contact');
    setGenerateError(null);
    return true;
  }, [filteredTemplates, handleTemplateSelect, selectedTemplate]);

  const ensurePreviewRoot = useCallback((doc: Document) => {
    const body = doc.body;
    if (!body) return null;
    const rootId = 'resume-preview-root';
    let root = doc.getElementById(rootId) as HTMLElement | null;
    if (!root) {
      const originalHtml = body.dataset.originalHtml ?? body.innerHTML;
      body.dataset.originalHtml = originalHtml;
      body.innerHTML = `<div id="${rootId}">${originalHtml}</div>`;
      root = doc.getElementById(rootId) as HTMLElement | null;
    }
    return root;
  }, []);

  const previewUsesInternalFit = useCallback((doc: Document) => {
    return Boolean(doc.querySelector('[data-preview-fit-managed="true"]'));
  }, []);

  const applyPreviewFontScale = useCallback((doc: Document, root: HTMLElement, scale: number) => {
    const view = doc.defaultView;
    if (!view) return;
    const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
    elements.forEach((el) => {
      const style = view.getComputedStyle(el);
      if (!style) return;
      if (!el.dataset.previewFontSize) {
        el.dataset.previewFontSize = style.fontSize;
      }
      const baseFont = Number.parseFloat(el.dataset.previewFontSize);
      if (Number.isFinite(baseFont)) {
        el.style.fontSize = `${baseFont * scale}px`;
      }
      if (!el.dataset.previewLineHeight) {
        el.dataset.previewLineHeight = style.lineHeight;
      }
      const baseLine = Number.parseFloat(el.dataset.previewLineHeight);
      if (Number.isFinite(baseLine)) {
        el.style.lineHeight = `${baseLine * scale}px`;
      }
      if (!el.dataset.previewLetterSpacing) {
        el.dataset.previewLetterSpacing = style.letterSpacing;
      }
      const baseLetterSpacing = Number.parseFloat(el.dataset.previewLetterSpacing);
      if (Number.isFinite(baseLetterSpacing)) {
        el.style.letterSpacing = `${baseLetterSpacing * scale}px`;
      }
    });
  }, []);

  const fitPreviewToPage = useCallback(() => {
    if (!ENABLE_PREVIEW_PAGINATION) {
      previewFontScaleRef.current = 1;
      return;
    }
    const frame = previewFrameRef.current;
    const doc = frame?.contentDocument;
    if (!doc) return;
    if (previewUsesInternalFit(doc)) {
      previewFontScaleRef.current = 1;
      return;
    }
    const root = ensurePreviewRoot(doc);
    if (!root) return;

    let appliedScale = PREVIEW_FONT_SCALES[PREVIEW_FONT_SCALES.length - 1] || 1;
    for (const scale of PREVIEW_FONT_SCALES) {
      applyPreviewFontScale(doc, root, scale);
      const height = root.scrollHeight;
      if (height <= activePageSize.height) {
        appliedScale = scale;
        break;
      }
    }
    previewFontScaleRef.current = appliedScale;
  }, [activePageSize.height, applyPreviewFontScale, ensurePreviewRoot, previewUsesInternalFit]);

  const attachPreviewContentObserver = useCallback(() => {
    const frame = previewFrameRef.current;
    const doc = frame?.contentDocument;
    const view = doc?.defaultView;
    if (!doc || !view) return;
    if (!ENABLE_PREVIEW_PAGINATION) {
      previewContentObserverRef.current?.disconnect();
      return;
    }
    if (previewUsesInternalFit(doc)) return;
    const root = ensurePreviewRoot(doc);
    if (!root) return;
    previewContentObserverRef.current?.disconnect();
    const observer = new view.ResizeObserver(() => {
      fitPreviewToPage();
    });
    observer.observe(root);
    previewContentObserverRef.current = observer;
  }, [ensurePreviewRoot, fitPreviewToPage, previewUsesInternalFit]);

  const handleCreateResumeClick = useCallback(() => {
    ensureEditModeReady();
  }, [ensureEditModeReady]);

  const applyPreviewPagination = useCallback(() => {
    const frame = previewFrameRef.current;
    const doc = frame?.contentDocument;
    if (!doc) return;
    const body = doc.body;
    if (!body) return;

    if (!ENABLE_PREVIEW_PAGINATION || previewUsesInternalFit(doc)) {
      const originalHtml = body.dataset.originalHtml ?? body.innerHTML;
      body.dataset.originalHtml = originalHtml;
      body.dataset.paginated = 'disabled';
      const styleId = 'resume-preview-pagination-style';
      const styleTag = doc.getElementById(styleId) as HTMLStyleElement | null;
      if (styleTag) {
        styleTag.textContent = '';
      }
      if (body.innerHTML !== originalHtml) {
        body.innerHTML = originalHtml;
      }

      const { width, height } = getPreviewDocumentSize(doc, activePageSize);
      body.dataset.measureWidth = String(width);
      body.dataset.measureHeight = String(height);
      previewContentHeightRef.current = height;
      return;
    }

    const pageKey = `${resolvedPageSize}-${activePageSize.width}x${activePageSize.height}`;
    if (body.dataset.paginated === pageKey) return;

    const originalHtml = body.dataset.originalHtml ?? body.innerHTML;
    body.dataset.originalHtml = originalHtml;
    body.dataset.paginated = pageKey;

    const styleId = 'resume-preview-pagination-style';
    let styleTag = doc.getElementById(styleId) as HTMLStyleElement | null;
    const styleContent = `
      html, body {
        height: auto !important;
        min-height: auto !important;
        overflow: visible !important;
      }
      body {
        margin: 0;
        padding: 0;
        background: transparent;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        width: 100%;
      }
      .resume-preview-viewport {
        width: ${activePageSize.width}px;
        height: ${activePageSize.height}px;
        overflow: hidden;
      }
      .resume-preview-pages {
        display: flex;
        flex-direction: row;
        gap: ${PAGE_GAP_PX}px;
        align-items: center;
        width: max-content;
        transition: transform 240ms ease;
        will-change: transform;
      }
      .resume-preview-page {
        width: ${activePageSize.width}px;
        min-height: ${activePageSize.height}px;
        height: ${activePageSize.height}px;
        background: transparent;
        box-shadow: none;
        box-sizing: border-box;
        overflow: hidden;
        display: flex;
        flex: 0 0 auto;
        justify-content: center;
      }
      .resume-preview-page-content {
        width: 100%;
        height: 100%;
        padding: 0;
        box-sizing: border-box;
        overflow: hidden;
      }
      .resume-preview-page-content > * {
        box-sizing: border-box;
      }
    `.trim();

    if (!styleTag) {
      styleTag = doc.createElement('style');
      styleTag.id = styleId;
      doc.head.appendChild(styleTag);
    }
    styleTag.textContent = styleContent;

    const measureWrapper = doc.createElement('div');
    measureWrapper.style.position = 'absolute';
    measureWrapper.style.visibility = 'hidden';
    measureWrapper.style.width = `${activePageSize.width}px`;
    measureWrapper.style.left = '-99999px';
    measureWrapper.style.top = '0';
    measureWrapper.innerHTML = originalHtml;
    body.appendChild(measureWrapper);
    const measuredWidth = measureWrapper.scrollWidth || measureWrapper.offsetWidth || activePageSize.width;
    const measuredHeight = measureWrapper.scrollHeight || measureWrapper.offsetHeight || activePageSize.height;
    body.removeChild(measureWrapper);
    body.dataset.measureWidth = String(measuredWidth);
    body.dataset.measureHeight = String(measuredHeight);

    const temp = doc.createElement('div');
    temp.innerHTML = originalHtml;

    const candidateRoots = Array.from(temp.children).filter(
      (el) => !['SCRIPT', 'STYLE'].includes(el.tagName)
    ) as HTMLElement[];
    const rootTemplate = candidateRoots.length === 1 ? candidateRoots[0] : null;
    const selectors = '[data-resume-block],[data-section],[data-block],section';
    const directMatches = (el: Element) =>
      Array.from(el.children).filter((child) => child.matches(selectors));
    const isMeaningfulNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent || '').trim().length > 0;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (['SCRIPT', 'STYLE'].includes(el.tagName)) return false;
      }
      return true;
    };
    const getBlockNodes = () => {
      const root = rootTemplate ?? temp;
      const meaningful = Array.from(root.childNodes).filter(isMeaningfulNode);
      const wrapper =
        meaningful.length === 1 && meaningful[0].nodeType === Node.ELEMENT_NODE
          ? (meaningful[0] as Element)
          : null;
      if (wrapper) {
        const scoped = directMatches(wrapper);
        if (scoped.length > 0) return scoped;
      }
      if (rootTemplate) {
        const scoped = directMatches(rootTemplate);
        if (scoped.length > 0) return scoped;
      }
      return meaningful;
    };
    const sectionNodes = getBlockNodes();

    const pagesWrapper = doc.createElement('div');
    pagesWrapper.className = 'resume-preview-pages';

    const viewport = doc.createElement('div');
    viewport.className = 'resume-preview-viewport';
    viewport.appendChild(pagesWrapper);

    body.innerHTML = '';
    body.appendChild(viewport);

    const createPage = () => {
      const page = doc.createElement('div');
      page.className = 'resume-preview-page';
      const content = doc.createElement('div');
      content.className = 'resume-preview-page-content';
      page.appendChild(content);
      pagesWrapper.appendChild(page);
      return content;
    };

    let currentPage = createPage();
    let currentShell: HTMLElement | null = null;

    const createPageShell = () => {
      if (!rootTemplate) return null;
      const shell = rootTemplate.cloneNode(false) as HTMLElement;
      // Prevent fixed page containers from forcing extra pagination.
      shell.style.minHeight = 'auto';
      shell.style.height = 'auto';
      shell.style.maxHeight = 'none';
      // Ensure floats are contained for correct height measurement.
      shell.style.display = 'flow-root';
      currentPage.appendChild(shell);
      return shell;
    };

    currentShell = createPageShell();

    const isContentEmpty = (content: HTMLElement) => {
      const text = (content.textContent || '').trim();
      if (text.length > 0) return false;
      return content.querySelector('*') === null;
    };

    const nodes = sectionNodes.filter(isMeaningfulNode);

    const splitElementAcrossPages = (element: HTMLElement) => {
      const children = Array.from(element.childNodes).filter(isMeaningfulNode);
      if (children.length <= 1) return false;
      const createContainer = () => {
        const container = element.cloneNode(false) as HTMLElement;
        container.style.minHeight = 'auto';
        container.style.height = 'auto';
        container.style.maxHeight = 'none';
        container.style.display = 'flow-root';
        (currentShell ?? currentPage).appendChild(container);
        return container;
      };
      let container = createContainer();
      children.forEach((child) => {
        container.appendChild(child);
        if (currentPage.scrollHeight <= currentPage.clientHeight) return;
        container.removeChild(child);
        if (isContentEmpty(container)) {
          container.remove();
        }
        currentPage = createPage();
        currentShell = createPageShell();
        container = createContainer();
        container.appendChild(child);
        if (currentPage.scrollHeight > currentPage.clientHeight) {
          // Still too tall; keep it to avoid losing content.
        }
      });
      return true;
    };

    nodes.forEach((node) => {
      const target = currentShell ?? currentPage;
      target.appendChild(node);
      if (currentPage.scrollHeight <= currentPage.clientHeight) return;

      target.removeChild(node);

      if (node.nodeType === Node.ELEMENT_NODE) {
        const didSplit = splitElementAcrossPages(node as HTMLElement);
        if (didSplit) return;
      }

      if (!isContentEmpty(target)) {
        currentPage = createPage();
        currentShell = createPageShell();
      }
      (currentShell ?? currentPage).appendChild(node);
      if (currentPage.scrollHeight > currentPage.clientHeight) {
        // Block is taller than a page; allow overflow within this page.
      }
    });

    Array.from(pagesWrapper.children).forEach((page) => {
      const content = page.querySelector('.resume-preview-page-content') as HTMLElement | null;
      if (content && isContentEmpty(content)) {
        page.remove();
      }
    });
    if (pagesWrapper.children.length === 0) {
      createPage();
    }
    pagesWrapper.style.transform = 'translateX(0px)';
  }, [activePageSize.height, activePageSize.width, fitPreviewToPage, previewUsesInternalFit, resolvedPageSize]);

  const updatePreviewPaging = useCallback(() => {
    const frame = previewFrameRef.current;
    const doc = frame?.contentDocument;
    if (!ENABLE_PREVIEW_PAGINATION || (doc && previewUsesInternalFit(doc))) {
      setPreviewPageCount(1);
      setPreviewPage(1);
      return;
    }
    const pageHeight = activePageSize.height;
    const pages = frame?.contentDocument?.querySelector('.resume-preview-pages');
    const count = pages
      ? Math.max(1, pages.children.length)
      : Math.max(1, Math.ceil((previewContentHeightRef.current || pageHeight) / pageHeight));
    setPreviewPageCount(count);
    setPreviewPage((prev) => Math.min(Math.max(prev, 1), count));
  }, [activePageSize.height, previewUsesInternalFit]);

  const updatePreviewShellScale = useCallback((pageWidth: number, pageHeight: number) => {
    const shell = previewShellRef.current;
    const body = previewBodyRef.current;
    if (!shell) return;

    const availableWidth = Math.max((body?.clientWidth ?? pageWidth) - 32, 0);
    const scale = pageWidth > 0 ? Math.min(1, availableWidth / pageWidth) : 1;

    previewScaleRef.current = scale;
    shell.style.setProperty('--preview-scale', `${scale}`);
    shell.style.setProperty('--preview-shell-width', `${pageWidth}px`);
    shell.style.setProperty('--preview-shell-height', `${pageHeight}px`);
    shell.style.setProperty('--preview-shell-scaled-width', `${Math.round(pageWidth * scale)}px`);
    shell.style.setProperty('--preview-shell-scaled-height', `${Math.round(pageHeight * scale)}px`);
  }, []);

  const updatePreviewFrameSize = useCallback(() => {
    const frame = previewFrameRef.current;
    if (!frame) return;
    const pageWidth = activePageSize.width;
    const pageHeight = activePageSize.height;
    frame.style.width = `${pageWidth}px`;
    frame.style.height = `${pageHeight}px`;
    const doc = frame.contentDocument;
    if (!doc) return;
    const body = doc.body;
    if (!body) return;
    if (!ENABLE_PREVIEW_PAGINATION || previewUsesInternalFit(doc)) {
      const { width, height } = getPreviewDocumentSize(doc, activePageSize);
      body.dataset.measureWidth = String(width);
      body.dataset.measureHeight = String(height);
      previewContentHeightRef.current = height;
      frame.style.width = `${width}px`;
      frame.style.height = `${height}px`;
      updatePreviewShellScale(width, height);
      updatePreviewPaging();
      return;
    }
    const measuredWidth = Number(body.dataset.measureWidth || pageWidth) || pageWidth;
    const measuredHeight = Number(body.dataset.measureHeight || pageHeight) || pageHeight;
    const height = pageHeight;
    const width = pageWidth;
    if (ENABLE_PREVIEW_PAGINATION && previewPageSizeMode === 'auto' && !autoDetectLockedRef.current && width > 0) {
      const ratio = measuredHeight / measuredWidth;
      const a4Ratio = PAGE_SIZES.a4.height / PAGE_SIZES.a4.width;
      const letterRatio = PAGE_SIZES.letter.height / PAGE_SIZES.letter.width;
      const detected = Math.abs(ratio - a4Ratio) <= Math.abs(ratio - letterRatio) ? 'a4' : 'letter';
      if (detected !== autoDetectedPageSize) {
        setAutoDetectedPageSize(detected);
      }
      autoDetectLockedRef.current = true;
    }
    const pages = doc.querySelector('.resume-preview-pages');
    const pageCount = pages
      ? Math.max(
          1,
          Array.from(pages.children).filter((page) =>
            (page.querySelector('.resume-preview-page-content')?.textContent || '').trim().length > 0
            || page.querySelector('.resume-preview-page-content')?.querySelector('*')
          ).length
        )
      : 1;
    previewContentHeightRef.current = ENABLE_PREVIEW_PAGINATION ? pageCount * activePageSize.height : height;
    frame.style.height = `${height}px`;
    frame.style.width = `${width}px`;
    updatePreviewShellScale(width, height);
    updatePreviewPaging();
  }, [
    activePageSize.height,
    activePageSize.width,
    autoDetectedPageSize,
    previewUsesInternalFit,
    previewPageSizeMode,
    updatePreviewShellScale,
    updatePreviewPaging,
  ]);

  const syncPreviewPagePosition = useCallback((targetPage: number) => {
    if (!ENABLE_PREVIEW_PAGINATION) return;
    const frame = previewFrameRef.current;
    const doc = frame?.contentDocument;
    if (!doc) return;
    const pagesWrapper = doc.querySelector('.resume-preview-pages') as HTMLElement | null;
    if (!pagesWrapper) return;
    const pageWidth = activePageSize.width;
    const maxPage = Math.max(1, Math.ceil((previewContentHeightRef.current || activePageSize.height) / activePageSize.height));
    const clamped = Math.min(maxPage, Math.max(1, targetPage));
    pagesWrapper.style.transform = `translateX(-${(clamped - 1) * (pageWidth + PAGE_GAP_PX)}px)`;
  }, [activePageSize.height, activePageSize.width]);

  const scrollPreviewToPage = useCallback((targetPage: number) => {
    if (!ENABLE_PREVIEW_PAGINATION) {
      setPreviewPage(1);
      return;
    }
    const pageHeight = activePageSize.height;
    const maxPage = Math.max(1, Math.ceil((previewContentHeightRef.current || pageHeight) / pageHeight));
    const clamped = Math.min(maxPage, Math.max(1, targetPage));
    setPreviewPage(clamped);
    syncPreviewPagePosition(clamped);
  }, [activePageSize.height, syncPreviewPagePosition]);

  const handlePreviewLoad = useCallback(() => {
    applyPreviewPagination();
    const frame = previewFrameRef.current;
    const doc = frame?.contentDocument;
    if (doc?.body) {
      doc.body.dataset.hirevoLivePreview = 'true';
    }
    requestAnimationFrame(() => {
      updatePreviewFrameSize();
      fitPreviewToPage();
      attachPreviewContentObserver();
    });

    if (!doc || ENABLE_PREVIEW_PAGINATION) return;

    const refreshPreviewSize = () => {
      requestAnimationFrame(() => {
        updatePreviewFrameSize();
      });
    };

    doc.fonts?.ready.then(refreshPreviewSize).catch(() => {});
    Array.from(doc.images).forEach((image) => {
      if (image.complete) return;
      image.addEventListener('load', refreshPreviewSize, { once: true });
      image.addEventListener('error', refreshPreviewSize, { once: true });
    });
  }, [applyPreviewPagination, attachPreviewContentObserver, fitPreviewToPage, updatePreviewFrameSize]);

  const normalizeImportKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');
  const humanizeFileName = (name: string) =>
    name
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const findFirstByKeys = useCallback((root: unknown, keys: string[]) => {
    if (!root || typeof root !== 'object') return undefined;

    const normalized = new Set(keys.map((key) => normalizeImportKey(key)));
    const queue: unknown[] = [root];
    const visited = new WeakSet<object>();

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || typeof current !== 'object') continue;
      if (visited.has(current as object)) continue;
      visited.add(current as object);

      if (Array.isArray(current)) {
        current.forEach((item) => queue.push(item));
        continue;
      }

      for (const [entryKey, entryValue] of Object.entries(current as Record<string, unknown>)) {
        if (normalized.has(normalizeImportKey(entryKey))) {
          return entryValue;
        }
        if (entryValue && typeof entryValue === 'object') {
          queue.push(entryValue);
        }
      }
    }

    return undefined;
  }, []);

  const toStringValue = (value: unknown) => {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    return '';
  };

  const toStringList = (value: unknown) => {
    if (Array.isArray(value)) {
      return value.map((item) => toStringValue(item)).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(/[\n,;|]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  };

  const mapExperienceEntries = (raw: unknown) => {
    if (!Array.isArray(raw)) return [] as typeof experienceItems;
    return raw
      .map((entry, index) => {
        const record = (entry && typeof entry === 'object') ? (entry as Record<string, unknown>) : {};
        const role = toStringValue(record.role ?? record.title ?? record.position ?? record.job_title);
        const company = toStringValue(record.company ?? record.employer ?? record.organization);
        const dates = toStringValue(record.dates ?? record.date ?? record.period ?? record.duration ?? record.years);
        const detailsSource = record.details ?? record.description ?? record.summary ?? record.responsibilities;
        const details = Array.isArray(detailsSource)
          ? detailsSource.map((item) => toStringValue(item)).filter(Boolean).join('\n')
          : toStringValue(detailsSource);
        if (![role, company, dates, details].some(Boolean)) return null;
        return { id: `exp-import-${index + 1}`, role, company, dates, details };
      })
      .filter((item): item is { id: string; role: string; company: string; dates: string; details: string } => Boolean(item));
  };

  const mapEducationEntries = (raw: unknown) => {
    if (!Array.isArray(raw)) return [] as typeof educationItems;
    return raw
      .map((entry, index) => {
        const record = (entry && typeof entry === 'object') ? (entry as Record<string, unknown>) : {};
        const degree = toStringValue(record.degree ?? record.course ?? record.qualification);
        const school = toStringValue(record.school ?? record.university ?? record.institution ?? record.institute);
        const dates = toStringValue(record.dates ?? record.date ?? record.period ?? record.duration ?? record.years);
        const detailsSource = record.details ?? record.description ?? record.summary;
        const details = Array.isArray(detailsSource)
          ? detailsSource.map((item) => toStringValue(item)).filter(Boolean).join('\n')
          : toStringValue(detailsSource);
        if (![degree, school, dates, details].some(Boolean)) return null;
        return { id: `edu-import-${index + 1}`, degree, school, dates, details };
      })
      .filter((item): item is { id: string; degree: string; school: string; dates: string; details: string } => Boolean(item));
  };

  const handleUploadResumeClick = useCallback(() => {
    resumeUploadInputRef.current?.click();
  }, []);

  useEffect(() => {
    if (!isEditorRoute) return;
    if (!uploadQueryParam) return;
    const timer = window.setTimeout(() => {
      handleUploadResumeClick();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [handleUploadResumeClick, isEditorRoute, uploadQueryParam]);

  const handleUploadResumeFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadingResume(true);
    setGenerateError(null);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const localDevHost = typeof window !== 'undefined'
        && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const prefersLocalFallback = localDevHost && !/localhost|127\.0\.0\.1/i.test(API_BASE);
      const uploadEndpoints = [
        apiUrl('/upload-resume'),
        ...(prefersLocalFallback ? ['http://localhost:5000/api/upload-resume'] : []),
      ];

      let response: AxiosResponse<Record<string, unknown>> | null = null;
      let lastError: unknown = null;
      for (const endpoint of uploadEndpoints) {
        try {
          response = await axios.post<Record<string, unknown>>(endpoint, formData, {
            timeout: RESUME_UPLOAD_TIMEOUT_MS,
          });
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
        }
      }

      if (lastError) {
        throw lastError;
      }
      if (!response) {
        throw new Error('Resume upload request did not return a response.');
      }

      const payload = response.data || {};
      const parserUnavailable = payload.parser_unavailable === true;
      if (parserUnavailable) {
        if (!contactName.trim()) {
          const fallbackName = humanizeFileName(file.name);
          if (fallbackName) setContactName(fallbackName);
        }
        ensureEditModeReady();
        setGenerateError('Parser is offline, so fields were not auto-filled. You can still edit manually.');
        return;
      }
      const metadata = (payload.resume_metadata && typeof payload.resume_metadata === 'object')
        ? (payload.resume_metadata as Record<string, unknown>)
        : {};

      const importedName = toStringValue(findFirstByKeys(metadata, ['name', 'full_name', 'fullname', 'candidate_name']));
      const importedRole = toStringValue(findFirstByKeys(metadata, ['role', 'title', 'position', 'job_title', 'target_role']));
      const importedEmail = toStringValue(findFirstByKeys(metadata, ['email', 'mail']));
      const importedPhone = toStringValue(findFirstByKeys(metadata, ['phone', 'mobile', 'phone_number']));
      const importedLocation = toStringValue(findFirstByKeys(metadata, ['location', 'address', 'city', 'country']));
      const importedSummary = toStringValue(findFirstByKeys(metadata, ['summary', 'profile', 'objective', 'professional_summary']))
        || toStringValue(payload.summary);

      const metadataSkills = toStringList(
        findFirstByKeys(metadata, ['skills', 'skillset', 'key_skills', 'keywords', 'technical_skills', 'technicalSkills'])
      );
      const importedSkills = (
        metadataSkills.length > 0
          ? metadataSkills
          : toStringList(payload.keywords_matched)
      ).filter((value, index, list) => list.indexOf(value) === index);

      const importedExperience = mapExperienceEntries(
        findFirstByKeys(metadata, ['experience', 'work_experience', 'employment_history'])
      );
      const importedEducation = mapEducationEntries(
        findFirstByKeys(metadata, ['education', 'academic_history'])
      );
      const importedProjects = toStringList(
        findFirstByKeys(metadata, ['projects', 'personal_projects', 'personalProjects', 'project_experience', 'portfolio_projects'])
      );

      if (importedName) setContactName(importedName);
      if (importedRole) setContactRole(importedRole);
      if (importedEmail) setContactEmail(importedEmail);
      if (importedPhone) setContactPhone(importedPhone);
      if (importedLocation) setContactLocation(importedLocation);
      if (importedSummary) setSummaryText(importedSummary);
      if (importedSkills.length > 0) setSkillsText(importedSkills.join(', '));
      if (importedExperience.length > 0) setExperienceItems(importedExperience);
      if (importedEducation.length > 0) setEducationItems(importedEducation);
      if (importedProjects.length > 0) setProjectsText(importedProjects.join('\n'));

      ensureEditModeReady();
    } catch (error: any) {
      const statusCode = Number(error?.response?.status || 0);
      if (statusCode >= 500) {
        console.warn('Resume upload server error:', error);
      } else {
        console.error('Resume upload error:', error);
      }
      const isTimedOut =
        error?.code === 'ECONNABORTED'
        || /timeout/i.test(String(error?.message || ''));
      const serviceUnavailable = Number(error?.response?.status) === 503;
      const message = isTimedOut
        ? `Resume parsing timed out after ${Math.round(RESUME_UPLOAD_TIMEOUT_MS / 1000)}s. Please retry.`
        : serviceUnavailable
          ? 'Resume parser service is not running. Please start it and retry upload.'
        : typeof error?.response?.data?.error === 'string'
          ? error.response.data.error
          : 'Failed to upload and parse resume.';
      setGenerateError(message);
    } finally {
      setUploadingResume(false);
    }
  }, [ensureEditModeReady, findFirstByKeys]);

  const buildPdfExportHtml = useCallback(async (filenameBase: string) => {
    const inlineImageUrl = async (src: string) => {
      const trimmed = src.trim();
      if (!trimmed || trimmed.startsWith('data:')) return trimmed;

      try {
        const response = await fetch(trimmed);
        if (!response.ok) return trimmed;
        const blob = await response.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to inline image.'));
          reader.readAsDataURL(blob);
        });
      } catch {
        return trimmed;
      }
    };

    const inlineImagesInNode = async (root: ParentNode) => {
      const images = Array.from(root.querySelectorAll<HTMLImageElement>('img[src]'));
      await Promise.all(images.map(async (image) => {
        const source = image.getAttribute('src');
        if (!source) return;
        const inlinedSource = await inlineImageUrl(source);
        if (inlinedSource) {
          image.setAttribute('src', inlinedSource);
        }
      }));
    };

    const serializeHtmlDocument = (doc: Document) => `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;

    if (templateSourceHtml) {
      const renderedTemplateHtml = applyRichTextLineStylesToTemplateHtml(
        applyActiveTemplateCustomization(
          renderTemplateWithSchema(templateSourceHtml, buildTemplateRenderView())
        )
      );

      if (typeof DOMParser === 'undefined') {
        return renderedTemplateHtml;
      }

      const doc = new DOMParser().parseFromString(renderedTemplateHtml, 'text/html');
      doc.title = `${filenameBase} Resume`;
      await inlineImagesInNode(doc);
      return serializeHtmlDocument(doc);
    }

    if (selectedTemplate) {
      throw new Error('The selected template is still loading. Wait for the preview to finish, then download again.');
    }

    const pdfData = buildJsonResumeData();
    const photoUrl = await inlineImageUrl((pdfData.photo_url || '').toString());
    const contactItems = (pdfData.contact || [])
      .map((item: { label?: string; value?: string }) => {
        const label = (item.label || '').toString().trim();
        const value = (item.value || '').toString().trim();
        if (!label || !value) return null;

        const lowerLabel = label.toLowerCase();
        let href = '';
        if (lowerLabel.includes('email')) href = `mailto:${value}`;
        else if (lowerLabel.includes('phone')) href = `tel:${value.replace(/\s+/g, '')}`;
        else if (/^(https?:)?\/\//i.test(value)) href = value;
        else if (lowerLabel.includes('website') || lowerLabel.includes('linkedin') || lowerLabel.includes('github')) {
          href = `https://${value.replace(/^https?:\/\//i, '')}`;
        }

        return { label, value, href };
      })
      .filter(Boolean) as Array<{ label: string; value: string; href?: string }>;

    const stripBulletMarker = (value: string) => value.replace(/^[-*\u2022\u2023]+\s*/, '').trim();

    return buildResumePdfHtml({
      fullName: (pdfData.full_name || filenameBase || 'Resume').toString(),
      role: (pdfData.role || '').toString(),
      summary: (pdfData.summary || '').toString(),
      photoUrl,
      accentColor: activeTemplateAccentColor,
      contactItems,
      experience: (pdfData.experience || []).map((item: {
        role?: string;
        company?: string;
        dates?: string;
        bullets?: string[];
        highlights?: string;
      }) => ({
        title: (item.role || 'Experience').toString().trim(),
        subtitle: (item.company || '').toString().trim(),
        dates: (item.dates || '').toString().trim(),
        bullets: Array.isArray(item.bullets) && item.bullets.length > 0
          ? item.bullets.map((bullet) => stripBulletMarker((bullet || '').toString())).filter(Boolean)
          : parseNewline((item.highlights || '').toString()),
      })),
      education: (pdfData.education || []).map((item: {
        degree?: string;
        school?: string;
        dates?: string;
        bullets?: string[];
        highlights?: string;
      }) => ({
        title: (item.degree || 'Education').toString().trim(),
        subtitle: (item.school || '').toString().trim(),
        dates: (item.dates || '').toString().trim(),
        bullets: Array.isArray(item.bullets) && item.bullets.length > 0
          ? item.bullets.map((bullet) => stripBulletMarker((bullet || '').toString())).filter(Boolean)
          : parseNewline((item.highlights || '').toString()),
      })),
      projects: (pdfData.projects || []).map((item: { title?: string; name?: string; value?: string }) => ({
        title: ((item.title || item.name || item.value || '') as string).trim(),
      })),
      skills: (pdfData.skills || []).map((item: { name?: string; value?: string } | string) => {
        if (typeof item === 'string') return item.trim();
        return ((item.name || item.value || '') as string).trim();
      }),
      languages: (pdfData.languages || []).map((item: { name?: string; value?: string } | string) => {
        if (typeof item === 'string') return item.trim();
        return ((item.name || item.value || '') as string).trim();
      }),
      details: [
        ...(pdfData.custom_details || []).map((item: { label?: string; value?: string }) => ({
          label: (item.label || '').toString().trim(),
          value: (item.value || '').toString().trim(),
        })),
        ...[
          { label: 'Certifications', value: (pdfData.certifications_text || pdfData.certifications || '').toString().trim() },
          { label: 'Languages', value: (pdfData.languages_text || '').toString().trim() },
          { label: 'Achievements / Awards', value: (pdfData.awards_text || pdfData.awards || pdfData.achievements || '').toString().trim() },
          { label: 'References', value: (pdfData.references || '').toString().trim() },
        ].filter((item) => item.value),
      ],
      sectionOrder: sectionOrder.filter((id) =>
        ['summary', 'experience', 'education', 'skills'].includes(id)
      ).concat('custom') as Array<'summary' | 'experience' | 'education' | 'skills' | 'custom'>,
    }, `${filenameBase} Resume`);
  }, [
    activeTemplateAccentColor,
    applyActiveTemplateCustomization,
    applyRichTextLineStylesToTemplateHtml,
    buildTemplateRenderView,
    buildJsonResumeData,
    classicTemplateStyleSettings,
    parseNewline,
    sectionOrder,
    selectedTemplate,
    selectedTemplateSlug,
    templateSourceHtml,
  ]);

  const handleDownloadPDF = async () => {
    const filenameBase = contactName
      || getTemplateFieldValue('name')
      || getTemplateFieldValue('full_name')
      || getTemplateFieldValue('fullname')
      || getTemplateFieldValue('full-name')
      || 'Resume';

    const parsePdfErrorMessage = async (error: unknown) => {
      const responseData = (error as {
        response?: { data?: Blob | ArrayBuffer | string | { error?: string; details?: string } };
        message?: string;
        code?: string;
      })?.response?.data;

      if (!responseData) {
        const networkMessage = (error as { message?: string; code?: string })?.message || '';
        if (
          (error as { code?: string })?.code === 'ERR_NETWORK'
          || /network error/i.test(networkMessage)
          || /failed to fetch/i.test(networkMessage)
          || /load failed/i.test(networkMessage)
        ) {
          const target = pdfApiUrl('/render-resume-pdf');
          const isLocalPdfTarget = /localhost:5000|127\.0\.0\.1:5000/i.test(target);
          return isLocalPdfTarget
            ? `Cannot reach the PDF service at ${target}. Start the Node backend in c:/Hirevo/server and check whether a browser extension is blocking the request.`
            : `Cannot reach the PDF service at ${target}. Verify VITE_PDF_API_BASE points to a Node service that hosts /render-resume-pdf.`;
        }
      }

      if (responseData instanceof Blob) {
        const text = await responseData.text().catch(() => '');
        if (text) {
          try {
            const parsed = JSON.parse(text) as { error?: string; details?: string };
            return parsed.details || parsed.error || text;
          } catch {
            return text;
          }
        }
      }

      if (responseData instanceof ArrayBuffer) {
        const text = new TextDecoder().decode(new Uint8Array(responseData)).trim();
        if (text) {
          try {
            const parsed = JSON.parse(text) as { error?: string; details?: string };
            return parsed.details || parsed.error || text;
          } catch {
            return text;
          }
        }
      }

      if (typeof responseData === 'string' && responseData.trim()) {
        return responseData;
      }

      if (responseData && typeof responseData === 'object') {
        const payload = responseData as { details?: string; error?: string };
        return payload.details || payload.error || (error as { message?: string })?.message || '';
      }

      const statusCode = (error as { response?: { status?: number } })?.response?.status;
      if (statusCode === 404) {
        const target = pdfApiUrl('/render-resume-pdf');
        return `PDF route not found at ${target}. Point VITE_PDF_API_BASE to the Node PDF service or run the local backend on port 5000.`;
      }

      return (error as { message?: string })?.message || 'Failed to generate PDF.';
    };

    setGenerateError(null);
    setDownloadingPdf(true);

    try {
      const exportHtml = await buildPdfExportHtml(filenameBase);

      const pdfEndpoints = buildPdfEndpointCandidates();
      if (!pdfEndpoints.length) {
        throw new Error('No PDF service is configured. Set VITE_PDF_API_BASE to a Node backend that hosts /render-resume-pdf.');
      }

      let response: Blob | null = null;
      let lastError: unknown = null;

      for (const endpoint of pdfEndpoints) {
        try {
          response = await requestPdfBlob(endpoint, {
            html: exportHtml,
            filenameBase,
          });
          lastError = null;
          break;
        } catch (error) {
          const networkMessage = (error as { message?: string; code?: string })?.message || '';
          const networkCode = (error as { code?: string })?.code || '';
          if (
            networkCode === 'ERR_NETWORK'
            || /network error/i.test(networkMessage)
            || /failed to fetch/i.test(networkMessage)
            || /load failed/i.test(networkMessage)
          ) {
            const isLocalPdfTarget = /localhost:5000|127\.0\.0\.1:5000/i.test(endpoint);
            lastError = new Error(
              isLocalPdfTarget
                ? `Cannot reach the PDF service at ${endpoint}. Start the Node backend in c:/Hirevo/server and try again.`
                : `Cannot reach the PDF service at ${endpoint}. Verify VITE_PDF_API_BASE points to a Node service that hosts /render-resume-pdf.`,
            );
            continue;
          }
          lastError = error;
        }
      }

      if (!response) {
        throw lastError ?? new Error('PDF server unavailable.');
      }

      const downloadUrl = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${filenameBase.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      const message = await parsePdfErrorMessage(error);
      console.error('PDF download failed:', error);
      setGenerateError(message || 'Failed to generate PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const previewHtml = useMemo(() => {
    if (templateSourceHtml) {
      try {
        return applyRichTextLineStylesToTemplateHtml(
          applyActiveTemplateCustomization(
            renderTemplateWithSchema(templateSourceHtml, buildTemplateRenderView())
          )
        );
      } catch (error) {
        console.error('Preview render failed:', error);
        return templatePreviewHtml;
      }
    }
    return templatePreviewHtml;
  }, [applyActiveTemplateCustomization, applyRichTextLineStylesToTemplateHtml, buildTemplateRenderView, templatePreviewHtml, templateSourceHtml]);

  useEffect(() => {
    if (!previewHtml) return;
    const timer = window.setTimeout(() => {
      applyPreviewPagination();
      updatePreviewFrameSize();
      fitPreviewToPage();
      attachPreviewContentObserver();
    }, 100);
    return () => window.clearTimeout(timer);
  }, [applyPreviewPagination, attachPreviewContentObserver, fitPreviewToPage, previewHtml, updatePreviewFrameSize]);

  useEffect(() => {
    if (!previewHtml) {
      setPreviewPage(1);
      setPreviewPageCount(1);
      return;
    }
    autoDetectLockedRef.current = false;
    updatePreviewPaging();
  }, [previewHtml, updatePreviewPaging]);

  useEffect(() => {
    if (!previewHtml) return;
    const body = previewBodyRef.current;
    if (body) {
      body.scrollTop = 0;
      body.scrollLeft = 0;
    }
    setPreviewPage(1);
  }, [previewHtml]);

  useEffect(() => {
    if (!selectedTemplate) return;
    const body = previewBodyRef.current;
    if (body) {
      body.scrollTop = 0;
      body.scrollLeft = 0;
    }
    setPreviewPage(1);
  }, [selectedTemplate]);

  useEffect(() => () => {
    previewContentObserverRef.current?.disconnect();
  }, []);

  useEffect(() => {
    syncPreviewPagePosition(previewPage);
  }, [previewPage, syncPreviewPagePosition]);

  useEffect(() => {
    if (previewPageSizeMode !== 'auto') return;
    autoDetectLockedRef.current = false;
    applyPreviewPagination();
    setPreviewPage(1);
    updatePreviewFrameSize();
  }, [applyPreviewPagination, previewPageSizeMode, updatePreviewFrameSize]);

  useEffect(() => {
    applyPreviewPagination();
    setPreviewPage(1);
    updatePreviewFrameSize();
  }, [applyPreviewPagination, resolvedPageSize, updatePreviewFrameSize]);

  useEffect(() => {
    const refreshScale = () => {
      updatePreviewFrameSize();
      fitPreviewToPage();
    };

    const body = previewBodyRef.current;
    const hasResizeObserver = typeof ResizeObserver !== 'undefined';

    refreshScale();

    if (!body || !hasResizeObserver) {
      window.addEventListener('resize', refreshScale);
      return () => window.removeEventListener('resize', refreshScale);
    }

    const observer = new ResizeObserver(() => {
      refreshScale();
    });
    observer.observe(body);
    window.addEventListener('resize', refreshScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', refreshScale);
    };
  }, [fitPreviewToPage, updatePreviewFrameSize]);

  useEffect(() => {
    if (!isEditorRoute) return;
    const match = findTemplateBySlug(effectiveTemplateId);
    if (match) {
      if (selectedTemplate !== match.name) {
        selectTemplate(match.name);
      }
      setTemplateStep('edit');
      return;
    }
    if (templates.length > 0 && !selectedTemplate) {
      selectTemplate(templates[0].name);
      setTemplateStep('edit');
    }
  }, [effectiveTemplateId, findTemplateBySlug, isEditorRoute, selectTemplate, selectedTemplate, templates]);

  const getEditorSnapshot = useCallback(() => {
    return JSON.stringify({
      contactName,
      contactRole,
      contactEmail,
      contactPhone,
      contactLocation,
      contactPhotoUrl,
      contactPhotoName,
      summaryText,
      skillsText,
      projectsText,
      customDetails,
      educationItems,
      experienceItems,
      sectionOrder,
      unlockedSections,
      activeSectionId,
      selectedTemplate,
      selectedColorPreset,
      customTemplateColor,
      classicTemplateStyleSettings,
      templateFieldValues,
    });
  }, [
    activeSectionId,
    classicTemplateStyleSettings,
    contactEmail,
    contactLocation,
    contactName,
    contactPhone,
    contactPhotoName,
    contactPhotoUrl,
    contactRole,
    customDetails,
    educationItems,
    experienceItems,
    projectsText,
    sectionOrder,
    customTemplateColor,
    selectedColorPreset,
    selectedTemplate,
    skillsText,
    summaryText,
    templateFieldValues,
    unlockedSections,
  ]);

  useEffect(() => {
    getEditorSnapshotRef.current = getEditorSnapshot;
  }, [getEditorSnapshot]);

  const saveSnapshot = useMemo(() => (
    isEditorRoute ? getEditorSnapshot() : ''
  ), [getEditorSnapshot, isEditorRoute]);

  useEffect(() => {
    if (!isEditorRoute) return;
    setSaveStatus((prev) => (prev === 'saving' ? prev : 'saving'));
    const timer = window.setTimeout(() => setSaveStatus('saved'), 900);
    return () => window.clearTimeout(timer);
  }, [isEditorRoute, saveSnapshot]);

  const applyEditorSnapshot = useCallback((raw: string) => {
    try {
      const next = JSON.parse(raw) as Partial<Record<string, unknown>>;
      isApplyingHistoryRef.current = true;
      if (typeof next.contactName === 'string') setContactName(next.contactName);
      if (typeof next.contactRole === 'string') setContactRole(next.contactRole);
      if (typeof next.contactEmail === 'string') setContactEmail(next.contactEmail);
      if (typeof next.contactPhone === 'string') setContactPhone(next.contactPhone);
      if (typeof next.contactLocation === 'string') setContactLocation(next.contactLocation);
      if (typeof next.contactPhotoUrl === 'string') setContactPhotoUrl(next.contactPhotoUrl);
      if (typeof next.contactPhotoName === 'string') setContactPhotoName(next.contactPhotoName);
      if (typeof next.summaryText === 'string') setSummaryText(next.summaryText);
      if (typeof next.skillsText === 'string') setSkillsText(next.skillsText);
      if (typeof next.projectsText === 'string') setProjectsText(next.projectsText);
      if (typeof next.selectedColorPreset === 'string') {
        if (next.selectedColorPreset === 'custom') {
          setSelectedColorPreset('custom');
        } else {
          const match = TEMPLATE_COLOR_PRESETS.find((preset) => preset.id === next.selectedColorPreset);
          if (match) setSelectedColorPreset(match.id);
        }
      }
      if (typeof next.customTemplateColor === 'string' && /^#[0-9a-f]{6}$/i.test(next.customTemplateColor)) {
        setCustomTemplateColor(next.customTemplateColor);
      }
      if (next.classicTemplateStyleSettings && typeof next.classicTemplateStyleSettings === 'object') {
        setClassicTemplateStyleSettings(
          sanitizeClassicTemplateStyleSettings(next.classicTemplateStyleSettings)
        );
      }
      if (Array.isArray(next.customDetails)) setCustomDetails(next.customDetails as any);
      if (Array.isArray(next.educationItems)) setEducationItems(next.educationItems as any);
      if (Array.isArray(next.experienceItems)) setExperienceItems(next.experienceItems as any);
      if (Array.isArray(next.sectionOrder)) setSectionOrder(next.sectionOrder as any);
      if (Array.isArray(next.unlockedSections)) setUnlockedSections(next.unlockedSections as any);
      if (typeof next.activeSectionId === 'string' || next.activeSectionId === null) {
        setActiveSectionId(next.activeSectionId as any);
      }
      if (next.templateFieldValues && typeof next.templateFieldValues === 'object' && !Array.isArray(next.templateFieldValues)) {
        const restoredFieldValues = Object.fromEntries(
          Object.entries(next.templateFieldValues as Record<string, unknown>).map(([key, value]) => [
            key,
            typeof value === 'string' ? value : value == null ? '' : String(value),
          ])
        );
        replaceTemplateFieldValues(restoredFieldValues);
      }
    } finally {
      // let state settle before we allow pushing history again
      window.setTimeout(() => {
        isApplyingHistoryRef.current = false;
      }, 0);
    }
  }, [replaceTemplateFieldValues]);

  const handleUndo = useCallback(() => {
    if (!isEditorRoute) return;
    if (undoStackRef.current.length <= 1) return;
    const current = undoStackRef.current.pop();
    if (current) redoStackRef.current.push(current);
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    if (prev) applyEditorSnapshot(prev);
  }, [applyEditorSnapshot, isEditorRoute]);

  const handleRedo = useCallback(() => {
    if (!isEditorRoute) return;
    const next = redoStackRef.current.pop();
    if (!next) return;
    undoStackRef.current.push(next);
    applyEditorSnapshot(next);
  }, [applyEditorSnapshot, isEditorRoute]);

  useEffect(() => {
    if (!isEditorRoute) return;
    // init history with current snapshot
    const initial = getEditorSnapshot();
    undoStackRef.current = [initial];
    redoStackRef.current = [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditorRoute]);

  useEffect(() => {
    if (!isEditorRoute) return;
    if (isApplyingHistoryRef.current) return;

    if (historyTimerRef.current) window.clearTimeout(historyTimerRef.current);
    historyTimerRef.current = window.setTimeout(() => {
      const snap = getEditorSnapshot();
      const last = undoStackRef.current[undoStackRef.current.length - 1];
      if (snap === last) return;
      undoStackRef.current.push(snap);
      // keep history bounded
      if (undoStackRef.current.length > 80) undoStackRef.current.shift();
      redoStackRef.current = [];
    }, 400);

    return () => {
      if (historyTimerRef.current) window.clearTimeout(historyTimerRef.current);
    };
  }, [
    getEditorSnapshot,
    isEditorRoute,
    contactName,
    contactRole,
    contactEmail,
    contactPhone,
    contactLocation,
    contactPhotoUrl,
    contactPhotoName,
    summaryText,
    skillsText,
    projectsText,
    experienceItems,
    educationItems,
    customDetails,
    sectionOrder,
    unlockedSections,
    activeSectionId,
    templateFieldValues,
  ]);

  useEffect(() => {
    if (!isEditorRoute) {
      restoreKeyRef.current = null;
      return;
    }
    const storageKey = `hirevo:resume-editor:${effectiveTemplateId || 'default'}:${user?.id || 'anon'}`;
    if (restoreKeyRef.current === storageKey) return;
    restoreKeyRef.current = storageKey;
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      if (hasLegacyDemoSeedData(saved)) {
        window.localStorage.removeItem(storageKey);
        const initial = getEditorSnapshotRef.current();
        undoStackRef.current = [initial];
        redoStackRef.current = [];
        return;
      }
      applyEditorSnapshot(saved);
      undoStackRef.current = [saved];
      redoStackRef.current = [];
    } else {
      const initial = getEditorSnapshotRef.current();
      undoStackRef.current = [initial];
      redoStackRef.current = [];
    }
  }, [applyEditorSnapshot, effectiveTemplateId, isEditorRoute, user?.id]);

  useEffect(() => {
    if (!isEditorRoute) return;
    const storageKey = `hirevo:resume-editor:${effectiveTemplateId || 'default'}:${user?.id || 'anon'}`;
    if (autosaveTimerRef.current) window.clearInterval(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setInterval(() => {
      if (isApplyingHistoryRef.current) return;
      window.localStorage.setItem(storageKey, getEditorSnapshot());
    }, 2500);
    return () => {
      if (autosaveTimerRef.current) window.clearInterval(autosaveTimerRef.current);
    };
  }, [effectiveTemplateId, getEditorSnapshot, isEditorRoute, user?.id]);

  useEffect(() => {
    if (!isEditorRoute) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true } as any);
  }, [handleRedo, handleUndo, isEditorRoute]);

  const resumeScore = useMemo(() => {
    const values = Object.values(sectionCompletion);
    if (values.length === 0) return 0;
    const completed = values.filter(Boolean).length;
    return Math.round((completed / values.length) * 100);
  }, [sectionCompletion]);

  const requiredDownloadSectionIds = useMemo(() => {
    const requiredSectionSet = new Set(['contact', 'summary', 'experience', 'education', 'skills']);
    return availableSections.filter((id) => requiredSectionSet.has(id));
  }, [availableSections]);

  const canDownload = useMemo(() => {
    if (requiredDownloadSectionIds.length === 0) return false;
    return requiredDownloadSectionIds.every((id) => sectionCompletion[id]);
  }, [requiredDownloadSectionIds, sectionCompletion]);

  const canCustomize = useMemo(() => {
    if (availableSections.length === 0) return false;
    return hasUnlockedCustomize || isLastStep;
  }, [availableSections.length, hasUnlockedCustomize, isLastStep]);

  const goToCustomizeSection = useCallback(() => {
    if (!canCustomize) return;
    setActiveEditorTab('customize');
  }, [canCustomize]);

  const incompleteSectionLabels = useMemo(() => {
    return requiredDownloadSectionIds
      .filter((id) => !sectionCompletion[id])
      .map((id) => RESUME_SECTION_TITLES[id] || id);
  }, [requiredDownloadSectionIds, sectionCompletion]);

  const isTemplateReadyForDownload = useMemo(() => {
    if (combinedTemplateLoading) return false;
    if (selectedTemplate) {
      return Boolean(templateSourceHtml) && !templatePreviewLoading;
    }
    return false;
  }, [
    combinedTemplateLoading,
    selectedTemplate,
    templatePreviewLoading,
    templateSourceHtml,
  ]);

  const downloadBlockedReason = useMemo(() => {
    if (downloadingPdf) return 'PDF download is already in progress.';
    if (combinedTemplateError) return combinedTemplateError;
    if (!selectedTemplate) return 'Select a resume template before downloading.';
    if (!isTemplateReadyForDownload) return 'Please wait for the selected template to finish loading.';
    if (!canDownload) {
      return incompleteSectionLabels.length > 0
        ? `Complete these sections first: ${incompleteSectionLabels.join(', ')}.`
        : 'Complete the required resume sections before downloading.';
    }
    return null;
  }, [
    canDownload,
    combinedTemplateError,
    downloadingPdf,
    incompleteSectionLabels,
    isTemplateReadyForDownload,
    selectedTemplate,
  ]);

  const renderDetectedFieldSection = useCallback((fields: string[], helperText?: string) => {
    if (fields.length === 0) return null;

    return (
      <div className="space-y-4">
        {helperText && (
          <div className="text-sm text-gray-500">
            {helperText}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field) => {
            const label = formatTemplateFieldLabel(field);
            const longField = isLongDetectedField(field);
            const value = getDetectedFieldValue(field);
            return (
              <div
                key={field}
                className={`form-group ${longField ? 'md:col-span-2' : ''}`}
              >
                <label className="block text-sm font-semibold mb-2 text-gray-700">{label}</label>
                {longField ? (
                  <RichTextEditor
                    value={value}
                    onChange={(next) => setDetectedFieldValue(field, next)}
                    placeholder={`Enter ${label.toLowerCase()}...`}
                    minHeight={110}
                    toolbarHostId={SECTION_RICH_TEXT_TOOLBAR_HOST_ID}
                  />
                ) : (
                  <input
                    type={getDetectedFieldInputType(field)}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    value={value}
                    onChange={(e) => setDetectedFieldValue(field, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [
    getDetectedFieldInputType,
    getDetectedFieldValue,
    isLongDetectedField,
    setDetectedFieldValue,
  ]);

  useEffect(() => {
    // Recover from any stale body scroll lock when entering the resume editor.
    document.body.classList.remove('no-scroll');
    return () => {
      document.body.classList.remove('preview-active');
    };
  }, []);

  useEffect(() => {
    if (initialResumeReady) return;

    const waitingForInitialTemplate =
      Boolean(selectedTemplate) &&
      !templateSourceHtml &&
      !templateError;

    if (
      templateLoading ||
      (templatePreviewLoading && waitingForInitialTemplate) ||
      waitingForInitialTemplate
    ) {
      return;
    }

    setInitialResumeReady(true);
  }, [
    initialResumeReady,
    selectedTemplate,
    templateError,
    templateLoading,
    templatePreviewLoading,
    templateSourceHtml,
  ]);

  if (!initialResumeReady) {
    return <AppLoader variant="full" />;
  }

  const hasTemplateIssue = Boolean(combinedTemplateError) || (!combinedTemplateLoading && templateCatalog.length === 0);
  const templateIssueMessage = combinedTemplateError
    ? combinedTemplateError
    : 'No templates available. Upload HTML files to the resume_templates bucket.';

  const previewPanel = (
    <div className="builder-preview-panel">
      {stepSections.length > 0 && (
        <div className="preview-progress-card">
          <div className="preview-progress-track">
            <div
              className="preview-stepper"
              role="list"
              aria-label="Resume builder progress"
              style={{ gridTemplateColumns: `repeat(${stepSections.length}, minmax(0, 1fr))` }}
            >
              {stepSections.map((sectionId, index) => {
                const isComplete = Boolean(sectionCompletion[sectionId]);
                const isActive = sectionId === currentStepId;
                const sectionTitle = RESUME_SECTION_TITLES[sectionId] || sectionId;
                const statusLabel = isComplete ? 'Complete' : isActive ? 'Editing now' : 'Pending';

                return (
                  <button
                    key={`preview-step-${sectionId}`}
                    type="button"
                    role="listitem"
                    className={`preview-step ${isComplete ? 'is-complete' : ''} ${isActive ? 'is-active' : ''} ${!isComplete && isActive ? 'has-logo-marker' : ''}`}
                    onClick={() => setActiveSectionId(sectionId)}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <span className="preview-step-line preview-step-line-left" aria-hidden="true" />
                    <span className="preview-step-line preview-step-line-right" aria-hidden="true" />
                    <span className={`preview-step-marker ${!isComplete && isActive ? 'is-logo' : ''}`}>
                      {isComplete ? (
                        '✓'
                      ) : isActive ? (
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          focusable="false"
                          className="preview-step-marker-logo"
                        >
                          <path
                            d="M6.25 2.75h8.35a1.75 1.75 0 0 1 1.24.51l3.4 3.4a1.75 1.75 0 0 1 .51 1.24v10.85a2.5 2.5 0 0 1-2.5 2.5h-11a2.5 2.5 0 0 1-2.5-2.5v-13.5a2.5 2.5 0 0 1 2.5-2.5Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M14.5 2.75V6.5A1.5 1.5 0 0 0 16 8h3.75"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle cx="10.1" cy="10.2" r="2.15" fill="currentColor" />
                          <path
                            d="M6.95 15.1c.95-1.95 2.05-2.9 3.2-2.9 1.18 0 2.3.95 3.25 2.9"
                            fill="currentColor"
                          />
                          <path
                            d="M14.8 11.6h3.1M7.25 17.35h10.6M7.25 20h7.2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="preview-step-label">{sectionTitle}</span>
                    <span className="preview-step-status">{statusLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <div className="preview-card" ref={previewCardRef}>
        <div className="preview-card-body">
          <div className="preview-scroll" ref={previewBodyRef} onScroll={updatePreviewPaging}>
            {previewHtml ? (
              <div className="preview-iframe-shell" ref={previewShellRef} style={previewShellBaseStyle}>
                <iframe
                  title="Resume preview"
                  srcDoc={previewHtml}
                  className="preview-iframe"
                  style={previewIframeBaseStyle}
                  width={activePageSize.width}
                  height={activePageSize.height}
                  scrolling="no"
                  ref={previewFrameRef}
                  onLoad={handlePreviewLoad}
                />
              </div>
            ) : (
              <div className="preview-empty">
                Select a template to preview your resume.
              </div>
            )}
          </div>
          {previewPageCount > 1 && (
            <div className="preview-overlay">
              <button
                type="button"
                className="preview-overlay-btn"
                disabled={previewPage <= 1}
                onClick={() => scrollPreviewToPage(previewPage - 1)}
              >
                &lt;
              </button>
              <span className="preview-overlay-text">Page {previewPage} of {previewPageCount}</span>
              <button
                type="button"
                className="preview-overlay-btn"
                disabled={previewPage >= previewPageCount}
                onClick={() => scrollPreviewToPage(previewPage + 1)}
              >
                &gt;
              </button>
              {ENABLE_PREVIEW_PAGINATION && (
                <div className="preview-overlay-size">
                  {pageSizeOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`preview-size-btn ${previewPageSizeMode === option ? 'is-active' : ''}`}
                      onClick={() => setPreviewPageSizeMode(option)}
                      title={
                        option === 'auto'
                          ? `Auto (${PAGE_SIZES[resolvedPageSize].label})`
                          : PAGE_SIZES[option].label
                      }
                    >
                      {option === 'auto' ? 'Auto' : PAGE_SIZES[option].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCustomizePanel = (mode: 'tab' | 'inline' = 'tab') => (
    <div className={`resume-tab-panel ${mode === 'inline' ? 'inline-customize-panel' : ''}`}>
      <div className="tab-panel-header">
        <div>
          <h2>Customize your template</h2>
          <p>Switch layouts or tweak the look before editing content.</p>
        </div>
        {mode === 'tab' && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setActiveEditorTab('edit')}
          >
            Back to Edit
          </button>
        )}
      </div>
      <div className="tab-panel-body">
        <div className="tab-section">
          <h3>Select a template</h3>
          {combinedTemplateLoading ? (
            <div className="template-state">Loading templates...</div>
          ) : combinedTemplateError ? (
            <div className="template-state template-error">{combinedTemplateError}</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="template-state">No templates available.</div>
          ) : (
            <div className="template-compact-grid">
              {filteredTemplates.map((t) => {
                const displayName = t.displayName.toLowerCase();
                const isSelected = selectedTemplate === t.name;
                return (
                  <button
                    key={`customize:${t.name}`}
                    type="button"
                    onClick={() => handleCustomizeTemplateSelect(t)}
                    className={`template-card-compact ${isSelected ? 'is-selected' : ''}`}
                    title={displayName}
                  >
                    <div className="template-card-compact-preview">
                      {t.thumbnailUrl ? (
                        <img
                          src={t.thumbnailUrl}
                          alt={`${t.displayName} template`}
                          loading="lazy"
                          decoding="async"
                          width={420}
                          height={594}
                        />
                      ) : (
                        <div className="template-preview-placeholder">
                          <div className="template-preview-paper" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="tab-section">
          <h3>Accent color</h3>
          {supportsClassicTemplateCustomization ? (
            <>
              <p className="tab-helper">
                Pick the accent used for section labels, dividers, and the portrait background tint.
              </p>
              <div className="color-preset-grid">
                {TEMPLATE_COLOR_PRESETS.map((preset) => (
                  <button
                    key={`accent-${preset.id}`}
                    type="button"
                    className={`color-preset-card ${selectedColorPreset === preset.id ? 'is-selected' : ''}`}
                    onClick={() => setSelectedColorPreset(preset.id)}
                  >
                    <span
                      className="color-preset-swatch"
                      style={{ backgroundColor: preset.accent }}
                      aria-hidden="true"
                    />
                    <span className="color-preset-label">{preset.label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className={`color-preset-card ${selectedColorPreset === 'custom' ? 'is-selected' : ''}`}
                  onClick={() => setSelectedColorPreset('custom')}
                >
                  <span
                    className="color-preset-swatch"
                    style={{ background: 'linear-gradient(135deg, #c3aa72 0%, #1d4d8f 100%)' }}
                    aria-hidden="true"
                  />
                  <span className="color-preset-label">Custom</span>
                </button>
              </div>
              {selectedColorPreset === 'custom' && (
                <div className="color-custom-controls">
                  <label className="color-custom-label" htmlFor="custom-template-color">
                    Custom accent
                  </label>
                  <div className="color-custom-inputs">
                    <input
                      id="custom-template-color"
                      type="color"
                      className="color-picker-input"
                      value={normalizedCustomTemplateColor}
                      onChange={(e) => setCustomTemplateColor(e.target.value)}
                    />
                    <input
                      type="text"
                      className="color-hex-input"
                      value={customTemplateColor}
                      placeholder="#c3aa72"
                      onChange={(e) => setCustomTemplateColor(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="setting-card">
              <span>Availability</span>
              <strong>Switch to Classic Portrait Sidebar to unlock accent color controls.</strong>
            </div>
          )}
        </div>
        <div className="tab-section">
          <h3>Typography & rich text</h3>
          {supportsClassicTemplateCustomization ? (
            <>
              <p className="tab-helper">
                These H1-H6 controls apply only to rich-text content, and the sizes now auto-correct to keep a proper heading order from largest to smallest.
              </p>
              <div className="style-control-grid">
                <div className="style-control-card">
                  <label className="style-control-label" htmlFor="classic-body-font">
                    Body font family
                  </label>
                  <select
                    id="classic-body-font"
                    className="tab-input"
                    value={classicTemplateStyleSettings.bodyFontFamily}
                    onChange={(e) => updateClassicTemplateStyleFont('bodyFontFamily', e.target.value)}
                  >
                    {CLASSIC_TEMPLATE_FONT_OPTIONS.map((option) => (
                      <option key={`body-font-${option.label}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="style-control-note">Applies to summary, bullets, contact lines, and paragraph text.</span>
                </div>
                <div className="style-control-card">
                  <label className="style-control-label" htmlFor="classic-heading-font">
                    Heading font family
                  </label>
                  <select
                    id="classic-heading-font"
                    className="tab-input"
                    value={classicTemplateStyleSettings.headingFontFamily}
                    onChange={(e) => updateClassicTemplateStyleFont('headingFontFamily', e.target.value)}
                  >
                    {CLASSIC_TEMPLATE_FONT_OPTIONS.map((option) => (
                      <option key={`heading-font-${option.label}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="style-control-note">Used for the name, section labels, H1-H6, and role titles.</span>
                </div>
                <div className="style-control-card">
                  <label className="style-control-label" htmlFor="classic-body-weight">
                    Body font weight
                  </label>
                  <select
                    id="classic-body-weight"
                    className="tab-input"
                    value={classicTemplateStyleSettings.bodyFontWeight}
                    onChange={(e) => updateClassicTemplateStyleNumber('bodyFontWeight', Number(e.target.value))}
                  >
                    {CLASSIC_TEMPLATE_WEIGHT_OPTIONS.map((weight) => (
                      <option key={`body-weight-${weight}`} value={weight}>
                        {weight}
                      </option>
                    ))}
                  </select>
                  <span className="style-control-note">Lighter values feel editorial, heavier values feel bold and compact.</span>
                </div>
                <div className="style-control-card">
                  <label className="style-control-label" htmlFor="classic-heading-weight">
                    Heading font weight
                  </label>
                  <select
                    id="classic-heading-weight"
                    className="tab-input"
                    value={classicTemplateStyleSettings.headingFontWeight}
                    onChange={(e) => updateClassicTemplateStyleNumber('headingFontWeight', Number(e.target.value))}
                  >
                    {CLASSIC_TEMPLATE_WEIGHT_OPTIONS.map((weight) => (
                      <option key={`heading-weight-${weight}`} value={weight}>
                        {weight}
                      </option>
                    ))}
                  </select>
                  <span className="style-control-note">Controls the name, section labels, and heading hierarchy.</span>
                </div>
                <div className="style-control-card">
                  <label className="style-control-label" htmlFor="classic-body-size">
                    Base font size
                  </label>
                  <input
                    id="classic-body-size"
                    type="number"
                    min={CLASSIC_TEMPLATE_NUMBER_LIMITS.bodyFontSize.min}
                    max={CLASSIC_TEMPLATE_NUMBER_LIMITS.bodyFontSize.max}
                    step="0.5"
                    className="tab-input"
                    value={classicTemplateStyleSettings.bodyFontSize}
                    onChange={(e) => updateClassicTemplateStyleNumber('bodyFontSize', Number(e.target.value))}
                  />
                  <span className="style-control-note">This is the default paragraph size before H1-H6 overrides.</span>
                </div>
                <div className="style-control-card">
                  <label className="style-control-label" htmlFor="classic-text-color">
                    Text color
                  </label>
                  <input
                    id="classic-text-color"
                    type="color"
                    className="style-color-input"
                    value={classicTemplateStyleSettings.textColor}
                    onChange={(e) => updateClassicTemplateStyleColor('textColor', e.target.value)}
                  />
                  <span className="style-control-note">{classicTemplateStyleSettings.textColor.toUpperCase()}</span>
                </div>
                <div className="style-control-card">
                  <label className="style-control-label" htmlFor="classic-heading-color">
                    Heading color
                  </label>
                  <input
                    id="classic-heading-color"
                    type="color"
                    className="style-color-input"
                    value={classicTemplateStyleSettings.headingColor}
                    onChange={(e) => updateClassicTemplateStyleColor('headingColor', e.target.value)}
                  />
                  <span className="style-control-note">{classicTemplateStyleSettings.headingColor.toUpperCase()}</span>
                </div>
                <div className="style-control-card">
                  <label className="style-control-label" htmlFor="classic-highlight-color">
                    Highlight color
                  </label>
                  <input
                    id="classic-highlight-color"
                    type="color"
                    className="style-color-input"
                    value={classicTemplateStyleSettings.highlightColor}
                    onChange={(e) => updateClassicTemplateStyleColor('highlightColor', e.target.value)}
                  />
                  <span className="style-control-note">Used for highlighted text inside rich-text content.</span>
                </div>
              </div>
              <div className="heading-size-grid">
                {CLASSIC_TEMPLATE_HEADING_FIELDS.map((field) => (
                  <div className="style-control-card" key={field.key}>
                    <label className="style-control-label" htmlFor={`classic-${field.key}`}>
                      {field.label}
                    </label>
                    <input
                      id={`classic-${field.key}`}
                      type="number"
                      min={CLASSIC_TEMPLATE_NUMBER_LIMITS[field.key].min}
                      max={CLASSIC_TEMPLATE_NUMBER_LIMITS[field.key].max}
                      step="0.5"
                      className="tab-input"
                      value={classicTemplateStyleSettings[field.key]}
                      onChange={(e) => updateClassicTemplateStyleNumber(field.key, Number(e.target.value))}
                    />
                    <span className="style-control-note">{field.note}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="setting-card">
              <span>Availability</span>
              <strong>Switch to Classic Portrait Sidebar to edit H1-H6, font family, weights, text color, and highlights.</strong>
            </div>
          )}
        </div>
        <div className="tab-section">
          <h3>Preview settings</h3>
          <div className="preview-settings">
            <div className="setting-card">
              <span>Live preview mode</span>
              <strong>Original template + style overrides</strong>
            </div>
            <div className="setting-card">
              <span>Scaling in preview</span>
              <strong>Whole-page fit</strong>
            </div>
            <div className="setting-card">
              <span>Page size</span>
              <strong>Template native size</strong>
            </div>
          </div>
        </div>
        <div className="tab-section">
          <h3>Download your resume</h3>
          <div className="customize-download-card">
            <div className="customize-download-copy">
              <strong>Export the styled version as PDF</strong>
              <p>When the preview looks right, download the latest version with your selected template, fonts, colors, and heading styles.</p>
            </div>
            <button
              type="button"
              className="resume-topbar-download customize-download-btn"
              onClick={handleDownloadPDF}
              disabled={Boolean(downloadBlockedReason)}
              title={downloadBlockedReason || 'Download PDF'}
            >
              {downloadingPdf ? 'Downloading...' : 'Download PDF'} <span className="caret" aria-hidden="true" />
            </button>
          </div>
          {downloadBlockedReason && (
            <div className="customize-download-note">
              {downloadBlockedReason}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`resume-page ${isTemplateSelection ? 'is-template-mode' : ''} ${isEditorRoute ? 'is-editor-route' : ''}`}>
      <input
        ref={resumeUploadInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        style={{ display: 'none' }}
        onChange={handleUploadResumeFile}
      />
      {!isEditorRoute && (
        <section className={`resume-hero ${isTemplateSelection ? 'is-templates' : ''}`}>
          <div className="resume-hero-content">
            {isTemplateSelection ? (
              <>
                <h1>Resume <span className="highlight">Templates</span></h1>
                <p className="subtitle">
                  Each resume template is designed to help you get hired faster. Pick a layout and start editing in seconds.
                </p>
                <div className="resume-hero-meta">
                  <span>{combinedTemplateLoading ? 'Loading templates...' : `${filteredTemplates.length} templates ready`}</span>
                  <span>ATS-friendly layouts</span>
                  <span>One-click editing</span>
                </div>
                <div className="resume-hero-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={handleCreateResumeClick}
                  >
                    Create my resume
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-lg"
                    onClick={handleUploadResumeClick}
                    disabled={uploadingResume}
                  >
                    {uploadingResume ? 'Uploading...' : 'Upload my resume'}
                  </button>
                </div>
                <div className="template-filters">
                  {templateFilters.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      className={`template-filter ${activeTemplateFilter === filter ? 'active' : ''}`}
                      onClick={() => setActiveTemplateFilter(filter)}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h1>Build Your <span className="highlight">Resume</span></h1>
                <p className="subtitle">Create a modern resume with ready-to-download formats.</p>
                <div className="resume-hero-meta">
                  <span>Template: {selectedTemplateLabel}</span>
                  <span>{sectionOrder.length} editable sections</span>
                </div>
              </>
            )}
          </div>
        </section>
      )}
      <div className="resume-content">
        {isTemplateSelection ? (
          <section className="template-gallery">
            {combinedTemplateLoading ? (
              <div className="template-state">Loading templates...</div>
            ) : combinedTemplateError ? (
              <div className="template-state template-error">{combinedTemplateError}</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="template-state">
                {activeTemplateFilter === 'All templates'
                  ? 'No templates available. Upload HTML files to the resume_templates bucket.'
                  : `No templates match "${activeTemplateFilter}". Try a different filter.`}
              </div>
            ) : (
              <div className="template-compact-grid">
                {filteredTemplates.map((t) => {
                  const displayName = t.displayName.toLowerCase();
                  const isSelected = selectedTemplate === t.name;
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => handleTemplateSelect(t)}
                      className={`template-card-compact ${isSelected ? 'is-selected' : ''}`}
                      title={displayName}
                    >
                      <div className="template-card-compact-preview">
                        {t.thumbnailUrl ? (
                          <img
                            src={t.thumbnailUrl}
                            alt={`${t.displayName} template`}
                            loading="lazy"
                            decoding="async"
                            width={420}
                            height={594}
                          />
                        ) : (
                          <div className="template-preview-placeholder">
                            <div className="template-preview-paper" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <>
            <div className="resume-topbar">
              <div className="resume-topbar-left">
                <button
                  type="button"
                  className="topbar-back-btn"
                  aria-label="Back"
                  onClick={() => navigate(backTarget)}
                >
                  <ArrowLeft size={18} />
                </button>
                <button type="button" className="topbar-app-btn" aria-label="Menu">
                  <span className="dot-grid">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </span>
                </button>
                <div className="topbar-title-group">
                  <div className="resume-topbar-title">{selectedTemplateLabel || 'Untitled'}</div>
                  <div className="topbar-language">
                    <span className="flag">US</span>
                    <span>English</span>
                  </div>
                </div>
              </div>
              <div className="resume-topbar-center">
                <button
                  type="button"
                  className={`resume-topbar-pill ${activeEditorTab === 'edit' ? 'is-active' : ''}`}
                  onClick={() => setActiveEditorTab('edit')}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={`resume-topbar-pill ${activeEditorTab === 'customize' ? 'is-active' : ''}`}
                  onClick={() => setActiveEditorTab('customize')}
                  title="Open customize"
                >
                  Customize
                </button>
                <button
                  type="button"
                  className={`resume-topbar-pill ${activeEditorTab === 'review' ? 'is-active' : ''}`}
                  onClick={() => setActiveEditorTab('review')}
                >
                  AI Review
                </button>
                <button
                  type="button"
                  className={`resume-topbar-pill has-badge ${activeEditorTab === 'tailor' ? 'is-active' : ''}`}
                  onClick={() => setActiveEditorTab('tailor')}
                >
                  Tailor
                  <span className="pill-badge">NEW</span>
                </button>
              </div>
              <div className="resume-topbar-right">
                {isEditorRoute && (
                  // Fake data buttons intentionally removed.
                  null
                )}
                <button
                  type="button"
                  className="resume-topbar-outline"
                  onClick={() => (isEditorRoute ? setShowTemplatePicker(true) : navigate('/resume/templates'))}
                  disabled={downloadingPdf}
                >
                  Change Template
                </button>
                {selectedTemplate && !canCustomize && (
                  <button
                    type="button"
                    className="resume-topbar-download"
                    onClick={handleDownloadPDF}
                    disabled={Boolean(downloadBlockedReason)}
                    title={downloadBlockedReason || 'Download PDF'}
                  >
                    {downloadingPdf ? 'Downloading...' : 'Download'} <span className="caret" aria-hidden="true" />
                  </button>
                )}
                <button type="button" className="resume-topbar-icon" aria-label="Settings">
                  <Settings size={18} />
                </button>
              </div>
            </div>
            <div className={`resume-workspace ${isEditorRoute ? 'is-editor' : ''}`}>
              {!isEditorRoute && (
                <>
                  <div className="card-header border-b pb-4 mb-6">
                    <Zap size={24} className="text-primary" />
                    <h2 className="text-2xl font-bold">Resume Builder</h2>
                  </div>

                  <p className="text-gray-600 mb-6">
                    Build your resume with guided sections. Drag sections to reorder and add multiple experiences or education entries.
                  </p>
                </>
              )}

              {!isEditorRoute && (
                <div className="resume-toolbar-row">
                  <div className="text-sm text-gray-600">
                    Selected Template: <span className="font-semibold text-gray-800">{selectedTemplateLabel}</span>
                  </div>
                  <div className="resume-toolbar-actions">
                    {/* Fake data buttons intentionally removed. */}
                    <button
                      type="button"
                      onClick={() => navigate('/resume/templates')}
                      className="resume-action-btn ghost"
                    >
                      Switch Template
                    </button>
                  </div>
                </div>
              )}

              {isEditorRoute && hasTemplateIssue && (
                <div className={`template-state ${templateError ? 'template-error' : ''} template-state-editor`}>
                  <div className="template-issue-title">Resume templates unavailable</div>
                  <div className="template-issue-body">{templateIssueMessage}</div>
                  <div className="template-issue-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/resume/templates')}>
                      View templates
                    </button>
                    <button
                      type="button"
                        className="btn btn-primary"
                        onClick={() => {
                        if (selectedTemplate) {
                          selectTemplate(selectedTemplate);
                        } else {
                          refreshTemplates();
                        }
                        }}
                      >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {templateSourceHtml && activeTemplateFields.length === 0 && (
                <div className="text-sm text-gray-500 mb-6">
                  This template has no placeholders. Use a dynamic template to enable live editing.
                </div>
              )}

            <div className={`resume-builder-grid ${showMobilePreview ? 'is-preview-only' : ''}`}>
              <div className="builder-panel">
                {activeEditorTab === 'edit' ? (
                  <>
                {showProgressCard && (
                  <div className="builder-progress-card">
                    <div className="progress-header">
                      <span className="progress-badge">{resumeScore}%</span>
                      <span className="progress-title">Resume completeness</span>
                    </div>
                    <div className="progress-bar">
                      <span className="progress-fill" style={{ width: `${resumeScore}%` }} />
                    </div>
                    <div className="progress-actions">
                      <button type="button" className="ai-chip">
                        Try AI profile summary
                      </button>
                      <button type="button" className="ai-chip">
                        Create quick cover letter
                      </button>
                    </div>
                  </div>
                )}
                {isStepMode && showStepChrome && currentStepId && (
                  <div className="step-header">
                    <div id={SECTION_RICH_TEXT_TOOLBAR_HOST_ID} className="step-rich-text-toolbar-host" />
                  </div>
                )}
                <div className="space-y-5">
                  {sectionOrder.map((sectionId) => {
                    const sectionTitle = RESUME_SECTION_TITLES[sectionId];
                    const currentSectionIndex = sectionOrder.indexOf(sectionId);
                    const nextSectionId =
                      currentSectionIndex >= 0 && currentSectionIndex < sectionOrder.length - 1
                        ? sectionOrder[currentSectionIndex + 1]
                        : null;
                    const nextSectionTitle = nextSectionId ? RESUME_SECTION_TITLES[nextSectionId] || 'Next Section' : '';

                    const sectionContent = {
                      contact: (
                        <div className="contact-grid">
                          <div className="contact-fields">
                            <div className="contact-top-row">
                              {showRoleField && (
                                <div className="form-group">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Professional Title</label>
                                  <input
                                    placeholder="e.g. Software Engineer"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={contactRole}
                                    onChange={(e) => setContactRole(e.target.value)}
                                  />
                                </div>
                              )}
                              {showPhotoField && (
                                <div className="contact-photo-card">
                                  <div className="photo-preview">
                                    {contactPhotoUrl ? (
                                      <img src={contactPhotoUrl} alt="Profile preview" />
                                    ) : (
                                      <div className="photo-placeholder">No photo</div>
                                    )}
                                  </div>
                                  <div className="photo-actions">
                                    <label className="photo-action" htmlFor="contact-photo-input">
                                      <Pencil size={14} />
                                      Edit photo
                                    </label>
                                    <button
                                      type="button"
                                      className="photo-action danger"
                                      onClick={() => handlePhotoUpload(undefined)}
                                    >
                                      <Trash2 size={14} />
                                      Delete
                                    </button>
                                  </div>
                                  <input
                                    id="contact-photo-input"
                                    type="file"
                                    accept="image/*"
                                    className="photo-input"
                                    onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {showNameField && (
                                <>
                                  <div className="form-group">
                                    <label className="block text-sm font-semibold mb-2 text-gray-700">First Name</label>
                                    <input
                                      placeholder="It's"
                                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                      value={contactNameParts.first}
                                      onChange={(e) => updateContactNameParts(e.target.value, contactNameParts.last)}
                                    />
                                  </div>
                                  <div className="form-group">
                                    <label className="block text-sm font-semibold mb-2 text-gray-700">Last Name</label>
                                    <input
                                      placeholder="Coder"
                                      className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                      value={contactNameParts.last}
                                      onChange={(e) => updateContactNameParts(contactNameParts.first, e.target.value)}
                                    />
                                  </div>
                                </>
                              )}
                              {showEmailField && (
                                <div className="form-group">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Email</label>
                                  <input
                                    type="email"
                                    placeholder="you@email.com"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                  />
                                </div>
                              )}
                              {showPhoneField && (
                                <div className="form-group">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Phone</label>
                                  <input
                                    type="tel"
                                    placeholder="(555) 555-1234"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                  />
                                </div>
                              )}
                              {showWebsiteField && (
                                <div className="form-group">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Portfolio</label>
                                  <input
                                    type="url"
                                    placeholder="www.yourportfolio.com"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={getTemplateFieldValue('website') || getTemplateFieldValue('portfolio')}
                                    onChange={(e) => setTemplateFieldValue('portfolio', e.target.value)}
                                  />
                                </div>
                              )}
                              {showLinkedInField && (
                                <div className="form-group">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">LinkedIn URL</label>
                                  <input
                                    type="url"
                                    placeholder="linkedin.com/in/you"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={getTemplateFieldValue('linkedin')}
                                    onChange={(e) => setTemplateFieldValue('linkedin', e.target.value)}
                                  />
                                </div>
                              )}
                              {showGitHubField && (
                                <div className="form-group">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">GitHub URL</label>
                                  <input
                                    type="url"
                                    placeholder="github.com/you"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={getTemplateFieldValue('github')}
                                    onChange={(e) => setTemplateFieldValue('github', e.target.value)}
                                  />
                                </div>
                              )}
                              {showPostalCodeField && (
                                <div className="form-group">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Postal Code</label>
                                  <input
                                    placeholder="Postal code"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={getTemplateFieldValue('postal_code')}
                                    onChange={(e) => setTemplateFieldValue('postal_code', e.target.value)}
                                  />
                                </div>
                              )}
                              {showLocationField && (
                                <div className="form-group">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">City / Address</label>
                                  <input
                                    placeholder="City / Address"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={contactLocation}
                                    onChange={(e) => setContactLocation(e.target.value)}
                                  />
                                </div>
                              )}
                              {showCountryField && (
                                <div className="form-group">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Country</label>
                                  <input
                                    placeholder="Country"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={getTemplateFieldValue('country')}
                                    onChange={(e) => setTemplateFieldValue('country', e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="contact-footer">
                              <button type="button" className="add-details-btn">Add more details</button>
                              <button
                                type="button"
                                className="ask-ai-btn"
                                onClick={() => setActiveEditorTab('review')}
                              >
                                Ask AI writer
                              </button>
                            </div>
                          </div>
                        </div>
                      ),
                      summary: (
                        <div className="form-group">
                          <label className="block text-sm font-semibold mb-2 text-gray-700">Professional Summary / Objective</label>
                          <ImproveTextAction
                            text={parseRichTextMultilineText(summaryText)}
                            type="summary"
                            onAccept={(value) => setSummaryText(plainTextToParagraphHtml(value))}
                            className="mb-3"
                          />
                          <RichTextEditor
                            value={summaryText}
                            onChange={setSummaryText}
                            placeholder="Write your professional summary or objective..."
                            minHeight={160}
                            toolbarHostId={SECTION_RICH_TEXT_TOOLBAR_HOST_ID}
                          />
                        </div>
                      ),
                      experience: (
                        <div className="space-y-4">
                          {experienceItems.map((item, index) => (
                            <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-800">Experience {index + 1}</h4>
                                {experienceItems.length > 1 && (
                                  <button
                                    onClick={() => removeExperienceItem(item.id)}
                                    className="text-xs text-red-600 hover:text-red-700"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-group">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Role</label>
                                  <RichTextEditor
                                    value={item.role}
                                    onChange={(value) => updateExperienceItem(item.id, { role: value })}
                                    placeholder="e.g. Senior Developer"
                                    minHeight={58}
                                    compact
                                    spellCheck={false}
                                    toolbarHostId={SECTION_RICH_TEXT_TOOLBAR_HOST_ID}
                                  />
                                </div>
                                <div className="form-group">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Company</label>
                                  <RichTextEditor
                                    value={item.company}
                                    onChange={(value) => updateExperienceItem(item.id, { company: value })}
                                    placeholder="Company name"
                                    minHeight={58}
                                    compact
                                    spellCheck={false}
                                    toolbarHostId={SECTION_RICH_TEXT_TOOLBAR_HOST_ID}
                                  />
                                </div>
                                <div className="form-group md:col-span-2">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Dates</label>
                                  <RichTextEditor
                                    value={item.dates}
                                    onChange={(value) => updateExperienceItem(item.id, { dates: value })}
                                    placeholder="e.g. Jan 2021 - Present"
                                    minHeight={54}
                                    compact
                                    spellCheck={false}
                                    toolbarHostId={SECTION_RICH_TEXT_TOOLBAR_HOST_ID}
                                  />
                                </div>
                                <div className="form-group md:col-span-2">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Details (one bullet per line)</label>
                                  <ImproveTextAction
                                    text={parseRichTextMultilineText(item.details)}
                                    type="experience"
                                    onAccept={(value) => updateExperienceItem(item.id, { details: plainTextToBulletHtml(value) })}
                                    className="mb-3"
                                  />
                                  <RichTextEditor
                                    value={item.details}
                                    onChange={(value) => updateExperienceItem(item.id, { details: value })}
                                    placeholder="Built X feature...\nImproved Y by 20%..."
                                    minHeight={140}
                                    toolbarHostId={SECTION_RICH_TEXT_TOOLBAR_HOST_ID}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={addExperienceItem}
                            className="text-sm font-semibold text-primary hover:text-primary-dark"
                          >
                            + Add Experience
                          </button>
                        </div>
                      ),
                      education: (
                        <div className="space-y-4">
                          {educationItems.map((item, index) => (
                            <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-800">Education {index + 1}</h4>
                                {educationItems.length > 1 && (
                                  <button
                                    onClick={() => removeEducationItem(item.id)}
                                    className="text-xs text-red-600 hover:text-red-700"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-group">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Degree</label>
                                  <RichTextEditor
                                    value={item.degree}
                                    onChange={(value) => updateEducationItem(item.id, { degree: value })}
                                    placeholder="e.g. BSc Computer Science"
                                    minHeight={58}
                                    compact
                                    spellCheck={false}
                                    toolbarHostId={SECTION_RICH_TEXT_TOOLBAR_HOST_ID}
                                  />
                                </div>
                                <div className="form-group">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">School</label>
                                  <RichTextEditor
                                    value={item.school}
                                    onChange={(value) => updateEducationItem(item.id, { school: value })}
                                    placeholder="University name"
                                    minHeight={58}
                                    compact
                                    spellCheck={false}
                                    toolbarHostId={SECTION_RICH_TEXT_TOOLBAR_HOST_ID}
                                  />
                                </div>
                                <div className="form-group md:col-span-2">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Dates</label>
                                  <RichTextEditor
                                    value={item.dates}
                                    onChange={(value) => updateEducationItem(item.id, { dates: value })}
                                    placeholder="e.g. 2016 - 2020"
                                    minHeight={54}
                                    compact
                                    spellCheck={false}
                                    toolbarHostId={SECTION_RICH_TEXT_TOOLBAR_HOST_ID}
                                  />
                                </div>
                                <div className="form-group md:col-span-2">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Details (one bullet per line)</label>
                                  <RichTextEditor
                                    value={item.details}
                                    onChange={(value) => updateEducationItem(item.id, { details: value })}
                                    placeholder="Honors, GPA, coursework..."
                                    minHeight={120}
                                    toolbarHostId={SECTION_RICH_TEXT_TOOLBAR_HOST_ID}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={addEducationItem}
                            className="text-sm font-semibold text-primary hover:text-primary-dark"
                          >
                            + Add Education
                          </button>
                        </div>
                      ),
                      skills: (
                        <div className="form-group">
                          <label className="block text-sm font-semibold mb-2 text-gray-700">Skills</label>
                          <ImproveTextAction
                            text={skillsText}
                            type="skills"
                            onAccept={(value) => setSkillsText(normalizeImprovedSkillsText(value))}
                            className="mb-3"
                          />
                          <div className="skills-editor">
                            <div className="skills-input-row">
                              <input
                                placeholder="Add a skill (e.g. React)"
                                className="skills-input"
                                value={skillsInput}
                                onChange={(e) => setSkillsInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addSkill();
                                  }
                                }}
                              />
                              <button type="button" className="add-skill-btn" onClick={addSkill}>
                                Add skill
                              </button>
                            </div>
                            {skillsList.length > 0 ? (
                              <div className="skills-chip-list">
                                {skillsList.map((skill, index) => (
                                  <span key={`${skill}-${index}`} className="skills-chip">
                                    {skill}
                                    <button
                                      type="button"
                                      className="skills-chip-remove"
                                      aria-label={`Remove ${skill}`}
                                      onClick={() => removeSkill(index)}
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="skills-empty">Add your first skill to get started.</div>
                            )}
                            <div className="skills-helper">Tip: You can paste multiple skills separated by commas.</div>
                          </div>
                        </div>
                      ),
                      languages: (
                        <div className="form-group">
                          <label className="block text-sm font-semibold mb-2 text-gray-700">Languages</label>
                          <div className="skills-editor">
                            <div className="skills-input-row">
                              <input
                                placeholder="Add a language (e.g. Urdu)"
                                className="skills-input"
                                value={languagesInput}
                                onChange={(e) => setLanguagesInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addLanguage();
                                  }
                                }}
                              />
                              <button type="button" className="add-skill-btn" onClick={addLanguage}>
                                Add language
                              </button>
                            </div>
                            {languageList.length > 0 ? (
                              <div className="skills-chip-list">
                                {languageList.map((language, index) => (
                                  <span key={`${language}-${index}`} className="skills-chip">
                                    {language}
                                    <button
                                      type="button"
                                      className="skills-chip-remove"
                                      aria-label={`Remove ${language}`}
                                      onClick={() => removeLanguage(index)}
                                    >
                                      Ã—
                                    </button>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="skills-empty">Add your first language to get started.</div>
                            )}
                            <div className="skills-helper">Tip: You can paste multiple languages separated by commas.</div>
                          </div>
                        </div>
                      ),
                      personal_info: renderDetectedFieldSection(
                        personalInfoFields,
                        'These details are optional. Fill only what you want shown on the resume.'
                      ),
                      certifications: renderDetectedFieldSection(
                        certificationFields,
                        'Add certifications only if you want them shown on the resume.'
                      ),
                      awards: renderDetectedFieldSection(
                        awardFields,
                        'Add achievements or awards only when they apply to this candidate.'
                      ),
                      references: renderDetectedFieldSection(
                        referenceFields,
                        'References are optional. Fill them only when the candidate wants them included.'
                      ),
                    }[sectionId];

                    if (!sectionContent) return null;

                    const isUnlocked = unlockedSections.includes(sectionId);
                    if (!isUnlocked) return null;
                    if (isStepMode && sectionId !== currentStepId) return null;
                    const isExpanded = activeSectionId === sectionId;
                    const isComplete = sectionCompletion[sectionId];
                    const isOptionalSection = !REQUIRED_EDITOR_SECTION_IDS.has(sectionId);

                    return (
                      <div
                        key={sectionId}
                        className={`builder-section ${draggingSection === sectionId ? 'is-dragging' : ''} ${isExpanded ? 'is-expanded' : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(sectionId)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(sectionId)}
                      >
                        <button
                          type="button"
                          className="builder-section-header"
                          onClick={() => setActiveSectionId(sectionId)}
                        >
                          <span className="drag-handle">::</span>
                          <div className="builder-section-title-group">
                            <h3>{sectionTitle}</h3>
                            {isOptionalSection && (
                              <span className="section-optional-badge">Optional</span>
                            )}
                          </div>
                          <span className="ai-help-btn">
                            Get help with writing
                          </span>
                          <span className={`section-status ${isComplete ? 'complete' : ''}`}>
                            {isComplete ? 'Completed' : 'In progress'}
                          </span>
                          <span className={`section-toggle ${isExpanded ? 'is-open' : ''}`} aria-hidden="true" />
                        </button>
                        {isExpanded && (
                          <div className="builder-section-body" onKeyDownCapture={handleSectionEnterKey}>
                            {sectionContent}
                            {nextSectionId && !isStepMode && (
                              <div className="section-nav-actions">
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm section-next-btn"
                                  onClick={() => setActiveSectionId(nextSectionId)}
                                >
                                  {`Next: ${nextSectionTitle}`}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {isStepMode && showStepChrome && activeEditorTab === 'edit' && (
                  <>
                    <div className="step-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={goPrevStep}
                        disabled={currentStepIndex === 0}
                      >
                        Back
                      </button>
                      <div className="step-dots">
                        {stepSections.map((_, index) => (
                          <span
                            key={`step-dot-${index}`}
                            className={`step-dot ${index === currentStepIndex ? 'active' : ''}`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={isLastStep ? goToCustomizeSection : goNextStep}
                        disabled={isLastStep ? !canCustomize : false}
                        title={isLastStep ? 'Go to customize section' : 'Go to next section'}
                      >
                        Next
                      </button>
                    </div>
                    {isLastStep && !canCustomize && (
                      <div className="step-footer-note">
                        Complete the required sections to open Customize.
                      </div>
                    )}
                  </>
                )}

                {generateError && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 mt-4">
                    <AlertCircle size={18} />
                    {generateError}
                  </div>
                )}
                  </>
                ) : activeEditorTab === 'customize' ? (
                  renderCustomizePanel()
                ) : activeEditorTab === 'review' ? (
                  <div className="resume-tab-panel">
                    <div className="tab-panel-header">
                      <div>
                        <h2>AI Review</h2>
                        <p>See what’s missing and improve your resume quality.</p>
                      </div>
                      <div className="review-score">
                        <span>Score</span>
                        <strong>{resumeScore}%</strong>
                      </div>
                    </div>
                    <div className="tab-panel-body">
                      <div className="tab-section">
                        <h3>Completion checklist</h3>
                        <div className="review-list">
                          {availableSections.map((sectionId) => (
                            <div key={`review-${sectionId}`} className={`review-item ${sectionCompletion[sectionId] ? 'complete' : 'missing'}`}>
                              <span>{RESUME_SECTION_TITLES[sectionId] || sectionId}</span>
                              <strong>{sectionCompletion[sectionId] ? 'Complete' : 'Needs attention'}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="resume-tab-panel">
                    <div className="tab-panel-header">
                      <div>
                        <h2>Tailor to a job</h2>
                        <p>Add a target role or keywords to tailor your resume.</p>
                      </div>
                    </div>
                    <div className="tab-panel-body">
                      <div className="tab-section">
                        <label className="tab-label">Target role</label>
                        <input
                          className="tab-input"
                          placeholder="e.g. Frontend Engineer"
                          value={tailorRole}
                          onChange={(e) => setTailorRole(e.target.value)}
                        />
                      </div>
                      <div className="tab-section">
                        <label className="tab-label">Key skills to emphasize</label>
                        <textarea
                          className="tab-textarea"
                          rows={4}
                          placeholder="React, TypeScript, Next.js..."
                          value={tailorKeywords}
                          onChange={(e) => setTailorKeywords(e.target.value)}
                        />
                      </div>
                      <div className="tab-section tab-actions">
                        <button type="button" className="btn btn-primary" onClick={() => setActiveEditorTab('edit')}>
                          Apply and return to Edit
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {previewPanel}
            </div>
            </div>
          </>
        )}
      </div>

      {isEditorRoute && showTemplatePicker && (
        <div className="template-drawer" role="dialog" aria-modal="true">
          <button
            type="button"
            className="template-drawer-backdrop"
            aria-label="Close template picker"
            onClick={() => setShowTemplatePicker(false)}
          />
          <aside className="template-drawer-panel">
            <div className="template-drawer-header">
              <div>
                <h2>Change template</h2>
                <p>Pick a new layout. Your content stays the same.</p>
              </div>
              <button
                type="button"
                className="template-drawer-close"
                onClick={() => setShowTemplatePicker(false)}
              >
                Close
              </button>
            </div>
            <div className="template-drawer-body">
              {combinedTemplateLoading ? (
                <div className="template-state">Loading templates...</div>
              ) : combinedTemplateError ? (
                <div className="template-state template-error">{combinedTemplateError}</div>
              ) : filteredTemplates.length === 0 ? (
                <div className="template-state">
                  No templates available. Upload HTML files to the resume_templates bucket.
                </div>
              ) : (
                <div className="template-compact-grid">
                  {filteredTemplates.map((t) => {
                    const displayName = t.displayName.toLowerCase();
                    const isSelected = selectedTemplate === t.name;
                    return (
                      <button
                        key={`drawer:${t.name}`}
                        type="button"
                        onClick={() => handleTemplatePickerSelect(t)}
                        className={`template-card-compact ${isSelected ? 'is-selected' : ''}`}
                        title={displayName}
                      >
                        <div className="template-card-compact-preview">
                          {t.thumbnailUrl ? (
                            <img
                              src={t.thumbnailUrl}
                              alt={`${t.displayName} template`}
                              loading="lazy"
                              decoding="async"
                              width={420}
                              height={594}
                            />
                          ) : (
                            <div className="template-preview-placeholder">
                              <div className="template-preview-paper" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      <ImageCropModal
        isOpen={Boolean(pendingPhotoCropSrc)}
        imageSrc={pendingPhotoCropSrc}
        imageName={pendingPhotoCropName}
        outputSize={300}
        title="Crop profile photo"
        onCancel={handlePhotoCropCancel}
        onConfirm={handlePhotoCropConfirm}
      />

      <style>{`
        .resume-editor-layout {
          min-height: 100vh;
          background: #eef2f7;
        }

        .resume-editor-layout .resume-page {
          height: 100vh;
          overflow: hidden;
          background: #eef2f7;
        }

        .resume-page {
          background: #f8fffe;
          font-family: var(--font-family);
          padding: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 72px);
        }

        .resume-page:not(.is-template-mode) {
           height: 100vh;
           overflow: hidden;
        }

        .resume-page.is-template-mode {
           height: auto;
           overflow-y: auto;
        }

        .page-content {
          padding: 0 !important;
          max-width: 100% !important;
          margin: 0 !important;
          width: 100% !important;
        }

        .resume-hero {
          background: linear-gradient(135deg, #f0fdf9 0%, #ecfdf5 100%);
          border-bottom: 1px solid #e5e7eb;
          padding: 60px 24px 40px;
          margin: 0 0 32px;
        }

        .resume-hero.is-templates {
          padding: 72px 24px 48px;
        }

        .resume-hero-content {
          max-width: 900px;
          margin: 0 auto;
          text-align: center;
        }

        .resume-hero.is-templates .resume-hero-content {
          max-width: 1050px;
        }

        .resume-hero h1 {
          font-size: 42px;
          font-weight: 800;
          color: #111827;
          margin-bottom: 12px;
        }

        .highlight {
          color: #00d4aa;
        }

        .subtitle {
          font-size: 18px;
          color: #6b7280;
        }

        .resume-hero-actions {
          margin-top: 24px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
        }

        .template-filters {
          margin-top: 24px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
        }

        .template-filter {
          border-radius: 999px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text-secondary);
          font-size: 0.75rem;
          font-weight: 600;
          padding: 6px 14px;
          transition: all var(--transition-base);
          cursor: pointer;
        }

        .template-filter:hover {
          border-color: var(--color-primary);
          color: var(--color-text-primary);
        }

        .template-filter.active {
          background: rgba(0, 212, 170, 0.12);
          border-color: rgba(0, 212, 170, 0.4);
          color: var(--color-primary);
        }

        .resume-content {
          max-width: none;
          margin: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 12px 16px 16px;
          flex: 1;
          overflow: hidden;
        }

        .resume-page.is-editor-route .resume-content {
          padding: 0;
          height: 100%;
        }

        .resume-tab-panel {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          padding: 20px 24px;
          box-shadow: 0 18px 40px -30px rgba(15, 23, 42, 0.35);
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: 100%;
        }

        .inline-customize-wrapper {
          margin-top: 18px;
        }

        .inline-customize-wrapper-top {
          margin-top: 0;
          margin-bottom: 18px;
        }

        .inline-customize-panel {
          height: auto;
        }

        .inline-customize-panel .tab-panel-body {
          overflow: visible;
        }

        .tab-panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .tab-panel-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 6px;
          color: #0f172a;
        }

        .tab-panel-header p {
          margin: 0;
          color: #64748b;
          font-size: 0.95rem;
        }

        .tab-panel-body {
          display: flex;
          flex-direction: column;
          gap: 20px;
          overflow: auto;
          min-height: 0;
          scrollbar-width: none;
        }

        .tab-panel-body::-webkit-scrollbar {
          width: 0;
          height: 0;
        }

        .tab-section h3 {
          margin: 0 0 12px;
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
        }

        .tab-helper {
          margin: -2px 0 14px;
          color: #64748b;
          font-size: 0.92rem;
          line-height: 1.5;
        }

        .preview-settings {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }

        .customize-download-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 18px;
          padding: 18px 20px;
          border: 1px solid #dbe5ef;
          border-radius: 16px;
          background:
            radial-gradient(circle at top right, rgba(37, 99, 235, 0.08), transparent 38%),
            linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        }

        .customize-download-copy {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .customize-download-copy strong {
          color: #0f172a;
          font-size: 1rem;
        }

        .customize-download-copy p {
          margin: 0;
          color: #64748b;
          font-size: 0.92rem;
          line-height: 1.55;
        }

        .customize-download-btn {
          flex-shrink: 0;
        }

        .customize-download-note {
          margin-top: 10px;
          color: #64748b;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .style-control-grid,
        .heading-size-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }

        .color-preset-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
        }

        .color-preset-card {
          border: 1px solid #dbe5ef;
          border-radius: 14px;
          background: #ffffff;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
        }

        .color-preset-card:hover {
          border-color: #94a3b8;
          box-shadow: 0 10px 22px -18px rgba(15, 23, 42, 0.35);
          transform: translateY(-1px);
        }

        .color-preset-card.is-selected {
          border-color: #0f172a;
          box-shadow: 0 14px 28px -20px rgba(15, 23, 42, 0.45);
        }

        .color-preset-swatch {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          flex: 0 0 18px;
          box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.7), 0 0 0 1px rgba(15, 23, 42, 0.12);
        }

        .color-preset-label {
          color: #0f172a;
          font-size: 0.92rem;
          font-weight: 700;
        }

        .color-custom-controls {
          margin-top: 14px;
          display: grid;
          gap: 8px;
        }

        .color-custom-label {
          color: #475569;
          font-size: 0.88rem;
          font-weight: 700;
        }

        .color-custom-inputs {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .color-picker-input {
          width: 52px;
          height: 42px;
          border: 1px solid #dbe5ef;
          border-radius: 10px;
          background: #ffffff;
          padding: 4px;
          cursor: pointer;
        }

        .color-hex-input {
          flex: 1;
          min-width: 0;
          border: 1px solid #dbe5ef;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 0.92rem;
          font-weight: 600;
          color: #0f172a;
          outline: none;
        }

        .color-hex-input:focus {
          border-color: #94a3b8;
          box-shadow: 0 0 0 4px rgba(148, 163, 184, 0.12);
        }

        .style-control-card {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .style-control-label {
          color: #0f172a;
          font-size: 0.92rem;
          font-weight: 700;
        }

        .style-control-note {
          color: #64748b;
          font-size: 0.82rem;
          line-height: 1.45;
        }

        .style-color-input {
          width: 100%;
          height: 42px;
          border: 1px solid #dbe5ef;
          border-radius: 10px;
          background: #ffffff;
          padding: 4px;
          cursor: pointer;
        }

        .setting-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 14px;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: #0f172a;
          font-weight: 600;
        }

        .setting-card span {
          color: #64748b;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .review-score {
          background: #0f172a;
          color: #ffffff;
          border-radius: 14px;
          padding: 10px 14px;
          display: inline-flex;
          flex-direction: column;
          gap: 4px;
          text-align: center;
          min-width: 90px;
        }

        .review-score span {
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .review-score strong {
          font-size: 1.25rem;
        }

        .review-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }

        .review-item {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-weight: 600;
        }

        .review-item.complete {
          background: rgba(34, 197, 94, 0.1);
          border-color: rgba(34, 197, 94, 0.4);
          color: #166534;
        }

        .review-item.missing {
          background: rgba(248, 113, 113, 0.08);
          border-color: rgba(248, 113, 113, 0.4);
          color: #b91c1c;
        }

        .tab-label {
          display: block;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 8px;
        }

        .tab-input,
        .tab-textarea {
          width: 100%;
          border: 1px solid #dbe5ef;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 0.95rem;
          color: #0f172a;
          caret-color: #0f172a;
          -webkit-text-fill-color: #0f172a;
          outline: none;
        }

        .tab-textarea {
          resize: vertical;
        }

        .tab-input::placeholder,
        .tab-textarea::placeholder {
          color: rgba(100, 116, 139, 0.52);
          -webkit-text-fill-color: rgba(100, 116, 139, 0.52);
          opacity: 1;
        }

        .tab-actions {
          display: flex;
          justify-content: flex-end;
        }

        .template-drawer {
          position: fixed;
          inset: 0;
          z-index: 120;
          display: flex;
          align-items: stretch;
          justify-content: flex-start;
        }

        .template-drawer-backdrop {
          position: absolute;
          inset: 0;
          border: none;
          background: rgba(15, 23, 42, 0.45);
        }

        .template-drawer-panel {
          position: relative;
          width: min(560px, 94vw);
          height: 100%;
          background: #ffffff;
          box-shadow: 24px 0 48px -32px rgba(15, 23, 42, 0.6);
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          padding: 20px 22px;
          overflow: hidden;
          z-index: 1;
        }

        .template-drawer-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .template-drawer-header h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 6px;
        }

        .template-drawer-header p {
          margin: 0;
          color: #64748b;
          font-size: 0.9rem;
        }

        .template-drawer-close {
          border: 1px solid #e2e8f0;
          background: #ffffff;
          border-radius: 999px;
          padding: 6px 12px;
          font-weight: 600;
          color: #0f172a;
        }

        .template-drawer-body {
          flex: 1;
          min-height: 0;
          overflow: auto;
          padding-right: 4px;
          scrollbar-width: none;
        }

        .template-drawer-body::-webkit-scrollbar {
          width: 0;
          height: 0;
        }

        .template-drawer .template-compact-grid {
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }

        .resume-topbar {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 16px;
          padding: 12px 20px;
          margin: 0;
          border-bottom: 1px solid #e2e8f0;
          background: #ffffff;
          box-shadow: 0 6px 16px -16px rgba(15, 23, 42, 0.45);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .resume-page.is-editor-route .resume-topbar {
          position: fixed;
          left: 0;
          right: 0;
          top: 0;
          border-radius: 0;
        }

        .resume-workspace {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 14px 26px -22px rgba(15, 23, 42, 0.35);
        }

        .resume-workspace.is-editor {
          background: #f1f5f9;
          border: 0;
          box-shadow: none;
          padding: 16px;
          border-radius: 0;
          height: calc(100vh - 72px);
          margin-top: 72px;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }

        .resume-topbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .topbar-app-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .topbar-back-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #1f2937;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
        }

        .topbar-back-btn:hover {
          border-color: #14b8a6;
          box-shadow: 0 8px 18px -14px rgba(15, 23, 42, 0.4);
          transform: translateY(-1px);
        }

        .dot-grid {
          display: grid;
          grid-template-columns: repeat(3, 4px);
          gap: 4px;
        }

        .dot-grid span {
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #64748b;
          display: block;
        }

        .topbar-title-group {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .resume-topbar-title {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
        }

        .topbar-language {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          color: #64748b;
        }

        .flag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          font-size: 0.65rem;
          font-weight: 700;
          color: #1f2937;
        }

        .resume-topbar-center {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          justify-content: center;
          justify-self: center;
          padding: 4px;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .resume-topbar-pill {
          border: 1px solid transparent;
          background: transparent;
          color: #64748b;
          padding: 6px 16px;
          border-radius: 999px;
          font-size: 0.82rem;
          font-weight: 600;
        }

        .resume-topbar-pill.is-active {
          border-color: #e2e8f0;
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 8px 14px -12px rgba(15, 23, 42, 0.45);
        }

        .resume-topbar-pill.has-badge {
          position: relative;
          padding-right: 48px;
        }

        .pill-badge {
          position: absolute;
          top: -6px;
          right: 8px;
          background: #2563eb;
          color: #ffffff;
          font-size: 0.6rem;
          padding: 2px 6px;
          border-radius: 999px;
          font-weight: 700;
        }

        .resume-topbar-right {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
        }

        .resume-topbar-colorbar {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          background: #ffffff;
          box-shadow: 0 8px 16px -14px rgba(15, 23, 42, 0.35);
        }

        .topbar-color-swatch,
        .topbar-color-custom {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          border: 2px solid transparent;
          padding: 0;
          cursor: pointer;
          position: relative;
          box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
        }

        .topbar-color-swatch:hover,
        .topbar-color-custom:hover {
          transform: translateY(-1px);
          box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.1), 0 6px 14px -10px rgba(15, 23, 42, 0.45);
        }

        .topbar-color-swatch.is-selected,
        .topbar-color-custom.is-selected {
          border-color: #0f172a;
          box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.92);
        }

        .topbar-color-custom {
          overflow: hidden;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }

        .topbar-color-custom input {
          position: absolute;
          inset: -4px;
          width: calc(100% + 8px);
          height: calc(100% + 8px);
          opacity: 0;
          cursor: pointer;
        }

        .resume-topbar-outline {
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          padding: 8px 14px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.82rem;
          cursor: pointer;
          transition: border-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
        }

        .resume-topbar-outline:hover {
          border-color: #94a3b8;
          color: #0f172a;
          box-shadow: 0 8px 16px -14px rgba(15, 23, 42, 0.5);
        }

        .resume-topbar-download {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 8px 18px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 10px 20px -14px rgba(37, 99, 235, 0.8);
        }

        .resume-topbar-download .caret {
          display: inline-block;
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 5px solid #ffffff;
          margin-top: 2px;
        }

        .resume-topbar-download:hover {
          background: #1d4ed8;
        }

        .resume-topbar-download:disabled {
          background: #cbd5e1;
          color: #ffffff;
          cursor: not-allowed;
          box-shadow: none;
          opacity: 0.78;
        }

        .resume-topbar-download:disabled .caret {
          border-top-color: rgba(255, 255, 255, 0.92);
        }

        .resume-topbar-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          font-size: 1rem;
          color: #64748b;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .resume-page:not(.is-template-mode) .resume-content {
           min-height: auto;
           overflow: visible;
        }

        .resume-page.is-template-mode .resume-content {
           min-height: auto;
           overflow: visible;
        }

        .template-gallery {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .template-state {
          padding: 24px;
          border-radius: var(--radius-lg);
          border: 1px dashed var(--color-border);
          background: var(--color-bg-secondary);
          color: var(--color-text-secondary);
          text-align: center;
        }

        .template-state.template-error {
          border-color: rgba(239, 68, 68, 0.4);
          background: rgba(239, 68, 68, 0.08);
          color: var(--color-danger);
        }

        .template-state-editor {
          margin-bottom: 16px;
        }

        .template-issue-title {
          font-weight: 700;
          margin-bottom: 6px;
        }

        .template-issue-body {
          margin-bottom: 12px;
        }

        .template-issue-actions {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .template-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px;
        }

        .template-card {
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          border-radius: var(--radius-xl);
          padding: 16px;
          text-align: left;
          cursor: pointer;
          transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
          box-shadow: var(--shadow-sm);
        }

        .template-card:hover {
          transform: translateY(-4px);
          border-color: var(--color-primary);
          box-shadow: var(--shadow-lg);
        }

        .template-card.is-selected {
          border-color: var(--color-primary);
          box-shadow: 0 18px 36px rgba(0, 212, 170, 0.22);
        }

        .template-card:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: 3px;
        }

        .template-card-preview {
          height: 220px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border-light);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .template-card-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .template-preview-loading {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }

        .template-preview-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .template-preview-paper {
          width: 60%;
          height: 75%;
          background: #ffffff;
          border-radius: 10px;
          box-shadow: var(--shadow-sm);
        }

        .template-card-body {
          padding-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .template-card-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .template-card-title {
          font-weight: 700;
          font-size: 1rem;
          color: var(--color-text-primary);
          text-transform: capitalize;
        }

        .template-card-description {
          font-size: 0.85rem;
          color: var(--color-text-secondary);
          margin: 0;
          min-height: 40px;
        }

        .template-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .template-card-tags {
          display: flex;
          gap: 6px;
        }

        .template-tag {
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid var(--color-border-light);
          background: var(--color-bg-tertiary);
          color: var(--color-text-tertiary);
          font-size: 0.7rem;
          font-weight: 600;
        }

        .template-color-dots {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .template-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: var(--color-border);
        }

        .template-dot.dot-primary {
          background: var(--color-primary);
        }

        .template-dot.dot-neutral {
          background: #111827;
        }

        .template-dot.dot-accent {
          background: var(--color-secondary);
        }

        .template-dot.dot-secondary {
          background: #f43f5e;
        }

        .template-dot.dot-accent-alt {
          background: #8b5cf6;
        }

        .template-showcase {
          display: flex;
          flex-direction: column;
          gap: 32px;
          padding: 24px 0;
        }

        .template-showcase-item {
          display: flex;
          align-items: center;
          gap: 32px;
          padding: 24px;
          background: var(--color-surface);
          border-radius: var(--radius-xl);
          border: 1px solid var(--color-border);
          transition: all var(--transition-base);
        }

        .template-showcase-item.is-selected {
          border-color: var(--color-primary);
          box-shadow: 0 12px 32px rgba(99, 102, 241, 0.15);
          background: rgba(99, 102, 241, 0.02);
        }

        .template-showcase-item:hover {
          border-color: var(--color-primary);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
        }

        .template-showcase-container {
          display: flex;
          width: 100%;
          gap: 32px;
          align-items: stretch;
        }

        .template-preview-box {
          flex: 0 0 45%;
          min-height: 600px;
          border-radius: var(--radius-xl);
          overflow: hidden;
          background: #ffffff;
          border: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .template-preview-iframe {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }

        .template-preview-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .template-showcase-footer {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 24px;
        }

        .template-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .template-showcase-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
          text-transform: capitalize;
        }

        .template-showcase-description {
          font-size: 1rem;
          color: var(--color-text-secondary);
          line-height: 1.6;
          margin: 0;
        }

        .template-actions {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--color-border);
        }

        .template-action-buttons {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .template-select-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          border: 2px solid var(--color-primary);
          background: var(--color-primary);
          color: #ffffff;
          border-radius: var(--radius-lg);
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .template-select-btn:hover:not(.active) {
          background: transparent;
          color: var(--color-primary);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
        }

        .template-select-btn.active {
          background: var(--color-primary);
          color: #ffffff;
          border-color: var(--color-primary);
        }

        .template-export-tags {
          display: flex;
          gap: 8px;
        }

        .template-compact-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding: 20px 0;
        }

        .template-card-compact {
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          padding: 0;
          text-align: left;
          cursor: pointer;
          transition: all var(--transition-base);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .template-card-compact:hover {
          transform: translateY(-3px);
          border-color: var(--color-primary);
          box-shadow: var(--shadow-lg);
        }

        .template-card-compact.is-selected {
          border-color: var(--color-primary);
          box-shadow: 0 12px 24px rgba(99, 102, 241, 0.2);
          background: rgba(99, 102, 241, 0.02);
        }

        .template-card-compact.is-selected::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          background: var(--color-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.9;
          z-index: 10;
        }

        .template-card-compact-preview {
          aspect-ratio: 210 / 297;
          height: auto;
          overflow: hidden;
          background: var(--color-bg-secondary);
          display: block;
          width: 100%;
        }

        .template-card-compact-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          transition: transform 0.3s ease;
        }

        .template-card-compact-content {
          display: none;
        }

        .template-card-compact-header {
          display: none;
        }

        .template-card-compact-title {
          display: none;
        }

        .template-card-compact-footer {
          display: none;
        }

        .template-export-tags-compact {
          display: none;
          gap: 4px;
        }

        .template-tag-compact {
          display: none;
        }

        .resume-page .card {
          background: transparent;
          border: none;
          box-shadow: none;
        }

        .ai-generator-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .score-card {
          background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          color: white;
        }

        .score-display {
          display: flex;
          align-items: center;
          gap: var(--spacing-xl);
          margin-bottom: var(--spacing-xl);
        }

        .score-circle {
          position: relative;
          width: 120px;
          height: 120px;
        }

        .score-number {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: var(--font-size-3xl);
          font-weight: 700;
        }

        .score-info h3 {
          font-size: var(--font-size-2xl);
          margin-bottom: var(--spacing-xs);
        }

        .score-info p {
          opacity: 0.9;
        }

        .score-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--spacing-lg);
          padding: var(--spacing-lg);
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-lg);
          backdrop-filter: blur(10px);
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .stat-value {
          font-size: var(--font-size-xl);
          font-weight: 700;
        }

        .stat-label {
          font-size: var(--font-size-sm);
          opacity: 0.9;
        }

        .analysis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--spacing-lg);
        }

        .analysis-card .card-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }

        .analysis-card h3 {
          font-size: var(--font-size-lg);
          font-weight: 600;
        }

        .analysis-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .analysis-list li {
          display: flex;
          gap: var(--spacing-sm);
          align-items: flex-start;
          line-height: 1.6;
          color: var(--color-text-secondary);
        }

        .analysis-list svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .text-success {
          color: var(--color-success);
        }

        .text-warning {
          color: var(--color-warning);
        }

        .card-subtitle {
          color: var(--color-text-secondary);
          margin-bottom: var(--spacing-lg);
        }

        .keywords-grid {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
        }

        .badge-lg {
          padding: var(--spacing-sm) var(--spacing-md);
          font-size: var(--font-size-sm);
        }

        .resume-preview {
          background: var(--color-bg-secondary);
          border-radius: var(--radius-lg);
          min-height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preview-placeholder {
          text-align: center;
          color: var(--color-text-tertiary);
        }

        .preview-placeholder svg {
          margin-bottom: var(--spacing-lg);
        }

        .preview-placeholder p {
          margin-bottom: var(--spacing-lg);
          font-weight: 500;
        }

        .resume-builder-grid {
          display: grid;
          grid-template-columns: minmax(360px, 1.05fr) minmax(420px, 1fr);
          gap: 16px;
          align-items: stretch;
          flex: 1;
          min-height: 0;
          height: calc(100vh - 160px);
        }

        .resume-workspace.is-editor .resume-builder-grid {
          height: 100%;
          min-height: 0;
        }

        .resume-builder-grid.is-preview-only {
          grid-template-columns: minmax(0, 0) minmax(520px, 1fr);
        }

        .resume-builder-grid.is-preview-only .builder-panel {
          display: none;
        }

        .builder-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          min-width: 0;
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          scroll-padding-top: 120px;
          padding-right: 6px;
          gap: 16px;
          scrollbar-width: none;
        }

        .builder-panel::-webkit-scrollbar {
          width: 0;
          height: 0;
        }

        .contact-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .contact-top-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          align-items: start;
        }

        .contact-photo-card {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 12px;
          display: flex;
          gap: 12px;
          align-items: center;
          min-width: 200px;
          background: #f8fafc;
        }

        .photo-preview {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          overflow: hidden;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          color: #64748b;
        }

        .photo-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-actions {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.85rem;
        }

        .photo-action {
          color: #2563eb;
          font-weight: 600;
          background: none;
          border: none;
          text-align: left;
          padding: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .photo-action.danger {
          color: #ef4444;
        }

        .photo-input {
          display: none;
        }

        .contact-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 6px;
        }

        .add-details-btn {
          border: none;
          background: none;
          color: #2563eb;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .add-details-btn::after {
          content: '';
          width: 6px;
          height: 6px;
          border-right: 2px solid #2563eb;
          border-bottom: 2px solid #2563eb;
          transform: rotate(45deg);
          margin-top: -2px;
        }

        .ask-ai-btn {
          border: 2px solid transparent;
          background:
            linear-gradient(#ffffff, #ffffff) padding-box,
            linear-gradient(135deg, #6366f1, #f97316) border-box;
          color: #312e81;
          font-weight: 700;
          border-radius: 999px;
          padding: 10px 18px;
          box-shadow: 0 12px 24px -20px rgba(99, 102, 241, 0.6);
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .skills-editor {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .skills-input-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .skills-input {
          flex: 1;
          min-width: 200px;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 0.95rem;
          outline: none;
        }

        .skills-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
        }

        .add-skill-btn {
          border: none;
          background: #0f172a;
          color: #ffffff;
          font-weight: 600;
          border-radius: 12px;
          padding: 10px 14px;
          cursor: pointer;
        }

        .skills-chip-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .skills-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          font-size: 0.85rem;
          color: #0f172a;
        }

        .skills-chip-remove {
          border: none;
          background: transparent;
          color: #64748b;
          font-weight: 700;
          font-size: 1rem;
          line-height: 1;
          cursor: pointer;
        }

        .skills-empty {
          font-size: 0.85rem;
          color: #94a3b8;
        }

        .skills-helper {
          font-size: 0.8rem;
          color: #94a3b8;
        }

        .builder-progress-card {
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          box-shadow: 0 18px 32px -24px rgba(15, 23, 42, 0.35);
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .progress-header {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          color: #334155;
        }

        .progress-badge {
          background: rgba(34, 197, 94, 0.2);
          color: #15803d;
          font-weight: 800;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 0.78rem;
        }

        .progress-title {
          font-size: 0.95rem;
        }

        .progress-bar {
          height: 6px;
          border-radius: 999px;
          background: #e2e8f0;
          overflow: hidden;
        }

        .progress-fill {
          display: block;
          height: 100%;
          border-radius: 999px;
          background: #22c55e;
        }

        .progress-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .ai-chip {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #0f172a;
          font-weight: 600;
          border-radius: 999px;
          padding: 8px 14px;
          font-size: 0.85rem;
          box-shadow: 0 10px 20px -18px rgba(15, 23, 42, 0.4);
        }

        .builder-preview-panel {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-height: 0;
          height: 100%;
          overflow: hidden;
        }

        .preview-progress-card {
          border: 1px solid #d9e2f2;
          border-radius: 18px;
          background:
            radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 34%),
            linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          box-shadow: 0 18px 40px -30px rgba(15, 23, 42, 0.28);
          padding: 8px 4px 8px;
          overflow: hidden;
        }

        .preview-progress-track {
          display: block;
        }

        .preview-stepper {
          display: grid;
          gap: 0;
          overflow: visible;
          padding-bottom: 0;
        }

        .preview-step {
          position: relative;
          border: none;
          background: transparent;
          min-width: 0;
          padding: 0 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-align: center;
          cursor: pointer;
          color: #64748b;
        }

        .preview-step-line {
          position: absolute;
          top: 10px;
          height: 2px;
          border-radius: 999px;
          background: #dbe4f0;
          transition: background 0.2s ease;
          pointer-events: none;
        }

        .preview-step-line-left {
          left: 0;
          right: calc(50% + 11px);
        }

        .preview-step-line-right {
          left: calc(50% + 11px);
          right: 0;
        }

        .preview-step.has-logo-marker .preview-step-line-left {
          right: calc(50% + 7px);
          background: linear-gradient(90deg, #60a5fa 0%, #2563eb 100%);
        }

        .preview-step.has-logo-marker .preview-step-line-right {
          left: calc(50% + 7px);
        }

        .preview-step:first-child .preview-step-line-left,
        .preview-step:last-child .preview-step-line-right {
          display: none;
        }

        .preview-step-marker {
          position: relative;
          z-index: 1;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1.5px solid #cbd5e1;
          background: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.64rem;
          font-weight: 800;
          color: #94a3b8;
          box-shadow: 0 10px 20px -18px rgba(15, 23, 42, 0.3);
          transition: all 0.2s ease;
        }

        .preview-step-marker-logo {
          width: 26px;
          height: 26px;
          display: block;
          color: #0f5b66;
        }

        .preview-step-marker.is-logo {
          width: 30px;
          height: 30px;
          border: none;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          transform: translateY(-4px);
        }

        .preview-step-label {
          font-size: 0.56rem;
          line-height: 1.02;
          font-weight: 700;
          color: #334155;
          overflow-wrap: anywhere;
        }

        .preview-step-status {
          font-size: 0.47rem;
          line-height: 1;
          font-weight: 600;
          color: #94a3b8;
          overflow-wrap: anywhere;
        }

        .preview-step.is-complete .preview-step-marker {
          border-color: #2563eb;
          background: #2563eb;
          color: #ffffff;
        }

        .preview-step.is-complete .preview-step-line-left,
        .preview-step.is-complete .preview-step-line-right {
          background: linear-gradient(90deg, #60a5fa 0%, #2563eb 100%);
        }

        .preview-step.is-active .preview-step-marker {
          border-color: #2563eb;
          color: #2563eb;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .preview-step.is-active .preview-step-marker.is-logo {
          border: none;
          background: transparent;
          box-shadow: none;
          color: #0f5b66;
        }

        .preview-step.is-active .preview-step-label,
        .preview-step.is-complete .preview-step-label {
          color: #0f172a;
        }

        .preview-step.is-active .preview-step-status {
          color: #2563eb;
        }

        .preview-step.is-complete .preview-step-status {
          color: #16a34a;
        }

        .preview-step:hover .preview-step-marker,
        .preview-step:focus-visible .preview-step-marker {
          border-color: #2563eb;
          color: #2563eb;
        }

        .preview-step:hover .preview-step-marker.is-logo,
        .preview-step:focus-visible .preview-step-marker.is-logo {
          border: none;
          color: #0f5b66;
        }

        .preview-step:focus-visible {
          outline: none;
        }

        .preview-card {
          flex: 1;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          box-shadow: 0 18px 40px -28px rgba(15, 23, 42, 0.35);
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }

        .preview-card-body {
          flex: 1;
          height: 100%;
          min-height: 0;
          background: #ffffff;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .preview-scroll {
          flex: 1;
          min-height: 0;
          padding: 16px 16px 140px;
          overflow: auto;
          overflow-x: auto;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          overscroll-behavior: contain;
          scrollbar-width: none;
        }

        .preview-scroll::-webkit-scrollbar {
          width: 0;
          height: 0;
        }

        .preview-iframe-shell {
          width: var(--preview-shell-scaled-width, var(--preview-shell-width, 100%));
          height: var(--preview-shell-scaled-height, var(--preview-shell-height, auto));
          margin: 0 auto;
          flex: 0 0 auto;
          position: relative;
        }

        .preview-iframe {
          width: var(--preview-shell-width, 100%);
          height: var(--preview-shell-height, 100%);
          min-height: 720px;
          border: none;
          border-radius: 0;
          background: transparent;
          transform: scale(var(--preview-scale, 1));
          transform-origin: top left;
        }

        .preview-json-frame {
          display: inline-block;
          width: var(--preview-shell-width, auto);
          height: var(--preview-shell-height, auto);
          transform: scale(var(--preview-scale, 1));
          transform-origin: top left;
        }

        .preview-empty {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-weight: 500;
          text-align: center;
        }

        .preview-overlay {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          display: inline-flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          background: #0f172a;
          color: #ffffff;
          border-radius: 999px;
          padding: 8px 14px;
          font-size: 0.85rem;
          box-shadow: 0 18px 30px -22px rgba(15, 23, 42, 0.4);
        }

        .preview-overlay-btn {
          border: none;
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
        }

        .preview-overlay-text {
          font-weight: 600;
        }

        .preview-overlay-size {
          display: inline-flex;
          gap: 4px;
          padding: 2px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
        }

        .preview-size-btn {
          border: none;
          background: transparent;
          color: #e2e8f0;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 999px;
          cursor: pointer;
        }

        .preview-size-btn.is-active {
          background: rgba(255, 255, 255, 0.28);
          color: #ffffff;
        }

        @media (max-width: 1100px) {
          .resume-builder-grid {
            grid-template-columns: 1fr;
            height: auto;
          }

          .builder-preview-panel {
            order: 2;
          }
        }

        .step-header {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: flex-start;
          gap: 16px;
          position: sticky;
          top: 0;
          z-index: 20;
          padding: 14px 18px;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 18px 30px -26px rgba(15, 23, 42, 0.35);
        }

        .step-rich-text-toolbar-host {
          width: 100%;
        }

        .step-rich-text-toolbar-host:empty {
          display: none;
        }

        .step-header-title {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .step-header-title h3 {
          font-size: 1.35rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .step-count {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .step-header-actions {
          display: flex;
          gap: 8px;
        }

        .step-footer {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          margin-top: 12px;
          background: #ffffff;
          box-shadow: 0 18px 30px -26px rgba(15, 23, 42, 0.35);
        }

        .step-footer-note {
          margin-top: 8px;
          padding: 10px 12px;
          border-radius: 12px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          color: #9a3412;
          font-size: 0.84rem;
          line-height: 1.45;
        }

        .step-dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .step-footer > .btn:first-child {
          justify-self: start;
        }

        .step-footer > .btn:last-child {
          justify-self: end;
        }

        .step-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #cbd5f5;
        }

        .step-dot.active {
          width: 18px;
          background: #2563eb;
        }

        .builder-section {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 0;
          background: #ffffff;
          box-shadow: 0 12px 24px -22px rgba(15, 23, 42, 0.35);
          overflow: hidden;
        }

        .rte-shell {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: inset 0 1px 0 rgba(15, 23, 42, 0.02);
          overflow: hidden;
        }

        .rte-toolbar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .rte-toolbar button {
          border: 1px solid #e2e8f0;
          background: #ffffff;
          border-radius: 8px;
          padding: 4px 8px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #0f172a;
        }

        .rte-toolbar button.active {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
        }

        .rte-content {
          padding: 12px;
          min-height: 120px;
          outline: none;
          font-size: 0.92rem;
          color: #0f172a;
        }

        .rte-content:empty:before {
          content: attr(data-placeholder);
          color: rgba(100, 116, 139, 0.52);
          opacity: 1;
        }

        .rte-content ul {
          padding-left: 1.25rem;
          list-style: disc;
        }

        .rte-content p {
          margin: 0 0 8px;
        }

        .builder-section.is-dragging {
          opacity: 0.75;
          border-color: var(--color-primary);
          box-shadow: 0 12px 24px rgba(99, 102, 241, 0.18);
        }

        .builder-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          border: none;
          background: #ffffff;
          padding: 16px 18px;
          margin: 0;
          font-weight: 700;
          color: #0f172a;
          text-align: left;
          cursor: pointer;
        }

        .drag-handle,
        .ai-help-btn,
        .section-status {
          display: none;
        }

        .section-toggle {
          margin-left: auto;
          width: 14px;
          height: 14px;
          position: relative;
          display: inline-block;
        }

        .section-toggle::before {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 8px;
          height: 8px;
          border-right: 2px solid #94a3b8;
          border-bottom: 2px solid #94a3b8;
          transform: rotate(-45deg);
          transition: transform 180ms ease;
        }

        .section-toggle.is-open::before {
          transform: rotate(45deg);
        }

        .builder-section-header h3 {
          font-size: 1.15rem;
        }

        .builder-section-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .section-optional-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 10px;
          border-radius: 999px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        .builder-section-body {
          padding: 16px 18px 18px;
          border-top: 1px solid #e2e8f0;
        }

        .section-nav-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: var(--spacing-md);
          padding-top: var(--spacing-md);
          border-top: 1px dashed var(--color-border-light);
        }

        .section-next-btn {
          min-width: 150px;
        }

        .drag-handle {
          font-weight: 700;
          letter-spacing: 2px;
          color: var(--color-text-tertiary);
          user-select: none;
          cursor: grab;
        }

        .section-status {
          margin-left: 8px;
          font-size: var(--font-size-xs);
          color: var(--color-text-tertiary);
        }

        .section-status.complete {
          color: var(--color-success);
        }

        .builder-preview {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          padding: var(--spacing-lg);
          align-self: stretch;
          height: 100%;
          min-width: 0;
          min-height: 0;
          position: sticky;
          top: 96px;
        }

        .builder-preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-md);
        }

        .preview-controls {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .preview-pager {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          font-weight: 600;
          font-size: 0.8rem;
          color: #0f172a;
        }

        .preview-pager-btn {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          border: none;
          background: #e2e8f0;
          color: #0f172a;
          font-weight: 700;
          cursor: pointer;
        }

        .preview-pager-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .preview-pager-text {
          min-width: 56px;
          text-align: center;
        }

        .preview-page-shift {
          will-change: transform;
        }

        .builder-preview-frame {
          overflow: hidden;
          background: linear-gradient(180deg, #f8fafc, #eef2f7);
          position: relative;
          flex: 1;
          min-height: 0;
          min-width: 0;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 0;
          box-sizing: border-box;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }

        .mobile-preview-loading {
          position: absolute;
          inset: 0;
          z-index: 6;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.92);
          color: #0f172a;
          font-weight: 600;
        }

        .mobile-preview-loading .loading-spinner {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 4px solid rgba(15, 118, 110, 0.2);
          border-top-color: #0f766e;
          animation: spin 0.9s linear infinite;
        }

        .mobile-preview-loading .loading-text {
          font-size: 0.95rem;
        }

        .preview-frame-inner {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          background: #f8fafc;
          overflow: hidden;
          position: relative;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
          max-width: none;
          max-height: none;
        }

        .preview-frame-content {
          position: relative;
        }

        @media (max-width: 768px) {
          .resume-topbar {
            grid-template-columns: 1fr;
            margin: 10px 14px 0;
            justify-items: start;
          }

          .resume-topbar-center,
          .resume-topbar-right {
            justify-content: flex-start;
          }

          .resume-topbar-right {
            flex-wrap: wrap;
          }

          .page-header {
            flex-direction: column;
            gap: var(--spacing-md);
          }

          .header-actions {
            width: 100%;
          }

          .header-actions .btn {
            flex: 1;
          }

          .section-nav-actions {
            justify-content: stretch;
          }

          .section-next-btn {
            width: 100%;
          }

          .score-display {
            flex-direction: column;
            text-align: center;
          }

          .analysis-grid {
            grid-template-columns: 1fr;
          }

          .resume-builder-grid {
            grid-template-columns: 1fr;
            height: auto;
          }

          /* Mobile Builder Layout Logic */
          .builder-panel {
            display: flex;
            padding-right: 0;
          }

          .builder-preview-panel {
            display: none;
          }

          .builder-preview {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 50;
            background: #fff;
            padding: 16px;
            overflow-y: auto;
          }

          .builder-preview.is-visible {
            display: flex;
          }
          
          /* When preview is visible, hide main page scrolling */
          body.preview-active {
            overflow: hidden;
          }

          body.preview-active .builder-panel {
            display: none;
          }

          body.preview-active .builder-preview {
            display: flex;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 60;
            background: #fff;
          }

          body.preview-active .builder-preview-frame {
            height: calc(100vh - 64px);
          }

          .resume-content {
            padding: 0 16px 48px;
          }

          .template-compact-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }

          .template-card-compact-preview {
            height: auto;
            aspect-ratio: 210/297;
            overflow: hidden;
          }

          .template-card-compact-preview img {
            object-fit: cover;
            background: #f0f0f0;
          }

          .template-card-compact-content {
            padding: 10px;
            gap: 6px;
          }

          .template-card-compact-title {
            font-size: 0.85rem;
          }

          .template-showcase-item {
            flex-direction: column;
            gap: 20px;
            padding: 16px;
          }

          .template-showcase-container {
            flex-direction: column;
            gap: 20px;
            width: 100%;
          }

          .template-preview-box {
            flex: 1;
            width: 100%;
            min-height: 400px;
          }

          .template-showcase-footer {
            width: 100%;
          }

          .template-showcase-title {
            font-size: 1.4rem;
          }

          .template-action-buttons {
            flex-direction: column;
          }

          .template-select-btn {
            width: 100%;
          }

          .resume-hero {
            padding: 48px 20px 32px;
            margin: 0 -24px 24px;
          }

          .resume-hero.is-templates {
            padding: 56px 16px 32px;
          }

          .resume-hero h1 {
            font-size: 32px;
          }

          .subtitle {
            font-size: 16px;
          }

          .resume-hero-actions {
            width: 100%;
          }

          .resume-hero-actions .btn {
            flex: 0 1 auto;
            width: auto;
            max-width: 140px;
            padding: 6px 12px;
            font-size: 12px;
            min-height: 32px;
            white-space: nowrap;
          }

          .template-grid {
            grid-template-columns: 1fr;
          }

          .builder-preview {
            position: static;
          }

          .builder-preview-frame {
            min-height: 420px;
          }
        }
        .bg-primary { background-color: var(--color-primary); }
        .text-primary { color: var(--color-primary); }
        .bg-primary\/5 { background-color: rgba(23, 201, 176, 0.05); }
        .bg-primary\/10 { background-color: rgba(23, 201, 176, 0.1); }
        .border-primary\/10 { border-color: rgba(23, 201, 176, 0.14); }
        .border-primary\/20 { border-color: rgba(23, 201, 176, 0.24); }

        @media (max-width: 640px) {
          .template-compact-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .template-card-compact-preview {
            height: auto;
            aspect-ratio: 210/297;
            overflow: hidden;
          }
          
          .template-card-compact-preview img {
            object-fit: cover;
            background: #f0f0f0;
          }

          .template-card-compact-content {
            padding: 8px;
            gap: 4px;
          }

          .template-card-compact-title {
            font-size: 0.8rem;
          }

          .template-card-compact-footer {
            gap: 4px;
            padding-top: 6px;
          }

          .template-color-dots {
            gap: 4px;
          }

          .template-dot {
            width: 8px;
            height: 8px;
          }
        }

        /* Premium Resume UI Layer */

        .resume-page {
          position: relative;
          isolation: isolate;
          background:
            radial-gradient(circle at 85% -8%, rgba(147, 197, 253, 0.32), transparent 40%),
            radial-gradient(circle at 10% 12%, rgba(94, 234, 212, 0.22), transparent 42%),
            linear-gradient(180deg, #f7fbff 0%, #f5f8fb 100%);
        }

        .resume-page::before,
        .resume-page::after {
          content: '';
          position: absolute;
          width: 260px;
          height: 260px;
          border-radius: 999px;
          filter: blur(86px);
          z-index: -1;
          opacity: 0.35;
          pointer-events: none;
          animation: resume-drift 11s ease-in-out infinite alternate;
        }

        .resume-page::before {
          top: -120px;
          right: 6%;
          background: #67e8f9;
        }

        .resume-page::after {
          bottom: 6%;
          left: -80px;
          background: #5eead4;
          animation-delay: -3s;
        }

        .resume-hero {
          position: relative;
          overflow: hidden;
          border: 1px solid #dbe5ef;
          border-radius: 22px;
          margin: 20px 24px 24px;
          padding: 52px 24px 34px;
          background:
            radial-gradient(circle at top right, rgba(45, 212, 191, 0.16), transparent 42%),
            linear-gradient(145deg, #ffffff, #f6fbff);
          box-shadow: 0 24px 44px -34px rgba(15, 23, 42, 0.45);
          animation: resume-rise 600ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .resume-hero h1 {
          font-family: 'Sora', 'Manrope', var(--font-family);
          letter-spacing: -0.03em;
          line-height: 1.08;
          margin-bottom: 10px;
          font-size: clamp(2rem, 3.8vw, 3rem);
        }

        .resume-hero-content {
          max-width: 1080px;
        }

        .resume-hero .subtitle {
          margin: 0 auto;
          max-width: 68ch;
        }

        .resume-hero-meta {
          margin-top: 16px;
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .resume-hero-meta span {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid #dbeafe;
          background: #f8fafc;
          color: #334155;
          font-size: 0.74rem;
          font-weight: 700;
          font-family: 'Manrope', var(--font-family);
          transition: transform 170ms ease;
        }

        .resume-hero-meta span:hover {
          transform: translateY(-1px);
        }

        .template-card-compact {
          border-radius: 16px;
          border-color: #dbe5ef;
          background: linear-gradient(165deg, #ffffff 0%, #f9fbff 100%);
        }

        .template-card-compact:hover {
          border-color: #14b8a6;
          box-shadow: 0 22px 32px -30px rgba(15, 23, 42, 0.6);
        }

        .template-card-compact-preview {
          border-bottom: 1px solid #e2e8f0;
        }

        .ai-generator-section {
          border: 1px solid #dbe5ef;
          border-radius: 20px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), #ffffff);
          box-shadow: 0 24px 44px -34px rgba(15, 23, 42, 0.45);
          padding: 20px;
          animation: resume-rise 640ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .resume-toolbar-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 22px;
          padding: 12px 14px;
          border: 1px solid #dbe5ef;
          border-radius: 12px;
          background: #f8fafc;
        }

        .resume-toolbar-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .resume-action-btn {
          border: 1px solid #dbe5ef;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 0.8rem;
          font-weight: 700;
          font-family: 'Manrope', var(--font-family);
          cursor: pointer;
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
        }

        .resume-action-btn.primary {
          border-color: #14b8a6;
          background: linear-gradient(135deg, #14b8a6, #0f766e);
          color: #ffffff;
          box-shadow: 0 12px 22px -16px rgba(15, 118, 110, 0.8);
        }

        .resume-action-btn.primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 14px 24px -16px rgba(15, 118, 110, 0.84);
        }

        .resume-action-btn.ghost {
          background: #ffffff;
          color: #334155;
        }

        .resume-action-btn.ghost:hover {
          transform: translateY(-1px);
          border-color: #14b8a6;
          color: #0f766e;
        }

        .resume-action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .resume-builder-grid {
          gap: 16px;
        }

        .builder-panel {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }

        .builder-section {
          border-color: #dbe5ef;
          border-radius: 14px;
          transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
          animation: resume-rise 540ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .builder-section:hover {
          transform: translateY(-1px);
          border-color: #99f6e4;
          box-shadow: 0 18px 30px -28px rgba(15, 23, 42, 0.7);
        }

        .builder-section:nth-child(2) { animation-delay: 60ms; }
        .builder-section:nth-child(3) { animation-delay: 100ms; }
        .builder-section:nth-child(4) { animation-delay: 140ms; }
        .builder-section:nth-child(5) { animation-delay: 180ms; }
        .builder-section:nth-child(6) { animation-delay: 220ms; }
        .builder-section:nth-child(7) { animation-delay: 260ms; }

        .builder-section-header h3,
        .builder-preview-header h3 {
          font-family: 'Sora', 'Manrope', var(--font-family);
        }

        .builder-preview {
          border-color: #dbe5ef;
          border-radius: 16px;
          box-shadow: 0 20px 36px -32px rgba(15, 23, 42, 0.7);
        }

        .builder-preview-frame {
          border-radius: 12px;
          background:
            radial-gradient(circle at top right, rgba(45, 212, 191, 0.12), transparent 40%),
            linear-gradient(180deg, #f8fafc, #f1f5f9);
          border: 1px solid #e2e8f0;
          padding: 10px;
        }

        .preview-frame-inner {
          border-radius: 12px;
          border-color: #cbd5e1;
          background: #ffffff;
        }

        .resume-page .form-group input,
        .resume-page .form-group textarea,
        .resume-page .form-group select {
          border-color: #dbe5ef !important;
          background: #ffffff;
          color: #0f172a !important;
          caret-color: #0f172a;
          -webkit-text-fill-color: #0f172a;
          transition: border-color 180ms ease, box-shadow 180ms ease;
        }

        .resume-page .form-group input::placeholder,
        .resume-page .form-group textarea::placeholder {
          color: rgba(100, 116, 139, 0.52);
          -webkit-text-fill-color: rgba(100, 116, 139, 0.52);
          opacity: 1;
        }

        .resume-page .form-group textarea,
        .resume-page .rte-content {
          scrollbar-width: none;
        }

        .resume-page .form-group textarea::-webkit-scrollbar,
        .resume-page .rte-content::-webkit-scrollbar {
          width: 0;
          height: 0;
        }

        .resume-page .form-group input:focus,
        .resume-page .form-group textarea:focus,
        .resume-page .form-group select:focus {
          border-color: #14b8a6 !important;
          box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.14) !important;
        }

        .resume-page.is-editor-route {
          background: #f1f5f9;
          color-scheme: light;
        }

        .resume-page.is-editor-route::before,
        .resume-page.is-editor-route::after {
          display: none;
        }

        .resume-page.is-editor-route .form-group input,
        .resume-page.is-editor-route .form-group textarea,
        .resume-page.is-editor-route .form-group select {
          background: #f1f5f9;
          border-color: #e2e8f0 !important;
          color: #0f172a !important;
          caret-color: #0f172a;
          -webkit-text-fill-color: #0f172a;
          box-shadow: inset 0 1px 0 rgba(15, 23, 42, 0.04);
        }

        .resume-page.is-editor-route .rte-content {
          color: #0f172a !important;
          caret-color: #0f172a;
          -webkit-text-fill-color: #0f172a;
        }

        .resume-page.is-editor-route .form-group input:focus,
        .resume-page.is-editor-route .form-group textarea:focus,
        .resume-page.is-editor-route .form-group select:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
        }

        [data-theme="dark"] .resume-page {
          background:
            radial-gradient(circle at 85% -8%, rgba(56, 189, 248, 0.16), transparent 40%),
            radial-gradient(circle at 10% 12%, rgba(20, 184, 166, 0.14), transparent 42%),
            linear-gradient(180deg, #0b1220 0%, #0f172a 100%);
        }

        [data-theme="dark"] .resume-page.is-template-mode {
          background: #0f172a;
        }

        [data-theme="dark"] .resume-page::before {
          background: #1d4ed8;
          opacity: 0.18;
        }

        [data-theme="dark"] .resume-page::after {
          background: #0f766e;
          opacity: 0.2;
        }

        [data-theme="dark"] .resume-page.is-template-mode::before,
        [data-theme="dark"] .resume-page.is-template-mode::after {
          display: none;
        }

        [data-theme="dark"] .resume-page .resume-hero {
          border-color: #334155;
          background:
            radial-gradient(circle at top right, rgba(45, 212, 191, 0.12), transparent 42%),
            linear-gradient(145deg, #111827, #0f172a);
          box-shadow: 0 24px 44px -30px rgba(2, 6, 23, 0.9);
        }

        [data-theme="dark"] .resume-page .resume-hero h1 {
          color: #f1f5f9;
        }

        [data-theme="dark"] .resume-page .subtitle {
          color: #94a3b8;
        }

        [data-theme="dark"] .resume-page .resume-hero-meta span {
          border-color: #334155;
          background: #0f172a;
          color: #cbd5e1;
        }

        [data-theme="dark"] .resume-page .template-filter {
          border-color: #334155;
          background: #111827;
          color: #cbd5e1;
        }

        [data-theme="dark"] .resume-page .template-filter.active {
          background: rgba(20, 184, 166, 0.2);
          border-color: rgba(45, 212, 191, 0.5);
          color: #5eead4;
        }

        [data-theme="dark"] .resume-page .template-state {
          border-color: #334155;
          background: #111827;
          color: #94a3b8;
        }

        [data-theme="dark"] .resume-page .template-card-compact {
          border-color: #334155;
          background: linear-gradient(165deg, #111827 0%, #0f172a 100%);
          box-shadow: 0 16px 30px -24px rgba(2, 6, 23, 0.9);
        }

        [data-theme="dark"] .resume-page .template-card-compact:hover {
          border-color: #2dd4bf;
          box-shadow: 0 20px 32px -22px rgba(2, 6, 23, 0.95);
        }

        [data-theme="dark"] .resume-page .template-card-compact.is-selected {
          background: rgba(45, 212, 191, 0.08);
          box-shadow: 0 12px 24px rgba(20, 184, 166, 0.22);
        }

        [data-theme="dark"] .resume-page .template-card-compact-preview {
          border-bottom-color: #334155;
          background: #0b1220;
        }

        [data-theme="dark"] .resume-page .template-card-compact-preview img {
          background: #0b1220;
        }

        [data-theme="dark"] .resume-page .ai-generator-section {
          border-color: #334155;
          background: linear-gradient(180deg, #111827, #0f172a);
          box-shadow: 0 24px 44px -30px rgba(2, 6, 23, 0.9);
        }

        [data-theme="dark"] .resume-page .resume-toolbar-row {
          border-color: #334155;
          background: #0f172a;
        }

        [data-theme="dark"] .resume-page .resume-action-btn {
          border-color: #334155;
          background: #111827;
          color: #e2e8f0;
        }

        [data-theme="dark"] .resume-page .resume-action-btn.ghost {
          background: #0f172a;
          color: #cbd5e1;
        }

        [data-theme="dark"] .resume-page .resume-action-btn.ghost:hover {
          border-color: #2dd4bf;
          color: #5eead4;
        }

        [data-theme="dark"] .resume-page .builder-section,
        [data-theme="dark"] .resume-page .builder-preview {
          border-color: #334155;
          background: #111827;
          box-shadow: 0 16px 28px -24px rgba(2, 6, 23, 0.9);
        }

        [data-theme="dark"] .resume-page .builder-preview-frame {
          border-color: #334155;
          background:
            radial-gradient(circle at top right, rgba(45, 212, 191, 0.12), transparent 40%),
            linear-gradient(180deg, #0f172a, #111827);
        }

        [data-theme="dark"] .resume-page .preview-frame-inner {
          border-color: #334155;
          background: #0b1220;
        }

        [data-theme="dark"] .resume-page .form-group input,
        [data-theme="dark"] .resume-page .form-group textarea,
        [data-theme="dark"] .resume-page .form-group select {
          border-color: #334155 !important;
          background: #0f172a;
          color: #e2e8f0;
        }

        [data-theme="dark"] .resume-page .resume-tab-panel,
        [data-theme="dark"] .resume-page .setting-card,
        [data-theme="dark"] .resume-page .style-control-card,
        [data-theme="dark"] .resume-page .customize-download-card {
          border-color: #334155;
          background: #111827;
          color: #e2e8f0;
        }

        [data-theme="dark"] .resume-page .tab-panel-header h2,
        [data-theme="dark"] .resume-page .tab-section h3,
        [data-theme="dark"] .resume-page .color-preset-label,
        [data-theme="dark"] .resume-page .style-control-label,
        [data-theme="dark"] .resume-page .tab-label {
          color: #f1f5f9;
        }

        [data-theme="dark"] .resume-page .tab-helper,
        [data-theme="dark"] .resume-page .style-control-note,
        [data-theme="dark"] .resume-page .color-custom-label,
        [data-theme="dark"] .resume-page .setting-card span,
        [data-theme="dark"] .resume-page .tab-panel-header p,
        [data-theme="dark"] .resume-page .customize-download-copy p,
        [data-theme="dark"] .resume-page .customize-download-note {
          color: #94a3b8;
        }

        [data-theme="dark"] .resume-page .customize-download-copy strong {
          color: #f1f5f9;
        }

        [data-theme="dark"] .resume-page .color-preset-card {
          border-color: #334155;
          background: #0f172a;
        }

        [data-theme="dark"] .resume-page .color-preset-card.is-selected {
          border-color: #5eead4;
          box-shadow: 0 14px 28px -20px rgba(45, 212, 191, 0.35);
        }

        [data-theme="dark"] .resume-page .color-picker-input,
        [data-theme="dark"] .resume-page .color-hex-input,
        [data-theme="dark"] .resume-page .style-color-input,
        [data-theme="dark"] .resume-page .tab-input,
        [data-theme="dark"] .resume-page .tab-textarea {
          border-color: #334155;
          background: #0f172a;
          color: #e2e8f0;
        }

        [data-theme="dark"] .resume-page .form-group input::placeholder,
        [data-theme="dark"] .resume-page .form-group textarea::placeholder {
          color: rgba(148, 163, 184, 0.58);
          -webkit-text-fill-color: rgba(148, 163, 184, 0.58);
          opacity: 1;
        }

        [data-theme="dark"] .resume-page .text-gray-500,
        [data-theme="dark"] .resume-page .text-gray-600,
        [data-theme="dark"] .resume-page .text-gray-700 {
          color: #94a3b8 !important;
        }

        [data-theme="dark"] .resume-page .text-gray-800,
        [data-theme="dark"] .resume-page .text-gray-900 {
          color: #e2e8f0 !important;
        }

        [data-theme="dark"] .resume-page .resume-tab-panel,
        [data-theme="dark"] .resume-page .template-drawer-panel,
        [data-theme="dark"] .resume-page .resume-topbar,
        [data-theme="dark"] .resume-page .resume-workspace,
        [data-theme="dark"] .resume-page .preview-progress-shell,
        [data-theme="dark"] .resume-page .preview-card,
        [data-theme="dark"] .resume-page .preview-card-body,
        [data-theme="dark"] .resume-page .step-header,
        [data-theme="dark"] .resume-page .step-footer,
        [data-theme="dark"] .resume-page .review-item,
        [data-theme="dark"] .resume-page .rte-shell {
          border-color: #334155;
          background: linear-gradient(180deg, #111827 0%, #0f172a 100%);
          box-shadow: 0 18px 34px -24px rgba(2, 6, 23, 0.88);
          color: #e2e8f0;
        }

        [data-theme="dark"] .resume-page .resume-page.is-editor-route,
        [data-theme="dark"] .resume-page.is-editor-route,
        [data-theme="dark"] .resume-page.is-editor-route .resume-workspace {
          background: #0b1220;
          color-scheme: dark;
        }

        [data-theme="dark"] .resume-page .resume-workspace.is-editor {
          background: #0b1220;
          box-shadow: none;
        }

        [data-theme="dark"] .resume-page .template-drawer-header h2,
        [data-theme="dark"] .resume-page .resume-topbar-title,
        [data-theme="dark"] .resume-page .step-header-title h3,
        [data-theme="dark"] .resume-page .preview-step.is-active .preview-step-label,
        [data-theme="dark"] .resume-page .preview-step.is-complete .preview-step-label,
        [data-theme="dark"] .resume-page .builder-section-header,
        [data-theme="dark"] .resume-page .preview-pager,
        [data-theme="dark"] .resume-page .rte-toolbar button,
        [data-theme="dark"] .resume-page .rte-content,
        [data-theme="dark"] .resume-page .customize-download-copy strong,
        [data-theme="dark"] .resume-page .review-item,
        [data-theme="dark"] .resume-page .review-item strong {
          color: #e5eef8;
        }

        [data-theme="dark"] .resume-page .template-drawer-header p,
        [data-theme="dark"] .resume-page .topbar-language,
        [data-theme="dark"] .resume-page .preview-step,
        [data-theme="dark"] .resume-page .preview-step-status,
        [data-theme="dark"] .resume-page .preview-empty,
        [data-theme="dark"] .resume-page .step-count,
        [data-theme="dark"] .resume-page .review-item span,
        [data-theme="dark"] .resume-page .step-footer-note,
        [data-theme="dark"] .resume-page .resume-topbar-pill,
        [data-theme="dark"] .resume-page .resume-topbar-outline,
        [data-theme="dark"] .resume-page .resume-topbar-icon,
        [data-theme="dark"] .resume-page .template-drawer-close {
          color: #94a3b8;
        }

        [data-theme="dark"] .resume-page .template-drawer-close,
        [data-theme="dark"] .resume-page .topbar-app-btn,
        [data-theme="dark"] .resume-page .topbar-back-btn,
        [data-theme="dark"] .resume-page .resume-topbar-pill.is-active,
        [data-theme="dark"] .resume-page .resume-topbar-colorbar,
        [data-theme="dark"] .resume-page .resume-topbar-outline,
        [data-theme="dark"] .resume-page .resume-topbar-icon,
        [data-theme="dark"] .resume-page .preview-pager,
        [data-theme="dark"] .resume-page .preview-pager-btn,
        [data-theme="dark"] .resume-page .builder-section-header,
        [data-theme="dark"] .resume-page .rte-toolbar,
        [data-theme="dark"] .resume-page .rte-toolbar button {
          border-color: #334155;
          background: #0f172a;
        }

        [data-theme="dark"] .resume-page .resume-topbar-center {
          border-color: #334155;
          background: #0b1220;
        }

        [data-theme="dark"] .resume-page .resume-topbar-pill.is-active {
          box-shadow: 0 8px 16px -12px rgba(2, 6, 23, 0.8);
        }

        [data-theme="dark"] .resume-page .template-drawer-close:hover,
        [data-theme="dark"] .resume-page .topbar-back-btn:hover,
        [data-theme="dark"] .resume-page .resume-topbar-outline:hover,
        [data-theme="dark"] .resume-page .resume-topbar-icon:hover,
        [data-theme="dark"] .resume-page .preview-pager-btn:hover,
        [data-theme="dark"] .resume-page .rte-toolbar button:hover {
          border-color: #2dd4bf;
          color: #5eead4;
        }

        [data-theme="dark"] .resume-page .flag {
          border-color: #334155;
          background: #0f172a;
          color: #e2e8f0;
        }

        [data-theme="dark"] .resume-page .dot-grid span {
          background: #94a3b8;
        }

        [data-theme="dark"] .resume-page .topbar-color-swatch,
        [data-theme="dark"] .resume-page .topbar-color-custom {
          box-shadow: inset 0 0 0 1px rgba(226, 232, 240, 0.08);
        }

        [data-theme="dark"] .resume-page .topbar-color-swatch.is-selected,
        [data-theme="dark"] .resume-page .topbar-color-custom.is-selected {
          border-color: #5eead4;
          box-shadow: inset 0 0 0 2px rgba(15, 23, 42, 0.95);
        }

        [data-theme="dark"] .resume-page .topbar-color-custom {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        }

        [data-theme="dark"] .resume-page .resume-topbar-download {
          box-shadow: 0 10px 20px -14px rgba(37, 99, 235, 0.7);
        }

        [data-theme="dark"] .resume-page .resume-topbar-download:disabled {
          background: #334155;
          color: #cbd5e1;
        }

        [data-theme="dark"] .resume-page .resume-topbar-download:disabled .caret {
          border-top-color: #cbd5e1;
        }

        [data-theme="dark"] .resume-page .preview-step-line {
          background: #334155;
        }

        [data-theme="dark"] .resume-page .preview-step-marker {
          border-color: #475569;
          background: #0f172a;
          color: #94a3b8;
          box-shadow: 0 10px 20px -18px rgba(2, 6, 23, 0.6);
        }

        [data-theme="dark"] .resume-page .preview-step-marker-logo,
        [data-theme="dark"] .resume-page .preview-step.is-active .preview-step-marker.is-logo,
        [data-theme="dark"] .resume-page .preview-step:hover .preview-step-marker.is-logo,
        [data-theme="dark"] .resume-page .preview-step:focus-visible .preview-step-marker.is-logo {
          color: #5eead4;
        }

        [data-theme="dark"] .resume-page .preview-step-label {
          color: #cbd5e1;
        }

        [data-theme="dark"] .resume-page .preview-step.is-active .preview-step-marker {
          background: #0f172a;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
        }

        [data-theme="dark"] .resume-page .preview-overlay {
          background: rgba(15, 23, 42, 0.9);
          box-shadow: 0 18px 30px -22px rgba(2, 6, 23, 0.75);
        }

        [data-theme="dark"] .resume-page .preview-overlay-btn,
        [data-theme="dark"] .resume-page .preview-overlay-size {
          background: rgba(255, 255, 255, 0.08);
        }

        [data-theme="dark"] .resume-page .step-footer-note {
          background: rgba(154, 52, 18, 0.16);
          border: 1px solid rgba(251, 146, 60, 0.3);
          color: #fdba74;
        }

        [data-theme="dark"] .resume-page .step-dot {
          background: #334155;
        }

        [data-theme="dark"] .resume-page .section-optional-badge {
          background: rgba(37, 99, 235, 0.18);
          color: #93c5fd;
        }

        [data-theme="dark"] .resume-page .builder-section-body,
        [data-theme="dark"] .resume-page .rte-toolbar,
        [data-theme="dark"] .resume-page .resume-topbar,
        [data-theme="dark"] .resume-page .template-drawer-panel,
        [data-theme="dark"] .resume-page .template-drawer-close,
        [data-theme="dark"] .resume-page .step-header,
        [data-theme="dark"] .resume-page .step-footer {
          border-color: #334155;
        }

        [data-theme="dark"] .resume-page .rte-content:empty:before {
          color: rgba(148, 163, 184, 0.52);
        }

        @keyframes resume-rise {
          from { opacity: 0; transform: translateY(12px) scale(0.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes resume-drift {
          from { transform: translateY(0) translateX(0); }
          to { transform: translateY(-12px) translateX(10px); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }

        .career-advisor-section .form-group label {
          color: var(--color-text-secondary);
        }

        @media (max-width: 900px) {
          .resume-hero {
            margin: 14px 14px 18px;
            padding: 34px 16px 22px;
            border-radius: 16px;
          }

          .resume-toolbar-row {
            flex-direction: column;
            align-items: flex-start;
          }

        }

        @media (prefers-reduced-motion: reduce) {
          .resume-page *,
          .resume-page::before,
          .resume-page::after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
};

