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
import type { CanvasPresence, Game, GameConfig } from '../types';
import { PLAYER_COLORS } from '../util';
import type { DocRoot } from '../Room';

type Presences = Array<{ clientID: string; presence: CanvasPresence }>;

type ServerRole = {
  roundId: string;
  isLiar: boolean;
  keywordDeck: string;
  keywordIndex: number;
} | null;

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
};

/**
 * `RoomPhase` renders the main play area for the current game phase
 * (lobby / drawing / voting / reveal / guessing / round-end / finished)
 * and owns the host's phase-transition handlers. Split out of `Room` so
 * neither file grows unwieldy; it reads the document via `useDocument`
 * (it runs under the same `DocumentProvider`).
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
}: Props) {
  const { root, update } = useDocument<DocRoot, CanvasPresence>();
  const t = useT();
  const { locale } = useLocale();

  const isHost = !!myActorID && myActorID === root.game.hostId;
  const myColor =
    uniquePresences.find((p) => p.presence.uid === myActorID)?.presence.color ??
    '#1f2937';
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
  const onStart = async () => {
    if (!isHost || !myActorID) return;
    // First 8 non-spectators by join order play; the rest watch.
    const order = pickPlayerOrder(
      uniquePresences
        .filter((p) => !p.presence.spectator)
        .map((p) => p.presence.uid),
      shuffle,
    );
    if (order.length < 3) return;
    // The host sends EVERY category; the server picks the deck + index
    // (and the liar) across all of them — players don't choose a
    // category, and the choice stays hidden from the liar. (`assignment`
    // is the insecure DEV fallback when the server is unreachable.)
    const decks = deckSizes(locale.code);
    let result;
    try {
      result = await startRound({
        room,
        uid: myActorID,
        decks: [...decks],
        playerUids: order,
      });
    } catch (e) {
      console.error('round start failed', e);
      setRoundError(true);
      return;
    }
    setRoundError(false);
    const assigned = result.assignment;
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
        roundId: result.roundId,
        // The keyword text is never stored; each client localizes it
        // from deck + index in its own language. deck/index/liar stay
        // empty in secure mode and are written by the dev fallback so
        // server-less peers can play.
        keyword: '',
        keywordDeck: assigned ? assigned.deck : '',
        keywordIndex: assigned ? assigned.keywordIndex : -1,
        liarId: assigned ? assigned.liarId : '',
        playerOrder: order,
        turnIndex: 0,
        turnsPerPlayer: r.game.config.turnsPerPlayer,
        strokesDone: 0,
        votes: {},
        liarGuess: '',
        guessCorrect: false,
        wasCaught: false,
        tieBreakUsed: false,
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

  // Start the next round (host only). Lifted out of the roundEnd case so
  // the auto-advance timer can call the exact same logic the old button
  // used. Snapshots present non-spectators into a fresh player order.
  const startNextRound = async () => {
    if (!isHost || !myActorID) return;
    const order = pickPlayerOrder(
      uniquePresences
        .filter((p) => !p.presence.spectator)
        .map((p) => p.presence.uid),
      shuffle,
    );
    if (order.length < 3) return;
    const decks = deckSizes(locale.code);
    let result;
    try {
      result = await startRound({
        room,
        uid: myActorID,
        decks: [...decks],
        playerUids: order,
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
      r.game.round = {
        index: nextIndex,
        roundId: result.roundId,
        keyword: '',
        keywordDeck: assigned ? assigned.deck : '',
        keywordIndex: assigned ? assigned.keywordIndex : -1,
        liarId: assigned ? assigned.liarId : '',
        playerOrder: order,
        turnIndex: 0,
        turnsPerPlayer: r.game.config.turnsPerPlayer,
        strokesDone: 0,
        votes: {},
        liarGuess: '',
        guessCorrect: false,
        wasCaught: false,
        tieBreakUsed: false,
        brushBudgetPx: r.game.config.brushBudgetPx,
        brushUsedPx: 0,
        turnStartedAt: Date.now(),
      };
      while (r.strokes.length > 0) r.strokes.delete?.(0);
      for (const id of order) {
        // Read access (not `in`, which is unreliable on the Yorkie proxy
        // and was resetting every score to 0 each round). Only seed
        // genuinely-new players at 0.
        if (r.game.scores[id] === undefined) r.game.scores[id] = 0;
      }
      // Keep existing players' colors; give any newcomer an unused one so
      // the per-game assignment stays stable.
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

  // Auto-advance out of roundEnd after a short hold — no manual "next"
  // button. Host owns the write; the last round goes to the final
  // ranking, every other round starts the next one. The latest handlers
  // are kept in a ref so the timer effect can depend only on the phase +
  // round (uniquePresences changes every render and would reset it).
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
          presences={displayPresences}
          onPlayAgain={onPlayAgain}
        />
      );
    }
    case 'tiebreak': {
      // Popup over the board; a host-owned timer auto-resumes drawing
      // (see the tie-break effect). The board stays visible behind it.
      return (
        <div className="phase phase--judge">
          <BoardView strokes={root.strokes} highlightId={highlightId} />
          <TieBreak round={root.game.round} />
        </div>
      );
    }
    case 'reveal': {
      // Display-only; a host-owned timer auto-advances to guessing
      // (see the reveal effect). The accused's identity only decides
      // the scoring branch, computed at guess-submit time.
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
          // A tie = no single clear accusation, so the liar escapes.
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
      // Advancing is automatic (see the auto-advance effect above).
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
      // Role + keyword come from the document when it carries the
      // secret (dev fallback / post-reveal), otherwise from this
      // client's own server fetch. null until that fetch resolves.
      const hudRole: HudRole | null = docHasSecret
        ? {
            isLiar: !!myActorID && myActorID === root.game.round.liarId,
            keywordDeck: root.game.round.keywordDeck,
            keywordIndex: root.game.round.keywordIndex,
          }
        : serverRole && serverRole.roundId === roundId
          ? {
              isLiar: serverRole.isLiar,
              keywordDeck: serverRole.keywordDeck,
              keywordIndex: serverRole.keywordIndex,
            }
          : null;
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
