import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestAppProviders } from '../test/TestAppProviders.jsx';
import { AdminCategoriesPage } from './AdminCategoriesPage.jsx';
import { AdminProductsPage } from './AdminProductsPage.jsx';

const category = {
  id: '10000000-0000-4000-8000-000000000002',
  name: 'Flowers',
  slug: 'flowers',
  description: 'Fresh floral arrangements.',
  product_count: 1,
  active_product_count: 1,
};

const product = {
  id: '20000000-0000-4000-8000-000000000001',
  name: 'Blush Garden Bouquet',
  slug: 'blush-garden-bouquet',
  sku: 'FLW-BLS-001',
  description: 'A soft gathering of roses and seasonal foliage.',
  price: 1890,
  stock_quantity: 14,
  image_url: 'https://images.example.com/bouquet.jpg',
  featured: true,
  is_active: true,
  category: {
    id: category.id,
    name: category.name,
    slug: category.slug,
  },
};

const pagination = {
  page: 1,
  limit: 12,
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

const renderAdminPage = (page) =>
  render(
    <MemoryRouter>
      <TestAppProviders>{page}</TestAppProviders>
    </MemoryRouter>,
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe('admin catalog flows', () => {
  it('creates a category and refreshes the management list', async () => {
    let categories = [category];
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input, options) => {
        const url = String(input);
        const method = options?.method ?? 'GET';

        if (url === '/api/admin/categories' && method === 'GET') {
          return jsonResponse({ data: categories });
        }
        if (url === '/api/categories' && method === 'POST') {
          const body = JSON.parse(options.body);
          const created = {
            id: '10000000-0000-4000-8000-000000000099',
            ...body,
            product_count: 0,
            active_product_count: 0,
          };
          categories = [...categories, created];
          return jsonResponse({ data: created }, 201);
        }

        throw new Error(`Unexpected request: ${method} ${url}`);
      });

    renderAdminPage(<AdminCategoriesPage />);
    expect(await screen.findByRole('heading', { name: 'Flowers' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Category name'), {
      target: { value: 'Garden Tools' },
    });
    fireEvent.change(screen.getByLabelText(/^Slug/), {
      target: { value: 'garden-tools' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Tools for home gardeners.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create category' }));

    expect(await screen.findByText('Garden Tools was created.')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Garden Tools' }),
    ).toBeInTheDocument();

    const createCall = fetchMock.mock.calls.find(
      ([url, options]) =>
        String(url) === '/api/categories' && options?.method === 'POST',
    );
    expect(JSON.parse(createCall[1].body)).toEqual({
      name: 'Garden Tools',
      slug: 'garden-tools',
      description: 'Tools for home gardeners.',
    });
  });

  it('updates inventory and confirms product deactivation', async () => {
    let currentProduct = product;
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input, options) => {
        const url = String(input);
        const method = options?.method ?? 'GET';

        if (url === '/api/admin/categories' && method === 'GET') {
          return jsonResponse({ data: [category] });
        }
        if (url.startsWith('/api/admin/products') && method === 'GET') {
          return jsonResponse({ data: [currentProduct], pagination });
        }
        if (url === `/api/products/${product.id}` && method === 'PUT') {
          const body = JSON.parse(options.body);
          currentProduct = {
            ...currentProduct,
            stock_quantity: body.stockQuantity,
            is_active: body.isActive,
          };
          return jsonResponse({ data: currentProduct });
        }
        if (url === `/api/products/${product.id}` && method === 'DELETE') {
          currentProduct = { ...currentProduct, is_active: false };
          return jsonResponse({ data: currentProduct });
        }

        throw new Error(`Unexpected request: ${method} ${url}`);
      });

    renderAdminPage(<AdminProductsPage />);
    expect(await screen.findByText('Blush Garden Bouquet')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Blush Garden Bouquet' }));
    fireEvent.change(screen.getByLabelText(/^Stock quantity/), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save product' }));

    expect(
      await screen.findByText('Blush Garden Bouquet was updated.'),
    ).toBeInTheDocument();
    const updateCall = fetchMock.mock.calls.find(
      ([url, options]) =>
        String(url) === `/api/products/${product.id}` && options?.method === 'PUT',
    );
    expect(JSON.parse(updateCall[1].body).stockQuantity).toBe(5);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Deactivate Blush Garden Bouquet' }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Deactivate Blush Garden Bouquet' }),
    );

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('order history'));
    expect(
      await screen.findByText('Blush Garden Bouquet was deactivated.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Restore Blush Garden Bouquet' }),
    ).toBeInTheDocument();
  });
});
