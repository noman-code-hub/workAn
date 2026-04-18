import express from 'express';
import multer from 'multer';
import admin from 'firebase-admin';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { analyzeResumeFile, analyzeResumeText } from '../services/atsResumeChecker.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/analyze-resume', upload.single('resume'), async (req, res) => {
    let filePath = '';
    let shouldDeleteTempFile = false;

    try {
        const {
            uid,
            targetRole,
            skills,
            summary,
            experience,
            education,
            jobDescription = '',
            resumeText: directResumeText = '',
            resumeUrl = '',
        } = req.body;

        let report;
        if (req.file?.path) {
            filePath = path.resolve(req.file.path);
            shouldDeleteTempFile = true;
            report = await analyzeResumeFile({
                filePath,
                originalName: req.file.originalname || req.file.filename,
                jobDescription,
            });
        } else if (resumeUrl) {
            const response = await axios.get(resumeUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
            });
            const tempFileName = `ats_${Date.now()}${path.extname(resumeUrl.split('?')[0] || '.pdf') || '.pdf'}`;
            filePath = path.resolve('uploads', tempFileName);
            fs.writeFileSync(filePath, response.data);
            shouldDeleteTempFile = true;
            report = await analyzeResumeFile({
                filePath,
                originalName: path.basename(tempFileName),
                jobDescription,
            });
        } else {
            const resumeText = directResumeText || `
SUMMARY: ${summary || 'Not provided'}

SKILLS: ${Array.isArray(skills) ? skills.join(', ') : skills || 'Not provided'}

EXPERIENCE: ${experience || 'Not provided'}

EDUCATION: ${education || 'Not provided'}

TARGET ROLE: ${targetRole || 'Not provided'}
            `.trim();

            report = await analyzeResumeText({
                resumeText,
                jobDescription,
            });
        }

        // Save to Firestore
        try {
            await admin.firestore().collection('resume_analyses').add({
                uid,
                targetRole,
                analysis: report,
                resumeData: {
                    summary,
                    skills,
                    experience,
                    education,
                    jobDescription,
                },
                createdAt: new Date(),
            });
        } catch (fsError) {
            console.error('Firestore save failed:', fsError.message);
        }

        res.status(200).json(report);
    } catch (error) {
        console.error('Resume analysis error:', error);
        res.status(500).json({
            error: 'Failed to analyze resume',
            details: error.message
        });
    } finally {
        if (shouldDeleteTempFile && filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (cleanupError) {
                console.error('Failed to clean up temp ATS file:', cleanupError?.message || cleanupError);
            }
        }
    }
});

export default router;
