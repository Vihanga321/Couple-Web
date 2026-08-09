import { useMemo, useState } from 'react';
import { ArrowLeft, BadgeCheck, Building2, Check, CircleDollarSign, Eye, ShieldCheck, Store, Users, X } from 'lucide-react';
import { adPlans, categories } from '../data/seed';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

function AdminPortal({ session, listings, setListings, users, setUsers, onBack, onSignOut }) {
  const [tab, setTab] = useState('listings');
  const [message, setMessage] = useState('');

  const pending = listings.filter((item) => item.status === 'pending');
  const approved = listings.filter((item) => item.status === 'approved');
  const paidAds = listings.filter((item) => item.adPlan !== 'free').length;

  const categoryStats = useMemo(() => categories.map((category) => ({
    name: category.name,
    count: approved.filter((item) => item.category === category.name).length,
  })), [approved]);

  const changeListingStatus = async (id, status) => {
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

  return (
    <main className="portal-page admin-page">
      <section className="section-wrap portal-head">
        <button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Customer site</button>
        <div className="portal-title-row">
          <div><span className="eyebrow"><ShieldCheck size={15} /> Admin panel</span><h1>Keep Twonara trusted and useful.</h1><p>Review businesses, manage users and control which listings go live.</p></div>
          <div className="portal-account"><strong>{session.name}</strong><span>{session.email}</span><button onClick={onSignOut}>Sign out</button></div>
        </div>
      </section>

      <section className="section-wrap stat-grid admin-stats">
        <div><span className="stat-icon"><Building2 size={20} /></span><small>Pending review</small><strong>{pending.length}</strong></div>
        <div><span className="stat-icon"><BadgeCheck size={20} /></span><small>Published</small><strong>{approved.length}</strong></div>
        <div><span className="stat-icon"><Users size={20} /></span><small>Accounts</small><strong>{users.length}</strong></div>
        <div><span className="stat-icon"><CircleDollarSign size={20} /></span><small>Paid-plan ads</small><strong>{paidAds}</strong></div>
      </section>

      <section className="section-wrap portal-tabs admin-tabs">
        <button className={tab === 'listings' ? 'active' : ''} onClick={() => setTab('listings')}>Listings</button>
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
                  <div className="admin-listing-copy">
                    <div><strong>{listing.name}</strong><span className={`status-badge ${listing.status}`}>{listing.status}</span></div>
                    <p>{listing.description}</p>
                    <small>{listing.category} · {listing.location} · {adPlans.find((plan) => plan.id === listing.adPlan)?.name || 'Free'} plan</small>
                  </div>
                  <div className="admin-actions">
                    <button className="preview-action" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.address)}`, '_blank', 'noopener,noreferrer')}><Eye size={16} /> Map</button>
                    {listing.status !== 'approved' && <button className="approve-action" onClick={() => changeListingStatus(listing.id, 'approved')}><Check size={16} /> Approve</button>}
                    {listing.status !== 'rejected' && <button className="reject-action" onClick={() => changeListingStatus(listing.id, 'rejected')}><X size={16} /> Reject</button>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'users' && (
        <section className="section-wrap portal-panel admin-panel">
          <div className="panel-heading"><div><span className="mini-label">Accounts</span><h2>Users</h2></div></div>
          <div className="admin-users">
            {users.map((user) => (
              <article key={user.id}><div className="user-avatar">{user.name?.charAt(0)?.toUpperCase() || 'U'}</div><div><strong>{user.name}</strong><span>{user.email}</span><small>{user.role}</small></div><span className={`status-badge ${user.status}`}>{user.status}</span>{user.role !== 'admin' && <button onClick={() => toggleUser(user.id)}>{user.status === 'suspended' ? 'Reactivate' : 'Suspend'}</button>}</article>
            ))}
          </div>
        </section>
      )}

      {tab === 'ads' && (
        <section className="section-wrap ad-plan-grid admin-plan-grid">
          {adPlans.map((plan) => <article key={plan.id}><span className="mini-label">{plan.period}</span><h2>{plan.name}</h2><strong className="plan-price">{plan.price ? `Rs. ${plan.price.toLocaleString()}` : 'Free'}</strong><p>{listings.filter((item) => item.adPlan === plan.id).length} listing(s) currently using this plan.</p></article>)}
        </section>
      )}

      {tab === 'categories' && (
        <section className="section-wrap portal-panel admin-panel">
          <div className="panel-heading"><div><span className="mini-label">Discovery</span><h2>Main categories</h2></div></div>
          <div className="category-admin-grid">{categoryStats.map((item) => <article key={item.name}><strong>{item.name}</strong><span>{item.count} approved business listing(s)</span><small>Core Twonara category</small></article>)}</div>
        </section>
      )}
    </main>
  );
}

export default AdminPortal;
