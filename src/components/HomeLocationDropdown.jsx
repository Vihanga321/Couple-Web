import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, MapPin } from 'lucide-react';
import { readStore } from '../lib/storage';
import '../location-dropdown.css';

const MAIN_LOCATIONS = [
  'All Sri Lanka',
  'Colombo',
  'Negombo',
  'Gampaha',
  'Kalutara',
  'Kandy',
  'Nuwara Eliya',
  'Galle',
  'Matara',
  'Hambantota',
  'Kurunegala',
  'Anuradhapura',
  'Polonnaruwa',
  'Jaffna',
  'Trincomalee',
  'Batticaloa',
  'Badulla',
  'Ella',
  'Ratnapura',
];

export default function HomeLocationDropdown() {
  const [target, setTarget] = useState(null);
  const [location, setLocation] = useState(() => readStore('twonara:location', 'Negombo'));

  useEffect(() => {
    const refreshTarget = () => {
      setTarget(document.querySelector('.market-home .market-search-zone'));
    };

    refreshTarget();
    const observer = new MutationObserver(refreshTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const syncLocation = (event) => {
      if (event.detail?.key === 'twonara:location') setLocation(event.detail.value);
    };
    window.addEventListener('twonara:persistent-state', syncLocation);
    return () => window.removeEventListener('twonara:persistent-state', syncLocation);
  }, []);

  const options = useMemo(() => {
    if (!location || MAIN_LOCATIONS.includes(location)) return MAIN_LOCATIONS;
    return [location, ...MAIN_LOCATIONS];
  }, [location]);

  const changeLocation = (event) => {
    const nextLocation = event.target.value;
    setLocation(nextLocation);
    window.dispatchEvent(new CustomEvent('twonara:persistent-state', {
      detail: { key: 'twonara:location', value: nextLocation },
    }));
  };

  if (!target) return null;

  return createPortal(
    <div className="home-location-dropdown">
      <div className="home-location-dropdown-label">
        <MapPin size={15} />
        <span>Location</span>
      </div>
      <div className="home-location-select-wrap">
        <select value={location} onChange={changeLocation} aria-label="Choose a main location in Sri Lanka">
          {options.map((item) => <option value={item} key={item}>{item}</option>)}
        </select>
        <ChevronDown size={17} aria-hidden="true" />
      </div>
    </div>,
    target,
  );
}
