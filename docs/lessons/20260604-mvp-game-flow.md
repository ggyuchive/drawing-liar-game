---
created: 2026-06-04
updated: 2026-06-04
tags: [yorkie, types, game-flow, mvp]
---

# MVP Game Flow Lessons

Things picked up while executing the
[MVP plan](../tasks/archive/20260604-mvp-game-flow-todo.md). Anything
that should change how the next round of work is approached.

## Yorkie SDK

### `Document.getActorID()` doesn't exist — go through `getChangeID()`

The plan suggested `doc.getActorID()` for the local actorID. That
method exists on the internal `ChangeID` and on some other classes
(e.g. `TimeTicket`) but **not** directly on `Document`. Calling it on
a doc instance fails type-check with `TS2551`.

**Why:** `Document` deliberately exposes very few accessors at the top
level — most identity-shaped state lives on `ChangeID`, which you
fetch with `doc.getChangeID()`. The naming overlap with other classes
makes the right path easy to miss.

**How to apply:** Use
`doc.getChangeID().getActorID()` (as `src/game/useActorID.ts` does).
If you need the same value on the server (TimeTicket-typed), use
that class's `getActorID()` — same name, different home.

### `initialRoot` and reassignments need an explicit cast

Two spots in `Room.tsx` had to cast a plain JS object to
`unknown as DocRoot` (or `JSONObject<Game>`):

1. `<DocumentProvider initialRoot={…}>` at first attach.
2. `r.game = fresh` inside the `onPlayAgain` updater — assigning a
   whole game object to a proxy-typed slot.

**Why:** The CRDT proxy types (`JSONObject`, `JSONArray`) are
narrower than the structural shapes the plain JS literals match.
TypeScript can't bridge the gap because the proxy types carry methods
(`delete?(...)`) that the literal doesn't have.

**How to apply:** Two-step cast `as unknown as <ProxyType>` is the
sanctioned escape hatch. Don't try to make the literal "fit" by
adding fake method signatures — it leaks fiction into the type.

## Game model

### `turnIndex` alone doesn't tell you when the round is done

The schema started with just `turnIndex` cycling 0..N. Implementing
turn rotation in Canvas, that wasn't enough: when `turnIndex` wraps
back to 0 we can't tell whether we just finished a turn-cycle (more
to go) or just finished the *last* turn-cycle (round over).

**Why:** Modular advancement loses the lap counter. Either you reset
turnIndex on round start and never wrap (counting up to
`playerOrder.length * turnsPerPlayer`), or you track laps separately.

**How to apply:** A second cumulative counter `strokesDone` was
added. `playerOrder[turnIndex % length]` picks the drawer for the
UI; `strokesDone >= length * turnsPerPlayer` is the round-end
predicate. Tasks 1 and 6 had to be edited as a pair when this
surfaced — schema fields the canvas eventually needs should land in
the schema task even if they look unused there.

### Scoring writes belong in the transition, not the entry effect

First attempt put `applyScores` in a `useEffect` that fired when
`phase === 'roundEnd'`. That race-conditioned with multiple clients
each thinking they were entering the phase at slightly different
times, producing duplicate score increments.

**Why:** Yorkie's CRDT merges concurrent writes — two clients each
incrementing scores by +2 result in +4, not +2.

**How to apply:** Compute the new scores map in the same `update()`
that flips the phase. Either reveal's not-caught path or guessing's
submit handler — whoever flips to `roundEnd` also writes the new
totals. The result is one author per transition.

## Process

### One-commit-per-task with a paired lessons file actually held up

12 plan tasks → 12 commits. The body-formatting rule (short header
lines + bulleted sections) paid off in `git log` once the commits
piled up — scrolling through the MVP arc, the *shape* of each
change is legible at a glance.

**Why:** Earlier commits in this session that violated the rule
(walls of prose) had to be amended after the user pushed back. The
discipline of writing the formatted body first is worth the small
upfront cost.

**How to apply:** Keep this rule. When tempted to bundle "just this
small follow-up", the right move is usually a new task or a small
infra commit, not folding into a feature task. See
`CLAUDE.md ## Commit Message Restrictions` for the in-repo version
of these rules.
