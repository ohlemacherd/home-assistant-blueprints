# Home Assistant Blueprints

A small collection of Home Assistant automation and template blueprints,
plus one write-up. This is a hobby side-project, not a supported product -
see "Honest expectations" below.

## Contents

| Blueprint | Type | What it's for |
|---|---|---|
| [Smart Plug Charger Cutoff](#smart-plug-charger-cutoff) | Automation | Turns a smart plug off once whatever's charging on it is actually done. |
| [Effective Thermostat Target](#effective-thermostat-target-template-sensor) | Template sensor | One sensor: the number your thermostat is actually aiming for, in any mode. |
| [Vent/Register Modulation Against a Target](#ventregister-modulation-against-a-target) | Automation | Opens/closes a room's smart vents based on that room vs. a target, independent of the vent system's own occupancy logic. |
| [Debounced Outage Alert](#debounced-outage-alert) | Automation | Pages once per real outage instead of once per flip; recovery is quiet by default. |
| [Device Watchdog with Optional Auto Power-Cycle](#device-watchdog-with-optional-auto-power-cycle) | Automation | Notices a single point of failure going unreachable and can power-cycle it through a smart plug, with a daily cap. |
| [Escalating Left-Open Reminder](#escalating-left-open-reminder) | Automation | Three-stage escalating reminder for anything left open/on too long - a door, a pump, an appliance. |
| [Building an AI daily briefing on top of Home Assistant](docs/ai-briefing-writeup.md) | Write-up (not a blueprint) | The general shape of a scheduled-process + LLM + notify-service daily briefing, and the judgment calls that made it useful. |

---

## Smart Plug Charger Cutoff

**File:** [`blueprints/automation/ohlemacherd/charger-done-outlet-off.yaml`](blueprints/automation/ohlemacherd/charger-done-outlet-off.yaml)

Turns a power-monitoring smart plug off once whatever is charging on it has
actually finished, instead of leaving it trickle-charging indefinitely.
Optionally turns the plug back on at a set time every day, so the next
charge starts automatically without anyone touching Home Assistant.

Built for battery-powered things where "just unplug it when it's full"
doesn't happen in practice - ride-on toys, e-bikes, drill batteries, and
similar small packs on a dumb wall charger behind a smart plug.

### Why not just "energy used today > X kWh"?

That's the obvious first approach, and it doesn't hold up. A battery that
starts out partially charged can finish a genuine, complete charge using
well under whatever fixed kWh number you'd pick to mean "a real charge
happened." Set that number low enough to catch a small top-up and it also
fires when nothing meaningful was ever plugged in; set it high enough to
avoid false positives and a partial charge never trips it at all.

This blueprint uses a charging-session flag instead: the moment live power
draw crosses a "this is actively charging" threshold, a helper you create
is switched on. Only once that flag is on *and* the draw has then stayed
under a lower "this is just floating" threshold for a chosen number of
minutes does the plug switch off and the flag reset. It cares whether real
charging current was ever seen, not how much energy it added up to - so a
short top-up on a mostly-full battery counts exactly the same as a long
charge from empty.

### What you need before importing

- A smart plug that reports **live power draw** (watts) as a sensor, not
  just on/off. Most energy-monitoring smart plugs do this.
- A daily/today **energy total** sensor from the same plug (kWh) - most
  energy-monitoring plugs expose this too. It's only used to word the
  notification; it plays no part in the on/off decision.
- One **Toggle helper**, created ahead of time, dedicated to this
  automation: **Settings -> Devices & services -> Helpers -> Create
  helper -> Toggle**. If you're using this blueprint on more than one plug,
  create a separate helper for each - don't share one across plugs.

### Inputs, in plain language

| Input | What it is |
|---|---|
| **Smart plug** | The switch entity that controls power to the charger. |
| **Power sensor** | The plug's live power-draw sensor, in watts. |
| **Today's energy sensor** | The plug's daily energy-total sensor, in kWh. Notification text only. |
| **Charging-session helper** | The Toggle helper you created above. |
| **Charging power threshold (W)** | Draw above this many watts counts as "actively charging." Default 15 W - check your power sensor's history during a real charge and set this comfortably above idle draw and below bulk-charge draw. |
| **Done power threshold (W)** | Once charging has started, draw under this many watts means the charger has dropped to float/trickle. Default 5 W. |
| **Minutes under threshold before calling it done** | How long the draw has to stay under the done threshold before the plug switches off. Default 30 minutes. |
| **Turn the plug back on automatically?** | Off by default - the plug just stays off until switched back on by hand (or its own button). Turn on to enable the daily restore time below. |
| **Daily restore time** | Only used if the above is enabled. Default 06:00. Harmless to fire with nothing plugged in. |
| **Notify service** | Which `notify.*` service to call when the plug switches off, e.g. `notify.mobile_app_your_phone`, or a notify group. Defaults to `notify.notify` (a Home Assistant persistent notification, no push required). |

---

## Effective Thermostat Target (Template Sensor)

**File:** [`blueprints/template/ohlemacherd/effective-thermostat-target.yaml`](blueprints/template/ohlemacherd/effective-thermostat-target.yaml)

Creates one sensor: the temperature your thermostat is actually trying to
hit right now, as a single number, no matter which of its modes (heat,
cool, or heat_cool/auto) it happens to be in.

### Why this exists

A `climate` entity's target lives in a different attribute depending on its
mode - `temperature` in plain heat or cool mode, `target_temp_low` /
`target_temp_high` in heat_cool/auto mode - so any automation reading "the
number the thermostat is aiming for" ends up reading the wrong attribute
the moment the mode changes.

This is especially easy to trip over if you also run a smart-vent system
(Flair, Keen, and similar) in a manual or non-cloud mode alongside a smart
thermostat. Those systems normally compute their own per-room target from
occupancy and activity - but a manual mode takes that computation away and
marks every room-level entity unavailable by design, so any automation
still reading the vent system's own "room target" concept quietly breaks.
Reading the thermostat directly - the one appliance that's always
authoritative about what it's trying to do - sidesteps that failure mode
and gives every room automation in the house one place to look.

Pair it with **Vent/Register Modulation Against a Target** below.

### What you need before importing

Just a `climate` entity. This is a **Template helper**, not an automation:
**Settings -> Devices & services -> Helpers -> Create helper -> Template ->
Template a sensor**, then choose "use a blueprint."

### Inputs, in plain language

| Input | What it is |
|---|---|
| **Thermostat** | The climate entity to read the active target from. |
| **Sensor name** | Name for the resulting sensor. Change it if you use this blueprint more than once (multi-zone home). |
| **"Actively heating" value** | The hvac_action value meaning "furnace is running" - almost always `heating`. Only matters in heat_cool/auto mode. |
| **Sanity floor / ceiling** | If the computed target ever comes out outside this range, the fallback value is reported instead. Defaults 60-80. |
| **Fallback value** | Reported when the computed target fails the sanity check. Default 70. |

---

## Vent/Register Modulation Against a Target

**File:** [`blueprints/automation/ohlemacherd/vent-modulation-to-target.yaml`](blueprints/automation/ohlemacherd/vent-modulation-to-target.yaml)

Opens a room's smart vents/registers when the house's active heating or
cooling would actually help that room, and closes them once the room is
within a hysteresis band of its target. Does nothing while the system is
idle - a vent stays exactly where it last was rather than being forced open
or shut for no reason.

Written for anyone running smart vents (Flair, Keen, or similar) in a
manual/non-cloud mode alongside a smart thermostat. This automation only
needs a room temperature sensor, a numeric target, and the thermostat's own
`hvac_action` - it never touches the vent system's own occupancy or
activity concepts, so it keeps working the same whether the vent system is
in its normal cloud mode or a fully manual one.

### What you need before importing

- A `climate` entity for the thermostat driving the system.
- A numeric target-temperature sensor for this room - the **Effective
  Thermostat Target** blueprint above works well here, or any numeric
  sensor/`input_number`.
- This room's own temperature sensor.
- One or more `cover` entities controlling this room's vents.
- One instance of this blueprint per room.

### Inputs, in plain language

| Input | What it is |
|---|---|
| **Thermostat** | Drives the direction (heating/cooling/idle) via its hvac_action attribute. |
| **Target temperature sensor** | What this room should be at. |
| **Room temperature sensor** | What this room actually is. |
| **Vents/registers** | The cover entities to move. |
| **Position type** | Plain position or tilt position - matches your specific vent hardware. |
| **Open value / Closed value** | The position numbers meaning fully open/closed. Defaults 100/0. |
| **Hysteresis (degrees)** | How far past target, in the helpful direction, before the vent opens. Default 1°. |
| **Settle time (minutes)** | A short debounce on the room-sensor trigger only, so one noisy reading doesn't flip the vent. Default 2. |

---

## Debounced Outage Alert

**File:** [`blueprints/automation/ohlemacherd/debounced-outage-alert.yaml`](blueprints/automation/ohlemacherd/debounced-outage-alert.yaml)

Pages once per real outage instead of once per flip. Written for anything
that flaps - a camera stream that stalls and recovers on its own, an
integration that drops overnight and comes back before anyone's up to see
it - where a plain "notify on state change" automation turns one outage
into a stream of "it's down" / "it's back" pushes.

The fix is two rules: a state has to hold for a confirmation window before
it counts as a real outage, and once an outage has paged, it doesn't page
again until it has actually recovered and gone bad a second time. Recovery
itself is quiet by default - routed to a persistent notification instead of
a push, unless you turn push-on-recovery on.

This watches one entity's state, not an arbitrary numeric trend. If what
you have is a raw number, turn it into a binary/problem sensor first (a
Template or Threshold helper) and point this at that.

### What you need before importing

- Any entity whose state indicates up/down, and the exact string value that
  means "down."
- One **Toggle helper**, dedicated to this automation, remembering whether
  the current outage has already been announced.

### Inputs, in plain language

| Input | What it is |
|---|---|
| **Entity to watch** | Any entity with an up/down-shaped state. |
| **"Down" state** | The exact state value meaning trouble, e.g. `unavailable`. |
| **Minutes before it counts as a real outage** | How long the down state must hold continuously first. Default 10. |
| **What to call this** | Used in notification text. |
| **"Already paged" helper** | The Toggle helper above. |
| **Notify service (down alert)** | e.g. `notify.mobile_app_your_phone`. |
| **Also push a notification on recovery?** | Off by default - recovery is logged, not pushed. |

---

## Device Watchdog with Optional Auto Power-Cycle

**File:** [`blueprints/automation/ohlemacherd/device-watchdog-power-cycle.yaml`](blueprints/automation/ohlemacherd/device-watchdog-power-cycle.yaml)

For a single point of failure that lives on a smart plug - a hub or bridge,
a Raspberry Pi, a Wi-Fi extender, anything where "someone pulls the plug
and puts it back" is the known fix for it going deaf. Watches one or more
entities that only report data when the device is reachable. When enough
of them go unavailable for a confirmation window, it notifies once. If the
outage keeps going past a second, longer window, it can optionally
power-cycle the device through a smart plug and notify that it did so.

Two safety rails: a daily cap on auto power-cycles (a device that's
genuinely dead just gets you a notification instead of endless
power-cycling), and the outage only gets announced once per occurrence.
Auto power-cycling is opt-in and off by default - leave it off to use this
purely as an offline notifier.

### What you need before importing

- One or more entities that go unavailable when the device is unreachable.
- One **Toggle helper**, dedicated to this automation ("already notified").
- If you want auto power-cycling: a `switch` entity for the smart plug, and
  one **Counter helper**, dedicated to this automation (resets itself at
  midnight).

### Inputs, in plain language

| Input | What it is |
|---|---|
| **Entities to watch** | Go unavailable when this device is unreachable. |
| **"Unreachable" state** | Default `unavailable`. |
| **How many must be down at once** | Guards a single flaky entity from being mistaken for the whole device. Default 1. |
| **Minutes down before the first notification** | Default 5. |
| **What to call this device** | Used in notification text. |
| **"Already notified" helper** | The Toggle helper above. |
| **Notify service** | Where the alerts go. |
| **Automatically power-cycle after the second window?** | Off by default. |
| **Smart plug powering the device** | Only touched when auto power-cycle is on. |
| **Minutes down before an auto power-cycle** | Should be longer than the first window. Default 30. |
| **Seconds to leave the plug off** | Default 10. |
| **Daily power-cycle counter** | The Counter helper above; reset to 0 every midnight automatically. |
| **Max auto power-cycles per day** | After this many, it keeps notifying but stops power-cycling. Default 2. |

---

## Escalating Left-Open Reminder

**File:** [`blueprints/automation/ohlemacherd/escalating-left-open-reminder.yaml`](blueprints/automation/ohlemacherd/escalating-left-open-reminder.yaml)

A door left open, a garage that never closed, a pump running far longer
than a normal cycle, a space heater still on an hour after everyone left
the room - all the same shape of problem: a binary state that's fine
briefly and a real problem if it doesn't clear. A single fixed-delay
reminder either nags people mid-grocery-unload or waits so long it's
useless as a safety alert; this uses three escalating stages instead, so
normal use never triggers anything past the quiet first stage, and
something genuinely left alone gets progressively louder.

Stage 1 is a quiet, default-priority notification. Stage 2 is high
priority. Stage 3 is high priority and sticky. Each stage reuses the same
notification tag, so a later stage replaces the earlier banner instead of
stacking three. The moment the entity clears, the banner is dismissed
automatically; a real "it's clear" push is optional and off by default.

### What you need before importing

Any entity with a "bad" and "ok" state - typically a `binary_sensor`
(door/window contact, a problem or running sensor).

### Inputs, in plain language

| Input | What it is |
|---|---|
| **Entity to watch** | The sensor to monitor. |
| **"Left open/on" state** | Default `on`. |
| **"Cleared" state** | Default `off`. |
| **Word describing the bad state** | e.g. "open," "running," "on" - used in notification text. |
| **Stage 1/2/3 delay (minutes)** | Defaults 1 / 5 / 15. |
| **Notify service** | Where the alerts go. |
| **Also push a notification when it clears?** | Off by default - clearing just dismisses the banner. |

---

## Honest expectations

These are blueprints pulled out of a personal Home Assistant setup and
generalized, published to see whether they're useful to anyone else. They
have not been tested across the wide range of integrations, entity
behaviors, and companion-app quirks that exist in the wild - if something
about your specific hardware doesn't map cleanly onto the entities these
expect, you may need to adjust an input or the automation itself. Issues
and pull requests are welcome, but there's no support SLA behind this - it's
a nights-and-weekends project.

If any of this saved you from writing it yourself and you'd like to say
thanks:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?logo=buy-me-a-coffee&logoColor=white)](https://buymeacoffee.com/ohlemacherd)

## License

[MIT](LICENSE)
