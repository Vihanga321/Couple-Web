import { useEffect, useState } from 'react';

export function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
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
      if (event.detail?.key === key) setValue(event.detail.value);
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
