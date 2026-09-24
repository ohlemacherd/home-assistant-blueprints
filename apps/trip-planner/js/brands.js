// Fuel brands seen along the Ohio / Michigan / Kentucky / West Virginia / New York
// routes, matched from a station's display name. First match wins, so the more
// specific patterns sit above the ones they would otherwise collide with.
//
// travelCenter marks full truck-stop chains (big lots, showers, 24-hour staff).
// It is a fact about the chain, used as one safety/amenity signal - not a claim
// about any single location.

export const BRANDS = [
  { key: 'bucees', label: "Buc-ee's", re: /\bbuc-?ee'?s\b/, travelCenter: true },
  { key: 'loves', label: "Love's", re: /\blove['’]?s\b/, travelCenter: true },
  { key: 'flying-j', label: 'Flying J', re: /\bflying\s*j\b/, travelCenter: true },
  { key: 'pilot', label: 'Pilot', re: /\bpilot\b/, travelCenter: true },
  { key: 'ta', label: 'TA', re: /^ta\b|\btravel ?centers? of america\b|\bta express\b/, travelCenter: true },
  { key: 'petro', label: 'Petro', re: /^petro\b|\bpetro stopping\b/, travelCenter: true },
  { key: 'circle-k', label: 'Circle K', re: /\bcircle\s*k\b/ },
  { key: 'speedway', label: 'Speedway', re: /\bspeedway\b/ },
  { key: 'marathon', label: 'Marathon', re: /\bmarathon\b/ },
  { key: 'shell', label: 'Shell', re: /\bshell\b/ },
  { key: 'sunoco', label: 'Sunoco', re: /\bsunoco\b/ },
  { key: 'bp', label: 'BP', re: /\bbp\b/ },
  { key: 'gulf', label: 'Gulf', re: /\bgulf\b/ },
  { key: 'caseys', label: "Casey's", re: /\bcasey['’]?s\b/ },
  { key: 'murphy', label: 'Murphy USA', re: /\bmurphy\b/ },
  { key: 'sheetz', label: 'Sheetz', re: /\bsheetz\b/ },
  { key: 'getgo', label: 'GetGo', re: /\bget\s?go\b/ },
  { key: 'wawa', label: 'Wawa', re: /\bwawa\b/ },
  { key: 'thorntons', label: 'Thorntons', re: /\bthorntons\b/ },
  { key: 'udf', label: 'United Dairy Farmers', re: /\budf\b|\bunited dairy farmers\b/ },
  { key: 'duchess', label: 'Duchess', re: /\bduchess\b/ },
  { key: 'true-north', label: 'True North', re: /\btrue north\b/ },
  { key: 'go-mart', label: 'GoMart', re: /\bgo-?\s?mart\b/ },
  { key: 'little-general', label: 'Little General', re: /\blittle general\b/ },
  { key: 'kwik-fill', label: 'Kwik Fill', re: /\bkwik\s?fill\b/ },
  { key: 'stewarts', label: "Stewart's", re: /\bstewart['’]?s\b/ },
  { key: 'fastrac', label: 'Fastrac', re: /\bfastrac\b/ },
  { key: 'mirabito', label: 'Mirabito', re: /\bmirabito\b/ },
  { key: 'nice-n-easy', label: "Nice N Easy", re: /\bnice\s?n\s?easy\b/ },
  { key: 'citgo', label: 'Citgo', re: /\bcitgo\b/ },
  { key: 'valero', label: 'Valero', re: /\bvalero\b/ },
  { key: 'exxon', label: 'Exxon', re: /\bexxon\b/ },
  { key: 'mobil', label: 'Mobil', re: /\bmobil\b/ },
  { key: '7-eleven', label: '7-Eleven', re: /\b7-?\s?eleven\b/ },
  { key: 'meijer', label: 'Meijer', re: /\bmeijer\b/ },
  { key: 'kroger', label: 'Kroger', re: /\bkroger\b/ },
  { key: 'costco', label: 'Costco', re: /\bcostco\b/ },
  { key: 'sams-club', label: "Sam's Club", re: /\bsam['’]?s club\b/ },
];

const BY_KEY = Object.fromEntries(BRANDS.map((b) => [b.key, b]));

// The fuel partners Upside itself names (upside.com/partnerships). Offers are
// personal and change daily, so this is only the starting list: each driver
// ticks the brands that actually pay them.
export const UPSIDE_DEFAULT_BRANDS = ['circle-k', 'caseys', 'murphy', 'shell', 'gulf', 'sunoco', 'marathon'];

export function brandOf(name) {
  const s = String(name ?? '').toLowerCase();
  for (const b of BRANDS) if (b.re.test(s)) return { key: b.key, label: b.label, travelCenter: Boolean(b.travelCenter) };
  return null;
}

export function brandLabel(key) {
  return BY_KEY[key]?.label ?? key;
}
