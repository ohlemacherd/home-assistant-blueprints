// Sample data so the app can be tried before the Google server exists. One made-up
// drive up I-71 (Cleveland to Covington). Brands are real chains, but every
// location, rating, price, find and bathroom score here is invented, and the
// UI labels this mode as sample data everywhere it shows.

const H = 3600;

const station = (n, name, offsetSeconds, detourSeconds, rating, ratingCount, restroom, open24h, fuelPrice) => ({
  id: `demo-${n}`,
  googlePlaceId: null,
  name,
  address: 'Sample location',
  lat: 41.4 - (offsetSeconds / (3.85 * H)) * 2.3,
  lng: -81.7 - (offsetSeconds / (3.85 * H)) * 2.8,
  rating,
  ratingCount,
  restroom,
  open24h,
  fuelPrice,
  fuelUpdated: null,
  mapsUrl: null,
  offsetSeconds,
  offsetMeters: Math.round((offsetSeconds / (3.85 * H)) * 402000),
  detourSeconds,
});

const STATIONS = [
  station(1, 'Speedway · Strongsville', 1200, 60, 3.9, 210, true, true, 3.19),
  station(2, 'Circle K · Medina', 2100, 120, 4.1, 180, true, false, 3.15),
  station(3, 'Pilot Travel Center · Lodi', 3000, 90, 4.2, 1450, true, true, 3.25),
  station(4, 'Marathon · Ashland', 4200, 180, 4.4, 320, true, false, 3.09),
  station(5, 'Sheetz · Mansfield', 5100, 240, 4.6, 2100, true, true, 3.12),
  station(6, "Love's Travel Stop · Mount Gilead", 6300, 60, 4.3, 1800, true, true, 3.21),
  station(7, 'Duchess · Delaware', 7200, 300, 3.6, 90, null, false, 3.05),
  station(8, 'Shell · Sunbury', 7500, 150, 4.0, 260, true, true, 3.29),
  station(9, 'BP · Grove City', 9600, 200, 3.7, 150, true, true, 3.19),
  station(10, 'Sunoco · Jeffersonville', 11100, 120, 4.1, 240, true, false, 3.14),
  station(11, 'Circle K · Wilmington', 12300, 180, 4.2, 310, true, true, 3.11),
  station(12, 'United Dairy Farmers · Mason', 12900, 240, 4.5, 410, true, false, 3.17),
  station(13, 'Speedway · Cincinnati', 13300, 300, 3.4, 120, false, true, 3.29),
  station(14, 'Marathon · Far Exit', 8400, 900, 4.8, 700, true, true, 2.99),
];

const FAVORITES = {
  chipotle: [
    station(101, 'Chipotle · Medina', 2300, 240, 4.3, 520, null, false, null),
    station(102, 'Chipotle · Polaris', 8100, 180, 4.6, 1100, null, false, null),
    station(103, 'Chipotle · Mason', 12950, 360, 4.1, 380, null, false, null),
  ],
  panera: [station(111, 'Panera Bread · Mansfield', 5200, 300, 4.4, 600, null, false, null)],
  starbucks: [
    station(121, 'Starbucks · Medina', 2150, 120, 4.2, 400, null, false, null),
    station(122, 'Starbucks · Grove City', 9700, 150, 4.3, 350, null, false, null),
  ],
};

// Sample coworker notes, shown only in sample mode and never saved.
export const SAMPLE_CROWD = {
  finds: {
    'demo-5': [{ id: 's1', text: 'Made-to-order hoagies, even at 2 a.m.' }],
    'demo-12': [{ id: 's2', text: 'Ice cream by the pint to take home' }],
    'demo-6': [{ id: 's3', text: 'Clean showers if you are between sites' }],
  },
  bathrooms: {
    'demo-5': [{ stars: 5 }, { stars: 5 }],
    'demo-6': [{ stars: 5 }, { stars: 4 }, { stars: 5 }],
    'demo-9': [{ stars: 2 }, { stars: 1 }],
  },
};

export async function planDemo({ waypoints, favorites }) {
  // The first leg is the long sample drive; any later leg (site to hotel, site
  // to site) is a short hop across town with a couple of stations.
  const legs = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = { label: waypoints[i], lat: 41.4, lng: -81.7 };
    const to = { label: waypoints[i + 1], lat: 39.08, lng: -84.51 };
    if (i === 0) {
      legs.push({
        from,
        to,
        distanceMeters: 402000,
        durationSeconds: Math.round(3.85 * H),
        places: STATIONS,
        favorites: favorites.map((f) => ({ key: f.key, places: FAVORITES[f.key] ?? [] })),
      });
    } else {
      const hop = (n, name, offset, detour, rating, count, price) => ({
        ...station(n, name, offset, detour, rating, count, true, true, price),
        id: `demo-${n}-leg${i + 1}`,
      });
      legs.push({
        from,
        to,
        distanceMeters: 12900,
        durationSeconds: 17 * 60,
        places: [hop(201, 'Thorntons · Covington', 300, 60, 4.3, 520, 3.14), hop(202, 'Speedway · Fort Wright', 600, 180, 3.8, 140, 3.19)],
        favorites: favorites.map((f) => ({ key: f.key, places: [] })),
      });
    }
  }
  return { provider: 'demo', generatedAt: new Date().toISOString(), legs };
}
