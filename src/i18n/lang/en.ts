import type { Locale } from '../types';

const en: Locale = {
  code: 'en',
  name: 'English',

  keywords: {
    animals: {
      name: 'Animals',
      words: [
        'dog', 'cat', 'rabbit', 'lion', 'tiger', 'bear', 'elephant',
        'monkey', 'giraffe', 'zebra', 'fox', 'wolf', 'pig', 'cow',
        'horse', 'sheep', 'deer', 'frog', 'snake', 'turtle', 'mouse',
        'squirrel', 'panda', 'kangaroo', 'hippo', 'rhino', 'camel',
        'duck', 'chicken', 'snail',
      ],
    },
    food: {
      name: 'Food',
      words: [
        'pizza', 'hamburger', 'sandwich', 'bread', 'rice', 'noodles',
        'ramen', 'egg', 'cake', 'donut', 'cookie', 'ice cream', 'candy',
        'chocolate', 'popcorn', 'french fries', 'hotdog', 'dumpling',
        'sushi', 'cheese', 'milk', 'gimbap', 'pancake', 'fried chicken',
        'soup',
      ],
    },
    produce: {
      name: 'Fruits & Veggies',
      words: [
        'apple', 'banana', 'orange', 'grape', 'strawberry', 'watermelon',
        'peach', 'pear', 'lemon', 'cherry', 'pineapple', 'melon', 'kiwi',
        'tomato', 'carrot', 'potato', 'corn', 'pumpkin', 'cucumber',
        'onion', 'cabbage', 'mushroom', 'chili pepper', 'garlic',
        'sweet potato',
      ],
    },
    household: {
      name: 'Household',
      words: [
        'chair', 'table', 'bed', 'sofa', 'lamp', 'clock', 'mirror',
        'door', 'window', 'key', 'umbrella', 'candle', 'broom', 'pillow',
        'blanket', 'towel', 'soap', 'toothbrush', 'comb', 'trash can',
        'bucket', 'fan', 'television', 'telephone', 'ladder', 'scissors',
        'vase', 'picture frame', 'light bulb', 'calendar',
      ],
    },
    kitchen: {
      name: 'Kitchen',
      words: [
        'spoon', 'fork', 'knife', 'chopsticks', 'plate', 'bowl', 'cup',
        'mug', 'pot', 'frying pan', 'kettle', 'refrigerator', 'oven',
        'microwave', 'bottle',
      ],
    },
    vehicles: {
      name: 'Vehicles',
      words: [
        'car', 'bus', 'taxi', 'truck', 'bicycle', 'motorcycle', 'train',
        'subway', 'airplane', 'helicopter', 'ship', 'boat', 'rocket',
        'ambulance', 'fire truck', 'police car', 'scooter', 'tractor',
        'hot air balloon', 'submarine',
      ],
    },
    nature: {
      name: 'Nature',
      words: [
        'sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'rainbow',
        'lightning', 'mountain', 'river', 'sea', 'beach', 'tree',
        'flower', 'grass', 'leaf', 'rock', 'fire', 'water', 'snowman',
        'island', 'forest', 'cave', 'waterfall', 'volcano',
      ],
    },
    body: {
      name: 'Body',
      words: [
        'eye', 'nose', 'mouth', 'ear', 'hand', 'foot', 'arm', 'leg',
        'head', 'hair', 'tooth', 'tongue', 'finger', 'heart', 'face',
        'knee', 'shoulder', 'belly',
      ],
    },
    clothing: {
      name: 'Clothing',
      words: [
        'shirt', 't-shirt', 'pants', 'dress', 'skirt', 'jacket', 'coat',
        'sweater', 'socks', 'shoes', 'boots', 'hat', 'gloves', 'scarf',
        'belt', 'tie', 'glasses', 'ring', 'watch', 'backpack',
      ],
    },
    sports: {
      name: 'Sports',
      words: [
        'soccer', 'basketball', 'baseball', 'tennis', 'badminton',
        'table tennis', 'volleyball', 'golf', 'swimming', 'running',
        'skiing', 'skating', 'boxing', 'bowling', 'archery', 'jump rope',
        'taekwondo', 'yoga',
      ],
    },
    jobs: {
      name: 'Jobs',
      words: [
        'doctor', 'nurse', 'teacher', 'police officer', 'firefighter',
        'chef', 'farmer', 'pilot', 'singer', 'painter', 'soldier',
        'scientist', 'baker', 'hairdresser', 'dentist', 'astronaut',
      ],
    },
    stationery: {
      name: 'School Supplies',
      words: [
        'pencil', 'pen', 'eraser', 'ruler', 'crayon', 'notebook', 'book',
        'glue', 'paintbrush', 'marker', 'paper', 'calculator', 'chalk',
        'globe', 'pencil case',
      ],
    },
    places: {
      name: 'Places',
      words: [
        'house', 'school', 'hospital', 'church', 'castle', 'tower',
        'bridge', 'lighthouse', 'tent', 'store', 'bank', 'library',
        'park', 'train station', 'windmill',
      ],
    },
    instruments: {
      name: 'Instruments',
      words: [
        'piano', 'guitar', 'violin', 'drum', 'flute', 'trumpet',
        'recorder', 'harmonica', 'triangle', 'tambourine', 'xylophone',
        'cello',
      ],
    },
    toys: {
      name: 'Toys',
      words: [
        'ball', 'balloon', 'kite', 'doll', 'teddy bear', 'robot',
        'blocks', 'spinning top', 'yo-yo', 'marble', 'slide', 'swing',
        'seesaw', 'puzzle', 'dice', 'toy car',
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
        'If the vote ties, everyone draws one more round and votes again — tie again and the liar gets away.',
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
      title: 'Drawing Liar Game',
      yourName: 'Your name',
      namePlaceholder: 'e.g. doodler',
      createGame: 'Create a new game',
      orJoinWithCode: 'or join with a code',
      roomCodePlaceholder: 'ROOM CODE',
      join: 'Join',
      spectate: 'Spectate',
      languageLabel: 'Language',
      activeCount: (rooms, users) =>
        `${rooms} room${rooms === 1 ? '' : 's'} · ${users} player${users === 1 ? '' : 's'} online`,
      madeBy: 'Made by',
      builtWith: 'Built on Yorkie',
      roomNotFound: "That room doesn't exist. Check the code, or create a new game.",
    },
    inRoomLobby: {
      title: 'Waiting room',
      rounds: 'Rounds',
      turnsPerPlayer: 'Turns per player',
      startGame: 'Start game',
      needMorePlayers: (n) =>
        `Need ${n} more player${n === 1 ? '' : 's'}`,
      waiting: 'Waiting for host to start…',
      spectatorsLabel: (n) => `${n} spectator${n === 1 ? '' : 's'}`,
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
      pausedTitle: 'Paused',
      pausedSub: 'Need at least 3 players. Waiting for people to (re)join…',
      roundError:
        "Couldn't reach the keyword server to set up the round. Try again.",
      dismiss: 'Dismiss',
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
      joined: (name) => `${name} joined`,
      left: (name) => `${name} left`,
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
    tiebreak: {
      title: 'No decision!',
      sub: 'No one was decisively accused. Everyone draws one more turn, then votes again.',
      resumeIn: 'Resuming in',
    },
    reveal: {
      title: 'The votes are in',
      accusedLabel: 'Accused',
      theLiar: 'the liar!',
      notTheLiar: 'not the liar.',
      tie: "It's a tie — no one was decisively accused, so the liar slips by.",
      guessIn: 'Guessing in',
    },
    guessing: {
      othersTitle: (name) => `${name} is guessing…`,
      othersSub: 'The liar takes one shot at the keyword.',
      selfTitle: 'Guess the keyword',
      selfSub: 'One try. Nail it and you steal points back.',
      submit: 'Submit guess',
      placeholder: 'e.g. lighthouse',
      answerAnyLanguage: 'Any language is accepted.',
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
        `${liar} bluffed past you but guessed "${guess}" — it was "${keyword}".`,
      nextIn: 'Next round in',
      finalIn: 'Final ranking in',
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
