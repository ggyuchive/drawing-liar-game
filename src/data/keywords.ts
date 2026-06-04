export const KEYWORDS: ReadonlyArray<string> = [
  'apple', 'banana', 'cactus', 'castle', 'cloud', 'compass',
  'crown', 'dolphin', 'dragon', 'elephant', 'forest', 'glasses',
  'guitar', 'hat', 'island', 'jellyfish', 'kite', 'ladder',
  'lighthouse', 'mountain', 'mushroom', 'octopus', 'piano',
  'pineapple', 'pirate', 'pizza', 'planet', 'rainbow', 'robot',
  'rocket', 'sandwich', 'scissors', 'snowman', 'spaceship',
  'submarine', 'sunglasses', 'telescope', 'tornado', 'tree',
  'umbrella', 'unicorn', 'volcano', 'waterfall', 'windmill',
];

export function pickKeyword(): string {
  return KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
}
