-- Migration: Add original_price to courses table
-- Description: Adds a column to store the price before discount for visual display.

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'courses' AND COLUMN_NAME = 'original_price') THEN
        ALTER TABLE public.courses ADD COLUMN original_price NUMERIC DEFAULT 0;
    END IF;
END $$;
