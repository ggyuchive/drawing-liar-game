// Client wrapper for the keyword-secrecy backend (Vercel Functions). The
// server is authoritative and serves each client only its own role, so
// nothing is readable from the doc before reveal. Under plain `pnpm dev`
// (no Functions) DEV falls back to an INSECURE local assignment the host
// writes into the doc; in prod a failure surfaces as a retryable error.

const tokens = new Map<string, Promise<string>>();

const tokenKey = (room: string, uid: string) => `${room}:${uid}`;

async function getToken(room: string, uid: string): Promise<string> {
  const key = tokenKey(room, uid);
  let pending = tokens.get(key);
  if (!pending) {
    pending = fetch('/api/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ uid, room }),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`session ${res.status}`);
      const { token } = (await res.json()) as { token?: string };
      if (!token) throw new Error('session: no token');
      return token;
    });
    // Don't cache a rejected token — let the next call retry.
    pending.catch(() => tokens.delete(key));
    tokens.set(key, pending);
  }
  return pending;
}

export type DeckRef = { deck: string; size: number };

export type StartResult = {
  roundId: string;
  // Present only in the insecure DEV fallback (the host writes it into the
  // doc); absent on the secure server path. liarKeywordIndex is the liar's
  // fool-mode word (-1 in classic).
  assignment?: {
    liarId: string;
    deck: string;
    keywordIndex: number;
    liarKeywordIndex: number;
  };
};

// Pick a keyword across all decks, weighted by size. DEV fallback only
// (prod does this server-side).
function pickAcrossDecks(decks: DeckRef[]): { deck: string; keywordIndex: number } {
  const valid = decks.filter((d) => Math.floor(d.size) > 0);
  if (valid.length === 0) return { deck: decks[0]?.deck ?? '', keywordIndex: 0 };
  const total = valid.reduce((sum, d) => sum + Math.floor(d.size), 0);
  let n = Math.floor(Math.random() * total);
  for (const d of valid) {
    const size = Math.floor(d.size);
    if (n < size) return { deck: d.deck, keywordIndex: n };
    n -= size;
  }
  const last = valid[valid.length - 1];
  return { deck: last.deck, keywordIndex: Math.floor(last.size) - 1 };
}

// Deck index different from `exclude` (mirrors the server, DEV fallback).
function pickDifferentIndex(size: number, exclude: number): number {
  if (size <= 1) return exclude;
  let i = Math.floor(Math.random() * (size - 1));
  if (i >= exclude) i += 1;
  return i;
}

export async function startRound(args: {
  room: string;
  uid: string;
  decks: DeckRef[];
  playerUids: string[];
  mode: 'classic' | 'fool';
}): Promise<StartResult> {
  const { room, uid, decks, playerUids, mode } = args;
  try {
    const token = await getToken(room, uid);
    const res = await fetch('/api/round/start', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ room, decks, playerUids, mode }),
    });
    if (!res.ok) throw new Error(`start ${res.status}`);
    const { roundId } = (await res.json()) as { roundId?: string };
    if (!roundId) throw new Error('start: no roundId');
    return { roundId };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(
        '[secrets] round/start failed — using INSECURE local fallback ' +
          '(run `vercel dev` with JWT_SECRET + Upstash for the real path)',
        err,
      );
      const liarId = playerUids[Math.floor(Math.random() * playerUids.length)];
      const { deck, keywordIndex } = pickAcrossDecks(decks);
      const size = Math.floor(decks.find((d) => d.deck === deck)?.size ?? 0);
      const liarKeywordIndex =
        mode === 'fool' ? pickDifferentIndex(size, keywordIndex) : -1;
      const part = () => Math.random().toString(36).slice(2);
      return {
        roundId: `local_${part()}`,
        assignment: { liarId, deck, keywordIndex, liarKeywordIndex },
      };
    }
    throw err;
  }
}

export type RoleView =
  | { isLiar: true; keywordDeck: string }
  | { isLiar: false; keywordDeck: string; keywordIndex: number };

export async function fetchRole(
  room: string,
  uid: string,
  roundId: string,
): Promise<RoleView> {
  const token = await getToken(room, uid);
  const res = await fetch(`/api/round/${encodeURIComponent(roundId)}/me`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`me ${res.status}`);
  return (await res.json()) as RoleView;
}

export type RevealResult = {
  keywordDeck: string;
  keywordIndex: number;
  liarKeywordIndex: number;
  liarId: string;
};

export async function revealRound(
  room: string,
  uid: string,
  roundId: string,
): Promise<RevealResult> {
  const token = await getToken(room, uid);
  const res = await fetch(`/api/round/${encodeURIComponent(roundId)}/reveal`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`reveal ${res.status}`);
  return (await res.json()) as RevealResult;
}
