import { RefreshCw } from 'lucide-react';

export function InlineError({ error, onRetry }) {
  return (
    <div className="mx-auto max-w-xl border border-clay/20 bg-blush/35 px-6 py-8 text-center">
      <p className="font-display text-2xl text-evergreen">
        A little pause in the garden
      </p>
      <p className="mt-2 text-sm leading-6 text-ink/65">{error.message}</p>
      {onRetry && (
        <button className="button-secondary mt-5" type="button" onClick={onRetry}>
          <RefreshCw size={15} aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}
