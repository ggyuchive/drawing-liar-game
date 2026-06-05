import { describe, expect, it } from 'vitest';
import {
  assignColors,
  electHost,
  fillMissingColors,
  isSpectator,
  MAX_PLAYERS,
  nameIsTaken,
  pickPlayerOrder,
  resolveTurnAdvance,
} from './engine';

// Identity "shuffle" so player order is deterministic in tests.
const noShuffle = <T>(xs: ReadonlyArray<T>): Array<T> => [...xs];

describe('electHost', () => {
  it('returns null when nobody is present', () => {
    expect(electHost([], '')).toBeNull();
  });

  it('elects the smallest clientID when there is no host', () => {
    expect(electHost(['c', 'a', 'b'], '')).toBe('a');
  });

  it('keeps the current host while they are present', () => {
    expect(electHost(['a', 'b', 'c'], 'b')).toBe('b');
  });

  it('re-elects the smallest survivor when the host has left', () => {
    expect(electHost(['c', 'd', 'b'], 'a')).toBe('b');
  });

  it('is deterministic across clients (same input → same host)', () => {
    const present = ['z', 'm', 'a', 'q'];
    expect(electHost(present, 'gone')).toBe(electHost([...present].reverse(), 'gone'));
  });
});

describe('pickPlayerOrder', () => {
  it('takes the first MAX_PLAYERS by join order', () => {
    const present = Array.from({ length: 10 }, (_, i) => `p${i}`);
    const order = pickPlayerOrder(present, noShuffle);
    expect(order).toHaveLength(MAX_PLAYERS);
    expect(order).toEqual(present.slice(0, MAX_PLAYERS));
  });

  it('keeps everyone when under the cap', () => {
    expect(pickPlayerOrder(['a', 'b', 'c'], noShuffle)).toEqual(['a', 'b', 'c']);
  });
});

describe('assignColors', () => {
  it('gives each player a distinct color', () => {
    const colors = assignColors(['a', 'b', 'c'], ['red', 'green', 'blue']);
    expect(colors).toEqual({ a: 'red', b: 'green', c: 'blue' });
    expect(new Set(Object.values(colors)).size).toBe(3);
  });
});

describe('fillMissingColors', () => {
  it('preserves existing colors and assigns unused ones to newcomers', () => {
    const out = fillMissingColors(
      ['a', 'b', 'c'],
      { a: 'red', b: 'green' },
      ['red', 'green', 'blue', 'orange'],
    );
    expect(out.a).toBe('red');
    expect(out.b).toBe('green');
    expect(out.c).toBe('blue'); // first unused
  });
});

describe('resolveTurnAdvance — turn rotation and the voting boundary', () => {
  it('rotates to the next drawer mid-round', () => {
    const adv = resolveTurnAdvance(0, 0, 3, 2);
    expect(adv).toEqual({ strokesDone: 1, toVoting: false, turnIndex: 1 });
  });

  it('wraps turnIndex around the players', () => {
    expect(resolveTurnAdvance(2, 2, 3, 2).turnIndex).toBe(0);
  });

  it('moves to voting only after the final turn, not before', () => {
    // 3 players × 2 turns = 6 turns. Turns 1..5 rotate; turn 6 votes.
    for (let done = 0; done < 5; done++) {
      expect(resolveTurnAdvance(done, 0, 3, 2).toVoting).toBe(false);
    }
    expect(resolveTurnAdvance(5, 0, 3, 2).toVoting).toBe(true);
  });
});

describe('isSpectator', () => {
  it('is false in the lobby', () => {
    expect(isSpectator('lobby', [], 'a')).toBe(false);
  });

  it('is false for a player in the round order', () => {
    expect(isSpectator('drawing', ['a', 'b'], 'a')).toBe(false);
  });

  it('is true for someone who joined mid-round', () => {
    expect(isSpectator('drawing', ['a', 'b'], 'c')).toBe(true);
  });
});

describe('nameIsTaken — duplicate-name resolution', () => {
  const present = [
    { clientID: 'a', name: 'doodler' },
    { clientID: 'b', name: 'doodler' },
    { clientID: 'c', name: 'unique' },
  ];

  it('tells the larger-id clashing client the name is taken', () => {
    expect(nameIsTaken(present, 'b', 'doodler')).toBe(true);
  });

  it('lets the smaller-id clashing client keep the name', () => {
    expect(nameIsTaken(present, 'a', 'doodler')).toBe(false);
  });

  it('is fine for a unique name', () => {
    expect(nameIsTaken(present, 'c', 'unique')).toBe(false);
  });
});
