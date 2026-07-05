import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const { studentId } = await request.json();

    if (!studentId) {
      return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
       console.error('Missing Supabase Service Role Key or URL in environment variables.');
       return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // This will delete the user from auth.users. 
    // If you have foreign key constraints with ON DELETE CASCADE in public.students,
    // the public.students record will be deleted automatically.
    // Otherwise, we should delete from public.students first.
    
    // 1. Delete from public.students (just to be safe if no cascade is set)
    const { error: dbError } = await supabaseAdmin
      .from('students')
      .delete()
      .eq('id', studentId);
      
    if (dbError) {
      console.warn('Failed to delete from public.students (maybe already deleted or cascade is active):', dbError);
    }

    // 2. Delete from auth.users
    const { data, error: authError } = await supabaseAdmin.auth.admin.deleteUser(studentId);

    if (authError) {
      throw authError;
    }

    return NextResponse.json({ success: true, message: 'Student deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
