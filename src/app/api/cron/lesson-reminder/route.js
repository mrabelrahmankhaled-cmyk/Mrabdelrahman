import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase'; // Use existing supabase client

export async function GET() {
  try {
    console.log('🔍 Vercel Cron: Checking for lessons starting in 10 minutes...');
    
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    const tenMinutesAnd30SecondsFromNow = new Date(now.getTime() + 10.5 * 60 * 1000);
    
    // Convert to time strings for comparison
    const targetTimeStart = tenMinutesFromNow.toTimeString().slice(0, 8);
    const targetTimeEnd = tenMinutesAnd30SecondsFromNow.toTimeString().slice(0, 8);
    
    const currentDay = now.getDay() === 6 ? 0 : now.getDay() + 1; // JS to Saudi system
    
    console.log(`📅 Current day: ${currentDay}, Target window: ${targetTimeStart} - ${targetTimeEnd}`);
    
    // Find lessons starting in the target window
    const { data: lessons, error } = await supabase
      .from('schedules')
      .select(`
        id,
        title,
        instructor_id,
        room_id,
        course_id,
        start_time,
        end_time,
        day,
        courses!inner_id (
          name,
          instructors!inner_id (
            full_name
          )
        )
      `)
      .gte('start_time', targetTimeStart)
      .lte('start_time', targetTimeEnd)
      .eq('day', currentDay);

    if (error) {
      console.error('❌ Error fetching lessons:', error);
      return NextResponse.json(
        { error: 'Failed to fetch lessons' },
        { status: 500 }
      );
    }

    if (!lessons || lessons.length === 0) {
      console.log('✅ No lessons starting in 10 minutes');
      return NextResponse.json({ message: 'No lessons found' });
    }

    console.log(`📚 Found ${lessons.length} lesson(s) starting soon`);
    
    let totalSent = 0;
    let totalFailed = 0;
    
    for (const lesson of lessons) {
      console.log(`🎓 ${lesson.groups.courses.name} with ${lesson.groups.courses.instructor}`);
      console.log(`👥 ${lesson.groups.students.length} students`);
      
      // Get FCM tokens for all students
      const { data: tokens } = await supabase
        .from('student_device_tokens')
        .select('token')
        .in('student_id', lesson.groups.students.map(s => s.id));

      if (!tokens || tokens.length === 0) {
        console.log(`❌ No tokens found for this lesson`);
        continue;
      }

      // Send push notifications
      const courseName = lesson.groups.courses.name;
      const instructorName = lesson.groups.courses.instructor;
      const roomName = lesson.rooms?.name || '---';

      const message = {
        notification: {
          title: '⏰ حصة قربت!',
          body: `فاضل 10 دقايق على ${courseName} مع م/ ${instructorName} – قاعة ${roomName}`,
        },
        data: {
          type: 'lesson_reminder',
          lessonId: lesson.id,
          courseName,
          instructorName,
          roomName,
        },
        tokens: tokens.map(t => t.token),
      };

      try {
        const response = await admin.messaging().sendMulticast(message);
        totalSent += response.successCount;
        totalFailed += response.failureCount;
        
        console.log(`✅ Sent: ${response.successCount}, Failed: ${response.failureCount}`);
        
        // Remove invalid tokens
        if (response.failureCount > 0) {
          const invalidTokens = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
              invalidTokens.push(tokens[idx].token);
            }
          });
          
          if (invalidTokens.length > 0) {
            await supabase
              .from('student_device_tokens')
              .delete()
              .in('token', invalidTokens);
          }
        }
      } catch (error) {
        console.error(`❌ Error sending notifications:`, error);
        totalFailed += tokens.length;
      }
    }
    
    return NextResponse.json({
      message: `Cron completed: ${totalSent} sent, ${totalFailed} failed`,
      lessonsProcessed: lessons.length,
      totalSent,
      totalFailed,
    });

  } catch (error) {
    console.error('❌ Cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
