import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddToCartButton } from '../components/AddToCartButton.jsx';
import { AuthContext } from '../context/AuthContext.js';
import { CartProvider } from '../context/CartProvider.jsx';
import { useCart } from '../hooks/useCart.js';
import { TestAppProviders } from '../test/TestAppProviders.jsx';
import { CartPage } from './CartPage.jsx';

const customer = {
  id: '30000000-0000-4000-8000-000000000003',
  name: 'Mara Santos',
  email: 'mara@example.com',
  role: 'customer',
};

const product = {
  id: '20000000-0000-4000-8000-000000000001',
  name: 'Blush Garden Bouquet',
  price: 1890,
  stock_quantity: 14,
  image_url: null,
  category: { name: 'Flowers', slug: 'flowers' },
};

const cart = {
  items: [
    {
      id: '40000000-0000-4000-8000-000000000001',
      quantity: 2,
      unit_price: 1890,
      line_total: 3780,
      availability: 'available',
      product,
    },
  ],
  summary: {
    item_count: 2,
    distinct_items: 1,
    subtotal: 3780,
    has_unavailable_items: false,
  },
};

const authValue = {
  user: customer,
  isAuthenticated: true,
  isLoading: false,
  sessionError: null,
};

const jsonResponse = (payload, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(payload),
  });

function CartProbe() {
  const cartState = useCart();
  return (
    <p>
      {cartState.isLoading
        ? 'Loading cart'
        : `${cartState.cart.summary.item_count} items`}
    </p>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('cart flows', () => {
  it('loads the signed-in customer cart from the API', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockReturnValue(jsonResponse({ data: { cart } }));

    render(
      <AuthContext.Provider value={authValue}>
        <CartProvider>
          <CartProbe />
        </CartProvider>
      </AuthContext.Provider>,
    );

    expect(await screen.findByText('2 items')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/cart',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('renders cart totals and sends quantity and removal actions', async () => {
    const updateItem = vi.fn().mockResolvedValue(cart);
    const removeItem = vi.fn().mockResolvedValue({
      items: [],
      summary: { item_count: 0 },
    });

    render(
      <MemoryRouter>
        <TestAppProviders
          user={customer}
          cart={cart}
          cartActions={{ updateItem, removeItem }}
        >
          <CartPage />
        </TestAppProviders>
      </MemoryRouter>,
    );

    expect(screen.getAllByText('₱3,780')).toHaveLength(3);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Increase Blush Garden Bouquet quantity',
      }),
    );
    await waitFor(() => expect(updateItem).toHaveBeenCalledWith(cart.items[0].id, 3));

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(removeItem).toHaveBeenCalledWith(cart.items[0].id));
  });

  it('adds a product through the reusable catalog action', async () => {
    const addItem = vi.fn().mockResolvedValue(cart);

    render(
      <MemoryRouter initialEntries={['/products']}>
        <TestAppProviders user={customer} cart={cart} cartActions={{ addItem }}>
          <AddToCartButton product={product} />
        </TestAppProviders>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    await waitFor(() => expect(addItem).toHaveBeenCalledWith(product.id, 1));
    expect(await screen.findByRole('button', { name: 'Added' })).toBeInTheDocument();
  });
});
