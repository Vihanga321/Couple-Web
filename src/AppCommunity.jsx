import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BedDouble,
  Bookmark,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Gift,
  Heart,
  Home,
  MapPin,
  Navigation,
  Popcorn,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trees,
  UserRound,
  Utensils,
} from 'lucide-react';
import AuthPanel from './components/AuthPanel';
import BusinessPortal from './components/BusinessPortal';
import AdminPortal from './components/AdminPortal';
import PlannerFinal from './components/PlannerFinal';
import TrustedReviews from './components/TrustedReviews';
import { GiftShopPage, StoriesPage } from './components/CommunityHub';
import { ProfileView, SavedView } from './components/CustomerViews';
import { categories, seedBusinessListings, seedPlaces, seedUsers } from './data/seed';
import { isSupabaseConfigured, signOutSupabase } from './lib/supabase';
import { usePersistentState } from './lib/storage';
import { persistFavorite, useSupabaseSync } from './hooks/useSupabaseSync';
import './phase2.css';
import './phase3.css';
import './final.css';
import './community.css';

const categoryIcons = {
  Do: Activity,
  Eat: Utensils,
  Privacy: Popcorn,
  Relax: Trees,
  Stay: BedDouble,
};

function Logo({ onClick }) {
  return (
    <button className="brand brand-button" aria-label="Twonara home" onClick={onClick}>
      <span className="brand-mark"><Heart size={18} fill="currentColor" /></span>
      <span>Twonara</span>
    </button>
  );
}

function businessListingToPlace(listing) {
  const featuredActive = listing.adPlan === 'featured' && (!listing.featuredUntil || new Date(listing.featuredUntil) > new Date());
  return {
    id: listing.id,
    name: listing.name,
    category: listing.category,
    note: listing.description?.slice(0, 80) || 'A Twonara business listing',
    description: listing.description || '',
    location: listing.location,
    address: listing.address,
    distanceKm: Number(listing.distanceKm || 0),
    rating: Number(listing.rating || 0),
    reviews: Number(listing.reviews || 0),
    price: listing.price || 'Contact for price',
    priceLevel: listing.adPlan === 'featured' ? 3 : listing.adPlan === 'premium' ? 2 : 1,
    estimatedCost: Number(listing.estimatedCost || 0),
    time: listing.hours || 'Contact venue for hours',
    openNow: true,
    phone: listing.phone,
    tags: [featuredActive ? 'Featured' : 'Twonara listing', 'Business listing'],
    features: ['Admin approved listing', 'Contact the venue for current availability', 'Check venue rules before visiting'],
    image: listing.image || 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85',
    promoted: featuredActive,
    businessListing: true,
  };
}

function PlaceCard({ place, added, saved, onAdd, onSave, onOpen }) {
  return (
    <article className="place-card phase2-card" onClick={() => onOpen(place.id)}>
      <div className="place-image-wrap">
        <img className="place-image" src={place.image} alt={`${place.name} in ${place.location}`} />
        <span className="category-badge">{place.promoted ? 'Featured · ' : ''}{place.category}</span>
        <button
          className={saved ? 'save-button saved' : 'save-button'}
          onClick={(event) => { event.stopPropagation(); onSave(place.id); }}
          aria-label={saved ? `Remove ${place.name} from saved` : `Save ${place.name}`}
        >
          <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="place-content">
        <div className="place-title-row">
          <div><h3>{place.name}</h3><p>{place.note}</p></div>
          <span className="rating"><Star size={15} fill="currentColor" /> {place.rating ? place.rating.toFixed(1) : 'New'}</span>
        </div>
        <div className="place-meta">
          <span><MapPin size={14} /> {place.distanceKm ? `${place.distanceKm.toFixed(1)} km` : place.location}</span>
          <span><Clock3 size={14} /> {place.time}</span>
        </div>
        <div className="place-footer">
          <strong>{place.price}</strong>
          <button className={added ? 'add-plan-button added' : 'add-plan-button'} onClick={(event) => { event.stopPropagation(); onAdd(place.id); }}>
            {added ? 'Added' : 'Add to plan'}
          </button>
        </div>
      </div>
    </article>
  );
}

