# Project Scaffold Plan

> **Retrospective:** this plan documents the work that produced the
> initial commit. It was written after the fact so the scaffold has a
> paired entry in `tasks/archive/` matching its lessons file. Future
> task plans should be written *before* implementation, not after.

**Goal:** Bring `drawing-liar-game` from an empty repo to a working baseline
where two browser tabs can join the same room via a shared code and
draw on a synced HTML5 canvas backed by a Yorkie document.

**Spec:** none — this predates the design docs. The MVP design
([`docs/design/mvp-architecture.md`](../../design/mvp-architecture.md))
was written on top of this scaffold.

**Lessons:** [`docs/lessons/20260604-scaffold.md`](../../lessons/20260604-scaffold.md)

**Tech Stack:** React 19, Vite, TypeScript, `@yorkie-js/sdk`,
`@yorkie-js/react`, HTML5 Canvas. pnpm.

---

## Task 1: Scaffold the Vite + React + TS project

- [x] **Step 1: Pick a name and stack** — discussed with the user:
  `drawing-liar-game` repo name, React + Vite + TS, HTML5 Canvas (vs SVG /
  Fabric.js).
- [x] **Step 2: Run the scaffolder**
  `pnpm create vite@latest drawing-liar-game --template react-ts`
- [x] **Step 3: Verify the stock template builds** — `pnpm install`
  then `pnpm build`.

## Task 2: Add Yorkie dependencies

- [x] **Step 1: Add `@yorkie-js/sdk` and `@yorkie-js/react`**
  `pnpm add @yorkie-js/sdk @yorkie-js/react`
- [x] **Step 2: Read example wiring** — referenced
  `yorkie-js-sdk/examples/simultaneous-cursors/src/App.jsx` for the
  `YorkieProvider` / `DocumentProvider` pattern and
  `yorkie-js-sdk/examples/nextjs-todolist/components/TodoList.tsx` for
  `useDocument` with a typed root.

## Task 3: Build the join lobby + URL-hash routing

- [x] **Step 1: Lobby UI** — name input, "Create" button (generates
  6-char code), "Join" with code input. See
  [`src/Lobby.tsx`](../../../src/Lobby.tsx).
- [x] **Step 2: Hash-based routing** — `#room=ABC123` becomes the
  shareable URL. See [`src/App.tsx`](../../../src/App.tsx).
- [x] **Step 3: Persist the player name in `localStorage`** so refresh
  doesn't re-prompt.

## Task 4: Build the room shell

- [x] **Step 1: Provider wiring** — `YorkieProvider` (apiKey + addr
  from `import.meta.env`) wrapping `DocumentProvider` with
  `docKey = drawing-liar-game-<room>` and `initialRoot = { strokes: [] }`. See
  [`src/Room.tsx`](../../../src/Room.tsx).
- [x] **Step 2: Header** — room code chip, "Copy link" button, live
  participant list (from presences), "Leave" action.
- [x] **Step 3: Missing-env hint** — when `VITE_YORKIE_API_KEY` is
  empty, render a setup message instead of attempting to connect.

## Task 5: Build the shared canvas

- [x] **Step 1: Pointer-down → push stroke** — append a new
  `{ id, color, size, points: [start] }` to `root.strokes`.
- [x] **Step 2: Pointer-move → append point** — locate the in-flight
  stroke by id, push the next point. Skip points within 2 px to keep
  the payload small.
- [x] **Step 3: Pointer-up → release capture** — end the local stroke
  buffer; the rendered shape is whatever the doc says.
- [x] **Step 4: Redraw effect** — on every change to
  `root.strokes`, wipe the canvas and replay every stroke.
- [x] **Step 5: Clear board** — a toolbar button that deletes all
  strokes for everyone.

## Task 6: Styling + cleanup

- [x] **Step 1: Lobby card + Room header CSS** — clean light theme,
  rounded corners, subtle shadows. See
  [`src/App.css`](../../../src/App.css) and
  [`src/index.css`](../../../src/index.css).
- [x] **Step 2: Remove Vite boilerplate** — delete `src/assets/`,
  `public/icons.svg`, the counter demo in `App.tsx`.
- [x] **Step 3: Update `<title>` + `.gitignore` + write `README.md`,
  `.env.example`.**

## Task 7: Verify

- [x] **Step 1: Type check** — `npx tsc -b` passes.
- [x] **Step 2: Build** — `pnpm build` passes.

## Task 8: Initial commit

- [x] **Step 1: `git init`**
- [x] **Step 2: Single `[init]` commit** containing the entire
  scaffold + `CLAUDE.md` + `docs/`.

  ```
  [init] drawing-liar-game project

  Bootstrap a Vite + React + TypeScript app that uses Yorkie for
  real-time sync. ...
  ```

- [x] **Step 3: Add the GitHub remote** — origin pointed at
  `https://github.com/ggyuchive/drawing-liar-game`.

## Task 9: Write design + tasks for MVP

- [x] **Step 1: Design doc** —
  [`docs/design/mvp-architecture.md`](../../design/mvp-architecture.md)
  drafted alongside this scaffold so the next contributor has a target.
- [x] **Step 2: Active task plan** —
  [`docs/tasks/active/20260604-mvp-game-flow-todo.md`](../active/20260604-mvp-game-flow-todo.md)
  laid out as a 12-task path to MVP.
- [x] **Step 3: Lessons** — see paired
  [`docs/lessons/20260604-scaffold.md`](../../lessons/20260604-scaffold.md).

---

## Outcome

Working two-tab whiteboard. Lobby and room flow function as described
in [`README.md`](../../../README.md). Type check and prod build both
pass. Nothing game-specific yet — phase, host, keyword, voting, scoring
are all left for the MVP plan.

## Out-of-scope (left for the MVP plan)

- Phase state machine, host election, turn rotation, keyword bank,
  voting/reveal/guessing screens, scoring, final ranking.
