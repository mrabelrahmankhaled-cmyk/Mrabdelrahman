const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  const { data, error } = await supabase.from('lesson_chapters').select('*').limit(1);
  if (error) {
    console.log("lesson_chapters does not exist or error:", error.message);
  } else {
    console.log("lesson_chapters exists!");
  }
  
  const { data: progress, error: err2 } = await supabase.from('student_lesson_progress').select('*').limit(1);
  if (err2) {
    console.log("student_lesson_progress does not exist or error:", err2.message);
  } else {
    console.log("student_lesson_progress exists!");
  }
}

checkTables();
