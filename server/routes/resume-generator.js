import express from 'express';
import Mustache from 'mustache';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';

const router = express.Router();

// Initialize Supabase Client (Backend)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.warn('⚠️ Supabase credentials missing in server .env. Template fetching will fail.');
}

// Routes
router.post('/generate-resume', async (req, res) => {
    try {
        const {
            uid, name, role, skills, experience, education, additionalInfo, template
        } = req.body;

        if (!name || !role) {
            return res.status(400).json({ error: 'Name and Role are required fields.' });
        }

        // Prepare data for Mustache
        const data = {
            name,
            role,
            skills: Array.isArray(skills) ? skills : (skills || '').split(',').map(s => s.trim()),
            experience,
            education,
            additionalInfo,
            // Helper for list rendering if needed in templates
            hasSkills: (Array.isArray(skills) && skills.length > 0) || (skills && skills.length > 0),
        };

        let generatedHTML = '';

        // If a template filename is provided (e.g. "modern.html"), fetch it from Supabase
        if (template && supabase) {
            console.log(`Fetching template '${template}' from Supabase...`);

            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from('resume_templates')
                .getPublicUrl(template);

            if (publicUrlData && publicUrlData.publicUrl) {
                try {
                    const response = await fetch(publicUrlData.publicUrl);
                    if (response.ok) {
                        const templateHtml = await response.text();
                        // Render with Mustache
                        generatedHTML = Mustache.render(templateHtml, data);
                        console.log('Template rendered successfully.');
                    } else {
                        console.error(`Failed to fetch template: ${response.statusText}`);
                    }
                } catch (fetchError) {
                    console.error('Error fetching template HTML:', fetchError);
                }
            }
        }

        // Fallback: If no template or fetch failed, use a default internal template
        if (!generatedHTML) {
            console.log('Using fallback internal template.');
            const defaultTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{name}} - Resume</title>
    <style>
        body { font-family: Helvetica, Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 40px; color: #333; line-height: 1.6; }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 5px; }
        .role { font-size: 1.2em; color: #7f8c8d; margin-bottom: 30px; font-weight: bold; }
        h2 { color: #2980b9; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        ul { padding-left: 20px; }
        li { margin-bottom: 5px; }
    </style>
</head>
<body>
    <h1>{{name}}</h1>
    <div class="role">{{role}}</div>

    <h2>Professional Profile</h2>
    <p>
        Experienced <strong>{{role}}</strong> dedicated to high-quality results. 
        Skilled in {{#skills}}{{.}}, {{/skills}}.
    </p>

    <h2>Skills</h2>
    <ul>
        {{#skills}}
        <li>{{.}}</li>
        {{/skills}}
    </ul>

    <h2>Experience</h2>
    <div class="section-content">
        <p>{{experience}}</p>
    </div>

    <h2>Education</h2>
    <div class="section-content">
        <p>{{education}}</p>
    </div>

    {{#additionalInfo}}
    <h2>Additional Information</h2>
    <p>{{.}}</p>
    {{/additionalInfo}}
</body>
</html>`;
            generatedHTML = Mustache.render(defaultTemplate, data);
        }

        // Save generated resume to Firestore
        try {
            const docRef = await admin.firestore().collection('generated_resumes').add({
                uid,
                name,
                role,
                template: template || 'default',
                generatedHTML,
                createdAt: new Date()
            });
            console.log('Resume saved to Firestore:', docRef.id);

            res.status(200).json({
                success: true,
                resumeHTML: generatedHTML,
                resumeId: docRef.id
            });
        } catch (dbError) {
            console.error('Firestore save failed:', dbError);
            res.status(200).json({
                success: true,
                resumeHTML: generatedHTML,
                resumeId: 'unsaved',
                message: 'Resume generated (storage failed)'
            });
        }

    } catch (error) {
        console.error('Resume generation error:', error);
        res.status(500).json({ error: 'Failed to generate resume', details: error.message });
    }
});

// Create 'resume_templates' bucket if it doesn't exist (Helper endpoint)
router.post('/init-templates', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

    try {
        const { data, error } = await supabase.storage.createBucket('resume_templates', {
            public: true
        });

        if (error && error.message !== 'The resource already exists') {
            throw error;
        }

        // Upload a default template sample
        const sampleTemplate = `
<h1>{{name}}</h1>
<p><strong>{{role}}</strong></p>
<hr/>
<h3>Skills</h3>
<ul>{{#skills}}<li>{{.}}</li>{{/skills}}</ul>
<h3>Experience</h3>
<p>{{experience}}</p>
<h3>Education</h3>
<p>{{education}}</p>
`;

        await supabase.storage
            .from('resume_templates')
            .upload('simple_template.html', sampleTemplate, { upsert: true, contentType: 'text/html' });

        res.json({ message: 'Bucket initialized and sample template uploaded.' });
    } catch (err) {
        console.error('Init templates error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
