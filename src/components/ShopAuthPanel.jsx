import { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Heart,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Store,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import {
  getSupabaseConfigMessage,
  getSupabaseProfile,
  isSupabaseConfigured,
  signInWithGoogle,
  signInWithSupabase,
  signOutSupabase,
  signUpWithSupabase,
  supabaseConfigStatus,
} from '../lib/supabase';
import '../auth-3d.css';

function GoogleMark() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.87h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.41l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.9A6.02 6.02 0 0 1 6.08 12c0-.66.11-1.3.31-1.9V7.5H3.04A10 10 0 0 0 2 12c0 1.61.38 3.13 1.04 4.5l3.35-2.6Z"/><path fill="#EA4335" d="M12 5.97c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.5l3.35 2.6C7.18 7.73 9.39 5.97 12 5.97Z"/></svg>;
}

export default function ShopAuthPanel({ intentRole = 'business', onSignedIn, onBack }) {
  const adminMode = intentRole === 'admin';
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const configIssue = getSupabaseConfigMessage();
  const authDisabled = !isSupabaseConfigured || busy || googleBusy;

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setMessage('');
    setShowPassword(false);
  };

  const googleLogin = async () => {
    setMessage('');
    if (!isSupabaseConfigured) return;
    setGoogleBusy(true);
    try {
      const { error } = await signInWithGoogle({ intentRole: adminMode ? 'admin' : 'business' });
      if (error) throw error;
    } catch (error) {
      setMessage(error.message || 'Could not open Google sign-in. Please try again.');
      setGoogleBusy(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    if (!isSupabaseConfigured) return;

    setBusy(true);
    try {
      if (mode === 'signup' && !form.name.trim()) throw new Error('Enter your name to create the shop account.');

      const result = mode === 'signup'
        ? await signUpWithSupabase({ ...form, role: 'business' })
        : await signInWithSupabase(form);

      if (result.error) throw result.error;

      if (mode === 'signup' && !result.data.session) {
        setMessage('Shop account created. Confirm your email, then come back and sign in.');
        return;
      }

      const authUser = result.data.user;
      if (!authUser) throw new Error('Could not read the signed-in account. Please try again.');

      const account = await getSupabaseProfile(authUser);
      if (!account) throw new Error('Could not load the Twonara account profile.');
      if (account.status === 'suspended') {
        await signOutSupabase();
        throw new Error('This account is suspended.');
      }
      if (adminMode && account.role !== 'admin') {
        await signOutSupabase();
        throw new Error('This account does not have Twonara Admin access.');
      }
      if (!adminMode && account.role !== 'business') {
        await signOutSupabase();
        throw new Error('Use a Shop/Business account to post an ad.');
      }

      onSignedIn(account);
    } catch (error) {
      setMessage(error.message || 'Could not sign in. Check your email and password and try again.');
    } finally {
      setBusy(false);
    }
  };

  const title = adminMode ? 'Admin sign in' : mode === 'signup' ? 'Create your shop account' : 'Shop sign in';
  const copy = adminMode
    ? 'Secure access for Twonara administrators.'
    : mode === 'signup'
      ? 'Create the business account first. Then submit your shop application for admin review.'
      : 'Sign in to submit your shop for review or manage your public page after approval.';

  return (
    <main className="auth-page auth-3d-page">
      <div className="auth-ambient auth-ambient-one" aria-hidden="true" />
      <div className="auth-ambient auth-ambient-two" aria-hidden="true" />
      <div className="auth-ambient auth-ambient-three" aria-hidden="true" />

      <section className="section-wrap auth-3d-shell">
        <button className="back-button auth-back-button" type="button" onClick={onBack}><ArrowLeft size={18} /> Back to Twonara</button>

        <div className="auth-3d-layout">
          <aside className="auth-visual-panel">
            <div className="auth-visual-copy">
              <span className="auth-kicker"><Sparkles size={15} /> {adminMode ? 'Twonara control centre' : 'Built for local shops'}</span>
              <h2>{adminMode ? 'Keep the marketplace trusted.' : 'Turn your business into a Twonara shop page.'}</h2>
              <p>{adminMode ? 'Review applications, public pages and paid Featured Ads.' : 'Apply once. After admin approval, customize packages, photos, WhatsApp, facilities and publish your page.'}</p>
            </div>

            <div className="auth-3d-scene" aria-hidden="true">
              <div className="auth-orbit auth-orbit-one" />
              <div className="auth-orbit auth-orbit-two" />
              <div className="auth-heart-object auth-heart-object-one"><Heart fill="currentColor" /></div>
              <div className="auth-heart-object auth-heart-object-two"><Heart fill="currentColor" /></div>
              <article className="auth-place-card auth-place-card-one"><div className="auth-place-photo auth-place-photo-one" /><div><strong>Shop application</strong><span><Store size={12} /> Admin review</span></div></article>
              <article className="auth-place-card auth-place-card-two"><div className="auth-place-photo auth-place-photo-two" /><div><strong>Public shop page</strong><span><Building2 size={12} /> Publish</span></div></article>
              <div className="auth-center-orb"><div className="auth-center-orb-inner">{adminMode ? <ShieldCheck size={40} /> : <Store size={40} />}<span>Twonara</span></div></div>
            </div>

            <div className="auth-visual-foot"><span><ShieldCheck size={16} /> Secure Supabase access</span><span>Google + Email</span></div>
          </aside>

          <section className="auth-card auth-card-3d">
            <div className="auth-card-shine" aria-hidden="true" />

            <div className="auth-intro auth-intro-3d">
              <span className="auth-heart auth-heart-3d">{adminMode ? <ShieldCheck size={23} /> : <Building2 size={23} />}</span>
              <span className="mini-label">{adminMode ? 'Admin access' : 'Post your ad'}</span>
              <h1>{title}</h1>
              <p>{copy}</p>
            </div>

            {!adminMode && (
              <div className="auth-mode-row auth-mode-row-3d" aria-label="Shop account action">
                <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Log in</button>
                <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>Create shop account</button>
              </div>
            )}

            {!isSupabaseConfigured && (
              <div className="auth-config-card auth-config-warning" role="status">
                <TriangleAlert size={20} />
                <div>
                  <strong>Shop login is waiting for deployment configuration</strong>
                  <span>{configIssue}</span>
                  <small>Cloudflare must run a fresh build after those VITE_* build variables are saved.</small>
                  <div className="auth-config-checks">
                    <span className={supabaseConfigStatus.hasUrl ? 'ok' : 'missing'}>{supabaseConfigStatus.hasUrl ? <CheckCircle2 size={13} /> : <TriangleAlert size={13} />} URL</span>
                    <span className={supabaseConfigStatus.hasKey ? 'ok' : 'missing'}>{supabaseConfigStatus.hasKey ? <CheckCircle2 size={13} /> : <TriangleAlert size={13} />} Browser key</span>
                  </div>
                </div>
              </div>
            )}

            <button className="google-auth-button google-auth-button-3d" type="button" onClick={googleLogin} disabled={authDisabled}>
              <span className="google-mark-wrap"><GoogleMark /></span>
              <span>{googleBusy ? 'Opening Google…' : 'Continue with Google'}</span>
            </button>

            <div className="auth-divider auth-divider-3d"><span>or continue with email</span></div>

            <form className="auth-form auth-form-3d" onSubmit={submit}>
              {mode === 'signup' && !adminMode && (
                <label>
                  <span>Your name</span>
                  <div className="auth-input-wrap"><UserRound size={18} /><input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Owner or contact name" autoComplete="name" required /></div>
                </label>
              )}

              <label>
                <span>Email</span>
                <div className="auth-input-wrap"><Mail size={18} /><input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="shop@example.com" autoComplete="email" required /></div>
              </label>

              <label>
                <span>Password</span>
                <div className="auth-input-wrap">
                  <LockKeyhole size={18} />
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => update('password', e.target.value)} placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'} minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required />
                  <button className="auth-password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </label>

              {message && <div className="form-message auth-error-message auth-login-message" role="status">{message}</div>}

              <button className="primary-wide-button auth-email-button" type="submit" disabled={authDisabled}>
                {busy ? 'Please wait…' : adminMode ? 'Admin login' : mode === 'signup' ? 'Create shop account' : 'Shop login'}
              </button>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
