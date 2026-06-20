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

// A deck's display name in the given language (e.g. 'animals' → '동물').
export function deckName(code: string, deck: string): string {
  return decksFor(code)[deck]?.name ?? '';
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

// Random valid index into a deck (decks are parallel across languages).
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

// Deck size; the host sends this so the server can pick an index without
// holding the words. Any locale gives the same size (parallel decks).
export function deckSize(code: string, deck?: string): number {
  return keywordsFor(code, deck).length;
}

// Every deck + size, sent whole to the server, which picks deck+index
// across all categories (keeping both secret from the liar).
export function deckSizes(
  code: string,
): ReadonlyArray<{ deck: string; size: number; krOnly: boolean }> {
  const decks = (LOCALES[code] ?? LOCALES[FALLBACK_CODE])?.keywords ?? {};
  return Object.entries(decks).map(([deck, d]) => ({
    deck,
    size: d.words.length,
    krOnly: d.krOnly === true,
  }));
}
