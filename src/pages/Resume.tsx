import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, AlertCircle, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import html2pdf from 'html2pdf.js';
import { useResumeTemplate } from '../hooks/useResumeTemplate';
import { normalizeFieldKey, renderTemplateWithSchema } from '../services/resumeTemplateRenderer';

export const Resume = () => {
  const { user } = useAuth();

  // Resume Builder state (resume.io style)
  const [contactName, setContactName] = useState(user?.name || "");
  const [contactRole, setContactRole] = useState(user?.profession || "");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [contactPhone, setContactPhone] = useState("");
  const [contactLocation, setContactLocation] = useState(user?.country || "");
  const [contactPhotoUrl, setContactPhotoUrl] = useState("");
  const [contactPhotoName, setContactPhotoName] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [skillsText, setSkillsText] = useState(user?.skills?.join(", ") || "");
  const [projectsText, setProjectsText] = useState("");
  const [additionalText, setAdditionalText] = useState("");
  const [educationItems, setEducationItems] = useState([
    { id: 'edu-1', school: '', degree: '', dates: '', details: '' },
  ]);
  const [experienceItems, setExperienceItems] = useState([
    { id: 'exp-1', company: '', role: '', dates: '', details: '' },
  ]);
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    'contact',
    'summary',
    'experience',
    'projects',
    'education',
    'skills',
    'additional',
    'extra',
  ]);
  const [draggingSection, setDraggingSection] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>('contact');
  const [unlockedSections, setUnlockedSections] = useState<string[]>([]);
  const [generatedHTML, setGeneratedHTML] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const previewFrameRef = useRef<HTMLDivElement | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const previewFontsReadyRef = useRef(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewSize, setPreviewSize] = useState({ width: 800, height: 1100 });
  const [templateStep, setTemplateStep] = useState<'choose' | 'edit'>('choose');
  const [activeTemplateFilter, setActiveTemplateFilter] = useState('All templates');

  const {
    templates,
    selectedTemplate,
    templateLoading,
    templateError,
    templatePreviewHtml,
    templateFields,
    templateFieldValues,
    templateSourceHtml,
    selectTemplate,
    updateField,
  } = useResumeTemplate(user);

  const formatFieldLabel = (field: string) =>
    field
      .replace(/[_.-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (match) => match.toUpperCase());

  const getInputTypeForField = (field: string) => {
    const lower = field.toLowerCase();
    if (lower.includes('email')) return 'email';
    if (lower.includes('phone') || lower.includes('mobile')) return 'tel';
    if (lower.includes('url') || lower.includes('website') || lower.includes('portfolio') || lower.includes('linkedin') || lower.includes('github')) {
      return 'url';
    }
    return 'text';
  };

  const isLongField = (field: string) => {
    const lower = field.toLowerCase();
    return [
      'summary',
      'objective',
      'profile',
      'experience',
      'education',
      'projects',
      'certifications',
      'awards',
      'publications',
      'references',
      'additional',
      'about',
      'bio',
    ].some((keyword) => lower.includes(keyword));
  };

  const getTemplateFieldValue = (key: string) => {
    if (templateFieldValues[key]) return templateFieldValues[key];
    const normalized = normalizeFieldKey(key);
    const match = Object.keys(templateFieldValues).find((k) => normalizeFieldKey(k) === normalized);
    return match ? templateFieldValues[match] : '';
  };

  const templateFieldSet = useMemo(
    () => new Set(templateFields.map((field) => normalizeFieldKey(field))),
    [templateFields]
  );

  const selectedTemplateLabel = useMemo(() => {
    const match = templates.find((t) => t.name === selectedTemplate);
    return match?.displayName || selectedTemplate || 'Template';
  }, [selectedTemplate, templates]);

  const templateFilters = [
    'All templates',
    'Simple',
    'Word',
    'Picture',
    'ATS',
    'Two-column',
    'Google Docs',
  ];

  const filteredTemplates = useMemo(() => {
    const withThumbnails = templates.filter((t) => !!t.thumbnailUrl);
    if (activeTemplateFilter === 'All templates') return withThumbnails;
    return withThumbnails;
  }, [activeTemplateFilter, templates]);

  const isTemplateSelection = templateStep === 'choose' || !selectedTemplate;

  const hasTemplateField = useCallback(
    (key: string) => templateFields.length === 0 || templateFieldSet.has(normalizeFieldKey(key)),
    [templateFieldSet, templateFields.length]
  );

  const knownFieldKeys = useMemo(() => new Set([
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
    'bullets',
    'hasbullets',
  ].map((key) => normalizeFieldKey(key))), []);

  const extraFields = useMemo(
    () => templateFields.filter((field) => !knownFieldKeys.has(normalizeFieldKey(field))),
    [templateFields, knownFieldKeys]
  );

  const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

  const handlePhotoUpload = useCallback((file?: File) => {
    if (!file) {
      setContactPhotoUrl("");
      setContactPhotoName("");
      return;
    }
    setContactPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setContactPhotoUrl(result);
    };
    reader.onerror = () => {
      setContactPhotoUrl("");
    };
    reader.readAsDataURL(file);
  }, []);

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

  const sectionCompletion = useMemo(() => {
    const hasChars = (value: string, minChars = 2) => value.trim().length >= minChars;
    const hasLongText = (value: string, minChars = 20) => value.trim().length >= minChars;
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
      return (roleOk && companyOk) || (roleOk && detailsOk) || (companyOk && datesOk);
    });

    const anyEducationFilled = educationItems.some((item) => {
      const degreeOk = hasChars(item.degree, 2);
      const schoolOk = hasChars(item.school, 2);
      const datesOk = hasChars(item.dates, 4);
      const detailsOk = hasLongText(item.details, 12);
      return (degreeOk && schoolOk) || (degreeOk && detailsOk) || (schoolOk && datesOk);
    });

    const anyExtraFilled = extraFields.some((field) => (templateFieldValues[field] || '').trim().length >= 3);
    const skillsCount = parseItems(skillsText).length;
    const projectsCount = parseItems(projectsText).length;
    const additionalCount = parseItems(additionalText).length;

    return {
      contact: hasChars(contactName, 2) && hasChars(contactRole, 2),
      summary: hasLongText(summaryText, 30),
      experience: anyExperienceFilled,
      projects: projectsCount >= 1,
      education: anyEducationFilled,
      skills: skillsCount >= 2,
      additional: additionalCount >= 1,
      extra: anyExtraFilled,
    } as Record<string, boolean>;
  }, [
    additionalText,
    contactName,
    contactRole,
    educationItems,
    experienceItems,
    extraFields,
    projectsText,
    skillsText,
    summaryText,
    templateFieldValues,
  ]);

  const moveToNextSection = useCallback(() => {
    const currentIndex = sectionOrder.indexOf(activeSectionId || 'contact');
    if (currentIndex >= 0 && currentIndex < sectionOrder.length - 1) {
      const nextSectionId = sectionOrder[currentIndex + 1];
      setActiveSectionId(nextSectionId);
    }
  }, [activeSectionId, sectionOrder]);

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

  const buildResumeView = useCallback(() => {
    const templateHasSection = (key: string) =>
      templateSourceHtml ? new RegExp(`{{\\s*#\\s*${key}\\s*}}`, 'i').test(templateSourceHtml) : false;

    const photoValue = contactPhotoUrl.trim()
      || (templateFieldValues.photo_url || '').toString().trim();

    const skills = parseCommaOrNewline(skillsText);
    const projects = parseNewline(projectsText);
    const additional = parseNewline(additionalText);

    const experienceItemsView = experienceItems
      .map((item) => {
        const bullets = parseNewline(item.details);
        return {
          role: item.role,
          company: item.company,
          dates: item.dates,
          bullets,
          hasBullets: bullets.length > 0,
        };
      })
      .filter((item) => [item.role, item.company, item.dates, item.bullets.length ? 'x' : ''].some((v) => v && v.toString().trim()));

    const educationItemsView = educationItems
      .map((item) => {
        const bullets = parseNewline(item.details);
        return {
          degree: item.degree,
          school: item.school,
          dates: item.dates,
          bullets,
          hasBullets: bullets.length > 0,
        };
      })
      .filter((item) => [item.degree, item.school, item.dates, item.bullets.length ? 'x' : ''].some((v) => v && v.toString().trim()));

    const formatBullets = (bullets: string[]) =>
      bullets.length ? bullets.map((line) => `- ${line}`).join('\n') : '';

    const experienceText = experienceItemsView
      .map((item) => {
        const header = [item.role, item.company].filter(Boolean).join(' — ');
        const lines = [header, item.dates, formatBullets(item.bullets)].filter(Boolean);
        return lines.join('\n');
      })
      .filter((block) => block.trim())
      .join('\n\n');

    const educationText = educationItemsView
      .map((item) => {
        const header = [item.degree, item.school].filter(Boolean).join(' — ');
        const lines = [header, item.dates, formatBullets(item.bullets)].filter(Boolean);
        return lines.join('\n');
      })
      .filter((block) => block.trim())
      .join('\n\n');

    const skillsValue = templateHasSection('skills') ? skills : skills.join(', ');
    const projectsValue = templateHasSection('projects') ? projects : projects.join('\n');
    const additionalValue = templateHasSection('additional') ? additional : additional.join('\n');
    const experienceValue = templateHasSection('experience') ? experienceItemsView : experienceText;
    const educationValue = templateHasSection('education') ? educationItemsView : educationText;

    const view: Record<string, any> = {
      ...templateFieldValues,
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
      address: contactLocation,
      city: contactLocation,
      country: contactLocation,
      photo_url: photoValue,
      summary: summaryText,
      profile: summaryText,
      objective: summaryText,
      hasSummary: summaryText.trim().length > 0,
      skills: skillsValue,
      hasSkills: skills.length > 0,
      experience: experienceValue,
      hasExperience: experienceItemsView.length > 0,
      education: educationValue,
      hasEducation: educationItemsView.length > 0,
      projects: projectsValue,
      hasProjects: projects.length > 0,
      additional: additionalValue,
      hasAdditional: additional.length > 0,
    };

    return view;
  }, [
    additionalText,
    contactEmail,
    contactLocation,
    contactName,
    contactPhone,
    contactPhotoUrl,
    contactRole,
    educationItems,
    experienceItems,
    hasTemplateField,
    projectsText,
    skillsText,
    summaryText,
    templateFieldValues,
    templateSourceHtml,
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
    'contact',
    hasTemplateField('summary') ? 'summary' : null,
    hasTemplateField('experience') ? 'experience' : null,
    hasTemplateField('projects') ? 'projects' : null,
    hasTemplateField('education') ? 'education' : null,
    hasTemplateField('skills') ? 'skills' : null,
    hasTemplateField('additionalinfo') ? 'additional' : null,
    extraFields.length > 0 ? 'extra' : null,
  ].filter(Boolean) as string[]), [extraFields.length, hasTemplateField]);

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
    if (activeSectionId && !availableSections.includes(activeSectionId)) {
      setActiveSectionId(null);
    }
  }, [activeSectionId, availableSections]);

  const updatePreviewScale = useCallback(() => {
    const frame = previewFrameRef.current;
    const iframe = previewIframeRef.current;
    if (!frame || !iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;

    const html = doc.documentElement;
    const body = doc.body;
    if (!html || !body) return;

    const contentWidth = Math.max(
      html.scrollWidth,
      body.scrollWidth,
      html.getBoundingClientRect().width,
      body.getBoundingClientRect().width
    );
    const contentHeight = Math.max(
      html.scrollHeight,
      body.scrollHeight,
      html.getBoundingClientRect().height,
      body.getBoundingClientRect().height
    );

    if (!contentWidth || !contentHeight) return;

    const frameRect = frame.getBoundingClientRect();
    if (!frameRect.width || !frameRect.height) return;

    const widthScale = frameRect.width / contentWidth;
    const heightScale = frameRect.height / contentHeight;
    const nextScale = Math.max(0.1, Math.min(widthScale, heightScale, 1));

    setPreviewSize({ width: contentWidth, height: contentHeight });
    setPreviewScale(nextScale);

    if (doc.fonts && !previewFontsReadyRef.current) {
      previewFontsReadyRef.current = true;
      doc.fonts.ready
        .then(() => {
          requestAnimationFrame(updatePreviewScale);
        })
        .catch(() => undefined);
    }
  }, []);



  const handleGenerateResume = async () => {
    if (!selectedTemplate || !templateSourceHtml) {
      setGenerateError("Please select a template.");
      return;
    }
    const requiredFields = [
      { key: 'name', label: 'Full Name', value: contactName },
      { key: 'role', label: 'Target Role', value: contactRole },
    ];
    const missing = requiredFields.filter(
      (field) => hasTemplateField(field.key) && !field.value.trim()
    );
    if (missing.length > 0) {
      setGenerateError(`Please fill ${missing.map((field) => field.label).join(' and ')}.`);
      return;
    }

    setGenerating(true);
    setGenerateError(null);

    const resumeData = buildResumeView();

    try {
      const rendered = renderTemplateWithSchema(templateSourceHtml, resumeData);
      setGeneratedHTML(rendered);
    } catch (error: any) {
      console.error("Generation error:", error);
      setGenerateError(error.message || "Failed to generate resume. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleTemplateSelect = (name: string) => {
    selectTemplate(name);
    setTemplateStep('edit');
  };

  const handleDownloadPDF = async () => {
    const html = generatedHTML || (templateSourceHtml
      ? renderTemplateWithSchema(templateSourceHtml, buildResumeView())
      : null);
    if (!html) return;
    const filenameBase = contactName
      || getTemplateFieldValue('name')
      || getTemplateFieldValue('full_name')
      || getTemplateFieldValue('fullname')
      || getTemplateFieldValue('full-name')
      || 'Resume';
    const iframe = document.getElementById('generated-resume') as HTMLIFrameElement | null;
    const sourceDoc = iframe?.contentDocument || new DOMParser().parseFromString(html, 'text/html');
    sourceDoc.querySelectorAll('script').forEach((node) => node.remove());

    const PX_PER_MM = 96 / 25.4;
    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;
    const a4WidthPx = Math.round(A4_WIDTH_MM * PX_PER_MM);
    const a4HeightPx = Math.round(A4_HEIGHT_MM * PX_PER_MM);

    const element = document.createElement('div');
    const headAssets = Array.from(sourceDoc.querySelectorAll('style'))
      .map((node) => node.outerHTML)
      .join('\n');
    const styleContainer = document.createElement('div');
    styleContainer.innerHTML = headAssets;
    const contentWrapper = document.createElement('div');
    contentWrapper.innerHTML = sourceDoc.body?.innerHTML || '';
    element.appendChild(styleContainer);
    element.appendChild(contentWrapper);
    element.style.position = 'fixed';
    element.style.left = '0';
    element.style.top = '0';
    element.style.opacity = '1';
    element.style.pointerEvents = 'none';
    element.style.width = `${a4WidthPx}px`;
    element.style.zIndex = '2147483647';
    element.style.background = '#ffffff';
    contentWrapper.style.width = `${a4WidthPx}px`;
    document.body.appendChild(element);

    const adjustLayoutForA4 = () => {
      const resumeContainer = contentWrapper.querySelector('.max-w-5xl') as HTMLElement | null;
      if (resumeContainer) {
        resumeContainer.style.maxWidth = '100%';
        resumeContainer.style.width = '100%';
        resumeContainer.style.margin = '0';
        resumeContainer.style.borderRadius = '0';
        resumeContainer.style.boxShadow = 'none';
        resumeContainer.style.minHeight = `${a4HeightPx}px`;
      }
      const grid = resumeContainer?.querySelector('.grid') as HTMLElement | null;
      if (grid) {
        grid.style.minHeight = `${a4HeightPx}px`;
      }
      contentWrapper.style.margin = '0';
      contentWrapper.style.padding = '0';
    };

    const replaceEditableFields = (root: HTMLElement) => {
      const fields = root.querySelectorAll('input, textarea, select');
      fields.forEach((field) => {
        const tag = field.tagName.toLowerCase();
        let value = '';
        if (tag === 'select') {
          const select = field as HTMLSelectElement;
          const option = select.options[select.selectedIndex];
          value = option ? option.text : '';
        } else {
          value = (field as HTMLInputElement | HTMLTextAreaElement).value || field.getAttribute('value') || '';
        }
        if (!value.trim()) {
          value = field.getAttribute('placeholder') || '';
        }
        const replacement = document.createElement(tag === 'textarea' ? 'div' : 'span');
        replacement.className = (field as HTMLElement).className;
        replacement.style.whiteSpace = 'pre-wrap';
        replacement.textContent = value;
        field.replaceWith(replacement);
      });
      root.querySelectorAll('[contenteditable="true"]').forEach((el) => {
        el.removeAttribute('contenteditable');
      });
    };

    const inlineImages = async (root: HTMLElement) => {
      const images = Array.from(root.querySelectorAll('img'));
      await Promise.all(images.map(async (img) => {
        const src = (img.getAttribute('src') || '').trim();
        if (!src || src === '#' || src === 'about:blank' || src.includes('via.placeholder.com')) {
          img.remove();
          return;
        }
        if (src.startsWith('data:') || src.startsWith('blob:')) return;
        try {
          const res = await fetch(src, { mode: 'cors' });
          if (!res.ok) throw new Error('Image fetch failed');
          const blob = await res.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Image read failed'));
            reader.readAsDataURL(blob);
          });
          img.setAttribute('src', dataUrl);
        } catch {
          img.remove();
        }
      }));
    };

    const waitForImages = async (root: HTMLElement) => {
      const images = Array.from(root.querySelectorAll('img'));
      await Promise.all(images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }));
    };

    adjustLayoutForA4();
    replaceEditableFields(contentWrapper);
    await inlineImages(contentWrapper);
    if (document.fonts && 'ready' in document.fonts) {
      await document.fonts.ready;
    }
    await waitForImages(contentWrapper);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const rect = contentWrapper.getBoundingClientRect();
    const safeWidth = Math.max(1, Math.ceil(rect.width || contentWrapper.scrollWidth || 800));
    const safeHeight = Math.max(1, Math.ceil(contentWrapper.scrollHeight || rect.height || 1000));
    if (!contentWrapper.textContent || !contentWrapper.textContent.trim()) {
      console.warn('PDF export: empty content detected.');
    }
    console.info('PDF export size', {
      width: safeWidth,
      height: safeHeight,
      scrollWidth: contentWrapper.scrollWidth,
      scrollHeight: contentWrapper.scrollHeight,
      a4WidthPx,
      a4HeightPx,
    });

    const exportScale = 3;
    const opt = {
      margin: 0,
      filename: `${filenameBase.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'png' as const, quality: 1 },
      html2canvas: {
        scale: exportScale,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: a4WidthPx,
        windowHeight: safeHeight,
        letterRendering: true,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    try {
      await html2pdf()
        .set(opt)
        .from(contentWrapper)
        .save();
    } finally {
      element.remove();
    }
  };

  const handleDownloadHtml = () => {
    const html = generatedHTML || (templateSourceHtml
      ? renderTemplateWithSchema(templateSourceHtml, buildResumeView())
      : null);
    if (!html) return;
    const filenameBase = contactName
      || getTemplateFieldValue('name')
      || getTemplateFieldValue('full_name')
      || getTemplateFieldValue('fullname')
      || getTemplateFieldValue('full-name')
      || 'Resume';
    const blob = new Blob([html], { type: "text/html" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filenameBase.replace(/\s+/g, '_')}_Resume.html`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  };

  const livePreviewHtml = useMemo(() => {
    if (!templateSourceHtml) return null;
    try {
      return renderTemplateWithSchema(templateSourceHtml, buildResumeView());
    } catch (error) {
      console.error('Preview render failed:', error);
      return null;
    }
  }, [buildResumeView, templateSourceHtml]);

  const previewHtml = generatedHTML || livePreviewHtml || templatePreviewHtml;
  const scaledPreviewWidth = Math.round(previewSize.width * previewScale);
  const scaledPreviewHeight = Math.round(previewSize.height * previewScale);

  useEffect(() => {
    previewFontsReadyRef.current = false;
  }, [previewHtml]);

  useEffect(() => {
    if (!previewHtml) return;
    const iframe = previewIframeRef.current;
    if (!iframe) return;

    const handleLoad = () => updatePreviewScale();
    iframe.addEventListener('load', handleLoad);

    if (iframe.contentDocument?.readyState === 'complete') {
      updatePreviewScale();
    }

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [previewHtml, updatePreviewScale]);

  useEffect(() => {
    const frame = previewFrameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(() => updatePreviewScale());
    observer.observe(frame);
    return () => observer.disconnect();
  }, [updatePreviewScale]);


  return (
    <div className="resume-page">
      <section className={`resume-hero ${isTemplateSelection ? 'is-templates' : ''}`}>
        <div className="resume-hero-content">
          {isTemplateSelection ? (
            <>
              <h1>Resume <span className="highlight">Templates</span></h1>
              <p className="subtitle">
                Each resume template is designed to help you get hired faster. Pick a layout and start editing in seconds.
              </p>
              <div className="resume-hero-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => setTemplateStep('edit')}
                >
                  Create my resume
                </button>
                <button type="button" className="btn btn-secondary btn-lg">
                  Upload my resume
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
              <p className="subtitle">Create a modern resume with live preview and ready-to-download formats.</p>
            </>
          )}
        </div>
      </section>
      <div className="resume-content">
        {isTemplateSelection ? (
          <section className="template-gallery">
            {templateLoading ? (
              <div className="template-state">Loading templates...</div>
            ) : templateError ? (
              <div className="template-state template-error">{templateError}</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="template-state">
                No templates available. Upload HTML files to the resume_templates bucket.
              </div>
            ) : (
              <div className="template-compact-grid">
                {filteredTemplates.map((t) => {
                  const displayName = t.displayName.toLowerCase();
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => handleTemplateSelect(t.name)}
                      className={`template-card-compact ${selectedTemplate === t.name ? 'is-selected' : ''}`}
                      title={displayName}
                    >
                      <div className="template-card-compact-preview">
                        {t.thumbnailUrl ? (
                          <img src={t.thumbnailUrl} alt={`${t.displayName} template`} />
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
          <div className="card ai-generator-section mt-8">
            <div className="card-header border-b pb-4 mb-6">
              <Zap size={24} className="text-primary" />
              <h2 className="text-2xl font-bold">Resume Builder</h2>
            </div>

            <p className="text-gray-600 mb-6">
              Build your resume with a live preview. Drag sections to reorder and add multiple experiences or education entries.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div className="text-sm text-gray-600">
                    Selected Template: <span className="font-semibold text-gray-800">{selectedTemplateLabel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTemplateStep('choose')}
                    className="text-sm font-semibold text-primary hover:text-primary/80"
                  >
                    Change Template
                  </button>
                </div>

                {templateSourceHtml && templateFields.length === 0 && (
                  <div className="text-sm text-gray-500 mb-6">
                    This template has no placeholders. Use a dynamic template to enable live editing.
                  </div>
                )}

                <div className="resume-builder-grid">
                  <div className="builder-panel">
                    <div className="space-y-5">
                      {sectionOrder.map((sectionId) => {
                    const sectionTitle = {
                      contact: 'Contact',
                      summary: 'Professional Summary',
                      experience: 'Work Experience',
                      projects: 'Projects',
                      education: 'Education',
                      skills: 'Skills',
                      additional: 'Additional Information',
                      extra: 'Other Fields',
                    }[sectionId];

                    const sectionContent = {
                      contact: (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="form-group">
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Full Name *</label>
                            <input
                              placeholder="e.g. John Doe"
                              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                              value={contactName}
                              onChange={(e) => setContactName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && moveToNextSection()}
                            />
                          </div>
                          <div className="form-group">
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Target Role *</label>
                            <input
                              placeholder="e.g. Software Engineer"
                              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                              value={contactRole}
                              onChange={(e) => setContactRole(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && moveToNextSection()}
                            />
                          </div>
                          <div className="form-group">
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Email</label>
                            <input
                              type="email"
                              placeholder="you@email.com"
                              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                              value={contactEmail}
                              onChange={(e) => setContactEmail(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && moveToNextSection()}
                            />
                          </div>
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
                          <div className="form-group">
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Location</label>
                            <input
                              placeholder="City, Country"
                              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                              value={contactLocation}
                              onChange={(e) => setContactLocation(e.target.value)}
                            />
                          </div>
                          <div className="form-group md:col-span-2">
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Profile Photo (optional)</label>
                            <div className="flex flex-col gap-3">
                              <input
                                type="file"
                                accept="image/*"
                                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                                onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                              />
                              {(contactPhotoUrl || contactPhotoName) && (
                                <div className="flex items-center gap-3">
                                  {contactPhotoUrl && (
                                    <img
                                      src={contactPhotoUrl}
                                      alt="Profile preview"
                                      className="w-12 h-12 rounded-full object-cover border border-gray-200"
                                    />
                                  )}
                                  <div className="text-sm text-gray-600">{contactPhotoName || 'Photo selected'}</div>
                                  <button
                                    type="button"
                                    className="text-xs text-red-600 hover:text-red-700 ml-auto"
                                    onClick={() => handlePhotoUpload(undefined)}
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                              <p className="text-xs text-gray-500">Upload a JPG or PNG from your device.</p>
                            </div>
                          </div>
                        </div>
                      ),
                      summary: (
                        <div className="form-group">
                          <label className="block text-sm font-semibold mb-2 text-gray-700">Summary</label>
                          <textarea
                            placeholder="Write a concise summary of your profile..."
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-y"
                            rows={4}
                            value={summaryText}
                            onChange={(e) => setSummaryText(e.target.value)}
                          />
                        </div>
                      ),
                      experience: (
                        <div className="space-y-4">
                          {experienceItems.map((item, index) => (
                            <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-800">Experience {index + 1}</h4>
                                <button
                                  onClick={() => removeExperienceItem(item.id)}
                                  className="text-xs text-red-600 hover:text-red-700"
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-group">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Role</label>
                                  <input
                                    placeholder="e.g. Senior Developer"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={item.role}
                                    onChange={(e) => updateExperienceItem(item.id, { role: e.target.value })}
                                  />
                                </div>
                                <div className="form-group">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Company</label>
                                  <input
                                    placeholder="Company name"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={item.company}
                                    onChange={(e) => updateExperienceItem(item.id, { company: e.target.value })}
                                  />
                                </div>
                                <div className="form-group md:col-span-2">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Dates</label>
                                  <input
                                    placeholder="e.g. Jan 2021 - Present"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={item.dates}
                                    onChange={(e) => updateExperienceItem(item.id, { dates: e.target.value })}
                                  />
                                </div>
                                <div className="form-group md:col-span-2">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Details (one bullet per line)</label>
                                  <textarea
                                    placeholder="Built X feature...\nImproved Y by 20%..."
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-y"
                                    rows={4}
                                    value={item.details}
                                    onChange={(e) => updateExperienceItem(item.id, { details: e.target.value })}
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
                      projects: (
                        <div className="form-group">
                          <label className="block text-sm font-semibold mb-2 text-gray-700">Projects (one per line)</label>
                          <textarea
                            placeholder="Project A - brief description..."
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-y"
                            rows={4}
                            value={projectsText}
                            onChange={(e) => setProjectsText(e.target.value)}
                          />
                        </div>
                      ),
                      education: (
                        <div className="space-y-4">
                          {educationItems.map((item, index) => (
                            <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-800">Education {index + 1}</h4>
                                <button
                                  onClick={() => removeEducationItem(item.id)}
                                  className="text-xs text-red-600 hover:text-red-700"
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-group">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Degree</label>
                                  <input
                                    placeholder="e.g. BSc Computer Science"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={item.degree}
                                    onChange={(e) => updateEducationItem(item.id, { degree: e.target.value })}
                                  />
                                </div>
                                <div className="form-group">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">School</label>
                                  <input
                                    placeholder="University name"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={item.school}
                                    onChange={(e) => updateEducationItem(item.id, { school: e.target.value })}
                                  />
                                </div>
                                <div className="form-group md:col-span-2">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Dates</label>
                                  <input
                                    placeholder="e.g. 2016 - 2020"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={item.dates}
                                    onChange={(e) => updateEducationItem(item.id, { dates: e.target.value })}
                                  />
                                </div>
                                <div className="form-group md:col-span-2">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Details (one bullet per line)</label>
                                  <textarea
                                    placeholder="Honors, GPA, coursework..."
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-y"
                                    rows={3}
                                    value={item.details}
                                    onChange={(e) => updateEducationItem(item.id, { details: e.target.value })}
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
                          <label className="block text-sm font-semibold mb-2 text-gray-700">Skills (comma or line separated)</label>
                          <textarea
                            placeholder="React, TypeScript, Node.js..."
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-y"
                            rows={3}
                            value={skillsText}
                            onChange={(e) => setSkillsText(e.target.value)}
                          />
                        </div>
                      ),
                      additional: (
                        <div className="form-group">
                          <label className="block text-sm font-semibold mb-2 text-gray-700">Additional Info</label>
                          <textarea
                            placeholder="Certifications, awards, languages..."
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-y"
                            rows={3}
                            value={additionalText}
                            onChange={(e) => setAdditionalText(e.target.value)}
                          />
                        </div>
                      ),
                      extra: (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {extraFields.map((field) => {
                            const label = formatFieldLabel(field);
                            const isMultiline = isLongField(field);
                            const placeholder = `Enter ${label.toLowerCase()}`;
                            return (
                              <div key={field} className={`form-group ${isMultiline ? 'md:col-span-2' : ''}`}>
                                <label className="block text-sm font-semibold mb-2 text-gray-700">{label}</label>
                                {isMultiline ? (
                                  <textarea
                                    placeholder={placeholder}
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-y"
                                    rows={3}
                                    value={templateFieldValues[field] || ''}
                                    onChange={(e) => updateField(field, e.target.value)}
                                  />
                                ) : (
                                  <input
                                    type={getInputTypeForField(field)}
                                    placeholder={placeholder}
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={templateFieldValues[field] || ''}
                                    onChange={(e) => updateField(field, e.target.value)}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ),
                    }[sectionId];

                    if (!sectionContent) return null;

                    const isUnlocked = unlockedSections.includes(sectionId);
                    if (!isUnlocked) return null;
                    const isExpanded = activeSectionId === sectionId;
                    const isComplete = sectionCompletion[sectionId];

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
                          <h3>{sectionTitle}</h3>
                          <span className={`section-status ${isComplete ? 'complete' : ''}`}>
                            {isComplete ? 'Completed' : 'In progress'}
                          </span>
                          <span className="section-toggle">{isExpanded ? '▾' : '▸'}</span>
                        </button>
                        {isExpanded && (
                          <div className="builder-section-body">{sectionContent}</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {generateError && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 mt-4">
                    <AlertCircle size={18} />
                    {generateError}
                  </div>
                )}

                <button
                  onClick={handleGenerateResume}
                  disabled={generating || templateLoading || !selectedTemplate}
                  className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-full font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <div className="spinner-small border-2 border-white border-t-transparent rounded-full w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap size={22} />
                      Generate Resume
                    </>
                  )}
                </button>
              </div>

              <div className="builder-preview">
                <div className="builder-preview-header">
                  <h3 className="text-lg font-semibold">Live Preview</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleDownloadPDF}
                      className="bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-green-700 transition flex items-center gap-2 shadow-md"
                    >
                      <Download size={16} />
                      PDF
                    </button>
                    <button
                      onClick={handleDownloadHtml}
                      className="bg-slate-700 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-slate-800 transition flex items-center gap-2 shadow-md"
                    >
                      <Download size={16} />
                      HTML
                    </button>
                  </div>
                </div>

                <div className="builder-preview-frame" ref={previewFrameRef}>
                  {previewHtml ? (
                    <div
                      className="preview-frame-inner"
                      style={{
                        width: `${scaledPreviewWidth}px`,
                        height: `${scaledPreviewHeight}px`,
                      }}
                    >
                      <div
                        className="preview-frame-content"
                        style={{
                          width: `${previewSize.width}px`,
                          height: `${previewSize.height}px`,
                          transform: `scale(${previewScale})`,
                          transformOrigin: 'top left',
                        }}
                      >
                        <iframe
                          id="generated-resume"
                          ref={previewIframeRef}
                          title="Generated resume"
                          srcDoc={previewHtml}
                          scrolling="no"
                          style={{
                            width: `${previewSize.width}px`,
                            height: `${previewSize.height}px`,
                            border: '0',
                            display: 'block',
                            background: '#ffffff',
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 p-6 text-center">
                      Select a template to preview your resume.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .resume-page {
          min-height: 100vh;
          background: #f8fffe;
          font-family: var(--font-family);
          padding: 0;
          width: 100%;
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
          gap: var(--spacing-xl);
          padding: 0 24px 60px;
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
          height: 580px;
          overflow: hidden;
          background: var(--color-bg-secondary);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          // padding-top: 10px;
          width: 100%;
        }

        .template-card-compact-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
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
          grid-template-columns: 1.2fr 0.8fr;
          gap: var(--spacing-xl);
          align-items: stretch;
        }

        .builder-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-width: 0;
        }

        .builder-section {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          background: var(--color-surface);
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
        }

        .builder-section.is-dragging {
          opacity: 0.75;
          border-color: var(--color-primary);
          box-shadow: 0 12px 24px rgba(99, 102, 241, 0.18);
        }

        .builder-section-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          width: 100%;
          border: none;
          background: transparent;
          padding: 0;
          margin-bottom: var(--spacing-md);
          font-weight: 600;
          color: var(--color-text-primary);
          text-align: left;
          cursor: pointer;
        }

        .builder-section-header h3 {
          font-size: var(--font-size-md);
        }

        .builder-section-body {
          padding-top: var(--spacing-sm);
          border-top: 1px solid var(--color-border);
        }

        .drag-handle {
          font-weight: 700;
          letter-spacing: 2px;
          color: var(--color-text-tertiary);
          user-select: none;
          cursor: grab;
        }

        .section-status {
          margin-left: auto;
          font-size: var(--font-size-xs);
          color: var(--color-text-tertiary);
        }

        .section-status.complete {
          color: var(--color-success);
        }

        .section-toggle {
          font-size: var(--font-size-sm);
          color: var(--color-text-tertiary);
          margin-left: var(--spacing-sm);
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
        }

        .builder-preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-md);
        }

        .builder-preview-frame {
          overflow: hidden;
          background: transparent;
          position: relative;
          flex: 1;
          min-height: 420px;
          min-width: 0;
          display: flex;
          align-items: flex-start;
          justify-content: center;
        }

        .preview-frame-inner {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          background: #f8fafc;
          overflow: hidden;
          position: relative;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
          max-width: 100%;
          max-height: 100%;
        }

        .preview-frame-content {
          position: relative;
        }

        @media (max-width: 768px) {
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

          .score-display {
            flex-direction: column;
            text-align: center;
          }

          .analysis-grid {
            grid-template-columns: 1fr;
          }

          .resume-builder-grid {
            grid-template-columns: 1fr;
          }

          .resume-content {
            padding: 0 16px 48px;
          }

          .template-compact-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }

          .template-card-compact-preview {
            height: 450px;
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
            flex: 1 1 180px;
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
        .bg-primary\/5 { background-color: rgba(99, 102, 241, 0.05); }
        .bg-primary\/10 { background-color: rgba(99, 102, 241, 0.1); }
        .border-primary\/10 { border-color: rgba(99, 102, 241, 0.1); }
        .border-primary\/20 { border-color: rgba(99, 102, 241, 0.2); }

        @media (max-width: 640px) {
          .template-compact-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .template-card-compact-preview {
            height: 380px;
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

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }

        .career-advisor-section .form-group label {
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
};


