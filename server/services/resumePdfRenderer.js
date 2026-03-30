import puppeteer from 'puppeteer';

const PDF_PAGE_WIDTH_PX = 794;
const PDF_PAGE_HEIGHT_PX = 1123;
const PDF_NAVIGATION_TIMEOUT_MS = 30000;
const PDF_ASSET_TIMEOUT_MS = 15000;

const PDF_VALIDATION_THRESHOLD = {
  hiddenText: 0,
  overflow: 0,
  brokenTables: 0,
  brokenImages: 0,
};

const PUPPETEER_PDF_SAFETY_CSS = `
  @page {
    size: A4;
    margin: 0;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box !important;
    animation: none !important;
    transition: none !important;
  }

  html,
  body {
    margin: 0 !important;
    padding: 0 !important;
    width: ${PDF_PAGE_WIDTH_PX}px !important;
    min-height: ${PDF_PAGE_HEIGHT_PX}px !important;
    overflow: visible !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    forced-color-adjust: none !important;
    color-scheme: light !important;
  }

  body {
    font-size: 12px !important;
    line-height: 1.4 !important;
  }

  .resume-pdf-root,
  .resume-pdf-page,
  .resume-pdf-root *,
  .resume-pdf-page *,
  .resume-pdf-page .resume-preview-page,
  .resume-pdf-page .resume-preview-page-content,
  .resume-pdf-page [data-resume-template-page],
  .resume-pdf-page [data-resume-template-page-content],
  .resume-pdf-page [data-resume-export-page-source] {
    overflow: visible !important;
    max-height: none !important;
  }

  .resume-pdf-page p,
  .resume-pdf-page div,
  .resume-pdf-page span,
  .resume-pdf-page li,
  .resume-pdf-page td,
  .resume-pdf-page th,
  .resume-pdf-page h1,
  .resume-pdf-page h2,
  .resume-pdf-page h3,
  .resume-pdf-page h4,
  .resume-pdf-page h5,
  .resume-pdf-page h6 {
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
    white-space: normal !important;
  }

  .resume-pdf-page table {
    width: 100% !important;
    table-layout: fixed !important;
    border-collapse: collapse !important;
  }

  .resume-pdf-page td,
  .resume-pdf-page th {
    vertical-align: top !important;
  }

  .resume-pdf-page img {
    display: block !important;
    max-width: 100% !important;
    height: auto !important;
    object-fit: cover !important;
  }

  .resume-pdf-page section,
  .resume-pdf-page article,
  .resume-pdf-page table,
  .resume-pdf-page thead,
  .resume-pdf-page tbody,
  .resume-pdf-page tr,
  .resume-pdf-page td,
  .resume-pdf-page th,
  .resume-pdf-page ul,
  .resume-pdf-page ol,
  .resume-pdf-page li,
  .resume-pdf-page figure,
  .resume-pdf-page blockquote {
    break-inside: avoid-page !important;
    page-break-inside: avoid !important;
  }

  @media print {
    html,
    body {
      width: ${PDF_PAGE_WIDTH_PX}px !important;
      min-height: ${PDF_PAGE_HEIGHT_PX}px !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      forced-color-adjust: none !important;
    }
  }
`;

let browserPromise = null;

const sanitizeFilename = (value) => {
  const base = (value || 'Resume').toString().trim() || 'Resume';
  return base.replace(/[^\w.-]+/g, '_');
};

