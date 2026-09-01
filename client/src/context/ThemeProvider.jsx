import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  applyThemeToDocument,
  getStoredThemePreference,
  getSystemTheme,
  isThemePreference,
  persistThemePreference,
  resolveTheme,
} from '../theme/theme.js';
import { ThemeContext } from './ThemeContext.js';

function getInitialPreference() {
  const prePaintPreference =
    globalThis.document?.documentElement.dataset.themePreference;

  return isThemePreference(prePaintPreference)
    ? prePaintPreference
    : getStoredThemePreference();
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(getInitialPreference);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const resolvedTheme = resolveTheme(preference, systemTheme);

  useEffect(() => {
    const mediaQuery = globalThis.window?.matchMedia?.('(prefers-color-scheme: dark)');

    if (!mediaQuery) return undefined;

    const handleSystemThemeChange = (event) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener?.('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener?.('change', handleSystemThemeChange);
    };
  }, []);

  useLayoutEffect(() => {
    applyThemeToDocument(preference, resolvedTheme);
  }, [preference, resolvedTheme]);

  const setPreference = useCallback((nextPreference) => {
    if (!isThemePreference(nextPreference)) return;

    persistThemePreference(nextPreference);
    setPreferenceState(nextPreference);
  }, []);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
