import { BRANDS, brandOf } from './brands.js';
import { foodChainOf, learnFromExpenses } from './expenses.js';
import {
  FACTORS,
  FACTOR_LABELS,
  foodFavorites,
  formatDuration,
  formatMiles,
  navUrl,
  planTrip,
} from './planner.js';
import { planDemo, SAMPLE_CROWD } from './providers/demo.js';
import { planGoogle } from './providers/google.js';
import * as store from './store.js';

const VERSION = '0.1.0';
const main = document.getElementById('main');
const toastEl = document.getElementById('toast');

// ---------- DOM helpers ----------

// Builds elements with text nodes only, so nothing a user typed (or Google
// returned) is ever parsed as HTML.
function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (typeof v === 'boolean' || k === 'value') el[k] = v;
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const ICONS = {
  back: '<path d="M15 18l-6-6 6-6"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  nav: '<path d="M3 11l18-8-8 18-2-8z"/>',
  pin: '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  fuel: '<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M4 21h12M5 10h10M15 8l3 3v6a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
  food: '<path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8M7 7h4M17 3c-2 2-2 6 0 8v10"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h8"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 13v6h14v-6"/>',
};

function icon(name) {
  const span = h('span', { class: 'icon', 'aria-hidden': 'true' });
  // Static markup from the table above; never user data.
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
  return span;
}

let toastTimer = null;
function toast(message) {
  toastEl.replaceChildren(h('span', {}, message));
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.hidden = true), 3500);
}

function topbar(title, { back = null, actions = [] } = {}) {
  return h(
    'header',
    { class: 'topbar' },
    back && h('a', { class: 'icon-btn', href: back, 'aria-label': 'Back' }, icon('back')),
    h('h1', {}, title),
    ...actions,
  );
}

const section = (title, ...children) => h('section', { class: 'section' }, title && h('h2', { class: 'section-title' }, title), ...children);

function field(label, control, hint) {
  return h('label', { class: 'field' }, h('span', { class: 'label' }, label), control, hint && h('span', { class: 'hint' }, hint));
}

function sheet(title, body, { onClose } = {}) {
  const dlg = h('dialog', { class: 'sheet', 'aria-label': title });
  dlg.append(
    h(
      'div',
      { class: 'sheet-inner' },
      h('div', { class: 'sheet-head' }, h('h2', {}, title), h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onclick: () => dlg.close() }, icon('x'))),
      h('div', { class: 'sheet-body' }, body),
    ),
  );
  dlg.addEventListener('close', () => {
    dlg.remove();
    onClose?.();
  });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close(); // tap on the backdrop
  });
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}

// ---------- state ----------

let prefs = store.getPrefs();
let settings = store.getSettings();

function crowdFor(provider) {
  const own = store.getCrowd();
  return provider === 'demo' ? store.mergeCrowd(own, SAMPLE_CROWD) : own;
}

// ---------- router ----------

