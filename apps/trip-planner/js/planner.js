// Ranks the stations along each leg of a drive. Pure: no DOM, no network, no
// storage, so it runs under `node --test` and in the browser alike.
//
// A station ("place") arrives already normalized by a provider:
//   { id, name, address, lat, lng, rating, ratingCount, restroom, open24h,
//     fuelPrice, offsetSeconds, offsetMeters, detourSeconds, mapsUrl }
// rating/ratingCount/restroom/open24h/fuelPrice may be null when the source
// doesn't know. Crowd data (coworkers' bathroom ratings and "known for" finds)
// is passed in separately, keyed by place id.

import { brandOf } from './brands.js';

export const FACTORS = ['cashback', 'usual', 'bathroom', 'rating', 'safety', 'finds', 'price'];

export const FACTOR_LABELS = {
  cashback: 'Cash back',
  usual: 'Your usual brands',
  bathroom: 'Clean bathrooms',
  rating: 'Highly rated',
  safety: 'Feels safe',
  finds: 'Local finds',
  price: 'Cheap gas',
};

// Priority levels a driver picks per factor: Off / Normal / High.
export const PRIORITY_WEIGHTS = [0, 1, 2];

// favorites: places a driver goes to by habit, typed in or learned from an
// expense report: { key, label, query, kind: 'food' | 'fuel', count }.
// Food favorites are searched for along the route; fuel favorites boost that
// brand's stations through the 'usual' factor.
export const DEFAULT_PREFS = {
  priorities: { cashback: 2, usual: 1, bathroom: 2, rating: 1, safety: 1, finds: 1, price: 1 },
  upsideBrands: [],
  favorites: [],
  maxDetourMin: 6,
  breakEveryMin: 120,
};

export function foodFavorites(prefs, max = 3) {
  return (prefs.favorites ?? [])
    .filter((f) => f.kind === 'food')
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, max);
}

// A factor the source knows nothing about scores as a slightly-below-average
// station: unknown shouldn't outrank known-good, nor sink below known-bad.
const UNKNOWN = 0.4;

const clamp01 = (x) => Math.min(1, Math.max(0, x));

// Bayesian average: 4.9 from 7 reviews should not beat 4.6 from 1,200.
export function ratingScore(rating, count, { prior = 3.9, strength = 25 } = {}) {
  if (typeof rating !== 'number') return null;
  const n = Math.max(0, count ?? 0);
  const blended = (prior * strength + rating * n) / (strength + n);
  return clamp01((blended - 3) / 2);
}

export function crowdBathroom(ratings) {
  if (!ratings?.length) return null;
  const avg = ratings.reduce((s, r) => s + r.stars, 0) / ratings.length;
  return { avg: Math.round(avg * 10) / 10, count: ratings.length };
}

// Coworkers' star ratings beat the source's yes/no flag once there are any;
// with one or two ratings the flag still carries some of the weight.
export function bathroomScore(place, crowd) {
  const flag = place.restroom === true ? 0.6 : place.restroom === false ? 0 : null;
  if (crowd && crowd.count > 0) {
    const stars = (crowd.avg - 1) / 4;
    const trust = Math.min(1, crowd.count / 3);
    return clamp01(stars * trust + (flag ?? UNKNOWN) * (1 - trust));
  }
  return flag;
}

export function safetySignals(place, brand) {
  const signals = [];
  if (place.open24h === true) signals.push({ key: 'open24h', label: 'Open 24 hours', value: 0.35 });
  if (brand?.travelCenter) signals.push({ key: 'travelCenter', label: 'Travel center', value: 0.25 });
  if ((place.ratingCount ?? 0) >= 300) signals.push({ key: 'busy', label: 'Busy, well-reviewed', value: 0.2 });
  if ((place.rating ?? 0) >= 4.2) signals.push({ key: 'wellRated', label: 'Rated 4.2+', value: 0.2 });
  return signals;
}

export function findsScore(finds) {
  if (!finds?.length) return 0;
  return clamp01(0.6 + 0.2 * (finds.length - 1));
}

