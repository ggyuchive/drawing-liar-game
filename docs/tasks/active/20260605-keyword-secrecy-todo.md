# Keyword & Role Secrecy — Implementation Plan

> First backend cut. Spec:
> [`docs/design/keyword-secrecy.md`](../../design/keyword-secrecy.md).
> Steps use checkbox (`- [ ]`) syntax. Each task ends with a single
> commit using the project's `[init]` / `[feat]` / `[fix]` convention.

**Goal:** Make the keyword and the liar's identity
server-authoritative so neither is readable from the Yorkie document
before reveal — without adding accounts.

**Stack:** Node/TypeScript **Vercel Functions** (`api/`), signed
tokens (JWT HS256) bound to the existing per-tab `uid`, round secrets
in **Upstash Redis** (Vercel Marketplace) keyed by `roundId`.

**Prerequisite:** v1.0 is deployed on Vercel — done, live at
`drawing-liar-game.vercel.app`. The Functions ship from the same
project + env vars.

## Status (2026-06-11)

Code for Tasks 1–6 is **implemented and green** (`pnpm build` typechecks
`api/` via a new `tsconfig.api.json`; `pnpm lint`; `pnpm test` — the
`api/_lib` unit tests cover token round-trip/rejection, round
assignment, and the "`/me` is self-only / no leak" rule). The client
reads role + keyword from the server during drawing and publishes the
secret into the document at reveal, with an **insecure DEV fallback**
(plain `pnpm dev`, no Functions) that keeps local multiplayer working.

**Still open — needs the user / a live environment:**
- Pre-flight: provision Upstash Redis + set `JWT_SECRET` and the
  `UPSTASH_*` vars in Vercel (Production + Preview).
- Live verification with `vercel dev` and on a Preview deploy (the
  serverless round flow can't be exercised in the local test runner).
- Task 7's optional multi-user sim extension and Task 8's archive +
  paired lesson, once verified live.

**Source-of-truth files likely touched:**
- new: `api/session.ts`, `api/round/start.ts`, `api/round/[roundId]/me.ts`,
  `api/round/[roundId]/reveal.ts`
- new: `api/_lib/` (token sign/verify, KV client, round logic)
- `src/types.ts` — `Round.roundId`; keyword/liarId become empty until reveal
- `src/Room.tsx` — session token on join; server round-start; reveal call
- new: `src/game/secrets.ts` — client wrapper for the API + token cache
- `src/game/RoundHud.tsx`, `Guessing.tsx` — read keyword/isLiar from the
  server view, not the document

---

## Pre-flight

- [x] **Provision Upstash Redis.** Done via Vercel's Upstash
  integration. NOTE: it injects `KV_REST_API_URL` + `KV_REST_API_TOKEN`
  (not `UPSTASH_REDIS_REST_*`); the server (`api/_lib/rounds.ts`) accepts
  either pair. KV_* land in Prod+Preview automatically.
- [ ] **Add `JWT_SECRET` to Vercel (Production + Preview)** — the
  integration does NOT create it; generate one (`openssl rand -base64 32`)
  and set it manually, else token signing fails in deploy.

- [ ] **Local dev story.** `vercel dev` serves Functions + the Vite
  app together. Document it in the README "Run locally" once it works.

## Task 1: Backend scaffolding + shared lib

- [ ] Add deps: a JWT lib (`jose`) and `@upstash/redis`. Add `api/` to
  the build/lint config so Functions are typechecked.
- [ ] `api/_lib/token.ts` — `signSession({uid, room})` and
  `verifySession(token) -> {uid, room}` (HS256, `exp`, verify `room`).
- [ ] `api/_lib/rounds.ts` — pure round logic: `assignRound(playerUids,
  pickKeyword) -> {keyword, liarId}`, plus KV get/set/del by `roundId`
  with TTL. Keep the pure parts free of the KV client so they unit-test.
- [ ] **Commit:** `[init] Scaffold Vercel Functions + token/round lib`

## Task 2: Session token endpoint

- [ ] `POST /api/session` — body `{uid, room}`; returns
  `{token}`. (No verification of "who you are" beyond binding the uid;
  the token only gates *your own* role later.)
- [ ] **Commit:** `[feat] Issue a signed session token bound to the uid`

## Task 3: Round start (server assigns + withholds)

- [ ] `POST /api/round/start` — verify token; body `{playerUids, deck}`;
  pick keyword + liar; store `{keyword, liarId, room, playerUids}` in
  KV under a fresh `roundId` with TTL; return `{roundId}` only.
- [ ] **Commit:** `[feat] Assign keyword + liar server-side on round start`

## Task 4: Per-client role/keyword fetch

- [ ] `GET /api/round/:roundId/me` — verify token → `uid`; look up
  round; return `{isLiar:true}` or `{isLiar:false, keyword}`. Never
  reveal other players' roles.
- [ ] **Commit:** `[feat] Serve each client only its own role + keyword`

## Task 5: Reveal endpoint

- [ ] `POST /api/round/:roundId/reveal` — verify token (host); return
  `{keyword, liarId}` so the result can be published to the document.
- [ ] **Commit:** `[feat] Release keyword + liar at reveal`

## Task 6: Client integration

- [ ] **Schema:** add `roundId: string` to `Round`; keep `keyword` /
  `liarId` but leave them empty until reveal. Update `emptyRound`.
- [ ] **Token on join:** `src/game/secrets.ts` fetches + caches the
  session token (keyed on uid+room) for the tab.
- [ ] **onStart:** call `/api/round/start` with the player uids and
  deck; write the returned `roundId` + phase into the doc; do **not**
  write keyword/liarId.
- [ ] **Drawing HUD:** `RoundHud` / the liar checks read `{isLiar,
  keyword}` from `/api/round/:roundId/me` (cached per round), not from
  the document. Show a loading state while fetching.
- [ ] **Reveal:** host calls `/api/round/:roundId/reveal` and writes
  the returned `keyword` + `liarId` into the doc; existing Reveal /
  RoundEnd UI then works unchanged.
- [ ] **Errors:** if the server is unreachable on start, surface a
  retryable error (don't silently start a keyword-less round).
- [ ] **Commit:** `[feat] Read role + keyword from the server, not the doc`

## Task 7: Tests

- [ ] Unit-test `api/_lib`: token sign/verify round-trip, `room`/`exp`
  rejection, `assignRound` (liar ∈ players, keyword non-empty), and the
  "`/me` never returns another player's role" rule via the pure handler.
- [ ] Extend the multi-user simulation: a round where the document
  holds an empty keyword/liarId until a simulated reveal publishes them.
- [ ] **Commit:** `[feat] Test token, role assignment, and secrecy rules`

## Task 8: Wrap

- [ ] Update `README.md` (local `vercel dev`) and
  `mvp-architecture.md` (note the server-authoritative round setup).
- [ ] Archive this plan; write paired lesson
  `docs/lessons/20260605-keyword-secrecy.md`.
- [ ] **Commit:** `[feat] Document and wrap the keyword-secrecy backend`

---

## Out of scope (later Tier-1 plans)

- Private / lockable rooms, kick / mute, chat rate-limiting.
- Persistence / game history.
- Moving votes / scores / strokes server-side (they aren't secrets).

## Self-Review checklist

- **Keyword never in the doc** pre-reveal — grep the round-start path
  to confirm `keyword`/`liarId` are written empty.
- **`/me` is self-only** — a token for uid U can never fetch V's role.
- **Stateless-safe** — round secrets in KV with TTL, not process memory.
- **Graceful degrade** — server failure is a visible, retryable error,
  never a silent keyword-less round.
