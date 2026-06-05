---
created: 2026-06-04
updated: 2026-06-04
tags: [roadmap, release, planning]
---

# Roadmap

The path from "MVP works in two browser tabs" to "drawing-liar-game v1.0 is
live for anyone with a URL." This doc is the strategy; the
step-by-step execution lives in `docs/tasks/active/`.

## Problem

After the MVP and i18n landed, the next contributor needs to be able
to answer "what's next, in what order, and what counts as done?"
without re-reading every commit. Without that, work fragments:
small features land while big release blockers sit. A roadmap is the
single doc that orders the remaining work.

### Goals

- Order remaining work into phases that build on each other.
- For each phase, name the success criterion so we know when to stop.
- Make the "is this ready for release?" question answerable by going
  down a checklist, not a vibe check.

### Non-Goals

- Implementation detail. Per-phase mechanics live in the paired
  `docs/tasks/active/*-todo.md` plans.
- Date estimates. The project moves at whatever cadence the
  contributors choose; the phases are sequenced, not scheduled.
- Hard commitment to scope. Phases may grow or shrink as we learn
  what real play sessions reveal. Update this doc when they do.

## Phase 0 — Scaffold *(done)*

Vite + React + TypeScript app, shared canvas synced via Yorkie, join
flow with room codes. See
[`tasks/archive/20260604-scaffold-todo.md`](../tasks/archive/20260604-scaffold-todo.md)
and its lessons.

## Phase 1 — MVP *(done)*

Full game loop end-to-end: lobby → drawing → voting → reveal →
guessing → scoring → next round → final ranking → play again. See
[`tasks/archive/20260604-mvp-game-flow-todo.md`](../tasks/archive/20260604-mvp-game-flow-todo.md)
and its
[lessons](../lessons/20260604-mvp-game-flow.md).

**Success criterion (met):** Three browser tabs can complete a full
multi-round game and see a ranking.

## Phase 2 — Internationalisation *(done)*

