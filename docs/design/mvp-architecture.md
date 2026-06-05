---
created: 2026-06-04
updated: 2026-06-04
tags: [mvp, game-flow, yorkie, schema]
---

# MVP Architecture — Playable Liar Drawing Game

> **Note (2026-06-04, post-MVP):** the per-turn drawing rule
> ("one continuous stroke") and the three-outcome scoring table
> documented here are the *MVP* shape. They are superseded for
> v1.0 by [`rules-v1.md`](rules-v1.md): brush quota with real-time
> meter (no continuous-stroke rule), always-guess flow, and a 2×2
> scoring table. The schema, phase machine, presence model, and
> host concept all carry forward unchanged.

## Problem

Today the room screen syncs strokes between participants but has no concept
of a *game*: no host, no keyword, no turn order, no voting, no end state.
A pair of players in the same room can scribble together, but nothing
distinguishes that from a shared whiteboard.

To reach MVP — "two or more people can sit down, start a game, finish it,
and see who won" — we need:

- A single source of truth for game state shared across all participants.
- A consistent way to designate *who* drives state transitions (start
  round, advance turn, open vote, finalize result).
- A turn model that enforces the "one continuous stroke per turn" rule.
- A voting and reveal phase wired to the same shared document.
- A score tally and end-of-game ranking.

The CRDT-backed Yorkie document is well suited to this: every participant
already has a synced view of the room state, and presence gives us a
live roster of who is here. The MVP design lives entirely inside the
existing `drawing-liar-game-<roomCode>` document — no extra backend.

### Goals

- Define a single Yorkie document schema that covers lobby, drawing,
  voting, reveal, guessing, and end-of-game phases.
- Specify the *phase state machine* and which client may initiate each
  transition.
- Enforce the "one continuous stroke per turn" rule from the document,
  not just by client convention.
- Keep the keyword secret from the liar without server-side enforcement
  (acceptable for MVP — this is a casual game with friends, not an
  adversarial setting).
- Make it possible to play a full game (multiple rounds + final ranking)
  end-to-end with no manual intervention.

### Non-Goals

- Cheat resistance against malicious players. A custom client could read
  the keyword from the document even when assigned as liar. Out of scope.
- Server-side keyword storage / authoritative dealer. We rely on the
  client of whoever starts the round to pick a keyword and a liar.
- Reconnection state recovery beyond what Yorkie gives us automatically.
- Persistence of game history between sessions.
- Spectator mode, late-join restrictions, kick/ban, custom keyword lists
  in UI. These can come after MVP.

## Design

### Yorkie document schema

```ts
type Phase =
  | 'lobby'      // waiting for host to start
  | 'drawing'    // a round is in progress, players take turns
  | 'voting'     // turns done, players vote on the liar
  | 'reveal'     // votes are in, accused is announced
  | 'guessing'   // liar was caught and now guesses the keyword
  | 'roundEnd'   // round wrapped up, scores updated
  | 'finished';  // all rounds done

type DocRoot = {
  game: {
    phase: Phase;
    hostId: string;            // actorID of the host
    config: {
      totalRounds: number;     // e.g. 3
      turnsPerPlayer: number;  // e.g. 2 — each player draws N strokes per round
    };
    round: {
      index: number;           // 1-based current round (0 in lobby)
      keyword: string;         // empty in lobby; revealed at reveal phase to liar
      liarId: string;          // actorID; empty until round starts
      playerOrder: string[];   // actorIDs in turn order; frozen at round start
      turnIndex: number;       // index into playerOrder
      strokesThisTurn: number; // increments on pointer-up
      votes: Record<string, string>;       // voterActorID -> votedActorID
      liarGuess: string;       // submitted only in 'guessing'
      guessCorrect: boolean;
    };
    scores: Record<string, number>;  // actorID -> total score
  };
  strokes: Stroke[];           // wiped at round start
};

type Presence = {
  name: string;
  color: string;
  // No `ready`/`vote` here — those live in the document so they
  // survive a reconnect within the same round.
};
```

### Phase state machine

```
                 ┌──────────────────────────────────────────┐
                 ▼                                          │
  lobby ──[host: startGame]──► drawing ──[turns done]──► voting
                                  ▲                         │
                                  │                         ▼
                              [not caught]              reveal
                                  │                         │
                          ┌───────┴───────┐           ┌─────┴──────┐
                          │               │           │            │
                       roundEnd     [caught] ──► guessing      [not caught]
                          │               │           │            │
                          │               └───────────┘            │
                          │                                        │
                          ├──[more rounds]──► drawing              │
                          │                                        │
                          └──[no more rounds]──► finished ◄────────┘
```

Phase transitions are always written by **one specific client**, never
two at once:

| Transition                        | Initiator       |
|-----------------------------------|-----------------|
| `lobby → drawing`                 | host            |
| advance `turnIndex` within drawing| current drawer  |
| `drawing → voting`                | current drawer (last turn) |
| submit a vote                     | each voter (writes own entry) |
| `voting → reveal`                 | host            |
| `reveal → guessing` or `roundEnd` | host            |
| submit liar guess                 | liar            |
| `guessing → roundEnd`             | liar            |
| `roundEnd → drawing | finished`   | host            |

