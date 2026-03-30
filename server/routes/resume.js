import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
const RESUME_STORAGE_ROOT = path.resolve('uploads', 'resumes');

const ensureDirectory = (targetPath) => {
    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
    }
};

const sanitizePathPart = (value, fallback) => {
    const sanitized = (value || '')
        .toString()
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return sanitized || fallback;
};

const persistedResumeStorage = multer.diskStorage({
    destination: (req, _file, callback) => {
        const userId = sanitizePathPart(req.body.userId, 'anonymous');
        const targetDir = path.join(RESUME_STORAGE_ROOT, userId);
        ensureDirectory(targetDir);
        callback(null, targetDir);
    },
    filename: (_req, file, callback) => {
        const originalExt = path.extname(file.originalname || '').toLowerCase();
        const safeExt = ['.pdf', '.doc', '.docx'].includes(originalExt) ? originalExt : '.bin';
        const baseName = sanitizePathPart(path.basename(file.originalname || 'resume', originalExt), 'resume');
        callback(null, `${Date.now()}_${baseName}${safeExt}`);
    },
});

const persistResumeUpload = multer({
    storage: persistedResumeStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
});

// Resume-Matcher backend URL
const RESUME_MATCHER_URL = process.env.RESUME_MATCHER_URL || 'http://localhost:8000';
const RESUME_MATCH_TIMEOUT_MS = Number(process.env.RESUME_MATCH_TIMEOUT_MS || 90000);
const RESUME_MATCH_HEALTH_TIMEOUT_MS = Number(process.env.RESUME_MATCH_HEALTH_TIMEOUT_MS || 4000);

const isResumeMatcherReachable = async () => {
    const healthUrls = [
        `${RESUME_MATCHER_URL}/health`,
        `${RESUME_MATCHER_URL}/docs`,
    ];

    for (const url of healthUrls) {
        try {
            await axios.get(url, { timeout: RESUME_MATCH_HEALTH_TIMEOUT_MS });
            return true;
        } catch {
            // Try next URL
        }
    }

    return false;
};

const fetchStructuredResumeMetadata = async (filePath) => {
    const uploadForm = new FormData();
    uploadForm.append('file', fs.createReadStream(filePath));

    const uploadResponse = await axios.post(`${RESUME_MATCHER_URL}/api/v1/resumes/upload`, uploadForm, {
        headers: uploadForm.getHeaders(),
        timeout: RESUME_MATCH_TIMEOUT_MS,
    });

    const resumeId = uploadResponse?.data?.resume_id;
    if (!resumeId) return null;

    const fetchResponse = await axios.get(`${RESUME_MATCHER_URL}/api/v1/resumes`, {
        params: { resume_id: resumeId },
        timeout: RESUME_MATCH_TIMEOUT_MS,
    });

    return fetchResponse?.data?.data?.processed_resume || null;
};

router.post('/store-resume', persistResumeUpload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No resume file provided.' });
        }

        const relativePath = path.relative(path.resolve('uploads'), req.file.path).replace(/\\/g, '/');
        const publicUrl = `${req.protocol}://${req.get('host')}/uploads/${relativePath}`;

        return res.json({
            success: true,
            publicUrl,
            fileName: req.file.filename,
        });
    } catch (error) {
        console.error('Error storing uploaded resume:', error?.message || error);
        return res.status(500).json({
            error: 'Failed to store uploaded resume.',
            details: error?.message || 'Unknown error',
        });
    }
});

router.post('/upload-resume', upload.single('resume'), async (req, res) => {
    let filePath;
    let isTempFile = false;

    try {
        if (req.file) {
            filePath = path.resolve(req.file.path);
            isTempFile = true;
        } else if (req.body.resumeUrl) {
            // Fetch file from URL
            const url = req.body.resumeUrl;
            console.log(`Fetching resume from URL: ${url}`);
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: RESUME_MATCH_TIMEOUT_MS,
            });

            // Create a temp file for the downloaded content
            const tempFileName = `temp_${Date.now()}_resume`;
            filePath = path.resolve('uploads', tempFileName);
            fs.writeFileSync(filePath, response.data);
            isTempFile = true;
        } else {
            return res.status(400).json({ error: 'No resume file or URL provided' });
        }

        const formData = new FormData();
        formData.append('resume', fs.createReadStream(filePath));

        if (req.body.jobDescription) {
            formData.append('job_description', req.body.jobDescription);
        }

        const matcherReady = await isResumeMatcherReachable();
        if (!matcherReady) {
            return res.status(200).json({
                success: false,
                parser_unavailable: true,
                message: 'Resume parser service is not reachable. Continuing without auto-fill.',
                details: `Start Resume-Matcher at ${RESUME_MATCHER_URL} and try again.`,
                score: null,
                keywords_matched: [],
                missing_skills: [],
                summary: '',
                resume_metadata: {},
            });
        }

        let structuredMetadata = null;
        try {
            structuredMetadata = await fetchStructuredResumeMetadata(filePath);
        } catch (metadataError) {
            console.warn('Structured resume metadata fetch failed:', metadataError?.message || metadataError);
        }

        console.log(`Forwarding resume to Resume-Matcher at ${RESUME_MATCHER_URL}/api/v1/match`);

        const response = await axios.post(`${RESUME_MATCHER_URL}/api/v1/match`, formData, {
            headers: formData.getHeaders(),
            timeout: RESUME_MATCH_TIMEOUT_MS,
        });

        const { score, keywords_matched, missing_skills, summary, resume_metadata } = response.data;
        const mergedMetadata = structuredMetadata || resume_metadata || {};

        // Return full analysis data
        res.json({
            success: true,
            score,
            keywords_matched,
            missing_skills,
            summary,
            resume_metadata: mergedMetadata,
        });
    } catch (error) {
        console.error('Error analyzing resume:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
        const timedOut = error?.code === 'ECONNABORTED' || String(error?.message || '').toLowerCase().includes('timeout');
        res.status(timedOut ? 504 : 500).json({
            error: timedOut ? 'Resume parsing timed out. Please retry.' : 'Failed to analyze resume',
            details: error.response?.data || error.message
        });
    } finally {
        if (isTempFile && filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (cleanupError) {
                console.error('Failed to clean up temp resume file:', cleanupError?.message || cleanupError);
            }
        }
    }
});

export default router;
