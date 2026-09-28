import { AlertTriangle, RefreshCw } from 'lucide-react';

export function InlineError({ error, onRetry }) {
  return (
    <div
      className="mx-auto max-w-xl rounded-card border border-border bg-surface p-5 shadow-low sm:p-6"
      role="alert"
    >
      <div className="flex gap-3 text-left">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-danger">
          <AlertTriangle size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-2xl text-evergreen">
            A little pause in the garden
          </p>
          <p className="mt-2 break-words text-sm leading-6 text-text-muted">
            {error.message}
          </p>
          {onRetry && (
            <button className="button-secondary mt-5" type="button" onClick={onRetry}>
              <RefreshCw size={15} aria-hidden="true" />
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
