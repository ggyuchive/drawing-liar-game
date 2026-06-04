import { useState } from 'react';
import { generateRoomCode, normalizeRoomCode } from './util';

type Props = {
  initialName: string;
  initialRoom: string;
  onEnter: (name: string, room: string) => void;
};

export default function Lobby({ initialName, initialRoom, onEnter }: Props) {
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
        <h1>drawing-liar-game</h1>
        <p className="lobby__tagline">
          A liar drawing game on a shared canvas.
        </p>

        <label className="lobby__label">
          Your name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. doodler"
            maxLength={20}
            autoFocus
          />
        </label>

        <button
          className="lobby__primary"
          onClick={handleCreate}
          disabled={!trimmedName}
        >
          Create a new game
        </button>

        <div className="lobby__divider">or join with a code</div>

        <div className="lobby__joinRow">
          <input
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value.toUpperCase())}
            placeholder="ROOM CODE"
            maxLength={8}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <button onClick={handleJoin} disabled={!trimmedName || !room.trim()}>
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
