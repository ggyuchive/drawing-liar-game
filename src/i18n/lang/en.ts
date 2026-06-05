import type { Locale } from '../types';

const en: Locale = {
  code: 'en',
  name: 'English',

  keywords: {
    general: {
      name: 'General',
      words: [
        'castle', 'cloud', 'compass', 'crown', 'dragon', 'glasses',
        'guitar', 'hat', 'kite', 'ladder', 'lighthouse', 'piano',
        'pirate', 'planet', 'robot', 'rocket', 'scissors', 'snowman',
        'spaceship', 'submarine', 'telescope', 'umbrella', 'unicorn',
        'windmill',
      ],
    },
    food: {
      name: 'Food',
      words: [
        'apple', 'banana', 'pineapple', 'pizza', 'sandwich',
        'mushroom', 'cactus', 'cake', 'donut', 'noodles', 'pancake',
        'popcorn',
      ],
    },
    nature: {
      name: 'Nature',
      words: [
        'forest', 'island', 'mountain', 'rainbow', 'tree', 'volcano',
        'waterfall', 'tornado', 'dolphin', 'elephant', 'jellyfish',
        'octopus',
      ],
    },
  },

  ui: {
    common: {
      copyCode: 'Copy code',
      copied: 'Copied!',
      leave: 'Leave',
      time: 'Time',
    },
    howTo: {
      openLabel: 'How to play',
      title: 'How to play',
      steps: [
        'Everyone shares one secret keyword — except one player, the liar, who has no idea what it is.',
        'Players take turns drawing the keyword on the shared canvas. Each turn has a brush budget and a 10-second timer.',
        "The liar doesn't know the word, so they bluff — drawing something plausible to blend in.",
        'After the drawing turns, everyone votes on who they think the liar is.',
        'The accused is revealed, then the liar takes one guess at the keyword.',
        'Scores reward the room for catching the liar, and the liar for bluffing and for actually guessing the word. Highest score after the last round wins.',
        'Click a player on the side to highlight only their strokes — handy for spotting the liar.',
      ],
      scoringTitle: 'Scoring',
      scoringCols: ['Outcome', 'Liar', 'Everyone else'],
      scoringRows: [
        ['Caught + guessed the word', '+1', '+1'],
        ['Caught + guessed wrong', '0', '+2'],
        ['Escaped + guessed the word', '+3', '0'],
        ['Escaped + guessed wrong', '+2', '+1'],
      ],
      close: 'Got it',
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
      keywordDeck: 'Keyword deck',
      startGame: 'Start game',
      needMorePlayers: (n) =>
        `Need ${n} more player${n === 1 ? '' : 's'}`,
      waiting: 'Waiting for host to start…',
    },
    room: {
      roomLabel: 'Room',
      connecting: (code) => `Connecting to room ${code}…`,
      missingApiKey:
        'Missing VITE_YORKIE_API_KEY. Copy .env.example to .env and fill in your Yorkie API key.',
      reconnecting: 'Reconnecting…',
      attachFailed:
        "Couldn't join this room. Check your connection and try again.",
      backToLobby: 'Back to lobby',
      nameTaken: (name) =>
        `The name "${name}" is already taken in this room. Pick another.`,
      playerLeft: (name) => `${name} left the room.`,
      pausedTitle: 'Paused',
      pausedSub: 'Need at least 3 players. Waiting for people to (re)join…',
    },
    spectator: {
      banner: 'Spectating — you join the action next round.',
      votingTitle: "You're spectating",
      votingSub: 'Players who drew this round are voting. Sit tight!',
    },
    canvas: {
      yourTurn: 'Your turn — draw!',
      drawing: (name) => `${name} is drawing…`,
      waiting: 'Waiting…',
      brushLabel: 'Brush',
      timerLabel: 'Turn',
    },
    chat: {
      title: 'Chat',
      placeholder: 'Say something…',
      send: 'Send',
      empty: 'No messages yet. Say hi!',
      typing: (name) => `${name} is typing…`,
      typingMany: (n) => `${n} people are typing…`,
      show: 'Show chat',
      hide: 'Hide chat',
      dockSide: 'Chat →',
      dockBottom: 'Chat ↓',
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
    },
    reveal: {
      title: 'The votes are in',
      accusedLabel: 'Accused',
      theLiar: 'the liar!',
      notTheLiar: 'not the liar.',
      tie: "It's a tie — no one was decisively accused, so the liar slips by.",
      continueAction: 'Continue',
    },
    guessing: {
      othersTitle: (name) => `${name} is guessing…`,
      othersSub: 'The liar takes one shot at the keyword.',
      selfTitle: 'Guess the keyword',
      selfSub: 'One try. Nail it and you steal points back.',
      submit: 'Submit guess',
      placeholder: 'e.g. lighthouse',
      answerIn: (language) => `Type your answer in ${language}.`,
    },
    roundEnd: {
      title: (n, total) => `Round ${n} / ${total}`,
      outcomeCaughtGuessed: (liar, keyword) =>
        `${liar} was caught but still guessed "${keyword}" — half marks all round.`,
      outcomeCaughtBlanked: (liar, guess, keyword) =>
        `${liar} was caught and guessed "${guess}". The keyword was "${keyword}". Clean win for the room.`,
      outcomeEscapedGuessed: (liar, keyword) =>
        `The liar (${liar}) bluffed past you AND knew it was "${keyword}". Flawless.`,
      outcomeEscapedBlanked: (liar, guess, keyword) =>
        `${liar} bluffed past you but guessed "${guess}" — it was "${keyword}". A small consolation for the room.`,
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
