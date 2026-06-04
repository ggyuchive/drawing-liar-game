import type { Locale } from '../types';

const en: Locale = {
  code: 'en',
  name: 'English',

  keywords: [
    'apple', 'banana', 'cactus', 'castle', 'cloud', 'compass',
    'crown', 'dolphin', 'dragon', 'elephant', 'forest', 'glasses',
    'guitar', 'hat', 'island', 'jellyfish', 'kite', 'ladder',
    'lighthouse', 'mountain', 'mushroom', 'octopus', 'piano',
    'pineapple', 'pirate', 'pizza', 'planet', 'rainbow', 'robot',
    'rocket', 'sandwich', 'scissors', 'snowman', 'spaceship',
    'submarine', 'sunglasses', 'telescope', 'tornado', 'tree',
    'umbrella', 'unicorn', 'volcano', 'waterfall', 'windmill',
  ],

  ui: {
    common: {
      copyLink: 'Copy link',
      leave: 'Leave',
    },
    joinLobby: {
      tagline: 'A liar drawing game on a shared canvas.',
      yourName: 'Your name',
      namePlaceholder: 'e.g. doodler',
      createGame: 'Create a new game',
      orJoinWithCode: 'or join with a code',
      roomCodePlaceholder: 'ROOM CODE',
      join: 'Join',
      languageLabel: 'Language',
    },
    inRoomLobby: {
      title: 'Waiting room',
      rounds: 'Rounds',
      turnsPerPlayer: 'Turns per player',
      keywordLanguage: 'Keyword language',
      startGame: 'Start game',
      needMorePlayers: (n) =>
        `Need ${n} more player${n === 1 ? '' : 's'}`,
      waiting: 'Waiting for host to start…',
    },
    room: {
      roomLabel: 'Room',
      connecting: (code) => `Connecting to room ${code}…`,
      error: (msg) => `Error: ${msg}`,
      missingApiKey:
        'Missing VITE_YORKIE_API_KEY. Copy .env.example to .env and fill in your Yorkie API key.',
    },
    canvas: {
      yourTurn: 'Your turn — one stroke.',
      drawing: (name) => `${name} is drawing…`,
      waiting: 'Waiting…',
    },
    hud: {
      yourRole: 'Your role',
      youAreLiar: 'You are the liar — bluff!',
      keyword: 'Keyword',
      drawer: 'Drawer',
      turn: 'Turn',
    },
    voting: {
      title: "Who's the liar?",
      votesIn: (n, m) => `${n} / ${m} votes in`,
      youPicked: (name) => ` — you picked ${name}`,
      voted: 'voted',
      reveal: 'Reveal the accused',
      waitingForVotes: 'Waiting for everyone to vote…',
    },
    reveal: {
      title: 'The votes are in',
      accusedLabel: 'Accused',
      theLiar: 'the liar!',
      notTheLiar: 'not the liar.',
      giveGuess: 'Give the liar a chance to guess',
      continueAction: 'Continue',
    },
    guessing: {
      othersTitle: (name) => `${name} is guessing…`,
      othersSub: 'The liar gets one shot at the keyword to steal the round back.',
      selfTitle: 'You were caught — guess the keyword',
      selfSub: 'One try. Get it right and you steal the round.',
      submit: 'Submit guess',
      placeholder: 'e.g. lighthouse',
    },
    roundEnd: {
      title: (n, total) => `Round ${n} / ${total}`,
      outcomeCaughtRight: (liar, keyword) =>
        `${liar} was caught but guessed "${keyword}" — half marks all round.`,
      outcomeCaughtWrong: (liar, guess, keyword) =>
        `${liar} was caught and guessed "${guess}". The real keyword was "${keyword}".`,
      outcomeEscaped: (liar, keyword) =>
        `The liar (${liar}) slipped past — keyword was "${keyword}".`,
      nextRound: 'Next round',
      seeFinal: 'See final ranking',
      waitingWrap: 'Waiting for host to wrap up…',
      waitingNext: 'Waiting for host to start the next round…',
    },
    finished: {
      title: 'Final ranking',
      sub: (n) => `${n} round${n === 1 ? '' : 's'} played`,
      playAgain: 'Play again',
      waiting: 'Waiting for host to start a new game…',
    },
  },
};

export default en;
