import fs from 'node:fs';
import path from 'node:path';
import Mustache from 'mustache';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const GENERATED_DIR = path.join(ROOT, 'generated_resume_templates_html');
const MANIFEST_PATH = path.join(GENERATED_DIR, 'manifest.json');
const PREVIEW_DIR = path.join(GENERATED_DIR, 'previews');
const THUMBNAIL_DIR = path.join(GENERATED_DIR, 'thumbnails');
const shouldUpload = process.argv.includes('--upload');

const placeholderPhoto = [
  'data:image/svg+xml;utf8,',
  "<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'>",
  "<defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>",
  "<stop offset='0%' stop-color='%23e7edf7'/>",
  "<stop offset='100%' stop-color='%23cfd9e8'/>",
  '</linearGradient></defs>',
  "<rect width='100%' height='100%' fill='url(%23g)'/>",
  "<circle cx='160' cy='128' r='64' fill='%23ffffff' opacity='0.85'/>",
  "<path d='M64 288c14-54 56-82 96-82s82 28 96 82' fill='%23ffffff' opacity='0.88'/>",
  "<text x='50%' y='52%' font-size='64' text-anchor='middle' fill='%23505b6f' font-family='Georgia, Arial'>",
  'AW',
  '</text>',
  '</svg>',
].join('');

const buildContactItem = (label, value) => ({
  label,
  label_with_colon: `${label}:`,
  value,
  marker: '•',
  left: label,
  center: '|',
  right: value,
});

const experienceItems = [
  {
    date_range: '2022 - Present',
    company: 'Northstar Creative',
    role: 'Senior Account Manager',
    role_company: 'Senior Account Manager | Northstar Creative',
    bullet: 'Led integrated campaigns for enterprise clients across digital and print channels.',
    bullet_lines: [
      { value: 'Led integrated campaigns for enterprise clients across digital and print channels.' },
      { value: 'Improved client retention by 24% through tighter reporting and stakeholder reviews.' },
      { value: 'Coordinated copy, design, and paid media teams across fast-moving launch cycles.' },
    ],
    bullets: [
      { value: 'Led integrated campaigns for enterprise clients across digital and print channels.' },
      { value: 'Improved client retention by 24% through tighter reporting and stakeholder reviews.' },
      { value: 'Coordinated copy, design, and paid media teams across fast-moving launch cycles.' },
    ],
    has_bullet_lines: true,
    has_bullets: true,
  },
  {
    date_range: '2019 - 2022',
    company: 'Arowwai Industries',
    role: 'Account Consultant',
    role_company: 'Account Consultant | Arowwai Industries',
    bullet: 'Managed multi-channel campaigns and presentation-ready weekly reporting.',
    bullet_lines: [
      { value: 'Managed multi-channel campaigns and presentation-ready weekly reporting.' },
      { value: 'Supported new business proposals, decks, and performance summaries.' },
      { value: 'Partnered with product and content teams to translate strategy into execution.' },
    ],
    bullets: [
      { value: 'Managed multi-channel campaigns and presentation-ready weekly reporting.' },
      { value: 'Supported new business proposals, decks, and performance summaries.' },
      { value: 'Partnered with product and content teams to translate strategy into execution.' },
    ],
    has_bullet_lines: true,
    has_bullets: true,
  },
];

const educationItems = [
  {
    date_range: '2016 - 2020',
    degree: 'Bachelor of Business Administration',
    school: 'Wardiere University',
    highlights: 'Focused on brand strategy, client communications, and campaign planning.',
  },
  {
    date_range: '2020 - 2021',
    degree: 'Professional Certificate in Digital Marketing',
    school: 'Really Great Institute',
    highlights: 'Advanced work in analytics, conversion reporting, and digital channel planning.',
  },
];

const skillsItems = [
  { name: 'Content Planning', label: 'Content Planning', value: 'Expert', marker: '90%' },
  { name: 'Graphic Design', label: 'Graphic Design', value: 'Advanced', marker: '84%' },
  { name: 'Market Strategy', label: 'Market Strategy', value: 'Advanced', marker: '88%' },
  { name: 'Project Leadership', label: 'Project Leadership', value: 'Expert', marker: '91%' },
];

const languagesItems = [
  { name: 'English', label: 'English', value: 'Fluent' },
  { name: 'Spanish', label: 'Spanish', value: 'Professional Working' },
];

const contactItems = [
  buildContactItem('Phone', '+123-456-7890'),
  buildContactItem('Email', 'hello@reallygreatsite.com'),
  buildContactItem('Website', 'www.reallygreatsite.com'),
  buildContactItem('Location', 'Lahore, Pakistan'),
];

const additionalItems = [
  { value: 'Google Analytics Certification' },
  { value: 'Meta Media Planning Certification' },
];

const customDetailItems = [
  {
    label: 'Achievements',
    label_with_colon: 'Achievements:',
    value: 'Exceeded quarterly retention goals for three consecutive review cycles.',
  },
  {
    label: 'Awards',
    label_with_colon: 'Awards:',
    value: 'Recognized as Client Partner of the Year in 2024.',
  },
];

