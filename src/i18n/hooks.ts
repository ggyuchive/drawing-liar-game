import { useContext } from 'react';
import { FALLBACK_CODE, LOCALES, LocaleContext, type LocaleCtx } from './core';

export function useLocale(): LocaleCtx {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used inside <LocaleProvider>');
  }
  return ctx;
}

export function useT() {
  return useLocale().locale.ui;
}

function decksFor(code: string) {
  return (LOCALES[code] ?? LOCALES[FALLBACK_CODE])?.keywords ?? {};
}

export function deckListFor(
  code: string,
): ReadonlyArray<{ key: string; name: string }> {
  const decks = decksFor(code);
  return Object.entries(decks).map(([key, deck]) => ({
    key,
    name: deck.name,
  }));
}

function keywordsFor(code: string, deck?: string): ReadonlyArray<string> {
  const decks = decksFor(code);
  const keys = Object.keys(decks);
  if (keys.length === 0) return [];
  // Requested deck, else `general`, else the first available deck.
  const key = (deck && decks[deck] && deck) || (decks.general && 'general') || keys[0];
  return decks[key]?.words ?? [];
}

export function pickKeyword(code: string, deck?: string): string {
  const ks = keywordsFor(code, deck);
  if (ks.length === 0) return '';
  return ks[Math.floor(Math.random() * ks.length)];
}

// Decks are parallel across languages (same index = same concept), so
// a round stores the deck + index and each client resolves the word in
// its own language. pickKeywordIndex chooses a random valid index.
export function pickKeywordIndex(code: string, deck?: string): number {
  const ks = keywordsFor(code, deck);
  if (ks.length === 0) return 0;
  return Math.floor(Math.random() * ks.length);
}

export function keywordAt(code: string, deck: string, index: number): string {
  const ks = keywordsFor(code, deck);
  if (ks.length === 0) return '';
  return ks[index % ks.length] ?? '';
}
