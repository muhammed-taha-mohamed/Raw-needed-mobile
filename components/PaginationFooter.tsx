import React from 'react';

interface PaginationFooterProps {
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Optional: current slice length (e.g. items.length) for "X / total" display */
  currentCount?: number;
}

const PaginationFooter: React.FC<PaginationFooterProps> = ({
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  currentCount,
}) => {
  if (totalPages <= 0) return null;

  const displayCount = currentCount ?? Math.min(pageSize, totalElements - currentPage * pageSize);

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-slate-100 dark:border-slate-800 animate-in fade-in duration-500 mt-6 max-w-fit mx-auto sm:mx-0 sm:ml-auto rtl:sm:mr-auto">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="size-9 rounded-full border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
        >
          <span className="material-symbols-outlined text-base rtl-flip">chevron_left</span>
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
            let pageNum = i;
            if (totalPages > 5 && currentPage > 2) pageNum = Math.min(currentPage - 2 + i, totalPages - 1);
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`size-9 rounded-full font-black text-[12px] transition-all ${
                  currentPage === pageNum
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-400 hover:text-primary hover:bg-primary/5'
                }`}
              >
                {pageNum + 1}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className="size-9 rounded-full border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
        >
          <span className="material-symbols-outlined text-base rtl-flip">chevron_right</span>
        </button>
      </div>
      <div className="h-6 w-px bg-slate-100 dark:bg-slate-800 mx-1" />
      <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-full shrink-0">
        <span className="text-[11px] font-black text-slate-500 tabular-nums tracking-tighter">
          {displayCount} / {totalElements}
        </span>
      </div>
    </div>
  );
};

export default PaginationFooter;
