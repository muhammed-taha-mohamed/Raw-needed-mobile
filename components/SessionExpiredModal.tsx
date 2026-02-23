import React from 'react';

interface SessionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
}

const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({ isOpen, onClose, lang }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">lock</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {lang === 'ar' ? 'انتهت جلستك' : 'Session Expired'}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-6">
            {lang === 'ar' 
              ? 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى للمتابعة.' 
              : 'Your session has expired. Please log in again to continue.'}
          </p>

          {/* Close/Logout Button */}
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-primary text-white font-black text-sm shadow-lg hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">close</span>
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredModal;
