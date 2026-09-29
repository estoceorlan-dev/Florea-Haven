export function BrandMark({ compact = false }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-evergreen sm:gap-2.5">
      <span
        aria-hidden="true"
        className={`${compact ? 'grid' : 'hidden min-[400px]:grid'} size-8 shrink-0 place-items-center rounded-full border border-evergreen/20 bg-sage/50 sm:size-9`}
      >
        <span className="brand-sprout">F</span>
      </span>
      {!compact && (
        <span className="whitespace-nowrap font-display text-[1.15rem] leading-none tracking-[-0.035em] sm:text-[1.65rem]">
          Floréa <i className="font-normal text-clay">Haven</i>
        </span>
      )}
    </span>
  );
}
