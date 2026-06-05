import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  YorkieProvider,
  DocumentProvider,
  useDocument,
  type JSONArray,
  type JSONObject,
} from '@yorkie-js/react';
import { StreamConnectionStatus } from '@yorkie-js/sdk';
import Canvas from './Canvas';
import BoardView from './game/BoardView';
import BrushMeter from './game/BrushMeter';
import Chat from './game/Chat';
import HowToModal from './game/HowToModal';
import TurnTimer from './game/TurnTimer';
import InRoomLobby from './game/InRoomLobby';
import Finished from './game/Finished';
import Guessing from './game/Guessing';
import Reveal from './game/Reveal';
import RoundEnd from './game/RoundEnd';
import RoundHud from './game/RoundHud';
import Voting from './game/Voting';
import { applyScores, shuffle, tallyVotes } from './game/state';
import {
  assignColors,
  electHost,
  fillMissingColors,
  isSpectator,
  nameIsTaken,
  pickPlayerOrder,
  resolveTurnAdvance,
} from './game/engine';
import { LOCALE_LIST, pickKeyword, useLocale, useT } from './i18n';
import type {
  CanvasPresence,
  ChatMessage,
  Game,
  GameConfig,
  Stroke,
} from './types';
import {
  DEFAULT_BRUSH_BUDGET_PX,
  DEFAULT_TURN_TIME_MS,
  initialGame,
} from './types';
import {
  dedupeByUid,
  getSessionUid,
  PLAYER_COLORS,
  randomPlayerColor,
} from './util';

type Props = {
  room: string;
  name: string;
  onLeave: () => void;
};

type DocRoot = {
  game: JSONObject<Game>;
  strokes: JSONArray<JSONObject<Stroke>>;
  chat: JSONArray<JSONObject<ChatMessage>>;
};

const API_ADDR =
  import.meta.env.VITE_YORKIE_API_ADDR ?? 'https://api.yorkie.dev';
const API_KEY = import.meta.env.VITE_YORKIE_API_KEY ?? '';

