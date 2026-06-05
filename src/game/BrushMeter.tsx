import { useT } from '../i18n';
import type { Round } from '../types';

type Props = {
  round: Round;
};

// Reads depletion straight from the document so every peer — not
// just the drawer — sees the same meter tick down in real time.
export default function BrushMeter({ round }: Props) {
  const t = useT().canvas;
  const budget = round.brushBudgetPx || 1;
  const pct = Math.max(0, Math.min(1, 1 - round.brushUsedPx / budget));
  const level = pct <= 0.2 ? 'danger' : pct <= 0.5 ? 'warning' : 'ok';

  return (
    <div className="meter" aria-label={t.brushLabel}>
      <span className="meter__label">{t.brushLabel}</span>
      <div className="meter__track">
        <div
          className={`meter__fill meter__fill--${level}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className="meter__pct">{Math.round(pct * 100)}%</span>
    </div>
  );
}
