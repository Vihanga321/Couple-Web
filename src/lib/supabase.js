import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function signUpWithSupabase({ name, email, password, role = 'customer' }) {
  if (!supabase) throw new Error('Supabase is not configured.');

  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role },
    },
  });
}

export async function signInWithSupabase({ email, password }) {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOutSupabase() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
