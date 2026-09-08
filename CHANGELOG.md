# Changelog

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
