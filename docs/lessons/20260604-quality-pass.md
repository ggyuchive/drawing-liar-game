---
created: 2026-06-04
updated: 2026-06-04
tags: [yorkie, presence, i18n, timer, quality-pass]
---

# Quality Pass Lessons

Things picked up while executing the
[quality pass plan](../tasks/archive/20260604-quality-pass-todo.md):
brush quota, turn timer, chat, always-guess + 2×2 scoring, colour
picker, host clear-board, keyword decks.

## Yorkie SDK

### `presence.set` takes a partial object, not `(key, value)`

The natural guess — `presence.set('typing', true)` — fails type-check
with `TS2559: Type '"typing"' has no properties in common with type
'Partial<CanvasPresence>'`. The setter signature is
`set(partial: Partial<P>)`.

**Why:** The presence API mirrors React's `setState(partial)` shape,
not a map's `set(k, v)`. `get(key)` *is* keyed, which makes the
asymmetry easy to trip over — you read with `get('typing')` but write
with `set({ typing: false })`.

**How to apply:** Always write presence as an object literal:
`presence.set({ typing: true })`. See `src/game/Chat.tsx`.

### A doc-keyed `useEffect` re-runs on every stroke point

The turn-timer deadline lives in a top-level `useEffect` in
`Room.tsx`. If its dependency array references `root` (or anything
that changes on every CRDT op), it tears down and recreates the
`setTimeout` on *every* brush point written during drawing — dozens
of times a second.

**Why:** `brushUsedPx` is written on each `pointermove`, so `root`
changes constantly mid-stroke. The timer stays *correct* (the new
timeout is recomputed from the stable `turnStartedAt` anchor, so no
drift) but the churn is wasteful.

**How to apply:** Depend on the *primitives* the effect actually
needs — `phase`, `turnStartedAt`, `turnTimeMs`, `turnIndex` — not the
whole `root`. `brushUsedPx` is deliberately excluded so a stroke in
progress doesn't reset the timer. The document-stored `turnStartedAt`
is what keeps every peer's countdown in sync.

## Game model

### Compute `caught` at guess-submit time, persist it as `wasCaught`

Always-guess means `reveal` no longer branches on whether the liar
was caught — that fact has to be recovered later for scoring and the
RoundEnd outcome text. Re-tally the votes inside the same `update()`
that flips to `roundEnd`, derive `caught`, and store it as
`round.wasCaught`.

**Why:** RoundEnd shouldn't re-tally (the votes are still on the
round, but re-deriving in a render path invites drift if the tally
rule ever changes). One author, one write, one persisted boolean.

**How to apply:** `tallyVotes(r.game.round.votes).accusedId ===
liarId` at submit time → `wasCaught`. The 2×2 table in `applyScores`
keys off `{ caught, guessed }`; RoundEnd keys off
`(wasCaught, guessCorrect)`.

## i18n

### Splitting `keywords` into decks is a breaking shape change

`Locale.keywords` went from `ReadonlyArray<string>` to
`Record<string, KeywordDeck>`. Every locale file and the
`pickKeyword` helper had to change together, and the `general` deck
is now a required fallback key.

**How to apply:** `keywordsFor(code, deck)` falls back
deck → `general` → first available, so a config referencing a missing
deck never returns empty. `deckListFor(code)` drives the lobby
selector. Deck *keys* (`general`/`food`/`nature`) are shared across
languages so switching language keeps the selected deck valid.

## Deferred / edge cases (for the v1 release pass)

- **Spectator-as-host stall.** If host promotion (v1 release Task 1)
  hands the host role to a late joiner who isn't in `playerOrder`,
  host-only actions are gated off for them — which can stall an
  active round. Acknowledged in the release plan; revisit if beta
  hits it.
- **Liar AFK in `guessing`.** Always-guess means the round waits on
  the liar's submit. If they never submit, the phase stalls. Same
  class of "no host force-advance" gap as the MVP had; out of scope
  here.
- **Mobile.** Responsive CSS landed (chat collapses, gauges stack at
  ≤720px) but was not verified on real devices — that's the manual
  half of Task 8 and the release plan's compat matrix.
