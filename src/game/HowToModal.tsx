import { useEffect } from 'react';
import { useT } from '../i18n';

type Props = {
  onClose: () => void;
};

export default function HowToModal({ onClose }: Props) {
  const t = useT().howTo;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="howto__backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
    >
      <div className="howto__card" onClick={(e) => e.stopPropagation()}>
        <h2 className="howto__title">{t.title}</h2>
        <ol className="howto__steps">
          {t.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <button className="howto__close" onClick={onClose} autoFocus>
          {t.close}
        </button>
      </div>
    </div>
  );
}
