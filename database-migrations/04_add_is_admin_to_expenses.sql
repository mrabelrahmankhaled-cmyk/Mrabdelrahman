-- Migration: Add is_admin column to expenses table
-- Description: This column distinguishes between admin-recorded expenses and staff-recorded ones.

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Force a refresh of the schema cache if needed (for PostgREST)
NOTIFY pgrst, 'reload schema';
