# New project context: personal fitness app, web app first

Use this document as the starting context for a new ChatGPT project. This is a clean restart of the product's implementation and architecture. The existing FitnessOS codebase and its technical decisions are historical reference only; do not treat them as the new project's source of truth.

## What I am trying to do

I want to build a personal fitness app that helps me record my activity and see useful progress over time. I have chosen a web app as the first implementation target, then want to make it work exceptionally well on a phone. The framework, storage design, hosting, and any later native shell remain undecided. Keep the product name open; “FitnessOS” is the name of the old project and may or may not carry forward.

The old project described the product as a personal workout buddy, not a startup. It focused on satisfying, honest feedback about my own recorded activity rather than social competition or engagement pressure. That remains useful context, but confirm the product's current purpose and smallest useful first release before treating any old feature as required.

## Starting assumptions to confirm early

These preferences were established during the previous project and are reasonable carry-forward assumptions, not immutable requirements:

- Personal use; keep ongoing costs close to zero.
- Privacy and dependable recovery matter.
- Fast, low-friction activity logging and a clear history are central.
- The core experience should remain useful when connectivity is poor or unavailable, if that still fits the web-first approach.
- Android is the likely first phone target. The previous target device was a OnePlus 11R; verify the current device and OS before relying on that detail.
- Mixed strength training and cardio were previously in scope. Cardio was intended to use manually entered duration and optional distance, without GPS.
- Manual food and meal logging, one-off plans, reminders, and reflection were explored previously. Treat these as ideas to re-evaluate, not as a fixed V1 checklist.

## Architecture direction

Explore a web-first architecture that can provide a polished phone experience. Before committing, compare only the options that fit the concrete product needs, for example:

- A responsive web app, possibly installable as a PWA.
- A web app with a small native shell or platform bridge if browser capabilities are insufficient.
- A shared-code approach that serves the web and a native phone app, if the user experience and maintenance trade-offs justify it.

Do not default to the previous Flutter + Drift/SQLite architecture, or assume that a PWA, wrapper, hosted backend, or any specific framework is already selected. Explain trade-offs in terms of mobile interaction quality, offline behavior, reliable local persistence, backup/recovery, Android integration, deployment, maintenance by one person with AI assistance, and ongoing cost. Recommend a small experiment or vertical slice when it can answer an architectural question cheaply.

Define what “runs super well on the phone” means before implementation. Consider touch-first layout and input, load and interaction responsiveness, install/launch behavior, offline use, save confirmation, data survival through reloads and process restarts, accessibility, and the Android capabilities the chosen product actually needs. Verify on a real target phone when available; do not infer phone quality from desktop browser success.

## Product and data principles

Unless I change them, carry forward these principles:

- Make the common logging and history journeys simple before expanding feature breadth.
- Show observations honestly. A change in recorded performance is not proof of physiological improvement; avoid unsupported scores, prescriptions, or health claims.
- A successful save needs a clear persistence acknowledgment. Preserve recoverable input when a save fails.
- Preserve explicit units, activity dates as the user experienced them, and the difference between an unknown value and zero.
- Plan data export and recovery before encouraging use with meaningful personal records. A failed or interrupted migration or restore must not silently replace data with an empty state.
- Do not put personal measurements, notes, backup secrets, or other sensitive values in diagnostic logs or source control.
- Avoid accounts, sync, social features, paid services, AI, and broad integrations unless a concrete user need justifies their cost and complexity.

## Scope discipline

Start by defining one small, useful end-to-end experience and its observable acceptance criteria. Reassess the old feature list instead of copying its broad V1 scope. Keep future ideas visibly separate from committed requirements. Do not build a general-purpose editor, speculative abstraction framework, or multiple empty feature modules in advance.

When architecture is uncertain, state the assumptions, compare realistic options, and identify the decision that needs evidence. Record only decisions I actually make as settled. Inspect the new project's files and instructions before editing; keep documentation accurate about what is proposed, implemented, and verified.

## Previous implementation boundary

Earlier project material discussed a Flutter Android implementation and substantial plans, schema, and recovery work. The current `C:\FitnessOS` folder contains planning documents and no application code. Do not treat the earlier implementation as an architecture mandate. Consult its product notes only to recover relevant user intent or lessons, and ask before carrying over any large scope or implementation detail.

## Suggested first steps for the new project

1. Confirm the product's current purpose, intended users, and the single most valuable first workflow.
2. Confirm which carry-forward assumptions above still apply, especially offline behavior, privacy/recovery, cost, and target phone.
3. Define phone-quality acceptance criteria and decide what must work offline.
4. Compare a small number of web-first architecture options against those criteria; prototype the riskiest assumption before locking the stack.
5. Build one complete vertical slice, then evaluate it on the target phone before broadening scope.
