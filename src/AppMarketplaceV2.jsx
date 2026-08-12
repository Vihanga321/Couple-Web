import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BedDouble,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
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
  Store,
  Trees,
  Utensils,
  X,
} from 'lucide-react';
import AuthPanel from './components/AuthPanel';
import ShopPortalV2 from './components/ShopPortalV2';
import AdminPortalV2 from './components/AdminPortalV2';
import { StoriesPage } from './components/CommunityHub';
import { seedBusinessListings, seedPlaces, seedUsers } from './data/seed';
import { seedGifts } from './data/communitySeed';
import { matchesDistrict } from './data/sriLankaDistricts';
import { isSupabaseConfigured, signOutSupabase } from './lib/supabase';
import { usePersistentState } from './lib/storage';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import './marketplace.css';
import './shop-architecture.css';

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
  Gift: ['All', 'Flowers', 'Cakes', 'Keepsakes', 'Gift Boxes', 'Custom Gifts'],
};

function Logo({ onClick }) {
  return <button className="market-brand" onClick={onClick}><span><Heart size={17} fill="currentColor" /></span><strong>Twonara</strong></button>;
}

function normalizePhone(phone = '') {
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `94${digits.slice(1)}`;
  return digits;
}

function arrayValue(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
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
  if (place.category === 'Eat') return text.includes('cafe') ? 'Cafe' : text.includes('water') ? 'Waterfront' : 'Restaurant';
  if (place.category === 'Do') return text.includes('creative') || text.includes('clay') ? 'Creative' : 'Outdoor';
  if (place.category === 'Relax') return text.includes('spa') ? 'Spa' : text.includes('beach') ? 'Beach' : 'Quiet View';
  if (place.category === 'Stay') return text.includes('villa') ? 'Villa' : text.includes('beach') ? 'Beach Stay' : 'Hotel';
  return place.category;
}

function getPackages(place) {
  const existing = arrayValue(place.packages);
  if (existing.length) return existing;
  const base = Number(place.estimatedCost || 0);
  if (place.category === 'Privacy') return [{ label: '1 hour', price: base || 6500 }, { label: '2 hours', price: base ? Math.round(base * 1.4 / 100) * 100 : 9000 }];
  if (place.category === 'Stay') return [{ label: '1 night', price: base }];
  return [{ label: place.category === 'Gift' ? 'Item price' : 'Standard option', price: base }];
}

function businessListingToPlace(listing) {
  const featuredActive = listing.status === 'approved'
    && listing.pageStatus === 'published'
    && listing.adPlan === 'featured'
    && listing.paymentStatus === 'paid'
    && listing.featuredApproved
    && (!listing.featuredUntil || new Date(listing.featuredUntil) > new Date());

  return {
    id: listing.id,
    name: listing.name,
    category: listing.category,
    subtype: listing.subtype || '',
    note: listing.heroText || listing.description?.slice(0, 100) || 'Twonara shop',
    description: listing.description || '',
    location: listing.location,
    address: listing.address,
    rating: Number(listing.rating || 0),
    reviews: Number(listing.reviews || 0),
    estimatedCost: Number(listing.estimatedCost || 0),
    packages: arrayValue(listing.packages),
    time: listing.hours || 'Contact shop for hours',
    phone: listing.phone,
    whatsappPhone: listing.whatsappPhone || listing.phone,
    tags: [listing.subtype || 'Shop'],
    features: arrayValue(listing.facilities),
    image: listing.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=85',
    logoUrl: listing.logoUrl || '',
    galleryUrls: arrayValue(listing.galleryUrls),
    theme: listing.theme || 'rose',
    promoted: featuredActive,
    businessListing: true,
  };
}

function giftToPlace(gift) {
  return {
    id: gift.id,
    name: gift.shopName || gift.name,
    category: 'Gift',
    subtype: gift.name?.toLowerCase().includes('rose') ? 'Flowers' : gift.name?.toLowerCase().includes('dessert') ? 'Cakes' : 'Keepsakes',
    note: gift.name,
    description: gift.description,
    location: gift.location,
    address: `${gift.location} District`,
    rating: 0,
    reviews: 0,
    estimatedCost: Number(gift.priceAmount || 0),
    packages: [{ label: gift.name, price: Number(gift.priceAmount || 0) }],
    time: gift.delivery,
    phone: gift.whatsappPhone,
    whatsappPhone: gift.whatsappPhone,
    tags: ['Gift'],
    features: [gift.delivery],
    image: gift.imageUrl,
    galleryUrls: [],
    promoted: Boolean(gift.featured),
  };
}

