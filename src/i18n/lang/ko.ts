import type { Locale } from '../types';

const ko: Locale = {
  code: 'ko',
  name: '한국어',

  keywords: [
    '사과', '바나나', '선인장', '성', '구름', '나침반',
    '왕관', '돌고래', '용', '코끼리', '숲', '안경',
    '기타', '모자', '섬', '해파리', '연', '사다리',
    '등대', '산', '버섯', '문어', '피아노',
    '파인애플', '해적', '피자', '행성', '무지개', '로봇',
    '로켓', '샌드위치', '가위', '눈사람', '우주선',
    '잠수함', '선글라스', '망원경', '토네이도', '나무',
    '우산', '유니콘', '화산', '폭포', '풍차',
  ],

  ui: {
    common: {
      copyLink: '링크 복사',
      leave: '나가기',
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
      startGame: '게임 시작',
      needMorePlayers: (n) => `${n}명 더 필요해요`,
      waiting: '방장이 시작하기를 기다리는 중…',
    },
    room: {
      roomLabel: '방',
      connecting: (code) => `${code} 방에 연결 중…`,
      error: (msg) => `오류: ${msg}`,
      missingApiKey:
        'VITE_YORKIE_API_KEY가 비어 있어요. .env.example을 .env로 복사하고 Yorkie API 키를 채워 주세요.',
    },
    canvas: {
      yourTurn: '내 차례 — 한 번에 한 선만.',
      drawing: (name) => `${name} 님이 그리는 중…`,
      waiting: '대기 중…',
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
      giveGuess: '라이어에게 정답 맞힐 기회를 주기',
      continueAction: '계속',
    },
    guessing: {
      othersTitle: (name) => `${name} 님이 정답을 추측 중…`,
      othersSub: '라이어는 키워드를 한 번 맞혀 라운드를 뒤집을 기회를 가집니다.',
      selfTitle: '들켰습니다 — 키워드를 맞혀 보세요',
      selfSub: '단 한 번의 기회. 맞히면 라운드를 뒤집습니다.',
      submit: '정답 제출',
      placeholder: '예: 등대',
    },
    roundEnd: {
      title: (n, total) => `${n} / ${total} 라운드`,
      outcomeCaughtRight: (liar, keyword) =>
        `${liar} 님이 들켰지만 "${keyword}"를 맞혔습니다 — 모두 절반 점수.`,
      outcomeCaughtWrong: (liar, guess, keyword) =>
        `${liar} 님이 들켰고 "${guess}"라고 답했습니다. 정답은 "${keyword}"였습니다.`,
      outcomeEscaped: (liar, keyword) =>
        `라이어(${liar} 님)가 빠져나갔습니다 — 키워드는 "${keyword}"였습니다.`,
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
