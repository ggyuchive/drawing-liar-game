import { describe, expect, it } from 'vitest';
import { applyScores, normalizeGuess, shuffle, tallyVotes } from './state';

describe('applyScores — the finalised 2×2 table', () => {
  const order = ['p1', 'p2', 'p3'];
  const liar = 'p2';
  const zero = { p1: 0, p2: 0, p3: 0 };

  it('caught + guessed → liar +1, others +1', () => {
    const s = applyScores({ caught: true, guessed: true }, order, liar, zero);
    expect(s).toEqual({ p1: 1, p2: 1, p3: 1 });
  });

  it('caught + blanked → liar 0, others +2', () => {
    const s = applyScores({ caught: true, guessed: false }, order, liar, zero);
    expect(s).toEqual({ p1: 2, p2: 0, p3: 2 });
  });

  it('escaped + guessed → liar +3, others 0', () => {
    const s = applyScores({ caught: false, guessed: true }, order, liar, zero);
    expect(s).toEqual({ p1: 0, p2: 3, p3: 0 });
  });

  it('escaped + blanked → liar +2, others +1', () => {
    const s = applyScores({ caught: false, guessed: false }, order, liar, zero);
    expect(s).toEqual({ p1: 1, p2: 2, p3: 1 });
  });

  it('accumulates onto existing scores', () => {
    const prev = { p1: 5, p2: 1, p3: 2 };
    const s = applyScores({ caught: true, guessed: false }, order, liar, prev);
    expect(s).toEqual({ p1: 7, p2: 1, p3: 4 });
  });
});

describe('tallyVotes', () => {
  it('returns the most-voted player as accused', () => {
    const { accusedId, counts } = tallyVotes({ p1: 'p2', p3: 'p2', p2: 'p1' });
    expect(accusedId).toBe('p2');
    expect(counts).toEqual({ p2: 2, p1: 1 });
  });

  it('handles no votes', () => {
    expect(tallyVotes({}).accusedId).toBe('');
  });
});

describe('normalizeGuess', () => {
  it('trims and lowercases', () => {
    expect(normalizeGuess('  LightHouse  ')).toBe('lighthouse');
  });
});

describe('shuffle', () => {
  it('keeps the same multiset of elements', () => {
    const input = ['a', 'b', 'c', 'd', 'e'];
    const out = shuffle(input);
    expect(out).toHaveLength(input.length);
    expect([...out].sort()).toEqual([...input].sort());
  });

  it('does not mutate the input', () => {
    const input = ['a', 'b', 'c'];
    shuffle(input);
    expect(input).toEqual(['a', 'b', 'c']);
  });
});
