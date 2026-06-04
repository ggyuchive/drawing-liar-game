# Quality Pass Implementation Plan

> **For agentic workers:** Phase 3 of the
> [roadmap](../../design/roadmap.md). Steps use checkbox (`- [ ]`)
> syntax. Each task ends with a single commit using the project's
> `[feat]` / `[fix]` convention.

**Goal:** Turn the MVP from "the loop works" into "friends play this
on a Friday night without complaints."

**Specs:**
- [`docs/design/roadmap.md`](../../design/roadmap.md) §
  "Phase 3 — Quality pass"
- [`docs/design/rules-v1.md`](../../design/rules-v1.md) — the brush
  quota, chat, always-guess, and 2×2 scoring that Tasks 1–3 below
  implement.

**Tech Stack:** unchanged — React 19, Vite, TypeScript,
`@yorkie-js/sdk`, `@yorkie-js/react`, HTML5 Canvas, pnpm.

**Source-of-truth files likely to be touched:**
- `src/types.ts` — brush quota fields on Round + GameConfig, chat
  message type
- `src/Canvas.tsx` — quota meter, ignore-input-when-empty, real-time
  meter render
- `src/Room.tsx` — always-guess transition, scoring write, chat
  reset on play-again
- `src/game/state.ts` — `applyScores` becomes 2×2
- `src/game/RoundHud.tsx` — meter placement, scoring outcome strings
- `src/game/Voting.tsx`, `Reveal.tsx`, `Guessing.tsx` — flow tweaks
- new: `src/game/Chat.tsx`, `src/game/BrushMeter.tsx`,
  `src/game/TurnTimer.tsx`
- `src/i18n/lang/{en,ko}.ts`, `src/i18n/types.ts` — strings for the
  new controls

---

## Pre-flight

- [ ] **Confirm starting state**

  Run: `git log --oneline | head -3` and confirm the roadmap commit
  is on top. Working tree clean.

- [ ] **Read the rules spec**

  [`docs/design/rules-v1.md`](../../design/rules-v1.md) is the
  authoritative WHAT/WHY for Tasks 1–3. Don't deviate without
  updating that doc first.

---

## Task 1: Brush quota with real-time meter

**Files:**
- Modify: `src/types.ts` — add `brushBudgetPx` to `GameConfig`
  (default `1500`); add `brushBudgetPx` (frozen at round start) and
  `brushUsedPx` (resets each turn) to `Round`.
- Modify: `src/Canvas.tsx` — accumulate `brushUsedPx` on
  pointerMove; auto-end stroke + turn when budget hits 0.
- New: `src/game/BrushMeter.tsx` — derives % from `round.brushUsedPx
  / round.brushBudgetPx`, renders bar.
- Modify: `src/game/RoundHud.tsx` — slot the meter in (or render it
  separately in the drawing phase wrapper in `Room.tsx`).
- Modify: `src/i18n/lang/{en,ko}.ts`, `src/i18n/types.ts` — strings
  for the meter label and "out of brush" state.

The meter must be visible to *every* peer, not just the drawer.
Reading from the document (not from local pointer state) is how we
make sure observers see the same depletion as the drawer.

- [ ] **Step 1: Schema additions** — `Round.brushBudgetPx`,
  `Round.brushUsedPx`, `GameConfig.brushBudgetPx` with `1500`
  default. Update `emptyRound()` and `initialGame()` accordingly.

- [ ] **Step 2: Round-start propagation**

  In Room.tsx's `onStart` and `onNext`, copy
  `r.game.config.brushBudgetPx` into `r.game.round.brushBudgetPx`
  so a mid-round config change can't shrink the budget under
  someone's feet. `brushUsedPx` starts at `0`.

- [ ] **Step 3: Per-turn reset**

  In the `onStrokeEnd` handler in `Room.tsx`, when rotating
  `turnIndex` (or transitioning to `voting`), also reset
  `r.game.round.brushUsedPx = 0`.

- [ ] **Step 4: Consume on pointerMove**

  In `Canvas.tsx`, in `handlePointerMove`, after the existing
  threshold check, accumulate `Math.hypot(dx, dy)` into a local
  `runningPx` and write `brushUsedPx` to the document on the same
  update that appends the point. (Coupling write + point write into
  one `update()` keeps the meter and the stroke in lockstep on
  observers.)

- [ ] **Step 5: Empty-budget cutoff**

  Before pushing a point, check `root.game.round.brushUsedPx >=
  brushBudgetPx`. If so:
  - Release pointer capture.
  - Clear the local `drawingRef`.
  - Fire `onStrokeEnd` (turn advances or phase transitions).

