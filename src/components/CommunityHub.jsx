import GuestStoriesPage from './GuestStoriesPage';
import { usePersistentState } from '../lib/storage';

export function StoriesPage({ onBack, location }) {
  const [storedDistrict] = usePersistentState('twonara:location', 'Gampaha');
  return <GuestStoriesPage district={location || storedDistrict || 'Gampaha'} onBack={onBack} />;
}

// Gift businesses now use the same approved Shop Page workflow as every other
// Twonara category. This compatibility export keeps older imports harmless.
export function GiftShopPage({ onBack }) {
  return (
    <main className="community-page gift-page">
      <section className="section-wrap simple-empty">
        <h2>Gift shops have moved to the main marketplace.</h2>
        <p>Choose the Gift category to browse approved and published gift shops.</p>
        {onBack && <button onClick={onBack}>Back to Twonara</button>}
      </section>
    </main>
  );
}
