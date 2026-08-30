import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../utils/currency.js';
import { ProductImage } from './ProductImage.jsx';

export function ProductCard({ product }) {
  return (
    <article className="product-card group">
      <Link
        className="relative block aspect-[4/5] overflow-hidden bg-sage"
        to={`/products/${product.id}`}
        aria-label={`View ${product.name}`}
      >
        <ProductImage
          className="size-full object-cover transition duration-700 ease-out group-hover:scale-[1.035]"
          src={product.image_url}
          alt={product.name}
        />
        {product.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-ivory/95 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-evergreen shadow-sm">
            Haven favorite
          </span>
        )}
        <span className="absolute bottom-3 right-3 grid size-10 translate-y-2 place-items-center rounded-full bg-evergreen text-white opacity-0 shadow-lg transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <ArrowUpRight size={17} aria-hidden="true" />
        </span>
      </Link>
      <div className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.64rem] font-bold uppercase tracking-[0.17em] text-clay">
              {product.category.name}
            </p>
            <h3 className="mt-1 font-display text-xl leading-tight tracking-[-0.025em] sm:text-[1.35rem]">
              <Link className="hover:text-evergreen" to={`/products/${product.id}`}>
                {product.name}
              </Link>
            </h3>
          </div>
          <p className="shrink-0 text-sm font-semibold text-evergreen">
            {formatCurrency(product.price)}
          </p>
        </div>
      </div>
    </article>
  );
}
