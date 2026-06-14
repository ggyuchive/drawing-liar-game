import { useEffect, useState } from 'react';
import { LOCALE_LIST, useLocale, useT } from './i18n';
import { fetchActiveCounts, type ActiveCounts } from './rooms';
import {
  generateRoomCode,
  normalizeRoomCode,
  setSessionSpectator,
} from './util';

const REPO_URL = 'https://github.com/ggyuchive/drawing-liar-game';

type Props = {
  initialName: string;
  initialRoom: string;
  onEnter: (name: string, room: string) => void;
};

export default function Lobby({ initialName, initialRoom, onEnter }: Props) {
  const t = useT().joinLobby;
  const { locale, setLocaleCode } = useLocale();
  const [name, setName] = useState(initialName);
  const [room, setRoom] = useState(initialRoom);
  const trimmedName = name.trim();

  // Live active room + user counts (from the backend in prod; demo
  // numbers under plain `pnpm dev` so the badge is verifiable).
  const [counts, setCounts] = useState<ActiveCounts | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchActiveCounts().then((c) => {
        if (!cancelled) setCounts(c);
      });
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const handleCreate = () => {
    if (!trimmedName) return;
    // The room creator becomes host, so they always play (never spectate).
    setSessionSpectator(false);
    onEnter(trimmedName, generateRoomCode());
  };

  const handleJoin = (asSpectator: boolean) => {
    const code = normalizeRoomCode(room);
    if (!trimmedName || !code) return;
    setSessionSpectator(asSpectator);
    onEnter(trimmedName, code);
  };

  return (
    <div className="lobby">
      {/* Top-right cluster: live counts, then the GitHub link. */}
      <div className="lobby__topRight">
        {counts !== null && (
          <span className="lobby__active">
            <span className="lobby__activeDot" />
            {t.activeCount(counts.rooms, counts.users)}
          </span>
        )}
        <a
          className="lobby__github"
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="View source on GitHub"
        >
          <svg
            viewBox="0 0 16 16"
            width="24"
            height="24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
      </div>
      <div className="lobby__card">
        <div className="lobby__topRow">
          <h1>Drawing Liar Game</h1>
          <label className="lobby__lang">
            <span className="lobby__langLabel">{t.languageLabel}</span>
            <select
              value={locale.code}
              onChange={(e) => setLocaleCode(e.target.value)}
            >
              {LOCALE_LIST.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="lobby__tagline">{t.tagline}</p>

        <label className="lobby__label">
          {t.yourName}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.namePlaceholder}
            maxLength={20}
            autoFocus
          />
        </label>

        <button
          className="lobby__primary"
          onClick={handleCreate}
          disabled={!trimmedName}
        >
          {t.createGame}
        </button>

        <div className="lobby__divider">{t.orJoinWithCode}</div>

        <input
          className="lobby__roomInput"
          type="text"
          value={room}
          onChange={(e) => setRoom(e.target.value.toUpperCase())}
          placeholder={t.roomCodePlaceholder}
          maxLength={8}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing)
              handleJoin(false);
          }}
        />
        <div className="lobby__joinButtons">
          <button
            className="lobby__join"
            onClick={() => handleJoin(false)}
            disabled={!trimmedName || !room.trim()}
          >
            {t.join}
          </button>
          <button
            className="lobby__spectate"
            onClick={() => handleJoin(true)}
            disabled={!trimmedName || !room.trim()}
          >
            {t.spectate}
          </button>
        </div>
      </div>
    </div>
  );
}