const headerContactRows = [
  {
    left: 'hello@reallygreatsite.com',
    center: '|',
    right: '+123-456-7890',
    value: 'hello@reallygreatsite.com | +123-456-7890',
  },
  {
    left: 'www.reallygreatsite.com',
    center: '|',
    right: 'Lahore, Pakistan',
    value: 'www.reallygreatsite.com | Lahore, Pakistan',
  },
];

const sampleView = {
  first_name: 'Amelia',
  last_name: 'Wilson',
  full_name: 'Amelia Wilson',
  title: 'Account Manager',
  role: 'Account Manager',
  photo_url: placeholderPhoto,
  summary:
    'Results-driven account manager with experience leading campaigns, building client trust, and turning strategy into polished execution across digital, brand, and content teams.',
  skills_text: 'Content Planning, Graphic Design, Market Strategy, Project Leadership',
  certifications_text:
    'Google Analytics Certification\nMeta Media Planning Certification\nHubSpot Content Marketing Certification',
  contact_line: 'hello@reallygreatsite.com | +123-456-7890 | Lahore, Pakistan',
  website_line: 'www.reallygreatsite.com',
  summary_heading: 'Profile',
  profile_heading: 'Profile',
  about_heading: 'About',
  about_myself_heading: 'About Myself',
  career_summary_heading: 'Career Summary',
  experience_heading: 'Work Experience',
  minimalist_experience_heading: 'Experience',
  education_heading: 'Education',
  skills_heading: 'Skills',
  additional_heading: 'Additional Information',
  additional_skills_heading: 'Additional Skills',
  awards_heading: 'Achievements',
  language_heading: 'Languages',
  contact_heading: 'Contact',
  contacts_heading: 'Contacts',
  custom_heading: 'Highlights',
  certifications_heading: 'Certifications',
  references_heading: 'References',
  reference_heading: 'Reference',
  reference_phone_label: 'Phone',
  reference_email_label: 'Email',
  reference_primary_name: 'Harumi Kobayashi',
  reference_primary_title: 'Creative Director, Wardiere Inc.',
  reference_primary_phone: '+123-456-7890',
  reference_primary_email: 'harumi@reallygreatsite.com',
  reference_secondary_name: 'Bailey Dupont',
  reference_secondary_title: 'Marketing Lead, Arowwai Industries',
  reference_secondary_phone: '+123-456-7890',
  reference_secondary_email: 'bailey@reallygreatsite.com',
  experience: experienceItems,
  education: educationItems,
  skills: skillsItems,
  languages: languagesItems,
  contact: contactItems,
  additional: additionalItems,
  custom_details: customDetailItems,
  experience_items: experienceItems,
  education_items: educationItems,
  skills_items: skillsItems,
  languages_items: languagesItems,
  contact_items: contactItems,
  sidebar_contact_items: contactItems,
  additional_items: additionalItems,
  custom_detail_items: customDetailItems,
  header_contact_rows: headerContactRows,
  hasSummary: true,
  hasExperience: true,
  hasEducation: true,
  hasSkills: true,
  has_experience_items: true,
  has_education_items: true,
  has_skills_items: true,
  has_languages_items: true,
  has_contact_items: true,
  has_sidebar_contact_items: true,
  has_additional_items: true,
  has_custom_detail_items: true,
  has_header_contact_rows: true,
};

const ensureDir = (dirPath) => fs.mkdirSync(dirPath, { recursive: true });

const readEnv = () => Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx), line.slice(idx + 1)];
    })
);

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

const renderPreviewHtml = (templatePath) => {
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  return Mustache.render(templateSource, sampleView);
};

const renderThumbnails = async () => {
  ensureDir(PREVIEW_DIR);
  ensureDir(THUMBNAIL_DIR);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1100, height: 1500 },
    deviceScaleFactor: 1,
  });

  const outputs = [];

  try {
    for (const item of manifest) {
      const templatePath = path.join(GENERATED_DIR, item.fileName);
      const previewPath = path.join(PREVIEW_DIR, item.fileName);
      const thumbnailPath = path.join(THUMBNAIL_DIR, `${item.slug}.png`);
      const html = renderPreviewHtml(templatePath);

      fs.writeFileSync(previewPath, html, 'utf8');

      await page.goto(`file:///${previewPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.legacy-template-page');
      await page.waitForTimeout(400);
      await page.locator('.legacy-template-page').screenshot({ path: thumbnailPath, type: 'png' });

      outputs.push({
        slug: item.slug,
        previewPath,
        thumbnailPath,
      });
    }
  } finally {
    await browser.close();
  }

  return outputs;
};

const uploadThumbnails = async (items) => {
  const env = readEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  }

  const supabase = createClient(url, key);

  for (const item of items) {
    const thumbBuffer = fs.readFileSync(item.thumbnailPath);
    const { error } = await supabase.storage
      .from('resume_templates')
      .upload(`thumbnails/${item.slug}.png`, thumbBuffer, { contentType: 'image/png', upsert: true });

    if (error) {
      throw error;
    }
  }
};

const main = async () => {
  const outputs = await renderThumbnails();

  if (shouldUpload) {
    await uploadThumbnails(outputs);
  }

  console.log(JSON.stringify(outputs, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
