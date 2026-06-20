import { describe, expect, it } from 'vitest';
import {
  assignRound,
  pickDifferentIndex,
  roleView,
  generateRoundId,
  type RoundSecret,
} from './rounds';

describe('assignRound', () => {
  const decks = [
    { deck: 'general', size: 10 },
    { deck: 'food', size: 6 },
    { deck: 'animals', size: 4 },
  ];

  it('picks a liar, a real deck, and a valid index within it', () => {
    const players = ['a', 'b', 'c', 'd'];
    const sizeOf = Object.fromEntries(decks.map((d) => [d.deck, d.size]));
    for (let i = 0; i < 500; i++) {
      const { liarId, deck, keywordIndex } = assignRound(players, decks);
      expect(players).toContain(liarId);
      expect(sizeOf).toHaveProperty(deck);
      expect(keywordIndex).toBeGreaterThanOrEqual(0);
      expect(keywordIndex).toBeLessThan(sizeOf[deck]);
    }
  });

  it('spans every category over many draws (no filtering)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      seen.add(assignRound(['a'], decks).deck);
    }
    expect(seen).toEqual(new Set(['general', 'food', 'animals']));
  });

  it('is deterministic with a seeded rand', () => {
    // rand=0.5 → liar index 1 of ['a','b','c']; weighted pick of 0.5 of
    // total 20 = 10 → past general(10) into food at index 0.
    const rand = () => 0.5;
    expect(assignRound(['a', 'b', 'c'], decks, rand)).toEqual({
      liarId: 'b',
      deck: 'food',
      keywordIndex: 0,
    });
  });

  it('skips empty decks and survives all-empty input', () => {
    const withEmpty = [
      { deck: 'empty', size: 0 },
      { deck: 'real', size: 3 },
    ];
    for (let i = 0; i < 200; i++) {
      expect(assignRound(['a'], withEmpty).deck).toBe('real');
    }
    expect(assignRound(['a'], [{ deck: 'x', size: 0 }]).keywordIndex).toBe(0);
  });

  it('throws when there are no players', () => {
    expect(() => assignRound([], decks)).toThrow();
  });
});

describe('roleView', () => {
  const secret: RoundSecret = {
    room: 'ROOM',
    deck: 'general',
    keywordIndex: 7,
    liarId: 'liar',
    playerUids: ['liar', 'p1', 'p2'],
  };

  it('tells the liar the category (deck) but not the keyword index', () => {
    const view = roleView(secret, 'liar');
    expect(view).toEqual({ isLiar: true, keywordDeck: 'general' });
    expect(view).not.toHaveProperty('keywordIndex');
  });

  it('gives a non-liar player the keyword deck + index', () => {
    expect(roleView(secret, 'p1')).toEqual({
      isLiar: false,
      keywordDeck: 'general',
      keywordIndex: 7,
    });
  });

  it('never leaks the keyword to a non-player (spectator)', () => {
    expect(roleView(secret, 'stranger')).toEqual({
      isLiar: false,
      keywordDeck: '',
      keywordIndex: -1,
    });
  });

  it('never reveals another player as the liar', () => {
    // Whatever uid asks, the answer is only ever about that uid.
    for (const uid of ['p1', 'p2', 'stranger']) {
      expect(roleView(secret, uid).isLiar).toBe(false);
    }
  });

  it('fool mode: tells the liar they are NOT the liar, with a different word', () => {
    const fool: RoundSecret = {
      ...secret,
      mode: 'fool',
      liarKeywordIndex: 2,
    };
    // The liar is fooled: isLiar false, and given the alternate index.
    expect(roleView(fool, 'liar')).toEqual({
      isLiar: false,
      keywordDeck: 'general',
      keywordIndex: 2,
    });
    // Non-liars still get the real keyword index.
    expect(roleView(fool, 'p1')).toEqual({
      isLiar: false,
      keywordDeck: 'general',
      keywordIndex: 7,
    });
  });
});

describe('pickDifferentIndex', () => {
  it('returns an index different from exclude, within range', () => {
    for (let i = 0; i < 500; i++) {
      const got = pickDifferentIndex(5, 2);
      expect(got).toBeGreaterThanOrEqual(0);
      expect(got).toBeLessThan(5);
      expect(got).not.toBe(2);
    }
  });

  it('covers every other index over many draws', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(pickDifferentIndex(4, 1));
    expect(seen).toEqual(new Set([0, 2, 3]));
  });

  it('returns exclude unchanged when the deck has fewer than two words', () => {
    expect(pickDifferentIndex(1, 0)).toBe(0);
    expect(pickDifferentIndex(0, 0)).toBe(0);
  });
});

describe('generateRoundId', () => {
  it('produces distinct opaque handles', () => {
    const a = generateRoundId();
    const b = generateRoundId();
    expect(a).toMatch(/^r_/);
    expect(a).not.toBe(b);
  });
});
