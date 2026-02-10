import { useState } from 'react';

interface JobLogoProps {
    company: string;
}

export const JobLogo = ({ company }: JobLogoProps) => {
    const [error, setError] = useState(false);

    // Heuristic to clean company name for logo matching
    const cleanName = company
        .toLowerCase()
        .replace(/[,.]/g, '')
        .replace(/\s+(inc|llc|ltd|corp|limited|company|co|plc)$/i, '')
        .trim()
        .replace(/\s+/g, '');

    const logoUrl = `https://img.logo.dev/${cleanName}.com?token=pk_SBlNJcPoTuuglyZ5Senvzw`;

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
                src={logoUrl}
                alt={`${company} logo`}
                className="job-company-logo-img"
                onError={() => setError(true)}
            />
        </div>
    );
};
