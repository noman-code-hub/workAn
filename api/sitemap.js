import { buildSitemapEntries, buildSitemapXml, PRIMARY_SITE_URL } from '../lib/sitemap.js';

export default async function handler(_request, response) {
  const entries = await buildSitemapEntries({
    siteUrl: PRIMARY_SITE_URL,
    lastmod: new Date().toISOString().slice(0, 10),
  });

  const xml = buildSitemapXml(entries);

  response.setHeader('Content-Type', 'application/xml; charset=utf-8');
  response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  response.status(200).send(xml);
}
