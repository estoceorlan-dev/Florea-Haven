import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { InlineError } from '../components/InlineError.jsx';
import { OrderDetails } from '../components/OrderDetails.jsx';
import { OrderSkeleton } from '../components/ui/Skeleton.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useOrderQuery } from '../queries/useOrderQuery.js';

export function OrderDetailPage() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const order = useOrderQuery(user?.id, orderId);

  if (order.isPending) return <OrderSkeleton />;

  if (order.error) {
    return (
      <div className="page-shell py-20">
        <InlineError error={order.error} onRetry={order.refetch} />
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
