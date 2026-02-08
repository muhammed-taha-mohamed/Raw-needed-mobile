import React from 'react';
import { useApp } from '../App';

interface EmptyStateProps {
  /** Override default "No data" / "مفيش بيانات" */
  title?: string;
  /** Optional subtitle below the title */
  subtitle?: string;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, subtitle, className = '' }) => {
  const { t } = useApp();
  const displayTitle = title ?? t.common.noData;
  const displaySubtitle = subtitle !== undefined ? subtitle : (title === undefined ? t.common.noDataSubtitle : '');

  return (
    <div className={`flex flex-col items-center justify-center py-16 md:py-24 px-4 animate-in fade-in duration-500 ${className}`}>
      <style>{`
        @keyframes empty-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(1.02); }
        }
        @keyframes empty-x-pulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
        .empty-state-icon {
          animation: empty-float 3s ease-in-out infinite;
        }
        .empty-state-x {
          animation: empty-x-pulse 2s ease-in-out infinite;
        }
      `}</style>

      <div className="relative empty-state-icon mb-8">
        {/* Document with lines + magnifying glass with X - app colors (primary, slate) */}
        <svg
          width="160"
          height="120"
          viewBox="0 0 160 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-lg"
        >
          {/* Soft background shapes */}
          <ellipse cx="80" cy="70" rx="55" ry="35" className="fill-primary/5 dark:fill-primary/10" />
          <circle cx="130" cy="35" r="25" className="fill-slate-100 dark:fill-slate-800/50" />

          {/* Document / paper */}
          <path
            d="M45 28 L45 92 Q45 98 51 98 L109 98 Q115 98 115 92 L115 28 Q115 22 109 22 L51 22 Q45 22 45 28 Z"
            className="fill-white dark:fill-slate-800 stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
          {/* Document lines */}
          <line x1="55" y1="38" x2="100" y2="38" className="stroke-slate-200 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round" />
          <line x1="55" y1="48" x2="95" y2="48" className="stroke-slate-200 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round" />
          <line x1="55" y1="58" x2="88" y2="58" className="stroke-slate-200 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round" />
          <line x1="55" y1="68" x2="92" y2="68" className="stroke-slate-200 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round" />

          {/* Magnifying glass circle */}
          <circle
            cx="98"
            cy="58"
            r="22"
            className="fill-white dark:fill-slate-800 stroke-primary dark:stroke-primary"
            strokeWidth="3"
          />
          {/* X inside magnifying glass */}
          <g className="empty-state-x">
            <line x1="90" y1="50" x2="106" y2="66" className="stroke-primary dark:stroke-primary" strokeWidth="3" strokeLinecap="round" />
            <line x1="106" y1="50" x2="90" y2="66" className="stroke-primary dark:stroke-primary" strokeWidth="3" strokeLinecap="round" />
          </g>
          {/* Magnifying glass handle */}
          <path
            d="M115 75 L130 92"
            className="stroke-primary dark:stroke-primary"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="text-center space-y-2 max-w-sm">
        <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">
          {displayTitle}
        </h3>
        {displaySubtitle && (
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            {displaySubtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
