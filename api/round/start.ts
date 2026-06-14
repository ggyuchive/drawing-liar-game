import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySession } from '../_lib/token.js';
import { assignRound, generateRoundId, putRound } from '../_lib/rounds.js';

function bearer(req: VercelRequest): string {
  const h = req.headers.authorization ?? '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}

// POST /api/round/start  { room, decks: [{deck,size}], playerUids }
//   -> { roundId }
// The server assigns the keyword's deck + index AND the liar, stores
// them server-side, and returns ONLY an opaque roundId. The category is
// itself a hint, so it's chosen here across all decks — never by the
// host, who may be the liar and never learns the answer.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  const body = (req.body ?? {}) as {
    room?: unknown;
    decks?: unknown;
    playerUids?: unknown;
  };
  const { room, decks, playerUids } = body;
  const validDecks =
    Array.isArray(decks) &&
    decks.length > 0 &&
    decks.every(
      (d) =>
        d &&
        typeof d === 'object' &&
        typeof (d as { deck?: unknown }).deck === 'string' &&
        typeof (d as { size?: unknown }).size === 'number',
    );
  if (
    typeof room !== 'string' ||
    !validDecks ||
    !Array.isArray(playerUids) ||
    playerUids.length === 0 ||
    playerUids.some((u) => typeof u !== 'string')
  ) {
    return res.status(400).json({ error: 'invalid body' });
  }

  let claims;
  try {
    claims = await verifySession(bearer(req), room);
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
  // The caller must be playing in this round (a basic sanity gate).
  if (!(playerUids as string[]).includes(claims.uid)) {
    return res.status(403).json({ error: 'not a player' });
  }

  const { liarId, deck, keywordIndex } = assignRound(
    playerUids as string[],
    decks as Array<{ deck: string; size: number }>,
  );
  const roundId = generateRoundId();
  await putRound(roundId, {
    room,
    deck,
    keywordIndex,
    liarId,
    playerUids: playerUids as string[],
  });
  return res.status(200).json({ roundId });
}
