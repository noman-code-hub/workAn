const isPdfUrl = (url: string) => /\.pdf(?:$|[?#])/i.test(url);

const inferFileName = (url: string, fallback = 'resume') => {
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    const lastSegment = pathname.split('/').filter(Boolean).pop();
    return lastSegment ? decodeURIComponent(lastSegment) : fallback;
  } catch {
    return fallback;
  }
};

const revokeLater = (objectUrl: string) => {
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 60_000);
};

export const openResumeFile = async (url: string) => {
  if (!url.trim()) {
    throw new Error('Resume file URL is missing.');
  }

  const shouldPreviewPdf = isPdfUrl(url);
  const previewWindow = shouldPreviewPdf ? window.open('', '_blank') : null;

  try {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      if (url.includes('/storage/v1/object/public/resumes/')) {
        throw new Error('Resume file is missing from Supabase storage. Create the resumes bucket or re-upload the file.');
      }
      throw new Error(`Resume file could not be loaded (${response.status}).`);
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      throw new Error('Resume URL returned an error page instead of a file.');
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const fileName = inferFileName(url);

    if (contentType.includes('pdf') || shouldPreviewPdf) {
      if (previewWindow) {
        previewWindow.opener = null;
        previewWindow.location.href = objectUrl;
      } else {
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
      }
      revokeLater(objectUrl);
      return;
    }

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    revokeLater(objectUrl);
  } catch (error) {
    previewWindow?.close();
    throw error;
  }
};
