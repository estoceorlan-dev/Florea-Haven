import {
  Archive,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  LoaderCircle,
  PackagePlus,
  Pencil,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ProductImage } from '../components/ProductImage.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { EmptyState, FeedbackBanner } from '../components/ui/PageState.jsx';
import { AdminListSkeleton } from '../components/ui/Skeleton.jsx';
import { adminCatalogApi } from '../services/api.js';
import { useInvalidateCatalog } from '../queries/useInvalidateCatalog.js';
import { formatCurrency } from '../utils/currency.js';

const blankProduct = (categories) => ({
  categoryId: categories[0]?.id ?? '',
  name: '',
  slug: '',
  sku: '',
  description: '',
  price: '',
  stockQuantity: '0',
  imageUrl: '',
  featured: false,
  isActive: true,
});

const productValues = (product, categories) =>
  product
    ? {
        categoryId: product.category.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        description: product.description,
        price: String(product.price),
        stockQuantity: String(product.stock_quantity),
        imageUrl: product.image_url ?? '',
        featured: product.featured,
        isActive: product.is_active,
      }
    : blankProduct(categories);

function ProductForm({ categories, product, onCancel, onSubmit }) {
  const [values, setValues] = useState(() => productValues(product, categories));
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const updateValue = (event) => {
    const { checked, name, type, value } = event.target;
    setValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');
    const price = Number(values.price);
    const stockQuantity = Number(values.stockQuantity);

    if (!Number.isFinite(price) || price < 0) {
      setFormError('Price must be zero or greater.');
      return;
    }
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      setFormError('Stock must be a whole number of zero or greater.');
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({
        categoryId: values.categoryId,
        name: values.name,
        slug: values.slug,
        sku: values.sku,
        description: values.description,
        price,
        stockQuantity,
        imageUrl: values.imageUrl,
        featured: values.featured,
        ...(product ? { isActive: values.isActive } : {}),
      });
      if (!product) setValues(blankProduct(categories));
    } catch {
      // The page-level alert contains the API error.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      className="rounded-card border border-border bg-surface p-6 shadow-low sm:p-7"
      onSubmit={submit}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-clay">
            {product ? 'Edit product' : 'New product'}
          </p>
          <h2 className="mt-2 font-display text-3xl text-evergreen">
            {product ? product.name : 'Add to the garden'}
          </h2>
        </div>
        {product && (
          <button
            className="icon-button -mr-2 -mt-2"
            type="button"
            aria-label="Cancel product editing"
            onClick={onCancel}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="form-field sm:col-span-2">
          Product name
          <input
            className="form-input"
            name="name"
            value={values.name}
            minLength={2}
            maxLength={120}
            required
            onChange={updateValue}
          />
        </label>
        <label className="form-field">
          SKU
          <input
            className="form-input uppercase"
            name="sku"
            value={values.sku}
            minLength={2}
            maxLength={50}
            pattern="[A-Za-z0-9][A-Za-z0-9._-]*"
            required
            onChange={updateValue}
          />
        </label>
        <label className="form-field">
          Category
          <select
            className="form-input"
            name="categoryId"
            value={values.categoryId}
            required
            onChange={updateValue}
          >
            <option value="" disabled>
              Select category
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field sm:col-span-2">
          Slug
          <input
            className="form-input"
            name="slug"
            value={values.slug}
            maxLength={60}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="Generated from the name"
            onChange={updateValue}
          />
        </label>
        <label className="form-field">
          Price (PHP)
          <input
            className="form-input"
            name="price"
            type="number"
            value={values.price}
            min="0"
            max="9999999.99"
            step="0.01"
            required
            onChange={updateValue}
          />
        </label>
        <label className="form-field">
          Stock quantity
          <input
            className="form-input"
            name="stockQuantity"
            type="number"
            value={values.stockQuantity}
            min="0"
            step="1"
            required
            onChange={updateValue}
          />
          <span className="form-hint">
            Use 0 when the item is temporarily unavailable.
          </span>
        </label>
        <label className="form-field sm:col-span-2">
          Image URL
          <span className="relative">
            <ImagePlus
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-leaf"
              size={17}
              aria-hidden="true"
            />
            <input
              className="form-input pl-10"
              name="imageUrl"
              type="url"
              value={values.imageUrl}
              maxLength={2048}
              placeholder="https://example.com/product.jpg"
              onChange={updateValue}
            />
          </span>
        </label>
        <label className="form-field sm:col-span-2">
          Description
          <textarea
            className="form-input min-h-32 resize-y"
            name="description"
            value={values.description}
            maxLength={5000}
            required
            onChange={updateValue}
          />
        </label>
        <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-evergreen">
          <input
            className="size-4 accent-clay"
            name="featured"
            type="checkbox"
            checked={values.featured}
            onChange={updateValue}
          />
          Feature on Home
        </label>
        {product && (
          <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-evergreen">
            <input
              className="size-4 accent-clay"
              name="isActive"
              type="checkbox"
              checked={values.isActive}
              onChange={updateValue}
            />
            Active and customer-visible
          </label>
        )}
      </div>

      {formError && (
        <p className="form-alert mt-5" role="alert">
          {formError}
        </p>
      )}

      <button className="button-primary mt-6 w-full" type="submit" disabled={isSaving}>
        {isSaving ? (
          <LoaderCircle className="animate-spin" size={15} aria-hidden="true" />
        ) : (
          <PackagePlus size={15} aria-hidden="true" />
        )}
        {isSaving
          ? product
            ? 'Saving product…'
            : 'Creating product…'
          : product
            ? 'Save product'
            : 'Create product'}
      </button>
    </form>
  );
}

export function AdminProductsPage() {
  const invalidateCatalog = useInvalidateCatalog();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [query, setQuery] = useState({
    search: '',
    category: '',
    status: 'all',
    sort: 'newest',
    page: 1,
  });
  const [searchText, setSearchText] = useState('');
  const [editing, setEditing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [pendingDeactivate, setPendingDeactivate] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const payload = await adminCatalogApi.getProducts({ ...query, limit: 12 });
      setProducts(payload.data);
      setPagination(payload.pagination);
      setError(null);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    adminCatalogApi
      .getCategories()
      .then((payload) => setCategories(payload.data))
      .catch(setError);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    adminCatalogApi
      .getProducts({ ...query, limit: 12 })
      .then((payload) => {
        if (!isCurrent) return;
        setProducts(payload.data);
        setPagination(payload.pagination);
        setError(null);
      })
      .catch((loadError) => {
        if (isCurrent) setError(loadError);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [query]);

  const setFilter = (field, value) => {
    setIsLoading(true);
    setQuery((current) => ({ ...current, [field]: value, page: 1 }));
  };

  const saveProduct = async (input) => {
    setNotice('');
    try {
      const payload = editing
        ? await adminCatalogApi.updateProduct(editing.id, input)
        : await adminCatalogApi.createProduct(input);
      void invalidateCatalog();
      setNotice(
        editing
          ? `${payload.data.name} was updated.`
          : `${payload.data.name} was created.`,
      );
      setEditing(null);
      await loadProducts();
    } catch (saveError) {
      setError(saveError);
      throw saveError;
    }
  };

  const deactivate = async () => {
    if (!pendingDeactivate) return;
    setNotice('');
    setIsDeactivating(true);
    try {
      await adminCatalogApi.deactivateProduct(pendingDeactivate.id);
      void invalidateCatalog();
      if (editing?.id === pendingDeactivate.id) setEditing(null);
      setNotice(`${pendingDeactivate.name} was deactivated.`);
      setPendingDeactivate(null);
      await loadProducts();
    } catch (deactivateError) {
      setError(deactivateError);
    } finally {
      setIsDeactivating(false);
    }
  };

  const restore = async (product) => {
    setNotice('');
    try {
      await adminCatalogApi.updateProduct(product.id, { isActive: true });
      void invalidateCatalog();
      setNotice(`${product.name} is active again.`);
      await loadProducts();
    } catch (restoreError) {
      setError(restoreError);
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-7">
        <div>
          <p className="eyebrow text-clay">Catalog operations</p>
          <h1 className="mt-2 font-display text-5xl tracking-[-0.045em] text-evergreen">
            Products & inventory
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
            Maintain customer listings, current prices, imagery, featured items, and
            available stock.
          </p>
        </div>
        <button
          className="button-primary"
          type="button"
          onClick={() => setEditing(null)}
        >
          <PackagePlus size={16} aria-hidden="true" />
          New product
        </button>
      </div>

      {notice && (
        <FeedbackBanner className="mt-6" onDismiss={() => setNotice('')}>
          {notice}
        </FeedbackBanner>
      )}
      {error && (
        <FeedbackBanner className="mt-6" tone="error" onDismiss={() => setError(null)}>
          {error.message}
        </FeedbackBanner>
      )}

      <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_27rem]">
        <div className="min-w-0">
          <form
            className="grid gap-3 rounded-card border border-border bg-surface p-4 shadow-low sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(8rem,auto))]"
            aria-label="Filter products"
            onSubmit={(event) => {
              event.preventDefault();
              setFilter('search', searchText.trim());
            }}
          >
            <label className="relative sm:col-span-2 lg:col-span-1">
              <span className="sr-only">Search products</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-leaf"
                size={17}
                aria-hidden="true"
              />
              <input
                className="form-input pl-10"
                type="search"
                value={searchText}
                placeholder="Search name or SKU"
                onChange={(event) => setSearchText(event.target.value)}
              />
            </label>
            <label>
              <span className="sr-only">Filter by category</span>
              <select
                className="form-input"
                value={query.category}
                onChange={(event) => setFilter('category', event.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by status</span>
              <select
                className="form-input"
                value={query.status}
                onChange={(event) => setFilter('status', event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Sort products</span>
              <select
                className="form-input"
                value={query.sort}
                onChange={(event) => setFilter('sort', event.target.value)}
              >
                <option value="newest">Newest</option>
                <option value="name-asc">Name A–Z</option>
                <option value="stock-asc">Lowest stock</option>
                <option value="stock-desc">Highest stock</option>
              </select>
            </label>
            <button
              className="button-secondary sm:col-span-2 lg:col-span-4"
              type="submit"
            >
              <Search size={15} aria-hidden="true" />
              Apply search
            </button>
          </form>

          <div className="mt-5 overflow-hidden rounded-card border border-border bg-surface shadow-low">
            {isLoading ? (
              <AdminListSkeleton label="Loading products" />
            ) : products.length === 0 ? (
              <EmptyState
                className="m-4"
                icon={PackagePlus}
                eyebrow="Catalog inventory"
                title="No matching products."
                description="Try changing the filters or create a new product for the catalog."
              />
            ) : (
              <div role="table" aria-label="Products and inventory">
                <div
                  className="hidden grid-cols-[minmax(14rem,1.5fr)_minmax(6rem,.65fr)_5rem_7rem_6rem] gap-4 bg-surface-muted px-5 py-3 text-[0.64rem] font-extrabold uppercase tracking-[0.12em] text-evergreen md:grid"
                  role="row"
                >
                  {['Product', 'Price', 'Stock', 'Status', 'Actions'].map((label) => (
                    <span key={label} role="columnheader">
                      {label}
                    </span>
                  ))}
                </div>
                <div className="divide-y divide-border">
                  {products.map((product) => (
                    <article
                      key={product.id}
                      className={`grid gap-4 p-5 md:grid-cols-[minmax(14rem,1.5fr)_minmax(6rem,.65fr)_5rem_7rem_6rem] md:items-center ${product.is_active ? '' : 'bg-surface-muted'}`}
                      role="row"
                    >
                      <div className="flex min-w-0 items-center gap-3" role="cell">
                        <ProductImage
                          className="size-14 shrink-0 rounded-control object-cover"
                          src={product.image_url}
                          alt=""
                        />
                        <div className="min-w-0">
                          <p className="break-words text-sm font-bold text-evergreen">
                            {product.name}
                          </p>
                          <p className="mt-1 break-words text-[0.68rem] text-text-muted">
                            {product.sku} · {product.category.name}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-text" role="cell">
                        <span className="mr-2 text-xs text-text-muted md:hidden">
                          Price
                        </span>
                        {formatCurrency(product.price)}
                      </p>
                      <p className="text-sm font-bold text-evergreen" role="cell">
                        <span className="mr-2 text-xs font-normal text-text-muted md:hidden">
                          Stock
                        </span>
                        {product.stock_quantity}
                      </p>
                      <div role="cell">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.08em] ${product.is_active ? 'bg-brand-soft text-success' : 'bg-surface text-danger'}`}
                        >
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex gap-2 md:justify-end" role="cell">
                        <button
                          className="icon-button border border-border"
                          type="button"
                          aria-label={`Edit ${product.name}`}
                          onClick={() => setEditing(product)}
                        >
                          <Pencil size={15} aria-hidden="true" />
                        </button>
                        {product.is_active ? (
                          <button
                            className="icon-button border border-border text-danger"
                            type="button"
                            aria-label={`Deactivate ${product.name}`}
                            onClick={() => setPendingDeactivate(product)}
                          >
                            <Archive size={15} aria-hidden="true" />
                          </button>
                        ) : (
                          <button
                            className="icon-button border border-border"
                            type="button"
                            aria-label={`Restore ${product.name}`}
                            onClick={() => restore(product)}
                          >
                            <RotateCcw size={15} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>

          {pagination && (
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-xs text-text-muted">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total}{' '}
                products
              </p>
              <div className="flex gap-2">
                <button
                  className="pagination-button"
                  type="button"
                  aria-label="Previous product page"
                  disabled={!pagination.hasPreviousPage}
                  onClick={() =>
                    setQuery((current) => ({ ...current, page: current.page - 1 }))
                  }
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <button
                  className="pagination-button"
                  type="button"
                  aria-label="Next product page"
                  disabled={!pagination.hasNextPage}
                  onClick={() =>
                    setQuery((current) => ({ ...current, page: current.page + 1 }))
                  }
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="xl:sticky xl:top-44">
          {categories.length > 0 ? (
            <ProductForm
              key={editing?.id ?? `new-product-${categories[0].id}`}
              categories={categories}
              product={editing}
              onCancel={() => setEditing(null)}
              onSubmit={saveProduct}
            />
          ) : (
            <div className="rounded-card border border-border bg-surface p-7 text-sm leading-6 text-text-muted shadow-low">
              Create a category before adding products.
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(pendingDeactivate)}
        title={pendingDeactivate ? `Deactivate “${pendingDeactivate.name}”?` : ''}
        description="The product will disappear from the customer catalog while remaining in historical orders. You can restore it later."
        confirmLabel="Deactivate product"
        isConfirming={isDeactivating}
        onClose={() => setPendingDeactivate(null)}
        onConfirm={deactivate}
      />
    </section>
  );
}
