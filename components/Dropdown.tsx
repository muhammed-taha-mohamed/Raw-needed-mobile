import React, { useState, useEffect, useRef } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  triggerClassName?: string;
  panelMaxHeight?: string;
  isRtl?: boolean;
  id?: string;
  /** Optional: custom class for the wrapper (e.g. space-y-1) */
  wrapperClassName?: string;
  /** When false, no "clear" option is shown (for required selects) */
  showClear?: boolean;
  /** Optional: enable client-side search by option label */
  searchable?: boolean;
  searchPlaceholder?: string;
  noResultsText?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = '',
  label,
  disabled = false,
  triggerClassName,
  panelMaxHeight = 'max-h-[240px]',
  isRtl = false,
  id,
  wrapperClassName = '',
  showClear = true,
  searchable = false,
  searchPlaceholder = 'Search...',
  noResultsText = 'No results',
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const defaultTriggerClass = 'w-full min-h-[42px] flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-2.5 text-xs font-bold outline-none focus:border-primary transition-all text-slate-900 dark:text-white cursor-pointer text-start disabled:cursor-not-allowed disabled:opacity-30';
  const selectedLabel = value ? options.find((o) => o.value === value)?.label : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) setSearchQuery('');
  }, [open]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleOptions = !normalizedQuery
    ? options
    : options.filter((opt) => (opt.label || '').toLowerCase().includes(normalizedQuery));

  return (
    <div className={wrapperClassName || undefined} ref={ref}>
      {label && (
        <label htmlFor={id} className="text-[10px] font-black text-slate-500 px-1 block mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={id}
          onClick={() => !disabled && setOpen((o) => !o)}
          disabled={disabled}
          className={triggerClassName ?? defaultTriggerClass}
        >
          <span className="truncate pr-6 rtl:pl-6 rtl:pr-0">{selectedLabel ?? placeholder}</span>
          <span
            className={`material-symbols-outlined absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            expand_more
          </span>
        </button>
        {open && (
          <div
            className={`absolute top-full mt-1.5 z-[100] w-full min-w-[200px] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-2 custom-scrollbar animate-in fade-in duration-150 ${panelMaxHeight} ${isRtl ? 'right-0' : 'left-0'}`}
          >
            {searchable && (
              <div className="px-2 pb-2">
                <div className="relative">
                  <span className={`material-symbols-outlined absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400 text-[16px]`}>
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className={`w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-primary ${isRtl ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'}`}
                  />
                </div>
              </div>
            )}
            {showClear && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="w-full px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-start transition-colors first:rounded-t-xl"
              >
                {placeholder}
              </button>
            )}
            {visibleOptions.length > 0 ? (
              visibleOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className="w-full px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-start transition-colors"
                >
                  {opt.label}
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-[11px] font-bold text-slate-400">
                {noResultsText}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dropdown;
