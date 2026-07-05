import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase'; // Use existing supabase client

export async function POST(request) {
  try {
    const { studentId, title, body, data } = await request.json();

    if (!studentId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, title, body' },
        { status: 400 }
      );
    }

    // Get student's FCM tokens
    const { data: tokens, error } = await supabase
      .from('student_device_tokens')
      .select('token')
      .eq('student_id', studentId);

    if (error) {
      console.error('Error fetching tokens:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tokens' },
        { status: 500 }
      );
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json(
        { message: 'No tokens found for this student' },
        { status: 200 }
      );
    }

    // Send push notifications to all tokens
    const promises = tokens.map(async ({ token }) => {
      try {
        const message = {
          token,
          notification: {
            title,
            body,
          },
          data: data || {},
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        };

        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
        return { success: true, token, response };
      } catch (error) {
        console.error('Error sending to token:', token, error);
        
        // Remove invalid tokens
        if (error.code === 'messaging/registration-token-not-registered') {
          await supabase
            .from('student_device_tokens')
            .delete()
            .eq('token', token);
        }
        
        return { success: false, token, error: error.message };
      }
    });

    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Notifications sent: ${successful} successful, ${failed} failed`,
      results,
    });

  } catch (error) {
    console.error('Error in send notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
