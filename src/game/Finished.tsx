import { useT } from '../i18n';
import type { CanvasPresence, Game } from '../types';

type Props = {
  game: Game;
  isHost: boolean;
  presences: Array<{ clientID: string; presence: CanvasPresence }>;
  onPlayAgain: () => void;
};

export default function Finished({
  game,
  isHost,
  presences,
  onPlayAgain,
}: Props) {
  const t = useT().finished;
  const nameFor = (id: string) =>
    presences.find((p) => p.presence.uid === id)?.presence.name ?? '???';
  const ranked = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
  const winnerScore = ranked[0]?.[1] ?? 0;

  return (
    <div className="finished">
      <h2 className="finished__title">{t.title}</h2>
      <p className="finished__sub">{t.sub(game.config.totalRounds)}</p>

      <ul className="finished__board">
        {ranked.map(([id, score], idx) => {
          const isWinner = score === winnerScore && score > 0;
          return (
            <li
              key={id}
              className={
                isWinner
                  ? 'finished__row finished__row--winner'
                  : 'finished__row'
              }
            >
              <span className="finished__rank">{idx + 1}</span>
              <span className="finished__name">
                {nameFor(id)}
                {isWinner && <span className="finished__crown">★</span>}
              </span>
              <span className="finished__score">{score}</span>
            </li>
          );
        })}
      </ul>

      {isHost ? (
        <button className="finished__primary" onClick={onPlayAgain}>
          {t.playAgain}
        </button>
      ) : (
        <p className="finished__waiting">{t.waiting}</p>
      )}
    </div>
  );
}
