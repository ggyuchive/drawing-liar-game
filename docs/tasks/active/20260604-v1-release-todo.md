# v1.0 Release Implementation Plan

> **For agentic workers:** Phases 4 + 5 of the
> [roadmap](../../design/roadmap.md). Steps use checkbox (`- [ ]`)
> syntax. Each task ends with a single commit using the project's
> `[feat]` / `[fix]` convention.

**Goal:** Take drawing-liar-game from "MVP that works between friends in
one room" to "a public URL anyone can use to play a game with their
friends, tagged `v1.0.0`."

**Spec:** [`docs/design/roadmap.md`](../../design/roadmap.md) §
"Phase 4 — Release readiness" and § "Phase 5 — v1.0 launch."

**Prerequisite:** The
[quality pass](20260604-quality-pass-todo.md) is done and archived.
Some of those changes (drawing tools, decks) are part of what makes
v1.0 enjoyable; you can technically release without them, but
shouldn't.

**Tech Stack:** unchanged. Deployment target chosen here for
concreteness: **Vercel** (Vite + static SPA pattern, free tier
plenty for MVP traffic). Substitutable with Cloudflare Pages,
Netlify, or self-hosted Caddy — note the swap in a lesson if you go
elsewhere.

**Source-of-truth files likely to be touched:**
- `src/Room.tsx`, `src/App.tsx` — host election & late-join logic,
  reconnect feedback
