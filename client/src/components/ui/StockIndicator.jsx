const getStockState = (stockQuantity, requestedQuantity) => {
  const quantity = Number(stockQuantity);

  if (stockQuantity == null || !Number.isFinite(quantity)) {
    return { label: 'Checking stock…', state: 'loading' };
  }

  if (quantity <= 0) {
    return { label: 'Out of stock', state: 'unavailable' };
  }

  if (Number(requestedQuantity) > quantity) {
    return { label: `Only ${quantity} available`, state: 'unavailable' };
  }

  if (quantity <= 5) {
    return { label: `Only ${quantity} left`, state: 'low' };
  }

  return { label: `${quantity} in stock`, state: 'available' };
};

const formatLastUpdated = (lastUpdated) => {
  if (!lastUpdated) return null;

  const date = lastUpdated instanceof Date ? lastUpdated : new Date(lastUpdated);
  if (Number.isNaN(date.getTime())) return null;

  return {
    dateTime: date.toISOString(),
    label: date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  };
};

export function StockIndicator({
  stockQuantity,
  requestedQuantity,
  isUpdating = false,
  lastUpdated,
  className = '',
}) {
  const stock = getStockState(stockQuantity, requestedQuantity);
  const updated = formatLastUpdated(lastUpdated);

  return (
    <p
      className={`stock-indicator ${className}`}
      data-stock-state={stock.state}
      data-updating={isUpdating || undefined}
    >
      <span className="stock-indicator-dot" aria-hidden="true" />
      <span aria-live="polite" aria-atomic="true">
        {stock.label}
      </span>
      {isUpdating && (
        <span className="sr-only" aria-hidden="true">
          Updating…
        </span>
      )}
      {updated && (
        <time
          className="font-normal opacity-70"
          dateTime={updated.dateTime}
          title={`Stock last checked at ${updated.label}`}
        >
          · {updated.label}
        </time>
      )}
    </p>
  );
}
