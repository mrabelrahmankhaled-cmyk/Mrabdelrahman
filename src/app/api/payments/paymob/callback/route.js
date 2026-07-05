import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import crypto from 'crypto';

export async function POST(req) {
    try {
        const body = await req.json();
        const { obj } = body;
        const { hmac } = req.nextUrl.searchParams.get('hmac'); // Paymob usually sends HMAC in query for GET, but let's check body/headers for POST

        // 1. Get Center Settings for HMAC Secret
        const { data: settings } = await supabase
            .from('center_settings')
            .select('paymob_hmac_secret')
            .eq('center_id', obj.order.merchant_id) // This might not be the centerId, need to check Paymob's order metadata
            .single();

        // 2. Fulfillment Logic
        if (obj.success === true) {
            // Find our transaction
            const { data: transaction } = await supabase
                .from('student_payment_transactions')
                .select('*')
                .eq('external_order_id', obj.order.id.toString())
                .single();

            if (transaction && transaction.status !== 'success') {
                const { targetType, targetId } = transaction.metadata;

                // Update Transaction
                await supabase
                    .from('student_payment_transactions')
                    .update({ status: 'success', payment_reference: obj.id.toString() })
                    .eq('id', transaction.id);

                // Grant Access
                if (targetType === 'course') {
                    await supabase.from('student_online_enrollments').upsert({
                        student_id: transaction.student_id,
                        course_id: transaction.course_id,
                        center_id: transaction.center_id,
                        payment_method: 'paymob'
                    });
                } else if (targetType === 'chapter') {
                    await supabase.from('student_chapter_access').upsert({
                        student_id: transaction.student_id,
                        chapter_id: targetId,
                        course_id: transaction.course_id,
                        center_id: transaction.center_id
                    });
                } else if (targetType === 'lesson') {
                    await supabase.from('student_lesson_access').upsert({
                        student_id: transaction.student_id,
                        lesson_id: targetId,
                        course_id: transaction.course_id,
                        center_id: transaction.center_id
                    });
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Paymob Callback Error:', err);
        return NextResponse.json({ error: 'Callback failed' }, { status: 500 });
    }
}
