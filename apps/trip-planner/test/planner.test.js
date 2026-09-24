import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brandOf, UPSIDE_DEFAULT_BRANDS, BRANDS } from '../js/brands.js';
import {
  DEFAULT_PREFS,
  bathroomScore,
  crowdBathroom,
  formatDuration,
  formatMiles,
  navUrl,
  planFavorites,
  planLeg,
  priceScore,
  ratingScore,
  safetySignals,
  scorePlace,
} from '../js/planner.js';

const prefs = { ...DEFAULT_PREFS, upsideBrands: [...UPSIDE_DEFAULT_BRANDS] };

const place = (over = {}) => ({
  id: over.id ?? 'p',
  name: 'Independent Fuel',
  rating: null,
  ratingCount: null,
  restroom: null,
  open24h: null,
  fuelPrice: null,
  offsetSeconds: 3600,
  detourSeconds: 60,
  lat: 40,
  lng: -82,
  ...over,
});

test('brandOf reads brands from display names, specific before general', () => {
  assert.equal(brandOf('Speedway')?.key, 'speedway');
  assert.equal(brandOf("Love's Travel Stop")?.key, 'loves');
  assert.equal(brandOf("Love's Travel Stop")?.travelCenter, true);
  assert.equal(brandOf('Pilot Travel Center')?.key, 'pilot');
  assert.equal(brandOf('Flying J Travel Center')?.key, 'flying-j');
  assert.equal(brandOf('TA Express')?.key, 'ta');
  assert.equal(brandOf('Circle K')?.key, 'circle-k');
  assert.equal(brandOf("Casey's")?.key, 'caseys');
  assert.equal(brandOf('BP#1234')?.key, 'bp');
  assert.equal(brandOf('SHELL OIL 57444')?.key, 'shell');
  assert.equal(brandOf('GetGo Café + Market')?.key, 'getgo');
  assert.equal(brandOf('Sheetz')?.travelCenter, false);
  assert.equal(brandOf('Joe’s Gas & Go'), null);
  assert.equal(brandOf('Seashell Diner'), null); // word boundary, not substring
});

test('every default Upside brand exists in the brand table', () => {
  const keys = new Set(BRANDS.map((b) => b.key));
  for (const k of UPSIDE_DEFAULT_BRANDS) assert.ok(keys.has(k), k);
});

test('ratingScore shrinks thin ratings toward the prior', () => {
  const thin = ratingScore(4.9, 7);
  const deep = ratingScore(4.6, 1200);
  assert.ok(deep > thin, `4.6 x1200 (${deep}) should beat 4.9 x7 (${thin})`);
  assert.equal(ratingScore(null, 100), null);
  assert.equal(ratingScore(2.0, 5000), 0);
  assert.ok(ratingScore(5, 100000) > 0.99);
});

test('bathroom: coworker stars outweigh the yes/no flag as they accumulate', () => {
  assert.equal(bathroomScore(place({ restroom: true }), null), 0.6);
  assert.equal(bathroomScore(place({ restroom: false }), null), 0);
  assert.equal(bathroomScore(place(), null), null);
  const one = bathroomScore(place({ restroom: true }), crowdBathroom([{ stars: 5 }]));
  const three = bathroomScore(place({ restroom: true }), crowdBathroom([{ stars: 5 }, { stars: 5 }, { stars: 5 }]));
  assert.ok(one > 0.6 && one < 1);
  assert.equal(three, 1);
  const bad = bathroomScore(place({ restroom: true }), crowdBathroom([{ stars: 1 }, { stars: 1 }, { stars: 2 }]));
  assert.ok(bad < 0.2);
  assert.deepEqual(crowdBathroom([{ stars: 4 }, { stars: 5 }]), { avg: 4.5, count: 2 });
});

test('safety signals are named, not a bare number', () => {
  const s = safetySignals(place({ open24h: true, rating: 4.5, ratingCount: 900 }), brandOf("Love's"));
  assert.deepEqual(s.map((x) => x.key), ['open24h', 'travelCenter', 'busy', 'wellRated']);
  assert.deepEqual(safetySignals(place(), null), []);
});

