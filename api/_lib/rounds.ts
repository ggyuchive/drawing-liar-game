import { Redis } from '@upstash/redis';

// The server's view of a round. The keyword text never lives here — only
// the deck name (public) and the chosen index (secret); clients localize
// from deck+index via the parallel i18n decks. `liarId` is also withheld
// from the doc.
export type RoundSecret = {
  room: string;
  deck: string;
  keywordIndex: number;
  liarId: string;
  playerUids: string[];
  // Fool mode: the liar gets a different keyword in the same deck.
  // `mode` defaults to 'classic'; `liarKeywordIndex` is -1 unless 'fool'.
  mode?: 'classic' | 'fool';
  liarKeywordIndex?: number;
};

// --- pure logic (unit-tested, no I/O) ---

export type DeckRef = { deck: string; size: number };

// Pick liar + deck + index, all server-side and random so no client
// (including the host, who may be the liar) can derive them. The deck is
// chosen here across all categories (it's itself a hint), weighted by
// size so every keyword is equally likely.
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

// Pick a deck index different from `exclude`, uniformly among the rest.
// Returns `exclude` unchanged when the deck has fewer than two words.
export function pickDifferentIndex(
  size: number,
  exclude: number,
  rand: () => number = Math.random,
): number {
  const n = Math.floor(size);
  if (n <= 1) return exclude;
  let i = Math.floor(rand() * (n - 1)); // 0 .. n-2
  if (i >= exclude) i += 1; // skip the excluded slot
  return i;
}

export type RoleView =
  | { isLiar: true; keywordDeck: string }
  | { isLiar: false; keywordDeck: string; keywordIndex: number };

// The per-client answer, keyed on the caller's own uid only (it never
// reveals another player's role). Classic: the liar gets the category but
// not the keyword. Fool: the liar is told isLiar:false with the different
// keyword. Non-liars get the real keyword; unknown uids get neither.
export function roleView(secret: RoundSecret, uid: string): RoleView {
  if (uid === secret.liarId) {
    if (secret.mode === 'fool') {
      return {
        isLiar: false,
        keywordDeck: secret.deck,
        keywordIndex: secret.liarKeywordIndex ?? secret.keywordIndex,
      };
    }
    return { isLiar: true, keywordDeck: secret.deck };
  }
  if (secret.playerUids.includes(uid)) {
    return {
      isLiar: false,
      keywordDeck: secret.deck,
      keywordIndex: secret.keywordIndex,
    };
  }
  return { isLiar: false, keywordDeck: '', keywordIndex: -1 };
}

// Opaque handle in the public doc. Need not be unguessable: /me requires
// a uid-bound token and only returns the caller's own role.
export function generateRoundId(): string {
  const part = () => Math.random().toString(36).slice(2);
  return `r_${part()}${part()}`;
}

// --- storage: Upstash Redis in prod, in-memory for a single dev box ---

const TTL_SEC = 60 * 60; // abandoned rounds expire on their own.
const key = (roundId: string) => `dlg:round:${roundId}`;

let redis: Redis | null = null;
const mem = new Map<string, { value: RoundSecret; exp: number }>();

// Upstash when its env vars are present, else process memory (per-
// instance, dev only — prod must have Upstash). Accept both Vercel's
// KV_REST_API_* and standalone UPSTASH_REDIS_REST_* naming.
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
