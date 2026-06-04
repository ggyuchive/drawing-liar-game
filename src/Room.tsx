import { useEffect, useMemo } from 'react';
import {
  YorkieProvider,
  DocumentProvider,
  useDocument,
  type JSONArray,
  type JSONObject,
} from '@yorkie-js/react';
import Canvas from './Canvas';
import InRoomLobby from './game/InRoomLobby';
import Finished from './game/Finished';
import Guessing from './game/Guessing';
import Reveal from './game/Reveal';
import RoundEnd from './game/RoundEnd';
import RoundHud from './game/RoundHud';
import Voting from './game/Voting';
import { applyScores, shuffle } from './game/state';
import { useActorID } from './game/useActorID';
import { pickKeyword } from './data/keywords';
import type { CanvasPresence, Game, GameConfig, Stroke } from './types';
import { initialGame } from './types';
import { randomColor } from './util';

type Props = {
  room: string;
  name: string;
  onLeave: () => void;
};

type DocRoot = {
  game: JSONObject<Game>;
  strokes: JSONArray<JSONObject<Stroke>>;
};

const API_ADDR =
  import.meta.env.VITE_YORKIE_API_ADDR ?? 'https://api.yorkie.dev';
const API_KEY = import.meta.env.VITE_YORKIE_API_KEY ?? '';

