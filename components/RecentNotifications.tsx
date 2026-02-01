
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../App';
import { api } from '../api';

interface Notification {
  id: string;
  type: string;
  titleEn: string;
  titleAr: string;
  messageEn: string;
  messageAr: string;
  read: boolean;
  createdAt: string;
}

interface PaginatedNotifications {
  content: Notification[];
  last: boolean;
  totalPages: number;
  totalElements: number;
}

const RecentNotifications: React.FC = () => {
  const { lang } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [isLast, setIsLast] = useState(true);

  useEffect(() => {
    fetchInitial();
  }, []);

  const fetchInitial = async () => {
    setLoading(true);
    try {
      const response = await api.get<PaginatedNotifications>(`/api/v1/notifications/all?page=0&size=10`);
      setNotifications(response.content || []);
      setIsLast(response.last);
      setPage(0);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || isLast) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await api.get<PaginatedNotifications>(`/api/v1/notifications/all?page=${nextPage}&size=10`);
      setNotifications(prev => [...prev, ...(response.content || [])]);
      setIsLast(response.last);
      setPage(nextPage);
    } catch (err) {
      console.error("Failed to load more notifications", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/api/v1/notifications/${id}/mark-read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      window.dispatchEvent(new CustomEvent('notificationRead'));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const formatNotifDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden h-[480px] flex flex-col group transition-all hover:border-primary/20 animate-in fade-in duration-500">
      <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-xl">campaign</span>
          </div>
          <h3 className="font-black text-slate-800 dark:text-white text-xs md:text-sm">
            {lang === 'ar' ? 'أحدث الأخبار والتنبيهات' : 'Latest News & Updates'}
          </h3>
        </div>
        <button 
          onClick={fetchInitial}
          className="size-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-400 hover:text-primary transition-all flex items-center justify-center border border-transparent hover:border-slate-100 shadow-sm active:rotate-180 duration-500"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
            <div className="size-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-[10px] font-black ">Fetching live feed...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
            <span className="material-symbols-outlined text-5xl mb-4 text-slate-300">notifications_off</span>
            <p className="text-xs font-bold text-slate-400">{lang === 'ar' ? 'لا توجد تحديثات جديدة' : 'No recent updates'}</p>
          </div>
        ) : (
          <>
            {notifications.map((n, idx) => (
              <div 
                key={n.id} 
                onClick={() => !n.read && markAsRead(n.id)}
                className={`group/item relative flex gap-3.5 p-4 rounded-2xl border transition-all duration-300 animate-in slide-in-from-bottom-2 cursor-pointer ${
                  !n.read 
                  ? 'bg-primary/5 border-primary/10 hover:bg-primary/10' 
                  : 'bg-slate-50/50 dark:bg-slate-800/30 border-transparent hover:bg-white dark:hover:bg-slate-800 hover:border-primary/10 shadow-sm'
                }`}
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  n.type.includes('ORDER') ? 'bg-blue-500/10 text-blue-600' : 'bg-primary/10 text-primary'
                }`}>
                  <span className="material-symbols-outlined text-xl">
                    {n.type.includes('ORDER') ? 'shopping_bag' : 'notifications'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[12px] font-black text-slate-800 dark:text-white leading-tight mb-1 truncate group-hover/item:text-primary transition-colors">
                    {lang === 'ar' ? n.titleAr : n.titleEn}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed line-clamp-2">
                    {lang === 'ar' ? n.messageAr : n.messageEn}
                  </p>
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[8px] font-black text-slate-500  tabular-nums">
                      {formatNotifDate(n.createdAt)}
                    </span>
                    {!n.read && (
                      <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {!isLast && (
              <div className="pt-2 pb-4">
                <button 
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-primary/20 text-primary hover:bg-primary/5 font-black text-[10px] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loadingMore ? (
                    <div className="size-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">expand_more</span>
                      {lang === 'ar' ? 'عرض المزيد' : 'View More'}
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 154, 167, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default RecentNotifications;