test('priceScore is relative to the stations on the same leg', () => {
  assert.equal(priceScore(3.09, { min: 3.09, max: 3.49 }), 1);
  assert.equal(priceScore(3.49, { min: 3.09, max: 3.49 }), 0);
  assert.equal(priceScore(3.29, { min: 3.29, max: 3.29 }), 1);
  assert.equal(priceScore(null, { min: 3, max: 4 }), null);
});

test('scorePlace: Upside brand with a good bathroom beats an unknown independent', () => {
  const shell = scorePlace(place({ id: 'a', name: 'Shell', rating: 4.3, ratingCount: 400, restroom: true }), { prefs });
  const indie = scorePlace(place({ id: 'b', name: 'Corner Fuel', rating: 4.3, ratingCount: 400, restroom: true }), { prefs });
  assert.ok(shell.score > indie.score);
  assert.equal(shell.reasons[0], 'On your Upside list (Shell)');
});

test('scorePlace: turning a factor off removes its influence and its reason', () => {
  const p = place({ name: 'Shell', rating: 4.3, ratingCount: 400 });
  const off = { ...prefs, priorities: { ...prefs.priorities, cashback: 0 } };
  const s = scorePlace(p, { prefs: off });
  assert.ok(!s.reasons.some((r) => r.includes('Upside')));
  assert.equal(scorePlace(place({ name: 'Corner Fuel', rating: 4.3, ratingCount: 400 }), { prefs: off }).score, s.score);
});

test('scorePlace: usual brand from expenses, coworker finds and bathroom ratings show up as reasons', () => {
  const withHabit = { ...prefs, favorites: [{ key: 'speedway', label: 'Speedway', kind: 'fuel', count: 14 }] };
  const crowd = {
    finds: { s1: [{ text: 'pepperoni rolls' }] },
    bathrooms: { s1: [{ stars: 5 }, { stars: 4 }] },
  };
  const s = scorePlace(place({ id: 's1', name: 'Speedway', restroom: true }), { prefs: withHabit, crowd });
  assert.ok(s.reasons.includes('Your usual (14 fill-ups in your expenses)'));
  assert.ok(s.reasons.includes('Known for: pepperoni rolls'));
  assert.ok(s.reasons.includes('Bathroom 4.5/5 from 2 coworkers'));
});

test('scorePlace: detour costs up to a quarter point', () => {
  const near = scorePlace(place({ name: 'Shell', detourSeconds: 0 }), { prefs });
  const far = scorePlace(place({ name: 'Shell', detourSeconds: prefs.maxDetourMin * 60 }), { prefs });
  assert.ok(Math.abs(near.score - far.score - 0.25) < 1e-9);
});

const hour = 3600;

test('planLeg: short drive gets its best three stations', () => {
  const leg = {
    durationSeconds: 1.5 * hour,
    places: [
      place({ id: 'a', name: 'Shell', rating: 4.5, ratingCount: 500, restroom: true }),
      place({ id: 'b', name: 'Corner Fuel' }),
      place({ id: 'c', name: 'Marathon', rating: 4.0, ratingCount: 100 }),
      place({ id: 'd', name: 'Sunoco', rating: 3.2, ratingCount: 300 }),
    ],
  };
  const out = planLeg(leg, { prefs });
  assert.equal(out.windows.length, 1);
  assert.equal(out.windows[0].picks.length, 3);
  assert.equal(out.windows[0].picks[0].id, 'a');
});

