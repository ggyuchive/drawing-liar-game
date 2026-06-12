export type Point = { x: number; y: number };

export type Stroke = {
  id: string;
  authorId: string;
  color: string;
  size: number;
  points: Array<Point>;
};

export type ChatMessage = {
  id: string;
  authorId: string;
  text: string;
  // Sender's epoch, kept only for ordering/cap. The DISPLAYED time is
  // each viewer's own clock when they first see the message (sender
  // clocks can't be trusted), so every viewer sees a consistent,
  // monotonic timeline.
  at: number;
  // Set on system notices ("joined" / "left"); `text` holds the name.
  system?: 'join' | 'left';
};

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
  keywordDeck: string;
  brushBudgetPx: number;
  turnTimeMs: number;
};

export type Round = {
  index: number;
  // Opaque handle for the server-authoritative round setup. Clients ask
  // the keyword-secrecy server about *this* round (their own role +
  // keyword) by this id. Empty for documents created before the backend.
  roundId: string;
  // Canonical keyword text in the config language (used to check the
  // liar's guess). For DISPLAY, resolve keywordDeck+keywordIndex in the
  // viewer's own language so the shown word follows the UI language.
  // SECRECY: `keyword`, `keywordIndex` (-1), and `liarId` ('') stay
  // empty in the document until the reveal step publishes them; before
  // that each client learns its own keyword/role only from the server.
  keyword: string;
  keywordDeck: string;
  keywordIndex: number;
  liarId: string;
  playerOrder: Array<string>;
  turnIndex: number;
  strokesDone: number;
  votes: Record<string, string>;
  liarGuess: string;
  guessCorrect: boolean;
  wasCaught: boolean;
  brushBudgetPx: number;
  brushUsedPx: number;
  turnStartedAt: number;
};

export type Game = {
  phase: Phase;
  hostId: string;
  config: GameConfig;
  round: Round;
  scores: Record<string, number>;
  // Per-player stroke color, assigned from PLAYER_COLORS at game
  // start and held for the whole game; reassigned on a new game.
  colors: Record<string, string>;
};

export type CanvasPresence = {
  // Stable per-tab identity (see getSessionUid). All game state is
  // keyed on this, NOT on the connection-scoped Yorkie clientID.
  uid: string;
  name: string;
  color: string;
  typing: boolean;
  // Bumped periodically and on focus/interaction so a backgrounded
  // tab re-asserts its presence (otherwise the heartbeat stalls, the
  // server reclaims the session, and peers see the player drop).
  lastSeen: number;
  // Opted to watch only — excluded from the player count, the side
  // profiles, and play. Toggled in the waiting room.
  spectator: boolean;
};

export const DEFAULT_BRUSH_BUDGET_PX = 1500;
export const DEFAULT_TURN_TIME_MS = 10_000;
export const DEFAULT_KEYWORD_DECK = 'general';
// Wall-clock caps (measured locally per client) for the voting and
// liar-guessing phases.
export const VOTE_TIME_MS = 30_000;
export const GUESS_TIME_MS = 30_000;

const emptyRound = (): Round => ({
  index: 0,
  roundId: '',
  keyword: '',
  keywordDeck: '',
  keywordIndex: -1,
  liarId: '',
  playerOrder: [],
  turnIndex: 0,
  strokesDone: 0,
  votes: {},
  liarGuess: '',
  guessCorrect: false,
  wasCaught: false,
  brushBudgetPx: DEFAULT_BRUSH_BUDGET_PX,
  brushUsedPx: 0,
  turnStartedAt: 0,
});

export const initialGame = (): Game => ({
  phase: 'lobby',
  hostId: '',
  config: {
    totalRounds: 3,
    turnsPerPlayer: 2,
    keywordDeck: DEFAULT_KEYWORD_DECK,
    brushBudgetPx: DEFAULT_BRUSH_BUDGET_PX,
    turnTimeMs: DEFAULT_TURN_TIME_MS,
  },
  round: emptyRound(),
  scores: {},
  colors: {},
});
