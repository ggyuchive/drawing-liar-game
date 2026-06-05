# drawing-liar-game

A web-based multiplayer **liar drawing game** built on the [Yorkie JS SDK](https://yorkie.dev).
Players share a single whiteboard, take turns drawing one continuous stroke at a time, and try to spot the liar
— the one player who doesn't know the keyword.

## Tech Stack

- **React 19 + Vite + TypeScript** — SPA, dev server, type safety
- **`@yorkie-js/sdk` + `@yorkie-js/react`** — CRDT-based real-time sync (rooms = Yorkie documents)
- **HTML5 Canvas** — rendering; strokes stored as `{ id, color, size, points: [{x,y}] }` arrays in the Yorkie doc
- **pnpm** — package manager (enforced by the parent workspace)

## Setup
```sh
pnpm install
cp .env.example .env
# fill in VITE_YORKIE_API_KEY from https://yorkie.dev
```

## Development Commands
```sh
pnpm dev        # Vite dev server (http://localhost:5173)
pnpm build      # tsc -b && vite build (production bundle)
pnpm preview    # serve the built bundle
pnpm lint       # ESLint
pnpm test       # Vitest (run once); pnpm test:watch for watch mode
```

## Testing

The runner is **Vitest** (`pnpm test`), and CI runs it on every PR.

Game logic that matters for correctness lives in pure,
framework-free functions in `src/game/engine.ts` (host election,
player-order cap, color assignment, turn rotation, spectator and
duplicate-name predicates) and `src/game/state.ts` (scoring, vote
tally). `Room.tsx` drives these same functions from inside its
Yorkie `update()` callbacks, so the tests exercise the real shipping
logic rather than a copy.

`src/game/multiuser.test.ts` is a server-free, browser-free
**multi-user simulation**: it runs whole games in memory (several
players, turn rotation, host hand-off on disconnect, the 8-player
cap + spectators, scoring) and is the regression guard for bugs like
"the round jumps to voting before the turns finish." Keep
correctness-critical logic in the pure modules so it stays testable
this way — avoid burying it inside React effects or `update()`
bodies.

## Commit Message Restrictions

- **Subject**: `[prefix] <imperative subject>`, ≤70 chars total (prefix included)
- Allowed prefixes:
  - `[init]` — initial scaffolding / first-time setup of something
  - `[feat]` — new feature or capability
  - `[fix]` — bug fix
- Blank line between subject and body
- **Body**: explains *why* (not *what*), each line ≤80 chars
- **Body formatting**: prefer a few short paragraphs separated by
  blank lines over one wall of prose. When the commit covers multiple
  distinct pieces, use a short header line followed by a bulleted
  list for each piece. A reader scanning `git log -p` should grasp
  the shape of the change in two seconds.
- **One commit per feature task** — when working through a task plan
  in `docs/tasks/active/`, each task in that plan ends with exactly
  one commit. Do not bundle multiple tasks into a single commit, and
  do not split a single task across multiple commits.
- For ad-hoc setup/infra work *outside* a task plan (docs
  scaffolding, tooling, configs, hooks), prefer a single combined
  commit rather than splitting per micro-intent.
- No trailing co-author lines unless the user asks for them

Example — single-piece change:

```
[feat] Sync strokes through a Yorkie document

The local-only state worked for one user but had no way to share
the canvas. Treating each room as a Yorkie document gives us
CRDT-based sync for free and lets us add turn-state to the same
doc later.
```

Example — multi-piece change:

```
[feat] Set up docs/ structure and pre-commit gate

Two pieces of project infrastructure landing together.

docs/ layout, borrowed from yorkie-js-sdk:
- design/ for architectural context, with a TEMPLATE.
- tasks/{active,archive}/ for execution plans.
- lessons/ paired 1:1 with archived tasks.

Pre-commit gate via .claude/hooks:
- PreToolUse hook on Bash, filtered to `git commit`.
- Runs `pnpm lint && pnpm build`; blocks on failure.

Why one commit and not two: both pieces are the same kind of work
and only make sense alongside each other.
```

## Project Docs

- **Design docs**: [`docs/design/`](docs/design/) for architectural context.
  New docs use [`docs/design/TEMPLATE.md`](docs/design/TEMPLATE.md). Start
  with [`mvp-architecture.md`](docs/design/mvp-architecture.md) for the
  current target shape.
- **Task tracking**: [`docs/tasks/active/`](docs/tasks/active/) for
  in-progress plans, [`docs/tasks/archive/`](docs/tasks/archive/) for
  completed ones. Naming: `YYYYMMDD-<slug>-todo.md` (date prefix is
  required).
- **Lessons**: [`docs/lessons/`](docs/lessons/) for non-obvious things
  learned about the project — SDK gotchas, hidden constraints, decisions
  that look weird without context. Naming: `YYYYMMDD-<slug>.md` (date
  prefix is required). See
  [`docs/lessons/README.md`](docs/lessons/README.md) for when and how to
  write one.

**Tasks ↔ lessons pairing is 1:1.** Every file in
`docs/tasks/archive/` has a matching file in `docs/lessons/` with the
same date and slug. When archiving a task, create or update its paired
lesson in the same commit — if nothing was surprising, write
`> No surprises.` and move on. The empty-but-present file is still the
signal that the work was finished and reflected on.

Before starting non-trivial work, check `docs/tasks/active/` for an
existing plan and skim `docs/lessons/` for anything relevant. If you
write a new plan, link it from the related design doc's `## Tasks`
section.
