# Home Assistant Blueprints

One house's second brain, taken apart into pieces you can import. The
centre of it is a daily AI briefing that makes the small decisions - what
matters today, what can wait, what needs a nudge before an event - so the
people in the house don't spend attention on them. Around it: the
automations that fell out of building that house, generalized. A hobby
side-project, not a supported product - see "What to expect" below.

## If you're new to this

- A **blueprint** is a ready-made automation with the entity names left blank; you import it once and fill in the blanks from dropdowns. No YAML editing.
- An **entity** is anything Home Assistant can see or control - `switch.garage_plug`, `sensor.garage_plug_power`, `binary_sensor.front_door`.
- An **integration** is what connects a brand or protocol - TP-Link for Kasa plugs, Hue for Hue devices. *Core* integrations come with Home Assistant; *HACS* is a separate community store you install first (hacs.xyz).
- A **helper** is a small entity you create yourself under Settings -> Devices & services -> Helpers: a Toggle (on/off memory), a Counter, a Text box, a Date and time. Most of the blueprints below ask you to create one or two first; each takes 30 seconds.
- A **notify service** is where a message goes - `notify.mobile_app_<your phone>` if you have the Companion app, or `notify.persistent_notification` (built in, shows under Settings -> Notifications).
- **If an entity doesn't appear in a dropdown**, the input is filtered by device class (a power sensor, a contact sensor) and yours isn't tagged that way - set it under the entity's settings (the gear icon) and it will show up.

