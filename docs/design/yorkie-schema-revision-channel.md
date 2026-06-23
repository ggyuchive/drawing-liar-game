---
created: 2026-06-22
updated: 2026-06-22
tags: [yorkie, schema, revision, channel, architecture]
---

# Yorkie Schema / Revision / Channel — fit for drawing-liar-game

## Problem

Yorkie 0.7.x ships three features beyond the plain `Document` +
`Presence` model this game is built on:

- **Schema** — an optional validation key passed at `attach` time that
  forces every change into a predefined structure.
- **Revision** — immutable, user-labelled snapshots of a document for
  history / preview / restore (distinct from the internal CRDT
  snapshot used for sync).
- **Channel** — a memory-only, ephemeral pub/sub layer for presence and
  one-shot broadcasts that never touches the CRDT history.

The question is not "do they exist" — all three are present and callable
in our installed `@yorkie-js/sdk@0.7.11` (verified below). The question
is **which of them actually buy this game something**, and — just as
important — **which one would re-introduce a bug we already hit** if
applied naïvely.

### Goals

- Record, per feature, whether it fits this game, what it would replace
  or add, and the concrete SDK call it maps to.
- Draw a hard line around what must stay in the `Document` (authoritative
  game state) versus what may move to ephemeral transport.
- Leave a sized, ordered recommendation so a future contributor can pick
  this up without re-deriving the analysis.

### Non-Goals

- Implementing any of the three now. This is an assessment + plan; each
  accepted item gets its own `docs/tasks/active/*-todo.md`.
- Changing the keyword-secrecy model. Secrecy is server-authoritative
  (Vercel functions + the round API); none of these features replace it,
  and Schema must be written to *tolerate* the secrecy placeholders
  (`keywordIndex: -1`, `liarId: ''`) rather than reject them.

## Background — how the game uses Yorkie today

One room = one `Document` keyed `drawing-liar-game-${room}`, with root
([`src/Room.tsx:57`](../../src/Room.tsx)):

```ts
type DocRoot = {
  game: Game;                          // phase, hostId, config, round, scores, colors
  strokes: JSONArray<JSONObject<Stroke>>;
  chat: JSONArray<JSONObject<ChatMessage>>;
};
```

Ephemeral per-tab state lives in `Presence` (`CanvasPresence`: `uid`,
`name`, `color`, `typing`, `lastSeen`, `spectator`, `joinedAt`). Phase
timers and auto-advance are **computed locally** on each client from
`round.turnStartedAt` + a constant duration; no countdown value is
stored. Turn rotation, voting, and scoring run through pure functions in
`src/game/engine.ts` / `state.ts`, driven from inside `update()`
callbacks.

The load-bearing invariant: **the `Document` is the single source of
truth, and every authoritative transition is replayable by a
late-joiner or a reconnecting client.** This is exactly why the room
83UC6 hang was possible — a player who left and rejoined got a *new*
`uid` not in `round.playerOrder`, which is recoverable precisely because
the order lives in the doc. Keep this invariant in mind for the Channel
section; it is the whole reason Channel is "additive only" here.

## Design

### Feature 1 — Schema (recommended, low risk)

**Verified API.** `client.attach(doc, { schema: 'key@version' })`
([`client.ts:269,670`](../../../yorkie-js-sdk/packages/sdk/src/client/client.ts));
the server returns `schemaRules`, the SDK calls `doc.setSchemaRules(...)`
and validates every local change through
`document/schema/ruleset_validator.ts`. A change that violates the schema
throws instead of corrupting the doc.

**Fit: good.** Our doc has exactly the kind of shape that benefits — an
array of `Stroke` objects and an array of `ChatMessage` objects that
every client appends to. A schema that pins, e.g., "`strokes[*]` must be
an object with `id: string`, `color: string`, `size: integer`,
`points` array of `{x: number, y: number}`" turns a class of "one buggy
build corrupts the shared canvas for everyone" into a local throw on the
offending client.

**Caveats specific to us:**

