import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeSelector } from '../components/ui/ThemeSelector.jsx';
import { useTheme } from '../hooks/useTheme.js';
import { THEME_STORAGE_KEY } from '../theme/theme.js';
import { ThemeProvider } from './ThemeProvider.jsx';

function installMatchMedia(initiallyDark = false) {
  const listeners = new Set();
  const mediaQuery = {
    matches: initiallyDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: vi.fn((eventName, listener) => {
      if (eventName === 'change') listeners.add(listener);
    }),
    removeEventListener: vi.fn((eventName, listener) => {
      if (eventName === 'change') listeners.delete(listener);
    }),
  };

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn(() => mediaQuery),
  });

  return {
    setDark(matches) {
      mediaQuery.matches = matches;
      act(() => {
        listeners.forEach((listener) => listener({ matches }));
      });
    },
  };
}

function ThemeState() {
  const { preference, resolvedTheme } = useTheme();
  return <p>{`${preference}:${resolvedTheme}`}</p>;
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.themePreference;
  document.documentElement.style.removeProperty('color-scheme');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ThemeProvider', () => {
  it('resolves a saved explicit preference before rendering consumers', () => {
    installMatchMedia(false);
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    render(
      <ThemeProvider>
        <ThemeState />
      </ThemeProvider>,
    );

    expect(screen.getByText('dark:dark')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('tracks system changes while the system preference is selected', () => {
    const media = installMatchMedia(false);

    render(
      <ThemeProvider>
        <ThemeState />
      </ThemeProvider>,
    );

    expect(screen.getByText('system:light')).toBeInTheDocument();

    media.setDark(true);

    expect(screen.getByText('system:dark')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('persists an accessible explicit choice and ignores later system changes', async () => {
    const media = installMatchMedia(false);

    render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>,
    );

    const selector = screen.getByRole('combobox', { name: 'Appearance' });
    expect(selector).toHaveValue('system');
    expect(screen.getByText('light theme active')).toBeInTheDocument();

    fireEvent.change(selector, { target: { value: 'dark' } });

    await waitFor(() => expect(selector).toHaveValue('dark'));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByText('dark theme active')).toBeInTheDocument();

    media.setDark(false);

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(selector).toHaveAccessibleDescription('dark theme active');
  });
});
