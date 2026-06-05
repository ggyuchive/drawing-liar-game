import { describe, expect, it } from 'vitest';
import {
  assignColors,
  electHost,
  fillMissingColors,
  isSpectator,
  nameIsTaken,
  pickPlayerOrder,
  resolveTurnAdvance,
} from './engine';
import { applyScores, tallyVotes } from './state';
import { dedupeByUid } from '../util';

// A multi-user game simulation that runs entirely in memory: no
// Yorkie server, no browser, no timers. It drives the same pure
// functions Room.tsx uses inside its update() callbacks, so a full
// multi-player game can be exercised deterministically in CI.

const noShuffle = <T>(xs: ReadonlyArray<T>): Array<T> => [...xs];

/** Play every drawing turn of a round, the way the turn timer / pointer-up
 *  repeatedly calls resolveTurnAdvance until the round ends. */
function playOutTurns(playerCount: number, turnsPerPlayer: number) {
  let strokesDone = 0;
  let turnIndex = 0;
  let phase: 'drawing' | 'voting' = 'drawing';
  let advances = 0;
  const drawerSequence: number[] = [];
  while (phase === 'drawing' && advances < 10_000) {
    drawerSequence.push(turnIndex);
    const adv = resolveTurnAdvance(
      strokesDone,
      turnIndex,
      playerCount,
      turnsPerPlayer,
    );
    strokesDone = adv.strokesDone;
    advances += 1;
    if (adv.toVoting) phase = 'voting';
    else turnIndex = adv.turnIndex;
  }
  return { advances, phase, drawerSequence };
}

describe('a full 4-player round', () => {
  const players = ['alice', 'bob', 'carol', 'dave'];
  const turnsPerPlayer = 2;

  it('reaches voting after exactly playerCount × turnsPerPlayer turns', () => {
    const { advances, phase } = playOutTurns(players.length, turnsPerPlayer);
    expect(phase).toBe('voting');
    // 4 × 2 = 8. Not 1, not 7 — guards the "ends before the timer and
    // jumps straight to voting" cascade bug at the logic level.
    expect(advances).toBe(8);
  });

  it('gives every player an equal number of turns', () => {
    const { drawerSequence } = playOutTurns(players.length, turnsPerPlayer);
    for (let i = 0; i < players.length; i++) {
      const turns = drawerSequence.filter((t) => t === i).length;
      expect(turns).toBe(turnsPerPlayer);
    }
  });

  it('scores a caught-and-guessed liar via the shared tally + table', () => {
    const order = pickPlayerOrder(players, noShuffle);
    const liar = 'bob';
    // Everyone but the liar votes for bob; bob misdirects to alice.
    const votes: Record<string, string> = {
      alice: 'bob',
      carol: 'bob',
      dave: 'bob',
      bob: 'alice',
    };
    const { accusedId } = tallyVotes(votes);
    const caught = accusedId === liar;
    expect(caught).toBe(true);

    const scores = applyScores(
      { caught, guessed: true },
      order,
      liar,
      Object.fromEntries(order.map((id) => [id, 0])),
    );
    expect(scores).toEqual({ alice: 1, bob: 1, carol: 1, dave: 1 });
  });
});

describe('host hand-off across clients', () => {
  it('every client independently agrees on the host (convergence)', () => {
    const present = ['dave', 'alice', 'carol', 'bob'];
    // Three clients each compute the host from their own (differently
    // ordered) view of the same presence set.
    const views = [present, [...present].reverse(), ['carol', 'bob', 'alice', 'dave']];
    const elected = views.map((v) => electHost(v, ''));
    expect(new Set(elected).size).toBe(1);
    expect(elected[0]).toBe('alice');
  });

  it('promotes the next survivor when the host disconnects mid-game', () => {
    let present = ['alice', 'bob', 'carol'];
    let host = electHost(present, '') as string;
    expect(host).toBe('alice');
    // Alice's tab closes.
    present = present.filter((id) => id !== 'alice');
    host = electHost(present, host) as string;
    expect(host).toBe('bob');
  });
});

describe('player cap and spectators', () => {
  it('seats the first 8 and makes a 9th player a spectator', () => {
    const present = Array.from({ length: 9 }, (_, i) => `p${i}`);
    const order = pickPlayerOrder(present, noShuffle);
    expect(order).toHaveLength(8);
    expect(isSpectator('drawing', order, 'p8')).toBe(true);
    expect(isSpectator('drawing', order, 'p0')).toBe(false);
  });

  it('folds a mid-round joiner into the next round with a fresh color', () => {
    const round1 = ['alice', 'bob', 'carol', 'dave'];
    const palette = ['red', 'green', 'blue', 'orange', 'purple', 'teal'];
    const colors1 = assignColors(round1, palette);

    // 'erin' joins mid-round 1 → spectates.
    expect(isSpectator('voting', round1, 'erin')).toBe(true);

    // Round 2 includes erin; existing colors are preserved.
    const round2 = pickPlayerOrder([...round1, 'erin'], noShuffle);
    const colors2 = fillMissingColors(round2, colors1, palette);
    expect(colors2.alice).toBe(colors1.alice);
    expect(colors2.erin).toBeDefined();
    expect(isSpectator('drawing', round2, 'erin')).toBe(false);
    // Still all distinct.
    expect(new Set(Object.values(colors2)).size).toBe(round2.length);
  });
});

describe('reconnect / reload identity stability', () => {
  // Game state is keyed on the stable per-tab uid, not the Yorkie
  // connection id — so a player who reloads (new connection id, same
  // uid) keeps their place, score and name instead of orphaning.
  it('keeps a reloaded player in the round and resolves their name', () => {
    const order = ['u-alice', 'u-bob', 'u-carol'];
    // bob reloads: brand-new Yorkie clientID, but the same uid in presence.
    const presencesAfterReload = [
      { clientID: 'conn-1', presence: { uid: 'u-alice', name: 'alice' } },
      { clientID: 'conn-9', presence: { uid: 'u-bob', name: 'bob' } }, // new conn id
      { clientID: 'conn-3', presence: { uid: 'u-carol', name: 'carol' } },
    ];
    const nameFor = (uid: string) =>
      presencesAfterReload.find((p) => p.presence.uid === uid)?.presence.name ??
      '???';

    expect(isSpectator('drawing', order, 'u-bob')).toBe(false);
    expect(nameFor('u-bob')).toBe('bob'); // not '???'
  });

  it('collapses a lingering ghost connection of the same user', () => {
    const presences = [
      { clientID: 'old', presence: { uid: 'u-bob', name: 'bob' } }, // ghost
      { clientID: 'new', presence: { uid: 'u-bob', name: 'bob' } }, // reconnected
      { clientID: 'a', presence: { uid: 'u-alice', name: 'alice' } },
    ];
    const unique = dedupeByUid(presences);
    expect(unique).toHaveLength(2);
    expect(unique.map((p) => p.presence.uid).sort()).toEqual([
      'u-alice',
      'u-bob',
    ]);
  });
});

describe('duplicate names in one room', () => {
  it('bounces exactly one of two clients sharing a name', () => {
    const present = [
      { clientID: 'a', name: 'doodler' },
      { clientID: 'b', name: 'doodler' },
    ];
    const bounced = present.filter((p) =>
      nameIsTaken(present, p.clientID, p.name),
    );
    expect(bounced).toHaveLength(1);
    expect(bounced[0].clientID).toBe('b');
  });
});
