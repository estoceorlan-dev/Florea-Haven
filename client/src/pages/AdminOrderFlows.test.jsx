import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestAppProviders } from '../test/TestAppProviders.jsx';
import { AdminOrderDetailPage } from './AdminOrderDetailPage.jsx';
import { AdminOrdersPage } from './AdminOrdersPage.jsx';

const admin = {
  id: '30000000-0000-4000-8000-000000000071',
  name: 'Fulfillment Admin',
  email: 'fulfillment.admin@example.com',
  role: 'admin',
};

const order = {
  id: '60000000-0000-4000-8000-000000000071',
  status: 'pending',
  status_updated_at: '2026-08-31T04:30:00.000Z',
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
  created_at: '2026-08-31T04:30:00.000Z',
  updated_at: '2026-08-31T04:30:00.000Z',
  customer: {
    id: '30000000-0000-4000-8000-000000000072',
    name: 'Mara Santos',
    email: 'mara.orders@example.com',
  },
  items: [
    {
      id: '70000000-0000-4000-8000-000000000071',
      product_id: '20000000-0000-4000-8000-000000000001',
      product_name: 'Blush Garden Bouquet',
      sku: 'FLW-BLS-001',
      unit_price: 1890,
      quantity: 2,
      line_total: 3780,
      created_at: '2026-08-31T04:30:00.000Z',
    },
  ],
};

const pagination = {
  page: 1,
  limit: 20,
  total: 1,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};

const jsonResponse = (payload, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(payload),
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('admin order flows', () => {
  it('renders the searchable, filtered order table with fulfillment context', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockReturnValue(
        jsonResponse({ data: [{ ...order, items: undefined }], pagination }),
      );

    render(
      <MemoryRouter>
        <TestAppProviders user={admin}>
          <AdminOrdersPage />
        </TestAppProviders>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Customer orders' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Mara Santos')).toBeInTheDocument();
    expect(screen.getByText('mara.orders@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('Pending')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute(
      'href',
      `/admin/orders/${order.id}`,
    );

    fireEvent.change(screen.getByLabelText('Search customer'), {
      target: { value: 'mara.orders' },
    });
    fireEvent.change(screen.getByLabelText('Filter by order status'), {
      target: { value: 'pending' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1][0])).toContain('customer=mara.orders');
    expect(String(fetchMock.mock.calls[1][0])).toContain('status=pending');
  });

  it('shows only legal next states and refreshes the detail after an update', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input, options) => {
        const url = String(input);
        const method = options?.method ?? 'GET';

        if (url === `/api/admin/orders/${order.id}` && method === 'GET') {
          return jsonResponse({ data: order });
        }
        if (url === `/api/admin/orders/${order.id}/status` && method === 'PUT') {
          const { status } = JSON.parse(options.body);
          return jsonResponse({ data: { ...order, status } });
        }

        throw new Error(`Unexpected request: ${method} ${url}`);
      });

    render(
      <MemoryRouter initialEntries={[`/admin/orders/${order.id}`]}>
        <TestAppProviders user={admin}>
          <Routes>
            <Route path="/admin/orders/:orderId" element={<AdminOrderDetailPage />} />
          </Routes>
        </TestAppProviders>
      </MemoryRouter>,
    );

    expect(await screen.findByText('mara.orders@example.com')).toBeInTheDocument();
    expect(screen.getByText('Blush Garden Bouquet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm order' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel order' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Mark as shipped' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm order' }));

    expect(
      await screen.findByText('Order status updated to confirmed.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start preparing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel order' })).toBeInTheDocument();

    const updateCall = fetchMock.mock.calls.find(
      ([url, options]) =>
        String(url) === `/api/admin/orders/${order.id}/status` &&
        options?.method === 'PUT',
    );
    expect(JSON.parse(updateCall[1].body)).toEqual({ status: 'confirmed' });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel order' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Cancel this order?' });
    expect(dialog).toHaveTextContent('returned to inventory');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel order' }));

    expect(
      await screen.findByText('Order status updated to cancelled.'),
    ).toBeInTheDocument();
    const statusCalls = fetchMock.mock.calls.filter(
      ([url, options]) =>
        String(url) === `/api/admin/orders/${order.id}/status` &&
        options?.method === 'PUT',
    );
    expect(JSON.parse(statusCalls[1][1].body)).toEqual({ status: 'cancelled' });
  });
});