function RoomInner({
  room,
  myUid,
  onLeave,
}: {
  room: string;
  myUid: string;
  onLeave: () => void;
}) {
  const { root, presences, update, loading, error, connection } = useDocument<
    DocRoot,
    CanvasPresence
  >();
  // Identity is the stable per-tab uid carried in presence, not the
  // connection-scoped Yorkie actorID/clientID (which changes on every
  // reload/reconnect and would orphan all game state keyed on it).
  const myActorID = myUid;
  const t = useT();
  const { locale, setLocaleCode } = useLocale();
  const [chatOpen, setChatOpen] = useState(true);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [howToOpen, setHowToOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ready = !loading && !error;
  const hostId = ready ? root.game.hostId : '';
  const disconnected = connection === StreamConnectionStatus.Disconnected;

  // Host election + promotion. The host is the lexicographically
  // smallest present uid. This both seeds the first host and re-elects
  // when the current host's tab is gone — every client computes the
  // same survivor, and only that survivor writes, so concurrent CRDT
  // writes converge.
  useEffect(() => {
    if (loading || error || !myActorID) return;
    const elected = electHost(
      presences.map((p) => p.presence.uid),
      hostId,
    );
    // No change needed, or it's not my job to write it.
    if (!elected || elected === hostId || myActorID !== elected) return;
    update((r) => {
      r.game.hostId = elected;
    });
  }, [loading, error, myActorID, hostId, presences, update]);

  // Adopt the color the game assigned to me. Colors are assigned in
  // the document at game start (so they're distinct and stable for
  // the whole game); each client copies its own into presence so the
  // rest of the UI keeps reading presence.color.
  const myAssignedColor =
    ready && myActorID ? root.game.colors?.[myActorID] : undefined;
  const myPresenceColor = presences.find(
    (p) => p.presence.uid === myActorID,
  )?.presence.color;
  useEffect(() => {
    if (!myAssignedColor || myPresenceColor === myAssignedColor) return;
    update((_r, presence) => {
      presence.set({ color: myAssignedColor });
    });
  }, [myAssignedColor, myPresenceColor, update]);

  // Advance the drawing turn: bump strokesDone, rotate to the next
  // drawer (resetting the brush budget + timer anchor) or move to
  // voting. Shared by the drawer's pointer-up and the deadline timer.
  const advanceTurn = useCallback(() => {
    update((r) => {
      if (r.game.phase !== 'drawing') return;
      const order = r.game.round.playerOrder;
      if (order.length === 0) return;
      const adv = resolveTurnAdvance(
        r.game.round.strokesDone,
        r.game.round.turnIndex,
        order.length,
        r.game.config.turnsPerPlayer,
      );
      r.game.round.strokesDone = adv.strokesDone;
      if (adv.toVoting) {
        r.game.phase = 'voting';
      } else {
        r.game.round.turnIndex = adv.turnIndex;
        r.game.round.brushUsedPx = 0;
        r.game.round.turnStartedAt = Date.now();
      }
    });
  }, [update]);

  // Turn auto-advance, measured LOCALLY. Each client counts the full
  // turn time from the moment it observes the turn start (keyed on
  // turnStartedAt), instead of subtracting a document wall-clock from
  // its own clock. Cross-device clock skew would otherwise make the
  // remaining time negative and fire instantly, cascading every turn
  // straight into voting.
  const phase = ready ? root.game.phase : 'lobby';
  const turnStartedAt = ready ? root.game.round.turnStartedAt : 0;
  const turnIndex = ready ? root.game.round.turnIndex : 0;
  const turnTimeMs =
    ready && root.game.config.turnTimeMs > 0
      ? root.game.config.turnTimeMs
      : DEFAULT_TURN_TIME_MS;

  // Whether this client should write the advance when the timer fires
  // — the drawer, or the host if the drawer has left. Held in refs so
  // presence changes don't reset the running countdown.
  const roundOrder = ready ? root.game.round.playerOrder : [];
  const drawerId =
    roundOrder.length > 0
      ? roundOrder[turnIndex % roundOrder.length] ?? ''
      : '';
  const drawerPresent = presences.some((p) => p.presence.uid === drawerId);
  const advanceTurnRef = useRef(advanceTurn);
  const shouldAdvanceRef = useRef(false);
  useEffect(() => {
    advanceTurnRef.current = advanceTurn;
    shouldAdvanceRef.current =
      phase === 'drawing' &&
      !!myActorID &&
      (myActorID === drawerId || (!drawerPresent && myActorID === hostId));
  });

  useEffect(() => {
    if (loading || error) return;
    if (phase !== 'drawing') return;
    if (!turnStartedAt) return;
    const id = setTimeout(() => {
      if (shouldAdvanceRef.current) advanceTurnRef.current();
    }, turnTimeMs);
    return () => clearTimeout(id);
  }, [loading, error, phase, turnStartedAt, turnIndex, turnTimeMs]);

  if (loading) {
    return <div className="room__status">{t.room.connecting(room)}</div>;
  }
  if (error) {
    return (
      <div className="room__status room__status--error">
        <p>{t.room.attachFailed}</p>
        <button className="room__backToLobby" onClick={onLeave}>
          {t.room.backToLobby}
        </button>
      </div>
    );
  }

  const uniquePresences = dedupeByUid(presences);
  const myName =
    uniquePresences.find((p) => p.presence.uid === myActorID)?.presence.name ??
    '';
  // Reject a duplicate name. Both clashing clients see each other; the
  // one with the larger uid bounces, so exactly one of them does.
  const nameClash =
    !!myActorID &&
    nameIsTaken(
      uniquePresences.map((p) => ({
        clientID: p.presence.uid,
        name: p.presence.name,
      })),
      myActorID,
      myName,
    );
  if (nameClash) {
    return (
      <div className="room__status room__status--error">
        <p>{t.room.nameTaken(myName)}</p>
        <button className="room__backToLobby" onClick={onLeave}>
          {t.room.backToLobby}
        </button>
      </div>
    );
  }

  const suppressTyping =
    !!myActorID &&
    myActorID === root.game.round.liarId &&
    root.game.phase === 'guessing';

  // Side profiles: the round's players (or everyone in the lobby),
  // capped at 8. Filled left, right, left, right… so the columns
  // grow evenly.
  const order = root.game.round.playerOrder;
  const profileSource = order.length
    ? order
        .map((id) => uniquePresences.find((p) => p.presence.uid === id))
        .filter(
          (p): p is { clientID: string; presence: CanvasPresence } => !!p,
        )
    : uniquePresences;
  const profiles = profileSource.slice(0, 8);
  const leftProfiles = profiles.filter((_, i) => i % 2 === 0);
  const rightProfiles = profiles.filter((_, i) => i % 2 === 1);
  const showScores = root.game.phase !== 'lobby';

  const renderProfile = (presence: CanvasPresence) => {
    const uid = presence.uid;
    const active = highlightId === uid;
    return (
      <button
        key={uid}
        className={active ? 'profile profile--active' : 'profile'}
        style={{ borderColor: presence.color }}
        onClick={() => setHighlightId((cur) => (cur === uid ? null : uid))}
        aria-pressed={active}
      >
        <span
          className="profile__dot"
          style={{ background: presence.color }}
        />
        <span className="profile__name">
          {presence.name}
          {uid === myActorID ? ' (me)' : ''}
        </span>
        {showScores && (
          <span className="profile__score">
            {root.game.scores[uid] ?? 0}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="room">
      <header className="room__header">
        <div className="room__title">
          <span className="room__label">{t.room.roomLabel}</span>
          <code className="room__code">{room}</code>
          <button
            className="room__copy"
            onClick={() => {
              navigator.clipboard.writeText(room).catch(() => {});
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? t.common.copied : t.common.copyCode}
          </button>
          {disconnected && (
            <span className="room__reconnecting" role="status">
              {t.room.reconnecting}
            </span>
          )}
        </div>
        <div className="room__headerRight">
          <button
            className="room__help"
            onClick={() => setHowToOpen(true)}
            aria-label={t.howTo.openLabel}
          >
            ?
          </button>
          <select
            className="room__lang"
            value={locale.code}
            onChange={(e) => setLocaleCode(e.target.value)}
            aria-label="Language"
          >
            {LOCALE_LIST.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
          <button
            className="room__chatToggle"
            onClick={() => setChatOpen((o) => !o)}
            aria-pressed={chatOpen}
          >
            {chatOpen ? t.chat.hide : t.chat.show}
          </button>
          <button className="room__leave" onClick={onLeave}>
            {t.common.leave}
          </button>
        </div>
      </header>

      <div className="room__body">
        <aside className="room__profiles room__profiles--left">
          {leftProfiles.map(({ presence }) => renderProfile(presence))}
        </aside>
        <main className="room__main">{renderPhase()}</main>
        <aside className="room__profiles room__profiles--right">
          {rightProfiles.map(({ presence }) => renderProfile(presence))}
        </aside>
        {chatOpen && (
          <Chat
            myActorID={myActorID}
            presences={uniquePresences}
            suppressTyping={suppressTyping}
          />
        )}
      </div>

      {howToOpen && <HowToModal onClose={() => setHowToOpen(false)} />}
    </div>
  );

  function renderPhase() {
    const isHost = !!myActorID && myActorID === root.game.hostId;
    const myColor =
      uniquePresences.find((p) => p.presence.uid === myActorID)?.presence
        .color ?? '#1f2937';
    // A player who joined mid-round isn't in playerOrder. They watch
    // until the next round snapshots presences into a fresh order.
    const spectating = isSpectator(
      root.game.phase,
      root.game.round.playerOrder,
      myActorID,
    );
    const onConfigChange = (next: Partial<GameConfig>) => {
      if (!isHost) return;
      update((r) => {
        if (next.totalRounds !== undefined) {
          r.game.config.totalRounds = next.totalRounds;
        }
        if (next.turnsPerPlayer !== undefined) {
          r.game.config.turnsPerPlayer = next.turnsPerPlayer;
        }
        if (next.keywordLanguage !== undefined) {
          r.game.config.keywordLanguage = next.keywordLanguage;
        }
        if (next.keywordDeck !== undefined) {
          r.game.config.keywordDeck = next.keywordDeck;
        }
      });
    };
    // The finished drawing stays visible (read-only) beside the
    // judging screens, with the active local highlight applied.
    const withBoard = (node: ReactNode) => (
      <div className="phase phase--judge">
        <BoardView strokes={root.strokes} highlightId={highlightId} />
        <div className="phase__panel">{node}</div>
      </div>
    );
    const onStart = () => {
      if (!isHost) return;
      // First 8 by join order play; later joiners stay spectators.
      // Shuffle only the chosen players for a fair turn order.
      const order = pickPlayerOrder(
        uniquePresences.map((p) => p.presence.uid),
        shuffle,
      );
      if (order.length < 3) return;
      const liarId = order[Math.floor(Math.random() * order.length)];
      update((r) => {
        // Heal config fields that an older document may be missing,
        // so the new game starts with a real timer and brush budget.
        if (!(r.game.config.turnTimeMs > 0)) {
          r.game.config.turnTimeMs = DEFAULT_TURN_TIME_MS;
        }
        if (!(r.game.config.brushBudgetPx > 0)) {
          r.game.config.brushBudgetPx = DEFAULT_BRUSH_BUDGET_PX;
        }
        r.game.round = {
          index: 1,
          keyword: pickKeyword(
            r.game.config.keywordLanguage,
            r.game.config.keywordDeck,
          ),
          liarId,
          playerOrder: order,
          turnIndex: 0,
          strokesDone: 0,
          votes: {},
          liarGuess: '',
          guessCorrect: false,
          wasCaught: false,
          brushBudgetPx: r.game.config.brushBudgetPx,
          brushUsedPx: 0,
          turnStartedAt: Date.now(),
        };
        while (r.strokes.length > 0) r.strokes.delete?.(0);
        r.game.scores = Object.fromEntries(order.map((id) => [id, 0]));
        // Fresh, distinct color per player for the whole game.
        r.game.colors = assignColors(order, shuffle(PLAYER_COLORS));
        r.game.phase = 'drawing';
      });
    };

    switch (root.game.phase) {
      case 'lobby':
        return (
          <InRoomLobby
            isHost={isHost}
            config={root.game.config}
            presences={uniquePresences}
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
            for (const p of uniquePresences) {
              fresh.scores[p.presence.uid] = 0;
            }
            r.game = fresh as unknown as JSONObject<Game>;
            while (r.strokes.length > 0) r.strokes.delete?.(0);
            while (r.chat.length > 0) r.chat.delete?.(0);
          });
        };
        return (
          <Finished
            game={root.game}
            isHost={isHost}
            presences={uniquePresences}
            onPlayAgain={onPlayAgain}
          />
        );
      }
      case 'reveal': {
        // Always advance to guessing; the accused's identity only
        // decides the scoring branch, computed at guess-submit time.
        const onContinue = () => {
          if (!isHost) return;
          update((r) => {
            r.game.phase = 'guessing';
          });
        };
        return withBoard(
          <Reveal
            round={root.game.round}
            isHost={isHost && !spectating}
            presences={uniquePresences}
            onContinue={onContinue}
          />,
        );
      }
      case 'guessing': {
        const onSubmit = (guess: string, correct: boolean) => {
          if (!myActorID) return;
          if (myActorID !== root.game.round.liarId) return;
          update((r) => {
            const { accusedId } = tallyVotes(r.game.round.votes);
            const caught = accusedId === r.game.round.liarId;
            r.game.round.liarGuess = guess;
            r.game.round.guessCorrect = correct;
            r.game.round.wasCaught = caught;
            r.game.scores = applyScores(
              { caught, guessed: correct },
              r.game.round.playerOrder,
              r.game.round.liarId,
              r.game.scores,
            );
            r.game.phase = 'roundEnd';
          });
        };
        return withBoard(
          <Guessing
            round={root.game.round}
            myActorID={myActorID}
            presences={uniquePresences}
            onSubmit={onSubmit}
          />,
        );
      }
      case 'roundEnd': {
        const onNext = () => {
          if (!isHost) return;
          const order = pickPlayerOrder(
            uniquePresences.map((p) => p.presence.uid),
            shuffle,
          );
          if (order.length < 3) return;
          const liarId = order[Math.floor(Math.random() * order.length)];
          update((r) => {
            const nextIndex = r.game.round.index + 1;
            r.game.round = {
              index: nextIndex,
              keyword: pickKeyword(
                r.game.config.keywordLanguage,
                r.game.config.keywordDeck,
              ),
              liarId,
              playerOrder: order,
              turnIndex: 0,
              strokesDone: 0,
              votes: {},
              liarGuess: '',
              guessCorrect: false,
              wasCaught: false,
              brushBudgetPx: r.game.config.brushBudgetPx,
              brushUsedPx: 0,
              turnStartedAt: Date.now(),
            };
            while (r.strokes.length > 0) r.strokes.delete?.(0);
            for (const id of order) {
              if (!(id in r.game.scores)) r.game.scores[id] = 0;
            }
            // Keep existing players' colors; give any newcomer an
            // unused one so the per-game assignment stays stable.
            r.game.colors = fillMissingColors(
              order,
              { ...r.game.colors },
              PLAYER_COLORS,
            );
            r.game.phase = 'drawing';
          });
        };
        const onFinish = () => {
          if (!isHost) return;
          update((r) => {
            r.game.phase = 'finished';
          });
        };
        return withBoard(
          <RoundEnd
            game={root.game}
            isHost={isHost && !spectating}
            presences={uniquePresences}
            onNext={onNext}
            onFinish={onFinish}
          />,
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
        if (spectating) {
          return withBoard(
            <div className="spectator">
              <h2 className="spectator__title">{t.spectator.votingTitle}</h2>
              <p className="spectator__sub">{t.spectator.votingSub}</p>
            </div>,
          );
        }
        return withBoard(
          <Voting
            round={root.game.round}
            myActorID={myActorID}
            isHost={isHost}
            presences={uniquePresences}
            onVote={onVote}
            onReveal={onReveal}
          />,
        );
      }
      case 'drawing': {
        const { playerOrder, turnIndex } = root.game.round;
        const drawerId = playerOrder[turnIndex % playerOrder.length] ?? '';
        const isMyTurn = !!myActorID && myActorID === drawerId;
        const drawerName =
          uniquePresences.find((p) => p.presence.uid === drawerId)?.presence
            .name ?? '';
        const onStrokeEnd = () => {
          if (!isMyTurn) return;
          advanceTurn();
        };
        const onClearBoard = () => {
          if (!isHost) return;
          update((r) => {
            while (r.strokes.length > 0) r.strokes.delete?.(0);
            r.game.round.strokesDone = 0;
            r.game.round.turnIndex = 0;
            r.game.round.brushUsedPx = 0;
            r.game.round.turnStartedAt = Date.now();
          });
        };
        return (
          <div className="phase">
            {spectating && (
              <div className="spectator__banner">{t.spectator.banner}</div>
            )}
            <RoundHud
              round={root.game.round}
              config={root.game.config}
              myActorID={myActorID}
              presences={uniquePresences}
            />
            <div className="phase__gauges">
              <BrushMeter round={root.game.round} />
              <TurnTimer round={root.game.round} config={root.game.config} />
            </div>
            <Canvas
              strokes={root.strokes}
              isMyTurn={isMyTurn}
              drawerName={drawerName}
              isHost={isHost}
              myUid={myActorID}
              myColor={myColor}
              highlightId={highlightId}
              onStrokeEnd={onStrokeEnd}
              onClearBoard={onClearBoard}
            />
          </div>
        );
      }
      default:
        return null;
    }
  }
}

function MissingApiKeyHint() {
  const t = useT();
  return <div className="room__status">{t.room.missingApiKey}</div>;
}

export default function Room({ room, name, onLeave }: Props) {
  const myColor = useMemo(() => randomPlayerColor(), []);
  // Stable per-tab identity; survives reload and reconnect.
  const myUid = useMemo(() => getSessionUid(), []);

  if (!API_KEY) {
    return <MissingApiKeyHint />;
  }

  return (
    <YorkieProvider apiKey={API_KEY} rpcAddr={API_ADDR}>
      <DocumentProvider<DocRoot, CanvasPresence>
        docKey={`drawing-liar-game-${room}`}
        initialRoot={
          {
            game: initialGame(),
            strokes: [],
            chat: [],
          } as unknown as DocRoot
        }
        initialPresence={{ uid: myUid, name, color: myColor, typing: false }}
      >
        <RoomInner room={room} myUid={myUid} onLeave={onLeave} />
      </DocumentProvider>
    </YorkieProvider>
  );
}