- The schema must **allow the secrecy placeholders**. `round.keyword`
  is `''`, `keywordIndex` is `-1`, `liarId` is `''` until reveal
  ([`src/types.ts:54`](../../src/types.ts)). The ruleset has to permit
  these, so the schema validates *shape*, not *game-stage invariants*.
- The schema is registered server-side (admin / `yorkie schema`) and
  referenced by `key@version`; it is not defined inline in the client.
  That is real operational surface (a deploy step, a version to bump
  when `DocRoot` changes) for a single-maintainer project.
- We are the only writer of this doc. Schema's value here is
  "guard against our own future regressions," not "defend against
  malicious clients" (a malicious client is a *secrecy* concern, already
  handled server-side).

**Verdict:** worth doing, but **Phase-4-grade hygiene**, not urgent. Pin
`strokes` and `chat` element shapes first (highest churn, append-only,
most likely to drift); leave `game` looser because its fields move
through stages.

### Feature 2 — Revision (optional, real feature, medium effort)

**Verified API.** `client.createRevision(doc, label, description)` →
`RevisionSummary { id, label, description, createdAt }`; plus
`listRevisions`, `getRevision` (full snapshot), `restoreRevision`
([`client.ts:1306–1471`](../../../yorkie-js-sdk/packages/sdk/src/client/client.ts)).

**Fit: a new feature, not a fix.** This maps onto the post-v1.0 backlog
item *"Replay / share the final round"* in
[`roadmap.md`](roadmap.md). Concretely: at the end of each turn (or each
round) the host calls `createRevision(doc, 'round-2-turn-3')`. During
`voting`/`reveal`, a "replay the drawing" view calls `getRevision` to
pull the canvas as it stood at each checkpoint and animate through them.

**Critical caveat — use `getRevision`, NOT `restoreRevision`, for
replay.** `restoreRevision` mutates the *live* document back to a past
state, which would clobber the in-progress game for every connected
player. Replay must be **read-only**: fetch the snapshot, render it in a
throwaway local canvas, never touch the shared doc. `restoreRevision`
has no good use here (we never want to roll the whole room back) and
should be treated as off-limits.

**Other caveats:**

- Revisions are whole-document snapshots. The canvas (`strokes`) is the
  interesting part, but each revision also carries `game` + `chat`. Fine
  for replay, but it means a revision is not a cheap per-stroke thing —
  checkpoint at turn/round boundaries, not per stroke.
- Storage + an extra round-trip per checkpoint. Acceptable at
  turn granularity (≤ ~16 turns/round), not at stroke granularity.

**Verdict:** genuinely useful and aligned with an existing backlog wish,
but it is **net-new product scope**, not a correctness improvement. Park
it as a Phase-5/post-v1.0 feature with its own task plan.

### Feature 3 — Channel / broadcast (mostly already solved; additive only)

**Verified API.** `client.broadcast(key, topic, payload)`
([`client.ts:1543`](../../../yorkie-js-sdk/packages/sdk/src/client/client.ts))
for one-shot document-scoped messages, and a full `Channel` primitive
([`channel/channel.ts`](../../../yorkie-js-sdk/packages/sdk/src/channel/channel.ts))
with `subscribe`/`publish`, presence events, and `sessionCount`.

**Fit: limited, because the right tool is already in use.** The mental
model in the prompt — "presence / typing / turn-nudge / one-shot pings
→ Channel, off the CRDT doc" — is correct *in general*, but this game
already routes its ephemeral state through **Presence**, which is the
appropriate Yorkie primitive for exactly that (who's here, `typing`,
`lastSeen`, `spectator`). So Channel would not *replace* a CRDT misuse;
there isn't one to replace.

Where broadcast could add value, narrowly:

- A transient "your turn" nudge / sound cue, or a "vote received" ping —
  things you want delivered once and never persisted or replayed.

**The trap — do NOT move authoritative state to Channel.** Broadcast is
fire-and-forget: a client that is reconnecting, backgrounded, or joining
late **does not receive** a past broadcast. Phase, `turnIndex`,
`playerOrder`, votes, and timer anchor (`turnStartedAt`) must stay in
the `Document` for exactly this reason — it is the property that lets a
reconnecting client recover. Moving turn/timer signalling onto Channel
would reproduce the **83UC6-class hang** by design: a late/rejoining
client would have no authoritative state to sync to. Channel is
allowed only for signals that are *meaningless if missed*.

