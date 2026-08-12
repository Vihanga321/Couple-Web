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
  MessageCircle,
  Navigation,
  Phone,
  Popcorn,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trees,
  UserRound,
  Utensils,
  X,
} from 'lucide-react';
import AuthPanel from './components/AuthPanel';
import BusinessPortal from './components/BusinessPortal';
import AdminPortal from './components/AdminPortal';
import PlannerFinal from './components/PlannerFinal';
import TrustedReviews from './components/TrustedReviews';
import { GiftShopPage, StoriesPage } from './components/CommunityHub';
import { ProfileView, SavedView } from './components/CustomerViews';
import { seedBusinessListings, seedPlaces, seedUsers } from './data/seed';
import { isSupabaseConfigured, signOutSupabase, supabase } from './lib/supabase';
import { usePersistentState } from './lib/storage';
import { persistFavorite, useSupabaseSync } from './hooks/useSupabaseSync';
import './phase3.css';
import './final.css';
import './community.css';
import './marketplace.css';

const CATEGORY_TABS = [
  { key: 'All', label: 'All', icon: Compass },
  { key: 'Do', label: 'Activities', icon: Activity },
  { key: 'Eat', label: 'Eat', icon: Utensils },
  { key: 'Privacy', label: 'Private', icon: Popcorn },
  { key: 'Relax', label: 'Relax', icon: Trees },
  { key: 'Stay', label: 'Stay', icon: BedDouble },
  { key: 'Gift', label: 'Gift', icon: Gift },
];

const SUBFILTERS = {
  Do: ['All', 'Outdoor', 'Creative', 'Games', 'Adventure', 'Workshop'],
  Eat: ['All', 'Restaurant', 'Cafe', 'Dessert', 'Rooftop', 'Waterfront'],
  Privacy: ['All', 'Mini Cinema', 'Movie Theater', 'Private Box', 'Private Dining'],
  Relax: ['All', 'Spa', 'Wellness', 'Quiet View', 'Beach', 'Cafe'],
  Stay: ['All', 'Hotel', 'Villa', 'Resort', 'Apartment', 'Beach Stay'],
};

function Logo({ onClick }) {
  return (
    <button className="market-brand" onClick={onClick} aria-label="Twonara home">
      <span><Heart size={17} fill="currentColor" /></span>
      <strong>Twonara</strong>
    </button>
  );
}

function normalizePhone(phone = '') {
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `94${digits.slice(1)}`;
  return digits;
}

function getSubtype(place) {
  if (place.subtype) return place.subtype;
  const text = `${place.name} ${(place.tags || []).join(' ')} ${place.note || ''}`.toLowerCase();
  if (place.category === 'Privacy') {
    if (text.includes('cinema') || text.includes('screen')) return 'Mini Cinema';
    if (text.includes('box')) return 'Private Box';
    if (text.includes('dining')) return 'Private Dining';
    return 'Movie Theater';
  }
  if (place.category === 'Do') {
    if (text.includes('clay') || text.includes('creative') || text.includes('workshop')) return 'Creative';
    if (text.includes('outdoor') || text.includes('paddle')) return 'Outdoor';
    return 'Activity';
  }
  if (place.category === 'Eat') {
    if (text.includes('cafe')) return 'Cafe';
    if (text.includes('water')) return 'Waterfront';
    if (text.includes('dessert')) return 'Dessert';
    return 'Restaurant';
  }
  if (place.category === 'Relax') {
    if (text.includes('spa')) return 'Spa';
    if (text.includes('wellness')) return 'Wellness';
    if (text.includes('beach')) return 'Beach';
    return 'Quiet View';
  }
  if (place.category === 'Stay') {
    if (text.includes('villa')) return 'Villa';
    if (text.includes('resort')) return 'Resort';
    if (text.includes('apartment')) return 'Apartment';
    if (text.includes('beach')) return 'Beach Stay';
    return 'Hotel';
  }
  return place.category;
}

