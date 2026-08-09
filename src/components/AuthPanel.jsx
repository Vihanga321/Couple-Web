import { useState } from 'react';
import { ArrowLeft, Building2, Heart, LogIn, ShieldCheck, UserRound } from 'lucide-react';
import { isSupabaseConfigured, signInWithSupabase, signUpWithSupabase } from '../lib/supabase';

const demoAccounts = {
  customer: { id: 'user-customer', name: 'Demo Customer', email: 'customer@twonara.demo', role: 'customer', status: 'active' },
  business: { id: 'user-business', name: 'Demo Business', email: 'business@twonara.demo', role: 'business', status: 'active' },
  admin: { id: 'user-admin', name: 'Twonara Admin', email: 'admin@twonara.demo', role: 'admin', status: 'active' },
};

function AuthPanel({ intentRole = 'customer', users, setUsers, onSignedIn, onBack }) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState(intentRole === 'admin' ? 'customer' : intentRole);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

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
        const authUser = result.data.user;
        if (authUser) {
          onSignedIn({
            id: authUser.id,
            name: authUser.user_metadata?.name || form.name || authUser.email?.split('@')[0] || 'Twonara user',
            email: authUser.email,
            role: authUser.user_metadata?.role || role,
            status: 'active',
          });
        } else {
          setMessage('Check your email to confirm your Twonara account.');
        }
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

          <form className="auth-form" onSubmit={submit}>
            {mode === 'signup' && (
              <label><span>Your name</span><input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Your name" /></label>
            )}
            <label><span>Email</span><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" required /></label>
            <label><span>Password</span><input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} placeholder={isSupabaseConfigured ? 'Your password' : 'Demo mode: any password'} required /></label>

            {mode === 'signup' && (
              <div className="role-choice">
                <button type="button" className={role === 'customer' ? 'active' : ''} onClick={() => setRole('customer')}><UserRound size={17} /> Customer</button>
                <button type="button" className={role === 'business' ? 'active' : ''} onClick={() => setRole('business')}><Building2 size={17} /> Business</button>
              </div>
            )}

            {message && <div className="form-message">{message}</div>}
            <button className="primary-wide-button" type="submit" disabled={busy}><LogIn size={18} /> {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button>
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
