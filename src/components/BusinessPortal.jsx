import { useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Building2, Check, CircleDollarSign, Clock3, Eye, MapPin, Plus, Store } from 'lucide-react';
import { adPlans, categories } from '../data/seed';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const emptyForm = {
  name: '', category: 'Eat', location: 'Negombo', address: '', description: '', price: '', estimatedCost: '',
  phone: '', hours: '', image: '', adPlan: 'free',
};

function StatusBadge({ status }) {
  return <span className={`status-badge ${status}`}>{status}</span>;
}

function BusinessPortal({ session, listings, setListings, onBack, onSignOut }) {
  const [tab, setTab] = useState('dashboard');
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const myListings = useMemo(() => listings.filter((item) => item.ownerId === session.id), [listings, session.id]);
  const liveCount = myListings.filter((item) => item.status === 'approved').length;
  const pendingCount = myListings.filter((item) => item.status === 'pending').length;
  const views = myListings.reduce((sum, item) => sum + (item.views || 0), 0);

  const selectedPlan = adPlans.find((item) => item.id === form.adPlan) || adPlans[0];
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submitListing = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    const listing = {
      id: `listing-${Date.now()}`,
      ownerId: session.id,
      businessName: form.name.trim(),
      name: form.name.trim(),
      category: form.category,
      location: form.location.trim(),
      address: form.address.trim(),
      description: form.description.trim(),
      price: form.price.trim() || 'Contact for price',
      estimatedCost: Number(form.estimatedCost) || 0,
      phone: form.phone.trim(),
      hours: form.hours.trim() || 'Contact venue for hours',
      image: form.image.trim(),
      adPlan: form.adPlan,
      status: 'pending',
      paymentStatus: selectedPlan.price === 0 ? 'not_required' : (isSupabaseConfigured ? 'pending' : 'demo'),
      createdAt: new Date().toISOString(),
      views: 0,
    };

    try {
      if (!listing.name || !listing.address || !listing.description || !listing.phone) {
        throw new Error('Please complete the required business details.');
      }

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('listings').insert({
          id: listing.id,
          owner_id: session.id,
          name: listing.name,
          category: listing.category,
          location: listing.location,
          address: listing.address,
          description: listing.description,
          price_text: listing.price,
          estimated_cost: listing.estimatedCost,
          phone: listing.phone,
          opening_hours: listing.hours,
          cover_image_url: listing.image || null,
          ad_plan: listing.adPlan,
          status: 'pending',
          payment_status: listing.paymentStatus,
        });
        if (error) throw error;
      }

      setListings((current) => [listing, ...current]);
      setForm(emptyForm);
      setMessage(selectedPlan.price > 0 && !isSupabaseConfigured
        ? 'Listing submitted in demo mode. Paid-plan checkout activates after PayHere + Supabase are configured.'
        : 'Listing submitted for admin review.');
      setTab('dashboard');
    } catch (error) {
      setMessage(error.message || 'Could not submit listing.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="portal-page">
      <section className="section-wrap portal-head">
        <button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Customer site</button>
        <div className="portal-title-row">
          <div><span className="eyebrow"><Building2 size={15} /> Business portal</span><h1>Grow your place with Twonara.</h1><p>Post a listing, follow its approval status and see the simple numbers that matter.</p></div>
          <div className="portal-account"><strong>{session.name}</strong><span>{session.email}</span><button onClick={onSignOut}>Sign out</button></div>
        </div>
      </section>

      <section className="section-wrap portal-tabs">
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>Dashboard</button>
        <button className={tab === 'post' ? 'active' : ''} onClick={() => setTab('post')}><Plus size={16} /> Post a place</button>
        <button className={tab === 'plans' ? 'active' : ''} onClick={() => setTab('plans')}>Ad plans</button>
      </section>

      {message && <section className="section-wrap portal-message">{message}</section>}

      {tab === 'dashboard' && (
        <section className="section-wrap business-dashboard">
          <div className="stat-grid">
            <div><span className="stat-icon"><Store size={20} /></span><small>My listings</small><strong>{myListings.length}</strong></div>
            <div><span className="stat-icon"><Check size={20} /></span><small>Live</small><strong>{liveCount}</strong></div>
            <div><span className="stat-icon"><Clock3 size={20} /></span><small>Pending</small><strong>{pendingCount}</strong></div>
            <div><span className="stat-icon"><Eye size={20} /></span><small>Demo views</small><strong>{views}</strong></div>
          </div>

          <div className="portal-panel">
            <div className="panel-heading"><div><span className="mini-label">Your places</span><h2>Listings</h2></div><button className="primary-small-button" onClick={() => setTab('post')}><Plus size={16} /> New listing</button></div>
            {myListings.length === 0 ? (
              <div className="simple-empty"><Store size={28} /><h3>No places posted yet</h3><p>Post your first place and it will go to admin review.</p></div>
            ) : (
              <div className="business-list">
                {myListings.map((listing) => (
                  <article key={listing.id}>
                    <div className="business-list-image">{listing.image ? <img src={listing.image} alt="" /> : <Store size={24} />}</div>
                    <div className="business-list-main"><strong>{listing.name}</strong><span><MapPin size={14} /> {listing.location} · {listing.category}</span><small>{adPlans.find((plan) => plan.id === listing.adPlan)?.name || 'Free'} plan</small></div>
                    <StatusBadge status={listing.status} />
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {tab === 'post' && (
        <section className="section-wrap post-layout">
          <form className="post-form portal-panel" onSubmit={submitListing}>
            <div className="panel-heading"><div><span className="mini-label">New listing</span><h2>Tell couples about your place</h2></div></div>
            <div className="form-grid two">
              <label><span>Place / business name *</span><input value={form.name} onChange={(event) => update('name', event.target.value)} required /></label>
              <label><span>Category *</span><select value={form.category} onChange={(event) => update('category', event.target.value)}>{categories.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
              <label><span>City / area *</span><input value={form.location} onChange={(event) => update('location', event.target.value)} required /></label>
              <label><span>Address *</span><input value={form.address} onChange={(event) => update('address', event.target.value)} required /></label>
              <label><span>Price text</span><input value={form.price} onChange={(event) => update('price', event.target.value)} placeholder="e.g. Rs. 2,000 – 4,000" /></label>
              <label><span>Estimated cost (LKR)</span><input type="number" min="0" value={form.estimatedCost} onChange={(event) => update('estimatedCost', event.target.value)} placeholder="2500" /></label>
              <label><span>Phone / WhatsApp *</span><input value={form.phone} onChange={(event) => update('phone', event.target.value)} required /></label>
              <label><span>Opening hours</span><input value={form.hours} onChange={(event) => update('hours', event.target.value)} placeholder="10:00 AM – 10:00 PM" /></label>
            </div>
            <label><span>Description *</span><textarea rows="5" value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Keep it clear and useful for customers." required /></label>
            <label><span>Cover image URL</span><input value={form.image} onChange={(event) => update('image', event.target.value)} placeholder="https://..." /></label>

            <div className="plan-picker">
              <span>Choose ad plan</span>
              <div>{adPlans.map((plan) => <button type="button" key={plan.id} className={form.adPlan === plan.id ? 'active' : ''} onClick={() => update('adPlan', plan.id)}><strong>{plan.name}</strong><small>{plan.price ? `Rs. ${plan.price.toLocaleString()} / ${plan.period}` : 'Free'}</small></button>)}</div>
            </div>

            <div className="submit-note"><CircleDollarSign size={18} /><p>{selectedPlan.price === 0 ? 'No payment is needed for the Free plan.' : isSupabaseConfigured ? 'Paid plan checkout is handled through the server-side PayHere function so your Merchant Secret never goes into the browser.' : 'Demo mode: no real payment will be taken. You can still test the admin approval workflow.'}</p></div>
            <button className="primary-wide-button" type="submit" disabled={busy}><Plus size={18} /> {busy ? 'Submitting…' : 'Submit for review'}</button>
          </form>

          <aside className="post-help-card"><BarChart3 size={25} /><h3>Keep listings useful</h3><p>Use accurate prices, clear photos, real contact details and venue rules. Twonara can reject misleading or unsafe listings.</p></aside>
        </section>
      )}

      {tab === 'plans' && (
        <section className="section-wrap ad-plan-grid">
          {adPlans.map((plan) => (
            <article key={plan.id} className={plan.id === 'premium' ? 'recommended' : ''}>
              {plan.id === 'premium' && <span className="recommended-label">Good starting choice</span>}
              <span className="mini-label">{plan.period}</span><h2>{plan.name}</h2><strong className="plan-price">{plan.price ? `Rs. ${plan.price.toLocaleString()}` : 'Free'}</strong>
              <ul>{plan.features.map((feature) => <li key={feature}><Check size={16} /> {feature}</li>)}</ul>
              <button onClick={() => { update('adPlan', plan.id); setTab('post'); }}>Choose {plan.name}</button>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default BusinessPortal;