function RoomInner({ room, onLeave }: { room: string; onLeave: () => void }) {
  const { root, presences, update, loading, error } = useDocument<
    DocRoot,
    CanvasPresence
  >();
  const myActorID = useActorID();
  const hostId = !loading && !error ? root.game.hostId : '';

  useEffect(() => {
    if (loading || error) return;
    if (!myActorID) return;
    if (hostId) return;
    update((r) => {
      if (!r.game.hostId) {
        r.game.hostId = myActorID;
      }
    });
  }, [loading, error, myActorID, hostId, update]);

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

      <main className="room__main">{renderPhase()}</main>
    </div>
  );

  function renderPhase() {
    const isHost = !!myActorID && myActorID === root.game.hostId;
    const onConfigChange = (next: Partial<GameConfig>) => {
      if (!isHost) return;
      update((r) => {
        if (next.totalRounds !== undefined) {
          r.game.config.totalRounds = next.totalRounds;
        }
        if (next.turnsPerPlayer !== undefined) {
          r.game.config.turnsPerPlayer = next.turnsPerPlayer;
        }
      });
    };
    const onStart = () => {
      if (!isHost) return;
      const order = shuffle(presences.map((p) => p.clientID));
      if (order.length < 3) return;
      const liarId = order[Math.floor(Math.random() * order.length)];
      update((r) => {
        r.game.round = {
          index: 1,
          keyword: pickKeyword(),
          liarId,
          playerOrder: order,
          turnIndex: 0,
          strokesThisTurn: 0,
          strokesDone: 0,
          votes: {},
          liarGuess: '',
          guessCorrect: false,
        };
        while (r.strokes.length > 0) r.strokes.delete?.(0);
        r.game.scores = Object.fromEntries(order.map((id) => [id, 0]));
        r.game.phase = 'drawing';
      });
    };

    switch (root.game.phase) {
      case 'lobby':
        return (
          <InRoomLobby
            isHost={isHost}
            config={root.game.config}
            presences={presences}
            onConfigChange={onConfigChange}
            onStart={onStart}
          />
        );
      case 'finished': {
        const onPlayAgain = () => {
          if (!isHost) return;
          update((r) => {
            const fresh = initialGame();
            fresh.hostId = r.game.hostId;
            for (const p of presences) {
              fresh.scores[p.clientID] = 0;
            }
            r.game = fresh as unknown as JSONObject<Game>;
            while (r.strokes.length > 0) r.strokes.delete?.(0);
          });
        };
        return (
          <Finished
            game={root.game}
            isHost={isHost}
            presences={presences}
            onPlayAgain={onPlayAgain}
          />
        );
      }
      case 'reveal': {
        const onContinue = (_accusedId: string, wasLiarCaught: boolean) => {
          if (!isHost) return;
          update((r) => {
            if (wasLiarCaught) {
              r.game.phase = 'guessing';
              return;
            }
            r.game.scores = applyScores(
              'liarEscaped',
              r.game.round.playerOrder,
              r.game.round.liarId,
              r.game.scores,
            );
            r.game.phase = 'roundEnd';
          });
        };
        return (
          <Reveal
            round={root.game.round}
            isHost={isHost}
            presences={presences}
            onContinue={onContinue}
          />
        );
      }
      case 'guessing': {
        const onSubmit = (guess: string, correct: boolean) => {
          if (!myActorID) return;
          if (myActorID !== root.game.round.liarId) return;
          update((r) => {
            r.game.round.liarGuess = guess;
            r.game.round.guessCorrect = correct;
            r.game.scores = applyScores(
              correct ? 'liarCaughtGuessRight' : 'liarCaughtGuessWrong',
              r.game.round.playerOrder,
              r.game.round.liarId,
              r.game.scores,
            );
            r.game.phase = 'roundEnd';
          });
        };
        return (
          <Guessing
            round={root.game.round}
            myActorID={myActorID}
            presences={presences}
            onSubmit={onSubmit}
          />
        );
      }
      case 'roundEnd': {
        const onNext = () => {
          if (!isHost) return;
          const order = shuffle(presences.map((p) => p.clientID));
          if (order.length < 3) return;
          const liarId = order[Math.floor(Math.random() * order.length)];
          update((r) => {
            const nextIndex = r.game.round.index + 1;
            r.game.round = {
              index: nextIndex,
              keyword: pickKeyword(),
              liarId,
              playerOrder: order,
              turnIndex: 0,
              strokesThisTurn: 0,
              strokesDone: 0,
              votes: {},
              liarGuess: '',
              guessCorrect: false,
            };
            while (r.strokes.length > 0) r.strokes.delete?.(0);
            for (const id of order) {
              if (!(id in r.game.scores)) r.game.scores[id] = 0;
            }
            r.game.phase = 'drawing';
          });
        };
        const onFinish = () => {
          if (!isHost) return;
          update((r) => {
            r.game.phase = 'finished';
          });
        };
        return (
          <RoundEnd
            game={root.game}
            isHost={isHost}
            presences={presences}
            onNext={onNext}
            onFinish={onFinish}
          />
        );
      }
      case 'voting': {
        const onVote = (suspectId: string) => {
          if (!myActorID) return;
          if (!root.game.round.playerOrder.includes(myActorID)) return;
          update((r) => {
            r.game.round.votes[myActorID] = suspectId;
          });
        };
        const onReveal = () => {
          if (!isHost) return;
          const allIn =
            Object.keys(root.game.round.votes).length >=
            root.game.round.playerOrder.length;
          if (!allIn) return;
          update((r) => {
            r.game.phase = 'reveal';
          });
        };
        return (
          <Voting
            round={root.game.round}
            myActorID={myActorID}
            isHost={isHost}
            presences={presences}
            onVote={onVote}
            onReveal={onReveal}
          />
        );
      }
      case 'drawing': {
        const { playerOrder, turnIndex } = root.game.round;
        const drawerId = playerOrder[turnIndex % playerOrder.length] ?? '';
        const isMyTurn = !!myActorID && myActorID === drawerId;
        const drawerName =
          presences.find((p) => p.clientID === drawerId)?.presence.name ?? '';
        const onStrokeEnd = () => {
          if (!isMyTurn) return;
          update((r) => {
            const totalTurns =
              r.game.round.playerOrder.length * r.game.config.turnsPerPlayer;
            r.game.round.strokesDone = r.game.round.strokesDone + 1;
            if (r.game.round.strokesDone >= totalTurns) {
              r.game.phase = 'voting';
            } else {
              r.game.round.turnIndex =
                (r.game.round.turnIndex + 1) % r.game.round.playerOrder.length;
            }
          });
        };
        return (
          <div className="phase">
            <RoundHud
              round={root.game.round}
              config={root.game.config}
              myActorID={myActorID}
              presences={presences}
            />
            <Canvas
              strokes={root.strokes}
              isMyTurn={isMyTurn}
              drawerName={drawerName}
              onStrokeEnd={onStrokeEnd}
            />
          </div>
        );
      }
      default:
        return null;
    }
  }
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
        initialRoot={
          {
            game: initialGame(),
            strokes: [],
          } as unknown as DocRoot
        }
        initialPresence={{ name, color: myColor }}
      >
        <RoomInner room={room} onLeave={onLeave} />
      </DocumentProvider>
    </YorkieProvider>
  );
}
