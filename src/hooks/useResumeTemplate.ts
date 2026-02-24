import { useCallback, useEffect, useState } from 'react';
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

export const useResumeTemplate = (user?: User | null) => {
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

  const getDefaultValueForField = useCallback((field: string) => {
    const normalized = normalizeFieldKey(field);
    if (normalized === 'name' || normalized === 'fullname') return user?.name || '';
    if (normalized === 'email') return user?.email || '';
    if (['role', 'title', 'position', 'jobtitle', 'targetrole'].includes(normalized)) return user?.profession || '';
    if (['location', 'city', 'country', 'address'].includes(normalized)) return user?.country || '';
    if (['skills', 'skillset'].includes(normalized)) return user?.skills?.join(', ') || '';
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

    setTemplatePreviewLoading(true);
    setTemplateError(null);
    setTemplatePreviewHtml(null);

    const { data } = supabaseClient.storage.from('resume_templates').getPublicUrl(templateName);
    if (!data?.publicUrl) {
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
      setTemplatePreviewHtml(html);
      setTemplateSourceHtml(html);
      populateTemplateFields(html);
    } catch (e) {
      console.error('Template preview error:', e);
      setTemplateError('Failed to load selected template. Please try again.');
      setTemplatePreviewHtml(null);
      setTemplateSourceHtml(null);
      setTemplateFields([]);
    } finally {
      setTemplatePreviewLoading(false);
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

      const visibleTemplates = mapped.filter((template) => template.thumbnailUrl);

      setTemplates(visibleTemplates);

      if (visibleTemplates.length > 0) {
        selectTemplate(visibleTemplates[0].name);
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
  }, [selectTemplate, supabaseClient]);

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