**Verdict:** low priority. The ephemeral need is already met by
Presence. Use `broadcast` only for genuinely throwaway UX cues, never
for game state. Not worth a task on its own right now.

### Summary mapping

| Yorkie feature | Maps to in this game | Verdict |
|----------------|----------------------|---------|
| **Schema** | Pin `strokes[*]` / `chat[*]` element shapes; tolerate secrecy placeholders in `game.round` | **Do — Phase 4 hygiene.** Low risk, guards against our own regressions. |
| **Revision** | Per-turn/round canvas checkpoints → read-only replay in voting/reveal (the backlog "replay the round" item) | **Optional — post-v1.0 feature.** Real value, net-new scope. `getRevision` only; never `restoreRevision`. |
| **Channel / broadcast** | One-shot UX cues (turn nudge, vote ping) only | **Skip for now.** Ephemeral need already met by Presence; authoritative state must stay in the Document. |

### Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| Schema rejects valid mid-game states (secrecy placeholders `-1`/`''`) | Validate *shape* only; explicitly allow the placeholder values. Test against a full game's doc snapshots before enabling. |
| Schema version drift vs. `DocRoot` changes silently breaks attach | Treat the schema key as part of the deploy; bump `@version` whenever `DocRoot` changes; surface attach-validation errors as the existing "failed to attach" error state. |
| `restoreRevision` used for replay clobbers the live room | Forbid it in code review; replay reads via `getRevision` into a local throwaway canvas, never the shared doc. |
| Revision checkpoints created per-stroke balloon storage/latency | Checkpoint only at turn/round boundaries, host-owned (one writer), like the existing chat join/leave writes. |
| Moving turn/timer/phase to Channel re-creates the 83UC6 hang | Hard rule: authoritative, late-join-recoverable state stays in the `Document`. Channel only for signals that are safe to miss. |

### Design Decisions

| Decision | Reason |
|----------|--------|
| Schema scoped to `strokes`/`chat` element shapes, `game` left loose | Those arrays are append-only, high-churn, and shape-stable; `game` legitimately changes shape across phases and carries secrecy placeholders. |
| Replay uses `getRevision`, `restoreRevision` is off-limits | Restore mutates the shared live doc; replay must be read-only so it can't disturb an in-progress game. |
| Keep ephemeral state in Presence, not Channel | Presence is Yorkie's intended primitive for who's-here/typing/seen and already syncs + recovers on reconnect; broadcast does not reach late joiners. |
| Authoritative game state stays in the Document | The late-join / reconnect recovery invariant (the fix surface for hangs like 83UC6) depends on it. |

## Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| Move turn/timer signalling to Channel/broadcast for "lighter" sync | Breaks late-join/reconnect recovery; fire-and-forget delivery would reproduce the 83UC6 hang. |
| Use `restoreRevision` to "rewind and rewatch" in the live room | Mutates the shared doc for everyone; replay must be local read-only. |
| Per-stroke Revisions for frame-accurate replay | Whole-doc snapshots are too heavy per stroke; turn/round granularity is enough for "replay the drawing." |
| Enforce game-stage invariants (e.g. "liar set by reveal") in Schema | Schema validates structure, not lifecycle; stage invariants belong in the engine/`update()` logic and tests. |

## Tasks

No execution plan yet — this doc is an assessment. When picked up:

- **Schema** (Phase 4 hygiene): new `docs/tasks/active/*-schema-todo.md` —
  register a `DocRoot` schema, attach with `{ schema }`, verify against
  real game snapshots including secrecy placeholders.
- **Revision replay** (post-v1.0): folds into the existing
  *"Replay / share the final round"* backlog item in
  [`roadmap.md`](roadmap.md) → [`tasks/active/20260605-post-v1-backlog.md`](../tasks/active/20260605-post-v1-backlog.md).
- **Channel**: no task; revisit only if a throwaway UX cue (turn nudge /
  vote ping) is actually wanted.