export const ensureHtmlDocument = (html) => {
  const markup = (html || '').toString().trim();
  if (!markup) {
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body></body></html>';
  }

  if (/<!doctype html/i.test(markup) || /<html[\s>]/i.test(markup)) {
    return markup;
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${markup}</body></html>`;
};

const getPdfBrowser = async () => {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: [
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=medium',
      ],
    }).then((browser) => {
      browser.on('disconnected', () => {
        browserPromise = null;
      });

      return browser;
    }).catch((error) => {
      browserPromise = null;
      throw error;
    });
  }

  return browserPromise;
};

const closePdfBrowser = async () => {
  if (!browserPromise) return;

  try {
    const browser = await browserPromise;
    await browser.close();
  } catch {
    // Ignore close failures when recovering from a bad browser session.
  } finally {
    browserPromise = null;
  }
};

const waitForAssets = async (page) => {
  await page.evaluate(async (assetTimeoutMs) => {
    const withTimeout = (promise, timeoutMs) => Promise.race([
      promise,
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);

    const waitFrame = () => new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    const waitForStylesheet = async (link) => {
      const rel = (link.getAttribute('rel') || '').toLowerCase();
      if (!rel.includes('stylesheet')) return;
      if (link.sheet) return;

      await withTimeout(new Promise((resolve) => {
        link.addEventListener('load', () => resolve(), { once: true });
        link.addEventListener('error', () => resolve(), { once: true });
      }), assetTimeoutMs);
    };

    const stylesheetLinks = Array.from(document.querySelectorAll('link[rel]'));
    await Promise.all(stylesheetLinks.map((link) => waitForStylesheet(link)));

    const waitForImage = async (image) => {
      if (!image.complete) {
        await withTimeout(new Promise((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        }), assetTimeoutMs);
      }

      if (typeof image.decode === 'function') {
        await withTimeout(image.decode().catch(() => undefined), assetTimeoutMs);
      }
    };

    const images = Array.from(document.images || []);
    await Promise.all(images.map((image) => waitForImage(image)));

    images.forEach((image) => {
      if (image.complete && image.naturalWidth > 0) return;

      const shell = image.closest('.resume-photo-shell');
      if (shell) {
        image.remove();
        return;
      }

      image.remove();
    });

    if (document.fonts?.ready) {
      await withTimeout(document.fonts.ready.catch(() => undefined), assetTimeoutMs);
    }

    await waitFrame();
    await waitFrame();
  }, PDF_ASSET_TIMEOUT_MS);
};

const validateResumeLayout = async (page) => {
  return page.evaluate(() => {
    const summary = {
      hiddenText: 0,
      overflow: 0,
      brokenTables: 0,
      brokenImages: 0,
    };

    const hasHiddenOverflow = (style) => {
      return ['hidden', 'clip'].includes(style.overflow)
        || ['hidden', 'clip'].includes(style.overflowX)
        || ['hidden', 'clip'].includes(style.overflowY);
    };

    const isVisible = (style) => {
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity || '1') > 0;
    };

    const root = document.querySelector('.resume-pdf-root') || document.body;
    const rootRect = root.getBoundingClientRect();
    const candidates = Array.from(root.querySelectorAll('*'));
    candidates.forEach((element) => {
      const style = getComputedStyle(element);
      if (!isVisible(style)) return;

      const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
      if (text && hasHiddenOverflow(style)) {
        if (element.scrollHeight > element.clientHeight + 1) {
          summary.hiddenText += 1;
        }

        if (element.scrollWidth > element.clientWidth + 1) {
          summary.overflow += 1;
        }
      }

      const rect = element.getBoundingClientRect();
      if (
        rect.width > 0
        && rect.right > rootRect.right + 0.5
        && style.position !== 'fixed'
      ) {
        summary.overflow += 1;
      }

      if (element instanceof HTMLTableElement) {
        const rows = element.querySelectorAll('tr').length;
        if (rows === 0 || element.offsetWidth === 0 || element.offsetHeight === 0) {
          summary.brokenTables += 1;
        }
      }
    });

    Array.from(document.images || []).forEach((image) => {
      if (!image.complete || image.naturalWidth === 0 || image.clientWidth === 0 || image.clientHeight === 0) {
        summary.brokenImages += 1;
      }
    });

    return summary;
  });
};

const assertValidation = (summary) => {
  const violations = Object.entries(PDF_VALIDATION_THRESHOLD)
    .filter(([key, limit]) => (summary?.[key] || 0) > limit)
    .map(([key, limit]) => `${key}:${summary[key]}/${limit}`);

  if (violations.length > 0) {
    throw new Error(`PDF validation failed (${violations.join(', ')})`);
  }
};

export const renderResumePdfWithPuppeteer = async ({ html, filenameBase }) => {
  const renderOnce = async () => {
    const browser = await getPdfBrowser();
    const page = await browser.newPage();

    try {
      page.setDefaultNavigationTimeout(PDF_NAVIGATION_TIMEOUT_MS);
      page.setDefaultTimeout(PDF_NAVIGATION_TIMEOUT_MS);

      await page.setViewport({
        width: PDF_PAGE_WIDTH_PX,
        height: PDF_PAGE_HEIGHT_PX,
        deviceScaleFactor: 1,
      });

      await page.emulateMediaType('print');
      await page.emulateMediaFeatures([
        { name: 'prefers-color-scheme', value: 'light' },
      ]);
      await page.setContent(ensureHtmlDocument(html), {
        waitUntil: ['domcontentloaded', 'load'],
        timeout: PDF_NAVIGATION_TIMEOUT_MS,
      });

      await page.addStyleTag({ content: PUPPETEER_PDF_SAFETY_CSS });
      await waitForAssets(page);

      const validation = await validateResumeLayout(page);
      assertValidation(validation);

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm',
        },
        tagged: true,
      });

      return {
        filename: `${sanitizeFilename(filenameBase)}.pdf`,
        pdfBuffer,
        validation,
      };
    } finally {
      await page.close().catch(() => undefined);
    }
  };

  try {
    return await renderOnce();
  } catch (error) {
    const shouldRetry = /Navigation timeout|Target closed|Session closed|Protocol error/i.test(String(error?.message || error));
    if (!shouldRetry) {
      throw error;
    }

    await closePdfBrowser();
    return renderOnce();
  }
};
