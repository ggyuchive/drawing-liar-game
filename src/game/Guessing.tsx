import { useState } from 'react';
import { useT } from '../i18n';
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
  const t = useT().guessing;
  const [guess, setGuess] = useState('');
  const isLiar = !!myActorID && myActorID === round.liarId;
  const liarName =
    presences.find((p) => p.presence.uid === round.liarId)?.presence.name ?? '???';

  const handleSubmit = () => {
    if (!isLiar) return;
    if (!guess.trim()) return;
    const correct = normalizeGuess(guess) === normalizeGuess(round.keyword);
    onSubmit(guess, correct);
  };

  if (!isLiar) {
    return (
      <div className="guessing">
        <h2 className="guessing__title">{t.othersTitle(liarName)}</h2>
        <p className="guessing__sub">{t.othersSub}</p>
      </div>
    );
  }

  return (
    <div className="guessing">
      <h2 className="guessing__title">{t.selfTitle}</h2>
      <p className="guessing__sub">{t.selfSub}</p>
      <div className="guessing__row">
        <input
          type="text"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder={t.placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSubmit();
          }}
          autoFocus
        />
        <button
          className="guessing__submit"
          onClick={handleSubmit}
          disabled={!guess.trim()}
        >
          {t.submit}
        </button>
      </div>
    </div>
  );
}
