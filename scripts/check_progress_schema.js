const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProgressSchema() {
  const { data: sample, error: err2 } = await supabase.from('student_lesson_progress').select('*').limit(1);
  if (!err2) {
    console.log("Columns in 'student_lesson_progress':", Object.keys(sample[0] || {}));
  }
}

checkProgressSchema();
