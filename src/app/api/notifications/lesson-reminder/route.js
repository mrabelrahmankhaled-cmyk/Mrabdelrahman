import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase'; // Use existing supabase client

export async function POST(request) {
  try {
    const { lessonId } = await request.json();

    if (!lessonId) {
      return NextResponse.json(
        { error: 'Missing lessonId' },
        { status: 400 }
      );
    }

    // Get lesson details with students
    const { data: lesson, error: lessonError } = await supabase
      .from('schedules')
      .select(`
        *,
        groups!inner(
          courses!inner(name, instructor),
          students!inner(id)
        ),
        rooms(name)
      `)
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Send notifications to all students in the group
    const studentIds = lesson.groups.students.map(s => s.id);
    const courseName = lesson.groups.courses.name;
    const instructorName = lesson.groups.courses.instructor;
    const roomName = lesson.rooms?.name || '---';

    const promises = studentIds.map(async (studentId) => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentId,
            title: '⏰ حصة قربت!',
            body: `فاضل 10 دقايق على ${courseName} مع م/ ${instructorName} – قاعة ${roomName}`,
            data: {
              type: 'lesson_reminder',
              lessonId: lessonId,
              courseName,
              instructorName,
              roomName,
            },
          }),
        });

        const result = await response.json();
        return { studentId, success: true, result };
      } catch (error) {
        console.error('Error sending to student:', studentId, error);
        return { studentId, success: false, error: error.message };
      }
    });

    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Lesson reminders sent: ${successful} successful, ${failed} failed`,
      lesson: {
        courseName,
        instructorName,
        roomName,
        startTime: lesson.start_time,
      },
      results,
    });

  } catch (error) {
    console.error('Error in lesson reminder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
