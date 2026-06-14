// Client helpers for the active room/user counter (best-effort).

export type ActiveCounts = { rooms: number; users: number };

export async function pingRoom(room: string, uid: string): Promise<void> {
  try {
    await fetch('/api/rooms/ping', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ room, uid }),
    });
  } catch {
    // best-effort heartbeat
  }
}

export async function fetchActiveCounts(): Promise<ActiveCounts | null> {
  try {
    const res = await fetch('/api/rooms/active');
    if (!res.ok) throw new Error(`active ${res.status}`);
    const data = (await res.json()) as Partial<ActiveCounts>;
    if (typeof data.rooms === 'number' && typeof data.users === 'number') {
      return { rooms: data.rooms, users: data.users };
    }
    throw new Error('bad shape');
  } catch {
    // No backend (plain `pnpm dev`): show demo numbers so the badge can
    // be verified visually. Real counts come from the server in prod.
    if (import.meta.env.DEV) return { rooms: 3, users: 8 };
    return null;
  }
}
