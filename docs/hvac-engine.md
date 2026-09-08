# The HVAC engine: a thermostat, six smart vents, and a year of not fighting the family

The biggest thing running in this house is not a blueprint and can't be one:
about thirty automations around one Ecobee with remote sensors and six Flair
vents, built over a year against a single hard constraint - **nobody in the
house may ever feel the automation revert something they chose.** This is the
shape of it, the layers, and the lessons, generalized. Two pieces of it are
blueprints in this repo (the
[effective thermostat target](../blueprints/template/ohlemacherd/effective-thermostat-target.yaml)
and [vent modulation](../blueprints/automation/ohlemacherd/vent-modulation-to-target.yaml));
the rest is described so you can build your own version.

## The layers, bottom to top

**0. One kill switch and one hold.** Every HVAC automation checks a single
`input_boolean` first; off means the house is dumb again instantly. A second
boolean, the *manual hold*, switches on the moment a **human** changes the
setpoint - wall, app, dashboard - and every give-back automation stands down
until the next morning's reset. The detector knows a human from an automation
because every automation that writes the thermostat is registered in a list;
a write from anything not on the list is a person. The hold also stamps an
*engaged-at* time into an `input_datetime`, because the boolean's own
`last_changed` can't survive a re-crank or a restart.

**1. Safety, unconditional.** Per kids' room: below 65°F or above 73°F for
15 minutes → notify *first*, then move that room's vent in the helpful
direction with `continue_on_error`, so a cloud failure can never swallow the
alert. A master-bedroom heat emergency (>73°F for 20 min with the AC not
running) flips to heat_cool with a sane band, throttled to one mode change per
30 minutes; above 76°F it stops acting and pages, because at that point the
automation is not keeping up and a person needs to know. Safety never checks
the hold: a deliberate human choice can't switch off a floor.

**2. Vents, per room.** Each room has one modulator: while the system is
actively heating or cooling, open the vent when the room is on the wrong side
of its target by more than a hysteresis band, close it once the room is at
target so the air goes where it's still needed; while the system is idle, do
nothing. One room is allowed to be as cold as the system can make it - its
vents never close during cooling. That is the blueprint; the rest of this doc
is what feeds it a target and keeps the thermostat honest.

**3. Forecast-driven mode, three fires a day.** 06:00 runs the full decision
tree on today's forecast (very cold low → heat; hot high → cool; mild → heat_cool
with a safe 6°F band, because the thermostat silently widens anything narrower).
12:00 only refines the cool setpoint for the revised humidity and never changes
mode. 17:00 runs the tree on **tomorrow's** forecast to pre-stage the night
(switch to heat tonight if tomorrow's dawn will be below 38°F, so the house is
warm before sunrise instead of scrambling). Wind chill lowers the effective
low; a muggy dew point lowers the cool setpoint by one degree. Notify only when
something actually changed - measured, 95% of noon fires and 100% of evening
fires were no-ops under the old design and each one used to push.

**4. The evening ladder.** Instead of one bedtime crank, the cool setpoint
steps down through the evening on a published plan - one degree at 15:00, the
sleep number from 20:00 on hot nights - so the bedroom is cold at lights-out
without running the compressor at 15:00 for a room nobody's in until 22:00.
The plan lives in one template sensor that every other automation reads, which
is the whole point of the next layer.

**5. Guards that know what hour it is.** Three automations can raise the cool
setpoint back up when the house is too cold: an afternoon overcool guard, an
overnight restore (someone cranked it at bedtime; by 02:00 the downstairs is
62°F), and a reactive comfort call (two rooms cold plus motion in the living
areas). All three now share one rule: **the floor they restore to is the
sanctioned number for the hour** - the daytime ideal until 15:00, the ladder's
plan until 20:00, the sleep number after - so no guard can ever raise the
setpoint above what the active regime is deliberately holding. Before that
rule each guard had its own idea of "normal", and one night the overcool guard
reverted the ladder's own 20:00 step an hour after it was made, spent a
compressor-hour, surrendered it before bed, and pushed a notification calling
the ladder's write "a manual setpoint". No human had touched anything.

