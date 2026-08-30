const labels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export function OrderStatusBadge({ status }) {
  return (
    <span className="inline-flex rounded-full bg-sage px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-evergreen">
      {labels[status] ?? status}
    </span>
  );
}
