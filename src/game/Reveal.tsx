import { useT } from '../i18n';
import type { CanvasPresence, Round } from '../types';
import { tallyVotes } from './state';

type Props = {
  round: Round;
  isHost: boolean;
  presences: Array<{ clientID: string; presence: CanvasPresence }>;
  onContinue: (accusedId: string, wasLiarCaught: boolean) => void;
};

export default function Reveal({
  round,
  isHost,
  presences,
  onContinue,
}: Props) {
  const t = useT().reveal;
  const { accusedId, counts } = tallyVotes(round.votes);
  const nameFor = (id: string) =>
    presences.find((p) => p.clientID === id)?.presence.name ?? '???';

  const wasLiarCaught = accusedId === round.liarId;
  const maxCount = Math.max(1, ...Object.values(counts));

  return (
    <div className="reveal">
      <h2 className="reveal__title">{t.title}</h2>

      <ul className="reveal__bars">
        {round.playerOrder.map((id) => {
          const c = counts[id] ?? 0;
          const pct = (c / maxCount) * 100;
          const isAccused = id === accusedId && c > 0;
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
        {t.accusedLabel}: <strong>{nameFor(accusedId)}</strong>
        {' — '}
        {wasLiarCaught ? t.theLiar : t.notTheLiar}
      </p>

      {isHost && (
        <button
          className="reveal__continue"
          onClick={() => onContinue(accusedId, wasLiarCaught)}
        >
          {wasLiarCaught ? t.giveGuess : t.continueAction}
        </button>
      )}
    </div>
  );
}
