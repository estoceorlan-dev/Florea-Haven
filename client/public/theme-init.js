(() => {
  const storageKey = 'florea-theme-preference';
  const allowedPreferences = ['system', 'light', 'dark'];
  let preference = 'system';

  try {
    const savedPreference = localStorage.getItem(storageKey);
    if (allowedPreferences.includes(savedPreference)) {
      preference = savedPreference;
    }
  } catch {
    // Storage can be unavailable in strict privacy contexts.
  }

  const systemTheme = matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
  const resolvedTheme = preference === 'system' ? systemTheme : preference;
  const root = document.documentElement;

  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolvedTheme;
  document
    .querySelector('meta[name="theme-color"]')
    .setAttribute('content', resolvedTheme === 'dark' ? '#211820' : '#fffaf8');
})();