let lastPath = null;
function render() {
  const path = location.hash.replace(/^#\/?/, '');
  const [page, id] = path.split('/');
  if (path !== lastPath) {
    window.scrollTo(0, 0);
    lastPath = path;
    toastEl.hidden = true;
  }
  if (page === 'trip' && id) renderTrip(decodeURIComponent(id));
  else if (page === 'settings') renderSettings();
  else renderHome();
}

// ---------- home: plan a drive ----------

function renderHome() {
  const trips = store.getTrips();
  const from = h('input', { name: 'from', placeholder: 'Home, office or an address', autocomplete: 'street-address', enterkeyhint: 'next' });
  const stay = h('input', { name: 'stay', placeholder: 'Hotel (optional)', enterkeyhint: 'next' });
  const stopsBox = h('div', { class: 'stops' });
  const addStop = (value = '') => {
    const input = h('input', { name: 'to', placeholder: 'Client site, city or address', value, enterkeyhint: 'next' });
    const row = h(
      'div',
      { class: 'stop-row' },
      input,
      stopsBox.children.length
        ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Remove this stop', onclick: () => row.remove() }, icon('x'))
        : null,
    );
    stopsBox.append(row);
    return input;
  };
  addStop();

  const favs = foodFavorites(prefs);
  const submit = h('button', { class: 'btn primary block', type: 'submit' }, icon('route'), 'Find my stops');
  const form = h(
    'form',
    { class: 'card panel', novalidate: true },
    field('Leaving from', from),
    h('div', { class: 'field' }, h('span', { class: 'label' }, 'Going to'), stopsBox),
    h('button', { class: 'btn small add-stop', type: 'button', onclick: () => addStop().focus() }, icon('plus'), 'Add another stop'),
    field('Staying at', stay, 'Added as the last stop of the day.'),
    h(
      'p',
      { class: 'hint' },
      favs.length ? `Also looking for: ${favs.map((f) => f.label).join(', ')}. ` : 'Tell it your usual places (Chipotle, Speedway…) in ',
      h('a', { href: '#/settings' }, favs.length ? 'Change' : 'Settings'),
      favs.length ? '' : '.',
    ),
    submit,
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const waypoints = [from.value, ...[...stopsBox.querySelectorAll('input')].map((i) => i.value), stay.value]
      .map((s) => s.trim())
      .filter(Boolean);
    if (!from.value.trim()) return fail(from, 'Where are you leaving from?');
    if (waypoints.length < 2) return fail(stopsBox.querySelector('input'), 'Where are you going?');
    if (waypoints.length > 5) return toast('Up to 5 places per plan');
    submit.disabled = true;
    submit.replaceChildren('Planning…');
    try {
      const trip = await runPlan(waypoints);
      location.hash = `#/trip/${encodeURIComponent(trip.id)}`;
    } catch (err) {
      toast(err.message);
      submit.disabled = false;
      submit.replaceChildren(icon('route'), 'Find my stops');
    }
  });

  const fail = (input, msg) => {
    toast(msg);
    input?.focus();
  };

  const tryIt = h(
    'button',
    {
      class: 'btn',
      type: 'button',
      onclick: () => {
        from.value = 'Cleveland, OH';
        stopsBox.querySelector('input').value = 'Covington, KY';
        form.requestSubmit();
      },
    },
    'Try the sample drive',
  );

  main.replaceChildren(
    topbar('Trip Planner', { actions: [h('a', { class: 'icon-btn', href: '#/settings', 'aria-label': 'Settings' }, icon('settings'))] }),
    settings.provider === 'demo' &&
      h('div', { class: 'banner' }, 'Sample mode: stops are made-up examples.', h('a', { href: '#/settings' }, 'Connect')),
    section(null, form),
    trips.length
      ? section(
          'Recent drives',
          h(
            'ul',
            { class: 'list' },
            trips.map((t) =>
              h(
                'li',
                {},
                h(
                  'a',
                  { class: 'row', href: `#/trip/${encodeURIComponent(t.id)}` },
                  h('span', { class: 'cat-dot' }, icon('route')),
                  h(
                    'span',
                    { class: 'row-main' },
                    h('span', { class: 'row-title' }, t.waypoints.join(' → ')),
                    h('span', { class: 'row-sub' }, `${new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${t.result.provider === 'demo' ? ' · sample' : ''}`),
                  ),
                ),
              ),
            ),
          ),
        )
      : section(null, h('div', { class: 'card empty' }, h('h2', {}, 'Plan a work drive'), h('p', {}, 'Where you leave from, where you are going, where you are staying. It finds the stops worth making on the way.'), tryIt)),
  );
}

async function runPlan(waypoints, id = null) {
  const favorites = foodFavorites(prefs).map((f) => ({ key: f.key, query: f.query }));
  const result =
    settings.provider === 'google'
      ? await planGoogle(settings.apiBase, { waypoints, favorites })
      : await planDemo({ waypoints, favorites });
  const trip = { id: id ?? `t${Date.now().toString(36)}`, waypoints, createdAt: new Date().toISOString(), result };
  if (!store.saveTrip(trip)) toast('Could not save this drive on the phone');
  return trip;
}

// ---------- results ----------

