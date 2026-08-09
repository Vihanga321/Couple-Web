import { Bookmark, CalendarDays, Heart, LogOut, MessageSquare, Star, UserRound } from 'lucide-react';

export function SavedView({ places, savedItems, savedPlans, onOpenPlace, onOpenPlan, onExplore }) {
  const savedPlaces = savedItems.map((id) => places.find((place) => place.id === id)).filter(Boolean);

  return (
    <main className="customer-page">
      <section className="section-wrap customer-hero">
        <span className="eyebrow"><Bookmark size={15} /> Saved</span>
        <h1>Keep the ideas you both like.</h1>
        <p>Your saved places and saved date plans stay together here.</p>
      </section>

      <section className="section-wrap saved-section">
        <div className="panel-heading"><div><span className="mini-label">Places</span><h2>Saved places</h2></div></div>
        {savedPlaces.length === 0 ? (
          <div className="simple-empty"><Heart size={28} /><h3>Nothing saved yet</h3><p>Tap the heart on a place you like.</p><button className="primary-small-button" onClick={onExplore}>Explore places</button></div>
        ) : (
          <div className="saved-place-grid">{savedPlaces.map((place) => <button key={place.id} onClick={() => onOpenPlace(place.id)}><img src={place.image} alt="" /><span><strong>{place.name}</strong><small>{place.category} · {place.location}</small></span></button>)}</div>
        )}
      </section>

      <section className="section-wrap saved-section">
        <div className="panel-heading"><div><span className="mini-label">Plans</span><h2>Saved date plans</h2></div></div>
        {savedPlans.length === 0 ? (
          <div className="simple-empty"><CalendarDays size={28} /><h3>No saved plans yet</h3><p>Build a date plan, then save it to your account.</p><button className="primary-small-button" onClick={onOpenPlan}>Open planner</button></div>
        ) : (
          <div className="saved-plan-grid">{savedPlans.map((plan) => <article key={plan.id}><CalendarDays size={22} /><div><strong>{plan.name}</strong><span>{plan.date || 'Date not set'} · {plan.items.length} stop(s)</span><small>Estimated Rs. {Number(plan.estimatedTotal || 0).toLocaleString()}</small></div></article>)}</div>
        )}
      </section>
    </main>
  );
}

export function ProfileView({ session, savedItems, savedPlans, reviews, onSaved, onPlan, onBusiness, onAdmin, onSignOut }) {
  const myReviews = reviews.filter((review) => review.userId === session.id);

  return (
    <main className="customer-page">
      <section className="section-wrap profile-card">
        <div className="profile-avatar"><UserRound size={32} /></div>
        <div className="profile-copy"><span className="mini-label">{session.role} account</span><h1>{session.name}</h1><p>{session.email}</p></div>
        <button className="outline-button" onClick={onSignOut}><LogOut size={17} /> Sign out</button>
      </section>

      <section className="section-wrap profile-stats">
        <button onClick={onSaved}><Heart size={20} /><span>Saved places</span><strong>{savedItems.length}</strong></button>
        <button onClick={onPlan}><CalendarDays size={20} /><span>Saved plans</span><strong>{savedPlans.length}</strong></button>
        <div><MessageSquare size={20} /><span>Your reviews</span><strong>{myReviews.length}</strong></div>
      </section>

      {myReviews.length > 0 && (
        <section className="section-wrap profile-reviews">
          <div className="panel-heading"><div><span className="mini-label">Your activity</span><h2>Recent reviews</h2></div></div>
          {myReviews.slice(0, 4).map((review) => <article key={review.id}><span><Star size={15} fill="currentColor" /> {review.rating}</span><p>{review.comment}</p><small>{new Date(review.createdAt).toLocaleDateString()}</small></article>)}
        </section>
      )}

      {session.role === 'business' && <section className="section-wrap role-shortcut"><div><span className="mini-label">Business tools</span><h2>Manage your listings</h2><p>Post places and check approval status.</p></div><button onClick={onBusiness}>Open business portal</button></section>}
      {session.role === 'admin' && <section className="section-wrap role-shortcut admin"><div><span className="mini-label">Admin tools</span><h2>Manage Twonara</h2><p>Review listings, users and ad plans.</p></div><button onClick={onAdmin}>Open admin panel</button></section>}
    </main>
  );
}
