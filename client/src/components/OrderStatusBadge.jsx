import { orderStatusLabels } from '../utils/order-status.js';

export function OrderStatusBadge({ status }) {
  return (
    <span className="order-status-badge" data-status={status}>
      {orderStatusLabels[status] ?? status}
    </span>
  );
}
