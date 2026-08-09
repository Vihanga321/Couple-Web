import { createClient } from 'npm:@supabase/supabase-js@2';
import CryptoJS from 'npm:crypto-js@4.2.0';

function text(message: string, status = 200) {
  return new Response(message, { status, headers: { 'Content-Type': 'text/plain' } });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return text('Method not allowed', 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const merchantId = Deno.env.get('PAYHERE_MERCHANT_ID');
    const merchantSecret = Deno.env.get('PAYHERE_MERCHANT_SECRET');

    if (!supabaseUrl || !serviceKey || !merchantId || !merchantSecret) {
      return text('Server not configured', 500);
    }

    const form = await req.formData();
    const receivedMerchantId = String(form.get('merchant_id') || '');
    const orderId = String(form.get('order_id') || '');
    const paymentId = String(form.get('payment_id') || '');
    const amount = String(form.get('payhere_amount') || '');
    const currency = String(form.get('payhere_currency') || '');
    const statusCode = String(form.get('status_code') || '');
    const md5sig = String(form.get('md5sig') || '').toUpperCase();

    if (!orderId || receivedMerchantId !== merchantId) return text('Invalid notification', 400);

    const hashedSecret = CryptoJS.MD5(merchantSecret).toString().toUpperCase();
    const localSignature = CryptoJS.MD5(`${receivedMerchantId}${orderId}${amount}${currency}${statusCode}${hashedSecret}`).toString().toUpperCase();
    if (localSignature !== md5sig) return text('Invalid signature', 400);

    const statusMap: Record<string, string> = {
      '2': 'paid',
      '0': 'pending',
      '-1': 'cancelled',
      '-2': 'failed',
      '-3': 'chargedback',
    };
    const nextStatus = statusMap[statusCode] || 'failed';

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: order, error: orderError } = await admin
      .from('ad_orders')
      .select('id, listing_id, plan')
      .eq('payhere_order_id', orderId)
      .single();

    if (orderError || !order) return text('Order not found', 404);

    await admin
      .from('ad_orders')
      .update({ status: nextStatus, payment_id: paymentId || null, updated_at: new Date().toISOString() })
      .eq('id', order.id);

    await admin
      .from('listings')
      .update({
        payment_status: nextStatus,
        ...(nextStatus === 'paid' && order.plan === 'featured'
          ? { featured_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }
          : {}),
      })
      .eq('id', order.listing_id);

    return text('OK');
  } catch (error) {
    console.error(error);
    return text('Webhook error', 500);
  }
});
