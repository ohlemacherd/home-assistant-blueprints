import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { buildPlan, gasPagesFor } from '../worker/src/index.js';
import { isOpen24h, normalizePlaces, normalizeRoute, regularFuelPrice, seconds, validatePlanRequest } from '../worker/src/normalize.js';

// Response shapes follow the Routes API computeRoutes and Places API (New)
// searchText documentation; values are made up.
const ROUTE = {
  routes: [
    {
      legs: [
        {
          distanceMeters: 402000,
          duration: '13800s',
          polyline: { encodedPolyline: 'abc' },
          startLocation: { latLng: { latitude: 41.5, longitude: -81.69 } },
          endLocation: { latLng: { latitude: 39.08, longitude: -84.51 } },
        },
      ],
    },
  ],
};

const gasPage = (ids, nextPageToken) => ({
  places: ids.map((id, i) => ({
    id,
    displayName: { text: `Station ${id}` },
    formattedAddress: `${i} Main St`,
    location: { latitude: 40 + i / 10, longitude: -82 },
    rating: 4.2,
    userRatingCount: 321,
    restroom: true,
    regularOpeningHours: { periods: [{ open: { day: 0, hour: 0, minute: 0 } }] },
    fuelOptions: {
      fuelPrices: [
        { type: 'DIESEL', price: { currencyCode: 'USD', units: '3', nanos: 890000000 } },
        { type: 'REGULAR_UNLEADED', price: { currencyCode: 'USD', units: '3', nanos: 99000000 }, updateTime: '2026-09-24T10:00:00Z' },
      ],
    },
    googleMapsUri: `https://maps.google.com/?cid=${id}`,
  })),
  routingSummaries: ids.map((_, i) => ({
    legs: [
      { duration: `${3600 * (i + 1)}s`, distanceMeters: 100000 * (i + 1) },
      { duration: `${13800 - 3600 * (i + 1) + 120}s`, distanceMeters: 300000 },
    ],
  })),
  ...(nextPageToken ? { nextPageToken } : {}),
});

test('seconds parses protobuf durations', () => {
  assert.equal(seconds('5400s'), 5400);
  assert.equal(seconds('12.6s'), 13);
  assert.equal(seconds(42), 42);
  assert.equal(seconds('soon'), null);
  assert.equal(seconds(undefined), null);
});

test('validatePlanRequest trims, bounds and rejects', () => {
  assert.deepEqual(validatePlanRequest({ waypoints: [' Cleveland, OH ', 'Covington, KY'] }).value, {
    waypoints: ['Cleveland, OH', 'Covington, KY'],
    favorites: [],
  });
  assert.ok(validatePlanRequest({ waypoints: ['Cleveland'] }).error);
  assert.ok(validatePlanRequest({ waypoints: ['A1', 'B2', 'C3', 'D4', 'E5', 'F6'] }).error);
  assert.ok(validatePlanRequest({ waypoints: ['Cleveland', 'x'] }).error);
  assert.ok(validatePlanRequest({ waypoints: ['Cleveland', 42] }).error);
  assert.ok(validatePlanRequest({ waypoints: ['Cleveland', 'Dayton'], favorites: [{}, {}, {}, {}] }).error);
  assert.ok(validatePlanRequest({ waypoints: ['Cleveland', 'Dayton'], favorites: [{ key: 'c', query: '' }] }).error);
  assert.ok(validatePlanRequest(null).error);
});

test('normalizeRoute labels legs with the typed places and refuses a mismatched leg count', () => {
  const legs = normalizeRoute(ROUTE, ['Cleveland, OH', 'Covington, KY']);
  assert.deepEqual(legs[0].from, { label: 'Cleveland, OH', lat: 41.5, lng: -81.69 });
  assert.equal(legs[0].durationSeconds, 13800);
  assert.equal(legs[0].polyline, 'abc');
  assert.equal(normalizeRoute(ROUTE, ['A', 'B', 'C']), null);
  assert.equal(normalizeRoute({}, ['A', 'B']), null);
});

