import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Gift, Heart, MapPin, MessageCircle, PenLine, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { seedGifts, seedStories } from '../data/communitySeed';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

function normalizePhone(phone = '') {
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `94${digits.slice(1)}`;
  return digits;
}

export function GiftShopPage({ location, session, onBack, onNeedLogin }) {
  const [gifts, setGifts] = useState(seedGifts);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;
    supabase
      .from('gift_products')
      .select('id, name, shop_name, description, price_text, price_amount, location, whatsapp_phone, delivery_text, image_url, featured, status')
      .eq('status', 'approved')
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active || error) return;
        const mapped = (data || []).map((row) => ({
          id: row.id,
          name: row.name,
          shopName: row.shop_name,
          description: row.description,
          priceText: row.price_text,
          priceAmount: Number(row.price_amount || 0),
          location: row.location,
          whatsappPhone: row.whatsapp_phone,
          delivery: row.delivery_text,
          imageUrl: row.image_url,
          featured: row.featured,
        }));
        if (mapped.length) setGifts(mapped);
      });
    return () => { active = false; };
  }, []);

  const visibleGifts = useMemo(() => {
    const wantedLocation = String(location || '').toLowerCase();
    const q = query.trim().toLowerCase();
    return gifts.filter((gift) => {
      const matchesLocation = !wantedLocation || wantedLocation === 'all sri lanka' || gift.location.toLowerCase().includes(wantedLocation);
      const searchable = `${gift.name} ${gift.shopName} ${gift.description} ${gift.delivery}`.toLowerCase();
      return matchesLocation && (!q || searchable.includes(q));
    });
  }, [gifts, location, query]);

  const openGiftWhatsApp = (gift) => {
    const number = normalizePhone(gift.whatsappPhone);
    if (!number) {
      setMessage('This gift shop has not added a WhatsApp number yet.');
      return;
    }
    const text = encodeURIComponent(`Hi, I found ${gift.name} from ${gift.shopName} on Twonara. I would like to ask about ordering it.`);
    window.open(`https://wa.me/${number}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="community-page gift-page">
      <section className="section-wrap community-hero">
        <button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Home</button>
        <div className="community-hero-grid">
          <div>
            <span className="eyebrow"><Gift size={15} /> Twonara Gift Shop</span>
            <h1>A small surprise for the plan.</h1>
            <p>Browse flowers, desserts, keepsakes and thoughtful date add-ons from approved local sellers.</p>
          </div>
          <div className="community-hero-orb"><Gift size={42} /><Heart size={22} fill="currentColor" /></div>
        </div>
        <div className="community-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search gifts, shops or delivery options…" /></div>
      </section>

      {message && <section className="section-wrap portal-message">{message}</section>}

      <section className="section-wrap gift-grid">
        {visibleGifts.map((gift) => (
          <article className="gift-card" key={gift.id}>
            <div className="gift-image-wrap">
              <img src={gift.imageUrl} alt={gift.name} />
              {gift.featured && <span className="gift-featured"><Sparkles size={13} /> Featured</span>}
            </div>
            <div className="gift-copy">
              <span className="mini-label">{gift.shopName}</span>
              <h2>{gift.name}</h2>
              <p>{gift.description}</p>
              <div className="gift-meta"><span><MapPin size={14} /> {gift.location}</span><span>{gift.delivery}</span></div>
              <div className="gift-footer"><strong>{gift.priceText}</strong><button onClick={() => openGiftWhatsApp(gift)}><MessageCircle size={17} /> WhatsApp shop</button></div>
            </div>
          </article>
        ))}
        {visibleGifts.length === 0 && <div className="simple-empty"><Gift size={28} /><h3>No matching gifts yet</h3><p>Try another search or explore all Sri Lanka.</p></div>}
      </section>

      <section className="section-wrap community-safe-note"><ShieldCheck size={20} /><div><strong>Safer shopping</strong><p>Twonara shows approved listings, but always confirm the current price, delivery details and seller information before ordering.</p></div></section>
    </main>
  );
}

export function StoriesPage({ session, onBack, onNeedLogin }) {
  const [stories, setStories] = useState(seedStories);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ title: '', story: '', location: 'Negombo', anonymous: true, displayName: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;
    supabase
      .from('date_stories')
      .select('id, title, story, location, anonymous, display_name, created_at, status')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active || error) return;
        const mapped = (data || []).map((row) => ({
          id: row.id,
          title: row.title,
          story: row.story,
          location: row.location,
          anonymous: row.anonymous,
          displayName: row.anonymous ? 'Anonymous Couple' : (row.display_name || 'Twonara Couple'),
          createdAt: row.created_at,
        }));
        if (mapped.length) setStories(mapped);
      });
    return () => { active = false; };
  }, []);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const openStoryForm = () => {
    if (!session) {
      onNeedLogin();
      return;
    }
    setFormOpen(true);
    setMessage('');
  };

  const submitStory = async (event) => {
    event.preventDefault();
    if (!session) {
      onNeedLogin();
      return;
    }
    if (!form.title.trim() || !form.story.trim() || !form.location.trim()) {
      setMessage('Add a title, story and general city/area.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const localStory = {
        id: `story-${Date.now()}`,
        title: form.title.trim(),
        story: form.story.trim(),
        location: form.location.trim(),
        anonymous: form.anonymous,
        displayName: form.anonymous ? 'Anonymous Couple' : (form.displayName.trim() || session.name || 'Twonara Couple'),
        createdAt: new Date().toISOString(),
      };

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('date_stories').insert({
          user_id: session.id,
          title: localStory.title,
          story: localStory.story,
          location: localStory.location,
          anonymous: localStory.anonymous,
          display_name: localStory.anonymous ? null : localStory.displayName,
          status: 'published',
        }).select('id, created_at').single();
        if (error) throw error;
        localStory.id = data.id;
        localStory.createdAt = data.created_at;
      }

      setStories((current) => [localStory, ...current]);
      setForm({ title: '', story: '', location: 'Negombo', anonymous: true, displayName: '' });
      setFormOpen(false);
      setMessage('Your date story is live. Your account identity is not shown when Anonymous is selected.');
    } catch (error) {
      setMessage(error.message || 'Could not publish this story.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="community-page stories-page">
      <section className="section-wrap community-hero stories-hero">
        <button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Home</button>
        <div className="community-hero-grid">
          <div>
            <span className="eyebrow"><PenLine size={15} /> Our Date Stories</span>
            <h1>Real ideas from real dates.</h1>
            <p>Share what made a date enjoyable, simple or memorable. Post with a nickname or keep your public identity anonymous.</p>
          </div>
          <button className="story-create-button" onClick={openStoryForm}><PenLine size={18} /> Share a date story</button>
        </div>
      </section>

      {message && <section className="section-wrap portal-message">{message}</section>}

      {formOpen && (
        <section className="section-wrap story-form-shell">
          <form className="story-form" onSubmit={submitStory}>
            <div className="panel-heading"><div><span className="mini-label">New story</span><h2>Share the experience, not private details</h2></div><button type="button" className="text-button" onClick={() => setFormOpen(false)}>Close</button></div>
            <div className="community-safe-note inline"><ShieldCheck size={19} /><p>Do not include phone numbers, exact live/home locations, school or workplace details, private messages, or other identifying information.</p></div>
            <label><span>Story title</span><input value={form.title} onChange={(event) => update('title', event.target.value)} maxLength={100} placeholder="e.g. Our simple sunset date" required /></label>
            <label><span>General city / area</span><input value={form.location} onChange={(event) => update('location', event.target.value)} maxLength={80} placeholder="Negombo" required /></label>
            <label><span>Your story</span><textarea rows="7" value={form.story} onChange={(event) => update('story', event.target.value)} maxLength={2000} placeholder="What did you do? What made the plan enjoyable? Keep it useful for other couples." required /></label>
            <label className="anonymous-toggle"><input type="checkbox" checked={form.anonymous} onChange={(event) => update('anonymous', event.target.checked)} /><span><strong>Post anonymously</strong><small>Your Twonara account stays attached internally for moderation, but your identity is not shown publicly.</small></span></label>
            {!form.anonymous && <label><span>Public nickname</span><input value={form.displayName} onChange={(event) => update('displayName', event.target.value)} maxLength={60} placeholder="e.g. Two little explorers" /></label>}
            <button className="primary-wide-button" type="submit" disabled={busy}>{busy ? 'Publishing…' : 'Publish story'}</button>
          </form>
        </section>
      )}

      <section className="section-wrap story-feed">
        {stories.map((story) => (
          <article className="story-card" key={story.id}>
            <div className="story-card-top"><span className="story-avatar"><Heart size={17} fill="currentColor" /></span><div><strong>{story.displayName || 'Anonymous Couple'}</strong><span><MapPin size={13} /> {story.location}</span></div><small>{new Date(story.createdAt).toLocaleDateString()}</small></div>
            <h2>{story.title}</h2>
            <p>{story.story}</p>
            {story.anonymous && <span className="anonymous-badge"><ShieldCheck size={13} /> Publicly anonymous</span>}
          </article>
        ))}
      </section>
    </main>
  );
}
