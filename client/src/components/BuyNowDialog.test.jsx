import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { catalogApi, orderApi } from '../services/api.js';
import { TestAppProviders } from '../test/TestAppProviders.jsx';
import { ProductPurchaseActions } from './ProductPurchaseActions.jsx';

const product = {
  id: '20000000-0000-4000-8000-000000000001',
  name: 'Garden Bouquet',
  price: 1890,
  stock_quantity: 4,
  image_url: null,
  category: { name: 'Flowers' },
};
const customer = { id: 'customer', name: 'Bohol Shopper', role: 'customer' };

function LocationProbe() {
  const location = useLocation();
  return <p>{location.state?.from ?? location.pathname}</p>;
}

function renderPurchase({ user = customer, addItem = vi.fn() } = {}) {
  render(
    <MemoryRouter initialEntries={['/products']}>
      <TestAppProviders user={user} cartActions={{ addItem }}>
        <Routes>
          <Route
            path="/products"
            element={<ProductPurchaseActions product={product} />}
          />
          <Route path="/login" element={<LocationProbe />} />
          <Route path="/orders/:id/confirmation" element={<LocationProbe />} />
        </Routes>
      </TestAppProviders>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Buy now' }));
}

async function enterCheckout() {
  fireEvent.click(screen.getByRole('button', { name: 'Continue to checkout' }));
  await screen.findByRole('heading', { name: 'Checkout', exact: true });
  for (const [label, value] of [
    ['Phone number', '09171234567'],
    ['Address line 1', '12 Garden Street'],
    ['City', 'Tagbilaran'],
    ['Province', 'Bohol'],
    ['Postal code', '6300'],
  ]) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), {
      target: { value },
    });
  }
}

beforeEach(() => {
  // JSDOM does not implement native dialog methods; browser journeys cover focus/inert behavior.
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value() {
        this.setAttribute('open', '');
      },
    },
    close: {
      configurable: true,
      value() {
        this.removeAttribute('open');
      },
    },
  });
  vi.spyOn(catalogApi, 'getProduct').mockResolvedValue({ data: product });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete HTMLDialogElement.prototype.showModal;
  delete HTMLDialogElement.prototype.close;
});

describe('Buy now', () => {
  it('keeps the selected quantity when sending a guest to sign in', () => {
    renderPurchase({ user: null });
    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign in to checkout' }));
    expect(
      screen.getByText(`/products/${product.id}?buy=1&quantity=2`),
    ).toBeInTheDocument();
  });

  it('requires review of a changed price and enforces the stock quantity limit', async () => {
    catalogApi.getProduct.mockResolvedValue({
      data: { ...product, price: 1990, stock_quantity: 1 },
    });
    renderPurchase();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to checkout' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The price changed');
    expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeDisabled();
    expect(
      screen.queryByRole('heading', { name: 'Checkout', exact: true }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to checkout' }));
    expect(
      await screen.findByRole('heading', { name: 'Checkout', exact: true }),
    ).toBeInTheDocument();
  });

  it('retries the same order safely without adding or clearing cart items', async () => {
    const addItem = vi.fn();
    const buy = vi
      .spyOn(orderApi, 'buyNow')
      .mockRejectedValueOnce(new Error('Connection interrupted'))
      .mockResolvedValueOnce({ data: { order: { id: 'new-order' } } });
    renderPurchase({ addItem });
    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
    await enterCheckout();
    fireEvent.submit(
      screen.getByRole('button', { name: 'Place order' }).closest('form'),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Connection interrupted',
    );
    fireEvent.submit(
      screen.getByRole('button', { name: 'Place order' }).closest('form'),
    );
    expect(
      await screen.findByText('/orders/new-order/confirmation'),
    ).toBeInTheDocument();
    expect(buy).toHaveBeenCalledTimes(2);
    expect(buy.mock.calls[1]).toEqual(buy.mock.calls[0]);
    expect(buy.mock.calls[0][0]).toMatchObject({
      productId: product.id,
      quantity: 2,
      expectedUnitPrice: 1890,
      paymentMethod: 'cash_on_delivery',
    });
    expect(addItem).not.toHaveBeenCalled();
  });

  it('prevents a second submission or dismissal while the order is being placed', async () => {
    let resolve;
    const buy = vi.spyOn(orderApi, 'buyNow').mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    renderPurchase();
    await enterCheckout();
    const form = screen.getByRole('button', { name: 'Place order' }).closest('form');
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(buy).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Close purchase dialog' }),
    ).toBeDisabled();
    await act(async () => resolve({ data: { order: { id: 'single-order' } } }));
    await waitFor(() =>
      expect(screen.getByText('/orders/single-order/confirmation')).toBeInTheDocument(),
    );
  });
});
