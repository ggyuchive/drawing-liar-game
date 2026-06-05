import { useT } from '../i18n';
import type { CanvasPresence, Round } from '../types';
import { tallyVotes } from './state';

type Props = {
  round: Round;
  isHost: boolean;
  presences: Array<{ clientID: string; presence: CanvasPresence }>;
  onContinue: () => void;
};

export default function Reveal({
  round,
  isHost,
  presences,
  onContinue,
}: Props) {
  const t = useT().reveal;
  const { counts } = tallyVotes(round.votes);
  const nameFor = (id: string) =>
    presences.find((p) => p.presence.uid === id)?.presence.name ?? '???';

  const maxVotes = Math.max(0, ...Object.values(counts));
  const topIds = round.playerOrder.filter(
    (id) => (counts[id] ?? 0) === maxVotes && maxVotes > 0,
  );
  // A single clear accusation only when exactly one player leads.
  const singleAccused = topIds.length === 1 ? topIds[0] : '';
  const wasLiarCaught = !!singleAccused && singleAccused === round.liarId;
  const maxCount = Math.max(1, maxVotes);

  return (
    <div className="reveal">
      <h2 className="reveal__title">{t.title}</h2>

      <ul className="reveal__bars">
        {round.playerOrder.map((id) => {
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

      <p className="reveal__verdict">
        {singleAccused ? (
          <>
            {t.accusedLabel}: <strong>{nameFor(singleAccused)}</strong>
            {' — '}
            {wasLiarCaught ? t.theLiar : t.notTheLiar}
          </>
        ) : (
          t.tie
        )}
      </p>

      {isHost && (
        <button className="reveal__continue" onClick={() => onContinue()}>
          {t.continueAction}
        </button>
      )}
    </div>
  );
}
