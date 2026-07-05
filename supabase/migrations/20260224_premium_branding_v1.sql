-- Migration: Premium Branding for Instructors
-- Description: Adds fields for hero section, stats, features, and social branding.

DO $$ 
BEGIN 
    -- 1. Hero Section
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'center_settings' AND COLUMN_NAME = 'hero_title') THEN
        ALTER TABLE public.center_settings ADD COLUMN hero_title TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'center_settings' AND COLUMN_NAME = 'hero_subtitle') THEN
        ALTER TABLE public.center_settings ADD COLUMN hero_subtitle TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'center_settings' AND COLUMN_NAME = 'hero_cta_text') THEN
        ALTER TABLE public.center_settings ADD COLUMN hero_cta_text TEXT DEFAULT 'اشترك دلوقتي !';
    END IF;

    -- 2. Stats and Features
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'center_settings' AND COLUMN_NAME = 'stats') THEN
        ALTER TABLE public.center_settings ADD COLUMN stats JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'center_settings' AND COLUMN_NAME = 'features') THEN
        ALTER TABLE public.center_settings ADD COLUMN features JSONB DEFAULT '[]';
    END IF;

    -- 3. Social Media
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'center_settings' AND COLUMN_NAME = 'social_links') THEN
        ALTER TABLE public.center_settings ADD COLUMN social_links JSONB DEFAULT '[]';
    END IF;

    -- 4. About Section & Secondary Photo
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'center_settings' AND COLUMN_NAME = 'lifestyle_photo_url') THEN
        ALTER TABLE public.center_settings ADD COLUMN lifestyle_photo_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'center_settings' AND COLUMN_NAME = 'about_title') THEN
        ALTER TABLE public.center_settings ADD COLUMN about_title TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'center_settings' AND COLUMN_NAME = 'about_description') THEN
        ALTER TABLE public.center_settings ADD COLUMN about_description TEXT;
    END IF;

END $$;
