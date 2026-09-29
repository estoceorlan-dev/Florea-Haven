import { ArrowLeft, Leaf, PackageCheck, ShieldCheck } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { InlineError } from '../components/InlineError.jsx';
import { ProductPurchaseActions } from '../components/ProductPurchaseActions.jsx';
import { ProductImage } from '../components/ProductImage.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { StockIndicator } from '../components/ui/StockIndicator.jsx';
import { useProductQuery } from '../queries/useProductQuery.js';
import { formatCurrency } from '../utils/currency.js';

export function ProductDetailsPage() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const product = useProductQuery(productId);

  if (product.isPending) {
    return (
      <div
        className="page-shell grid gap-10 py-10 md:grid-cols-2 md:py-16"
        role="status"
        aria-label="Loading product details"
        aria-busy="true"
      >
        <span className="sr-only">Loading product details</span>
        <Skeleton className="aspect-[4/5] rounded-card" />
        <div className="py-8">
          <Skeleton className="h-3 w-24 rounded-control" />
          <Skeleton className="mt-5 h-14 w-4/5 rounded-control" />
          <Skeleton className="mt-7 h-5 w-28 rounded-control" />
          <Skeleton className="mt-10 h-24 rounded-card" />
          <Skeleton className="mt-8 h-12 w-full rounded-control" />
        </div>
      </div>
    );
  }

  if (product.error && (!product.data || product.error.status === 404)) {
    return (
      <div className="page-shell py-24">
        <InlineError error={product.error} onRetry={product.refetch} />
        <Link className="text-link mx-auto mt-7 w-fit" to="/products">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to the collection
        </Link>
      </div>
    );
  }

  const item = product.data.data;

  return (
    <div>
      <div className="page-shell py-7 md:py-10">
        <Link className="text-link w-fit text-[0.7rem]" to="/products">
          <ArrowLeft size={14} aria-hidden="true" />
          Back to the collection
        </Link>
      </div>

      <article className="page-shell grid gap-9 pb-20 md:grid-cols-[1.05fr_0.95fr] md:gap-16 md:pb-28 lg:gap-24">
        <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-brand-soft">
          <ProductImage
            className="size-full object-cover"
            src={item.image_url}
            alt={item.name}
            loading="eager"
          />
          {item.featured && (
            <span className="absolute left-5 top-5 rounded-full bg-ivory/95 px-3 py-1.5 text-[0.64rem] font-bold uppercase tracking-[0.15em] text-evergreen">
              Haven favorite
            </span>
          )}
        </div>

        <div className="flex min-w-0 items-center">
          <div className="w-full max-w-xl">
            <Link
              className="eyebrow text-clay hover:text-evergreen"
              to={`/products?category=${item.category.slug}`}
            >
              {item.category.name}
            </Link>
            <h1 className="mt-4 break-words font-display text-5xl leading-[0.96] tracking-[-0.055em] text-evergreen sm:text-6xl lg:text-7xl">
              {item.name}
            </h1>
            <p className="mt-6 text-xl font-semibold text-evergreen">
              {formatCurrency(item.price)}
            </p>
            <div className="mt-8 h-px bg-evergreen/12" />
            <p className="mt-8 text-base leading-8 text-ink/65">{item.description}</p>

            <StockIndicator
              className="mt-8"
              stockQuantity={item.stock_quantity}
              isUpdating={product.isFetching}
              lastUpdated={product.dataUpdatedAt}
            />
            {product.error && (
              <div className="mt-4 text-sm text-text-muted" role="status">
                <p>
                  Stock could not be refreshed. Showing the last checked availability.
                </p>
                <button
                  className="text-link min-h-11"
                  type="button"
                  onClick={() => product.refetch()}
                >
                  Retry stock check
                </button>
              </div>
            )}

            <div className="mt-9 rounded-card border border-border bg-surface p-5">
              <ProductPurchaseActions
                key={item.id}
                product={item}
                initialOpen={searchParams.get('buy') === '1'}
                initialQuantity={searchParams.get('quantity') ?? 1}
              />
              <p className="mt-3 text-center text-xs leading-5 text-text-muted">
                Buy this piece now, or save it to your cart for later.
              </p>
            </div>

            <div className="mt-9 grid gap-4 border-t border-evergreen/12 pt-7 sm:grid-cols-3">
              {[
                [Leaf, 'Botanical selection'],
                [PackageCheck, 'Careful packing'],
                [ShieldCheck, 'Quality checked'],
              ].map(([Icon, label]) => (
                <div className="flex items-center gap-2.5" key={label}>
                  <Icon size={17} strokeWidth={1.5} aria-hidden="true" />
                  <span className="text-xs font-semibold text-ink/65">{label}</span>
                </div>
              ))}
            </div>

            <p className="mt-8 text-[0.68rem] uppercase tracking-[0.14em] text-ink/40">
              Product code · {item.sku}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
