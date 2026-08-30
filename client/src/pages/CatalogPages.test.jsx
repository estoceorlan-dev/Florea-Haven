import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductDetailsPage } from './ProductDetailsPage.jsx';
import { ProductsPage } from './ProductsPage.jsx';

const category = {
  id: '10000000-0000-4000-8000-000000000002',
  name: 'Flowers',
  slug: 'flowers',
  description: 'Fresh flowers.',
  product_count: 1,
};

const product = {
  id: '20000000-0000-4000-8000-000000000001',
  slug: 'blush-garden-bouquet',
  sku: 'FLW-BLS-001',
  name: 'Blush Garden Bouquet',
  description: 'A soft gathering of seasonal flowers.',
  price: 1890,
  stock_quantity: 14,
  image_url: null,
  featured: true,
  created_at: '2026-08-30T00:00:00.000Z',
  category,
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

describe('catalog pages', () => {
  it('renders product-list results returned by the API', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);

      if (url.includes('/api/categories')) {
        return jsonResponse({ data: [category] });
      }

      return jsonResponse({
        data: [product],
        pagination: {
          page: 1,
          limit: 9,
          total: 1,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      });
    });

    render(
      <MemoryRouter initialEntries={['/products?category=flowers']}>
        <Routes>
          <Route path="/products" element={<ProductsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Blush Garden Bouquet')).toBeInTheDocument();
    expect(screen.getByText('1 piece')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Flowers' })).toBeInTheDocument();
  });

  it('renders product details returned by the API', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(jsonResponse({ data: product }));

    render(
      <MemoryRouter initialEntries={[`/products/${product.id}`]}>
        <Routes>
          <Route path="/products/:productId" element={<ProductDetailsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Blush Garden Bouquet' }),
    ).toBeInTheDocument();
    expect(screen.getByText('₱1,890')).toBeInTheDocument();
    expect(screen.getByText(/Product code/)).toHaveTextContent('FLW-BLS-001');
  });
});
