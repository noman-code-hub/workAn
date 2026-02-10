import express from 'express';
import OpenAI from 'openai';
import admin from 'firebase-admin';
import axios from 'axios';

const router = express.Router();

// Resume-Matcher backend URL
const RESUME_MATCHER_URL = process.env.RESUME_MATCHER_URL || 'http://localhost:8000';

// Initialize OpenAI if key is provided
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

router.post('/analyze-resume', async (req, res) => {
    try {
        const { uid, targetRole, skills, summary, experience, education, jobDescription } = req.body;

        // Construct resume text from structured data
        const resumeText = `
SUMMARY: ${summary || 'Professional seeking opportunities'}

SKILLS: ${Array.isArray(skills) ? skills.join(', ') : skills || ''}

EXPERIENCE: ${experience || 'No experience provided'}

EDUCATION: ${education || 'No education provided'}

TARGET ROLE: ${targetRole || 'General role'}
        `.trim();

        // Call Resume-Matcher for analysis
        let matchAnalysis = null;
        try {
            console.log(`Analyzing resume against Resume-Matcher at ${RESUME_MATCHER_URL}`);

            // Create a temporary text "resume" to analyze
            const formData = new FormData();
            const blob = new Blob([resumeText], { type: 'text/plain' });
            formData.append('resume', blob, 'resume.txt');

            if (jobDescription) {
                formData.append('job_description', jobDescription);
            }

            const matchResponse = await axios.post(
                `${RESUME_MATCHER_URL}/api/v1/match`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            matchAnalysis = matchResponse.data;
        } catch (matchError) {
            console.error('Resume-Matcher analysis failed:', matchError.message);
            // If Resume-Matcher fails, provide a fallback mock analysis
            matchAnalysis = {
                score: 75,
                keywords_matched: skills ? (Array.isArray(skills) ? skills.slice(0, 3) : [skills]) : [],
                missing_skills: ['TypeScript', 'Cloud Computing', 'Agile'],
                summary: 'Analysis unavailable. Using fallback scoring.'
            };
        }

        // Use AI to generate optimized resume if OpenAI is configured
        let aiGeneratedResume = null;
        let aiImprovement = null;

        if (openai) {
            try {
                const prompt = `You are an expert resume writer and career coach.

Below is the user's resume data and analysis from an ATS matching system.

Resume Data:
${resumeText}

Match Analysis:
- Score: ${matchAnalysis.score}/100
- Missing Skills: ${matchAnalysis.missing_skills?.join(', ') || 'None'}
- Matched Keywords: ${matchAnalysis.keywords_matched?.join(', ') || 'None'}
- Target Role: ${targetRole || 'Not specified'}

Task:
1. Generate an improved, ATS-friendly resume summary paragraph
2. Suggest 3-5 concrete improvements to make
3. Recommend skills to add based on the target role

Return a JSON object with:
{
  "improvedSummary": "an engaging 3-4 sentence summary",
  "improvements": ["improvement 1", "improvement 2", ...],
  "recommendedSkills": ["skill 1", "skill 2", ...]
}`;

                const completion = await openai.chat.completions.create({
                    model: "gpt-4",
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" }
                });

                aiImprovement = JSON.parse(completion.choices[0].message.content);
            } catch (aiError) {
                console.error('OpenAI generation failed:', aiError.message);
            }
        }

        // Combine analysis results
        const analysisResult = {
            score: matchAnalysis.score,
            keywords_matched: matchAnalysis.keywords_matched || [],
            missing_skills: matchAnalysis.missing_skills || [],
            summary: matchAnalysis.summary || 'Analysis complete',
            aiImprovement: aiImprovement || {
                improvedSummary: summary || 'Consider adding a compelling professional summary',
                improvements: [
                    'Add quantifiable achievements to your experience',
                    'Include relevant certifications',
                    'Optimize keywords for ATS systems'
                ],
                recommendedSkills: matchAnalysis.missing_skills?.slice(0, 5) || []
            }
        };

        // Save to Firestore
        try {
            await admin.firestore().collection('resume_analyses').add({
                uid,
                targetRole,
                analysis: analysisResult,
                resumeData: {
                    summary,
                    skills,
                    experience,
                    education
                },
                createdAt: new Date(),
            });
        } catch (fsError) {
            console.error('Firestore save failed:', fsError.message);
        }

        res.status(200).json(analysisResult);
    } catch (error) {
        console.error('Resume analysis error:', error);
        res.status(500).json({
            error: 'Failed to analyze resume',
            details: error.message
        });
    }
});

export default router;
