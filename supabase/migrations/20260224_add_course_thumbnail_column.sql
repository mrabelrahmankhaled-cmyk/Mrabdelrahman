-- Migration: Add thumbnail_url to courses table
-- Description: Adds a column to store course preview images for the landing page.

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'courses' AND COLUMN_NAME = 'thumbnail_url') THEN
        ALTER TABLE public.courses ADD COLUMN thumbnail_url TEXT;
    END IF;

    -- Add missing center_settings columns
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'center_settings' AND COLUMN_NAME = 'faqs') THEN
        ALTER TABLE public.center_settings ADD COLUMN faqs JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'center_settings' AND COLUMN_NAME = 'marquee_text') THEN
        ALTER TABLE public.center_settings ADD COLUMN marquee_text TEXT;
    END IF;
END $$;