Tested on Home Assistant 2026.9. Each blueprint declares the oldest version it needs (2024.10 for the modern syntax; the AI briefing needs 2025.7 for AI Task, and the camera check needs 2025.8 for image attachments).

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
| 4 | [Routed Notifier with Quiet Hours and a Daily Page Budget](#routed-notifier-with-quiet-hours-and-a-daily-page-budget) | Script | Every household's phones buzz too often. One script every automation calls: quiet hours, a mute switch, the phone's Do Not Disturb and a hard daily page cap. Over the cap a page is held in a record, never dropped, and a blank message is caught before it reaches anyone. No HACS, no hardware. |
| 5 | [Dead Device Sweep](#dead-device-sweep) | Automation | Everyone with battery devices has one that died quietly weeks ago. One hourly sweep of all of them that pages only when the dead list changes, each device once a day at most, and one line when a whole hub goes down. Other sweeps repeat the whole list every run. No hardware, no list to keep up. |
| 6 | [Device Watchdog with Optional Auto Power-Cycle](#device-watchdog-with-optional-auto-power-cycle) | Automation | The 'pull the plug and put it back' fix, automated - with a daily cap so a dead device can't loop. Any smart plug. |
| 7 | [Escalating Left-Open Reminder](#escalating-left-open-reminder) | Automation | Common need, but the 1/5/15 escalation with one replacing banner is what makes it usable. Any contact sensor. |
| 8 | [Night Light Reconnect Guard](#night-light-reconnect-guard) | Automation | A very common complaint with no blueprint for it: bulbs that drop off the network overnight come back ON. Fires only on unavailable -> on, never on a person. Any smart bulbs plus a motion or presence sensor. |
| 9 | [Consumable Wear Tracker](#consumable-wear-tracker) | Automation + template sensor | Calendar reminders throw parts away at the wrong time. This counts real uses or real runtime, is due at the usage or age limit (whichever comes first), and only your real swap resets it - hitting the limit never marks it done. Toothbrush heads, furnace filters, wicks. No custom integration. |
| 10 | [AI Camera Yes/No Check (won't guess)](#ai-camera-yesno-check-wont-guess) | Script | Turns any camera into a yes/no sensor for a garage door, a package, the bins or a parked car. When the picture is too dark or blurred to judge, it keeps the last answer instead of guessing. Other AI camera blueprints write prose to a log; this one fills a Toggle that an automation can act on. |
| 11 | [Proof-of-Run Equipment Check](#proof-of-run-equipment-check) | Automation | A calendar can't tell a sump pump that runs every day from one that has seized. Here a real run counts as the test (and can tick the chore for you); only silence asks for a test by hand. Appliance blueprints ask whether a cycle finished; this asks whether the equipment still works. Anything that shows when it runs. |
| 12 | [Effective Thermostat Target (Template Sensor)](#effective-thermostat-target-template-sensor) | Template sensor | Nobody else has it, but you only need it if a climate entity's mode-dependent target attributes have bitten you. |
| 13 | [Vent/Register Modulation Against a Target](#ventregister-modulation-against-a-target) | Automation | Unique, but needs smart vents plus a thermostat with hvac_action - the narrowest audience here. Skip 12 and 13 if you have no smart vents. |

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
| **Routed Notifier** (script) | None - a phone with the Companion app gets the most out of it | **Required:** a notify service - the Companion app (`notify.mobile_app_*`, core) or any other. **Optional:** the Companion app's Do Not Disturb (Android) or Focus (iOS) sensor | None | None | 1 Counter and 1 Text (or Date); **optional** 1 Toggle to mute, 1 Schedule for quiet nights | **Low** - 10 min, then move automations onto it one at a time |
| **Dead Device Sweep** | None - it watches the battery devices you already have | **Required:** a notify service. Labels and the battery device class are built in | None | None | 2 Text (maximum length 255) | **Low** - 10 min |
| **Device Watchdog + Power-Cycle** | **Optional:** a smart plug on the device you want cycled | **Required:** the entities that go unavailable (from the device's own integration - Hue, ZHA, whatever it is); a notify service. **Optional:** the plug's integration | None | None | 1 Toggle; **plus** 1 Counter if you enable auto power-cycle | **Low-Medium** - 15 min; two helpers |
| **Escalating Left-Open Reminder** | A **contact sensor** (Hue Secure, Aqara, Sonoff, any Zigbee/Z-Wave door sensor) or any binary sensor | **Required:** the sensor's integration (Hue is core; Zigbee via ZHA core or Zigbee2MQTT add-on; Z-Wave JS add-on). The tag / priority / clear-banner features need the **Companion app** notify service | Zigbee2MQTT or Z-Wave JS **add-on** only if that is how your sensor connects | None | None | **Low** - 5 min |
| **Night Light Reconnect Guard** | **Smart bulbs** (Hue, Zigbee, Wi-Fi) and an **occupancy, motion or presence sensor** in the same room | **Required:** the bulbs' and the sensor's integrations (Hue, ZHA and most Wi-Fi bulb integrations are core) | Zigbee2MQTT **add-on** only if that is how your devices connect | None | None | **Low** - 5 min |
| **Consumable Wear Tracker** (+ template sensor) | Something that shows the part in use: a thermostat with `hvac_action`, a fan or humidifier, a smart plug, a toothbrush or robot vacuum Home Assistant can see | **Required:** that device's integration (core for most); a notify service. **Optional:** a `todo` list (Local To-do is core) | None | None beyond what the device already needs | 1 Counter, 1 Date, 1 Toggle per part; **optional** a Button | **Low** - 15 min per part |
| **AI Camera Yes/No Check** (script) | A **camera** whose still snapshot is a real, current picture | **Required:** the camera's integration (core for most brands, or Generic Camera); an **AI Task** entity that accepts images, such as Google Generative AI or Anthropic (core; the picker lists only entities that accept images) | None | **Required:** the AI provider's API key, paid per call. None with a local vision model | 1 Toggle; **optional** 1 Text and 1 Date and time | **Low** - 10 min, then a few test runs to get the question's wording right |
| **Proof-of-Run Equipment Check** | Equipment that shows when it runs: its own integration (robot vacuums, some generators and softeners), a running `binary_sensor`, or a **power-monitoring plug** or current clamp | **Required:** that device's or plug's integration (core for most); a notify service. **Optional:** a chore tracker or a `todo` list for the actions | None | None beyond what the device already needs | 1 Date and time; **optional** a second | **Low** - 10 min, plus a look at the history to set the idle threshold |
| **Effective Thermostat Target** (template) | A **smart thermostat** with a `climate` entity (Ecobee, Nest, Honeywell, Z-Wave stats…) | **Required:** the thermostat's integration (Ecobee, Nest, etc. - core) | None | Whatever your thermostat needs - Ecobee and Nest are cloud accounts (Nest needs a Google Device Access project) | None - the blueprint creates the sensor | **Low** - 5 min (Helpers -> Template -> use a blueprint) |
| **Vent/Register Modulation** | **Smart vents** (Flair, Keen…) with `cover` entities; a room temperature sensor; the thermostat above | **Required:** the thermostat's integration (core); a room temperature sensor of any kind. **Flair** vents: the Flair integration is a **HACS** custom integration; Keen: check HACS too | **HACS** for Flair (and most vent brands) | Flair account (cloud) - and put Flair in Manual mode so it stops writing your thermostat | None (uses the sensor from the template blueprint, or any `input_number`) | **Medium** - 15 min per room, then a week of watching move counts |
| Dashboard templates (`room-tile`, `busy-button`) | A tablet or phone | A dashboard in YAML mode or the UI editor | **HACS:** [button-card](https://github.com/custom-cards/button-card) (frontend). Optional: card-mod | None | 1 Toggle (`input_boolean.dashboard_detailed`) or delete its two references | **Medium** - an hour to wire your rooms |

Nothing here needs Nabu Casa or any paid subscription except the LLM calls in
the briefing and the camera check (pennies a day on the cheap models; zero
with a local model).

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
five apps in their head before breakfast. It gathers what the house actually knows -
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
buying before Saturday? Is it worth mentioning that one room is running cold?
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
Template or Threshold helper) and point this at that. To watch every battery
device at once instead, see [Dead Device Sweep](#dead-device-sweep).

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

## Routed Notifier with Quiet Hours and a Daily Page Budget

[![Open your Home Assistant instance and show the blueprint import dialog with a specific blueprint pre-filled.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fohlemacherd%2Fhome-assistant-blueprints%2Fblob%2Fmain%2Fblueprints%2Fscript%2Fohlemacherd%2Frouted-notifier.yaml)

**File:** [`blueprints/script/ohlemacherd/routed-notifier.yaml`](blueprints/script/ohlemacherd/routed-notifier.yaml)

| At a glance | |
|---|---|
| **What I need** | A notify service (the Companion app gets the most out of it), one Counter helper and one Text helper. Optional: a Toggle to mute, the phone's Do Not Disturb or Focus sensor, a Schedule helper for quiet nights. |
| **Effort** | **Low** - 10 minutes to import and create the helpers. Moving an automation onto it is a small edit, done whenever you next touch that automation. |
| **Cost - required** | **$0.** |
| **Cost - optional** | None. |

Every automation that wants to tell you something calls this one script
instead of a notify service, and says how much it matters:

| Route | What happens |
|---|---|
| `page` (the default) | Pushes now, at high priority - unless it's quiet hours, you've muted, the phone is on Do Not Disturb, or today's page budget is spent. Then it's held in the record instead. |
| `brief` | Pushes at normal priority and doesn't count against the budget. Meant for a tap-target with action buttons ("Close it"). Held during quiet hours, mute and Do Not Disturb. |
| `log` | Never pushes; recorded only. For "I did the thing on schedule" messages nobody needs on a lock screen. |
| `critical` | Pushes past every gate. Never counted, never held. For smoke, leaks and frozen pipes. |

Held messages go into a record: a logbook line under the script (linked to
the automation that called it), a `routed_notifier` event, and - on by
default - an entry in the notification bell. Nothing is thrown away except a
blank message, and even that is recorded as `dropped_blank` with its title,
so you can find the automation that produced it. Every call returns what
happened through `response_variable`.

### Why not a quiet-hours condition in each automation?

Because twenty automations each carrying their own copy drift apart, and
none of them knows how many times the phone has already buzzed today. The
daily budget is the part that's usually missing. Most notification
blueprints stop at priorities and quiet hours, and a cap that simply drops
the overflow is worse than none, because you never learn what you missed.
Here an over-budget page is held in the record, so an automation that
misfires forty times in an afternoon costs you the day's budget instead of
forty buzzes, and it shows up in the logbook where you can fix it. If real
alerts start being held, the fix is to move a chatty caller to `brief` or
`log`, not to raise the number.

The budget resets itself. The script keeps today's date in a helper and
zeroes the counter on the first call of a new day, so there is no midnight
automation to forget, and a restart can't reset the count early or skip a
reset. It is one import with no HACS.

A brief with no action buttons never quietly turns into a log entry. An
input decides what happens to one: push it at normal priority (the default),
or hold it as `undelivered` so you notice the caller needs fixing.

### What you need before importing

- A **notify service**: `notify.mobile_app_your_phone` from the Companion
  app, a notify group that reaches several phones, or anything else. The
  default `notify.persistent_notification` is fine for trying it out.
- One **Counter** helper: **Settings -> Devices & services -> Helpers ->
  Create helper -> Counter**. Keep the default step of 1, no minimum and no
  maximum.
- One **Text** helper (**Create helper -> Text**) to hold the budget's date.
  A **Date** helper works too, as long as it holds a date: with a time-only
  one the budget never holds a page.
- Optional: a **Toggle** helper to use as a mute switch; the Companion
  app's Do Not Disturb sensor (Android - enable it in the app's sensor
  settings) or Focus sensor (iOS); a **Schedule** helper if your quiet
  nights differ between weekdays and weekends.

This is a **script** blueprint. After importing it, go to **Settings ->
Automations & scenes -> Scripts -> Create script**, pick the blueprint, and
name the script "Routed notifier" so it becomes `script.routed_notifier`. One
is enough for a household. Make a second only for a separate audience with
its own budget, and give it its own helpers.

If you'd rather nothing at all sat between a smoke alarm and your phone -
not even a script - keep calling the notify service directly for those few
alerts, and route everything else through this.

### Inputs, in plain language

| Input | What it is |
|---|---|
| **Notify service** | Where a message goes when it's allowed to push. |
| **Is the notify service the Companion app?** | On by default: pages and critical messages get priority high and ttl 0 (Android) and interruption-level time-sensitive (iOS), so they arrive promptly. Turn it off for a service that might reject fields it doesn't know. |
| **What happens to a brief with no action buttons** | Push it at normal priority (default), or hold it as undelivered. |
| **Should critical messages ring through Do Not Disturb?** | Off by default. On adds the Android alarm channel and an iOS critical sound (the app must be allowed Critical Alerts) to the critical route only. |
| **Page counter helper** | The Counter above. The script sets it back to 0 on the first call of each day. If it can't be read, pages go through rather than being held. |
| **Pages allowed per day** | Default 3. After that, pages are held in the record for the rest of the day. |
| **Budget-day stamp helper** | The Text (or Date) helper above. |
| **When are quiet hours?** | Between two times (default), while an entity is on, either, or never. |
| **Quiet hours start / end** | Default 22:00 to 07:00. The window may cross midnight. |
| **Quiet entity** | Optional. A Schedule helper, a Toggle someone flips for a nap, or a binary sensor - on means quiet. |
| **Mute toggle** | Optional. While it's on, everything except critical is held. |
| **Phone Do Not Disturb sensor** / **states to respect** | Optional. While the sensor reads one of these states, pages and briefs are held. If it's unavailable, messages go through. |
| **Write every call to the logbook?** / **Fire a routed_notifier event?** | Both on by default. Together they are the record. |
| **Also put held messages in the notification bell?** | On by default, one entry per tag (or title), so a repeat replaces the last one. |

### Calling it

```yaml
actions:
  - action: script.routed_notifier
    data:
      route: page
      title: Garage door open
      message: Open for 20 minutes.
      tag: garage_door
    response_variable: routed
  # routed.outcome is sent, demoted_quiet, demoted_budget,
  # dropped_blank, logged or undelivered
```

| Field | What it is |
|---|---|
| `message` | Required. A blank one is dropped and recorded, except on `critical`, which never drops. |
| `title` | Optional. |
| `route` | `page` (default), `brief`, `log` or `critical`. An unknown route is treated as `page`, so a typo reaches the phone instead of vanishing. |
| `actions` | Companion app buttons, e.g. `[{"action": "CLOSE_GARAGE", "title": "Close it"}]`. Handle the tap in an automation triggered by the `mobile_app_notification_action` event, as with any Companion app action. |
| `tag` | A later message with the same tag replaces the earlier banner (and the earlier bell entry). |
| `image` | An image URL or a `/api/camera_proxy/camera.front_door` path. |
| `data` | Anything else the notify service understands (`sticky`, `channel`, `clickAction`...). Buttons and a tag passed here, Companion app style (`data: {actions: [...], tag: ...}`), work the same as the fields above, so a `notify.mobile_app_*` call can move over as it is. |

It returns `outcome`, `route`, `reason` (`quiet_hours`, `mute`, `dnd`,
`over_budget`, `no_actions`...), `pages_today` and `daily_budget`.

The other blueprints in this repo can use it without changes: set their
**Notify service** input to `script.routed_notifier`. Each of their messages
becomes a high-priority `page`, and the Companion app's `clear_notification`
(the left-open reminder uses it to dismiss its banner) passes straight
through, uncounted. That includes each stage of the left-open reminder, even
the quiet first "probably nothing" one, so a single door left open can spend
three pages - the whole default budget.

Known limits: `sent` means the message was handed to the notify service -
Home Assistant can't see whether the phone showed it. A held message is not
re-sent when quiet hours end; it waits in the record. With a notify group,
one phone on Do Not Disturb holds the message for everyone in the group.
The script handles one call at a time and holds at most 25 at once (the one
running plus those waiting). A call beyond that is skipped, critical
included, and Home Assistant only logs a "Maximum number of runs exceeded"
warning; a critical call also waits its turn behind the calls ahead of it.

---

## Dead Device Sweep

[![Open your Home Assistant instance and show the blueprint import dialog with a specific blueprint pre-filled.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fohlemacherd%2Fhome-assistant-blueprints%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fohlemacherd%2Fdead-device-sweep.yaml)

**File:** [`blueprints/automation/ohlemacherd/dead-device-sweep.yaml`](blueprints/automation/ohlemacherd/dead-device-sweep.yaml)

| At a glance | |
|---|---|
| **What I need** | Two Text helpers and a notify service. Nothing to list by hand: by default it sweeps every battery device Home Assistant knows about. Optional: a label, to sweep something other than batteries. |
| **Effort** | **Low** - 10 minutes: two helpers, one import. Add an exclusion if phones or tablets show up. |
| **Cost - required** | **$0.** |
| **Cost - optional** | None. |

Once an hour, finds the devices that have quietly stopped reporting -
unavailable or unknown for longer than a hold time - and tells you only when
that list changes. Battery devices rarely die by reporting 3%. A motion
sensor, a door contact or a remote goes unavailable one night and stays that
way, and nothing in Home Assistant says so until an automation that depended
on it fails. For anyone with more than a handful of battery devices; it can
also sweep one label or a hand-picked list.

### Why not an unavailable-entities sensor?

The usual approaches repeat the whole list every run, or fire on every change
in the count. Two dead sensors become a push every hour until someone finds
batteries, and one flapping sensor pages each time it drops and comes back.
This one:

- stays silent while the dead set is unchanged, and pages only what is new;
- pages each device at most once per 24 hours, however often it flaps;
- logs a full recovery, and any change with nothing new in it, to one
  persistent notification that replaces itself, instead of pushing it;
- keeps a device on the list while it is still unavailable after a restart
  or an integration reload, which start every entity's clock over, so a
  restart does not read as "recovered" and then as "new";
- sends one line for an integration when several of its devices die
  together: "zha integration - 4 devices at once (check the hub or the
  integration before the batteries)". That happens at the threshold you set,
  or when every device it watches from that integration is dead (two or
  more). It is the difference between four trips to the battery drawer and
  one look at a hub.

It sits beside two others here. [Debounced Outage Alert](#debounced-outage-alert)
watches one entity you already care about, and [Device Watchdog](#device-watchdog-with-optional-auto-power-cycle)
watches one device you can power-cycle. This one watches everything with a
battery, or everything with a label, and tells you what died.

**Known limit:** a Text helper holds at most 255 characters, about seven
devices. Past that the stored list ends in "+N more", so a swap among the
devices beyond the cap does not count as a change, and a device that falls
out of the 24-hour memory can page again early.

### What you need before importing

- Two **Text helpers**, dedicated to this automation: **Settings -> Devices &
  services -> Helpers -> Create helper -> Text**. In each one's settings,
  raise **Maximum length** to 255; the default of 100 holds about two
  devices. One remembers the last dead set, the other which devices paged
  in the last 24 hours. Create a new pair for each instance - don't share
  them.
- Optional: a label on the devices or entities you want swept, if not
  batteries.

### Inputs, in plain language

| Input | What it is |
|---|---|
| **What to sweep** | Battery devices (the default; every sensor or binary sensor with the battery device class), everything with one label (entities with it, plus every entity of a device with it), or a list of entities. |
| **Label** / **Entities** | Only used by the matching option above. |
| **Leave out entity ids matching** | Optional regular expression, e.g. `phone\|tablet\|watch` - portable devices whose batteries go unavailable whenever they leave home. |
| **Hours without a report before a device counts as dead** | Default 2. Every in-scope entity of the device must be unavailable or unknown this long, and none of the device's other entities can have reported in that time - a battery sensor stuck at `unknown` on a device that is still talking is not dead. Buttons and event entities, whose normal state is `unknown`, never count. |
| **Minute past each hour to sweep** | Default 23, off the hour. |
| **Dead devices from one integration that mean the integration is down** | Default 3. 0 turns grouping off. |
| **"Last dead set" helper** / **"Paged in the last 24 hours" helper** | The two Text helpers above. |
| **Notify service** | Where a page goes, e.g. `notify.mobile_app_your_phone`. A script made from [Routed Notifier](#routed-notifier-with-quiet-hours-and-a-daily-page-budget) works too. |
| **Also push a notification when everything has recovered?** | Off by default - recovery is written to the persistent notification, not pushed. |

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
purely as an offline notifier. For battery devices that die one at a time,
with no plug to pull, see [Dead Device Sweep](#dead-device-sweep).

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

## Night Light Reconnect Guard

[![Open your Home Assistant instance and show the blueprint import dialog with a specific blueprint pre-filled.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fohlemacherd%2Fhome-assistant-blueprints%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fohlemacherd%2Fnight-light-reconnect-guard.yaml)

**File:** [`blueprints/automation/ohlemacherd/night-light-reconnect-guard.yaml`](blueprints/automation/ohlemacherd/night-light-reconnect-guard.yaml)

| At a glance | |
|---|---|
| **What I need** | Smart bulbs that sometimes show `unavailable` in their history, and an occupancy, motion or presence sensor covering the same room. Optional: one entity that means "this room was put to bed" (a ceiling light that is off, a bedtime Toggle that is on). No helpers. |
| **Effort** | **Low** - 5 minutes. Look at a lamp's History first: if it never shows `unavailable`, you don't need this. |
| **Cost - required** | **$0** if the room already has a motion or presence sensor. |
| **Cost - optional** | A motion or presence sensor if it doesn't, $15-45 (a Zigbee motion sensor ~$15-20, Hue motion ~$45, an mmWave presence sensor ~$25-40). |

Turns a light back off when it drops off the network overnight and
reconnects ON by itself - the lamp you switched off at eleven that is
glowing in an empty room at two. Hue, Zigbee and Wi-Fi bulbs can all do this
after a network dropout. The guard fires only when a light goes from
`unavailable` straight to `on`, inside a night window, with nobody in the
room (and, if you give it one, while the room is marked dark). It waits a
few seconds for the bulb to settle, looks again, and turns that one light
off.

### Why not the bulb's power-on setting?

Hue's "power-on behavior", and the same setting on Zigbee and Wi-Fi bulbs,
only applies after a real power cut. A bulb that lost its network link never
lost power, so the setting never runs, and the bulb reconnects in whatever
state it believes it is in, often on. The other obvious fix, "turn off any
light that comes on at night", turns off the light a person just switched on
at 3am.

This one matches only `unavailable -> on`, which a person at a smart switch,
a remote or the app never produces (they go `off -> on`). Home Assistant
restarting or reloading an integration is ignored too: the moment of
`unavailable` those show is a placeholder, not a dropout, so a lamp that
never dropped is left alone. It stands down if
the change carries a user (dashboard, app, voice) or came from another
automation or script (a motion light). It never acts while an occupancy
sensor says someone is in the room, or while that sensor is itself
unavailable. One human action does look like a reconnect: flipping a wall
switch to power a smart bulb that was cut at the wall. That is why the
sensor is required, not optional.

**Known limit:** it can't see what a light was before it dropped out, so a
lamp someone left on deliberately in an empty room is turned off after a
reconnect too, unless the "room is dark" signal says otherwise. **Tip:** the
same bulbs often bounce back on in the same second a goodnight script turns
them off, without ever going unavailable. This guard can't see that. Nor
does it act on a reconnect within five seconds of a script's `turn_off`:
Home Assistant keeps a service call's context on the light for five seconds,
so that change carries the script's `parent_id` and reads as the script's
own, even though the bulb went through `unavailable`. For both, give the
script a second `light.turn_off` about ten seconds after the first.

### What you need before importing

- The lights to guard. Only the one that reconnected is turned off.
- At least one occupancy, motion or presence `binary_sensor` covering the
  same room.
- Optional: an entity whose state means "put to bed on purpose" - the room's
  ceiling light, a group of its other lights, a bedtime Toggle helper. Not a
  group that contains the guarded lights: it reads `on` the moment one of
  them reconnects, and the guard would never act.

### Inputs, in plain language

| Input | What it is |
|---|---|
| **Lights to guard** | The bulbs or lamps that come back on after a dropout. |
| **Night window starts / ends** | Default 23:00 to 06:00. The window may cross midnight; the same time for both guards all day. |
| **Occupancy or motion sensors** | Required. If any of them is on or unavailable, the guard does nothing. |
| **"Room is dark" signal / state** | Optional. The guard only acts while this entity is in this state - e.g. a ceiling light `off`, a bedtime Toggle `on`. |
| **Seconds to wait before turning it off** | Lets a reconnecting bulb stop bouncing, then the room is checked again. Default 10. |
| **Most reconnects to handle at once** | Each reconnect gets its own correction, running side by side, so each waits only its own settle time. Default 10 (Home Assistant's floor is 2); extras are skipped silently. |

---

## Consumable Wear Tracker

[![Open your Home Assistant instance and show the blueprint import dialog with a specific blueprint pre-filled.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fohlemacherd%2Fhome-assistant-blueprints%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fohlemacherd%2Fconsumable-wear-tracker.yaml)

**File:** [`blueprints/automation/ohlemacherd/consumable-wear-tracker.yaml`](blueprints/automation/ohlemacherd/consumable-wear-tracker.yaml) - plus a companion sensor, [below](#the-companion-sensor-consumable-life-used).

| At a glance | |
|---|---|
| **What I need** | Something that shows the part being used: a thermostat (its `hvac_action`), a fan or humidifier, a smart plug, a toothbrush or vacuum that Home Assistant can see. Three helpers per part: a Counter, a Date, a Toggle. Optional: a to-do list, a Button helper. |
| **Effort** | **Low** - 15 minutes per part, most of it creating the three helpers and setting the date. |
| **Cost - required** | **$0** if the device already reports when it runs. |
| **Cost - optional** | A power-monitoring plug for a plug-in appliance that doesn't report, $12-25. |

Tells you when a part that wears out is actually worn out - a toothbrush
head, a furnace or AC filter, a humidifier wick, a water or vacuum filter -
by counting how much it has really been used instead of trusting a calendar.
It counts real uses (a device that holds a state such as `running` for at
least a few seconds) or real runtime (minutes something was running). The
part is due at its usage limit or its age limit, whichever comes first, with
an optional shorter age limit for part of the year. When it's due, a helper
turns on, you're notified once, and an action of your choice runs. When you
record the real swap, the count goes back to zero and the replaced-on date is
stamped.

The same shape covers a lot of parts. A toothbrush head is due at 180 uses or
90 days. A furnace filter is due at so many hours of blower time or so many
days, with a shorter limit in pollen season. A humidifier wick is due at
runtime or one season. A robot vacuum's filter is due at so many cleaning runs
or a few months.

### Why not a calendar reminder, or history_stats?

"Every three months" assumes an average user. Someone who uses a thing half
as often throws it away at half its life, and a furnace filter wears far
faster in a heat wave than in a mild spring. Counting use is the honest
measure. The age limit stays as a backstop because bristles, filter media and
wicks also age when they sit unused.

`history_stats` looks like free runtime counting, but it reads the recorder,
and the recorder purges after 10 days by default. A total that spans months
comes out low without telling you. A **Counter** helper survives restarts and
is never purged.

And **reaching the limit proves the part is due, not that anyone replaced
it**, so this automation never marks anything done by itself. A to-do item or
chore that "completes" when the count runs out would record a swap that never
happened. Only your own swap signal resets the count: a button, ticking the
to-do item, or an event. The existing options - `ha-filter-tracker` and
`maintenance-tracker` - are custom integrations. This one is a plain
blueprint, and it counts discrete uses as well as runtime.

### What you need before importing

Create three helpers for each part under **Settings -> Devices & services ->
Helpers -> Create helper**. Create a new set for each part, and don't share
helpers between parts:

- A **Counter**, with no maximum. If the part in place today is already
  part-used, set it to your best estimate.
- A **Date and/or time** helper (date only is fine). **Set it to the date the
  current part really went in, right after you create it.** A new date helper
  starts at today, not at "never", so if you leave it alone the age clock
  starts from today and the first age-based reminder comes late.
- A **Toggle**, which is on while the part is due.
- Optional: a **Button** helper to press when you swap the part, and a to-do
  list (Local To-do is built in).

To record a swap from anywhere else (a script, an NFC tag automation,
Developer tools -> Events), fire the event `consumable_replaced` with this
part's counter:

```yaml
- event: consumable_replaced
  event_data:
    counter: counter.furnace_filter_minutes
```

A swap recorded early counts too; the part doesn't have to be due.

### Inputs, in plain language

The inputs are grouped into collapsible sections. Fill in **Discrete uses**
or **Runtime**, whichever matches the mode, and leave the other one alone.

| Input | What it is |
|---|---|
| **What to call it** | Used in notifications and the to-do item, e.g. "Furnace filter". |
| **How to count use** | Discrete uses, or runtime minutes. |
| **Counter helper** / **Replaced-on date helper** / **"Due" helper** | The three helpers above. |
| **Device that shows a use** / **"In use" state** | Discrete mode: the entity and the exact state that means one use, e.g. `running`. |
| **Seconds it must hold before it counts** | Default 30. Knocking the device or a five-second test is not a use. |
| **Minutes before another use can count** | Default 0. Set 10 for a Bluetooth device that can drop out in the middle of a use, so one use isn't counted twice. |
| **Usage limit** | In uses. Default 180 (a toothbrush head at two brushings a day for three months). |
| **What runs** / **States that mean running** / **Attribute to read as well** | Runtime mode: one or more entities. It counts as running when an entity's state, or its `hvac_action`, is one of `on`, `heating`, `cooling`, `drying` or `fan`. |
| **How often to sample** | Default every 5 minutes. Each sample that finds it running adds that many minutes. |
| **Runtime limit** | In hours. Default 500. That's a starting point, not a rating; adjust it after the first swap, once you've seen how dirty the part was. |
| **Age limit** | In days. Default 90; 0 means no age limit. |
| **Months with a shorter age limit** / **Shorter age limit in those months** | Optional seasonal cap. If you set the seasonal limit higher than the normal one, the lower of the two wins. |
| **Daily check time** | Default 09:00. A part that crosses its limit overnight is reported then, not at 3am. |
| **Notify service** | Where the one "it's due" message goes, e.g. `notify.mobile_app_your_phone`. A script made from [Routed Notifier](#routed-notifier-with-quiet-hours-and-a-daily-page-budget) works too. With the default, the notice is dismissed for you when the swap is recorded. |
| **When it becomes due, also do** | Optional actions, e.g. making a chore due in your chore app. They run alongside the notification, so a notify service that has gone missing (a replaced phone gets a new `notify.mobile_app_*` name) doesn't stop them, and theirs failing doesn't stop the notification. Don't mark the part done here. |
| **To-do list** / **To-do item text** | Optional. An item is added when the part is due. Ticking it records the swap; deleting it does not. However the swap is recorded, the item is then taken off the list, ticked or not. On a list that drops ticked items instead of keeping them, a tick looks the same as a delete and records nothing, so use a button or the event there. |
| **Buttons that record the swap** | Optional Button helpers (or any button entity). |
| **When the swap is recorded, also do** | Optional actions, e.g. taking one filter out of a stock count. They run alongside the confirmation. |
| **Also push a notification when the swap is recorded?** | Off by default. The confirmation is a quiet notice under Settings -> Notifications. |

Known limit: the part is checked for due once a day, so one that crosses its
limit while Home Assistant is down is reported the next day. The runtime
count is a sample: a run shorter than the sampling interval may be missed or
counted as a whole interval, which evens out over hundreds of hours. With
**Minutes before another use can count** above 0, a use that starts within
that many minutes of a Home Assistant restart isn't counted, because the gap is
measured from the counter's last change and a restart resets that time. That
costs about one use per restart.

Every sample leaves a trace, including the ones that find nothing running, so
the default 5 stored traces cover well under an hour. To see why a daily check
or a swap did what it did, open its trace soon after it runs.

### The companion sensor: Consumable Life Used

[![Open your Home Assistant instance and show the blueprint import dialog with a specific blueprint pre-filled.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fohlemacherd%2Fhome-assistant-blueprints%2Fblob%2Fmain%2Fblueprints%2Ftemplate%2Fohlemacherd%2Fconsumable-life-used.yaml)

**File:** [`blueprints/template/ohlemacherd/consumable-life-used.yaml`](blueprints/template/ohlemacherd/consumable-life-used.yaml)

A template sensor for a dashboard. It shows how much of the part's life is
used up, in percent, against whichever limit is nearer. The attribute
`limited_by` says which limit that is (`use`, `runtime` or `age`), so a tile
can read "82%, by age" instead of a bare count. Other attributes carry the
count, the days since the swap and both limits. It keeps climbing past 100%
until the swap is recorded. Create it under **Settings -> Devices & services
-> Helpers -> Create helper -> Template -> Template a sensor**, choose "use a
blueprint", and give it the same counter, date helper and limits as the
automation. It doesn't read them from the automation. The sensor is optional:
the automation works without it.

---

## AI Camera Yes/No Check (won't guess)

[![Open your Home Assistant instance and show the blueprint import dialog with a specific blueprint pre-filled.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fohlemacherd%2Fhome-assistant-blueprints%2Fblob%2Fmain%2Fblueprints%2Fscript%2Fohlemacherd%2Fai-camera-yes-no-check.yaml)

**File:** [`blueprints/script/ohlemacherd/ai-camera-yes-no-check.yaml`](blueprints/script/ohlemacherd/ai-camera-yes-no-check.yaml)

| At a glance | |
|---|---|
| **What I need** | A camera, an AI Task entity that accepts images (Home Assistant 2025.8 or later), and one Toggle helper. Optional: a Text helper for "couldn't tell" notes and a Date and time helper for "last confirmed". |
| **Effort** | **Low** - 10 minutes, then a few test runs from the script's page until the question is worded so the camera can answer it. |
| **Cost - required** | **$0 hardware** if you already have the camera. AI calls cost well under a cent per check on a cheap cloud model, and nothing with a local vision model. |
| **Cost - optional** | None. |

Turns a camera into a yes/no sensor. You write one question in plain words,
and each time the script runs it sends one snapshot to an AI Task entity and
writes the answer into a Toggle helper. From then on the Toggle behaves like
any other sensor, so automations can trigger on it to mark a chore done, send
a reminder or stay quiet. That covers a garage door with no door sensor, bins
still at the curb, a package on the porch or a car left out.

| Question | The Toggle is ON when | "On when the answer is" |
|---|---|---|
| "Is the big garage door open, even partly?" | the door is open | Yes |
| "Is there a package on the doormat?" | a package is waiting | Yes |
| "Are any trash carts standing at the curb?" | the carts are still out | Yes |
| "Is a car parked in this bay?" (a camera inside the garage) | the car is out | No |

The last row shows why the answer can be inverted. Ask about what the camera
can actually see, which is not always the thing you want to know, and then
flip the answer.

### Why not a normal AI camera blueprint?

Most AI camera blueprints describe a snapshot in free text and send it to the
logbook or a notification. That is fine for a person to read, but an
automation has nothing it can act on. Ask a vision model a straight yes/no
question instead and a second problem appears: it will answer even when the
picture is black or blurred, or when the thing you asked about is out of
frame, and its own description of the scene will quietly contradict the
answer. This blueprint makes the model describe what is in the frame
*before* it answers and say whether the image is usable at all. An unusable
image never changes the Toggle, which keeps its last answer, while the reason
goes to an optional Text helper. A slightly stale answer that was true is
better than a confident guess, especially one that nags someone about a
chore they already did.

It sends one snapshot, not a clip. When nothing in the scene is moving (a
door, a bin, a parked car), extra frames add no quality. They add noise
instead: a passing car, a branch in the wind, a change in exposure.

Pair it with the [Escalating Left-Open Reminder](#escalating-left-open-reminder)
above by pointing that blueprint at this Toggle, and a garage door without a
sensor gets reminders too. The Toggle changes only when a check runs, so two
settings matter:

- Run the check on a steady interval, for example every 10 minutes (a time
  pattern trigger with minutes set to `/10`). That is 144 AI calls a day.
- Set the reminder's stage delays longer than that interval, for example
  15/30/60 minutes. With the default 1/5/15, a door closed right after an
  "open" read still gets all three reminders, because the Toggle stays ON
  until the next check.

If the camera can't see, the Toggle keeps its last answer, and that can be
"open". The reminders then keep escalating until a check can see again.

### What you need before importing

- A **camera** whose still snapshot is a real, current picture. Open it in
  Home Assistant and check before you start. Some cameras (WebRTC-only
  streams, battery cameras that sleep) return a black or placeholder still.
  Every check on one of those comes back unusable, which is the honest
  answer, and the fix is the snapshot, not the question.
- An **AI Task entity** that accepts image attachments (Settings -> Devices
  & services -> your AI integration). The picker only lists entities that
  do.
- One **Toggle helper** for each question: **Settings -> Devices & services
  -> Helpers -> Create helper -> Toggle**. Don't share one between checks.
- Optional: a **Text** helper for the "couldn't tell" note and a **Date and
  time** helper for "last confirmed".

This is a **script** blueprint. After importing it, go to **Settings ->
Automations & scenes -> Scripts -> Create script** and pick the blueprint.
Make one script for each question. Run the script from an automation (a time
trigger, or right after something happens) or from a dashboard button. Each
run is one AI call, so don't put it in a loop.

### Inputs, in plain language

| Input | What it is |
|---|---|
| **Camera** | The camera to look through. |
| **Question** | One yes/no question about something the camera can clearly see. Say what the thing is, where it sits in the picture, and what should not count. |
| **Turn the result helper on when the answer is** | Default Yes. Pick No to invert it, as in the last row of the table above. |
| **AI Task entity** | The model that looks at the picture. It must accept images. |
| **Result helper** | The Toggle that holds the answer. It changes only when the camera could see. |
| **"Couldn't tell" note** | Optional Text helper. Gets "12:00 - couldn't tell: too dark to see the door" on an unusable check and is cleared by the next good one. It is cut to fit the helper's maximum length (100 by default). |
| **Last confirmed at** | Optional Date and time helper. It is stamped only when the answer was confirmed, not on every attempt, so its age tells you how old the Toggle's answer really is. |
| **Extra instructions** | Optional notes about the view, for example "night vision is black and white" or "the door's bottom seal is black, so a dark line is not a gap". |

### Using the answer in an automation

Most people only need the Toggle. To act on a single check straight away,
call the script and read what it returns:

```yaml
actions:
  - action: script.porch_package_check   # the script you created from this blueprint
    response_variable: check
  - if: "{{ check.outcome == 'yes' }}"
    then:
      - action: notify.mobile_app_your_phone
        data:
          message: "Package on the porch - {{ check.reasoning }}"
```

`check.outcome` is `yes`, `no` or `unusable`, and it is the one to act on.
`check.answer` is what the model said even when the image was unusable. Use
it to tune the question, not to act on. Also returned: `usable`,
`helper_state` (`on` / `off` after the check), `scene` (the model's
one-sentence description) and `reasoning`. To keep an automation from acting
on an old answer, add a condition on the "last confirmed" helper, for
example `{{ now().timestamp() - state_attr('input_datetime.porch_package_confirmed', 'timestamp') | float(0) < 7200 }}`
for "confirmed in the last two hours".

---

## Proof-of-Run Equipment Check

[![Open your Home Assistant instance and show the blueprint import dialog with a specific blueprint pre-filled.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fohlemacherd%2Fhome-assistant-blueprints%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fohlemacherd%2Fproof-of-run-check.yaml)

**File:** [`blueprints/automation/ohlemacherd/proof-of-run-check.yaml`](blueprints/automation/ohlemacherd/proof-of-run-check.yaml)

| At a glance | |
|---|---|
| **What I need** | Something that shows when the equipment runs - an entity with a "running" state (a robot vacuum, a generator's status, a running `binary_sensor`) or a live power reading - and one Date and time helper. Optional: a second Date and time helper, so a run can complete the test for you. |
| **Effort** | **Low** - 10 minutes, plus a look at the equipment's history to set the idle threshold. |
| **Cost - required** | **$0** if the equipment already reports when it runs. |
| **Cost - optional** | A power-monitoring plug for plug-in equipment, $12-25. Read the sump pump caution below before you put a pump on one. |

For equipment you're supposed to test now and then but that also runs by
itself: a sump pump, a standby generator that exercises weekly, a well pump,
a water softener's regeneration, a dehumidifier, a robot vacuum. Every real
run is written into a helper. A real run counts as the test. At most once
every N days it can complete your "test the equipment" chore for you, so the
chore history shows the equipment working instead of "never done". It asks a
person to test the equipment by hand only when nothing has run for a while.

### Why not a calendar reminder?

A calendar can't tell a pump that ran fifty times last month from one that
hasn't moved since spring, and that difference is the only reason to test it.
A monthly reminder nags about the healthy pump and tells you nothing new about
the seized one, so people learn to ignore it. This turns it around: a run
*is* the test, and silence triggers the ask, not the date. If a sensor stops
reporting, that counts as silence too, and the ask says so: no readings means
no proof either way. Appliance-notification blueprints tell you a cycle
finished. This one asks a different question: does the equipment still work
at all?

Two details matter:

- **The run is written to the helper before any of your actions run.** That
  way a flapping sensor can't trigger a burst of completions. Your actions run
  last, so a failing one can't swallow the notification.
- **A new Date and time helper starts at midnight today, not at "never".**
  For the last-run helper that's harmless: the silence clock starts the day
  you create it. For the auto-complete helper it would make the first
  auto-complete wait the full interval, so set that helper to any past date
  once, right after you create it.
- **Both helpers must hold a real date.** If one is deleted, unavailable or
  set up as time only, an unreadable auto-complete helper never completes the
  chore, and an unreadable last-run helper means it never asks, with no
  warning. Use Date and time helpers, and two different ones.

**Setting the idle threshold.** Open the equipment's history, find the
longest gap between runs in normal use, and set about three times that. A
generator that exercises every 7 days works out to 21. A robot vacuum on a
daily schedule that sometimes skips a day (longest gap 2 days) works out to 6.
That's long enough that a quiet spell doesn't trip it, and short enough that a
stuck float or a seized motor does.

**Sump pumps on a smart plug.** This blueprint only reads; it never switches
anything. But if you measure a pump through a smart plug, make sure nothing
else can ever switch that plug off. Hide or disable its switch entity, keep it
out of "all off" scenes and groups, and use a plug rated for the motor's
start-up draw.

If you inspect the equipment without making it run, set the last-run helper
to now by hand and the clock restarts.

**Known limit:** the check asks only on exact day counts: the day the silence
reaches the threshold, then every reminder interval after it. A missed day is
not made up the next morning. The ask comes at the next reminder instead, up
to that many days late. A day is missed when Home Assistant is down at check
time, when the automation is turned off that day, when the threshold is
lowered after the silence has already passed it, or when the last-run helper
is set by hand to a date already past the threshold. So when you set it by
hand, set it to now, not further back.

### What you need before importing

- One way to see a run:
  - **Option A:** an entity whose state means "running", such as a robot
    vacuum's `cleaning`, a running or power `binary_sensor`, or a generator's
    status sensor.
  - **Option B:** a live power reading in watts or kW.
- One **Date and time helper** for the last run: **Settings -> Devices &
  services -> Helpers -> Create helper -> Date and/or time -> Date and time**.
  Create one per instance of this blueprint. Don't share it.
- Optional: a second **Date and time helper** for the last auto-complete, not
  the same one as the last-run helper. Set it once to any past date.
- Optional: the actions you want run, such as completing a chore in a chore
  tracker or adding an item to a `todo` list.

### Inputs, in plain language

| Input | What it is |
|---|---|
| **What to call this equipment** | Used in the notification, e.g. "Sump pump". |
| **Entity that shows it running (option A)** / **"Running" state** | Fill in this or the power sensor. The default state is `on`; a robot vacuum uses `cleaning`. |
| **Power sensor (option B)** / **Running power threshold (W)** | A live power reading. Anything above the threshold counts as running. The threshold is in watts, default 20 W; a sensor that reports in kW is converted. Check one real run in the history to set it. |
| **Minimum run time** | How many seconds it must keep running to count. Default 30. 0 counts the moment it starts. Use about 900 for a robot vacuum, so an aborted spot clean doesn't count. |
| **Last-run helper** | The Date and time helper above. Every real run writes to it. |
| **Days of silence before asking for a test by hand** | Default 21 (three times a weekly cycle). Set about 3x your longest normal gap. |
| **Ask again every ... days while it stays silent** | Default 7, minimum 1. A test by hand makes the equipment run, which stops the asks. The repeat also makes up a missed ask (see Known limit above). Your "test is due" actions run on every ask. |
| **Last auto-complete helper** / **Minimum days between auto-completions** | Optional. With the helper set, a run counts as the test at most once per interval (default 30 days). Use a different helper from the last-run one. |
| **When a real run counts as the test** | Optional actions, e.g. complete a chore or tick a to-do item. Templates can use `label`. |
| **When a test by hand is due** | Optional actions that run on every ask, after the notification. Templates can use `label`, `idle_days` and `no_telemetry`. |
| **How to test it by hand** | An optional sentence added to the ask, e.g. "Pour a bucket of water into the pit and watch it cycle." |
| **Notify service** | Default `notify.persistent_notification`. Use e.g. `notify.mobile_app_your_phone`, or a script of your own that takes `title` and `message`. |
| **Daily check time** | When it looks for silence each day. Default 09:00. |

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
chattering - a vent that was moving hundreds of times a day settles to a handful.

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

## What to expect

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
