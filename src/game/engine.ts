import type { Phase } from '../types';

// Pure, framework-free game logic. Room.tsx drives these from inside
// its Yorkie `update()` callbacks, and the tests drive the same
// functions to simulate multiple users — so the tested logic is the
// logic that actually ships.

export const MAX_PLAYERS = 8;

/**
 * The host is the lexicographically smallest present clientID. Used
 * both to seed the first host and to re-elect when the current host
 * is no longer present. Every client computes the same answer, so
 * concurrent writes converge. Returns `null` when nobody is present.
 */
export function electHost(
  presentIds: ReadonlyArray<string>,
  currentHostId: string,
): string | null {
  if (currentHostId && presentIds.includes(currentHostId)) {
    return currentHostId;
  }
  return [...presentIds].sort()[0] ?? null;
}

/**
 * The first `MAX_PLAYERS` present (join order) take part; later
 * joiners stay spectators. The chosen ids are shuffled for a fair
 * turn order via the injected `shuffleFn` (injectable for tests).
 */
export function pickPlayerOrder(
  presentIds: ReadonlyArray<string>,
  shuffleFn: <T>(xs: ReadonlyArray<T>) => Array<T>,
  maxPlayers = MAX_PLAYERS,
): Array<string> {
  return shuffleFn(presentIds.slice(0, maxPlayers));
}

/**
 * Map each player to a distinct color from `palette` (already shuffled
 * by the caller). With <= palette.length players the colors are unique.
 */
export function assignColors(
  order: ReadonlyArray<string>,
  palette: ReadonlyArray<string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  order.forEach((id, i) => {
    out[id] = palette[i % palette.length];
  });
  return out;
}

/**
 * Keep existing players' colors and give any newcomer an unused one,
 * so the per-game assignment stays stable across rounds. Returns the
 * full merged map.
 */
export function fillMissingColors(
  order: ReadonlyArray<string>,
  existing: Record<string, string>,
  palette: ReadonlyArray<string>,
): Record<string, string> {
  const out: Record<string, string> = { ...existing };
  const used = new Set(Object.values(out));
  const free = palette.filter((c) => !used.has(c));
  let fi = 0;
  for (const id of order) {
    if (!out[id]) {
      out[id] = free[fi] ?? palette[fi % palette.length];
      fi++;
    }
  }
  return out;
}

export type TurnAdvance = {
  strokesDone: number;
  toVoting: boolean;
  turnIndex: number;
};

/**
 * Resolve a single turn handover: bump the cumulative `strokesDone`,
 * then either end the round (-> voting) once every player has taken
 * all their turns, or rotate to the next drawer. This is the logic
 * whose off-by-one would send a round to voting too early or too late.
 */
export function resolveTurnAdvance(
  strokesDone: number,
  turnIndex: number,
  playerCount: number,
  turnsPerPlayer: number,
): TurnAdvance {
  const totalTurns = playerCount * turnsPerPlayer;
  const done = strokesDone + 1;
  if (playerCount === 0) {
    return { strokesDone: done, toVoting: false, turnIndex };
  }
  if (done >= totalTurns) {
    return { strokesDone: done, toVoting: true, turnIndex };
  }
  return {
    strokesDone: done,
    toVoting: false,
    turnIndex: (turnIndex + 1) % playerCount,
  };
}

/**
 * A player who joined mid-round isn't in `playerOrder`; they spectate
 * until the next round snapshots presences into a fresh order.
 */
export function isSpectator(
  phase: Phase,
  playerOrder: ReadonlyArray<string>,
  actorId: string | null,
): boolean {
  return (
    !!actorId &&
    phase !== 'lobby' &&
    playerOrder.length > 0 &&
    !playerOrder.includes(actorId)
  );
}

/**
 * True when my chosen name collides with another present player who
 * has a lexicographically smaller clientID — so of two clashing
 * clients, exactly one (the larger id) is told the name is taken.
 */
export function nameIsTaken(
  presences: ReadonlyArray<{ clientID: string; name: string }>,
  myId: string,
  myName: string,
): boolean {
  return presences.some(
    (p) => p.clientID !== myId && p.name === myName && p.clientID < myId,
  );
}
