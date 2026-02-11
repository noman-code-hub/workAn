const fs = require('fs');
const Mustache = require('mustache');
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const templatePath = 'c:/Hirevo/resume_lorna_editable.html';
const previewPath = 'c:/Hirevo/resume_lorna_editable_preview.html';
const thumbPath = 'c:/Hirevo/resume_lorna_editable.png';
const outputBase = 'resume_lorna_editable';

const placeholderPhoto = [
  'data:image/svg+xml;utf8,',
  "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>",
  "<rect width='100%' height='100%' fill='%23e5e5e5'/>",
  "<circle cx='100' cy='100' r='92' fill='%23ffffff'/>",
  "<text x='50%' y='56%' font-size='52' text-anchor='middle' fill='%23666' font-family='Poppins, Arial'>",
  'LA',
  '</text>',
  '</svg>',
].join('');

const sampleView = {
  name: 'Lorna Alvarado',
  role: 'Marketing Manager',
  location: '123 Anywhere St., Any City, ST 12345',
  email: 'hello@reallygreatsite.com',
  phone: '+123-456-7890',
  website: 'www.reallygreatsite.com',
  photo_url: placeholderPhoto,
  summary:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  hasSummary: true,
  skills: [
    { name: 'Management Skills', level: '85%' },
    { name: 'Creativity', level: '90%' },
    { name: 'Digital Marketing', level: '80%' },
    { name: 'Negotiation', level: '75%' },
    { name: 'Critical Thinking', level: '85%' },
    { name: 'Leadership', level: '88%' },
  ],
  hasSkills: true,
  education: [
    {
      degree: 'Bachelor of Business Management',
      school: 'Wardiere University',
      dates: '2016 - 2020',
      bullets: [],
      hasBullets: false,
    },
    {
      degree: 'Bachelor of Business Management',
      school: 'Wardiere University',
      dates: '2020 - 2023',
      bullets: [],
      hasBullets: false,
    },
  ],
  hasEducation: true,
  experience: [
    {
      role: 'Product Design Manager',
      company: 'Arowwai Industries | 123 Anywhere St., Any City',
      dates: '2020 - 2023',
      bullets: [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc sit amet sem nec risus egestas accumsan.',
      ],
      hasBullets: true,
    },
    {
      role: 'Marketing Manager',
      company: 'Arowwai Industries | 123 Anywhere St., Any City',
      dates: '2019 - 2020',
      bullets: [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc sit amet sem nec risus egestas accumsan.',
      ],
      hasBullets: true,
    },
    {
      role: 'Marketing Manager',
      company: 'Arowwai Industries | 123 Anywhere St., Any City',
      dates: '2017 - 2019',
      bullets: [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc sit amet sem nec risus egestas accumsan.',
      ],
      hasBullets: true,
    },
    {
      role: 'Marketing Manager',
      company: 'Arowwai Industries | 123 Anywhere St., Any City',
      dates: '2016 - 2017',
      bullets: [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc sit amet sem nec risus egestas accumsan.',
      ],
      hasBullets: true,
    },
  ],
  hasExperience: true,
  projects: ['English', 'Spain'],
  hasProjects: true,
  additional:
    'Harumi Kobayashi — Wardiere Inc. / CEO\nPhone: 123-456-7890\nEmail: hello@reallygreatsite.com\n\nBailey Dupont — Wardiere Inc. / CEO\nPhone: 123-456-7890\nEmail: hello@reallygreatsite.com',
  hasAdditional: true,
};

const renderTemplate = () => {
  const template = fs.readFileSync(templatePath, 'utf8');
  const html = Mustache.render(template, sampleView);
  fs.writeFileSync(previewPath, html, 'utf8');
};

const captureThumbnail = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  await page.goto('file:///c:/Hirevo/resume_lorna_editable_preview.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: thumbPath, fullPage: true });
  await browser.close();
};

const uploadToSupabase = async () => {
  const env = Object.fromEntries(
    fs.readFileSync('c:/Hirevo/.env', 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith('#'))
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx), line.slice(idx + 1)];
      })
  );
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase URL or anon key in .env');

  const supabase = createClient(url, key);
  const htmlBuffer = fs.readFileSync(templatePath);
  const thumbBuffer = fs.readFileSync(thumbPath);

  const { error: htmlError } = await supabase.storage
    .from('resume_templates')
    .upload(`${outputBase}.html`, htmlBuffer, { contentType: 'text/html', upsert: true });
  if (htmlError) throw htmlError;

  const { error: thumbError } = await supabase.storage
    .from('resume_templates')
    .upload(`thumbnails/${outputBase}.png`, thumbBuffer, { contentType: 'image/png', upsert: true });
  if (thumbError) throw thumbError;
};

(async () => {
  renderTemplate();
  await captureThumbnail();
  await uploadToSupabase();
  console.log('UPLOADED', {
    html: `resume_templates/${outputBase}.html`,
    thumbnail: `resume_templates/thumbnails/${outputBase}.png`,
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
