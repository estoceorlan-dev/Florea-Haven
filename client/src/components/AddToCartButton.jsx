import { Check, LoaderCircle, Plus, ShoppingBag, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useCart } from '../hooks/useCart.js';

export function AddToCartButton({
  product,
  className = 'button-secondary',
  compact = false,
  iconOnly = false,
}) {
  const { user } = useAuth();
  const { addItem } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const isStockUnknown =
    product.stock_quantity == null || !Number.isFinite(Number(product.stock_quantity));
  const isOutOfStock =
    product.is_active === false ||
    (!isStockUnknown && Number(product.stock_quantity) < 1);

  const add = async () => {
    if (isStockUnknown || isOutOfStock || status === 'adding') return;
    if (!user) {
      navigate('/login', {
        state: { from: `${location.pathname}${location.search}` },
      });
      return;
    }

    setStatus('adding');
    setError(null);

    try {
      await addItem(product.id, 1);
      setStatus('added');
    } catch (addError) {
      setError(addError.message);
      setStatus('idle');
    }
  };

  const label = isStockUnknown
    ? 'Checking stock…'
    : isOutOfStock
      ? 'Out of stock'
      : status === 'adding'
        ? 'Adding…'
        : status === 'added'
          ? 'Added'
          : compact
            ? 'Add'
            : 'Add to cart';

  return (
    <div className={iconOnly ? 'contents' : undefined}>
      <button
        className={className}
        type="button"
        disabled={isStockUnknown || isOutOfStock || status === 'adding'}
        onClick={add}
        aria-label={iconOnly ? `Add ${product.name} to cart` : undefined}
        title={iconOnly ? label : undefined}
        aria-busy={status === 'adding'}
      >
        {status === 'adding' ? (
          <LoaderCircle
            className="motion-safe:animate-spin"
            size={18}
            aria-hidden="true"
          />
        ) : status === 'added' ? (
          <Check size={15} aria-hidden="true" />
        ) : iconOnly ? (
          <span className="relative inline-flex" aria-hidden="true">
            <ShoppingCart size={20} />
            <Plus className="absolute -right-1 -top-1" size={10} strokeWidth={3} />
          </span>
        ) : compact ? (
          <Plus size={15} aria-hidden="true" />
        ) : (
          <ShoppingBag size={15} aria-hidden="true" />
        )}
        {!iconOnly && label}
      </button>
      {error && (
        <p
          className={`mt-2 text-xs leading-5 text-clay ${iconOnly ? 'col-span-2' : ''}`}
          role="alert"
        >
          {error}
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        {status === 'added' ? `${product.name} added to cart.` : ''}
      </span>
    </div>
  );
}
