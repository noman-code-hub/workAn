-- Create resume_templates bucket (if not exists)
-- You can verify storage buckets in Supabase Dashboard -> Storage

-- Create resume_templates table
CREATE TABLE IF NOT EXISTS resume_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  html_url text,
  css_url text,
  js_url text,
  thumbnail_url text,
  created_at timestamp DEFAULT now()
);

-- Enable RLS (Recommended)
ALTER TABLE resume_templates ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (essential for Frontend)
CREATE POLICY "Public Read Access" 
ON resume_templates FOR SELECT 
USING (true);

-- Create policy to allow authenticated users to insert (Admin usage)
-- Adjust 'authenticated' to 'service_role' if you want stricter control
CREATE POLICY "Allow Insert" 
ON resume_templates FOR INSERT 
WITH CHECK (true);
