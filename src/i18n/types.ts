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
    title: string;
    yourName: string;
    namePlaceholder: string;
    createGame: string;
    orJoinWithCode: string;
    roomCodePlaceholder: string;
    join: string;
    spectate: string;
    languageLabel: string;
    activeCount: (rooms: number, users: number) => string;
    madeBy: string;
    builtWith: string;
    roomNotFound: string;
    roomFull: string;
  };
  inRoomLobby: {
    title: string;
    rounds: string;
    turnsPerPlayer: string;
    // Liar style (classic / fool) — see GameMode.
    gameMode: string;
    modeClassic: string;
    modeFool: string;
    // Drawing style (each device / one shared device) — see DrawMode.
    drawMode: string;
    drawEach: string;
    drawHost: string;
    // Korea-specific category toggle.
    krCategories: string;
    krOn: string;
    krOff: string;
    // Per-axis "?" explanation popups.
    gameModeHelp: ReadonlyArray<{ name: string; desc: string }>;
    drawModeHelp: ReadonlyArray<{ name: string; desc: string }>;
    krCategoriesHelp: ReadonlyArray<{ name: string; desc: string }>;
    helpLabel: string;
    // Lobby host hand-off (tap a player to pass the crown).
    hostBadge: string;
    makeHost: string;
    transferHostQ: (name: string) => string;
    cancel: string;
    startGame: string;
    needMorePlayers: (n: number) => string;
    waiting: string;
    spectatorsLabel: (n: number) => string;
  };
  // One-device ('host') draw mode: the host device is the shared screen,
  // players join by QR and draw on it.
  hostMode: {
    lobbyScreenNote: string;
    scanToJoin: string;
    screenTitle: string;
    drawHerePhone: string;
    // Turn handoff overlay on the shared screen (one device draws, so
    // the next player needs a moment to take it).
    nextUp: string;
    startTurn: (name: string) => string;
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
    roundError: string;
    dismiss: string;
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
    // Label for the category hint shown to the liar.
    category: string;
    drawer: string;
    turn: string;
  };
  voting: {
    title: string;
    votesIn: (n: number, m: number) => string;
    youPicked: (name: string) => string;
    voted: string;
  };
  tiebreak: {
    title: string;
    sub: string;
    // Label beside the countdown until drawing resumes.
    resumeIn: string;
  };
  reveal: {
    title: string;
    accusedLabel: string;
    theLiar: string;
    notTheLiar: string;
    tie: string;
    // Label shown beside the auto-advance countdown to the guess phase.
    guessIn: string;
  };
  guessing: {
    othersTitle: (name: string) => string;
    othersSub: string;
    selfTitle: string;
    selfSub: string;
    submit: string;
    placeholder: string;
    answerAnyLanguage: string;
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
    // Fool-round note: the different word the liar was given.
    foolKeyword: (liar: string, liarWord: string) => string;
    // Labels beside the auto-advance countdown (no manual button).
    nextIn: string;
    finalIn: string;
  };
  finished: {
    title: string;
    sub: (n: number) => string;
    playAgain: string;
    waiting: string;
  };
};

// A named, curated list of prompts. Decks are parallel across locales
// (same index = same concept), so a round stores deck+index only.
export type KeywordDeck = {
  name: string;
  words: ReadonlyArray<string>;
  // Korea-specific deck (Korean movies/people) — only in the pool when
  // the host enables krCategories.
  krOnly?: boolean;
};

export type Locale = {
  code: string;
  name: string;
  keywords: Record<string, KeywordDeck>;
  ui: LocaleUI;
};
