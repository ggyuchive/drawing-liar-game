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
import ChatToasts from './game/ChatToasts';
import HowToModal from './game/HowToModal';
import RoomPhase from './game/RoomPhase';
import { fetchRole, revealRound } from './game/secrets';
import { pingRoom } from './rooms';
import { applyScores, tallyVotes } from './game/state';
import {
  countPresentPlayers,
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
  TIEBREAK_TIME_MS,
  VOTE_TIME_MS,
  initialGame,
} from './types';
import {
  PLAYER_COLORS,
  dedupeByUid,
  generateId,
  getSessionSpectator,
  getSessionUid,
  nowMs,
  randomPlayerColor,
} from './util';

type Props = {
  room: string;
  name: string;
  // Joining/spectating: require another live player, else bounce to lobby.
  mustExist?: boolean;
  onLeave: (opts?: { notFound?: boolean; full?: boolean }) => void;
  onValidated?: (room: string) => void;
};

export type DocRoot = {
  game: JSONObject<Game>;
  strokes: JSONArray<JSONObject<Stroke>>;
  chat: JSONArray<JSONObject<ChatMessage>>;
  // uid -> name; durable so a presence blip doesn't blank names.
  roster: Record<string, string>;
};

const API_ADDR =
  import.meta.env.VITE_YORKIE_API_ADDR ?? 'https://api.yorkie.dev';
const API_KEY = import.meta.env.VITE_YORKIE_API_KEY ?? '';

