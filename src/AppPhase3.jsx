import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BedDouble,
  Bookmark,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Heart,
  Home,
  MapPin,
  Navigation,
  Phone,
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
import DatePlanner from './DatePlanner';
import './phase2.css';
import './phase3.css';

const categories = [
  { name: 'Do', icon: Activity, helper: 'Fun things together' },
  { name: 'Eat', icon: Utensils, helper: 'A table for two' },
  { name: 'Privacy', icon: Popcorn, helper: 'Quiet couple-friendly spots' },
  { name: 'Relax', icon: Trees, helper: 'Slow down together' },
  { name: 'Stay', icon: BedDouble, helper: 'A little getaway' },
];

const samplePlaces = [
  {
    id: 1, name: 'Harbour Table', category: 'Eat', note: 'Dinner with a calm evening view',
    description: 'A relaxed waterfront restaurant made for slow dinners, easy conversation and sunset views. A good pick when you want a simple date night without over-planning.',
    location: 'Negombo', address: 'Lewis Place, Negombo', distanceKm: 1.8, rating: 4.8, reviews: 184,
    price: 'Rs. 2,500 – 5,000', priceLevel: 2, time: 'Open until 11:00 PM', openNow: true,
    tags: ['Dinner', 'Waterfront', 'Couple-friendly'], features: ['Outdoor seating', 'Reservations', 'Parking', 'Vegetarian options'],
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 2, name: 'Sunset Paddle', category: 'Do', note: 'A relaxed evening activity for two',
    description: 'A gentle paddle experience around the lagoon during the cooler evening hours. It is designed as a low-pressure activity for couples who want to do something different together.',
    location: 'Negombo', address: 'Negombo Lagoon, Negombo', distanceKm: 3.1, rating: 4.7, reviews: 96,
    price: 'From Rs. 3,000', priceLevel: 2, time: 'Best before sunset', openNow: true,
    tags: ['Outdoor', 'Sunset', 'Activity'], features: ['Guide included', 'Life jackets', 'Pre-booking', 'Couple sessions'],
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 3, name: 'Cinema Nook', category: 'Privacy', note: 'A small private screening space',
    description: 'A bookable private screening room with a comfortable setup for two. Choose a time slot, bring your own movie selection and enjoy a quieter cinema-style experience.',
    location: 'Negombo', address: 'Colombo Road, Negombo', distanceKm: 2.4, rating: 4.6, reviews: 132,
    price: 'From Rs. 2,000', priceLevel: 1, time: 'Slots available today', openNow: true,
    tags: ['Private cinema', 'Bookable', 'Indoor'], features: ['Private room', 'Air conditioned', 'Snacks available', 'Advance booking'],
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 4, name: 'Lagoon Calm', category: 'Relax', note: 'Quiet views and an easy evening',
    description: 'A peaceful lagoon-side spot for couples who want to slow down, have a drink and enjoy the view. Best for an unhurried afternoon or early evening stop.',
    location: 'Negombo', address: 'Lagoon View Road, Negombo', distanceKm: 4.0, rating: 4.9, reviews: 211,
    price: 'From Rs. 1,500', priceLevel: 1, time: 'Open until 9:30 PM', openNow: true,
    tags: ['Quiet', 'View', 'Relax'], features: ['Outdoor seating', 'Drinks', 'Parking', 'Sunset view'],
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 5, name: 'Palm Stay', category: 'Stay', note: 'A cozy overnight escape near the coast',
    description: 'A small coastal stay with a relaxed atmosphere, comfortable rooms and easy access to the beach. Useful when your date plan includes an overnight getaway.',
    location: 'Negombo', address: 'Porutota Road, Negombo', distanceKm: 5.2, rating: 4.7, reviews: 149,
    price: 'From Rs. 12,000', priceLevel: 3, time: 'Check-in from 2:00 PM', openNow: true,
    tags: ['Stay', 'Pool', 'Beach nearby'], features: ['Private room', 'Pool', 'Breakfast', 'Parking'],
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 6, name: 'Little Italy', category: 'Eat', note: 'Pizza, pasta and an easy date-night mood',
    description: 'A casual restaurant with warm lighting, shareable dishes and an easygoing atmosphere. Good for a first stop before another activity nearby.',
    location: 'Negombo', address: 'Beach Road, Negombo', distanceKm: 2.7, rating: 4.5, reviews: 238,
    price: 'Rs. 2,000 – 4,500', priceLevel: 2, time: 'Open until 10:30 PM', openNow: true,
    tags: ['Italian', 'Dinner', 'Casual'], features: ['Indoor seating', 'Takeaway', 'Parking', 'Desserts'],
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 7, name: 'Clay Date Studio', category: 'Do', note: 'Make something together and take it home',
    description: 'A beginner-friendly creative session where two people can paint or shape a small clay piece together. No previous art experience is needed.',
    location: 'Negombo', address: 'Main Street, Negombo', distanceKm: 3.8, rating: 4.8, reviews: 74,
    price: 'From Rs. 3,500', priceLevel: 2, time: 'Sessions until 8:00 PM', openNow: false,
    tags: ['Creative', 'Indoor', 'Workshop'], features: ['Materials included', 'Beginner friendly', 'Take-home piece', 'Pre-booking'],
    image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 8, name: 'Cloud Spa', category: 'Relax', note: 'A calm wellness stop for your date plan',
    description: 'A modern wellness space offering short relaxation packages in a quiet setting. Best when you want to add a slower, more comfortable stop to the day.',
    location: 'Negombo', address: 'St. Joseph Street, Negombo', distanceKm: 4.6, rating: 4.6, reviews: 103,
    price: 'From Rs. 4,000', priceLevel: 2, time: 'Open until 9:00 PM', openNow: true,
    tags: ['Wellness', 'Indoor', 'Relax'], features: ['Appointments', 'Air conditioned', 'Parking', 'Couple packages'],
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=85',
  },
];

