import { deckListFor, LOCALE_LIST, useT } from '../i18n';
import type { GameConfig, CanvasPresence } from '../types';

const MIN_PLAYERS = 3;

type Props = {
  isHost: boolean;
  config: GameConfig;
  presences: Array<{ clientID: string; presence: CanvasPresence }>;
  onConfigChange: (next: Partial<GameConfig>) => void;
  onStart: () => void;
};

export default function InRoomLobby({
  isHost,
  config,
  presences,
  onConfigChange,
  onStart,
}: Props) {
  const t = useT().inRoomLobby;
  const players = presences.filter((p) => !p.presence.spectator);
  const spectatorCount = presences.length - players.length;
  const ready = players.length >= MIN_PLAYERS;
  const decks = deckListFor(config.keywordLanguage);

  return (
    <div className="lobbyIn">
      <h2 className="lobbyIn__title">{t.title}</h2>

      <ul className="lobbyIn__roster">
        {players.map(({ clientID, presence }) => (
          <li
            key={clientID}
            className="lobbyIn__rosterItem"
            style={{ borderColor: presence.color }}
          >
            <span
              className="lobbyIn__rosterDot"
              style={{ background: presence.color }}
            />
            {presence.name}
          </li>
        ))}
      </ul>
      {spectatorCount > 0 && (
        <p className="lobbyIn__spectators">
          👁 {t.spectatorsLabel(spectatorCount)}
        </p>
      )}

      {isHost ? (
        <div className="lobbyIn__hostBox">
          <div className="lobbyIn__configRow">
            <label className="lobbyIn__configCell">
              {t.rounds}
              <input
                type="number"
                min={1}
                max={10}
                value={config.totalRounds}
                onChange={(e) =>
                  onConfigChange({
                    totalRounds: Math.max(1, Number(e.target.value) || 1),
                  })
                }
              />
            </label>
            <label className="lobbyIn__configCell">
              {t.turnsPerPlayer}
              <input
                type="number"
                min={1}
                max={5}
                value={config.turnsPerPlayer}
                onChange={(e) =>
                  onConfigChange({
                    turnsPerPlayer: Math.max(1, Number(e.target.value) || 1),
                  })
                }
              />
            </label>
          </div>
          <div className="lobbyIn__configRow">
            <label className="lobbyIn__configCell">
              {t.keywordLanguage}
              <select
                value={config.keywordLanguage}
                onChange={(e) =>
                  onConfigChange({ keywordLanguage: e.target.value })
                }
              >
                {LOCALE_LIST.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="lobbyIn__configCell">
              {t.keywordDeck}
              <select
                value={config.keywordDeck}
                onChange={(e) =>
                  onConfigChange({ keywordDeck: e.target.value })
                }
              >
                {decks.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            className="lobbyIn__start"
            onClick={onStart}
            disabled={!ready}
          >
            {ready
              ? t.startGame
              : t.needMorePlayers(MIN_PLAYERS - players.length)}
          </button>
        </div>
      ) : (
        <p className="lobbyIn__waiting">{t.waiting}</p>
      )}
    </div>
  );
}
