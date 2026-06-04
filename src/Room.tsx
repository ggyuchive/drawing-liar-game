import { useMemo } from 'react';
import {
  YorkieProvider,
  DocumentProvider,
  useDocument,
  type JSONArray,
  type JSONObject,
} from '@yorkie-js/react';
import Canvas from './Canvas';
import type { CanvasPresence, Stroke } from './types';
import { randomColor } from './util';

type Props = {
  room: string;
  name: string;
  onLeave: () => void;
};

type DocRoot = {
  strokes: JSONArray<JSONObject<Stroke>>;
};

const API_ADDR =
  import.meta.env.VITE_YORKIE_API_ADDR ?? 'https://api.yorkie.dev';
const API_KEY = import.meta.env.VITE_YORKIE_API_KEY ?? '';

function RoomInner({ room, onLeave }: { room: string; onLeave: () => void }) {
  const { root, presences, loading, error } = useDocument<
    DocRoot,
    CanvasPresence
  >();

  if (loading) {
    return <div className="room__status">Connecting to room {room}…</div>;
  }
  if (error) {
    return <div className="room__status">Error: {error.message}</div>;
  }

  return (
    <div className="room">
      <header className="room__header">
        <div className="room__title">
          <span className="room__label">Room</span>
          <code className="room__code">{room}</code>
          <button
            className="room__copy"
            onClick={() => {
              navigator.clipboard
                .writeText(window.location.href)
                .catch(() => {});
            }}
          >
            Copy link
          </button>
        </div>
        <div className="room__players">
          {presences.map(({ clientID, presence }) => (
            <span
              key={clientID}
              className="room__player"
              style={{ borderColor: presence.color }}
            >
              <span
                className="room__playerDot"
                style={{ background: presence.color }}
              />
              {presence.name}
            </span>
          ))}
        </div>
        <button className="room__leave" onClick={onLeave}>
          Leave
        </button>
      </header>

      <main className="room__main">
        <Canvas strokes={root.strokes} />
      </main>
    </div>
  );
}

export default function Room({ room, name, onLeave }: Props) {
  const myColor = useMemo(() => randomColor(), []);

  if (!API_KEY) {
    return (
      <div className="room__status">
        Missing <code>VITE_YORKIE_API_KEY</code>. Copy <code>.env.example</code>{' '}
        to <code>.env</code> and fill in your Yorkie API key.
      </div>
    );
  }

  return (
    <YorkieProvider apiKey={API_KEY} rpcAddr={API_ADDR}>
      <DocumentProvider<DocRoot, CanvasPresence>
        docKey={`drawing-liar-game-${room}`}
        initialRoot={{ strokes: [] as unknown as JSONArray<JSONObject<Stroke>> }}
        initialPresence={{ name, color: myColor }}
      >
        <RoomInner room={room} onLeave={onLeave} />
      </DocumentProvider>
    </YorkieProvider>
  );
}
