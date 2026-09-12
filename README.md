# Home Assistant Blueprints

One house's second brain, taken apart into pieces you can import. The
centre of it is a daily AI briefing that makes the small decisions - what
matters today, what can wait, what needs a nudge before an event - so the
people in the house don't spend attention on them. Around it: the
automations that fell out of building that house, generalized. A hobby
side-project, not a supported product - see "Honest expectations" below.

## If you're new to this

- A **blueprint** is a ready-made automation with the entity names left blank; you import it once and fill in the blanks from dropdowns. No YAML editing.
- An **entity** is anything Home Assistant can see or control - `switch.garage_plug`, `sensor.garage_plug_power`, `binary_sensor.front_door`.
- An **integration** is what connects a brand or protocol - TP-Link for Kasa plugs, Hue for Hue devices. *Core* integrations come with Home Assistant; *HACS* is a separate community store you install first (hacs.xyz).
- A **helper** is a small entity you create yourself under Settings -> Devices & services -> Helpers: a Toggle (on/off memory), a Counter, a Text box. Two of the blueprints below ask you to create one first; it takes 30 seconds.
- A **notify service** is where a message goes - `notify.mobile_app_<your phone>` if you have the Companion app, or `notify.persistent_notification` (built in, shows under Settings -> Notifications).
- **If an entity doesn't appear in a dropdown**, the input is filtered by device class (a power sensor, a contact sensor) and yours isn't tagged that way - set it under the entity's settings (the gear icon) and it will show up.

Tested on Home Assistant 2026.9. Each blueprint declares the oldest version it needs (2024.10 for the modern syntax; the AI briefing needs 2025.7 for AI Task).

## Importing

