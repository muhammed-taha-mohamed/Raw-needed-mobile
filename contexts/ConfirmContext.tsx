import React, { createContext, useContext, useState, useCallback } from 'react';
import { useApp } from '../App';

type Variant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: Variant;
}

interface ContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ContextType | undefined>(undefined);

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lang } = useApp();
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolver: ((v: boolean) => void) | null;
  }>({ open: false, options: {}, resolver: null });

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, options, resolver: resolve });
    });
  }, []);

  const close = (result: boolean) => {
    state.resolver?.(result);
    setState((prev) => ({ ...prev, open: false, resolver: null }));
  };

  const v = state.options.variant || 'warning';
  const accent =
    v === 'danger' ? 'red' : v === 'success' ? 'emerald' : v === 'info' ? 'blue' : 'amber';
  const Icon = () => (
    <div className={`mx-auto size-16 rounded-full bg-${accent}-500 text-white flex items-center justify-center shadow-lg`}>
      <span className="material-symbols-outlined text-3xl">
        {v === 'danger' ? 'delete' : v === 'success' ? 'check' : v === 'info' ? 'info' : 'warning'}
      </span>
    </div>
  );

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-[1200] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
          <div className="relative w-full md:w-[90%] md:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-200">
            <div className="p-6 md:p-7 text-center space-y-4">
              <Icon />
              <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
                {state.options.title || (v === 'danger'
                  ? (lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete')
                  : v === 'success'
                  ? (lang === 'ar' ? 'تأكيد' : 'Confirm')
                  : v === 'info'
                  ? (lang === 'ar' ? 'تأكيد' : 'Confirm')
                  : (lang === 'ar' ? 'تأكيد' : 'Confirm'))}
              </h3>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {state.options.message || (lang === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?')}
              </p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => close(false)} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black">
                  {state.options.cancelText || (lang === 'ar' ? 'إلغاء' : 'Cancel')}
                </button>
                <button
                  onClick={() => close(true)}
                  className={`flex-1 py-3 rounded-2xl text-white font-black ${
                    accent === 'red'
                      ? 'bg-red-600 hover:bg-red-700'
                      : accent === 'emerald'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : accent === 'blue'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {state.options.confirmText || (lang === 'ar' ? 'تأكيد' : 'Confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

