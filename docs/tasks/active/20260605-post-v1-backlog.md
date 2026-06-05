# Post-v1.0 Backlog

> **What this is:** the organized "what's next" list, turning the
> roadmap's [Post-v1.0 directions](../../design/roadmap.md#post-v10--directions-not-commitments)
> plus items deferred during the MVP / quality / release passes into
> scoped, sized candidates. **Nothing here is committed work.** When an
> item is picked up it graduates into its own
> `docs/tasks/active/YYYYMMDD-<slug>-todo.md` plan (and an eventual
> paired lesson on archive).

Sizes are rough: **S** ≈ an afternoon, **M** ≈ a few days, **L** ≈ a
backend or a multi-part effort. "Needs backend" = cannot ship under
the current frontend-only / trust-the-client model.

---

## Tier 1 — Integrity (the real gaps)

The current model trusts every client. These close the holes that a
curious or malicious player can exploit.

- **Server-side keyword secrecy** — *L, needs backend.* A small
  service holds the round's keyword and serves it only to non-liars,
  so it can't be read from the Yorkie document. This is the single
  biggest integrity gap: today any joiner can read
  `root.game.round.keyword`. Likely unlocks the rest of Tier 1.
- **Private / lockable rooms** — *M (best-effort) / L (true).*
  Host "lock" that refuses to seat new joiners is best-effort on the
  client (anyone can still attach to the doc). True enforcement needs
  the same backend gate as keyword secrecy.
- **Anti-grief basics** — *M.* Host can kick/mute; rate-limit chat.
  Partly client-side, fully robust with a backend.

## Tier 2 — Content & retention

- **Themed keyword packs** — *S–M.* Movies, K-Pop, sports, board
  games. The deck system already exists (`i18n/lang/*` `keywords`);
  this is mostly authoring + a slightly richer deck picker.
- **More languages** — *S each.* Drop-in `src/i18n/lang/<code>.ts`;
  the glob auto-registers. Good first contribution for outsiders.
- **Persistent rooms / history** — *L, needs backend or storage.*
  "We played yesterday, continue the rivalry." Requires durable
  storage of past games per room.

## Tier 3 — Social & share

- **Share the final round** — *M.* Export the finished drawing +
  keyword + outcome as an image to share. Pure client (canvas export).
- **Emoji reactions in chat** — *S.* Deferred from the quality pass;
  revisit if beta asks. Chat already exists.
- **Spectator-only join** — *S.* An explicit "watch, don't play"
  choice at join (today you spectate only if you arrive mid-round).

## Tier 4 — Gameplay depth

- **Configurable scoring / team modes / tournaments** — *M–L.* The
  2×2 table is one constant block (`game/state.ts`); team and
  tournament modes are larger.
- **Brush size selector** — *S.* Explicitly cut from v1 (kept the
  meter math simple). Only if players ask.
- **~~Undo while drawing~~** — *won't do.* Rules-v1 forbids it on
  purpose; the brush quota + no-takebacks is the tension. Re-open only
  with a rules change.

## Tier 5 — Quality & ops

- **Component / timer-level tests** — *M.* The current CI suite is
  pure-logic + a multi-user simulation; it does **not** exercise the
  React effect timing (e.g. the auto-advance firing) or Yorkie sync.
  Adding jsdom + fake timers + a Yorkie mock would close that gap.
- **Real-device browser matrix + Lighthouse** — *S, manual.* The
  v1 release plan's manual follow-ups; fold results into
  `docs/lessons/`.
- **Telemetry / analytics** — *S–M.* Basic, privacy-respecting room
  and session counts to know if anyone actually plays.

---

## Suggested first step

**Decide the backend question.** Tier 1 (keyword secrecy, private
rooms, persistence) all hinge on introducing a small server. If the
project wants real integrity, that backend is the next design doc and
unlocks the most. If it stays a casual frontend-only party game, skip
to Tier 2–3 (packs, share, reactions) for the best effort/value ratio.
This fork should be settled before writing the next `-todo` plan.