function Logo({ onClick }) {
  return (
    <button className="brand brand-button" aria-label="Twonara home" onClick={onClick}>
      <span className="brand-mark"><Heart size={18} fill="currentColor" /></span>
      <span>Twonara</span>
    </button>
  );
}

function PlaceCard({ place, added, saved, onAdd, onSave, onOpen }) {
  return (
    <article className="place-card phase2-card" onClick={() => onOpen(place.id)}>
      <div className="place-image-wrap">
        <img className="place-image" src={place.image} alt={`${place.name} in ${place.location}`} />
        <span className="category-badge">{place.category}</span>
        <button className={saved ? 'save-button saved' : 'save-button'} onClick={(event) => { event.stopPropagation(); onSave(place.id); }} aria-label={`Save ${place.name}`}>
          <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="place-content">
        <div className="place-title-row">
          <div><h3>{place.name}</h3><p>{place.note}</p></div>
          <span className="rating"><Star size={15} fill="currentColor" /> {place.rating.toFixed(1)}</span>
        </div>
        <div className="place-meta">
          <span><MapPin size={14} /> {place.distanceKm.toFixed(1)} km</span>
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

function ExplorePage({ location, query, setQuery, activeCategory, setActiveCategory, openOnly, setOpenOnly, sortBy, setSortBy, places, planItems, savedItems, togglePlan, toggleSaved, openPlace }) {
  return (
    <main className="phase2-page">
      <section className="section-wrap explore-hero">
        <div>
          <span className="eyebrow"><Compass size={15} /> Explore together</span>
          <h1>Find a place that feels right.</h1>
          <p>Browse couple-friendly ideas around {location}. Save what you like and add the best ones to your date plan.</p>
        </div>
        <div className="explore-search-box">
          <Search size={20} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search restaurants, activities, places..." />
        </div>
      </section>

      <section className="section-wrap filter-panel">
        <div className="filter-category-row">
          {['All', ...categories.map((item) => item.name)].map((name) => (
            <button key={name} className={activeCategory === name ? 'filter-chip active' : 'filter-chip'} onClick={() => setActiveCategory(name)}>{name}</button>
          ))}
        </div>
        <div className="filter-actions">
          <button className={openOnly ? 'filter-control active' : 'filter-control'} onClick={() => setOpenOnly(!openOnly)}><Clock3 size={16} /> Open now</button>
          <label className="filter-control select-control"><SlidersHorizontal size={16} />
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="recommended">Recommended</option>
              <option value="rating">Top rated</option>
              <option value="nearest">Nearest</option>
              <option value="budget">Lower price</option>
            </select>
          </label>
        </div>
      </section>

      <section className="section-wrap explore-results">
        <div className="results-heading"><div><span className="mini-label">{places.length} places found</span><h2>{activeCategory === 'All' ? `Ideas around ${location}` : `${activeCategory} around ${location}`}</h2></div></div>
        {places.length ? (
          <div className="place-grid explore-grid">
            {places.map((place) => <PlaceCard key={place.id} place={place} added={planItems.includes(place.id)} saved={savedItems.includes(place.id)} onAdd={togglePlan} onSave={toggleSaved} onOpen={openPlace} />)}
          </div>
        ) : (
          <div className="empty-state"><Search size={26} /><h3>No matching places yet</h3><p>Try another search or category.</p><button onClick={() => { setQuery(''); setActiveCategory('All'); }}>Clear filters</button></div>
        )}
      </section>
    </main>
  );
}

function PlaceDetails({ place, added, saved, onBack, onAdd, onSave }) {
  return (
    <main className="details-page">
      <section className="section-wrap detail-top-row">
        <button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Back to explore</button>
        <div className="detail-top-actions"><button className="icon-text-button"><Share2 size={17} /> Share</button><button className={saved ? 'icon-text-button saved' : 'icon-text-button'} onClick={() => onSave(place.id)}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}</button></div>
      </section>
      <section className="section-wrap detail-hero-grid">
        <div className="detail-image-panel"><img src={place.image} alt={`${place.name} in ${place.location}`} /><span className="detail-category">{place.category}</span></div>
        <div className="detail-summary">
          <span className="mini-label">{place.category} · {place.location}</span><h1>{place.name}</h1><p className="detail-note">{place.note}</p>
          <div className="detail-rating-line"><span className="rating large"><Star size={18} fill="currentColor" /> {place.rating.toFixed(1)}</span><span>{place.reviews} reviews</span><span>·</span><span>{place.distanceKm.toFixed(1)} km away</span></div>
          <div className="detail-tags">{place.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          <div className="detail-info-list"><div><MapPin size={18} /><span><strong>{place.address}</strong><small>{place.location}</small></span></div><div><Clock3 size={18} /><span><strong>{place.time}</strong><small>{place.openNow ? 'Open now' : 'Check availability before going'}</small></span></div></div>
          <div className="detail-booking-card"><div><span>Typical price</span><strong>{place.price}</strong></div><button className={added ? 'primary-detail-button added' : 'primary-detail-button'} onClick={() => onAdd(place.id)}>{added ? <><Check size={18} /> Added to date plan</> : <><CalendarDays size={18} /> Add to date plan</>}</button></div>
        </div>
      </section>
      <section className="section-wrap detail-body-grid">
        <div className="detail-main-copy">
          <div className="detail-section-block"><span className="mini-label">Why couples like it</span><h2>A simple idea for time together</h2><p>{place.description}</p></div>
          <div className="detail-section-block"><span className="mini-label">Good to know</span><h2>What you can expect</h2><div className="feature-grid">{place.features.map((feature) => <div key={feature}><Check size={17} /><span>{feature}</span></div>)}</div></div>
        </div>
        <aside className="detail-side-card"><span className="mini-label">Plan this stop</span><h3>Ready to add it?</h3><p>Keep this place together with the rest of your date ideas.</p><button className={added ? 'side-plan-button added' : 'side-plan-button'} onClick={() => onAdd(place.id)}><CalendarDays size={18} /> {added ? 'Remove from plan' : 'Add to date plan'}</button><button className="contact-button"><Phone size={18} /> Contact place</button></aside>
      </section>
    </main>
  );
}

function AppPhase3() {
  const [location, setLocation] = useState('Negombo');
  const [locationInput, setLocationInput] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [planItems, setPlanItems] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [view, setView] = useState('home');
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [query, setQuery] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');

  const homePlaces = useMemo(() => activeCategory === 'All' ? samplePlaces.slice(0, 5) : samplePlaces.filter((place) => place.category === activeCategory).slice(0, 5), [activeCategory]);

  const explorePlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = samplePlaces.filter((place) => {
      const matchesCategory = activeCategory === 'All' || place.category === activeCategory;
      const matchesOpen = !openOnly || place.openNow;
      const searchable = `${place.name} ${place.category} ${place.note} ${place.tags.join(' ')}`.toLowerCase();
      return matchesCategory && matchesOpen && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'nearest') return a.distanceKm - b.distanceKm;
      if (sortBy === 'budget') return a.priceLevel - b.priceLevel;
      return (b.rating * 10 - b.distanceKm) - (a.rating * 10 - a.distanceKm);
    });
  }, [activeCategory, openOnly, query, sortBy]);

  const selectedPlace = samplePlaces.find((place) => place.id === selectedPlaceId);
  const go = (nextView) => { setView(nextView); if (nextView !== 'details') setSelectedPlaceId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goHome = () => go('home');
  const openPlan = () => go('plan');
  const openExplore = (category = 'All') => { setActiveCategory(category); go('explore'); };
  const openPlace = (id) => { setSelectedPlaceId(id); setView('details'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const togglePlan = (id) => setPlanItems((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
  const toggleSaved = (id) => setSavedItems((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
  const chooseLocation = (event) => { event.preventDefault(); const next = locationInput.trim(); if (!next) return; setLocation(next); setLocationInput(''); };

  return (
    <div className="app-shell">
      <header className="topbar"><div className="topbar-inner">
        <Logo onClick={goHome} />
        <div className="desktop-nav">
          <button className={view === 'home' ? 'desktop-nav-link active' : 'desktop-nav-link'} onClick={goHome}>Home</button>
          <button className={view === 'explore' || view === 'details' ? 'desktop-nav-link active' : 'desktop-nav-link'} onClick={() => openExplore('All')}>Explore</button>
          <button className={view === 'plan' ? 'desktop-nav-link active' : 'desktop-nav-link'} onClick={openPlan}>Date Plan {planItems.length > 0 && <span>{planItems.length}</span>}</button>
        </div>
        <div className="topbar-actions"><button className="business-link">Post a place</button><button className="profile-button" aria-label="Open profile"><UserRound size={19} /></button></div>
      </div></header>

      {view === 'home' && <main>
        <section className="hero section-wrap">
          <div className="hero-copy"><span className="eyebrow"><Sparkles size={15} /> Made for two</span><h1>Find your next<br /><em>moment together.</em></h1><p>Good places, simple plans, less searching. Start with where you want to go.</p></div>
          <div className="location-card"><div className="location-label"><MapPin size={17} /> Exploring</div><div className="current-location-row"><div><strong>{location}</strong><span>Change your area anytime</span></div><div className="location-pin"><Navigation size={19} /></div></div><form className="location-search" onSubmit={chooseLocation}><Search size={19} /><input value={locationInput} onChange={(event) => setLocationInput(event.target.value)} placeholder="Search another city or area" /><button type="submit">Go</button></form></div>
        </section>
        <section className="section-wrap category-section"><div className="section-heading compact-heading"><div><span className="mini-label">Explore your way</span><h2>What are you two in the mood for?</h2></div></div><div className="category-grid">{categories.map(({ name, icon: Icon, helper }) => <button key={name} className="category-tile" onClick={() => openExplore(name)}><span className="category-icon"><Icon size={22} /></span><span className="category-text"><strong>{name}</strong><small>{helper}</small></span><ChevronRight className="category-arrow" size={18} /></button>)}</div></section>
        <section className="section-wrap places-section"><div className="section-heading"><div><span className="mini-label">Near {location}</span><h2>Lovely ideas for today</h2></div><button className="text-button" onClick={() => openExplore('All')}>Explore all</button></div><div className="place-grid">{homePlaces.map((place) => <PlaceCard key={place.id} place={place} added={planItems.includes(place.id)} saved={savedItems.includes(place.id)} onAdd={togglePlan} onSave={toggleSaved} onOpen={openPlace} />)}</div></section>
        <section className="section-wrap planner-section"><div className="planner-card"><div className="planner-icon"><CalendarDays size={25} /></div><div className="planner-copy"><span className="mini-label">Twonara Date Plan</span><h2>Turn ideas into a simple date plan.</h2><p>Pick a place to eat, something to do, somewhere to relax — then keep the whole day together.</p></div><button className="planner-button" onClick={openPlan}>{planItems.length > 0 ? `Open plan · ${planItems.length}` : 'Start a date plan'}<ChevronRight size={18} /></button></div></section>
        <section className="section-wrap soft-cta"><div><span className="mini-label">For local businesses</span><h2>Have a place couples would love?</h2><p>Join Twonara and help people discover your restaurant, activity, relaxing spot or stay.</p></div><button className="outline-button">Post your place</button></section>
      </main>}

      {view === 'explore' && <ExplorePage location={location} query={query} setQuery={setQuery} activeCategory={activeCategory} setActiveCategory={setActiveCategory} openOnly={openOnly} setOpenOnly={setOpenOnly} sortBy={sortBy} setSortBy={setSortBy} places={explorePlaces} planItems={planItems} savedItems={savedItems} togglePlan={togglePlan} toggleSaved={toggleSaved} openPlace={openPlace} />}
      {view === 'details' && selectedPlace && <PlaceDetails place={selectedPlace} added={planItems.includes(selectedPlace.id)} saved={savedItems.includes(selectedPlace.id)} onBack={() => openExplore(activeCategory)} onAdd={togglePlan} onSave={toggleSaved} />}
      {view === 'plan' && <DatePlanner places={samplePlaces} planItems={planItems} setPlanItems={setPlanItems} onExplore={() => openExplore('All')} onOpenPlace={openPlace} />}

      <nav className="mobile-nav" aria-label="Main navigation">
        <button className={view === 'home' ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={goHome}><Home size={20} /><span>Home</span></button>
        <button className={view === 'explore' || view === 'details' ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={() => openExplore('All')}><Compass size={20} /><span>Explore</span></button>
        <button className={view === 'plan' ? 'mobile-nav-item plan-nav active' : 'mobile-nav-item plan-nav'} onClick={openPlan}><span className="plan-nav-icon"><CalendarDays size={21} /></span><span>Plan{planItems.length > 0 ? ` (${planItems.length})` : ''}</span></button>
        <button className="mobile-nav-item"><Bookmark size={20} /><span>Saved{savedItems.length > 0 ? ` (${savedItems.length})` : ''}</span></button>
        <button className="mobile-nav-item"><UserRound size={20} /><span>Profile</span></button>
      </nav>
    </div>
  );
}

export default AppPhase3;
