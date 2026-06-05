import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import type { GameConfig, Round } from '../types';

type Props = {
  round: Round;
  config: GameConfig;
};

// Counts down locally from the moment this client observes the turn
// start, re-anchoring whenever the turn changes. Mirrors the
// auto-advance logic in Room (also local), so it stays correct
// regardless of clock differences between devices. All time reads
// happen inside the effect (never during render).
export default function TurnTimer({ round, config }: Props) {
  const t = useT().canvas;
  const turnTimeMs = config.turnTimeMs > 0 ? config.turnTimeMs : 10_000;
  const turnKey = `${round.turnStartedAt}:${round.turnIndex}`;

  const [secs, setSecs] = useState(() => Math.ceil(turnTimeMs / 1000));
  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => {
      const remaining = Math.max(0, startedAt + turnTimeMs - Date.now());
      setSecs(Math.ceil(remaining / 1000));
    }, 100);
    return () => clearInterval(id);
  }, [turnKey, turnTimeMs]);

  const level = secs <= 3 ? 'danger' : secs <= 5 ? 'warning' : 'ok';

  return (
    <div
      className={`timer timer--${level}`}
      aria-label={`${t.timerLabel} ${secs}s`}
    >
      <span className="timer__label">{t.timerLabel}</span>
      <span className="timer__value">⏱ 0:{String(secs).padStart(2, '0')}</span>
    </div>
  );
}
