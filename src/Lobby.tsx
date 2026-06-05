import { useState } from 'react';
import { LOCALE_LIST, useLocale, useT } from './i18n';
import { generateRoomCode, normalizeRoomCode } from './util';

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

  const handleCreate = () => {
    if (!trimmedName) return;
    onEnter(trimmedName, generateRoomCode());
  };

  const handleJoin = () => {
    const code = normalizeRoomCode(room);
    if (!trimmedName || !code) return;
    onEnter(trimmedName, code);
  };

  return (
    <div className="lobby">
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

        <div className="lobby__joinRow">
          <input
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value.toUpperCase())}
            placeholder={t.roomCodePlaceholder}
            maxLength={8}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleJoin();
            }}
          />
          <button onClick={handleJoin} disabled={!trimmedName || !room.trim()}>
            {t.join}
          </button>
        </div>
      </div>
    </div>
  );
}