test('isOpen24h reads both the period form and the text form', () => {
  assert.equal(isOpen24h({ periods: [{ open: { day: 0, hour: 0, minute: 0 } }] }), true);
  assert.equal(isOpen24h({ weekdayDescriptions: Array(7).fill('Monday: Open 24 hours') }), true);
  assert.equal(isOpen24h({ periods: [{ open: { day: 1, hour: 6 }, close: { day: 1, hour: 22 } }], weekdayDescriptions: ['Monday: 6 AM – 10 PM'] }), false);
  assert.equal(isOpen24h(undefined), null);
});

test('regularFuelPrice picks regular unleaded in USD', () => {
  assert.deepEqual(regularFuelPrice(gasPage(['a']).places[0].fuelOptions), { price: 3.099, updated: '2026-09-24T10:00:00Z' });
  assert.equal(regularFuelPrice({ fuelPrices: [{ type: 'DIESEL', price: { currencyCode: 'USD', units: '4' } }] }), null);
  assert.equal(regularFuelPrice({ fuelPrices: [{ type: 'REGULAR_UNLEADED', price: { currencyCode: 'CAD', units: '1' } }] }), null);
  assert.equal(regularFuelPrice(undefined), null);
});

test('normalizePlaces computes offset and detour from the routing summaries', () => {
  const [p] = normalizePlaces(gasPage(['a']), 13800);
  assert.equal(p.id, 'a');
  assert.equal(p.googlePlaceId, 'a');
  assert.equal(p.name, 'Station a');
  assert.equal(p.offsetSeconds, 3600);
  assert.equal(p.offsetMeters, 100000);
  assert.equal(p.detourSeconds, 120);
  assert.equal(p.restroom, true);
  assert.equal(p.open24h, true);
  assert.equal(p.fuelPrice, 3.099);
  const [bare] = normalizePlaces({ places: [{ id: 'z', displayName: { text: 'Z' } }] }, 100);
  assert.equal(bare.detourSeconds, null);
  assert.equal(bare.restroom, null);
  assert.equal(bare.rating, null);
});

test('gasPagesFor: one page on short legs, capped pages on long ones', () => {
  assert.equal(gasPagesFor({ durationSeconds: 3600 }, { MAX_GAS_PAGES: '2' }), 1);
  assert.equal(gasPagesFor({ durationSeconds: 4 * 3600 }, { MAX_GAS_PAGES: '2' }), 2);
  assert.equal(gasPagesFor({ durationSeconds: 4 * 3600 }, { MAX_GAS_PAGES: '9' }), 3);
  assert.equal(gasPagesFor({ durationSeconds: 4 * 3600 }, {}), 2);
});

function mockGoogle({ failPlaces } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body, headers: init.headers });
    if (url.includes('computeRoutes')) return Response.json(ROUTE);
    if (failPlaces) return new Response('{}', { status: failPlaces });
    if (body.includedType === 'gas_station') {
      return Response.json(body.pageToken ? gasPage(['b', 'c']) : gasPage(['a', 'b'], 'next-1'));
    }
    return Response.json({ places: [{ id: 'chip1', displayName: { text: 'Chipotle' }, rating: 4.5, userRatingCount: 700 }], routingSummaries: [{ legs: [{ duration: '5000s' }, { duration: '8900s' }] }] });
  };
  return { calls, fetchImpl };
}

