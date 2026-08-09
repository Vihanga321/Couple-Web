import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, CalendarDays, ChevronRight, Clock3, MapPin, Plus, Save, Share2, Trash2, WalletCards } from 'lucide-react';
import { usePersistentState } from '../lib/storage';

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-LK')}`;
}

function PlannerFinal({ places, planItems, setPlanItems, location, session, savedPlans, setSavedPlans, onExplore, onOpenPlace, onNeedLogin }) {
  const [planName, setPlanName] = usePersistentState('twonara:plan-name', `Our ${location} Date`);
  const [planDate, setPlanDate] = usePersistentState('twonara:plan-date', '');
  const [times, setTimes] = usePersistentState('twonara:plan-times', {});
  const [message, setMessage] = useState('');

  const plannedPlaces = useMemo(() => planItems.map((id) => places.find((place) => place.id === id)).filter(Boolean), [planItems, places]);
  const estimatedTotal = plannedPlaces.reduce((sum, place) => sum + Number(place.estimatedCost || 0), 0);
  const totalDistance = plannedPlaces.reduce((sum, place) => sum + Number(place.distanceKm || 0), 0);

  const moveStop = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= planItems.length) return;
    setPlanItems((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const removeStop = (id) => setPlanItems((current) => current.filter((itemId) => itemId !== id));

  const createShareText = () => {
    const lines = plannedPlaces.map((place, index) => `${index + 1}. ${times[place.id] || 'Time not set'} — ${place.name} (${place.category})`);
    return [`Twonara Date Plan: ${planName || 'Our Date'}`, planDate ? `Date: ${planDate}` : 'Date: Not set', `Location: ${location}`, '', ...lines, '', `Estimated budget: ${formatCurrency(estimatedTotal)}`].join('\n');
  };

  const sharePlan = async () => {
    if (!plannedPlaces.length) return;
    const text = createShareText();
    try {
      if (navigator.share) await navigator.share({ title: planName || 'Twonara Date Plan', text });
      else if (navigator.clipboard) await navigator.clipboard.writeText(text);
      setMessage(navigator.share ? 'Plan shared.' : 'Plan copied.');
    } catch (error) {
      if (error?.name !== 'AbortError') setMessage('Could not share this time.');
    }
    window.setTimeout(() => setMessage(''), 2200);
  };

  const savePlan = () => {
    if (!plannedPlaces.length) return;
    if (!session) {
      onNeedLogin();
      return;
    }
    const plan = {
      id: `plan-${Date.now()}`,
      ownerId: session.id,
      name: planName || 'Our Date',
      date: planDate,
      location,
      items: [...planItems],
      times: { ...times },
      estimatedTotal,
      createdAt: new Date().toISOString(),
    };
    setSavedPlans((current) => [plan, ...current]);
    setMessage('Date plan saved to your account.');
    window.setTimeout(() => setMessage(''), 2200);
  };

  return (
    <main className="date-plan-page">
      <section className="section-wrap plan-hero">
        <div className="plan-hero-copy"><span className="eyebrow"><CalendarDays size={15} /> Your date, your way</span><h1>Build a lovely day together.</h1><p>Add places, put them in order, choose times, then save or share the plan.</p></div>
        <div className="plan-header-card">
          <label><span>Plan name</span><input value={planName} onChange={(event) => setPlanName(event.target.value)} placeholder="Our date plan" /></label>
          <label><span>Date</span><input type="date" value={planDate} onChange={(event) => setPlanDate(event.target.value)} /></label>
        </div>
      </section>

      {plannedPlaces.length === 0 ? (
        <section className="section-wrap empty-plan-card"><div className="empty-plan-icon"><CalendarDays size={30} /></div><span className="mini-label">Your plan is empty</span><h2>Start with one place you both like.</h2><p>Explore Twonara and tap “Add to plan”.</p><button onClick={onExplore}>Explore date ideas <ChevronRight size={18} /></button></section>
      ) : (
        <section className="section-wrap plan-layout">
          <div className="plan-timeline">
            <div className="plan-section-heading"><div><span className="mini-label">Your stops</span><h2>{plannedPlaces.length} {plannedPlaces.length === 1 ? 'place' : 'places'} in this date</h2></div><button className="add-stop-button" onClick={onExplore}><Plus size={17} /> Add another stop</button></div>
            <div className="plan-stop-list">
              {plannedPlaces.map((place, index) => (
                <article className="plan-stop-card" key={place.id}>
                  <div className="timeline-number">{index + 1}</div>
                  <button className="plan-stop-image" onClick={() => onOpenPlace(place.id)}><img src={place.image} alt="" /></button>
                  <div className="plan-stop-main"><span className="plan-category">{place.category}</span><button className="plan-place-name" onClick={() => onOpenPlace(place.id)}>{place.name}</button><p>{place.note}</p><div className="plan-place-meta"><span><MapPin size={14} /> {place.address}</span><span><WalletCards size={14} /> Est. {formatCurrency(place.estimatedCost)}</span></div></div>
                  <div className="plan-stop-time"><label><Clock3 size={15} /> Time<input type="time" value={times[place.id] || ''} onChange={(event) => setTimes((current) => ({ ...current, [place.id]: event.target.value }))} /></label></div>
                  <div className="plan-stop-actions"><button onClick={() => moveStop(index, -1)} disabled={index === 0} aria-label="Move up"><ArrowUp size={17} /></button><button onClick={() => moveStop(index, 1)} disabled={index === plannedPlaces.length - 1} aria-label="Move down"><ArrowDown size={17} /></button><button className="remove-stop" onClick={() => removeStop(place.id)} aria-label="Remove"><Trash2 size={17} /></button></div>
                </article>
              ))}
            </div>
          </div>

          <aside className="plan-summary-card"><span className="mini-label">Plan summary</span><h2>{planName || 'Our Date'}</h2><p className="plan-summary-location"><MapPin size={15} /> {location}</p><div className="plan-summary-stats"><div><span>Stops</span><strong>{plannedPlaces.length}</strong></div><div><span>Approx. distance</span><strong>{totalDistance.toFixed(1)} km</strong></div><div className="budget-row"><span>Estimated total</span><strong>{formatCurrency(estimatedTotal)}</strong></div></div><p className="budget-note">Prices are estimates. Check final prices and venue rules before going.</p><button className="save-plan-button" onClick={savePlan}><Save size={18} /> Save plan</button><button className="share-plan-button" onClick={sharePlan}><Share2 size={18} /> Share date plan</button>{message && <div className="share-feedback">{message}</div>}<small className="saved-count">{session ? `${savedPlans.filter((item) => item.ownerId === session.id).length} saved plan(s) on this account` : 'Sign in to save plans'}</small></aside>
        </section>
      )}
    </main>
  );
}

export default PlannerFinal;