function getPackages(place) {
  if (Array.isArray(place.packages) && place.packages.length) return place.packages;
  const base = Number(place.estimatedCost || 0);
  if (place.category === 'Privacy') {
    return [
      { label: '1 hour', price: base || 6500 },
      { label: '2 hours', price: base ? Math.round(base * 1.4 / 100) * 100 : 9000 },
    ];
  }
  if (place.category === 'Stay') return [{ label: '1 night', price: base || 0 }];
  if (place.category === 'Eat') return [{ label: 'Date meal estimate', price: base || 0 }];
  if (place.category === 'Relax') return [{ label: 'Standard session', price: base || 0 }];
  return [{ label: 'Standard experience', price: base || 0 }];
}

function businessListingToPlace(listing) {
  const featuredActive = listing.adPlan === 'featured' && (!listing.featuredUntil || new Date(listing.featuredUntil) > new Date());
  return {
    id: listing.id,
    name: listing.name,
    category: listing.category,
    subtype: listing.subtype || '',
    note: listing.description?.slice(0, 95) || 'A Twonara business listing',
    description: listing.description || '',
    location: listing.location,
    address: listing.address,
    distanceKm: Number(listing.distanceKm || 0),
    rating: Number(listing.rating || 0),
    reviews: Number(listing.reviews || 0),
    price: listing.price || 'Contact for packages',
    estimatedCost: Number(listing.estimatedCost || 0),
    packages: listing.packages || [],
    time: listing.hours || 'Contact venue for hours',
    openNow: true,
    phone: listing.phone,
    tags: [featuredActive ? 'Featured' : 'Twonara listing', listing.subtype || 'Business listing'],
    features: ['Admin approved listing', 'Contact the venue for current availability', 'Confirm current packages before booking'],
    image: listing.image || 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85',
    promoted: featuredActive,
    businessListing: true,
  };
}

function CategoryStrip({ activeCategory, onCategory }) {
  return (
    <div className="market-category-strip" aria-label="Browse categories">
      {CATEGORY_TABS.map(({ key, label, icon: Icon }) => (
        <button key={key} className={activeCategory === key ? 'active' : ''} onClick={() => onCategory(key)}>
          <span><Icon size={19} /></span>
          <small>{label}</small>
        </button>
      ))}
    </div>
  );
}

function FeaturedCard({ place, onOpen }) {
  return (
    <button className="market-featured-card" onClick={() => onOpen(place.id)}>
      <div className="market-featured-image">
        <img src={place.image} alt="" />
        <span>FEATURED</span>
      </div>
      <div className="market-featured-copy">
        <strong>{place.name}</strong>
        <span><MapPin size={12} /> {place.location}</span>
        <small>{getSubtype(place)}</small>
      </div>
    </button>
  );
}

function CompactPlaceCard({ place, onOpen, saved, onSave }) {
  const firstPackage = getPackages(place)[0];
  return (
    <article className="market-list-card" onClick={() => onOpen(place.id)}>
      <div className="market-list-image">
        <img src={place.image} alt={`${place.name} in ${place.location}`} />
        {place.promoted && <span>FEATURED</span>}
      </div>
      <div className="market-list-copy">
        <div className="market-list-title">
          <strong>{place.name}</strong>
          <button onClick={(event) => { event.stopPropagation(); onSave(place.id); }} aria-label="Save place">
            <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
        <p>{place.note}</p>
        <div className="market-list-meta">
          <span><MapPin size={13} /> {place.location}</span>
          <span>{getSubtype(place)}</span>
        </div>
        <div className="market-list-bottom">
          <span className="market-rating"><Star size={13} fill="currentColor" /> {place.rating ? place.rating.toFixed(1) : 'New'}</span>
          {firstPackage?.price > 0 && <strong>{firstPackage.label} · Rs. {Number(firstPackage.price).toLocaleString()}</strong>}
        </div>
      </div>
    </article>
  );
}

