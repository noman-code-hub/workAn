const fs = require('fs');
const Mustache = require('mustache');
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const templatePath = 'c:/Hirevo/resume_professional_editable.html';
const previewPath = 'c:/Hirevo/resume_professional_editable_preview.html';
const thumbPath = 'c:/Hirevo/resume_professional_editable.png';
const outputBase = 'resume_professional_editable';

const placeholderPhoto = [
  'data:image/svg+xml;utf8,',
  "<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>",
  "<rect width='100%' height='100%' fill='%23e9ecef'/>",
  "<text x='50%' y='54%' font-size='48' text-anchor='middle' fill='%236c757d' font-family='Inter, Arial'>",
  'MA',
  '</text>',
  '</svg>',
].join('');

const sampleView = {
  name: 'Murad Ali Khan',
  role: 'Nurse',
  location: 'Shali Bagh Damghar Kanju, Tehsil Kabal',
  email: 'alikhanmurad157@gmail.com',
  phone: '0347-9417316',
  photo_url: placeholderPhoto,
  summary:
    'Dedicated and compassionate nursing graduate with a BSN degree. Experienced in delivering patient-centered care with strong clinical skills. Currently completing a hands-on internship to build professional expertise and enhance patient outcomes. A quick learner with excellent communication and time-management abilities.',
  hasSummary: true,
  skills: [
    'Patient-Centered Care',
    'Medication Administration',
    'Vital Signs Monitoring',
    'Infection Control Procedures',
    'Clinical Documentation',
    'Communication & Teamwork',
    'Time Management',
    'Basic Computer Skills',
  ],
  hasSkills: true,
  education: [
    {
      degree: 'F.Sc. Pre-Medical',
      school: 'Higher Secondary School',
      dates: '2017 – 2019',
      bullets: [],
      hasBullets: false,
    },
    {
      degree: 'Bachelor of Science in Nursing',
      school: 'King College of Nursing',
      dates: '2020 – 2024',
      bullets: [],
      hasBullets: false,
    },
  ],
  hasEducation: true,
  experience: [
    {
      role: 'Nursing Intern',
      company: 'Saidu Group of Teaching Hospitals – Swat',
      dates: '2025 – Present',
      bullets: [
        'Deliver direct patient care under supervision in medical and surgical wards.',
        'Administer IVs, oral medications, and injections as per protocols.',
        'Assist in wound dressing, catheter insertion, and hygiene care.',
        'Record and monitor patient vital signs using standard equipment.',
        'Coordinate with nurses and doctors during patient rounds.',
        'Maintain accurate and timely patient documentation.',
      ],
      hasBullets: true,
    },
    {
      role: 'Clinical Rotations – Nursing Student',
      company: 'King College of Nursing',
      dates: '2021 – 2023',
      bullets: [
        'Medical Ward: Observed patient care procedures and shadowed senior nurses.',
        'Surgical Ward: Assisted with pre-op and post-op patient care.',
        'Pediatrics: Supported child patients and communicated with guardians.',
        'ICU/CCU Exposure: Gained insight into intensive care procedures and emergency responses.',
      ],
      hasBullets: true,
    },
  ],
  hasExperience: true,
};

const renderTemplate = () => {
  const template = fs.readFileSync(templatePath, 'utf8');
  const html = Mustache.render(template, sampleView);
  fs.writeFileSync(previewPath, html, 'utf8');
};

const captureThumbnail = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  await page.goto('file:///c:/Hirevo/resume_professional_editable_preview.html', { waitUntil: 'networkidle' });
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