function ExplorePage({ location, query, setQuery, activeCategory, setActiveCategory, openOnly, setOpenOnly, sortBy, setSortBy, places, planItems, savedItems, togglePlan, toggleSaved, openPlace, clearLocation }) {
  return (
    <main className="phase2-page">
      <section className="section-wrap explore-hero">
        <div>
          <span className="eyebrow"><Compass size={15} /> Explore together</span>
          <h1>Find a place that feels right.</h1>
          <p>Browse couple-friendly ideas around {location}. Save what you like and add the best ones to your date plan.</p>
        </div>
        <div className="explore-search-box"><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search restaurants, activities, places..." /></div>
      </section>

      <section className="section-wrap filter-panel">
        <div className="filter-category-row">
          {['All', ...categories.map((item) => item.name)].map((name) => (
            <button key={name} className={activeCategory === name ? 'filter-chip active' : 'filter-chip'} onClick={() => setActiveCategory(name)}>{name}</button>
          ))}
        </div>
        <div className="filter-actions">
          <button className={openOnly ? 'filter-control active' : 'filter-control'} onClick={() => setOpenOnly(!openOnly)}><Clock3 size={16} /> Open now</button>
          <label className="filter-control select-control"><SlidersHorizontal size={16} /><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="recommended">Recommended</option><option value="rating">Top rated</option><option value="nearest">Nearest</option><option value="budget">Lower price</option></select></label>
        </div>
      </section>

      <section className="section-wrap explore-results">
        <div className="results-heading"><div><span className="mini-label">{places.length} places found</span><h2>{activeCategory === 'All' ? `Ideas around ${location}` : `${activeCategory} around ${location}`}</h2></div></div>
        {places.length ? (
          <div className="place-grid explore-grid">
            {places.map((place) => <PlaceCard key={place.id} place={place} added={planItems.includes(place.id)} saved={savedItems.includes(place.id)} onAdd={togglePlan} onSave={toggleSaved} onOpen={openPlace} />)}
          </div>
        ) : (
          <div className="empty-state"><Search size={26} /><h3>No matching places yet</h3><p>Try another search/category or switch back to Negombo while Twonara grows to more areas.</p><div className="empty-actions"><button onClick={() => { setQuery(''); setActiveCategory('All'); }}>Clear filters</button><button onClick={clearLocation}>Explore Negombo</button></div></div>
        )}
      </section>
    </main>
  );
}

