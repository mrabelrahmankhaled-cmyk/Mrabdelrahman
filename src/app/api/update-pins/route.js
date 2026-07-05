import { supabase } from '../../../lib/supabase-browser';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Get all students without access_code
    const { data: students, error: fetchError } = await supabase
      .from('students')
      .select('id, unique_id, name')
      .is('access_code', null);

    if (fetchError) throw fetchError;

    // Update each student with a random PIN
    for (const student of students || []) {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      
      const { error: updateError } = await supabaseBrowser
        .from('students')
        .update({ access_code: pin })
        .eq('id', student.id);

      if (updateError) {
        console.error(`Failed to update ${student.name}:`, updateError);
      } else {
        console.log(`✅ ${student.name} (${student.unique_id}) -> PIN: ${pin}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'PIN codes updated successfully',
      count: students?.length || 0
    });

  } catch (error) {
    console.error('Error updating PIN codes:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
