import { Redis } from '@upstash/redis';

// Tracks active rooms AND active users so the landing page can show a
// live count. Each in-room client pings periodically with its room +
// uid; a room/user counts as active if pinged within TTL_MS. Stored as
// two Redis sorted sets (member -> last-ping-epoch), pruned on read.
// Falls back to in-memory maps for a single dev instance.

const TTL_MS = 90_000;
const ROOMS_KEY = 'dlg:rooms';
const USERS_KEY = 'dlg:users';

let redis: Redis | null = null;
const memRooms = new Map<string, number>();
const memUsers = new Map<string, number>();

function getRedis(): Redis | null {
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

export async function pingRoom(room: string, uid: string): Promise<void> {
  const now = Date.now();
  const r = getRedis();
  if (r) {
    const tasks = [r.zadd(ROOMS_KEY, { score: now, member: room })];
    if (uid) tasks.push(r.zadd(USERS_KEY, { score: now, member: uid }));
    await Promise.all(tasks);
    return;
  }
  memRooms.set(room, now);
  if (uid) memUsers.set(uid, now);
}

export type ActiveCounts = { rooms: number; users: number };

export async function activeCounts(): Promise<ActiveCounts> {
  const cutoff = Date.now() - TTL_MS;
  const r = getRedis();
  if (r) {
    await Promise.all([
      r.zremrangebyscore(ROOMS_KEY, 0, cutoff),
      r.zremrangebyscore(USERS_KEY, 0, cutoff),
    ]);
    const [rooms, users] = await Promise.all([
      r.zcard(ROOMS_KEY),
      r.zcard(USERS_KEY),
    ]);
    return { rooms: rooms ?? 0, users: users ?? 0 };
  }
  return {
    rooms: prune(memRooms, cutoff),
    users: prune(memUsers, cutoff),
  };
}

function prune(m: Map<string, number>, cutoff: number): number {
  let count = 0;
  for (const [key, ts] of m) {
    if (ts < cutoff) m.delete(key);
    else count++;
  }
  return count;
}
