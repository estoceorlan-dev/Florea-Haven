import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestAppProviders } from '../test/TestAppProviders.jsx';
import { CheckoutPage } from './CheckoutPage.jsx';
import { OrderConfirmationPage } from './OrderConfirmationPage.jsx';
import { OrderDetailPage } from './OrderDetailPage.jsx';
import { OrdersPage } from './OrdersPage.jsx';

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
  revision: 'a'.repeat(64),
  summary: {
    item_count: 2,
    distinct_items: 1,
    subtotal: 3780,
    has_unavailable_items: false,
  },
};

const order = {
  id: '60000000-0000-4000-8000-000000000001',
  status: 'pending',
  status_updated_at: '2026-08-30T10:30:00.000Z',
  payment_method: 'cash_on_delivery',
  delivery_address: {
    recipientName: 'Mara Santos',
    phone: '+63 917 123 4567',
    addressLine1: '12 Sampaguita Street',
    addressLine2: 'Barangay Maligaya',
    city: 'Quezon City',
    province: 'Metro Manila',
    postalCode: '1100',
    country: 'Philippines',
  },
  subtotal: 3780,
  total_amount: 3780,
  item_count: 2,
  created_at: '2026-08-30T10:30:00.000Z',
  updated_at: '2026-08-30T10:30:00.000Z',
  items: [
    {
      id: '70000000-0000-4000-8000-000000000001',
      product_id: product.id,
      product_name: product.name,
      sku: 'FLW-BLS-001',
      unit_price: 1890,
      quantity: 2,
      line_total: 3780,
      created_at: '2026-08-30T10:30:00.000Z',
    },
  ],
};

const jsonResponse = (payload, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(payload),
  });

const fillAddress = () => {
  fireEvent.change(screen.getByLabelText('Phone number'), {
    target: { value: '+63 917 123 4567' },
  });
  fireEvent.change(screen.getByLabelText('Address line 1'), {
    target: { value: '12 Sampaguita Street' },
  });
  fireEvent.change(screen.getByLabelText('Address line 2 Optional'), {
    target: { value: 'Barangay Maligaya' },
  });
  fireEvent.change(screen.getByLabelText('City'), {
    target: { value: 'Quezon City' },
  });
  fireEvent.change(screen.getByLabelText('Province'), {
    target: { value: 'Metro Manila' },
  });
  fireEvent.change(screen.getByLabelText('Postal code'), {
    target: { value: '1100' },
  });
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('checkout and customer order flows', () => {
  it('submits the server cart revision and continues to confirmation', async () => {
    const reload = vi.fn().mockResolvedValue({ items: [], summary: {} });
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockReturnValue(
        jsonResponse({ data: { order, idempotent_replay: false } }, 201),
      );

    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <TestAppProviders user={customer} cart={cart} cartActions={{ reload }}>
          <Routes>
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route
              path="/orders/:orderId/confirmation"
              element={<h1>Confirmation reached</h1>}
            />
          </Routes>
        </TestAppProviders>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Recipient name')).toHaveValue('Mara Santos');
    fillAddress();
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    expect(
      await screen.findByRole('heading', { name: 'Confirmation reached' }),
    ).toBeInTheDocument();
    expect(reload).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/orders');
    expect(options.headers['Idempotency-Key']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(JSON.parse(options.body)).toMatchObject({
      cartRevision: cart.revision,
      paymentMethod: 'cash_on_delivery',
      deliveryAddress: {
        recipientName: 'Mara Santos',
        city: 'Quezon City',
        country: 'Philippines',
      },
    });
  });

  it('preserves delivery input and refreshes the cart after a stale-cart conflict', async () => {
    const reload = vi.fn().mockResolvedValue(cart);
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      jsonResponse(
        {
          error: {
            code: 'CART_CHANGED',
            message: 'Your cart changed. Review it before trying again.',
            details: { cart: { ...cart, revision: 'b'.repeat(64) } },
          },
        },
        409,
      ),
    );

    render(
      <MemoryRouter>
        <TestAppProviders user={customer} cart={cart} cartActions={{ reload }}>
          <CheckoutPage />
        </TestAppProviders>
      </MemoryRouter>,
    );

    fillAddress();
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Your cart changed');
    expect(screen.getByLabelText('Address line 1')).toHaveValue('12 Sampaguita Street');
    expect(screen.getByLabelText('City')).toHaveValue('Quezon City');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('renders order history summaries returned by the API', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      jsonResponse({
        data: [{ ...order, items: undefined }],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      }),
    );

    render(
      <MemoryRouter>
        <TestAppProviders user={customer}>
          <OrdersPage />
        </TestAppProviders>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Order history' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText(/2 items/)).toHaveTextContent('₱3,780');
    expect(screen.getByRole('link', { name: /View order/ })).toHaveAttribute(
      'href',
      `/orders/${order.id}`,
    );
  });

  it('renders immutable item, total, address, and status details', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(jsonResponse({ data: order }));

    render(
      <MemoryRouter initialEntries={[`/orders/${order.id}`]}>
        <TestAppProviders user={customer}>
          <Routes>
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
          </Routes>
        </TestAppProviders>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Blush Garden Bouquet')).toBeInTheDocument();
    expect(screen.getByText(/FLW-BLS-001/)).toHaveTextContent('Qty 2');
    expect(screen.getAllByText('₱3,780')).toHaveLength(3);
    expect(
      screen.getByRole('heading', { name: 'Delivery address' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/12 Sampaguita Street/)).toBeInTheDocument();
    expect(screen.getByText('Cash on Delivery')).toBeInTheDocument();
  });

  it('shows the confirmation treatment for a completed checkout request', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(jsonResponse({ data: order }));

    render(
      <MemoryRouter initialEntries={[`/orders/${order.id}/confirmation`]}>
        <TestAppProviders user={customer}>
          <Routes>
            <Route
              path="/orders/:orderId/confirmation"
              element={<OrderConfirmationPage />}
            />
          </Routes>
        </TestAppProviders>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Order received.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Blush Garden Bouquet')).toBeInTheDocument();
  });
});
