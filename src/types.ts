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
  at: number;
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
  keywordLanguage: string;
  keywordDeck: string;
  brushBudgetPx: number;
  turnTimeMs: number;
};

export type Round = {
  index: number;
  keyword: string;
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
};

export const DEFAULT_BRUSH_BUDGET_PX = 1500;
export const DEFAULT_TURN_TIME_MS = 10_000;
export const DEFAULT_KEYWORD_DECK = 'general';

const emptyRound = (): Round => ({
  index: 0,
  keyword: '',
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
    keywordLanguage: 'en',
    keywordDeck: DEFAULT_KEYWORD_DECK,
    brushBudgetPx: DEFAULT_BRUSH_BUDGET_PX,
    turnTimeMs: DEFAULT_TURN_TIME_MS,
  },
  round: emptyRound(),
  scores: {},
  colors: {},
});
