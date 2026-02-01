import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useLanguage } from '../../App';
import AdSlider from '../../components/AdSlider';
import GeminiInsights from '../../components/GeminiInsights';
import RecentNotifications from '../../components/RecentNotifications';
import Dropdown from '../../components/Dropdown';

const Dashboard: React.FC = () => {
  const { lang, t } = useLanguage();
  const [chartPeriod, setChartPeriod] = useState('7');
  
  const revenueData = [
    { name: lang === 'ar' ? 'إثن' : 'Mon', value: 3200 },
    { name: lang === 'ar' ? 'ثلا' : 'Tue', value: 4500 },
    { name: lang === 'ar' ? 'أرب' : 'Wed', value: 3900 },
    { name: lang === 'ar' ? 'خمي' : 'Thu', value: 5200 },
    { name: lang === 'ar' ? 'جمع' : 'Fri', value: 4800 },
    { name: lang === 'ar' ? 'سبت' : 'Sat', value: 6100 },
    { name: lang === 'ar' ? 'أحد' : 'Sun', value: 5500 },
  ];

  const dashboardStats = {
    activeSubscriptions: 1240,
    pendingApprovals: 12,
    totalRevenue: 45200,
    newUsers: 85,
    growth: 12
  };

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-6 flex justify-end">
        <button className="flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-800 px-6 py-2.5 text-[11px] font-black    tracking-widest text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 transition-all active:scale-95">
          <span className="material-symbols-outlined text-lg">download</span>
          {t.dashboard.export}
        </button>
      </div>

      <div className="mb-8">
         <AdSlider />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[
          { label: t.dashboard.activeSubs, value: dashboardStats.activeSubscriptions, icon: 'subscriptions', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t.dashboard.pendingApprovals, value: dashboardStats.pendingApprovals, icon: 'pending_actions', color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: t.dashboard.totalRevenue, value: `${dashboardStats.totalRevenue.toLocaleString()} ${t.plans.currency}`, icon: 'payments', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: t.dashboard.newUsers, value: `+${dashboardStats.newUsers}`, icon: 'person_add', color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((stat, i) => (
          <div key={i} className="rounded-[2rem] bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:border-primary/20 group">
            <div className="flex items-center justify-between mb-4">
              <div className={`rounded-xl ${stat.bg} p-2.5 ${stat.color} shadow-inner transition-transform group-hover:scale-110`}>
                <span className="material-symbols-outlined text-2xl">{stat.icon}</span>
              </div>
              <span className="text-[10px] font-black text-emerald-500 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                <span className="material-symbols-outlined text-xs">trending_up</span>
                {dashboardStats.growth}%
              </span>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stat.value}</h3>
              <p className="text-[11px] font-black text-slate-400    tracking-widest mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 mb-8">
        <div className="lg:col-span-2 rounded-[2.5rem] bg-white dark:bg-slate-900 p-8 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="mb-8 flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 dark:text-white    tracking-wider">{t.dashboard.revenueGrowth}</h3>
            <Dropdown options={[{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }]} value={chartPeriod} onChange={setChartPeriod} placeholder="Last 7 days" showClear={false} isRtl={lang === 'ar'} triggerClassName="min-h-[36px] flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl text-[10px] font-black text-slate-500 outline-none border border-transparent focus:border-primary/20 cursor-pointer pl-4 pr-8 rtl:pl-8 rtl:pr-4" />
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#009aa7" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#009aa7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                <Tooltip 
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: '#0f172a', color: '#fff'}}
                  itemStyle={{fontWeight: 900, color: '#009aa7'}}
                  labelStyle={{color: '#94a3b8', fontSize: '10px', textTransform: '  ', marginBottom: '4px'}}
                />
                <Area type="monotone" dataKey="value" stroke="#009aa7" fillOpacity={1} fill="url(#colorValue)" strokeWidth={4} animationDuration={2000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <RecentNotifications />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <GeminiInsights />
      </div>
    </div>
  );
};

export default Dashboard;