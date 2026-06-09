export type LocaleUI = {
  common: {
    copyCode: string;
    copied: string;
    leave: string;
    time: string;
  };
  howTo: {
    openLabel: string;
    title: string;
    steps: ReadonlyArray<string>;
    scoringTitle: string;
    scoringCols: readonly [string, string, string];
    scoringRows: ReadonlyArray<readonly [string, string, string]>;
    close: string;
  };
  joinLobby: {
    tagline: string;
    yourName: string;
    namePlaceholder: string;
    createGame: string;
    orJoinWithCode: string;
    roomCodePlaceholder: string;
    join: string;
    spectate: string;
    languageLabel: string;
  };
  inRoomLobby: {
    title: string;
    rounds: string;
    turnsPerPlayer: string;
    keywordLanguage: string;
    keywordDeck: string;
    startGame: string;
    needMorePlayers: (n: number) => string;
    waiting: string;
    spectatorsLabel: (n: number) => string;
  };
  room: {
    roomLabel: string;
    connecting: (code: string) => string;
    missingApiKey: string;
    reconnecting: string;
    attachFailed: string;
    backToLobby: string;
    nameTaken: (name: string) => string;
    pausedTitle: string;
    pausedSub: string;
  };
  spectator: {
    banner: string;
    votingTitle: string;
    votingSub: string;
  };
  canvas: {
    yourTurn: string;
    drawing: (name: string) => string;
    waiting: string;
    brushLabel: string;
    timerLabel: string;
  };
  chat: {
    title: string;
    placeholder: string;
    send: string;
    empty: string;
    typing: (name: string) => string;
    typingMany: (n: number) => string;
    show: string;
    hide: string;
    dockSide: string;
    dockBottom: string;
    joined: (name: string) => string;
    left: (name: string) => string;
  };
  hud: {
    yourRole: string;
    youAreLiar: string;
    keyword: string;
    drawer: string;
    turn: string;
  };
  voting: {
    title: string;
    votesIn: (n: number, m: number) => string;
    youPicked: (name: string) => string;
    voted: string;
  };
  reveal: {
    title: string;
    accusedLabel: string;
    theLiar: string;
    notTheLiar: string;
    tie: string;
    continueAction: string;
  };
  guessing: {
    othersTitle: (name: string) => string;
    othersSub: string;
    selfTitle: string;
    selfSub: string;
    submit: string;
    placeholder: string;
    answerIn: (language: string) => string;
  };
  roundEnd: {
    title: (n: number, total: number) => string;
    outcomeCaughtGuessed: (liar: string, keyword: string) => string;
    outcomeCaughtBlanked: (
      liar: string,
      guess: string,
      keyword: string,
    ) => string;
    outcomeEscapedGuessed: (liar: string, keyword: string) => string;
    outcomeEscapedBlanked: (
      liar: string,
      guess: string,
      keyword: string,
    ) => string;
    nextRound: string;
    seeFinal: string;
    waitingWrap: string;
    waitingNext: string;
  };
  finished: {
    title: string;
    sub: (n: number) => string;
    playAgain: string;
    waiting: string;
  };
};

// A keyword deck: a named, curated list of prompts. Every locale
// must provide a `general` deck (the fallback); extra decks are
// optional and surface in the in-room lobby's deck selector.
export type KeywordDeck = {
  name: string;
  words: ReadonlyArray<string>;
};

export type Locale = {
  code: string;
  name: string;
  keywords: Record<string, KeywordDeck>;
  ui: LocaleUI;
};
