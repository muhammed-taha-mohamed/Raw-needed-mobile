
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { UserSubscription } from '../../types';
import { useNavigate } from 'react-router-dom';
import AdSlider from '../../components/AdSlider';
import RecentNotifications from '../../components/RecentNotifications';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, AreaChart, Area, Legend
} from 'recharts';

interface MonthlyStat {
  month: string;
  orderCount: number;
  growthPercentage: number;
}

interface LatestOrder {
  id: string;
  orderNumber: string;
  status: string;
  numberOfLines: number;
  createdAt: string;
}

interface MostRequestedSupplier {
  id: string;
  name: string;
  organizationName: string;
  profileImage?: string;
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
  latestOrder?: LatestOrder;
  mostRequestedSupplier?: MostRequestedSupplier;
  mostRequestedSupplierOrderCount?: number;
  cartItemsCount?: number;
  vendorsCount?: number;
  productsCount?: number;
  marketRequestsCount?: number;
  teamMembersCount?: number;
  complaintsCount?: number;
}

const CustomerDashboard: React.FC = () => {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUserData(JSON.parse(savedUser));
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const data = await api.get<DashboardStats>('/api/v1/customer/dashboard/stats');
      console.log("Customer Dashboard Stats:", data);
      console.log("Monthly Stats:", data?.monthlyStats);
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch customer stats", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const statusDistributionData = stats ? [
    { name: lang === 'ar' ? 'قيد المراجعة' : 'Pending', value: stats.pendingOrders || 0, color: '#f59e0b' },
    { name: lang === 'ar' ? 'قيد التفاوض' : 'Negotiating', value: stats.negotiatingOrders || 0, color: '#3b82f6' },
    { name: lang === 'ar' ? 'تحت التأكيد' : 'Confirmation', value: stats.underConfirmationOrders || 0, color: '#8b5cf6' },
    { name: lang === 'ar' ? 'مكتملة' : 'Completed', value: stats.completedOrders || 0, color: '#10b981' },
    { name: lang === 'ar' ? 'ملغاة' : 'Cancelled', value: stats.cancelledOrders || 0, color: '#ef4444' },
  ] : [];

  const totalRequested = statusDistributionData.reduce((acc, curr) => acc + curr.value, 0);

  const chartData = stats?.monthlyStats && stats.monthlyStats.length > 0 
    ? stats.monthlyStats.map(s => {
        if (!s || !s.month) return null;
        const monthParts = s.month.split(' ');
        let label = '';
        if (lang === 'ar') {
          // For Arabic, use the full month name
          label = monthParts[0] || s.month;
        } else {
          // For English, use first 3 letters
          label = monthParts[0] ? monthParts[0].substring(0, 3) : s.month.substring(0, 3);
        }
        return { 
          name: label || s.month, 
          orders: s.orderCount || 0,
          growth: s.growthPercentage || 0 
        };
      }).filter(item => item !== null && item.name) as { name: string; orders: number; growth: number }[]
    : [];

  // Debug log
  useEffect(() => {
    if (stats?.monthlyStats) {
      console.log("Monthly Stats:", stats.monthlyStats);
      console.log("Chart Data:", chartData);
    }
  }, [stats, chartData]);

  const completionRate = stats && stats.totalOrders > 0 
    ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1) 
    : '0';
  
  const responseRate = stats && stats.totalOrderLines > 0 
    ? ((stats.respondedOrderLines / stats.totalOrderLines) * 100).toFixed(1) 
    : '0';

  return (
    <div className="mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-display text-slate-800 dark:text-slate-100 antialiased">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Ads Section - Only for Customers */}
          <AdSlider />

          {/* Quick Stats Cards */}
          {loadingStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-lg hover:border-primary/20 cursor-pointer" onClick={() => navigate('/orders')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="material-symbols-outlined text-primary text-2xl">receipt_long</span>
                  {stats.monthlyGrowthPercentage > 0 && (
                    <span className="text-[10px] font-black text-emerald-500 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-lg">
                      <span className="material-symbols-outlined text-xs">trending_up</span>
                      {Math.abs(stats.monthlyGrowthPercentage).toFixed(0)}%
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stats.totalOrders}</h3>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">{lang === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-lg hover:border-primary/20 cursor-pointer" onClick={() => navigate('/orders')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="material-symbols-outlined text-amber-500 text-2xl">pending_actions</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stats.pendingOrders}</h3>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">{lang === 'ar' ? 'قيد المراجعة' : 'Pending'}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-lg hover:border-primary/20 cursor-pointer" onClick={() => navigate('/orders')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="material-symbols-outlined text-blue-500 text-2xl">handshake</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stats.negotiatingOrders}</h3>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">{lang === 'ar' ? 'قيد التفاوض' : 'Negotiating'}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-lg hover:border-primary/20 cursor-pointer" onClick={() => navigate('/orders')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="material-symbols-outlined text-purple-500 text-2xl">hourglass_empty</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stats.underConfirmationOrders || 0}</h3>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">{lang === 'ar' ? 'تحت التأكيد' : 'Confirmation'}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-lg hover:border-primary/20 cursor-pointer" onClick={() => navigate('/orders')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="material-symbols-outlined text-emerald-500 text-2xl">task_alt</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stats.completedOrders}</h3>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">{lang === 'ar' ? 'مكتملة' : 'Completed'}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-lg hover:border-primary/20 cursor-pointer" onClick={() => navigate('/orders')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="material-symbols-outlined text-red-500 text-2xl">cancel</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stats.cancelledOrders}</h3>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">{lang === 'ar' ? 'ملغاة' : 'Cancelled'}</p>
              </div>
            </div>
          )}

          {/* Order Status Distribution Card - Made smaller by reducing padding and heights */}
          {loadingStats ? (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm animate-pulse">
              <div className="h-[220px] bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:border-primary/20 group flex flex-col md:flex-row gap-6 items-center">
             
             {/* Mobile Header Title */}
             <div className="w-full md:hidden mb-1 text-center">
                <h3 className="text-base font-black text-slate-900 dark:text-white  ">{lang === 'ar' ? 'توزيع الطلبات' : 'Order Distribution'}</h3>
             </div>

             {/* Chart Section - Reduced height */}
             <div className="relative flex items-center justify-center w-full md:w-1/2 h-[180px] md:h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistributionData}
                      innerRadius="60%"
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
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                   <span className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tabular-nums leading-none">{totalRequested}</span>
                   <span className="text-[9px] font-black text-slate-500   mt-1">{lang === 'ar' ? 'إجمالي' : 'Total'}</span>
                </div>
             </div>

             {/* Legend Section - Below chart on mobile, side on desktop */}
             <div className="flex flex-col w-full md:w-1/2">
                <div className="hidden md:block mb-4">
                  <h3 className="text-base font-black text-slate-900 dark:text-white  ">{lang === 'ar' ? 'توزيع الطلبات' : 'Order Distribution'}</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-2.5 w-full">
                  {statusDistributionData.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 transition-all hover:border-primary/20 overflow-hidden">
                      <div className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></div>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-between">
                         <span className="text-[9px] font-black text-slate-500   truncate shrink-0">{entry.name}</span>
                         <span className="text-sm font-black text-slate-800 dark:text-white tabular-nums leading-none shrink-0">{entry.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
          )}

          {/* Monthly Volume Chart */}
          {loadingStats ? (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 flex flex-col min-h-[350px] animate-pulse">
              <div className="h-full bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 flex flex-col min-h-[350px] items-center justify-center">
              <div className="text-center">
                <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">bar_chart</span>
                <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">{lang === 'ar' ? 'حجم الطلبات الشهري لهذا العام' : 'Monthly Request Volume This Year'}</h3>
                <p className="text-xs text-slate-400 font-bold">{lang === 'ar' ? 'لا توجد بيانات متاحة حالياً' : 'No data available yet'}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 flex flex-col min-h-[350px]">
             <div className="mb-8 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white ">{lang === 'ar' ? 'حجم الطلبات الشهري لهذا العام' : 'Monthly Request Volume This Year'}</h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    {stats && stats.ordersThisMonth > 0 && stats.ordersLastMonth > 0 && (
                      <span className={stats.monthlyGrowthPercentage >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                        {stats.monthlyGrowthPercentage >= 0 ? '↑' : '↓'} {Math.abs(stats.monthlyGrowthPercentage).toFixed(1)}% {lang === 'ar' ? 'نمو' : 'growth'} {lang === 'ar' ? 'هذا الشهر' : 'this month'}
                      </span>
                    )}
                  </p>
                </div>
             </div>
             
             <div className="flex-1 w-full mt-auto" style={{ minHeight: '300px', height: '300px' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} barSize={36} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" opacity={0.5} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} 
                      allowDecimals={false}
                      domain={[0, 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: '#0f172a', color: '#fff'}}
                      itemStyle={{fontWeight: 900, color: '#009aa7'}}
                      formatter={(value: any) => [value, lang === 'ar' ? 'الطلبات' : 'Orders']}
                    />
                    <Bar dataKey="orders" radius={[10, 10, 4, 4]} animationDuration={1500}>
                       {chartData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.orders > 0 ? '#009aa7' : '#f1f5f9'} />
                       ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
          )}

          {/* Growth Trend Chart */}
          {!loadingStats && stats && chartData.length > 1 && (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8">
              <div className="mb-8">
                <h3 className="text-base font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'اتجاه النمو الشهري' : 'Monthly Growth Trend'}</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">{lang === 'ar' ? 'مقارنة النمو بين الأشهر' : 'Growth comparison across months'}</p>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
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
                    <Area type="monotone" dataKey="orders" stroke="#009aa7" fillOpacity={1} fill="url(#colorGrowth)" strokeWidth={3} animationDuration={2000} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          {!loadingStats && stats && (
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
                    <span className="text-sm font-bold">{lang === 'ar' ? 'إجمالي بنود الطلبات' : 'Total Order Lines'}</span>
                    <span className="text-2xl font-black">{stats.totalOrderLines}</span>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{lang === 'ar' ? 'طلبات هذا الشهر' : 'Orders This Month'}</span>
                    <span className="text-2xl font-black">{stats.ordersThisMonth}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar Column */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Latest Order Card */}
          {!loadingStats && stats?.latestOrder && (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 transition-all hover:shadow-lg hover:border-primary/20 cursor-pointer" onClick={() => navigate('/orders')}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'آخر طلب' : 'Latest Order'}</h3>
                <span className="material-symbols-outlined text-primary text-xl">receipt_long</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'رقم الطلب' : 'Order Number'}</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{stats.latestOrder.orderNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'الحالة' : 'Status'}</span>
                  <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                    stats.latestOrder.status === 'NEW' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                    stats.latestOrder.status === 'NEGOTIATING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                    stats.latestOrder.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {stats.latestOrder.status === 'NEW' ? (lang === 'ar' ? 'قيد المراجعة' : 'Pending') :
                     stats.latestOrder.status === 'NEGOTIATING' ? (lang === 'ar' ? 'قيد التفاوض' : 'Negotiating') :
                     stats.latestOrder.status === 'COMPLETED' ? (lang === 'ar' ? 'مكتمل' : 'Completed') :
                     stats.latestOrder.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'عدد البنود' : 'Items'}</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{stats.latestOrder.numberOfLines}</span>
                </div>
                {stats.latestOrder.createdAt && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'التاريخ' : 'Date'}</span>
                    <span className="text-xs font-black text-slate-600 dark:text-slate-400">
                      {new Date(stats.latestOrder.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Most Requested Supplier Card */}
          {!loadingStats && stats?.mostRequestedSupplier && (
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 rounded-[2rem] border border-primary/20 dark:border-primary/30 shadow-sm p-6 transition-all hover:shadow-lg cursor-pointer" onClick={() => navigate('/vendors')}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'أكثر مورد طلب منه' : 'Most Requested Supplier'}</h3>
                <span className="material-symbols-outlined text-primary text-xl">star</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                {stats.mostRequestedSupplier.profileImage ? (
                  <img src={stats.mostRequestedSupplier.profileImage} alt={stats.mostRequestedSupplier.name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-2xl">storefront</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">{stats.mostRequestedSupplier.name}</h4>
                  {stats.mostRequestedSupplier.organizationName && (
                    <p className="text-xs font-bold text-slate-500 truncate">{stats.mostRequestedSupplier.organizationName}</p>
                  )}
                </div>
              </div>
              <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'عدد الطلبات' : 'Order Count'}</span>
                  <span className="text-lg font-black text-primary">{stats.mostRequestedSupplierOrderCount || 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Screen Statistics Cards */}
          {!loadingStats && (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6">
              <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">{lang === 'ar' ? 'إحصائيات الشاشات' : 'Screen Statistics'}</h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Cart */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" onClick={() => navigate('/cart')}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-lg">shopping_cart</span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'العربة' : 'Cart'}</span>
                  </div>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{stats?.cartItemsCount || 0}</p>
                </div>

                {/* Vendors */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" onClick={() => navigate('/vendors')}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-lg">storefront</span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'الموردون' : 'Vendors'}</span>
                  </div>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{stats?.vendorsCount || 0}</p>
                </div>

                {/* Products */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" onClick={() => navigate('/product-search')}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-lg">inventory_2</span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'المنتجات' : 'Products'}</span>
                  </div>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{stats?.productsCount || 0}</p>
                </div>

                {/* Market Requests */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" onClick={() => navigate('/market-requests')}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-lg">campaign</span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'طلبات خاصة' : 'Requests'}</span>
                  </div>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{stats?.marketRequestsCount || 0}</p>
                </div>

                {/* Team Members */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" onClick={() => navigate('/my-team')}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-lg">group</span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'الفريق' : 'Team'}</span>
                  </div>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{stats?.teamMembersCount || 0}</p>
                </div>

                {/* Complaints */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" onClick={() => navigate('/support')}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-lg">support_agent</span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'الشكاوى' : 'Support'}</span>
                  </div>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{stats?.complaintsCount || 0}</p>
                </div>
              </div>
            </div>
          )}

          {/* Screen Statistics Chart */}
          {!loadingStats && stats && (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6">
              <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">{lang === 'ar' ? 'توزيع النشاط' : 'Activity Distribution'}</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: lang === 'ar' ? 'العربة' : 'Cart', value: stats.cartItemsCount || 0, color: '#009aa7' },
                        { name: lang === 'ar' ? 'الموردون' : 'Vendors', value: stats.vendorsCount || 0, color: '#3b82f6' },
                        { name: lang === 'ar' ? 'المنتجات' : 'Products', value: stats.productsCount || 0, color: '#10b981' },
                        { name: lang === 'ar' ? 'طلبات خاصة' : 'Requests', value: stats.marketRequestsCount || 0, color: '#8b5cf6' },
                        { name: lang === 'ar' ? 'الفريق' : 'Team', value: stats.teamMembersCount || 0, color: '#f59e0b' },
                        { name: lang === 'ar' ? 'الشكاوى' : 'Support', value: stats.complaintsCount || 0, color: '#ef4444' },
                      ].filter(item => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      animationDuration={1500}
                    >
                      {[
                        { name: lang === 'ar' ? 'العربة' : 'Cart', value: stats.cartItemsCount || 0, color: '#009aa7' },
                        { name: lang === 'ar' ? 'الموردون' : 'Vendors', value: stats.vendorsCount || 0, color: '#3b82f6' },
                        { name: lang === 'ar' ? 'المنتجات' : 'Products', value: stats.productsCount || 0, color: '#10b981' },
                        { name: lang === 'ar' ? 'طلبات خاصة' : 'Requests', value: stats.marketRequestsCount || 0, color: '#8b5cf6' },
                        { name: lang === 'ar' ? 'الفريق' : 'Team', value: stats.teamMembersCount || 0, color: '#f59e0b' },
                        { name: lang === 'ar' ? 'الشكاوى' : 'Support', value: stats.complaintsCount || 0, color: '#ef4444' },
                      ].filter(item => item.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: '#0f172a', color: '#fff'}}
                      itemStyle={{fontWeight: 900, color: '#009aa7'}}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '10px', fontWeight: 900 }}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <RecentNotifications />
        </div>
      </div>
     
    </div>
  );
};

export default CustomerDashboard;
