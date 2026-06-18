const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  }
  return code;
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Eight visually distinct colors (no near-duplicates), each legible
// as a stroke on the white canvas. Players are assigned from this
// fixed set at game start.
// Ordered most "major" (distinct, recognizable) first → most minor last.
// A game with N players uses exactly the first N (3 → red/green/blue),
// so the palette grows predictably and the 8th is the least prominent.
// Bright, well-separated hues (no muddy teal/brown) so colors stay easy
// to tell apart on the white canvas.
export const PLAYER_COLORS: ReadonlyArray<string> = [
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
  '#f97316', // orange
  '#a855f7', // purple
  '#2dd4bf', // mint
  '#f472b6', // pink
  '#eab308', // amber
];

export function randomPlayerColor(): string {
  return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Wraps Date.now() so it can be read once per mount (e.g. in a
// useMemo) without tripping the React Compiler's "impure function
// during render" lint — same trick as randomPlayerColor/generateId.
export function nowMs(): number {
  return Date.now();
}

// A stable per-tab identity. Unlike the Yorkie actorID/clientID
// (which is connection-scoped and changes on every reload or
// re-attach), this lives in sessionStorage: it survives a reload and
// a network reconnect within the same tab, and is unique per tab. We
// key all game state (playerOrder, scores, colors, votes…) on this so
// a reconnecting player keeps their identity instead of orphaning.
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
    // sessionStorage unavailable (e.g. privacy mode) — fall back to a
    // volatile id; identity won't survive reload but the game works.
    return `${generateId()}${generateId()}`;
  }
}

// Collapse presences that share a uid (a brief reconnect can leave a
// ghost of the old connection) so a user never appears twice. Last
// one wins.
export function dedupeByUid<T extends { presence: { uid: string } }>(
  list: ReadonlyArray<T>,
): Array<T> {
  const byUid = new Map<string, T>();
  for (const item of list) byUid.set(item.presence.uid, item);
  return [...byUid.values()];
}
