# Lessons

A growing record of *non-obvious* things we've learned about this
project — gotchas, hidden constraints, surprises from the SDK, decisions
that look weird without context. The goal is that a new contributor (or
a future agent) can read these and skip a discovery step we already paid
for.

## When to write a lesson

Write one when you hit any of:

- A bug whose root cause isn't visible from the code or commit message alone
  (e.g. "the canvas blanks if you redraw inside `requestAnimationFrame`
  during pointer events").
- A subtle SDK behaviour that a naive read of the docs would miss
  (e.g. "`@yorkie-js/sdk` is the *new* scoped package; the unscoped
  `yorkie-js-sdk` on npm is stale").
- An invariant that the type system can't express but the code relies on
  (e.g. "`game.round.playerOrder` is frozen at round start; presence
  changes mid-round don't reshape it").
- A decision that looks arbitrary in the diff but exists for a reason
  (e.g. "the canvas is sized to a fixed 900×600 internally and scaled
  via CSS so coordinates remain stable across viewports").

Don't write lessons for things already obvious from:

- Reading the code itself,
- A well-written commit message,
- A design doc.

## Pairing with archived tasks

**Every archived task in [`../tasks/archive/`](../tasks/archive/) has a
paired lessons file here with the same date and slug.** The pairing is
1:1 and required:

| Task                                              | Paired lesson                                   |
|---------------------------------------------------|-------------------------------------------------|
| `tasks/archive/YYYYMMDD-<slug>-todo.md`           | `lessons/YYYYMMDD-<slug>.md`                    |

When you move a plan from `tasks/active/` to `tasks/archive/`, create
or update its paired lesson file in the same commit. If the work
produced no surprises, the file is still required — write
`> No surprises.` under a single heading. The presence of the pair is
itself the signal that the work was reflected on.

Lessons that arise *outside* a task plan (e.g. you discover a hidden
constraint while reading code) should still live here under a fitting
date+slug; if they're substantive enough, the next archived task that
touches the same area can reference them.

## Format

One file per topic. Filename **must** follow `YYYYMMDD-<slug>.md`, where
the date is when the lesson was first written. Examples:
`20260604-scaffold.md`, `20260712-yorkie-sdk.md`. The date prefix lets
the directory sort chronologically and makes it obvious at a glance how
fresh (or stale) a lesson is.

If you later append a new lesson to an existing file, leave the filename
date alone but bump the `updated:` field in the frontmatter.

Inside, each lesson is a `### Heading` followed by:

- One or two sentences stating the lesson.
- A **Why:** line — the underlying reason (constraint, past incident,
  framework behaviour). This is the bit that makes the lesson reusable.
- Optional **How to apply:** — when this kicks in during normal work.

## Contents

- [20260604-scaffold.md](20260604-scaffold.md) — Things learned while
  bootstrapping the project: SDK package naming, env requirements,
  canvas redraw model, touch input on the canvas.
- [20260604-mvp-game-flow.md](20260604-mvp-game-flow.md) — Lessons
  from executing the MVP plan: `Document.getActorID` not where you'd
  expect, when CRDT proxy casts are unavoidable, why `turnIndex`
  alone can't end a round, why scoring writes belong in the phase
  transition not in an effect.
