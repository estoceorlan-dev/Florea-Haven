import { useId, useState } from 'react';
import { Skeleton } from './ui/Skeleton.jsx';

export function CatalogFilters({
  categories,
  activeCategory,
  minPrice,
  maxPrice,
  onChange,
}) {
  const [minimum, setMinimum] = useState(minPrice);
  const [maximum, setMaximum] = useState(maxPrice);
  const [priceError, setPriceError] = useState('');
  const errorId = useId();
  const submitPrice = (event) => {
    event.preventDefault();
    if (minimum !== '' && maximum !== '' && Number(minimum) > Number(maximum)) {
      setPriceError('Minimum price must be no greater than maximum price.');
      return;
    }
    setPriceError('');
    onChange({ minPrice: minimum, maxPrice: maximum });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="filter-heading">Collection</h2>
        <div className="mt-3 flex flex-col items-start gap-1">
          <button
            className={`filter-option ${activeCategory === '' ? 'filter-option-active' : ''}`}
            type="button"
            aria-pressed={activeCategory === ''}
            onClick={() => onChange({ category: '' })}
          >
            All pieces
          </button>
          {categories.isPending && (
            <div
              className="w-full space-y-3 py-3"
              role="status"
              aria-label="Loading collections"
            >
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          )}
          {categories.data?.data.map((category) => (
            <button
              className={`filter-option text-left ${activeCategory === category.slug ? 'filter-option-active' : ''}`}
              key={category.id}
              type="button"
              aria-pressed={activeCategory === category.slug}
              onClick={() => onChange({ category: category.slug })}
            >
              <span className="min-w-0 break-words">{category.name}</span>{' '}
              <span className="filter-count">{category.product_count}</span>
            </button>
          ))}
          {categories.error && (
            <div className="mt-3 text-sm text-text-muted" role="status">
              <p>Collections could not be refreshed.</p>
              <button
                className="text-link min-h-11"
                type="button"
                onClick={() => categories.refetch()}
              >
                Retry collections
              </button>
            </div>
          )}
        </div>
      </div>
      <form className="border-t border-border/70 pt-5" onSubmit={submitPrice}>
        <h2 className="filter-heading">Price range</h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            ['Minimum price', 'Min', minimum, setMinimum],
            ['Maximum price', 'Max', maximum, setMaximum],
          ].map(([label, placeholder, value, setter]) => (
            <label className="min-w-0" key={label}>
              <span className="sr-only">{label}</span>
              <span className="price-input rounded-control">
                <span aria-hidden="true">₱</span>
                <input
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  type="number"
                  placeholder={placeholder}
                  value={value}
                  aria-invalid={Boolean(priceError)}
                  aria-describedby={priceError ? errorId : undefined}
                  onChange={(event) => {
                    setter(event.target.value);
                    setPriceError('');
                  }}
                />
              </span>
            </label>
          ))}
        </div>
        {priceError && (
          <p className="mt-2 text-xs text-danger" id={errorId} role="alert">
            {priceError}
          </p>
        )}
        <button className="button-primary mt-4 w-full" type="submit">
          Apply price
        </button>
      </form>
    </div>
  );
}
