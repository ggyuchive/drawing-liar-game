export function shuffle<T>(xs: ReadonlyArray<T>): Array<T> {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function tallyVotes(votes: Record<string, string>): {
  accusedId: string;
  counts: Record<string, number>;
} {
  const counts: Record<string, number> = {};
  for (const target of Object.values(votes)) {
    counts[target] = (counts[target] ?? 0) + 1;
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const accusedId = entries[0]?.[0] ?? '';
  return { accusedId, counts };
}

export function normalizeGuess(s: string): string {
  return s.trim().toLowerCase();
}

export type Outcome =
  | 'liarEscaped'
  | 'liarCaughtGuessRight'
  | 'liarCaughtGuessWrong';

export function applyScores(
  outcome: Outcome,
  playerOrder: ReadonlyArray<string>,
  liarId: string,
  scores: Record<string, number>,
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const id of playerOrder) {
    const prev = scores[id] ?? 0;
    if (id === liarId) {
      const delta =
        outcome === 'liarEscaped'
          ? 2
          : outcome === 'liarCaughtGuessRight'
            ? 1
            : 0;
      next[id] = prev + delta;
    } else {
      const delta =
        outcome === 'liarEscaped'
          ? 0
          : outcome === 'liarCaughtGuessRight'
            ? 1
            : 2;
      next[id] = prev + delta;
    }
  }
  return next;
}
