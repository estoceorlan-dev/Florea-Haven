import { ProductCardSkeleton } from './ui/Skeleton.jsx';

export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div
      className="product-grid"
      role="status"
      aria-label="Loading products"
      aria-busy="true"
    >
      <span className="sr-only">Loading products</span>
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
