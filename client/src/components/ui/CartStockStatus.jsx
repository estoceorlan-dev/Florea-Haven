const stockState = (item) => {
  if (item.availability === 'inactive' || item.product.is_active === false) {
    return { state: 'unavailable', label: 'No longer available' };
  }
  if (item.product.stock_quantity <= 0) {
    return { state: 'unavailable', label: 'Out of stock' };
  }
  if (item.quantity > item.product.stock_quantity) {
    return { state: 'unavailable', label: `${item.product.stock_quantity} available` };
  }
  if (item.product.stock_quantity <= 5) {
    return { state: 'low', label: `${item.product.stock_quantity} available` };
  }
  return { state: 'available', label: `${item.product.stock_quantity} available` };
};

export function CartStockStatus({ item, className = '' }) {
  const stock = stockState(item);
  return (
    <p
      className={`cart-stock-status ${className}`}
      data-stock-state={stock.state}
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="stock-indicator-dot" aria-hidden="true" />
      <span>{stock.label}</span>
      <span aria-hidden="true">·</span>
      <span>{item.quantity} in your cart</span>
    </p>
  );
}
