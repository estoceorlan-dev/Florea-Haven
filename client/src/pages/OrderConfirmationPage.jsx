import { Check, ShoppingBag } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { InlineError } from '../components/InlineError.jsx';
import { OrderDetails } from '../components/OrderDetails.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { orderApi } from '../services/api.js';

export function OrderConfirmationPage() {
  const { orderId } = useParams();
  const order = useAsync(() => orderApi.getOrder(orderId), [orderId]);

  if (order.isLoading) {
    return (
      <div className="page-shell py-20 text-center" aria-busy="true">
        <div className="mx-auto h-16 w-16 animate-pulse rounded-full bg-evergreen/10" />
        <div className="mx-auto mt-6 h-14 w-72 animate-pulse bg-evergreen/10" />
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
      <div className="mb-12 border-b border-evergreen/10 pb-10 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-sage text-evergreen">
          <Check size={25} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <p className="eyebrow mt-6 text-clay">Thank you</p>
        <h1 className="mt-3 font-display text-5xl tracking-[-0.055em] text-evergreen sm:text-6xl">
          Order received.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-ink/55">
          Your order is pending confirmation. Keep this page for your details, or find
          it anytime in order history.
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
