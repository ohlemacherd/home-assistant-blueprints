# The hard-won ones: the automations that had to be fixed the most times

Every automation in this house carries its own dated fix history in its
`description` field - the rule is that the YAML explains why it is the way it
is, so a future edit doesn't undo a lesson. That makes "how much did this one
cost" measurable: count the distinct dates in the description. Out of 145
automations, 29 have three or more dated revisions. These are the ones at the
top, in order, with the lesson each one finally taught. If you build one thing
from this repo, build the thing whose failure modes are already written down.

| Rev. | What it is | The lesson |
|---|---|---|
| 6 | The evening setpoint ladder | Measure the human first; get the number there *before* they reach for the thermostat. |
| 6 | Ceiling fan speed from room temperature | The fan is the per-room tool, the setpoint is the whole-house one - and the pull chain is invisible to software. |
| 5 | Daily briefing refresh chain | A pipeline's stages have an order; the briefing fired before the context it needed existed. |
| 5 | The afternoon overcool guard | Every guard must agree on what "normal" is, per hour. |
| 5 | Guest-room vent manager | Only act while the system runs; stop fighting the vendor's reopen. |
| 4 | Sleep-mode clear at sunrise | Turning off a switch that's already off is not an event, and the thing you needed was the event. |
| 4 | The manual-hold detector | Three automated reversals of two human changes in one afternoon: the stack was fighting the person it serves. |
| 4 | Fan auto-on when hot | A threshold that never arms reads as coverage and is worse than none. |
| 3 | Basement-door toddler ladder | 10 seconds, not 60: tune the delay to the risk that actually happened, and make each firing cheap instead of rare. |
| 3 | Gentle early-morning lights | Two signals racing each other lose to a light switch; trigger on whichever comes last. |
| 3 | The camera → vision → notification pipeline | Only ask a camera about what it renders large; never let a dead stream absorb requests; page once per outage. |
| 3 | CO alarm push | The action list sent two pushes and went silent for the rest of a sustained event - read what your `repeat` actually does. |
| 2 | Office light: motion on, phone off | A PIR can fail sticky-on *and* sticky-off; trust it for "occupied", never for "empty". |
| 2 | Re-assert a lamp OFF when it flaps back on | "It was not presence" - recorder history, not the obvious suspect. |
| 2 | The door chirp | The sound went through three formats in one day: WAV died on MIME, AIFF was silently dropped by the announce API, MP3 plays. |

## The stories

**The evening setpoint ladder.** One adult in this house cranks the thermostat
at bedtime two nights in three. Thirty-one days of history: 25 human setpoint
writes, 21 downward, 15 of them landing on exactly the same number. Median
crank 21:59 - and the automation's "settle" step fired at 22:00, so it was
losing by minutes, night after night. The crank nights and the quiet nights
differed by less than a degree in room temperature, which means it was never a
response to a hot room; it was a bedtime habit with a target number. The
rebuild: get that number there *first* (a 15:00 step ahead of every afternoon
crank on record, the sleep number by 20:00 on hot nights) and take the degrees
back after everyone is asleep. Four nights in a row the setpoint already read
her number at bedtime and she touched nothing. Six revisions to learn that the
data you need is the human's behaviour, not the sensor's.

**Ceiling fan speed from room temperature.** Never turns the fan on - that
stays human. Speed bands are relative to the room's target, and they moved
one notch gentler at the sleeper's request ("too hot is worse than too high a
fan" still capped it at the quiet floor). Then an evening step was added and
the audit found the automation *could not run in the evening at all* - its
top-level condition required occupancy or the sleep window, and the evening
was neither. And then the pull chain: found on medium after a day of
recalibration had been measured through it. `fan.percentage` reports what was
commanded, never what was delivered.

