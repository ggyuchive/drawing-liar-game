import { useT } from '../i18n';
import { TIEBREAK_TIME_MS, type CanvasPresence, type Round } from '../types';
import PhaseTimer from './PhaseTimer';
import VoteBars from './VoteBars';

type Props = {
  round: Round;
  presences: Array<{ clientID: string; presence: CanvasPresence }>;
};

// Popup shown when a vote ends with no clear accusation (a tie, or
// nobody voted). It announces the one extra cycle, shows the inconclusive
// vote result, and counts down to resuming — the host owns the phase flip.
export default function TieBreak({ round, presences }: Props) {
  const t = useT().tiebreak;
  return (
    <div className="tiebreak">
      <div className="tiebreak__card">
        <div className="tiebreak__badge" aria-hidden="true">
          ⚖️
        </div>
        <h2 className="tiebreak__title">{t.title}</h2>
        <p className="tiebreak__sub">{t.sub}</p>
        <div className="tiebreak__votes">
          <VoteBars round={round} presences={presences} />
        </div>
        <PhaseTimer
          durationMs={TIEBREAK_TIME_MS}
          resetKey={round.index}
          label={t.resumeIn}
        />
      </div>
    </div>
  );
}
