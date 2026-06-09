import { keywordAt, useLocale, useT } from '../i18n';
import type { CanvasPresence, Game } from '../types';
import { roundDeltas } from './state';

type Props = {
  game: Game;
  isHost: boolean;
  presences: Array<{ clientID: string; presence: CanvasPresence }>;
  onNext: () => void;
  onFinish: () => void;
};

export default function RoundEnd({
  game,
  isHost,
  presences,
  onNext,
  onFinish,
}: Props) {
  const t = useT().roundEnd;
  const { locale } = useLocale();
  const { round, scores, config } = game;
  const nameFor = (id: string) =>
    presences.find((p) => p.presence.uid === id)?.presence.name ?? '???';
  // Reveal the keyword in the viewer's own language.
  const shownKeyword = round.keywordDeck
    ? keywordAt(locale.code, round.keywordDeck, round.keywordIndex)
    : round.keyword;

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const liarName = nameFor(round.liarId);
  const lastRound = round.index >= config.totalRounds;

  // Points each player gained this round, so the board shows
  // "previous + gained" and the running total is visibly accumulating.
  const gained = roundDeltas(
    { caught: round.wasCaught, guessed: round.guessCorrect },
    round.playerOrder,
    round.liarId,
  );

  // Four cells of the 2×2 table (caught × guessed).
  let outcomeText: string;
  if (round.wasCaught) {
    outcomeText = round.guessCorrect
      ? t.outcomeCaughtGuessed(liarName, shownKeyword)
      : t.outcomeCaughtBlanked(liarName, round.liarGuess, shownKeyword);
  } else {
    outcomeText = round.guessCorrect
      ? t.outcomeEscapedGuessed(liarName, shownKeyword)
      : t.outcomeEscapedBlanked(liarName, round.liarGuess, shownKeyword);
  }

  return (
    <div className="roundEnd">
      <h2 className="roundEnd__title">{t.title(round.index, config.totalRounds)}</h2>
      <p className="roundEnd__outcome">{outcomeText}</p>

      <ul className="roundEnd__scoreboard">
        {ranked.map(([id, score]) => {
          const delta = gained[id] ?? 0;
          const prev = score - delta;
          // Standard competition ranking: tied scores share a rank
          // (e.g. 1, 2, 2, 4). `ranked` is sorted descending, so the
          // first index of this score is its rank.
          const rank = ranked.findIndex(([, s]) => s === score) + 1;
          return (
            <li key={id} className="roundEnd__row">
              <span className="roundEnd__rank">{rank}</span>
              <span className="roundEnd__name">{nameFor(id)}</span>
              <span className="roundEnd__score">
                {prev}
                <span className="roundEnd__delta"> + {delta}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {isHost ? (
        lastRound ? (
          <button className="roundEnd__primary" onClick={onFinish}>
            {t.seeFinal}
          </button>
        ) : (
          <button className="roundEnd__primary" onClick={onNext}>
            {t.nextRound}
          </button>
        )
      ) : (
        <p className="roundEnd__waiting">
          {lastRound ? t.waitingWrap : t.waitingNext}
        </p>
      )}
    </div>
  );
}
