import { createClient } from '@supabase/supabase-js';

const env = import.meta.env || {};

function cleanEnvValue(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function firstEnvValue(...keys) {
  for (const key of keys) {
    const value = cleanEnvValue(env[key]);
    if (value) return value;
  }
  return '';
}

function isValidHttpUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

const supabaseUrl = firstEnvValue(
  'VITE_SUPABASE_URL',
  'VITE_PUBLIC_SUPABASE_URL',
);

// Primary name + backwards-compatible aliases. The anon/public browser key is safe
// to expose in the Vite bundle; service_role/secret keys must never be used here.
const supabaseKey = firstEnvValue(
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_KEY',
  'VITE_SUPABASE_PUBLISHABLE',
  'VITE_SUPABASE_PUBLIC_KEY',
);

const hasUrl = Boolean(supabaseUrl);
const hasKey = Boolean(supabaseKey);
const urlLooksValid = hasUrl && isValidHttpUrl(supabaseUrl);
const keyLooksValid = hasKey && (
  supabaseKey.startsWith('sb_publishable_')
  || supabaseKey.startsWith('eyJ')
  || supabaseKey.length > 40
);

export const supabaseConfigStatus = Object.freeze({
  hasUrl,
  hasKey,
  urlLooksValid,
  keyLooksValid,
});

export function getSupabaseConfigMessage() {
  if (!hasUrl && !hasKey) {
    return 'Missing Cloudflare build variables VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.';
  }
  if (!hasUrl) return 'Missing Cloudflare build variable VITE_SUPABASE_URL.';
  if (!hasKey) return 'Missing Cloudflare build variable VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY).';
  if (!urlLooksValid) return 'VITE_SUPABASE_URL is present but is not a valid http/https URL.';
  if (!keyLooksValid) return 'The Supabase browser key is present but does not look valid. Use the publishable key or legacy anon key, not a service-role/secret key.';
  return '';
}

const OAUTH_INTENT_KEY = 'twonara:oauth-intent';

export const isSupabaseConfigured = hasUrl && hasKey && urlLooksValid && keyLooksValid;

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
  if (!supabase) throw new Error(getSupabaseConfigMessage() || 'Supabase is not configured.');

  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role: role === 'business' ? 'business' : 'customer' },
    },
  });
}

export async function signInWithSupabase({ email, password }) {
  if (!supabase) throw new Error(getSupabaseConfigMessage() || 'Supabase is not configured.');
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithGoogle({ intentRole = 'customer' } = {}) {
  if (!supabase) throw new Error(getSupabaseConfigMessage() || 'Supabase is not configured.');

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
  if (typeof window === 'undefined') return null;
  const value = window.sessionStorage.getItem(OAUTH_INTENT_KEY);
  if (!value) return null;
  window.sessionStorage.removeItem(OAUTH_INTENT_KEY);
  return value;
}

export async function setMyAccountRole(role) {
  if (!supabase) throw new Error(getSupabaseConfigMessage() || 'Supabase is not configured.');
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
