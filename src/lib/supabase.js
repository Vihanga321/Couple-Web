import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

const OAUTH_INTENT_KEY = 'twonara:oauth-intent';

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
      data: { name, role: role === 'business' ? 'business' : 'customer' },
    },
  });
}

export async function signInWithSupabase({ email, password }) {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithGoogle({ intentRole = 'customer' } = {}) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const safeIntent = intentRole === 'business' || intentRole === 'admin' ? intentRole : 'customer';
  window.sessionStorage.setItem(OAUTH_INTENT_KEY, safeIntent);

  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });
}

export function consumeOAuthIntent() {
  if (typeof window === 'undefined') return 'customer';
  const value = window.sessionStorage.getItem(OAUTH_INTENT_KEY) || 'customer';
  window.sessionStorage.removeItem(OAUTH_INTENT_KEY);
  return value;
}

export async function setMyAccountRole(role) {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (!['customer', 'business'].includes(role)) throw new Error('Invalid account role.');

  const { data, error } = await supabase.rpc('set_my_account_role', { new_role: role });
  if (error) throw error;
  return data;
}

export async function getSupabaseProfile(authUser) {
  if (!supabase || !authUser) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('name, role, status')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) throw error;

  return {
    id: authUser.id,
    name: data?.name || authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Twonara user',
    email: authUser.email,
    role: data?.role || 'customer',
    status: data?.status || 'active',
    avatarUrl: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || '',
  };
}

export async function signOutSupabase() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
