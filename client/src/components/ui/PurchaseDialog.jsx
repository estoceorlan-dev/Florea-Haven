import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export function PurchaseDialog({ title, children, onClose, busy = false }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-busy={busy}
      className="purchase-dialog m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-[1.75rem] border border-border bg-canvas p-0 text-text shadow-overlay backdrop:bg-backdrop backdrop:backdrop-blur-sm motion-safe:animate-reveal motion-safe:[animation-duration:200ms]"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || busy) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          onClose();
      }}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-canvas/95 px-5 py-4 backdrop-blur-md sm:px-7">
        <div>
          <p className="eyebrow text-brand">A little something beautiful</p>
          <h2 id={titleId} className="mt-1 font-display text-3xl text-brand-strong">
            {title}
          </h2>
        </div>
        <button
          className="icon-button disabled:opacity-40"
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close purchase dialog"
          autoFocus
        >
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      <div className="p-5 sm:p-7">{children}</div>
    </dialog>,
    document.body,
  );
}