function renderTrip(id) {
  const trip = store.getTrips().find((t) => t.id === id);
  if (!trip) {
    location.hash = '#/';
    return;
  }
  const provider = trip.result.provider;
  const crowd = crowdFor(provider);
  const planned = planTrip(trip.result, { prefs, crowd });
  const title = trip.waypoints.map((w) => w.split(',')[0]).join(' → ');

  const legs = planned.legs.map((leg, i) => {
    const ctx = { leg, trip, provider };
    const picked = new Set(leg.windows.flatMap((w) => w.picks.map((p) => p.id)));
    const windows = leg.windows.map((w) =>
      h(
        'div',
        { class: 'window' },
        h('h3', { class: 'window-title' }, w.label),
        w.picks.length ? w.picks.map((p, j) => stopCard(p, ctx, { alternate: j > 0, top: j === 0 })) : h('p', { class: 'note' }, `No station within ${prefs.maxDetourMin} min of the road here.`),
      ),
    );
    const usual = leg.usual.map((u) =>
      h(
        'div',
        { class: 'window' },
        h('h3', { class: 'window-title' }, `Your usual: ${u.favorite.label}`),
        u.picks.length ? u.picks.map((p, j) => stopCard(p, ctx, { alternate: j > 0 })) : h('p', { class: 'note' }, `No ${u.favorite.label} within ${prefs.maxDetourMin} min of this drive.`),
      ),
    );
    return h(
      'section',
      { class: 'section leg' },
      h(
        'div',
        { class: 'leg-head' },
        planned.legs.length > 1 && h('span', { class: 'badge' }, `Leg ${i + 1}`),
        h('h2', {}, `${leg.from.label} → ${leg.to.label}`),
        h('p', { class: 'muted' }, `${formatMiles(leg.distanceMeters)} · ${formatDuration(leg.durationSeconds)}`),
      ),
      windows,
      usual,
      leg.worthIt.length > 0 && h('div', { class: 'window' }, h('h3', { class: 'window-title' }, 'Worth the stop'), leg.worthIt.map((p) => stopCard(p, ctx))),
      h(
        'details',
        { class: 'all' },
        h('summary', {}, `Every station on this drive (${leg.all.length})`),
        h(
          'ul',
          { class: 'list' },
          leg.all.map((p) =>
            h(
              'li',
              {},
              h(
                'button',
                { class: 'row', type: 'button', onclick: () => openStop(p, ctx) },
                h('span', { class: 'row-main' }, h('span', { class: 'row-title' }, p.name), h('span', { class: 'row-sub' }, stopMeta(p))),
                picked.has(p.id) && h('span', { class: 'badge accent' }, 'Pick'),
              ),
            ),
          ),
        ),
      ),
      leg.skipped > 0 && h('p', { class: 'note' }, `${leg.skipped} more station${leg.skipped === 1 ? ' is' : 's are'} over your ${prefs.maxDetourMin}-minute detour limit.`),
    );
  });

  const replan = h(
    'button',
    {
      class: 'btn',
      type: 'button',
      onclick: async () => {
        replan.disabled = true;
        try {
          await runPlan(trip.waypoints, trip.id);
          toast('Updated');
          render();
        } catch (err) {
          toast(err.message);
          replan.disabled = false;
        }
      },
    },
    'Refresh stops',
  );

  main.replaceChildren(
    topbar(title, { back: '#/' }),
    provider === 'demo' && h('div', { class: 'banner' }, 'Sample data: every station, rating and note here is made up.'),
    ...legs,
    section(
      null,
      h(
        'div',
        { class: 'actions' },
        replan,
        h(
          'button',
          {
            class: 'btn danger',
            type: 'button',
            onclick: () => {
              store.deleteTrip(trip.id);
              location.hash = '#/';
            },
          },
          icon('trash'),
          'Delete',
        ),
      ),
      h('p', { class: 'note' }, `Planned ${new Date(trip.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}. Ranked with your current settings.`),
    ),
  );
}

function stopMeta(p) {
  const bits = [];
  if (typeof p.offsetSeconds === 'number') bits.push(`${formatDuration(p.offsetSeconds)} in`);
  bits.push(p.detourMinutes ? `+${p.detourMinutes} min` : 'on the way');
  if (typeof p.rating === 'number') bits.push(`★ ${p.rating.toFixed(1)}`);
  if (typeof p.fuelPrice === 'number') bits.push(`$${p.fuelPrice.toFixed(2)}`);
  return bits.join(' · ');
}

