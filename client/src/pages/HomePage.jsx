import { ArrowRight, Flower2, Leaf, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InlineError } from '../components/InlineError.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { ProductGridSkeleton } from '../components/ProductGridSkeleton.jsx';
import { CategoryGridSkeleton } from '../components/ui/Skeleton.jsx';
import { useCategoriesQuery } from '../queries/useCategoriesQuery.js';
import { useProductsQuery } from '../queries/useProductsQuery.js';

const categoryDetails = {
  flowers: {
    number: '01',
    label: 'Gathered with care',
    image:
      'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1000&q=85',
  },
  seeds: {
    number: '02',
    label: 'For what comes next',
    image:
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1000&q=85',
  },
  perfumes: {
    number: '03',
    label: 'A garden, remembered',
    image:
      'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1000&q=85',
  },
};

export function HomePage() {
  const categories = useCategoriesQuery();
  const featuredProducts = useProductsQuery({ featured: true, limit: 4 });

  return (
    <>
      <section className="relative min-h-[calc(100svh-108px)] overflow-hidden bg-sage">
        <div className="absolute inset-y-0 right-0 w-full md:w-[57%]">
          <img
            className="size-full object-cover object-center"
            src="https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1800&q=90"
            alt="A romantic arrangement of pale garden flowers"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-sage via-sage/40 to-transparent md:from-sage/80" />
          <div className="absolute inset-0 bg-evergreen/15 md:bg-transparent" />
        </div>

        <div className="page-shell relative z-10 flex min-h-[calc(100svh-108px)] items-end pb-16 pt-24 sm:items-center sm:pb-20 md:py-24">
          <div className="max-w-2xl">
            <p className="eyebrow mb-5 text-evergreen">Flowers · Seeds · Fragrance</p>
            <h1 className="font-display text-[clamp(3.6rem,8vw,7.75rem)] leading-[0.84] tracking-[-0.065em] text-evergreen">
              Let beauty
              <span className="block font-normal italic text-clay">take root.</span>
            </h1>
            <p className="mt-7 max-w-md text-base leading-7 text-evergreen/75 sm:text-lg sm:leading-8">
              Garden-made gestures and botanical rituals, chosen to bring a little more
              softness into every day.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link className="button-primary" to="/products">
                Explore the collection
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="button-quiet" to="/products?category=flowers">
                Shop fresh flowers
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 right-6 z-10 hidden items-center gap-3 text-xs uppercase tracking-[0.16em] text-white/90 md:flex">
          <span className="h-px w-12 bg-white/70" />
          Thoughtfully selected in Manila
        </div>
      </section>

      <section className="page-shell py-20 md:py-28">
        <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end md:mb-14">
          <div>
            <p className="eyebrow text-clay">Find your kind of beautiful</p>
            <h2 className="section-title mt-3">Three ways to grow</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-text-muted">
            From the first seed to the final note of fragrance, each piece is selected
            to feel personal and quietly special.
          </p>
        </div>

        {categories.isPending && <CategoryGridSkeleton />}

        {categories.error && (
          <InlineError error={categories.error} onRetry={categories.refetch} />
        )}

        {categories.data && (
          <div className="grid gap-5 md:grid-cols-3">
            {categories.data.data.map((category) => {
              const details = categoryDetails[category.slug];
              return (
                <Link
                  className="category-card group"
                  key={category.id}
                  to={`/products?category=${category.slug}`}
                >
                  <img
                    className="size-full object-cover transition duration-700 group-hover:scale-105"
                    src={details.image}
                    alt=""
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-image-overlay/90 via-image-overlay/5 to-transparent" />
                  <span className="absolute left-5 top-5 grid size-9 place-items-center rounded-full border border-white/40 text-xs text-white">
                    {details.number}
                  </span>
                  <span className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                    <span className="text-[0.64rem] font-bold uppercase tracking-[0.18em] text-blush">
                      {details.label}
                    </span>
                    <span className="mt-1 flex items-end justify-between gap-4">
                      <span className="font-display text-4xl tracking-[-0.04em]">
                        {category.name}
                      </span>
                      <ArrowRight
                        className="mb-1 transition group-hover:translate-x-1"
                        size={20}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="mt-2 block text-xs text-white/65">
                      {category.product_count} pieces
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-surface py-20 md:py-28">
        <div className="page-shell">
          <div className="mb-10 flex items-end justify-between gap-4 md:mb-14">
            <div>
              <p className="eyebrow text-clay">From our garden</p>
              <h2 className="section-title mt-3">Haven favorites</h2>
            </div>
            <Link className="text-link hidden sm:inline-flex" to="/products">
              View the full collection
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          {featuredProducts.isPending && (
            <ProductGridSkeleton count={4} className="featured-grid" />
          )}
          {featuredProducts.error && (
            <InlineError
              error={featuredProducts.error}
              onRetry={featuredProducts.refetch}
            />
          )}
          {featuredProducts.data && (
            <div className="product-grid featured-grid">
              {featuredProducts.data.data.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isUpdating={featuredProducts.isFetching}
                />
              ))}
            </div>
          )}

          <Link className="button-secondary mt-10 w-full sm:hidden" to="/products">
            View the full collection
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="page-shell py-20 md:py-28">
        <div className="grid overflow-hidden rounded-card border border-border bg-surface-muted shadow-low md:grid-cols-2">
          <div className="relative min-h-[360px]">
            <img
              className="absolute inset-0 size-full object-cover"
              src="https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1400&q=85"
              alt="Green leaves growing in warm natural light"
              loading="lazy"
            />
          </div>
          <div className="flex items-center px-8 py-14 sm:px-12 md:px-16 md:py-20">
            <div>
              <p className="eyebrow text-clay">The Floréa promise</p>
              <h2 className="mt-4 max-w-md font-display text-4xl leading-[1.02] tracking-[-0.045em] text-evergreen sm:text-5xl">
                Chosen for the way it makes a day feel.
              </h2>
              <p className="mt-6 max-w-md text-sm leading-7 text-text-muted">
                We look for lasting flowers, generous seeds, and fragrances that unfold
                gently. Everything in the Haven earns its place through beauty,
                character, and care.
              </p>
              <div className="mt-9 grid gap-5 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
                {[
                  [Flower2, 'Season-led'],
                  [Leaf, 'Botanical'],
                  [Sparkles, 'Small-batch'],
                ].map(([Icon, label]) => (
                  <div className="flex items-center gap-2.5" key={label}>
                    <Icon size={17} strokeWidth={1.5} aria-hidden="true" />
                    <span className="text-xs font-bold uppercase tracking-[0.12em]">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
