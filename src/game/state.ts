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

export type ScoreOutcome = {
  caught: boolean;
  guessed: boolean;
};

// The finalised 2×2 table from docs/design/rules-v1.md
// § "Scoring — finalised 2×2". Two axes (caught × guessed), four
// cells, returned as [liarDelta, nonLiarDelta].
function deltas(outcome: ScoreOutcome): [number, number] {
  const { caught, guessed } = outcome;
  if (caught && guessed) return [1, 1];
  if (caught && !guessed) return [0, 2];
  if (!caught && guessed) return [3, 0];
  return [2, 1];
}

export function applyScores(
  outcome: ScoreOutcome,
  playerOrder: ReadonlyArray<string>,
  liarId: string,
  scores: Record<string, number>,
): Record<string, number> {
  const [liarDelta, nonLiarDelta] = deltas(outcome);
  const next: Record<string, number> = {};
  for (const id of playerOrder) {
    const prev = scores[id] ?? 0;
    next[id] = prev + (id === liarId ? liarDelta : nonLiarDelta);
  }
  return next;
}
