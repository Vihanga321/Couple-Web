import { isSupabaseConfigured, supabase } from './supabase';

export async function startPayHereCheckout({ listingId, plan }) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.functions.invoke('payhere-create', {
    body: { listingId, plan },
  });

  if (error) throw error;
  if (!data?.actionUrl || !data?.fields) throw new Error('Invalid payment response.');

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = data.actionUrl;
  form.style.display = 'none';

  Object.entries(data.fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = String(value ?? '');
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}
