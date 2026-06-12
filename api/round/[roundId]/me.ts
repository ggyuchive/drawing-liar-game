import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySession } from '../../_lib/token';
import { getRoundSecret, roleView } from '../../_lib/rounds';

function bearer(req: VercelRequest): string {
  const h = req.headers.authorization ?? '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}

// GET /api/round/:roundId/me -> { isLiar } | { isLiar:false, keyword… }
// Returns ONLY the caller's own role. The token binds the uid, so a
// client can never ask "is Bob the liar?" — it always gets its own view.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
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
  return res.status(200).json(roleView(secret, claims.uid));
}
