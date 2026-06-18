import type { CanvasPresence, Round } from '../types';
import { tallyVotes } from './state';

type Props = {
  round: Round;
  presences: Array<{ clientID: string; presence: CanvasPresence }>;
};

// The vote tally as horizontal bars, most-voted first. Shared by the
// reveal screen and the tie-break popup so both show the same result.
export default function VoteBars({ round, presences }: Props) {
  const { counts } = tallyVotes(round.votes);
  const nameFor = (id: string) =>
    presences.find((p) => p.presence.uid === id)?.presence.name ?? '???';

  const maxVotes = Math.max(0, ...Object.values(counts));
  const maxCount = Math.max(1, maxVotes);
  const barOrder = [...round.playerOrder].sort(
    (a, b) => (counts[b] ?? 0) - (counts[a] ?? 0),
  );

  return (
    <ul className="reveal__bars">
      {barOrder.map((id) => {
        const c = counts[id] ?? 0;
        const pct = (c / maxCount) * 100;
        // Highlight whoever leads (both/all of them when it's a tie).
        const isAccused = c === maxVotes && maxVotes > 0;
        return (
          <li key={id} className="reveal__bar">
            <span className="reveal__barName">{nameFor(id)}</span>
            <div className="reveal__barTrack">
              <div
                className={
                  isAccused
                    ? 'reveal__barFill reveal__barFill--accused'
                    : 'reveal__barFill'
                }
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="reveal__barCount">{c}</span>
          </li>
        );
      })}
    </ul>
  );
}
