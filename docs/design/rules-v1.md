---
created: 2026-06-04
updated: 2026-06-04
tags: [gameplay, rules, v1, brush, chat, scoring]
---

# Gameplay Rules — v1.0

## Problem

The MVP rules (one continuous stroke per turn, liar guesses only if
caught, three scoring outcomes) get the loop working but leave
several "this would be better if…" gaps that show up the moment
real friends sit down to play:

- **A single uninterrupted stroke is binary.** The drawer either
  uses one quick line or one giant scribble — there's no
  *resource tension*. A meter that depletes in real time turns the
  turn into a small economic decision.
- **The liar only guesses when caught.** A successful bluff ends
  the round flat — no payoff moment for the room. Always letting
  the liar guess turns every round into a two-axis outcome
  (caught? guessed?), which is more interesting and supports a
  cleaner 2×2 scoring table.
- **No communication channel.** Friends playing together want to
  talk between turns. We can either expect them to be on Discord
  (which leaks the keyword if the liar's not on Discord too) or we
  build chat into the room.

This doc captures the rule set we'll ship in v1.0. Implementation
lives in
[`tasks/active/20260604-quality-pass-todo.md`](../tasks/active/20260604-quality-pass-todo.md).

### Goals

- Replace "one continuous stroke" with a **brush quota** that
  depletes in real time and is visible to every participant.
- Cap every turn at a **wall-clock time limit** (10 s default)
  with an auto-advance on expiry — for everyone, not just slow
  drawers — so a round can't stall on indecision.
- Add **room chat** synced through Yorkie, usable in every phase.
- Define a **2×2 scoring table** so the four outcomes
  (`caught` × `guessed`) all produce sensible deltas.
- Preserve the existing **real-time drawing visibility** — every
  point lands on every peer's canvas as the drawer drags.
- Explicitly **forbid undo** during a turn. The brush quota plus
  no-takebacks is the tension.

### Non-Goals

- Cheat resistance — still a "trust the client" model. Out of
  scope until the post-v1.0 server-side keyword option.
- Mid-stroke turn handoff. A turn is one player's; brushing out
  doesn't let the next player continue your line.
- Rich text / emoji reactions in chat. Plain text only for v1.0.
- Chat moderation, mute, kick. Trust the room.
- Per-player brush customisation (brush size selectors etc.).
  Brush is one width for everyone so the meter math stays simple.

## Design

### Brush quota

Each turn, the drawer starts with a budget of **`BRUSH_BUDGET_PX`
pixels of cumulative stroke distance** (default `1500`, tunable in
`GameConfig`).

While the pointer is down:

- Every point appended to the current stroke also adds
  `hypot(dx, dy)` to a running `usedPx` counter on the round.
- The meter UI renders `(BRUSH_BUDGET_PX − usedPx) / BRUSH_BUDGET_PX`
  as a percentage, depleting smoothly.
- When `usedPx >= BRUSH_BUDGET_PX`, the drawer's pointer events
  are ignored — the stroke ends as if pointer-up fired, and the
  turn advances.

The counter lives on the Yorkie document so every peer renders the
same meter — observers see the drawer's quota tick down in
real-time, same as they already see the strokes themselves land.

#### Schema additions

```ts
// in src/types.ts
type Round = {
  // ...existing fields...
  brushBudgetPx: number;  // copy of config at round start (freeze)
  brushUsedPx: number;    // resets to 0 each turn
};

type GameConfig = {
  // ...existing fields...
  brushBudgetPx: number;  // default 1500
};
```

#### UI

A horizontal meter above the canvas:

```
┌──────────────────────────────────────────────────────────────┐
│ Brush  ████████████████████░░░░░░░░░░░░░░░░░  62%            │
└──────────────────────────────────────────────────────────────┘
[canvas]
```

The bar colour shifts from accent → warning → danger as the budget
empties, giving a glance-readable signal. Behind a flag we may
expose a smaller live `usedPx / budgetPx` numeric for tuning.

### Turn timer

Independent of the brush quota, every turn also has a wall-clock
limit of **`TURN_TIME_MS` milliseconds** (default `10_000`, tunable
in `GameConfig`). The two limits compose: the turn ends on whichever
budget runs out first — distance or time.

#### Behaviour

- The timer starts the moment `turnIndex` advances to the drawer
  (or the round transitions to `drawing`), **not** when they first
  put the pointer down. Sitting and thinking is fine, but it counts.
- The countdown is rendered for every peer, not just the drawer.
- At deadline:
  - If the drawer is mid-stroke, their pointer is released, the
    current stroke ends in place, and the turn advances.
  - If the drawer hasn't drawn anything yet, the turn advances with
    no stroke. (An empty turn is a legitimate game state — the
    drawer chose to waste their slot.)
- The same auto-advance code path as the brush-quota cutoff fires.

#### Schema additions

```ts
// in src/types.ts
type Round = {
  // ...existing fields...
  turnStartedAt: number;  // Date.now() at this turn's start; resets per turn
};

type GameConfig = {
  // ...existing fields...
  turnTimeMs: number;     // default 10_000
};
```

`turnStartedAt` is written on the same `update()` that bumps
`turnIndex` (or that flips phase to `drawing`), so every peer reads
the same anchor.

#### Auto-advance writer

The drawer's client owns the deadline write under normal conditions.
If no presence in the room carries the drawer's actorID at the
moment the deadline passes (drawer DC'd), the **host** writes the
advance after a `1_500` ms grace, so a disconnect can't stall the
game.

Concurrent double-writes are safe: both writers set the same target
`turnIndex` and the same fresh `turnStartedAt`, so the merged
result is identical.

#### UI

A small countdown chip next to the brush meter:

```
Brush  ████████░░░░░░░░░ 62%        Turn  ⏱ 0:07
```

Colour shifts as the timer drops: accent → warning at ≤ 5 s →
danger at ≤ 3 s. The final 3 s should pulse so the cue is hard to
miss in a busy canvas.

### Chat

Each game has a chat log stored at `root.chat` as a Yorkie array of
messages. Plain text, sender's actorID, monotonic timestamp.

```ts
// in src/types.ts
type ChatMessage = {
  id: string;
  authorId: string;
  text: string;
  at: number;  // Date.now() at author's clock
};

type CanvasDoc = {
  // ...existing fields...
  chat: Array<ChatMessage>;
};
```

#### UX

A right-side panel (collapsible on narrow viewports) with:

- Scrolling message list, sender name colour-coded by the author's
  presence colour.
- A single-line input + Enter to send.
- "X is typing…" indicator via presence (`presence.typing: boolean`).

#### Phase semantics

| Phase     | Chat allowed? |
|-----------|----------------|
| lobby     | Yes            |
| drawing   | Yes (everyone, including the drawer — they can react in chat between strokes) |
| voting    | Yes            |
| reveal    | Yes            |
| guessing  | Yes — but **liar's typing indicator is suppressed** so others don't infer thinking time |
| roundEnd  | Yes            |
| finished  | Yes            |

The liar can chat freely. Whether a careless chat message gives them
away is a social problem, not a technical one — the game does not
filter or moderate.

#### Persistence

Chat clears on `Play again` from `finished`. It does **not** clear
between rounds — banter carries through the session.

### Always-guess flow

The phase machine changes one edge: `reveal` now always advances to
`guessing`, regardless of whether the accused was the liar. The
liar's guess always happens; the accused's identity just decides
the scoring branch.

```
voting ──host reveal──▶ reveal ──host continue──▶ guessing
                                                       │
                                                       ▼
                                                   roundEnd
```

The reveal screen explicitly states `caught` or `not caught`; the
host's continue button text is the same in both cases ("Continue").

In `guessing`, the liar always sees an input regardless of whether
they were caught — the result determines which of the four scoring
combos applies.

### Scoring — finalised 2×2

Two axes, four cells.

| caught? | liar guessed keyword? | liar Δ | each non-liar Δ | Vibe |
|---------|------------------------|--------|------------------|------|
| Y (caught) | Y (correct)         | **+1** | **+1**           | "You got me but I knew the answer." |
| Y (caught) | N (wrong)           | **0**  | **+2**           | Clean win for the room. |
| N (escaped) | Y (correct)        | **+3** | **0**            | Perfect bluff *and* understood the room's drawings. |
| N (escaped) | N (wrong)          | **+2** | **+1**           | Bluffed convincingly but didn't actually get it; room takes a small consolation. |

Numbers are deliberately small and integer so the scoreboard stays
readable. They are tunable from one constant table — see
`src/game/state.ts` `applyScores`.

#### Why these numbers

- Liar's best outcome (3) requires both axes — bluff plus
  comprehension. That's hardest, and the biggest single jump.
- Liar's worst outcome (0) requires being caught AND blanking on
  the keyword. Symmetrical with the best case.
- The non-liar's "the room nailed it" outcome (+2 each) is the
  same value the liar gets for an escape-and-blank, so a single
  perfect bluff plus a non-guess balances roughly with one good
  catch.
- The mixed cells both award +1 to both sides so neither side feels
  fully cheated by the partial outcome.

These can be revisited in a v1.1 doc; ship with these for the v1.0
beta and use lessons feedback to retune.

### Real-time visibility (no change, restated)

The existing model already pushes each `Point` to the document the
moment it's added, and every peer's `Canvas` redraws on every
`useEffect` keyed on `strokes` length. v1.0 makes this rule
explicit so future "let's batch updates" optimisations don't
violate it:

> While the drawer's pointer is down, peers MUST render new
> stroke points within one paint frame of receiving them. Any
> proposed batching that delays remote rendering more than ~50 ms
> is a regression of the rule.

The brush meter follows the same rule — observers see the drawer's
quota tick down with the same latency as the strokes themselves.

### No undo

A drawer cannot remove a stroke they made on their turn. The
brush quota plus this rule is what makes each pointer-down
intentional.

Implementation cost: nothing — we don't add the button. Mentioned
explicitly here so a future "but it would be nice if…" doesn't get
silently introduced.

### Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| Two writers race the `brushUsedPx` increment | Each turn has one drawer; only that actorID writes the counter. CRDT-merged concurrent local moves are still safe because no other client writes to the same key during the turn. |
| Long chat log eats document size | Cap at last 200 messages per game; drop the oldest on overflow. The roundEnd → next-round transition is the natural prune point. |
| Liar's typing indicator leaks role | Suppress the `typing` presence write while the local actor is the liar AND phase is `guessing`. |
| Brush quota too tight / too loose | Default 1500 px is a starting guess. Beta feedback (Task 12 of the release plan) decides v1.0 final. Knob is in `GameConfig` so the host can override mid-session if it's obviously wrong. |
| Turn timer too short / too long | Default 10 s is a starting guess. Same `GameConfig` override pattern as the brush quota. Beta feedback decides v1.0 final. |
| Clock skew between peers makes the timer unfair | Document-stored `turnStartedAt` plus each peer's local clock for delta means everyone sees within ~hundreds of ms of each other. Acceptable for a casual game; revisit only if beta surfaces it. |
| Drawer disconnects with the timer still running | Host takes over the auto-advance write after a 1.5 s grace past deadline. The double-write race with a reconnecting drawer is safe — same target state. |
| Real-time stroke flood inflates Yorkie ops | Already throttled by the existing 2 px movement filter in Canvas.tsx. Re-confirm the budget cap doesn't change the per-second op rate. |

### Design Decisions

| Decision | Reason |
|----------|--------|
| Brush quota stored on the document, not derived locally | Observers must see the same meter as the drawer. Deriving from stroke length per peer is possible but fragile under network reorders. |
| Always-guess (vs the old "only if caught" branch) | A 2×2 table is cleaner than a 3-row table, every round feels resolved, and the suspense of "did the liar actually understand the drawings?" is the new fun. |
| Chat in the document, not in presence | Survives reconnect, late joiners see scrollback. Presence is for ephemeral signals (typing). |
| Chat doesn't clear between rounds | Conversation continuity is the point. Clearing on Play Again keeps a fresh game fresh. |
| No undo | Brush quota is the resource; un-doing strokes would undo the meter cost and break the tension. |
| Single brush width for everyone | Per-player width complicates the meter math (does a thick brush burn faster?) and adds UI for no gameplay payoff at v1.0. |
| Timer starts on turn handover, not pointer-down | Pointer-down would let a drawer think indefinitely before "burning" any clock. Wall-clock from turn handover makes hesitation a real cost, which is the whole point of a 10 s limit. |
| Auto-advance writer = drawer with host fallback | The drawer is the natural owner of the deadline since they own the turn. Falling back to host on disconnect keeps the game from stalling without requiring every client to race to advance. |

## Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| Time-based turn limit *instead of* brush distance | Distance and time both have edge cases (afk drawers exploit a pure-distance limit; lag advantage exploits a pure-time limit). v1.0 ships both — whichever runs out first ends the turn. |
| Turn timer that starts on pointer-down | Lets the drawer stall indefinitely before committing — defeats the "10 s, go!" feel. |
| Server-authoritative deadline | Would solve clock-skew exactly but contradicts the MVP's "no backend" stance. Acceptable post-v1.0 if drift becomes a problem. |
| Allow brush size to consume quota proportionally | Adds dimension to the scoring/strategy with no clear payoff for v1.0. Revisit post-v1.0 if beta wants it. |
| Liar always guesses, *but only the liar sees the question screen* (others see a placeholder) | Adds a hidden-information layer that's nice but breaks the "everyone shares the same screen" reading. Keep parallel screens. |
| Per-message ephemeral chat (disappears after 30s) | Cute but breaks scrollback for late joiners. The 200-message cap is a simpler equivalent. |
| Server-mediated brush meter | Same authoritativeness as keyword secrecy — not needed under MVP's trust model. |

## Tasks

Implementation lives in
[`tasks/active/20260604-quality-pass-todo.md`](../tasks/active/20260604-quality-pass-todo.md)
— Tasks 1 (brush quota), 2 (chat), 3 (always-guess + 2×2
scoring).
