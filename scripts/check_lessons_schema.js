const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'lessons' });
  if (error) {
    // If RPC doesn't exist, try a simple select
    console.log("RPC failed, trying fallback...");
    const { data: sample, error: err2 } = await supabase.from('lessons').select('*').limit(1);
    if (err2) {
      console.error("Fallback failed:", err2);
    } else {
      console.log("Columns in 'lessons':", Object.keys(sample[0] || {}));
    }
  } else {
    console.log("Columns:", data);
  }
}

checkSchema();
