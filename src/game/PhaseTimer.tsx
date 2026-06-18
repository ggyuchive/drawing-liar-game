import { useEffect, useState } from 'react';

type Props = {
  durationMs: number;
  // Changing this restarts the countdown (e.g. a new round's index).
  resetKey: string | number;
  label: string;
};

// A local countdown for the voting / guessing phases. Measured from
// the moment this client mounts the phase (skew-safe, same approach
// as TurnTimer); all time reads happen inside the interval effect.
export default function PhaseTimer({ durationMs, resetKey, label }: Props) {
  const [secs, setSecs] = useState(() => Math.ceil(durationMs / 1000));
  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => {
      const remaining = Math.max(0, startedAt + durationMs - Date.now());
      setSecs(Math.ceil(remaining / 1000));
    }, 200);
    return () => clearInterval(id);
  }, [resetKey, durationMs]);

  const level = secs <= 3 ? 'danger' : secs <= 5 ? 'warning' : 'ok';
  return (
    <div className={`timer timer--${level}`} aria-label={`${label} ${secs}s`}>
      {label && <span className="timer__label">{label}</span>}
      <span className="timer__value">⏱ 0:{String(secs).padStart(2, '0')}</span>
    </div>
  );
}
