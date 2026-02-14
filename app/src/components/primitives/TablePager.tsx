interface TablePagerProps {
  page: number;
  totalPages: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPrev: () => void;
  onNext: () => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function TablePager({
  page,
  totalPages,
  pageSize = 25,
  pageSizeOptions = [10, 25, 50],
  onPrev,
  onNext,
  onPageSizeChange,
}: TablePagerProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <button
        type="button"
        className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-primary disabled:opacity-50"
        onClick={onPrev}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        Previous
      </button>

      <span className="text-xs text-text-secondary">
        Page {page} of {Math.max(1, totalPages)}
      </span>

      <div className="flex items-center gap-2">
        {onPageSizeChange ? (
          <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
            <span>Rows</span>
            <select
              aria-label="Page size"
              value={String(pageSize)}
              className="rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-xs text-text-primary"
              onChange={event => onPageSizeChange(Number(event.currentTarget.value))}
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={String(size)}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <button
          type="button"
          className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-primary disabled:opacity-50"
          onClick={onNext}
          disabled={page >= Math.max(1, totalPages)}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </div>
  );
}
