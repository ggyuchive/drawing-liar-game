import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import type { GameConfig, Round } from '../types';

type Props = {
  round: Round;
  config: GameConfig;
};

// Local countdown, re-anchored on each turn change — mirrors Room's
// auto-advance so clock skew between devices doesn't matter.
export default function TurnTimer({ round, config }: Props) {
  const t = useT().canvas;
  const turnTimeMs = config.turnTimeMs > 0 ? config.turnTimeMs : 10_000;
  const turnKey = `${round.turnStartedAt}:${round.turnIndex}`;

  // turnStartedAt 0 = pending host handoff; freeze at full time.
  const pending = round.turnStartedAt === 0;
  const [secs, setSecs] = useState(() => Math.ceil(turnTimeMs / 1000));
  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => {
      if (pending) {
        setSecs(Math.ceil(turnTimeMs / 1000));
        return;
      }
      const remaining = Math.max(0, startedAt + turnTimeMs - Date.now());
      setSecs(Math.ceil(remaining / 1000));
    }, 100);
    return () => clearInterval(id);
  }, [turnKey, turnTimeMs, pending]);

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
