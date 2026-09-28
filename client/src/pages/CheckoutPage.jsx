import { AlertTriangle, ArrowLeft, Banknote, LockKeyhole } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { InlineError } from '../components/InlineError.jsx';
import { AvailabilityStatus } from '../components/ui/AvailabilityStatus.jsx';
import { CartStockStatus } from '../components/ui/CartStockStatus.jsx';
import { CheckoutSkeleton } from '../components/ui/Skeleton.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useCart } from '../hooks/useCart.js';
import { queryKeys } from '../queries/queryKeys.js';
import { emptyCart } from '../queries/useCartQuery.js';
import { useInvalidateCatalog } from '../queries/useInvalidateCatalog.js';
import { orderApi } from '../services/api.js';
import { formatCurrency } from '../utils/currency.js';

const initialAddress = (name) => ({
  recipientName: name,
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  province: '',
  postalCode: '',
  country: 'Philippines',
});

const newIdempotencyKey = () => globalThis.crypto.randomUUID();
const isLineUnavailable = (item) =>
  item.availability !== 'available' ||
  item.product.is_active === false ||
  item.product.stock_quantity < item.quantity;
const hasUnavailableLines = (cart) =>
  cart.summary.has_unavailable_items || cart.items.some(isLineUnavailable);
const changedLineIds = (before, after) => {
  const previousItems = new Map(before.items.map((item) => [item.id, item]));
  return new Set(
    after.items
      .filter((item) => {
        const previous = previousItems.get(item.id);
        return (
          !previous ||
          previous.availability !== item.availability ||
          previous.product.stock_quantity !== item.product.stock_quantity ||
          previous.unit_price !== item.unit_price
        );
      })
      .map((item) => item.id),
  );
};

function AddressField({
  field,
  label,
  value,
  error,
  onChange,
  autoComplete,
  optional = false,
  ...inputProps
}) {
  const errorId = error ? `checkout-${field}-error` : undefined;
  return (
    <div className="form-field">
      <label htmlFor={`checkout-${field}`}>
        {label}{' '}
        {optional && <span className="font-normal text-text-muted">Optional</span>}
      </label>
      <input
        id={`checkout-${field}`}
        className="form-input"
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        value={value}
        onChange={(event) => onChange(field, event.target.value)}
        {...inputProps}
      />
      {error && (
        <span className="form-field-error" id={errorId}>
          {error}
        </span>
      )}
    </div>
  );
}

