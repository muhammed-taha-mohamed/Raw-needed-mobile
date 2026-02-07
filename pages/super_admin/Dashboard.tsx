import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import GeminiInsights from '../../components/GeminiInsights';
import RecentNotifications from '../../components/RecentNotifications';
import { useNavigate } from 'react-router-dom';

interface SubscriptionSummary {
  totalSubscriptions: number;
  activeSubscriptions: number;
  pendingSubscriptions: number;
  subscriptionsThisMonth: number;
}

interface UserStats {
  totalUsers: number;
  totalSuppliers: number;
  totalCustomers: number;
}

interface AdSubscriptionStats {
  totalAdSubscriptions: number;
  activeAdSubscriptions: number;
  pendingAdSubscriptions: number;
}

interface HistoricalSub {
  id: string;
  userId: string;
  planName: string;
  userName: string;
  finalPrice: number;
  status: string;
  submissionDate: string;
  expiryDate: string;
}

const Dashboard: React.FC = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();

  const [subscriptionSummary, setSubscriptionSummary] = useState<SubscriptionSummary | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loadingUserStats, setLoadingUserStats] = useState(true);

  const [adStats, setAdStats] = useState<AdSubscriptionStats | null>(null);
  const [loadingAdStats, setLoadingAdStats] = useState(true);

  const [historicalSubscriptions, setHistoricalSubscriptions] = useState<HistoricalSub[]>([]);
  const [loadingHistorical, setLoadingHistorical] = useState(true);

  useEffect(() => {
    api.get<SubscriptionSummary>('/api/v1/admin/dashboard/subscription-summary')
      .then(setSubscriptionSummary)
      .catch(() => setSubscriptionSummary(null))
      .finally(() => setLoadingSubscription(false));
  }, []);

  useEffect(() => {
    api.get<UserStats>('/api/v1/admin/dashboard/user-stats')
      .then(setUserStats)
      .catch(() => setUserStats(null))
      .finally(() => setLoadingUserStats(false));
  }, []);

  useEffect(() => {
    api.get<AdSubscriptionStats>('/api/v1/admin/dashboard/ad-subscription-stats')
      .then(setAdStats)
      .catch(() => setAdStats(null))
      .finally(() => setLoadingAdStats(false));
  }, []);

  useEffect(() => {
    api.get<HistoricalSub[]>('/api/v1/admin/dashboard/historical-subscriptions')
      .then((data) => setHistoricalSubscriptions(Array.isArray(data) ? data : []))
      .catch(() => setHistoricalSubscriptions([]))
      .finally(() => setLoadingHistorical(false));
  }, []);

  return (
    <div className="mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-6 flex flex-col gap-8 font-display animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 1) كروت الاشتراكات الأربعة أولاً - من API منفصل */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loadingSubscription ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl bg-slate-200 dark:bg-slate-700 h-36 animate-pulse" />
            ))}
          </>
        ) : (
          <>
            <div
              className="bg-gradient-to-br from-primary to-accent rounded-xl p-6 text-white shadow-xl shadow-primary/20 cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() => navigate('/plans')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-lg bg-white/10 backdrop-blur-md p-3">
                  <span className="material-symbols-outlined text-2xl">subscriptions</span>
                </div>
              </div>
              <h3 className="text-2xl font-black mb-1 tabular-nums">{subscriptionSummary?.totalSubscriptions ?? 0}</h3>
              <p className="text-sm font-bold text-white/80">{lang === 'ar' ? 'إجمالي الاشتراكات' : 'Total Subscriptions'}</p>
            </div>
            <div
              className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-xl shadow-emerald-500/20 cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() => navigate('/plans')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-lg bg-white/10 backdrop-blur-md p-3">
                  <span className="material-symbols-outlined text-2xl">check_circle</span>
                </div>
              </div>
              <h3 className="text-2xl font-black mb-1 tabular-nums">{subscriptionSummary?.activeSubscriptions ?? 0}</h3>
              <p className="text-sm font-bold text-white/80">{lang === 'ar' ? 'اشتراكات نشطة' : 'Active Subscriptions'}</p>
            </div>
            <div
              className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 text-white shadow-xl shadow-amber-500/20 cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() => navigate('/plans')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-lg bg-white/10 backdrop-blur-md p-3">
                  <span className="material-symbols-outlined text-2xl">pending_actions</span>
                </div>
              </div>
              <h3 className="text-2xl font-black mb-1 tabular-nums">{subscriptionSummary?.pendingSubscriptions ?? 0}</h3>
              <p className="text-sm font-bold text-white/80">{lang === 'ar' ? 'في الانتظار' : 'Pending Subscriptions'}</p>
            </div>
            <div
              className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white shadow-xl shadow-purple-500/20 cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() => navigate('/plans')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-lg bg-white/10 backdrop-blur-md p-3">
                  <span className="material-symbols-outlined text-2xl">calendar_month</span>
                </div>
              </div>
              <h3 className="text-2xl font-black mb-1 tabular-nums">{subscriptionSummary?.subscriptionsThisMonth ?? 0}</h3>
              <p className="text-sm font-bold text-white/80">{lang === 'ar' ? 'هذا الشهر' : 'This Month'}</p>
            </div>
          </>
        )}
      </div>

      {/* 2) كروت المستخدمين + إعلانات - من APIs منفصلة */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-8">
        {loadingUserStats ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl bg-slate-200 dark:bg-slate-700 h-28 animate-pulse" />
          ))
        ) : (
          <>
            <div className="rounded-xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-xl hover:border-primary/20" onClick={() => navigate('/users')}>
              <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-2 text-indigo-600 dark:text-indigo-400 w-fit mb-3">
                <span className="material-symbols-outlined text-xl">people</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{userStats?.totalUsers ?? 0}</h3>
              <p className="text-[10px] font-black text-slate-400 tracking-widest mt-1">{lang === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}</p>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-xl hover:border-primary/20" onClick={() => navigate('/users')}>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-2 text-blue-600 dark:text-blue-400 w-fit mb-3">
                <span className="material-symbols-outlined text-xl">store</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{userStats?.totalSuppliers ?? 0}</h3>
              <p className="text-[10px] font-black text-slate-400 tracking-widest mt-1">{lang === 'ar' ? 'الموردين' : 'Suppliers'}</p>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-xl hover:border-primary/20" onClick={() => navigate('/users')}>
              <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-2 text-purple-600 dark:text-purple-400 w-fit mb-3">
                <span className="material-symbols-outlined text-xl">person</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{userStats?.totalCustomers ?? 0}</h3>
              <p className="text-[10px] font-black text-slate-400 tracking-widest mt-1">{lang === 'ar' ? 'العملاء' : 'Customers'}</p>
            </div>
            {loadingAdStats ? (
              <div className="rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
            ) : (
              <div className="rounded-xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-xl hover:border-primary/20" onClick={() => navigate('/ad-packages')}>
                <div className="rounded-lg bg-teal-50 dark:bg-teal-900/20 p-2 text-teal-600 dark:text-teal-400 w-fit mb-3">
                  <span className="material-symbols-outlined text-xl">campaign</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{adStats?.activeAdSubscriptions ?? 0}</h3>
                <p className="text-[10px] font-black text-slate-400 tracking-widest mt-1">{lang === 'ar' ? 'إعلانات نشطة' : 'Active Ads'}</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 mb-8">
        <RecentNotifications />
      </div>

      {/* 3) جدول الاشتراكات السابقة - من API منفصل */}
      {loadingHistorical ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-8 h-64 animate-pulse" />
      ) : historicalSubscriptions.length > 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
              {lang === 'ar' ? 'الاشتراكات السابقة' : 'Historical Subscriptions'}
            </h3>
            <p className="text-xs text-slate-400 font-bold">
              {lang === 'ar' ? 'الاشتراكات القديمة عند تجديد المستخدمين' : 'Old subscriptions when users renew'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{lang === 'ar' ? 'المستخدم' : 'User'}</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{lang === 'ar' ? 'الباقة' : 'Plan'}</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{lang === 'ar' ? 'السعر' : 'Price'}</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{lang === 'ar' ? 'تاريخ الطلب' : 'Request Date'}</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {historicalSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-black text-slate-900 dark:text-white">{sub.userName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{sub.planName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-black text-primary">{sub.finalPrice} EGP</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-black ${
                          sub.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                            : sub.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        }`}
                      >
                        {sub.status === 'APPROVED' ? (lang === 'ar' ? 'معتمد' : 'Approved') : sub.status === 'PENDING' ? (lang === 'ar' ? 'قيد المراجعة' : 'Pending') : (lang === 'ar' ? 'مرفوض' : 'Rejected')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                        {sub.submissionDate ? new Date(sub.submissionDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                        {sub.expiryDate ? new Date(sub.expiryDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8">
        <GeminiInsights />
      </div>
    </div>
  );
};

export default Dashboard;
