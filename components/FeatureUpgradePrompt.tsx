import React from 'react';
import { APP_LOGO } from '../constants';

interface FeatureUpgradePromptProps {
  lang: 'ar' | 'en';
  title?: string;
  description?: string;
  featureLabel?: string;
  actionLabel?: string;
  onUpgrade?: () => void;
  className?: string;
}

const FeatureUpgradePrompt: React.FC<FeatureUpgradePromptProps> = ({
  lang,
  title,
  description,
  featureLabel,
  actionLabel,
  onUpgrade,
  className = '',
}) => {
  const defaultTitle = lang === 'ar' ? 'الميزة غير متاحة في باقتك الحالية' : 'This feature is not in your current plan';
  const defaultDescription = lang === 'ar'
    ? 'للوصول إلى هذه الميزة، قم بترقية الباقة من صفحة الاشتراك.'
    : 'Upgrade your subscription from the plans page to unlock this feature.';

  return (
    <div className={`w-full py-6 animate-in fade-in duration-500 ${className}`}>
      <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-white via-primary/[0.03] to-primary/[0.08] dark:from-slate-900 dark:via-slate-900 dark:to-primary/10 p-6 md:p-8">
        <div className="absolute -top-14 -right-14 size-44 rounded-full bg-primary/10 blur-2xl animate-pulse" />
        <div className="absolute -bottom-16 -left-16 size-48 rounded-full bg-primary/10 blur-2xl animate-pulse" />

        <div className="relative flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative size-24 rounded-full bg-white dark:bg-slate-800 border border-primary/20 shadow-xl flex items-center justify-center">
              <img src={APP_LOGO} alt="RAW Needed" className="size-14 object-contain" />
            </div>
            <div className="absolute -bottom-1 -right-1 size-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[16px]">lock</span>
            </div>
          </div>

          {featureLabel && (
            <div className="mb-3 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs md:text-sm font-black">
              {lang === 'ar' ? `ميزة: ${featureLabel}` : `Feature: ${featureLabel}`}
            </div>
          )}

          <h3 className="text-base md:text-2xl font-black text-slate-900 dark:text-white">
            {title || defaultTitle}
          </h3>
          <p className="mt-2 max-w-2xl text-xs md:text-base font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
            {description || defaultDescription}
          </p>

          {onUpgrade && (
            <button
              type="button"
              onClick={onUpgrade}
              className="mt-6 inline-flex items-center gap-2 px-5 md:px-7 h-11 rounded-xl bg-primary text-white text-xs md:text-sm font-black shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              {actionLabel || (lang === 'ar' ? 'ترقية الباقة الآن' : 'Upgrade Plan Now')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeatureUpgradePrompt;
