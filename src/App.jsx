import { useMemo, useState } from 'react';
import {
  Activity,
  BedDouble,
  Bookmark,
  CalendarDays,
  ChevronRight,
  Clock3,
  Compass,
  Heart,
  Home,
  MapPin,
  Navigation,
  Popcorn,
  Search,
  Sparkles,
  Star,
  Trees,
  UserRound,
  Utensils,
} from 'lucide-react';

const categories = [
  { name: 'Do', icon: Activity, helper: 'Fun things together' },
  { name: 'Eat', icon: Utensils, helper: 'A table for two' },
  { name: 'Privacy', icon: Popcorn, helper: 'Quiet couple-friendly spots' },
  { name: 'Relax', icon: Trees, helper: 'Slow down together' },
  { name: 'Stay', icon: BedDouble, helper: 'A little getaway' },
];

const samplePlaces = [
  {
    id: 1,
    name: 'Harbour Table',
    category: 'Eat',
    note: 'Dinner with a calm evening view',
    location: 'Negombo',
    distance: '1.8 km',
    rating: '4.8',
    price: 'Rs. 2,500 – 5,000',
    time: 'Open until 11:00 PM',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 2,
    name: 'Sunset Paddle',
    category: 'Do',
    note: 'A relaxed evening activity for two',
    location: 'Negombo',
    distance: '3.1 km',
    rating: '4.7',
    price: 'From Rs. 3,000',
    time: 'Best before sunset',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 3,
    name: 'Cinema Nook',
    category: 'Privacy',
    note: 'A small private screening space',
    location: 'Negombo',
    distance: '2.4 km',
    rating: '4.6',
    price: 'From Rs. 2,000',
    time: 'Slots available today',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 4,
    name: 'Lagoon Calm',
    category: 'Relax',
    note: 'Quiet views and an easy evening',
    location: 'Negombo',
    distance: '4.0 km',
    rating: '4.9',
    price: 'From Rs. 1,500',
    time: 'Open until 9:30 PM',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 5,
    name: 'Palm Stay',
    category: 'Stay',
    note: 'A cozy overnight escape near the coast',
    location: 'Negombo',
    distance: '5.2 km',
    rating: '4.7',
    price: 'From Rs. 12,000',
    time: 'Check-in from 2:00 PM',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
  },
];

function Logo() {
  return (
    <div className="brand" aria-label="Twonara home">
      <div className="brand-mark"><Heart size={18} fill="currentColor" /></div>
      <span>Twonara</span>
    </div>
  );
}

function PlaceCard({ place, added, onAdd }) {
  return (
    <article className="place-card">
      <div className="place-image-wrap">
        <img className="place-image" src={place.image} alt="" />
        <span className="category-badge">{place.category}</span>
        <button className="save-button" aria-label={`Save ${place.name}`}><Heart size={18} /></button>
      </div>

      <div className="place-content">
        <div className="place-title-row">
          <div>
            <h3>{place.name}</h3>
            <p>{place.note}</p>
          </div>
          <span className="rating"><Star size={15} fill="currentColor" /> {place.rating}</span>
        </div>

        <div className="place-meta">
          <span><MapPin size={14} /> {place.distance}</span>
          <span><Clock3 size={14} /> {place.time}</span>
        </div>

        <div className="place-footer">
          <strong>{place.price}</strong>
          <button className={added ? 'add-plan-button added' : 'add-plan-button'} onClick={() => onAdd(place.id)}>
            {added ? 'Added' : 'Add to plan'}
          </button>
        </div>
      </div>
    </article>
  );
}

