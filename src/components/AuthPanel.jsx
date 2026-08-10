import { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  Heart,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import {
  getSupabaseProfile,
  isSupabaseConfigured,
  signInWithGoogle,
  signInWithSupabase,
  signOutSupabase,
  signUpWithSupabase,
} from '../lib/supabase';
import '../auth-3d.css';

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.87h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.41l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.9A6.02 6.02 0 0 1 6.08 12c0-.66.11-1.3.31-1.9V7.5H3.04A10 10 0 0 0 2 12c0 1.61.38 3.13 1.04 4.5l3.35-2.6Z" />
      <path fill="#EA4335" d="M12 5.97c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.5l3.35 2.6C7.18 7.73 9.39 5.97 12 5.97Z" />
    </svg>
  );
}

function AuthPanel({ intentRole = 'customer', onSignedIn, onBack }) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState(intentRole === 'admin' ? 'customer' : intentRole);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const googleIntentRole = intentRole === 'admin'
    ? 'admin'
    : (mode === 'signup' && role === 'business') || intentRole === 'business'
      ? 'business'
      : 'customer';

  const continueWithGoogle = async () => {
    setMessage('');

    if (!isSupabaseConfigured) {
      setMessage('Google sign-in is not connected yet. Add the Supabase URL and publishable key to this deployment.');
      return;
    }

    setGoogleBusy(true);
    try {
      const { error } = await signInWithGoogle({ intentRole: googleIntentRole });
      if (error) throw error;
    } catch (error) {
      setMessage(error.message || 'Could not start Google sign-in. Please try again.');
      setGoogleBusy(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!isSupabaseConfigured) {
      setMessage('Real account login is not connected yet. Add the Supabase environment variables to this deployment first.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup' && !form.name.trim()) {
        throw new Error('Enter your name to create an account.');
      }

      const result = mode === 'signup'
        ? await signUpWithSupabase({ ...form, role })
        : await signInWithSupabase(form);

      if (result.error) throw result.error;

      if (mode === 'signup' && !result.data.session) {
        setMessage('Account created. Check your email to confirm it, then come back and log in.');
        return;
      }

      const authUser = result.data.user;
      if (!authUser) {
        setMessage('Check your email to confirm your Twonara account, then log in.');
        return;
      }

      const account = await getSupabaseProfile(authUser);
      if (!account) throw new Error('Could not load your Twonara profile.');

      if (account.status === 'suspended') {
        await signOutSupabase();
        throw new Error('This account is suspended.');
      }

      onSignedIn(account);
    } catch (error) {
      setMessage(error.message || 'Could not sign in. Please check your details and try again.');
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setMessage('');
  };

  return (
    <main className="auth-page auth-3d-page">
      <div className="auth-ambient auth-ambient-one" aria-hidden="true" />
      <div className="auth-ambient auth-ambient-two" aria-hidden="true" />
      <div className="auth-ambient auth-ambient-three" aria-hidden="true" />

      <section className="section-wrap auth-3d-shell">
        <button className="back-button auth-back-button" type="button" onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>

        <div className="auth-3d-layout">
          <aside className="auth-visual-panel" aria-label="Twonara welcome panel">
            <div className="auth-visual-copy">
              <span className="auth-kicker"><Sparkles size={15} /> Made for better date ideas</span>
              <h2>Find a place that feels right.</h2>
              <p>Save your favorite places, keep plans together, and come back to them from any device.</p>
            </div>

            <div className="auth-3d-scene" aria-hidden="true">
              <div className="auth-orbit auth-orbit-one" />
              <div className="auth-orbit auth-orbit-two" />
              <div className="auth-heart-object auth-heart-object-one"><Heart fill="currentColor" /></div>
              <div className="auth-heart-object auth-heart-object-two"><Heart fill="currentColor" /></div>
              <div className="auth-heart-object auth-heart-object-three"><Heart fill="currentColor" /></div>

              <article className="auth-place-card auth-place-card-one">
                <div className="auth-place-photo auth-place-photo-one" />
                <div>
                  <strong>Harbour Table</strong>
                  <span><MapPin size={12} /> Negombo</span>
                </div>
                <Heart className="auth-card-heart" size={17} fill="currentColor" />
              </article>

              <article className="auth-place-card auth-place-card-two">
                <div className="auth-place-photo auth-place-photo-two" />
                <div>
                  <strong>Sunset Paddle</strong>
                  <span><MapPin size={12} /> Negombo</span>
                </div>
                <Heart className="auth-card-heart" size={17} fill="currentColor" />
              </article>

              <div className="auth-center-orb">
                <div className="auth-center-orb-inner">
                  <Heart size={40} fill="currentColor" />
                  <span>Twonara</span>
                </div>
              </div>
            </div>

            <div className="auth-visual-foot">
              <span><ShieldCheck size={16} /> Secure account access</span>
              <span>Google + Supabase</span>
            </div>
          </aside>

          <section className="auth-card auth-card-3d">
            <div className="auth-card-shine" aria-hidden="true" />

            <div className="auth-intro auth-intro-3d">
              <span className="auth-heart auth-heart-3d"><Heart size={23} fill="currentColor" /></span>
              <span className="mini-label">Welcome to Twonara</span>
              <h1>{mode === 'login' ? 'Sign in to Twonara' : 'Create your Twonara account'}</h1>
              <p>Save your favorite places and plan beautiful dates together.</p>
            </div>

            <div className="auth-mode-row auth-mode-row-3d" aria-label="Account mode">
              <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Log in</button>
              <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>Sign up</button>
            </div>

            {mode === 'signup' && (
              <div className="role-choice auth-role-choice auth-role-choice-3d">
                <button type="button" className={role === 'customer' ? 'active' : ''} onClick={() => setRole('customer')}>
                  <UserRound size={17} /> Customer
                </button>
                <button type="button" className={role === 'business' ? 'active' : ''} onClick={() => setRole('business')}>
                  <Building2 size={17} /> Business
                </button>
              </div>
            )}

            <button
              className="google-auth-button google-auth-button-3d"
              type="button"
              onClick={continueWithGoogle}
              disabled={googleBusy || busy}
            >
              <span className="google-mark-wrap"><GoogleMark /></span>
              <span>{googleBusy ? 'Opening Google…' : 'Continue with Google'}</span>
            </button>

            <div className="auth-divider auth-divider-3d"><span>or continue with email</span></div>

            <form className="auth-form auth-form-3d" onSubmit={submit}>
              {mode === 'signup' && (
                <label>
                  <span>Your name</span>
                  <div className="auth-input-wrap">
                    <UserRound size={18} />
                    <input
                      value={form.name}
                      onChange={(event) => update('name', event.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                    />
                  </div>
                </label>
              )}

              <label>
                <span>Email</span>
                <div className="auth-input-wrap">
                  <Mail size={18} />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => update('email', event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </label>

              <label>
                <span>Password</span>
                <div className="auth-input-wrap">
                  <LockKeyhole size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(event) => update('password', event.target.value)}
                    placeholder="Your password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    minLength={6}
                    required
                  />
                  <button
                    className="auth-password-toggle"
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              {intentRole === 'admin' && mode === 'login' && (
                <div className="form-message auth-info-message">
                  <ShieldCheck size={17} />
                  <span>Admin access only works for accounts already promoted to admin in the Twonara database.</span>
                </div>
              )}

              {intentRole === 'business' && (
                <div className="auth-provider-note auth-info-message">
                  <Building2 size={17} />
                  <span>Continue with Google or email to open your business account and post a place.</span>
                </div>
              )}

              {!isSupabaseConfigured && (
                <div className="form-message auth-warning-message">
                  <span>Real login is waiting for the Supabase environment variables on this deployment.</span>
                </div>
              )}

              {message && <div className="form-message auth-error-message" role="status">{message}</div>}

              <button className="primary-wide-button auth-email-button" type="submit" disabled={busy || googleBusy}>
                {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
              </button>
            </form>

            <div className="auth-business-link">
              <Building2 size={16} />
              <span>{intentRole === 'business' ? 'Posting a place? You are in business access.' : 'Want to post a place? Use Post a place to continue as a business user.'}</span>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default AuthPanel;