- [ ] **Step 6: Meter component**

  `src/game/BrushMeter.tsx`:

  ```tsx
  const pct = Math.max(
    0,
    1 - round.brushUsedPx / round.brushBudgetPx,
  );
  ```

  Render a bar whose width is `pct * 100%`. Colour shifts
  accent → warning → danger as `pct` drops below 0.5 and 0.2.

- [ ] **Step 7: Slot into the drawing screen**

  In Room.tsx's `'drawing'` case, render BrushMeter between the
  RoundHud and the Canvas.

- [ ] **Step 8: Translations**

  `t.canvas.brushMeter` (or similar) in both locale files. TS
  enforces parity.

- [ ] **Step 9: Manual test**

  Three tabs. Drawer drags a long line. Confirm:
  - All three tabs show the meter draining in sync.
  - When the meter hits 0 on the drawer's tab, the turn advances
    on all tabs simultaneously.
  - Quick taps consume small amounts; one big arc can fully
    deplete in a single stroke.

- [ ] **Step 10: Commit**

  ```
  [feat] Replace one-continuous-stroke with a real-time brush quota
  ```

## Task 2: Turn timer (10 s default, auto-advance)

**Files:**
- Modify: `src/types.ts` — `Round.turnStartedAt: number`;
  `GameConfig.turnTimeMs: number` with `10_000` default. Update
  `emptyRound()` and `initialGame()` accordingly.
- Modify: `src/Room.tsx` — write `turnStartedAt = Date.now()` on
  every turn handover (including round start); wire the deadline
  auto-advance.
- New: `src/game/TurnTimer.tsx` — countdown chip, derives remaining
  ms from `round.turnStartedAt` and `config.turnTimeMs`.
- Modify: `src/i18n/lang/{en,ko}.ts`, `src/i18n/types.ts` — timer
  label + the "time's up" feedback message.

The timer composes with the brush quota — whichever empties first
ends the turn. Wall-clock starts on turn handover, not pointer-down.

- [ ] **Step 1: Schema additions**

  Add `turnStartedAt: number` to `Round` (default `0` in
  `emptyRound()`). Add `turnTimeMs: number` to `GameConfig` with
  `10_000` default in `initialGame()`.

- [ ] **Step 2: Anchor on every handover**

  - In `Room.tsx`'s `onStart` (round 1) and `onNext` (subsequent),
    set `r.game.round.turnStartedAt = Date.now()`.
  - In the `onStrokeEnd` handler (and the brush-empty cutoff from
    Task 1), when rotating `turnIndex`, also write
    `r.game.round.turnStartedAt = Date.now()`.

- [ ] **Step 3: Countdown component**

  `src/game/TurnTimer.tsx`:

  ```tsx
  const remaining = Math.max(
    0,
    round.turnStartedAt + config.turnTimeMs - Date.now(),
  );
  ```

  Re-tick via `requestAnimationFrame` or a 100 ms `setInterval`
  (animation frame is smoother; the interval is cheaper). Render
  as `⏱ 0:0X` plus colour classes:
  - default ≤ X ≤ `turnTimeMs`
  - warning when `remaining ≤ 5000`
  - danger + pulse when `remaining ≤ 3000`

