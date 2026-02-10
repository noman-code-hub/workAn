import express from 'express';
import axios from 'axios';
const router = express.Router();

// Get SerpApi credentials from environment variables
const SERPAPI_KEY = process.env.SERPAPI_KEY;

// Helper: Parse relative date string (e.g. "3 days ago") to ISO string
const parseRelativeDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString();

    const now = new Date();
    const text = dateStr.toLowerCase();

    try {
        if (text.includes('hour') || text.includes('minute') || text.includes('second') || text.includes('just now')) {
            return now.toISOString();
        }

        const dayMatch = text.match(/(\d+)\s+day/);
        if (dayMatch) {
            const days = parseInt(dayMatch[1]);
            now.setDate(now.getDate() - days);
            return now.toISOString();
        }

        const monthMatch = text.match(/(\d+)\s+month/);
        if (monthMatch) {
            const months = parseInt(monthMatch[1]);
            now.setMonth(now.getMonth() - months);
            return now.toISOString();
        }

        return now.toISOString();
    } catch (e) {
        return new Date().toISOString();
    }
};

// Helper: Parse salary string (e.g. "$50K - $80K a year")
const parseSalary = (salaryStr) => {
    if (!salaryStr) return { min: 0, max: 0, currency: 'USD' };

    const str = salaryStr.toUpperCase().replace(/,/g, '');
    let min = 0, max = 0;

    const matches = str.match(/(\d+(?:\.\d+)?)\s*K?/g);

    if (matches) {
        const numbers = matches.map(m => {
            let val = parseFloat(m.replace('K', ''));
            if (m.includes('K')) val *= 1000;
            return val;
        });

        if (numbers.length >= 2) {
            min = numbers[0];
            max = numbers[1];
        } else if (numbers.length === 1) {
            min = numbers[0];
            max = numbers[0];
        }
    }

    if (str.includes('HOUR') || (min > 0 && min < 200)) {
        min *= 2080;
        max *= 2080;
    }

    if (str.includes('MONTH')) {
        min *= 12;
        max *= 12;
    }

    return { min, max, currency: 'USD' };
};

// Search jobs
router.get('/search', async (req, res) => {
    try {
        const { query, location, page = 1, results_per_page = 10, page_token } = req.query;

        // Check for API credentials
        if (!SERPAPI_KEY) {
            console.error('SERPAPI_KEY is missing in .env file');
            return res.status(500).json({
                success: false,
                error: 'Server configuration error',
                message: 'API credentials missing'
            });
        }

        // Build SerpApi Query
        let q = (query || 'dev').trim();
        const loc = location || '';

        const params = {
            engine: 'google_jobs',
            q: q,
            api_key: SERPAPI_KEY,
        };

        if (loc) {
            params.location = loc;
        }

        // Use token based pagination for google_jobs
        if (page_token && page_token !== 'null' && page_token !== 'undefined') {
            params.next_page_token = page_token;
        }

        console.log('Fetching Google Jobs via SerpApi:', { ...params, api_key: 'HIDDEN' });

        const response = await axios.get('https://serpapi.com/search.json', { params });

        if (response.data.error) {
            console.error('SerpApi Error:', response.data.error);
            return res.status(500).json({ success: false, message: response.data.error });
        }

        const jobsResults = response.data.jobs_results || [];

        console.log(`✅ SerpApi Response: Found ${jobsResults.length} jobs`);

        const transformedJobs = jobsResults.map(job => {
            const salaryRaw = job.detected_extensions?.salary || null;
            const salary = parseSalary(salaryRaw);
            const postedRaw = job.detected_extensions?.posted_at || null;
            const postedDate = parseRelativeDate(postedRaw);

            return {
                id: job.job_id || Math.random().toString(36).substr(2, 9),
                title: job.title,
                company: job.company_name,
                location: job.location,
                description: job.description || 'No description available',
                salary: salary,
                type: job.detected_extensions?.schedule_type || 'Full-time',
                postedDate: postedDate,
                redirect_url: job.apply_options?.[0]?.link || '#',
                applyUrl: job.apply_options?.[0]?.link || '#',
                skills: job.job_highlights?.Qualifications || [],
                requirements: job.job_highlights?.Qualifications || [],
                tags: job.detected_extensions ? Object.keys(job.detected_extensions) : [],
                logoUrl: job.thumbnail || null
            };
        });

        const nextToken = response.data.serpapi_pagination?.next_page_token;

        res.json({
            success: true,
            // Mock count to support "Load More" logic in frontend (keep loading until no token)
            count: nextToken ? 1000 : (jobsResults.length || 0),
            results: transformedJobs,
            next_page_token: nextToken
        });

    } catch (error) {
        console.error('Error fetching jobs:', error.message);
        if (error.response) {
            console.error('API Error Response:', error.response.status, error.response.data);
        } else {
            console.error('Stack:', error.stack);
        }

        res.status(500).json({
            success: false,
            error: 'Failed to fetch jobs',
            message: error.message + (error.response?.data?.error ? `: ${error.response.data.error}` : '')
        });
    }
});

export default router;
