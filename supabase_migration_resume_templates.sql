CREATE TABLE IF NOT EXISTS public.resume_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  html_url text,
  css_url text,
  js_url text,
  thumbnail_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resume_templates ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for users to see templates)
CREATE POLICY "Public read access" 
ON public.resume_templates 
FOR SELECT 
USING (true);

-- Allow authenticated users to upload (or restrict to admins only if you have admin roles)
CREATE POLICY "Authenticated upload access" 
ON public.resume_templates 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Storage policies for resume_templates bucket (allow public list/read and anon uploads)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read resume_templates" ON storage.objects;
CREATE POLICY "Public read resume_templates"
ON storage.objects
FOR SELECT
USING (bucket_id = 'resume_templates');

DROP POLICY IF EXISTS "Public insert resume_templates" ON storage.objects;
CREATE POLICY "Public insert resume_templates"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'resume_templates');