function MarketplaceHome({
  location,
  locationInput,
  setLocationInput,
  chooseLocation,
  clearLocation,
  query,
  setQuery,
  onSearch,
  activeCategory,
  onCategory,
  featuredPlaces,
  homePlaces,
  openPlace,
  savedItems,
  toggleSaved,
  openStories,
  openBusiness,
}) {
  const [changingLocation, setChangingLocation] = useState(false);
  return (
    <main className="market-page market-home">
      <section className="market-search-zone">
        <div className="market-search-wrap">
          <Search size={18} />
          <form onSubmit={onSearch}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What do you want to do together?" />
          </form>
          <button onClick={onSearch} aria-label="Search"><Search size={17} /></button>
        </div>

        <div className="market-location-line">
          <button className="market-location-pill" onClick={() => setChangingLocation((value) => !value)}><MapPin size={14} /> {location}<ChevronRight size={14} /></button>
          {location !== 'All Sri Lanka' && <button className="market-location-clear" onClick={clearLocation}>All Sri Lanka</button>}
        </div>

        {changingLocation && (
          <form className="market-location-form" onSubmit={(event) => { chooseLocation(event); setChangingLocation(false); }}>
            <MapPin size={16} />
            <input value={locationInput} onChange={(event) => setLocationInput(event.target.value)} placeholder="Negombo, Colombo, Kandy..." autoFocus />
            <button type="submit">Use</button>
          </form>
        )}
      </section>

      <section className="market-section market-category-section">
        <div className="market-section-head"><div><small>Browse by category</small><h2>What to do</h2></div></div>
        <CategoryStrip activeCategory={activeCategory} onCategory={onCategory} />
      </section>

      <section className="market-section">
        <div className="market-section-head"><div><small>Promoted</small><h2>Featured Ads</h2></div><span>Approved featured listings</span></div>
        {featuredPlaces.length ? (
          <div className="market-featured-scroll">{featuredPlaces.map((place) => <FeaturedCard key={place.id} place={place} onOpen={openPlace} />)}</div>
        ) : (
          <div className="market-featured-empty"><Sparkles size={18} /><span>Paid Featured Ads will appear here after payment and admin approval.</span></div>
        )}
      </section>

      <section className="market-section">
        <div className="market-section-head"><div><small>Near {location}</small><h2>Places for your next date</h2></div><button onClick={() => onCategory('All')}>See all</button></div>
        <div className="market-list-stack">
          {homePlaces.map((place) => <CompactPlaceCard key={place.id} place={place} onOpen={openPlace} saved={savedItems.includes(place.id)} onSave={toggleSaved} />)}
        </div>
      </section>

      <section className="market-home-shortcuts">
        <button onClick={openStories}><BookOpen size={20} /><span><strong>Date Stories</strong><small>Read or share anonymously</small></span><ChevronRight size={18} /></button>
        <button onClick={openBusiness}><Sparkles size={20} /><span><strong>Post your business</strong><small>Places, gifts and featured ads</small></span><ChevronRight size={18} /></button>
      </section>
    </main>
  );
}

