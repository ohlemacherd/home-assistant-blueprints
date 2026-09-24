// Everything the app keeps lives in this browser's localStorage: small JSON,
// no server. Reads never throw (private windows and blocked storage fall back
// to defaults); writes report failure so the UI can say so.

import { UPSIDE_DEFAULT_BRANDS } from './brands.js';
import { DEFAULT_PREFS } from './planner.js';

const KEYS = { prefs: 'tp.prefs', settings: 'tp.settings', crowd: 'tp.crowd', trips: 'tp.trips' };
const MAX_TRIPS = 12;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getPrefs() {
  const saved = read(KEYS.prefs, null);
  const base = { ...DEFAULT_PREFS, upsideBrands: [...UPSIDE_DEFAULT_BRANDS] };
  if (!saved) return base;
  return { ...base, ...saved, priorities: { ...DEFAULT_PREFS.priorities, ...(saved.priorities ?? {}) } };
}

export const savePrefs = (prefs) => write(KEYS.prefs, prefs);

export function getSettings() {
  return { provider: 'demo', apiBase: '', ...read(KEYS.settings, {}) };
}

export const saveSettings = (s) => write(KEYS.settings, s);

export function getCrowd() {
  const c = read(KEYS.crowd, {});
  return { finds: c.finds ?? {}, bathrooms: c.bathrooms ?? {} };
}

export const saveCrowd = (c) => write(KEYS.crowd, c);

export function getTrips() {
  const t = read(KEYS.trips, []);
  return Array.isArray(t) ? t : [];
}

export function saveTrip(trip) {
  const rest = getTrips().filter((t) => t.id !== trip.id);
  return write(KEYS.trips, [trip, ...rest].slice(0, MAX_TRIPS));
}

export function deleteTrip(id) {
  return write(KEYS.trips, getTrips().filter((t) => t.id !== id));
}

export function clear(which) {
  try {
    localStorage.removeItem(KEYS[which]);
    return true;
  } catch {
    return false;
  }
}

// Sample-mode notes are layered over the driver's own, never saved with them.
export function mergeCrowd(a, b) {
  const merge = (x, y) => {
    const out = { ...x };
    for (const [k, v] of Object.entries(y)) out[k] = [...(out[k] ?? []), ...v];
    return out;
  };
  return { finds: merge(a.finds, b.finds), bathrooms: merge(a.bathrooms, b.bathrooms) };
}
