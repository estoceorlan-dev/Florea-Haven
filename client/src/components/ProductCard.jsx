import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../utils/currency.js';
import { ProductPurchaseActions } from './ProductPurchaseActions.jsx';
import { ProductImage } from './ProductImage.jsx';
import { StockIndicator } from './ui/StockIndicator.jsx';

export function ProductCard({ product, isUpdating = false }) {
  return (
    <article className="product-card group">
      <Link
        className="relative m-2 mb-0 block aspect-square overflow-hidden rounded-[1.1rem] bg-brand-soft"
        to={`/products/${product.id}`}
        aria-label={`View ${product.name}`}
      >
        <ProductImage
          className="size-full object-cover transition duration-500 ease-out motion-safe:group-hover:scale-[1.035] motion-safe:group-focus-within:scale-[1.035]"
          src={product.image_url}
          alt={product.name}
        />
        {product.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-ivory/95 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-evergreen shadow-sm">
            Haven favorite
          </span>
        )}
        <span className="absolute bottom-3 right-3 grid size-10 translate-y-2 place-items-center rounded-full bg-evergreen text-canvas opacity-0 shadow-lg transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <ArrowUpRight size={17} aria-hidden="true" />
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="min-w-0">
          <div className="min-w-0 break-words">
            <p className="text-[0.64rem] font-bold uppercase tracking-[0.17em] text-clay">
              {product.category.name}
            </p>
            <h3 className="mt-2 font-display text-xl leading-snug tracking-[-0.025em] sm:text-[1.35rem]">
              <Link className="hover:text-evergreen" to={`/products/${product.id}`}>
                {product.name}
              </Link>
            </h3>
          </div>
          <p className="mt-3 text-lg font-semibold tracking-tight text-brand-strong">
            {formatCurrency(product.price)}
          </p>
        </div>
        <StockIndicator
          className="mb-5 mt-3 self-start"
          stockQuantity={product.stock_quantity}
          isUpdating={isUpdating}
        />
        <div className="mt-auto border-t border-border/70 pt-4">
          <ProductPurchaseActions product={product} />
        </div>
      </div>
    </article>
  );
}
