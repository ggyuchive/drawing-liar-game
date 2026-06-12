import { beforeAll, describe, expect, it } from 'vitest';
import { signSession, verifySession } from './token';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-please-rotate';
});

describe('session token', () => {
  it('round-trips uid + room', async () => {
    const token = await signSession({ uid: 'u1', room: 'ROOM' });
    expect(await verifySession(token)).toEqual({ uid: 'u1', room: 'ROOM' });
  });

  it('accepts a matching expected room', async () => {
    const token = await signSession({ uid: 'u1', room: 'ROOM' });
    expect(await verifySession(token, 'ROOM')).toMatchObject({ uid: 'u1' });
  });

  it('rejects a room mismatch', async () => {
    const token = await signSession({ uid: 'u1', room: 'ROOM' });
    await expect(verifySession(token, 'OTHER')).rejects.toThrow();
  });

  it('rejects a tampered token', async () => {
    const token = await signSession({ uid: 'u1', room: 'ROOM' });
    await expect(verifySession(token + 'x')).rejects.toThrow();
  });

  it('rejects an empty token', async () => {
    await expect(verifySession('')).rejects.toThrow();
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signSession({ uid: 'u1', room: 'ROOM' });
    process.env.JWT_SECRET = 'a-different-secret';
    await expect(verifySession(token)).rejects.toThrow();
    process.env.JWT_SECRET = 'test-secret-please-rotate';
  });
});
