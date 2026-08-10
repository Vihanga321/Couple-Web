import { useState } from 'react';
import { ArrowLeft, Building2, Heart, LogIn, ShieldCheck, UserRound } from 'lucide-react';
import {
  getSupabaseProfile,
  isSupabaseConfigured,
  signInWithGoogle,
  signInWithSupabase,
  signOutSupabase,
  signUpWithSupabase,
} from '../lib/supabase';

const demoAccounts = {
  customer: { id: 'user-customer', name: 'Demo Customer', email: 'customer@twonara.demo', role: 'customer', status: 'active' },
  business: { id: 'user-business', name: 'Demo Business', email: 'business@twonara.demo', role: 'business', status: 'active' },
  admin: { id: 'user-admin', name: 'Twonara Admin', email: 'admin@twonara.demo', role: 'admin', status: 'active' },
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.87h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.41l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.9A6.02 6.02 0 0 1 6.08 12c0-.66.11-1.3.31-1.9V7.5H3.04A10 10 0 0 0 2 12c0 1.61.38 3.13 1.04 4.5l3.35-2.6Z" />
      <path fill="#EA4335" d="M12 5.97c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.5l3.35 2.6C7.18 7.73 9.39 5.97 12 5.97Z" />
    </svg>
  );
}

function AuthPanel({ intentRole = 'customer', users, setUsers, onSignedIn, onBack }) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState(intentRole === 'admin' ? 'customer' : intentRole);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const googleIntentRole = intentRole === 'admin'
    ? 'admin'
    : (mode === 'signup' && role === 'business') || intentRole === 'business'
      ? 'business'
      : 'customer';

  const continueWithGoogle = async () => {
    setMessage('');
    setGoogleBusy(true);

    try {
      const { error } = await signInWithGoogle({ intentRole: googleIntentRole });
      if (error) throw error;
    } catch (error) {
      setMessage(error.message || 'Could not start Google sign-in.');
      setGoogleBusy(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setBusy(true);

    try {
      if (isSupabaseConfigured) {
        const result = mode === 'signup'
          ? await signUpWithSupabase({ ...form, role })
          : await signInWithSupabase(form);

        if (result.error) throw result.error;

        if (mode === 'signup' && !result.data.session) {
          setMessage('Account created. Check your email to confirm it, then log in.');
          return;
        }

        const authUser = result.data.user;
        if (!authUser) {
          setMessage('Check your email to confirm your Twonara account.');
          return;
        }

        const account = await getSupabaseProfile(authUser);
        if (!account) throw new Error('Could not load your Twonara profile.');
        if (account.status === 'suspended') {
          await signOutSupabase();
          throw new Error('This account is suspended.');
        }
        onSignedIn(account);
      } else if (mode === 'signup') {
        if (!form.name.trim() || !form.email.trim()) throw new Error('Enter your name and email.');
        const account = {
          id: `local-${Date.now()}`,
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          role,
          status: 'active',
        };
        setUsers((current) => [...current.filter((item) => item.email !== account.email), account]);
        onSignedIn(account);
      } else {
        const account = users.find((item) => item.email.toLowerCase() === form.email.trim().toLowerCase());
        if (!account) throw new Error('Account not found in demo mode. Use a demo button or create an account.');
        if (account.status === 'suspended') throw new Error('This account is suspended.');
        onSignedIn(account);
      }
    } catch (error) {
      setMessage(error.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="section-wrap auth-shell">
        <button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Back</button>
        <div className="auth-card">
          <div className="auth-intro">
            <span className="auth-heart"><Heart size={24} fill="currentColor" /></span>
            <span className="mini-label">Twonara account</span>
            <h1>{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h1>
            <p>Save places, keep date plans and manage your Twonara experience without making things complicated.</p>
          </div>

          <div className="auth-mode-row">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Log in</button>
            <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Sign up</button>
          </div>

          {mode === 'signup' && (
            <div className="role-choice auth-role-choice">
              <button type="button" className={role === 'customer' ? 'active' : ''} onClick={() => setRole('customer')}><UserRound size={17} /> Customer</button>
              <button type="button" className={role === 'business' ? 'active' : ''} onClick={() => setRole('business')}><Building2 size={17} /> Business</button>
            </div>
          )}

          {isSupabaseConfigured && (
            <>
              <button className="google-auth-button" type="button" onClick={continueWithGoogle} disabled={googleBusy || busy}>
                <GoogleMark />
                <span>{googleBusy ? 'Opening Google…' : 'Continue with Google'}</span>
              </button>
              <div className="auth-divider"><span>or continue with email</span></div>
            </>
          )}

          <form className="auth-form" onSubmit={submit}>
            {mode === 'signup' && (
              <label><span>Your name</span><input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Your name" /></label>
            )}
            <label><span>Email</span><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" required /></label>
            <label><span>Password</span><input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} placeholder={isSupabaseConfigured ? 'Your password' : 'Demo mode: any password'} required /></label>

            {intentRole === 'admin' && isSupabaseConfigured && mode === 'login' && (
              <div className="form-message">Google or email can sign in here, but admin access only works for accounts already promoted to admin in the Twonara database.</div>
            )}
            {intentRole === 'business' && isSupabaseConfigured && (
              <div className="auth-provider-note">Continue with Google to create or open your business account, then post your place.</div>
            )}
            {message && <div className="form-message">{message}</div>}
            <button className="primary-wide-button" type="submit" disabled={busy || googleBusy}><LogIn size={18} /> {busy ? 'Please wait…' : mode === 'login' ? 'Log in with email' : 'Create account with email'}</button>
          </form>

          {!isSupabaseConfigured && (
            <div className="demo-login-box">
              <span>Quick testing</span>
              <p>No backend keys are needed for these demo accounts.</p>
              <div>
                <button onClick={() => onSignedIn(demoAccounts.customer)}><UserRound size={16} /> Customer</button>
                <button onClick={() => onSignedIn(demoAccounts.business)}><Building2 size={16} /> Business</button>
                <button onClick={() => onSignedIn(demoAccounts.admin)}><ShieldCheck size={16} /> Admin</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default AuthPanel;
