import { SignJWT, jwtVerify } from 'jose';

// A short-lived signed token binds a caller to {uid, room}. It carries
// no secret about the round — it only lets the server trust "this
// caller is uid U in room R", so /me can return *that caller's own*
// role and nothing else. No accounts; the uid is the existing stable
// per-tab identity (see src/util.ts getSessionUid).

export type SessionClaims = { uid: string; room: string };

const DEFAULT_TTL_SEC = 60 * 60; // 1 hour — long enough for one game.

function secretKey(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(s);
}

export async function signSession(
  claims: SessionClaims,
  ttlSec: number = DEFAULT_TTL_SEC,
): Promise<string> {
  return new SignJWT({ uid: claims.uid, room: claims.room })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlSec}s`)
    .sign(secretKey());
}

// Verifies signature + expiry, and (when given) that the token's room
// matches the room being acted on. Throws on any failure.
export async function verifySession(
  token: string,
  expectRoom?: string,
): Promise<SessionClaims> {
  if (!token) throw new Error('missing token');
  const { payload } = await jwtVerify(token, secretKey());
  const uid = typeof payload.uid === 'string' ? payload.uid : '';
  const room = typeof payload.room === 'string' ? payload.room : '';
  if (!uid || !room) throw new Error('invalid token claims');
  if (expectRoom !== undefined && room !== expectRoom) {
    throw new Error('room mismatch');
  }
  return { uid, room };
}
