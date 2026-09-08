# More ideas, by the hardware they need

The blueprints in this repo are the pieces that generalized cleanly. This is
the rest of what runs in the same house, grouped by the hardware each one
depends on, so you can see what a given device makes possible before you buy
it - or steal the idea for hardware you already have. None of these are
blueprints (yet); where one is, it's linked. Ask in an issue if you want one
turned into a blueprint and I'll see whether it survives generalizing.

## No special hardware

- **Cloud health sensor: "is it the internet, or the house?"** One template
  sensor with five anchors from independent vendors (an energy monitor, a
  camera, a pet collar, a weather feed, one smart-vent puck) plus the remote
  connection state. One anchor down = *degraded*; connection lost plus two
  or more = *internet down*. Answers the question you actually have during an
  outage. Lesson learned the hard way: anchor on an entity that is available
  in every mode of its integration - a vent system's structure entity goes
  unavailable *by design* in manual mode and reads as an outage forever.
- **Backup age in hours.** A template sensor from the backup integration's
  last-successful timestamp; -1 means never. A silently stopped backup is
  the failure mode nobody notices, and this makes it a number on a card.
- **Dead-sensor watchdog.** A daily sweep that lists battery-class sensors
  whose state hasn't changed in N days and notifies only when the *set*
  changes - so a dead contact sensor is one line, once, not a daily nag.
- **Notification routing script.** Every automation calls one script with a
  `route` (page / brief / log) instead of a notify service directly. Pages
  reach the phone; briefs go into a daily summary; logs are just the logbook.
  Changing who gets what is one edit, and it's how the "recovery is quiet"
  rule in the Debounced Outage Alert blueprint got enforced house-wide.
- **Dinner picker on the wall tablet.** Two buttons named by their source -
  "Pick from the week" (the planned menu) and "Cook what we have" (the
  pantry inventory) - and the [busy-button](dashboard-patterns.md) so the
  slow one visibly works. The first version's buttons were "Roll the menu" /
  "Cook what we have" and nobody could tell which looked where.

## A power-monitoring smart plug (Kasa EP25 or similar)

- [**Charger cutoff**](../blueprints/automation/ohlemacherd/charger-done-outlet-off.yaml)
  (blueprint) - the ride-on-toy battery story.
- [**Device watchdog with power-cycle**](../blueprints/automation/ohlemacherd/device-watchdog-power-cycle.yaml)
  (blueprint) - a hub or Pi that goes deaf gets one notification, then one
  capped power-cycle.
- **Where the plugs go, ranked.** The devices worth putting on a plug are the
  ones whose known fix is "pull it and put it back": the Zigbee bridge first,
  then the Pi running the automations (which can't cycle itself - use the
  plug's own schedule for that one), then the bridge for any other radio.
  Not the router or the modem: modern gateways reboot themselves on watchdog
  faults, and a plug on the router means every reboot also takes out the thing
  that would tell you about it.

## A whole-home energy monitor (Sense or per-circuit CT clamps)

Appliance detection turns dumb appliances into sensors without touching them:

- **Sump pump running continuously.** A normal cycle is seconds; five minutes
  of continuous draw means the pit is filling faster than it drains - storm,
  stuck float, dying pump. Flood alert with no water sensor in the pit.
- **Sump pump sensor offline.** The detector for the detector: if the pump
  entity goes unavailable for 12 hours the monitor has lost or reclassified
  it, and you are blind on flood status. Notify.
- **Fridge door left open.** Compressor draw continuous for 35+ minutes, well
  past a normal 15-20 minute cycle, almost always means the door is ajar.
- **Laundry done.** Washer/dryer draw drops to zero after a run - notify once
  per cycle, not once per second of the dryer's cool-down pulses.
- **Weekly energy snapshot.** Stamp the weekly total into a helper five
  minutes *before* the meter's week rolls over (Sunday 23:55, not Monday
  00:05 - the first version snapshotted the new week's zero every single
  week and the trend card read "building trend data" forever).

## A smart thermostat with remote sensors (Ecobee)

The thermostat's `hvac_action` and its room sensors are the backbone of
every comfort automation here:

- [**Effective thermostat target**](../blueprints/template/ohlemacherd/effective-thermostat-target.yaml)
  (blueprint) - the one number every room automation reads.
- **Manual-hold detection.** The moment a *human* changes the setpoint (wall,
  app, dashboard), a hold helper switches on and every give-back automation
  stands down until the next morning's reset - so the house never fights a
  person. Automations that write the thermostat register themselves as
  writers so their own writes don't count as human.
- **Overnight setpoint restore.** Someone cranks the AC at bedtime; by 02:00
  the downstairs is at 62°F. If the cool setpoint was pushed below a floor
  and the bedroom is now cold, restore it. Respects the hold unless it was
  engaged in the bedtime window *and* the room is actually cold.
- **Reactive comfort call.** Motion in the living areas during waking hours
  plus two or more rooms below 66°F (or above 74°F) - the forecast was wrong
  - switches to heat_cool with a sane band. Outdoor-gated: a cold house on a
  warm day recovers by *not* cooling, never by burning gas in June.
