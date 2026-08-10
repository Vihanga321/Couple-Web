import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BadgeCheck, BookOpen, Building2, Check, CircleDollarSign, Eye, EyeOff, Gift, ShieldCheck, Store, Users, X } from 'lucide-react';
import { adPlans, categories } from '../data/seed';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

function AdminPortal({ session, listings, setListings, users, setUsers, onBack, onSignOut }) {
  const [tab, setTab] = useState('listings');
  const [message, setMessage] = useState('');
  const [gifts, setGifts] = useState([]);
  const [stories, setStories] = useState([]);

  const pending = listings.filter((item) => item.status === 'pending');
  const approved = listings.filter((item) => item.status === 'approved');
  const paidAds = listings.filter((item) => item.adPlan !== 'free').length;

  const categoryStats = useMemo(() => categories.map((category) => ({
    name: category.name,
    count: approved.filter((item) => item.category === category.name).length,
  })), [approved]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;

    Promise.all([
      supabase.from('gift_products').select('id, owner_id, shop_name, name, description, price_text, location, whatsapp_phone, image_url, featured, status, created_at').order('created_at', { ascending: false }),
      supabase.from('date_stories').select('id, user_id, title, story, location, anonymous, display_name, status, created_at').order('created_at', { ascending: false }),
    ]).then(([giftResult, storyResult]) => {
      if (!active) return;
      if (!giftResult.error) setGifts(giftResult.data || []);
      if (!storyResult.error) setStories(storyResult.data || []);
    }).catch(() => {});

    return () => { active = false; };
  }, []);

  const changeListingStatus = async (id, status) => {
    const target = listings.find((item) => item.id === id);
    if (!target) return;

    if (isSupabaseConfigured && status === 'approved' && target.adPlan !== 'free' && target.paymentStatus !== 'paid') {
      setMessage('This paid-plan listing cannot be published until PayHere confirms payment.');
      return;
    }

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('listings').update({ status }).eq('id', id);
        if (error) throw error;
      }
      setListings((current) => current.map((item) => item.id === id ? { ...item, status } : item));
      setMessage(status === 'approved' ? 'Listing approved and published.' : 'Listing rejected.');
    } catch (error) {
      setMessage(error.message || 'Could not update listing.');
    }
  };

  const toggleUser = async (id) => {
    const target = users.find((item) => item.id === id);
    if (!target || target.role === 'admin') return;
    const nextStatus = target.status === 'suspended' ? 'active' : 'suspended';

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('profiles').update({ status: nextStatus }).eq('id', id);
        if (error) throw error;
      }
      setUsers((current) => current.map((item) => item.id === id ? { ...item, status: nextStatus } : item));
      setMessage(nextStatus === 'suspended' ? 'User suspended.' : 'User reactivated.');
    } catch (error) {
      setMessage(error.message || 'Could not update this user.');
    }
  };

  const changeGiftStatus = async (id, status) => {
    try {
      if (!isSupabaseConfigured || !supabase) throw new Error('Gift moderation requires the real Supabase database.');
      const { error } = await supabase.from('gift_products').update({ status }).eq('id', id);
      if (error) throw error;
      setGifts((current) => current.map((gift) => gift.id === id ? { ...gift, status } : gift));
      setMessage(status === 'approved' ? 'Gift product approved and published.' : 'Gift product rejected.');
    } catch (error) {
      setMessage(error.message || 'Could not update this gift product.');
    }
  };

  const changeStoryStatus = async (id, status) => {
    try {
      if (!isSupabaseConfigured || !supabase) throw new Error('Story moderation requires the real Supabase database.');
      const { error } = await supabase.from('date_stories').update({ status }).eq('id', id);
      if (error) throw error;
      setStories((current) => current.map((story) => story.id === id ? { ...story, status } : story));
      setMessage(status === 'published' ? 'Story is visible again.' : 'Story hidden from the public feed.');
    } catch (error) {
      setMessage(error.message || 'Could not update this story.');
    }
  };

  return (
    <main className="portal-page admin-page">
      <section className="section-wrap portal-head">
        <button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Customer site</button>
        <div className="portal-title-row">
          <div><span className="eyebrow"><ShieldCheck size={15} /> Admin panel</span><h1>Keep Twonara trusted and useful.</h1><p>Review places and gifts, manage users, and moderate public date stories.</p></div>
          <div className="portal-account"><strong>{session.name}</strong><span>{session.email}</span><button onClick={onSignOut}>Sign out</button></div>
        </div>
      </section>

      <section className="section-wrap stat-grid admin-stats">
        <div><span className="stat-icon"><Building2 size={20} /></span><small>Pending places</small><strong>{pending.length}</strong></div>
        <div><span className="stat-icon"><Gift size={20} /></span><small>Pending gifts</small><strong>{gifts.filter((item) => item.status === 'pending').length}</strong></div>
        <div><span className="stat-icon"><Users size={20} /></span><small>Accounts</small><strong>{users.length}</strong></div>
        <div><span className="stat-icon"><BookOpen size={20} /></span><small>Stories</small><strong>{stories.length}</strong></div>
      </section>

      <section className="section-wrap portal-tabs admin-tabs">
        <button className={tab === 'listings' ? 'active' : ''} onClick={() => setTab('listings')}>Listings</button>
        <button className={tab === 'gifts' ? 'active' : ''} onClick={() => setTab('gifts')}><Gift size={15} /> Gifts</button>
        <button className={tab === 'stories' ? 'active' : ''} onClick={() => setTab('stories')}><BookOpen size={15} /> Stories</button>
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Users</button>
        <button className={tab === 'ads' ? 'active' : ''} onClick={() => setTab('ads')}>Ads</button>
        <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>Categories</button>
      </section>

      {message && <section className="section-wrap portal-message">{message}</section>}

      {tab === 'listings' && (
        <section className="section-wrap portal-panel admin-panel">
          <div className="panel-heading"><div><span className="mini-label">Moderation</span><h2>Business listings</h2></div></div>
          {listings.length === 0 ? <div className="simple-empty"><Store size={28} /><h3>No listings yet</h3></div> : (
            <div className="admin-listings">
              {listings.map((listing) => (
                <article key={listing.id}>
                  <div className="admin-listing-image">{listing.image ? <img src={listing.image} alt="" /> : <Store size={24} />}</div>
                  <div className="admin-listing-copy"><div><strong>{listing.name}</strong><span className={`status-badge ${listing.status}`}>{listing.status}</span></div><p>{listing.description}</p><small>{listing.category} · {listing.location} · {adPlans.find((plan) => plan.id === listing.adPlan)?.name || 'Free'} plan · payment: {listing.paymentStatus || 'not_required'}</small></div>
                  <div className="admin-actions"><button className="preview-action" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.address)}`, '_blank', 'noopener,noreferrer')}><Eye size={16} /> Map</button>{listing.status !== 'approved' && <button className="approve-action" onClick={() => changeListingStatus(listing.id, 'approved')}><Check size={16} /> Approve</button>}{listing.status !== 'rejected' && <button className="reject-action" onClick={() => changeListingStatus(listing.id, 'rejected')}><X size={16} /> Reject</button>}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'gifts' && (
        <section className="section-wrap portal-panel admin-panel">
          <div className="panel-heading"><div><span className="mini-label">Gift Shop moderation</span><h2>Gift products</h2></div></div>
          {gifts.length === 0 ? <div className="simple-empty"><Gift size={28} /><h3>No gift products in the database yet</h3></div> : (
            <div className="community-admin-list">
              {gifts.map((gift) => (
                <article key={gift.id}>
                  <div><div className="admin-listing-copy"><div><strong>{gift.name}</strong><span className={`status-badge ${gift.status}`}>{gift.status}</span></div><p>{gift.description}</p><small>{gift.shop_name} · {gift.location} · {gift.price_text}</small></div></div>
                  <div className="community-admin-actions">{gift.status !== 'approved' && <button className="approve-action" onClick={() => changeGiftStatus(gift.id, 'approved')}><Check size={15} /> Approve</button>}{gift.status !== 'rejected' && <button className="reject-action" onClick={() => changeGiftStatus(gift.id, 'rejected')}><X size={15} /> Reject</button>}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'stories' && (
        <section className="section-wrap portal-panel admin-panel">
          <div className="panel-heading"><div><span className="mini-label">Community moderation</span><h2>Date Stories</h2></div></div>
          {stories.length === 0 ? <div className="simple-empty"><BookOpen size={28} /><h3>No stories yet</h3></div> : (
            <div className="community-admin-list">
              {stories.map((story) => (
                <article key={story.id}>
                  <div><div className="admin-listing-copy"><div><strong>{story.title}</strong><span className={`status-badge ${story.status === 'published' ? 'approved' : 'rejected'}`}>{story.status}</span></div><p>{story.story}</p><small>{story.location} · {story.anonymous ? 'Anonymous publicly' : (story.display_name || 'Named story')}</small></div></div>
                  <div className="community-admin-actions">{story.status !== 'published' && <button className="approve-action" onClick={() => changeStoryStatus(story.id, 'published')}><Eye size={15} /> Show</button>}{story.status !== 'hidden' && <button className="reject-action" onClick={() => changeStoryStatus(story.id, 'hidden')}><EyeOff size={15} /> Hide</button>}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'users' && (
        <section className="section-wrap portal-panel admin-panel">
          <div className="panel-heading"><div><span className="mini-label">Accounts</span><h2>Users</h2></div></div>
          <div className="admin-users">{users.map((user) => <article key={user.id}><div className="user-avatar">{user.name?.charAt(0)?.toUpperCase() || 'U'}</div><div><strong>{user.name}</strong><span>{user.email}</span><small>{user.role}</small></div><span className={`status-badge ${user.status}`}>{user.status}</span>{user.role !== 'admin' && <button onClick={() => toggleUser(user.id)}>{user.status === 'suspended' ? 'Reactivate' : 'Suspend'}</button>}</article>)}</div>
        </section>
      )}

      {tab === 'ads' && (
        <section className="section-wrap ad-plan-grid admin-plan-grid">{adPlans.map((plan) => <article key={plan.id}><span className="mini-label">{plan.period}</span><h2>{plan.name}</h2><strong className="plan-price">{plan.price ? `Rs. ${plan.price.toLocaleString()}` : 'Free'}</strong><p>{listings.filter((item) => item.adPlan === plan.id).length} listing(s) currently using this plan.</p></article>)}</section>
      )}

      {tab === 'categories' && (
        <section className="section-wrap portal-panel admin-panel"><div className="panel-heading"><div><span className="mini-label">Discovery</span><h2>Main categories</h2></div></div><div className="category-admin-grid">{categoryStats.map((item) => <article key={item.name}><strong>{item.name}</strong><span>{item.count} approved business listing(s)</span><small>Core Twonara category</small></article>)}</div></section>
      )}
    </main>
  );
}

export default AdminPortal;