function stopCard(p, ctx, { alternate = false, top = false } = {}) {
  const tags = [
    top && 'Top pick',
    p.restroom === true && 'Restroom',
    p.open24h === true && 'Open 24 h',
    p.brand?.travelCenter && 'Travel center',
  ].filter(Boolean);
  // The name button stretches over the whole card (CSS), so a tap anywhere opens
  // the details, while Navigate/Details stay their own targets above it.
  return h(
    'article',
    { class: `card stop${alternate ? ' alt' : ''}` },
    h(
      'div',
      { class: 'stop-top' },
      h('span', { class: 'cat-dot' }, icon(p.favorite ? 'food' : 'fuel')),
      h(
        'span',
        { class: 'row-main' },
        h('button', { class: 'stop-name row-title', type: 'button', onclick: () => openStop(p, ctx) }, p.name),
        h('span', { class: 'row-sub' }, stopMeta(p)),
      ),
    ),
    tags.length > 0 && h('div', { class: 'tags' }, tags.map((t) => h('span', { class: t === 'Top pick' ? 'badge accent' : 'badge' }, t))),
    p.reasons.length > 0 && h('ul', { class: 'reasons' }, p.reasons.slice(0, 3).map((r) => h('li', {}, r))),
    h(
      'div',
      { class: 'stop-actions' },
      h('a', { class: 'btn small primary', href: navUrl(ctx.leg.from.label, ctx.leg.to.label, p), target: '_blank', rel: 'noopener' }, icon('nav'), 'Navigate'),
      h('button', { class: 'btn small', type: 'button', onclick: () => openStop(p, ctx) }, 'Details'),
    ),
  );
}

function openStop(p, ctx) {
  const sample = ctx.provider === 'demo';
  const body = h('div', {});
  const draw = () => {
    const crowd = crowdFor(ctx.provider);
    const finds = crowd.finds[p.id] ?? [];
    const baths = crowd.bathrooms[p.id] ?? [];
    const avg = baths.length ? (baths.reduce((s, b) => s + b.stars, 0) / baths.length).toFixed(1) : null;
    const own = store.getCrowd();

    const stars = h(
      'div',
      { class: 'stars', role: 'group', 'aria-label': 'Rate the bathroom' },
      [1, 2, 3, 4, 5].map((n) =>
        h(
          'button',
          {
            class: 'star',
            type: 'button',
            'aria-label': `${n} star${n > 1 ? 's' : ''}`,
            onclick: () => {
              own.bathrooms[p.id] = [...(own.bathrooms[p.id] ?? []), { stars: n, at: new Date().toISOString() }];
              if (!store.saveCrowd(own)) return toast('Could not save on this phone');
              toast('Bathroom rating saved');
              draw();
            },
          },
          icon('star'),
        ),
      ),
    );
    const findInput = h('input', { placeholder: 'Known for… (e.g. great pepperoni rolls)', maxlength: '120', enterkeyhint: 'done' });
    const findForm = h('form', { class: 'add-row', novalidate: true }, findInput, h('button', { class: 'btn', type: 'submit' }, 'Add'));
    findForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = findInput.value.trim();
      if (!text) return;
      own.finds[p.id] = [...(own.finds[p.id] ?? []), { id: `f${Date.now().toString(36)}`, text, at: new Date().toISOString() }];
      if (!store.saveCrowd(own)) return toast('Could not save on this phone');
      draw();
    });

    body.replaceChildren(
      h('p', { class: 'muted' }, p.address),
      h(
        'div',
        { class: 'kv-list' },
        kv('On the drive', stopMeta(p)),
        typeof p.rating === 'number' && kv('Google rating', `★ ${p.rating.toFixed(1)} from ${(p.ratingCount ?? 0).toLocaleString('en-US')} reviews`),
        kv('Restroom', p.restroom === true ? 'Yes' : p.restroom === false ? 'No' : 'Unknown'),
        kv('Open 24 hours', p.open24h === true ? 'Yes' : p.open24h === false ? 'No' : 'Unknown'),
        typeof p.fuelPrice === 'number' && kv('Regular', `$${p.fuelPrice.toFixed(3)}/gal`),
        p.safety?.length > 0 && kv('Safety signals', p.safety.map((s) => s.label).join(', ')),
      ),
      p.reasons.length > 0 && h('ul', { class: 'reasons' }, p.reasons.map((r) => h('li', {}, r))),
      h('h3', { class: 'sheet-sub' }, 'Bathroom'),
      h('p', { class: 'muted' }, avg ? `${avg}/5 from ${baths.length} rating${baths.length > 1 ? 's' : ''}` : 'No ratings yet.'),
      stars,
      h('h3', { class: 'sheet-sub' }, 'Known for'),
      finds.length ? h('ul', { class: 'reasons' }, finds.map((f) => h('li', {}, f.text))) : h('p', { class: 'muted' }, 'Nothing yet. Found something worth the stop?'),
      findForm,
      h('p', { class: 'note' }, sample ? 'Sample notes are made up. Yours are saved on this phone.' : 'Saved on this phone. Sharing with coworkers comes with the team server.'),
      h(
        'div',
        { class: 'actions' },
        h('a', { class: 'btn primary', href: navUrl(ctx.leg.from.label, ctx.leg.to.label, p), target: '_blank', rel: 'noopener' }, icon('nav'), 'Navigate with this stop'),
        /^https:\/\//.test(p.mapsUrl ?? '') && h('a', { class: 'btn', href: p.mapsUrl, target: '_blank', rel: 'noopener' }, 'Google Maps page'),
      ),
    );
  };
  draw();
  sheet(p.name, body, { onClose: () => location.hash.startsWith('#/trip/') && render() });
}

