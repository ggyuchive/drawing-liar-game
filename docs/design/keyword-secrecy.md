---
created: 2026-06-05
updated: 2026-06-05
tags: [backend, security, secrecy, integrity, vercel]
---

# Server-Authoritative Keyword & Role Secrecy

## Problem

The MVP and v1.0 ship a "trust the client" model: the whole game
state — including `round.keyword` and `round.liarId` — lives in the
shared Yorkie document. Any participant (or anyone who guesses the
room code) can read the document and learn the keyword and who the
liar is, which trivially breaks the game.

The host can't be trusted to hold the secret either: the host is a
normal player and may themselves be the liar. So secrecy can't live
on *any* client — it needs an authority outside the document.

This is the largest integrity gap and the agreed first backend cut.
Private rooms, persistence, and anti-grief are explicitly deferred to
later plans (see the
[post-v1 backlog](../tasks/active/20260605-post-v1-backlog.md)).

### Goals

- The keyword for a round is **never** present in the Yorkie document
  or readable by the liar.
- The liar's identity is **not** derivable from the document before
  the reveal phase.
- Each client learns only: *am I the liar?* and, if not, *the
  keyword* — and nothing about other players' roles.
- No user accounts. The casual "type a name, share a link" flow is
  preserved.
- Runs as Node/TypeScript **Vercel Functions** alongside the existing
  static app (one deploy, shared types).

### Non-Goals

- Private / lockable rooms, kick/mute, rate-limiting (later Tier-1
  plans).
- Persistence / game history.
- Cheat-proof drawing or vote integrity — votes, strokes, scores stay
  in the document under the existing trust model. Only the keyword and
  role are made authoritative; everything else is unchanged.
- Replacing Yorkie as the sync layer. Yorkie still carries drawing,
  chat, votes, phase, and scores.

## Design

The server becomes the **authority for round setup**. It assigns the
keyword and the liar, keeps both server-side, and releases each client
only its own role (+ the keyword to non-liars) over an authenticated
HTTP channel. The document carries everything except `keyword` and
`liarId`.

### Identity & auth — server-issued signed token

On joining a room, the client calls `POST /api/session` with its
stable per-tab `uid` (already implemented, see `getSessionUid`) and
the room code. The server returns a short-lived **signed token** (JWT,
HS256 with a server secret) binding `{ uid, room }`. The client sends
this token on every subsequent call. No accounts, no login — the token
just lets the server trust "this caller is uid U in room R."

```
client (uid) ──POST /api/session {uid, room}──▶ server
client ◀──── token = sign({uid, room, exp}) ────
```

### Round setup — server assigns and withholds

When the host starts a round, instead of writing keyword/liar into the
document, the client calls the server, which owns the assignment:

```
host ──POST /api/round/start {room, token, playerUids[], decks[]}──▶ server
server: pick a deck D + index I across ALL decks (weighted by size),
        pick liar L from playerUids
server: store {room, roundId, D, I, L} in server state (KV)
server ◀── { roundId }  (NO deck, NO index, NO liar) ──
host: write to Yorkie doc: phase=drawing, roundId, playerOrder, …
      but round.keyword/keywordDeck/keywordIndex/liarId all empty
```

Players do **not** choose a category — the host sends every deck's
size and the server picks the category too. The category is itself a
hint (it narrows what to draw), so it's withheld from the liar exactly
like the keyword. The document gains an opaque `roundId`; the
`keyword`, `keywordDeck`, `keywordIndex`, and `liarId` fields stay in
the schema but are empty (`-1` for the index) until the reveal step.

### Role/keyword fetch — per client, authenticated

Each client fetches its own view:

```
client ──GET /api/round/:roundId/me  (token) ──▶ server
server: verify token → uid U; look up round
server: isLiar = (U === L)
server ◀── { isLiar: true }                          (liar)
        ◀── { isLiar: false, keywordDeck: D, keywordIndex: I }  (non-liar)
```

The liar never receives the deck/index. A non-liar receives them and
localizes the word from its parallel i18n deck to render the HUD (the
server holds only deck+index, never keyword strings). Because the token
binds the uid, a client can only ever fetch *its own* role — it can't
ask "is Bob the liar?".

### Reveal — server releases the secret

