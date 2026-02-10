import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Resume-Matcher backend URL
const RESUME_MATCHER_URL = process.env.RESUME_MATCHER_URL || 'http://localhost:8000';

router.post('/upload-resume', upload.single('resume'), async (req, res) => {
    try {
        let filePath;
        let isTempFile = false;

        if (req.file) {
            filePath = path.resolve(req.file.path);
            isTempFile = true;
        } else if (req.body.resumeUrl) {
            // Fetch file from URL
            const url = req.body.resumeUrl;
            console.log(`Fetching resume from URL: ${url}`);
            const response = await axios.get(url, { responseType: 'arraybuffer' });

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

        console.log(`Forwarding resume to Resume-Matcher at ${RESUME_MATCHER_URL}/api/v1/match`);

        const response = await axios.post(`${RESUME_MATCHER_URL}/api/v1/match`, formData, {
            headers: formData.getHeaders(),
        });

        const { score, keywords_matched, missing_skills, summary, resume_metadata } = response.data;

        // Clean up temp file
        if (isTempFile) {
            fs.unlinkSync(filePath);
        }

        // Return full analysis data
        res.json({
            success: true,
            score,
            keywords_matched,
            missing_skills,
            summary,
            resume_metadata // Pass pass-through metadata from Resume-Matcher
        });
    } catch (error) {
        console.error('Error analyzing resume:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
        res.status(500).json({
            error: 'Failed to analyze resume',
            details: error.response?.data || error.message
        });
    }
});

export default router;
