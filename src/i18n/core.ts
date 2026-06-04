import { createContext } from 'react';
import type { Locale } from './types';

// Glob-based auto-discovery. Adding a new language requires nothing
// but dropping a `<code>.ts` file into `src/i18n/lang/` — no edits
// here, no registration step, no rebuild config tweaks.
const modules = import.meta.glob<{ default: Locale }>('./lang/*.ts', {
  eager: true,
});

export const LOCALES: Record<string, Locale> = {};
for (const mod of Object.values(modules)) {
  const locale = mod.default;
  LOCALES[locale.code] = locale;
}

export const FALLBACK_CODE = LOCALES.en
  ? 'en'
  : Object.keys(LOCALES)[0] ?? 'en';

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
