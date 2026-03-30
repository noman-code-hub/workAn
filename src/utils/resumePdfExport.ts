export type ResumePdfContactItem = {
  label: string;
  value: string;
  href?: string;
};

export type ResumePdfEntry = {
  title: string;
  subtitle?: string;
  dates?: string;
  bullets: string[];
};

export type ResumePdfProject = {
  title: string;
};

export type ResumePdfDetail = {
  label: string;
  value: string;
};

export type ResumePdfSectionId =
  | 'summary'
  | 'experience'
  | 'projects'
  | 'education'
  | 'skills'
  | 'custom'
  | 'extra';

export type ResumePdfDocumentData = {
  fullName: string;
  role: string;
  summary: string;
  photoUrl?: string;
  accentColor?: string;
  contactItems: ResumePdfContactItem[];
  experience: ResumePdfEntry[];
  education: ResumePdfEntry[];
  projects: ResumePdfProject[];
  skills: string[];
  languages: string[];
  details: ResumePdfDetail[];
  sectionOrder?: ResumePdfSectionId[];
};

const DEFAULT_ACCENT = '#1d4d8f';
const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1123;

export const RESUME_PDF_CSS = `
  @page {
    size: A4;
    margin: 0;
  }

  :root {
    --resume-page-width: ${PAGE_WIDTH_PX}px;
    --resume-page-min-height: ${PAGE_HEIGHT_PX}px;
    --resume-accent: __ACCENT_COLOR__;
    --resume-accent-soft: rgba(29, 77, 143, 0.08);
    --resume-text: #0f172a;
    --resume-muted: #475569;
    --resume-border: #d7deea;
    --resume-surface: #ffffff;
    --resume-surface-alt: #f8fafc;
    --resume-heading: #0b1f3a;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
    word-wrap: break-word;
    overflow-wrap: break-word;
    animation: none !important;
    transition: none !important;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    width: 100%;
    min-height: 100%;
    background: #eef2f7;
    color: var(--resume-text);
    font-family: "Helvetica Neue", Arial, sans-serif;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body,
  p,
  div,
  span,
  li,
  td,
  th,
  h1,
  h2,
  h3 {
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .resume-pdf-root {
    width: var(--resume-page-width);
    min-height: var(--resume-page-min-height);
    margin: 0 auto;
    background: var(--resume-surface);
  }

  .resume-pdf-page {
    width: var(--resume-page-width);
    min-height: var(--resume-page-min-height);
    margin: 0;
    padding: 44px 48px 52px;
    background: linear-gradient(180deg, rgba(29, 77, 143, 0.06) 0, rgba(29, 77, 143, 0.06) 118px, #ffffff 118px, #ffffff 100%);
    border-top: 14px solid var(--resume-accent);
    overflow: visible;
  }

  .resume-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 28px;
    align-items: start;
    margin-bottom: 28px;
  }

  .resume-header--no-photo {
    grid-template-columns: minmax(0, 1fr);
  }

  .resume-kicker {
    margin: 0 0 10px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--resume-accent);
  }

  .resume-name {
    margin: 0;
    font-size: 38px;
    line-height: 1.02;
    letter-spacing: -0.03em;
    color: var(--resume-heading);
  }

  .resume-role {
    margin: 8px 0 0;
    font-size: 18px;
    line-height: 1.3;
    font-weight: 600;
    color: var(--resume-muted);
  }

  .resume-photo-shell {
    width: 128px;
    height: 128px;
    border-radius: 24px;
    border: 1px solid var(--resume-border);
    background: #e2e8f0;
    overflow: hidden;
  }

  .resume-photo-shell img {
    width: 128px;
    height: 128px;
    display: block;
    object-fit: cover;
  }

  .resume-contact-table,
  .resume-skills-table,
  .resume-detail-table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
  }

  .resume-contact-table {
    margin-top: 18px;
  }

  .resume-contact-row:not(:last-child) td {
    border-bottom: 1px solid rgba(215, 222, 234, 0.75);
  }

  .resume-contact-label {
    width: 110px;
    padding: 8px 12px 8px 0;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--resume-muted);
    vertical-align: top;
  }

  .resume-contact-value {
    padding: 8px 0;
    font-size: 13px;
    color: var(--resume-text);
  }

  .resume-contact-value a {
    color: inherit;
    text-decoration: none;
  }

  .resume-section {
    margin: 0 0 20px;
    overflow: visible;
  }

  .resume-section-heading {
    margin: 0 0 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--resume-border);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--resume-accent);
  }

  .resume-summary-card,
  .resume-entry,
  .resume-project-item {
    background: var(--resume-surface-alt);
    border: 1px solid var(--resume-border);
    border-left: 4px solid var(--resume-accent);
    border-radius: 16px;
  }

  .resume-summary-card {
    padding: 16px 18px;
  }

  .resume-summary-card p {
    margin: 0;
    font-size: 14px;
  }

  .resume-summary-card p + p {
    margin-top: 10px;
  }

  .resume-entry-list,
  .resume-project-list {
    display: grid;
    gap: 12px;
  }

  .resume-entry,
  .resume-project-item {
    padding: 16px 18px;
  }

  .resume-entry-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: start;
  }

  .resume-entry-title {
    margin: 0;
    font-size: 16px;
    line-height: 1.25;
    color: var(--resume-heading);
  }

  .resume-entry-subtitle {
    margin: 3px 0 0;
    font-size: 13px;
    color: var(--resume-muted);
  }

  .resume-entry-dates {
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
    font-weight: 700;
    color: var(--resume-muted);
    text-align: right;
  }

  .resume-bullets {
    margin: 12px 0 0;
    padding: 0 0 0 18px;
    display: grid;
    gap: 6px;
  }

  .resume-bullets li {
    margin: 0;
    padding-left: 2px;
    font-size: 13px;
  }

  .resume-project-item p {
    margin: 0;
    font-size: 14px;
  }

  .resume-skills-table td {
    padding: 10px 12px;
    border: 1px solid var(--resume-border);
    background: #ffffff;
    font-size: 12px;
    vertical-align: top;
  }

  .resume-skills-table td:empty::after {
    content: "";
    display: block;
    min-height: 1em;
  }

  .resume-language-row {
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .resume-language-chip {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid var(--resume-border);
    background: #ffffff;
    font-size: 12px;
    font-weight: 600;
    color: var(--resume-muted);
  }

  .resume-detail-table th,
  .resume-detail-table td {
    padding: 10px 12px;
    border: 1px solid var(--resume-border);
    vertical-align: top;
    text-align: left;
  }

  .resume-detail-table th {
    width: 180px;
    background: rgba(29, 77, 143, 0.04);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--resume-muted);
  }

  .resume-detail-table td {
    background: #ffffff;
    font-size: 13px;
    color: var(--resume-text);
  }

  .resume-empty-state {
    padding: 16px 18px;
    border: 1px dashed var(--resume-border);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.7);
    color: var(--resume-muted);
    font-size: 13px;
  }

  section,
  article,
  table,
  thead,
  tbody,
  tr,
  td,
  th,
  ul,
  ol,
  li,
  figure,
  blockquote {
    break-inside: auto;
    page-break-inside: auto;
  }

  .resume-summary-card,
  .resume-entry,
  .resume-project-item,
  .resume-photo-shell,
  .resume-skills-table tr,
  .resume-detail-table tr {
    break-inside: avoid-page;
    page-break-inside: avoid;
  }

  @media print {
    html,
    body {
      background: #ffffff;
      width: var(--resume-page-width);
      min-height: var(--resume-page-min-height);
    }

    .resume-pdf-root {
      width: var(--resume-page-width);
      min-height: var(--resume-page-min-height);
      margin: 0;
    }

    .resume-pdf-page {
      width: var(--resume-page-width);
      min-height: var(--resume-page-min-height);
      margin: 0;
      box-shadow: none;
    }

    .resume-section-heading {
      break-after: avoid-page;
      page-break-after: avoid;
    }
  }
`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeAttribute = (value: string) => escapeHtml(value).replace(/`/g, '&#96;');

const sanitizeColor = (value?: string) => (
  /^#[0-9a-f]{6}$/i.test((value || '').trim()) ? value!.trim() : DEFAULT_ACCENT
);

const toText = (value: unknown) => (value ?? '').toString().trim();

const renderContactRows = (items: ResumePdfContactItem[]) => {
  if (items.length === 0) {
    return `
      <tr class="resume-contact-row">
        <td class="resume-contact-label">Contact</td>
        <td class="resume-contact-value">Add an email, phone number, or location to complete this resume.</td>
      </tr>
    `;
  }

  return items.map((item) => {
    const label = escapeHtml(item.label);
    const value = escapeHtml(item.value);
    const content = item.href
      ? `<a href="${escapeAttribute(item.href)}">${value}</a>`
      : value;
    return `
      <tr class="resume-contact-row">
        <td class="resume-contact-label">${label}</td>
        <td class="resume-contact-value">${content}</td>
      </tr>
    `;
  }).join('');
};

const renderParagraphs = (text: string) => {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, ' ').trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return '';

  return `
    <div class="resume-summary-card">
      ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
    </div>
  `;
};

const renderEntryList = (entries: ResumePdfEntry[]) => {
  if (entries.length === 0) return '';

  return `
    <div class="resume-entry-list">
      ${entries.map((entry) => {
        const title = escapeHtml(entry.title);
        const subtitle = escapeHtml(toText(entry.subtitle));
        const dates = escapeHtml(toText(entry.dates));
        const bullets = entry.bullets
          .map((bullet) => bullet.trim())
          .filter(Boolean)
          .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
          .join('');

        return `
          <article class="resume-entry">
            <div class="resume-entry-header">
              <div>
                <h3 class="resume-entry-title">${title}</h3>
                ${subtitle ? `<p class="resume-entry-subtitle">${subtitle}</p>` : ''}
              </div>
              ${dates ? `<p class="resume-entry-dates">${dates}</p>` : ''}
            </div>
            ${bullets ? `<ul class="resume-bullets">${bullets}</ul>` : ''}
          </article>
        `;
      }).join('')}
    </div>
  `;
};

const renderProjects = (projects: ResumePdfProject[]) => {
  if (projects.length === 0) return '';

  return `
    <div class="resume-project-list">
      ${projects.map((project) => `
        <article class="resume-project-item">
          <p>${escapeHtml(project.title)}</p>
        </article>
      `).join('')}
    </div>
  `;
};

const chunk = <T,>(items: T[], size: number) => {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
};

const renderSkills = (skills: string[], languages: string[]) => {
  const normalizedSkills = skills.map((skill) => skill.trim()).filter(Boolean);
  const rows = chunk(normalizedSkills, 3);
  if (rows.length === 0 && languages.length === 0) return '';

  const skillsTable = rows.length > 0 ? `
    <table class="resume-skills-table">
      <tbody>
        ${rows.map((row) => `
          <tr>
            ${Array.from({ length: 3 }).map((_, index) => `<td>${escapeHtml(row[index] || '')}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';

  const languageChips = languages
    .map((language) => language.trim())
    .filter(Boolean)
    .map((language) => `<span class="resume-language-chip">${escapeHtml(language)}</span>`)
    .join('');

  return `
    ${skillsTable}
    ${languageChips ? `<div class="resume-language-row">${languageChips}</div>` : ''}
  `;
};

const renderDetails = (details: ResumePdfDetail[]) => {
  if (details.length === 0) return '';

  return `
    <table class="resume-detail-table">
      <tbody>
        ${details.map((detail) => `
          <tr>
            <th>${escapeHtml(detail.label)}</th>
            <td>${escapeHtml(detail.value)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
};

const defaultSectionOrder: ResumePdfSectionId[] = [
  'summary',
  'experience',
  'projects',
  'education',
  'skills',
  'custom',
  'extra',
];

export const buildResumePdfHtml = (data: ResumePdfDocumentData, documentTitle = 'Resume') => {
  const accentColor = sanitizeColor(data.accentColor);
  const fullName = toText(data.fullName) || 'Resume';
  const role = toText(data.role);
  const summary = toText(data.summary);
  const photoUrl = toText(data.photoUrl);
  const contactItems = data.contactItems.filter((item) => toText(item.value));
  const experience = data.experience.filter((entry) => toText(entry.title) || toText(entry.subtitle) || toText(entry.dates) || entry.bullets.length > 0);
  const education = data.education.filter((entry) => toText(entry.title) || toText(entry.subtitle) || toText(entry.dates) || entry.bullets.length > 0);
  const projects = data.projects.filter((project) => toText(project.title));
  const skills = data.skills.filter((skill) => skill.trim().length > 0);
  const languages = data.languages.filter((language) => language.trim().length > 0);
  const details = data.details.filter((detail) => toText(detail.label) && toText(detail.value));
  const sectionOrder = data.sectionOrder && data.sectionOrder.length > 0
    ? [...data.sectionOrder, ...defaultSectionOrder.filter((section) => !data.sectionOrder?.includes(section))]
    : defaultSectionOrder;

  const sectionMarkup = sectionOrder.map((section) => {
    switch (section) {
      case 'summary': {
        const content = renderParagraphs(summary);
        if (!content) return '';
        return `
          <section class="resume-section" data-resume-section="summary">
            <h2 class="resume-section-heading">Professional Summary</h2>
            ${content}
          </section>
        `;
      }
      case 'experience': {
        const content = renderEntryList(experience);
        if (!content) return '';
        return `
          <section class="resume-section" data-resume-section="experience">
            <h2 class="resume-section-heading">Experience</h2>
            ${content}
          </section>
        `;
      }
      case 'projects': {
        const content = renderProjects(projects);
        if (!content) return '';
        return `
          <section class="resume-section" data-resume-section="projects">
            <h2 class="resume-section-heading">Projects</h2>
            ${content}
          </section>
        `;
      }
      case 'education': {
        const content = renderEntryList(education);
        if (!content) return '';
        return `
          <section class="resume-section" data-resume-section="education">
            <h2 class="resume-section-heading">Education</h2>
            ${content}
          </section>
        `;
      }
      case 'skills': {
        const content = renderSkills(skills, languages);
        if (!content) return '';
        return `
          <section class="resume-section" data-resume-section="skills">
            <h2 class="resume-section-heading">Skills</h2>
            ${content}
          </section>
        `;
      }
      case 'custom': {
        const content = renderDetails(details);
        if (!content) return '';
        return `
          <section class="resume-section" data-resume-section="details">
            <h2 class="resume-section-heading">Additional Details</h2>
            ${content}
          </section>
        `;
      }
      case 'extra':
        return '';
      default:
        return '';
    }
  }).join('');

  const css = RESUME_PDF_CSS.replace(/__ACCENT_COLOR__/g, accentColor);
  const headerClass = photoUrl ? 'resume-header' : 'resume-header resume-header--no-photo';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${PAGE_WIDTH_PX}, initial-scale=1" />
    <title>${escapeHtml(documentTitle)}</title>
    <style>${css}</style>
  </head>
  <body>
    <main class="resume-pdf-root" data-resume-pdf-root="true">
      <section class="resume-pdf-page" data-resume-pdf-page="1">
        <header class="${headerClass}">
          <div>
            <p class="resume-kicker">Professional Resume</p>
            <h1 class="resume-name">${escapeHtml(fullName)}</h1>
            ${role ? `<p class="resume-role">${escapeHtml(role)}</p>` : ''}
            <table class="resume-contact-table">
              <tbody>
                ${renderContactRows(contactItems)}
              </tbody>
            </table>
          </div>
          ${photoUrl ? `
            <div class="resume-photo-shell">
              <img src="${escapeAttribute(photoUrl)}" alt="${escapeAttribute(fullName)} profile photo" />
            </div>
          ` : ''}
        </header>
        ${sectionMarkup}
      </section>
    </main>
  </body>
</html>`;
};
