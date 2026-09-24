// Cloudflare Worker: the only thing that holds the Google key. The app POSTs
// { waypoints, favorites } to /api/plan; this computes the drive with the Routes
// API, then asks Places (New) for gas stations - and each favorite chain - along
// every leg, and returns the normalized result.
//
// Privacy: waypoints are often client sites. They are forwarded to Google and
// nowhere else - not logged, not cached, not stored.

import { dedupe, normalizePlaces, normalizeRoute, validatePlanRequest } from './normalize.js';

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';

const ROUTE_FIELDS = [
  'routes.legs.distanceMeters',
  'routes.legs.duration',
  'routes.legs.polyline.encodedPolyline',
  'routes.legs.startLocation',
  'routes.legs.endLocation',
].join(',');

// Every field is billed at the highest SKU in the mask. restroom and fuelOptions
// put gas searches in Text Search Enterprise + Atmosphere; favorites (restaurants)
// skip them and bill one tier lower.
const GAS_FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.regularOpeningHours',
  'places.googleMapsUri',
  'places.restroom',
  'places.fuelOptions',
  'routingSummaries',
  'nextPageToken',
].join(',');

const FAVORITE_FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.regularOpeningHours',
  'places.googleMapsUri',
  'routingSummaries',
].join(',');

class PublicError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

async function google(fetchImpl, url, fieldMask, body, key) {
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': fieldMask },
    body: JSON.stringify(body),
  });
  if (res.ok) return res.json();
  if (res.status === 403) throw new PublicError('Google refused the key. Check the Routes and Places APIs are enabled and billing is on.');
  if (res.status === 429) throw new PublicError('Google quota reached. Try again later.', 503);
  if (res.status === 400) throw new PublicError('Google could not work with one of those places. Try a fuller address.', 400);
  throw new PublicError('Google did not answer. Try again.');
}

// Long legs get a second page of stations so the far end isn't empty; each
// page is a billed call, so it is capped by MAX_GAS_PAGES.
export function gasPagesFor(leg, env) {
  const cap = Math.max(1, Math.min(3, Number(env.MAX_GAS_PAGES ?? 2) || 1));
  return leg.durationSeconds > 2.5 * 3600 ? cap : 1;
}

async function searchAlong(fetchImpl, key, leg, { textQuery, includedType, fields, pages, pageSize }) {
  const base = {
    textQuery,
    pageSize,
    searchAlongRouteParameters: { polyline: { encodedPolyline: leg.polyline } },
    routingParameters: { origin: { latitude: leg.from.lat, longitude: leg.from.lng }, travelMode: 'DRIVE' },
  };
  if (includedType) Object.assign(base, { includedType, strictTypeFiltering: true });
  const out = [];
  let pageToken;
  for (let i = 0; i < pages; i++) {
    const json = await google(fetchImpl, PLACES_URL, fields, pageToken ? { ...base, pageToken } : base, key);
    out.push(...normalizePlaces(json, leg.durationSeconds));
    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }
  return dedupe(out);
}

export async function buildPlan({ waypoints, favorites }, env, fetchImpl = fetch) {
  const key = env.GOOGLE_MAPS_API_KEY;
  const route = await google(
    fetchImpl,
    ROUTES_URL,
    ROUTE_FIELDS,
    {
      origin: { address: waypoints[0] },
      destination: { address: waypoints.at(-1) },
      intermediates: waypoints.slice(1, -1).map((address) => ({ address })),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE',
      polylineQuality: 'OVERVIEW',
    },
    key,
  );
  const legs = normalizeRoute(route, waypoints);
  if (!legs) throw new PublicError('No driving route between those places.', 404);

  const planned = await Promise.all(
    legs.map(async (leg) => {
      if (!leg.polyline || leg.from.lat === null) return { ...leg, places: [], favorites: [] };
      const [places, ...favs] = await Promise.all([
        searchAlong(fetchImpl, key, leg, {
          textQuery: 'gas station',
          includedType: 'gas_station',
          fields: GAS_FIELDS,
          pages: gasPagesFor(leg, env),
          pageSize: 20,
        }),
        ...favorites.map((f) =>
          searchAlong(fetchImpl, key, leg, { textQuery: f.query, fields: FAVORITE_FIELDS, pages: 1, pageSize: 10 }).then(
            (found) => ({ key: f.key, places: found }),
          ),
        ),
      ]);
      const { polyline, ...rest } = leg;
      return { ...rest, places, favorites: favs };
    }),
  );
  return { provider: 'google', generatedAt: new Date().toISOString(), legs: planned };
}

function allowedOrigin(origin, env) {
  if (!origin) return null;
  const list = String(env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(origin) ? origin : null;
}

function json(data, status, origin) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin' };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers });
}

export default {
  async fetch(request, env, _ctx, fetchImpl = fetch) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request.headers.get('Origin'), env);
    if (url.pathname !== '/api/plan') return json({ error: 'Not found' }, 404, origin);
    if (request.method === 'OPTIONS') return json(null, origin ? 204 : 403, origin);
    if (request.method !== 'POST') return json({ error: 'Use POST' }, 405, origin);
    if (!origin) return json({ error: 'This app is not allowed to use this server' }, 403, null);
    if (!env.GOOGLE_MAPS_API_KEY) return json({ error: 'The server has no Google key yet' }, 500, origin);

    if (env.RATE_LIMITER) {
      const { success } = await env.RATE_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') ?? 'unknown' });
      if (!success) return json({ error: 'Too many plans in a minute. Wait a moment.' }, 429, origin);
    }

    const length = Number(request.headers.get('Content-Length') ?? 0);
    if (length > 8 * 1024) return json({ error: 'Request too large' }, 413, origin);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Send JSON' }, 400, origin);
    }
    const check = validatePlanRequest(body);
    if (check.error) return json({ error: check.error }, 400, origin);

    try {
      return json(await buildPlan(check.value, env, fetchImpl), 200, origin);
    } catch (err) {
      if (err instanceof PublicError) return json({ error: err.message }, err.status, origin);
      console.error('plan failed:', err?.name ?? 'Error'); // no request data in logs
      return json({ error: 'Something went wrong planning that trip' }, 500, origin);
    }
  },
};

