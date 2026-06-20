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
  // Sender's epoch, for ordering/cap only. Displayed time is each viewer's
  // own clock at first sight (sender clocks aren't trusted).
  at: number;
  // System notices ("joined"/"left"); `text` holds the name.
  system?: 'join' | 'left';
};

export type Phase =
  | 'lobby'
  | 'drawing'
  | 'tiebreak'
  | 'voting'
  | 'reveal'
  | 'guessing'
  | 'roundEnd'
  | 'finished';

// 'classic': liar knows they're the liar, gets no keyword.
// 'fool': liar does NOT know — gets a different keyword from the same
// category, so the round is about spotting the odd one out.
export type GameMode = 'classic' | 'fool';

// 'each': everyone draws on their own device. 'host': only the host
// device draws (players check their role on their phones); it must NEVER
// reveal the host's own role. Independent of GameMode.
export type DrawMode = 'each' | 'host';

export type GameConfig = {
  totalRounds: number;
  turnsPerPlayer: number;
  keywordDeck: string;
  brushBudgetPx: number;
  turnTimeMs: number;
  gameMode: GameMode;
  drawMode: DrawMode;
  // Include Korea-specific decks (Korean movies/people) in the pool.
  krCategories: boolean;
};

export type Round = {
  index: number;
  // Opaque handle for the server-authoritative round setup; clients ask
  // the secrecy server about their own role + keyword by this id.
  roundId: string;
  // SECRECY: `keyword`, `keywordIndex` (-1), and `liarId` ('') stay empty
  // in the doc until reveal; before that each client learns its own
  // keyword/role from the server only. `keyword` is the canonical text
  // (guess-checking); display resolves keywordDeck+keywordIndex per-locale.
  keyword: string;
  keywordDeck: string;
  keywordIndex: number;
  // Fool mode: the different keyword the liar gets (same deck). -1 in
  // classic, so `>= 0` marks a fool round. -1 in the doc until reveal.
  liarKeywordIndex: number;
  liarId: string;
  playerOrder: Array<string>;
  turnIndex: number;
  // Turns each player draws this round; a tied vote adds one (tie-break),
  // so the total can grow once mid-round instead of restarting.
  turnsPerPlayer: number;
  strokesDone: number;
  votes: Record<string, string>;
  liarGuess: string;
  guessCorrect: boolean;
  wasCaught: boolean;
  // True once the one-shot tie-break is spent; a second tie resolves as
  // "liar not caught".
  tieBreakUsed: boolean;
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
  // Per-player stroke color from PLAYER_COLORS, held for the whole game.
  colors: Record<string, string>;
};

export type CanvasPresence = {
  // Stable per-tab identity (see getSessionUid); all game state keys on
  // this, NOT the connection-scoped Yorkie clientID.
  uid: string;
  name: string;
  color: string;
  typing: boolean;
  // Bumped on a timer + focus/interaction so a backgrounded tab re-asserts
  // presence before the server reclaims its session.
  lastSeen: number;
  // Watch-only: excluded from the player count, profiles, and play.
  spectator: boolean;
  // Join epoch, used only for the 8-player cap "who's first" ordering.
  // Optional on older presences (treated as earliest).
  joinedAt?: number;
};

export const DEFAULT_BRUSH_BUDGET_PX = 1000;
export const DEFAULT_TURN_TIME_MS = 10_000;
export const DEFAULT_KEYWORD_DECK = 'general';
// Phase durations (auto-advance; measured locally per client).
export const VOTE_TIME_MS = 30_000;
export const GUESS_TIME_MS = 30_000;
export const REVEAL_TIME_MS = 5_000;
export const ROUNDEND_TIME_MS = 5_000;
export const TIEBREAK_TIME_MS = 5_000;

const emptyRound = (): Round => ({
  index: 0,
  roundId: '',
  keyword: '',
  keywordDeck: '',
  keywordIndex: -1,
  liarKeywordIndex: -1,
  liarId: '',
  playerOrder: [],
  turnIndex: 0,
  turnsPerPlayer: 0,
  strokesDone: 0,
  votes: {},
  liarGuess: '',
  guessCorrect: false,
  wasCaught: false,
  tieBreakUsed: false,
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
    gameMode: 'classic',
    drawMode: 'each',
    krCategories: true,
  },
  round: emptyRound(),
  scores: {},
  colors: {},
});
