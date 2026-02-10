import express from 'express';
import OpenAI from 'openai';
import admin from 'firebase-admin';

const router = express.Router();

// Only initialize OpenAI if the key is provided
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

router.post('/generate-career-advice', async (req, res) => {
    try {
        const { uid, currentRole, skills, experience, education } = req.body;

        if (!openai) {
            console.warn('OpenAI API key not configured. Returning mock advice.');
            const mockAdvice = {
                nextRoles: ["Full Stack Developer", "UI Engineer", "React Native Developer"],
                skillsToLearn: ["Node.js", "Next.js", "TypeScript"],
                timeline: "6-8 months to reach mid-level developer",
                summary: "You’re on the right track. (MOCK DATA - Add OpenAI Key to .env to see real AI advice)"
            };

            // Try to save to Firestore if admin is initialized
            try {
                await admin.firestore().collection("career_recommendations").add({
                    uid,
                    currentRole,
                    skills,
                    experience,
                    education,
                    aiRecommendations: mockAdvice,
                    createdAt: new Date(),
                });
            } catch (fsError) {
                console.error('Firestore save failed:', fsError.message);
            }

            return res.status(200).send(mockAdvice);
        }

        const prompt = `
        You are an expert career mentor AI.
        Based on the user's current role, skills, and experience, suggest:
        1. The next 3 possible career roles they can target.
        2. The key skills they should learn next.
        3. An estimated timeline to grow into those roles.
        4. A motivational one-paragraph summary.

        Data:
        - Current Role: ${currentRole}
        - Skills: ${Array.isArray(skills) ? skills.join(", ") : skills}
        - Experience: ${experience}
        - Education: ${education}

        Return ONLY a JSON object with keys: nextRoles (array), skillsToLearn (array), timeline (string), summary (string).
        Do not include any other text or markdown formatting.
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });

        const advice = JSON.parse(completion.choices[0].message.content);

        // Save to Firestore
        try {
            await admin.firestore().collection("career_recommendations").add({
                uid,
                currentRole,
                skills,
                experience,
                education,
                aiRecommendations: advice,
                createdAt: new Date(),
            });
        } catch (fsError) {
            console.error('Firestore save failed:', fsError.message);
            // We still return the advice even if saving fails
        }

        res.status(200).send(advice);
    } catch (error) {
        console.error('Error generating career advice:', error);
        res.status(500).json({
            error: 'Failed to generate career advice',
            details: error.message
        });
    }
});

export default router;
