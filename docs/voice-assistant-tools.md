# Giving a voice assistant tools

Three of the blueprints in this repo are scripts written for an AI voice
assistant to call, not for a person to tap. This page is the idea behind them,
what the assistant can already do without any of this, and the rules that
came out of a month of building them for one house.

## The one idea

**A script exposed to Assist is a tool.** When you use an LLM conversation
agent in Home Assistant (Anthropic, OpenAI, Google Generative AI, Ollama -
any of them, through Settings -> Voice assistants), the model is handed every
exposed script as a function it may call. Three parts of the script are what
the model sees:

| Script part | What the model reads it as |
|---|---|
| `description` | What the tool does and when to use it. The whole interface. |
| `fields` | The tool's arguments - each field's `description` is the parameter's documentation, `required` is honoured, and a `selector` becomes the type. |
| `stop:` with `response_variable` | The tool's return value. Whatever dictionary you put in the variable is handed back to the model to answer from. |

So "give the assistant the ability to X" is: write a script that does X with
clear fields, return a small dictionary, expose it (Settings -> Voice
assistants -> Expose -> the Scripts tab), and talk to it. The conversation
agent's "Control Home Assistant" option has to be on (Assist) for exposed
scripts to be offered as tools. Nothing else to install.

**One trap with blueprint scripts.** When you create a script from a
blueprint in the UI, the save dialog asks for a name and a description, and
whatever is in that Description box is stored on your script and replaces
the blueprint's own description - an empty box means the model is told
nothing about the tool. So for the three tool blueprints here, click "Add
description" when you save and paste the text the blueprint gives you. The
fields' descriptions come from the blueprint and cannot be replaced, which
is why the exact formats live there.

## What it can already do without a script

Check these before building, because a tool that duplicates a built-in one
confuses the model. As of Home Assistant 2026.9:

- **See and control exposed entities.** Every exposed light, switch, fan,
  cover, climate and sensor is readable and controllable. "Is the back door
  open?", "set the office to 70" need no script.
- **Read an exposed calendar.** If a calendar entity is exposed, the model
  gets a `calendar__get_events` tool for it (one calendar, today or this
  week). Expose the family calendar and "what's on Thursday?" works.
- **Current weather** of an exposed weather entity, through the built-in
  weather intent. Not the forecast - that intent is current-conditions only,
  which is why this repo has a forecast tool.
- **Lists.** Exposed to-do lists can have items added by voice.

What it cannot do out of the box, and what the three tools here add:

| Gap | Tool |
|---|---|
| "Remind me at 7:30"; and "set a timer for 10 minutes" from a phone, a dashboard chat or a speaker with no timer support (voice satellites that support timers already have a built-in timer tool - let the model use that one there) | [Set a Reminder](../README.md#voice-assistant-tool---set-a-reminder) + [Reminder Delivery](../README.md#voice-assistant-tool---set-a-reminder) |
| "Will it rain tomorrow afternoon?", "how cold tonight?" | [Weather Forecast](../README.md#voice-assistant-tool---weather-forecast) |
| "Put on Netflix", "search YouTube for excavator videos" | [Open an App on the TV](../README.md#voice-assistant-tool---open-an-app-on-the-tv) |

## Rules that came out of building them

1. **A tool returns at once.** A `delay` inside a tool script holds the tool
   call, and the assistant's answer, for the whole wait. Anything that has to
   wait is handed off: the reminder tool fires an event and returns, and the
   delivery automation does the waiting. Same for anything slow (an ADB call
   to a TV takes seconds): `script.turn_on` a second script and return.

2. **The description is the product.** Write the phrases it should match
   ("remind me", "don't let me forget", "ping me at"), what each field means,
   and what NOT to do ("either a clock time or minutes from now, never both").
   A vague description gets a tool that is never called, or called for the
   wrong thing.

3. **Field descriptions are parameter docs.** "HH:MM, 24-hour; today if still
   ahead, otherwise tomorrow" gets you `07:30`. "The time" gets you "tomorrow
   morning".

4. **Return numbers with their units and a note for the empty case.** The
   forecast tool returns the entity's units alongside the values, and a `note`
   saying "the entity returned no forecast; say so rather than guess" when the
   list is empty. The model follows instructions in the return value as
   readily as in the description.

5. **Expose only what helps.** Duplicates confuse: with a thermostat and four
   per-room climate entities all exposed, "what's the thermostat set to" came
   back with a room's number. Un-expose the ones the model should not pick.

6. **The calendar trigger refreshes every 15 minutes.** An event created a
   few minutes before its start is never seen by a `calendar` trigger. The
   reminder tool holds anything due within 20 minutes in memory for that
   reason. If you build on calendars, build around this.

7. **Test with the sentences people actually say, from the Assist dialog**,
   and keep a list of misses. Every miss is either a tool to write or a
   description to fix. "Who's the starting quarterback?" is not a tool to
   write - it is the provider's web search option, if it has one.

## Writing one of your own

A read-only tool is short. This one answers "what's going on at home?" from
a handful of entities you name:

```yaml
alias: House right now
description: >-
  One read of the house right now: who is home, the thermostat, which doors
  are open, whether the dishwasher is done. Use for "what's going on", "is
  anyone home", "any doors open".
mode: parallel
sequence:
  - variables:
      result:
        time_now: "{{ now().strftime('%A %H:%M') }}"
        people_home: "{{ states.person | selectattr('state', 'eq', 'home') | map(attribute='name') | list }}"
        thermostat: "{{ states('climate.home') }} at {{ state_attr('climate.home', 'temperature') }}"
        doors_open: "{{ states.binary_sensor | selectattr('attributes.device_class', 'eq', 'door') | selectattr('state', 'eq', 'on') | map(attribute='name') | list }}"
        dishwasher_done: "{{ states('binary_sensor.dishwasher_finished') }}"
  - stop: House read
    response_variable: result
```

Expose it, ask the question, and read the trace (Settings -> Automations &
scenes -> Scripts -> the script -> Traces) to see exactly what the model was
handed. Then tune the description.
