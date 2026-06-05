import { useState } from 'react';
import { LOCALE_LIST, useT } from '../i18n';
import { GUESS_TIME_MS } from '../types';
import type { CanvasPresence, Round } from '../types';
import PhaseTimer from './PhaseTimer';
import { normalizeGuess } from './state';

type Props = {
  round: Round;
  myActorID: string | null;
  keywordLanguage: string;
  presences: Array<{ clientID: string; presence: CanvasPresence }>;
  onSubmit: (guess: string, correct: boolean) => void;
};

export default function Guessing({
  round,
  myActorID,
  keywordLanguage,
  presences,
  onSubmit,
}: Props) {
  const ui = useT();
  const t = ui.guessing;
  const langName =
    LOCALE_LIST.find((l) => l.code === keywordLanguage)?.name ?? keywordLanguage;
  const [guess, setGuess] = useState('');
  const isLiar = !!myActorID && myActorID === round.liarId;
  const liarName =
    presences.find((p) => p.presence.uid === round.liarId)?.presence.name ?? '???';
  const timer = (
    <PhaseTimer
      durationMs={GUESS_TIME_MS}
      resetKey={round.index}
      label={ui.common.time}
    />
  );

  const handleSubmit = () => {
    if (!isLiar) return;
    if (!guess.trim()) return;
    const correct = normalizeGuess(guess) === normalizeGuess(round.keyword);
    onSubmit(guess, correct);
  };

  if (!isLiar) {
    return (
      <div className="guessing">
        <div className="guessing__head">
          <h2 className="guessing__title">{t.othersTitle(liarName)}</h2>
          {timer}
        </div>
        <p className="guessing__sub">{t.othersSub}</p>
      </div>
    );
  }

  return (
    <div className="guessing">
      <div className="guessing__head">
        <h2 className="guessing__title">{t.selfTitle}</h2>
        {timer}
      </div>
      <p className="guessing__sub">{t.selfSub}</p>
      <p className="guessing__lang">{t.answerIn(langName)}</p>
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
