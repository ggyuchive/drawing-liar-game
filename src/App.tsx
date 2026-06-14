import { useEffect, useState } from 'react';
import Lobby from './Lobby';
import Room from './Room';
import { normalizeRoomCode } from './util';
import './App.css';
import './board.css';

type RouteState = {
  room: string | null;
  name: string;
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

export default function App() {
  const [route, setRoute] = useState<RouteState>(() => ({
    room: readHash().room,
    name: readName(),
  }));

  useEffect(() => {
    const onHashChange = () => {
      setRoute((r) => ({ ...r, room: readHash().room }));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleEnter = (name: string, room: string) => {
    writeName(name);
    writeHash(room);
    setRoute({ room, name });
  };

  const handleLeave = () => {
    writeHash(null);
    setRoute((r) => ({ ...r, room: null }));
  };

  if (!route.room || !route.name) {
    return (
      <Lobby
        initialName={route.name}
        initialRoom={route.room ?? ''}
        onEnter={handleEnter}
      />
    );
  }

  return <Room room={route.room} name={route.name} onLeave={handleLeave} />;
}
