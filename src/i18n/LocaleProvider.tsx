import { useCallback, useMemo, useState, type PropsWithChildren } from 'react';
import {
  DEFAULT_CODE,
  FALLBACK_CODE,
  LOCALES,
  LocaleContext,
  STORAGE_KEY,
  type LocaleCtx,
} from './core';

// Always start in Korean, regardless of the browser/system language — an
// explicit saved choice (from the 🌐 picker) is the only thing that
// overrides it, so English speakers switch once and it sticks.
function detectInitial(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && LOCALES[stored]) return stored;
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
