-- Migration: Setup default educational stages if table is empty
-- Description: Create default educational stages with proper Arabic names

-- Step 1: Check if educational_stages is empty
SELECT COUNT(*) as count FROM educational_stages;

-- Step 2: If empty, insert default educational stages
INSERT INTO educational_stages (name, sort_order) 
VALUES 
  ('KG1', 1),
  ('KG2', 2),
  ('KG3', 3),
  ('الأول الإعدادي', 4),
  ('الثاني الإعدادي', 5),
  ('الثالث الإعدادي', 6),
  ('الأول الثانوي', 7),
  ('الثاني الثانوي', 8),
  ('الثالث الثانوي', 9)
ON CONFLICT (name) DO NOTHING;

-- Step 3: Show what we have now
SELECT name, sort_order 
FROM educational_stages 
ORDER BY sort_order;

-- Step 4: This is the SOURCE OF TRUTH - all other tables should match these names exactly
-- The names above are what will appear in:
-- - courses.grade
-- - students.grade  
-- - Frontend dropdowns
-- - All UI components
