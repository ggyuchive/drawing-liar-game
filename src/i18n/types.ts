export type LocaleUI = {
  common: {
    copyLink: string;
    leave: string;
  };
  joinLobby: {
    tagline: string;
    yourName: string;
    namePlaceholder: string;
    createGame: string;
    orJoinWithCode: string;
    roomCodePlaceholder: string;
    join: string;
    languageLabel: string;
  };
  inRoomLobby: {
    title: string;
    rounds: string;
    turnsPerPlayer: string;
    keywordLanguage: string;
    startGame: string;
    needMorePlayers: (n: number) => string;
    waiting: string;
  };
  room: {
    roomLabel: string;
    connecting: (code: string) => string;
    error: (msg: string) => string;
    missingApiKey: string;
  };
  canvas: {
    yourTurn: string;
    drawing: (name: string) => string;
    waiting: string;
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
    reveal: string;
    waitingForVotes: string;
  };
  reveal: {
    title: string;
    accusedLabel: string;
    theLiar: string;
    notTheLiar: string;
    giveGuess: string;
    continueAction: string;
  };
  guessing: {
    othersTitle: (name: string) => string;
    othersSub: string;
    selfTitle: string;
    selfSub: string;
    submit: string;
    placeholder: string;
  };
  roundEnd: {
    title: (n: number, total: number) => string;
    outcomeCaughtRight: (liar: string, keyword: string) => string;
    outcomeCaughtWrong: (
      liar: string,
      guess: string,
      keyword: string,
    ) => string;
    outcomeEscaped: (liar: string, keyword: string) => string;
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

export type Locale = {
  code: string;
  name: string;
  keywords: ReadonlyArray<string>;
  ui: LocaleUI;
};
