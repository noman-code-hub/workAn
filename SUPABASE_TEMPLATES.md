# Supabase Resume Templates System

The system now supports two modes of template management:

## 1. Professional Mode (Recommended)
**Use the Admin Dashboard to upload complete templates.**
- Format: HTML file + optional CSS file + optional JS file + Thumbnail image.
- Location: Accessible via `/admin/templates` (Admin role required).
- Features: 
  - Dynamic Rendering (Client-side Mustache)
  - Custom CSS injection
  - Thumbnail previews

### How to Add Unique Templates
1. Log in as an Admin.
2. Navigate to `http://localhost:5173/admin/templates`.
3. Enter a Template Name.
4. Select your `.html` file (Mustache syntax supported).
5. (Optional) Select a separate `.css` file.
6. Select a Thumbnail image.
7. Click Upload.

## 2. Simple Mode (Legacy Fallback)
**Directly upload HTML files to Supabase Storage.**
- Location: `resume_templates` bucket.
- Format: Single `.html` file containing inline styles.
- Features: Basic rendering.

## Setup Requirements

### Database
Run the SQL migration in `supabase_migrations.sql` to create the `resume_templates` table.

### Storage Buckets
Ensure `resume_templates` bucket exists and is Public.

### Environment Variables
Ensure `SUPABASE_URL` and `SUPABASE_KEY` are set in `server/.env`.
