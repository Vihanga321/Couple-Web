import { useEffect, useState } from 'react';
import { normalizeDistrict } from '../data/sriLankaDistricts';

export function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    const value = raw ? JSON.parse(raw) : fallback;
    return key === 'twonara:location' ? normalizeDistrict(value) : value;
  } catch {
    return key === 'twonara:location' ? normalizeDistrict(fallback) : fallback;
  }
}

export function writeStore(key, value) {
  try {
    const nextValue = key === 'twonara:location' ? normalizeDistrict(value) : value;
    localStorage.setItem(key, JSON.stringify(nextValue));
  } catch {
    // Ignore storage failures (private mode / blocked storage).
  }
}

export function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => readStore(key, initialValue));

  useEffect(() => {
    writeStore(key, value);
  }, [key, value]);

  useEffect(() => {
    const syncValue = (event) => {
      if (event.detail?.key === key) {
        setValue(key === 'twonara:location' ? normalizeDistrict(event.detail.value) : event.detail.value);
      }
    };
    window.addEventListener('twonara:persistent-state', syncValue);
    return () => window.removeEventListener('twonara:persistent-state', syncValue);
  }, [key]);

  return [value, setValue];
}

export function resetTwonaraDemo() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith('twonara:'))
    .forEach((key) => localStorage.removeItem(key));
}
