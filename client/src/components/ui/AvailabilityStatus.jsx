import { RefreshCw } from 'lucide-react';

const checkedLabel = (lastUpdated) => {
  if (!lastUpdated) return 'Stock check pending';
  const checkedAt = new Date(lastUpdated);
  if (Number.isNaN(checkedAt.getTime())) return 'Stock check pending';
  if (Date.now() - checkedAt.getTime() < 60_000) return 'Stock checked just now';
  return `Stock checked at ${checkedAt.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
};

export function AvailabilityStatus({
  lastUpdated,
  isUpdating = false,
  error,
  onRetry,
  className = '',
}) {
  const checkedAt = lastUpdated ? new Date(lastUpdated) : null;
  const dateTime =
    checkedAt && !Number.isNaN(checkedAt.getTime())
      ? checkedAt.toISOString()
      : undefined;

  return (
    <div
      className={`availability-status ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`availability-status-dot ${isUpdating ? 'animate-stock-refresh' : ''}`}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p>{isUpdating ? 'Updating availability…' : checkedLabel(lastUpdated)}</p>
        {dateTime && !isUpdating && (
          <time className="sr-only" dateTime={dateTime}>
            {checkedAt.toLocaleString()}
          </time>
        )}
        {error && (
          <p className="mt-1 text-danger">
            Refresh failed. The last checked availability remains visible.
          </p>
        )}
      </div>
      {error && onRetry && (
        <button
          className="text-link ml-auto min-h-11 shrink-0"
          type="button"
          onClick={onRetry}
        >
          <RefreshCw size={13} aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  );
}
