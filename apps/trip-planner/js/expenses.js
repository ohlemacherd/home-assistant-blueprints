// Learns a driver's habits from an expense report they choose to load: which
// restaurant chains and fuel brands show up again and again. Runs entirely on
// the phone. The report itself is never uploaded or stored; only the names the
// driver ticks afterwards are saved as favorites (see planner.js DEFAULT_PREFS).
//
// Input is whatever a card or expense system exports: a CSV/TSV with a merchant
// or description column, or lines pasted from a statement. Merchant strings on
// statements look like 'CHIPOTLE 2451', 'TST* PENN STATION #112', 'SHELL OIL
// 57444', so matching is by pattern against known chains rather than exact names.

import { brandOf } from './brands.js';

export const FOOD_CHAINS = [
  { key: 'chipotle', label: 'Chipotle', re: /\bchipotle\b/ },
  { key: 'panera', label: 'Panera Bread', re: /\bpanera\b/ },
  { key: 'starbucks', label: 'Starbucks', re: /\bstarbucks\b/ },
  { key: 'chick-fil-a', label: 'Chick-fil-A', re: /\bchick-?fil-?a\b/ },
  { key: 'skyline', label: 'Skyline Chili', re: /\bskyline chili\b/ },
  { key: 'gold-star', label: 'Gold Star Chili', re: /\bgold star chili\b/ },
  { key: 'larosas', label: "LaRosa's Pizzeria", re: /\blarosa'?s\b/ },
  { key: 'bob-evans', label: 'Bob Evans', re: /\bbob evans\b/ },
  { key: 'cracker-barrel', label: 'Cracker Barrel', re: /\bcracker barrel\b/ },
  { key: 'first-watch', label: 'First Watch', re: /\bfirst watch\b/ },
  { key: 'penn-station', label: 'Penn Station East Coast Subs', re: /\bpenn station\b/ },
  { key: 'city-bbq', label: 'City Barbeque', re: /\bcity (barbeque|bbq)\b/ },
  { key: 'swensons', label: 'Swensons', re: /\bswensons?\b/ },
  { key: 'raising-canes', label: "Raising Cane's", re: /\braising cane'?s\b/ },
  { key: 'culvers', label: "Culver's", re: /\bculver'?s\b/ },
  { key: 'five-guys', label: 'Five Guys', re: /\bfive guys\b/ },
  { key: 'jimmy-johns', label: "Jimmy John's", re: /\bjimmy john'?s\b/ },
  { key: 'jersey-mikes', label: "Jersey Mike's", re: /\bjersey mike'?s\b/ },
  { key: 'potbelly', label: 'Potbelly', re: /\bpotbelly\b/ },
  { key: 'qdoba', label: 'Qdoba', re: /\bqdoba\b/ },
  { key: 'moes', label: "Moe's Southwest Grill", re: /\bmoe'?s southwest\b/ },
  { key: 'cava', label: 'CAVA', re: /\bcava\b/ },
  { key: 'sweetgreen', label: 'Sweetgreen', re: /\bsweetgreen\b/ },
  { key: 'noodles', label: 'Noodles & Company', re: /\bnoodles (&|and) co/ },
  { key: 'steak-n-shake', label: "Steak 'n Shake", re: /\bsteak\s?'?n'?\s?shake\b/ },
  { key: 'waffle-house', label: 'Waffle House', re: /\bwaffle house\b/ },
  { key: 'tim-hortons', label: 'Tim Hortons', re: /\btim hortons?\b/ },
  { key: 'dunkin', label: "Dunkin'", re: /\bdunkin\b/ },
  { key: 'mcdonalds', label: "McDonald's", re: /\bmc\s?donald'?s\b/ },
  { key: 'wendys', label: "Wendy's", re: /\bwendy'?s\b/ },
  { key: 'taco-bell', label: 'Taco Bell', re: /\btaco bell\b/ },
  { key: 'subway', label: 'Subway', re: /\bsubway\b/ },
  { key: 'arbys', label: "Arby's", re: /\barby'?s\b/ },
  { key: 'bww', label: 'Buffalo Wild Wings', re: /\bbuffalo wild wings\b/ },
  { key: 'texas-roadhouse', label: 'Texas Roadhouse', re: /\btexas roadhouse\b/ },
  { key: 'olive-garden', label: 'Olive Garden', re: /\bolive garden\b/ },
  { key: 'applebees', label: "Applebee's", re: /\bapplebee'?s\b/ },
  { key: 'portillos', label: "Portillo's", re: /\bportillo'?s\b/ },
  { key: 'popeyes', label: 'Popeyes', re: /\bpopeyes\b/ },
];

export function foodChainOf(text) {
  const s = String(text ?? '').toLowerCase();
  for (const c of FOOD_CHAINS) if (c.re.test(s)) return { key: c.key, label: c.label };
  return null;
}

// RFC 4180-style: quoted fields, doubled quotes, commas and newlines inside
// quotes. Tab-separated when the first line has tabs and no commas.
export function parseDelimited(text) {
  const src = String(text ?? '').replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const sep = firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ',';
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const COLUMN_PRIORITY = [/merchant/i, /vendor/i, /payee/i, /business/i, /description/i, /^name$/i];

export function merchantColumn(header) {
  for (const re of COLUMN_PRIORITY) {
    const i = header.findIndex((h) => re.test(String(h).trim()));
    if (i !== -1) return i;
  }
  return -1;
}

// Words that mark a line as travel overhead rather than a place you'd seek out.
const NOT_A_HABIT = /\b(hotel|inn|suites?|marriott|courtyard|hilton|hampton|hyatt|holiday|residence|airlines?|airways|delta|southwest|united|uber|lyft|taxi|parking|park|toll|turnpike|e-?z ?pass|amazon|fedex|ups|usps|hertz|enterprise|avis|budget|national car|payment|thank you|interest|fee|credit|refund)\b/i;

const STATE = /^(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy|dc)$/;

// 'TST* JOES DINER #44 COLUMBUS OH' -> 'Joes Diner Columbus'. Good enough to
// group repeat visits; the driver reads the suggestion before keeping it.
export function normalizeMerchant(raw) {
  const words = String(raw ?? '')
    .toLowerCase()
    .replace(/^\s*(sq|tst|sp|pp|paypal|py|clv|dd|doordash|ubr|uber ?eats?)\s*\*\s*/, '')
    .replace(/[#*]/g, ' ')
    .split(/[^a-z']+/)
    .filter((w) => w && !STATE.test(w) && w.length > 1);
  return words
    .slice(0, 3)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

// Returns counts, most frequent first:
//   food:  known restaurant chains    [{ key, label, count }]
//   fuel:  known fuel brands          [{ key, label, count }]
//   other: unmatched repeat merchants [{ label, count }] (3+ visits, top 8)
export function learnFromExpenses(text) {
  const rows = parseDelimited(text);
  if (!rows.length) return { rowsRead: 0, food: [], fuel: [], other: [] };
  const col = merchantColumn(rows[0]);
  const body = col === -1 ? rows : rows.slice(1);
  const food = new Map();
  const fuel = new Map();
  const other = new Map();
  const bump = (map, key, label) => {
    const cur = map.get(key) ?? { key, label, count: 0 };
    cur.count += 1;
    map.set(key, cur);
  };
  for (const r of body) {
    const text = col === -1 ? r.join(' ') : r[col] ?? '';
    if (!text.trim()) continue;
    const chain = foodChainOf(text);
    if (chain) {
      bump(food, chain.key, chain.label);
      continue;
    }
    const brand = brandOf(text);
    if (brand) {
      bump(fuel, brand.key, brand.label);
      continue;
    }
    if (NOT_A_HABIT.test(text)) continue;
    const label = normalizeMerchant(text);
    if (label) bump(other, label.toLowerCase(), label);
  }
  const sorted = (m) => [...m.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return {
    rowsRead: body.length,
    food: sorted(food),
    fuel: sorted(fuel),
    other: sorted(other)
      .filter((o) => o.count >= 3)
      .slice(0, 8)
      .map(({ label, count }) => ({ label, count })),
  };
}
