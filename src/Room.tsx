import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  YorkieProvider,
  DocumentProvider,
  useDocument,
  type JSONArray,
  type JSONObject,
} from '@yorkie-js/react';
import { StreamConnectionStatus } from '@yorkie-js/sdk';
import Chat from './game/Chat';
import HowToModal from './game/HowToModal';
import RoomPhase from './game/RoomPhase';
import { fetchRole, revealRound } from './game/secrets';
import { pingRoom } from './rooms';
import { applyScores, tallyVotes } from './game/state';
import {
  electHost,
  nameIsTaken,
  resolveTurnAdvance,
} from './game/engine';
import { LOCALE_LIST, useLocale, useT } from './i18n';
import type { CanvasPresence, ChatMessage, Game, Stroke } from './types';
import {
  DEFAULT_TURN_TIME_MS,
  GUESS_TIME_MS,
  REVEAL_TIME_MS,
  VOTE_TIME_MS,
  initialGame,
} from './types';
import {
  dedupeByUid,
  generateId,
  getSessionSpectator,
  getSessionUid,
  randomPlayerColor,
} from './util';

type Props = {
  room: string;
  name: string;
  onLeave: () => void;
};

export type DocRoot = {
  game: JSONObject<Game>;
  strokes: JSONArray<JSONObject<Stroke>>;
  chat: JSONArray<JSONObject<ChatMessage>>;
  // uid -> display name. A durable copy so a player's name (and their
  // profile) survives a momentary presence drop instead of showing "???".
  roster: Record<string, string>;
};

const API_ADDR =
  import.meta.env.VITE_YORKIE_API_ADDR ?? 'https://api.yorkie.dev';
const API_KEY = import.meta.env.VITE_YORKIE_API_KEY ?? '';

