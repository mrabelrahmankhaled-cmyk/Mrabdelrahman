import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const { studentId, newPassword } = await request.json();

    if (!studentId || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
       console.error('Missing Supabase Service Role Key or URL in environment variables.');
       return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Update user password in auth.users
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      studentId,
      { password: newPassword }
    );

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' }, { status: 200 });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
