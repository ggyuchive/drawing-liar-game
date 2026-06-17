import { useCallback, useMemo, useState, type PropsWithChildren } from 'react';
import {
  DEFAULT_CODE,
  FALLBACK_CODE,
  LOCALES,
  LocaleContext,
  STORAGE_KEY,
  type LocaleCtx,
} from './core';

// Resolution order: an explicit saved choice wins; otherwise auto-detect
// from the browser language (so English speakers land on English); if
// that isn't a language we ship, fall back to the Korean default.
function detectInitial(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && LOCALES[stored]) return stored;
  const browser = navigator.language?.split('-')[0]?.toLowerCase();
  if (browser && LOCALES[browser]) return browser;
  return DEFAULT_CODE;
}

export function LocaleProvider({ children }: PropsWithChildren) {
  const [code, setCode] = useState<string>(detectInitial);

  const setLocaleCode = useCallback((next: string) => {
    if (!LOCALES[next]) return;
    localStorage.setItem(STORAGE_KEY, next);
    setCode(next);
  }, []);

  const value = useMemo<LocaleCtx>(
    () => ({
      locale: LOCALES[code] ?? LOCALES[FALLBACK_CODE]!,
      setLocaleCode,
    }),
    [code, setLocaleCode],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
