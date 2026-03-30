import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const GENERATED_DIR = path.join(ROOT, 'generated_resume_templates_html');
const SERVER_ENV_PATH = path.join(ROOT, 'server', '.env');
const ROOT_ENV_PATH = path.join(ROOT, '.env');
const SCHEMA_MARKER = 'hirevo-standard-schema-v3';
const STANDARD_SCHEMA_BLOCK = `
<!-- ${SCHEMA_MARKER} -->
<div data-hirevo-standard-schema="v3" style="display:none !important; visibility:hidden; height:0; overflow:hidden;" aria-hidden="true">
  {{full_name}}{{name}}{{title}}{{role}}{{phone}}{{email}}{{location}}{{address}}{{city}}{{portfolio}}{{website}}{{linkedin}}
  {{{summary}}}{{{objective}}}{{education}}{{skills}}{{experience}}
  {{{certifications}}}{{{certifications_text}}}{{{languages}}}{{{languages_text}}}
  {{{awards}}}{{{awards_text}}}{{{achievements}}}{{{achievements_text}}}
  {{{references}}}
  {{reference_primary_name}}{{reference_primary_title}}{{reference_primary_phone}}{{reference_primary_email}}
  {{reference_secondary_name}}{{reference_secondary_title}}{{reference_secondary_phone}}{{reference_secondary_email}}
</div>
`.trim();

const readEnvFile = (filePath) => Object.fromEntries(
  fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    })
);

const buildLocalTemplateMap = () => {
  const candidates = [
    ...fs.readdirSync(ROOT)
      .filter((name) => name.toLowerCase().endsWith('.html'))
      .filter((name) => !/_preview\.html$/i.test(name))
      .filter((name) => name !== 'index.html' && name !== 'pdf_preview.html')
      .map((name) => path.join(ROOT, name)),
    ...fs.readdirSync(GENERATED_DIR)
      .filter((name) => name.toLowerCase().endsWith('.html'))
      .map((name) => path.join(GENERATED_DIR, name)),
  ];

  return new Map(
    candidates.map((fullPath) => [path.basename(fullPath), fullPath])
  );
};

const injectSchema = (html) => {
  if (html.includes(SCHEMA_MARKER)) return html;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${STANDARD_SCHEMA_BLOCK}\n</body>`);
  }
  return `${html}\n${STANDARD_SCHEMA_BLOCK}\n`;
};

const main = async () => {
  const env = fs.existsSync(SERVER_ENV_PATH) ? readEnvFile(SERVER_ENV_PATH) : readEnvFile(ROOT_ENV_PATH);
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials. Expected SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const localTemplateMap = buildLocalTemplateMap();

  const [rootList, templatesList] = await Promise.all([
    supabase.storage.from('resume_templates').list('', { limit: 200 }),
    supabase.storage.from('resume_templates').list('templates', { limit: 200 }),
  ]);

  if (rootList.error && templatesList.error) {
    throw rootList.error || templatesList.error;
  }

  const bucketPaths = [
    ...(rootList.data || [])
      .filter((item) => item.name.toLowerCase().endsWith('.html'))
      .map((item) => item.name),
    ...(templatesList.data || [])
      .filter((item) => item.name.toLowerCase().endsWith('.html'))
      .map((item) => `templates/${item.name}`),
  ];

  const uniqueBucketPaths = Array.from(new Set(bucketPaths));
  const updated = [];

  for (const bucketPath of uniqueBucketPaths) {
    const fileName = bucketPath.split('/').pop() || bucketPath;
    const localPath = localTemplateMap.get(fileName);
    let html = '';

    if (localPath && fs.existsSync(localPath)) {
      html = fs.readFileSync(localPath, 'utf8');
    } else {
      const download = await supabase.storage.from('resume_templates').download(bucketPath);
      if (download.error) throw download.error;
      html = await download.data.text();
    }

    const updatedHtml = injectSchema(html);

    if (localPath && updatedHtml !== html) {
      fs.writeFileSync(localPath, updatedHtml, 'utf8');
    }

    const upload = await supabase.storage
      .from('resume_templates')
      .upload(bucketPath, Buffer.from(updatedHtml, 'utf8'), {
        contentType: 'text/html',
        upsert: true,
      });

    if (upload.error) throw upload.error;

    updated.push({
      bucketPath,
      localPath: localPath || null,
    });
  }

  console.log(JSON.stringify({ updated }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
