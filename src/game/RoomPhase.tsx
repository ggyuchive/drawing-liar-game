import { useEffect, useRef, type ReactNode } from 'react';
import { useDocument, type JSONObject } from '@yorkie-js/react';
import Canvas from '../Canvas';
import BoardView from './BoardView';
import BrushMeter from './BrushMeter';
import TurnTimer from './TurnTimer';
import InRoomLobby from './InRoomLobby';
import Finished from './Finished';
import Guessing from './Guessing';
import Reveal from './Reveal';
import RoundEnd from './RoundEnd';
import TieBreak from './TieBreak';
import RoundHud, { type HudRole } from './RoundHud';
import Voting from './Voting';
import { startRound } from './secrets';
import { applyScores, shuffle, tallyVotes } from './state';
import {
  assignColors,
  fillMissingColors,
  isSpectator,
  pickPlayerOrder,
} from './engine';
import { deckSizes, useLocale, useT } from '../i18n';
import {
  DEFAULT_BRUSH_BUDGET_PX,
  DEFAULT_TURN_TIME_MS,
  ROUNDEND_TIME_MS,
  initialGame,
} from '../types';
import type { CanvasPresence, Game, GameConfig, Round } from '../types';
import { PLAYER_COLORS, nowMs } from '../util';
import type { DocRoot } from '../Room';

type Presences = Array<{ clientID: string; presence: CanvasPresence }>;

type ServerRole = {
  roundId: string;
  isLiar: boolean;
  keywordDeck: string;
  keywordIndex: number;
} | null;

// Optional only in the insecure DEV fallback (see secrets.ts).
type Assignment =
  | { liarId: string; deck: string; keywordIndex: number; liarKeywordIndex: number }
  | undefined;

// Build a fresh round, shared by the first and each next round.
function freshRound(
  index: number,
  roundId: string,
  assigned: Assignment,
  order: string[],
  config: GameConfig,
): Round {
  return {
    index,
    roundId,
    // deck/index/liar stay empty in secure mode, set by the dev fallback.
    keyword: '',
    keywordDeck: assigned ? assigned.deck : '',
    keywordIndex: assigned ? assigned.keywordIndex : -1,
    liarKeywordIndex: assigned ? assigned.liarKeywordIndex : -1,
    liarId: assigned ? assigned.liarId : '',
    playerOrder: order,
    turnIndex: 0,
    turnsPerPlayer: config.turnsPerPlayer,
    strokesDone: 0,
    votes: {},
    liarGuess: '',
    guessCorrect: false,
    wasCaught: false,
    tieBreakUsed: false,
    brushBudgetPx: config.brushBudgetPx,
    brushUsedPx: 0,
    turnStartedAt: nowMs(),
  };
}

type Props = {
  myActorID: string;
  room: string;
  uniquePresences: Presences;
  displayPresences: Presences;
  highlightId: string | null;
  advanceTurn: () => void;
  setRoundError: (v: boolean) => void;
  serverRole: ServerRole;
  docHasSecret: boolean;
  roundId: string;
  onRequestTransferHost: (uid: string) => void;
};

/**
 * Renders the play area for the current phase and owns the host's
 * phase-transition handlers. Split out of `Room`; reads the document via
 * `useDocument` under the same `DocumentProvider`.
 */
