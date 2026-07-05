-- Add landing_page_template to center_settings
ALTER TABLE public.center_settings ADD COLUMN IF NOT EXISTS landing_page_template TEXT DEFAULT 'elite';