- `vite.config.ts` — manual chunks, build target tweaks
- `public/` — favicon, OG image, robots.txt
- new: `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
  `CHANGELOG.md`
- new: `.github/workflows/ci.yml` (lint + build on PR)
- new: `vercel.json` if Vercel needs explicit routing rules
- `README.md` — public-facing rewrite with screenshots and a
  hosted-URL link

---

## Pre-flight

- [ ] **Confirm starting state**

  Quality pass plan must be archived. `git log --oneline | head -5`
  should show the wrap-up commit.

- [ ] **Pick the production domain**

  Decide: a custom domain (e.g. `drawing-liar-game.app`) or a Vercel
  subdomain (`drawing-liar-game.vercel.app`). Document the choice in a
  lesson file so the README and OG metadata can reference it
  consistently.

---

## Task 1: Host promotion on disconnect

**Files:**
- Modify: `src/Room.tsx` — election effect

Today's behavior: the *first* actorID to join becomes the host;
nothing else replaces them. If their tab closes, no one can advance
the game. Promote the longest-attached remaining presence.

- [ ] **Step 1: Detect "host is gone"**

  In the existing election effect, also handle the case where
  `game.hostId` is set but no presence has that clientID. Treat
  hostId as effectively absent.

- [ ] **Step 2: Election rule**

  Pick a deterministic survivor: e.g. the lexicographically smallest
  remaining `clientID`. Every client computes the same answer, and
  the CRDT merge of two concurrent writes still converges.

- [ ] **Step 3: Mid-phase robustness**

  If the host disconnects during `voting`, no special handling
  needed — voting writes are per-voter, the new host just inherits
  the "Reveal" button. If they disconnect during `reveal` /
  `guessing` / `roundEnd`, the new host gets the appropriate host-
  only action button on the next render.

- [ ] **Step 4: Manual test**

  3 tabs. Tab 1 (host) starts a game, advances to drawing, then
  closes its window. Tab 2 should see the host promotion immediately
  (visible in the roster + the host-only buttons appearing). Game
  continues.

- [ ] **Step 5: Commit**

  ```
  [feat] Auto-promote the next presence when the host disconnects
  ```

## Task 2: Late-joiner spectator handling

**Files:**
- Modify: `src/Room.tsx` — render path for non-playerOrder presences
- Possibly: `src/game/RoundHud.tsx`, `src/game/Voting.tsx` — show
  spectator state without breaking layout

Currently a player who joins mid-round is *in presences* but *not
in `playerOrder`*. The UI treats them as a normal player, which
breaks turn rotation and vote tallies in subtle ways.

- [ ] **Step 1: Compute `isSpectator`**

  `myActorID && !round.playerOrder.includes(myActorID)` during any
  non-lobby phase.

- [ ] **Step 2: Spectator view per phase**

  - drawing: canvas is read-only (already true for non-drawers, but
    explicitly say "Spectator — waiting for next round")
  - voting: don't render the vote grid; render a "Spectating" card
  - reveal / guessing / roundEnd: same scoreboard as participants,
    but no host action even if `isHost` (host status without
    playerOrder membership is a weird edge case — explicitly bail)

- [ ] **Step 3: Auto-include at next round start**

  `onNext` already snapshots from `presences` — so this works
  for free once Task 1 is in.

- [ ] **Step 4: Manual test + commit**

  ```
  [feat] Treat mid-round joiners as spectators until the next round
  ```

## Task 3: Reconnection feedback

**Files:**
- Modify: `src/Room.tsx` — surface a "reconnecting…" badge using
  Yorkie's connection state
- Modify: `src/i18n/lang/*.ts`

`@yorkie-js/react` exposes `connection` from `useDocument`. When it
drops, the user should see "Reconnecting…" so they don't assume the
app crashed.

- [ ] **Step 1: Read `connection` from `useDocument`**

  Map its values to an i18n message. Show in the room header next to
  the room code.

- [ ] **Step 2: Don't double-render the loading screen**

  If `connection` flips to disconnected mid-game, keep the current
  phase rendered; just add the badge. The CRDT state is still local
  and usable.

- [ ] **Step 3: Manual test**

  In devtools, throttle network to Offline for 5 seconds, then back.
  Confirm the badge appears, then disappears once reconnected, and
  no in-flight state is lost.

- [ ] **Step 4: Commit**

  ```
  [feat] Show a reconnecting badge when Yorkie loses the watch stream
  ```

## Task 4: Error states

**Files:**
- Modify: `src/Room.tsx`, `src/App.tsx`

Three error surfaces to harden:

- [ ] **Step 1: Missing API key** — already shown; double-check it
  works after env changes (lint + manual).

- [ ] **Step 2: Document attach error** — render a friendlier
  message + a "Back to lobby" link instead of just `Error: <raw>`.

- [ ] **Step 3: Invalid room code** — characters outside the
  alphabet currently get stripped by `normalizeRoomCode`, but an
  empty result should fall back to the lobby with a hint, not a
  blank room.

- [ ] **Step 4: Manual test + commit**

  ```
  [fix] Harden the error states around room attach and bad codes
  ```

## Task 5: Performance audit

**Files:**
- Modify: `vite.config.ts` — manual chunks
- Possibly split `@yorkie-js/sdk` into its own chunk so the lobby
  doesn't drag it in for the join screen

The build today emits a single 545 kB JS bundle; Vite explicitly
warns about it. The lobby screen loads instantly anyway, but the
warning is a release blocker for an "is this audit-ready?" check.

- [ ] **Step 1: Configure manual chunks**

  In `vite.config.ts`, split the Yorkie SDK and React into separate
  chunks via `build.rollupOptions.output.manualChunks`.

- [ ] **Step 2: Re-run `pnpm build`**

  Confirm no chunk exceeds 300 kB.

- [ ] **Step 3: Lighthouse pass**

  Run a Lighthouse audit on `pnpm preview`. Target ≥ 90 on
  Performance and Accessibility. Note any deferred items in a
  lesson.

- [ ] **Step 4: Commit**

  ```
  [feat] Code-split the bundle so Yorkie + React load on their own
  ```

## Task 6: Accessibility pass

**Files:**
- Touch every component for: focusable buttons (already true),
  visible focus rings (probably need a CSS rule), `aria-label` on
  the language select and canvas surface, keyboard nav between
  phase screens.

- [ ] **Step 1: Add `:focus-visible` styles** to buttons and selects
  in `src/index.css`.

- [ ] **Step 2: Label the canvas** with `aria-label` describing the
  current drawer + turn.

- [ ] **Step 3: Verify tab order** through Lobby, In-room lobby,
  Voting, Reveal, Guessing, RoundEnd, Finished. Document any
  surprises in a lesson.

- [ ] **Step 4: Commit**

  ```
  [feat] Improve keyboard navigation and ARIA labels
  ```

## Task 7: Browser compat matrix

- [ ] **Step 1: Manual test on**: Chrome (desktop, mobile), Safari
  (desktop, iOS), Firefox (desktop), Samsung Internet (Android).

- [ ] **Step 2: For each**: lobby render, room join, canvas draw,
  voting, reveal, host actions.

- [ ] **Step 3: File `[fix]` commits per browser issue found**, or
  document `won't-fix` cases in
  `docs/lessons/<date>-browser-compat.md`.

## Task 8: CI

**Files:**
- New: `.github/workflows/ci.yml`

- [ ] **Step 1: Workflow that runs `pnpm install && pnpm lint && pnpm build`**
  on `pull_request` and `push` to `main`. Use the pnpm action and
  Node 22 LTS.

- [ ] **Step 2: Block merges on CI failure** in the repo settings.
  (Settings change, not a code change — note it in a lesson so
  someone re-creating the repo knows.)

- [ ] **Step 3: Commit**

  ```
  [feat] Add CI workflow that lints and builds on every PR
  ```

## Task 9: Deployment

**Files:**
- New: `vercel.json` (only if needed — Vercel auto-detects Vite)
- Environment variables in the Vercel dashboard

- [ ] **Step 1: Connect the GitHub repo to Vercel**

  Production branch = `main`. Preview deploys on every PR (default).

- [ ] **Step 2: Set `VITE_YORKIE_API_KEY` and `VITE_YORKIE_API_ADDR`**

  In Vercel project settings → Environment Variables. Mark them
  Production + Preview.

- [ ] **Step 3: First production deploy**

  Push or trigger a deploy. Confirm the URL serves the lobby. Open
  in two real browser windows and finish a game.

- [ ] **Step 4: Custom domain (optional for v1.0)**

  Point a CNAME, verify SSL via Vercel.

- [ ] **Step 5: Commit any config files**

  ```
  [feat] Wire Vercel deployment + production env vars
  ```

  (If only Vercel dashboard settings changed and no repo files
  moved, skip the commit and capture the steps in a lesson so the
  setup is reproducible.)

## Task 10: Project hygiene

- [ ] **Step 1: `LICENSE`** — MIT or Apache 2.0 are reasonable
  defaults for an open-source game built on top of Apache-2.0
  Yorkie. MIT for permissiveness, Apache for explicit patent grant.
  Pick one, commit the file.

- [ ] **Step 2: `CONTRIBUTING.md`** — a short page covering: pnpm
  install, dev server, the commit-message format (link CLAUDE.md
  for the full rule), the task-plan workflow, the lessons pairing.

- [ ] **Step 3: `CODE_OF_CONDUCT.md`** — Contributor Covenant 2.1
  is the standard. Drop in, fill the contact line.

- [ ] **Step 4: Commit**

  ```
  [feat] Add LICENSE, CONTRIBUTING, and CODE_OF_CONDUCT
  ```

## Task 11: Public README pass

**Files:**
- Modify: `README.md`

The current README is internal-team-flavored. Make it new-visitor-
friendly.

- [ ] **Step 1: Top section** — one-line pitch + a screenshot or GIF
  + the production URL.

- [ ] **Step 2: "How to play"** — 6–8 bullets covering rooms,
  keyword/liar mechanic, voting, scoring.

- [ ] **Step 3: "Run locally"** — keep the existing setup
  instructions.

- [ ] **Step 4: "Translating"** — point at
  `src/i18n/lang/en.ts` as the template; one paragraph.

- [ ] **Step 5: "Contributing"** — link `CONTRIBUTING.md`.

- [ ] **Step 6: Commit**

  ```
  [feat] Rewrite README for a public audience
  ```

## Task 12: Beta + v1.0 cut

- [ ] **Step 1: Internal beta** — invite 2–3 groups to play. Collect
  feedback in `docs/lessons/<date>-beta-feedback.md`.

- [ ] **Step 2: Triage** — file `[fix]` commits for anything that
  was actually broken; punt feature requests to a Post-v1.0 task
  doc.

- [ ] **Step 3: `CHANGELOG.md`** — a single v1.0.0 section
  summarising the phases (MVP, i18n, quality pass, release prep).

- [ ] **Step 4: Tag and release**

  ```sh
  git tag v1.0.0 -m "drawing-liar-game v1.0.0"
  git push --tags
  gh release create v1.0.0 --notes-file CHANGELOG.md
  ```

- [ ] **Step 5: Announce** — short post somewhere appropriate
  (yorkie-team blog, Threads, Mastodon, etc.).

- [ ] **Step 6: Archive this plan**

  ```sh
  git mv docs/tasks/active/20260604-v1-release-todo.md docs/tasks/archive/
  ```

  Create paired lessons file
  `docs/lessons/20260604-v1-release.md` capturing anything
  surprising about going from MVP to public release.

- [ ] **Step 7: Final commit**

  ```
  [feat] drawing-liar-game v1.0.0 — first public release
  ```

---

## Out-of-scope (push to Post-v1.0)

- Server-side keyword secrecy
- Persistent rooms / saved history
- Replay / share screenshot
- Themed deck marketplace
- Per-game configurable scoring / team modes

## Self-Review checklist

- **Independent tasks** — Tasks 1, 2, 3, 4 ship independently in any
  order. Task 5 (perf) and Task 6 (a11y) can interleave with 1–4.
  Task 7 (compat) runs after the previous tasks have landed. Tasks
  8–11 are infrastructure — order doesn't matter. Task 12 is the
  cutover and must come last.
- **No phantom files** — every "Create" file is introduced exactly
  once.
- **Translation parity** — every new UI string lands in both
  `en.ts` and `ko.ts` in the same commit; TS enforces.
- **Reversibility** — none of the dev tasks involve destructive ops
  on shared infra. The release tag is the only non-reversible step;
  do it last and confirm everything else is green.
