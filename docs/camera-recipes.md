# Five camera checks, with the questions that worked

The [AI Camera Yes/No Check](../README.md#ai-camera-yesno-check-wont-guess)
script asks a camera one question. The
[Camera Check on a Schedule](../README.md#camera-check-on-a-schedule-push-or-tick-a-chore)
automation runs it when the answer matters and acts on it. These are the five
checks that run in the house they came from, rebuilt here on the two
blueprints, with the question wording that took the longest to get right.
Each is one AI call per run; two are daily, so all five together are about
16 to 20 calls a week.

## The lesson that cost weeks: ask about what the camera renders large

The first version of the bins check asked a driveway camera "are the carts at
the curb?". The curb was a thin, heavily distorted strip along the top edge of
the frame, maybe three percent of the image, and the model answered
confidently and wrongly for weeks. The fix was not a better model. It was a
better question: ask about the driveway apron, which fills the frame, and
infer "out" from "not here". Every recipe below passed the same test: the
thing in the question is big and central in the picture, or the camera is
wrong for the job.

Two more habits that hold across all five, both built into the yes/no script:
make the model describe the frame before it decides, and tell it not to infer
from the time of day. A vision model asked a yes/no question will answer a
black frame; describing first is what stops it.

## 1. Bins out tonight? (the inverted question)

**Camera:** looking down the driveway toward the garage.
**Question:** "Are one or more wheeled trash or recycling carts still sitting
in the clearly visible driveway area - on the apron, beside the garage, or
against the house? Ignore the street along the top edge entirely, and ignore
carts inside an open garage."
**Extra instructions:** "The street strip at the top of the frame is distorted
and not reliable; do not try to judge the curb."
**On when the answer is:** Yes (the Toggle means "carts still here").

**Schedule:** the evening before pickup, a couple of hours after your trash
reminder. Push when **Yes** ("The camera still sees the carts up by the
house: {{ reasoning }}"). To-do to tick when **No**: "Bins out" on the
household list - the chore closes itself when the camera sees they went out,
and nobody is nagged about a chore already done. For holiday-shifted weeks,
make a second copy of the automation for the next weekday and gate the two
on a "shift week" Toggle - the one the
[Trash Night Reminder](../README.md#trash-night-reminder-holiday-shift-aware)
keeps for you - so the reminder and the camera always agree about which
night it is.

## 2. Bins still at the curb the day after?

Same camera, opposite question, and the camera can answer it badly for the
reason above. Prefer a camera that sees the curb large - a doorbell camera
facing the street often does. **Question:** "Are any wheeled trash or
recycling carts still standing at the curb or street edge? Carts beside the
garage or up the driveway do not count - those are put away." **On when:**
Yes. **Schedule:** the afternoon after pickup, push when Yes. If no camera
sees the curb well, skip this recipe rather than run it on a bad view.

## 3. Package still on the porch at dusk

**Camera:** a doorbell or porch camera where the deck and doormat fill the
lower half of the frame.
**Question:** "Is a delivered parcel sitting on the porch - a cardboard
shipping box, a padded envelope, a poly mailer, or a grocery tote? Do not
count doormats, rugs, planters, flower pots, a garden hose, furniture,
seasonal decorations or shoes - anything that belongs to the porch."
**On when:** Yes.

**Schedule:** at sunset, offset -00:30:00 (light to judge by, time to walk
out). Push when **Yes**: "A parcel is still outside and it is getting dark:
{{ reasoning }}", with the camera attached. Why dusk and not a delivery
notification: carriers' notifications are unreliable and the porch either has
a box on it or it does not; looking is more reliable than inferring.

The script's result Toggle doubles as a dashboard tile ("package on the
porch"). One more tiny automation clears it: when the front door contact
opens while the Toggle is on, turn the Toggle off - somebody brought it in,
or at least walked past it.

## 4. Car left in the driveway overnight

**Camera:** the driveway camera again; a vehicle on the apron is the largest
object in the frame, which is exactly the shape of question it is good at.
**Question:** "Is a car, truck, SUV or van parked on the driveway surface
itself? Do not count vehicles inside the garage, vehicles on the street at
the top edge of the frame, or a vehicle in a neighbour's driveway."
**On when:** Yes.

**Schedule:** 22:30 - this is about the household being settled for the
night, not about darkness. Push when **Yes**: "The driveway camera still sees
a vehicle parked outside: {{ reasoning }}". Silent when no, silent when the
frame is unusable.

## 5. Anything left out on the patio before rain

**Camera:** a patio camera with the table, chairs, grill and fire pit large
and central.
**Question:** "Is anything on the patio left out that rain or wind would ruin:
a patio umbrella with its canopy open, a grill with no fitted cover on it,
seat cushions, towels or toys sitting out on the furniture, or a fire pit
with no lid on it?"
**Extra instructions:** "An umbrella is closed if it is furled, tied or
wrapped around its pole. The grill is covered if a fitted fabric cover is
over it. The fire pit is covered if a lid sits on the bowl."
**On when:** Yes. The `reasoning` names which thing it saw, so one question
covers four items with one call.

**Schedule:** 18:00 daily, gated on a "rain expected" entity being on, push
when **Yes**: "Rain is coming and {{ reasoning }}". A gate entity for that
takes one trigger-based template sensor, which reads the hourly forecast
once an hour:

```yaml
template:
  - triggers:
      - trigger: time_pattern
        hours: "/1"
    actions:
      - action: weather.get_forecasts
        target:
          entity_id: weather.home
        data:
          type: hourly
        response_variable: fc
    binary_sensor:
      - name: Rain expected today
        state: >-
          {% set hours = fc['weather.home'].forecast[:12] %}
          {{ hours | selectattr('precipitation_probability', 'defined')
                   | selectattr('precipitation_probability', '>=', 50)
                   | list | count > 0 }}
```

Without a gate the check runs every evening and nags about an open umbrella
on a dry week; the gate is what makes it welcome.

## When it says it couldn't tell

All five stay silent on an unusable frame by default. That is the design: a
dark or blurred picture is not evidence that a chore was skipped, and a false
nag costs more than a missed one. Turn on "Tell me when the camera couldn't
see" on one of them for a week when you first set up, so you learn which
camera goes dark at which hour, then turn it back off.
