# Changelog

## 2026-10-09

- **AI Daily Briefing (behaviour fix):** the day an event is on is now the LOCAL date it starts, not the first ten characters of the string the calendar sent, so a feed that reports in UTC no longer puts an evening event on tomorrow. An all-day event is listed on every day it covers ("day 2 of 4") instead of vanishing after its first morning. A timed event that has already ended is dropped from today's list and one that is under way is labelled, so an evening run never reads this morning's appointment as upcoming. To-do due dates are read the same way, and an overdue item says so. If your briefings looked right before, they will read the same; if a multi-day trip or an evening run ever read wrong, this is why.
- Fourteen new blueprints and two docs. Nothing else already published changed behaviour.
  - **Cold-Morning Prompt Before Your Alarm** (automation): 20-40 minutes before the phone's alarm, below a temperature, one push with a button that runs a script you choose. It offers; a person taps; nothing starts on its own.
  - **Integration Reload Watchdog** (automation): enough of one integration's entities unavailable together → reload its config entry, then a push with a Restart button repeated every half hour while the outage lasts, then an optional automatic restart inside waking hours, capped per outage.
  - **Cold Snap Tire Pressure Estimate** (automation): an estimate from outdoor temperature against the fill-day temperature, once per N days in the cold months, with the limits stated in the message.
  - **Weekly Silent-Failure Digest** (automation): automations OFF minus an allow-list, battery devices gone unavailable, unavailable entities by domain, a stale automatic backup; silent when healthy.
  - **Trash Night Reminder (holiday-shift aware)** (automation): the night before pickup, shifted a day when a named holiday falls on or before pickup day that week; optional shift-week Toggle.
  - **Frost Tonight - an Outdoor Chore Before the Freeze** (automation): daily hourly-forecast read in chosen months; a to-do item is the season's memory, reopened the next season.
  - **Night Brightness Cap** (automation): corrects an automation-commanded turn-on above a cap during a night window, in steps; by default never a hand on the switch (nor a clock-started routine, which carries no parent).
  - **Room Temperature Safety Alert** (automation): floor and ceiling with a hold, never gated, a persistent record that clears itself, and an hourly check that alerts when the sensor has been unavailable or silent for hours.
  - **Manual Change Hold** (automation): when a person adjusts a device by hand, a Toggle your automations respect turns on; released on the next off-to-on, at a time of day, or after N hours. Tells a hand from an automation by the change's context, with a writer list for integrations that drop it.
  - **Voice Assistant Tool - Set a Reminder** (script) and **Voice Assistant Reminder Delivery** (automation): "remind me at 7:30" and "set a timer for 10 minutes" for an LLM voice assistant. The tool writes to a Local Calendar and returns at once; the delivery pushes with Snooze and Done buttons, and waits short reminders out in memory because the calendar trigger refreshes every 15 minutes.
  - **Voice Assistant Tool - Weather Forecast** (script): the daily or hourly forecast with units, for an assistant whose built-in weather answer is current-conditions only.
  - **Voice Assistant Tool - Open an App on the TV** (script): opens a listed app on an Android TV Remote device, or a YouTube search.
  - **Camera Check on a Schedule** (automation): runs an AI Camera Yes/No Check at a time or at sunrise/sunset on chosen weekdays, pushes on the answer you name, ticks a to-do item on the other, stays silent when the camera couldn't see.
  - `docs/voice-assistant-tools.md`: a script exposed to Assist is a tool; what the model already has; seven rules; a short example. `docs/camera-recipes.md`: five camera checks with the questions that worked.
- README: the contents table is one ranking of 26, ordered from the most unusual to the most basic; the requirements table has a row per new blueprint; a glossary line for Assist; the briefing's Calendars row states the day rules.

## 2026-09-25

- AI Daily Briefing: the default **Who this is for** line is now generic ("the people in this household, reading it on a shared screen or their phones"). If you never changed that input, the prompt wording changes on your next run; set the input to keep the old line.
- Docs and input examples: house-specific names, rooms and measurements replaced with generic ones. No other behaviour change.

## 2026-09-24

Six new blueprints, plus a companion template sensor. Nothing already published changed behaviour.

- **Routed Notifier with Quiet Hours and a Daily Page Budget** (script): one script every automation calls instead of a notify service. Routes `page` / `brief` / `log` / `critical`; quiet hours, a mute toggle, the phone's Do Not Disturb and a daily page cap hold a message in a record (logbook, event, notification bell) instead of dropping it. Every call returns its outcome.
- **Dead Device Sweep** (automation): an hourly sweep of every battery device (or one label, or a list) that pages only when the dead set changes, each device at most once a day, with one line for an integration when several of its devices die together.
- **Night Light Reconnect Guard** (automation): turns a light back off when it reconnects ON by itself overnight. Matches only `unavailable -> on`, ignores restarts and reloads, and stands down for a person, another automation, or an occupied room.
- **Consumable Wear Tracker** (automation) and **Consumable Life Used** (template sensor): counts real uses or real runtime on a Counter helper, due at the usage or age limit (optional seasonal age limit), and only a recorded swap (button, ticked to-do item, or event) resets it.
- **AI Camera Yes/No Check** (script, needs 2025.8): one snapshot, one AI Task call, the answer written to a Toggle. The model describes the scene and says whether it is usable before it answers; an unusable image leaves the Toggle as it was.
- **Proof-of-Run Equipment Check** (automation): for a sump pump, a generator, a softener, a vacuum. A real run is written to a helper and can count as the periodic test; only silence past a threshold asks for a test by hand.
- README: the contents table is one ranking again, with the new blueprints placed by audience (the smart-vent pair is now 12 and 13); the requirements table, a glossary line and the "What to expect" pointer updated; Debounced Outage Alert and Device Watchdog point to Dead Device Sweep for whole-house coverage.

## 2026-09-08

First public version: seven blueprints, two button-card templates, one usage doc.

Same day, after review by three readers (a beginner, an intermediate user and a blueprint author):

- All blueprints: `homeassistant: min_version` declared; `notify.persistent_notification` is the default notify service everywhere; `max_exceeded: silent` where a chatty trigger could overlap itself.
- Vent modulation: a room or target sensor going `unavailable` no longer reads as 0 (which opened every vent in heating); both numbers must be numeric before anything moves.
- AI Daily Briefing: the failover result was being discarded by variable scoping - the output is now shaped and delivered inside the branch that produced it; `%-d` (glibc-only) removed; a to-do item with no summary no longer blanks the task list.
- Debounced outage alert: `unavailable -> unknown` no longer counts as a recovery; restart caveat documented.
- Device watchdog: plug and counter are optional inputs; `mode: queued` so a recovery during the power-cycle delay is not dropped; midnight uses `counter.set_value 0`, not `reset`; one power-cycle per continuous outage, stated plainly.
- Charger cutoff: refuses to act on inverted thresholds; availability caveat documented.
- Left-open reminder: the banner clears on any exit from the bad state (including the sensor dying); Companion-app extras are gated behind an input.
- Effective thermostat target: `auto` mode handled like `heat_cool`; `device_class`/`state_class` set; `triggers:` spelling.
- Dashboard templates: `entity` guarded in every room-tile template; dark-palette note; `perform-action` in the example; scenes need a script wrapper.
- README: a plain-English glossary, a dropdown troubleshooting note, tested-on version, this changelog.
