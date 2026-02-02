import React from 'react';
import { useToast, Toast as ToastType } from '../contexts/ToastContext';
import { useLanguage } from '../App';

const Toast: React.FC = () => {
  const { toasts, removeToast } = useToast();
  const { lang } = useLanguage();

  if (toasts.length === 0) return null;

  const positionStyle = lang === 'ar' ? { left: '1.5rem' } : { right: '1.5rem' };

  return (
    <div className="fixed top-24 z-[1000] flex flex-col gap-3 pointer-events-none" style={positionStyle}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} lang={lang} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastType; onClose: () => void; lang: string }> = ({ toast, onClose, lang }) => {
  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300';
      default:
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300';
    }
  };

  const getIconStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-emerald-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-amber-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-red-500 text-white';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'error';
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-xl border animate-in slide-in-from-top-10 duration-500 pointer-events-auto ${getToastStyles()}`}
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${getIconStyles()}`}>
        <span className="material-symbols-outlined text-sm">{getIcon()}</span>
      </div>
      <span className="font-bold text-base flex-1">{toast.message}</span>
      <button
        onClick={onClose}
        className="ml-4 opacity-50 hover:opacity-100 transition-opacity shrink-0"
        aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
      >
        <span className="material-symbols-outlined text-xl">close</span>
      </button>
    </div>
  );
};

export default Toast;
