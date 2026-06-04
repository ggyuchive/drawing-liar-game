# MVP Game Flow Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for
> tracking. Work top to bottom; do not skip ahead. Each task ends with
> a commit using the project's `[init] / [feat] / [fix]` prefix
> convention (≤70 chars, subject + body explaining *why*).

**Goal:** Bring `drawing-liar-game` from "shared whiteboard" to "two or more
players can complete a full game (multiple rounds, voting, reveal,
scoring) and see a final ranking."

**Spec:** [`docs/design/mvp-architecture.md`](../../design/mvp-architecture.md)

**Tech Stack:** React 19, Vite, TypeScript, `@yorkie-js/sdk`,
`@yorkie-js/react`, HTML5 Canvas. pnpm.

**Source-of-truth files to be touched:**
- `src/types.ts` — extend with `Game`, `Phase`, `Round`
- `src/Room.tsx` — switch on `phase` to pick which screen renders
- `src/Canvas.tsx` — enforce turn guard, advance turn on pointer-up
- `src/data/keywords.ts` *(new)* — static keyword bank
- `src/game/state.ts` *(new)* — pure helpers: `pickKeyword`,
  `assignLiar`, `shuffleOrder`, `tallyVotes`, `applyScores`
- `src/game/<Phase>.tsx` *(new, several)* — per-phase screens

**Up-front terminology:**
- *actorID* — the Yorkie-assigned identity for a connected client. Use
  this as the player ID throughout. `useDocument().doc!.getChangeID()
  .getActorID()` exposes it locally; presences carry it as `clientID`.
- *host* — the first actorID in the room (frozen into `game.hostId`).
- *drawer* — `playerOrder[turnIndex]` during the `drawing` phase.

---

## Pre-flight

- [ ] **Confirm starting state**

  Run: `git log --oneline | head -3`
  Expected: top commit is `[init] drawing-liar-game project`. Working tree
  clean.

- [ ] **Confirm dev server runs**

  Run: `pnpm dev` and open the printed URL.
  Expected: lobby renders. After entering a name + creating a game,
  the canvas screen appears (assuming `VITE_YORKIE_API_KEY` is set).

  If the API key is missing, stop here and set it before continuing.

---

## Task 1: Extend the document schema with game state

**Files:**
- Modify: `src/types.ts`
- Modify: `src/Room.tsx` (`initialRoot` of `DocumentProvider`)

The Yorkie root currently holds only `strokes`. Add a `game` object
matching the schema in the design doc, and seed sensible defaults so
brand-new rooms start in the `lobby` phase.

- [ ] **Step 1: Add types to `src/types.ts`**

  Add (alongside the existing `Stroke`, `Point`, `CanvasPresence`):

  ```ts
  export type Phase =
    | 'lobby'
    | 'drawing'
    | 'voting'
    | 'reveal'
    | 'guessing'
    | 'roundEnd'
    | 'finished';

  export type GameConfig = {
    totalRounds: number;
    turnsPerPlayer: number;
  };

  export type Round = {
    index: number;
    keyword: string;
    liarId: string;
    playerOrder: Array<string>;
    turnIndex: number;
    strokesThisTurn: number;
    votes: Record<string, string>;
    liarGuess: string;
    guessCorrect: boolean;
  };

  export type Game = {
    phase: Phase;
    hostId: string;
    config: GameConfig;
    round: Round;
    scores: Record<string, number>;
  };
  ```

- [ ] **Step 2: Add a default factory**

  In the same file, export:

  ```ts
  export const emptyRound = (): Round => ({
    index: 0,
    keyword: '',
    liarId: '',
    playerOrder: [],
    turnIndex: 0,
    strokesThisTurn: 0,
    votes: {},
    liarGuess: '',
    guessCorrect: false,
  });

  export const initialGame = (): Game => ({
    phase: 'lobby',
    hostId: '',
    config: { totalRounds: 3, turnsPerPlayer: 2 },
    round: emptyRound(),
    scores: {},
  });
  ```