**6. Hold discipline.** A hold engaged at lunchtime used to disable the entire
evening - the ladder, the hot-night branch, the give-back, the guard - because
it was respected until 06:00. Now a hold engaged before 17:00 expires silently
at 18:00 (the chip on the dashboard disappearing is the signal), and a hold
engaged 18:00-22:59 is treated as *the bedtime crank*: the overnight restore
may override it, but only once the bedroom is actually cold, and only once per
night. A hold engaged after 23:00 stands all night; that one's deliberate.

**7. Free cooling and a furnace lockout.** When outdoor air is cooler than
inside on a night the AC would otherwise run, pause it. And a whole-house
furnace lockout that watches the *equipment*, not any automation: heating
sustained for three minutes with outdoor ≥64°F drops the heat side so the
furnace stops, unless the hold is on (then it only notifies and says how to
clear the hold). It exists because a reactive "the kids are cold" call once
ran the furnace in mid-June with the outside at 78°F. The 62/64 hysteresis
between the heat callers' outdoor gate and the lockout's is what keeps them
from oscillating against each other.

## The lessons that cost the most

- **Read the thermostat's own settings, not just your YAML.** The single
  biggest finding of an audit was that 73% of compressor runtime ran *below*
  setpoint - a cloud-side "overcool to dehumidify" feature, visible in Home
  Assistant only as a `humidity: 40.0` attribute. Zero automations were wrong.
  Then do the honest arithmetic: "73% of runtime is anomalous" is not "73% is
  recoverable" - load follows the indoor/outdoor delta, and the real saving
  was 10-15%.
- **Every numeric trigger gets a plausibility band.** One morning three remote
  sensors all reported 212°F (100°C - a cloud fault, not a battery). `| float`
  defaults catch *unavailable* and happily accept 212. Only trigger durations
  saved the house from the heat emergency acting on it - luck, not design.
  Floors take 40-65, ceilings 73-110, and the reactive call collapses anything
  implausible to a neutral 70.
- **A guard's notification must not assert an origin it cannot know.** "Manual
  setpoint reverted" when no human was involved manufactures exactly the
  she-set-it-and-it-undid-it story the whole system exists to prevent. If the
  producer has no origin signal, the message says what happened, not who.
- **When a new regime plans deliberate excursions, re-derive every guard's
  floor per hour against the full timeline** - the first rebase checked the
  guard against the 15:00 step and missed the 20:00 dip.
- **The pull chain is part of the system and software cannot see it.** A
  ceiling fan's chain was found on *medium* after a day of recalibration had
  been measured through it. `fan.percentage` reports what was commanded, never
  what was delivered. Every fan figure before that date was a medium-capped
  fan, and nothing in software will ever say so if it moves again.
- **`last_triggered` is not evidence the equipment did anything.** It says an
  automation ran. A time-weighted history pull of `hvac_action` says what the
  compressor did. Audit the second.
- **Put the vent vendor's cloud in manual mode.** Its "set point controller"
  flipped itself to the mode where it writes the thermostat from its own room
  targets, and walked the setpoint 69→72 eleven times in one day. In manual
  mode the vendor moves nothing and its integration blanks every room entity
  by design - which is why the thermostat, not the vents, is the source of
  truth for every target in this house.
- **Human behaviour is a control input.** One adult cranks the thermostat at
  bedtime two nights in three. Every automation that "wasn't firing" turned
  out to be correctly standing down behind that hold; an automation that
  reduces a human behaviour un-masks every other automation that behaviour was
  suppressing. Design for the household you have.

## What it's built from

An Ecobee with three remote sensors (a `climate` entity with `hvac_action`
and per-room temperature sensors is all that's really required), six Flair
vents with pucks, a whole-home energy monitor for the "is the compressor
actually running" signal, an outdoor weather entity with wind and dew point,
five `input_number`/`input_datetime`/`input_boolean` helpers, one template
sensor for the plan, and one for the effective target. About thirty
automations. A changelog that is longer than the architecture doc, which is
the honest measure of how many of these lessons were learned the second time.
