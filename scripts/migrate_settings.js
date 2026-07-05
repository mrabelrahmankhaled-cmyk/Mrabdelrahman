const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrate() {
  console.log('🚀 Running migration...');
  
  const sql = `
    ALTER TABLE public.center_settings 
    ADD COLUMN IF NOT EXISTS next_student_code BIGINT DEFAULT 100000;
    
    ALTER TABLE public.center_settings 
    ADD COLUMN IF NOT EXISTS student_code_prefix TEXT DEFAULT 'S';
    
    COMMENT ON COLUMN public.center_settings.next_student_code IS 'The next sequential number to use for student unique_id';
    COMMENT ON COLUMN public.center_settings.student_code_prefix IS 'Prefix to prepend to the sequential student ID (e.g. S, ST, or empty)';
    
    NOTIFY pgrst, 'reload schema';
  `;

  const { data, error } = await supabase.rpc('exec', { sql });

  if (error) {
    console.error('❌ Migration failed:', error);
  } else {
    console.log('✅ Migration completed successfully!');
  }
}

migrate();
