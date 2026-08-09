import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
  Share2,
  Trash2,
  WalletCards,
} from 'lucide-react';

const estimatedCosts = {
  1: 3750,
  2: 3000,
  3: 2000,
  4: 1500,
  5: 12000,
  6: 3250,
  7: 3500,
  8: 4000,
};

const defaultTimes = ['3:00 PM', '5:00 PM', '7:00 PM', '9:00 PM', '10:30 PM'];

function formatCurrency(value) {
  return `Rs. ${value.toLocaleString('en-LK')}`;
}

function DatePlanner({ places, planItems, setPlanItems, onExplore, onOpenPlace }) {
  const [planName, setPlanName] = useState('Our Negombo Date');
  const [planDate, setPlanDate] = useState('');
  const [times, setTimes] = useState({});
  const [shareMessage, setShareMessage] = useState('');

  const plannedPlaces = useMemo(
    () => planItems.map((id) => places.find((place) => place.id === id)).filter(Boolean),
    [planItems, places],
  );

  const estimatedTotal = plannedPlaces.reduce(
    (sum, place) => sum + (estimatedCosts[place.id] || 0),
    0,
  );

  const totalDistance = plannedPlaces.reduce((sum, place) => sum + place.distanceKm, 0);

  const moveStop = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= planItems.length) return;

    setPlanItems((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const removeStop = (id) => {
    setPlanItems((current) => current.filter((itemId) => itemId !== id));
  };

  const createShareText = () => {
    const lines = plannedPlaces.map((place, index) => {
      const time = times[place.id] || defaultTimes[index] || 'Time not set';
      return `${index + 1}. ${time} — ${place.name} (${place.category})`;
    });

    return [
      `Twonara Date Plan: ${planName || 'Our Date'}`,
      planDate ? `Date: ${planDate}` : 'Date: Not set yet',
      '',
      ...lines,
      '',
      `Estimated budget: ${formatCurrency(estimatedTotal)}`,
    ].join('\n');
  };

  const sharePlan = async () => {
    if (!plannedPlaces.length) return;

    const text = createShareText();

    try {
      if (navigator.share) {
        await navigator.share({ title: planName || 'Twonara Date Plan', text });
        setShareMessage('Plan shared');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setShareMessage('Plan copied');
      } else {
        setShareMessage('Sharing is not supported on this browser');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') setShareMessage('Could not share this time');
    }

    window.setTimeout(() => setShareMessage(''), 2200);
  };

  return (
    <main className="date-plan-page">
      <section className="section-wrap plan-hero">
        <div className="plan-hero-copy">
          <span className="eyebrow"><CalendarDays size={15} /> Your date, your way</span>
          <h1>Build a lovely day together.</h1>
          <p>Add your favourite places, put them in the right order, choose the time and keep the whole date in one simple plan.</p>
        </div>

        <div className="plan-header-card">
          <label>
            <span>Plan name</span>
            <input value={planName} onChange={(event) => setPlanName(event.target.value)} placeholder="Our date plan" />
          </label>
          <label>
            <span>Date</span>
            <input type="date" value={planDate} onChange={(event) => setPlanDate(event.target.value)} />
          </label>
        </div>
      </section>

      {plannedPlaces.length === 0 ? (
        <section className="section-wrap empty-plan-card">
          <div className="empty-plan-icon"><CalendarDays size={30} /></div>
          <span className="mini-label">Your plan is empty</span>
          <h2>Start with one place you both like.</h2>
          <p>Explore Twonara, choose something to do, eat, relax or stay, then tap “Add to plan”.</p>
          <button onClick={onExplore}>Explore date ideas <ChevronRight size={18} /></button>
        </section>
      ) : (
        <section className="section-wrap plan-layout">
          <div className="plan-timeline">
            <div className="plan-section-heading">
              <div>
                <span className="mini-label">Your stops</span>
                <h2>{plannedPlaces.length} {plannedPlaces.length === 1 ? 'place' : 'places'} in this date</h2>
              </div>
              <button className="add-stop-button" onClick={onExplore}><Plus size={17} /> Add another stop</button>
            </div>

            <div className="plan-stop-list">
              {plannedPlaces.map((place, index) => (
                <article className="plan-stop-card" key={place.id}>
                  <div className="timeline-number">{index + 1}</div>

                  <button className="plan-stop-image" onClick={() => onOpenPlace(place.id)} aria-label={`Open ${place.name}`}>
                    <img src={place.image} alt="" />
                  </button>

                  <div className="plan-stop-main">
                    <span className="plan-category">{place.category}</span>
                    <button className="plan-place-name" onClick={() => onOpenPlace(place.id)}>{place.name}</button>
                    <p>{place.note}</p>
                    <div className="plan-place-meta">
                      <span><MapPin size={14} /> {place.address}</span>
                      <span><WalletCards size={14} /> Est. {formatCurrency(estimatedCosts[place.id] || 0)}</span>
                    </div>
                  </div>

                  <div className="plan-stop-time">
                    <label>
                      <Clock3 size={15} /> Time
                      <input
                        type="time"
                        value={times[place.id] || ''}
                        onChange={(event) => setTimes((current) => ({ ...current, [place.id]: event.target.value }))}
                      />
                    </label>
                  </div>

                  <div className="plan-stop-actions">
                    <button onClick={() => moveStop(index, -1)} disabled={index === 0} aria-label="Move stop up"><ArrowUp size={17} /></button>
                    <button onClick={() => moveStop(index, 1)} disabled={index === plannedPlaces.length - 1} aria-label="Move stop down"><ArrowDown size={17} /></button>
                    <button className="remove-stop" onClick={() => removeStop(place.id)} aria-label={`Remove ${place.name}`}><Trash2 size={17} /></button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="plan-summary-card">
            <span className="mini-label">Plan summary</span>
            <h2>{planName || 'Our Date'}</h2>
            <p className="plan-summary-location"><MapPin size={15} /> Negombo</p>

            <div className="plan-summary-stats">
              <div><span>Stops</span><strong>{plannedPlaces.length}</strong></div>
              <div><span>Approx. distance</span><strong>{totalDistance.toFixed(1)} km</strong></div>
              <div className="budget-row"><span>Estimated total</span><strong>{formatCurrency(estimatedTotal)}</strong></div>
            </div>

            <p className="budget-note">This is only a simple estimate based on the sample price for each place. Final prices may be different.</p>

            <button className="share-plan-button" onClick={sharePlan}><Share2 size={18} /> Share date plan</button>
            {shareMessage && <div className="share-feedback">{shareMessage}</div>}
          </aside>
        </section>
      )}
    </main>
  );
}

export default DatePlanner;
