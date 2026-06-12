import { Redis } from '@upstash/redis';

// The server's view of a round. The KEYWORD ITSELF never lives here —
// only the deck name (public) and the chosen INDEX into that deck (the
// secret). Clients localize the word from deck+index via the parallel
// i18n decks, so the server stays language-agnostic and never holds
// keyword strings. `liarId` is the other secret withheld from the doc.
export type RoundSecret = {
  room: string;
  deck: string;
  keywordIndex: number;
  liarId: string;
  playerUids: string[];
};

// --- pure logic (unit-tested, no I/O) ---

// A category and its size, as the host reports it.
export type DeckRef = { deck: string; size: number };

// Pick the liar, the keyword's deck, and its index. All are server-side
// and random so none is derivable by any client (including the host,
// who may be the liar) — and the deck (category) is itself a hint, so
// it's chosen here across ALL categories, never picked by a player. The
// deck is weighted by size so every individual keyword is equally likely.
export function assignRound(
  playerUids: ReadonlyArray<string>,
  decks: ReadonlyArray<DeckRef>,
  rand: () => number = Math.random,
): { liarId: string; deck: string; keywordIndex: number } {
  if (playerUids.length === 0) throw new Error('no players');
  const liarId = playerUids[Math.floor(rand() * playerUids.length)];

  const valid = decks
    .map((d) => ({ deck: d.deck, size: Math.floor(d.size) }))
    .filter((d) => d.size > 0);
  if (valid.length === 0) {
    return { liarId, deck: decks[0]?.deck ?? '', keywordIndex: 0 };
  }
  const total = valid.reduce((sum, d) => sum + d.size, 0);
  let n = Math.floor(rand() * total);
  for (const d of valid) {
    if (n < d.size) return { liarId, deck: d.deck, keywordIndex: n };
    n -= d.size;
  }
  // Floating-point edge: fall back to the last deck's last word.
  const last = valid[valid.length - 1];
  return { liarId, deck: last.deck, keywordIndex: last.size - 1 };
}

export type RoleView =
  | { isLiar: true }
  | { isLiar: false; keywordDeck: string; keywordIndex: number };

// The per-client answer. A liar learns only that they're the liar; a
// non-liar player learns the keyword (deck+index). An unknown uid (a
// spectator who isn't in the round) gets neither. It NEVER reveals
// another player's role — the caller's uid is the only input.
export function roleView(secret: RoundSecret, uid: string): RoleView {
  if (uid === secret.liarId) return { isLiar: true };
  if (secret.playerUids.includes(uid)) {
    return {
      isLiar: false,
      keywordDeck: secret.deck,
      keywordIndex: secret.keywordIndex,
    };
  }
  return { isLiar: false, keywordDeck: '', keywordIndex: -1 };
}

// Opaque handle stored in the public document. It need not be
// unguessable: /me requires a token bound to the caller's uid and only
// ever returns that caller's own role, so knowing a roundId reveals
// nothing.
export function generateRoundId(): string {
  const part = () => Math.random().toString(36).slice(2);
  return `r_${part()}${part()}`;
}

// --- storage: Upstash Redis in prod, in-memory for a single dev box ---

const TTL_SEC = 60 * 60; // abandoned rounds expire on their own.
const key = (roundId: string) => `dlg:round:${roundId}`;

let redis: Redis | null = null;
const mem = new Map<string, { value: RoundSecret; exp: number }>();

// Use Upstash when its env vars are present (production / `vercel dev`
// with the integration linked); otherwise fall back to process memory.
// The in-memory map is per-instance, so it's only viable for a single
// dev instance — production must have Upstash configured.
//
// Accept both naming schemes: Vercel's Upstash integration injects
// `KV_REST_API_URL` / `KV_REST_API_TOKEN`, while a standalone Upstash
// setup uses `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
function store(): Redis | null {
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redis ??= new Redis({ url, token });
    return redis;
  }
  return null;
}

export async function putRound(
  roundId: string,
  secret: RoundSecret,
): Promise<void> {
  const r = store();
  if (r) {
    await r.set(key(roundId), secret, { ex: TTL_SEC });
    return;
  }
  mem.set(roundId, { value: secret, exp: Date.now() + TTL_SEC * 1000 });
}

export async function getRoundSecret(
  roundId: string,
): Promise<RoundSecret | null> {
  const r = store();
  if (r) return (await r.get<RoundSecret>(key(roundId))) ?? null;
  const entry = mem.get(roundId);
  if (!entry) return null;
  if (entry.exp < Date.now()) {
    mem.delete(roundId);
    return null;
  }
  return entry.value;
}
