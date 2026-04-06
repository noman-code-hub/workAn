import type { Job } from '../types';

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value.trim());

export const resolveApplyLink = (
    job: Partial<Job> & { url?: string; apply_url?: string; redirect_url?: string; applyUrl?: string }
): string | null => {
    const candidates = [
        job.applyUrl,
        job.url,
        job.apply_url,
        job.redirect_url,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim() && isHttpUrl(candidate)) {
            return candidate.trim();
        }
    }

    return null;
};

/**
 * Decides the URL for the Apply button.
 * Uses async checks to find a valid careers page.
 */
export const getApplyLink = async (job: Job): Promise<string> => {
    const directLink = resolveApplyLink(job);
    if (directLink) {
        return directLink;
    }

    // 1. Try Company Careers Pages
    // Guess domain
    const cleanName = job.company.toLowerCase()
        .replace(/[,.]/g, '')
        .replace(/\s+(inc|llc|ltd|corp|limited|company|co|plc)$/i, '')
        .trim()
        .replace(/\s+/g, '');

    // We assume .com, but could try others
    const domain = `${cleanName}.com`;

    const pagesToTry = [
        `https://www.${domain}/careers`,
        `https://www.${domain}/jobs`,
        `https://www.${domain}/join-us`,
        `https://www.${domain}/hire`,
        `https://${domain}/careers`
    ];

    // Try to find a valid page
    for (const url of pagesToTry) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

            const res = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (res.ok) {
                return url;
            }
        } catch (e: unknown) {
            // Silently ignore AbortError from timeout
            if (e instanceof Error && e.name === 'AbortError') {
                continue;
            }
            // Continue for other errors as well
            continue;
        }
    }

    // 2. Fallback to Job Redirect URL
    return '#';
};
