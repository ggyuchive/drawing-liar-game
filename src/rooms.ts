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

// 'unknown' = no backend (e.g. localhost) or a failed request; the UI
// shows zeros rather than fabricating numbers.
export async function fetchActiveCounts(): Promise<ActiveCounts | 'unknown'> {
  try {
    const res = await fetch('/api/rooms/active');
    if (!res.ok) throw new Error(`active ${res.status}`);
    const data = (await res.json()) as Partial<ActiveCounts>;
    if (typeof data.rooms === 'number' && typeof data.users === 'number') {
      return { rooms: data.rooms, users: data.users };
    }
    throw new Error('bad shape');
  } catch {
    return 'unknown';
  }
}
