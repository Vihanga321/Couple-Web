import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, MapPin } from 'lucide-react';
import { DISTRICT_OPTIONS, normalizeDistrict } from '../data/sriLankaDistricts';
import { readStore } from '../lib/storage';
import '../location-dropdown.css';

function findLocationTarget() {
  const homeSearch = document.querySelector('.market-home .market-search-zone');
  if (homeSearch) return { element: homeSearch, mode: 'home' };

  const customerHeader = document.querySelector('.market-topbar');
  if (customerHeader) return { element: customerHeader, mode: 'global' };

  const portalHeader = document.querySelector('.portal-page .portal-head');
  if (portalHeader) return { element: portalHeader, mode: 'portal' };

  return null;
}

function coerceDistrict(value) {
  const normalized = normalizeDistrict(value);
  return DISTRICT_OPTIONS.includes(normalized) ? normalized : 'All Sri Lanka';
}

export default function HomeLocationDropdown() {
  const [target, setTarget] = useState(null);
  const [location, setLocation] = useState(() => coerceDistrict(readStore('twonara:location', 'Gampaha')));

  useEffect(() => {
    const refreshTarget = () => {
      const next = findLocationTarget();
      setTarget((current) => {
        if (current?.element === next?.element && current?.mode === next?.mode) return current;
        return next;
      });
    };

    refreshTarget();
    const observer = new MutationObserver(refreshTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stored = readStore('twonara:location', 'Gampaha');
    const district = coerceDistrict(stored);
    if (stored !== district) {
      window.dispatchEvent(new CustomEvent('twonara:persistent-state', {
        detail: { key: 'twonara:location', value: district },
      }));
    }
  }, []);

  useEffect(() => {
    const syncLocation = (event) => {
      if (event.detail?.key === 'twonara:location') setLocation(coerceDistrict(event.detail.value));
    };
    window.addEventListener('twonara:persistent-state', syncLocation);
    return () => window.removeEventListener('twonara:persistent-state', syncLocation);
  }, []);

  const changeLocation = (event) => {
    const nextDistrict = event.target.value;
    setLocation(nextDistrict);
    window.dispatchEvent(new CustomEvent('twonara:persistent-state', {
      detail: { key: 'twonara:location', value: nextDistrict },
    }));
  };

  if (!target?.element) return null;

  const label = target.mode === 'portal' ? 'Customer district' : 'District';

  return createPortal(
    <div className={`home-location-dropdown location-mode-${target.mode}`}>
      <div className="home-location-dropdown-label">
        <MapPin size={15} />
        <span>{label}</span>
      </div>
      <div className="home-location-select-wrap">
        <select value={location} onChange={changeLocation} aria-label="Choose a district in Sri Lanka">
          {DISTRICT_OPTIONS.map((district) => <option value={district} key={district}>{district}</option>)}
        </select>
        <ChevronDown size={17} aria-hidden="true" />
      </div>
    </div>,
    target.element,
  );
}
