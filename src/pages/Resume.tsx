import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, AlertCircle, Zap } from 'lucide-react';
import axios, { type AxiosResponse } from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useResumeTemplate } from '../hooks/useResumeTemplate';
import { normalizeFieldKey, renderTemplateWithSchema } from '../services/resumeTemplateRenderer';
import { API_BASE, apiUrl } from '../config/api';
import { AppLoader } from '../components/AppLoader';

const RESUME_VIEW_STORAGE_KEY = 'careerpilot:resume-view';
const RESUME_UPLOAD_TIMEOUT_MS = Number(import.meta.env.VITE_RESUME_UPLOAD_TIMEOUT_MS || 90000);
const A4_HEIGHT_PX = Math.round(297 * (96 / 25.4));

export const Resume = () => {
  const { user } = useAuth();

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
  const [generatedHTML, setGeneratedHTML] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const previewFrameRef = useRef<HTMLDivElement | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const resumeUploadInputRef = useRef<HTMLInputElement | null>(null);
  const previewFontsReadyRef = useRef(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewSize, setPreviewSize] = useState({ width: 800, height: 1100 });
  const [templateStep, setTemplateStep] = useState<'choose' | 'edit'>('choose');
  const [uploadingResume, setUploadingResume] = useState(false);
  const [isFillingDemo, setIsFillingDemo] = useState(false);

  const [activeTemplateFilter, setActiveTemplateFilter] = useState('All templates');
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const resumeViewRestoreRef = useRef(false);
  const [initialResumeReady, setInitialResumeReady] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);

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
  } = useResumeTemplate(user);

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

    return withThumbnails.filter(matches);
  }, [activeTemplateFilter, templates]);

  const totalPreviewPages = useMemo(() => {
    const pages = Math.ceil(previewSize.height / A4_HEIGHT_PX);
    return Math.max(1, pages);
  }, [previewSize.height]);

  const clampedPreviewPage = Math.min(previewPage, totalPreviewPages - 1);
  const scaledPageHeight = Math.round(A4_HEIGHT_PX * previewScale);

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

  const isTemplateSelection = templateStep === 'choose' || !selectedTemplate;

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

    const styles = window.getComputedStyle(frame);
    const paddingX = parseFloat(styles.paddingLeft || '0') + parseFloat(styles.paddingRight || '0');
    const paddingY = parseFloat(styles.paddingTop || '0') + parseFloat(styles.paddingBottom || '0');

    const availableWidth = Math.max(0, frameRect.width - paddingX);
    const availableHeight = Math.max(0, frameRect.height - paddingY);

    const widthScale = availableWidth / contentWidth;
    const heightScale = availableHeight / contentHeight;
    const useWidthOnly = window.innerWidth <= 768 && !showMobilePreview;
    const nextScale = Math.max(0.1, Math.min(useWidthOnly ? widthScale : Math.min(widthScale, heightScale), 1));

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
      { label: 'Full Name', value: contactName, isVisible: showNameField },
      { label: 'Target Role', value: contactRole, isVisible: showRoleField },
    ];
    const missing = requiredFields.filter(
      (field) => field.isVisible && !field.value.trim()
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

  const handleMobileGenerate = async () => {
    setShowMobilePreview(true);
    await handleGenerateResume();
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
  }, [showMobilePreview]);

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

  useEffect(() => {
    previewFontsReadyRef.current = false;
  }, [previewHtml]);

  useEffect(() => {
    setPreviewPage(0);
  }, [previewHtml, totalPreviewPages]);

  useEffect(() => {
    if (!previewHtml) return;
    const iframe = previewIframeRef.current;
    if (!iframe) return;

    let resizeObserver: ResizeObserver | null = null;
    const handleLoad = () => {
      updatePreviewScale();

      const doc = iframe.contentDocument;
      if (!doc) return;

      const target = doc.documentElement || doc.body;
      if (target && 'ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(() => updatePreviewScale());
        resizeObserver.observe(target);
      }

      const images = Array.from(doc.images || []);
      images.forEach((img) => {
        if (img.complete) return;
        img.addEventListener('load', updatePreviewScale, { once: true });
        img.addEventListener('error', updatePreviewScale, { once: true });
      });
    };
    iframe.addEventListener('load', handleLoad);

    if (iframe.contentDocument?.readyState === 'complete') {
      updatePreviewScale();
    }

    return () => {
      iframe.removeEventListener('load', handleLoad);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [previewHtml, updatePreviewScale]);

  useEffect(() => {
    const frame = previewFrameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(() => updatePreviewScale());
    observer.observe(frame);
    return () => observer.disconnect();
  }, [updatePreviewScale]);

  useEffect(() => {
    // Recover from any stale body scroll lock when entering the resume editor.
    document.body.classList.remove('no-scroll');
    return () => {
      document.body.classList.remove('preview-active');
    };
  }, []);

  useEffect(() => {
    if (showMobilePreview) {
      document.body.classList.add('preview-active');
      return () => document.body.classList.remove('preview-active');
    }

    document.body.classList.remove('preview-active');
    return undefined;
  }, [showMobilePreview]);

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


  return (
    <div className={`resume-page ${isTemplateSelection ? 'is-template-mode' : ''}`}>
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
              <p className="subtitle">Create a modern resume with live preview and ready-to-download formats.</p>
              <div className="resume-hero-meta">
                <span>Template: {selectedTemplateLabel}</span>
                <span>{sectionOrder.length} editable sections</span>
                <span>Live preview enabled</span>
              </div>
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
                <div className="resume-topbar-title">Resume Editor</div>
                <div className="resume-topbar-subtitle">{selectedTemplateLabel}</div>
              </div>
              <div className="resume-topbar-center">
                <button type="button" className="resume-topbar-tab is-active">Edit</button>
                <button type="button" className="resume-topbar-tab" disabled>Customize</button>
              </div>
              <div className="resume-topbar-right">
                <button type="button" className="resume-topbar-download" onClick={handleDownloadPDF}>
                  Download
                </button>
              </div>
            </div>
            <div className="card ai-generator-section mt-8">
            <div className="card-header border-b pb-4 mb-6">
              <Zap size={24} className="text-primary" />
              <h2 className="text-2xl font-bold">Resume Builder</h2>
            </div>

            <p className="text-gray-600 mb-6">
              Build your resume with a live preview. Drag sections to reorder and add multiple experiences or education entries.
            </p>

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
                    onClick={handleGenerateResume}
                    className="resume-action-btn primary"
                  disabled={generating}
                >
                  {generating ? 'Refreshing...' : 'Refresh Preview'}
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateStep('choose')}
                  className="resume-action-btn ghost"
                >
                  Change Template
                </button>
              </div>
            </div>

            {templateSourceHtml && templateFields.length === 0 && (
              <div className="text-sm text-gray-500 mb-6">
                This template has no placeholders. Use a dynamic template to enable live editing.
              </div>
            )}

            <div className="resume-builder-grid">
              <div className="builder-panel">
                {isStepMode && currentStepId && (
                  <div className="step-header">
                    <div className="step-header-title">
                      <span className="step-count">Step {currentStepIndex + 1} of {totalSteps}</span>
                      <h3>{{
                        contact: 'Contact',
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
                      contact: 'Contact',
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {showNameField && (
                            <div className="form-group">
                              <label className="block text-sm font-semibold mb-2 text-gray-700">Full Name *</label>
                              <input
                                placeholder="e.g. John Doe"
                                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                              />
                            </div>
                          )}
                          {showRoleField && (
                            <div className="form-group">
                              <label className="block text-sm font-semibold mb-2 text-gray-700">Target Role *</label>
                              <input
                                placeholder="e.g. Software Engineer"
                                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                value={contactRole}
                                onChange={(e) => setContactRole(e.target.value)}
                              />
                            </div>
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
                          {showLocationField && (
                            <div className="form-group">
                              <label className="block text-sm font-semibold mb-2 text-gray-700">Location</label>
                              <input
                                placeholder="City, Country"
                                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                value={contactLocation}
                                onChange={(e) => setContactLocation(e.target.value)}
                              />
                            </div>
                          )}
                          {showPhotoField && (
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
                                        loading="lazy"
                                        decoding="async"
                                        width={48}
                                        height={48}
                                      />
                                    )}
                                    <div className="text-sm text-gray-600">{contactPhotoName || 'No photo selected'}</div>
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
                          )}
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
                          <span className={`section-status ${isComplete ? 'complete' : ''}`}>
                            {isComplete ? 'Completed' : 'In progress'}
                          </span>
                          <span className="section-toggle">{isExpanded ? '▾' : '▸'}</span>
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

                {generateError && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 mt-4">
                    <AlertCircle size={18} />
                    {generateError}
                  </div>
                )}

                {/* Mobile Only: Generate Resume Button */}
                <div className="mt-6 md:hidden">
                  <button
                    type="button"
                    onClick={handleMobileGenerate}
                    className="w-full btn btn-primary py-3 font-bold text-lg shadow-lg"
                  >
                    Generate Resume & Preview
                  </button>
                </div>
              </div>

              <div className={`builder-preview ${showMobilePreview ? 'is-visible' : ''}`}>
                <div className="builder-preview-header">
                  <div className="flex items-center gap-2">
                    {/* Mobile Only: Back Button */}
                    <button
                      onClick={() => setShowMobilePreview(false)}
                      className="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                    </button>
                    <h3 className="text-lg font-semibold">Live Preview</h3>
                  </div>
                  <div className="preview-controls">
                    <div className="preview-pager">
                      <button
                        type="button"
                        className="preview-pager-btn"
                        onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                        disabled={clampedPreviewPage === 0}
                      >
                        ‹
                      </button>
                      <span className="preview-pager-text">
                        {clampedPreviewPage + 1} / {totalPreviewPages}
                      </span>
                      <button
                        type="button"
                        className="preview-pager-btn"
                        onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages - 1, p + 1))}
                        disabled={clampedPreviewPage >= totalPreviewPages - 1}
                      >
                        ›
                      </button>
                    </div>
                    <button
                      onClick={handleDownloadPDF}
                      className="bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-green-700 transition flex items-center gap-2 shadow-md"
                    >
                      <Download size={16} />
                      PDF
                    </button>
                  </div>
                </div>

                <div className="builder-preview-frame" ref={previewFrameRef}>
                  {showMobilePreview && generating && (
                    <div className="mobile-preview-loading" role="status" aria-live="polite">
                      <div className="loading-spinner" />
                      <div className="loading-text">Generating your resume...</div>
                    </div>
                  )}
                  {previewHtml ? (
                    <div
                      className="preview-frame-inner"
                      style={{
                        width: `${scaledPreviewWidth}px`,
                        height: `${scaledPageHeight}px`,
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
                        <div
                          className="preview-page-shift"
                          style={{
                            transform: `translateY(-${clampedPreviewPage * A4_HEIGHT_PX}px)`,
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
                    </div>
                  ) : generateError ? (
                    <div className="text-sm text-red-600 p-6 text-center">
                      {generateError}
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
          </>
        )}
      </div>

      <style>{`
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
           height: auto;
           overflow-y: auto;
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
          gap: var(--spacing-xl);
          padding: 0 24px 32px;
          flex: 1;
          min-height: calc(100vh - 220px);
        }

        .resume-topbar {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 16px;
          padding: 10px 16px;
          margin: 12px 24px 0;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: #ffffff;
          box-shadow: 0 10px 22px -18px rgba(15, 23, 42, 0.35);
        }

        .resume-topbar-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .resume-topbar-title {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
        }

        .resume-topbar-subtitle {
          font-size: 0.85rem;
          color: #64748b;
        }

        .resume-topbar-center {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
        }

        .resume-topbar-tab {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: default;
        }

        .resume-topbar-tab.is-active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .resume-topbar-right {
          display: flex;
          justify-content: flex-end;
        }

        .resume-topbar-download {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 8px 14px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          box-shadow: 0 10px 20px -14px rgba(37, 99, 235, 0.8);
        }

        .resume-topbar-download:hover {
          background: #1d4ed8;
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
          grid-template-columns: minmax(420px, 1.1fr) minmax(360px, 0.9fr);
          gap: var(--spacing-xl);
          align-items: stretch;
          flex: 1;
          min-height: 0;
        }

        .builder-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-width: 0;
          overflow: auto;
          padding-right: 10px;
        }

        .step-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
          position: sticky;
          top: 0;
          z-index: 2;
        }

        .step-header-title {
          display: flex;
          flex-direction: column;
          gap: 4px;
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
          gap: 18px;
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
    </div >
  );
};
