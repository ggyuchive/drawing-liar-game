import { createContext } from 'react';
import type { Locale } from './types';

// Auto-discovery: drop a `<code>.ts` into `src/i18n/lang/`, no edits here.
const modules = import.meta.glob<{ default: Locale }>('./lang/*.ts', {
  eager: true,
});

export const LOCALES: Record<string, Locale> = {};
for (const mod of Object.values(modules)) {
  const locale = mod.default;
  LOCALES[locale.code] = locale;
}

// Data fallback for missing strings/decks (English is the source of
// truth, even though the default UI language is Korean).
export const FALLBACK_CODE = LOCALES.en
  ? 'en'
  : Object.keys(LOCALES)[0] ?? 'en';

// Default UI locale: Korean, unless an explicit saved choice overrides it.
export const DEFAULT_CODE = LOCALES.ko ? 'ko' : FALLBACK_CODE;

export const LOCALE_LIST: ReadonlyArray<{ code: string; name: string }> =
  Object.values(LOCALES)
    .map((l) => ({ code: l.code, name: l.name }))
    .sort((a, b) => a.code.localeCompare(b.code));

export const STORAGE_KEY = 'drawing-liar-game.locale';

export type LocaleCtx = {
  locale: Locale;
  setLocaleCode: (code: string) => void;
};

export const LocaleContext = createContext<LocaleCtx | null>(null);
