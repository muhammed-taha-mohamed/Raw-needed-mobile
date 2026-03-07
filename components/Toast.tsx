import React, { useEffect } from 'react';
import { useToast, Toast as ToastType } from '../contexts/ToastContext';
import { useLanguage } from '../App';

const Toast: React.FC = () => {
  const { toasts, removeToast } = useToast();
  const { lang } = useLanguage();

  if (toasts.length === 0) return null;

  const isRtl = lang === 'ar';

  return (
    <div className={`fixed z-[1000] top-4 ${isRtl ? 'left-4' : 'right-4'} w-[92%] max-w-sm pointer-events-none`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex flex-col gap-3">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto animate-in slide-in-from-right fade-in duration-300">
            <SideToast toast={t} onClose={() => removeToast(t.id)} lang={lang} />
          </div>
        ))}
      </div>
    </div>
  );
};

const SideToast: React.FC<{ toast: ToastType; onClose: () => void; lang: string }> = ({ toast, onClose, lang }) => {
  const variants = {
    success: { accent: 'emerald', label: lang === 'ar' ? 'تم بنجاح' : 'Success' },
    error: { accent: 'red', label: lang === 'ar' ? 'خطأ' : 'Error' },
    warning: { accent: 'amber', label: lang === 'ar' ? 'تنبيه' : 'Warning' },
    info: { accent: 'blue', label: lang === 'ar' ? 'معلومة' : 'Info' },
  } as const;
  const v = (variants as any)[toast.type] || variants.success;

  useEffect(() => { }, [toast.id]);

  const AccentIcon = () => {
    if (toast.type === 'success') {
      return (
        <svg viewBox="0 0 120 120" className="w-6 h-6">
          <circle cx="60" cy="60" r="46" className="fill-emerald-600" />
          <path
            d="M40 62 L55 75 L82 45"
            fill="none"
            stroke="#fff"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="sa-check"
          />
        </svg>
      );
    }
    if (toast.type === 'error') {
      return (
        <svg viewBox="0 0 120 120" className="w-6 h-6">
          <circle cx="60" cy="60" r="46" className="fill-red-600" />
          <path d="M42 42 L78 78" stroke="#fff" strokeWidth="10" strokeLinecap="round" className="sa-cross" />
          <path d="M78 42 L42 78" stroke="#fff" strokeWidth="10" strokeLinecap="round" className="sa-cross" />
        </svg>
      );
    }
    if (toast.type === 'warning') {
      return (
        <svg viewBox="0 0 120 120" className="w-6 h-6">
          <circle cx="60" cy="60" r="46" className="fill-amber-600" />
          <path d="M60 35 V70" stroke="#fff" strokeWidth="10" strokeLinecap="round" className="sa-line" />
          <circle cx="60" cy="85" r="6" fill="#fff" className="sa-dot" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 120 120" className="w-6 h-6">
        <circle cx="60" cy="60" r="46" className="fill-blue-600" />
        <path d="M60 40 V65" stroke="#fff" strokeWidth="10" strokeLinecap="round" className="sa-line" />
        <circle cx="60" cy="80" r="6" fill="#fff" className="sa-dot" />
      </svg>
    );
  };

  return (
    <div className="relative rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className={`absolute inset-y-0 ${lang === 'ar' ? 'right-0' : 'left-0'} w-1.5 ${toast.type === 'success'
        ? 'bg-emerald-600'
        : toast.type === 'error'
          ? 'bg-red-600'
          : toast.type === 'warning'
            ? 'bg-amber-600'
            : 'bg-blue-600'
        }`} />
      <div className="p-4 pl-5 pr-4 flex items-start gap-3">
        <div className="shrink-0">
          <AccentIcon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h4 className="text-[13px] font-black text-slate-900 dark:text-white truncate">{toast.title || v.label}</h4>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
          <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
          {toast.actions && toast.actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {toast.actions.map((a, idx) => (
                <button
                  key={idx}
                  onClick={() => { try { a.onClick?.(); } finally { onClose(); } }}
                  className={`px-3 py-2 rounded-lg text-[11px] font-black shadow-sm active:scale-95 transition-all ${a.role === 'secondary'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      : toast.type === 'success'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : toast.type === 'error'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : toast.type === 'warning'
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Toast;
