import { useCallback, useMemo, useState, type PropsWithChildren } from 'react';
import {
  DEFAULT_CODE,
  FALLBACK_CODE,
  LOCALES,
  LocaleContext,
  STORAGE_KEY,
  type LocaleCtx,
} from './core';

// Start in Korean unless a saved choice overrides it (switch once, sticks).
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
