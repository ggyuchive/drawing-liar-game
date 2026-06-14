import type { VercelRequest, VercelResponse } from '@vercel/node';
import { signSession } from './_lib/token.js';

// POST /api/session  { uid, room } -> { token }
// Issues a signed token binding the caller to {uid, room}. No identity
// proof is required: the token only gates "your own role" later, so a
// forged uid just lets you ask about a role you'd be told anyway.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  const body = (req.body ?? {}) as { uid?: unknown; room?: unknown };
  const { uid, room } = body;
  if (typeof uid !== 'string' || !uid || typeof room !== 'string' || !room) {
    return res.status(400).json({ error: 'uid and room required' });
  }
  try {
    const token = await signSession({ uid, room });
    return res.status(200).json({ token });
  } catch {
    return res.status(500).json({ error: 'could not issue token' });
  }
}
