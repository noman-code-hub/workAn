const normalizePdfEndpoint = (value) => {
  const trimmed = (value || '').toString().trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/render-resume-pdf') ? trimmed : `${trimmed}/render-resume-pdf`;
};

const json = (response, status, payload) => {
  response.status(status).json(payload);
};

export default async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    response.setHeader('Allow', 'POST, OPTIONS');
    return response.status(204).end();
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST, OPTIONS');
    return json(response, 405, {
      error: 'Method not allowed',
      message: 'Use POST for the PDF render endpoint.',
    });
  }

  const upstreamUrl = normalizePdfEndpoint(
    process.env.PDF_RENDER_API_BASE
    || process.env.PDF_RENDER_URL
    || process.env.RESUME_PDF_API_BASE
    || ''
  );

  if (!upstreamUrl) {
    return json(response, 503, {
      error: 'PDF service unavailable',
      details: 'PDF_RENDER_API_BASE is not configured on the server.',
    });
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        Accept: request.headers.accept || 'application/pdf',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body || {}),
    });

    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
    const contentType = upstreamResponse.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = upstreamResponse.headers.get('content-disposition');

    response.status(upstreamResponse.status);
    response.setHeader('Content-Type', contentType);
    if (contentDisposition) {
      response.setHeader('Content-Disposition', contentDisposition);
    }
    response.setHeader('Cache-Control', 'no-store');
    response.send(buffer);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'PDF proxy request failed.';
    console.error('PDF proxy error:', details);
    return json(response, 502, {
      error: 'Failed to reach PDF renderer',
      details,
    });
  }
}
