import { createClient } from 'npm:@supabase/supabase-js@2';
import CryptoJS from 'npm:crypto-js@4.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const planPrices: Record<string, number> = {
  premium: 2500,
  featured: 5000,
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const merchantId = Deno.env.get('PAYHERE_MERCHANT_ID');
    const merchantSecret = Deno.env.get('PAYHERE_MERCHANT_SECRET');
    const appUrl = Deno.env.get('TWONARA_APP_URL');
    const notifyUrl = Deno.env.get('PAYHERE_NOTIFY_URL');
    const sandbox = (Deno.env.get('PAYHERE_SANDBOX') ?? 'true').toLowerCase() === 'true';

    if (!supabaseUrl || !serviceKey || !merchantId || !merchantSecret || !appUrl || !notifyUrl) {
      return json({ error: 'Payment server is not fully configured.' }, 500);
    }

    const authorization = req.headers.get('Authorization') || '';
    const token = authorization.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Authentication required.' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: 'Invalid session.' }, 401);

    const { listingId, plan } = await req.json();
    const amount = planPrices[plan];
    if (!listingId || !amount) return json({ error: 'Invalid listing or ad plan.' }, 400);

    const { data: listing, error: listingError } = await admin
      .from('listings')
      .select('id, owner_id, name, location, phone')
      .eq('id', listingId)
      .single();

    if (listingError || !listing || listing.owner_id !== userData.user.id) {
      return json({ error: 'Listing not found.' }, 404);
    }

    const orderId = `TW-${Date.now()}-${listing.id.slice(0, 8)}`;
    const amountText = Number(amount).toFixed(2);
    const currency = 'LKR';
    const hashedSecret = CryptoJS.MD5(merchantSecret).toString().toUpperCase();
    const hash = CryptoJS.MD5(`${merchantId}${orderId}${amountText}${currency}${hashedSecret}`).toString().toUpperCase();

    const { error: orderError } = await admin.from('ad_orders').insert({
      user_id: userData.user.id,
      listing_id: listing.id,
      plan,
      amount,
      currency,
      status: 'pending',
      payhere_order_id: orderId,
    });
    if (orderError) return json({ error: orderError.message }, 400);

    await admin.from('listings').update({ ad_plan: plan, payment_status: 'pending' }).eq('id', listing.id);

    const fullName = (userData.user.user_metadata?.name || 'Twonara Business').trim();
    const parts = fullName.split(/\s+/);
    const firstName = parts.shift() || 'Twonara';
    const lastName = parts.join(' ') || 'Business';

    return json({
      actionUrl: sandbox ? 'https://sandbox.payhere.lk/pay/checkout' : 'https://www.payhere.lk/pay/checkout',
      fields: {
        merchant_id: merchantId,
        return_url: `${appUrl}/?payment=return`,
        cancel_url: `${appUrl}/?payment=cancel`,
        notify_url: notifyUrl,
        first_name: firstName,
        last_name: lastName,
        email: userData.user.email || 'business@twonara.com',
        phone: listing.phone || '0770000000',
        address: 'Business listing payment',
        city: listing.location || 'Negombo',
        country: 'Sri Lanka',
        order_id: orderId,
        items: `Twonara ${plan} listing - ${listing.name}`,
        currency,
        amount: amountText,
        hash,
        custom_1: listing.id,
        custom_2: plan,
      },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Payment request failed.' }, 500);
  }
});
