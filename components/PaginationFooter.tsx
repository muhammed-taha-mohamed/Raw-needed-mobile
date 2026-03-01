import React from 'react';
import { useLanguage } from '../App';

interface PaginationFooterProps {
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Optional: current slice length (e.g. items.length) for "X–Y of Z" display */
  currentCount?: number;
  /** When true, renders as table footer: no top margin, border-top, no top rounded corners (use inside table card) */
  asTableFooter?: boolean;
}

const PaginationFooter: React.FC<PaginationFooterProps> = ({
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  currentCount,
  asTableFooter = false,
}) => {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  if (totalPages <= 0) return null;

  const startItem = totalElements === 0 ? 0 : currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalElements);

  const getPageNumbers = (): number[] => {
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }
    let start = Math.max(0, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible);
    if (end - start < maxVisible) start = Math.max(0, end - maxVisible);
    return Array.from({ length: end - start }, (_, i) => start + i);
  };

  const pageNumbers = getPageNumbers();

  return (
    <footer
      className={`w-full max-w-full animate-in fade-in duration-300 ${asTableFooter ? 'mt-0' : 'mt-6 sm:mt-8'}`}
      role="navigation"
      aria-label="Pagination"
    >
      <div className={`w-full flex flex-nowrap items-center justify-between gap-2 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-3 min-w-0 bg-slate-50 dark:bg-slate-800/50 ${asTableFooter ? 'border-t border-slate-200 dark:border-slate-700 rounded-none' : 'rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm'}`}>
        {/* Left: summary */}
        <p className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 tabular-nums shrink-0 min-w-0 truncate max-w-[28%] sm:max-w-none">
          {totalElements === 0 ? (
            <span>0 {isAr ? 'عنصر' : 'items'}</span>
          ) : (
            <span>
              {startItem}&ndash;{endItem} {isAr ? 'من' : 'of'}{' '}
              <span className="text-slate-800 dark:text-slate-200">{totalElements}</span>
            </span>
          )}
        </p>

        {/* Center: Prev + page numbers + Next */}
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
            aria-label={isAr ? 'الصفحة السابقة' : 'Previous page'}
            className="size-8 sm:size-9 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary hover:border-primary/30 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-lg rtl-flip">chevron_left</span>
          </button>
          {currentPage > 0 && totalPages > 5 && (
            <button
              type="button"
              onClick={() => onPageChange(0)}
              aria-label="First page"
              className="hidden sm:flex size-8 rounded-full items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary font-black text-[11px] transition-all"
            >
              1
            </button>
          )}
          {currentPage > 0 && totalPages > 5 && (
            <span className="hidden sm:inline text-slate-300 dark:text-slate-600 text-[10px] px-0.5">…</span>
          )}
          {pageNumbers.map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              aria-label={`Page ${pageNum + 1}`}
              aria-current={currentPage === pageNum ? 'page' : undefined}
              className={`size-8 sm:size-9 rounded-full font-black text-[11px] sm:text-xs transition-all flex-shrink-0 ${
                currentPage === pageNum
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary'
              }`}
            >
              {pageNum + 1}
            </button>
          ))}
          {currentPage < totalPages - 1 && totalPages > 5 && (
            <span className="hidden sm:inline text-slate-300 dark:text-slate-600 text-[10px] px-0.5">…</span>
          )}
          {currentPage < totalPages - 1 && totalPages > 5 && (
            <button
              type="button"
              onClick={() => onPageChange(totalPages - 1)}
              aria-label="Last page"
              className="hidden sm:flex size-8 rounded-full items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary font-black text-[11px] transition-all"
            >
              {totalPages}
            </button>
          )}
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            aria-label={isAr ? 'الصفحة التالية' : 'Next page'}
            className="size-8 sm:size-9 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary hover:border-primary/30 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-lg rtl-flip">chevron_right</span>
          </button>
        </div>

        {/* Right: page X / Y */}
        <p className="text-[11px] sm:text-xs font-black text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
          <span className="text-primary">{currentPage + 1}</span>
          <span className="text-slate-400 dark:text-slate-500"> / {totalPages}</span>
        </p>
      </div>
    </footer>
  );
};

export default PaginationFooter;
