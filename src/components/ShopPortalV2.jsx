import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Eye,
  ImagePlus,
  LayoutDashboard,
  MapPin,
  Megaphone,
  PackagePlus,
  Palette,
  Plus,
  Save,
  Send,
  Store,
  Upload,
  XCircle,
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { startPayHereCheckout } from '../lib/payhere';
import { SRI_LANKA_DISTRICTS } from '../data/sriLankaDistricts';

const SHOP_CATEGORIES = ['Do', 'Eat', 'Privacy', 'Relax', 'Stay', 'Gift'];

const SUBTYPES = {
  Do: ['Outdoor', 'Creative', 'Games', 'Adventure', 'Workshop', 'Other'],
  Eat: ['Restaurant', 'Cafe', 'Dessert', 'Rooftop', 'Waterfront', 'Other'],
  Privacy: ['Mini Cinema', 'Movie Theater', 'Private Box', 'Private Dining', 'Other'],
  Relax: ['Spa', 'Wellness', 'Quiet View', 'Beach', 'Cafe', 'Other'],
  Stay: ['Hotel', 'Villa', 'Resort', 'Apartment', 'Beach Stay', 'Other'],
  Gift: ['Flowers', 'Cakes', 'Keepsakes', 'Gift Boxes', 'Custom Gifts', 'Other'],
};

const EMPTY_APPLICATION = {
  name: '',
  contactName: '',
  category: 'Eat',
  subtype: 'Restaurant',
  district: 'Gampaha',
  address: '',
  phone: '',
  whatsapp: '',
  description: '',
  hours: '',
};

function normalizeJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function shopToBuilder(shop) {
  return {
    logoUrl: shop.logoUrl || '',
    coverImage: shop.image || '',
    heroText: shop.heroText || shop.description || '',
    description: shop.description || '',
    whatsapp: shop.whatsappPhone || shop.phone || '',
    phone: shop.phone || '',
    hours: shop.hours || '',
    subtype: shop.subtype || '',
    theme: shop.theme || 'rose',
    gallery: normalizeJsonArray(shop.galleryUrls),
    facilities: normalizeJsonArray(shop.facilities),
    packages: normalizeJsonArray(shop.packages),
  };
}

