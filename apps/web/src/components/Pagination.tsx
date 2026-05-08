export interface PaginationProps {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}

export function Pagination({ page, totalPages, onPage }: PaginationProps) {
  const safeTotal = Math.max(1, totalPages);
  return (
    <nav className="flex items-center justify-between text-sm" aria-label="Catalog pagination">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-slate-600">
        Page {page} of {safeTotal}
      </span>
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= safeTotal}
        className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-50"
      >
        Next
      </button>
    </nav>
  );
}
