import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySession } from '../../_lib/token.js';
import { getRoundSecret } from '../../_lib/rounds.js';

function bearer(req: VercelRequest): string {
  const h = req.headers.authorization ?? '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}

// POST /api/round/:roundId/reveal -> { keywordDeck, keywordIndex, liarId }
// Releases the answer at the reveal transition so the host can publish
// it into the document for everyone. Any player in the round's room may
// trigger it; the values are about to be public anyway.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  const roundId = String(req.query.roundId ?? '');
  if (!roundId) return res.status(400).json({ error: 'roundId required' });

  let claims;
  try {
    claims = await verifySession(bearer(req));
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const secret = await getRoundSecret(roundId);
  if (!secret) return res.status(404).json({ error: 'unknown round' });
  if (secret.room !== claims.room) {
    return res.status(403).json({ error: 'wrong room' });
  }
  return res.status(200).json({
    keywordDeck: secret.deck,
    keywordIndex: secret.keywordIndex,
    liarKeywordIndex: secret.liarKeywordIndex ?? -1,
    liarId: secret.liarId,
  });
}
