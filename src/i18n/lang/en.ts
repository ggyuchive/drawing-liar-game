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
        'hamster', 'hedgehog', 'bat', 'koala', 'crocodile',
      ],
    },
    food: {
      name: 'Food',
      words: [
        'pizza', 'hamburger', 'sandwich', 'bread', 'rice', 'noodles',
        'ramen', 'egg', 'cake', 'donut', 'cookie', 'ice cream', 'candy',
        'chocolate', 'popcorn', 'french fries', 'hotdog', 'dumpling',
        'sushi', 'cheese', 'milk', 'gimbap', 'pancake', 'fried chicken',
        'soup', 'waffle', 'taco', 'spaghetti', 'pretzel', 'bagel',
      ],
    },
    produce: {
      name: 'Fruits & Veggies',
      words: [
        'apple', 'banana', 'orange', 'grape', 'strawberry', 'watermelon',
        'peach', 'pear', 'lemon', 'cherry', 'pineapple', 'melon', 'kiwi',
        'tomato', 'carrot', 'potato', 'corn', 'pumpkin', 'cucumber',
        'onion', 'cabbage', 'mushroom', 'chili pepper', 'garlic',
        'sweet potato', 'eggplant', 'broccoli', 'lettuce', 'radish',
        'green onion',
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
        'van', 'jeep', 'ferry', 'sled', 'canoe',
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
        'museum', 'zoo', 'hotel', 'restaurant', 'market',
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
    birds: {
      name: 'Birds',
      words: [
        'sparrow', 'eagle', 'owl', 'parrot', 'penguin', 'swan', 'peacock',
        'flamingo', 'pigeon', 'crow', 'ostrich', 'seagull', 'turkey',
        'swallow', 'woodpecker',
      ],
    },
    sea: {
      name: 'Sea Creatures',
      words: [
        'fish', 'shark', 'whale', 'dolphin', 'octopus', 'crab', 'jellyfish',
        'starfish', 'seahorse', 'lobster', 'shrimp', 'squid', 'seal',
        'clam', 'eel',
      ],
    },
    insects: {
      name: 'Insects',
      words: [
        'bee', 'ant', 'butterfly', 'spider', 'ladybug', 'mosquito',
        'beetle', 'caterpillar', 'dragonfly', 'grasshopper', 'fly',
        'cockroach', 'cicada', 'firefly', 'centipede',
      ],
    },
    tools: {
      name: 'Tools',
      words: [
        'hammer', 'screwdriver', 'wrench', 'saw', 'drill', 'nail', 'screw',
        'axe', 'shovel', 'rake', 'pliers', 'hoe', 'magnet', 'flashlight',
        'tape measure',
      ],
    },
    countries: {
      name: 'Countries',
      words: [
        'South Korea', 'USA', 'Japan', 'China', 'UK', 'France',
        'Germany', 'Italy', 'Spain', 'Russia', 'Australia', 'Canada',
        'Brazil', 'Mexico', 'India', 'Vietnam', 'Thailand', 'Egypt',
        'Switzerland', 'Netherlands', 'Greece', 'Türkiye', 'Indonesia',
        'Singapore', 'Philippines', 'Mongolia', 'New Zealand', 'Argentina',
        'Portugal', 'Kenya',
      ],
    },
    kmovies: {
      name: 'Movies',
      krOnly: true,
      words: [
        'Parasite', 'Squid Game', 'Train to Busan', 'The Admiral',
        'Extreme Job', 'Veteran', 'Along with the Gods', 'The Host',
        'Oldboy', 'Memories of Murder', 'A Taxi Driver', 'The Attorney',
        'Ode to My Father', 'The Outlaws', 'Snowpiercer',
        'The Man from Nowhere', 'Tazza', 'The King and the Clown',
        'Haeundae', 'The Thieves', 'Assassination', 'New World',
        'Mother', 'The Wailing',
      ],
    },
    kfamous: {
      name: 'Famous people',
      krOnly: true,
      words: [
        'King Sejong', 'Yi Sun-sin', 'Son Heung-min', 'Kim Yuna', 'IU',
        'Yoo Jae-suk', 'Psy', 'Bong Joon-ho', 'Faker', 'Park Ji-sung',
        'Ryu Hyun-jin', 'Kim Gu', 'Ahn Jung-geun', 'Yu Gwan-sun',
        'Yun Dong-ju', 'Edison', 'Einstein', 'Steve Jobs', 'Bill Gates',
        'Lincoln', 'Picasso', 'Mozart', 'Beethoven', 'Shakespeare',
      ],
    },
  },

  ui: {
    common: {
      copyCode: 'Copy code',
      copied: 'Copied!',
      leave: 'Leave',
      time: 'Time left',
    },
    howTo: {
      openLabel: 'How to play',
      title: 'How to play',
      steps: [
        'Everyone shares one secret keyword — except one player, the liar, who never sees the word but is told which category it belongs to.',
        'Players take turns drawing the keyword on the shared canvas. Each turn has a brush budget and a 10-second timer.',
        "The liar doesn't know the word, so they bluff off the category alone — drawing something plausible to blend in.",
        'Fool liar mode: the liar does NOT know they are the liar. They get a different keyword in the same category, and the round is about spotting whoever draws the odd one out.',
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
      roomFull: 'That room is full (8 players max). Try another, or spectate.',
    },
    inRoomLobby: {
      title: 'Waiting room',
      rounds: 'Rounds',
      turnsPerPlayer: 'Turns per player',
      gameMode: 'Liar mode',
      modeClassic: 'Classic',
      modeFool: 'Fool liar',
      drawMode: 'Drawing',
      drawEach: 'Each device',
      drawHost: 'One device',
      gameModeHelp: [
        {
          name: 'Classic',
          desc: 'The liar knows they are the liar and gets the category, but not the keyword — they bluff to blend in.',
        },
        {
          name: 'Fool liar',
          desc: "The liar does NOT know they are the liar: they get a different keyword in the same category. The round is about spotting whoever's drawing the odd one out.",
        },
      ],
      drawModeHelp: [
        {
          name: 'Each device',
          desc: 'Everyone draws on their own device. Best when each player has their own phone or laptop.',
        },
        {
          name: 'One device',
          desc: "The host device becomes a shared screen; players join by QR and check their role on their phone. Drawing happens only on the host screen, which never shows the host's own role.",
        },
      ],
      krCategories: 'Korean topics',
      krOn: 'On',
      krOff: 'Off',
      krCategoriesHelp: [
        {
          name: 'On',
          desc: 'Adds Korea-specific categories (Korean movies and people) to the keyword pool. This is the default — best when everyone knows Korean culture.',
        },
        {
          name: 'Off',
          desc: 'Uses only universal categories anyone can recognize.',
        },
      ],
      helpLabel: 'Show explanation',
      hostBadge: 'Host',
      makeHost: 'Make host',
      transferHostQ: (name) => `Hand the host role over to ${name}?`,
      cancel: 'Cancel',
      startGame: 'Start game',
      needMorePlayers: (n) =>
        `Need ${n} more player${n === 1 ? '' : 's'}`,
      waiting: 'Waiting for host to start…',
      spectatorsLabel: (n) => `${n} spectator${n === 1 ? '' : 's'}`,
    },
    hostMode: {
      lobbyScreenNote:
        'This device is the shared screen — it does not play. Players join by scanning the QR.',
      scanToJoin: 'Scan to join on your phone',
      screenTitle: 'Shared drawing screen',
      drawHerePhone: "Your role is on this phone — draw on the host's screen.",
      nextUp: 'Next up',
      startTurn: (name) => `Start ${name}'s turn`,
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
      timerLabel: 'Time left',
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
      youAreLiar: 'Liar',
      keyword: 'Keyword',
      category: 'Category',
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
      selfSub: 'One try.',
      submit: 'Submit guess',
      placeholder: 'e.g. lighthouse',
      answerAnyLanguage: 'Any language is accepted.',
    },
    roundEnd: {
      title: (n, total) => `Round ${n} / ${total}`,
      outcomeCaughtGuessed: (liar, keyword) =>
        `${liar} was caught but still guessed "${keyword}".`,
      outcomeCaughtBlanked: (liar, guess, keyword) =>
        `${liar} was caught and guessed "${guess}". The keyword was "${keyword}".`,
      outcomeEscapedGuessed: (liar, keyword) =>
        `The liar (${liar}) bluffed past you and knew it was "${keyword}".`,
      outcomeEscapedBlanked: (liar, guess, keyword) =>
        `${liar} bluffed past you but guessed "${guess}" — it was "${keyword}".`,
      foolKeyword: (liar, liarWord) =>
        `${liar} was secretly given "${liarWord}".`,
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
