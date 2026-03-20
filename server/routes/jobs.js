import express from 'express';
import { getJobById, searchJobs } from '../services/jobAggregator.js';

const router = express.Router();

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (value == null) return false;
  const text = String(value).toLowerCase().trim();
  return text === '1' || text === 'true' || text === 'yes';
};

const parseNumber = (value, fallback) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num;
};

const parseCommonQuery = (query) => {
  const keyword = String(query.keyword || query.query || query.q || '').trim() || 'software engineer';
  const location = String(query.location || '').trim();
  const remote = parseBoolean(query.remote);
  const salaryMin = Math.max(0, parseNumber(query.salary_min, 0));
  const page = Math.max(1, parseNumber(query.page, 1));
  const limit = Math.min(100, Math.max(1, parseNumber(query.limit, 20)));

  return {
    keyword,
    location,
    remote,
    salaryMin,
    page,
    limit,
  };
};

router.get('/', async (req, res) => {
  try {
    const filters = parseCommonQuery(req.query);
    const data = await searchJobs(filters);

    res.json({
      success: true,
      ...data,
      endpoint: '/api/jobs',
    });
  } catch (error) {
    console.error('Error aggregating jobs:', error?.message || error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs',
      message: error?.message || 'Unknown server error',
    });
  }
});

const handleSearchRoute = async (req, res, endpoint) => {
  try {
    const filters = parseCommonQuery(req.query);
    const data = await searchJobs(filters);

    return res.json({
      success: true,
      count: data.total,
      results: data.results,
      page: data.page,
      totalPages: data.totalPages,
      total: data.total,
      sources: data.sources,
      cached: data.cached,
      endpoint,
    });
  } catch (error) {
    console.error(`Error aggregating jobs for ${endpoint}:`, error?.message || error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs',
      message: error?.message || 'Unknown server error',
    });
  }
};

// Compatibility routes for existing frontend calls.
router.get('/search', async (req, res) => {
  return handleSearchRoute(req, res, '/api/jobs/search');
});

router.get('/market', async (req, res) => {
  return handleSearchRoute(req, res, '/api/jobs/market');
});

router.get('/:jobId', async (req, res) => {
  const { jobId } = req.params;
  let job = getJobById(jobId);

  if (!job && parseBoolean(req.query.refresh)) {
    try {
      const filters = parseCommonQuery(req.query);
      await searchJobs(filters);
      job = getJobById(jobId);
    } catch (error) {
      console.warn(`Failed to refresh job cache for ${jobId}:`, error?.message || error);
    }
  }

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found in cache',
      message:
        'Search for jobs first so details can be cached, or call this endpoint with refresh=true&keyword=...&location=....',
    });
  }

  return res.json({
    success: true,
    job,
  });
});

export default router;
