import type { Locale } from '../types';

const ko: Locale = {
  code: 'ko',
  name: '한국어',

  keywords: {
    general: {
      name: '일반',
      words: [
        '성', '구름', '나침반', '왕관', '용', '안경',
        '기타', '모자', '연', '사다리', '등대', '피아노',
        '해적', '행성', '로봇', '로켓', '가위', '눈사람',
        '우주선', '잠수함', '망원경', '우산', '유니콘', '풍차',
      ],
    },
    food: {
      name: '음식',
      words: [
        '사과', '바나나', '파인애플', '피자', '샌드위치',
        '버섯', '선인장', '케이크', '도넛', '국수', '팬케이크',
        '팝콘',
      ],
    },
    nature: {
      name: '자연',
      words: [
        '숲', '섬', '산', '무지개', '나무', '화산',
        '폭포', '토네이도', '돌고래', '코끼리', '해파리', '문어',
      ],
    },
  },

  ui: {
    common: {
      copyCode: '코드 복사',
      copied: '복사됨!',
      leave: '나가기',
    },
    howTo: {
      openLabel: '게임 방법',
      title: '게임 방법',
      steps: [
        '한 명(라이어)을 제외한 모두가 같은 비밀 키워드를 공유합니다. 라이어는 키워드를 모릅니다.',
        '플레이어들이 번갈아 공유 캔버스에 키워드를 그립니다. 각 턴에는 잉크 한도와 10초 제한이 있습니다.',
        '라이어는 키워드를 모르니, 그럴듯하게 그려서 들키지 않도록 속입니다.',
        '그리기 턴이 끝나면 모두가 누가 라이어인지 투표합니다.',
        '지목된 사람이 공개되고, 라이어는 키워드를 한 번 추측합니다.',
        '점수는 라이어를 잡은 방과, 잘 속이고 키워드까지 맞힌 라이어에게 주어집니다. 마지막 라운드 후 최고 점수가 승리.',
        '측면의 플레이어를 클릭하면 그 사람의 선만 진하게 볼 수 있어요 — 라이어 찾기에 유용합니다.',
      ],
      close: '확인',
    },
    joinLobby: {
      tagline: '공유 캔버스에서 즐기는 라이어 그림 게임.',
      yourName: '닉네임',
      namePlaceholder: '예: 그림쟁이',
      createGame: '새 게임 만들기',
      orJoinWithCode: '또는 코드로 참가하기',
      roomCodePlaceholder: '방 코드',
      join: '참가',
      languageLabel: '언어',
    },
    inRoomLobby: {
      title: '대기실',
      rounds: '라운드 수',
      turnsPerPlayer: '플레이어당 턴',
      keywordLanguage: '키워드 언어',
      keywordDeck: '키워드 덱',
      startGame: '게임 시작',
      needMorePlayers: (n) => `${n}명 더 필요해요`,
      waiting: '방장이 시작하기를 기다리는 중…',
    },
    room: {
      roomLabel: '방',
      connecting: (code) => `${code} 방에 연결 중…`,
      missingApiKey:
        'VITE_YORKIE_API_KEY가 비어 있어요. .env.example을 .env로 복사하고 Yorkie API 키를 채워 주세요.',
      reconnecting: '다시 연결하는 중…',
      attachFailed: '방에 들어가지 못했어요. 연결을 확인하고 다시 시도해 주세요.',
      backToLobby: '로비로 돌아가기',
      nameTaken: (name) =>
        `"${name}" 닉네임은 이 방에서 이미 사용 중이에요. 다른 이름을 골라 주세요.`,
    },
    spectator: {
      banner: '관전 중 — 다음 라운드부터 함께해요.',
      votingTitle: '관전 중입니다',
      votingSub: '이번 라운드에 그린 플레이어들이 투표 중이에요. 잠시 기다려 주세요!',
    },
    canvas: {
      yourTurn: '내 차례 — 그려 보세요!',
      drawing: (name) => `${name} 님이 그리는 중…`,
      waiting: '대기 중…',
      brushLabel: '잉크',
      timerLabel: '시간',
      clearBoard: '보드 지우기',
      clearConfirm: '지울까요?',
      clearCancel: '취소',
    },
    chat: {
      title: '채팅',
      placeholder: '메시지를 입력하세요…',
      send: '보내기',
      empty: '아직 메시지가 없어요. 인사해 보세요!',
      typing: (name) => `${name} 님이 입력 중…`,
      typingMany: (n) => `${n}명이 입력 중…`,
      show: '채팅 열기',
      hide: '채팅 닫기',
    },
    hud: {
      yourRole: '내 역할',
      youAreLiar: '당신이 라이어입니다 — 들키지 마세요!',
      keyword: '키워드',
      drawer: '현재 차례',
      turn: '턴',
    },
    voting: {
      title: '라이어는 누구일까요?',
      votesIn: (n, m) => `투표 ${n} / ${m}`,
      youPicked: (name) => ` — ${name} 님 선택함`,
      voted: '투표함',
      reveal: '결과 공개',
      waitingForVotes: '모두의 투표를 기다리는 중…',
    },
    reveal: {
      title: '투표 결과',
      accusedLabel: '지목됨',
      theLiar: '라이어가 맞습니다!',
      notTheLiar: '라이어가 아닙니다.',
      continueAction: '계속',
    },
    guessing: {
      othersTitle: (name) => `${name} 님이 정답을 추측 중…`,
      othersSub: '라이어가 키워드를 한 번 맞혀 봅니다.',
      selfTitle: '키워드를 맞혀 보세요',
      selfSub: '단 한 번의 기회. 맞히면 점수를 되찾습니다.',
      submit: '정답 제출',
      placeholder: '예: 등대',
    },
    roundEnd: {
      title: (n, total) => `${n} / ${total} 라운드`,
      outcomeCaughtGuessed: (liar, keyword) =>
        `${liar} 님이 들켰지만 "${keyword}"를 맞혔습니다 — 모두 절반 점수.`,
      outcomeCaughtBlanked: (liar, guess, keyword) =>
        `${liar} 님이 들켰고 "${guess}"라고 답했습니다. 정답은 "${keyword}"였습니다. 모두의 완승!`,
      outcomeEscapedGuessed: (liar, keyword) =>
        `라이어(${liar} 님)가 완벽하게 속이고 "${keyword}"까지 맞혔습니다. 완벽한 라운드.`,
      outcomeEscapedBlanked: (liar, guess, keyword) =>
        `${liar} 님이 속이는 데는 성공했지만 "${guess}"라고 답했습니다 — 정답은 "${keyword}". 작은 위안.`,
      nextRound: '다음 라운드',
      seeFinal: '최종 순위 보기',
      waitingWrap: '방장이 마무리하기를 기다리는 중…',
      waitingNext: '방장이 다음 라운드 시작을 기다리는 중…',
    },
    finished: {
      title: '최종 순위',
      sub: (n) => `총 ${n} 라운드 진행`,
      playAgain: '다시 하기',
      waiting: '방장이 새 게임 시작을 기다리는 중…',
    },
  },
};

export default ko;