function ApplicationForm({ initial, onSubmit, busy, rejectedReason }) {
  const [form, setForm] = useState(initial || EMPTY_APPLICATION);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    setForm(initial || EMPTY_APPLICATION);
  }, [initial]);

  return (
    <form className="shop-application-card" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
      <div className="shop-panel-heading">
        <div>
          <span>SHOP APPLICATION</span>
          <h2>{rejectedReason ? 'Update and resubmit your shop' : 'Tell us about your shop'}</h2>
          <p>Admin reviews this information before your Shop Dashboard is activated.</p>
        </div>
        <Building2 size={28} />
      </div>

      {rejectedReason && (
        <div className="shop-rejected-note"><XCircle size={18} /><div><strong>Admin feedback</strong><span>{rejectedReason}</span></div></div>
      )}

      <div className="shop-form-grid">
        <label><span>Shop / business name *</span><input value={form.name} onChange={(e) => update('name', e.target.value)} required /></label>
        <label><span>Contact person *</span><input value={form.contactName} onChange={(e) => update('contactName', e.target.value)} required /></label>
        <label><span>Main category *</span><select value={form.category} onChange={(e) => update('category', e.target.value)}>{SHOP_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>Shop type *</span><select value={form.subtype} onChange={(e) => update('subtype', e.target.value)}>{(SUBTYPES[form.category] || ['Other']).map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>District *</span><select value={form.district} onChange={(e) => update('district', e.target.value)}>{SRI_LANKA_DISTRICTS.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>Phone *</span><input value={form.phone} onChange={(e) => update('phone', e.target.value)} required /></label>
        <label><span>WhatsApp *</span><input value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} required /></label>
        <label><span>Opening hours</span><input value={form.hours} onChange={(e) => update('hours', e.target.value)} placeholder="10:00 AM – 10:00 PM" /></label>
      </div>
      <label><span>Full address *</span><input value={form.address} onChange={(e) => update('address', e.target.value)} required /></label>
      <label><span>Short description *</span><textarea rows="5" value={form.description} onChange={(e) => update('description', e.target.value)} required /></label>

      <button className="shop-primary-button" type="submit" disabled={busy}>
        <Send size={17} /> {busy ? 'Submitting…' : rejectedReason ? 'Resubmit application' : 'Submit for admin review'}
      </button>
    </form>
  );
}

function PendingState({ shop, onBack, onSignOut }) {
  return (
    <div className="shop-status-shell">
      <div className="shop-status-icon pending"><Clock3 size={32} /></div>
      <span>APPLICATION PENDING</span>
      <h1>{shop.name} is waiting for admin review.</h1>
      <p>Once approved, Twonara automatically unlocks your Shop Dashboard. Then you can customize the public shop page and publish it.</p>
      <div className="shop-status-meta"><MapPin size={15} /> {shop.location} District · {shop.category}</div>
      <div className="shop-status-actions"><button onClick={onBack}>Customer website</button><button onClick={onSignOut}>Sign out</button></div>
    </div>
  );
}

function ShopDashboard({ shop, setListings, session, onBack, onSignOut }) {
  const [tab, setTab] = useState('overview');
  const [builder, setBuilder] = useState(() => shopToBuilder(shop));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [packageDraft, setPackageDraft] = useState({ label: '', price: '' });
  const [facilityDraft, setFacilityDraft] = useState('');
  const [galleryDraft, setGalleryDraft] = useState('');

  useEffect(() => setBuilder(shopToBuilder(shop)), [shop.id, shop.updatedAt]);

  const patchLocal = (patch) => {
    setListings((current) => current.map((item) => item.id === shop.id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item));
  };

  const saveBuilder = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.rpc('update_my_shop_page', {
          p_listing_id: shop.id,
          p_logo_url: builder.logoUrl || null,
          p_cover_image_url: builder.coverImage || null,
          p_hero_text: builder.heroText || '',
          p_description: builder.description || '',
          p_whatsapp_phone: builder.whatsapp || '',
          p_phone: builder.phone || '',
          p_opening_hours: builder.hours || '',
          p_subtype: builder.subtype || '',
          p_theme: builder.theme || 'rose',
          p_gallery_urls: builder.gallery,
          p_facilities: builder.facilities,
          p_packages: builder.packages,
        });
        if (error) throw error;
      }
      patchLocal({
        logoUrl: builder.logoUrl,
        image: builder.coverImage,
        heroText: builder.heroText,
        description: builder.description,
        whatsappPhone: builder.whatsapp,
        phone: builder.phone,
        hours: builder.hours,
        subtype: builder.subtype,
        theme: builder.theme,
        galleryUrls: builder.gallery,
        facilities: builder.facilities,
        packages: builder.packages,
      });
      setMessage('Shop page saved.');
    } catch (error) {
      setMessage(error.message || 'Could not save your shop page. Run the shop architecture database upgrade first.');
    } finally {
      setBusy(false);
    }
  };

  const setPublishState = async (published) => {
    setBusy(true);
    setMessage('');
    try {
      if (isSupabaseConfigured && supabase) {
        const functionName = published ? 'publish_my_shop_page' : 'unpublish_my_shop_page';
        const { error } = await supabase.rpc(functionName, { p_listing_id: shop.id });
        if (error) throw error;
      }
      patchLocal({ pageStatus: published ? 'published' : 'draft', publishedAt: published ? new Date().toISOString() : null });
      setMessage(published ? 'Your shop page is now public.' : 'Your shop page is now hidden while you edit it.');
    } catch (error) {
      setMessage(error.message || 'Could not change the publish status.');
    } finally {
      setBusy(false);
    }
  };

  const requestFeatured = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.rpc('request_featured_ad', { p_listing_id: shop.id });
        if (error) throw error;
        patchLocal({ adPlan: 'featured', paymentStatus: 'pending', featuredApproved: false });
        setMessage('Featured Ad requested. Opening secure payment…');
        await startPayHereCheckout({ listingId: shop.id, plan: 'featured' });
      } else {
        patchLocal({ adPlan: 'featured', paymentStatus: 'demo', featuredApproved: false });
        setMessage('Demo mode: Featured Ad request saved without a real payment.');
      }
    } catch (error) {
      setMessage(error.message || 'Could not start the Featured Ad request.');
    } finally {
      setBusy(false);
    }
  };

  const addPackage = () => {
    if (!packageDraft.label.trim()) return;
    setBuilder((current) => ({ ...current, packages: [...current.packages, { label: packageDraft.label.trim(), price: Number(packageDraft.price || 0) }] }));
    setPackageDraft({ label: '', price: '' });
  };

  const addFacility = () => {
    if (!facilityDraft.trim()) return;
    setBuilder((current) => ({ ...current, facilities: [...current.facilities, facilityDraft.trim()] }));
    setFacilityDraft('');
  };

  const addGalleryImage = () => {
    if (!galleryDraft.trim()) return;
    setBuilder((current) => ({ ...current, gallery: [...current.gallery, galleryDraft.trim()] }));
    setGalleryDraft('');
  };

  const live = shop.pageStatus === 'published';
  const featuredReady = shop.adPlan === 'featured' && shop.paymentStatus === 'paid' && shop.featuredApproved;

  return (
    <main className="shop-dashboard-page">
      <header className="shop-dashboard-head">
        <button className="shop-back-link" onClick={onBack}><ArrowLeft size={17} /> Customer site</button>
        <div className="shop-account"><div><strong>{shop.name}</strong><span>{session.email}</span></div><button onClick={onSignOut}>Sign out</button></div>
      </header>

      <section className="shop-dashboard-hero">
        <div><span>SHOP DASHBOARD</span><h1>Build your public Twonara page.</h1><p>Admin approved your shop. Customize it, preview it, then publish when it is ready.</p></div>
        <div className={live ? 'shop-live-pill live' : 'shop-live-pill'}><span></span>{live ? 'PUBLIC' : 'DRAFT'}</div>
      </section>

      <nav className="shop-dashboard-tabs">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}><LayoutDashboard size={16} /> Overview</button>
        <button className={tab === 'customize' ? 'active' : ''} onClick={() => setTab('customize')}><Palette size={16} /> Customize</button>
        <button className={tab === 'packages' ? 'active' : ''} onClick={() => setTab('packages')}><PackagePlus size={16} /> Packages</button>
        <button className={tab === 'gallery' ? 'active' : ''} onClick={() => setTab('gallery')}><ImagePlus size={16} /> Gallery</button>
        <button className={tab === 'promote' ? 'active' : ''} onClick={() => setTab('promote')}><Megaphone size={16} /> Featured Ad</button>
      </nav>

      {message && <div className="shop-dashboard-message">{message}</div>}

      {tab === 'overview' && (
        <section className="shop-overview-grid">
          <article><Store size={22} /><span>Shop status</span><strong>Approved</strong><small>Your dashboard is active.</small></article>
          <article><Eye size={22} /><span>Public page</span><strong>{live ? 'Published' : 'Draft'}</strong><small>{live ? 'Customers can see it now.' : 'Publish when ready.'}</small></article>
          <article><Megaphone size={22} /><span>Featured Ad</span><strong>{featuredReady ? 'Active' : shop.paymentStatus === 'paid' ? 'Waiting admin' : 'Not active'}</strong><small>Featured ads require payment + admin approval.</small></article>
          <article><MapPin size={22} /><span>District</span><strong>{shop.location}</strong><small>{shop.address}</small></article>
          <div className="shop-publish-card">
            <div><span>PUBLIC SHOP PAGE</span><h2>{live ? 'Your shop page is live.' : 'Ready to show customers?'}</h2><p>Customers do not need an account. Once published, anyone can open your shop page and use Call, WhatsApp and Directions.</p></div>
            {live ? <button onClick={() => setPublishState(false)} disabled={busy}>Unpublish for editing</button> : <button className="shop-primary-button" onClick={() => setPublishState(true)} disabled={busy}><Upload size={17} /> Publish shop page</button>}
          </div>
        </section>
      )}

      {tab === 'customize' && (
        <section className="shop-builder-panel">
          <div className="shop-panel-heading"><div><span>PAGE BUILDER</span><h2>Shop information & appearance</h2></div><Palette size={26} /></div>
          <div className="shop-form-grid">
            <label><span>Logo image URL</span><input value={builder.logoUrl} onChange={(e) => setBuilder({ ...builder, logoUrl: e.target.value })} placeholder="https://..." /></label>
            <label><span>Cover image URL *</span><input value={builder.coverImage} onChange={(e) => setBuilder({ ...builder, coverImage: e.target.value })} placeholder="https://..." /></label>
            <label><span>Shop type</span><select value={builder.subtype} onChange={(e) => setBuilder({ ...builder, subtype: e.target.value })}>{(SUBTYPES[shop.category] || ['Other']).map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Theme</span><select value={builder.theme} onChange={(e) => setBuilder({ ...builder, theme: e.target.value })}><option value="rose">Twonara Rose</option><option value="midnight">Midnight</option><option value="cream">Warm Cream</option></select></label>
            <label><span>Phone</span><input value={builder.phone} onChange={(e) => setBuilder({ ...builder, phone: e.target.value })} /></label>
            <label><span>WhatsApp</span><input value={builder.whatsapp} onChange={(e) => setBuilder({ ...builder, whatsapp: e.target.value })} /></label>
            <label><span>Opening hours</span><input value={builder.hours} onChange={(e) => setBuilder({ ...builder, hours: e.target.value })} /></label>
          </div>
          <label><span>Hero text</span><input value={builder.heroText} onChange={(e) => setBuilder({ ...builder, heroText: e.target.value })} placeholder="A short line customers see first" /></label>
          <label><span>About your shop</span><textarea rows="6" value={builder.description} onChange={(e) => setBuilder({ ...builder, description: e.target.value })} /></label>
          <div className="shop-inline-editor"><input value={facilityDraft} onChange={(e) => setFacilityDraft(e.target.value)} placeholder="Add facility: Parking, AC, Wi‑Fi..." /><button type="button" onClick={addFacility}><Plus size={16} /> Add</button></div>
          <div className="shop-chip-list">{builder.facilities.map((item, index) => <button type="button" key={`${item}-${index}`} onClick={() => setBuilder((current) => ({ ...current, facilities: current.facilities.filter((_, i) => i !== index) }))}>{item} ×</button>)}</div>
          <button className="shop-primary-button" onClick={saveBuilder} disabled={busy}><Save size={17} /> Save shop page</button>
        </section>
      )}

      {tab === 'packages' && (
        <section className="shop-builder-panel">
          <div className="shop-panel-heading"><div><span>MENU / PACKAGES</span><h2>Add what customers can choose</h2><p>Example: 1 hour — Rs. 6,500 / 2 hours — Rs. 9,000.</p></div><PackagePlus size={26} /></div>
          <div className="shop-inline-editor package"><input value={packageDraft.label} onChange={(e) => setPackageDraft({ ...packageDraft, label: e.target.value })} placeholder="Package name / duration" /><input type="number" min="0" value={packageDraft.price} onChange={(e) => setPackageDraft({ ...packageDraft, price: e.target.value })} placeholder="Price LKR" /><button type="button" onClick={addPackage}><Plus size={16} /> Add</button></div>
          <div className="shop-package-editor-list">{builder.packages.map((item, index) => <article key={`${item.label}-${index}`}><div><strong>{item.label}</strong><span>{Number(item.price || 0) > 0 ? `Rs. ${Number(item.price).toLocaleString()}/=` : 'Ask shop'}</span></div><button type="button" onClick={() => setBuilder((current) => ({ ...current, packages: current.packages.filter((_, i) => i !== index) }))}>Remove</button></article>)}</div>
          <button className="shop-primary-button" onClick={saveBuilder} disabled={busy}><Save size={17} /> Save packages</button>
        </section>
      )}

      {tab === 'gallery' && (
        <section className="shop-builder-panel">
          <div className="shop-panel-heading"><div><span>PHOTO GALLERY</span><h2>Show customers the shop</h2></div><ImagePlus size={26} /></div>
          <div className="shop-inline-editor"><input value={galleryDraft} onChange={(e) => setGalleryDraft(e.target.value)} placeholder="Image URL" /><button type="button" onClick={addGalleryImage}><Plus size={16} /> Add</button></div>
          <div className="shop-gallery-editor">{builder.gallery.map((url, index) => <article key={`${url}-${index}`}><img src={url} alt="" /><button type="button" onClick={() => setBuilder((current) => ({ ...current, gallery: current.gallery.filter((_, i) => i !== index) }))}>Remove</button></article>)}</div>
          <button className="shop-primary-button" onClick={saveBuilder} disabled={busy}><Save size={17} /> Save gallery</button>
        </section>
      )}

      {tab === 'promote' && (
        <section className="shop-builder-panel shop-promote-panel">
          <div className="shop-panel-heading"><div><span>FEATURED ADS</span><h2>Get premium homepage placement</h2></div><Megaphone size={26} /></div>
          <div className="shop-featured-flow"><div><span>1</span><p><strong>Request Featured</strong><small>Choose the paid Featured plan.</small></p></div><div><span>2</span><p><strong>Payment confirmed</strong><small>PayHere marks the payment as paid.</small></p></div><div><span>3</span><p><strong>Admin approval</strong><small>Admin reviews the promotion request.</small></p></div><div><span>4</span><p><strong>Featured Ads</strong><small>Your shop appears in the homepage Featured Ads section.</small></p></div></div>
          <div className="shop-ad-status"><CircleDollarSign size={20} /><div><strong>Current status</strong><span>Plan: {shop.adPlan || 'free'} · Payment: {shop.paymentStatus || 'not_required'} · Admin: {shop.featuredApproved ? 'approved' : 'not approved'}</span></div></div>
          <button className="shop-primary-button" onClick={requestFeatured} disabled={busy || featuredReady}>{featuredReady ? 'Featured Ad active' : 'Request Featured Ad'}</button>
        </section>
      )}
    </main>
  );
}

