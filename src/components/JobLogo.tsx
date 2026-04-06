import { useState } from 'react';

interface JobLogoProps {
    company: string;
    logoUrl?: string | null;
}

export const JobLogo = ({ company, logoUrl }: JobLogoProps) => {
    const [error, setError] = useState(false);

    // Heuristic to clean company name for logo matching
    const cleanName = company
        .toLowerCase()
        .replace(/[,.]/g, '')
        .replace(/\s+(inc|llc|ltd|corp|limited|company|co|plc)$/i, '')
        .trim()
        .replace(/\s+/g, '');

    const fallbackLogoUrl = `https://img.logo.dev/${cleanName}.com?token=pk_SBlNJcPoTuuglyZ5Senvzw`;
    const resolvedLogoUrl = logoUrl || fallbackLogoUrl;

    if (error) {
        return (
            <div className="job-company-logo fallback">
                {company.charAt(0)}
            </div>
        );
    }

    return (
        <div className="job-company-logo">
            <img
                src={resolvedLogoUrl}
                alt={`${company} logo`}
                className="job-company-logo-img"
                loading="lazy"
                decoding="async"
                width={56}
                height={56}
                onError={() => setError(true)}
            />
        </div>
    );
};
