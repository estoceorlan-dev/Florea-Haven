import { Check, Plus, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useCart } from '../hooks/useCart.js';
import { useInvalidateCatalog } from '../queries/useInvalidateCatalog.js';

export function AddToCartButton({
  product,
  className = 'button-secondary',
  compact = false,
}) {
  const { user } = useAuth();
  const { addItem } = useCart();
  const invalidateCatalog = useInvalidateCatalog();
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const isStockUnknown =
    product.stock_quantity == null || !Number.isFinite(Number(product.stock_quantity));
  const isOutOfStock = !isStockUnknown && Number(product.stock_quantity) < 1;

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
    } finally {
      void invalidateCatalog();
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
    <div>
      <button
        className={className}
        type="button"
        disabled={isStockUnknown || isOutOfStock || status === 'adding'}
        onClick={add}
      >
        {status === 'added' ? (
          <Check size={15} aria-hidden="true" />
        ) : compact ? (
          <Plus size={15} aria-hidden="true" />
        ) : (
          <ShoppingBag size={15} aria-hidden="true" />
        )}
        {label}
      </button>
      {error && (
        <p className="mt-2 text-xs leading-5 text-clay" role="alert">
          {error}
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        {status === 'added' ? `${product.name} added to cart.` : ''}
      </span>
    </div>
  );
}