function CategoryStrip({ activeCategory, onCategory }) {
  return (
    <div className="market-category-strip">
      {CATEGORY_TABS.map(({ key, label, icon: Icon }) => <button key={key} className={activeCategory === key ? 'active' : ''} onClick={() => onCategory(key)}><span><Icon size={19} /></span><small>{label}</small></button>)}
    </div>
  );
}

function FeaturedCard({ place, onOpen }) {
  return <button className="market-featured-card" onClick={() => onOpen(place.id)}><div className="market-featured-image"><img src={place.image} alt="" /><span>FEATURED</span></div><div className="market-featured-copy"><strong>{place.name}</strong><span><MapPin size={12} /> {place.location} District</span><small>{getSubtype(place)}</small></div></button>;
}

function PublicShopCard({ place, onOpen }) {
  const packageItem = getPackages(place)[0];
  return (
    <article className="market-list-card public-shop-card" onClick={() => onOpen(place.id)}>
      <div className="market-list-image"><img src={place.image} alt={`${place.name}`} />{place.promoted && <span>FEATURED</span>}</div>
      <div className="market-list-copy">
        <div className="market-list-title"><strong>{place.name}</strong></div>
        <p>{place.note}</p>
        <div className="market-list-meta"><span><MapPin size={13} /> {place.location} District</span><span>{getSubtype(place)}</span></div>
        <div className="market-list-bottom"><span className="market-rating"><Star size={13} fill="currentColor" /> {place.rating ? place.rating.toFixed(1) : 'New'}</span>{packageItem?.price > 0 && <strong>{packageItem.label} · Rs. {Number(packageItem.price).toLocaleString()}</strong>}</div>
      </div>
    </article>
  );
}

function HomePage({ district, query, setQuery, onSearch, activeCategory, onCategory, featured, places, openPlace, openStories, openBusiness }) {
  return (
    <main className="market-page market-home public-market-home">
      <section className="market-search-zone">
        <div className="market-search-wrap"><Search size={18} /><form onSubmit={onSearch}><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="What are you looking for?" /></form><button onClick={onSearch}><Search size={17} /></button></div>
      </section>
      <section className="market-section market-category-section"><div className="market-section-head"><div><small>BROWSE BY CATEGORY</small><h2>What to do</h2></div></div><CategoryStrip activeCategory={activeCategory} onCategory={onCategory} /></section>
      <section className="market-section"><div className="market-section-head"><div><small>PROMOTED</small><h2>Featured Ads</h2></div><span>Payment + admin approved</span></div>{featured.length ? <div className="market-featured-scroll">{featured.map((place) => <FeaturedCard key={place.id} place={place} onOpen={openPlace} />)}</div> : <div className="market-featured-empty"><Sparkles size={18} /><span>Approved Featured Ads for {district} District will appear here.</span></div>}</section>
      <section className="market-section"><div className="market-section-head"><div><small>{district === 'All Sri Lanka' ? 'ALL DISTRICTS' : `${district.toUpperCase()} DISTRICT`}</small><h2>Shops & places</h2></div><button onClick={() => onCategory('All')}>See all</button></div><div className="market-list-stack">{places.map((place) => <PublicShopCard key={place.id} place={place} onOpen={openPlace} />)}</div></section>
      <section className="market-home-shortcuts"><button onClick={openStories}><BookOpen size={20} /><span><strong>Date Stories</strong><small>Read or share anonymously — no customer login</small></span><ChevronRight size={18} /></button><button onClick={openBusiness}><Store size={20} /><span><strong>Post your ad</strong><small>Shop login required</small></span><ChevronRight size={18} /></button></section>
    </main>
  );
}