function App() {
  const [location, setLocation] = useState('Negombo');
  const [locationInput, setLocationInput] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [planItems, setPlanItems] = useState([]);

  const visiblePlaces = useMemo(() => {
    if (activeCategory === 'All') return samplePlaces;
    return samplePlaces.filter((place) => place.category === activeCategory);
  }, [activeCategory]);

  const chooseLocation = (event) => {
    event.preventDefault();
    const nextLocation = locationInput.trim();
    if (!nextLocation) return;
    setLocation(nextLocation);
    setLocationInput('');
  };

  const togglePlan = (id) => {
    setPlanItems((current) => current.includes(id)
      ? current.filter((itemId) => itemId !== id)
      : [...current, id]);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Logo />
          <div className="topbar-actions">
            <button className="business-link">Post a place</button>
            <button className="profile-button" aria-label="Open profile"><UserRound size={19} /></button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero section-wrap">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={15} /> Made for two</span>
            <h1>Find your next<br /><em>moment together.</em></h1>
            <p>Good places, simple plans, less searching. Start with where you want to go.</p>
          </div>

          <div className="location-card">
            <div className="location-label"><MapPin size={17} /> Exploring</div>
            <div className="current-location-row">
              <div>
                <strong>{location}</strong>
                <span>Change your area anytime</span>
              </div>
              <div className="location-pin"><Navigation size={19} /></div>
            </div>

            <form className="location-search" onSubmit={chooseLocation}>
              <Search size={19} />
              <input
                value={locationInput}
                onChange={(event) => setLocationInput(event.target.value)}
                placeholder="Search another city or area"
                aria-label="Search another city or area"
              />
              <button type="submit">Go</button>
            </form>
          </div>
        </section>

        <section className="section-wrap category-section">
          <div className="section-heading compact-heading">
            <div>
              <span className="mini-label">Explore your way</span>
              <h2>What are you two in the mood for?</h2>
            </div>
          </div>

          <div className="category-grid">
            {categories.map(({ name, icon: Icon, helper }) => (
              <button
                key={name}
                className={activeCategory === name ? 'category-tile active' : 'category-tile'}
                onClick={() => setActiveCategory(activeCategory === name ? 'All' : name)}
              >
                <span className="category-icon"><Icon size={22} /></span>
                <span className="category-text">
                  <strong>{name}</strong>
                  <small>{helper}</small>
                </span>
                <ChevronRight className="category-arrow" size={18} />
              </button>
            ))}
          </div>
        </section>

        <section className="section-wrap places-section">
          <div className="section-heading">
            <div>
              <span className="mini-label">Near {location}</span>
              <h2>{activeCategory === 'All' ? 'Lovely ideas for today' : `${activeCategory} ideas for two`}</h2>
            </div>
            {activeCategory !== 'All' && (
              <button className="text-button" onClick={() => setActiveCategory('All')}>See all</button>
            )}
          </div>

          <div className="place-grid">
            {visiblePlaces.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                added={planItems.includes(place.id)}
                onAdd={togglePlan}
              />
            ))}
          </div>
        </section>

        <section className="section-wrap planner-section">
          <div className="planner-card">
            <div className="planner-icon"><CalendarDays size={25} /></div>
            <div className="planner-copy">
              <span className="mini-label">Twonara Date Plan</span>
              <h2>Turn ideas into a simple date plan.</h2>
              <p>Pick a place to eat, something to do, somewhere to relax — then keep the whole day together.</p>
            </div>
            <button className="planner-button">
              {planItems.length > 0 ? `Open plan · ${planItems.length}` : 'Start a date plan'}
              <ChevronRight size={18} />
            </button>
          </div>
        </section>

        <section className="section-wrap soft-cta">
          <div>
            <span className="mini-label">For local businesses</span>
            <h2>Have a place couples would love?</h2>
            <p>Join Twonara and help people discover your restaurant, activity, relaxing spot or stay.</p>
          </div>
          <button className="outline-button">Post your place</button>
        </section>
      </main>

      <nav className="mobile-nav" aria-label="Main navigation">
        <button className="mobile-nav-item active"><Home size={20} /><span>Home</span></button>
        <button className="mobile-nav-item"><Compass size={20} /><span>Explore</span></button>
        <button className="mobile-nav-item plan-nav">
          <span className="plan-nav-icon"><CalendarDays size={21} /></span>
          <span>Plan{planItems.length > 0 ? ` (${planItems.length})` : ''}</span>
        </button>
        <button className="mobile-nav-item"><Bookmark size={20} /><span>Saved</span></button>
        <button className="mobile-nav-item"><UserRound size={20} /><span>Profile</span></button>
      </nav>
    </div>
  );
}

export default App;
