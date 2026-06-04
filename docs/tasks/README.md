---
updated: 2026-06-04
---

# Tasks

- `active/` — In-progress execution plans
- `archive/` — Completed plans, kept for posterity

## Naming convention

`YYYYMMDD-<slug>-todo.md`

The date prefix is required. The slug should describe the *outcome*,
not the implementation (e.g. `mvp-game-flow`, not `add-many-files`).

## Pairing with lessons

**Every archived task must have a paired lessons file** in
[`../lessons/`](../lessons/) with the **same date and slug**:

| Task                                              | Paired lessons                                  |
|---------------------------------------------------|-------------------------------------------------|
| `tasks/archive/YYYYMMDD-<slug>-todo.md`           | `lessons/YYYYMMDD-<slug>.md`                    |

The pairing is 1:1. When you move a plan from `active/` to `archive/`,
also create (or update) the matching lessons file in the same commit.
If the work produced no surprises, the lessons file is still required —
write `> No surprises.` under a single heading. The presence of the
pair tells future readers "this work was actually finished and
reflected on," even when the reflection is empty.

## Active

_None._

## Archive

- [20260604-scaffold-todo.md](archive/20260604-scaffold-todo.md) —
  Retrospective record of the initial scaffold (Vite + React + TS,
  Yorkie wiring, lobby + canvas, CLAUDE.md and docs/).
  Pairs with [`../lessons/20260604-scaffold.md`](../lessons/20260604-scaffold.md).
- [20260604-mvp-game-flow-todo.md](archive/20260604-mvp-game-flow-todo.md) —
  12-task path from "shared whiteboard" to a fully playable MVP
  (lobby → drawing → voting → reveal → guessing → scoring → ranking).
  Pairs with [`../lessons/20260604-mvp-game-flow.md`](../lessons/20260604-mvp-game-flow.md).
