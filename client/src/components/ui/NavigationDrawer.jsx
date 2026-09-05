import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function NavigationDrawer({
  children,
  id,
  label,
  onClose,
  open,
  returnFocusRef,
  side = 'left',
  title,
  desktopBreakpoint = 1024,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const panel = panelRef.current;
    const desktopQuery = window.matchMedia?.(`(min-width: ${desktopBreakpoint}px)`);
    const returnFocusElement = returnFocusRef?.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel?.querySelector('[data-drawer-autofocus]')?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panel) return;

      const focusableElements = [...panel.querySelectorAll(FOCUSABLE_SELECTOR)];
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (!firstElement || !lastElement) {
        event.preventDefault();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const handleDesktopChange = (event) => {
      if (event.matches) onClose();
    };
    desktopQuery?.addEventListener?.('change', handleDesktopChange);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      desktopQuery?.removeEventListener?.('change', handleDesktopChange);

      if (returnFocusElement?.isConnected) {
        returnFocusElement.focus();
      }
    };
  }, [desktopBreakpoint, onClose, open, returnFocusRef]);

  if (!open) return null;

  return (
    <div className="navigation-drawer-root">
      <button
        className="navigation-drawer-backdrop"
        type="button"
        tabIndex="-1"
        aria-label={`Close ${label}`}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        className="navigation-drawer-panel"
        data-side={side}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div className="flex min-h-16 items-center justify-between gap-4 border-b border-border px-5 py-4">
          <p className="font-display text-2xl text-evergreen">{title}</p>
          <button
            className="icon-button shrink-0"
            type="button"
            aria-label={`Close ${label}`}
            data-drawer-autofocus
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}
