
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { useNavigate } from 'react-router-dom';
import AdSlider from '../../components/AdSlider';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line
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

  const totalOrdersThisYear = chartData.reduce((sum, item) => sum + item.orders, 0);
  const averageMonthlyOrders = chartData.length ? Math.round(totalOrdersThisYear / chartData.length) : 0;
  const peakMonth = chartData.length
    ? chartData.reduce((max, item) => item.orders > max.orders ? item : max, chartData[0])
    : null;
  const latestGrowth = chartData.length ? chartData[chartData.length - 1].growth : 0;
  const highestGrowthMonth = chartData.length
    ? chartData.reduce((max, item) => item.growth > max.growth ? item : max, chartData[0])
    : null;

  // Debug log
  useEffect(() => {
    if (stats?.monthlyStats) {
      console.log("Monthly Stats:", stats.monthlyStats);
      console.log("Chart Data:", chartData);
    }
  }, [stats, chartData]);

  const placeholderLogo = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
      <rect width="120" height="40" rx="8" fill="%23e2e8f0"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="%236b7280">LOGO</text>
    </svg>
  `);
  const [brands, setBrands] = useState<{ id?: string; name: string; logo?: string | null }[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<any>('/api/v1/public/landing-brands');
        const list = (res?.data || res?.content?.data || res) as any[];
        if (Array.isArray(list) && list.length) {
          setBrands(list.map((b: any) => ({ id: b.id, name: b.name || '—', logo: b.logo || null })));
        }
      } catch { }
      finally { setBrandsLoading(false); }
    })();
  }, []);

  return (
    <div className="w-full py-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-display text-slate-800 dark:text-slate-100 antialiased">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track { animation: marquee 18s linear infinite; }
        .marquee-track-rtl { animation-direction: reverse; }
      `}</style>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Main Column */}
        <div className="lg:col-span-12 space-y-8">
          
          {/* Premium Distributors */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur supports-[backdrop-filter]:bg-white/50 dark:supports-[backdrop-filter]:bg-slate-900/40 overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">{lang === 'ar' ? 'موزعونا المميزون' : 'Premium Distributors'}</h3>
              <span className="material-symbols-outlined text-primary text-base">workspace_premium</span>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white dark:from-slate-900 to-transparent"></div>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white dark:from-slate-900 to-transparent"></div>
              <div className={`flex items-center py-4 pl-4 will-change-transform whitespace-nowrap ${brands.length ? 'marquee-track' : ''} ${lang === 'ar' ? 'marquee-track-rtl' : ''}`}>
                {(brandsLoading || brands.length === 0)
                  ? Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex items-center">
                      <div className="flex flex-col items-center justify-center px-3 min-w-[110px]">
                        <div className="h-8 w-24 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                        <span className="mt-1 h-3 w-16 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                      </div>
                      <span className="mx-2 text-slate-300">|</span>
                    </div>
                  ))
                  : brands.concat(brands).map((c, i) => (
                    <div key={i} className="flex items-center">
                      <div className="flex flex-col items-center justify-center px-3 min-w-[110px]">
                        {c.logo ? (
                          <img
                            src={c.logo}
                            alt={c.name}
                            className="h-8 w-auto object-contain opacity-80 dark:invert-0"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = placeholderLogo; }}
                          />
                        ) : (
                          <img
                            src={placeholderLogo}
                            alt={c.name}
                            className="h-8 w-auto object-contain opacity-80"
                          />
                        )}
                        <span className="mt-1 text-[11px] font-black text-slate-600 dark:text-slate-300">{c.name}</span>
                      </div>
                      <span className="mx-2 text-slate-300">|</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          
          {/* Ads Section - Only for Customers */}
          <AdSlider />

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

          <div className="grid grid-cols-1 2xl:grid-cols-5 gap-8">
            {/* Monthly Volume Chart */}
            {loadingStats ? (
              <div className="2xl:col-span-3 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 flex flex-col min-h-[420px] animate-pulse">
                <div className="h-full bg-slate-200 dark:bg-slate-700 rounded-[2rem]"></div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="2xl:col-span-3 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 flex flex-col min-h-[420px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-5 size-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl">bar_chart</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{lang === 'ar' ? 'حجم الطلبات الشهري لهذا العام' : 'Monthly Request Volume This Year'}</h3>
                  <p className="text-sm text-slate-400 font-bold">{lang === 'ar' ? 'لا توجد بيانات متاحة حالياً' : 'No data available yet'}</p>
                </div>
              </div>
            ) : (
              <div className="2xl:col-span-3 rounded-[2.5rem] border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-white to-primary/5 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 shadow-sm p-6 md:p-8">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-2xl">bar_chart_4_bars</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'حجم الطلبات الشهري لهذا العام' : 'Monthly Request Volume This Year'}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-1">
                        {lang === 'ar' ? 'متابعة الأداء الشهري وحجم الطلبات عبر السنة' : 'Track monthly order volume across the year'}
                      </p>
                    </div>
                  </div>
                  <div className={`inline-flex items-center gap-2 self-start px-4 py-2 rounded-2xl text-sm font-black ${
                    latestGrowth >= 0
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    <span className="material-symbols-outlined text-base">
                      {latestGrowth >= 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    {Math.abs(latestGrowth).toFixed(1)}% {lang === 'ar' ? 'مقارنة بآخر شهر' : 'vs last month'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/40 p-4">
                    <p className="text-xs font-black text-slate-500 mb-2">{lang === 'ar' ? 'إجمالي طلبات السنة' : 'Yearly Orders'}</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{totalOrdersThisYear}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/40 p-4">
                    <p className="text-xs font-black text-slate-500 mb-2">{lang === 'ar' ? 'متوسط شهري' : 'Monthly Average'}</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{averageMonthlyOrders}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/40 p-4">
                    <p className="text-xs font-black text-slate-500 mb-2">{lang === 'ar' ? 'أفضل شهر' : 'Top Month'}</p>
                    <div className="flex items-end justify-between gap-3">
                      <p className="text-lg font-black text-slate-900 dark:text-white truncate">{peakMonth?.name || '-'}</p>
                      <p className="text-2xl font-black text-primary tabular-nums">{peakMonth?.orders || 0}</p>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-950/30 p-4 md:p-6">
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} barSize={34} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.7} />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 900 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 900 }}
                          allowDecimals={false}
                          domain={[0, 'auto']}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(0, 154, 167, 0.08)' }}
                          contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: '#0f172a', color: '#fff' }}
                          itemStyle={{ fontWeight: 900, color: '#38bdf8' }}
                          formatter={(value: number) => [value, lang === 'ar' ? 'عدد الطلبات' : 'Orders']}
                        />
                        <Bar dataKey="orders" radius={[12, 12, 6, 6]} animationDuration={1500}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.orders === peakMonth?.orders ? '#0f766e' : entry.orders > 0 ? '#009aa7' : '#e2e8f0'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Growth Trend Chart */}
            {!loadingStats && stats && chartData.length > 1 && (
              <div className="2xl:col-span-2 rounded-[2.5rem] border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6 md:p-8">
                <div className="flex items-start justify-between gap-4 mb-8">
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-2xl">show_chart</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'اتجاه النمو الشهري' : 'Monthly Growth Trend'}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-1">{lang === 'ar' ? 'قراءة سريعة لتذبذب النمو بين الأشهر' : 'Quick view of month-over-month growth'}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-2 rounded-2xl text-sm font-black ${
                    latestGrowth >= 0
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {latestGrowth >= 0 ? '+' : ''}{latestGrowth.toFixed(1)}%
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4">
                    <p className="text-xs font-black text-slate-500 mb-1">{lang === 'ar' ? 'أعلى نمو' : 'Best Growth'}</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{highestGrowthMonth?.name || '-'}</p>
                    <p className="text-sm font-black text-emerald-500 mt-1">+{Math.max(highestGrowthMonth?.growth || 0, 0).toFixed(1)}%</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4">
                    <p className="text-xs font-black text-slate-500 mb-1">{lang === 'ar' ? 'آخر قراءة' : 'Latest Reading'}</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{chartData[chartData.length - 1]?.name || '-'}</p>
                    <p className={`text-sm font-black mt-1 ${latestGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {latestGrowth >= 0 ? '+' : ''}{latestGrowth.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-gradient-to-b from-sky-50/60 to-white dark:from-slate-800/40 dark:to-slate-900 p-4">
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.7} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 900 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 900 }} tickFormatter={(value: number) => `${value}%`} />
                        <Tooltip
                          contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: '#0f172a', color: '#fff' }}
                          itemStyle={{ fontWeight: 900, color: '#38bdf8' }}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, lang === 'ar' ? 'النمو' : 'Growth']}
                        />
                        <Line
                          type="monotone"
                          dataKey="growth"
                          stroke="#0ea5e9"
                          strokeWidth={3}
                          dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                          activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }}
                          animationDuration={1800}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Highlights Section */}
        <div className="lg:col-span-12 grid grid-cols-1 xl:grid-cols-2 gap-8">
          
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
                <h3 className="text-base font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'أكثر موزع طلباً' : 'Most Requested Distributor'}</h3>
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

        </div>
      </div>
     
    </div>
  );
};

export default CustomerDashboard;