function RoomInner({
  room,
  myUid,
  myName,
  onLeave,
}: {
  room: string;
  myUid: string;
  myName: string;
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
  // Chat starts closed on narrow/mobile screens (where it would cover
  // the board), open on desktop.
  const [chatOpen, setChatOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth > 820,
  );
  const [chatPos, setChatPos] = useState<'side' | 'bottom'>('side');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [howToOpen, setHowToOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // Surfaced when the keyword-secrecy server can't be reached to start
  // or reveal a round (instead of silently starting a keyword-less one).
  const [roundError, setRoundError] = useState(false);
  // This client's own role + keyword for the current round, fetched
  // per-client from the server (the document withholds them).
  const [serverRole, setServerRole] = useState<{
    roundId: string;
    isLiar: boolean;
    keywordDeck: string;
    keywordIndex: number;
  } | null>(null);
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
    // Prefer a non-spectator as host (the host plays); fall back to any
    // present uid only if everyone is a spectator.
    const nonSpectators = presences
      .filter((p) => !p.presence.spectator)
      .map((p) => p.presence.uid);
    const pool = nonSpectators.length
      ? nonSpectators
      : presences.map((p) => p.presence.uid);
    const elected = electHost(pool, hostId);
    // No change needed, or it's not my job to write it.
    if (!elected || elected === hostId || myActorID !== elected) return;
    update((r) => {
      r.game.hostId = elected;
    });
  }, [loading, error, myActorID, hostId, presences, update]);

  // The host can't be a spectator: if I'm the host but marked as a
  // spectator (e.g. an all-spectator room promoted me), clear it so I
  // become a player.
  const iAmSpectatorNow =
    presences.find((p) => p.presence.uid === myActorID)?.presence.spectator ??
    false;
  useEffect(() => {
    if (loading || error || !myActorID) return;
    if (myActorID === hostId && iAmSpectatorNow) {
      update((_r, presence) => {
        presence.set({ spectator: false });
      });
    }
  }, [loading, error, myActorID, hostId, iAmSpectatorNow, update]);

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

  // Keep our presence alive for peers. Yorkie holds presence via a
  // heartbeat that stalls when a tab is backgrounded/throttled — the
  // server then reclaims the session and peers see us drop (name turns
  // to "???"). Re-assert presence on a timer and whenever the tab
  // regains focus or the user interacts, which is what sending a chat
  // message already does by accident. Fully frozen background tabs
  // still can't run JS, but we recover the instant the tab is touched.
  useEffect(() => {
    if (loading || error) return;
    let last = 0;
    const beat = () => {
      const now = Date.now();
      if (now - last < 3000) return; // throttle bursts (e.g. drawing)
      last = now;
      update((r, presence) => {
        presence.set({ lastSeen: now });
        // Persist my name once so peers can still resolve it (and my
        // profile) from the document if my presence ever blips.
        if (myActorID && r.roster[myActorID] !== myName) {
          r.roster[myActorID] = myName;
        }
      });
    };
    beat();
    const id = setInterval(beat, 10_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') beat();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', beat);
    window.addEventListener('pointerdown', beat);
    window.addEventListener('keydown', beat);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', beat);
      window.removeEventListener('pointerdown', beat);
      window.removeEventListener('keydown', beat);
    };
  }, [loading, error, update, myActorID, myName]);

  // Announce joins/leaves as chat messages. The host owns the writes
  // (so each event appears once for everyone); a short grace on leaves
  // avoids spam from a brief presence blip. Latest writer/name context
  // is kept in a ref so the detector only depends on *who* is present.
  const liveUidList = ready ? presences.map((p) => p.presence.uid) : [];
  const liveKey = [...new Set(liveUidList)].sort().join(',');
  const sysCtxRef = useRef<{
    iAmHost: boolean;
    nameOf: (uid: string) => string;
    pushSystem: (kind: 'join' | 'left', uid: string) => void;
  }>({ iAmHost: false, nameOf: () => '', pushSystem: () => {} });
  useEffect(() => {
    const nameOf = (uid: string) =>
      presences.find((p) => p.presence.uid === uid)?.presence.name ??
      (ready ? root.roster?.[uid] : '') ??
      '';
    sysCtxRef.current = {
      iAmHost: !!myActorID && myActorID === hostId,
      nameOf,
      pushSystem: (kind, uid) => {
        const name = nameOf(uid);
        if (!name) return;
        update((r) => {
          (r.chat as JSONArray<JSONObject<ChatMessage>>).push({
            id: generateId(),
            authorId: '',
            text: name,
            at: Date.now(),
            system: kind,
          } as JSONObject<ChatMessage>);
          while (r.chat.length > 200) r.chat.delete?.(0);
        });
      },
    };
  });
  // null until the first observation, so we don't announce people who
  // were already in the room when we joined.
  const announcedRef = useRef<Set<string> | null>(null);
  const leaveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  useEffect(() => {
    if (loading || error) return;
    const cur = new Set(liveKey ? liveKey.split(',') : []);
    if (announcedRef.current === null) {
      announcedRef.current = new Set(cur);
      return;
    }
    const announced = announcedRef.current;
    const timers = leaveTimersRef.current;
    for (const uid of cur) {
      const pending = timers.get(uid);
      if (pending) {
        // Returned within the grace window → a blip, not a leave.
        clearTimeout(pending);
        timers.delete(uid);
        continue;
      }
      if (!announced.has(uid)) {
        announced.add(uid);
        if (sysCtxRef.current.iAmHost) sysCtxRef.current.pushSystem('join', uid);
      }
    }
    for (const uid of announced) {
      if (cur.has(uid) || timers.has(uid)) continue;
      const timer = setTimeout(() => {
        timers.delete(uid);
        announced.delete(uid);
        if (sysCtxRef.current.iAmHost) sysCtxRef.current.pushSystem('left', uid);
      }, 4000);
      timers.set(uid, timer);
    }
  }, [liveKey, loading, error]);
  useEffect(() => {
    const timers = leaveTimersRef.current;
    return () => {
      timers.forEach((tm) => clearTimeout(tm));
      timers.clear();
    };
  }, []);

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

  // Pause an in-progress game when fewer than 3 players remain present
  // — the round can't meaningfully continue, so freeze the turn timer
  // and show an overlay until people (re)join.
  const livePlayerCount = roundOrder.filter((uid) =>
    presences.some((p) => p.presence.uid === uid),
  ).length;
  const paused =
    ready &&
    phase !== 'lobby' &&
    phase !== 'finished' &&
    roundOrder.length > 0 &&
    livePlayerCount <= 2;

  const advanceTurnRef = useRef(advanceTurn);
  const shouldAdvanceRef = useRef(false);
  useEffect(() => {
    advanceTurnRef.current = advanceTurn;
    shouldAdvanceRef.current =
      phase === 'drawing' &&
      !paused &&
      !!myActorID &&
      (myActorID === drawerId || (!drawerPresent && myActorID === hostId));
  });

  useEffect(() => {
    if (loading || error) return;
    if (phase !== 'drawing') return;
    if (paused) return;
    if (!turnStartedAt) return;
    const id = setTimeout(() => {
      if (shouldAdvanceRef.current) advanceTurnRef.current();
    }, turnTimeMs);
    return () => clearTimeout(id);
  }, [loading, error, phase, paused, turnStartedAt, turnIndex, turnTimeMs]);

  const roundIndex = ready ? root.game.round.index : 0;

  // Keyword secrecy. The opaque roundId lets each client ask the server
  // for its own role; `docHasSecret` is true once the secret lives in
  // the document (the dev fallback writes it from the start; the reveal
  // step writes it for everyone), in which case no server fetch is run.
  const roundId = ready ? root.game.round.roundId ?? '' : '';
  const docLiarId = ready ? root.game.round.liarId : '';
  const docKeywordIndex = ready ? root.game.round.keywordIndex : -1;
  const docHasSecret = !!docLiarId || docKeywordIndex >= 0;
  // Tie state for the one-shot tie-break (consumed in resolveVoting).
  const voteTied = ready ? tallyVotes(root.game.round.votes).tied : false;
  const tieBreakUsed = ready ? !!root.game.round.tieBreakUsed : false;

  // Fetch this client's own role + keyword for the drawing phase from
  // the secrecy server (the document withholds them). setState only ever
  // runs in the async resolution, so the React-Compiler effect rules are
  // satisfied. Skipped when the document already carries the secret.
  useEffect(() => {
    if (loading || error) return;
    if (phase !== 'drawing' || !roundId || docHasSecret || !myActorID) return;
    let cancelled = false;
    fetchRole(room, myActorID, roundId)
      .then((view) => {
        if (cancelled) return;
        setServerRole(
          view.isLiar
            ? { roundId, isLiar: true, keywordDeck: '', keywordIndex: -1 }
            : {
                roundId,
                isLiar: false,
                keywordDeck: view.keywordDeck,
                keywordIndex: view.keywordIndex,
              },
        );
      })
      .catch(() => {
        // Server unreachable → a visibly blank keyword, not a leak.
        if (!cancelled) {
          setServerRole({
            roundId,
            isLiar: false,
            keywordDeck: '',
            keywordIndex: -1,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loading, error, phase, roundId, docHasSecret, myActorID, room]);

  // Heartbeat the active room/user counter while attached (best-effort).
  useEffect(() => {
    if (loading || error || !myActorID) return;
    pingRoom(room, myActorID);
    const id = setInterval(() => pingRoom(room, myActorID), 60_000);
    return () => clearInterval(id);
  }, [loading, error, room, myActorID]);

  // Latest reveal context for resolveVoting, kept in a ref so the
  // callback (and the timers depending on it) stays stable across
  // presence churn. Updated every render via the effect below.
  const revealCtxRef = useRef<{
    roundId: string;
    hasSecret: boolean;
    tied: boolean;
    tieBreakUsed: boolean;
  }>({ roundId: '', hasSecret: false, tied: false, tieBreakUsed: false });
  useEffect(() => {
    revealCtxRef.current = {
      roundId,
      hasSecret: docHasSecret,
      tied: voteTied,
      tieBreakUsed,
    };
  });

  // Voting: the host advances to reveal when everyone present has
  // voted, or after the 30s cap — no manual "reveal" button.
  const votingAllIn =
    ready &&
    phase === 'voting' &&
    (() => {
      const order = root.game.round.playerOrder;
      const votes = root.game.round.votes;
      const present = order.filter((uid) =>
        presences.some((p) => p.presence.uid === uid),
      );
      return present.length > 0 && present.every((uid) => !!votes[uid]);
    })();

  const resolveVoting = useCallback(async () => {
    const ctx = revealCtxRef.current;
    // A tied vote with the one-shot tie-break still available → grant one
    // more drawing cycle (existing strokes kept, so players add clues)
    // and a fresh vote. A second tie just resolves as "not caught".
    if (ctx.tied && !ctx.tieBreakUsed) {
      update((r) => {
        if (r.game.phase !== 'voting') return;
        r.game.round.tieBreakUsed = true;
        r.game.round.votes = {};
        r.game.round.turnIndex = 0;
        r.game.round.strokesDone = 0;
        r.game.round.brushUsedPx = 0;
        r.game.round.turnStartedAt = Date.now();
        r.game.phase = 'drawing';
      });
      return;
    }
    let revealed: {
      keywordDeck: string;
      keywordIndex: number;
      liarId: string;
    } | null = null;
    // Secure mode: the document still hides keyword + liar during
    // voting, so fetch the answer to publish it. A failure keeps the
    // round in voting (and shows an error) rather than revealing an
    // empty liar. In the dev fallback the secret is already in the
    // document, so the call is skipped.
    if (!ctx.hasSecret) {
      if (!ctx.roundId || !myActorID) return;
      try {
        revealed = await revealRound(room, myActorID, ctx.roundId);
      } catch {
        setRoundError(true);
        return;
      }
    }
    update((r) => {
      if (r.game.phase !== 'voting') return;
      if (revealed) {
        // The keyword text is never stored — every client localizes it
        // from deck + index in its OWN language. Only deck/index/liar
        // are published at reveal.
        r.game.round.liarId = revealed.liarId;
        r.game.round.keywordDeck = revealed.keywordDeck;
        r.game.round.keywordIndex = revealed.keywordIndex;
      }
      r.game.phase = 'reveal';
    });
  }, [update, room, myActorID]);

  // 30s voting cap (keyed on the round, so casting a vote doesn't
  // reset it). Host owns the write; the host always exists via the
  // election effect.
  useEffect(() => {
    if (loading || error) return;
    if (phase !== 'voting' || paused) return;
    if (!(myActorID && myActorID === hostId)) return;
    const id = setTimeout(() => resolveVoting(), VOTE_TIME_MS);
    return () => clearTimeout(id);
  }, [loading, error, phase, paused, roundIndex, myActorID, hostId, resolveVoting]);

  // Everyone voted → reveal early.
  useEffect(() => {
    if (loading || error) return;
    if (!votingAllIn || paused) return;
    if (!(myActorID && myActorID === hostId)) return;
    // Deferred so the (now async) reveal — which may setState on error
    // — doesn't run synchronously inside the effect body.
    const id = setTimeout(() => resolveVoting(), 0);
    return () => clearTimeout(id);
  }, [loading, error, votingAllIn, paused, myActorID, hostId, resolveVoting]);

  // Reveal auto-advances to the liar's guess after a short hold — there
  // is no manual "continue" button. Host owns the write.
  useEffect(() => {
    if (loading || error) return;
    if (phase !== 'reveal' || paused) return;
    if (!(myActorID && myActorID === hostId)) return;
    const id = setTimeout(() => {
      update((r) => {
        if (r.game.phase === 'reveal') r.game.phase = 'guessing';
      });
    }, REVEAL_TIME_MS);
    return () => clearTimeout(id);
  }, [loading, error, phase, paused, roundIndex, myActorID, hostId, update]);

  // Guessing: if the liar doesn't submit within 30s, auto-resolve with
  // no answer (wrong). The liar owns the write; the host covers a
  // liar who has left. Gate kept in a ref so presence churn doesn't
  // reset the countdown.
  const submitGuessTimeout = useCallback(() => {
    update((r) => {
      if (r.game.phase !== 'guessing') return;
      const { accusedId, tied } = tallyVotes(r.game.round.votes);
      // A tie = no single clear accusation, so the liar escapes.
      const caught = !tied && accusedId === r.game.round.liarId;
      r.game.round.liarGuess = '';
      r.game.round.guessCorrect = false;
      r.game.round.wasCaught = caught;
      r.game.scores = applyScores(
        { caught, guessed: false },
        r.game.round.playerOrder,
        r.game.round.liarId,
        r.game.scores,
      );
      r.game.phase = 'roundEnd';
    });
  }, [update]);

  const submitGuessTimeoutRef = useRef(submitGuessTimeout);
  const guessFireRef = useRef(false);
  useEffect(() => {
    submitGuessTimeoutRef.current = submitGuessTimeout;
    const liarId = ready ? root.game.round.liarId : '';
    const liarPresent = presences.some((p) => p.presence.uid === liarId);
    const iAmLiar = !!myActorID && myActorID === liarId;
    const amHost = !!myActorID && myActorID === hostId;
    guessFireRef.current =
      phase === 'guessing' &&
      !paused &&
      (iAmLiar || (!liarPresent && amHost));
  });
  useEffect(() => {
    if (loading || error) return;
    if (phase !== 'guessing' || paused) return;
    const id = setTimeout(() => {
      if (guessFireRef.current) submitGuessTimeoutRef.current();
    }, GUESS_TIME_MS);
    return () => clearTimeout(id);
  }, [loading, error, phase, paused, roundIndex]);

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

  // Reconstruct any known player who isn't currently present from the
  // document (roster name + assigned color), so a momentary presence
  // drop never blanks their name ("???") or hides their profile. Used
  // for *display only* — liveness decisions (election, turn order,
  // drawer-present) stay on the live `uniquePresences`.
  const liveUids = new Set(uniquePresences.map((p) => p.presence.uid));
  const roster = root.roster ?? {};
  const knownUids =
    root.game.round.playerOrder.length > 0
      ? root.game.round.playerOrder
      : Object.keys(roster);
  const ghostPresences: Array<{ clientID: string; presence: CanvasPresence }> =
    knownUids
      .filter((uid) => !liveUids.has(uid) && roster[uid])
      .map((uid) => ({
        clientID: uid,
        presence: {
          uid,
          name: roster[uid],
          color: root.game.colors?.[uid] ?? '#888888',
          typing: false,
          lastSeen: 0,
          spectator: false,
        },
      }));
  const displayPresences = [...uniquePresences, ...ghostPresences];

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
  // Profiles list only the *currently present* players (live, not the
  // ghost-resolved set) so someone leaving disappears from everyone's
  // panel right away.
  const order = root.game.round.playerOrder;
  const profileSource = order.length
    ? order
        .map((id) => uniquePresences.find((p) => p.presence.uid === id))
        .filter(
          (p): p is { clientID: string; presence: CanvasPresence } => !!p,
        )
    : uniquePresences.filter((p) => !p.presence.spectator);
  const profiles = profileSource.slice(0, 8);
  const showScores = root.game.phase !== 'lobby';

  const drawingUid = phase === 'drawing' && drawerId ? drawerId : null;
  const hostUid = root.game.hostId;

  const renderProfile = (presence: CanvasPresence) => {
    const uid = presence.uid;
    const active = highlightId === uid;
    const isDrawing = uid === drawingUid;
    const isRoomHost = uid === hostUid;
    const cls =
      'profile' +
      (active ? ' profile--active' : '') +
      (isDrawing ? ' profile--drawing' : '');
    return (
      <button
        key={uid}
        className={cls}
        style={{ borderColor: presence.color }}
        onClick={() => setHighlightId((cur) => (cur === uid ? null : uid))}
        aria-pressed={active}
      >
        <span
          className="profile__dot"
          style={{ background: presence.color }}
        />
        {isRoomHost && (
          <span className="profile__host" aria-label="host">
            👑
          </span>
        )}
        <span className="profile__name">
          {presence.name}
          {uid === myActorID ? ' (me)' : ''}
        </span>
        {isDrawing && (
          <span className="profile__turn" aria-label="drawing now">
            ✏️
          </span>
        )}
        {showScores && (
          <span className="profile__score">
            {root.game.scores[uid] ?? 0}
          </span>
        )}
      </button>
    );
  };

  // When the last present player leaves, wipe the room so the next
  // visitor to this code gets a clean lobby (the React SDK doesn't
  // expose true document removal). A momentarily-backgrounded peer may
  // be uncounted — acceptable for real multi-device play.
  const handleLeave = () => {
    if (uniquePresences.length <= 1) {
      update((r) => {
        r.game = initialGame() as unknown as JSONObject<Game>;
        while (r.strokes.length > 0) r.strokes.delete?.(0);
        while (r.chat.length > 0) r.chat.delete?.(0);
        r.roster = {};
      });
    }
    onLeave();
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
          {chatOpen && (
            <button
              className="room__chatDock"
              onClick={() =>
                setChatPos((p) => (p === 'side' ? 'bottom' : 'side'))
              }
            >
              {chatPos === 'side' ? t.chat.dockBottom : t.chat.dockSide}
            </button>
          )}
          <button className="room__leave" onClick={handleLeave}>
            {t.common.leave}
          </button>
        </div>
      </header>

      {roundError && (
        <div className="room__error" role="alert">
          <span>{t.room.roundError}</span>
          <button
            className="room__errorDismiss"
            onClick={() => setRoundError(false)}
          >
            {t.room.dismiss}
          </button>
        </div>
      )}

      <div className={`room__body room__body--chat-${chatPos}`}>
        <div className="room__stage">
          <aside className="room__profiles">
            {profiles.map(({ presence }) => renderProfile(presence))}
          </aside>
          <main className="room__main">
            <RoomPhase
              myActorID={myActorID}
              room={room}
              uniquePresences={uniquePresences}
              displayPresences={displayPresences}
              highlightId={highlightId}
              advanceTurn={advanceTurn}
              setRoundError={setRoundError}
              serverRole={serverRole}
              docHasSecret={docHasSecret}
              roundId={roundId}
            />
            {paused && (
              <div className="pauseOverlay">
                <div className="pauseOverlay__card">
                  <strong className="pauseOverlay__title">
                    {t.room.pausedTitle}
                  </strong>
                  <p className="pauseOverlay__sub">{t.room.pausedSub}</p>
                </div>
              </div>
            )}
          </main>
        </div>
        {chatOpen && (
          <Chat
            myActorID={myActorID}
            presences={displayPresences}
            suppressTyping={suppressTyping}
          />
        )}
      </div>

      {howToOpen && <HowToModal onClose={() => setHowToOpen(false)} />}
    </div>
  );
}

function MissingApiKeyHint() {
  const t = useT();
  return <div className="room__status">{t.room.missingApiKey}</div>;
}

export default function Room({ room, name, onLeave }: Props) {
  const myColor = useMemo(() => randomPlayerColor(), []);
  // Stable per-tab identity; survives reload and reconnect.
  const myUid = useMemo(() => getSessionUid(), []);
  // Chosen on the join screen (persisted per tab so a reload keeps it).
  const startSpectator = useMemo(() => getSessionSpectator(), []);

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
            roster: {},
          } as unknown as DocRoot
        }
        initialPresence={{
          uid: myUid,
          name,
          color: myColor,
          typing: false,
          lastSeen: 0,
          spectator: startSpectator,
        }}
      >
        <RoomInner room={room} myUid={myUid} myName={name} onLeave={onLeave} />
      </DocumentProvider>
    </YorkieProvider>
  );
}
