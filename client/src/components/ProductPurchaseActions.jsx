import { useState } from 'react';
import { AddToCartButton } from './AddToCartButton.jsx';
import { BuyNowDialog } from './BuyNowDialog.jsx';

export function ProductPurchaseActions({
  product,
  initialOpen = false,
  initialQuantity = 1,
}) {
  const [open, setOpen] = useState(initialOpen);
  const unknown =
    product.stock_quantity == null || !Number.isFinite(Number(product.stock_quantity));
  const unavailable =
    !unknown && (Number(product.stock_quantity) < 1 || product.is_active === false);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_3rem] items-start gap-2">
      <button
        type="button"
        className="button-primary w-full px-3"
        disabled={unknown || unavailable}
        onClick={() => setOpen(true)}
      >
        {unknown ? 'Checking stock…' : unavailable ? 'Out of stock' : 'Buy now'}
      </button>
      <AddToCartButton
        product={product}
        iconOnly
        className="button-secondary size-12 px-0"
      />
      {open && (
        <BuyNowDialog
          product={product}
          initialQuantity={initialQuantity}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
