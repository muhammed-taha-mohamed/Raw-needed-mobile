import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, LineChart, Line, Legend
} from 'recharts';
import { useLanguage } from '../../App';
import { api } from '../../api';
import GeminiInsights from '../../components/GeminiInsights';
import RecentNotifications from '../../components/RecentNotifications';
import Dropdown from '../../components/Dropdown';
import { useNavigate } from 'react-router-dom';

interface MonthlyStat {
  month: string;
  orderCount: number;
  growthPercentage: number;
}

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  negotiatingOrders: number;
  underConfirmationOrders: number;
  sentOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  monthlyStats: MonthlyStat[];
  monthlyGrowthPercentage: number;
  ordersThisMonth: number;
  ordersLastMonth: number;
  totalOrderLines: number;
  pendingOrderLines: number;
  respondedOrderLines: number;
}

const Dashboard: React.FC = () => {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState('7');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<DashboardStats>('/api/v1/admin/dashboard/stats');
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch admin stats", err);
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = stats?.monthlyStats.map(s => {
    const monthParts = s.month.split(' ');
    const label = lang === 'ar' ? monthParts[0] : monthParts[0].substring(0, 3);
    return { 
      name: label, 
      orders: s.orderCount,
      growth: s.growthPercentage 
    };
  }) || [];

  const statusDistributionData = stats ? [
    { name: lang === 'ar' ? 'قيد المراجعة' : 'Pending', value: stats.pendingOrders || 0, color: '#f59e0b' },
    { name: lang === 'ar' ? 'قيد التفاوض' : 'Negotiating', value: stats.negotiatingOrders || 0, color: '#3b82f6' },
    { name: lang === 'ar' ? 'مكتملة' : 'Completed', value: stats.completedOrders || 0, color: '#10b981' },
    { name: lang === 'ar' ? 'ملغاة' : 'Cancelled', value: stats.cancelledOrders || 0, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  const orderLinesData = stats ? [
    { name: lang === 'ar' ? 'بانتظار الرد' : 'Pending', value: stats.pendingOrderLines || 0, color: '#f59e0b' },
    { name: lang === 'ar' ? 'تم الرد' : 'Responded', value: stats.respondedOrderLines || 0, color: '#10b981' },
  ].filter(d => d.value > 0) : [];

  const completionRate = stats && stats.totalOrders > 0 
    ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1) 
    : '0';
  
  const responseRate = stats && stats.totalOrderLines > 0 
    ? ((stats.respondedOrderLines / stats.totalOrderLines) * 100).toFixed(1) 
    : '0';

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-none mb-2">
            {lang === 'ar' ? 'لوحة تحكم المسؤول' : 'Admin Dashboard'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
            {lang === 'ar' ? 'نظرة شاملة على النظام' : 'System Overview'}
          </p>
        </div>
        <button 
          onClick={() => navigate('/analytics')}
          className="flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-800 px-6 py-2.5 text-[11px] font-black tracking-widest text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">analytics</span>
          {lang === 'ar' ? 'تحليلات متقدمة' : 'Advanced Analytics'}
        </button>
      </div>

      {/* Quick Stats Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="rounded-[2rem] bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
          <div className="rounded-[2rem] bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:border-primary/20 group cursor-pointer" onClick={() => navigate('/orders')}>
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-2.5 text-blue-600 dark:text-blue-400 shadow-inner transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-2xl">receipt_long</span>
              </div>
              {stats.monthlyGrowthPercentage > 0 && (
                <span className="text-[10px] font-black text-emerald-500 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-800">
                  <span className="material-symbols-outlined text-xs">trending_up</span>
                  {Math.abs(stats.monthlyGrowthPercentage).toFixed(0)}%
                </span>
              )}
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stats.totalOrders}</h3>
              <p className="text-[11px] font-black text-slate-400 tracking-widest mt-1">{lang === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}</p>
            </div>
          </div>
          <div className="rounded-[2rem] bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:border-primary/20 group cursor-pointer" onClick={() => navigate('/approvals')}>
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-2.5 text-amber-600 dark:text-amber-400 shadow-inner transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-2xl">pending_actions</span>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stats.pendingOrders}</h3>
              <p className="text-[11px] font-black text-slate-400 tracking-widest mt-1">{lang === 'ar' ? 'قيد المراجعة' : 'Pending'}</p>
            </div>
          </div>
          <div className="rounded-[2rem] bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:border-primary/20 group cursor-pointer" onClick={() => navigate('/orders')}>
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 p-2.5 text-purple-600 dark:text-purple-400 shadow-inner transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-2xl">handshake</span>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stats.negotiatingOrders}</h3>
              <p className="text-[11px] font-black text-slate-400 tracking-widest mt-1">{lang === 'ar' ? 'قيد التفاوض' : 'Negotiating'}</p>
            </div>
          </div>
          <div className="rounded-[2rem] bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:border-primary/20 group cursor-pointer" onClick={() => navigate('/orders')}>
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-2.5 text-emerald-600 dark:text-emerald-400 shadow-inner transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-2xl">task_alt</span>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stats.completedOrders}</h3>
              <p className="text-[11px] font-black text-slate-400 tracking-widest mt-1">{lang === 'ar' ? 'مكتملة' : 'Completed'}</p>
            </div>
          </div>
          <div className="rounded-[2rem] bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:border-primary/20 group cursor-pointer" onClick={() => navigate('/orders')}>
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-2.5 text-red-600 dark:text-red-400 shadow-inner transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-2xl">cancel</span>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stats.cancelledOrders}</h3>
              <p className="text-[11px] font-black text-slate-400 tracking-widest mt-1">{lang === 'ar' ? 'ملغاة' : 'Cancelled'}</p>
            </div>
          </div>
          <div className="rounded-[2rem] bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:border-primary/20 group cursor-pointer" onClick={() => navigate('/users')}>
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 p-2.5 text-indigo-600 dark:text-indigo-400 shadow-inner transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-2xl">receipt</span>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stats.totalOrderLines}</h3>
              <p className="text-[11px] font-black text-slate-400 tracking-widest mt-1">{lang === 'ar' ? 'بنود الطلبات' : 'Order Lines'}</p>
            </div>
          </div>
          <div className="rounded-[2rem] bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-cyan-50 dark:bg-cyan-900/20 p-2.5 text-cyan-600 dark:text-cyan-400 shadow-inner transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-2xl">pending_actions</span>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stats.pendingOrderLines}</h3>
              <p className="text-[11px] font-black text-slate-400 tracking-widest mt-1">{lang === 'ar' ? 'بانتظار الرد' : 'Awaiting'}</p>
            </div>
          </div>
          <div className="rounded-[2rem] bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-teal-50 dark:bg-teal-900/20 p-2.5 text-teal-600 dark:text-teal-400 shadow-inner transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-2xl">rate_review</span>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stats.respondedOrderLines}</h3>
              <p className="text-[11px] font-black text-slate-400 tracking-widest mt-1">{lang === 'ar' ? 'تم الرد' : 'Responded'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 mb-8">
        {isLoading ? (
          <div className="lg:col-span-2 rounded-[2.5rem] bg-white dark:bg-slate-900 p-8 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-pulse">
            <div className="h-80 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        ) : (
          <div className="lg:col-span-2 rounded-[2.5rem] bg-white dark:bg-slate-900 p-8 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-wider">{lang === 'ar' ? 'حجم الطلبات الشهري' : 'Monthly Order Volume'}</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">
                  {stats && stats.ordersThisMonth > 0 && stats.ordersLastMonth > 0 && (
                    <span className={stats.monthlyGrowthPercentage >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                      {stats.monthlyGrowthPercentage >= 0 ? '↑' : '↓'} {Math.abs(stats.monthlyGrowthPercentage).toFixed(1)}% {lang === 'ar' ? 'نمو' : 'growth'} {lang === 'ar' ? 'هذا الشهر' : 'this month'}
                    </span>
                  )}
                </p>
              </div>
              <Dropdown 
                options={[
                  { value: '7', label: lang === 'ar' ? 'آخر 7 أيام' : 'Last 7 days' }, 
                  { value: '30', label: lang === 'ar' ? 'آخر 30 يوم' : 'Last 30 days' }
                ]} 
                value={chartPeriod} 
                onChange={setChartPeriod} 
                placeholder={lang === 'ar' ? 'آخر 7 أيام' : 'Last 7 days'} 
                showClear={false} 
                isRtl={lang === 'ar'} 
                triggerClassName="min-h-[36px] flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl text-[10px] font-black text-slate-500 outline-none border border-transparent focus:border-primary/20 cursor-pointer pl-4 pr-8 rtl:pl-8 rtl:pr-4" 
              />
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartData.length > 0 ? (
                  <BarChart data={chartData} barSize={36}>
                    <defs>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#009aa7" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#009aa7" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: '#0f172a', color: '#fff'}}
                      itemStyle={{fontWeight: 900, color: '#009aa7'}}
                      labelStyle={{color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px'}}
                    />
                    <Bar dataKey="orders" radius={[10, 10, 4, 4]} animationDuration={2000}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.orders > 0 ? '#009aa7' : '#f1f5f9'} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-5xl mb-4">bar_chart</span>
                      <p className="text-sm font-bold">{lang === 'ar' ? 'لا توجد بيانات' : 'No data available'}</p>
                    </div>
                  </div>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-8">
          <RecentNotifications />
          
          {/* Additional Stats Card */}
          {stats && (
            <div className="rounded-[2.5rem] bg-gradient-to-br from-primary to-accent p-8 text-white shadow-xl shadow-primary/20">
              <div className="mb-6">
                <h3 className="text-xl font-black mb-2">{lang === 'ar' ? 'ملخص الأداء' : 'Performance Summary'}</h3>
                <p className="text-white/70 text-sm font-bold">{lang === 'ar' ? 'إحصائيات سريعة' : 'Quick Stats'}</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/10 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl">pending_actions</span>
                    <span className="text-sm font-bold">{lang === 'ar' ? 'بانتظار الرد' : 'Awaiting Response'}</span>
                  </div>
                  <span className="text-xl font-black tabular-nums">{stats.pendingOrderLines}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/10 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl">rate_review</span>
                    <span className="text-sm font-bold">{lang === 'ar' ? 'تم الرد' : 'Responded'}</span>
                  </div>
                  <span className="text-xl font-black tabular-nums">{stats.respondedOrderLines}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/10 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl">calendar_month</span>
                    <span className="text-sm font-bold">{lang === 'ar' ? 'هذا الشهر' : 'This Month'}</span>
                  </div>
                  <span className="text-xl font-black tabular-nums">{stats.ordersThisMonth}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Grid */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Order Status Distribution */}
          {statusDistributionData.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8">
              <div className="mb-6">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{lang === 'ar' ? 'توزيع حالة الطلبات' : 'Order Status Distribution'}</h3>
                <p className="text-xs text-slate-400 font-bold">{lang === 'ar' ? 'توزيع الطلبات حسب الحالة' : 'Orders distribution by status'}</p>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistributionData}
                      innerRadius="50%"
                      outerRadius="85%"
                      paddingAngle={5}
                      dataKey="value"
                      animationDuration={1500}
                      stroke="none"
                    >
                      {statusDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: '900'}}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span style={{ fontSize: '11px', fontWeight: '900' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Order Lines Distribution */}
          {orderLinesData.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8">
              <div className="mb-6">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{lang === 'ar' ? 'توزيع بنود الطلبات' : 'Order Lines Distribution'}</h3>
                <p className="text-xs text-slate-400 font-bold">{lang === 'ar' ? 'حالة بنود الطلبات' : 'Order lines status'}</p>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={orderLinesData}
                      innerRadius="50%"
                      outerRadius="85%"
                      paddingAngle={5}
                      dataKey="value"
                      animationDuration={1500}
                      stroke="none"
                    >
                      {orderLinesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: '900'}}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span style={{ fontSize: '11px', fontWeight: '900' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Growth Trend Chart */}
      {!isLoading && stats && chartData.length > 1 && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8 mb-8">
          <div className="mb-8">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{lang === 'ar' ? 'اتجاه النمو الشهري' : 'Monthly Growth Trend'}</h3>
            <p className="text-xs text-slate-400 font-bold">{lang === 'ar' ? 'مقارنة النمو بين الأشهر' : 'Growth comparison across months'}</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAdminGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#009aa7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#009aa7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                <Tooltip 
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: '#0f172a', color: '#fff'}}
                  itemStyle={{fontWeight: 900, color: '#009aa7'}}
                />
                <Area type="monotone" dataKey="orders" stroke="#009aa7" fillOpacity={1} fill="url(#colorAdminGrowth)" strokeWidth={3} animationDuration={2000} />
                <Line type="monotone" dataKey="growth" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-gradient-to-br from-primary to-accent rounded-[2.5rem] p-8 text-white shadow-xl shadow-primary/20">
            <div className="mb-6">
              <h3 className="text-xl font-black mb-2">{lang === 'ar' ? 'مؤشرات الأداء' : 'Performance Metrics'}</h3>
              <p className="text-white/70 text-sm font-bold">{lang === 'ar' ? 'إحصائيات الأداء الرئيسية' : 'Key performance indicators'}</p>
            </div>
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold">{lang === 'ar' ? 'معدل الإتمام' : 'Completion Rate'}</span>
                  <span className="text-2xl font-black">{completionRate}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all" style={{ width: `${completionRate}%` }}></div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold">{lang === 'ar' ? 'معدل الاستجابة' : 'Response Rate'}</span>
                  <span className="text-2xl font-black">{responseRate}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all" style={{ width: `${responseRate}%` }}></div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{lang === 'ar' ? 'هذا الشهر' : 'This Month'}</span>
                  <span className="text-2xl font-black">{stats.ordersThisMonth}</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{lang === 'ar' ? 'الشهر السابق' : 'Last Month'}</span>
                  <span className="text-2xl font-black">{stats.ordersLastMonth}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8">
            <div className="mb-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{lang === 'ar' ? 'إحصائيات إضافية' : 'Additional Statistics'}</h3>
              <p className="text-xs text-slate-400 font-bold">{lang === 'ar' ? 'معلومات تفصيلية' : 'Detailed information'}</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-purple-500 text-2xl">handshake</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{lang === 'ar' ? 'قيد التفاوض' : 'Negotiating'}</span>
                </div>
                <span className="text-xl font-black text-slate-900 dark:text-white">{stats.negotiatingOrders}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-violet-500 text-2xl">hourglass_empty</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{lang === 'ar' ? 'تحت التأكيد' : 'Under Confirmation'}</span>
                </div>
                <span className="text-xl font-black text-slate-900 dark:text-white">{stats.underConfirmationOrders || 0}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-500 text-2xl">cancel</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{lang === 'ar' ? 'ملغاة' : 'Cancelled'}</span>
                </div>
                <span className="text-xl font-black text-slate-900 dark:text-white">{stats.cancelledOrders}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-cyan-500 text-2xl">pending_actions</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{lang === 'ar' ? 'بانتظار الرد' : 'Awaiting Response'}</span>
                </div>
                <span className="text-xl font-black text-slate-900 dark:text-white">{stats.pendingOrderLines}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        <GeminiInsights />
      </div>
    </div>
  );
};

export default Dashboard;