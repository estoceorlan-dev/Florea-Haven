export function Skeleton({ className = '' }) {
  return <span className={`skeleton block ${className}`} aria-hidden="true" />;
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface shadow-low">
      <Skeleton className="m-2 mb-0 aspect-square rounded-[1.1rem]" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-2 w-20 rounded-control" />
            <Skeleton className="mt-3 h-6 w-4/5 rounded-control" />
          </div>
          <Skeleton className="h-4 w-16 rounded-control" />
        </div>
        <Skeleton className="mt-4 h-7 w-24 rounded-control" />
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_3rem] gap-2">
          <Skeleton className="h-12 rounded-full" />
          <Skeleton className="size-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function CategoryCardSkeleton() {
  return <Skeleton className="aspect-[4/5] w-full rounded-card" />;
}

export function LoadingRegion({ label, children, className = '' }) {
  return (
    <div className={className} role="status" aria-label={label} aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function CategoryGridSkeleton() {
  return (
    <LoadingRegion label="Loading collections" className="grid gap-5 md:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <CategoryCardSkeleton key={item} />
      ))}
    </LoadingRegion>
  );
}

export function AdminListSkeleton({ label = 'Loading records', rows = 5 }) {
  return (
    <LoadingRegion label={label} className="space-y-3 p-4 sm:p-5">
      {Array.from({ length: rows }, (_, item) => (
        <div
          className="grid gap-3 rounded-control border border-border bg-surface p-4 sm:grid-cols-[1.3fr_1fr_8rem] sm:items-center"
          key={item}
        >
          <div>
            <Skeleton className="h-4 w-2/3 rounded-control" />
            <Skeleton className="mt-2 h-3 w-1/2 rounded-control" />
          </div>
          <Skeleton className="h-4 w-3/4 rounded-control" />
          <Skeleton className="h-10 w-full rounded-control" />
        </div>
      ))}
    </LoadingRegion>
  );
}

export function AdminDetailSkeleton() {
  return (
    <LoadingRegion label="Loading order details" className="space-y-6 py-3">
      <Skeleton className="h-4 w-28 rounded-control" />
      <Skeleton className="h-14 w-3/4 max-w-xl rounded-control" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-72 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    </LoadingRegion>
  );
}

export function CartSkeleton() {
  return (
    <LoadingRegion label="Loading cart" className="page-shell py-14 sm:py-20">
      <Skeleton className="h-3 w-24 rounded-control" />
      <Skeleton className="mt-4 h-14 w-56 max-w-full rounded-control" />
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        <div className="space-y-4">
          {[0, 1].map((item) => (
            <div
              className="grid grid-cols-[80px_1fr] gap-4 rounded-card border border-border bg-surface p-4 sm:grid-cols-[112px_1fr]"
              key={item}
            >
              <Skeleton className="aspect-[4/5] rounded-control" />
              <div className="py-1">
                <Skeleton className="h-3 w-20 rounded-control" />
                <Skeleton className="mt-3 h-7 w-3/4 rounded-control" />
                <Skeleton className="mt-4 h-7 w-44 max-w-full rounded-control" />
                <Skeleton className="mt-4 h-11 w-32 rounded-control" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-72 rounded-card" />
      </div>
    </LoadingRegion>
  );
}

export function CheckoutSkeleton() {
  return (
    <LoadingRegion label="Loading checkout" className="page-shell py-14 sm:py-20">
      <Skeleton className="h-4 w-28 rounded-control" />
      <Skeleton className="mt-8 h-14 w-80 max-w-full rounded-control" />
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        <div className="grid gap-5 rounded-card border border-border bg-surface p-5 sm:grid-cols-2 sm:p-7">
          {[0, 1, 2, 3, 4, 5, 6].map((field) => (
            <div className={field < 4 ? 'sm:col-span-2' : ''} key={field}>
              <Skeleton className="h-3 w-24 rounded-control" />
              <Skeleton className="mt-2 h-12 w-full rounded-control" />
            </div>
          ))}
        </div>
        <Skeleton className="h-96 rounded-card" />
      </div>
    </LoadingRegion>
  );
}

export function OrderSkeleton({ confirmation = false }) {
  return (
    <LoadingRegion label="Loading order details" className="page-shell py-14 sm:py-20">
      {confirmation && <Skeleton className="mx-auto size-16 rounded-full" />}
      <Skeleton
        className={`${confirmation ? 'mx-auto mt-6' : ''} h-12 w-72 max-w-full rounded-control`}
      />
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-32 rounded-card" />
        </div>
        <Skeleton className="h-80 rounded-card" />
      </div>
    </LoadingRegion>
  );
}

export function OrderListSkeleton() {
  return (
    <LoadingRegion label="Loading order history" className="page-shell py-14 sm:py-20">
      <Skeleton className="h-3 w-24 rounded-control" />
      <Skeleton className="mt-4 h-14 w-64 max-w-full rounded-control" />
      <div className="mt-10 space-y-4">
        {[0, 1, 2].map((item) => (
          <Skeleton className="h-36 rounded-card" key={item} />
        ))}
      </div>
    </LoadingRegion>
  );
}