test('planLeg: long drive gets a pick near each break, never repeats a station, drops long detours', () => {
  const leg = {
    durationSeconds: 5 * hour,
    places: [
      place({ id: 'early', name: 'Shell', offsetSeconds: 0.5 * hour, rating: 4.8, ratingCount: 2000 }),
      place({ id: 'b1', name: 'Marathon', offsetSeconds: 2 * hour, rating: 4.4, ratingCount: 600, restroom: true }),
      place({ id: 'b1alt', name: 'Corner Fuel', offsetSeconds: 2.2 * hour }),
      place({ id: 'b2', name: 'Circle K', offsetSeconds: 4 * hour, rating: 4.1, ratingCount: 300 }),
      place({ id: 'far', name: 'Shell', offsetSeconds: 4 * hour, rating: 5, ratingCount: 5000, detourSeconds: 20 * 60 }),
    ],
  };
  const out = planLeg(leg, { prefs });
  assert.deepEqual(out.windows.map((w) => w.label), ['About 2 h in', 'About 4 h in']);
  assert.deepEqual(out.windows[0].picks.map((p) => p.id), ['b1', 'b1alt']);
  assert.deepEqual(out.windows[1].picks.map((p) => p.id), ['b2']);
  assert.equal(out.skipped, 1);
  assert.deepEqual(out.all.map((p) => p.id), ['early', 'b1', 'b1alt', 'b2']);
});

test('planLeg: a station with a coworker find is surfaced even outside the break windows', () => {
  const leg = {
    durationSeconds: 5 * hour,
    places: [
      place({ id: 'b1', name: 'Marathon', offsetSeconds: 2 * hour }),
      place({ id: 'fun', name: 'Corner Fuel', offsetSeconds: 3 * hour }),
    ],
  };
  const out = planLeg(leg, { prefs, crowd: { finds: { fun: [{ text: 'bourbon balls' }] } } });
  assert.deepEqual(out.worthIt.map((p) => p.id), ['fun']);
});

test('planFavorites: best-rated Chipotle within the detour limit, top two', () => {
  const withFav = { ...prefs, favorites: [{ key: 'chipotle', label: 'Chipotle', query: 'Chipotle', kind: 'food', count: 23 }] };
  const leg = {
    durationSeconds: 3 * hour,
    places: [],
    favorites: [
      {
        key: 'chipotle',
        places: [
          place({ id: 'c1', name: 'Chipotle', rating: 4.0, ratingCount: 300, detourSeconds: 120 }),
          place({ id: 'c2', name: 'Chipotle', rating: 4.6, ratingCount: 800, detourSeconds: 180 }),
          place({ id: 'c3', name: 'Chipotle', rating: 4.9, ratingCount: 900, detourSeconds: 30 * 60 }),
          place({ id: 'c4', name: 'Chipotle', rating: 3.1, ratingCount: 50, detourSeconds: 60 }),
        ],
      },
    ],
  };
  const [row] = planFavorites(leg, { prefs: withFav });
  assert.equal(row.favorite.key, 'chipotle');
  assert.deepEqual(row.picks.map((p) => p.id), ['c2', 'c1']);
  assert.equal(row.picks[0].reasons[0], 'Your usual: 23 visits in your expenses');
});

test('formatting helpers', () => {
  assert.equal(formatDuration(45 * 60), '45 min');
  assert.equal(formatDuration(2 * hour), '2 h');
  assert.equal(formatDuration(3 * hour + 50 * 60), '3 h 50 min');
  assert.equal(formatMiles(402336), '250 mi');
  assert.equal(formatMiles(8046.72), '5.0 mi');
});

test('navUrl puts the stop in as a waypoint and pins the Google place when known', () => {
  const url = new URL(navUrl('Cleveland, OH', 'Covington, KY', { lat: 40.1, lng: -82.9, googlePlaceId: 'ChIJabc' }));
  assert.equal(url.origin + url.pathname, 'https://www.google.com/maps/dir/');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.get('origin'), 'Cleveland, OH');
  assert.equal(url.searchParams.get('destination'), 'Covington, KY');
  assert.equal(url.searchParams.get('waypoints'), '40.1,-82.9');
  assert.equal(url.searchParams.get('waypoint_place_ids'), 'ChIJabc');
  assert.equal(new URL(navUrl({ lat: 1, lng: 2 }, 'X', null)).searchParams.get('waypoints'), null);
});
