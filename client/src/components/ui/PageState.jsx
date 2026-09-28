import { AlertTriangle, CircleCheck, Inbox, X } from 'lucide-react';

export function FeedbackBanner({
  tone = 'success',
  children,
  onDismiss,
  className = '',
}) {
  const Icon = tone === 'error' ? AlertTriangle : CircleCheck;

  return (
    <div
      className={`feedback-banner ${className}`}
      data-tone={tone}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss && (
        <button
          className="icon-button -m-2 shrink-0"
          type="button"
          aria-label="Dismiss message"
          onClick={onDismiss}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  eyebrow = 'Nothing here yet',
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div className={`empty-state ${className}`}>
      <span className="empty-state-icon">
        <Icon size={24} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <p className="eyebrow mt-5 text-clay">{eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl text-evergreen sm:text-4xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-text-muted">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
