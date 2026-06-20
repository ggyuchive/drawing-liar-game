const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(length = 5): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  }
  return code;
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Eight stroke colors, major → minor. N players use the first N, so the
// set is deterministic.
export const PLAYER_COLORS: ReadonlyArray<string> = [
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
  '#eab308', // yellow
  '#a855f7', // purple
  '#f472b6', // pink
  '#06b6d4', // cyan
  '#92400e', // brown
];

export function randomPlayerColor(): string {
  return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Wraps Date.now() so a render-time read (e.g. useMemo) doesn't trip the
// React Compiler's "impure function" lint.
export function nowMs(): number {
  return Date.now();
}

// Stable per-tab identity (sessionStorage): all game state keys on this,
// not the connection-scoped Yorkie clientID, so a reconnect keeps it.
const UID_KEY = 'drawing-liar-game.uid';

const SPECTATOR_KEY = 'drawing-liar-game.spectator';

export function setSessionSpectator(v: boolean): void {
  try {
    sessionStorage.setItem(SPECTATOR_KEY, v ? '1' : '0');
  } catch {
    // sessionStorage unavailable — ignore
  }
}

export function getSessionSpectator(): boolean {
  try {
    return sessionStorage.getItem(SPECTATOR_KEY) === '1';
  } catch {
    return false;
  }
}

export function getSessionUid(): string {
  try {
    const existing = sessionStorage.getItem(UID_KEY);
    if (existing) return existing;
    const uid = `${generateId()}${generateId()}`;
    sessionStorage.setItem(UID_KEY, uid);
    return uid;
  } catch {
    // sessionStorage unavailable → volatile id (won't survive reload).
    return `${generateId()}${generateId()}`;
  }
}

// Collapse presences sharing a uid (a reconnect can leave a ghost). Last
// one wins.
export function dedupeByUid<T extends { presence: { uid: string } }>(
  list: ReadonlyArray<T>,
): Array<T> {
  const byUid = new Map<string, T>();
  for (const item of list) byUid.set(item.presence.uid, item);
  return [...byUid.values()];
}
