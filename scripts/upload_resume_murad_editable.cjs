const fs = require('fs');
const Mustache = require('mustache');
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const templatePath = 'c:/Hirevo/resume_murad_editable.html';
const previewPath = 'c:/Hirevo/resume_murad_editable_preview.html';
const thumbPath = 'c:/Hirevo/resume_murad_editable.png';
const outputBase = 'resume_murad_editable';

const placeholderPhoto = [
  'data:image/svg+xml;utf8,',
  "<svg xmlns='http://www.w3.org/2000/svg' width='360' height='420'>",
  "<rect width='100%' height='100%' fill='%23303030'/>",
  "<rect width='100%' height='100%' fill='url(%23g)'/>",
  "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>",
  "<stop offset='0' stop-color='%23303030'/>",
  "<stop offset='1' stop-color='%23444444'/>",
  '</linearGradient></defs>',
  "<text x='50%' y='54%' font-size='64' text-anchor='middle' fill='%23ffffff' font-family='Poppins, Arial'>",
  'MAK',
  '</text>',
  '</svg>',
].join('');

const sampleView = {
  name: 'Murad Ali Khan',
  role: 'Registered Nurse',
  photo_url: placeholderPhoto,
  summary:
    'Dedicated and compassionate nursing graduate with a BSN degree. Experienced in delivering patient-centered care with strong clinical skills. Currently completing a hands-on internship to build professional expertise and enhance patient outcomes. A quick learner with excellent communication and time-management abilities.',
  hasSummary: true,
  skills: [
    'Patient-Centered Care',
    'Medication Administration',
    'Vital Signs Monitoring',
    'Infection Control',
    'Clinical Documentation',
    'Communication & Teamwork',
    'Time Management',
    'Emergency Response',
  ],
  hasSkills: true,
  projects: ['English', 'Urdu', 'Pashto'],
  hasProjects: true,
  education: [
    {
      degree: 'Bachelor of Science in Nursing',
      school: 'King College of Nursing',
      dates: '2020 - 2024',
      bullets: [],
      hasBullets: false,
    },
    {
      degree: 'F.Sc. Pre-Medical',
      school: 'Higher Secondary School',
      dates: '2017 - 2019',
      bullets: [],
      hasBullets: false,
    },
  ],
  hasEducation: true,
  experience: [
    {
      role: 'Nursing Intern',
      company: 'Saidu Group of Teaching Hospitals - Swat',
      dates: '2025 - Present',
      bullets: [
        'Deliver direct patient care under supervision in medical and surgical wards.',
        'Administer IVs, oral medications, and injections as per protocols.',
      ],
      hasBullets: true,
    },
    {
      role: 'Clinical Rotations',
      company: 'King College of Nursing',
      dates: '2021 - 2023',
      bullets: [
        'Completed rotations in medical, surgical, pediatric, and ICU/CCU units.',
        'Gained hands-on experience in patient assessment and care delivery.',
      ],
      hasBullets: true,
    },
  ],
  hasExperience: true,
  phone: '0347-9417316',
  email: 'alikhanmurad157@gmail.com',
  website: 'www.muradkhan.com',
  location: 'Shali Bagh Damghar Kanju, Tehsil Kabal',
};

const renderTemplate = () => {
  const template = fs.readFileSync(templatePath, 'utf8');
  const html = Mustache.render(template, sampleView);
  fs.writeFileSync(previewPath, html, 'utf8');
};

const captureThumbnail = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  await page.goto('file:///c:/Hirevo/resume_murad_editable_preview.html', { waitUntil: 'networkidle' });
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