export function CheckoutPage() {
  const invalidateCatalog = useInvalidateCatalog();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    cart,
    error: cartError,
    refreshError,
    isLoading,
    isRefreshing,
    lastUpdated,
    reload,
    setCart,
    setCheckoutRefreshEnabled,
  } = useCart();
  const [completedOrderId, setCompletedOrderId] = useState(null);
  const [address, setAddress] = useState(() => initialAddress(user.name));
  const [error, setError] = useState(null);
  const [refreshFailure, setRefreshFailure] = useState(null);
  const [submitStage, setSubmitStage] = useState('idle');
  const [affectedItemIds, setAffectedItemIds] = useState(new Set());
  const priorCart = useRef(null);
  const noticeRef = useRef(null);
  const submission = useRef({ fingerprint: null, key: null });

  useEffect(() => {
    setCheckoutRefreshEnabled(true);
    void reload()
      .then(() => setRefreshFailure(null))
      .catch(setRefreshFailure);
    return () => setCheckoutRefreshEnabled(false);
  }, [reload, setCheckoutRefreshEnabled]);

  useEffect(() => {
    if (priorCart.current) {
      const changed = changedLineIds(priorCart.current, cart);
      if (changed.size > 0) {
        // Availability changes remain highlighted until the shopper leaves checkout.
        setAffectedItemIds((current) => new Set([...current, ...changed]));
      }
    }
    priorCart.current = cart;
  }, [cart]);

  useEffect(() => {
    if (error) noticeRef.current?.focus();
  }, [error]);

  if (completedOrderId)
    return <Navigate to={`/orders/${completedOrderId}/confirmation`} replace />;
  if (isLoading) return <CheckoutSkeleton />;
  if (cartError) {
    return (
      <div className="page-shell py-20">
        <InlineError error={cartError} onRetry={reload} />
      </div>
    );
  }
  if (cart.items.length === 0) return <Navigate to="/cart" replace />;

  const unavailable = hasUnavailableLines(cart);
  const fieldError = (field) =>
    (Array.isArray(error?.details) ? error.details : []).find(
      (detail) => detail.field === `deliveryAddress.${field}`,
    )?.message;
  const updateAddress = (field, value) =>
    setAddress((current) => ({ ...current, [field]: value }));

  const showAvailabilityConflict = (latestCart, message) => {
    const changed = changedLineIds(cart, latestCart);
    const unavailableIds = latestCart.items
      .filter(isLineUnavailable)
      .map((item) => item.id);
    setCart(latestCart);
    setAffectedItemIds(new Set([...changed, ...unavailableIds]));
    const conflict = new Error(message);
    conflict.code = 'AVAILABILITY_CHANGED';
    setError(conflict);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submitStage !== 'idle' || unavailable) return;
    setError(null);
    setSubmitStage('checking');

    let latestCart;
    try {
      latestCart = await reload();
      setRefreshFailure(null);
    } catch (loadError) {
      const preflightError = new Error(
        'We could not check current availability. Your delivery details are saved on this page; try the stock check again.',
      );
      preflightError.code = 'STOCK_CHECK_FAILED';
      preflightError.cause = loadError;
      setError(preflightError);
      setSubmitStage('idle');
      return;
    }

    if (latestCart.items.length === 0) {
      setCart(latestCart);
      setSubmitStage('idle');
      return;
    }
    if (hasUnavailableLines(latestCart)) {
      showAvailabilityConflict(
        latestCart,
        'Availability changed for the highlighted item. Correct its quantity or remove it before placing your order.',
      );
      setSubmitStage('idle');
      return;
    }

    setCart(latestCart);
    setSubmitStage('placing');
    const input = {
      cartRevision: latestCart.revision,
      paymentMethod: 'cash_on_delivery',
      deliveryAddress: address,
    };
    const fingerprint = JSON.stringify(input);
    if (submission.current.fingerprint !== fingerprint) {
      submission.current = { fingerprint, key: newIdempotencyKey() };
    }

    try {
      const payload = await orderApi.placeOrder(input, submission.current.key);
      const newOrder = payload.data.order;
      setCompletedOrderId(newOrder.id);
      setCart(emptyCart);
      queryClient.setQueryData(queryKeys.order(user.id, newOrder.id), {
        data: newOrder,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders(user.id) });
      void invalidateCatalog();
    } catch (submissionError) {
      void invalidateCatalog();
      if (
        ['CART_CHANGED', 'PRODUCT_INACTIVE', 'INSUFFICIENT_STOCK'].includes(
          submissionError.code,
        )
      ) {
        let refreshedCart = submissionError.details?.cart;
        if (!refreshedCart) {
          refreshedCart = await reload().catch(() => null);
        }
        if (refreshedCart) {
          showAvailabilityConflict(refreshedCart, submissionError.message);
        } else {
          setError(submissionError);
        }
      } else {
        setError(submissionError);
      }
    } finally {
      setSubmitStage('idle');
    }
  };

  return (
    <section className="page-shell py-12 sm:py-16">
      <Link className="text-link min-h-11" to="/cart">
        <ArrowLeft size={14} aria-hidden="true" />
        Back to cart
      </Link>
      <div className="mt-6 border-b border-border pb-8">
        <p className="eyebrow text-clay">Cash on Delivery</p>
        <h1 className="mt-3 font-display text-5xl tracking-[-0.055em] text-evergreen sm:text-6xl">
          Where shall we send it?
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-text-muted">
          Review your garden finds and share the delivery details for this order.
        </p>
      </div>
      <form
        className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12"
        onSubmit={submit}
        noValidate
      >
        <div className="min-w-0">
          {error && (
            <div
              ref={noticeRef}
              className="form-alert mb-6 outline-none"
              role="alert"
              tabIndex="-1"
            >
              <div className="flex gap-3">
                <AlertTriangle
                  className="mt-0.5 shrink-0"
                  size={18}
                  aria-hidden="true"
                />
                <div>
                  <strong className="block">Please review your order</strong>
                  <p className="mt-1">{error.message}</p>
                  {[
                    'AVAILABILITY_CHANGED',
                    'CART_CHANGED',
                    'PRODUCT_INACTIVE',
                    'INSUFFICIENT_STOCK',
                  ].includes(error.code) && (
                    <Link className="text-link mt-3 min-h-11" to="/cart">
                      Correct highlighted items in cart
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
          <section
            className="rounded-card border border-border bg-surface p-5 shadow-low sm:p-7"
            aria-labelledby="delivery-heading"
          >
            <div className="mb-6">
              <p className="eyebrow text-clay">Delivery</p>
              <h2
                id="delivery-heading"
                className="mt-2 font-display text-3xl text-evergreen"
              >
                Your delivery details
              </h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <AddressField
                  field="recipientName"
                  label="Recipient name"
                  value={address.recipientName}
                  error={fieldError('recipientName')}
                  onChange={updateAddress}
                  autoComplete="name"
                  required
                  minLength="2"
                  maxLength="80"
                />
              </div>
              <div className="sm:col-span-2">
                <AddressField
                  field="phone"
                  label="Phone number"
                  value={address.phone}
                  error={fieldError('phone')}
                  onChange={updateAddress}
                  autoComplete="tel"
                  type="tel"
                  required
                  minLength="7"
                  maxLength="30"
                />
              </div>
              <div className="sm:col-span-2">
                <AddressField
                  field="addressLine1"
                  label="Address line 1"
                  value={address.addressLine1}
                  error={fieldError('addressLine1')}
                  onChange={updateAddress}
                  autoComplete="address-line1"
                  required
                  minLength="5"
                  maxLength="160"
                />
              </div>
              <div className="sm:col-span-2">
                <AddressField
                  field="addressLine2"
                  label="Address line 2"
                  value={address.addressLine2}
                  error={fieldError('addressLine2')}
                  onChange={updateAddress}
                  autoComplete="address-line2"
                  maxLength="160"
                  optional
                />
              </div>
              <AddressField
                field="city"
                label="City"
                value={address.city}
                error={fieldError('city')}
                onChange={updateAddress}
                autoComplete="address-level2"
                required
                minLength="2"
                maxLength="80"
              />
              <AddressField
                field="province"
                label="Province"
                value={address.province}
                error={fieldError('province')}
                onChange={updateAddress}
                autoComplete="address-level1"
                required
                minLength="2"
                maxLength="80"
              />
              <AddressField
                field="postalCode"
                label="Postal code"
                value={address.postalCode}
                error={fieldError('postalCode')}
                onChange={updateAddress}
                autoComplete="postal-code"
                required
                minLength="3"
                maxLength="12"
              />
              <AddressField
                field="country"
                label="Country"
                value={address.country}
                error={fieldError('country')}
                onChange={updateAddress}
                autoComplete="country-name"
                readOnly
              />
            </div>
          </section>
          <div className="mt-5 flex gap-3 rounded-card border border-border bg-surface p-5 text-sm text-text-muted shadow-low">
            <Banknote
              className="mt-0.5 shrink-0 text-leaf"
              size={20}
              aria-hidden="true"
            />
            <div>
              <strong className="block text-evergreen">Cash on Delivery</strong>Pay the
              exact order total when your delivery arrives. No card details are
              collected.
            </div>
          </div>
        </div>
        <aside
          className="h-fit rounded-card border border-border bg-surface-muted p-6 shadow-low lg:sticky lg:top-28 lg:p-8"
          aria-busy={isRefreshing || submitStage === 'checking'}
        >
          <p className="eyebrow text-clay">Order summary</p>
          <AvailabilityStatus
            className="mt-3"
            lastUpdated={lastUpdated}
            isUpdating={isRefreshing || submitStage === 'checking'}
            error={refreshError ?? refreshFailure}
            onRetry={reload}
          />
          <div className="mt-5 space-y-3 border-b border-border pb-5">
            {cart.items.map((item) => (
              <article
                className={`rounded-control border p-3 text-sm transition ${affectedItemIds.has(item.id) || isLineUnavailable(item) ? 'cart-line-changed' : 'border-border bg-surface'}`}
                key={item.id}
              >
                <div className="flex justify-between gap-3">
                  <span className="min-w-0 break-words text-text-muted">
                    {item.product.name} × {item.quantity}
                  </span>
                  <span className="shrink-0 font-semibold text-evergreen">
                    {formatCurrency(item.line_total)}
                  </span>
                </div>
                <CartStockStatus className="mt-2 flex-wrap" item={item} />
              </article>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between gap-4">
            <strong className="font-display text-2xl text-evergreen">Total</strong>
            <strong className="text-lg text-evergreen">
              {formatCurrency(cart.summary.subtotal)}
            </strong>
          </div>
          {unavailable && (
            <div className="form-alert mt-5" role="alert">
              Correct or remove the highlighted item in your cart before placing the
              order.
            </div>
          )}
          <button
            className="button-primary mt-6 w-full"
            type="submit"
            disabled={submitStage !== 'idle' || unavailable}
          >
            <LockKeyhole size={15} aria-hidden="true" />
            {submitStage === 'checking'
              ? 'Checking stock…'
              : submitStage === 'placing'
                ? 'Placing your order…'
                : 'Place order'}
          </button>
          <p className="mt-4 text-center text-xs leading-5 text-text-muted">
            We check current stock immediately before submitting. The server confirms
            availability and creates the order once.
          </p>
        </aside>
      </form>
    </section>
  );
}
