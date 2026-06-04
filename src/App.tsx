import { useEffect, useState } from 'react';
import Lobby from './Lobby';
import Room from './Room';
import { normalizeRoomCode } from './util';
import './App.css';

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

export default function App() {
  const [route, setRoute] = useState<RouteState>(() => ({
    room: readHash().room,
    name: localStorage.getItem('drawing-liar-game.name') ?? '',
  }));

  useEffect(() => {
    const onHashChange = () => {
      setRoute((r) => ({ ...r, room: readHash().room }));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleEnter = (name: string, room: string) => {
    localStorage.setItem('drawing-liar-game.name', name);
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
