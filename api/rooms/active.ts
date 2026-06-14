import type { VercelRequest, VercelResponse } from '@vercel/node';
import { activeCounts } from '../_lib/rooms';

// GET /api/rooms/active -> { rooms, users }
// Rooms and users pinged within the active window.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  try {
    const counts = await activeCounts();
    return res.status(200).json(counts);
  } catch {
    return res.status(500).json({ error: 'count failed' });
  }
}
