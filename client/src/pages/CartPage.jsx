import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { InlineError } from '../components/InlineError.jsx';
import { ProductImage } from '../components/ProductImage.jsx';
import { AvailabilityStatus } from '../components/ui/AvailabilityStatus.jsx';
import { CartSkeleton } from '../components/ui/Skeleton.jsx';
import { CartStockStatus } from '../components/ui/CartStockStatus.jsx';
import { useCart } from '../hooks/useCart.js';
import { formatCurrency } from '../utils/currency.js';

const availabilityMessages = {
  inactive: 'This product is no longer available. Remove it to continue.',
  out_of_stock: 'This product is out of stock. Remove it to continue.',
  insufficient_stock: 'Choose the available quantity or remove this item.',
};

function CartItem({ item }) {
  const { updateItem, removeItem } = useCart();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const stockQuantity = item.product.stock_quantity;
  const isAvailable = item.availability === 'available';
  const canDecrease =
    item.quantity > 1 && item.product.is_active !== false && stockQuantity > 0;
  const decreasedQuantity =
    item.availability === 'insufficient_stock'
      ? Math.max(1, Math.min(item.quantity - 1, stockQuantity))
      : item.quantity - 1;

  const updateQuantity = async (quantity) => {
    setIsUpdating(true);
    setError(null);
    try {
      await updateItem(item.id, quantity);
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const remove = async () => {
    setIsUpdating(true);
    setError(null);
    try {
      await removeItem(item.id);
    } catch (removeError) {
      setError(removeError.message);
      setIsUpdating(false);
    }
  };

  return (
    <article
      className={`grid grid-cols-[80px_minmax(0,1fr)] gap-4 rounded-card border bg-surface p-4 shadow-low transition sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:gap-6 sm:p-5 ${
        isAvailable ? 'border-border' : 'cart-line-changed'
      }`}
      aria-busy={isUpdating}
    >
      <Link
        className="aspect-[4/5] overflow-hidden rounded-control bg-brand-soft"
        to={`/products/${item.product.id}`}
      >
        <ProductImage
          className="size-full object-cover"
          src={item.product.image_url}
          alt={item.product.name}
        />
      </Link>
      <div className="min-w-0">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-clay">
          {item.product.category.name}
        </p>
        <h2 className="mt-1 break-words font-display text-2xl leading-tight text-evergreen">
          <Link to={`/products/${item.product.id}`}>{item.product.name}</Link>
        </h2>
        <p className="mt-2 text-sm font-semibold text-evergreen sm:hidden">
          {formatCurrency(item.line_total)}
        </p>
        <CartStockStatus className="mt-3 flex-wrap" item={item} />
        {!isAvailable && (
          <p className="mt-2 max-w-sm text-xs leading-5 text-danger" role="alert">
            {availabilityMessages[item.availability]}
          </p>
        )}
        {error && (
          <p className="mt-2 max-w-sm text-xs leading-5 text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex min-h-11 items-center rounded-control border border-border bg-surface">
            <button
              className="grid size-11 place-items-center text-evergreen disabled:cursor-not-allowed disabled:opacity-30"
              type="button"
              aria-label={`Decrease ${item.product.name} quantity`}
              disabled={isUpdating || !canDecrease}
              onClick={() => updateQuantity(decreasedQuantity)}
            >
              <Minus size={14} aria-hidden="true" />
            </button>
            <span
              className="min-w-8 text-center text-sm tabular-nums"
              aria-label="Quantity"
            >
              {item.quantity}
            </span>
            <button
              className="grid size-11 place-items-center text-evergreen disabled:cursor-not-allowed disabled:opacity-30"
              type="button"
              aria-label={`Increase ${item.product.name} quantity`}
              disabled={isUpdating || !isAvailable || item.quantity >= stockQuantity}
              onClick={() => updateQuantity(item.quantity + 1)}
            >
              <Plus size={14} aria-hidden="true" />
            </button>
          </div>
          {item.availability === 'insufficient_stock' && stockQuantity > 0 && (
            <button
              className="button-secondary"
              type="button"
              disabled={isUpdating}
              onClick={() => updateQuantity(stockQuantity)}
            >
              Set quantity to {stockQuantity}
            </button>
          )}
          <button
            className="inline-flex min-h-11 items-center gap-1.5 px-2 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-text-muted transition hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={isUpdating}
            onClick={remove}
          >
            <Trash2 size={14} aria-hidden="true" />
            Remove
          </button>
        </div>
      </div>
      <p className="hidden whitespace-nowrap text-sm font-semibold text-evergreen sm:block">
        {formatCurrency(item.line_total)}
      </p>
    </article>
  );
}

export function CartPage() {
  const { cart, error, refreshError, isLoading, isRefreshing, lastUpdated, reload } =
    useCart();

  if (isLoading) return <CartSkeleton />;
  if (error) {
    return (
      <div className="page-shell py-20">
        <InlineError error={error} onRetry={reload} />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <section className="page-shell flex min-h-[60vh] items-center justify-center py-20 text-center">
        <div>
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-soft text-evergreen">
            <ShoppingBag size={24} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <p className="eyebrow mt-7 text-clay">Your cart</p>
          <h1 className="mt-3 font-display text-5xl tracking-[-0.055em] text-evergreen sm:text-6xl">
            Room for something lovely.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-text-muted">
            Your cart is empty for now. Wander through the collection and bring a little
            piece of the garden home.
          </p>
          <Link className="button-primary mt-8" to="/products">
            Explore the collection
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell py-12 sm:py-16">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-clay">Saved for you</p>
          <h1 className="mt-3 font-display text-5xl tracking-[-0.055em] text-evergreen sm:text-6xl">
            Your cart
          </h1>
        </div>
        <p className="text-sm text-text-muted">
          {cart.summary.item_count} {cart.summary.item_count === 1 ? 'item' : 'items'}
        </p>
      </div>
      <div className="grid gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        <div className="min-w-0 space-y-4">
          {cart.items.map((item) => (
            <CartItem key={item.id} item={item} />
          ))}
        </div>
        <aside className="h-fit rounded-card border border-border bg-surface-muted p-6 shadow-low lg:sticky lg:top-28 lg:p-8">
          <p className="eyebrow text-clay">Order summary</p>
          <AvailabilityStatus
            className="mt-3"
            lastUpdated={lastUpdated}
            isUpdating={isRefreshing}
            error={refreshError}
            onRetry={reload}
          />
          <div className="mt-6 flex items-center justify-between border-b border-border pb-5 text-sm">
            <span className="text-text-muted">Subtotal</span>
            <strong className="text-base text-evergreen">
              {formatCurrency(cart.summary.subtotal)}
            </strong>
          </div>
          <p className="mt-4 text-xs leading-5 text-text-muted">
            Cash on Delivery. Prices and availability are confirmed before you place the
            order.
          </p>
          {cart.summary.has_unavailable_items && (
            <div className="form-alert mt-5" role="alert">
              Correct or remove the highlighted items before continuing to checkout.
            </div>
          )}
          {cart.summary.has_unavailable_items ? (
            <button className="button-primary mt-6 w-full" type="button" disabled>
              Checkout unavailable
            </button>
          ) : (
            <Link className="button-primary mt-6 w-full" to="/checkout">
              Continue to checkout
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
          <button
            className="text-link mx-auto mt-4 min-h-11"
            type="button"
            disabled={isRefreshing}
            onClick={reload}
          >
            {isRefreshing ? 'Refreshing…' : 'Refresh availability'}
          </button>
        </aside>
      </div>
    </section>
  );
}
