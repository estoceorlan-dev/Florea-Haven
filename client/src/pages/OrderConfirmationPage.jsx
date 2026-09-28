import { Check, ShoppingBag } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { InlineError } from '../components/InlineError.jsx';
import { OrderDetails } from '../components/OrderDetails.jsx';
import { OrderSkeleton } from '../components/ui/Skeleton.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useOrderQuery } from '../queries/useOrderQuery.js';

export function OrderConfirmationPage() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const order = useOrderQuery(user?.id, orderId);

  if (order.isPending) return <OrderSkeleton confirmation />;

  if (order.error) {
    return (
      <div className="page-shell py-20">
        <InlineError error={order.error} onRetry={order.refetch} />
      </div>
    );
  }

  return (
    <section className="page-shell py-14 sm:py-20">
      <div className="mb-12 border-b border-border pb-10 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-sage text-evergreen">
          <Check size={25} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <p className="eyebrow mt-6 text-clay">Thank you</p>
        <h1 className="mt-3 font-display text-5xl tracking-[-0.055em] text-evergreen sm:text-6xl">
          Order received.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-text-muted">
          We received order #{orderId.slice(0, 8).toUpperCase()}. It is pending
          confirmation, and its purchase details are saved in your order history.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link className="button-secondary" to="/orders">
            View order history
          </Link>
          <Link className="button-primary" to="/products">
            <ShoppingBag size={15} aria-hidden="true" />
            Continue shopping
          </Link>
        </div>
      </div>

      <OrderDetails order={order.data.data} />
    </section>
  );
}