test('buildPlan: route, two pages of gas along the leg (deduped), and one search per favorite', async () => {
  const { calls, fetchImpl } = mockGoogle();
  const plan = await buildPlan(
    { waypoints: ['Cleveland, OH', 'Covington, KY'], favorites: [{ key: 'chipotle', query: 'Chipotle' }] },
    { GOOGLE_MAPS_API_KEY: 'k', MAX_GAS_PAGES: '2' },
    fetchImpl,
  );
  assert.equal(plan.provider, 'google');
  assert.equal(plan.legs.length, 1);
  const leg = plan.legs[0];
  assert.equal(leg.polyline, undefined, 'polyline stays server-side');
  assert.deepEqual(leg.places.map((p) => p.id), ['a', 'b', 'c']);
  assert.deepEqual(leg.favorites, [{ key: 'chipotle', places: [{ ...leg.favorites[0].places[0] }] }]);
  assert.equal(leg.favorites[0].places[0].detourSeconds, 100);

  const route = calls.find((c) => c.url.includes('computeRoutes'));
  assert.equal(route.headers['X-Goog-Api-Key'], 'k');
  assert.deepEqual(route.body.origin, { address: 'Cleveland, OH' });
  assert.deepEqual(route.body.intermediates, []);

  const gas = calls.filter((c) => c.body.includedType === 'gas_station');
  assert.equal(gas.length, 2);
  assert.equal(gas[0].body.searchAlongRouteParameters.polyline.encodedPolyline, 'abc');
  assert.deepEqual(gas[0].body.routingParameters.origin, { latitude: 41.5, longitude: -81.69 });
  assert.equal(gas[1].body.pageToken, 'next-1');
  assert.match(gas[0].headers['X-Goog-FieldMask'], /places\.restroom/);

  const fav = calls.find((c) => c.body.textQuery === 'Chipotle');
  assert.doesNotMatch(fav.headers['X-Goog-FieldMask'], /restroom|fuelOptions/, 'restaurants skip the Atmosphere-tier fields');
});

const req = (body, { origin = 'https://app.example', method = 'POST', path = '/api/plan' } = {}) =>
  new Request(`https://api.example${path}`, {
    method,
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });

const env = { GOOGLE_MAPS_API_KEY: 'k', ALLOWED_ORIGINS: 'https://app.example, http://localhost:8080' };

test('handler: CORS allowlist, preflight, validation, and Google errors surface as plain messages', async () => {
  const ok = mockGoogle();
  const res = await worker.fetch(req({ waypoints: ['Cleveland, OH', 'Covington, KY'] }), env, {}, ok.fetchImpl);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://app.example');
  assert.equal((await res.json()).legs.length, 1);

  const pre = await worker.fetch(req(null, { method: 'OPTIONS' }), env, {}, ok.fetchImpl);
  assert.equal(pre.status, 204);

  const stranger = await worker.fetch(req({ waypoints: ['A1', 'B2'] }, { origin: 'https://evil.example' }), env, {}, ok.fetchImpl);
  assert.equal(stranger.status, 403);
  assert.equal(stranger.headers.get('Access-Control-Allow-Origin'), null);

  const bad = await worker.fetch(req({ waypoints: ['only one'] }), env, {}, ok.fetchImpl);
  assert.equal(bad.status, 400);

  const noKey = await worker.fetch(req({ waypoints: ['A1', 'B2'] }), { ...env, GOOGLE_MAPS_API_KEY: '' }, {}, ok.fetchImpl);
  assert.equal(noKey.status, 500);

  const denied = mockGoogle({ failPlaces: 403 });
  const res403 = await worker.fetch(req({ waypoints: ['Cleveland, OH', 'Covington, KY'] }), env, {}, denied.fetchImpl);
  assert.equal(res403.status, 502);
  assert.match((await res403.json()).error, /billing/);

  const limited = { ...env, RATE_LIMITER: { limit: async () => ({ success: false }) } };
  const res429 = await worker.fetch(req({ waypoints: ['A1', 'B2'] }), limited, {}, ok.fetchImpl);
  assert.equal(res429.status, 429);

  const notFound = await worker.fetch(req({}, { path: '/other' }), env, {}, ok.fetchImpl);
  assert.equal(notFound.status, 404);
});