- [ ] **Step 3: Wire it into `Room.tsx`**

  Update the `DocRoot` type to include `game: JSONObject<Game>` and the
  `initialRoot` to include `game: initialGame()`. The `useDocument`
  generic in `RoomInner` should also be widened.

- [ ] **Step 4: Build**

  Run: `pnpm build`
  Expected: succeeds with no type errors.

- [ ] **Step 5: Commit**

  ```
  [feat] Add game state schema to the room document

  The room document only carried strokes, which is enough for a
  shared whiteboard but not for a game. Adding the game object up
  front lets later tasks layer in phase transitions without
  reshaping the schema each time.
  ```

---

## Task 2: Host election + actorID helper

**Files:**
- Modify: `src/Room.tsx` (host election effect)
- Create: `src/game/useActorID.ts`

We need a stable per-client identifier to drive turn order and host
detection. Yorkie's actorID is the natural choice. The first attached
client writes its actorID into `game.hostId`.

- [ ] **Step 1: Expose actorID via a small hook**

  Create `src/game/useActorID.ts`:

  ```ts
  import { useDocument } from '@yorkie-js/react';

  export function useActorID(): string | null {
    const { doc } = useDocument();
    if (!doc) return null;
    return doc.getChangeID().getActorID();
  }
  ```

  Note: `getChangeID()` returns a `ChangeID` with `.getActorID()`. If
  the live SDK names this differently, adapt — but no other consumer
  in the codebase wires actorID today, so this is the single point of
  truth.

- [ ] **Step 2: Elect a host on first connect**

  In `RoomInner` (in `Room.tsx`), after the `loading` / `error`
  guards, add an effect that writes `game.hostId` if it's empty and
  the local actorID has joined:

  ```ts
  const myActorID = useActorID();

  useEffect(() => {
    if (!myActorID) return;
    if (root.game.hostId) return;
    update((root) => {
      if (!root.game.hostId) {
        root.game.hostId = myActorID;
      }
    });
  }, [myActorID, root.game.hostId, update]);
  ```

  The double-check inside `update` covers the race where two clients
  attempt the write at once — whichever lands first wins; the second
  no-ops.

- [ ] **Step 3: Smoke test**

  Open two browser tabs against the same room. Confirm in devtools
  (or via a temporary `console.log`) that both see the same `hostId`
  and it matches the first joiner's actorID.

- [ ] **Step 4: Commit**

  ```
  [feat] Elect the first joiner as the room host

  Phase transitions need a designated initiator. Picking the first
  actorID to attach avoids a UI prompt and gives a stable host for
  the rest of the session.
  ```

---

## Task 3: Keyword bank

**Files:**
- Create: `src/data/keywords.ts`

A static, bundled list of nouns. Keep it small for MVP — quality over
quantity — and avoid culturally specific entries.

- [ ] **Step 1: Create the file**

  ```ts
  export const KEYWORDS: ReadonlyArray<string> = [
    'apple', 'banana', 'cactus', 'castle', 'cloud', 'compass',
    'crown', 'dolphin', 'dragon', 'elephant', 'forest', 'glasses',
    'guitar', 'hat', 'island', 'jellyfish', 'kite', 'ladder',
    'lighthouse', 'mountain', 'mushroom', 'octopus', 'piano',
    'pineapple', 'pirate', 'pizza', 'planet', 'rainbow', 'robot',
    'rocket', 'sandwich', 'scissors', 'snowman', 'spaceship',
    'submarine', 'sunglasses', 'telescope', 'tornado', 'tree',
    'umbrella', 'unicorn', 'volcano', 'waterfall', 'windmill',
  ];

  export function pickKeyword(): string {
    return KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
  }
  ```

- [ ] **Step 2: Commit**

  ```
  [feat] Add a static keyword bank for round prompts

  MVP avoids a backend, so the keyword pool ships in the client
  bundle. The list is intentionally small and culturally neutral so
  every player can recognise every entry.
  ```

