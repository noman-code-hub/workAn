import { mkdir, writeFile } from 'node:fs/promises';
import { buildSitemapEntries, buildSitemapXml, PRIMARY_SITE_URL } from '../lib/sitemap.js';

const outputDir = new URL('../public/', import.meta.url);
const outputFile = new URL('../public/sitemap.xml', import.meta.url);
const buildDate = new Date().toISOString().slice(0, 10);

const entries = await buildSitemapEntries({
  siteUrl: PRIMARY_SITE_URL,
  lastmod: buildDate,
});

const xml = buildSitemapXml(entries);

await mkdir(outputDir, { recursive: true });
await writeFile(outputFile, xml, 'utf8');

console.log(`Generated sitemap with ${entries.length} URLs at public/sitemap.xml`);