export function priceScore(price, range) {
  if (typeof price !== 'number' || !range) return null;
  if (range.max === range.min) return 1;
  return clamp01((range.max - price) / (range.max - range.min));
}

export function priceRange(places) {
  const prices = places.map((p) => p.fuelPrice).filter((p) => typeof p === 'number');
  if (!prices.length) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

// Scores one station 0..1 and says why, in the order the reasons mattered.
export function scorePlace(place, { prefs, crowd = {}, range = null }) {
  const brand = brandOf(place.name);
  const finds = crowd.finds?.[place.id] ?? [];
  const bath = crowdBathroom(crowd.bathrooms?.[place.id]);
  const safety = safetySignals(place, brand);

  const usual = brand ? (prefs.favorites ?? []).find((f) => f.kind === 'fuel' && f.key === brand.key) : null;
  const parts = {
    cashback: brand && prefs.upsideBrands.includes(brand.key) ? 1 : 0,
    usual: usual ? 1 : 0,
    bathroom: bathroomScore(place, bath),
    rating: ratingScore(place.rating, place.ratingCount),
    safety: clamp01(safety.reduce((s, x) => s + x.value, 0)),
    finds: findsScore(finds),
    price: priceScore(place.fuelPrice, range),
  };

  let weighted = 0;
  let totalWeight = 0;
  const contributions = [];
  for (const f of FACTORS) {
    const w = PRIORITY_WEIGHTS[prefs.priorities[f] ?? 0] ?? 0;
    if (!w) continue;
    const s = parts[f] ?? UNKNOWN;
    weighted += w * s;
    totalWeight += w;
    contributions.push({ factor: f, value: w * s, known: parts[f] !== null });
  }
  const base = totalWeight ? weighted / totalWeight : 0;

  const maxDetour = prefs.maxDetourMin * 60;
  const detour = Math.max(0, place.detourSeconds ?? 0);
  const penalty = maxDetour > 0 ? 0.25 * Math.min(1, detour / maxDetour) : 0;
  const score = clamp01(base - penalty);

  const reasonFor = {
    cashback: () => parts.cashback && `On your Upside list (${brand.label})`,
    usual: () => usual && (usual.count ? `Your usual (${usual.count} fill-ups in your expenses)` : 'Your usual brand'),
    bathroom: () =>
      bath
        ? `Bathroom ${bath.avg}/5 from ${bath.count} coworker${bath.count === 1 ? '' : 's'}`
        : place.restroom === true && 'Has a restroom',
    rating: () => typeof place.rating === 'number' && `★ ${place.rating.toFixed(1)} from ${formatCount(place.ratingCount ?? 0)} reviews`,
    safety: () => safety.length && safety.map((s) => s.label).slice(0, 2).join(' · '),
    finds: () => finds.length && `Known for: ${finds[0].text}`,
    price: () => parts.price === 1 && range && range.max > range.min && `Cheapest gas nearby ($${place.fuelPrice.toFixed(2)})`,
  };
  const reasons = contributions
    .filter((c) => c.known && c.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((c) => reasonFor[c.factor]())
    .filter(Boolean);

  return {
    ...place,
    brand,
    finds,
    bathroom: bath,
    safety,
    parts,
    score,
    detourMinutes: Math.round(detour / 60),
    reasons,
  };
}

export function formatCount(n) {
  return Number(n).toLocaleString('en-US');
}

// Picks where to stop on one leg. A short leg gets its best few stations; a long
// one gets a pick near each planned break ("about 2 h in"), plus any station a
// coworker flagged as worth the stop.
export function planLeg(leg, { prefs, crowd = {} }) {
  const maxDetour = prefs.maxDetourMin * 60;
  const inRange = leg.places.filter((p) => (p.detourSeconds ?? 0) <= maxDetour);
  const range = priceRange(inRange);
  const scored = inRange.map((p) => scorePlace(p, { prefs, crowd, range })).sort((a, b) => b.score - a.score);

  const breakEvery = prefs.breakEveryMin * 60;
  const windows = [];
  const used = new Set();
  const take = (candidates, n) => {
    const picks = [];
    for (const p of candidates) {
      if (picks.length >= n) break;
      if (used.has(p.id)) continue;
      used.add(p.id);
      picks.push(p);
    }
    return picks;
  };

  if (leg.durationSeconds <= breakEvery * 1.25) {
    const picks = take(scored, 3);
    if (picks.length) windows.push({ label: 'Best stops on this drive', centerSeconds: null, picks });
  } else {
    const halfWidth = Math.max(20 * 60, breakEvery * 0.3);
    // No break in the last 20 minutes: at that point you're nearly there.
    for (let c = breakEvery; c < leg.durationSeconds - 20 * 60; c += breakEvery) {
      const near = scored.filter((p) => Math.abs((p.offsetSeconds ?? 0) - c) <= halfWidth);
      const picks = take(near, 2);
      windows.push({ label: `About ${formatDuration(c)} in`, centerSeconds: c, picks });
    }
  }

  const worthIt = take(
    scored.filter((p) => p.finds.length),
    3,
  );
  const byPosition = [...scored].sort((a, b) => (a.offsetSeconds ?? 0) - (b.offsetSeconds ?? 0));
  return { ...leg, windows, worthIt, all: byPosition, skipped: leg.places.length - inRange.length };
}

// The best locations of each habit place on this leg ("the best Chipotles on my
// route"): rating first, then how far off the road it is.
export function planFavorites(leg, { prefs }) {
  const maxDetour = prefs.maxDetourMin * 60;
  const out = [];
  for (const fav of foodFavorites(prefs)) {
    const found = leg.favorites?.find((f) => f.key === fav.key)?.places ?? [];
    const picks = found
      .filter((p) => (p.detourSeconds ?? 0) <= maxDetour)
      .map((p) => {
        const r = ratingScore(p.rating, p.ratingCount) ?? UNKNOWN;
        const detour = Math.max(0, p.detourSeconds ?? 0);
        const score = clamp01(r - (maxDetour > 0 ? 0.25 * Math.min(1, detour / maxDetour) : 0));
        const reasons = [
          fav.count ? `Your usual: ${fav.count} visits in your expenses` : 'Your usual',
          typeof p.rating === 'number' && `★ ${p.rating.toFixed(1)} from ${formatCount(p.ratingCount ?? 0)} reviews`,
        ].filter(Boolean);
        return { ...p, favorite: fav, score, detourMinutes: Math.round(detour / 60), reasons, brand: null, finds: [], bathroom: null, safety: [] };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
    out.push({ favorite: fav, picks });
  }
  return out;
}

export function planTrip(plan, { prefs, crowd }) {
  return {
    ...plan,
    legs: plan.legs.map((leg) => ({ ...planLeg(leg, { prefs, crowd }), usual: planFavorites(leg, { prefs }) })),
  };
}

// ---------- formatting ----------

export function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function metersToMiles(meters) {
  return meters / 1609.344;
}

export function formatMiles(meters) {
  const mi = metersToMiles(meters);
  return `${mi < 10 ? mi.toFixed(1) : Math.round(mi).toLocaleString('en-US')} mi`;
}

// Opens Google Maps (app on a phone) with the stop as a waypoint. Google's Maps
// URLs take a place id alongside coordinates, which pins the exact station.
export function navUrl(from, to, place) {
  const q = new URLSearchParams({ api: '1', travelmode: 'driving' });
  q.set('origin', typeof from === 'string' ? from : `${from.lat},${from.lng}`);
  q.set('destination', typeof to === 'string' ? to : `${to.lat},${to.lng}`);
  if (place) {
    q.set('waypoints', `${place.lat},${place.lng}`);
    if (place.googlePlaceId) q.set('waypoint_place_ids', place.googlePlaceId);
  }
  return `https://www.google.com/maps/dir/?${q.toString()}`;
}

export function placeLabel(leg) {
  return `${leg.from.label} → ${leg.to.label}`;
}
