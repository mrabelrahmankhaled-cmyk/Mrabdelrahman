const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qngdkkhnvkvgskfxnerh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODczMzA3MywiZXhwIjoyMDg0MzA5MDczfQ.OCPysG5ayWq6ubfSiBIp9QgillRqe9FtMXJApF506x0'
);

async function migrate() {
  console.log('🚀 Running migration via RPC...');
  
  const sql = `
    ALTER TABLE public.center_settings 
    ADD COLUMN IF NOT EXISTS next_student_code BIGINT DEFAULT 100000;
    
    ALTER TABLE public.center_settings 
    ADD COLUMN IF NOT EXISTS student_code_prefix TEXT DEFAULT 'S';
    
    NOTIFY pgrst, 'reload schema';
  `;

  // Try without schema first
  const { data, error } = await supabase.rpc('exec', { sql });

  if (error) {
    console.error('❌ Migration failed:', error);
    console.log('Trying with public.exec...');
    const { error: error2 } = await supabase.rpc('public.exec', { sql });
    if (error2) console.error('❌ public.exec also failed:', error2);
  } else {
    console.log('✅ Migration completed successfully!');
  }
}

migrate();
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
