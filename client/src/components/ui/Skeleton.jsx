export function Skeleton({ className = '' }) {
  return <span className={`skeleton block ${className}`} aria-hidden="true" />;
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface shadow-low">
      <Skeleton className="aspect-[4/5] w-full" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-2 w-20 rounded-control" />
            <Skeleton className="mt-3 h-6 w-4/5 rounded-control" />
          </div>
          <Skeleton className="h-4 w-16 rounded-control" />
        </div>
        <Skeleton className="mt-4 h-7 w-24 rounded-control" />
        <Skeleton className="mt-4 h-5 w-20 rounded-control" />
      </div>
    </div>
  );
}

export function CategoryCardSkeleton() {
  return <Skeleton className="aspect-[4/5] w-full rounded-card" />;
}
