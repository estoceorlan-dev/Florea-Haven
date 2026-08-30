import { ArrowLeft, Leaf, PackageCheck, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { InlineError } from '../components/InlineError.jsx';
import { AddToCartButton } from '../components/AddToCartButton.jsx';
import { ProductImage } from '../components/ProductImage.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { catalogApi } from '../services/api.js';
import { formatCurrency } from '../utils/currency.js';

export function ProductDetailsPage() {
  const { productId } = useParams();
  const product = useAsync(() => catalogApi.getProduct(productId), [productId]);

  if (product.isLoading) {
    return (
      <div className="page-shell grid animate-pulse gap-10 py-10 md:grid-cols-2 md:py-16">
        <div className="aspect-[4/5] bg-evergreen/10" />
        <div className="py-8">
          <div className="h-3 w-24 rounded bg-evergreen/10" />
          <div className="mt-5 h-14 w-4/5 rounded bg-evergreen/10" />
          <div className="mt-7 h-5 w-28 rounded bg-evergreen/10" />
          <div className="mt-10 h-24 rounded bg-evergreen/10" />
        </div>
      </div>
    );
  }

  if (product.error) {
    return (
      <div className="page-shell py-24">
        <InlineError error={product.error} onRetry={product.retry} />
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
        <div className="relative aspect-[4/5] overflow-hidden bg-sage">
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

        <div className="flex items-center">
          <div className="w-full max-w-xl">
            <Link
              className="eyebrow text-clay hover:text-evergreen"
              to={`/products?category=${item.category.slug}`}
            >
              {item.category.name}
            </Link>
            <h1 className="mt-4 font-display text-5xl leading-[0.96] tracking-[-0.055em] text-evergreen sm:text-6xl lg:text-7xl">
              {item.name}
            </h1>
            <p className="mt-6 text-xl font-semibold text-evergreen">
              {formatCurrency(item.price)}
            </p>
            <div className="mt-8 h-px bg-evergreen/12" />
            <p className="mt-8 text-base leading-8 text-ink/65">{item.description}</p>

            <div className="mt-8 flex items-center gap-2 text-sm text-evergreen">
              <span className="size-2 rounded-full bg-leaf" />
              {item.stock_quantity > 5
                ? 'In stock and ready to be prepared'
                : `Only ${item.stock_quantity} left in the Haven`}
            </div>

            <div className="mt-9 border border-evergreen/15 bg-white p-5">
              <AddToCartButton product={item} className="button-primary w-full" />
              <p className="mt-3 text-center text-xs leading-5 text-ink/50">
                Your cart is saved securely to your account. Checkout arrives in Phase
                5.
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
