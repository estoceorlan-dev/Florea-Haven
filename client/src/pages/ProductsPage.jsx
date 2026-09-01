import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { InlineError } from '../components/InlineError.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { ProductGridSkeleton } from '../components/ProductGridSkeleton.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { catalogApi } from '../services/api.js';

const sortOptions = [
  ['featured', 'Featured'],
  ['newest', 'Newest'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['name-asc', 'Name: A–Z'],
];

const productParamsFromUrl = (searchParams) => ({
  search: searchParams.get('search') ?? '',
  category: searchParams.get('category') ?? '',
  minPrice: searchParams.get('minPrice') ?? '',
  maxPrice: searchParams.get('maxPrice') ?? '',
  sort: searchParams.get('sort') ?? 'featured',
  page: searchParams.get('page') ?? '1',
  limit: 9,
});

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.get('search') ?? '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') ?? '');
  const searchKey = searchParams.toString();
  const requestParams = useMemo(
    () => productParamsFromUrl(searchParams),
    // searchKey is the stable serialization of the URL filter state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchKey],
  );

  const categories = useAsync(() => catalogApi.getCategories(), []);
  const products = useAsync(() => catalogApi.getProducts(requestParams), [searchKey]);

  useEffect(() => {
    // Keep editable filter fields aligned with URL navigation (including the
    // header category links and browser back/forward actions).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchValue(searchParams.get('search') ?? '');
    setMinPrice(searchParams.get('minPrice') ?? '');
    setMaxPrice(searchParams.get('maxPrice') ?? '');
  }, [searchKey, searchParams]);

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) next.delete(key);
      else next.set(key, String(value));
    });

    if (!Object.prototype.hasOwnProperty.call(updates, 'page')) next.delete('page');
    setSearchParams(next);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    updateParams({ search: searchValue.trim() });
  };

  const submitPrice = (event) => {
    event.preventDefault();
    updateParams({ minPrice, maxPrice });
    setMobileFiltersOpen(false);
  };

  const clearFilters = () => {
    setSearchValue('');
    setMinPrice('');
    setMaxPrice('');
    setSearchParams({});
    setMobileFiltersOpen(false);
  };

  const activeCategory = searchParams.get('category') ?? '';
  const hasFilters = ['search', 'category', 'minPrice', 'maxPrice'].some((key) =>
    searchParams.has(key),
  );
  const catalogTitle = activeCategory
    ? (categories.data?.data.find((category) => category.slug === activeCategory)
        ?.name ?? 'Collection')
    : 'The collection';

  const filterPanel = (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="filter-heading">Collection</h2>
          {hasFilters && (
            <button
              className="text-link text-[0.68rem]"
              type="button"
              onClick={clearFilters}
            >
              Clear all
            </button>
          )}
        </div>
        <div className="mt-4 flex flex-col items-start gap-3">
          <button
            className={`filter-option ${activeCategory === '' ? 'filter-option-active' : ''}`}
            type="button"
            onClick={() => updateParams({ category: '' })}
          >
            All pieces
          </button>
          {categories.data?.data.map((category) => (
            <button
              className={`filter-option ${
                activeCategory === category.slug ? 'filter-option-active' : ''
              }`}
              key={category.id}
              type="button"
              onClick={() => updateParams({ category: category.slug })}
            >
              {category.name}
              <span className="ml-2 text-ink/35">{category.product_count}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submitPrice}>
        <h2 className="filter-heading">Price range</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label>
            <span className="sr-only">Minimum price</span>
            <span className="price-input">
              <span>₱</span>
              <input
                inputMode="numeric"
                min="0"
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
              />
            </span>
          </label>
          <label>
            <span className="sr-only">Maximum price</span>
            <span className="price-input">
              <span>₱</span>
              <input
                inputMode="numeric"
                min="0"
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
              />
            </span>
          </label>
        </div>
        <button className="button-secondary mt-3 w-full" type="submit">
          Apply price
        </button>
      </form>
    </div>
  );

  return (
    <div>
      <section className="border-b border-evergreen/10 bg-mist">
        <div className="page-shell py-14 text-center sm:py-20">
          <p className="eyebrow text-clay">Bring the garden closer</p>
          <h1 className="mt-3 font-display text-5xl tracking-[-0.055em] text-evergreen sm:text-7xl">
            {catalogTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-ink/60 sm:text-base">
            Flowers for now, seeds for later, and botanical fragrance to keep the
            feeling with you.
          </p>
        </div>
      </section>

      <div className="page-shell py-10 md:py-14">
        <form
          className="mb-8 flex items-center gap-3 border-b border-evergreen/25 pb-3 md:hidden"
          role="search"
          onSubmit={submitSearch}
        >
          <Search size={18} aria-hidden="true" />
          <label className="sr-only" htmlFor="mobile-catalog-search">
            Search products
          </label>
          <input
            id="mobile-catalog-search"
            className="min-w-0 flex-1 bg-transparent outline-none"
            placeholder="Search the collection"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
          <button className="text-link" type="submit">
            Search
          </button>
        </form>

        <div className="mb-8 flex items-center justify-between gap-4 border-b border-evergreen/10 pb-5">
          <div className="flex items-center gap-3">
            <button
              className="button-secondary md:hidden"
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <SlidersHorizontal size={15} aria-hidden="true" />
              Filters
            </button>
            <p className="hidden text-sm text-ink/55 sm:block" aria-live="polite">
              {products.data
                ? `${products.data.pagination.total} ${
                    products.data.pagination.total === 1 ? 'piece' : 'pieces'
                  }`
                : 'Gathering pieces…'}
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink/55">
            <span className="hidden sm:inline">Sort</span>
            <select
              className="bg-transparent py-2 text-sm font-normal normal-case tracking-normal text-ink outline-none"
              value={requestParams.sort}
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

        <div className="grid gap-10 md:grid-cols-[210px_1fr] lg:gap-16">
          <aside className="hidden md:block">
            <form
              className="mb-8 flex items-center gap-2 border-b border-evergreen/25 pb-2"
              role="search"
              onSubmit={submitSearch}
            >
              <Search size={16} aria-hidden="true" />
              <label className="sr-only" htmlFor="catalog-search">
                Search products
              </label>
              <input
                id="catalog-search"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
            </form>
            {filterPanel}
          </aside>

          <section aria-label="Products">
            {products.isLoading && <ProductGridSkeleton count={9} />}
            {products.error && (
              <InlineError error={products.error} onRetry={products.retry} />
            )}
            {products.data && products.data.data.length === 0 && (
              <div className="border border-evergreen/10 bg-surface px-6 py-16 text-center">
                <p className="font-display text-3xl text-evergreen">
                  Nothing blooming here yet
                </p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink/55">
                  Try a broader search or clear the filters to see the full collection.
                </p>
                <button
                  className="button-secondary mt-6"
                  type="button"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              </div>
            )}
            {products.data && products.data.data.length > 0 && (
              <>
                <div className="product-grid">
                  {products.data.data.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {products.data.pagination.totalPages > 1 && (
                  <nav
                    className="mt-14 flex items-center justify-center gap-2"
                    aria-label="Pagination"
                  >
                    <button
                      className="pagination-button"
                      type="button"
                      disabled={!products.data.pagination.hasPreviousPage}
                      onClick={() =>
                        updateParams({ page: products.data.pagination.page - 1 })
                      }
                    >
                      Previous
                    </button>
                    <span className="px-3 text-xs text-ink/50">
                      {products.data.pagination.page} /{' '}
                      {products.data.pagination.totalPages}
                    </span>
                    <button
                      className="pagination-button"
                      type="button"
                      disabled={!products.data.pagination.hasNextPage}
                      onClick={() =>
                        updateParams({ page: products.data.pagination.page + 1 })
                      }
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

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 bg-backdrop backdrop-blur-sm md:hidden">
          <div className="absolute inset-y-0 right-0 w-[min(88vw,380px)] overflow-y-auto bg-ivory px-6 py-6 shadow-2xl">
            <div className="mb-9 flex items-center justify-between">
              <p className="font-display text-3xl text-evergreen">Filters</p>
              <button
                className="icon-button"
                type="button"
                aria-label="Close filters"
                onClick={() => setMobileFiltersOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            {filterPanel}
          </div>
        </div>
      )}
    </div>
  );
}