Each blueprint below has an **Import** button that opens your own Home
Assistant with the blueprint pre-filled (via [My Home Assistant](https://my.home-assistant.io/)).
Or by hand: **Settings -> Automations & scenes -> Blueprints -> Import
blueprint**, and paste the file's GitHub URL. The template sensor imports the
same way and then appears under **Settings -> Devices & services -> Helpers
-> Create helper -> Template**.

Notification inputs take any `notify.*` service. The `tag`, `priority` and
`clear_notification` conventions two of these blueprints use are Home
Assistant Companion (mobile app) features; other notify platforms ignore
them harmlessly.

## Contents

Ordered by how helpful and how unusual each one is - the top of the list is what
most people can use today; the bottom needs specific hardware.

| # | Blueprint | Type | Why it's here |
|---|---|---|---|
| 1 | [AI Daily Briefing (a second brain, one paragraph a day)](#ai-daily-briefing-a-second-brain-one-paragraph-a-day) | Automation | The centrepiece. Calendars + to-dos + home state → one AI call under standing judgment rules → a headline, a paragraph, a few bullets. Any provider with an AI Task entity; optional failover; a one-line steer the reader can type. |
| 2 | [Smart Plug Charger Cutoff](#smart-plug-charger-cutoff) | Automation | Broadest audience and the least obvious logic: a charging-session flag instead of a kWh guess. Any power-monitoring plug. |
| 3 | [Debounced Outage Alert](#debounced-outage-alert) | Automation | Everyone has something that flaps. One page per real outage, quiet recovery. No hardware at all. |
| 4 | [Device Watchdog with Optional Auto Power-Cycle](#device-watchdog-with-optional-auto-power-cycle) | Automation | The 'pull the plug and put it back' fix, automated - with a daily cap so a dead device can't loop. Any smart plug. |
| 5 | [Escalating Left-Open Reminder](#escalating-left-open-reminder) | Automation | Common need, but the 1/5/15 escalation with one replacing banner is what makes it usable. Any contact sensor. |
| 6 | [Effective Thermostat Target (Template Sensor)](#effective-thermostat-target-template-sensor) | Template sensor | Nobody else has it, but you only need it if a climate entity's mode-dependent target attributes have bitten you. |
| 7 | [Vent/Register Modulation Against a Target](#ventregister-modulation-against-a-target) | Automation | Unique, but needs smart vents plus a thermostat with hvac_action - the narrowest audience here. Skip 6 and 7 if you have no smart vents. |

## What each one needs

**Legend.** *Core* = a built-in Home Assistant integration, no HACS. *HACS* =
needs the community store. *Cloud* = an external account or API key. *Helpers*
= things you create once under Settings -> Devices & services -> Helpers.
*Effort* = Low: 5-10 min, import and pick entities · Medium: ~30 min plus a
few days of tuning · High: an evening.

| Blueprint | Hardware | Integrations (core) | HACS / add-ons | Cloud / API accounts | Helpers you create | Effort |
|---|---|---|---|---|---|---|
| **AI Daily Briefing** | None (a wall tablet or phone to read it on) | **Required:** an **AI Task** entity from any conversation integration - Anthropic, OpenAI, Google Generative AI, Ollama (all core); at least one **calendar** (Google Calendar, CalDAV, Local Calendar…). **Optional:** a `todo` list (Google Tasks, Local To-do, Todoist), the Companion app for push | None | **Required:** the LLM provider's API key - paid per call for the cloud ones, free with local Ollama. **Optional:** a Google account (OAuth) if you use Google Calendar / Google Tasks; a second provider for failover | 0-2 `input_text` (steer line, headline strip) | **Medium** - 20 min to set up, then a week of one-line steers until it reads right |
| **Smart Plug Charger Cutoff** | A **power-monitoring smart plug** (Kasa/TP-Link EP25, Shelly Plug S, Tasmota, Sonoff POW…) | **Required:** the plug's integration - TP-Link Smart Home, Shelly, Tasmota, ESPHome (all core) | None | Usually none. Newer Kasa firmware asks for your TP-Link/Kasa account email + password once, at pairing | 1 Toggle | **Low** - 10 min; check your charger's watts once |
| **Debounced Outage Alert** | None | **Required:** any entity whose state means up/down (a camera, a device tracker, a `binary_sensor`); a notify service | None | None | 1 Toggle per watched entity | **Low** - 5 min |
| **Device Watchdog + Power-Cycle** | **Optional:** a smart plug on the device you want cycled | **Required:** the entities that go unavailable (from the device's own integration - Hue, ZHA, whatever it is); a notify service. **Optional:** the plug's integration | None | None | 1 Toggle; **plus** 1 Counter if you enable auto power-cycle | **Low-Medium** - 15 min; two helpers |
| **Escalating Left-Open Reminder** | A **contact sensor** (Hue Secure, Aqara, Sonoff, any Zigbee/Z-Wave door sensor) or any binary sensor | **Required:** the sensor's integration (Hue is core; Zigbee via ZHA core or Zigbee2MQTT add-on; Z-Wave JS add-on). The tag / priority / clear-banner features need the **Companion app** notify service | Zigbee2MQTT or Z-Wave JS **add-on** only if that is how your sensor connects | None | None | **Low** - 5 min |
| **Effective Thermostat Target** (template) | A **smart thermostat** with a `climate` entity (Ecobee, Nest, Honeywell, Z-Wave stats…) | **Required:** the thermostat's integration (Ecobee, Nest, etc. - core) | None | Whatever your thermostat needs - Ecobee and Nest are cloud accounts (Nest needs a Google Device Access project) | None - the blueprint creates the sensor | **Low** - 5 min (Helpers -> Template -> use a blueprint) |
| **Vent/Register Modulation** | **Smart vents** (Flair, Keen…) with `cover` entities; a room temperature sensor; the thermostat above | **Required:** the thermostat's integration (core); a room temperature sensor of any kind. **Flair** vents: the Flair integration is a **HACS** custom integration; Keen: check HACS too | **HACS** for Flair (and most vent brands) | Flair account (cloud) - and put Flair in Manual mode so it stops writing your thermostat | None (uses the sensor from the template blueprint, or any `input_number`) | **Medium** - 15 min per room, then a week of watching move counts |
| Dashboard templates (`room-tile`, `busy-button`) | A tablet or phone | A dashboard in YAML mode or the UI editor | **HACS:** [button-card](https://github.com/custom-cards/button-card) (frontend). Optional: card-mod | None | 1 Toggle (`input_boolean.dashboard_detailed`) or delete its two references | **Medium** - an hour to wire your rooms |

Nothing here needs Nabu Casa or any paid subscription except the LLM calls in
the briefing (pennies a day on the cheap models; zero with a local model).

Also in the repo:

- [Dashboard patterns](docs/dashboard-patterns.md) + two [button-card templates](dashboard/templates/) - a room tile that reads as a heat map, a scene tile that shows it's working, and five measured facts about the sections engine.

---

## AI Daily Briefing (a second brain, one paragraph a day)

[![Open your Home Assistant instance and show the blueprint import dialog with a specific blueprint pre-filled.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fohlemacherd%2Fhome-assistant-blueprints%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fohlemacherd%2Fai-daily-briefing.yaml)

**File:** [`blueprints/automation/ohlemacherd/ai-daily-briefing.yaml`](blueprints/automation/ohlemacherd/ai-daily-briefing.yaml)

| At a glance | |
|---|---|
| **What I need** | An AI Task entity (any provider, core integration) and at least one calendar. Optional: a to-do list, two `input_text` helpers (steer, headline), a second provider for failover, the Companion app for push. |
| **Effort** | **Medium** - 20 min to import and pick entities, then a week of one-line steers until it reads right. No YAML. |
| **Cost - required** | **$0 hardware.** LLM calls: roughly **$1-3 / month** on a cheap model (one call a day), **$0** with a local Ollama model. |
| **Cost - optional** | A wall tablet to read it on, $100-400. Nabu Casa not needed. |

Once a day (or twice), makes the small decisions for the house - what matters
today, what can wait, what needs a nudge before an event - so nobody merges
five apps in their head at 6:30am. It gathers what the house actually knows -
the calendars the household can act on, a to-do list (dated items only), any
sensor states you name - and hands it to an AI Task entity with a short set of
judgment rules. Back comes a briefing shaped like a person wrote it: one
headline, two to four sentences of judgment, a few noun-first bullets for
today, a short radar for the weeks ahead. Delivered wherever you point it; the
headline can also land in an `input_text` for a dashboard strip, and the whole
thing fires as an event for anything else to pick up. A one-line steer box
means it learns your household in a week.

### Why this is the one that matters

A day is mostly micro-decisions. Is today's schedule tight? Does anything need
buying before Saturday? Is it worth mentioning that the guest room is cold?
This makes those calls once, first thing, so nobody in the house has to. The
rules that stop it turning into a status report are the product, and they are
an input: *mention something only if it would change what the reader does
today; noun-first, never commands, never guilt; never health or money; a
quiet day is allowed to be quiet.* The one-line **steer** helper is the
feedback loop - "stop mentioning the trash", "lead with the kids' schedule" -
and it's what makes the thing feel like it learns.

### What you need before importing

- An **AI Task entity** from any provider integration that offers one
  (Anthropic, OpenAI, Google Generative AI, Ollama, ...). A second one from a
  different provider is optional and gives you a failover.
- Calendars in Home Assistant - only the ones the household can act on.
- Optional: a `todo` list, an `input_text` for the steer line, an
  `input_text` for the headline.

### Inputs, in plain language

| Input | What it is |
|---|---|
| **AI Task entity** / **Fallback** | Who writes it; who writes it when the first one is out of credits. |
| **Briefing time** / **second run** | Morning by default; an optional evening run previews tomorrow. Fire the event `ai_daily_briefing_refresh` for an on-demand run. |
| **Calendars** / **look-ahead days** | Today and tomorrow are always separated out; the look-ahead feeds the radar (default 14 days). |
| **To-do list** | Dated items only, soonest first, capped at eight. |
| **Home state to include** | Sensors whose state is a fact worth knowing today - weather, who's home, a low-stock counter, the thermostat. |
| **Who this is for** / **Standing rules** | The audience line and the judgment rules. Keep rules as abstract shapes, never example sentences - a vivid example becomes a template the model repeats on days it isn't true. |
| **Steer helper** | The reader's one-line correction; it overrides the rules for the next run. |
| **Notify service** | Default `notify.persistent_notification` - routine content deserves a persistent, low-key home, not a push. |
| **Headline helper** / **max bullets** | For a dashboard strip; cap on today's bullets. |

---

## Smart Plug Charger Cutoff

[![Open your Home Assistant instance and show the blueprint import dialog with a specific blueprint pre-filled.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fohlemacherd%2Fhome-assistant-blueprints%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fohlemacherd%2Fcharger-done-outlet-off.yaml)

**File:** [`blueprints/automation/ohlemacherd/charger-done-outlet-off.yaml`](blueprints/automation/ohlemacherd/charger-done-outlet-off.yaml)

| At a glance | |
|---|---|
| **What I need** | A power-monitoring smart plug (switch + live watts + today's kWh) and one Toggle helper. A notify service if you want to hear about it. |
| **Effort** | **Low** - 10 minutes. Glance at the plug's power graph during one real charge to confirm the 15 W / 5 W thresholds. |
| **Cost - required** | **One power-monitoring plug, $12-25** (Kasa EP25 ~$20, Shelly Plug S ~$25, Sonoff S31 ~$12). Free if the device already sits on one. |
| **Cost - optional** | None. |

Turns a power-monitoring smart plug off once whatever is charging on it has
actually finished, instead of leaving it trickle-charging indefinitely - so a
ride-on pack, e-bike or drill battery on a dumb charger stops being cooked on
float for a week at a time and lasts years instead of a season. Optionally
turns the plug back on at a set time every day, so the next charge starts
automatically and nobody has to remember to plug or unplug anything.

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
| **Daily restore time** | Only used if the above is enabled. Default 06:00. Harmless to fire with nothing plugged in. A charger still on a full battery just floats after the restore (it never re-arms the session flag) - one day of float is fine, which is the whole point of not leaving it for a week. |
| **Notify service** | Which `notify.*` service to call when the plug switches off, e.g. `notify.mobile_app_your_phone`, or a notify group. Defaults to `notify.persistent_notification` (built in; shows under Settings -> Notifications, no push required). |

---

## Debounced Outage Alert

[![Open your Home Assistant instance and show the blueprint import dialog with a specific blueprint pre-filled.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fohlemacherd%2Fhome-assistant-blueprints%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fohlemacherd%2Fdebounced-outage-alert.yaml)

**File:** [`blueprints/automation/ohlemacherd/debounced-outage-alert.yaml`](blueprints/automation/ohlemacherd/debounced-outage-alert.yaml)

| At a glance | |
|---|---|
| **What I need** | Any entity whose state means up/down, one Toggle helper per watched thing, a notify service. |
| **Effort** | **Low** - 5 minutes. |
| **Cost - required** | **$0.** |
| **Cost - optional** | None. |

Pages once per real outage instead of once per flip, so you keep reading
the alerts instead of muting them. Written for anything
that flaps - a camera stream that stalls and recovers on its own, an
integration that drops overnight and comes back before anyone's up to see
it - where a plain "notify on state change" automation turns one outage
into a stream of "it's down" / "it's back" pushes.

The fix is two rules: a state has to hold for a confirmation window before
it counts as a real outage, and once an outage has paged, it doesn't page
again until it has actually recovered and gone bad a second time. Recovery
itself is quiet by default - logged to a persistent notification instead of
buzzed to your phone, unless you turn push-on-recovery on.

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
| **Minutes back up before it counts as recovered** | How long it must stay out of the down state before the outage is over and the helper resets. Default 2 - keeps a mid-outage blip from re-arming the page. |
| **What to call this** | Used in notification text. |
| **"Already paged" helper** | The Toggle helper above. |
| **Notify service (down alert)** | e.g. `notify.mobile_app_your_phone`. |
| **Also push a notification on recovery?** | Off by default - recovery is logged, not pushed. |

---

## Device Watchdog with Optional Auto Power-Cycle

[![Open your Home Assistant instance and show the blueprint import dialog with a specific blueprint pre-filled.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fohlemacherd%2Fhome-assistant-blueprints%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fohlemacherd%2Fdevice-watchdog-power-cycle.yaml)

**File:** [`blueprints/automation/ohlemacherd/device-watchdog-power-cycle.yaml`](blueprints/automation/ohlemacherd/device-watchdog-power-cycle.yaml)

| At a glance | |
|---|---|
| **What I need** | A few entities that go unavailable when the device is unreachable, one Toggle helper, a notify service. For auto power-cycle: a smart plug on the device and one Counter helper. |
| **Effort** | **Low-Medium** - 15 minutes; two helpers if you enable power-cycling. |
| **Cost - required** | **$0** as a notifier. |
| **Cost - optional** | **A smart plug per device you want cycled, $10-25.** Not for the Pi running Home Assistant itself - it can't cycle its own power; use the plug's own schedule for that one. |

For a single point of failure that lives on a smart plug - a hub or bridge,
a Raspberry Pi, a Wi-Fi extender, anything where "someone pulls the plug
and puts it back" is the known fix for it going deaf. When it does, you get
one notification instead of a hundred - and, if you opt in, one capped
power-cycle, so you stop being the person who walks to the closet and pulls
the plug. It watches one or more entities that only report data when the
device is reachable. When enough of them go unavailable for a confirmation
window, it notifies once. If the outage keeps going past a second, longer
window, it can optionally power-cycle the device through a smart plug and
notify that it did so.

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

[![Open your Home Assistant instance and show the blueprint import dialog with a specific blueprint pre-filled.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fohlemacherd%2Fhome-assistant-blueprints%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fohlemacherd%2Fescalating-left-open-reminder.yaml)

**File:** [`blueprints/automation/ohlemacherd/escalating-left-open-reminder.yaml`](blueprints/automation/ohlemacherd/escalating-left-open-reminder.yaml)

| At a glance | |
|---|---|
| **What I need** | A contact sensor (or any binary sensor) and the Home Assistant Companion app for the tag / priority / clear-banner behaviour. |
| **Effort** | **Low** - 5 minutes. |
| **Cost - required** | **A contact sensor, $15-40** (Aqara ~$15-20, Sonoff ~$12, Hue Secure ~$40). $0 if you already have door sensors. |
| **Cost - optional** | A Zigbee coordinator, $20-40, if you have no Zigbee radio yet (Hue Secure needs a Hue bridge, ~$60). |

A door left open, a garage that never closed, a pump running far longer
than a normal cycle, a space heater still on an hour after everyone left
the room - all the same shape of problem: a binary state that's fine
briefly and a real problem if it doesn't clear. A single fixed-delay
reminder either nags people mid-grocery-unload or waits so long it's
useless as a safety alert; this uses three escalating stages instead -
quiet at 1 minute, high priority at 5, sticky at 15, one banner that replaces
itself and clears the moment the door closes - so normal use never triggers
anything past the quiet first stage, and something genuinely left alone gets
progressively louder.

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
| **"Left open/on" state** | Default `on`. The banner clears on any transition away from this state (unavailable included), not only to a specific "cleared" value. |
| **Word describing the bad state** | e.g. "open," "running," "on" - used in notification text. |
| **Stage 1/2/3 delay (minutes)** | Defaults 1 / 5 / 15. |
| **Notify service** | Where the alerts go. |
| **Also push a notification when it clears?** | Off by default - clearing just dismisses the banner. |

---

## Effective Thermostat Target (Template Sensor)

[![Open your Home Assistant instance and show the blueprint import dialog with a specific blueprint pre-filled.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fohlemacherd%2Fhome-assistant-blueprints%2Fblob%2Fmain%2Fblueprints%2Ftemplate%2Fohlemacherd%2Feffective-thermostat-target.yaml)

**File:** [`blueprints/template/ohlemacherd/effective-thermostat-target.yaml`](blueprints/template/ohlemacherd/effective-thermostat-target.yaml)

| At a glance | |
|---|---|
| **What I need** | A `climate` entity. That's it - this is a Template helper created from the blueprint. |
| **Effort** | **Low** - 5 minutes (Helpers -> Template -> use a blueprint). |
| **Cost - required** | **$0** with any smart thermostat you already own. |
| **Cost - optional** | A smart thermostat if you have none: Ecobee $170-250, Nest $130-280. |

Creates one sensor: the temperature your thermostat is actually trying to
hit right now, as a single number, no matter which of its modes (heat,
cool, or heat_cool/auto) it happens to be in - so every room automation
reads one number in any mode instead of carrying its own copy of the
heat/cool/heat_cool attribute dance. It is also the fix for smart vents in
manual mode (blueprint 7 reads it).

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
| **Temperature unit** | A label for the sensor - °F or °C. |
| **Sanity floor / ceiling** | If the computed target ever comes out outside this range, the fallback value is reported instead. Defaults 60-80 (Fahrenheit - Celsius users set roughly 15 / 30). |
| **Fallback value** | Reported when the computed target fails the sanity check. Default 70 (Celsius: 21). |

---

## Vent/Register Modulation Against a Target

[![Open your Home Assistant instance and show the blueprint import dialog with a specific blueprint pre-filled.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fohlemacherd%2Fhome-assistant-blueprints%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fohlemacherd%2Fvent-modulation-to-target.yaml)

**File:** [`blueprints/automation/ohlemacherd/vent-modulation-to-target.yaml`](blueprints/automation/ohlemacherd/vent-modulation-to-target.yaml)

| At a glance | |
|---|---|
| **What I need** | Smart vents with `cover` entities (Flair via its HACS integration), a temperature sensor in each room, a thermostat with `hvac_action`, and a target sensor (the template blueprint above). One instance per room. |
| **Effort** | **Medium for the blueprint** - 15 minutes per room, then a week of watching move counts and adjusting the hysteresis. The hardware side (vents, pucks, per-room sensors) is a weekend, not a blueprint. |
| **Cost - required** | **Smart vents, $70-100 each** for the rooms you want to control, plus a smart thermostat (above) if you have none. |
| **Cost - optional** | A per-room temperature sensor if the vent kit doesn't include one, $20-100 (a Zigbee sensor at the low end, a vendor puck at the high). Extra pucks for rooms without vents. |

Opens a room's smart vents/registers when the house's active heating or
cooling would actually help that room, and closes them once the room is
within a hysteresis band of its target. Does nothing while the system is
idle - a vent stays exactly where it last was rather than being forced open
or shut for no reason. Hot and cold rooms even out without the vent vendor's
cloud writing your thermostat behind your back, and battery vents stop
chattering - one guest room went from 204 moves a day to single digits.

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
| **Skip when already in position?** | On by default: don't re-send a position the vents already report, so a cloud vent isn't commanded every few minutes. Turn off only if your vents report position unreliably. |
| **Settle time (minutes)** | A short debounce on the room-sensor trigger only, so one noisy reading doesn't flip the vent. Default 2. |

---

## Dashboard patterns

**Files:** [`docs/dashboard-patterns.md`](docs/dashboard-patterns.md), [`dashboard/templates/room-tile.yaml`](dashboard/templates/room-tile.yaml), [`dashboard/templates/busy-button.yaml`](dashboard/templates/busy-button.yaml)

Not blueprints. Two [button-card](https://github.com/custom-cards/button-card) templates from a
wall-tablet + phone dashboard - a room tile that reads as a heat map across the room, and a scene
tile that pulses while its script is still running - plus the platform facts about Lovelace
`sections` views (no view-level zoom, window-vs-view breakpoints, computed column counts, nested
`custom_fields` context, and the in-memory YAML cache that a refresh does not bust) that each cost
an evening to learn. Paste a template under `button_card_templates:` and follow the usage block at
the top of each file.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md). Blueprints import from `main`; the changelog says when one changed behaviour.

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