function MarketplaceExplore({
  location,
  activeCategory,
  activeSubtype,
  setActiveSubtype,
  query,
  setQuery,
  places,
  onCategory,
  setLocationAll,
  openPlace,
  savedItems,
  toggleSaved,
}) {
  const displayCategory = CATEGORY_TABS.find((item) => item.key === activeCategory)?.label || activeCategory;
  const filters = SUBFILTERS[activeCategory] || ['All'];
  return (
    <main className="market-page market-results-page">
      <section className="market-results-top">
        <div className="market-search-wrap compact">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${displayCategory.toLowerCase()}...`} />
        </div>
        <div className="market-results-title"><small>{displayCategory} in Sri Lanka</small><h1>{displayCategory === 'All' ? 'Date ideas' : displayCategory} near {location}</h1></div>
        <div className="market-result-controls">
          <button className="market-location-chip"><MapPin size={14} /> {location}{location !== 'All Sri Lanka' && <X size={13} onClick={(event) => { event.stopPropagation(); setLocationAll(); }} />}</button>
        </div>
        <CategoryStrip activeCategory={activeCategory} onCategory={onCategory} />
        {activeCategory !== 'All' && (
          <div className="market-subfilters">
            {filters.map((filter) => <button key={filter} className={activeSubtype === filter ? 'active' : ''} onClick={() => setActiveSubtype(filter)}>{filter}</button>)}
          </div>
        )}
      </section>

      <section className="market-section market-results-list">
        <div className="market-section-head"><div><small>Showing {places.length} result{places.length === 1 ? '' : 's'}</small><h2>{activeSubtype !== 'All' ? activeSubtype : displayCategory}</h2></div></div>
        {places.length ? (
          <div className="market-list-stack">{places.map((place) => <CompactPlaceCard key={place.id} place={place} onOpen={openPlace} saved={savedItems.includes(place.id)} onSave={toggleSaved} />)}</div>
        ) : (
          <div className="market-empty"><Search size={22} /><strong>No matching places yet</strong><span>Try another filter or location.</span></div>
        )}
      </section>
    </main>
  );
}

function MarketplaceDetails({ place, session, reviews, setReviews, saved, added, onBack, onSave, onAdd, onNeedLogin }) {
  const [contactMessage, setContactMessage] = useState('');
  const packages = getPackages(place);

  const openWhatsApp = async () => {
    if (!session) {
      onNeedLogin();
      return;
    }
    const number = normalizePhone(place.phone);
    if (!number) {
      setContactMessage('This place has not added a WhatsApp number yet.');
      return;
    }
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('contact_inquiries').upsert({
          user_id: session.id,
          place_ref: place.id,
          channel: 'whatsapp',
        }, { onConflict: 'user_id,place_ref,channel' });
        if (error) throw error;
      }
      window.dispatchEvent(new CustomEvent('twonara:contacted', { detail: { placeId: place.id } }));
      const text = encodeURIComponent(`Hi, I found ${place.name} on Twonara. I would like to ask about your packages and availability.`);
      window.open(`https://wa.me/${number}?text=${text}`, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setContactMessage(error.message || 'Could not open WhatsApp.');
    }
  };

  const openDirections = () => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`, '_blank', 'noopener,noreferrer');

  return (
    <main className="market-detail-page">
      <section className="market-detail-top">
        <button className="market-back" onClick={onBack}><ArrowLeft size={18} /> Back</button>
        <button className={saved ? 'market-save-detail saved' : 'market-save-detail'} onClick={() => onSave(place.id)}><Heart size={18} fill={saved ? 'currentColor' : 'none'} /></button>
      </section>

      <section className="market-detail-shell">
        <div className="market-detail-gallery">
          <img src={place.image} alt={`${place.name} in ${place.location}`} />
          <span>1/1</span>
        </div>

        <div className="market-detail-info">
          <div className="market-detail-heading">
            <small>{getSubtype(place)} · {place.category === 'Privacy' ? 'Private' : place.category}</small>
            <h1>{place.name}</h1>
            <div><span><MapPin size={14} /> {place.address}</span><span><Star size={14} fill="currentColor" /> {place.rating ? place.rating.toFixed(1) : 'New'}</span></div>
          </div>

          <section className="market-package-card">
            <div className="market-package-head"><div><small>Menu / packages</small><h2>Choose the time that suits you</h2></div><Clock3 size={20} /></div>
            <div className="market-package-list">
              {packages.map((item) => (
                <div key={`${item.label}-${item.price}`}><strong>{item.label}</strong><span>{item.price > 0 ? `Rs. ${Number(item.price).toLocaleString()}/=` : 'Ask for current price'}</span></div>
              ))}
            </div>
            <small className="market-package-note">Confirm current packages and availability with the business before going.</small>
          </section>

          <section className="market-detail-block"><small>About</small><h2>{place.note}</h2><p>{place.description}</p></section>
          <section className="market-detail-block"><small>Good to know</small><div className="market-feature-list">{place.features.map((feature) => <span key={feature}><Check size={15} /> {feature}</span>)}</div></section>
          <button className="market-directions" onClick={openDirections}><Navigation size={17} /> Get directions</button>
          {contactMessage && <div className="form-message">{contactMessage}</div>}
          <TrustedReviews place={place} session={session} reviews={reviews} setReviews={setReviews} onNeedLogin={onNeedLogin} />
        </div>
      </section>

      <div className="market-contact-bar">
        <button onClick={() => place.phone && (window.location.href = `tel:${place.phone}`)}><Phone size={18} /><span>Call</span></button>
        <button onClick={() => onAdd(place.id)} className={added ? 'active' : ''}><CalendarDays size={18} /><span>{added ? 'Added' : 'Plan'}</span></button>
        <button className="whatsapp" onClick={openWhatsApp}><MessageCircle size={19} /><span>WhatsApp</span></button>
      </div>
    </main>
  );
}

export default function AppMarketplace() {
  const [location, setLocation] = usePersistentState('twonara:location', 'Negombo');
  const [locationInput, setLocationInput] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSubtype, setActiveSubtype] = useState('All');
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
  const [authIntent, setAuthIntent] = useState('customer');

  useSupabaseSync({ session, setSession, setListings, setReviews, setSavedItems, setSavedPlans, setUsers });

  const approvedBusinessPlaces = useMemo(() => listings.filter((item) => item.status === 'approved').map(businessListingToPlace), [listings]);
  const allPlaces = useMemo(() => [...approvedBusinessPlaces, ...seedPlaces], [approvedBusinessPlaces]);
  const locationPlaces = useMemo(() => {
    const wanted = location.trim().toLowerCase();
    if (!wanted || wanted === 'all sri lanka') return allPlaces;
    return allPlaces.filter((place) => place.location.toLowerCase().includes(wanted));
  }, [allPlaces, location]);

  const featuredPlaces = useMemo(() => locationPlaces.filter((place) => place.promoted).slice(0, 8), [locationPlaces]);
  const homePlaces = useMemo(() => [...locationPlaces].sort((a, b) => Number(Boolean(b.promoted)) - Number(Boolean(a.promoted)) || b.rating - a.rating).slice(0, 8), [locationPlaces]);
  const explorePlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return locationPlaces.filter((place) => {
      const categoryMatch = activeCategory === 'All' || place.category === activeCategory;
      const subtypeMatch = activeSubtype === 'All' || getSubtype(place) === activeSubtype;
      const searchable = `${place.name} ${place.note} ${place.category} ${getSubtype(place)} ${(place.tags || []).join(' ')}`.toLowerCase();
      return categoryMatch && subtypeMatch && (!normalizedQuery || searchable.includes(normalizedQuery));
    }).sort((a, b) => Number(Boolean(b.promoted)) - Number(Boolean(a.promoted)) || b.rating - a.rating);
  }, [activeCategory, activeSubtype, locationPlaces, query]);

  const selectedPlace = allPlaces.find((place) => place.id === selectedPlaceId);

  const go = (nextView) => {
    setView(nextView);
    if (nextView !== 'details') setSelectedPlaceId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goHome = () => go('home');
  const openPlan = () => go('plan');
  const openSaved = () => go('saved');
  const openStories = () => go('stories');
  const openGifts = () => go('gifts');
  const openAuth = (intent = 'customer') => { setAuthIntent(intent); go('auth'); };
  const openProfile = () => session ? go('profile') : openAuth('customer');
  const openBusiness = () => session?.role === 'business' ? go('business') : openAuth('business');
  const openAdmin = () => session?.role === 'admin' ? go('admin') : openAuth('admin');
  const openPlace = (id) => { setSelectedPlaceId(id); setView('details'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const openCategory = (key) => {
    if (key === 'Gift') {
      openGifts();
      return;
    }
    setActiveCategory(key);
    setActiveSubtype('All');
    go('explore');
  };

  const chooseLocation = (event) => {
    event.preventDefault();
    const next = locationInput.trim();
    if (!next) return;
    setLocation(next);
    setLocationInput('');
  };

  const searchFromHome = (event) => {
    event?.preventDefault?.();
    setActiveCategory('All');
    setActiveSubtype('All');
    go('explore');
  };

  const togglePlan = (id) => setPlanItems((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleSaved = async (id) => {
    const currentlySaved = savedItems.includes(id);
    setSavedItems((current) => currentlySaved ? current.filter((item) => item !== id) : [...current, id]);
    try {
      await persistFavorite({ session, placeId: id, currentlySaved });
    } catch {
      setSavedItems((current) => currentlySaved ? [...current.filter((item) => item !== id), id] : current.filter((item) => item !== id));
    }
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
    <div className="market-app-shell">
      {view !== 'business' && view !== 'admin' && (
        <header className="market-topbar">
          <div className="market-topbar-inner">
            <Logo onClick={goHome} />
            <div className="market-top-actions">
              <button className="market-stories-link" onClick={openStories}><BookOpen size={16} /><span>Stories</span></button>
              <button className="market-post-link" onClick={openBusiness}>Post a place</button>
              {session?.role === 'admin' && <button className="market-admin-link" onClick={openAdmin}>Admin</button>}
              <button className="market-profile" onClick={openProfile} aria-label="Profile">{session?.avatarUrl ? <img src={session.avatarUrl} alt="" /> : <UserRound size={19} />}</button>
            </div>
          </div>
        </header>
      )}

      {view === 'home' && <MarketplaceHome location={location} locationInput={locationInput} setLocationInput={setLocationInput} chooseLocation={chooseLocation} clearLocation={() => setLocation('All Sri Lanka')} query={query} setQuery={setQuery} onSearch={searchFromHome} activeCategory={activeCategory} onCategory={openCategory} featuredPlaces={featuredPlaces} homePlaces={homePlaces} openPlace={openPlace} savedItems={savedItems} toggleSaved={toggleSaved} openStories={openStories} openBusiness={openBusiness} />}
      {view === 'explore' && <MarketplaceExplore location={location} activeCategory={activeCategory} activeSubtype={activeSubtype} setActiveSubtype={setActiveSubtype} query={query} setQuery={setQuery} places={explorePlaces} onCategory={openCategory} setLocationAll={() => setLocation('All Sri Lanka')} openPlace={openPlace} savedItems={savedItems} toggleSaved={toggleSaved} />}
      {view === 'details' && selectedPlace && <MarketplaceDetails place={selectedPlace} session={session} reviews={reviews} setReviews={setReviews} saved={savedItems.includes(selectedPlace.id)} added={planItems.includes(selectedPlace.id)} onBack={() => go('explore')} onSave={toggleSaved} onAdd={togglePlan} onNeedLogin={() => openAuth('customer')} />}
      {view === 'gifts' && <GiftShopPage location={location} session={session} onBack={goHome} onNeedLogin={() => openAuth('customer')} />}
      {view === 'stories' && <StoriesPage session={session} onBack={goHome} onNeedLogin={() => openAuth('customer')} />}
      {view === 'plan' && <PlannerFinal places={allPlaces} planItems={planItems} setPlanItems={setPlanItems} location={location} session={session} savedPlans={savedPlans} setSavedPlans={setSavedPlans} onExplore={() => openCategory('All')} onOpenPlace={openPlace} onNeedLogin={() => openAuth('customer')} />}
      {view === 'saved' && <SavedView places={allPlaces} savedItems={savedItems} savedPlans={session ? savedPlans.filter((item) => item.ownerId === session.id) : []} onOpenPlace={openPlace} onOpenPlan={openPlan} onExplore={() => openCategory('All')} />}
      {view === 'profile' && session && <ProfileView session={session} savedItems={savedItems} savedPlans={savedPlans.filter((item) => item.ownerId === session.id)} reviews={reviews} onSaved={openSaved} onPlan={openPlan} onBusiness={openBusiness} onAdmin={openAdmin} onSignOut={handleSignOut} />}
      {view === 'auth' && <AuthPanel intentRole={authIntent} onSignedIn={handleSignedIn} onBack={goHome} />}
      {view === 'business' && session?.role === 'business' && <BusinessPortal session={session} listings={listings} setListings={setListings} onBack={goHome} onSignOut={handleSignOut} />}
      {view === 'admin' && session?.role === 'admin' && <AdminPortal session={session} listings={listings} setListings={setListings} users={users} setUsers={setUsers} onBack={goHome} onSignOut={handleSignOut} />}

      {view !== 'business' && view !== 'admin' && view !== 'details' && (
        <nav className="market-mobile-nav">
          <button className={view === 'home' ? 'active' : ''} onClick={goHome}><Home size={20} /><span>Home</span></button>
          <button className={view === 'explore' ? 'active' : ''} onClick={() => openCategory('All')}><Compass size={20} /><span>Explore</span></button>
          <button className={view === 'plan' ? 'active plan' : 'plan'} onClick={openPlan}><CalendarDays size={21} /><span>Plan{planItems.length ? ` (${planItems.length})` : ''}</span></button>
          <button className={view === 'saved' ? 'active' : ''} onClick={openSaved}><Bookmark size={20} /><span>Saved</span></button>
          <button className={view === 'profile' || view === 'auth' ? 'active' : ''} onClick={openProfile}><UserRound size={20} /><span>Profile</span></button>
        </nav>
      )}
    </div>
  );
}
