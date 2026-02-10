const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const inputPdf = 'E:/Porfolio/Resume.pdf';
const outputBase = 'resume_pdf_converted';
const outDir = 'c:/Hirevo';
const htmlPath = path.join(outDir, `${outputBase}.html`);
const previewPath = path.join(outDir, `${outputBase}_preview.html`);
const pagePngPath = path.join(outDir, `${outputBase}_page1.png`);
const thumbPngPath = path.join(outDir, `${outputBase}.png`);

const pdfBytes = fs.readFileSync(inputPdf);
const pdfBase64 = pdfBytes.toString('base64');
const pdfjsFileUrl = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.2.67/build/pdf.min.mjs';

const buildHtml = (pages) => {
  const pageMarkup = pages.map((page, index) => {
    return `
    <div class="page" style="width:${page.width}px;height:${page.height}px;">
      <img src="${page.url}" alt="Resume page ${index + 1}" />
    </div>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Resume Template (PDF)</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; font-family: Arial, sans-serif; }
    .page { margin: 0 auto; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .page img { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>
${pageMarkup}
</body>
</html>`;
};

const dataUrlToBuffer = (dataUrl) => {
  const base64 = dataUrl.split(',')[1];
  return Buffer.from(base64, 'base64');
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
  await page.goto('about:blank');
  await page.evaluate(async (url) => {
    // eslint-disable-next-line no-eval
    const pdfjsLib = await import(url);
    window.pdfjsLib = pdfjsLib;
  }, pdfjsFileUrl);
  await page.waitForFunction(() => window.pdfjsLib);

  const renderResult = await page.evaluate(async ({ pdfBase64 }) => {
    // pdfjsLib is exposed by pdfjs-dist build.
    // eslint-disable-next-line no-undef
    const pdfjsLib = window.pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.2.67/build/pdf.worker.min.mjs';
    const data = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
    const loadingTask = pdfjsLib.getDocument({ data, disableWorker: true });
    const pdf = await loadingTask.promise;

    const pages = [];
    let thumb = null;

    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
      const pdfPage = await pdf.getPage(pageIndex);
      const viewport = pdfPage.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      await pdfPage.render({ canvasContext: context, viewport }).promise;
      const url = canvas.toDataURL('image/png');
      pages.push({ url, width: canvas.width, height: canvas.height });

      if (!thumb) {
        const scale = 0.25;
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = Math.round(canvas.width * scale);
        thumbCanvas.height = Math.round(canvas.height * scale);
        const thumbCtx = thumbCanvas.getContext('2d');
        thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
        thumb = thumbCanvas.toDataURL('image/png');
      }
    }

    return { pages, thumb };
  }, { pdfBase64 });

  await browser.close();

  if (!renderResult?.pages?.length) {
    throw new Error('No pages rendered from PDF.');
  }

  const html = buildHtml(renderResult.pages);
  fs.writeFileSync(htmlPath, html, 'utf8');

  // Save first page image for reference
  fs.writeFileSync(pagePngPath, dataUrlToBuffer(renderResult.pages[0].url));
  fs.writeFileSync(thumbPngPath, dataUrlToBuffer(renderResult.thumb));

  // Upload to Supabase
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
  const htmlBuffer = fs.readFileSync(htmlPath);
  const thumbBuffer = fs.readFileSync(thumbPngPath);

  const { error: htmlError } = await supabase
    .storage
    .from('resume_templates')
    .upload(`${outputBase}.html`, htmlBuffer, { contentType: 'text/html', upsert: true });

  if (htmlError) throw htmlError;

  const { error: thumbError } = await supabase
    .storage
    .from('resume_templates')
    .upload(`thumbnails/${outputBase}.png`, thumbBuffer, { contentType: 'image/png', upsert: true });

  if (thumbError) throw thumbError;

  console.log('UPLOADED', {
    html: `resume_templates/${outputBase}.html`,
    thumbnail: `resume_templates/thumbnails/${outputBase}.png`,
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
