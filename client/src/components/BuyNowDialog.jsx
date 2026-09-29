import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  LoaderCircle,
  LockKeyhole,
  Minus,
  Plus,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useInvalidateCatalog } from '../queries/useInvalidateCatalog.js';
import { queryKeys } from '../queries/queryKeys.js';
import { catalogApi, orderApi } from '../services/api.js';
import { formatCurrency } from '../utils/currency.js';
import { DeliveryAddressFields } from './DeliveryAddressFields.jsx';
import { ProductImage } from './ProductImage.jsx';
import { PurchaseDialog } from './ui/PurchaseDialog.jsx';
import { StockIndicator } from './ui/StockIndicator.jsx';

export function BuyNowDialog({ product, onClose, initialQuantity = 1 }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidateCatalog = useInvalidateCatalog();
  const [item, setItem] = useState(product);
  const [quantity, setQuantity] = useState(() =>
    Math.max(
      1,
      Math.min(
        Math.floor(Number(initialQuantity)) || 1,
        Number(product.stock_quantity) || 1,
        999,
      ),
    ),
  );
  const [step, setStep] = useState('review');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [address, setAddress] = useState({
    recipientName: user?.name ?? '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'Philippines',
  });
  const inFlight = useRef(false);
  const submission = useRef({ fingerprint: null, key: null });
  const contentRef = useRef(null);
  const maximum = Math.min(Number(item.stock_quantity) || 0, 999);
  const unavailable = maximum < quantity || item.is_active === false;

  const focusContent = () =>
    requestAnimationFrame(() => {
      contentRef.current?.focus();
      contentRef.current?.closest('dialog')?.scrollTo?.({ top: 0 });
    });

  const continueToCheckout = async () => {
    if (inFlight.current || unavailable) return;
    if (!user) {
      navigate('/login', {
        state: { from: `/products/${item.id}?buy=1&quantity=${quantity}` },
      });
      return;
    }
    if (user.role !== 'customer') {
      setError(new Error('Please use a customer account to place an order.'));
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const { data: latest } = await catalogApi.getProduct(item.id);
      setItem(latest);
      if (latest.is_active === false || latest.stock_quantity < quantity) {
        setError(
          new Error(
            'Availability changed. Please review the quantity before continuing.',
          ),
        );
      } else if (Number(latest.price) !== Number(item.price)) {
        setError(
          new Error('The price changed. Review the updated total, then continue.'),
        );
      } else {
        setStep('checkout');
      }
    } catch (loadError) {
      setError(loadError);
    } finally {
      inFlight.current = false;
      setBusy(false);
      focusContent();
    }
  };

  const placeOrder = async (event) => {
    event.preventDefault();
    if (inFlight.current || unavailable) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    const input = {
      productId: item.id,
      quantity,
      expectedUnitPrice: Number(item.price),
      paymentMethod: 'cash_on_delivery',
      deliveryAddress: address,
    };
    const fingerprint = JSON.stringify(input);
    if (submission.current.fingerprint !== fingerprint)
      submission.current = { fingerprint, key: crypto.randomUUID() };
    try {
      const {
        data: { order },
      } = await orderApi.buyNow(input, submission.current.key);
      queryClient.setQueryData(queryKeys.order(user.id, order.id), { data: order });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders(user.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart(user.id) });
      void invalidateCatalog();
      navigate(`/orders/${order.id}/confirmation`);
    } catch (submissionError) {
      setError(submissionError);
      if (
        ['PRICE_CHANGED', 'PRODUCT_INACTIVE', 'INSUFFICIENT_STOCK'].includes(
          submissionError.code,
        )
      ) {
        setStep('review');
        const latest = await catalogApi.getProduct(item.id).catch(() => null);
        if (latest) setItem(latest.data);
        void invalidateCatalog();
      }
      focusContent();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <PurchaseDialog
      title={step === 'review' ? 'Make it yours' : 'Checkout'}
      onClose={onClose}
      busy={busy}
    >
      <div ref={contentRef} tabIndex={-1} className="outline-none">
        <p className="mb-5 text-xs font-medium text-text-muted">
          {step === 'review' ? '1. Review your selection' : '2. Delivery & payment'}
        </p>
        {error && (
          <p className="form-alert mb-5" role="alert">
            {error.message}
          </p>
        )}
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-3 sm:gap-5">
          <ProductImage
            className="size-20 shrink-0 rounded-xl object-cover sm:size-24"
            src={item.image_url}
            alt={item.name}
            loading="eager"
          />
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-muted">{item.category.name}</p>
            <h3 className="mt-1 break-words font-display text-xl leading-tight text-brand-strong sm:text-2xl">
              {item.name}
            </h3>
            <p className="mt-2 text-sm font-semibold text-brand-strong">
              {formatCurrency(item.price)}
              {step === 'checkout' && (
                <span className="ml-2 font-normal text-text-muted">× {quantity}</span>
              )}
            </p>
          </div>
        </div>
        {step === 'review' ? (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Quantity</p>
                <StockIndicator className="mt-2" stockQuantity={item.stock_quantity} />
              </div>
              <div className="flex items-center rounded-full border border-border bg-surface p-1">
                <button
                  className="icon-button disabled:opacity-30"
                  aria-label="Decrease quantity"
                  type="button"
                  disabled={busy || quantity <= 1}
                  onClick={() => setQuantity((value) => value - 1)}
                >
                  <Minus size={16} aria-hidden="true" />
                </button>
                <output
                  className="min-w-10 text-center text-sm font-semibold tabular-nums"
                  aria-label="Quantity"
                  aria-live="polite"
                >
                  {quantity}
                </output>
                <button
                  className="icon-button disabled:opacity-30"
                  aria-label="Increase quantity"
                  type="button"
                  disabled={busy || quantity >= maximum}
                  onClick={() => setQuantity((value) => value + 1)}
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
              <span className="text-sm text-text-muted">Total</span>
              <strong className="text-xl text-brand-strong">
                {formatCurrency(Number(item.price) * quantity)}
              </strong>
            </div>
            <p className="mt-3 text-xs leading-5 text-text-muted">
              Buy this selection now. Items already in your cart will stay there.
            </p>
            <button
              className="button-primary mt-6 w-full"
              type="button"
              disabled={busy || unavailable}
              onClick={continueToCheckout}
            >
              {busy ? (
                <LoaderCircle
                  className="motion-safe:animate-spin"
                  size={17}
                  aria-hidden="true"
                />
              ) : (
                <ArrowRight size={17} aria-hidden="true" />
              )}
              {busy
                ? 'Checking availability…'
                : user
                  ? 'Continue to checkout'
                  : 'Sign in to checkout'}
            </button>
          </>
        ) : (
          <form onSubmit={placeOrder} className="mt-6">
            <fieldset disabled={busy}>
              <legend className="mb-4 font-display text-2xl text-brand-strong">
                Delivery details
              </legend>
              <DeliveryAddressFields
                address={address}
                error={error}
                onChange={(field, value) =>
                  setAddress((current) => ({ ...current, [field]: value }))
                }
              />
            </fieldset>
            <div className="mt-5 flex gap-3 rounded-2xl bg-brand-soft p-4 text-sm text-brand-strong">
              <Banknote className="shrink-0" size={20} aria-hidden="true" />
              <div>
                <strong>Cash on Delivery</strong>
                <p className="mt-1 text-xs leading-5">Pay when your order arrives.</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
              <span className="text-sm text-text-muted">Order total</span>
              <strong className="text-xl text-brand-strong">
                {formatCurrency(Number(item.price) * quantity)}
              </strong>
            </div>
            <button
              className="button-primary mt-5 w-full"
              type="submit"
              disabled={busy || unavailable}
            >
              {busy ? (
                <LoaderCircle
                  className="motion-safe:animate-spin"
                  size={17}
                  aria-hidden="true"
                />
              ) : (
                <LockKeyhole size={17} aria-hidden="true" />
              )}
              {busy ? 'Placing your order…' : 'Place order'}
            </button>
            <button
              className="button-quiet mt-3 w-full"
              type="button"
              disabled={busy}
              onClick={() => {
                setStep('review');
                setError(null);
                focusContent();
              }}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to selection
            </button>
          </form>
        )}
      </div>
    </PurchaseDialog>
  );
}
