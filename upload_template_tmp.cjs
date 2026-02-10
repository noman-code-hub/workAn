const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = Object.fromEntries(
  fs.readFileSync('.env','utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i), l.slice(i+1)]; })
);
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Missing Supabase URL or anon key in .env');

const supabase = createClient(url, key);
const filePath = 'C:\\Hirevo\\resume_tailwind_editable.html';
const data = fs.readFileSync(filePath);

(async () => {
  const { data: res, error } = await supabase.storage
    .from('resume_templates')
    .upload('resume_tailwind_editable.html', data, { contentType: 'text/html', upsert: true });
  if (error) { console.error('UPLOAD_ERROR', error); process.exit(1); }
  console.log('UPLOADED', res);
})().catch(e => { console.error(e); process.exit(1); });
