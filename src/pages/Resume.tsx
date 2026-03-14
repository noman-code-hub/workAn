import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Pencil, Settings, Trash2, Zap } from 'lucide-react';
import axios, { type AxiosResponse } from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useResumeTemplate } from '../hooks/useResumeTemplate';
import { normalizeFieldKey, renderTemplateWithSchema } from '../services/resumeTemplateRenderer';
import { API_BASE, apiUrl } from '../config/api';
import { AppLoader } from '../components/AppLoader';
import { RichTextEditor } from '../components/RichTextEditor';

const RESUME_VIEW_STORAGE_KEY = 'careerpilot:resume-view';
const RESUME_UPLOAD_TIMEOUT_MS = Number(import.meta.env.VITE_RESUME_UPLOAD_TIMEOUT_MS || 90000);
const PAGE_SIZES = {
  a4: { label: 'A4', width: 794, height: 1123 },
  letter: { label: 'Letter', width: 816, height: 1056 },
} as const;
type PreviewPageSize = keyof typeof PAGE_SIZES;
const PAGE_MARGIN_PX = 72;
const PAGE_GAP_PX = 24;

export const Resume = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { templateId } = useParams();
  const isEditorRoute = Boolean(templateId);

  // Resume Builder state
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
  const [additionalText] = useState("");
  const [customDetails, setCustomDetails] = useState<{ id: string; label: string; value: string }[]>([]);
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
    'custom',
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
  const [previewPage, setPreviewPage] = useState(1);
  const [previewPageCount, setPreviewPageCount] = useState(1);
  const [previewPageSizeMode, setPreviewPageSizeMode] = useState<'auto' | PreviewPageSize>('auto');
  const [autoDetectedPageSize, setAutoDetectedPageSize] = useState<PreviewPageSize>('a4');
  const previewContentHeightRef = useRef<number>(PAGE_SIZES.a4.height);
  const previewScaleRef = useRef(1);
  const autoDetectLockedRef = useRef(false);
  const [templateStep, setTemplateStep] = useState<'choose' | 'edit'>('choose');
  const [uploadingResume, setUploadingResume] = useState(false);
  const [isFillingDemo, setIsFillingDemo] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const historyTimerRef = useRef<number | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const isApplyingHistoryRef = useRef(false);
  const restoreKeyRef = useRef<string | null>(null);

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
    refreshTemplates,
  } = useResumeTemplate(user);

  const getTemplateFieldValue = (key: string) => {
    if (templateFieldValues[key]) return templateFieldValues[key];
    const normalized = normalizeFieldKey(key);
    const match = Object.keys(templateFieldValues).find((k) => normalizeFieldKey(k) === normalized);
    return match ? templateFieldValues[match] : '';
  };

  const setTemplateFieldValue = useCallback((key: string, value: string) => {
    updateField(key, value);
  }, [updateField]);

  const templateFieldSet = useMemo(
    () => new Set(templateFields.map((field) => normalizeFieldKey(field))),
    [templateFields]
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
    if (templates.length === 0) return [];
    if (activeTemplateFilter === 'All templates') return templates;

    const filterKey = activeTemplateFilter.toLowerCase();
    const matches = (template: (typeof templates)[number]) => {
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

    return templates.filter(matches);
  }, [activeTemplateFilter, templates]);

  const resolvedPageSize: PreviewPageSize =
    previewPageSizeMode === 'auto' ? autoDetectedPageSize : previewPageSizeMode;
  const activePageSize = PAGE_SIZES[resolvedPageSize];
  const pageSizeOptions: Array<'auto' | PreviewPageSize> = ['auto', 'a4', 'letter'];

  const slugifyTemplate = (value: string) =>
    value
      .toLowerCase()
      .replace(/\.html$/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

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

  const demoSamples = useMemo(() => ([
    {
      name: 'Noman Khan',
      role: 'Full-Stack Developer',
      email: 'noman.dev@gmail.com',
      phone: '+92 300 1234567',
      location: 'Lahore, Pakistan',
      summary:
        'Full-stack developer with 4+ years building React, Node.js, and Supabase apps. Delivered 20+ features, improved load time by 35%, and shipped scalable UI systems.',
      skills: 'React, TypeScript, Node.js, Supabase, PostgreSQL, Tailwind, REST APIs, CI/CD',
      projects: [
        'Workshour – Job platform with Supabase auth, analytics, and resume builder',
        'Hiring CRM – Candidate pipeline with role-based access and audit logs',
      ],
      experience: [
        {
          role: 'Full-Stack Engineer',
          company: 'Hirevo',
          dates: 'Jan 2023 - Present',
          details: 'Built hiring workflows and resume tooling. Optimized API performance by 40%.',
        },
        {
          role: 'Frontend Developer',
          company: 'Techstack Labs',
          dates: 'Aug 2021 - Dec 2022',
          details: 'Led UI migration to React + TypeScript. Implemented design system.',
        },
      ],
      education: [
        {
          degree: 'BS Computer Science',
          school: 'University of Lahore',
          dates: '2017 - 2021',
          details: 'Focused on software engineering and databases.',
        },
      ],
      custom: [
        { label: 'Certifications', value: 'AWS Cloud Practitioner' },
        { label: 'Languages', value: 'English, Urdu' },
      ],
    },
    {
      name: 'Aisha Noor',
      role: 'Product Designer',
      email: 'aisha.noor@gmail.com',
      phone: '+92 311 555 1990',
      location: 'Karachi, Pakistan',
      summary:
        'Product designer focused on clean UX and business outcomes. Shipped 3 design systems and improved conversion by 18% across onboarding flows.',
      skills: 'Figma, UX Research, Design Systems, Prototyping, Accessibility, Brand',
      projects: [
        'Onboarding revamp for fintech app',
        'Design system for multi-brand platform',
      ],
      experience: [
        {
          role: 'Senior Product Designer',
          company: 'Fintechly',
          dates: 'Mar 2022 - Present',
          details: 'Led end-to-end product design and user research.',
        },
      ],
      education: [
        {
          degree: 'BDes Visual Communication',
          school: 'IBA Karachi',
          dates: '2016 - 2020',
          details: 'Graduated with distinction.',
        },
      ],
      custom: [
        { label: 'Portfolio', value: 'behance.net/aishanoor' },
      ],
    },
  ]), []);

  const fillWithDemoData = useCallback(() => {
    setIsFillingDemo(true);
    const sample = demoSamples[Math.floor(Math.random() * demoSamples.length)];

    setContactName(sample.name);
    setContactRole(sample.role);
    setContactEmail(sample.email);
    setContactPhone(sample.phone);
    setContactLocation(sample.location);
    setSummaryText(sample.summary);
    setSkillsText(sample.skills);
    setProjectsText(sample.projects.join('\n'));
    setExperienceItems(
      sample.experience.map((item, index) => ({
        id: `exp-demo-${index + 1}`,
        company: item.company,
        role: item.role,
        dates: item.dates,
        details: item.details,
      }))
    );
    setEducationItems(
      sample.education.map((item, index) => ({
        id: `edu-demo-${index + 1}`,
        school: item.school,
        degree: item.degree,
        dates: item.dates,
        details: item.details,
      }))
    );
    setCustomDetails(
      sample.custom.map((item, index) => ({
        id: `custom-demo-${index + 1}`,
        label: item.label,
        value: item.value,
      }))
    );
    setGenerateError(null);
    setIsFillingDemo(false);
  }, [demoSamples]);

  const isTemplateSelection = !isEditorRoute && (templateStep === 'choose' || !selectedTemplate);

  useEffect(() => {
    if (resumeViewRestoreRef.current || templates.length === 0) return;

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
  }, [selectedTemplate, selectTemplate, templates]);

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
    (key: string) => templateFields.length > 0 && templateFieldSet.has(normalizeFieldKey(key)),
    [templateFieldSet, templateFields.length]
  );

  const hasAnyTemplateField = useCallback(
    (...keys: string[]) => keys.some((key) => hasTemplateField(key)),
    [hasTemplateField]
  );

  const showNameField = useMemo(
    () => hasAnyTemplateField('name', 'full_name', 'fullname', 'full-name'),
    [hasAnyTemplateField]
  );
  const showRoleField = useMemo(
    () => hasAnyTemplateField('role', 'title', 'position', 'jobtitle', 'targetrole'),
    [hasAnyTemplateField]
  );
  const showEmailField = useMemo(() => hasAnyTemplateField('email'), [hasAnyTemplateField]);
  const showPhoneField = useMemo(() => hasAnyTemplateField('phone', 'mobile'), [hasAnyTemplateField]);
  const showLocationField = useMemo(
    () => hasAnyTemplateField('location', 'address', 'city', 'country'),
    [hasAnyTemplateField]
  );
  const showPhotoField = useMemo(() => hasAnyTemplateField('photo_url'), [hasAnyTemplateField]);

  const showContactSection = useMemo(
    () => [showNameField, showRoleField, showEmailField, showPhoneField, showLocationField, showPhotoField].some(Boolean),
    [showEmailField, showLocationField, showNameField, showPhoneField, showPhotoField, showRoleField]
  );
  const showSummarySection = useMemo(
    () => hasAnyTemplateField('summary', 'profile', 'objective', 'hassummary'),
    [hasAnyTemplateField]
  );
  const showExperienceSection = useMemo(
    () => hasAnyTemplateField('experience', 'work_experience', 'workexperience', 'hasexperience'),
    [hasAnyTemplateField]
  );
  const showProjectsSection = useMemo(
    () => hasAnyTemplateField('projects', 'hasprojects'),
    [hasAnyTemplateField]
  );
  const showEducationSection = useMemo(
    () => hasAnyTemplateField('education', 'haseducation'),
    [hasAnyTemplateField]
  );
  const showSkillsSection = useMemo(
    () => hasAnyTemplateField('skills', 'hasskills'),
    [hasAnyTemplateField]
  );
  const showCustomSection = useMemo(
    () => hasAnyTemplateField('customdetails', 'custom_details', 'hascustomdetails'),
    [hasAnyTemplateField]
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
    'customdetails',
    'custom_details',
    'hascustomdetails',
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

  const addCustomDetail = () =>
    setCustomDetails((prev) => [...prev, { id: makeId('custom'), label: '', value: '' }]);

  const updateCustomDetail = (id: string, patch: Partial<(typeof customDetails)[number]>) =>
    setCustomDetails((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const removeCustomDetail = (id: string) =>
    setCustomDetails((prev) => prev.filter((item) => item.id !== id));

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
    const anyCustomFilled = customDetails.some((item) =>
      (item.label || item.value || '').toString().trim().length >= 3
    );
    const skillsCount = parseItems(skillsText).length;
    const projectsCount = parseItems(projectsText).length;
    const additionalCount = parseItems(additionalText).length;

    return {
      contact: (!showNameField || hasChars(contactName, 2)) && (!showRoleField || hasChars(contactRole, 2)),
      summary: hasLongText(summaryText, 30),
      experience: anyExperienceFilled,
      projects: projectsCount >= 1,
      education: anyEducationFilled,
      skills: skillsCount >= 2,
      custom: anyCustomFilled,
      additional: additionalCount >= 1,
      extra: anyExtraFilled,
    } as Record<string, boolean>;
  }, [
    additionalText,
    customDetails,
    contactName,
    contactRole,
    educationItems,
    experienceItems,
    extraFields,
    projectsText,
    showNameField,
    showRoleField,
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

  const handleSectionEnterKey = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter') return;
    if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    const tag = target.tagName.toLowerCase();
    if (tag === 'textarea' || tag === 'button' || tag === 'a') return;

    if (tag === 'input') {
      const inputType = ((target as HTMLInputElement).type || '').toLowerCase();
      if (['button', 'checkbox', 'file', 'radio', 'reset', 'submit'].includes(inputType)) return;
    }

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

  const buildResumeView = useCallback(() => {
    const templateHasSection = (key: string) =>
      templateSourceHtml ? new RegExp(`{{\\s*#\\s*${key}\\s*}}`, 'i').test(templateSourceHtml) : false;

    const photoValue = contactPhotoUrl.trim()
      || (templateFieldValues.photo_url || '').toString().trim();
    const countryValue = (templateFieldValues.country || templateFieldValues.Country || '').toString().trim();
    const cityValue = (templateFieldValues.city || '').toString().trim();
    const addressValue = (templateFieldValues.address || '').toString().trim();

    const skills = parseCommaOrNewline(skillsText);
    const projects = parseNewline(projectsText);
    const additional = parseNewline(additionalText);
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
    showSummarySection ? 'summary' : null,
    showExperienceSection ? 'experience' : null,
    showProjectsSection ? 'projects' : null,
    showEducationSection ? 'education' : null,
    showSkillsSection ? 'skills' : null,
    showCustomSection ? 'custom' : null,
  ].filter(Boolean) as string[]), [
    showContactSection,
    showCustomSection,
    showEducationSection,
    showExperienceSection,
    showProjectsSection,
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

  const handleTemplateSelect = (name: string) => {
    selectTemplate(name);
    setTemplateStep('edit');
  };

  const ensureEditModeReady = useCallback(() => {
    const fallbackTemplate = selectedTemplate || filteredTemplates[0]?.name || templates[0]?.name;
    if (!fallbackTemplate) {
      setGenerateError('No resume template is available yet.');
      return false;
    }
    if (!selectedTemplate) {
      selectTemplate(fallbackTemplate);
    }
    setTemplateStep('edit');
    setActiveSectionId('contact');
    setGenerateError(null);
    return true;
  }, [filteredTemplates, selectedTemplate, selectTemplate, templates]);

  const handleCreateResumeClick = useCallback(() => {
    ensureEditModeReady();
  }, [ensureEditModeReady]);

  const applyPreviewPagination = useCallback(() => {
    const frame = previewFrameRef.current;
    const doc = frame?.contentDocument;
    if (!doc) return;
    const body = doc.body;
    if (!body) return;

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
        padding: 24px 0;
        background: #e5e7eb;
        display: flex;
        justify-content: center;
        align-items: flex-start;
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
        background: #ffffff;
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
        box-sizing: border-box;
        overflow: hidden;
        display: flex;
        flex: 0 0 auto;
      }
      .resume-preview-page-content {
        width: 100%;
        height: 100%;
        padding: ${PAGE_MARGIN_PX}px;
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
    const sectionNodes = rootTemplate
      ? Array.from(rootTemplate.childNodes)
      : Array.from(temp.childNodes);

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
      currentPage.appendChild(shell);
      return shell;
    };

    currentShell = createPageShell();

    const isContentEmpty = (content: HTMLElement) => {
      const text = (content.textContent || '').trim();
      if (text.length > 0) return false;
      return content.querySelector('*') === null;
    };

    const nodes = sectionNodes.filter((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent || '').trim().length > 0;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (['SCRIPT', 'STYLE'].includes(el.tagName)) return false;
      }
      return true;
    });

    nodes.forEach((node) => {
      const target = currentShell ?? currentPage;
      target.appendChild(node);
      if (currentPage.scrollHeight <= currentPage.clientHeight) return;

      target.removeChild(node);

      if (!isContentEmpty(target)) {
        currentPage = createPage();
        currentShell = createPageShell();
      }
      (currentShell ?? currentPage).appendChild(node);
      if (currentPage.scrollHeight > currentPage.clientHeight) {
        // Section is taller than a page; allow overflow within this page.
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
  }, [activePageSize.height, activePageSize.width, resolvedPageSize]);

  const updatePreviewPaging = useCallback(() => {
    const pageHeight = activePageSize.height;
    const frame = previewFrameRef.current;
    const pages = frame?.contentDocument?.querySelector('.resume-preview-pages');
    const count = pages
      ? Math.max(1, pages.children.length)
      : Math.max(1, Math.ceil((previewContentHeightRef.current || pageHeight) / pageHeight));
    setPreviewPageCount(count);
    setPreviewPage((prev) => Math.min(Math.max(prev, 1), count));
  }, [activePageSize.height]);

  const updatePreviewFrameSize = useCallback(() => {
    const frame = previewFrameRef.current;
    const shell = previewShellRef.current;
    const card = previewCardRef.current;
    if (!frame) return;
    const pageWidth = activePageSize.width;
    const pageHeight = activePageSize.height;
    frame.style.width = `${pageWidth}px`;
    frame.style.height = `${pageHeight}px`;
    const doc = frame.contentDocument;
    if (!doc) return;
    const body = doc.body;
    const measuredWidth = Number(body.dataset.measureWidth || pageWidth) || pageWidth;
    const measuredHeight = Number(body.dataset.measureHeight || pageHeight) || pageHeight;
    const height = pageHeight;
    const width = pageWidth;
    if (previewPageSizeMode === 'auto' && !autoDetectLockedRef.current && width > 0) {
      const ratio = measuredHeight / measuredWidth;
      const a4Ratio = PAGE_SIZES.a4.height / PAGE_SIZES.a4.width;
      const letterRatio = PAGE_SIZES.letter.height / PAGE_SIZES.letter.width;
      const detected = Math.abs(ratio - a4Ratio) <= Math.abs(ratio - letterRatio) ? 'a4' : 'letter';
      if (detected !== autoDetectedPageSize) {
        setAutoDetectedPageSize(detected);
      }
      autoDetectLockedRef.current = true;
    }
    let scale = 1;
    if (card) {
      const padding = 40;
      const availableWidth = Math.max(0, card.clientWidth - padding);
      const scaleX = availableWidth > 0 ? availableWidth / width : 1;
      const nextScale = Math.min(1, scaleX);
      if (Number.isFinite(nextScale) && nextScale > 0) {
        scale = nextScale;
        card.style.setProperty('--preview-scale', scale.toFixed(3));
      }
    }
    const safeScale = scale > 0 ? scale : 1;
    previewScaleRef.current = safeScale;
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
    previewContentHeightRef.current = pageCount * activePageSize.height;
    frame.style.height = `${height}px`;
    frame.style.width = `${width}px`;
    if (shell) {
      shell.style.setProperty('--preview-shell-height', `${height * safeScale}px`);
      shell.style.setProperty('--preview-shell-width', `${width * safeScale}px`);
    }
    updatePreviewPaging();
  }, [
    activePageSize.height,
    activePageSize.width,
    autoDetectedPageSize,
    previewPageSizeMode,
    updatePreviewPaging,
  ]);

  const syncPreviewPagePosition = useCallback((targetPage: number) => {
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
    const pageHeight = activePageSize.height;
    const maxPage = Math.max(1, Math.ceil((previewContentHeightRef.current || pageHeight) / pageHeight));
    const clamped = Math.min(maxPage, Math.max(1, targetPage));
    setPreviewPage(clamped);
    syncPreviewPagePosition(clamped);
  }, [activePageSize.height, syncPreviewPagePosition]);

  const handlePreviewLoad = useCallback(() => {
    applyPreviewPagination();
    requestAnimationFrame(() => {
      updatePreviewFrameSize();
    });
  }, [applyPreviewPagination, updatePreviewFrameSize]);

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

  const handleDownloadPDF = async () => {
    const html = templateSourceHtml
      ? renderTemplateWithSchema(templateSourceHtml, buildResumeView())
      : null;
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
    const pdfPaginationStyle = document.createElement('style');
    pdfPaginationStyle.textContent = `
      @page {
        size: A4 portrait;
        margin: 0;
      }
      p,
      li,
      blockquote,
      pre,
      table,
      tr,
      td,
      th,
      .section,
      .experience-item,
      .education-item,
      .project-item {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      h1,
      h2,
      h3,
      h4,
      h5,
      h6 {
        break-after: avoid;
        page-break-after: avoid;
      }
      p,
      li {
        orphans: 3;
        widows: 3;
        overflow-wrap: anywhere;
      }
    `;
    styleContainer.appendChild(pdfPaginationStyle);
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
      }
      const grid = resumeContainer?.querySelector('.grid') as HTMLElement | null;
      if (grid) {
        grid.style.minHeight = 'auto';
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
        replacement.style.whiteSpace = tag === 'textarea' ? 'pre-line' : 'normal';
        replacement.style.overflowWrap = 'anywhere';
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
      pagebreak: {
        mode: ['css', 'legacy'],
        avoid: ['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'table', 'tr', 'img'],
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    try {
      const { default: html2pdf } = await import('html2pdf.js');
      await html2pdf()
        .set(opt)
        .from(contentWrapper)
        .save();
    } finally {
      element.remove();
    }
  };

  const previewHtml = useMemo(() => {
    if (templateSourceHtml) {
      try {
        return renderTemplateWithSchema(templateSourceHtml, buildResumeView());
      } catch (error) {
        console.error('Preview render failed:', error);
        return templatePreviewHtml;
      }
    }
    return templatePreviewHtml;
  }, [buildResumeView, templatePreviewHtml, templateSourceHtml]);

  useEffect(() => {
    if (!previewHtml) return;
    const timer = window.setTimeout(() => {
      applyPreviewPagination();
      updatePreviewFrameSize();
    }, 100);
    return () => window.clearTimeout(timer);
  }, [applyPreviewPagination, previewHtml, updatePreviewFrameSize]);

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
    const onResize = () => updatePreviewPaging();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updatePreviewPaging]);

  useEffect(() => {
    if (!isEditorRoute) return;
    const match = findTemplateBySlug(templateId);
    if (match) {
      selectTemplate(match.name);
      setTemplateStep('edit');
      return;
    }
    if (templates.length > 0) {
      selectTemplate(templates[0].name);
      setTemplateStep('edit');
    }
  }, [findTemplateBySlug, isEditorRoute, selectTemplate, templateId, templates]);

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
      templateFieldValues,
    });
  }, [
    activeSectionId,
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
    selectedTemplate,
    skillsText,
    summaryText,
    templateFieldValues,
    unlockedSections,
  ]);

  const getEditorSnapshotRef = useRef(getEditorSnapshot);

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
      if (Array.isArray(next.customDetails)) setCustomDetails(next.customDetails as any);
      if (Array.isArray(next.educationItems)) setEducationItems(next.educationItems as any);
      if (Array.isArray(next.experienceItems)) setExperienceItems(next.experienceItems as any);
      if (Array.isArray(next.sectionOrder)) setSectionOrder(next.sectionOrder as any);
      if (Array.isArray(next.unlockedSections)) setUnlockedSections(next.unlockedSections as any);
      if (typeof next.activeSectionId === 'string' || next.activeSectionId === null) {
        setActiveSectionId(next.activeSectionId as any);
      }
    } finally {
      // let state settle before we allow pushing history again
      window.setTimeout(() => {
        isApplyingHistoryRef.current = false;
      }, 0);
    }
  }, []);

  const canUndo = undoStackRef.current.length > 1;
  const canRedo = redoStackRef.current.length > 0;

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
    const storageKey = `hirevo:resume-editor:${templateId || 'default'}:${user?.id || 'anon'}`;
    if (restoreKeyRef.current === storageKey) return;
    restoreKeyRef.current = storageKey;
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      applyEditorSnapshot(saved);
      undoStackRef.current = [saved];
      redoStackRef.current = [];
    } else {
      const initial = getEditorSnapshotRef.current();
      undoStackRef.current = [initial];
      redoStackRef.current = [];
    }
  }, [applyEditorSnapshot, isEditorRoute, templateId, user?.id]);

  useEffect(() => {
    if (!isEditorRoute) return;
    const storageKey = `hirevo:resume-editor:${templateId || 'default'}:${user?.id || 'anon'}`;
    if (autosaveTimerRef.current) window.clearInterval(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setInterval(() => {
      if (isApplyingHistoryRef.current) return;
      window.localStorage.setItem(storageKey, getEditorSnapshot());
    }, 2500);
    return () => {
      if (autosaveTimerRef.current) window.clearInterval(autosaveTimerRef.current);
    };
  }, [getEditorSnapshot, isEditorRoute, templateId, user?.id]);

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

    if (templateLoading || (templatePreviewLoading && waitingForInitialTemplate) || waitingForInitialTemplate) {
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

  const hasTemplateIssue = Boolean(templateError) || (!templateLoading && templates.length === 0);
  const templateIssueMessage = templateError
    ? templateError
    : 'No templates available. Upload HTML files to the resume_templates bucket.';


  return (
    <div className={`resume-page ${isTemplateSelection ? 'is-template-mode' : ''} ${isEditorRoute ? 'is-editor-route' : ''}`}>
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
                  <span>{templateLoading ? 'Loading templates...' : `${filteredTemplates.length} templates ready`}</span>
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
                  <input
                    ref={resumeUploadInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    style={{ display: 'none' }}
                    onChange={handleUploadResumeFile}
                  />
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
            {templateLoading ? (
              <div className="template-state">Loading templates...</div>
            ) : templateError ? (
              <div className="template-state template-error">{templateError}</div>
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
                <button type="button" className="resume-topbar-pill is-active">Edit</button>
                <button type="button" className="resume-topbar-pill">Customize</button>
                <button type="button" className="resume-topbar-pill">AI Review</button>
                <button type="button" className="resume-topbar-pill has-badge">
                  Tailor
                  <span className="pill-badge">NEW</span>
                </button>
              </div>
              <div className="resume-topbar-right">
                <button
                  type="button"
                  className="resume-topbar-outline"
                  onClick={() => navigate('/resume/templates')}
                >
                  Change Template
                </button>
                <button type="button" className="resume-topbar-download" onClick={handleDownloadPDF}>
                  Download <span className="caret" aria-hidden="true" />
                </button>
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
                    <button
                      type="button"
                      className="resume-action-btn ghost"
                      onClick={fillWithDemoData}
                      disabled={isFillingDemo}
                    >
                      {isFillingDemo ? 'Filling...' : 'Fill Sample Data'}
                    </button>
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

              {templateSourceHtml && templateFields.length === 0 && (
                <div className="text-sm text-gray-500 mb-6">
                  This template has no placeholders. Use a dynamic template to enable live editing.
                </div>
              )}

            <div className="resume-builder-grid">
              <div className="builder-panel">
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
                    <div className="step-header-title">
                      <span className="step-count">Step {currentStepIndex + 1} of {totalSteps}</span>
                      <h3>{{
                        contact: 'Personal Details',
                        summary: 'Professional Summary',
                        experience: 'Work Experience',
                        projects: 'Projects',
                        education: 'Education',
                        skills: 'Skills',
                        custom: 'Custom Details',
                        additional: 'Additional Information',
                        extra: 'Other Fields',
                      }[currentStepId] || 'Section'}</h3>
                    </div>
                    <div className="step-header-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={goPrevStep}
                        disabled={currentStepIndex === 0}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={goNextStep}
                        disabled={currentStepIndex >= totalSteps - 1}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
                <div className="space-y-5">
                  {sectionOrder.map((sectionId) => {
                    const sectionTitles: Record<string, string> = {
                      contact: 'Personal Details',
                      summary: 'Professional Summary',
                      experience: 'Work Experience',
                      projects: 'Projects',
                      education: 'Education',
                      skills: 'Skills',
                      custom: 'Custom Details',
                      additional: 'Additional Information',
                      extra: 'Other Fields',
                    };
                    const sectionTitle = sectionTitles[sectionId];
                    const currentSectionIndex = sectionOrder.indexOf(sectionId);
                    const nextSectionId =
                      currentSectionIndex >= 0 && currentSectionIndex < sectionOrder.length - 1
                        ? sectionOrder[currentSectionIndex + 1]
                        : null;
                    const nextSectionTitle = nextSectionId ? sectionTitles[nextSectionId] || 'Next Section' : '';

                    const sectionContent = {
                      contact: (
                        <div className="contact-grid">
                          <div className="contact-fields">
                            <div className="contact-top-row">
                              {showRoleField && (
                                <div className="form-group">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">Job Target</label>
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
                              <div className="form-group">
                                <label className="block text-sm font-semibold mb-2 text-gray-700">LinkedIn URL</label>
                                <input
                                  placeholder="linkedin.com/in/you"
                                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                  value={getTemplateFieldValue('linkedin')}
                                  onChange={(e) => setTemplateFieldValue('linkedin', e.target.value)}
                                />
                              </div>
                              <div className="form-group">
                                <label className="block text-sm font-semibold mb-2 text-gray-700">Postal Code</label>
                                <input
                                  placeholder="Postal code"
                                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                  value={getTemplateFieldValue('postal_code')}
                                  onChange={(e) => setTemplateFieldValue('postal_code', e.target.value)}
                                />
                              </div>
                              {showLocationField && (
                                <div className="form-group">
                                  <label className="block text-sm font-semibold mb-2 text-gray-700">City, State</label>
                                  <input
                                    placeholder="City, State"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={contactLocation}
                                    onChange={(e) => setContactLocation(e.target.value)}
                                  />
                                </div>
                              )}
                              <div className="form-group">
                                <label className="block text-sm font-semibold mb-2 text-gray-700">Country</label>
                                <input
                                  placeholder="Country"
                                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                  value={getTemplateFieldValue('country')}
                                  onChange={(e) => setTemplateFieldValue('country', e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="contact-footer">
                              <button type="button" className="add-details-btn">Add more details</button>
                              <button type="button" className="ask-ai-btn">Ask AI writer</button>
                            </div>
                          </div>
                        </div>
                      ),
                      summary: (
                        <div className="form-group">
                          <label className="block text-sm font-semibold mb-2 text-gray-700">Summary</label>
                          <RichTextEditor
                            value={summaryText}
                            onChange={setSummaryText}
                            placeholder="Write a concise summary of your profile..."
                            minHeight={160}
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
                                  <RichTextEditor
                                    value={item.details}
                                    onChange={(value) => updateExperienceItem(item.id, { details: value })}
                                    placeholder="Built X feature...\nImproved Y by 20%..."
                                    minHeight={140}
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
                          <RichTextEditor
                            value={projectsText}
                            onChange={setProjectsText}
                            placeholder="Project A - brief description..."
                            minHeight={140}
                          />
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
                                  <RichTextEditor
                                    value={item.details}
                                    onChange={(value) => updateEducationItem(item.id, { details: value })}
                                    placeholder="Honors, GPA, coursework..."
                                    minHeight={120}
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
                      custom: (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">Add extra details</span>
                            <button
                              type="button"
                              onClick={addCustomDetail}
                              className="text-sm font-semibold text-primary hover:text-primary-dark"
                            >
                              + Add Detail
                            </button>
                          </div>
                          {customDetails.length === 0 ? (
                            <div className="text-sm text-gray-500">
                              Add label/value pairs for extra details like Certifications, Awards, or Licenses.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {customDetails.map((item) => (
                                <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr,2fr,auto] gap-3">
                                  <input
                                    placeholder="Label (e.g. Certifications)"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={item.label}
                                    onChange={(e) => updateCustomDetail(item.id, { label: e.target.value })}
                                  />
                                  <input
                                    placeholder="Value (e.g. BLS, ACLS)"
                                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    value={item.value}
                                    onChange={(e) => updateCustomDetail(item.id, { value: e.target.value })}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeCustomDetail(item.id)}
                                    className="text-sm font-semibold text-gray-500 hover:text-gray-700"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ),
                    }[sectionId];

                    if (!sectionContent) return null;

                    const isUnlocked = unlockedSections.includes(sectionId);
                    if (!isUnlocked) return null;
                    if (isStepMode && sectionId !== currentStepId) return null;
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
                            {nextSectionId && (
                              <div className="section-nav-actions">
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm section-next-btn"
                                  onClick={() => (isStepMode ? goNextStep() : setActiveSectionId(nextSectionId))}
                                >
                                  {isStepMode ? 'Next Step' : `Next: ${nextSectionTitle}`}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {isStepMode && showStepChrome && (
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
                      onClick={goNextStep}
                      disabled={currentStepIndex >= totalSteps - 1}
                    >
                      Next
                    </button>
                  </div>
                )}

                {generateError && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 mt-4">
                    <AlertCircle size={18} />
                    {generateError}
                  </div>
                )}

              </div>
              <div className="builder-preview-panel">
                <div className="preview-card" ref={previewCardRef}>
                  <div className="preview-card-body" ref={previewBodyRef} onScroll={updatePreviewPaging}>
                    {previewHtml ? (
                      <div className="preview-iframe-shell" ref={previewShellRef}>
                        <iframe
                          title="Resume preview"
                          srcDoc={previewHtml}
                          className="preview-iframe"
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
                    <div className="preview-overlay">
                      <button
                        type="button"
                        className="preview-overlay-btn"
                        disabled={previewPage <= 1}
                        onClick={() => scrollPreviewToPage(previewPage - 1)}
                      >
                        &lt;
                      </button>
                      <span className="preview-overlay-text">{previewPage} / {previewPageCount}</span>
                      <button
                        type="button"
                        className="preview-overlay-btn"
                        disabled={previewPage >= previewPageCount}
                        onClick={() => scrollPreviewToPage(previewPage + 1)}
                      >
                        &gt;
                      </button>
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
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </>
        )}
      </div>

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
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          width: 100%;
        }

        .template-card-compact-preview img {
          width: 100%;
          height: 100%;
          object-fit: contain;
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

        .builder-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          min-width: 0;
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          padding-right: 6px;
          gap: 16px;
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
          min-height: 0;
          height: 100%;
          overflow: hidden;
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
          --preview-scale: 0.86;
        }

        .preview-card-body {
          flex: 1;
          height: 100%;
          min-height: 0;
          padding: 20px;
          background: #ffffff;
          position: relative;
          overflow: hidden;
          overflow-x: hidden;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          overscroll-behavior: contain;
        }

        .preview-iframe-shell {
          width: var(--preview-shell-width, 100%);
          height: var(--preview-shell-height, auto);
          margin: 0 auto;
        }

        .preview-iframe {
          width: 100%;
          height: 100%;
          min-height: 720px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #ffffff;
          transform: scale(var(--preview-scale));
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

          .preview-card {
            --preview-scale: 0.92;
          }
        }

        .step-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 18px;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 18px 30px -26px rgba(15, 23, 42, 0.35);
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
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          margin-top: 12px;
          background: #ffffff;
          box-shadow: 0 18px 30px -26px rgba(15, 23, 42, 0.35);
        }

        .step-dots {
          display: flex;
          align-items: center;
          gap: 6px;
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
          color: #94a3b8;
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
          }

          /* Mobile Builder Layout Logic */
          .builder-panel {
            display: flex;
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
            object-fit: contain;
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
            object-fit: contain;
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
          transition: border-color 180ms ease, box-shadow 180ms ease;
        }

        .resume-page .form-group input:focus,
        .resume-page .form-group textarea:focus,
        .resume-page .form-group select:focus {
          border-color: #14b8a6 !important;
          box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.14) !important;
        }

        .resume-page.is-editor-route {
          background: #f1f5f9;
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
          box-shadow: inset 0 1px 0 rgba(15, 23, 42, 0.04);
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

        [data-theme="dark"] .resume-page .form-group input::placeholder,
        [data-theme="dark"] .resume-page .form-group textarea::placeholder {
          color: #94a3b8;
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