export default function ShopPortalV2({ session, listings, setListings, onBack, onSignOut }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const myShop = useMemo(
    () => listings.filter((item) => item.ownerId === session.id).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0] || null,
    [listings, session.id],
  );

  const initialApplication = myShop ? {
    name: myShop.name || '',
    contactName: myShop.contactName || session.name || '',
    category: myShop.category || 'Eat',
    subtype: myShop.subtype || 'Restaurant',
    district: myShop.location || 'Gampaha',
    address: myShop.address || '',
    phone: myShop.phone || '',
    whatsapp: myShop.whatsappPhone || myShop.phone || '',
    description: myShop.description || '',
    hours: myShop.hours || '',
  } : { ...EMPTY_APPLICATION, contactName: session.name || '' };

  const submitApplication = async (form) => {
    setBusy(true);
    setMessage('');
    const id = myShop?.id || (crypto?.randomUUID?.() || `shop-${Date.now()}`);
    const payload = {
      id,
      ownerId: session.id,
      name: form.name.trim(),
      businessName: form.name.trim(),
      contactName: form.contactName.trim(),
      category: form.category,
      subtype: form.subtype,
      location: form.district,
      address: form.address.trim(),
      phone: form.phone.trim(),
      whatsappPhone: form.whatsapp.trim(),
      description: form.description.trim(),
      hours: form.hours.trim(),
      status: 'pending',
      pageStatus: 'draft',
      adPlan: myShop?.adPlan || 'free',
      paymentStatus: myShop?.paymentStatus || 'not_required',
      createdAt: myShop?.createdAt || new Date().toISOString(),
      rejectionReason: null,
    };

    try {
      if (isSupabaseConfigured && supabase) {
        if (myShop) {
          const { error } = await supabase.from('listings').update({
            name: payload.name,
            contact_name: payload.contactName,
            category: payload.category,
            subtype: payload.subtype,
            location: payload.location,
            address: payload.address,
            phone: payload.phone,
            whatsapp_phone: payload.whatsappPhone,
            description: payload.description,
            opening_hours: payload.hours,
            status: 'pending',
            rejection_reason: null,
          }).eq('id', myShop.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('listings').insert({
            id: payload.id,
            owner_id: session.id,
            name: payload.name,
            contact_name: payload.contactName,
            category: payload.category,
            subtype: payload.subtype,
            location: payload.location,
            address: payload.address,
            phone: payload.phone,
            whatsapp_phone: payload.whatsappPhone,
            description: payload.description,
            opening_hours: payload.hours,
            price_text: 'See shop packages',
            estimated_cost: 0,
            ad_plan: 'free',
            status: 'pending',
            page_status: 'draft',
            payment_status: 'not_required',
          });
          if (error) throw error;
        }
      }

      setListings((current) => myShop
        ? current.map((item) => item.id === myShop.id ? { ...item, ...payload } : item)
        : [payload, ...current]);
      setMessage('Application submitted to Twonara Admin.');
    } catch (error) {
      setMessage(error.message || 'Could not submit the shop application. Run the shop architecture SQL upgrade first.');
    } finally {
      setBusy(false);
    }
  };

  if (!myShop || myShop.status === 'rejected') {
    return (
      <main className="shop-portal-page">
        <header className="shop-simple-head"><button onClick={onBack}><ArrowLeft size={17} /> Customer site</button><div><span>{session.email}</span><button onClick={onSignOut}>Sign out</button></div></header>
        <section className="shop-application-shell">
          <div className="shop-application-intro"><span>POST YOUR AD</span><h1>{myShop ? 'Fix your application and try again.' : 'Apply to join Twonara.'}</h1><p>Login first, complete your shop details, and submit them for admin review. No public shop page is created until approval.</p></div>
          {message && <div className="shop-dashboard-message">{message}</div>}
          <ApplicationForm initial={initialApplication} onSubmit={submitApplication} busy={busy} rejectedReason={myShop?.rejectionReason} />
        </section>
      </main>
    );
  }

  if (myShop.status === 'pending') return <PendingState shop={myShop} onBack={onBack} onSignOut={onSignOut} />;

  return <ShopDashboard shop={myShop} setListings={setListings} session={session} onBack={onBack} onSignOut={onSignOut} />;
}