function RoomInner({
  room,
  myUid,
  myName,
  mustExist,
  onLeave,
  onValidated,
}: {
  room: string;
  myUid: string;
  myName: string;
  mustExist: boolean;
  onLeave: (opts?: { notFound?: boolean; full?: boolean }) => void;
  onValidated: (room: string) => void;
}) {
  const { root, presences, update, loading, error, connection } = useDocument<
    DocRoot,
    CanvasPresence
  >();
  // Stable per-tab uid, not the connection-scoped Yorkie actorID.
  const myActorID = myUid;
  const t = useT();
  const { locale, setLocaleCode } = useLocale();
  // Closed on narrow screens (would cover the board), open on desktop.
  const [chatOpen, setChatOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth > 820,
  );
  const [chatPos, setChatPos] = useState<'side' | 'bottom'>('side');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  // Lobby host hand-off target (driven by side profiles + lobby roster).
  const [transferUid, setTransferUid] = useState<string | null>(null);
  const profilesRef = useRef<HTMLElement>(null);
  const [howToOpen, setHowToOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [roundError, setRoundError] = useState(false);
  // This client's own role + keyword, fetched per-client (doc withholds).
  const [serverRole, setServerRole] = useState<{
    roundId: string;
    isLiar: boolean;
    keywordDeck: string;
    keywordIndex: number;
  } | null>(null);
  const ready = !loading && !error;
  const hostId = ready ? root.game.hostId : '';
  const disconnected = connection === StreamConnectionStatus.Disconnected;

  // A room "exists" only if another live player is present — a typo'd code
  // otherwise opens a phantom empty room. Ref holds the latest reading so
  // churn during the grace window doesn't reset the timer.
  const otherPresent =
    ready && presences.some((p) => p.presence.uid !== myActorID);
  const otherPresentRef = useRef(otherPresent);
  useEffect(() => {
    otherPresentRef.current = otherPresent;
  });
  const [confirmed, setConfirmed] = useState(!mustExist);
  useEffect(() => {
    if (!otherPresent || confirmed) return;
    onValidated(room);
    // Deferred: no synchronous setState in an effect body.
    const id = setTimeout(() => setConfirmed(true), 0);
    return () => clearTimeout(id);
  }, [otherPresent, confirmed, room, onValidated]);
  useEffect(() => {
    if (!mustExist || loading || error) return;
    const id = setTimeout(() => {
      if (!otherPresentRef.current) onLeave({ notFound: true });
    }, 1500);
    return () => clearTimeout(id);
  }, [mustExist, loading, error, onLeave]);

  // 8-player cap: ranked by join time, anyone past the 8th seat bounces
  // itself so a 9th joiner never displaces an existing player.
  const overCapacity =
    ready &&
    !!myActorID &&
    (() => {
      const me = presences.find((p) => p.presence.uid === myActorID)?.presence;
      if (!me || me.spectator) return false;
      const players = [
        ...new Map(
          presences
            .filter((p) => !p.presence.spectator)
            .map((p) => [p.presence.uid, p.presence]),
        ).values(),
      ].sort(
        (a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0) || a.uid.localeCompare(b.uid),
      );
      return players.findIndex((p) => p.uid === myActorID) >= 8;
    })();
  useEffect(() => {
    if (overCapacity) onLeave({ full: true });
  }, [overCapacity, onLeave]);

  // Host = smallest present uid. Every client computes the same survivor
  // and only that one writes, so re-election converges without conflicts.
  useEffect(() => {
    if (loading || error || !myActorID) return;
    // Prefer a non-spectator (the host plays); fall back only if all are.
    const nonSpectators = presences
      .filter((p) => !p.presence.spectator)
      .map((p) => p.presence.uid);
    const pool = nonSpectators.length
      ? nonSpectators
      : presences.map((p) => p.presence.uid);
    const elected = electHost(pool, hostId);
    if (!elected || elected === hostId || myActorID !== elected) return;
    update((r) => {
      r.game.hostId = elected;
    });
  }, [loading, error, myActorID, hostId, presences, update]);

  // The host must play: if I was promoted while a spectator, clear it.
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

  // Adopt my game-assigned color into presence (UI reads presence.color).
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

  // Lobby colors: palette order by a stable sort so everyone agrees.
  // Game start reshuffles within the top-N.
  const myLobbyColor =
    ready && myActorID && root.game.phase === 'lobby'
      ? (() => {
          const ids = [
            ...new Set(
              presences
                .filter((p) => !p.presence.spectator)
                .map((p) => p.presence.uid),
            ),
          ].sort();
          const idx = ids.indexOf(myActorID);
          return idx >= 0
            ? PLAYER_COLORS[idx % PLAYER_COLORS.length]
            : undefined;
        })()
      : undefined;
  useEffect(() => {
    if (!myLobbyColor || myPresenceColor === myLobbyColor) return;
    update((_r, presence) => {
      presence.set({ color: myLobbyColor });
    });
  }, [myLobbyColor, myPresenceColor, update]);

  // Keep presence alive: a backgrounded tab's heartbeat stalls and the
  // server drops us (peers see "???"). Re-assert on a timer and on
  // focus/interaction so we recover the instant the tab is touched.
  useEffect(() => {
    if (loading || error) return;
    let last = 0;
    const beat = () => {
      const now = Date.now();
      if (now - last < 3000) return; // throttle bursts (e.g. drawing)
      last = now;
      update((r, presence) => {
        presence.set({ lastSeen: now });
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

  // Announce joins/leaves as chat. Host owns the writes (once per event);
  // a grace on leaves absorbs blips. Context in a ref so the detector
  // depends only on who is present.
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
  // null until first observation: don't announce people already here.
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

  // Bump strokesDone, rotate to the next drawer or move to voting.
  const advanceTurn = useCallback(() => {
    update((r) => {
      if (r.game.phase !== 'drawing') return;
      const order = r.game.round.playerOrder;
      if (order.length === 0) return;
      const adv = resolveTurnAdvance(
        r.game.round.strokesDone,
        r.game.round.turnIndex,
        order.length,
        r.game.round.turnsPerPlayer || r.game.config.turnsPerPlayer,
      );
      r.game.round.strokesDone = adv.strokesDone;
      if (adv.toVoting) {
        r.game.phase = 'voting';
      } else {
        r.game.round.turnIndex = adv.turnIndex;
        r.game.round.brushUsedPx = 0;
        // One-device mode: leave the next turn pending (0) so the host
        // taps "start" after handing the board over; otherwise start now.
        r.game.round.turnStartedAt =
          r.game.config.drawMode === 'host' ? 0 : Date.now();
      }
    });
  }, [update]);

  // Turn auto-advance is timed LOCALLY from when this client observes the
  // turn start — the doc wall-clock would let cross-device skew fire turns
  // instantly, cascading into voting.
  const phase = ready ? root.game.phase : 'lobby';
  const drawMode = ready ? root.game.config.drawMode : 'each';
  const turnStartedAt = ready ? root.game.round.turnStartedAt : 0;
  const turnIndex = ready ? root.game.round.turnIndex : 0;
  const turnTimeMs =
    ready && root.game.config.turnTimeMs > 0
      ? root.game.config.turnTimeMs
      : DEFAULT_TURN_TIME_MS;

  const roundOrder = ready ? root.game.round.playerOrder : [];
  const drawerId =
    roundOrder.length > 0
      ? roundOrder[turnIndex % roundOrder.length] ?? ''
      : '';
  const drawerPresent = presences.some((p) => p.presence.uid === drawerId);

  // Pause when fewer than 3 players remain. Count present players, not the
  // round's roster: a rejoiner gets a fresh uid not in playerOrder, so
  // keying on the roster would hang forever on a departed member.
  const presentPlayerCount = countPresentPlayers(
    presences.map((p) => p.presence),
    drawMode === 'host',
    hostId,
  );
  const paused =
    ready &&
    phase !== 'lobby' &&
    phase !== 'finished' &&
    roundOrder.length > 0 &&
    presentPlayerCount <= 2;

  const advanceTurnRef = useRef(advanceTurn);
  const shouldAdvanceRef = useRef(false);
  useEffect(() => {
    advanceTurnRef.current = advanceTurn;
    shouldAdvanceRef.current =
      phase === 'drawing' &&
      !paused &&
      !!myActorID &&
      // One-device: the host board owns every advance. Otherwise the
      // drawer does, or the host if the drawer is absent.
      (drawMode === 'host'
        ? myActorID === hostId
        : myActorID === drawerId || (!drawerPresent && myActorID === hostId));
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

  // Keyword secrecy: roundId lets each client fetch its own role.
  // docHasSecret is true once the secret is in the doc (dev fallback or
  // after reveal), skipping the server fetch.
  const roundId = ready ? root.game.round.roundId ?? '' : '';
  const docLiarId = ready ? root.game.round.liarId : '';
  const docKeywordIndex = ready ? root.game.round.keywordIndex : -1;
  const docHasSecret = !!docLiarId || docKeywordIndex >= 0;
  // Tie-break needed when the vote gives no single accusation (a top tie,
  // or nobody voted).
  const voteTally = ready
    ? tallyVotes(root.game.round.votes)
    : { tied: false, accusedId: '', counts: {} };
  const voteNeedsTieBreak = ready && (voteTally.tied || voteTally.accusedId === '');
  const tieBreakUsed = ready ? !!root.game.round.tieBreakUsed : false;

  // Fetch this client's role + keyword from the secrecy server (skipped
  // when the secret is already in the doc). setState only in the async
  // resolution, so it's effect-rule safe.
  useEffect(() => {
    if (loading || error) return;
    if (phase !== 'drawing' || !roundId || docHasSecret || !myActorID) return;
    let cancelled = false;
    fetchRole(room, myActorID, roundId)
      .then((view) => {
        if (cancelled) return;
        setServerRole(
          view.isLiar
            ? {
                roundId,
                isLiar: true,
                keywordDeck: view.keywordDeck,
                keywordIndex: -1,
              }
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

  // Scroll the current drawer's profile into view (nudges only the strip).
  useEffect(() => {
    if (phase !== 'drawing' || !drawerId) return;
    const el = profilesRef.current?.querySelector('.profile--drawing');
    el?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [phase, drawerId]);

  // Heartbeat the active room/user counter while attached (best-effort).
  useEffect(() => {
    if (loading || error || !myActorID) return;
    pingRoom(room, myActorID);
    const id = setInterval(() => pingRoom(room, myActorID), 60_000);
    return () => clearInterval(id);
  }, [loading, error, room, myActorID]);

  // Reveal context in a ref so resolveVoting stays stable across churn.
  const revealCtxRef = useRef<{
    roundId: string;
    hasSecret: boolean;
    needsTieBreak: boolean;
    tieBreakUsed: boolean;
  }>({ roundId: '', hasSecret: false, needsTieBreak: false, tieBreakUsed: false });
  useEffect(() => {
    revealCtxRef.current = {
      roundId,
      hasSecret: docHasSecret,
      needsTieBreak: voteNeedsTieBreak,
      tieBreakUsed,
    };
  });

  // Host advances to reveal when all present have voted, or after the cap.
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
    // Inconclusive vote with the one-shot tie-break available → one more
    // turn + fresh vote via the tiebreak phase. A second inconclusive
    // vote resolves as "not caught" (the liar wins).
    if (ctx.needsTieBreak && !ctx.tieBreakUsed) {
      update((r) => {
        if (r.game.phase !== 'voting') return;
        const order = r.game.round.playerOrder;
        r.game.round.tieBreakUsed = true;
        // Keep votes for the popup tally; extend by one turn/player and
        // resume from the next drawer, keeping strokesDone (e.g. 6/6→7/9).
        r.game.round.turnsPerPlayer =
          (r.game.round.turnsPerPlayer || r.game.config.turnsPerPlayer) + 1;
        if (order.length > 0) {
          r.game.round.turnIndex = (r.game.round.turnIndex + 1) % order.length;
        }
        r.game.round.brushUsedPx = 0;
        r.game.phase = 'tiebreak';
      });
      return;
    }
    let revealed: {
      keywordDeck: string;
      keywordIndex: number;
      liarKeywordIndex: number;
      liarId: string;
    } | null = null;
    // Secure mode: fetch the hidden keyword + liar to publish (skipped in
    // the dev fallback, where the secret is already in the doc).
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
        // Keyword text is never stored; clients localize from deck+index.
        r.game.round.liarId = revealed.liarId;
        r.game.round.keywordDeck = revealed.keywordDeck;
        r.game.round.keywordIndex = revealed.keywordIndex;
        r.game.round.liarKeywordIndex = revealed.liarKeywordIndex;
      }
      r.game.phase = 'reveal';
    });
  }, [update, room, myActorID]);

  // Voting cap, keyed on the round so a vote doesn't reset it. Host owns it.
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
    // Deferred: the async reveal may setState.
    const id = setTimeout(() => resolveVoting(), 0);
    return () => clearTimeout(id);
  }, [loading, error, votingAllIn, paused, myActorID, hostId, resolveVoting]);

  // Reveal auto-advances to guessing after a short hold. Host owns it.
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

  // Tie-break popup auto-resumes drawing after a hold. turnStartedAt is
  // set HERE so the drawer gets a full turn, not minus the hold.
  useEffect(() => {
    if (loading || error) return;
    if (phase !== 'tiebreak' || paused) return;
    if (!(myActorID && myActorID === hostId)) return;
    const id = setTimeout(() => {
      update((r) => {
        if (r.game.phase !== 'tiebreak') return;
        r.game.round.votes = {};
        // One-device: park the turn pending (0) for the host handoff.
        r.game.round.turnStartedAt =
          r.game.config.drawMode === 'host' ? 0 : Date.now();
        r.game.phase = 'drawing';
      });
    }, TIEBREAK_TIME_MS);
    return () => clearTimeout(id);
  }, [loading, error, phase, paused, roundIndex, myActorID, hostId, update]);

  // Guessing: if the liar doesn't submit in time, auto-resolve as wrong.
  // Liar owns it, host covers a departed liar.
  const submitGuessTimeout = useCallback(() => {
    update((r) => {
      if (r.game.phase !== 'guessing') return;
      const { accusedId, tied } = tallyVotes(r.game.round.votes);
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
        <button className="room__backToLobby" onClick={() => onLeave()}>
          {t.room.backToLobby}
        </button>
      </div>
    );
  }
  // Neutral "joining…" screen so a bad code never flashes the room.
  if (!confirmed || overCapacity) {
    return <div className="room__status">{t.room.connecting(room)}</div>;
  }

  const uniquePresences = dedupeByUid(presences);

  // Reconstruct known-but-absent players from the doc (roster + color) so
  // a presence blip never blanks a name. Display only — liveness uses the
  // live `uniquePresences`.
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

  // Reject a duplicate name; the larger-uid client bounces (exactly one).
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
        <button className="room__backToLobby" onClick={() => onLeave()}>
          {t.room.backToLobby}
        </button>
      </div>
    );
  }

  const suppressTyping =
    !!myActorID &&
    myActorID === root.game.round.liarId &&
    root.game.phase === 'guessing';

  // Side profiles: the round's players (or lobby members), present-only so
  // a leaver disappears immediately, capped at 8. One-device mode leaves
  // the host out (it's the shared board, not a player).
  const order = root.game.round.playerOrder;
  const profileSource = order.length
    ? order
        .map((id) => uniquePresences.find((p) => p.presence.uid === id))
        .filter(
          (p): p is { clientID: string; presence: CanvasPresence } => !!p,
        )
    : uniquePresences.filter(
        (p) =>
          !p.presence.spectator &&
          !(drawMode === 'host' && p.presence.uid === hostId),
      );
  const profiles = profileSource.slice(0, 8);
  const showScores = root.game.phase !== 'lobby';

  const drawingUid = phase === 'drawing' && drawerId ? drawerId : null;
  const hostUid = root.game.hostId;
  // Lobby host hand-off by tapping a profile (each-device mode only).
  const canTransferHost =
    phase === 'lobby' && myActorID === hostUid && drawMode !== 'host';

  const renderProfile = (presence: CanvasPresence) => {
    const uid = presence.uid;
    const active = highlightId === uid;
    const isDrawing = uid === drawingUid;
    const isRoomHost = uid === hostUid;
    const offersTransfer = canTransferHost && uid !== hostUid;
    const cls =
      'profile' +
      (active ? ' profile--active' : '') +
      (isDrawing ? ' profile--drawing' : '') +
      (offersTransfer ? ' profile--transfer' : '');
    return (
      <button
        key={uid}
        className={cls}
        style={{ borderColor: presence.color }}
        onClick={() =>
          offersTransfer
            ? setTransferUid(uid)
            : setHighlightId((cur) => (cur === uid ? null : uid))
        }
        aria-pressed={active}
      >
        <span
          className="profile__dot"
          style={{ background: presence.color }}
        />
        {isRoomHost && phase === 'lobby' && (
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

  // Last player out wipes the room (no true doc removal in the SDK) so
  // the next visitor gets a clean lobby.
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
          <span className="langSelect">
            <span className="langSelect__globe" aria-hidden="true">
              🌐
            </span>
            <select
              className="room__lang langSelect__field"
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
          </span>
          {/* Dock toggle left of the open/close toggle so the latter stays
              anchored — open then close chat at the same pointer spot. */}
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
          <button
            className="room__chatToggle"
            onClick={() => setChatOpen((o) => !o)}
            aria-pressed={chatOpen}
          >
            {chatOpen ? t.chat.hide : t.chat.show}
          </button>
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
          <aside className="room__profiles" ref={profilesRef}>
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
              onRequestTransferHost={setTransferUid}
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

      {transferUid && (
        <div
          className="howto__backdrop"
          onClick={() => setTransferUid(null)}
          role="dialog"
          aria-modal="true"
          aria-label={t.inRoomLobby.makeHost}
        >
          <div
            className="howto__card lobbyIn__helpCard lobbyIn__transferCard"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="howto__title">
              {t.inRoomLobby.transferHostQ(
                uniquePresences.find((p) => p.presence.uid === transferUid)
                  ?.presence.name ?? '',
              )}
            </h2>
            <div className="lobbyIn__transferBtns">
              <button
                className="lobbyIn__transferCancel"
                onClick={() => setTransferUid(null)}
              >
                {t.inRoomLobby.cancel}
              </button>
              <button
                className="lobbyIn__start lobbyIn__transferConfirm"
                onClick={() => {
                  const uid = transferUid;
                  setTransferUid(null);
                  update((r) => {
                    r.game.hostId = uid;
                  });
                }}
                autoFocus
              >
                {t.inRoomLobby.makeHost}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transient chat / join-leave toasts (shown even with panel open). */}
      <ChatToasts myActorID={myActorID} presences={displayPresences} />
    </div>
  );
}

function MissingApiKeyHint() {
  const t = useT();
  return <div className="room__status">{t.room.missingApiKey}</div>;
}

export default function Room({
  room,
  name,
  mustExist = false,
  onLeave,
  onValidated = () => {},
}: Props) {
  const myColor = useMemo(() => randomPlayerColor(), []);
  const myUid = useMemo(() => getSessionUid(), []);
  const startSpectator = useMemo(() => getSessionSpectator(), []);
  // Join time, for the 8-player cap ordering.
  const joinedAt = useMemo(() => nowMs(), []);

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
          joinedAt,
        }}
      >
        <RoomInner
          room={room}
          myUid={myUid}
          myName={name}
          mustExist={mustExist}
          onLeave={onLeave}
          onValidated={onValidated}
        />
      </DocumentProvider>
    </YorkieProvider>
  );
}
