import { Palette } from 'lucide-react';
import { useId } from 'react';
import { useTheme } from '../../hooks/useTheme.js';

export function ThemeSelector({ className = '', compact = false }) {
  const id = useId();
  const { preference, resolvedTheme, setPreference } = useTheme();

  return (
    <div
      className={`theme-selector ${compact ? 'theme-selector-compact' : ''} ${className}`}
    >
      <label className="theme-selector-label" htmlFor={id}>
        Appearance
      </label>
      <div className="theme-selector-control">
        <Palette size={16} aria-hidden="true" />
        <select
          id={id}
          value={preference}
          onChange={(event) => setPreference(event.target.value)}
          aria-describedby={`${id}-status`}
        >
          <option value="system">Use system setting</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <span className="sr-only" id={`${id}-status`} aria-live="polite">
        {resolvedTheme} theme active
      </span>
    </div>
  );
}
