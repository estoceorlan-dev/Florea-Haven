import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { InlineError } from '../components/InlineError.jsx';
import { OrderDetails } from '../components/OrderDetails.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { orderApi } from '../services/api.js';

export function OrderDetailPage() {
  const { orderId } = useParams();
  const order = useAsync(() => orderApi.getOrder(orderId), [orderId]);

  if (order.isLoading) {
    return (
      <div className="page-shell py-20" aria-busy="true">
        <div className="h-10 w-40 animate-pulse bg-evergreen/10" />
        <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_360px]">
          <div className="h-96 animate-pulse bg-evergreen/10" />
          <div className="h-80 animate-pulse bg-evergreen/10" />
        </div>
      </div>
    );
  }

  if (order.error) {
    return (
      <div className="page-shell py-20">
        <InlineError error={order.error} onRetry={order.retry} />
      </div>
    );
  }

  return (
    <section className="page-shell py-14 sm:py-20">
      <Link className="text-link mb-8" to="/orders">
        <ArrowLeft size={14} aria-hidden="true" />
        All orders
      </Link>
      <OrderDetails order={order.data.data} />
    </section>
  );
}
