export const THEME_STORAGE_KEY = 'florea-theme-preference';
export const THEME_PREFERENCES = ['system', 'light', 'dark'];

const THEME_COLORS = {
  light: '#fffaf8',
  dark: '#211820',
};

export function isThemePreference(value) {
  return THEME_PREFERENCES.includes(value);
}

export function getStoredThemePreference(storage = globalThis.localStorage) {
  try {
    const storedPreference = storage?.getItem(THEME_STORAGE_KEY);
    return isThemePreference(storedPreference) ? storedPreference : 'system';
  } catch {
    return 'system';
  }
}

export function getSystemTheme(targetWindow = globalThis.window) {
  return targetWindow?.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function resolveTheme(preference, systemTheme) {
  return preference === 'system' ? systemTheme : preference;
}

export function applyThemeToDocument(
  preference,
  resolvedTheme,
  targetDocument = globalThis.document,
) {
  const root = targetDocument?.documentElement;

  if (!root) return;

  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolvedTheme;

  targetDocument
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[resolvedTheme]);
}

export function persistThemePreference(preference, storage = globalThis.localStorage) {
  if (!isThemePreference(preference)) return false;

  try {
    storage?.setItem(THEME_STORAGE_KEY, preference);
    return true;
  } catch {
    return false;
  }
}
