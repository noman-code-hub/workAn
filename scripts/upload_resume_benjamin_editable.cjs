const fs = require('fs');
const Mustache = require('mustache');
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const templatePath = 'c:/Hirevo/resume_benjamin_editable.html';
const previewPath = 'c:/Hirevo/resume_benjamin_editable_preview.html';
const thumbPath = 'c:/Hirevo/resume_benjamin_editable.png';
const outputBase = 'resume_benjamin_editable';

const placeholderPhoto = [
  'data:image/svg+xml;utf8,',
  "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>",
  "<rect width='100%' height='100%' fill='%23e5e5e5'/>",
  "<text x='50%' y='54%' font-size='48' text-anchor='middle' fill='%23666' font-family='Inter, Arial'>",
  'BS',
  '</text>',
  '</svg>',
].join('');

const sampleView = {
  name: 'Benjamin Shah',
  role: 'Mechanical & Mechatronics Engineer',
  location: '123 Anywhere St., Any City',
  phone: '123-456-7890',
  email: 'hello@reallygreatsite.com',
  website: 'www.reallygreatsite.com',
  photo_url: placeholderPhoto,
  summary:
    'Results-oriented Mechanical and Mechatronics Engineer seeking a challenging position to apply expertise in designing and implementing innovative solutions for complex engineering challenges. Proven track record of success in project management, problem-solving, and cross-functional collaboration.',
  hasSummary: true,
  experience: [
    {
      role: 'Mechatronics Engineer',
      company: 'Borcelle Technologies',
      dates: 'Jan 2023 - Present',
      bullets: [
        'Led development of an advanced automation system, achieving a 15% increase in operational efficiency.',
        'Streamlined manufacturing processes, reducing production costs by 10%.',
        'Implemented preventive maintenance strategies, resulting in a 20% decrease in equipment downtime.',
      ],
      hasBullets: true,
    },
    {
      role: 'System Engineer',
      company: 'Arowwai Industries',
      dates: 'Feb 2021 - Dec 2022',
      bullets: [
        'Designed and optimised a robotic control system, realizing a 12% performance improvement.',
        'Coordinated testing and validation, ensuring compliance with industry standards.',
        'Provided technical expertise, contributing to a 15% reduction in system failures.',
      ],
      hasBullets: true,
    },
    {
      role: 'Junior Project Engineer',
      company: 'Salford & Co Manufacturing',
      dates: 'Mar 2020 - Jan 2021',
      bullets: [
        'Managed full lifecycle of a cutting-edge automation project, meeting all milestones.',
        'Conducted feasibility studies and risk assessments, mitigating potential project risks.',
        'Collaborated with clients, leading to a 25% increase in customer satisfaction.',
      ],
      hasBullets: true,
    },
  ],
  hasExperience: true,
  education: [
    {
      degree: 'Bachelor of Mechatronics Engineering with Honours',
      school: 'University of Engineering Excellence',
      dates: 'Aug 2016 - Oct 2019',
      bullets: [
        'Major in Automotive Technology.',
        'Thesis on "Technological Advancements within the current Mechatronics Industry".',
      ],
      hasBullets: true,
    },
    {
      degree: 'Diploma in Mechanical Engineering',
      school: 'Engineering University',
      dates: 'May 2014 - May 2016',
      bullets: [
        'Relevant coursework in Structural Design and Project Management.',
      ],
      hasBullets: true,
    },
  ],
  hasEducation: true,
  additional: [
    'Technical Skills: Mechatronics System Integration, Automotive Engineering Technology, Project Management, Robotics and Automation, CAD for Mechatronics.',
    'Languages: English, Malay, Japan.',
    'Certifications: Professional Engineer (PE) License, Project Management Professional (PMP).',
    'Awards/Activities: Participated in the "Innovation for Tomorrow" community outreach program, promoting STEM education.',
  ],
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
  await page.goto('file:///c:/Hirevo/resume_benjamin_editable_preview.html', { waitUntil: 'networkidle' });
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