- **Forecast-driven mode selection.** Morning / noon / evening passes that
  pick heat, cool or heat_cool from the day's forecast, notify only on an
  actual change, and skip when a human has adjusted things.
- **Hour-aware bedtime pre-cool ladder.** Step the cool setpoint down through
  the evening so the bedroom is cold at lights-out without running the
  compressor at 15:00 for a room nobody's in until 22:00. Every floor-guard
  in the house has to know the ladder's timeline, or it re-raises the
  setpoint the ladder just lowered - that bug took a night to find.

## Smart vents (Flair, Keen) alongside that thermostat

- [**Vent modulation against a target**](../blueprints/automation/ohlemacherd/vent-modulation-to-target.yaml)
  (blueprint), one instance per room.
- **Hard safety floor and ceiling per kids' room.** Below 65°F or above 73°F
  for 15 minutes: notify unconditionally *first*, then move the vent in the
  helpful direction with `continue_on_error`, so a cloud failure can never
  swallow the alert. Separate from the comfort logic on purpose - safety is
  not a preference.
- **Master vents held open during cooling.** One room is allowed to be as
  cold as the system can make it; its vents never close while the AC runs.
  The rule nobody re-litigates.
- **Put the vent system in manual mode and keep the thermostat as the only
  source of truth.** The vent vendor's cloud will otherwise write your
  thermostat's setpoint from its own room targets - 69→72, eleven times in
  one day, before anyone noticed.

## Door/window contact sensors (Hue Secure or any Zigbee contact)

- [**Escalating left-open reminder**](../blueprints/automation/ohlemacherd/escalating-left-open-reminder.yaml)
  (blueprint) - front and garage-entry doors.
- **Gentle single reminder for the door that's open on purpose.** The patio
  slider gets one quiet note at 15 minutes and no nag, because kids in the
  yard is the normal case.
- **Night door alert.** An exterior door opening during sleep hours is
  abnormal - immediate push, no escalation.
- **Toddler-safety ladder on the basement door.** Three tiers of chime and
  push when the basement door opens with a small child home, distinct sound
  from every other door so the household learns one sound = one meaning.

## Multiroom speakers with an announcement API (Sonos)

- **Door chirp.** Every exterior door open gets a short descending two-note
  chirp on the living-area speakers - the security-panel gesture. Volume is
  computed per speaker (current level + 8, clamped 15-30) because the
  announce API's volume is absolute, and the clip plays over whatever is on
  without stopping it. Quiet overnight. Two lessons that cost evenings: the
  announce path accepts MP3/WAV and silently drops AIFF (fetched, status OK,
  no sound), and the file must be served with a MIME type the speaker
  accepts - ship MP3.
- **Rising chime = attend, falling chime = acknowledged.** The basement door
  rises; the exterior doors fall. Don't reuse a sound.

## Cameras through go2rtc, plus an LLM with vision

- **Person alerts that describe the scene.** On a camera's own person event,
  grab the warm go2rtc frame, ask a vision model to classify and describe,
  push the snapshot with one line. Suppress when the model says nothing is
  there. Per-camera cooldowns so kids in the yard ping once, not every 30 s.
- **Package still on the porch at dusk.** One check at sunset.
- **Patio before rain or wind.** Umbrella open in wind, grill cover off,
  cushions out, fire-pit lid off - four questions, *one* automation, one
  vision call, because they all look at the same frame. Triggered by the
  forecast, not a clock. Only ask a camera about what it renders large and
  central; the first version asked a driveway camera about a curb at the top
  edge of its frame and was wrong for weeks.
- **Stream health watcher.** Every five minutes, read each stream's producer
  byte counter; unchanged means stuck. Paired with the
  [Debounced Outage Alert](../blueprints/automation/ohlemacherd/debounced-outage-alert.yaml)
  so a reboot costs zero pushes.
- **Keep the outdoor streams warm** with a frame pull every 30 s, so the
  person alert has a fresh frame instead of a 40-second cold WebRTC connect.
  Battery cameras excepted - never keep a battery camera warm.

## A robot vacuum with an integration (Ecovacs, Roborock)

- **Finished-cleaning notification** with the floor and the run length.
- **Cleaning ticks the chore.** When the vacuum finishes a floor, the
  household chore for that floor is marked done in the chores app (Grocy
  here). The chore list stops asking about things that already happened.

## A wall tablet (Pixel Tablet, kiosked)

- [Dashboard patterns](dashboard-patterns.md): the room tile, the busy
  button, and five measured facts about the sections layout engine.
- **Per-device density.** Phones are always in the detailed layer; the wall
  tablet has a simple/detailed toggle, because the counter is a glance
  surface for everyone and the phone is for whoever's holding it.

## Smart ceiling fans

- **Fan speed from room temperature**, relative to that room's target, with
  a sleep window that never changes the speed while someone's asleep.
- **Fan off when the room is unattended** for 30 minutes, daytime only - an
  empty-room fan cools nobody. Deliberately never turns a fan *on*: with no
  occupancy sensor in that room, on stays human-owned.

## An LLM API and a scheduler

- [Building an AI daily briefing on top of Home Assistant](ai-briefing-writeup.md)
  - the shape and the judgment calls, provider-agnostic.
