import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

export function SelectMenu({
  options,
  value,
  onChange,
  label,
  icon: Icon,
  id: providedId,
  describedBy,
  placement = 'bottom',
  fullWidth = false,
}) {
  const id = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef({ text: '', time: 0 });
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedIndex = Math.max(
    0,
    options.findIndex(([key]) => key === value),
  );

  useEffect(() => {
    if (!open) return;
    const dismiss = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  const show = (index = selectedIndex) => {
    setActiveIndex(index);
    searchRef.current = { text: '', time: 0 };
    setOpen(true);
  };

  const select = (index) => {
    setOpen(false);
    if (options[index][0] !== value) onChange(options[index][0]);
  };

  const handleKeyDown = (event) => {
    const { key } = event;
    if (key === 'Tab') {
      if (open) select(activeIndex);
      return;
    }
    if (key === 'Escape') {
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
      return;
    }
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (open) select(activeIndex);
      else show();
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
      event.preventDefault();
      if (key === 'Home') show(0);
      else if (key === 'End') show(options.length - 1);
      else if (!open) show();
      else
        setActiveIndex(
          (index) =>
            (index + (key === 'ArrowDown' ? 1 : -1) + options.length) % options.length,
        );
      return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const previous = searchRef.current;
      const text = (now - previous.time < 600 ? previous.text : '') + key.toLowerCase();
      searchRef.current = { text, time: now };
      const prefix = [...text].every((letter) => letter === text[0]) ? text[0] : text;
      const start = open ? activeIndex : selectedIndex;
      const match = options.findIndex((_, offset) =>
        options[(start + offset + 1) % options.length][1]
          .toLowerCase()
          .startsWith(prefix),
      );
      if (match !== -1) {
        setActiveIndex((start + match + 1) % options.length);
        setOpen(true);
      }
    }
  };

  return (
    <div
      ref={rootRef}
      className={`relative min-w-0 max-w-full font-sans ${fullWidth ? 'w-full' : ''}`}
    >
      <button
        ref={triggerRef}
        id={providedId ?? `${id}-trigger`}
        className={`inline-flex min-h-11 min-w-0 max-w-full items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-2.5 text-left text-sm font-medium text-text shadow-low transition-colors hover:border-border-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${fullWidth ? 'w-full' : ''}`}
        type="button"
        role="combobox"
        aria-label={label}
        aria-describedby={describedBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
      >
        {Icon && <Icon className="shrink-0 text-brand" size={16} aria-hidden="true" />}
        <span className="min-w-0 flex-1 truncate">{options[selectedIndex][1]}</span>
        <ChevronDown
          className={`ml-1 shrink-0 text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          size={16}
          aria-hidden="true"
        />
      </button>
      {open && (
        <ul
          id={`${id}-options`}
          role="listbox"
          aria-label={label}
          className={`absolute right-0 z-30 max-w-[calc(100vw-2rem)] rounded-2xl border border-border/80 bg-surface p-1.5 shadow-medium motion-safe:animate-reveal motion-safe:[animation-duration:160ms] ${fullWidth ? 'w-full' : 'w-64'} ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
          onMouseDown={(event) => event.preventDefault()}
        >
          {options.map(([key, optionLabel, OptionIcon], index) => (
            <li
              id={`${id}-option-${index}`}
              key={key}
              role="option"
              aria-selected={index === selectedIndex}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${index === activeIndex ? 'bg-brand-soft text-brand-strong' : index === selectedIndex ? 'bg-surface-muted text-brand-strong' : 'text-text'} ${index === selectedIndex ? 'font-semibold' : 'font-medium'}`}
              onPointerMove={() => setActiveIndex(index)}
              onClick={() => {
                select(index);
                triggerRef.current?.focus();
              }}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                {OptionIcon && (
                  <OptionIcon
                    className="shrink-0 text-brand"
                    size={16}
                    aria-hidden="true"
                  />
                )}
                {optionLabel}
              </span>
              {index === selectedIndex && (
                <Check size={16} className="shrink-0" aria-hidden="true" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
