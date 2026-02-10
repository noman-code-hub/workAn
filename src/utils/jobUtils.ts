import type { Job } from '../types';

/**
 * Decides the URL for the Apply button.
 * Uses async checks to find a valid careers page.
 */
export const getApplyLink = async (job: Job): Promise<string> => {
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
        } catch (e: any) {
            // Silently ignore AbortError from timeout
            if (e.name === 'AbortError') {
                continue;
            }
            // Continue for other errors as well
            continue;
        }
    }

    // 2. Fallback to Job Redirect URL
    return job.applyUrl || '#';
};