This is enforced by client-side guards. CRDT semantics mean that even if
two clients race, the operations merge — but the *intended* writer
prevents accidental double-writes (e.g. two players both clicking
"Reveal").

### Per-turn drawing rule

"One continuous stroke per turn" is encoded as:

- Only `playerOrder[turnIndex]` may push strokes.
- `pointerDown` is allowed once per turn — guarded by
  `strokesThisTurn === 0`.
- `pointerUp` advances `turnIndex` (and may transition phase) by
  incrementing `strokesThisTurn` and either rotating turn or moving to
  `voting`.

Everyone else's canvas is read-only during the round; the local UI
hides the cursor and disables pointer capture on the canvas surface.

### Round lifecycle

1. Host calls `startRound(roundIndex)`:
   - Picks a keyword (built-in client-side list for MVP).
   - Picks a random `liarId` from current participants.
   - Snapshots current participants → `playerOrder` (shuffled).
   - Clears `strokes`, resets `turnIndex`, `votes`, `liarGuess`.
   - Sets `phase = 'drawing'`.
2. Each player sees `keyword` *only if* `myActorID !== liarId`.
3. Players draw in order until `turnIndex` reaches `playerOrder.length *
   turnsPerPlayer`. Last drawer's `pointerUp` sets `phase = 'voting'`.
4. Voting: each player writes `votes[myActorID] = chosenActorID`. When
   `Object.keys(votes).length === playerOrder.length`, host may move to
   `reveal`.
5. Reveal: most-voted player is accused. If `accusedId === liarId`,
   move to `guessing`. Otherwise, score and move to `roundEnd`.
6. Guessing: liar writes `liarGuess`. Compare to keyword (case-insensitive
   trimmed match). Set `guessCorrect`, move to `roundEnd`.
7. `roundEnd`: scoring applies (see below). Host moves to next round or
   `finished`.

### Scoring (MVP — intentionally simple)

| Outcome                                  | Liar  | Each non-liar |
|------------------------------------------|-------|---------------|
| Liar not caught (wrong accused)          | +2    | 0             |
| Liar caught, then guesses keyword right  | +1    | +1            |
| Liar caught, guesses keyword wrong       | 0     | +2            |

These numbers are placeholders for MVP — tunable later. The point is
that *every game has a clear winner* and the gameplay loop closes.

### Keyword bank

A static list of ~50 nouns shipped in the bundle
(`src/data/keywords.ts`). Random pick on round start. Future: shared
custom lists, language toggle.

### Host selection

The first client to attach to the document becomes the host. The host
ID is written once into `game.hostId`. If the host disconnects, the
next-earliest joiner promotes (detected by presence dropping below the
participant list). For MVP, host promotion is not handled — a dropped
host means players can still finish the current round, but cannot
start a new one. Document this as a known limitation.

### Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| Liar reads the keyword from the synced document | Acknowledged. Out of scope for MVP — friends-only setting. Document as a known limitation. |
| Two clients race to write the same phase transition | Designate a single initiator per transition. CRDT merges remain safe; the redundant write is just a no-op. |
| Late joiner mid-round breaks `playerOrder` | Snapshot `playerOrder` at round start; late joiners are spectators until next round. |
| Host disconnects mid-game | Acknowledged for MVP. Players can finish the current round; further rounds blocked. Auto-promotion is post-MVP. |
| `strokes` array grows unbounded over a long session | Cleared on `startRound`. Bounded per-round. |

### Design Decisions

| Decision | Reason |
|----------|--------|
| Store full game state in the Yorkie document, not in presence | Game state must survive reconnects and arrive synchronously for late peers. Presence is ephemeral and best-effort. |
| Static keyword list bundled in client | Zero infra. Sufficient for MVP. Can be replaced with a fetched list later without changing schema. |
| Single host as transition driver | Avoids CRDT-merged double-transitions while keeping the implementation trivial. |
| Don't gate keyword visibility in the document layer | A trustworthy client is assumed for MVP. Server-side gating would require a backend, which we want to avoid. |
| Reuse `actorID` as the player identity | `actorID` is stable for the lifetime of a Yorkie attachment and already keyed by Yorkie internals — no extra ID layer. |

## Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| Put per-player state (`vote`, `ready`) in presence | Lost on reconnect. Vote history would disappear mid-phase. |
| Separate Yorkie documents for "game" and "canvas" | Doubles attach/sync complexity for no clear benefit; both are tightly coupled to the round lifecycle. |
| Track turn rotation by counting strokes in the strokes array | Couples gameplay state to rendering state; ambiguous if we ever allow undo or clear. Explicit `turnIndex` is cleaner. |
| Server-side authoritative dealer (Node/Go service that holds the keyword) | Removes the trusted-client assumption but requires us to run a backend. Out of scope for MVP. Can be layered in later by replacing the `startRound` writer. |
| Use real-time WebRTC for stroke transport, Yorkie only for game state | Adds a second sync layer. Yorkie already handles stroke sync acceptably. |

## Tasks

See [`docs/tasks/archive/20260604-mvp-game-flow-todo.md`](../tasks/archive/20260604-mvp-game-flow-todo.md)
for the step-by-step execution plan.