**The daily briefing refresh chain.** It fires three times a day to match the
daypart it writes for. The start-up delay went 45 → 120 seconds because a
post-crash boot produced no briefing (the AI integration wasn't up yet). Then
the morning run was found to always use *yesterday's* context, because the
relay that pushes the household context posted after the briefing ran - so
the context sensor became a trigger. Then the whole morning moved 30 minutes
earlier, and the on-device generator became the primary with this as the
fallback behind a freshness gate. The live chain is now a timeline: triage →
relay → primary → fallback, each 15 minutes after the last. A pipeline's
stages have an order, and every one of these revisions was an ordering bug.

**The afternoon overcool guard, the overnight restore and the reactive call.**
Three automations that raise the cool setpoint back up when the house is too
cold. Each had its own idea of "normal". The night the guard reverted the
ladder's own deliberate 20:00 step - an hour after it was made, spending a
compressor-hour and then surrendering it before bed, with a push calling the
ladder's write "manual" - was the night the rule became: the floor any guard
restores to is the sanctioned number *for the hour*, and no guard may ever
raise the setpoint above what the active regime is defending.

**The guest-room vent manager.** The coldest room on its duct run, so closing
its vent during cooling feeds the hot room next door. Version one evaluated on
every temperature reading, 24/7, and fought the vent vendor's "open when the
fan runs" fallback: 99 reopens and 204 moves in a day, on a battery vent.
Close only during *active* conditioning; open branches stay mode-based; and
later, per the household's request, the room's own sensor controls the vent in
every mode, not just while cooling.

**Sleep-mode clear at sunrise.** A fail-safe that turns off four adaptive-
lighting sleep-mode switches at sunrise so the first floor is never stuck dim
all day. It had a silent hole: on any night nobody tapped Goodnight, sleep
mode was already off, turning it off produced no state change, and it is the
state *change* that makes the lighting integration release its manual-control
lock. The kitchen sat at 11% against a 100% target at ten in the morning.
The fix was an explicit release call. Then that call was removed again, on
purpose, when it turned out to override the household's rule that lights must
never adjust after a physical wall press - and the description records both
decisions so the second doesn't read as a regression of the first.

**The manual-hold detector.** History forensics on one June afternoon: three
automated reversals of two deliberate human setpoint changes (a noon forecast
pass, the overcool guard, the evening forecast pass), the house a uniform 69°F
throughout. Nothing was wrong with the house; the stack was fighting the
person it serves. The detector fires on any setpoint attribute change and
ignores it if one of the registered writer automations triggered in the last
20 seconds; what survives is a human, and a human engages the hold. Caveat
that cost a revision: the thermostat's own schedule and eco features also look
human, so the native schedule stays flat and its smart away stays off.

**Fan auto-on when hot.** The evening branch was set at target+4°F. The
audit's bulk `last_triggered` pull showed it almost never armed - evening
rooms ran 67-68.5 and +4 was 69 - while the sleeper cranked the whole-house
thermostat 18 times in 31 days chasing a 1.4°F evening rise in one room. At
+2 the fan absorbs that rise. An automation that can't fire in the house's
actual thermal regime is worse than none: it reads as coverage.

**The basement-door toddler ladder.** A contact sensor on the basement stairs
door, because a crawling baby can reach it, after the older kid left it open
with the baby right there. The first draft used a 60-second delay on the
theory that adults forget doors. Wrong risk model: the real failure is fast
and adjacent. Ten seconds. It fires on ordinary trips to the basement, and
those are true positives - the design answer is to make each firing *cheap*
(one 0.85-second two-note chime, never repeated at tier one), not rare. Open
and closed inside ten seconds is silent, which removes most of the traffic on
its own.

**Gentle early-morning first-floor lights.** Ease the lights on at 15% when one
adult comes down early and the other is asleep. Two mornings in a row it
didn't fire, and the assumed cause (the watch) was wrong. Recorder history:
the phone hit the first floor at 04:50:02, the 15-second hold completed at
04:50:17, and the floor's occupancy sensor flipped on at 04:50:19 - two
seconds too late for a single-snapshot condition. By 04:50:45 the human had
flipped the switch, which is the failure the automation exists to prevent.
Fix: trigger on whichever signal arrives *last*, with both as conditions.

**The camera → vision → notification pipeline.** The one people ask about.
A camera's own person event grabs a *warm* go2rtc frame (about 3 seconds;
a cold WebRTC connect is 40 and useless), asks a vision model to classify and
describe, pushes the snapshot with one line, and suppresses when the model
says nothing is there. Per-camera cooldowns so kids in the yard ping once, not
every 30 seconds - but a new category (a delivery while the kids are out)
breaks through. If the analyzer fails, a bare "person detected" still goes
out, throttled, so a real event is never silently dropped. The keep-warm that
makes the 3-second frame possible pulled every 30 seconds from every outdoor
stream, and when one camera's stream died upstream (the vendor answering 400
to every WebRTC request) each pull stacked a new consumer onto the dead
producer - 438 of them, for nothing; a dead stream is now warmed only every
five minutes. And the health watcher that noticed the dead stream paged on
every flip, six pushes per reboot, until it became the
[Debounced Outage Alert](../blueprints/automation/ohlemacherd/debounced-outage-alert.yaml).
Three separate lessons, one pipeline: ask the camera only about what it
renders large and central; never let a dead stream absorb requests; page once
per outage.

**CO alarm push.** "Repeat every five minutes until the level drops" - and the
action list sent exactly two pushes and went silent for the rest of a
sustained event, despite its own description. Then the fixed version spammed
"unavailable ppm" every five minutes forever when the sensor dropped out
mid-event. The physical siren is the annunciator; this is the phone layer, and
the phone layer has to terminate.

**Office light: motion on, phone presence off.** Measured at 15:22 one
afternoon: the office occupancy sensor asserting *occupied*, the light on, and
the phone demonstrably upstairs. A PIR fails sticky-on (the light burns all
day) and, rarely, sticky-off (sit still long enough and it snaps off in your
face, with no transition because that dimmer discards it). So occupancy is
trusted to say "someone is here" and never to say "nobody is". Presence turns
it off.

**Re-assert a lamp OFF when it flaps back on.** "My phone presence turned the
living-room lights on after they'd been turned off for the night - a big no
no." It was not presence; that automation is gated to 04:30-08:00 and fired
once, at 05:36. Recorder history: the two lamps came back on *by themselves*,
one in the same second as the goodnight script, the other at 00:48 after a
network dropout - about a hundred unavailable-then-on events per night, every
recovery landing ON. A mesh fault, not YAML. The automation catches the flap
specifically by triggering on `from: unavailable`, which a human switching a
lamp on can never produce; and if anyone is downstairs it does nothing, so
someone up at two in the morning keeps their light.

**The door chirp.** A two-note descending chirp on the living-area speakers
when an exterior door opens - the security-panel gesture. The sound file went
through three formats in one day: WAV refused on MIME type by the speaker,
AIFF accepted on the queue path and *silently dropped* on the announce path
(fetched, status OK, no sound - the door opened four seconds after the fix and
nothing played), MP3 works everywhere. The volume is computed per speaker and
clamped, because the announce API's volume is absolute and a party at 50
would otherwise chirp at 58.
