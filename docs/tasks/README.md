---
updated: 2026-06-05
---

# Tasks — what needs doing & how to contribute

New here? This is the map of **what's planned, what's open, and how to
pick something up.** For build/setup and the commit rules see
[`CONTRIBUTING.md`](../../CONTRIBUTING.md); for architecture see
[`docs/design/`](../design/).

```
idea ─▶ docs/design/<topic>.md          (the WHY/shape, decisions, trade-offs)
     ─▶ docs/tasks/active/<date>-<slug>-todo.md   (the step-by-step plan)
     ─▶ docs/tasks/archive/…  +  docs/lessons/<date>-<slug>.md   (when done)
```

- `active/` — plans currently open for work (and the backlog).
- `archive/` — completed plans, kept for posterity.
- A big idea gets a **design doc first**, then a `-todo` plan. A small
  fix can skip straight to a PR.

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

## Open work right now

| Plan / item | What | Size | Good first? |
|-------------|------|------|-------------|
| [keyword-secrecy-todo](active/20260605-keyword-secrecy-todo.md) | Server-authoritative keyword + liar secrecy (Vercel Functions) — the next major effort. Read the [design doc](../design/keyword-secrecy.md) first. | L | No (backend) |
| [post-v1 backlog](active/20260605-post-v1-backlog.md) | The full sized/tiered list of candidates beyond v1.0. | — | Browse it |

### Good first contributions

Small, frontend-only, no backend — great entry points (all from the
[backlog](active/20260605-post-v1-backlog.md)):

- **Add a language.** Copy `src/i18n/lang/en.ts` to `<code>.ts` and
  translate the strings + keyword decks. It auto-registers via a glob;
  TypeScript flags any string you miss. *(S)*
- **Add a themed keyword pack.** Extend the `keywords` decks in an
  existing `src/i18n/lang/*.ts` (movies, sports, K-Pop…). *(S)*
- **Emoji reactions in chat.** Chat already lives in
  `src/game/Chat.tsx`. *(S)*
- **Explicit spectator-only join.** Today you only spectate if you
  arrive mid-round; add a "watch, don't play" choice at join. *(S)*
- **Share the final round as an image.** Export the finished canvas +
  keyword + outcome (pure client canvas export). *(M)*

## How to pick something up

1. Open an issue (or comment on one) naming the item you're taking, so
   two people don't collide.
2. Branch from up-to-date `main` — `feat/<topic>`, `fix/<topic>`, or
   `docs/<topic>` (see [`CLAUDE.md`](../../CLAUDE.md)).
3. For a non-trivial feature, skim the relevant design doc; if there
   isn't one, propose the shape in the issue first.
4. `pnpm lint && pnpm test && pnpm build` must pass — CI runs them.
5. Follow the commit format in [`CLAUDE.md`](../../CLAUDE.md)
   (`[feat]` / `[fix]` / `[init]`).
6. Finishing a whole `-todo` plan? Archive it and write its paired
   `docs/lessons/` file in the same change.

**Where logic lives:** keep correctness-critical game logic in the
pure modules `src/game/engine.ts` and `src/game/state.ts` (driven by
`Room.tsx` from inside Yorkie `update()` callbacks) so the Vitest
suite — including the server-free multi-user simulation in
`src/game/multiuser.test.ts` — can exercise it. Don't bury such logic
in React effects.

## Archive

- [20260604-scaffold-todo.md](archive/20260604-scaffold-todo.md) —
  initial scaffold (Vite + React + TS, Yorkie wiring, lobby + canvas,
  CLAUDE.md and docs/). Pairs with
  [`../lessons/20260604-scaffold.md`](../lessons/20260604-scaffold.md).
- [20260604-mvp-game-flow-todo.md](archive/20260604-mvp-game-flow-todo.md) —
  12-task path from "shared whiteboard" to a playable MVP. Pairs with
  [`../lessons/20260604-mvp-game-flow.md`](../lessons/20260604-mvp-game-flow.md).
- [20260604-quality-pass-todo.md](archive/20260604-quality-pass-todo.md) —
  brush quota, turn timer, chat, always-guess 2×2 scoring, colors,
  clear-board, decks. Pairs with
  [`../lessons/20260604-quality-pass.md`](../lessons/20260604-quality-pass.md).
- [20260604-v1-release-todo.md](archive/20260604-v1-release-todo.md) —
  host resilience, reconnect feedback, error states, perf split, a11y,
  CI, hygiene files, public README (manual deploy/beta/tag deferred to
  the maintainer). Pairs with
  [`../lessons/20260604-v1-release.md`](../lessons/20260604-v1-release.md).
