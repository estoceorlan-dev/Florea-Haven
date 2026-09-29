import { SlidersHorizontal } from 'lucide-react';
import { SelectMenu } from './SelectMenu.jsx';

export function SortSelect(props) {
  return (
    <div className="flex min-w-0 max-w-full items-center gap-3 font-sans">
      <span className="shrink-0 text-xs font-medium text-text-muted" aria-hidden="true">
        Sort by
      </span>
      <SelectMenu {...props} label="Sort products" icon={SlidersHorizontal} />
    </div>
  );
}
