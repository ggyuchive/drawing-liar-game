import { useT } from '../i18n';
import type { CanvasPresence, Game } from '../types';

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
  const { round, scores, config } = game;
  const nameFor = (id: string) =>
    presences.find((p) => p.presence.uid === id)?.presence.name ?? '???';

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const liarName = nameFor(round.liarId);
  const lastRound = round.index >= config.totalRounds;

  // Four cells of the 2×2 table (caught × guessed).
  let outcomeText: string;
  if (round.wasCaught) {
    outcomeText = round.guessCorrect
      ? t.outcomeCaughtGuessed(liarName, round.keyword)
      : t.outcomeCaughtBlanked(liarName, round.liarGuess, round.keyword);
  } else {
    outcomeText = round.guessCorrect
      ? t.outcomeEscapedGuessed(liarName, round.keyword)
      : t.outcomeEscapedBlanked(liarName, round.liarGuess, round.keyword);
  }

  return (
    <div className="roundEnd">
      <h2 className="roundEnd__title">{t.title(round.index, config.totalRounds)}</h2>
      <p className="roundEnd__outcome">{outcomeText}</p>

      <ul className="roundEnd__scoreboard">
        {ranked.map(([id, score], idx) => (
          <li key={id} className="roundEnd__row">
            <span className="roundEnd__rank">{idx + 1}</span>
            <span className="roundEnd__name">{nameFor(id)}</span>
            <span className="roundEnd__score">{score}</span>
          </li>
        ))}
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
