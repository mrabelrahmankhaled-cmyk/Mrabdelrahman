import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function POST(req) {
    try {
        const { amount, courseId, targetType, targetId, centerId, studentId, paymentMethod } = await req.json();

        // 1. Get Paymob Settings for this center
        const { data: settings, error: settingsError } = await supabase
            .from('center_settings')
            .select('paymob_api_key, paymob_integration_id_fawry, paymob_integration_id_card, paymob_hmac_secret')
            .eq('center_id', centerId)
            .single();

        if (settingsError || !settings?.paymob_api_key) {
            return NextResponse.json({ error: 'إعدادات بوابة الدفع غير مكتملة لهذا السنتر' }, { status: 400 });
        }

        // 2. Paymob Auth Token
        const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: settings.paymob_api_key })
        });
        const { token } = await authRes.json();

        // 3. Register Order
        const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auth_token: token,
                delivery_needed: "false",
                amount_cents: Math.round(amount * 100),
                currency: "EGP",
                items: []
            })
        });
        const orderData = await orderRes.json();

        // 4. Get Payment Key
        const integrationId = paymentMethod === 'card' ? settings.paymob_integration_id_card : settings.paymob_integration_id_fawry;
        
        const keyRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auth_token: token,
                amount_cents: Math.round(amount * 100),
                expiration: 3600,
                order_id: orderData.id,
                billing_data: {
                    apartment: "NA",
                    email: "student@clasora.com",
                    floor: "NA",
                    first_name: "Student",
                    street: "NA",
                    building: "NA",
                    phone_number: "+201234567890",
                    shipping_method: "NA",
                    postal_code: "NA",
                    city: "NA",
                    country: "EG",
                    last_name: "Online",
                    state: "NA"
                },
                currency: "EGP",
                integration_id: parseInt(integrationId),
                lock_order_when_paid: "false"
            })
        });
        const { token: paymentToken } = await keyRes.json();

        // 5. Create Transaction Record
        const { data: transaction, error: txError } = await supabase
            .from('student_payment_transactions')
            .insert([{
                student_id: studentId,
                center_id: centerId,
                course_id: courseId,
                amount: amount,
                status: 'pending',
                payment_method: `paymob_${paymentMethod}`,
                external_order_id: orderData.id.toString(),
                metadata: { targetType, targetId }
            }])
            .select()
            .single();

        return NextResponse.json({
            paymentToken,
            paymentMethod,
            orderId: orderData.id
        });

    } catch (err) {
        console.error('Paymob Init Error:', err);
        return NextResponse.json({ error: 'فشل بدء عملية الدفع' }, { status: 500 });
    }
}
