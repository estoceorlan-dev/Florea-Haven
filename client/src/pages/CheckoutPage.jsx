import { ArrowLeft, Banknote, LockKeyhole } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { InlineError } from '../components/InlineError.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useCart } from '../hooks/useCart.js';
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
        {label} {optional && <span className="font-normal text-ink/45">Optional</span>}
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
  const { user } = useAuth();
  const { cart, error: cartError, isLoading, reload } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState(() => initialAddress(user.name));
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submission = useRef({ fingerprint: null, key: null });

  if (isLoading) {
    return (
      <div className="page-shell py-20" aria-busy="true">
        <div className="h-14 w-64 animate-pulse bg-evergreen/10" />
        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_360px]">
          <div className="h-[520px] animate-pulse bg-evergreen/10" />
          <div className="h-80 animate-pulse bg-evergreen/10" />
        </div>
      </div>
    );
  }

  if (cartError) {
    return (
      <div className="page-shell py-20">
        <InlineError error={cartError} onRetry={reload} />
      </div>
    );
  }

  if (cart.items.length === 0) return <Navigate to="/cart" replace />;

  const fieldError = (field) =>
    (Array.isArray(error?.details) ? error.details : []).find(
      (detail) => detail.field === `deliveryAddress.${field}`,
    )?.message;

  const updateAddress = (field, value) => {
    setAddress((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (isSubmitting || cart.summary.has_unavailable_items) return;

    setError(null);
    setIsSubmitting(true);

    const input = {
      cartRevision: cart.revision,
      paymentMethod: 'cash_on_delivery',
      deliveryAddress: address,
    };
    const fingerprint = JSON.stringify(input);

    if (submission.current.fingerprint !== fingerprint) {
      submission.current = { fingerprint, key: newIdempotencyKey() };
    }

    try {
      const payload = await orderApi.placeOrder(input, submission.current.key);
      await reload().catch(() => undefined);
      navigate(`/orders/${payload.data.order.id}/confirmation`, { replace: true });
    } catch (submissionError) {
      setError(submissionError);
      if (
        ['CART_CHANGED', 'PRODUCT_INACTIVE', 'INSUFFICIENT_STOCK'].includes(
          submissionError.code,
        )
      ) {
        await reload().catch(() => undefined);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page-shell py-14 sm:py-20">
      <Link className="text-link" to="/cart">
        <ArrowLeft size={14} aria-hidden="true" />
        Back to cart
      </Link>
      <div className="mt-8 border-b border-evergreen/10 pb-8">
        <p className="eyebrow text-clay">Cash on Delivery</p>
        <h1 className="mt-3 font-display text-5xl tracking-[-0.055em] text-evergreen sm:text-6xl">
          Where shall we send it?
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-ink/55">
          Review your garden finds and share the delivery details for this order.
        </p>
      </div>

      <form
        className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16"
        onSubmit={submit}
        noValidate
      >
        <div>
          {error && (
            <div className="form-alert mb-7" role="alert">
              {error.message}
            </div>
          )}

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

          <div className="mt-8 flex gap-3 border border-evergreen/10 bg-white p-5 text-sm text-ink/60">
            <Banknote className="mt-0.5 shrink-0 text-leaf" size={20} />
            <div>
              <strong className="block text-evergreen">Cash on Delivery</strong>
              Pay the exact order total when your delivery arrives. No card details are
              collected.
            </div>
          </div>
        </div>

        <aside className="h-fit bg-mist p-6 lg:sticky lg:top-28 lg:p-8">
          <p className="eyebrow text-clay">Order summary</p>
          <div className="mt-5 space-y-4 border-b border-evergreen/10 pb-5">
            {cart.items.map((item) => (
              <div className="flex justify-between gap-4 text-sm" key={item.id}>
                <span className="text-ink/60">
                  {item.product.name} × {item.quantity}
                </span>
                <span className="shrink-0 font-semibold text-evergreen">
                  {formatCurrency(item.line_total)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <strong className="font-display text-2xl text-evergreen">Total</strong>
            <strong className="text-lg text-evergreen">
              {formatCurrency(cart.summary.subtotal)}
            </strong>
          </div>

          {cart.summary.has_unavailable_items && (
            <div className="form-alert mt-5" role="alert">
              Your cart has an unavailable item. Return to the cart and resolve it
              before placing the order.
            </div>
          )}

          <button
            className="button-primary mt-6 w-full"
            type="submit"
            disabled={isSubmitting || cart.summary.has_unavailable_items}
          >
            <LockKeyhole size={15} aria-hidden="true" />
            {isSubmitting ? 'Placing your order…' : 'Place order'}
          </button>
          <p className="mt-4 text-center text-xs leading-5 text-ink/45">
            Your stock and total are checked once more before the order is confirmed.
          </p>
        </aside>
      </form>
    </section>
  );
}
