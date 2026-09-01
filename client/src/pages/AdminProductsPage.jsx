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
import { adminCatalogApi } from '../services/api.js';
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
      className="border border-evergreen/10 bg-surface p-6 sm:p-7"
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
          Feature in the storefront
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
        {product ? 'Save product' : 'Create product'}
      </button>
    </form>
  );
}

export function AdminProductsPage() {
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

  const deactivate = async (product) => {
    const confirmed = window.confirm(
      `Deactivate “${product.name}”? It will disappear from the customer catalog but remain in order history.`,
    );
    if (!confirmed) return;

    setNotice('');
    try {
      await adminCatalogApi.deactivateProduct(product.id);
      if (editing?.id === product.id) setEditing(null);
      setNotice(`${product.name} was deactivated.`);
      await loadProducts();
    } catch (deactivateError) {
      setError(deactivateError);
    }
  };

  const restore = async (product) => {
    setNotice('');
    try {
      await adminCatalogApi.updateProduct(product.id, { isActive: true });
      setNotice(`${product.name} is active again.`);
      await loadProducts();
    } catch (restoreError) {
      setError(restoreError);
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-evergreen/10 pb-7">
        <div>
          <p className="eyebrow text-clay">Catalog operations</p>
          <h1 className="mt-2 font-display text-5xl tracking-[-0.045em] text-evergreen">
            Products & inventory
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/55">
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
        <p
          className="mt-6 border border-evergreen/15 bg-surface px-4 py-3 text-sm text-evergreen"
          role="status"
        >
          {notice}
        </p>
      )}
      {error && (
        <div
          className="form-alert mt-6 flex items-start justify-between gap-4"
          role="alert"
        >
          <span>{error.message}</span>
          <button
            type="button"
            className="text-link shrink-0"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_27rem]">
        <div className="min-w-0">
          <form
            className="grid gap-3 border border-evergreen/10 bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(8rem,auto))]"
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

          <div className="mt-5 overflow-hidden border border-evergreen/10 bg-surface">
            {isLoading ? (
              <div className="grid min-h-72 place-items-center" role="status">
                <LoaderCircle className="animate-spin text-leaf" aria-hidden="true" />
                <span className="sr-only">Loading products</span>
              </div>
            ) : products.length === 0 ? (
              <p className="p-10 text-center text-sm text-ink/55">
                No products match these filters.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead className="bg-sage/45 text-[0.64rem] font-extrabold uppercase tracking-[0.12em] text-evergreen">
                    <tr>
                      <th className="px-4 py-3" scope="col">
                        Product
                      </th>
                      <th className="px-4 py-3" scope="col">
                        Price
                      </th>
                      <th className="px-4 py-3" scope="col">
                        Stock
                      </th>
                      <th className="px-4 py-3" scope="col">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right" scope="col">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-evergreen/10">
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className={product.is_active ? '' : 'bg-mist/45'}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <ProductImage
                              className="size-12 shrink-0 object-cover"
                              src={product.image_url}
                              alt=""
                            />
                            <div>
                              <p className="text-sm font-bold text-evergreen">
                                {product.name}
                              </p>
                              <p className="mt-1 text-[0.68rem] text-ink/45">
                                {product.sku} · {product.category.name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-ink/70">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`text-sm font-bold ${product.stock_quantity === 0 ? 'text-clay' : 'text-evergreen'}`}
                          >
                            {product.stock_quantity}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.08em] ${
                              product.is_active
                                ? 'bg-sage text-evergreen'
                                : 'bg-blush text-clay'
                            }`}
                          >
                            {product.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              className="icon-button border border-evergreen/10"
                              type="button"
                              aria-label={`Edit ${product.name}`}
                              onClick={() => setEditing(product)}
                            >
                              <Pencil size={15} aria-hidden="true" />
                            </button>
                            {product.is_active ? (
                              <button
                                className="icon-button border border-clay/15 text-clay"
                                type="button"
                                aria-label={`Deactivate ${product.name}`}
                                onClick={() => deactivate(product)}
                              >
                                <Archive size={15} aria-hidden="true" />
                              </button>
                            ) : (
                              <button
                                className="icon-button border border-evergreen/10"
                                type="button"
                                aria-label={`Restore ${product.name}`}
                                onClick={() => restore(product)}
                              >
                                <RotateCcw size={15} aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {pagination && (
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-xs text-ink/50">
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
            <div className="border border-evergreen/10 bg-surface p-7 text-sm leading-6 text-ink/55">
              Create a category before adding products.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
