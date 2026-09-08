# Dashboard patterns from a wall tablet + phone setup

Not blueprints - these are the pieces of a Lovelace dashboard that turned out
to be reusable, and the platform facts I had to learn by measuring. The whole
dashboard is a `sections` layout driven by
[button-card](https://github.com/custom-cards/button-card) templates and a few
`custom:mushroom-*` cards. It runs on a kiosked Pixel Tablet on the kitchen
counter (1280x800 CSS at DPR 2) and on phones.

The two templates in [`dashboard/templates/`](../dashboard/templates/) drop
into any button-card setup. Everything below them is the reasoning.

## 1. Room tile: temperature, delta to target, vent position, one colour

[`dashboard/templates/room-tile.yaml`](../dashboard/templates/room-tile.yaml)

One tile per room, and it answers three questions in one glance:

- **How warm is it?** Big number.
- **Is that a problem?** The tile's colour, driven by the delta to the room's
  target: green within 1.5 degrees, amber past that, red/blue past 3. The
  background gradient and the icon chip use the same colour, so a wall of
  tiles reads as a heat map from across the room.
- **Is anything being done about it?** On phones (or with a "detailed" toggle
  on the tablet) a small bar shows the smart vent's average position and the
  target it is chasing; rooms without a vent say "follows main floor".

The target comes from one numeric entity you pass in. Mine is the Effective
Thermostat Target sensor from this repo, so every tile agrees with the
thermostat.

Density is per device, not per user: a phone viewport is always in the
detailed layer, the tablet keeps a toggle, because the tablet is a glance
surface for the whole household and the phone is a tinkering surface for the
person holding it.

## 2. Busy button: a scene tile that says so while it works

[`dashboard/templates/busy-button.yaml`](../dashboard/templates/busy-button.yaml)

Every scene tile used to be a dead rectangle: tap "Goodnight" (nine lights,
four switches, each with `continue_on_error`, so an unreachable bulb burns its
full timeout) and nothing acknowledges the tap until the room changes. So
people tap again, which runs the script again.

A script entity's state is `on` for exactly as long as it is running, so
pointing the tile's `entity` at the script it calls gives you the progress
signal for free. The icon pulses, an amber ring appears, and a "Working..."
caption shows in a **permanently reserved 12px row** so the tile never changes
height and the grid never jumps under your finger. Deliberately no spinner:
tiles are recognised by their icon.

## 3. One pick, not four justifications

If a screen recommends something (tonight's dinner, today's workout, which
scene to run), only the recommended option gets the "why" block. The others
get a preview heading ("If you ran X instead"). Same data, same sentence
generator - but four equally confident "why this" blocks read as four
recommendations, which is the same as none.

## 4. Five things the sections engine will not tell you

Every one of these cost me an evening. Measured on a real browser against the
live dashboard, not reasoned about.

1. **There is no view-level `zoom`.** `card_mod` at view level is a silent
   no-op on `type: sections` views (`hui-sections-view` is not what it
   patches). If you want a "counter legibility" scale for a wall tablet you
   scale `font-size` values per element. Padding, icons and gaps do not come
   along.
2. **Media queries measure the window; layout gets the view.** HA's sidebar
   takes 256px expanded / 56px collapsed. A 1000px breakpoint selected my
   tablet layout on a 1254px window and then handed it 998px, so the columns
   wrapped. Set breakpoints at `layout width + sidebar` (1256 for me). A
   kiosked tablet has no sidebar, so window == view there.
3. **Column count is computed, not declared.** `max_columns: 4` is a ceiling;
   HA derives the real count from width at roughly 320px per column. At 1254px
   you get three, and a `column_span` layout that assumed four puts the third
   section on a new row. Design for three columns on a 1280-wide tablet.
4. **A card nested in `custom_fields` resolves templates in the parent's
   context.** `entity` is the parent's entity (or nothing). One `entity.state`
   in a nested field threw `ButtonCardJSTemplateError` across all seven views.
   Inside nested fields use `states['...']` or `hass...`, never bare `entity`.
5. **HA caches YAML dashboard config in memory, and refresh does not bust
   it.** Not a browser cache - no service worker involved; it is server side.
   Reloading the page, `homeassistant.reload_all`, and Developer Tools ->
   "All YAML configuration" all keep serving the old dashboard. What works is
   the frontend's own websocket call, from the browser console:

   ```js
   const hass = document.querySelector('home-assistant').hass;
   await hass.connection.sendMessagePromise({type: 'lovelace/config', url_path: 'YOUR-DASHBOARD-URL', force: true});
   ```

   then a normal reload. "I refreshed and it looks fine" is not evidence a
   YAML change landed.

Two smaller ones: `triggers_update` was removed in button-card 7.x and any
copies you still have are inert (the card auto-subscribes to every entity a
template dereferences); and a section that shares a column must never be sized
`100vh` - HA stacks the next section beneath it and the taller the screen, the
further it pushes that section off the fold.

## 5. What a one-screen counter panel has room for

Home on a 1280x800 tablet fits a greeting line, a one-line briefing strip,
a thermostat card, six scene tiles, seven half-height room tiles and a media
block - and not the dinner card, which is the card the household uses most.
Halving room tiles saved 457px and un-stretching the nav rail saved 221px;
the remaining ~535px is a design decision (what earns a place on a glance
surface), not a tuning problem. Decide that explicitly rather than letting
the sections engine wrap whatever does not fit.