const kv = (k, v) => h('div', { class: 'kv' }, h('span', { class: 'muted' }, k), h('span', {}, v));

// ---------- settings ----------

function renderSettings() {
  const save = () => {
    if (!store.savePrefs(prefs)) toast('Could not save on this phone');
  };

  const priorityRows = FACTORS.map((f) =>
    h(
      'div',
      { class: 'prio' },
      h('span', { class: 'prio-label' }, FACTOR_LABELS[f]),
      h(
        'div',
        { class: 'seg', role: 'radiogroup', 'aria-label': FACTOR_LABELS[f] },
        ['Off', 'Normal', 'High'].map((label, level) =>
          h(
            'label',
            {},
            h('input', {
              type: 'radio',
              name: `prio-${f}`,
              checked: (prefs.priorities[f] ?? 0) === level,
              onchange: () => {
                prefs.priorities = { ...prefs.priorities, [f]: level };
                save();
              },
            }),
            h('span', {}, label),
          ),
        ),
      ),
    ),
  );

  const brandChips = h(
    'div',
    { class: 'chips' },
    BRANDS.map((b) =>
      h(
        'label',
        { class: 'chip' },
        h('input', {
          type: 'checkbox',
          checked: prefs.upsideBrands.includes(b.key),
          onchange: (e) => {
            prefs.upsideBrands = e.target.checked ? [...prefs.upsideBrands, b.key] : prefs.upsideBrands.filter((k) => k !== b.key);
            save();
          },
        }),
        h('span', {}, b.label),
      ),
    ),
  );

  const favList = h('ul', { class: 'list' });
  const drawFavs = () => {
    favList.replaceChildren(
      ...(prefs.favorites.length
        ? prefs.favorites.map((f) =>
            h(
              'li',
              { class: 'row static' },
              h('span', { class: 'cat-dot' }, icon(f.kind === 'fuel' ? 'fuel' : 'food')),
              h('span', { class: 'row-main' }, h('span', { class: 'row-title' }, f.label), h('span', { class: 'row-sub' }, [f.kind === 'fuel' ? 'Fuel brand' : 'Food', f.count ? `${f.count} in your expenses` : null].filter(Boolean).join(' · '))),
              h(
                'button',
                {
                  class: 'icon-btn',
                  type: 'button',
                  'aria-label': `Remove ${f.label}`,
                  onclick: () => {
                    prefs.favorites = prefs.favorites.filter((x) => x.key !== f.key);
                    save();
                    drawFavs();
                  },
                },
                icon('x'),
              ),
            ),
          )
        : [h('li', { class: 'row static muted' }, 'None yet. Add one below, or learn them from an expense report.')]),
    );
  };
  drawFavs();

  // Returns true when the place is new. One already on the list keeps its
  // entry but takes the higher visit count, so a report can refresh it.
  const addFav = (fav) => {
    const existing = prefs.favorites.find((f) => f.key === fav.key);
    if (existing) {
      if ((fav.count ?? 0) > (existing.count ?? 0)) {
        prefs.favorites = prefs.favorites.map((f) => (f.key === fav.key ? { ...f, count: fav.count } : f));
      }
      return false;
    }
    prefs.favorites = [...prefs.favorites, fav];
    return true;
  };

  const favInput = h('input', { placeholder: 'Chipotle, Speedway, Skyline…', maxlength: '60', enterkeyhint: 'done' });
  const favForm = h('form', { class: 'add-row', novalidate: true }, favInput, h('button', { class: 'btn', type: 'submit' }, 'Add'));
  favForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = favInput.value.trim();
    if (text.length < 2) return;
    const fav = favoriteFromText(text);
    if (!addFav(fav)) return toast(`${fav.label} is already on your list`);
    save();
    favInput.value = '';
    drawFavs();
  });

  // Expense report: read here, never uploaded or kept.
  const learned = h('div', {});
  const paste = h('textarea', { placeholder: 'Or paste lines from a statement or report', rows: '4' });
  const fileInput = h('input', {
    type: 'file',
    accept: '.csv,.tsv,.txt,text/csv,text/plain',
    onchange: async () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) return toast('That file is over 5 MB. Export a shorter date range.');
      showLearned(learnFromExpenses(await file.text()));
    },
  });
  const showLearned = (out) => {
    const options = [
      ...out.food.map((f) => ({ fav: { key: f.key, label: f.label, query: f.label, kind: 'food', count: f.count }, count: f.count, kind: 'Food' })),
      ...out.fuel.map((f) => ({ fav: { key: f.key, label: f.label, query: f.label, kind: 'fuel', count: f.count }, count: f.count, kind: 'Fuel' })),
      ...out.other.map((o) => ({ fav: { key: customKey(o.label), label: o.label, query: o.label, kind: 'food', count: o.count }, count: o.count, kind: 'Other' })),
    ];
    if (!options.length) {
      learned.replaceChildren(h('p', { class: 'note' }, `Read ${out.rowsRead} lines and found no repeat places. A CSV with a Merchant or Description column works best.`));
      return;
    }
    const onList = (o) => prefs.favorites.some((f) => f.key === o.fav.key);
    const boxes = options.map((o) => ({ o, box: h('input', { type: 'checkbox', checked: onList(o) || (o.count >= 2 && o.kind !== 'Other') }) }));
    const addBtn = h(
      'button',
      {
        class: 'btn primary',
        type: 'button',
        onclick: () => {
          let added = 0;
          for (const { o, box } of boxes) if (box.checked && addFav(o.fav)) added++;
          save();
          drawFavs();
          learned.replaceChildren(h('p', { class: 'note' }, `Added ${added} place${added === 1 ? '' : 's'}. The report itself was not kept.`));
        },
      },
      'Add ticked places',
    );
    learned.replaceChildren(
      h('p', { class: 'note' }, `Read ${out.rowsRead} lines. Tick the places you would go out of your way for:`),
      h(
        'ul',
        { class: 'list' },
        boxes.map(({ o, box }) => h('li', {}, h('label', { class: 'check' }, box, h('span', { class: 'row-main' }, h('span', { class: 'row-title' }, o.fav.label), h('span', { class: 'row-sub' }, `${o.kind} · ${o.count} time${o.count === 1 ? '' : 's'}${onList(o) ? ' · on your list' : ''}`))))),
      ),
      h('div', { class: 'actions' }, addBtn),
    );
  };

  const detour = h('input', {
    type: 'number',
    inputmode: 'numeric',
    min: '1',
    max: '20',
    value: String(prefs.maxDetourMin),
    onchange: () => {
      const n = Math.round(Number(detour.value));
      if (!(n >= 1 && n <= 20)) return toast('Pick 1 to 20 minutes');
      prefs.maxDetourMin = n;
      save();
    },
  });
  const breakEvery = h(
    'select',
    {
      onchange: () => {
        prefs.breakEveryMin = Number(breakEvery.value);
        save();
      },
    },
    [60, 90, 120, 150, 180].map((m) => h('option', { value: String(m), selected: m === prefs.breakEveryMin }, formatDuration(m * 60))),
  );

  const apiBase = h('input', { type: 'url', placeholder: 'https://trip-planner-api.<you>.workers.dev', value: settings.apiBase, inputmode: 'url' });
  const providerSeg = h(
    'div',
    { class: 'seg', role: 'radiogroup', 'aria-label': 'Where stops come from' },
    [
      ['demo', 'Sample data'],
      ['google', 'Google (team server)'],
    ].map(([value, label]) =>
      h(
        'label',
        {},
        h('input', {
          type: 'radio',
          name: 'provider',
          checked: settings.provider === value,
          onchange: () => {
            settings = { ...settings, provider: value };
            store.saveSettings(settings);
          },
        }),
        h('span', {}, label),
      ),
    ),
  );
  apiBase.addEventListener('change', () => {
    settings = { ...settings, apiBase: apiBase.value.trim() };
    store.saveSettings(settings);
    toast('Server address saved');
  });

  main.replaceChildren(
    topbar('Settings', { back: '#/' }),
    section('What matters on a stop', h('div', { class: 'card panel' }, priorityRows, h('p', { class: 'note' }, 'High counts double. Off ignores it.'))),
    section(
      'Your Upside brands',
      h(
        'div',
        { class: 'card panel' },
        h('p', { class: 'note first' }, 'Upside offers are personal and only live in the Upside app, so this app can’t read them. Tick the brands that usually pay you best. It starts with the fuel partners Upside names.'),
        brandChips,
      ),
    ),
    section(
      'Your usual places',
      favList,
      favForm,
      h('p', { class: 'note' }, 'Food places are searched along every drive (your top 3). Fuel brands get a boost.'),
    ),
    section(
      'Learn from an expense report (optional)',
      h(
        'div',
        { class: 'card panel' },
        h('p', { class: 'note first' }, 'Load a CSV export from your card or expense system and it counts the places you keep going back to. It is read on this phone only: nothing is uploaded, and the report is not kept. Only the names you tick are saved.'),
        h('div', { class: 'actions' }, h('label', { class: 'btn file-btn' }, icon('upload'), 'Choose a CSV', fileInput)),
        paste,
        h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onclick: () => paste.value.trim() && showLearned(learnFromExpenses(paste.value)) }, 'Read pasted lines')),
        learned,
      ),
    ),
    section('On the road', h('div', { class: 'card panel' }, field('Longest detour for a stop (minutes)', detour), field('Take a break about every', breakEvery))),
    section(
      'Where stops come from',
      h(
        'div',
        { class: 'card panel' },
        providerSeg,
        field('Team server address', apiBase, 'The Cloudflare Worker in this repo. It holds the Google key so the app never does.'),
      ),
    ),
    section(
      'Data on this phone',
      h(
        'div',
        { class: 'actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => confirm('Delete your bathroom ratings and finds on this phone?') && store.clear('crowd') && toast('Cleared') }, 'Clear my ratings and finds'),
        h('button', { class: 'btn', type: 'button', onclick: () => confirm('Delete your recent drives?') && store.clear('trips') && toast('Cleared') }, 'Clear recent drives'),
      ),
      h('p', { class: 'note' }, `Trip Planner ${VERSION}. Your settings, drives and notes stay in this browser. Planned places go only to Google, through the team server, to find the route.`),
    ),
  );
}

const customKey = (label) => `custom:${label.toLowerCase().slice(0, 50)}`;

function favoriteFromText(text) {
  const brand = brandOf(text);
  if (brand) return { key: brand.key, label: brand.label, query: brand.label, kind: 'fuel', count: 0 };
  const chain = foodChainOf(text);
  if (chain) return { key: chain.key, label: chain.label, query: chain.label, kind: 'food', count: 0 };
  return { key: customKey(text), label: text, query: text, kind: 'food', count: 0 };
}

// ---------- boot ----------

window.addEventListener('hashchange', render);
render();

const localhost = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && (location.protocol === 'https:' || localhost)) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