At the reveal/guessing transition the server publishes the answer so
RoundEnd can show it to everyone:

```
host ──POST /api/round/:roundId/reveal (token)──▶ server
server ◀── { keywordDeck: D, keywordIndex: I, liarId: L } ──
host: write deck + index + liarId (+ resolved keyword) into the doc
```

After reveal, the values live in the document as before, so the
existing Reveal / RoundEnd UI keeps working unchanged.

### What stays in the document (unchanged)

`phase`, `playerOrder`, `turnIndex`, `strokesDone`, `votes`,
`scores`, `colors`, strokes, chat, brush/timer fields. The server owns
the round's `keywordDeck` + `keywordIndex` + `liarId`, only until reveal.

### Server state

Round secrets (`{roundId → {keyword, liarId, room, playerUids}}`) can
start as an in-memory map for a single function instance, but Vercel
Functions are stateless/multi-instance, so the first real
implementation uses **Upstash Redis** (added via the Vercel
Marketplace) keyed by `roundId`, with a TTL so abandoned rounds
expire. Upstash is the convenient native choice now that the old
Vercel KV product is retired in favour of Marketplace databases; it is
serverless, has a free tier, and supports per-key TTL directly.

### Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| Host writes a fake/empty roundId or skips the server | The keyword HUD comes only from the server; a forged round just yields no keyword for anyone, which is self-defeating, not an exploit. Non-liars with no keyword is a visible broken state, not a secrecy break. |
| Token theft lets someone fetch a role | Tokens are per-uid and per-room, short-lived, and only ever return the *caller's own* role — a stolen token reveals only that one player's role, which they already know. |
| Vercel Functions are multi-instance / stateless | Store round secrets in Upstash Redis keyed by `roundId` with a TTL, not in process memory. |
| Liar inferred from timing/turn order | Role assignment is server-side and random; the document exposes no liar hint until reveal. (Chat/behaviour leaks remain a social problem, as today.) |
| Server down → game can't start | Degrade explicitly: if `/api/round/start` fails, the host sees an error and can retry; optionally a clearly-labelled "insecure local mode" fallback for dev only. |
| Clock/replay on tokens | Include `exp` and `room`; verify both. Rotate the signing secret via env var. |

### Design Decisions

| Decision | Reason |
|----------|--------|
| Server owns keyword **and** liar, not just keyword | The liar id in the doc is itself a secret before reveal; hiding only the keyword would still leak the role. |
| Keep votes/scores/strokes in the document | They aren't secrets; moving them would mean reimplementing the sync layer for no integrity gain. |
| Node/TS Vercel Functions | Shares types with the app, one deploy, no separate infra; matches the chosen hosting. |
| Signed token bound to the existing `uid` | Reuses the identity we already made reload/reconnect-stable; no accounts, preserves the casual flow. |
| `roundId` opaque handle in the doc | Lets any client ask the server about "the current round" without exposing round internals. |
| Upstash Redis for round secrets | Convenient Vercel-native KV (Marketplace) after the old Vercel KV retired; serverless, free tier, per-key TTL — a perfect fit for short-lived `roundId` secrets. |
| Server picks the category across all decks; players can't filter | The category narrows what to draw, so it's a hint — letting a player (possibly the liar) choose or read it would leak. The host sends every deck's size; the server picks deck+index, weighted by size so each keyword is equally likely. |

## Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| Encrypt the keyword in the document, give the key only to non-liars | Key distribution has the same "who do you trust to hold it" problem; the liar is a participant. Ends up needing a server anyway. |
| Server is a Yorkie client that writes per-presence private data | Yorkie presence/doc is shared; there's no per-recipient private channel in the document model. HTTP fetch per client is simpler and truly private. |
| Full auth provider (Clerk/Auth0) | Adds accounts/login friction to a drop-in party game; the signed-token-on-uid model is enough to gate "your own role". |
| Go standalone service | Stack mismatch with the app, separate deploy/infra; revisit only if Functions hit limits. |
| Trust the host to hold the keyword | The host can be the liar. Non-starter. |

## Tasks

- [`tasks/active/20260605-keyword-secrecy-todo.md`](../tasks/active/20260605-keyword-secrecy-todo.md)
  — first backend cut: server-authoritative keyword + role secrecy.
