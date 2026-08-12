import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Building2,
  Check,
  CircleDollarSign,
  Eye,
  Megaphone,
  ShieldCheck,
  Store,
  Users,
  X,
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

function Badge({ value }) {
  return <span className={`shop-admin-badge ${String(value || '').toLowerCase()}`}>{value}</span>;
}

export default function AdminPortalV2({ session, listings, setListings, users, setUsers, onBack, onSignOut }) {
  const [tab, setTab] = useState('applications');
  const [message, setMessage] = useState('');
  const [reasons, setReasons] = useState({});
  const [stories, setStories] = useState([]);

  const pending = useMemo(() => listings.filter((item) => item.status === 'pending'), [listings]);
  const approved = useMemo(() => listings.filter((item) => item.status === 'approved'), [listings]);
  const live = useMemo(() => approved.filter((item) => item.pageStatus === 'published'), [approved]);
  const featuredRequests = useMemo(() => approved.filter((item) => item.adPlan === 'featured'), [approved]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;
    supabase.from('date_stories').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
      if (active && !error) setStories(data || []);
    });
    return () => { active = false; };
  }, []);

  const updateListing = async (id, patch, successMessage) => {
    try {
      if (isSupabaseConfigured && supabase) {
        const dbPatch = {};
        if ('status' in patch) dbPatch.status = patch.status;
        if ('pageStatus' in patch) dbPatch.page_status = patch.pageStatus;
        if ('rejectionReason' in patch) dbPatch.rejection_reason = patch.rejectionReason;
        if ('approvedAt' in patch) dbPatch.approved_at = patch.approvedAt;
        if ('featuredApproved' in patch) dbPatch.featured_approved = patch.featuredApproved;
        if ('featuredUntil' in patch) dbPatch.featured_until = patch.featuredUntil;
        const { error } = await supabase.from('listings').update(dbPatch).eq('id', id);
        if (error) throw error;
      }
      setListings((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
      setMessage(successMessage);
    } catch (error) {
      setMessage(error.message || 'Could not update this shop.');
    }
  };

  const approveShop = (shop) => {
    updateListing(shop.id, {
      status: 'approved',
      pageStatus: 'draft',
      rejectionReason: null,
      approvedAt: new Date().toISOString(),
    }, `${shop.name} approved. Its Shop Dashboard is now active; the owner can customize and publish the page.`);
  };

  const rejectShop = (shop) => {
    const reason = (reasons[shop.id] || '').trim();
    if (!reason) {
      setMessage('Add a short rejection/request-changes reason first.');
      return;
    }
    updateListing(shop.id, { status: 'rejected', pageStatus: 'draft', rejectionReason: reason }, `${shop.name} was rejected with feedback for the owner.`);
  };

  const approveFeatured = (shop) => {
    if (shop.paymentStatus !== 'paid') {
      setMessage('Featured placement can only be approved after PayHere marks the payment as paid.');
      return;
    }
    const until = new Date();
    until.setDate(until.getDate() + 30);
    updateListing(shop.id, { featuredApproved: true, featuredUntil: until.toISOString() }, `${shop.name} is approved for Featured Ads for 30 days.`);
  };

  const toggleUser = async (user) => {
    if (user.role === 'admin') return;
    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('profiles').update({ status: nextStatus }).eq('id', user.id);
        if (error) throw error;
      }
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, status: nextStatus } : item));
      setMessage(`Account ${nextStatus === 'active' ? 'reactivated' : 'suspended'}.`);
    } catch (error) {
      setMessage(error.message || 'Could not update this account.');
    }
  };

  const changeStoryStatus = async (story, status) => {
    try {
      if (!isSupabaseConfigured || !supabase) throw new Error('Story moderation requires Supabase.');
      const { error } = await supabase.from('date_stories').update({ status }).eq('id', story.id);
      if (error) throw error;
      setStories((current) => current.map((item) => item.id === story.id ? { ...item, status } : item));
      setMessage(status === 'published' ? 'Story published.' : 'Story hidden.');
    } catch (error) {
      setMessage(error.message || 'Could not moderate this story.');
    }
  };

  return (
    <main className="shop-admin-page">
      <header className="shop-admin-head">
        <button onClick={onBack}><ArrowLeft size={17} /> Customer website</button>
        <div><strong>Twonara Admin</strong><span>{session.email}</span><button onClick={onSignOut}>Sign out</button></div>
      </header>

      <section className="shop-admin-hero">
        <div><span>ADMIN DASHBOARD</span><h1>Review shops before customers see them.</h1><p>Approve applications, manage published shop pages, control Featured Ads, moderate stories, and manage business accounts.</p></div>
        <ShieldCheck size={42} />
      </section>

      <section className="shop-admin-stats">
        <article><Building2 size={20} /><span>Pending</span><strong>{pending.length}</strong></article>
        <article><Store size={20} /><span>Approved</span><strong>{approved.length}</strong></article>
        <article><Eye size={20} /><span>Published</span><strong>{live.length}</strong></article>
        <article><Megaphone size={20} /><span>Featured requests</span><strong>{featuredRequests.length}</strong></article>
      </section>

      <nav className="shop-admin-tabs">
        <button className={tab === 'applications' ? 'active' : ''} onClick={() => setTab('applications')}><Building2 size={16} /> Applications</button>
        <button className={tab === 'shops' ? 'active' : ''} onClick={() => setTab('shops')}><Store size={16} /> Shops</button>
        <button className={tab === 'featured' ? 'active' : ''} onClick={() => setTab('featured')}><Megaphone size={16} /> Featured Ads</button>
        <button className={tab === 'stories' ? 'active' : ''} onClick={() => setTab('stories')}><BookOpen size={16} /> Stories</button>
        <button className={tab === 'accounts' ? 'active' : ''} onClick={() => setTab('accounts')}><Users size={16} /> Accounts</button>
      </nav>

      {message && <div className="shop-admin-message">{message}</div>}

      {tab === 'applications' && (
        <section className="shop-admin-panel">
          <div className="shop-admin-panel-title"><div><span>REVIEW QUEUE</span><h2>Shop applications</h2></div><strong>{pending.length} waiting</strong></div>
          {pending.length === 0 ? <div className="shop-admin-empty"><Check size={28} /><h3>No applications waiting</h3></div> : (
            <div className="shop-application-list">{pending.map((shop) => (
              <article key={shop.id}>
                <div className="shop-application-main">
                  <div className="shop-application-top"><div><strong>{shop.name}</strong><Badge value="pending" /></div><span>{shop.category} · {shop.subtype || 'Other'} · {shop.location} District</span></div>
                  <p>{shop.description}</p>
                  <div className="shop-application-details"><span><b>Contact:</b> {shop.contactName || 'Not provided'}</span><span><b>Phone:</b> {shop.phone}</span><span><b>WhatsApp:</b> {shop.whatsappPhone || shop.phone}</span><span><b>Address:</b> {shop.address}</span></div>
                  <label><span>Reason if rejecting / requesting changes</span><textarea rows="2" value={reasons[shop.id] || ''} onChange={(e) => setReasons((current) => ({ ...current, [shop.id]: e.target.value }))} placeholder="e.g. Please add a clearer address and valid contact number." /></label>
                </div>
                <div className="shop-admin-actions"><button className="approve" onClick={() => approveShop(shop)}><Check size={16} /> Approve</button><button className="reject" onClick={() => rejectShop(shop)}><X size={16} /> Reject</button></div>
              </article>
            ))}</div>
          )}
        </section>
      )}

      {tab === 'shops' && (
        <section className="shop-admin-panel">
          <div className="shop-admin-panel-title"><div><span>APPROVED BUSINESSES</span><h2>Shop pages</h2></div><strong>{live.length} public</strong></div>
          <div className="shop-admin-table-list">{approved.map((shop) => (
            <article key={shop.id}>
              <div className="shop-admin-thumb">{shop.image ? <img src={shop.image} alt="" /> : <Store size={22} />}</div>
              <div><strong>{shop.name}</strong><span>{shop.category} · {shop.location} District</span><small>{shop.address}</small></div>
              <Badge value={shop.pageStatus === 'published' ? 'published' : 'draft'} />
            </article>
          ))}</div>
        </section>
      )}

      {tab === 'featured' && (
        <section className="shop-admin-panel">
          <div className="shop-admin-panel-title"><div><span>PAID PROMOTION</span><h2>Featured Ad requests</h2></div><CircleDollarSign size={24} /></div>
          {featuredRequests.length === 0 ? <div className="shop-admin-empty"><Megaphone size={28} /><h3>No Featured requests yet</h3></div> : (
            <div className="shop-featured-admin-list">{featuredRequests.map((shop) => (
              <article key={shop.id}><div><strong>{shop.name}</strong><span>{shop.location} District</span><small>Payment: {shop.paymentStatus || 'pending'} · Admin: {shop.featuredApproved ? 'approved' : 'waiting'}</small></div>{shop.featuredApproved ? <Badge value="approved" /> : <button onClick={() => approveFeatured(shop)} disabled={shop.paymentStatus !== 'paid'}><BadgeCheck size={16} /> Approve Featured</button>}</article>
            ))}</div>
          )}
        </section>
      )}

      {tab === 'stories' && (
        <section className="shop-admin-panel">
          <div className="shop-admin-panel-title"><div><span>COMMUNITY</span><h2>Anonymous date stories</h2></div><BookOpen size={24} /></div>
          <div className="shop-story-admin-list">{stories.map((story) => (
            <article key={story.id}><div><strong>{story.title}</strong><span>{story.location} District · {story.anonymous ? 'Anonymous' : (story.display_name || 'Named')}</span><p>{story.story}</p></div><div>{story.status !== 'published' && <button className="approve" onClick={() => changeStoryStatus(story, 'published')}><Eye size={15} /> Publish</button>}{story.status !== 'hidden' && <button className="reject" onClick={() => changeStoryStatus(story, 'hidden')}><X size={15} /> Hide</button>}</div></article>
          ))}</div>
        </section>
      )}

      {tab === 'accounts' && (
        <section className="shop-admin-panel">
          <div className="shop-admin-panel-title"><div><span>ACCESS</span><h2>Business & admin accounts</h2></div><Users size={24} /></div>
          <div className="shop-account-list">{users.filter((user) => user.role !== 'customer').map((user) => (
            <article key={user.id}><div className="shop-account-avatar">{user.name?.charAt(0)?.toUpperCase() || 'U'}</div><div><strong>{user.name}</strong><span>{user.email}</span><small>{user.role}</small></div><Badge value={user.status} />{user.role !== 'admin' && <button onClick={() => toggleUser(user)}>{user.status === 'suspended' ? 'Reactivate' : 'Suspend'}</button>}</article>
          ))}</div>
        </section>
      )}
    </main>
  );
}
