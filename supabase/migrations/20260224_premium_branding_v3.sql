-- Add more color controls to center_settings
ALTER TABLE public.center_settings ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#111827';
ALTER TABLE public.center_settings ADD COLUMN IF NOT EXISTS hero_bg_color TEXT DEFAULT '#FF4500';
