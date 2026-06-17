import { useCallback, useEffect, useState } from 'react';
import Lobby from './Lobby';
import Room from './Room';
import { normalizeRoomCode } from './util';
import './App.css';
import './board.css';

type RouteState = {
  room: string | null;
  name: string;
  // True when we entered by JOINING/spectating (or via a shared link), so
  // the room must already exist; false when we just CREATED a new room.
  mustExist: boolean;
};

function readHash(): { room: string | null } {
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);
  const room = params.get('room');
  return { room: room ? normalizeRoomCode(room) : null };
}

function writeHash(room: string | null) {
  if (!room) {
    history.replaceState(null, '', window.location.pathname);
  } else {
    history.replaceState(null, '', `#room=${room}`);
  }
}

const NAME_KEY = 'drawing-liar-game.name';

// The active name is per-tab (sessionStorage), so two users testing in
// tabs of one browser don't clobber each other and a reload keeps the
// right name. localStorage is only a prefill default for a fresh tab.
function readName(): string {
  try {
    return sessionStorage.getItem(NAME_KEY) ?? localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeName(name: string) {
  try {
    sessionStorage.setItem(NAME_KEY, name);
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // storage unavailable — name just won't persist
  }
}

// Rooms we've already validly entered this tab, so a reload of our own
// room (even a solo one we just created) doesn't get re-checked and
// bounced. Cleared when we leave.
const ENTERED_KEY = 'drawing-liar-game.enteredRoom';
function markEntered(room: string) {
  try {
    sessionStorage.setItem(ENTERED_KEY, room);
  } catch {
    // ignore
  }
}
function wasEntered(room: string): boolean {
  try {
    return sessionStorage.getItem(ENTERED_KEY) === room;
  } catch {
    return false;
  }
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(() => {
    const room = readHash().room;
    return {
      room,
      name: readName(),
      // A room arriving from the URL must already exist — UNLESS it's one
      // we already entered in this tab (a reload of our own room).
      mustExist: !!room && !wasEntered(room),
    };
  });
  // Transient "that room doesn't exist" flag, shown on the lobby.
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const onHashChange = () => {
      const room = readHash().room;
      setRoute((r) => ({ ...r, room, mustExist: !!room && !wasEntered(room) }));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // From the lobby: `mustExist` is true for Join/Spectate, false for
  // Create (which intentionally opens a brand-new room).
  const handleEnter = useCallback(
    (name: string, room: string, mustExist: boolean) => {
      writeName(name);
      writeHash(room);
      setNotFound(false);
      // A freshly created room is valid by definition — remember it so a
      // reload while still alone doesn't bounce us.
      if (!mustExist) markEntered(room);
      setRoute({ room, name, mustExist });
    },
    [],
  );

  // Called once the room is confirmed real (another player is present, or
  // we created it), so reloads skip the existence check.
  const handleValidated = useCallback((room: string) => {
    markEntered(room);
  }, []);

  const handleLeave = useCallback((opts?: { notFound?: boolean }) => {
    try {
      sessionStorage.removeItem(ENTERED_KEY);
    } catch {
      // ignore
    }
    writeHash(null);
    if (opts?.notFound) setNotFound(true);
    setRoute((r) => ({ ...r, room: null, mustExist: false }));
  }, []);

  if (!route.room || !route.name) {
    return (
      <Lobby
        initialName={route.name}
        initialRoom={route.room ?? ''}
        onEnter={handleEnter}
        notFound={notFound}
        onDismissError={() => setNotFound(false)}
      />
    );
  }

  return (
    <Room
      room={route.room}
      name={route.name}
      mustExist={route.mustExist}
      onLeave={handleLeave}
      onValidated={handleValidated}
    />
  );
}
