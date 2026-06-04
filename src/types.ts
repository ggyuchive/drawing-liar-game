export type Point = { x: number; y: number };

export type Stroke = {
  id: string;
  color: string;
  size: number;
  points: Array<Point>;
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
};

export type Round = {
  index: number;
  keyword: string;
  liarId: string;
  playerOrder: Array<string>;
  turnIndex: number;
  strokesThisTurn: number;
  strokesDone: number;
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

export type CanvasDoc = {
  game: Game;
  strokes: Array<Stroke>;
};

export type CanvasPresence = {
  name: string;
  color: string;
};

export const emptyRound = (): Round => ({
  index: 0,
  keyword: '',
  liarId: '',
  playerOrder: [],
  turnIndex: 0,
  strokesThisTurn: 0,
  strokesDone: 0,
  votes: {},
  liarGuess: '',
  guessCorrect: false,
});

export const initialGame = (): Game => ({
  phase: 'lobby',
  hostId: '',
  config: { totalRounds: 3, turnsPerPlayer: 2, keywordLanguage: 'en' },
  round: emptyRound(),
  scores: {},
});
