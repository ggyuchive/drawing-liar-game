---
created: 2026-06-15
updated: 2026-06-15
tags: [backend, redis, upstash, vercel, secrecy, counters]
---

# Redis (Upstash) Usage

## Why Redis at all

The game's shared state — strokes, chat, votes, scores, phase, presence —
lives in a **Yorkie document** per room and is synced peer-to-peer; the
Vercel Functions never touch Yorkie/Mongo. Redis exists only for the two
things the document model can't (or shouldn't) do:

1. **Round secrets** — the keyword + liar must be hidden from the
   document (otherwise the liar reads them in DevTools). They need an
   authority *outside* the doc. See
   [`keyword-secrecy.md`](keyword-secrecy.md).
2. **Global counters** — "how many rooms / users are active right now"
   is a cross-document aggregate. Yorkie presence is per-document, and
   the client SDK has no "count all docs/sessions" query, so a global
   tally needs an external store. Redis sorted sets with a time window
   are a perfect fit (cheap `ZADD`/`ZCARD`, TTL-style pruning, no hub
   document, no room-code exposure).

Both are short-lived, high-churn, and global — exactly Redis's sweet
spot, and Vercel Functions are stateless/multi-instance so in-process
memory can't hold them in production.

## Provider & client

- **Upstash Redis**, added via the Vercel integration. It injects
  `KV_REST_API_URL` / `KV_REST_API_TOKEN`; a standalone Upstash setup
  uses `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`. The server
  accepts **either** pair (`api/_lib/rounds.ts`, `api/_lib/rooms.ts`).
- Accessed only from Vercel Functions through `@upstash/redis`
  (`new Redis({ url, token })`).
- **Dev fallback:** when no Redis env is present (plain `vercel dev`
  without the integration, or local `pnpm dev` which has no Functions),
  the libs fall back to an in-memory `Map`. That is single-instance
  only — production must have Upstash configured.

## Keys

| Key | Type | Value | TTL / window |
|-----|------|-------|--------------|
| `dlg:round:<roundId>` | String (JSON) | `{ room, deck, keywordIndex, liarId, playerUids }` — the round's secret | 1 hour (`EX`) |
| `dlg:rooms` | Sorted Set | member = room code, score = last-ping epoch ms | 90 s window (pruned on read) |
| `dlg:users` | Sorted Set | member = per-tab `uid`, score = last-ping epoch ms | 90 s window (pruned on read) |

The counter sets store an opaque room code / uid only; no joinable
secret leaves the server (the landing page only ever receives the
aggregate numbers).

## Operations by endpoint

| Endpoint | Redis op(s) | Purpose |
|----------|-------------|---------|
| `POST /api/session` | — (none) | Signs a JWT; no DB. |
| `POST /api/round/start` | `SET dlg:round:<id>` (`EX 3600`) | Store the assigned keyword index + liar; return only `roundId`. |
| `GET /api/round/:id/me` | `GET dlg:round:<id>` | Return the caller's own role (+ keyword to non-liars). |
| `POST /api/round/:id/reveal` | `GET dlg:round:<id>` | Release deck/index/liar so the host can publish them to the doc. |
| `POST /api/rooms/ping` | `ZADD dlg:rooms`, `ZADD dlg:users` | Heartbeat the room + user (every 60 s while in a room). |
| `GET /api/rooms/active` | `ZREMRANGEBYSCORE` + `ZCARD` (both sets) | Prune entries older than the window, then count rooms + users. |

## Lifecycle / pruning

- **Round secrets** self-expire after 1 hour via `EX`; abandoned rounds
  vanish without cleanup. They are read at most twice (`/me` per client,
  `/reveal` once) and never deleted explicitly.
- **Counters** are pruned lazily on every `GET /api/rooms/active`:
  `ZREMRANGEBYSCORE <key> 0 <now-90s>` drops stale members before
  `ZCARD`. A room/user that stops pinging falls out of the count within
  ~90 s. No background job needed.

## Notes & limits

- The counters are **cosmetic** — `ping`/`active` are unauthenticated
  (a forged ping can only inflate a display number, not reach a secret).
- `roundId` is written into the public document, but knowing it reveals
  nothing: `/me` is token-bound and only ever returns the caller's own
  role.
- Rotating the Upstash token (or `JWT_SECRET`) is an env change +
  redeploy; round secrets are short-lived so a rotation is low-impact.
