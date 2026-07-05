-- Trigger: Sync grade names when educational_stages changes
-- Description: Automatically update all tables when educational stage names change

-- Step 1: Create function to sync grade names
CREATE OR REPLACE FUNCTION sync_educational_stage_names()
RETURNS TRIGGER AS $$
BEGIN
    -- When educational_stages name changes, update all related tables
    
    -- Update courses table
    UPDATE courses 
    SET grade = NEW.name
    WHERE grade = OLD.name;
    
    -- Update students table  
    UPDATE students 
    SET grade = NEW.name
    WHERE grade = OLD.name;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger for UPDATE operations
CREATE TRIGGER educational_stages_update_sync
AFTER UPDATE ON educational_stages
FOR EACH ROW
WHEN (OLD.name IS DISTINCT FROM NEW.name)
EXECUTE FUNCTION sync_educational_stage_names();

-- Step 3: Create function to handle DELETE operations
CREATE OR REPLACE FUNCTION handle_educational_stage_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- When educational_stages is deleted, set grade to NULL in related tables
    
    -- Update courses table
    UPDATE courses 
    SET grade = NULL
    WHERE grade = OLD.name;
    
    -- Update students table  
    UPDATE students 
    SET grade = NULL
    WHERE grade = OLD.name;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger for DELETE operations
CREATE TRIGGER educational_stages_delete_sync
AFTER DELETE ON educational_stages
FOR EACH ROW
EXECUTE FUNCTION handle_educational_stage_delete();

-- Step 5: Test the trigger (optional)
-- UPDATE educational_stages SET name = 'الصف الأول الثانوي' WHERE name = 'الأول الثانوي';
-- This should automatically update courses and students tables

-- Step 6: View existing triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_condition,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'educational_stages'
ORDER BY trigger_name;