function PlaceDetails({ place, added, saved, reviews, setReviews, session, onBack, onAdd, onSave, onNeedLogin }) {
  const sharePlace = async () => {
    const text = `${place.name} — ${place.category} in ${place.location}`;
    try {
      if (navigator.share) await navigator.share({ title: place.name, text });
      else if (navigator.clipboard) await navigator.clipboard.writeText(text);
    } catch {
      // Native share can be cancelled by the user.
    }
  };

  const openDirections = () => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="details-page">
      <section className="section-wrap detail-top-row">
        <button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Back to explore</button>
        <div className="detail-top-actions">
          <button className="icon-text-button" onClick={sharePlace}><Share2 size={17} /> Share</button>
          <button className={saved ? 'icon-text-button saved' : 'icon-text-button'} onClick={() => onSave(place.id)}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}</button>
        </div>
      </section>

      <section className="section-wrap detail-hero-grid">
        <div className="detail-image-panel"><img src={place.image} alt={`${place.name} in ${place.location}`} /><span className="detail-category">{place.promoted ? 'Featured · ' : ''}{place.category}</span></div>
        <div className="detail-summary">
          <span className="mini-label">{place.category} · {place.location}</span>
          <h1>{place.name}</h1>
          <p className="detail-note">{place.note}</p>
          <div className="detail-rating-line"><span className="rating large"><Star size={18} fill="currentColor" /> {place.rating ? place.rating.toFixed(1) : 'New'}</span><span>{place.reviews || 0} listing reviews</span>{place.distanceKm > 0 && <><span>·</span><span>{place.distanceKm.toFixed(1)} km away</span></>}</div>
          <div className="detail-tags">{place.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          <div className="detail-info-list"><div><MapPin size={18} /><span><strong>{place.address}</strong><small>{place.location}</small></span></div><div><Clock3 size={18} /><span><strong>{place.time}</strong><small>Confirm current availability before going</small></span></div></div>
          <div className="detail-booking-card"><div><span>Typical price</span><strong>{place.price}</strong></div><button className={added ? 'primary-detail-button added' : 'primary-detail-button'} onClick={() => onAdd(place.id)}>{added ? <><Check size={18} /> Added to date plan</> : <><CalendarDays size={18} /> Add to date plan</>}</button></div>
        </div>
      </section>

      <section className="section-wrap detail-body-grid">
        <div className="detail-main-copy">
          <div className="detail-section-block"><span className="mini-label">About</span><h2>A simple idea for time together</h2><p>{place.description}</p></div>
          <div className="detail-section-block"><span className="mini-label">Good to know</span><h2>What you can expect</h2><div className="feature-grid">{place.features.map((feature) => <div key={feature}><Check size={17} /><span>{feature}</span></div>)}</div></div>
          <TrustedReviews place={place} session={session} reviews={reviews} setReviews={setReviews} onNeedLogin={onNeedLogin} />
        </div>
        <aside className="detail-side-card">
          <span className="mini-label">Plan this stop</span><h3>Ready to add it?</h3><p>Keep this place with the rest of your date ideas.</p>
          <button className={added ? 'side-plan-button added' : 'side-plan-button'} onClick={() => onAdd(place.id)}><CalendarDays size={18} /> {added ? 'Remove from plan' : 'Add to date plan'}</button>
          <button className="directions-button" onClick={openDirections}><Navigation size={18} /> Directions</button>
          <div className="trust-side-note"><Star size={16} /><span>Review badges show whether a reviewer was a community member, contacted the venue through Twonara, or verified a real visit.</span></div>
          {place.category === 'Stay' && <p className="venue-rule-note">Accommodation bookings must follow the property’s age, ID and check-in rules.</p>}
        </aside>
      </section>
    </main>
  );
}

