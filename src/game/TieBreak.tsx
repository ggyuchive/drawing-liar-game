import { useT } from '../i18n';
import { TIEBREAK_TIME_MS, type Round } from '../types';
import PhaseTimer from './PhaseTimer';

type Props = {
  round: Round;
};

// Popup shown when a vote ends with no clear accusation (a tie, or
// nobody voted). It announces the one extra cycle and counts down to
// resuming the drawing — the host owns the actual phase flip.
export default function TieBreak({ round }: Props) {
  const t = useT().tiebreak;
  return (
    <div className="tiebreak">
      <div className="tiebreak__card">
        <div className="tiebreak__badge" aria-hidden="true">
          ⚖️
        </div>
        <h2 className="tiebreak__title">{t.title}</h2>
        <p className="tiebreak__sub">{t.sub}</p>
        <PhaseTimer
          durationMs={TIEBREAK_TIME_MS}
          resetKey={round.index}
          label={t.resumeIn}
        />
      </div>
    </div>
  );
}
