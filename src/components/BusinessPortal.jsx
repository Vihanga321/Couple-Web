import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Building2, Check, CircleDollarSign, Clock3, Copy, Eye, Gift, KeyRound, MapPin, PackagePlus, Plus, Store } from 'lucide-react';
import { adPlans, categories } from '../data/seed';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { startPayHereCheckout } from '../lib/payhere';

const emptyForm = {
  name: '', category: 'Eat', location: 'Negombo', address: '', description: '', price: '', estimatedCost: '',
  phone: '', hours: '', image: '', adPlan: 'free',
};

const emptyGiftForm = {
  shopName: '', name: '', description: '', priceText: '', priceAmount: '', location: 'Negombo',
  whatsappPhone: '', deliveryText: '', imageUrl: '',
};

function StatusBadge({ status }) {
  return <span className={`status-badge ${status}`}>{status}</span>;
}

function BusinessPortal({ session, listings, setListings, onBack, onSignOut }) {
  const [tab, setTab] = useState('dashboard');
  const [form, setForm] = useState(emptyForm);
  const [giftForm, setGiftForm] = useState(emptyGiftForm);
  const [giftProducts, setGiftProducts] = useState([]);
  const [visitCodes, setVisitCodes] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const myListings = useMemo(() => listings.filter((item) => item.ownerId === session.id), [listings, session.id]);
  const liveCount = myListings.filter((item) => item.status === 'approved').length;
  const pendingCount = myListings.filter((item) => item.status === 'pending').length;
  const views = myListings.reduce((sum, item) => sum + (item.views || 0), 0);
  const selectedPlan = adPlans.find((item) => item.id === form.adPlan) || adPlans[0];

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;
    supabase
      .from('gift_products')
      .select('id, owner_id, shop_name, name, description, price_text, price_amount, location, whatsapp_phone, delivery_text, image_url, featured, status, created_at')
      .eq('owner_id', session.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active || error) return;
        setGiftProducts((data || []).map((row) => ({
          id: row.id,
          shopName: row.shop_name,
          name: row.name,
          description: row.description,
          priceText: row.price_text,
          priceAmount: Number(row.price_amount || 0),
          location: row.location,
          whatsappPhone: row.whatsapp_phone,
          deliveryText: row.delivery_text,
          imageUrl: row.image_url,
          featured: row.featured,
          status: row.status,
          createdAt: row.created_at,
        })));
      });
    return () => { active = false; };
  }, [session.id]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateGift = (key, value) => setGiftForm((current) => ({ ...current, [key]: value }));

  const submitListing = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    const listingId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `listing-${Date.now()}`;
    const listing = {
      id: listingId,
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
      if (!listing.name || !listing.address || !listing.description || !listing.phone) throw new Error('Please complete the required business details.');
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
      setTab('dashboard');

      if (selectedPlan.price > 0 && isSupabaseConfigured) {
        setMessage('Listing saved. Redirecting to secure PayHere checkout…');
        await startPayHereCheckout({ listingId: listing.id, plan: listing.adPlan });
      } else if (selectedPlan.price > 0) {
        setMessage('Listing submitted in demo mode. No real payment was taken.');
      } else {
        setMessage('Free listing submitted for admin review.');
      }
    } catch (error) {
      setMessage(error.message || 'Could not submit listing.');
    } finally {
      setBusy(false);
    }
  };

  const submitGift = async (event) => {
    event.preventDefault();
    if (!giftForm.shopName.trim() || !giftForm.name.trim() || !giftForm.description.trim() || !giftForm.whatsappPhone.trim()) {
      setMessage('Complete the required gift product details.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const localGift = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `gift-${Date.now()}`,
        shopName: giftForm.shopName.trim(),
        name: giftForm.name.trim(),
        description: giftForm.description.trim(),
        priceText: giftForm.priceText.trim() || 'Contact for price',
        priceAmount: Number(giftForm.priceAmount) || 0,
        location: giftForm.location.trim() || 'Negombo',
        whatsappPhone: giftForm.whatsappPhone.trim(),
        deliveryText: giftForm.deliveryText.trim() || 'Contact seller for delivery',
        imageUrl: giftForm.imageUrl.trim(),
        status: 'pending',
        featured: false,
        createdAt: new Date().toISOString(),
      };

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('gift_products').insert({
          id: localGift.id,
          owner_id: session.id,
          shop_name: localGift.shopName,
          name: localGift.name,
          description: localGift.description,
          price_text: localGift.priceText,
          price_amount: localGift.priceAmount,
          location: localGift.location,
          whatsapp_phone: localGift.whatsappPhone,
          delivery_text: localGift.deliveryText,
          image_url: localGift.imageUrl || null,
          status: 'pending',
        }).select('id, created_at').single();
        if (error) throw error;
        localGift.id = data.id;
        localGift.createdAt = data.created_at;
      }

      setGiftProducts((current) => [localGift, ...current]);
      setGiftForm(emptyGiftForm);
      setMessage('Gift product submitted for admin approval.');
    } catch (error) {
      setMessage(error.message || 'Could not submit this gift product. Run the community database upgrade if this is your first time using Gifts.');
    } finally {
      setBusy(false);
    }
  };

  const generateVisitCode = async (listingId) => {
    if (!isSupabaseConfigured || !supabase) {
      setMessage('Verified Visit codes require the real Supabase database.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const { data, error } = await supabase.rpc('create_visit_code', { p_listing_id: listingId });
      if (error) throw error;
      setVisitCodes((current) => ({ ...current, [listingId]: data }));
      setMessage('One-time visit code created. Give it only to the customer after the real visit.');
    } catch (error) {
      setMessage(error.message || 'Could not create a visit code. Only approved listings can create codes.');
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async (code) => {
    try { await navigator.clipboard.writeText(code); } catch { /* clipboard may be unavailable */ }
  };

  return (
    <main className="portal-page">
      <section className="section-wrap portal-head">
        <button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Customer site</button>
        <div className="portal-title-row">
          <div><span className="eyebrow"><Building2 size={15} /> Business portal</span><h1>Grow your place with Twonara.</h1><p>Post a listing, add gift products and use one-time visit codes to build more trustworthy reviews.</p></div>
          <div className="portal-account"><strong>{session.name}</strong><span>{session.email}</span><button onClick={onSignOut}>Sign out</button></div>
        </div>
      </section>

      <section className="section-wrap portal-tabs">
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>Dashboard</button>
        <button className={tab === 'post' ? 'active' : ''} onClick={() => setTab('post')}><Plus size={16} /> Post a place</button>
        <button className={tab === 'gifts' ? 'active' : ''} onClick={() => setTab('gifts')}><Gift size={16} /> Gift products</button>
        <button className={tab === 'trust' ? 'active' : ''} onClick={() => setTab('trust')}><KeyRound size={16} /> Review codes</button>
        <button className={tab === 'plans' ? 'active' : ''} onClick={() => setTab('plans')}>Ad plans</button>
      </section>

      {message && <section className="section-wrap portal-message">{message}</section>}

      {tab === 'dashboard' && (
        <section className="section-wrap business-dashboard">
          <div className="stat-grid">
            <div><span className="stat-icon"><Store size={20} /></span><small>My listings</small><strong>{myListings.length}</strong></div>
            <div><span className="stat-icon"><Check size={20} /></span><small>Live</small><strong>{liveCount}</strong></div>
            <div><span className="stat-icon"><Clock3 size={20} /></span><small>Pending</small><strong>{pendingCount}</strong></div>
            <div><span className="stat-icon"><Gift size={20} /></span><small>Gift products</small><strong>{giftProducts.length}</strong></div>
          </div>

          <div className="portal-panel">
            <div className="panel-heading"><div><span className="mini-label">Your places</span><h2>Listings</h2></div><button className="primary-small-button" onClick={() => setTab('post')}><Plus size={16} /> New listing</button></div>
            {myListings.length === 0 ? <div className="simple-empty"><Store size={28} /><h3>No places posted yet</h3><p>Post your first place and it will go to admin review.</p></div> : (
              <div className="business-list">{myListings.map((listing) => (
                <article key={listing.id}>
                  <div className="business-list-image">{listing.image ? <img src={listing.image} alt="" /> : <Store size={24} />}</div>
                  <div className="business-list-main"><strong>{listing.name}</strong><span><MapPin size={14} /> {listing.location} · {listing.category}</span><small>{adPlans.find((plan) => plan.id === listing.adPlan)?.name || 'Free'} plan · payment: {listing.paymentStatus}</small></div>
                  <StatusBadge status={listing.status} />
                </article>
              ))}</div>
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
            <div className="plan-picker"><span>Choose ad plan</span><div>{adPlans.map((plan) => <button type="button" key={plan.id} className={form.adPlan === plan.id ? 'active' : ''} onClick={() => update('adPlan', plan.id)}><strong>{plan.name}</strong><small>{plan.price ? `Rs. ${plan.price.toLocaleString()} / ${plan.period}` : 'Free'}</small></button>)}</div></div>
            <div className="submit-note"><CircleDollarSign size={18} /><p>{selectedPlan.price === 0 ? 'No payment is needed for the Free plan.' : isSupabaseConfigured ? 'After saving the listing you will be redirected to PayHere. Twonara only marks it paid after the signed server callback is verified.' : 'Demo mode: no real payment will be taken.'}</p></div>
            <button className="primary-wide-button" type="submit" disabled={busy}><Plus size={18} /> {busy ? 'Submitting…' : selectedPlan.price > 0 && isSupabaseConfigured ? 'Save & continue to payment' : 'Submit for review'}</button>
          </form>
          <aside className="post-help-card"><BarChart3 size={25} /><h3>Keep listings useful</h3><p>Use accurate prices, clear photos, real contact details and venue rules. Twonara can reject misleading or unsafe listings.</p></aside>
        </section>
      )}

      {tab === 'gifts' && (
        <section className="section-wrap post-layout">
          <form className="post-form portal-panel" onSubmit={submitGift}>
            <div className="panel-heading"><div><span className="mini-label">Gift Shop</span><h2>Add a gift product</h2></div></div>
            <div className="form-grid two">
              <label><span>Shop name *</span><input value={giftForm.shopName} onChange={(event) => updateGift('shopName', event.target.value)} required /></label>
              <label><span>Gift name *</span><input value={giftForm.name} onChange={(event) => updateGift('name', event.target.value)} required /></label>
              <label><span>City / area *</span><input value={giftForm.location} onChange={(event) => updateGift('location', event.target.value)} required /></label>
              <label><span>WhatsApp *</span><input value={giftForm.whatsappPhone} onChange={(event) => updateGift('whatsappPhone', event.target.value)} required /></label>
              <label><span>Price text</span><input value={giftForm.priceText} onChange={(event) => updateGift('priceText', event.target.value)} placeholder="From Rs. 2,500" /></label>
              <label><span>Price amount (LKR)</span><input type="number" min="0" value={giftForm.priceAmount} onChange={(event) => updateGift('priceAmount', event.target.value)} /></label>
              <label><span>Delivery / pickup</span><input value={giftForm.deliveryText} onChange={(event) => updateGift('deliveryText', event.target.value)} placeholder="Pickup or local delivery" /></label>
              <label><span>Image URL</span><input value={giftForm.imageUrl} onChange={(event) => updateGift('imageUrl', event.target.value)} placeholder="https://..." /></label>
            </div>
            <label><span>Description *</span><textarea rows="5" value={giftForm.description} onChange={(event) => updateGift('description', event.target.value)} required /></label>
            <button className="primary-wide-button" type="submit" disabled={busy}><PackagePlus size={18} /> {busy ? 'Submitting…' : 'Submit gift for approval'}</button>
          </form>
          <aside className="portal-panel">
            <div className="panel-heading"><div><span className="mini-label">Your products</span><h2>Gift status</h2></div></div>
            <div className="business-list">{giftProducts.length ? giftProducts.map((gift) => <article key={gift.id}><div className="business-list-image">{gift.imageUrl ? <img src={gift.imageUrl} alt="" /> : <Gift size={24} />}</div><div className="business-list-main"><strong>{gift.name}</strong><span>{gift.shopName} · {gift.location}</span><small>{gift.priceText}</small></div><StatusBadge status={gift.status} /></article>) : <div className="simple-empty"><Gift size={26} /><h3>No gift products yet</h3></div>}</div>
          </aside>
        </section>
      )}

      {tab === 'trust' && (
        <section className="section-wrap portal-panel">
          <div className="panel-heading"><div><span className="mini-label">Trusted reviews</span><h2>One-time Verified Visit codes</h2></div></div>
          <p className="muted-copy">Generate a code only after the customer actually visits. A code can be used once and expires automatically. Clicking WhatsApp alone only creates the lower “Contacted via Twonara” badge.</p>
          <div className="business-tool-grid">
            {myListings.filter((listing) => listing.status === 'approved').map((listing) => (
              <article className="business-tool-card" key={listing.id}>
                <KeyRound size={21} />
                <h3>{listing.name}</h3>
                <p>Create a fresh code for one customer after their visit.</p>
                <button onClick={() => generateVisitCode(listing.id)} disabled={busy}>Generate one-time code</button>
                {visitCodes[listing.id] && <div className="visit-code-output"><strong>{visitCodes[listing.id]}</strong><button onClick={() => copyCode(visitCodes[listing.id])}><Copy size={15} /> Copy</button></div>}
              </article>
            ))}
          </div>
          {liveCount === 0 && <div className="simple-empty"><KeyRound size={28} /><h3>No approved listings yet</h3><p>Visit codes become available after an admin approves your place.</p></div>}
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
