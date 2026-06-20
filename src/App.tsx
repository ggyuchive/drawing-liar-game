import { useCallback, useEffect, useState } from 'react';
import Lobby from './Lobby';
import Room from './Room';
import { normalizeRoomCode } from './util';
import './App.css';
import './board.css';

type RouteState = {
  room: string | null;
  name: string;
  // Joined/shared-link → room must already exist; created → false.
  mustExist: boolean;
  // True once the name is confirmed in the lobby. A shared #room= link
  // starts false so we route through the lobby to pick a nickname instead
  // of joining under a cached one.
  entered: boolean;
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

// Active name is per-tab (sessionStorage) so tabs don't clobber each
// other; localStorage is only a prefill default for a fresh tab.
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

// Rooms validly entered this tab, so a reload of our own room isn't
// re-checked and bounced. Cleared on leave.
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
      // A URL room must exist, unless it's a reload of our own room.
      mustExist: !!room && !wasEntered(room),
      entered: !!room && wasEntered(room),
    };
  });
  // Transient join error, shown on the lobby ("not found" / "room full").
  const [joinError, setJoinError] = useState<'notFound' | 'full' | null>(null);

  useEffect(() => {
    const onHashChange = () => {
      const room = readHash().room;
      setRoute((r) => ({
        ...r,
        room,
        mustExist: !!room && !wasEntered(room),
        entered: !!room && wasEntered(room),
      }));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleEnter = useCallback(
    (name: string, room: string, mustExist: boolean) => {
      writeName(name);
      writeHash(room);
      setJoinError(null);
      // A created room is valid by definition — remember it so a reload
      // while still alone doesn't bounce us.
      if (!mustExist) markEntered(room);
      setRoute({ room, name, mustExist, entered: true });
    },
    [],
  );

  // Confirmed real (a peer is present) → reloads skip the existence check.
  const handleValidated = useCallback((room: string) => {
    markEntered(room);
  }, []);

  const handleLeave = useCallback(
    (opts?: { notFound?: boolean; full?: boolean }) => {
      try {
        sessionStorage.removeItem(ENTERED_KEY);
      } catch {
        // ignore
      }
      writeHash(null);
      if (opts?.full) setJoinError('full');
      else if (opts?.notFound) setJoinError('notFound');
      setRoute((r) => ({ ...r, room: null, mustExist: false, entered: false }));
    },
    [],
  );

  // Enter only after the name is confirmed (or re-entering our own room);
  // a bare #room= link still stops at the lobby to pick a nickname.
  if (!route.room || !route.name || !route.entered) {
    return (
      <Lobby
        initialName={route.name}
        initialRoom={route.room ?? ''}
        onEnter={handleEnter}
        joinError={joinError}
        onDismissError={() => setJoinError(null)}
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
