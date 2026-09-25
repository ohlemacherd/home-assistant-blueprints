# Changelog

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
