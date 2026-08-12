import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, MapPin, PenLine, ShieldCheck } from 'lucide-react';
import { seedStories } from '../data/communitySeed';
import { SRI_LANKA_DISTRICTS } from '../data/sriLankaDistricts';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export default function GuestStoriesPage({ district, onBack }) {
  const [stories, setStories] = useState(seedStories);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ title: '', story: '', district: district === 'All Sri Lanka' ? 'Gampaha' : district });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;
    supabase.from('date_stories').select('id,title,story,location,anonymous,created_at,status').eq('status', 'published').order('created_at', { ascending: false }).then(({ data, error }) => {
      if (!active || error) return;
      const mapped = (data || []).map((row) => ({ id: row.id, title: row.title, story: row.story, location: row.location, displayName: 'Anonymous Couple', anonymous: true, createdAt: row.created_at }));
      if (mapped.length) setStories(mapped);
    });
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stories.filter((story) => !q || `${story.title} ${story.story} ${story.location}`.toLowerCase().includes(q));
  }, [stories, query]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.story.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      if (!isSupabaseConfigured || !supabase) {
        setMessage('Demo mode: connect Supabase and run shop-architecture-upgrade.sql to submit real anonymous stories.');
        return;
      }
      const { error } = await supabase.from('date_stories').insert({
        user_id: null,
        title: form.title.trim(),
        story: form.story.trim(),
        location: form.district,
        anonymous: true,
        display_name: null,
        status: 'pending',
      });
      if (error) throw error;
      setForm({ title: '', story: '', district: district === 'All Sri Lanka' ? 'Gampaha' : district });
      setFormOpen(false);
      setMessage('Story submitted anonymously. Twonara Admin will review it before it appears publicly.');
    } catch (error) {
      setMessage(error.message || 'Could not submit this anonymous story.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="guest-stories-page">
      <section className="guest-stories-hero">
        <button onClick={onBack}><ArrowLeft size={17} /> Home</button>
        <div><span><BookOpen size={15} /> DATE STORIES</span><h1>Share a date story anonymously.</h1><p>No Twonara customer account is required. Stories are reviewed by admin before they become public.</p></div>
        <button className="guest-story-create" onClick={() => setFormOpen((value) => !value)}><PenLine size={17} /> {formOpen ? 'Close form' : 'Share anonymously'}</button>
      </section>

      {message && <div className="guest-story-message">{message}</div>}

      {formOpen && (
        <form className="guest-story-form" onSubmit={submit}>
          <div className="guest-story-safe"><ShieldCheck size={18} /><span>Do not include phone numbers, exact home/live locations, private messages, school/workplace details, or identifying information.</span></div>
          <label><span>Story title</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={100} required /></label>
          <label><span>District</span><select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}>{SRI_LANKA_DISTRICTS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Your story</span><textarea rows="7" value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} maxLength={2000} required /></label>
          <button type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit anonymously for review'}</button>
        </form>
      )}

      <section className="guest-story-search"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search date stories..." /></section>
      <section className="guest-story-feed">{visible.map((story) => <article key={story.id}><div><span className="guest-story-avatar">♥</span><div><strong>Anonymous Couple</strong><small><MapPin size={12} /> {story.location} District</small></div><time>{new Date(story.createdAt).toLocaleDateString()}</time></div><h2>{story.title}</h2><p>{story.story}</p><span className="guest-anonymous-badge"><ShieldCheck size={12} /> Publicly anonymous</span></article>)}</section>
    </main>
  );
}
