import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const GENERATED_DIR = path.join(ROOT, 'generated_resume_templates_html');
const MANIFEST_PATH = path.join(GENERATED_DIR, 'manifest.json');
const THUMBNAILS_DIR = path.join(GENERATED_DIR, 'thumbnails');
const ROOT_ENV_PATH = path.join(ROOT, '.env');
const SERVER_ENV_PATH = path.join(ROOT, 'server', '.env');
const STORAGE_BUCKET = 'resume_templates';
const STORAGE_FOLDERS = ['', 'templates', 'thumbnails', 'previews'];
const REMOVE_CHUNK_SIZE = 100;
const UPSERT_CHUNK_SIZE = 50;

const readEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return {};

  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
};

const chunk = (items, size) => {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
};

const listFolderFiles = async (supabase, folder) => {
  const files = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(folder, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      const isMissingFolder = String(error.message || '').toLowerCase().includes('not found');
      if (isMissingFolder) return [];
      throw error;
    }

    const entries = (data || []).filter((item) => item.id);
    const paths = entries.map((item) => (folder ? `${folder}/${item.name}` : item.name));
    files.push(...paths);

    if (!data || data.length < 100) break;
    offset += 100;
  }

  return files;
};

const removeStorageFiles = async (supabase, paths) => {
  if (!paths.length) return;

  for (const group of chunk(paths, REMOVE_CHUNK_SIZE)) {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(group);
    if (error) throw error;
  }
};

const clearLegacyTemplateRows = async (supabase) => {
  const { data, error } = await supabase.from('resume_templates').select('id');
  if (error) {
    const message = String(error.message || '');
    if (error.code === 'PGRST205' || message.includes('resume_templates')) {
      return { deletedRows: 0, tableMissing: true };
    }
    throw error;
  }

  const ids = (data || []).map((row) => row.id).filter(Boolean);
  if (!ids.length) {
    return { deletedRows: 0, tableMissing: false };
  }

  for (const group of chunk(ids, REMOVE_CHUNK_SIZE)) {
    const deletion = await supabase.from('resume_templates').delete().in('id', group);
    if (deletion.error) throw deletion.error;
  }

  return { deletedRows: ids.length, tableMissing: false };
};

const ensureGeneratedManifest = () => {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Missing generated template manifest at ${MANIFEST_PATH}. Run npm run generate:legacy-html-templates first.`);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error('Generated template manifest is empty.');
  }

  return manifest.map((item) => {
    const htmlPath = path.join(GENERATED_DIR, item.fileName);
    if (!fs.existsSync(htmlPath)) {
      throw new Error(`Missing generated template HTML: ${htmlPath}`);
    }

    const thumbnailPath = path.join(THUMBNAILS_DIR, `${item.slug}.png`);
    return {
      name: item.name,
      slug: item.slug,
      htmlPath,
      htmlStoragePath: `templates/${item.fileName}`,
      thumbnailPath: fs.existsSync(thumbnailPath) ? thumbnailPath : null,
      thumbnailStoragePath: `thumbnails/${item.slug}.png`,
    };
  });
};

const uploadFile = async (supabase, storagePath, localPath, contentType) => {
  const buffer = fs.readFileSync(localPath);
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });

  if (error) throw error;
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
};

const insertLegacyRows = async (supabase, rows) => {
  if (!rows.length) return { insertedRows: 0, tableMissing: false };

  const inserted = [];
  for (const group of chunk(rows, UPSERT_CHUNK_SIZE)) {
    const { data, error } = await supabase.from('resume_templates').insert(group).select('id');
    if (error) {
      const message = String(error.message || '');
      if (error.code === 'PGRST205' || message.includes('resume_templates')) {
        return { insertedRows: 0, tableMissing: true };
      }
      throw error;
    }
    inserted.push(...(data || []));
  }

  return { insertedRows: inserted.length, tableMissing: false };
};

const main = async () => {
  const env = {
    ...readEnvFile(ROOT_ENV_PATH),
    ...readEnvFile(SERVER_ENV_PATH),
  };

  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials. Expected SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY.');
  }

  const generatedTemplates = ensureGeneratedManifest();
  const supabase = createClient(supabaseUrl, supabaseKey);

  const existingStoragePaths = (
    await Promise.all(STORAGE_FOLDERS.map((folder) => listFolderFiles(supabase, folder)))
  ).flat();

  await removeStorageFiles(supabase, Array.from(new Set(existingStoragePaths)));
  const tableCleanup = await clearLegacyTemplateRows(supabase);

  const legacyRows = [];
  const uploadedTemplates = [];

  for (const template of generatedTemplates) {
    const htmlUrl = await uploadFile(supabase, template.htmlStoragePath, template.htmlPath, 'text/html');
    const thumbnailUrl = template.thumbnailPath
      ? await uploadFile(supabase, template.thumbnailStoragePath, template.thumbnailPath, 'image/png')
      : null;

    legacyRows.push({
      name: template.name,
      html_url: htmlUrl,
      css_url: null,
      js_url: null,
      thumbnail_url: thumbnailUrl,
    });

    uploadedTemplates.push({
      name: template.name,
      slug: template.slug,
      htmlStoragePath: template.htmlStoragePath,
      thumbnailStoragePath: template.thumbnailPath ? template.thumbnailStoragePath : null,
    });
  }

  const insertResult = await insertLegacyRows(supabase, legacyRows);

  console.log(JSON.stringify({
    removedStorageFiles: existingStoragePaths.length,
    deletedLegacyRows: tableCleanup.deletedRows,
    legacyTableMissingOnDelete: tableCleanup.tableMissing,
    insertedLegacyRows: insertResult.insertedRows,
    legacyTableMissingOnInsert: insertResult.tableMissing,
    uploadedTemplates,
  }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
