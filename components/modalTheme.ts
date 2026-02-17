export const MODAL_OVERLAY_BASE_CLASS =
  'flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300';

export const MODAL_PANEL_BASE_CLASS =
  'w-full md:w-[90%] bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-xl shadow-2xl border-t border-x md:border border-primary/20 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 flex flex-col max-h-[90vh]';

export const MODAL_INPUT_CLASS =
  'w-full px-4 py-3.5 rounded-2xl border-2 border-primary/20 bg-slate-50/50 dark:bg-slate-800/50 text-sm md:text-base font-bold placeholder:text-xs md:placeholder:text-sm placeholder:font-medium focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all shadow-inner text-slate-900 dark:text-white';

export const MODAL_TEXTAREA_CLASS =
  `${MODAL_INPUT_CLASS} min-h-[110px]`;

export const MODAL_DROPDOWN_TRIGGER_CLASS =
  'w-full min-h-[44px] px-4 py-3 rounded-2xl border-2 border-primary/20 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-bold focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all shadow-inner text-slate-900 dark:text-white cursor-pointer text-start';
