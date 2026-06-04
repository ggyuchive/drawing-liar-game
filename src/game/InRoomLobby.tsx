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
  const ready = presences.length >= MIN_PLAYERS;

  return (
    <div className="lobbyIn">
      <h2 className="lobbyIn__title">Waiting room</h2>

      <ul className="lobbyIn__roster">
        {presences.map(({ clientID, presence }) => (
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

      {isHost ? (
        <div className="lobbyIn__hostBox">
          <div className="lobbyIn__configRow">
            <label className="lobbyIn__configCell">
              Rounds
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
              Turns per player
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
          <button
            className="lobbyIn__start"
            onClick={onStart}
            disabled={!ready}
          >
            {ready
              ? 'Start game'
              : `Need ${MIN_PLAYERS - presences.length} more player${
                  MIN_PLAYERS - presences.length === 1 ? '' : 's'
                }`}
          </button>
        </div>
      ) : (
        <p className="lobbyIn__waiting">Waiting for host to start…</p>
      )}
    </div>
  );
}
