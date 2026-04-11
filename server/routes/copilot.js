import express from 'express';
import axios from 'axios';

const router = express.Router();

const ZAI_API_URL = process.env.ZAI_API_URL || 'https://api.z.ai/api/paas/v4/chat/completions';
const ZAI_MODEL = process.env.ZAI_MODEL || 'glm-5.1';
const ZAI_API_KEY = process.env.ZAI_API_KEY || '';

const normalizeContent = (content) => {
    if (typeof content === 'string') {
        return content.trim();
    }

    if (Array.isArray(content)) {
        return content
            .map((item) => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object' && typeof item.text === 'string') {
                    return item.text;
                }
                return '';
            })
            .join('\n')
            .trim();
    }

    return '';
};

const sanitizeMessages = (messages) => {
    if (!Array.isArray(messages)) return [];

    return messages
        .filter((message) => message && typeof message === 'object')
        .map((message) => ({
            role: ['user', 'assistant', 'system'].includes(message.role) ? message.role : 'user',
            content: typeof message.content === 'string' ? message.content.trim() : '',
        }))
        .filter((message) => message.content);
};

router.post('/copilot/chat', async (req, res) => {
    const { messages, userProfile } = req.body || {};
    const conversation = sanitizeMessages(messages);
    const latestUserMessage = [...conversation].reverse().find((message) => message.role === 'user');

    try {
        if (!latestUserMessage) {
            return res.status(400).json({ error: 'A user message is required.' });
        }

        if (!ZAI_API_KEY) {
            return res.status(503).json({
                error: 'Copilot service unavailable',
                details: 'Z.AI API key is not configured on the server.',
            });
        }

        const profileContext = [
            userProfile?.name ? `Name: ${userProfile.name}` : null,
            userProfile?.profession ? `Profession: ${userProfile.profession}` : null,
            userProfile?.country ? `Country: ${userProfile.country}` : null,
            Array.isArray(userProfile?.skills) && userProfile.skills.length
                ? `Skills: ${userProfile.skills.slice(0, 10).join(', ')}`
                : null,
        ].filter(Boolean).join('\n');

        const systemMessage = {
            role: 'system',
            content: [
                'You are Hirevo AI Career Copilot, a practical and encouraging career assistant.',
                'Give concise, actionable answers focused on jobs, resumes, interviews, career growth, and skills.',
                'Prefer specific next steps over generic motivation.',
                'Use short paragraphs or bullets when useful, but keep replies easy to scan.',
                profileContext ? `User profile:\n${profileContext}` : null,
            ].filter(Boolean).join('\n\n'),
        };

        const response = await axios.post(
            ZAI_API_URL,
            {
                model: ZAI_MODEL,
                messages: [systemMessage, ...conversation],
                max_tokens: 1200,
                temperature: 0.7,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${ZAI_API_KEY}`,
                },
                timeout: 45000,
            }
        );

        const content = normalizeContent(response.data?.choices?.[0]?.message?.content);
        if (!content) {
            throw new Error('Provider returned an empty response.');
        }

        return res.status(200).json({
            message: content,
            provider: 'zai',
            model: ZAI_MODEL,
        });
    } catch (error) {
        const status = error.response?.status || 500;
        const providerMessage =
            error.response?.data?.error?.message ||
            error.response?.data?.message ||
            error.message ||
            'Chat request failed.';

        console.error('Copilot chat error:', status, providerMessage);

        return res.status(status >= 400 && status < 600 ? status : 500).json({
            error: 'Failed to generate copilot response',
            details: providerMessage,
        });
    }
});

export default router;
