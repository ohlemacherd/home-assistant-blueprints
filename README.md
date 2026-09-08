# Home Assistant Blueprints

A small collection of Home Assistant automation blueprints. Currently one:
**Smart Plug Charger Cutoff.**

This is a hobby side-project, not a supported product - see "Honest
expectations" below.

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

### Install

1. In Home Assistant: **Settings -> Automations & Scenes -> Blueprints ->
   Import Blueprint.**
2. Paste this raw file URL:
   `https://raw.githubusercontent.com/ohlemacherd/home-assistant-blueprints/main/blueprints/automation/ohlemacherd/charger-done-outlet-off.yaml`
3. Click **Preview**, then **Import Blueprint**.
4. Create a new automation from the imported blueprint and fill in the
   inputs below.

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

### Honest expectations

This is one blueprint, pulled out of a personal Home Assistant setup and
generalized, published to see whether it's useful to anyone else. It has
not been tested across the wide range of smart-plug integrations and power
sensor quirks that exist in the wild - if something about your specific
plug doesn't map cleanly onto "a power sensor and a switch," you may need
to adjust thresholds or the automation itself. Issues and pull requests are
welcome, but there's no support SLA behind this - it's a nights-and-weekends
project.

If it saved you from writing this automation yourself and you'd like to
say thanks:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?logo=buy-me-a-coffee&logoColor=white)](https://buymeacoffee.com/ohlemacherd)

## License

[MIT](LICENSE)