function ExplorePage({ district, activeCategory, activeSubtype, setActiveSubtype, query, setQuery, places, onCategory, openPlace }) {
  const label = CATEGORY_TABS.find((item) => item.key === activeCategory)?.label || activeCategory;
  const filters = SUBFILTERS[activeCategory] || ['All'];
  return (
    <main className="market-page market-results-page">
      <section className="market-results-top">
        <div className="market-search-wrap compact"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${label.toLowerCase()}...`} /></div>
        <div className="market-results-title"><small>{district === 'All Sri Lanka' ? 'Sri Lanka' : `${district} District`}</small><h1>{label === 'All' ? 'Shops & date ideas' : label}</h1></div>
        <CategoryStrip activeCategory={activeCategory} onCategory={onCategory} />
        {activeCategory !== 'All' && <div className="market-subfilters">{filters.map((item) => <button key={item} className={activeSubtype === item ? 'active' : ''} onClick={() => setActiveSubtype(item)}>{item}</button>)}</div>}
      </section>
      <section className="market-section market-results-list"><div className="market-section-head"><div><small>{places.length} result{places.length === 1 ? '' : 's'}</small><h2>{activeSubtype !== 'All' ? activeSubtype : label}</h2></div></div>{places.length ? <div className="market-list-stack">{places.map((place) => <PublicShopCard key={place.id} place={place} onOpen={openPlace} />)}</div> : <div className="market-empty"><Search size={22} /><strong>No matching shops yet</strong><span>Try another category or district.</span></div>}</section>
    </main>
  );
}

function PublicReviews({ placeId, reviews }) {
  const visible = reviews.filter((review) => review.placeId === placeId).slice(0, 8);
  return (
    <section className="public-review-block"><div className="public-detail-section-title"><span>REVIEWS</span><h2>What customers say</h2></div>{visible.length ? <div className="public-review-list">{visible.map((review) => <article key={review.id}><div><strong>{review.userName || 'Twonara customer'}</strong><span><Star size={13} fill="currentColor" /> {review.rating}</span></div><p>{review.comment}</p><small>{review.trustLevel === 'verified' ? '✓ Verified Visit' : review.trustLevel === 'contacted' ? 'Contacted via Twonara' : 'Community review'}</small></article>)}</div> : <p className="public-muted">No public reviews yet.</p>}<div className="public-review-note"><ShieldCheck size={16} /><span>Customer accounts are not required for browsing. Twonara only displays reviews already accepted by the trusted review system.</span></div></section>
  );
}

function ShopDetails({ place, reviews, onBack, onAdd }) {
  const packages = getPackages(place);
  const gallery = [place.image, ...arrayValue(place.galleryUrls)].filter(Boolean).slice(0, 5);
  const whatsapp = () => {
    const number = normalizePhone(place.whatsappPhone || place.phone);
    if (!number) return;
    const text = encodeURIComponent(`Hi, I found ${place.name} on Twonara. I would like to ask about your packages and availability.`);
    window.open(`https://wa.me/${number}?text=${text}`, '_blank', 'noopener,noreferrer');
  };
  const directions = () => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`, '_blank', 'noopener,noreferrer');
  return (
    <main className={`public-shop-page shop-theme-${place.theme || 'rose'}`}>
      <div className="public-shop-top"><button onClick={onBack}><ArrowLeft size={18} /> Back</button><span>{place.location} District</span></div>
      <section className="public-shop-hero">
        <div className="public-shop-cover"><img src={place.image} alt={place.name} /></div>
        <div className="public-shop-title-row">{place.logoUrl && <img className="public-shop-logo" src={place.logoUrl} alt="" />}<div><span>{getSubtype(place)} · {place.category === 'Privacy' ? 'Private' : place.category}</span><h1>{place.name}</h1><p>{place.note}</p></div></div>
      </section>
      <section className="public-shop-content">
        {gallery.length > 1 && <div className="public-shop-gallery">{gallery.map((url, index) => <img src={url} alt="" key={`${url}-${index}`} />)}</div>}
        <section className="public-package-card"><div className="public-detail-section-title"><span>MENU / PACKAGES</span><h2>Choose an option</h2></div><div>{packages.map((item, index) => <article key={`${item.label}-${index}`}><strong>{item.label}</strong><span>{Number(item.price || 0) > 0 ? `Rs. ${Number(item.price).toLocaleString()}/=` : 'Ask shop'}</span></article>)}</div></section>
        <section className="public-shop-about"><div className="public-detail-section-title"><span>ABOUT</span><h2>About this shop</h2></div><p>{place.description}</p></section>
        <section className="public-shop-info-grid"><article><MapPin size={18} /><div><strong>Address</strong><span>{place.address}</span></div></article><article><Store size={18} /><div><strong>District</strong><span>{place.location}</span></div></article><article><Clock3Icon /><div><strong>Opening hours</strong><span>{place.time}</span></div></article></section>
        {arrayValue(place.features).length > 0 && <section className="public-facilities"><div className="public-detail-section-title"><span>FACILITIES</span><h2>Good to know</h2></div><div>{arrayValue(place.features).map((item) => <span key={item}><Check size={15} /> {item}</span>)}</div></section>}
        <button className="public-directions" onClick={directions}><Navigation size={17} /> Get directions</button>
        <PublicReviews placeId={place.id} reviews={reviews} />
      </section>
      <div className="public-contact-bar"><button onClick={() => place.phone && (window.location.href = `tel:${place.phone}`)}><Phone size={18} /><span>Call</span></button><button onClick={() => onAdd(place.id)}><CalendarDays size={18} /><span>Add to plan</span></button><button className="whatsapp" onClick={whatsapp}><MessageCircle size={19} /><span>WhatsApp</span></button></div>
    </main>
  );
}

function Clock3Icon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }

function GuestPlan({ places, ids, setIds, openPlace, onExplore }) {
  const items = ids.map((id) => places.find((place) => place.id === id)).filter(Boolean);
  const total = items.reduce((sum, item) => sum + Number(getPackages(item)[0]?.price || 0), 0);
  return (
    <main className="guest-plan-page"><section><span>NO LOGIN NEEDED</span><h1>Your date plan</h1><p>This plan is stored only in this browser.</p></section>{items.length ? <div className="guest-plan-list">{items.map((item, index) => <article key={item.id}><span>{index + 1}</span><img src={item.image} alt="" /><button onClick={() => openPlace(item.id)}><strong>{item.name}</strong><small>{getSubtype(item)} · {item.location}</small></button><button className="remove" onClick={() => setIds((current) => current.filter((id) => id !== item.id))}><X size={16} /></button></article>)}<div className="guest-plan-total"><span>Estimated from first package</span><strong>Rs. {total.toLocaleString()}/=</strong></div></div> : <div className="market-empty"><CalendarDays size={26} /><strong>Your plan is empty</strong><button onClick={onExplore}>Explore places</button></div>}</main>
  );
}

export default function AppMarketplaceV2() {
  const [district, setDistrict] = usePersistentState('twonara:location', 'Gampaha');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSubtype, setActiveSubtype] = useState('All');
  const [query, setQuery] = useState('');
  const [planItems, setPlanItems] = usePersistentState('twonara:guest-plan', []);
  const [session, setSession] = usePersistentState('twonara:session', null);
  const [listings, setListings] = usePersistentState('twonara:listings', seedBusinessListings);
  const [reviews, setReviews] = usePersistentState('twonara:reviews', []);
  const [users, setUsers] = usePersistentState('twonara:users', seedUsers);
  const [unusedSaved, setUnusedSaved] = useState([]);
  const [unusedPlans, setUnusedPlans] = useState([]);
  const [view, setView] = useState('home');
  const [selectedId, setSelectedId] = useState(null);
  const [authIntent, setAuthIntent] = useState('business');

  useSupabaseSync({ session, setSession, setListings, setReviews, setSavedItems: setUnusedSaved, setSavedPlans: setUnusedPlans, setUsers });

  useEffect(() => {
    const complete = (event) => {
      if (event.detail?.role === 'business') setView('shop');
      if (event.detail?.role === 'admin') setView('admin');
    };
    window.addEventListener('twonara:oauth-complete', complete);
    return () => window.removeEventListener('twonara:oauth-complete', complete);
  }, []);

  const approvedPublished = useMemo(() => listings.filter((item) => item.status === 'approved' && item.pageStatus === 'published').map(businessListingToPlace), [listings]);
  const giftSeeds = useMemo(() => seedGifts.map(giftToPlace), []);
  const allPlaces = useMemo(() => [...approvedPublished, ...seedPlaces, ...giftSeeds], [approvedPublished, giftSeeds]);
  const districtPlaces = useMemo(() => allPlaces.filter((place) => matchesDistrict(place.location, district)), [allPlaces, district]);
  const featured = useMemo(() => districtPlaces.filter((place) => place.promoted).slice(0, 8), [districtPlaces]);
  const homePlaces = useMemo(() => [...districtPlaces].sort((a, b) => Number(Boolean(b.promoted)) - Number(Boolean(a.promoted)) || Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 10), [districtPlaces]);
  const explorePlaces = useMemo(() => {
    const q = query.trim().toLowerCase();
    return districtPlaces.filter((place) => {
      const category = activeCategory === 'All' || place.category === activeCategory;
      const subtype = activeSubtype === 'All' || getSubtype(place) === activeSubtype;
      const search = `${place.name} ${place.note} ${place.category} ${getSubtype(place)} ${place.address}`.toLowerCase();
      return category && subtype && (!q || search.includes(q));
    }).sort((a, b) => Number(Boolean(b.promoted)) - Number(Boolean(a.promoted)) || Number(b.rating || 0) - Number(a.rating || 0));
  }, [districtPlaces, activeCategory, activeSubtype, query]);
  const selected = allPlaces.find((place) => place.id === selectedId);

  const go = (next) => { setView(next); if (next !== 'details') setSelectedId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openCategory = (category) => { setActiveCategory(category); setActiveSubtype('All'); go('explore'); };
  const openPlace = (id) => { setSelectedId(id); setView('details'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openShop = () => { if (session?.role === 'business') go('shop'); else { setAuthIntent('business'); go('auth'); } };
  const openAdmin = () => { if (session?.role === 'admin') go('admin'); else { setAuthIntent('admin'); go('auth'); } };
  const signOut = async () => { if (isSupabaseConfigured) await signOutSupabase(); setSession(null); go('home'); };
  const signedIn = (account) => { setSession(account); if (account.role === 'admin' && authIntent === 'admin') go('admin'); else if (account.role === 'business') go('shop'); else { signOut(); } };
  const addPlan = (id) => setPlanItems((current) => current.includes(id) ? current : [...current, id]);

  return (
    <div className="market-app-shell public-customer-shell">
      {view !== 'shop' && view !== 'admin' && (
        <header className="market-topbar"><div className="market-topbar-inner"><Logo onClick={() => go('home')} /><div className="market-top-actions public-top-actions"><button className="market-stories-link" onClick={() => go('stories')}><BookOpen size={16} /><span>Stories</span></button><button className="market-post-link" onClick={openShop}>{session?.role === 'business' ? 'Shop dashboard' : 'Post your ad'}</button>{session?.role === 'admin' && <button className="market-admin-link" onClick={openAdmin}>Admin</button>}</div></div></header>
      )}

      {view === 'home' && <HomePage district={district} query={query} setQuery={setQuery} onSearch={(e) => { e?.preventDefault?.(); openCategory('All'); }} activeCategory={activeCategory} onCategory={openCategory} featured={featured} places={homePlaces} openPlace={openPlace} openStories={() => go('stories')} openBusiness={openShop} />}
      {view === 'explore' && <ExplorePage district={district} activeCategory={activeCategory} activeSubtype={activeSubtype} setActiveSubtype={setActiveSubtype} query={query} setQuery={setQuery} places={explorePlaces} onCategory={openCategory} openPlace={openPlace} />}
      {view === 'details' && selected && <ShopDetails place={selected} reviews={reviews} onBack={() => go('explore')} onAdd={addPlan} />}
      {view === 'plan' && <GuestPlan places={allPlaces} ids={planItems} setIds={setPlanItems} openPlace={openPlace} onExplore={() => openCategory('All')} />}
      {view === 'stories' && <StoriesPage session={null} onBack={() => go('home')} onNeedLogin={() => {}} />}
      {view === 'auth' && <AuthPanel intentRole={authIntent} onSignedIn={signedIn} onBack={() => go('home')} />}
      {view === 'shop' && session?.role === 'business' && <ShopPortalV2 session={session} listings={listings} setListings={setListings} onBack={() => go('home')} onSignOut={signOut} />}
      {view === 'admin' && session?.role === 'admin' && <AdminPortalV2 session={session} listings={listings} setListings={setListings} users={users} setUsers={setUsers} onBack={() => go('home')} onSignOut={signOut} />}

      {view !== 'shop' && view !== 'admin' && view !== 'details' && view !== 'auth' && (
        <nav className="market-mobile-nav public-mobile-nav"><button className={view === 'home' ? 'active' : ''} onClick={() => go('home')}><Home size={20} /><span>Home</span></button><button className={view === 'explore' ? 'active' : ''} onClick={() => openCategory('All')}><Compass size={20} /><span>Explore</span></button><button className={view === 'plan' ? 'active plan' : 'plan'} onClick={() => go('plan')}><CalendarDays size={21} /><span>Plan{planItems.length ? ` (${planItems.length})` : ''}</span></button><button className={view === 'stories' ? 'active' : ''} onClick={() => go('stories')}><BookOpen size={20} /><span>Stories</span></button></nav>
      )}

      {view === 'home' && <footer className="public-footer"><span>Twonara · Browse without an account</span><button onClick={openAdmin}>Admin access</button></footer>}
    </div>
  );
}
