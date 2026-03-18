import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { User } from '../types';
import {
  buildBaseHref,
  ensureBaseTag,
  extractTemplateFields,
  normalizeFieldKey,
} from '../services/resumeTemplateRenderer';

type ResumeTemplate = {
  name: string;
  displayName: string;
  thumbnailUrl?: string;
};

const mapDisplayName = (name: string) => {
  const base = name.split('/').pop() || name;
  return base.replace(/\.html$/i, '').replace(/[_-]+/g, ' ').toUpperCase();
};

export const useResumeTemplate = (
  user?: User | null,
  options?: { autoSelectFirst?: boolean }
) => {
  const autoSelectFirst = options?.autoSelectFirst ?? true;
  const [templates, setTemplates] = useState<ResumeTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templatePreviewHtml, setTemplatePreviewHtml] = useState<string | null>(null);
  const [templateSourceHtml, setTemplateSourceHtml] = useState<string | null>(null);
  const [templateFields, setTemplateFields] = useState<string[]>([]);
  const [templateFieldValues, setTemplateFieldValues] = useState<Record<string, string>>({});
  const [templatePreviewLoading, setTemplatePreviewLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const supabaseClient = isSupabaseConfigured ? supabase : null;
  const loadIdRef = useRef(0);

  const getDefaultValueForField = useCallback((field: string) => {
    const normalized = normalizeFieldKey(field);
    if (!user) return '';
    if (['name', 'fullname', 'full_name'].includes(normalized)) return user.name || '';
    if (['email'].includes(normalized)) return user.email || '';
    if (['location', 'city', 'country', 'address'].includes(normalized)) return user.country || '';
    if (['title', 'role', 'position', 'profession'].includes(normalized)) return user.profession || '';
    if (['skills'].includes(normalized)) return user.skills?.join(', ') || '';
    return '';
  }, [user]);

  const populateTemplateFields = useCallback((html: string) => {
    const fields = extractTemplateFields(html);
    setTemplateFields(fields);
    setTemplateFieldValues((prev) => {
      const next: Record<string, string> = {};
      fields.forEach((field) => {
        const existingKey = Object.keys(prev || {}).find(
          (k) => normalizeFieldKey(k) === normalizeFieldKey(field)
        );
        const existingValue = existingKey ? prev[existingKey] : prev?.[field];
        if (existingValue && existingValue.trim()) {
          next[field] = existingValue;
        } else {
          next[field] = getDefaultValueForField(field);
        }
      });
      return next;
    });
  }, [getDefaultValueForField]);

  const loadTemplateHtml = useCallback(async (templateName: string) => {
    if (!supabaseClient) {
      setTemplateError('Template storage is unavailable. Configure Supabase environment variables.');
      setTemplatePreviewHtml(null);
      setTemplateSourceHtml(null);
      setTemplateFields([]);
      return;
    }

    const loadId = ++loadIdRef.current;
    setTemplatePreviewLoading(true);
    setTemplateError(null);
    setTemplatePreviewHtml(null);

    const { data } = supabaseClient.storage.from('resume_templates').getPublicUrl(templateName);
    if (!data?.publicUrl) {
      if (loadIdRef.current !== loadId) return;
      console.error('Error getting template URL');
      setTemplateError('Failed to load selected template. Please try again.');
      setTemplatePreviewLoading(false);
      return;
    }

    const templateUrl = data.publicUrl;

    try {
      const response = await fetch(`${templateUrl}?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch template HTML');
      let html = await response.text();
      // Clean up stray template-literal artifacts that can render as "`n" in HTML.
      html = html.replace(/`n/g, '\n');
      html = ensureBaseTag(html, buildBaseHref(templateUrl));
      if (loadIdRef.current !== loadId) return;
      setTemplatePreviewHtml(html);
      setTemplateSourceHtml(html);
      populateTemplateFields(html);
    } catch (e) {
      if (loadIdRef.current !== loadId) return;
      console.error('Template preview error:', e);
      setTemplateError('Failed to load selected template. Please try again.');
      setTemplatePreviewHtml(null);
      setTemplateSourceHtml(null);
      setTemplateFields([]);
    } finally {
      if (loadIdRef.current === loadId) {
        setTemplatePreviewLoading(false);
      }
    }
  }, [populateTemplateFields, supabaseClient]);

  const selectTemplate = useCallback((templateName: string) => {
    setSelectedTemplate(templateName);
    setTemplateFields([]);
    setTemplateFieldValues({});
    setTemplateSourceHtml(null);
    void loadTemplateHtml(templateName);
  }, [loadTemplateHtml]);

  const fetchTemplates = useCallback(async () => {
    if (!supabaseClient) {
      setTemplateLoading(false);
      setTemplateError('Templates are unavailable until Supabase is configured.');
      setTemplates([]);
      setSelectedTemplate('');
      setTemplatePreviewHtml(null);
      setTemplateSourceHtml(null);
      setTemplateFields([]);
      setTemplateFieldValues({});
      return;
    }

    setTemplateLoading(true);
    setTemplateError(null);

    try {
      const [rootList, templatesList, thumbsList] = await Promise.all([
        supabaseClient.storage.from('resume_templates').list('', { limit: 100 }),
        supabaseClient.storage.from('resume_templates').list('templates', { limit: 100 }),
        supabaseClient.storage.from('resume_templates').list('thumbnails', { limit: 100 }),
      ]);

      const { data: rootFiles, error: rootError } = rootList;
      const { data: templateFiles, error: templatesFolderError } = templatesList;
      const { data: thumbnailFiles, error: thumbnailError } = thumbsList;

      if (rootError && templatesFolderError) {
        console.error('Error listing templates:', rootError, templatesFolderError);
        setTemplateError('Failed to load templates. Please try again.');
        setTemplates([]);
        setSelectedTemplate('');
        setTemplatePreviewHtml(null);
        setTemplateSourceHtml(null);
        setTemplateFields([]);
        return;
      }
      if (rootError) {
        console.error('Error listing templates (root):', rootError);
      }
      if (templatesFolderError) {
        console.error('Error listing templates (templates folder):', templatesFolderError);
      }
      if (thumbnailError) {
        console.error('Error listing thumbnails:', thumbnailError);
      }

      const htmlFiles = [
        ...(rootFiles || [])
          .filter((f) => f.name.toLowerCase().endsWith('.html'))
          .map((f) => ({ path: f.name })),
        ...(templateFiles || [])
          .filter((f) => f.name.toLowerCase().endsWith('.html'))
          .map((f) => ({ path: `templates/${f.name}` })),
      ];

      const uniqueFiles = Array.from(new Map(htmlFiles.map((f) => [f.path, f])).values());

      const thumbnailSet = new Set<string>([
        ...(thumbnailFiles || []).map((f) => `thumbnails/${f.name}`),
        ...(rootFiles || []).map((f) => f.name),
        ...(templateFiles || []).map((f) => `templates/${f.name}`),
      ]);

      const mapped: ResumeTemplate[] = uniqueFiles.map((file) => ({
        name: file.path,
        displayName: mapDisplayName(file.path),
        thumbnailUrl: (() => {
          const base = file.path.split('/').pop()?.replace(/\.html$/i, '') || file.path;
          const candidates = [
            `thumbnails/${base}.png`,
            `thumbnails/${base}.jpg`,
            `thumbnails/${base}.jpeg`,
            `thumbnails/${base}.webp`,
            `${base}.png`,
            `${base}.jpg`,
            `${base}.jpeg`,
            `${base}.webp`,
            `templates/${base}.png`,
            `templates/${base}.jpg`,
            `templates/${base}.jpeg`,
            `templates/${base}.webp`,
          ];
          const match = candidates.find((c) => thumbnailSet.has(c));
          if (!match) return undefined;
          return supabaseClient.storage.from('resume_templates').getPublicUrl(match).data.publicUrl;
        })(),
      }));

      // Keep all templates for editor routes, even if thumbnails are missing.
      setTemplates(mapped);

      if (mapped.length > 0 && autoSelectFirst) {
        selectTemplate(mapped[0].name);
      } else {
        setSelectedTemplate('');
        setTemplatePreviewHtml(null);
        setTemplateSourceHtml(null);
        setTemplateFields([]);
        setTemplateFieldValues({});
      }
    } catch (e) {
      console.error('Template fetch error:', e);
      setTemplateError('Failed to load templates. Please try again.');
      setTemplates([]);
      setSelectedTemplate('');
      setTemplatePreviewHtml(null);
      setTemplateSourceHtml(null);
      setTemplateFields([]);
      setTemplateFieldValues({});
    } finally {
      setTemplateLoading(false);
    }
  }, [autoSelectFirst, selectTemplate, supabaseClient]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const updateField = useCallback((field: string, value: string) => {
    setTemplateFieldValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  return {
    templates,
    selectedTemplate,
    templateLoading,
    templateError,
    templatePreviewHtml,
    templatePreviewLoading,
    templateSourceHtml,
    templateFields,
    templateFieldValues,
    selectTemplate,
    updateField,
    refreshTemplates: fetchTemplates,
  };
};
