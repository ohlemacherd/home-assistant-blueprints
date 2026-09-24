// Turns Google Routes / Places (New) responses into the small shapes the app
// uses, and validates what the app sends. Pure, so it is tested without network.

export const LIMITS = {
  waypoints: { min: 2, max: 5 },
  textLength: { min: 2, max: 200 },
  favorites: 3,
  favoriteLength: 60,
};

// '5400s' / '5400.5s' -> 5400
export function seconds(duration) {
  if (typeof duration === 'number') return Math.round(duration);
  const m = /^(\d+(?:\.\d+)?)s$/.exec(String(duration ?? ''));
  return m ? Math.round(Number(m[1])) : null;
}

export function validatePlanRequest(body) {
  if (!body || typeof body !== 'object') return { error: 'Send JSON' };
  const { waypoints, favorites = [] } = body;
  if (!Array.isArray(waypoints) || waypoints.length < LIMITS.waypoints.min || waypoints.length > LIMITS.waypoints.max) {
    return { error: `Give ${LIMITS.waypoints.min} to ${LIMITS.waypoints.max} places` };
  }
  const clean = [];
  for (const w of waypoints) {
    const s = typeof w === 'string' ? w.trim() : '';
    if (s.length < LIMITS.textLength.min || s.length > LIMITS.textLength.max) return { error: 'Each place needs a name or address' };
    clean.push(s);
  }
  if (!Array.isArray(favorites) || favorites.length > LIMITS.favorites) return { error: `Up to ${LIMITS.favorites} favorite places` };
  const favs = [];
  for (const f of favorites) {
    const key = typeof f?.key === 'string' ? f.key.trim() : '';
    const query = typeof f?.query === 'string' ? f.query.trim() : '';
    if (!key || key.length > LIMITS.favoriteLength || query.length < 2 || query.length > LIMITS.favoriteLength) {
      return { error: 'A favorite place is malformed' };
    }
    favs.push({ key, query });
  }
  return { value: { waypoints: clean, favorites: favs } };
}

export function normalizeRoute(json, waypoints) {
  const legs = json?.routes?.[0]?.legs;
  if (!Array.isArray(legs) || legs.length !== waypoints.length - 1) return null;
  return legs.map((leg, i) => ({
    from: { label: waypoints[i], ...latLng(leg.startLocation) },
    to: { label: waypoints[i + 1], ...latLng(leg.endLocation) },
    distanceMeters: leg.distanceMeters ?? 0,
    durationSeconds: seconds(leg.duration) ?? 0,
    polyline: leg.polyline?.encodedPolyline ?? null,
  }));
}

function latLng(loc) {
  const ll = loc?.latLng;
  return ll ? { lat: ll.latitude, lng: ll.longitude } : { lat: null, lng: null };
}

// Google marks an always-open place as one period that opens Sunday 00:00 and
// never closes. The text fallback covers places entered as seven 24h days.
export function isOpen24h(hours) {
  if (!hours) return null;
  const periods = hours.periods ?? [];
  if (periods.some((p) => p.open && !p.close && (p.open.day ?? 0) === 0 && (p.open.hour ?? 0) === 0 && (p.open.minute ?? 0) === 0)) {
    return true;
  }
  const days = hours.weekdayDescriptions ?? [];
  return days.length === 7 && days.every((d) => /open 24 hours/i.test(d));
}

export function regularFuelPrice(fuelOptions) {
  const entry = fuelOptions?.fuelPrices?.find((f) => f.type === 'REGULAR_UNLEADED');
  const price = entry?.price;
  if (!price || price.currencyCode !== 'USD') return null;
  const value = Number(price.units ?? 0) + Number(price.nanos ?? 0) / 1e9;
  return Number.isFinite(value) && value > 0 ? { price: Math.round(value * 1000) / 1000, updated: entry.updateTime ?? null } : null;
}

// Places come back with a parallel routingSummaries array: legs[0] is leg start
// to the place, legs[1] the place to the leg's end. The detour is how much
// longer that makes the drive than the leg itself.
export function normalizePlaces(json, legDurationSeconds) {
  const places = json?.places ?? [];
  const summaries = json?.routingSummaries ?? [];
  return places.map((p, i) => {
    const toPlace = summaries[i]?.legs?.[0];
    const onward = summaries[i]?.legs?.[1];
    const a = seconds(toPlace?.duration);
    const b = seconds(onward?.duration);
    const fuel = regularFuelPrice(p.fuelOptions);
    return {
      id: p.id,
      googlePlaceId: p.id,
      name: p.displayName?.text ?? 'Unnamed place',
      address: p.formattedAddress ?? '',
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      rating: typeof p.rating === 'number' ? p.rating : null,
      ratingCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
      restroom: typeof p.restroom === 'boolean' ? p.restroom : null,
      open24h: isOpen24h(p.regularOpeningHours),
      fuelPrice: fuel?.price ?? null,
      fuelUpdated: fuel?.updated ?? null,
      mapsUrl: p.googleMapsUri ?? null,
      offsetSeconds: a,
      offsetMeters: toPlace?.distanceMeters ?? null,
      detourSeconds: a !== null && b !== null ? Math.max(0, a + b - legDurationSeconds) : null,
    };
  });
}

export function dedupe(places) {
  const seen = new Set();
  return places.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}
