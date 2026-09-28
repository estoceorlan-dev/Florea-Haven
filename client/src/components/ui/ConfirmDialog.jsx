import { AlertTriangle } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  isConfirming = false,
  onClose,
  onConfirm,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !isConfirming) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isConfirming, onClose, open]);

  if (!open) return null;

  return (
    <div className="confirmation-root">
      <button
        className="confirmation-backdrop"
        type="button"
        aria-label="Close confirmation"
        disabled={isConfirming}
        onClick={onClose}
      />
      <section
        className="confirmation-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-danger">
          <AlertTriangle size={20} aria-hidden="true" />
        </span>
        <p className="eyebrow mt-5 text-danger">Please confirm</p>
        <h2 id={titleId} className="mt-2 font-display text-3xl text-evergreen">
          {title}
        </h2>
        <p id={descriptionId} className="mt-3 text-sm leading-6 text-text-muted">
          {description}
        </p>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            className="button-secondary"
            type="button"
            disabled={isConfirming}
            onClick={onClose}
          >
            Keep it
          </button>
          <button
            className="button-danger"
            type="button"
            disabled={isConfirming}
            onClick={onConfirm}
          >
            {isConfirming ? 'Working…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
