import { Monitor, Moon, Sun } from 'lucide-react';
import { useId } from 'react';
import { useTheme } from '../../hooks/useTheme.js';
import { SelectMenu } from './SelectMenu.jsx';

const themeOptions = [
  ['system', 'System default', Monitor],
  ['light', 'Light', Sun],
  ['dark', 'Dark', Moon],
];

export function ThemeSelector({
  className = '',
  compact = false,
  placement = 'bottom',
}) {
  const id = useId();
  const { preference, resolvedTheme, setPreference } = useTheme();

  return (
    <div
      className={`theme-selector ${compact ? 'theme-selector-compact' : ''} ${className}`}
    >
      <label className="theme-selector-label" htmlFor={id}>
        Appearance
      </label>
      <SelectMenu
        id={id}
        label="Appearance"
        options={themeOptions}
        value={preference}
        onChange={setPreference}
        icon={themeOptions.find(([key]) => key === preference)?.[2] ?? Monitor}
        describedBy={`${id}-status`}
        placement={placement}
        fullWidth
      />
      <span className="sr-only" id={`${id}-status`} aria-live="polite">
        {resolvedTheme} theme active
      </span>
    </div>
  );
}
