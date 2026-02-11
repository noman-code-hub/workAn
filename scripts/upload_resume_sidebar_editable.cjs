const fs = require('fs');
const Mustache = require('mustache');
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const templatePath = 'c:/Hirevo/resume_sidebar_editable.html';
const previewPath = 'c:/Hirevo/resume_sidebar_editable_preview.html';
const thumbPath = 'c:/Hirevo/resume_sidebar_editable.png';
const outputBase = 'resume_sidebar_editable';

const placeholderPhoto = [
  'data:image/svg+xml;utf8,',
  "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>",
  "<rect width='100%' height='100%' fill='%23cfd6df'/>",
  "<circle cx='100' cy='100' r='98' fill='%23e6ebf2'/>",
  "<text x='50%' y='54%' font-size='52' text-anchor='middle' fill='%23606b7a' font-family='Inter, Arial'>",
  'MA',
  '</text>',
  '</svg>',
].join('');

const sampleView = {
  name: 'Mariana Anderson',
  role: 'Marketing Manager',
  location: '123 Anywhere St., Any City',
  email: 'hello@reallygreatsite.com',
  phone: '123-456-7890',
  photo_url: placeholderPhoto,
  summary:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc sit amet sem nec risus egestas accumsan. In enim nunc, tincidunt ut quam eget, luctus sollicitudin neque. Sed leo nisl, semper ac hendrerit a, sollicitudin in arcu.',
  hasSummary: true,
  skills: [
    'UI/UX',
    'Visual Design',
    'Wireframes',
    'Storyboards',
    'User Flows',
    'Process Flows',
  ],
  hasSkills: true,
  education: [
    {
      degree: 'Bachelor of Business Management',
      school: 'Borcelle University',
      dates: '2020 - 2023',
      bullets: [],
      hasBullets: false,
    },
    {
      degree: 'Bachelor of Business Management',
      school: 'Borcelle University',
      dates: '2012 - 2016',
      bullets: [],
      hasBullets: false,
    },
  ],
  hasEducation: true,
  experience: [
    {
      role: 'Marketing Manager',
      company: 'Ginyard International Co. | 123 Anywhere St., Any City',
      dates: '2022 - 2025',
      bullets: [
        'Led multi-channel marketing campaigns with measurable revenue impact.',
        'Managed cross-functional teams to deliver brand and product launches.',
        'Developed quarterly marketing plans aligned with growth targets.',
      ],
      hasBullets: true,
    },
    {
      role: 'Inside Sales Representative',
      company: 'Ginyard International Co. | 123 Anywhere St., Any City',
      dates: '2020 - 2022',
      bullets: [
        'Maintained client pipeline and supported account growth initiatives.',
        'Collaborated with marketing on lead qualification and nurturing.',
      ],
      hasBullets: true,
    },
    {
      role: 'Inside Sales Representative',
      company: 'Ginyard International Co. | 123 Anywhere St., Any City',
      dates: '2018 - 2020',
      bullets: [
        'Supported sales operations and managed customer communications.',
      ],
      hasBullets: true,
    },
  ],
  hasExperience: true,
  languages: ['English', 'Spanish'],
  references: [
    {
      name: 'Harumi Kobayashi',
      title: 'Wardiere Inc. / CEO',
      phone: '123-456-7890',
      email: 'hello@reallygreatsite.com',
    },
    {
      name: 'Bailey Dupont',
      title: 'Wardiere Inc. / CEO',
      phone: '123-456-7890',
      email: 'hello@reallygreatsite.com',
    },
  ],
};

const renderTemplate = () => {
  const template = fs.readFileSync(templatePath, 'utf8');
  const html = Mustache.render(template, sampleView);
  fs.writeFileSync(previewPath, html, 'utf8');
};

const captureThumbnail = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  await page.goto('file:///c:/Hirevo/resume_sidebar_editable_preview.html', { waitUntil: 'networkidle' });
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
