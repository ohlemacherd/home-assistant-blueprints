# Trip Planner

A phone app for work drives across Ohio, Michigan, Kentucky, West Virginia and New
York. You enter where you're leaving from, where you're going and where you're
staying, and it picks the stops worth making along the way:

- gas at the brands where your **Upside** cash back is usually best
- stations with **clean bathrooms** (coworker ratings over Google's yes/no)
- **highly rated** stations, with thin ratings discounted (a 4.9 from 7 reviews doesn't beat a 4.6 from 1,200)
- **safety signals**: open 24 hours, travel centers, busy and well reviewed
- **local finds** coworkers flagged: "ice cream by the pint", "great pepperoni rolls"
- **your usual places**, like the best-rated Chipotles on the route, typed in or learned
  (optionally) from an expense report

Each pick explains itself ("On your Upside list (Shell) · Bathroom 4.7/5 from 3
coworkers · +2 min detour"), and **Navigate** opens Google Maps with the stop as a
waypoint.

The idea is from the 2026-09-15 daily note, and learning from expense reports came up while it was being built.

## Status

| Piece | State |
|---|---|
| Ranking engine + brand matching (`js/planner.js`, `js/brands.js`) | Built, 16 tests |
| Expense-report habit learner (`js/expenses.js`) | Built, 7 tests. CSV/TSV or pasted lines |
| Team server: Cloudflare Worker for Google Routes + Places (`worker/`) | Built, 9 tests with Google mocked; bundles with `wrangler deploy --dry-run`. **Not deployed, and it has not yet made a real Google call** |
| Phone app (PWA): plan, results, stop details, settings | Built; end-to-end checked in Chromium at phone size, light and dark |
| Sample mode (no key needed) | Works today: one made-up I-71 drive, labelled as sample everywhere |
| Shared coworker ratings/finds | **Not yet.** They save on each phone only (see Roadmap) |

## Read this first: what can break it

| Risk | What it means | What's done about it |
|---|---|---|
| **Upside has no public API** | Upside offers are personal and daily, and only partners get API access ([Upside partner platform](https://www.upside.com/partnerships/tech-integration)). This app can't see your actual cents-per-gallon. | Each driver ticks the brands that usually pay them. The list starts with the fuel partners Upside names (Circle K, Casey's, Murphy, Shell, Gulf, Sunoco, Marathon). Applying to Upside's partner program is the only route to live offers. |
| **Google billing** | Ratings, restroom flags and gas prices come from Places API (New). Those fields bill at the top Text Search tier, about $40 per 1,000 calls once past Google's monthly free allowance. | The Worker asks only for fields it uses. Restaurant searches skip the top-tier fields, and there's a per-IP rate limit. **Set daily quota caps in Google Cloud** so a bug can't run up a bill. |
| **Client locations are confidential** | "Going to" is often an FM client site. It goes to Google (to route) through the Worker. | The Worker doesn't log, cache or store waypoints; the app keeps drives on the phone only. Coworkers can type a city or exit instead of the site address. **Check FM's policy before sharing the app with coworkers.** |
| **"Safe" is a proxy** | No dataset rates gas-station safety. | The app shows named signals (24 h, travel center, busy, 4.2+) rather than a safety score, and calls them "safety signals". |
| **Data lives on one phone** | Ratings, finds, favorites and saved drives are in the browser's storage. Clearing site data loses them. | Fine for one person; Phase 2 moves ratings and finds to the team server. |
| **Expense reports are sensitive** | Amounts, card digits, client names. | Read on the phone and never uploaded or stored. Only the place names you tick are kept. |

## How it fits together

```
 phone (PWA, static files)                     Cloudflare Worker (worker/)           Google
 ─────────────────────────                     ───────────────────────────           ──────
 plan form ──POST /api/plan {waypoints,      ─▶ validate, origin allowlist,     ─▶ Routes API: computeRoutes
              favorites}                         rate limit, holds the key          (legs + polylines)
                                                                                  ─▶ Places (New): searchText
 planner.js ranks with your priorities,     ◀─  normalized legs + places            along each leg's polyline,
 Upside brands, favorites, coworker notes        (offset + detour per place)        routing summaries give detour
 └─ localStorage: prefs, drives, notes
 expenses.js reads a CSV on the phone only
```

Ranking happens on the phone, so changing a priority re-ranks a saved drive
instantly, with no new Google calls.

## Cost

| Item | Cost |
|---|---|
| Cloudflare Worker + static hosting (Pages) | $0 on the free plan at team scale |
| Google Routes API | One call per plan. A few dollars per 1,000, inside the monthly free allowance at team scale |
| Google Places (New) Text Search | Per leg: 1 gas search (2 pages on legs over 2.5 h) + 1 per favorite (max 3). A typical one-leg drive with one favorite is 2-3 calls. About 20 coworkers × 8 drives a month is about 500 calls, around the free allowance; past it, roughly $0.04 a call |
| Domain (optional) | ~$10/yr |

Check Google's current pricing page before rollout. Prices and free allowances change.

## Try it

```bash
cd apps/trip-planner
npm test              # 32 unit tests, no dependencies
npm start             # serves on http://localhost:8080
```

Open http://localhost:8080 and tap **Try the sample drive**.

## Going live (about an evening)

1. **Google Cloud**: create a project with billing, enable **Routes API** and
   **Places API (New)**, and create an API key restricted to those two APIs. Under
   Quotas, cap requests per day on both, for example 500.
2. **Worker**:
   ```bash
   cd apps/trip-planner/worker
   npx wrangler login
   npx wrangler secret put GOOGLE_MAPS_API_KEY
   # set ALLOWED_ORIGINS in wrangler.toml to where the app will be hosted
   npx wrangler deploy
   ```
3. **Host the app**: any static host over HTTPS. For example, with Cloudflare Pages,
   copy `index.html`, `manifest.webmanifest`, `sw.js`, `css/`, `js/` and `icons/` into a folder and run
   `npx wrangler pages deploy <folder> --project-name trip-planner`.
4. **In the app**: Settings → Where stops come from → *Google (team server)*, then paste
   the Worker's URL.
5. On a phone: open the site, then *Add to Home screen*.

## Expense reports (optional)

Settings → *Learn from an expense report*. Load a CSV from your card or expense
system, or paste statement lines. It counts the chains and fuel brands you keep
going back to (`CHIPOTLE 2451`, `TST* PENN STATION #112`, `SHELL OIL 57444`) and lets
you tick which to keep. Food favorites are searched along every drive (top 3); fuel
brands get a ranking boost. PDF and Excel exports aren't read yet. Save as CSV
first.

## Roadmap

1. **Team server for coworker notes**: Worker + D1 so bathroom ratings and finds are
   shared across the team, with sign-in. This is what turns it from a personal
   tool into the coworker app.
2. **Meal-time aware stops**: a "leaving at" time, so lunch favorites land in the
   lunch window.
3. **Fuel range**: stop when the tank will be about a quarter full, instead of on a
   fixed break interval.
4. **Map view** of the route and picks.
5. Apply to the **Upside partner program** for live offers.

## Files

| Path | What |
|---|---|
| `js/planner.js` | Scoring, break windows, favorites on the route, formatting, Maps links |
| `js/brands.js` | Fuel brands from station names; travel-center flag; Upside default list |
| `js/expenses.js` | CSV parser and habit counter for expense reports |
| `js/store.js` | localStorage for prefs, drives and notes |
| `js/providers/` | `demo.js` sample data; `google.js` client for the Worker |
| `js/app.js` | Screens (plan, results, stop sheet, settings) |
| `worker/` | Cloudflare Worker; the only place the Google key exists |
| `test/` | `node --test` suites |
