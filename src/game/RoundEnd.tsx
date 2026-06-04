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
  const { round, scores, config } = game;
  const nameFor = (id: string) =>
    presences.find((p) => p.clientID === id)?.presence.name ?? '???';

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const liarName = nameFor(round.liarId);
  const lastRound = round.index >= config.totalRounds;

  let outcomeText: string;
  if (round.liarGuess) {
    outcomeText = round.guessCorrect
      ? `${liarName} was caught but guessed "${round.keyword}" — half marks all round.`
      : `${liarName} was caught and guessed "${round.liarGuess}". The real keyword was "${round.keyword}".`;
  } else {
    outcomeText = `The liar (${liarName}) slipped past — keyword was "${round.keyword}".`;
  }

  return (
    <div className="roundEnd">
      <h2 className="roundEnd__title">
        Round {round.index} / {config.totalRounds}
      </h2>
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
            See final ranking
          </button>
        ) : (
          <button className="roundEnd__primary" onClick={onNext}>
            Next round
          </button>
        )
      ) : (
        <p className="roundEnd__waiting">
          {lastRound
            ? 'Waiting for host to wrap up…'
            : 'Waiting for host to start the next round…'}
        </p>
      )}
    </div>
  );
}
