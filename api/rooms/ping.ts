import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pingRoom } from '../_lib/rooms.js';

// POST /api/rooms/ping  { room, uid }
// Marks a room + user as currently active (best-effort, no auth — the
// count is cosmetic). Clients call this periodically while in a room.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  const { room, uid } = (req.body ?? {}) as { room?: unknown; uid?: unknown };
  if (typeof room !== 'string' || !room) {
    return res.status(400).json({ error: 'room required' });
  }
  try {
    await pingRoom(room, typeof uid === 'string' ? uid : '');
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'ping failed' });
  }
}