---

## Task 4: In-room lobby screen

**Files:**
- Create: `src/game/Lobby.tsx` *(in-room, not to be confused with
  the join lobby at `src/Lobby.tsx`)*
- Modify: `src/Room.tsx` to render it when `phase === 'lobby'`

A pre-game screen listing participants, showing the room code, and
giving the host a "Start game" button + simple config controls
(`totalRounds`, `turnsPerPlayer`).

- [ ] **Step 1: Build the screen**

  `src/game/Lobby.tsx` shows:
  - Roster from `presences`
  - Room code (already in the header)
  - For host only: number inputs for `totalRounds` and
    `turnsPerPlayer`, plus a "Start game" button (disabled until at
    least 3 players are present — the minimum that makes "spot the
    liar" meaningful)
  - For non-host: "Waiting for host to start…"

- [ ] **Step 2: Phase switch in `Room.tsx`**

  In `RoomInner`, replace `<Canvas .../>` with a switch on
  `root.game.phase`:

  ```tsx
  switch (root.game.phase) {
    case 'lobby':    return <InRoomLobby />;
    case 'drawing':  return <Canvas .../>;  // existing
    // others added in later tasks
    default:         return null;
  }
  ```

- [ ] **Step 3: Manual test**

  Open 3 tabs. Confirm host sees the button and non-hosts see the
  waiting message. Confirm the button is disabled with 1 or 2
  players, enabled with 3+.

- [ ] **Step 4: Commit**

  ```
  [feat] Show an in-room lobby with a host-only start button

  Players need a moment between joining and the round actually
  beginning, both to wait for friends and to let the host configure
  round count.
  ```

---

## Task 5: Round-start mechanics

**Files:**
- Create: `src/game/state.ts` — pure helpers
- Modify: `src/game/Lobby.tsx` — wire the start button

When the host clicks "Start game", pick a keyword, pick a liar,
freeze the player order, clear strokes, and move to `drawing`.

- [ ] **Step 1: Add helpers in `src/game/state.ts`**

  ```ts
  export function shuffle<T>(xs: ReadonlyArray<T>): Array<T> {
    const out = xs.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  ```

- [ ] **Step 2: Implement `startRound` as an updater**

  Inline in `Lobby.tsx`'s start-button handler:

  ```ts
  const start = () => {
    const order = shuffle(presences.map((p) => p.clientID));
    const liarId = order[Math.floor(Math.random() * order.length)];
    update((root) => {
      root.game.round = {
        index: 1,
        keyword: pickKeyword(),
        liarId,
        playerOrder: order,
        turnIndex: 0,
        strokesThisTurn: 0,
        votes: {},
        liarGuess: '',
        guessCorrect: false,
      };
      while (root.strokes.length > 0) root.strokes.delete?.(0);
      root.game.scores = Object.fromEntries(order.map((id) => [id, 0]));
      root.game.phase = 'drawing';
    });
  };
  ```

- [ ] **Step 3: Manual test**

  With 3 tabs open, click "Start game" in the host tab. Confirm
  every tab transitions to the drawing phase (canvas appears) and
  the strokes array is empty.

- [ ] **Step 4: Commit**

  ```
  [feat] Start a round when the host hits the button

  Freezes the player order, picks the keyword and the liar, and
  resets per-round state in one CRDT update so every client lands
  in 'drawing' with the same view.
  ```

---

## Task 6: Turn-aware canvas

**Files:**
- Modify: `src/Canvas.tsx`

Lock the canvas to the current drawer. After their `pointerUp`,
advance `turnIndex`. When the last turn ends, transition to
`voting`.

- [ ] **Step 1: Compute "is it my turn"**

  In `Canvas`, read `game.round.playerOrder[turnIndex]` and compare
  to local actorID. Gate `handlePointerDown` so non-drawers cannot
  start a stroke; visually mark the canvas with a different cursor
  / overlay text ("Waiting for X…").

- [ ] **Step 2: Enforce one stroke per turn**

  In `handlePointerDown`, also check `strokesThisTurn === 0`. In
  `handlePointerUp`, increment `strokesThisTurn` and either:
  - rotate turn: `turnIndex = (turnIndex + 1) % playerOrder.length;
    strokesThisTurn = 0;` *unless* every player has used their
    `turnsPerPlayer` strokes;
  - finish round: set `phase = 'voting'`.

  The check for "round complete" is
  `totalStrokes >= playerOrder.length * config.turnsPerPlayer`,
  where `totalStrokes` is derived from `(turnsPerPlayer cycles
  completed * playerOrder.length) + turnIndex + 1`. Easier: track a
  cumulative `strokesDone` counter on `round`, increment it in
  `pointerUp`, and compare to the target.

  Add `strokesDone: number` to `Round` in `types.ts` if you go that
  way (recommended).

- [ ] **Step 3: Manual test**

  3 tabs, host starts game with `turnsPerPlayer: 1`. Confirm:
  - Only the highlighted drawer can draw.
  - After a single continuous stroke, the turn rotates to the
    next player.
  - After all 3 have drawn, all tabs transition to the voting
    phase (renders nothing yet — Task 7 adds the screen).

- [ ] **Step 4: Commit**

  ```
  [feat] Enforce one-stroke-per-turn on the canvas

  The game's signature rule lives in the canvas: only the active
  drawer may push points, and a single pointer-up advances the
  turn. Without this, the round can't end on its own.
  ```

---

## Task 7: Keyword + turn HUD

**Files:**
- Create: `src/game/RoundHud.tsx`
- Modify: `src/Room.tsx` to render it above the canvas during
  `drawing`

A small bar showing:
- For non-liar: the keyword.
- For liar: "You are the liar. Bluff!" (no keyword).
- "Drawer: <name>" and "Turn N of M".

- [ ] **Step 1: Implement and place above the canvas**

  Pull `liarId`, `keyword`, `playerOrder`, `turnIndex`,
  `config.turnsPerPlayer` from `root.game.round` and `root.game.config`.
  Look up the drawer's name from `presences`.

- [ ] **Step 2: Manual test**

  Confirm the liar tab sees "You are the liar" and the others see
  the keyword. Confirm the drawer name updates as turns advance.

- [ ] **Step 3: Commit**

  ```
  [feat] Show keyword + turn indicator during the round

  Players cannot draw towards a keyword they cannot see. The HUD
  also reveals the role asymmetry (liar vs others) without an
  extra modal.
  ```

---

## Task 8: Voting phase

**Files:**
- Create: `src/game/Voting.tsx`
- Modify: `src/Room.tsx` to render it when `phase === 'voting'`

Each player picks a suspect from the roster (cannot vote for self).
Vote is written to `game.round.votes[myActorID] = suspectActorID`.

- [ ] **Step 1: Build the screen**

  - Grid of player buttons (exclude self).
  - Show whether each player has voted yet (e.g. a checkmark on
    their roster card), but **do not** reveal whom each voted for.
  - Once `Object.keys(votes).length === playerOrder.length`,
    the host sees a "Reveal" button that sets `phase = 'reveal'`.

- [ ] **Step 2: Manual test**

  Each tab votes. Confirm each player can change their vote
  before the host reveals. Confirm only the host sees the
  "Reveal" button, and only when all votes are in.

- [ ] **Step 3: Commit**

  ```
  [feat] Add the voting phase

  Without a vote, there's no payoff to the drawing. Each player
  picks once; the host advances to reveal when all votes land.
  ```

---

## Task 9: Reveal phase + guessing branch

**Files:**
- Create: `src/game/Reveal.tsx`
- Create: `src/game/Guessing.tsx`
- Modify: `src/Room.tsx` switch

Tally votes; the most-voted player is the accused. If
`accusedId === liarId`, transition to `guessing` (only the liar
sees the input). Otherwise, transition straight to `roundEnd`.

- [ ] **Step 1: Add a `tallyVotes` helper to `src/game/state.ts`**

  ```ts
  export function tallyVotes(
    votes: Record<string, string>,
  ): { accusedId: string; counts: Record<string, number> } {
    const counts: Record<string, number> = {};
    for (const target of Object.values(votes)) {
      counts[target] = (counts[target] ?? 0) + 1;
    }
    const accusedId = Object.entries(counts).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0] ?? '';
    return { accusedId, counts };
  }
  ```

  Ties: deterministic on insertion order, acceptable for MVP.

- [ ] **Step 2: `Reveal.tsx`**

  Render the tally bar chart and the accused's name. Host-only
  button: "Continue" — checks the accused vs liar and writes the
  next phase.

- [ ] **Step 3: `Guessing.tsx`**

  - If local actorID is the liar: text input + "Submit guess"
    button. On submit, write `liarGuess` and `guessCorrect`
    (case-insensitive trimmed match) and advance to `roundEnd`.
  - Others: "The liar is guessing…" placeholder.

- [ ] **Step 4: Manual test**

  Run a full round. Force the vote to land on the actual liar
  (just vote that way in 3 tabs) and confirm the guessing screen
  appears. Submit a correct and an incorrect guess in separate
  runs; confirm both behave as documented.

- [ ] **Step 5: Commit**

  ```
  [feat] Add reveal and guessing phases

  After voting the game needs a moment of truth and, when the
  liar is caught, a chance for them to win it back by guessing.
  ```

---

## Task 10: Scoring + round end + next round / finish

**Files:**
- Modify: `src/game/state.ts` — add `applyScores`
- Create: `src/game/RoundEnd.tsx`
- Modify: `src/Room.tsx` switch

Apply the scoring table from the design doc when entering
`roundEnd`. Host advances to the next round (resetting per-round
state, picking a new keyword and liar) or to `finished` when all
rounds are played.

- [ ] **Step 1: `applyScores` helper**

  ```ts
  type Outcome = 'liarEscaped' | 'liarCaughtGuessRight' | 'liarCaughtGuessWrong';

  export function applyScores(
    outcome: Outcome,
    playerOrder: ReadonlyArray<string>,
    liarId: string,
    scores: Record<string, number>,
  ): Record<string, number> {
    const next = { ...scores };
    for (const id of playerOrder) {
      if (id === liarId) {
        next[id] += outcome === 'liarEscaped' ? 2
                  : outcome === 'liarCaughtGuessRight' ? 1
                  : 0;
      } else {
        next[id] += outcome === 'liarEscaped' ? 0
                  : outcome === 'liarCaughtGuessRight' ? 1
                  : 2;
      }
    }
    return next;
  }
  ```

- [ ] **Step 2: Compute outcome and apply on entry to `roundEnd`**

  In the transition handler that writes `phase = 'roundEnd'` (in
  Reveal or Guessing), also write the new `scores` map and clear
  `votes`.

- [ ] **Step 3: `RoundEnd.tsx`**

  Show: outcome message, current scoreboard. Host-only button:
  - "Next round" if `round.index < config.totalRounds` — increments
    `round.index`, picks new keyword, picks new liar (random
    permutation, can be the same player again), clears strokes,
    sets phase back to `drawing`.
  - "Finish" if `round.index >= config.totalRounds` — sets phase
    to `finished`.

- [ ] **Step 4: Manual test**

  Play a 2-round game. Confirm scores accumulate correctly across
  rounds and that the strokes canvas is wiped between rounds.

- [ ] **Step 5: Commit**

  ```
  [feat] Tally round scores and advance to the next round

  Without scoring there is no game arc; without round advancement
  the game can't reach a finish.
  ```

---

## Task 11: Final ranking + play again

**Files:**
- Create: `src/game/Finished.tsx`
- Modify: `src/Room.tsx` switch

When `phase === 'finished'`, show a ranked scoreboard. Host-only
"Play again" button resets `game` to a fresh `initialGame()` (but
keeps the room and players) — i.e. back to `phase === 'lobby'`,
scores wiped.

- [ ] **Step 1: Build the screen**

  Sort `scores` descending; render with positions; highlight the
  winner. Show each player's name from `presences`.

- [ ] **Step 2: "Play again"**

  Host action sets `game = initialGame()` with the *current*
  participant list seeded into `scores` so the next lobby has
  ready zero scores. Strokes are also cleared.

- [ ] **Step 3: Manual test**

  Finish a 2-round game across 3 tabs. Confirm ranking renders
  correctly and "Play again" returns every tab to the in-room
  lobby.

- [ ] **Step 4: Commit**

  ```
  [feat] Render the final ranking and a play-again button

  The game now has a clear finish line, and a one-click way to
  start a new game without leaving the room.
  ```

---

## Task 12: Polish, lint, build, archive

- [ ] **Step 1: Lint**

  Run: `pnpm lint`
  Expected: zero warnings.

- [ ] **Step 2: Build**

  Run: `pnpm build`
  Expected: success.

- [ ] **Step 3: End-to-end smoke test**

  Three browsers. Play a full 3-round game from join → final
  ranking → play again → second game start. Watch for:
  - Late refresh of one tab mid-round: it should rejoin and see
    the current phase correctly.
  - Network blip (disconnect Wi-Fi briefly): Yorkie reconnects;
    the game state is preserved.

- [ ] **Step 4: Update the README status section**

  In [`README.md`](../../../README.md), replace the "Game rules,
  turn rotation, voting, and scoring will be layered in next."
  line with a note that the MVP is now playable end-to-end.

- [ ] **Step 5: Archive this task + create paired lessons**

  ```sh
  git mv docs/tasks/active/20260604-mvp-game-flow-todo.md docs/tasks/archive/
  ```

  Then create the paired lessons file at
  `docs/lessons/20260604-mvp-game-flow.md` capturing anything
  surprising encountered during implementation. If nothing was
  surprising, the file is still required — write `> No surprises.`
  under a single heading. The 1:1 pairing rule between
  `tasks/archive/` and `lessons/` is mandatory; see
  [`docs/tasks/README.md`](../README.md#pairing-with-lessons).

  Update [`docs/tasks/README.md`](../README.md) Archive section and
  [`docs/lessons/README.md`](../../lessons/README.md) Contents section
  to list the new entries.

- [ ] **Step 6: Final commit**

  ```
  [feat] Reach MVP — playable end-to-end liar drawing game

  All phases wired (lobby, drawing, voting, reveal, guessing,
  scoring, finished). Archives the MVP plan and refreshes the
  README so the project status reflects the new baseline.
  ```

---

## Out-of-scope (do NOT implement in this plan)

- Host auto-promotion when the current host disconnects.
- Server-side keyword secrecy (the liar can read the document).
- Reconnection mid-vote recovery beyond what Yorkie gives for free.
- Custom keyword lists, language toggle, spectator mode, kick/ban.
- Drawing tools (colors, sizes, undo, eraser).
- Mobile-specific tweaks beyond the existing `touch-action: none`.
- Sounds, animations, end-of-game share screenshot.

---

## Self-Review checklist

- **Spec coverage:** Every phase in the design doc has a task
  (lobby: T4; drawing: T6/T7; voting: T8; reveal: T9; guessing: T9;
  roundEnd: T10; finished: T11). Schema (T1), host (T2), keyword
  bank (T3) lay the foundations.
- **One commit per task:** Each task ends with a single commit
  message following the `[feat]` convention. No bundled commits.
- **Type consistency:** `Phase`, `Round`, `Game` names defined in
  T1 are used unchanged by every later task.
- **No phantom files:** Every "Modify" target exists today
  (`Room.tsx`, `Canvas.tsx`, `types.ts`). Every "Create" target is
  introduced exactly once.
