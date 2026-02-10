import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase URL or Key missing in server .env. Template uploads may fail.');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

/**
 * Upload Template API
 * Accepts: name (text), html, css, js, thumbnail (files)
 * Stores files in Supabase Storage and records URL in database.
 */
router.post('/upload', upload.fields([
    { name: 'html', maxCount: 1 },
    { name: 'css', maxCount: 1 },
    { name: 'js', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
    try {
        const { name } = req.body;
        const htmlFile = req.files?.html?.[0];
        const cssFile = req.files?.css?.[0];
        const jsFile = req.files?.js?.[0];
        const thumbnailFile = req.files?.thumbnail?.[0];

        // Ensure uploads directory exists (just in case multer missed it)
        if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

        let html_url = null;
        let css_url = null;
        let js_url = null;
        let thumbnail_url = null;

        // Helper to upload file to Supabase Storage
        const uploadToSupabase = async (bucket, folder, file, contentType) => {
            const filePath = `${folder}/${Date.now()}_${file.originalname}`;
            const fileContent = fs.readFileSync(file.path);

            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(filePath, fileContent, {
                    contentType,
                    upsert: true
                });

            if (error) throw error;

            // Get Public URL
            const { data: publicData } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            // Clean up temp file
            fs.unlinkSync(file.path);

            return publicData.publicUrl;
        };

        // Upload Files
        if (htmlFile) {
            html_url = await uploadToSupabase('resume_templates', 'templates', htmlFile, 'text/html');
        }
        if (cssFile) {
            css_url = await uploadToSupabase('resume_templates', 'templates', cssFile, 'text/css');
        }
        if (jsFile) {
            js_url = await uploadToSupabase('resume_templates', 'templates', jsFile, 'application/javascript');
        }
        if (thumbnailFile) {
            // Ensure 'template_thumbnails' bucket exists or use 'resume_templates/thumbnails'
            thumbnail_url = await uploadToSupabase('resume_templates', 'thumbnails', thumbnailFile, thumbnailFile.mimetype);
        }

        // Insert Metadata in DB
        const insertData = {
            name,
            html_url,
            css_url,
            js_url,
            thumbnail_url
        };

        const { data: dbData, error: dbError } = await supabase
            .from('resume_templates')
            .insert([insertData])
            .select();

        if (dbError) throw dbError;

        res.json({ success: true, template: dbData[0] });

    } catch (error) {
        console.error('Template upload failed:', error);
        res.status(500).json({ error: 'Failed to upload template', details: error.message });
    }
});

/**
 * Get All Templates API
 * returns: Array of template objects
 */
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('resume_templates')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        if (error.code === 'PGRST205' || error.message.includes('resume_templates')) {
            console.warn('Templates table missing (PGRST205). Returning empty list.');
            return res.json([]);
        }
        console.error('Failed to fetch templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates', details: error.message });
    }
});

export default router;