- [ ] **Step 4: Deadline auto-advance**

  In Room.tsx, run a `useEffect` keyed on `(turnStartedAt,
  turnTimeMs, phase, drawerId, myActorID, presences, hostId)`:

  ```ts
  useEffect(() => {
    if (root.game.phase !== 'drawing') return;
    const deadline = round.turnStartedAt + config.turnTimeMs;
    const drawerPresent = presences.some(
      (p) => p.clientID === drawerId,
    );
    const grace = drawerPresent ? 0 : 1500;
    const fireAt = deadline + grace;
    const wait = fireAt - Date.now();
    if (wait <= 0) {
      tryAdvance();
      return;
    }
    const t = setTimeout(tryAdvance, wait);
    return () => clearTimeout(t);
  }, [round.turnStartedAt, config.turnTimeMs, ...]);
  ```

  `tryAdvance` runs the same `update()` body as
  `onStrokeEnd`'s "turn complete" branch (release the in-flight
  stroke if any, increment `strokesDone`, rotate `turnIndex` or
  go to `voting`, reset `brushUsedPx` and `turnStartedAt`).

  Gate the write: only the drawer's own client writes if they
  hold the drawer's actorID; if they're absent, only the host
  writes. Both clients can race safely (Step "concurrent
  double-writes" in the design doc) but the gate avoids
  unnecessary doc traffic from spectators.

- [ ] **Step 5: End-of-stroke also fires within the timer**

  Audit `handlePointerUp` and the brush-cutoff path in
  `Canvas.tsx` to confirm they call `onStrokeEnd` even when the
  deadline-`useEffect` *also* would have fired. Idempotent writes
  on the same target state are safe; redundancy here protects
  against flaky pointer events on mobile.

- [ ] **Step 6: Slot the countdown into the drawing screen**

  Render `<TurnTimer>` alongside `<BrushMeter>` above the canvas.

- [ ] **Step 7: Translations**

  `t.canvas.turnTimer`, `t.canvas.timeUp` (or similar) in both
  locales. TS enforces parity.

- [ ] **Step 8: Manual test**

  Three tabs. Confirm:
  - On a fresh turn the countdown starts at 10 s on every tab and
    ticks in sync (within ~200 ms).
  - At ≤ 5 s and ≤ 3 s the colour shifts and pulse trigger.
  - If the drawer does nothing for 10 s, the turn advances on
    every tab without their input.
  - If the drawer is mid-stroke at deadline, the stroke ends and
    the turn rotates.
  - Close the drawer's tab mid-turn; the host's tab fires the
    advance ~1.5 s after the deadline.

- [ ] **Step 9: Commit**

  ```
  [feat] Cap every drawing turn at a 10s wall-clock auto-advance
  ```

## Task 3: Room chat

**Files:**
- Modify: `src/types.ts` — `ChatMessage`, `CanvasDoc.chat`
- Modify: `src/Room.tsx` — `initialRoot` includes `chat: []`;
  clear on `Play again`; cap to last 200 messages on send
- New: `src/game/Chat.tsx`
- Modify: `src/types.ts` — extend `CanvasPresence` with
  `typing: boolean`
- Modify: `src/i18n/lang/{en,ko}.ts`, `src/i18n/types.ts` — chat
  strings

Right-side panel (collapsible on narrow viewports), visible in
every phase. Plain text only.

- [ ] **Step 1: Schema**

  ```ts
  type ChatMessage = {
    id: string;
    authorId: string;
    text: string;
    at: number;
  };
  ```

  Add `chat: Array<ChatMessage>` to `CanvasDoc`. Seed
  `initialRoot.chat = []`.

  Extend `CanvasPresence` with `typing: boolean` (default false).

- [ ] **Step 2: Chat component**

  `src/game/Chat.tsx` reads `root.chat` and `presences`. Renders:
  - Scrolling list of messages, newest at the bottom, author name
    coloured by the author's presence colour.
  - Single-line input + Enter to send.
  - "<name> is typing…" indicator derived from presences with
    `typing === true` and not local.

- [ ] **Step 3: Send + cap**

  On send, append a `ChatMessage` to `root.chat`. If
  `root.chat.length > 200`, delete from index 0 until the cap
  holds. (CRDT array supports `delete?.(0)` — pattern matches the
  stroke wipe.)

- [ ] **Step 4: Typing presence**

  On input change, set `presence.typing = true` and start a 1s
  debounce that flips it back to false. Suppress the write when
  the local actor is the liar AND `phase === 'guessing'`
  (per rules-v1).

- [ ] **Step 5: Clear on Play Again**

  In Room.tsx's `onPlayAgain`, drain `root.chat` alongside the
  strokes drain.

- [ ] **Step 6: Layout integration**

  Wrap the existing `<main>` content + the chat panel in a
  responsive flex/grid: main left, chat right on wide viewports;
  chat collapses to a toggle on narrow viewports.

- [ ] **Step 7: Translations**

  `t.chat.placeholder`, `t.chat.send`, `t.chat.typing(name)`,
  `t.chat.collapsedToggle` — in both locale files.

- [ ] **Step 8: Manual test**

  3 tabs. Type into one — confirm the other two see "is typing…"
  while the third is mid-message, then the message itself when
  Enter is pressed. Confirm liar's typing indicator is hidden in
  the guessing phase.

- [ ] **Step 9: Commit**

  ```
  [feat] Add in-room chat with typing indicators
  ```

## Task 4: Always-guess flow + 2×2 scoring

**Files:**
- Modify: `src/game/state.ts` — `applyScores` becomes 2×2
- Modify: `src/Room.tsx` — `reveal → guessing` is unconditional
- Modify: `src/game/Reveal.tsx`, `Guessing.tsx`, `RoundEnd.tsx`,
  i18n strings

The phase machine changes one edge: `reveal` always advances to
`guessing`. The liar always types a guess. The four outcome cells
(caught × guessed) drive `applyScores`. See
[`rules-v1.md`](../../design/rules-v1.md) § "Scoring — finalised
2×2" for the values.

- [ ] **Step 1: Update `applyScores`**

  Replace the `Outcome` union with explicit axes:

  ```ts
  export type ScoreOutcome = {
    caught: boolean;
    guessed: boolean;
  };

  export function applyScores(
    outcome: ScoreOutcome,
    playerOrder: ReadonlyArray<string>,
    liarId: string,
    scores: Record<string, number>,
  ): Record<string, number> {
    // table from rules-v1.md
  }
  ```

  Old `Outcome` union deletable in the same commit — all callers
  updated below.

- [ ] **Step 2: Reveal → guessing (no branching)**

  In `Room.tsx`'s `'reveal'` case, `onContinue` always sets phase
  to `guessing`, regardless of `wasLiarCaught`. Drop the
  `wasLiarCaught` argument from the `onContinue` signature.

  In `Reveal.tsx`, the host's button text is a single localised
  string (e.g. "Continue") in both caught and not-caught cases.
  The "caught / not caught" verdict text above the button is
  still distinct.

- [ ] **Step 3: Liar always types**

  In `Room.tsx`'s `'guessing'` case, `onSubmit` no longer assumes
  the liar was caught. Read the `caught` axis from the round's
  tallied votes (recompute with `tallyVotes(r.game.round.votes)`
  at submit time) and pass `{caught, guessed}` to `applyScores`.

  Persist `wasCaught` on the round (new field) so RoundEnd can
  render the correct outcome sentence later without re-tallying.

  ```ts
  // in src/types.ts
  type Round = {
    // ...
    wasCaught: boolean;  // populated at scoring time
  };
  ```

- [ ] **Step 4: RoundEnd outcome text — four variants**

  In `src/i18n/types.ts`, replace the existing three outcome
  function signatures with four:

  ```ts
  outcomeCaughtGuessed: (liar, keyword) => string;
  outcomeCaughtBlanked: (liar, guess, keyword) => string;
  outcomeEscapedGuessed: (liar, keyword) => string;
  outcomeEscapedBlanked: (liar, guess, keyword) => string;
  ```

  Fill all four in both `en.ts` and `ko.ts`. The exact phrasing is
  in [`rules-v1.md`](../../design/rules-v1.md) §
  "Scoring — finalised 2×2" "Vibe" column — adapt for tone.

- [ ] **Step 5: RoundEnd renderer**

  Pick the function to call by `(round.wasCaught, round.guessCorrect)`.
  Pass `liarName`, `round.liarGuess`, `round.keyword` as needed.

- [ ] **Step 6: Manual test**

  Run four games with each combination forced:
  - vote on the actual liar + correct guess → +1 / +1
  - vote on the actual liar + wrong guess → 0 / +2
  - vote on someone else + correct guess → +3 / 0
  - vote on someone else + wrong guess → +2 / +1

  Confirm scoreboard matches each line.

- [ ] **Step 7: Commit**

  ```
  [feat] Always let the liar guess and resolve via the 2x2 table
  ```

## Task 5: Drawing colour picker (no brush size)

**Files:**
- Modify: `src/Canvas.tsx` — palette of 5–7 swatches, visible only
  on the drawer's own turn
- Modify: `src/i18n/lang/{en,ko}.ts`, `src/i18n/types.ts`

Keep this orthogonal to brush quota: colour is a stroke property
(visual width is fixed). Brush quota replaces the "size" concept.

- [ ] **Step 1: Local state in Canvas** — `currentColor` defaults
  to presence color, can be picked from a fixed palette while
  drawing.

- [ ] **Step 2: Use chosen color on pointerDown** — write to the
  stroke push.

- [ ] **Step 3: Translations + manual test + commit**

  ```
  [feat] Let the drawer pick a stroke color
  ```

## Task 6: Host-only Clear Board during drawing

**Files:**
- Modify: `src/Canvas.tsx` (toolbar)
- Modify: `src/Room.tsx` (handler)

Restore a Clear Board, host-only, with one-step confirmation. Useful
when an early stroke ruins the prompt — and now also resets
`brushUsedPx` and `turnIndex` to 0 so the round restarts cleanly.

- [ ] **Step 1: Render only when `isHost && phase === 'drawing'`**

- [ ] **Step 2: Inline "are you sure?" confirm**

- [ ] **Step 3: Wipe strokes + reset `strokesDone`, `turnIndex`,
  `brushUsedPx` to 0 and `turnStartedAt` to `Date.now()`** so the
  fresh canvas also starts the timer from full. Keep keyword,
  liar, playerOrder, scores.

- [ ] **Step 4: Translations + manual test + commit**

  ```
  [feat] Let the host reset the canvas mid-round
  ```

## Task 7: Keyword decks

**Files:**
- Modify: `src/i18n/types.ts` — `keywords` becomes
  `Record<deckName, string[]>`
- Modify: `src/i18n/lang/{en,ko}.ts` — split current list into 2–3
  decks each
- Modify: `src/i18n/hooks.ts` — `pickKeyword(code, deck)`
- Modify: `src/game/InRoomLobby.tsx` — deck selector under the
  language dropdown
- Modify: `src/types.ts` — `GameConfig.keywordDeck: string`

Unchanged from the previous plan revision; see steps below.

- [ ] **Step 1: Refactor the Locale shape** — `keywords:
  Record<string, string[]>`. Default key per language is
  `general` (existing list). Add 1–2 curated alt decks per
  language.

- [ ] **Step 2: `pickKeyword(code, deck)`** — fall back to the
  first available deck if the requested one is missing.

- [ ] **Step 3: Deck selector in the in-room lobby**

- [ ] **Step 4: Round-start uses the configured deck**

- [ ] **Step 5: Manual test + commit**

  ```
  [feat] Split keywords into selectable decks per language
  ```

## Task 8: Mobile layout sweep

**Files:**
- Modify: `src/App.css`
- Possibly: `src/Canvas.tsx` (touch tuning if needed)

Run on iOS Safari and Android Chrome via local network or ngrok.
Fix what's clearly broken in portrait — especially the chat panel
collapse from Task 2.

- [ ] **Step 1: Test the lobby on a phone**

- [ ] **Step 2: Test the canvas drawing + brush meter + turn
  timer visibility** (and confirm the timer pulse animation
  doesn't jank on lower-end phones)

- [ ] **Step 3: Test the voting / reveal / guessing / scoreboard
  screens**

- [ ] **Step 4: Test the chat panel collapse**

- [ ] **Step 5: Capture a lesson**

  `docs/lessons/<date>-mobile-layout.md` for anything surprising
  (or "no surprises").

- [ ] **Step 6: Commit**

  ```
  [fix] Improve layout on narrow viewports
  ```

## Task 9: Lint, build, archive

- [ ] **Step 1: `pnpm lint && pnpm build`** — must pass (the
  pre-commit hook already gates this on each step).

- [ ] **Step 2: Archive this plan**

  ```sh
  git mv docs/tasks/active/20260604-quality-pass-todo.md docs/tasks/archive/
  ```

- [ ] **Step 3: Write the paired lessons file**

  `docs/lessons/20260604-quality-pass.md` — capture anything
  surprising. If nothing was: `> No surprises.`

- [ ] **Step 4: Update README "Status" if anything material
  changed** — Brush quota, turn timer, and chat are all
  user-visible features worth mentioning.

- [ ] **Step 5: Final commit**

  ```
  [feat] Wrap up the quality pass
  ```

---

## Explicitly NOT in this plan

- **Undo while drawing.** Rules-v1 forbids it — brush quota plus
  no-takebacks is the tension. Do not add an undo button.
- **Brush size selector.** v1.0 ships a single width for fairness
  of the meter math. Revisit post-v1.0.
- **Reactions / emoji bar.** Chat replaces the "small signal"
  niche. If a beta group asks for emoji shortcuts in chat, that's
  a v1.1 thing.
- **Host promotion / late-join spectator.** Both in the
  [v1 release plan](20260604-v1-release-todo.md) Tasks 1–2.
- **Server-side keyword secrecy.** Post-v1.0.

## Self-Review checklist

- **Spec coverage**: Rules-v1 sections (brush, turn timer, chat,
  always-guess, scoring) each map to a task (1, 2, 3, 4). The
  "real-time visibility" rule is preserved by Task 1's Step 4
  (writing the point + meter together), Task 2's Step 3 (shared
  `turnStartedAt` anchor), and the manual tests in both. The "no
  undo" rule is preserved by not introducing one.
- **Each task ships independently** — Tasks 1, 2, 3, 4 each land
  on their own. Task 6 (Clear Board) reads `turnStartedAt` so it
  should land *after* Task 2; the cross-ref is noted in Task 6's
  Step 3.
- **Translation parity** — every UI string addition lands in both
  `en.ts` and `ko.ts` in the same commit, enforced by the
  `Locale` type.
- **No phantom files** — every "Modify" target exists today;
  every "Create" target is introduced exactly once.
