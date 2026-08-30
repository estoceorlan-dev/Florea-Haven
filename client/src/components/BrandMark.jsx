export function BrandMark({ compact = false }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-evergreen">
      <span
        aria-hidden="true"
        className="grid size-9 place-items-center rounded-full border border-evergreen/20 bg-sage/50"
      >
        <span className="brand-sprout">F</span>
      </span>
      {!compact && (
        <span className="font-display text-[1.65rem] leading-none tracking-[-0.035em]">
          Floréa <i className="font-normal text-clay">Haven</i>
        </span>
      )}
    </span>
  );
}
