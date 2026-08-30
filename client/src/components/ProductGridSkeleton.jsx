export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div className="product-grid" aria-label="Loading products" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="animate-pulse">
          <div className="aspect-[4/5] rounded-[2px] bg-evergreen/10" />
          <div className="mt-4 h-2 w-20 rounded bg-evergreen/10" />
          <div className="mt-3 h-5 w-4/5 rounded bg-evergreen/10" />
        </div>
      ))}
    </div>
  );
}
