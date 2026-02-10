const fs = require('fs');
const path = require('path');
const Mustache = require('mustache');
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const templatePath = 'c:/Hirevo/resume_pdf_editable.html';
const previewPath = 'c:/Hirevo/resume_pdf_editable_preview.html';
const thumbPath = 'c:/Hirevo/resume_pdf_editable.png';
const outputBase = 'resume_pdf_editable';

const sampleView = {
  name: 'Muhammad Noman',
  role: 'Full Stack Developer',
  location: 'Pakistan',
  email: 'itsnoman.dev@gmail.com',
  phone: '+92 344 1036699',
  github: 'github.com/nomad-code-hub',
  linkedin: 'linkedin.com/in/muhammad-noman',
  website: 'noman.dev',
  summary:
    'Full Stack Developer specializing in web and mobile apps with AI integration. Skilled in building intelligent, performant solutions with modern frameworks and APIs.',
  hasSummary: true,
  skills: [
    'Frontend: React, Next.js, Tailwind CSS, JavaScript, HTML, CSS',
    'Backend: Node.js, Firebase, MongoDB',
    'Mobile Development: React Native',
    'AI Integration: OpenAI API, Python',
    'Other Tools: GitHub, Vercel, Figma, VS Code',
    'Soft Skills: Problem Solving, Communication, Collaboration',
  ],
  hasSkills: true,
  education: [
    {
      degree: 'Software Engineering',
      school: 'University of Swat',
      dates: '2022–2026 | CGPA: 3.66',
      bullets: ['Focused on web and mobile application development.'],
      hasBullets: true,
    },
    {
      degree: 'XII Computer Science',
      school: 'High Secondary School',
      dates: '2022 | 72.5%',
      bullets: [],
      hasBullets: false,
    },
  ],
  hasEducation: true,
  experience: [
    {
      role: 'Web & Mobile Application Developer',
      company: 'Quantum Labs AI',
      dates: 'January 2025 – Present',
      bullets: [
        'Developed and deployed web/mobile apps using React, Next.js, and React Native.',
        'Built AI-powered automation and dashboards for business workflows.',
        'Integrated OpenAI APIs, Firebase, and real-time data services.',
      ],
      hasBullets: true,
    },
    {
      role: 'Office Management',
      company: 'Grace School System',
      dates: 'March 2022 – December 2024',
      bullets: [
        'Managed records, scheduling, and communication between staff and parents.',
      ],
      hasBullets: true,
    },
  ],
  hasExperience: true,
  projects: [
    'RideWave — Vehicle booking platform with real-time tracking and messaging.',
  ],
  hasProjects: true,
  additional: ['Available for freelance and full-time roles.'],
  hasAdditional: true,
};

const renderTemplate = () => {
  const template = fs.readFileSync(templatePath, 'utf8');
  const html = Mustache.render(template, sampleView);
  fs.writeFileSync(previewPath, html, 'utf8');
};

const captureThumbnail = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  await page.goto('file:///c:/Hirevo/resume_pdf_editable_preview.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
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
