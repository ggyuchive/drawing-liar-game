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
  const nameFor = (id: string) =>
    presences.find((p) => p.clientID === id)?.presence.name ?? '???';
  const ranked = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
  const winnerScore = ranked[0]?.[1] ?? 0;

  return (
    <div className="finished">
      <h2 className="finished__title">Final ranking</h2>
      <p className="finished__sub">
        {game.config.totalRounds} round{game.config.totalRounds === 1 ? '' : 's'}
        {' '}played
      </p>

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
          Play again
        </button>
      ) : (
        <p className="finished__waiting">Waiting for host to start a new game…</p>
      )}
    </div>
  );
}