function AppCommunity() {
  const [location, setLocation] = usePersistentState('twonara:location', 'Negombo');
  const [locationInput, setLocationInput] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [planItems, setPlanItems] = usePersistentState('twonara:plan-items', []);
  const [savedItems, setSavedItems] = usePersistentState('twonara:saved-items', []);
  const [savedPlans, setSavedPlans] = usePersistentState('twonara:saved-plans', []);
  const [reviews, setReviews] = usePersistentState('twonara:reviews', []);
  const [users, setUsers] = usePersistentState('twonara:users', seedUsers);
  const [listings, setListings] = usePersistentState('twonara:listings', seedBusinessListings);
  const [session, setSession] = usePersistentState('twonara:session', null);
  const [view, setView] = useState('home');
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [query, setQuery] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [authIntent, setAuthIntent] = useState('customer');

  useSupabaseSync({ session, setSession, setListings, setReviews, setSavedItems, setSavedPlans, setUsers });

  const approvedBusinessPlaces = useMemo(
    () => listings.filter((item) => item.status === 'approved').map(businessListingToPlace),
    [listings],
  );
  const allPlaces = useMemo(() => [...approvedBusinessPlaces, ...seedPlaces], [approvedBusinessPlaces]);
  const locationPlaces = useMemo(() => {
    const wanted = location.trim().toLowerCase();
    if (!wanted || wanted === 'all sri lanka') return allPlaces;
    return allPlaces.filter((place) => place.location.toLowerCase().includes(wanted));
  }, [allPlaces, location]);
  const homePlaces = useMemo(() => [...locationPlaces].sort((a, b) => Number(Boolean(b.promoted)) - Number(Boolean(a.promoted)) || b.rating - a.rating).slice(0, 6), [locationPlaces]);
  const explorePlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = locationPlaces.filter((place) => {
      const matchesCategory = activeCategory === 'All' || place.category === activeCategory;
      const matchesOpen = !openOnly || place.openNow;
      const searchable = `${place.name} ${place.category} ${place.note} ${place.tags.join(' ')}`.toLowerCase();
      return matchesCategory && matchesOpen && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'nearest') return a.distanceKm - b.distanceKm;
      if (sortBy === 'budget') return a.priceLevel - b.priceLevel;
      return Number(Boolean(b.promoted)) - Number(Boolean(a.promoted)) || (b.rating * 10 - b.distanceKm) - (a.rating * 10 - a.distanceKm);
    });
  }, [activeCategory, locationPlaces, openOnly, query, sortBy]);

  const selectedPlace = allPlaces.find((place) => place.id === selectedPlaceId);

  const go = (nextView) => {
    setView(nextView);
    if (nextView !== 'details') setSelectedPlaceId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goHome = () => go('home');
  const openExplore = (category = 'All') => { setActiveCategory(category); go('explore'); };
  const openPlan = () => go('plan');
  const openSaved = () => go('saved');
  const openGifts = () => go('gifts');
  const openStories = () => go('stories');
  const openAuth = (intent = 'customer') => { setAuthIntent(intent); go('auth'); };
  const openProfile = () => session ? go('profile') : openAuth('customer');
  const openPlace = (id) => { setSelectedPlaceId(id); setView('details'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openBusiness = () => session?.role === 'business' ? go('business') : openAuth('business');
  const openAdmin = () => session?.role === 'admin' ? go('admin') : openAuth('admin');

  const togglePlan = (id) => setPlanItems((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
  const toggleSaved = async (id) => {
    const currentlySaved = savedItems.includes(id);
    setSavedItems((current) => currentlySaved ? current.filter((itemId) => itemId !== id) : [...current, id]);
    try {
      await persistFavorite({ session, placeId: id, currentlySaved });
    } catch {
      setSavedItems((current) => currentlySaved ? [...current.filter((itemId) => itemId !== id), id] : current.filter((itemId) => itemId !== id));
    }
  };

  const chooseLocation = (event) => {
    event.preventDefault();
    const next = locationInput.trim();
    if (!next) return;
    setLocation(next);
    setLocationInput('');
    setActiveCategory('All');
  };

  const handleSignedIn = (account) => {
    setSession(account);
    setUsers((current) => current.some((item) => item.id === account.id) ? current : [...current, account]);
    if (account.role === 'admin' && authIntent === 'admin') go('admin');
    else if (account.role === 'business' && authIntent === 'business') go('business');
    else go('profile');
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured) await signOutSupabase();
    setSession(null);
    setSavedItems([]);
    setSavedPlans([]);
    goHome();
  };

  return (
    <div className="app-shell community-app-shell">
      {view !== 'business' && view !== 'admin' && (
        <header className="topbar">
          <div className="topbar-inner community-topbar-inner">
            <Logo onClick={goHome} />
            <div className="desktop-nav community-desktop-nav">
              <button className={view === 'home' ? 'desktop-nav-link active' : 'desktop-nav-link'} onClick={goHome}>Home</button>
              <button className={view === 'explore' || view === 'details' ? 'desktop-nav-link active' : 'desktop-nav-link'} onClick={() => openExplore('All')}>Explore</button>
              <button className={view === 'gifts' ? 'desktop-nav-link active' : 'desktop-nav-link'} onClick={openGifts}><Gift size={15} /> Gifts</button>
              <button className={view === 'stories' ? 'desktop-nav-link active' : 'desktop-nav-link'} onClick={openStories}><BookOpen size={15} /> Stories</button>
              <button className={view === 'plan' ? 'desktop-nav-link active' : 'desktop-nav-link'} onClick={openPlan}>Date Plan {planItems.length > 0 && <span>{planItems.length}</span>}</button>
            </div>
            <div className="topbar-actions">
              <button className="business-link" onClick={openBusiness}>Post a place</button>
              {session?.role === 'admin' && <button className="admin-link" onClick={openAdmin}>Admin</button>}
              <button className="profile-button" aria-label="Open profile" onClick={openProfile}>{session?.avatarUrl ? <img src={session.avatarUrl} alt="" /> : <UserRound size={19} />}</button>
            </div>
          </div>
        </header>
      )}

      {view === 'home' && (
        <main>
          <section className="hero section-wrap">
            <div className="hero-copy"><span className="eyebrow"><Sparkles size={15} /> Made for two</span><h1>Find your next<br /><em>moment together.</em></h1><p>Places, gifts, real date stories and a simple plan — all in one place.</p></div>
            <div className="location-card">
              <div className="location-label"><MapPin size={17} /> Exploring</div>
              <div className="current-location-row"><div><strong>{location}</strong><span>Change your area anytime</span></div><div className="location-pin"><Navigation size={19} /></div></div>
              <form className="location-search" onSubmit={chooseLocation}><Search size={19} /><input value={locationInput} onChange={(event) => setLocationInput(event.target.value)} placeholder="Search another city or area" /><button type="submit">Go</button></form>
              <button className="all-island-button" onClick={() => setLocation('All Sri Lanka')}>Explore all Sri Lanka</button>
            </div>
          </section>

          <section className="section-wrap category-section">
            <div className="section-heading compact-heading"><div><span className="mini-label">Explore your way</span><h2>What are you two in the mood for?</h2></div></div>
            <div className="category-grid">
              {categories.map(({ name, helper }) => {
                const Icon = categoryIcons[name];
                return <button key={name} className="category-tile" onClick={() => openExplore(name)}><span className="category-icon"><Icon size={22} /></span><span className="category-text"><strong>{name}</strong><small>{helper}</small></span><ChevronRight className="category-arrow" size={18} /></button>;
              })}
            </div>
          </section>

          <section className="section-wrap community-feature-grid">
            <button className="community-feature-card gift-feature" onClick={openGifts}><span className="community-feature-icon"><Gift size={25} /></span><span><small>NEW</small><strong>Gift Shop</strong><p>Add flowers, desserts or a small surprise to the day.</p></span><ChevronRight size={19} /></button>
            <button className="community-feature-card story-feature" onClick={openStories}><span className="community-feature-icon"><BookOpen size={25} /></span><span><small>COMMUNITY</small><strong>Date Stories</strong><p>Read real date ideas or share yours publicly anonymously.</p></span><ChevronRight size={19} /></button>
          </section>

          <section className="section-wrap places-section">
            <div className="section-heading"><div><span className="mini-label">Near {location}</span><h2>Lovely ideas for today</h2></div><button className="text-button" onClick={() => openExplore('All')}>Explore all</button></div>
            {homePlaces.length ? <div className="place-grid">{homePlaces.map((place) => <PlaceCard key={place.id} place={place} added={planItems.includes(place.id)} saved={savedItems.includes(place.id)} onAdd={togglePlan} onSave={toggleSaved} onOpen={openPlace} />)}</div> : <div className="home-no-places"><MapPin size={24} /><h3>No places listed in {location} yet</h3><p>Try Negombo or explore all Sri Lanka.</p><button onClick={() => setLocation('Negombo')}>Show Negombo</button></div>}
          </section>

          <section className="section-wrap planner-section"><div className="planner-card"><div className="planner-icon"><CalendarDays size={25} /></div><div className="planner-copy"><span className="mini-label">Twonara Date Plan</span><h2>Turn ideas into a simple date plan.</h2><p>Pick a place to eat, something to do, somewhere to relax — then keep the whole day together.</p></div><button className="planner-button" onClick={openPlan}>{planItems.length > 0 ? `Open plan · ${planItems.length}` : 'Start a date plan'}<ChevronRight size={18} /></button></div></section>

          <section className="section-wrap soft-cta"><div><span className="mini-label">For local businesses</span><h2>Have a place or gift couples would love?</h2><p>Join Twonara, post your place, add gift products and use Verified Visit codes for more trustworthy reviews.</p></div><button className="outline-button" onClick={openBusiness}>Business portal</button></section>
        </main>
      )}

      {view === 'explore' && <ExplorePage location={location} query={query} setQuery={setQuery} activeCategory={activeCategory} setActiveCategory={setActiveCategory} openOnly={openOnly} setOpenOnly={setOpenOnly} sortBy={sortBy} setSortBy={setSortBy} places={explorePlaces} planItems={planItems} savedItems={savedItems} togglePlan={togglePlan} toggleSaved={toggleSaved} openPlace={openPlace} clearLocation={() => setLocation('Negombo')} />}
      {view === 'details' && selectedPlace && <PlaceDetails place={selectedPlace} added={planItems.includes(selectedPlace.id)} saved={savedItems.includes(selectedPlace.id)} reviews={reviews} setReviews={setReviews} session={session} onBack={() => openExplore(activeCategory)} onAdd={togglePlan} onSave={toggleSaved} onNeedLogin={() => openAuth('customer')} />}
      {view === 'gifts' && <GiftShopPage location={location} session={session} onBack={goHome} onNeedLogin={() => openAuth('customer')} />}
      {view === 'stories' && <StoriesPage session={session} onBack={goHome} onNeedLogin={() => openAuth('customer')} />}
      {view === 'plan' && <PlannerFinal places={allPlaces} planItems={planItems} setPlanItems={setPlanItems} location={location} session={session} savedPlans={savedPlans} setSavedPlans={setSavedPlans} onExplore={() => openExplore('All')} onOpenPlace={openPlace} onNeedLogin={() => openAuth('customer')} />}
      {view === 'saved' && <SavedView places={allPlaces} savedItems={savedItems} savedPlans={session ? savedPlans.filter((item) => item.ownerId === session.id) : []} onOpenPlace={openPlace} onOpenPlan={openPlan} onExplore={() => openExplore('All')} />}
      {view === 'profile' && session && <ProfileView session={session} savedItems={savedItems} savedPlans={savedPlans.filter((item) => item.ownerId === session.id)} reviews={reviews} onSaved={openSaved} onPlan={openPlan} onBusiness={openBusiness} onAdmin={openAdmin} onSignOut={handleSignOut} />}
      {view === 'auth' && <AuthPanel intentRole={authIntent} onSignedIn={handleSignedIn} onBack={goHome} />}
      {view === 'business' && session?.role === 'business' && <BusinessPortal session={session} listings={listings} setListings={setListings} onBack={goHome} onSignOut={handleSignOut} />}
      {view === 'admin' && session?.role === 'admin' && <AdminPortal session={session} listings={listings} setListings={setListings} users={users} setUsers={setUsers} onBack={goHome} onSignOut={handleSignOut} />}

      {view !== 'business' && view !== 'admin' && (
        <nav className="mobile-nav community-mobile-nav" aria-label="Main navigation">
          <button className={view === 'home' ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={goHome}><Home size={19} /><span>Home</span></button>
          <button className={view === 'explore' || view === 'details' ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={() => openExplore('All')}><Compass size={19} /><span>Explore</span></button>
          <button className={view === 'gifts' ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={openGifts}><Gift size={19} /><span>Gifts</span></button>
          <button className={view === 'stories' ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={openStories}><BookOpen size={19} /><span>Stories</span></button>
          <button className={view === 'plan' ? 'mobile-nav-item plan-nav active' : 'mobile-nav-item plan-nav'} onClick={openPlan}><span className="plan-nav-icon"><CalendarDays size={20} /></span><span>Plan{planItems.length > 0 ? ` (${planItems.length})` : ''}</span></button>
          <button className={view === 'profile' || view === 'auth' || view === 'saved' ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={openProfile}><UserRound size={19} /><span>Profile</span></button>
        </nav>
      )}
    </div>
  );
}

export default AppCommunity;