export default function RoomPhase({
  myActorID,
  room,
  uniquePresences,
  displayPresences,
  highlightId,
  advanceTurn,
  setRoundError,
  serverRole,
  docHasSecret,
  roundId,
  onRequestTransferHost,
}: Props) {
  const { root, update } = useDocument<DocRoot, CanvasPresence>();
  const t = useT();
  const { locale } = useLocale();

  const isHost = !!myActorID && myActorID === root.game.hostId;
  const myColor =
    uniquePresences.find((p) => p.presence.uid === myActorID)?.presence.color ??
    '#1f2937';
  // Joined mid-round (not in playerOrder) → watch until next round.
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
      if (next.keywordDeck !== undefined) {
        r.game.config.keywordDeck = next.keywordDeck;
      }
      if (next.gameMode !== undefined) {
        r.game.config.gameMode = next.gameMode;
      }
      if (next.drawMode !== undefined) {
        r.game.config.drawMode = next.drawMode;
      }
      if (next.krCategories !== undefined) {
        r.game.config.krCategories = next.krCategories;
      }
    });
  };
  // Finished drawing stays visible (read-only) beside the judging screens.
  const withBoard = (node: ReactNode) => (
    <div className="phase phase--judge">
      <BoardView strokes={root.strokes} highlightId={highlightId} />
      <div className="phase__panel">{node}</div>
    </div>
  );
  const onStart = async () => {
    if (!isHost || !myActorID) return;
    // One-device mode excludes the host (it's the shared board, never a
    // player or the liar).
    const hostMode = root.game.config.drawMode === 'host';
    const order = pickPlayerOrder(
      uniquePresences
        .filter((p) => !p.presence.spectator)
        .filter((p) => !(hostMode && p.presence.uid === root.game.hostId))
        .map((p) => p.presence.uid),
      shuffle,
    );
    if (order.length < 3) return;
    // Server picks deck+index+liar across all sent categories (hidden from
    // the liar); KR-only decks join the pool only when the host opts in.
    const krCategories = root.game.config.krCategories === true;
    const decks = deckSizes(locale.code)
      .filter((d) => krCategories || !d.krOnly)
      .map((d) => ({ deck: d.deck, size: d.size }));
    const mode = root.game.config.gameMode === 'fool' ? 'fool' : 'classic';
    let result;
    try {
      result = await startRound({
        room,
        uid: myActorID,
        decks: [...decks],
        playerUids: order,
        mode,
      });
    } catch (e) {
      console.error('round start failed', e);
      setRoundError(true);
      return;
    }
    setRoundError(false);
    const assigned = result.assignment;
    update((r) => {
      // Heal config fields an older document may be missing.
      if (!(r.game.config.turnTimeMs > 0)) {
        r.game.config.turnTimeMs = DEFAULT_TURN_TIME_MS;
      }
      if (!(r.game.config.brushBudgetPx > 0)) {
        r.game.config.brushBudgetPx = DEFAULT_BRUSH_BUDGET_PX;
      }
      if (r.game.config.gameMode !== 'fool') r.game.config.gameMode = 'classic';
      if (r.game.config.drawMode !== 'host') r.game.config.drawMode = 'each';
      r.game.round = freshRound(1, result.roundId, assigned, order, r.game.config);
      // One-device: first turn pending until the host taps "start turn".
      if (hostMode) r.game.round.turnStartedAt = 0;
      while (r.strokes.length > 0) r.strokes.delete?.(0);
      r.game.scores = Object.fromEntries(order.map((id) => [id, 0]));
      // First N palette colors, shuffled so who gets which is random.
      r.game.colors = assignColors(
        order,
        shuffle(PLAYER_COLORS.slice(0, order.length)),
      );
      r.game.phase = 'drawing';
    });
  };

  // Start the next round (host only) with a fresh player order.
  const startNextRound = async () => {
    if (!isHost || !myActorID) return;
    const hostMode = root.game.config.drawMode === 'host';
    const order = pickPlayerOrder(
      uniquePresences
        .filter((p) => !p.presence.spectator)
        .filter((p) => !(hostMode && p.presence.uid === root.game.hostId))
        .map((p) => p.presence.uid),
      shuffle,
    );
    if (order.length < 3) return;
    const krCategories = root.game.config.krCategories === true;
    const decks = deckSizes(locale.code)
      .filter((d) => krCategories || !d.krOnly)
      .map((d) => ({ deck: d.deck, size: d.size }));
    const mode = root.game.config.gameMode === 'fool' ? 'fool' : 'classic';
    let result;
    try {
      result = await startRound({
        room,
        uid: myActorID,
        decks: [...decks],
        playerUids: order,
        mode,
      });
    } catch (e) {
      console.error('next round start failed', e);
      setRoundError(true);
      return;
    }
    setRoundError(false);
    const assigned = result.assignment;
    update((r) => {
      const nextIndex = r.game.round.index + 1;
      r.game.round = freshRound(
        nextIndex,
        result.roundId,
        assigned,
        order,
        r.game.config,
      );
      if (hostMode) r.game.round.turnStartedAt = 0;
      while (r.strokes.length > 0) r.strokes.delete?.(0);
      for (const id of order) {
        // Read access, not `in` (unreliable on the Yorkie proxy — it was
        // resetting scores). Only seed genuinely-new players.
        if (r.game.scores[id] === undefined) r.game.scores[id] = 0;
      }
      r.game.colors = fillMissingColors(order, { ...r.game.colors }, PLAYER_COLORS);
      r.game.phase = 'drawing';
    });
  };

  const finishGame = () => {
    if (!isHost) return;
    update((r) => {
      r.game.phase = 'finished';
    });
  };

  // Auto-advance out of roundEnd after a hold (host-owned): last round →
  // ranking, else → next round. Handlers in a ref so the timer depends
  // only on phase + round, not on every-render presence churn.
  const lastRound = root.game.round.index >= root.game.config.totalRounds;
  const autoAdvanceRef = useRef<() => void>(() => {});
  useEffect(() => {
    autoAdvanceRef.current = () => {
      if (lastRound) finishGame();
      else startNextRound();
    };
  });
  const phase = root.game.phase;
  const roundIndex = root.game.round.index;
  useEffect(() => {
    if (phase !== 'roundEnd' || !isHost) return;
    const id = setTimeout(() => autoAdvanceRef.current(), ROUNDEND_TIME_MS);
    return () => clearTimeout(id);
  }, [phase, roundIndex, isHost]);

  switch (root.game.phase) {
    case 'lobby':
      return (
        <InRoomLobby
          isHost={isHost}
          config={root.game.config}
          presences={uniquePresences}
          room={room}
          hostId={root.game.hostId}
          onConfigChange={onConfigChange}
          onRequestTransferHost={onRequestTransferHost}
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
        });
      };
      return (
        <Finished
          game={root.game}
          isHost={isHost}
          presences={displayPresences}
          onPlayAgain={onPlayAgain}
        />
      );
    }
    case 'tiebreak': {
      // Popup over the board; a host-owned timer auto-resumes drawing.
      return (
        <div className="phase phase--judge">
          <BoardView strokes={root.strokes} highlightId={highlightId} />
          <TieBreak round={root.game.round} presences={displayPresences} />
        </div>
      );
    }
    case 'reveal': {
      // Display-only; a host-owned timer auto-advances to guessing.
      return withBoard(
        <Reveal round={root.game.round} presences={displayPresences} />,
      );
    }
    case 'guessing': {
      const onSubmit = (guess: string, correct: boolean) => {
        if (!myActorID) return;
        if (myActorID !== root.game.round.liarId) return;
        update((r) => {
          const { accusedId, tied } = tallyVotes(r.game.round.votes);
          const caught = !tied && accusedId === r.game.round.liarId;
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
          presences={displayPresences}
          onSubmit={onSubmit}
        />,
      );
    }
    case 'roundEnd': {
      return withBoard(
        <RoundEnd game={root.game} presences={displayPresences} />,
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
          presences={displayPresences}
          onVote={onVote}
        />,
      );
    }
    case 'drawing': {
      const { playerOrder, turnIndex } = root.game.round;
      const drawerId = playerOrder[turnIndex % playerOrder.length] ?? '';
      const isMyTurn = !!myActorID && myActorID === drawerId;
      const drawerName =
        displayPresences.find((p) => p.presence.uid === drawerId)?.presence
          .name ?? '';
      const onStrokeEnd = () => {
        if (!isMyTurn) return;
        advanceTurn();
      };
      // Role + keyword from the doc when it has the secret (dev fallback),
      // else from this client's server fetch (null until resolved). Fool
      // mode shows the liar as a normal player with the different keyword.
      const hudRole: HudRole | null = docHasSecret
        ? (() => {
            const r = root.game.round;
            const iAmLiar = !!myActorID && myActorID === r.liarId;
            const foolRound = r.liarKeywordIndex >= 0;
            return {
              isLiar: foolRound ? false : iAmLiar,
              keywordDeck: r.keywordDeck,
              keywordIndex:
                foolRound && iAmLiar ? r.liarKeywordIndex : r.keywordIndex,
            };
          })()
        : serverRole && serverRole.roundId === roundId
          ? {
              isLiar: serverRole.isLiar,
              keywordDeck: serverRole.keywordDeck,
              keywordIndex: serverRole.keywordIndex,
            }
          : null;

      // One-device: the host board draws AS the current drawer and shows
      // no role. A pending turn (turnStartedAt 0) shows the handoff overlay.
      const hostMode = root.game.config.drawMode === 'host';
      const isDisplay = isHost && hostMode;
      const turnPending = hostMode && root.game.round.turnStartedAt === 0;
      const drawerColor = root.game.colors?.[drawerId] ?? myColor;
      const startTurn = () =>
        update((r) => {
          if (r.game.phase === 'drawing' && r.game.round.turnStartedAt === 0) {
            r.game.round.turnStartedAt = Date.now();
          }
        });

      if (isDisplay) {
        return (
          <div className="phase">
            <div className="phase__gauges">
              <BrushMeter round={root.game.round} />
              <TurnTimer round={root.game.round} config={root.game.config} />
            </div>
            <div className="hostBoard">
              <Canvas
                strokes={root.strokes}
                isMyTurn={!turnPending}
                drawerName={drawerName}
                myUid={drawerId}
                myColor={drawerColor}
                highlightId={highlightId}
                onStrokeEnd={advanceTurn}
              />
              {turnPending && (
                <div className="pauseOverlay">
                  <div className="pauseOverlay__card">
                    <span className="pauseOverlay__sub">
                      {t.hostMode.nextUp}
                    </span>
                    <strong
                      className="pauseOverlay__title"
                      style={{ color: drawerColor }}
                    >
                      {drawerName}
                    </strong>
                    <button
                      className="lobbyIn__start hostTurn__start"
                      onClick={startTurn}
                    >
                      {t.hostMode.startTurn(drawerName)}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      if (hostMode) {
        // Participant phone: watch the host board, see only your own role.
        return (
          <div className="phase phase--judge">
            <BoardView strokes={root.strokes} highlightId={highlightId} />
            <div className="phase__panel">
              <RoundHud
                round={root.game.round}
                config={root.game.config}
                role={hudRole}
                presences={displayPresences}
              />
              <div className="phase__gauges">
                <BrushMeter round={root.game.round} />
                <TurnTimer round={root.game.round} config={root.game.config} />
              </div>
              <p className="hostMode__hint">{t.hostMode.drawHerePhone}</p>
            </div>
          </div>
        );
      }

      return (
        <div className="phase">
          {spectating && (
            <div className="spectator__banner">{t.spectator.banner}</div>
          )}
          <RoundHud
            round={root.game.round}
            config={root.game.config}
            role={hudRole}
            presences={displayPresences}
          />
          <div className="phase__gauges">
            <BrushMeter round={root.game.round} />
            <TurnTimer round={root.game.round} config={root.game.config} />
          </div>
          <Canvas
            strokes={root.strokes}
            isMyTurn={isMyTurn}
            drawerName={drawerName}
            myUid={myActorID}
            myColor={myColor}
            highlightId={highlightId}
            onStrokeEnd={onStrokeEnd}
          />
        </div>
      );
    }
    default:
      return null;
  }
}
