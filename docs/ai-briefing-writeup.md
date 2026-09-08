# Building an AI daily briefing on top of Home Assistant

The core of this is now a blueprint - [AI Daily Briefing](../blueprints/automation/ohlemacherd/ai-daily-briefing.yaml):
gather, one AI Task call under standing rules, deliver. This page is the
reasoning behind it and a description of the larger system the blueprint is
the centre of, in case you want to grow yours the same way. No specific
hardware, integration or LLM provider is required - any scheduler, any LLM
API and any `notify.*` target work.

## The shape of it

1. **A scheduled process gathers state.** On a timer (a cron job, a
   scheduled script, whatever your platform supports), something outside
   Home Assistant's own automation engine - a small script, a scheduled
   task - queries a handful of HA sensors and any other sources you want
   folded in (a calendar, a to-do list, a weather API) and assembles them
   into a compact block of plain text. This step is deliberately dumb: it
   collects facts, it doesn't decide what matters.
2. **An LLM call turns the facts into a short briefing.** The text block
   from step 1, plus a system prompt describing the audience and the
   judgment calls below, goes to an LLM (any provider works - this was
   built against Claude, but nothing about the pattern is Claude-specific).
   The model's job is synthesis and prioritization: turn a pile of raw
   facts into three or four sentences a person would actually want to read.
3. **A notify service delivers it.** The result goes out through whatever
   `notify.*` target fits the moment - see the routing judgment call below.
   The interesting design decision isn't the API call, it's *which* channel
   a given briefing (or a given line within it) deserves.

## Judgment calls that mattered more than the plumbing

**Only mention something if it would change what the reader does today.**
The tempting failure mode is a "status report" - every sensor, every
automation that fired, every data point available. That's not a briefing,
it's a debug log. A home-automation event (a filter due soon, a door left
unlocked overnight, an appliance that needs attention) earns a line only if
knowing about it changes a decision the reader would otherwise make
differently. Everything else, even if true and even if easy to include, is
noise that trains the reader to skim past the whole thing.

**Prefer a persistent, low-key channel over a push notification for
routine content.** A push notification interrupts. That's exactly right for
something the reader needs to see and act on in the next few minutes - and
exactly wrong for a daily summary they'll get to when they get to it. Give
routine content a persistent home (a dashboard card, a logbook entry, a
low-priority notification channel) and reserve interruptive pushes for
things that are actually time-sensitive. Mixing the two trains people to
ignore the channel altogether, which quietly defeats the whole system - see
this repo's Debounced Outage Alert blueprint for the same principle applied
to a much narrower case (an outage notification vs. its recovery).

**Silence is a valid, even preferred, output.** A day with nothing worth
flagging should produce a short "nothing notable today" or nothing at all -
not a briefing stretched to sound substantial. An LLM asked to summarize
will, if not told otherwise, find *something* to say about anything you
hand it. Explicitly permitting "there's nothing here" as an acceptable
result is what keeps the system honest instead of manufacturing significance.

**Give the reader a way to correct it, and treat that as an input, not just
feedback.** A one-line "steer" mechanism - a place to say "don't mention X
again" or "I care more about Y than you think" - and feeding that note back
into the next run's prompt turns the system from a fixed report generator
into something that visibly improves for its one audience. This matters
more for a personal daily briefing than it would for something built for a
broad audience, precisely because there's no larger user base to average
preferences across.

**Keep the scheduled process and the LLM call separate, and keep the LLM
call replaceable.** The state-gathering step is deterministic and cheap; it
should run reliably regardless of which model or provider is doing the
synthesis. Treating step 2 as a swappable component - a well-specified
"facts in, short text out" contract - means a model change, a provider
outage, or a cost decision never touches the parts of the system that
actually read your sensors and calendars.

## What this deliberately leaves out

No specific prompt text, no specific sensor list, no specific schedule.
Those are all household-specific by nature - what's worth mentioning in
one home (a kid's school pickup, a specific appliance) is noise in another.
The pattern above is the reusable part; the content is yours to fill in.

## What the blueprint is, and what the full second brain is

The blueprint is the daily loop: facts in, one call, a briefing out, a steer
line back in. Everything below is what grew around that loop over a year,
described in shape only.

- **A ledger of open actions, not a to-do app.** One append-only file of
  small JSON rows (an action, a decision someone owes, a thing to verify by a
  date, a note), each with a priority and an owner - the person or the
  automation side. Every session that touches the house reads it first and
  writes back with evidence. The briefing reads it too, so "the one stalled
  decision" can surface without anyone remembering to raise it.
- **A triage relay.** A scheduled process outside Home Assistant that reads
  the family's notes, the calendar and the ledger, sanitizes what the
  briefing may see (health and money never reach the model), and pushes a
  compact context block into a sensor the blueprint-style prompt reads.
- **Steers that graduate into rules.** A one-shot steer corrects tomorrow.
  A steer prefixed as a rule is promoted into a standing-instructions note
  that every future run reads - so the reader's corrections accumulate
  instead of evaporating.
- **A deterministic floor.** When the model is down or out of credits the
  card falls back to a plain schedule-and-weather view labelled as such,
  rather than freezing on yesterday's text. A frozen card that looks fresh
  is the worst outcome; a labelled basic view costs nothing.
- **Routing, not notifying.** One script owns the question "does this reach
  a phone, a daily digest, or just the log?" Every automation calls it with
  a route instead of a notify service. Changing who gets what is one edit.
- **Counters on every AI call.** How many calls, which backend, how many
  fallbacks - on a dashboard card, so a week of quietly degraded briefings
  can be told apart from a week of good ones after the fact.
- **Audits that compound.** Every few weeks a session grades every unit on
  four rungs - does it notice its own failure, would anyone find out, does
  it degrade gracefully, does a repeat failure become a permanent guard -
  and writes the residue back into the ledger. The house is strong on the
  first and third rungs and had to be taught the second and fourth; most
  home automation setups are the same.
