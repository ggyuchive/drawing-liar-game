import { useT } from '../i18n';
import { REVEAL_TIME_MS, type CanvasPresence, type Round } from '../types';
import PhaseTimer from './PhaseTimer';
import VoteBars from './VoteBars';
import { tallyVotes } from './state';

type Props = {
  round: Round;
  presences: Array<{ clientID: string; presence: CanvasPresence }>;
};

export default function Reveal({ round, presences }: Props) {
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

  return (
    <div className="reveal">
      <h2 className="reveal__title">{t.title}</h2>

      <VoteBars round={round} presences={presences} />

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

      <div className="reveal__next">
        <PhaseTimer
          durationMs={REVEAL_TIME_MS}
          resetKey={round.index}
          label={t.guessIn}
        />
      </div>
    </div>
  );
}
