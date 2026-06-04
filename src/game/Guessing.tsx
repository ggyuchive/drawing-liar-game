import { useState } from 'react';
import type { CanvasPresence, Round } from '../types';
import { normalizeGuess } from './state';

type Props = {
  round: Round;
  myActorID: string | null;
  presences: Array<{ clientID: string; presence: CanvasPresence }>;
  onSubmit: (guess: string, correct: boolean) => void;
};

export default function Guessing({
  round,
  myActorID,
  presences,
  onSubmit,
}: Props) {
  const [guess, setGuess] = useState('');
  const isLiar = !!myActorID && myActorID === round.liarId;
  const liarName =
    presences.find((p) => p.clientID === round.liarId)?.presence.name ?? '???';

  const handleSubmit = () => {
    if (!isLiar) return;
    if (!guess.trim()) return;
    const correct = normalizeGuess(guess) === normalizeGuess(round.keyword);
    onSubmit(guess, correct);
  };

  if (!isLiar) {
    return (
      <div className="guessing">
        <h2 className="guessing__title">{liarName} is guessing…</h2>
        <p className="guessing__sub">
          The liar gets one shot at the keyword to steal the round back.
        </p>
      </div>
    );
  }

  return (
    <div className="guessing">
      <h2 className="guessing__title">You were caught — guess the keyword</h2>
      <p className="guessing__sub">
        One try. Get it right and you steal the round.
      </p>
      <div className="guessing__row">
        <input
          type="text"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder="e.g. lighthouse"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        <button
          className="guessing__submit"
          onClick={handleSubmit}
          disabled={!guess.trim()}
        >
          Submit guess
        </button>
      </div>
    </div>
  );
}
