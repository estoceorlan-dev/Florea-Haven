import { Flower2, Search, SlidersHorizontal, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CatalogFilters } from '../components/CatalogFilters.jsx';
import { InlineError } from '../components/InlineError.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { ProductGridSkeleton } from '../components/ProductGridSkeleton.jsx';
import { NavigationDrawer } from '../components/ui/NavigationDrawer.jsx';
import { useCategoriesQuery } from '../queries/useCategoriesQuery.js';
import { useProductsQuery } from '../queries/useProductsQuery.js';
import { formatCurrency } from '../utils/currency.js';

const sortOptions = [
  ['featured', 'Featured'],
  ['newest', 'Newest'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['name-asc', 'Name: A–Z'],
];

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.get('search') ?? '');
  const filterButtonRef = useRef(null);
  const closeFilters = useCallback(() => setMobileFiltersOpen(false), []);
  const requestParams = Object.fromEntries(searchParams);
  const categories = useCategoriesQuery();
  const products = useProductsQuery({ ...requestParams, limit: 9 });

  useEffect(() => {
    // Keep editable search and the drawer aligned with back/forward navigation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchValue(searchParams.get('search') ?? '');
    setMobileFiltersOpen(false);
  }, [searchParams]);

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) next.delete(key);
      else next.set(key, String(value));
    });
    if (!Object.hasOwn(updates, 'page')) next.delete('page');
    setSearchParams(next);
  };

  const clearFilters = () => {
    setSearchValue('');
    setSearchParams({});
    closeFilters();
  };
  const activeCategory = requestParams.category ?? '';
  const categoryName =
    categories.data?.data.find((category) => category.slug === activeCategory)?.name ??
    'Collection';
  const appliedFilters = [
    requestParams.search && { key: 'search', label: `Search: ${requestParams.search}` },
    activeCategory && { key: 'category', label: categoryName },
    requestParams.minPrice && {
      key: 'minPrice',
      label: `From ${formatCurrency(Number(requestParams.minPrice))}`,
    },
    requestParams.maxPrice && {
      key: 'maxPrice',
      label: `Up to ${formatCurrency(Number(requestParams.maxPrice))}`,
    },
  ].filter(Boolean);
  const pagination = products.data?.pagination;
  const filterPanel = (
    <CatalogFilters
      key={`${requestParams.minPrice ?? ''}:${requestParams.maxPrice ?? ''}`}
      categories={categories}
      activeCategory={activeCategory}
      minPrice={requestParams.minPrice ?? ''}
      maxPrice={requestParams.maxPrice ?? ''}
      onChange={updateParams}
    />
  );

  return (
    <div>
      <section className="border-b border-border bg-surface-muted">
        <div className="page-shell py-12 text-center sm:py-16">
          <p className="eyebrow text-clay">Bring the garden closer</p>
          <h1 className="mt-3 font-display text-5xl tracking-[-0.055em] text-evergreen sm:text-7xl">
            {activeCategory ? categoryName : 'The collection'}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-text-muted sm:text-base">
            Flowers for now, seeds for later, and botanical fragrance to keep the
            feeling with you.
          </p>
        </div>
      </section>
      <div className="page-shell py-8 md:py-12">
        <form
          className="mb-6 flex items-center gap-3 rounded-control border border-border bg-surface p-2 pl-4"
          role="search"
          aria-label="Search the collection"
          onSubmit={(event) => {
            event.preventDefault();
            updateParams({ search: searchValue.trim() });
          }}
        >
          <Search className="shrink-0 text-text-muted" size={18} aria-hidden="true" />
          <label className="sr-only" htmlFor="catalog-search">
            Search products
          </label>
          <input
            id="catalog-search"
            className="min-h-11 min-w-0 flex-1 bg-transparent text-sm"
            type="search"
            maxLength={100}
            placeholder="Search the collection"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
          <button className="button-secondary shrink-0" type="submit">
            Search
          </button>
        </form>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              ref={filterButtonRef}
              className="button-secondary md:hidden"
              type="button"
              aria-expanded={mobileFiltersOpen}
              aria-controls="catalog-filter-drawer"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              Filters{appliedFilters.length > 0 ? ` (${appliedFilters.length})` : ''}
            </button>
            <p
              className="text-sm text-text-muted"
              aria-live="polite"
              aria-atomic="true"
            >
              {pagination
                ? `${pagination.total} ${pagination.total === 1 ? 'piece' : 'pieces'}`
                : products.error
                  ? 'Collection unavailable'
                  : 'Gathering pieces…'}
            </p>
          </div>
          <label className="flex min-w-0 items-center gap-2 text-sm text-text-muted">
            Sort
            <select
              className="min-h-11 min-w-0 rounded-control border border-border bg-surface px-2 text-sm text-text"
              value={requestParams.sort ?? 'featured'}
              onChange={(event) => updateParams({ sort: event.target.value })}
              aria-label="Sort products"
            >
              {sortOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {appliedFilters.length > 0 && (
          <div
            className="mb-6 flex flex-wrap items-center gap-2"
            aria-label="Applied filters"
          >
            {appliedFilters.map(({ key, label }) => (
              <button
                key={key}
                className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-control border border-border bg-brand-soft px-3 text-left text-xs text-text"
                type="button"
                aria-label={`Remove ${label} filter`}
                onClick={() => updateParams({ [key]: '' })}
              >
                <span className="min-w-0 break-words">{label}</span>
                <X className="shrink-0" size={14} aria-hidden="true" />
              </button>
            ))}
            <button
              className="text-link min-h-11 px-2"
              type="button"
              onClick={clearFilters}
            >
              Clear all
            </button>
          </div>
        )}
        <div className="grid gap-8 md:grid-cols-[190px_minmax(0,1fr)] lg:gap-12">
          <aside className="hidden md:block" aria-label="Catalog filters">
            {filterPanel}
          </aside>
          <section className="min-w-0" aria-label="Products">
            <p className="mb-4 min-h-5 text-xs text-text-muted" role="status">
              {products.isPlaceholderData
                ? 'Updating the collection…'
                : products.data
                  ? products.isFetching
                    ? 'Updating availability…'
                    : 'Availability refreshes every 30 seconds while you browse.'
                  : ''}
            </p>
            {products.isPending && <ProductGridSkeleton count={9} />}
            {products.error &&
              (products.data ? (
                <div
                  className="mb-5 rounded-control border border-border bg-surface-muted p-4 text-sm text-text-muted"
                  role="status"
                >
                  <p>
                    Availability could not be refreshed. Showing the last checked stock.
                  </p>
                  <button
                    className="text-link min-h-11"
                    type="button"
                    onClick={() => products.refetch()}
                  >
                    Retry stock check
                  </button>
                </div>
              ) : (
                <InlineError error={products.error} onRetry={products.refetch} />
              ))}
            {products.data?.data.length === 0 && (
              <div className="rounded-card border border-border bg-surface px-6 py-14 text-center">
                <Flower2
                  className="mx-auto text-clay"
                  size={32}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="mt-4 font-display text-3xl text-evergreen">
                  Nothing blooming here yet
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-text-muted">
                  {pagination.page > 1
                    ? 'There are no pieces on this page. Return to the first page to keep browsing.'
                    : appliedFilters.length
                      ? 'Try a broader search or clear the filters to see the full collection.'
                      : 'New pieces are on their way. Check back soon.'}
                </p>
                {pagination.page > 1 ? (
                  <button
                    className="button-secondary mt-6"
                    type="button"
                    onClick={() => updateParams({ page: 1 })}
                  >
                    Back to first page
                  </button>
                ) : (
                  appliedFilters.length > 0 && (
                    <button
                      className="button-secondary mt-6"
                      type="button"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  )
                )}
              </div>
            )}
            {products.data && products.data.data.length > 0 && (
              <>
                <div className="product-grid" aria-busy={products.isPlaceholderData}>
                  {products.data.data.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isUpdating={products.isFetching}
                    />
                  ))}
                </div>
                {pagination.totalPages > 1 && (
                  <nav
                    className="mt-10 flex flex-wrap items-center justify-center gap-2"
                    aria-label="Pagination"
                  >
                    <button
                      className="pagination-button"
                      type="button"
                      disabled={
                        !pagination.hasPreviousPage || products.isPlaceholderData
                      }
                      onClick={() => updateParams({ page: pagination.page - 1 })}
                    >
                      Previous
                    </button>
                    <span className="px-2 text-xs text-text-muted" aria-current="page">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      className="pagination-button"
                      type="button"
                      disabled={!pagination.hasNextPage || products.isPlaceholderData}
                      onClick={() => updateParams({ page: pagination.page + 1 })}
                    >
                      Next
                    </button>
                  </nav>
                )}
              </>
            )}
          </section>
        </div>
      </div>
      <NavigationDrawer
        id="catalog-filter-drawer"
        label="catalog filters"
        title="Filters"
        side="right"
        open={mobileFiltersOpen}
        onClose={closeFilters}
        returnFocusRef={filterButtonRef}
        desktopBreakpoint={768}
      >
        <div className="space-y-6 p-5">
          {filterPanel}
          {appliedFilters.length > 0 && (
            <button
              className="button-secondary w-full"
              type="button"
              onClick={clearFilters}
            >
              Clear all filters
            </button>
          )}
          <button
            className="button-primary w-full"
            type="button"
            onClick={closeFilters}
          >
            View results
          </button>
        </div>
      </NavigationDrawer>
    </div>
  );
}
