import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const uniqueId = searchParams.get('uniqueId');

    if (!uniqueId) {
      return NextResponse.json({ error: 'Unique ID required' }, { status: 400 });
    }

    const cleanId = uniqueId.trim();
    
    // We create the client INSIDE the handler to ensure it uses the correct env for the request context
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qngdkkhnvkvgskfxnerh.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODczMzA3MywiZXhwIjoyMDg0MzA5MDczfQ.OCPysG5ayWq6ubfSiBIp9QgillRqe9FtMXJApF506x0',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 🔍 Step 1: Exact match lookup
    let { data: students, error: dbError } = await supabaseAdmin
      .from('students')
      .select('center_id, name, unique_id')
      .ilike('unique_id', cleanId)
      .limit(1);

    if (dbError) {
      console.error('Lookup DB Error:', dbError);
      return NextResponse.json({ 
        error: 'Database Error', 
        details: dbError.message 
      }, { status: 500 });
    }

    // 🔍 Step 2: Fallback — strip any prefix and search by numeric part only
    // This supports custom prefixes from center_settings: 'A100', 'أ100', 'M-200', 'S-100', etc.
    if (!students || students.length === 0) {
       // استخرج الجزء الرقمي بس (كل الحروف والداش في البداية)
       const numericPart = cleanId.replace(/^[^\d]+/, '').trim(); // يشيل أي حروف أو داش في البداية

       if (numericPart && numericPart !== cleanId) {
         // ابحث عن أي كود ينتهي بنفس الرقم
         const { data: fallback, error: fbError } = await supabaseAdmin
           .from('students')
           .select('center_id, name, unique_id')
           .ilike('unique_id', `%${numericPart}`)
           .limit(5); // جيب أكتر من نتيجة لو الرقم مكرر في سناتر كتير

         if (fbError) {
           console.error('Lookup Fallback Error:', fbError);
         } else if (fallback?.length > 0) {
           students = fallback;
         }
       }
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ students: [] });
    }

    // Return the resolved student data
    return NextResponse.json({ 
      students: students.map(s => ({
        center_id: s.center_id,
        student_name: s.name,
        matched_id: s.unique_id
      })) 
    });

  } catch (err) {
    console.error('PRE-AUTH LOOKUP CRASH:', err);
    return NextResponse.json({ 
      error: 'Server Crash', 
      details: err.message,
      stack: err.stack 
    }, { status: 500 });
  }
}
