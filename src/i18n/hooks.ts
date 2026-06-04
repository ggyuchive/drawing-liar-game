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

export function keywordsFor(code: string): ReadonlyArray<string> {
  return (LOCALES[code] ?? LOCALES[FALLBACK_CODE])?.keywords ?? [];
}

export function pickKeyword(code: string): string {
  const ks = keywordsFor(code);
  if (ks.length === 0) return '';
  return ks[Math.floor(Math.random() * ks.length)];
}
