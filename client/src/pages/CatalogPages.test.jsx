import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductDetailsPage } from './ProductDetailsPage.jsx';
import { ProductsPage } from './ProductsPage.jsx';
import { TestAppProviders } from '../test/TestAppProviders.jsx';
import { createAppQueryClient } from '../queries/queryClient.js';
import { queryKeys } from '../queries/queryKeys.js';

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
  cleanup();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const listResponse = (items = [product], page = 1, totalPages = 1) => ({
  data: items,
  pagination: {
    page,
    limit: 9,
    total: items.length,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  },
});

const renderCatalog = (path = '/products', options = {}) => {
  const queryClient = createAppQueryClient();
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retry: false },
  });
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <TestAppProviders queryClient={queryClient} {...options}>
        <Routes>
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:productId" element={<ProductDetailsPage />} />
        </Routes>
      </TestAppProviders>
    </MemoryRouter>,
  );
  return { ...view, queryClient };
};

describe('catalog pages', () => {
  it('refreshes stock immediately after a rejected add without retrying the mutation', async () => {
    let stock = 14;
    const addItem = vi.fn().mockImplementation(async () => {
      stock = 0;
      throw new Error('This piece has just sold out.');
    });
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
      jsonResponse(
        String(input).includes('/api/categories')
          ? { data: [category] }
          : listResponse([{ ...product, stock_quantity: stock }]),
      ),
    );
    renderCatalog('/products', { user: { id: 'customer' }, cartActions: { addItem } });
    fireEvent.click(await screen.findByRole('button', { name: 'Add' }));
    expect(await screen.findByRole('button', { name: 'Out of stock' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This piece has just sold out.',
    );
    expect(addItem).toHaveBeenCalledTimes(1);
  });

  it('offers recovery when the requested page no longer has products', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
      jsonResponse(
        String(input).includes('/api/categories')
          ? { data: [category] }
          : String(input).includes('page=3')
            ? listResponse([], 3)
            : listResponse(),
      ),
    );
    renderCatalog('/products?page=3');
    fireEvent.click(await screen.findByRole('button', { name: 'Back to first page' }));
    expect(await screen.findByText(product.name)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Nothing blooming here yet' }),
    ).not.toBeInTheDocument();
  });

  it.each(['/products', `/products/${product.id}`])(
    'refreshes normal, low, and zero stock on %s and disables purchases',
    async (path) => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
      let stock = 14;
      const addItem = vi.fn();
      vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
        String(input).includes('/api/categories')
          ? jsonResponse({ data: [category] })
          : jsonResponse(
              path === '/products'
                ? listResponse([{ ...product, stock_quantity: stock }])
                : { data: { ...product, stock_quantity: stock } },
            ),
      );
      renderCatalog(path, { user: { id: 'customer' }, cartActions: { addItem } });
      expect(await screen.findByText('14 in stock')).toBeInTheDocument();
      stock = 5;
      await act(async () => vi.advanceTimersByTimeAsync(30_000));
      expect(await screen.findByText('Only 5 left')).toBeInTheDocument();
      stock = 0;
      await act(async () => vi.advanceTimersByTimeAsync(30_000));
      const button = await screen.findByRole('button', { name: 'Out of stock' });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(addItem).not.toHaveBeenCalled();
      const announcement = screen
        .getAllByText('Out of stock')
        .find((element) => element.getAttribute('aria-live') === 'polite');
      expect(announcement).toHaveAttribute('aria-atomic', 'true');
      stock = 6;
      await act(async () => vi.advanceTimersByTimeAsync(30_000));
      expect(await screen.findByText('6 in stock')).toBeInTheDocument();
      expect(
        screen.getByRole('button', {
          name: path === '/products' ? 'Add' : 'Add to cart',
        }),
      ).toBeEnabled();
    },
  );

  it('pauses hidden-tab polling, refreshes on return/focus/reconnect, and stops on unmount', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const visibility = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('visible');
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input) =>
        jsonResponse(
          String(input).includes('/api/categories')
            ? { data: [category] }
            : listResponse(),
        ),
      );
    const { unmount } = renderCatalog();
    await screen.findByText(product.name);
    const productRequests = () =>
      fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/products'))
        .length;
    expect(productRequests()).toBe(1);
    visibility.mockReturnValue('hidden');
    fireEvent(window, new Event('visibilitychange'));
    await act(async () => vi.advanceTimersByTimeAsync(90_000));
    expect(productRequests()).toBe(1);
    visibility.mockReturnValue('visible');
    fireEvent(window, new Event('visibilitychange'));
    await waitFor(() => expect(productRequests()).toBe(2));
    fireEvent(window, new Event('focus'));
    await waitFor(() => expect(productRequests()).toBe(3));
    fireEvent(window, new Event('offline'));
    fireEvent(window, new Event('online'));
    await waitFor(() => expect(productRequests()).toBe(4));
    unmount();
    await act(async () => vi.advanceTimersByTimeAsync(90_000));
    expect(productRequests()).toBe(4);
  });

  it('keeps stock and products visible during refresh and a temporary failure', async () => {
    let finishRefresh;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input) =>
        jsonResponse(
          String(input).includes('/api/categories')
            ? { data: [category] }
            : listResponse(),
        ),
      );
    const { queryClient } = renderCatalog();
    await screen.findByText('14 in stock');
    fetchMock.mockImplementation((input) =>
      String(input).includes('/api/categories')
        ? jsonResponse({ data: [category] })
        : new Promise((resolve) => {
            finishRefresh = resolve;
          }),
    );
    act(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products });
    });
    await screen.findByText('Updating availability…');
    expect(screen.getByText(product.name)).toBeInTheDocument();
    expect(screen.getByText('14 in stock')).toBeInTheDocument();
    expect(screen.queryByLabelText('Loading products')).not.toBeInTheDocument();
    await act(async () =>
      finishRefresh(await jsonResponse({ error: { message: 'Unavailable' } }, 503)),
    );
    expect(
      await screen.findByText(/Availability could not be refreshed/),
    ).toBeInTheDocument();
    expect(screen.getByText('14 in stock')).toBeInTheDocument();
    fetchMock.mockImplementation((input) =>
      jsonResponse(
        String(input).includes('/api/categories')
          ? { data: [category] }
          : listResponse([{ ...product, stock_quantity: 0 }]),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry stock check' }));
    expect(await screen.findByRole('button', { name: 'Out of stock' })).toBeDisabled();
  });

  it('keeps the previous page visible and prevents repeated pagination while loading', async () => {
    let finishPage;
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
      String(input).includes('/api/categories')
        ? jsonResponse({ data: [category] })
        : String(input).includes('page=2')
          ? new Promise((resolve) => {
              finishPage = resolve;
            })
          : jsonResponse(listResponse([product], 1, 2)),
    );
    renderCatalog();
    await screen.findByText(product.name);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Updating the collection…')).toBeInTheDocument();
    expect(screen.getByText(product.name)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await act(async () =>
      finishPage(
        await jsonResponse(
          listResponse([{ ...product, id: 'second', name: 'Second bouquet' }], 2, 2),
        ),
      ),
    );
    expect(await screen.findByText('Second bouquet')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByText(product.name)).not.toBeInTheDocument();
  });

  it('contains filter focus and closes by Escape, backdrop, and category selection', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
      jsonResponse(
        String(input).includes('/api/categories')
          ? { data: [category] }
          : listResponse(),
      ),
    );
    renderCatalog();
    await screen.findByText(product.name);
    const trigger = screen.getByRole('button', { name: 'Filters' });
    fireEvent.click(trigger);
    let drawer = screen.getByRole('dialog', { name: 'catalog filters' });
    const closeButton = within(drawer).getByRole('button', {
      name: 'Close catalog filters',
    });
    expect(closeButton).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(within(drawer).getByRole('button', { name: 'View results' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
    fireEvent.click(trigger);
    fireEvent.click(
      screen
        .getAllByRole('button', { name: 'Close catalog filters' })
        .find((button) => button.classList.contains('navigation-drawer-backdrop')),
    );
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    drawer = screen.getByRole('dialog');
    fireEvent.click(within(drawer).getByRole('button', { name: 'Flowers 1' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Filters (1)' })).toHaveFocus();
    expect(
      screen.getByRole('button', { name: 'Remove Flowers filter' }),
    ).toBeInTheDocument();
  });

  it('validates price ranges and removes individual filters without clearing the others', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input) =>
        jsonResponse(
          String(input).includes('/api/categories')
            ? { data: [category] }
            : listResponse(),
        ),
      );
    renderCatalog('/products?category=flowers&search=bouquet');
    await screen.findByText(product.name);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Minimum price' }), {
      target: { value: '2000' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Maximum price' }), {
      target: { value: '1000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply price' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Minimum price must be no greater',
    );
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).includes('minPrice')),
    ).toHaveLength(0);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Minimum price' }), {
      target: { value: '100.50' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply price' }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([url]) => String(url).includes('minPrice=100.5')),
      ).toBe(true),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove Flowers filter' }));
    expect(
      screen.getByRole('button', { name: 'Remove Search: bouquet filter' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Remove Flowers filter' }),
    ).not.toBeInTheDocument();
  });

  it('blocks a product that becomes inactive during a detail refresh', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockReturnValue(jsonResponse({ data: product }));
    const { queryClient } = renderCatalog(`/products/${product.id}`);
    await screen.findByText('14 in stock');
    fetchMock.mockReturnValue(
      jsonResponse({ error: { message: 'Product not found.' } }, 404),
    );
    await act(async () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.product(product.id) }),
    );
    expect(await screen.findByText('Product not found.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add to cart' }),
    ).not.toBeInTheDocument();
  });

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
        <TestAppProviders>
          <Routes>
            <Route path="/products" element={<ProductsPage />} />
          </Routes>
        </TestAppProviders>
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
        <TestAppProviders>
          <Routes>
            <Route path="/products/:productId" element={<ProductDetailsPage />} />
          </Routes>
        </TestAppProviders>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Blush Garden Bouquet' }),
    ).toBeInTheDocument();
    expect(screen.getByText('₱1,890')).toBeInTheDocument();
    expect(screen.getByText('14 in stock')).toBeInTheDocument();
    expect(screen.getByText(/Product code/)).toHaveTextContent('FLW-BLS-001');
  });
});
