import { ArrowRight, Minus, Plus, RefreshCw, ShoppingBag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { InlineError } from '../components/InlineError.jsx';
import { ProductImage } from '../components/ProductImage.jsx';
import { useCart } from '../hooks/useCart.js';
import { formatCurrency } from '../utils/currency.js';

const availabilityMessages = {
  inactive: 'This product is no longer available. Please remove it.',
  out_of_stock: 'This product is currently out of stock.',
  insufficient_stock: 'The requested quantity is no longer available.',
};

function CartItem({ item }) {
  const { updateItem, removeItem } = useCart();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const isAvailable = item.availability === 'available';

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
    <article className="grid grid-cols-[92px_1fr] gap-4 border-b border-evergreen/10 py-6 sm:grid-cols-[128px_1fr_auto] sm:gap-6">
      <Link
        className="aspect-[4/5] overflow-hidden bg-sage"
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
        <h2 className="mt-1 font-display text-2xl leading-tight text-evergreen">
          <Link to={`/products/${item.product.id}`}>{item.product.name}</Link>
        </h2>
        <p className="mt-2 text-sm font-semibold text-evergreen sm:hidden">
          {formatCurrency(item.line_total)}
        </p>

        {!isAvailable && (
          <p className="mt-3 max-w-sm text-xs leading-5 text-clay" role="alert">
            {availabilityMessages[item.availability]}
          </p>
        )}
        {error && (
          <p className="mt-3 max-w-sm text-xs leading-5 text-clay" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center border border-evergreen/15 bg-surface">
            <button
              className="grid size-9 place-items-center text-evergreen disabled:cursor-not-allowed disabled:opacity-30"
              type="button"
              aria-label={`Decrease ${item.product.name} quantity`}
              disabled={isUpdating || !isAvailable || item.quantity <= 1}
              onClick={() => updateQuantity(item.quantity - 1)}
            >
              <Minus size={14} aria-hidden="true" />
            </button>
            <span className="min-w-9 text-center text-sm" aria-label="Quantity">
              {item.quantity}
            </span>
            <button
              className="grid size-9 place-items-center text-evergreen disabled:cursor-not-allowed disabled:opacity-30"
              type="button"
              aria-label={`Increase ${item.product.name} quantity`}
              disabled={
                isUpdating ||
                !isAvailable ||
                item.quantity >= item.product.stock_quantity
              }
              onClick={() => updateQuantity(item.quantity + 1)}
            >
              <Plus size={14} aria-hidden="true" />
            </button>
          </div>

          <button
            className="inline-flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-ink/50 hover:text-clay"
            type="button"
            disabled={isUpdating}
            onClick={remove}
          >
            <Trash2 size={14} aria-hidden="true" />
            Remove
          </button>
        </div>
      </div>

      <p className="hidden text-sm font-semibold text-evergreen sm:block">
        {formatCurrency(item.line_total)}
      </p>
    </article>
  );
}

export function CartPage() {
  const { cart, error, isLoading, reload } = useCart();

  if (isLoading) {
    return (
      <div className="page-shell py-14 sm:py-20" aria-busy="true">
        <div className="h-14 w-56 animate-pulse rounded bg-evergreen/10" />
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="h-72 animate-pulse bg-evergreen/10" />
          <div className="h-64 animate-pulse bg-evergreen/10" />
        </div>
      </div>
    );
  }

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
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-sage text-evergreen">
            <ShoppingBag size={24} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <p className="eyebrow mt-7 text-clay">Your cart</p>
          <h1 className="mt-3 font-display text-5xl tracking-[-0.055em] text-evergreen sm:text-6xl">
            Room for something lovely.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-ink/55">
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
    <section className="page-shell py-14 sm:py-20">
      <div className="flex flex-col justify-between gap-4 border-b border-evergreen/10 pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-clay">Saved for you</p>
          <h1 className="mt-3 font-display text-5xl tracking-[-0.055em] text-evergreen sm:text-6xl">
            Your cart
          </h1>
        </div>
        <p className="text-sm text-ink/50">
          {cart.summary.item_count} {cart.summary.item_count === 1 ? 'item' : 'items'}
        </p>
      </div>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
        <div>
          {cart.items.map((item) => (
            <CartItem key={item.id} item={item} />
          ))}
        </div>

        <aside className="h-fit bg-mist p-6 lg:sticky lg:top-28 lg:mt-8 lg:p-8">
          <p className="eyebrow text-clay">Order summary</p>
          <div className="mt-6 flex items-center justify-between border-b border-evergreen/10 pb-5 text-sm">
            <span className="text-ink/60">Subtotal</span>
            <strong className="text-base text-evergreen">
              {formatCurrency(cart.summary.subtotal)}
            </strong>
          </div>
          <p className="mt-4 text-xs leading-5 text-ink/50">
            Cash on Delivery. Prices and availability are confirmed when you place the
            order.
          </p>

          {cart.summary.has_unavailable_items && (
            <div
              className="mt-5 border border-clay/20 bg-blush/40 p-4 text-xs leading-5 text-clay"
              role="alert"
            >
              Resolve unavailable items before continuing to checkout.
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
          <button className="text-link mx-auto mt-5" type="button" onClick={reload}>
            <RefreshCw size={13} aria-hidden="true" />
            Refresh availability
          </button>
        </aside>
      </div>
    </section>
  );
}