English + Korean UI and keyword banks, drop-in language file pattern
(`src/i18n/lang/<code>.ts` is the whole interface for a translator).
Landed in
[a85f8b3](#) `[feat] Add English + Korean i18n with drop-in language files`.

**Success criterion (met):** A non-English speaker can play the game
in their language, and adding a third language requires editing one
new file and zero existing ones.

## Phase 3 — Quality pass *(next)*

Make the game enjoyable for repeat sessions with friends, not just
demoable. The rule changes that come with this phase are documented
separately in [`rules-v1.md`](rules-v1.md) — read that first; the
items below are the surface.

In scope:

- **Brush quota with real-time meter**: replaces the MVP
  "one continuous stroke" rule. Each turn the drawer has a budget
  of cumulative stroke distance that depletes live (100% → 0%) and
  is visible to every peer, not just the drawer. When it hits 0
  the turn auto-advances. Undo is explicitly forbidden — the
  meter plus no-takebacks is the new tension.
- **Room chat**: Yorkie-synced messages, plain text, usable in
  every phase. Liar's typing indicator is suppressed during the
  guessing phase so thinking time can't be inferred.
- **Always-guess flow + finalised 2×2 scoring**: the liar always
  takes a guess regardless of whether they were caught. Scoring
  resolves on the (caught × guessed) cross product — four cells,
  cleaner than the MVP's three-outcome table.
- **Drawing colour picker**: a small palette per turn. Brush size
  is deliberately *not* exposed — fairness of the meter math
  matters more than per-player customisation for v1.0.
- **Host-only Clear Board** during drawing, with a one-step
  confirm. Useful when an early stroke ruins the prompt.
- **Keyword decks**: host can choose a deck (animals, food,
  places, …) within a language, not just a flat 44-word list.
- **Mobile-friendly layout**: confirm pointer events and the
  chat-panel collapse work on iOS Safari and Android Chrome.

Plans:
- Rules spec: [`rules-v1.md`](rules-v1.md)
- Execution: [`tasks/archive/20260604-quality-pass-todo.md`](../tasks/archive/20260604-quality-pass-todo.md)

**Success criterion:** A group of 4–6 friends play three rounds in
a row without anyone saying "the UX is rough." The brush meter
reads at-a-glance; chat carries between turns; every round resolves
in one of the four scoring cells.

## Phase 4 — Release readiness *(after Phase 3)*

Everything blocking a public URL. Tracked together because each item
is small but cumulative.

In scope:

- **Host resilience**: if the host's browser closes, the next-oldest
  presence is auto-promoted so the room isn't bricked.
- **Late joiner UX**: someone arriving mid-round becomes a clearly
  marked spectator and auto-joins the next round, instead of seeing
  a half-broken HUD.
- **Reconnection feedback**: visible state when Yorkie reconnects so
  participants don't think the game froze.
- **Error states**: clear message when the API key is missing, the
  document fails to attach, or the room is full (if we add a cap).
- **Performance**: code-split the bundle (the 545 kB warning Vite
  already prints), Lighthouse audit, image/font optimization.
- **Accessibility**: tab order, ARIA labels on the canvas controls
  and phase screens, focus rings, colour contrast.
- **Browser compat**: a manual test matrix on Chrome, Safari,
  Firefox, mobile Chrome, mobile Safari. Document gotchas in
  `docs/lessons/`.
- **Deployment**: Vercel or Cloudflare Pages, environment variables
  wired, preview deployments per PR, production behind a custom
  domain.
- **Project hygiene**: `LICENSE`, `CONTRIBUTING.md` (small —
  pnpm/Vite/Yorkie expectations + the existing commit-message and
  task-plan rules), a `CODE_OF_CONDUCT.md` since the game involves
  real-time interaction.

Plan:
[`tasks/archive/20260604-v1-release-todo.md`](../tasks/archive/20260604-v1-release-todo.md)

**Success criterion:** A clean Lighthouse PWA-ish report; the app
loads on the four major browsers; the `LICENSE` and `CONTRIBUTING`
exist; the URL responds in production.

## Phase 5 — v1.0 launch

The actual cutover from "release-ready" to "released."

Activities:

- Internal beta — 2–3 friend groups play a full session and write
  feedback into `docs/lessons/`.
- Address any blockers raised in beta.
- Tag `v1.0.0`, write a `CHANGELOG.md`, cut a GitHub release.
- Polish the public `README.md` with screenshots/GIFs and a clear
  "how to play" section.
- Announce: a short post (yorkie-team blog / Twitter / Threads /
  whatever channels are reasonable).

**Success criterion:** A stranger can read the README, click the
URL, invite two friends, and finish a game without DMing the
maintainer.

## Post-v1.0 — directions, not commitments

These are ideas, not promises. They get their own design doc + task
plan if/when we choose to pursue them. Listed here so a new
contributor can see where the project might go without rediscovering
each item.

- **Server-side keyword secrecy.** A small server (Go or Node) that
  holds the keyword and serves it only to non-liars, so a malicious
  client can't read it from the document. Currently MVP's
  documented "trust the client" model.
- **Persistent rooms.** Save game history per room so "we played
  yesterday, let's continue the rivalry" works.
- **Spectator-only role at game start.** Watch a game without being
  picked as liar or drawing.
- **Themed packs.** Movies, K-Pop, board games, sports, etc.
- **Replay / share screenshot of the final round.** A small "save
  this round" button to share the drawing + the keyword + the
  outcome.
- **Better win conditions.** Per-game configurable scoring; team
  modes; tournament brackets across multiple games.

## Tasks

- [`tasks/archive/20260604-quality-pass-todo.md`](../tasks/archive/20260604-quality-pass-todo.md)
  — Phase 3 execution plan.
- [`tasks/archive/20260604-v1-release-todo.md`](../tasks/archive/20260604-v1-release-todo.md)
  — Phase 4 + Phase 5 execution plan.
- [`tasks/active/20260605-post-v1-backlog.md`](../tasks/active/20260605-post-v1-backlog.md)
  — organized, sized backlog of post-v1.0 candidates.
