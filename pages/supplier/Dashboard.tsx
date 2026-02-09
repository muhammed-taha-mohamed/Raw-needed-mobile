
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { api, BASE_URL } from '../../api';
import { useNavigate } from 'react-router-dom';
import RecentNotifications from '../../components/RecentNotifications';
import { useToast } from '../../contexts/ToastContext';
import { 
  PieChart, Pie, ResponsiveContainer, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area
} from 'recharts';

interface MonthlyStat {
  month: string;
  orderCount: number;
  growthPercentage: number;
}

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
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

const SupplierDashboard: React.FC = () => {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [userData, setUserData] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUserData(JSON.parse(savedUser));
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<DashboardStats>('/api/v1/supplier/dashboard/stats');
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch supplier stats", err);
    } finally {
      setIsLoading(false);
    }
  };

  const pieData = stats ? [
    { 
      name: lang === 'ar' ? 'بانتظار الرد' : 'Awaiting', 
      value: stats.pendingOrderLines || 0, 
      color: '#f59e0b',
      icon: 'pending_actions',
      desc: lang === 'ar' ? 'طلبات لم يتم الرد عليها' : 'New RFQs pending price'
    },
    { 
      name: lang === 'ar' ? 'تم تقديم عرض' : 'Quoted', 
      value: stats.respondedOrderLines || 0, 
      color: '#3b82f6',
      icon: 'rate_review',
      desc: lang === 'ar' ? 'عروض قيد المراجعة' : 'Prices sent to customers'
    },
    { 
      name: lang === 'ar' ? 'طلبات مكتملة' : 'Finalized', 
      value: stats.completedOrders || 0, 
      color: '#10b981',
      icon: 'task_alt',
      desc: lang === 'ar' ? 'تم التوريد بنجاح' : 'Successfully delivered'
    },
  ].filter(d => d.value >= 0) : [];

  const totalActions = pieData.reduce((acc, curr) => acc + curr.value, 0);

  const chartData = stats?.monthlyStats?.map(s => {
    const monthParts = s.month.split(' ');
    const label = lang === 'ar' ? monthParts[0] : monthParts[0].substring(0, 3);
    return { 
      name: label, 
      orders: s.orderCount || 0,
      growth: s.growthPercentage || 0 
    };
  }) || [];

  const responseRate = stats && stats.totalOrderLines > 0 
    ? ((stats.respondedOrderLines / stats.totalOrderLines) * 100).toFixed(1) 
    : '0';
  
  const completionRate = stats && stats.totalOrderLines > 0 
    ? ((stats.completedOrders / stats.totalOrderLines) * 100).toFixed(1) 
    : '0';

  const handleExportStock = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem('token');
      const langHeader = localStorage.getItem('lang') || 'ar';
      
      // Check if mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // For mobile: use direct API call with better mobile handling
        const now = new Date();
        const fileName = `stock-report-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.xlsx`;
        
        const response = await fetch(`${BASE_URL}/api/v1/product/export-stock`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Accept-Language': langHeader,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.errorMessage || t.products.exportError);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Create link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // Use setTimeout to ensure the link is ready
        setTimeout(() => {
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }, 100);
        }, 50);
      } else {
        // For desktop: use standard fetch and download
        const response = await fetch(`${BASE_URL}/api/v1/product/export-stock`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Accept-Language': langHeader,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.errorMessage || t.products.exportError);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const now = new Date();
        const fileName = `stock-report-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.xlsx`;
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
      
      showToast(t.products.exportSuccess, 'success');
    } catch (err: any) {
      const errorMsg = err.message || t.products.exportError;
      showToast(errorMsg, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full py-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-display">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Main Stats Column */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Quick Stats Cards */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-lg hover:border-primary/20 cursor-pointer" onClick={() => navigate('/orders')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="material-symbols-outlined text-primary text-2xl">inventory_2</span>
                  {stats.monthlyGrowthPercentage > 0 && (
                    <span className="text-[10px] font-black text-emerald-500 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-lg">
                      <span className="material-symbols-outlined text-xs">trending_up</span>
                      {Math.abs(stats.monthlyGrowthPercentage || 0).toFixed(0)}%
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stats.totalOrderLines}</h3>
                <p className="text-[11px] font-black text-slate-400 mt-1">{lang === 'ar' ? 'إجمالي العروض' : 'Total RFQs'}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-lg hover:border-primary/20 cursor-pointer" onClick={() => navigate('/orders')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="material-symbols-outlined text-amber-500 text-2xl">pending_actions</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stats.pendingOrderLines}</h3>
                <p className="text-[11px] font-black text-slate-400 mt-1">{lang === 'ar' ? 'بانتظار الرد' : 'Awaiting'}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-lg hover:border-primary/20 cursor-pointer" onClick={() => navigate('/orders')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="material-symbols-outlined text-blue-500 text-2xl">rate_review</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stats.respondedOrderLines}</h3>
                <p className="text-[11px] font-black text-slate-400 mt-1">{lang === 'ar' ? 'تم الرد' : 'Quoted'}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-lg hover:border-primary/20 cursor-pointer" onClick={() => navigate('/orders')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="material-symbols-outlined text-emerald-500 text-2xl">task_alt</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stats.completedOrders}</h3>
                <p className="text-[11px] font-black text-slate-400 mt-1">{lang === 'ar' ? 'مكتملة' : 'Completed'}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-lg hover:border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="material-symbols-outlined text-purple-500 text-2xl">percent</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{responseRate}%</h3>
                <p className="text-[11px] font-black text-slate-400 mt-1">{lang === 'ar' ? 'معدل الاستجابة' : 'Response Rate'}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-lg hover:border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="material-symbols-outlined text-indigo-500 text-2xl">check_circle</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{completionRate}%</h3>
                <p className="text-[11px] font-black text-slate-400 mt-1">{lang === 'ar' ? 'معدل الإتمام' : 'Completion'}</p>
              </div>
            </div>
          )}
          
          {/* Enhanced Supply Analytics Section */}
          {isLoading ? (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm animate-pulse">
              <div className="h-[300px] bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          ) : (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:border-primary/20 group relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                  <span className="material-symbols-outlined text-[150px]">query_stats</span>
               </div>

               <div className="flex flex-col md:flex-row gap-10 items-center relative z-10">
                  
                  {/* Visual Chart Section */}
                  <div className="w-full md:w-2/5 flex flex-col items-center">
                    <div className="relative size-56 md:size-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie 
                             data={pieData} 
                             innerRadius="70%" 
                             outerRadius="95%" 
                             paddingAngle={8} 
                             dataKey="value" 
                             animationDuration={1500} 
                             stroke="none"
                             cornerRadius={10}
                           >
                             {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                           </Pie>
                           <Tooltip 
                             contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: '900' }}
                           />
                         </PieChart>
                       </ResponsiveContainer>
                       <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-4xl font-black text-slate-800 dark:text-white tabular-nums leading-none">{totalActions}</span>
                          <span className="text-[10px] font-black text-slate-400 tracking-[0.3em] mt-2">{lang === 'ar' ? 'إجمالي الحركة' : 'Total Items'}</span>
                       </div>
                    </div>
                  </div>

                  {/* Details Grid Section */}
                  <div className="flex-1 w-full">
                     <div className="mb-6">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">
                           {lang === 'ar' ? 'تحليل العروض والطلبات' : 'Supply Performance Analytics'}
                        </h3>
                        <p className="text-xs font-bold text-slate-400">
                           {lang === 'ar' ? 'مؤشرات حركة التوريد الحالية' : 'Real-time supply chain overview'}
                        </p>
                     </div>

                     <div className="grid grid-cols-1 gap-4">
                        {pieData.map((entry, i) => (
                          <div 
                            key={i} 
                            className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-md hover:border-primary/20 group/item"
                          >
                             <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover/item:scale-110`} style={{ backgroundColor: `${entry.color}15`, color: entry.color }}>
                                <span className="material-symbols-outlined text-2xl">{entry.icon}</span>
                             </div>
                             
                             <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                   <span className="text-sm font-black text-slate-700 dark:text-slate-200">{entry.name}</span>
                                   <span className="text-xl font-black tabular-nums" style={{ color: entry.color }}>{entry.value}</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 truncate">{entry.desc}</p>
                             </div>

                             <div className={`size-1.5 rounded-full`} style={{ backgroundColor: entry.color }}></div>
                          </div>
                        ))}
                     </div>

                     <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <span className="material-symbols-outlined text-primary text-lg">info</span>
                           <span className="text-[11px] font-bold text-slate-500 italic">
                             {lang === 'ar' ? 'يتم تحديث البيانات لحظياً عند تغيير حالة أي طلب.' : 'Data is synchronized live as order statuses change.'}
                           </span>
                        </div>
                        <button 
                          onClick={() => navigate('/orders')}
                          className="text-[11px] font-black text-primary hover:underline flex items-center gap-1.5"
                        >
                           {lang === 'ar' ? 'عرض السجل' : 'Full History'}
                           <span className="material-symbols-outlined text-sm rtl-flip">arrow_forward</span>
                        </button>
                     </div>
                  </div>
               </div>
          </div>
          )}
          {/* Monthly Performance Chart */}
          {!isLoading && stats && chartData.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8">
              <div className="mb-8">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{lang === 'ar' ? 'أداء العروض الشهري' : 'Monthly RFQ Performance'}</h3>
                <p className="text-xs text-slate-400 font-bold">{lang === 'ar' ? 'مقارنة عدد العروض بين الأشهر' : 'RFQ count comparison across months'}</p>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barSize={40}>
                    <defs>
                      <linearGradient id="colorRFQ" x1="0" y1="0" x2="0" y2="1">
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
                    />
                    <Bar dataKey="orders" radius={[10, 10, 4, 4]} fill="url(#colorRFQ)" animationDuration={2000} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Growth Trend */}
          {!isLoading && stats && chartData.length > 1 && (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8">
              <div className="mb-8">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{lang === 'ar' ? 'اتجاه النمو' : 'Growth Trend'}</h3>
                <p className="text-xs text-slate-400 font-bold">{lang === 'ar' ? 'نمو العروض عبر الأشهر' : 'RFQ growth over time'}</p>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorGrowthSupplier" x1="0" y1="0" x2="0" y2="1">
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
                    <Area type="monotone" dataKey="orders" stroke="#009aa7" fillOpacity={1} fill="url(#colorGrowthSupplier)" strokeWidth={3} animationDuration={2000} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Performance Metrics Card */}
          {!isLoading && stats && (
            <div className="bg-gradient-to-br from-primary to-accent rounded-[2.5rem] p-8 text-white shadow-xl shadow-primary/20">
              <div className="mb-6">
                <h3 className="text-xl font-black mb-2">{lang === 'ar' ? 'مؤشرات الأداء الرئيسية' : 'Key Performance Indicators'}</h3>
                <p className="text-white/70 text-sm font-bold">{lang === 'ar' ? 'إحصائيات الأداء الشاملة' : 'Comprehensive performance stats'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold">{lang === 'ar' ? 'معدل الإتمام' : 'Completion Rate'}</span>
                    <span className="text-2xl font-black">{completionRate}%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all" style={{ width: `${completionRate}%` }}></div>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{lang === 'ar' ? 'هذا الشهر' : 'This Month'}</span>
                    <span className="text-2xl font-black">{stats.ordersThisMonth || 0}</span>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{lang === 'ar' ? 'الشهر السابق' : 'Last Month'}</span>
                    <span className="text-2xl font-black">{stats.ordersLastMonth || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
             <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-primary to-accent text-white shadow-xl shadow-primary/20 group transition-all">
                <div className="flex justify-between items-start mb-6">
                   <div className="size-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl">inventory_2</span>
                   </div>
                </div>
                <h3 className="text-2xl font-black mb-2">{lang === 'ar' ? 'إدارة المنتجات' : 'Inventory Management'}</h3>
                <p className="text-white/70 text-sm font-bold mb-6">{lang === 'ar' ? 'إضافة وتحديث كتالوج المواد الخام.' : 'Update your catalog and stock levels.'}</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => navigate('/products')}
                    className="flex-1 py-3 px-4 rounded-xl bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all text-sm font-black flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">inventory_2</span>
                    {lang === 'ar' ? 'إدارة المنتجات' : 'Manage Products'}
                  </button>
                  <button 
                    onClick={handleExportStock}
                    disabled={isExporting}
                    className="flex-1 py-3 px-4 rounded-xl bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExporting ? (
                      <>
                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        {t.products.exporting}
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">download</span>
                        {t.products.exportStock}
                      </>
                    )}
                  </button>
                </div>
             </div>

             <div 
               onClick={() => navigate('/market-requests')}
               className="p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-xl cursor-pointer group transition-all hover:-translate-y-1 border border-white/5"
             >
                <div className="flex justify-between items-start mb-10">
                   <div className="size-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                      <span className="material-symbols-outlined text-3xl">campaign</span>
                   </div>
                   <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-all rtl-flip">arrow_forward</span>
                </div>
                <h3 className="text-2xl font-black mb-2">{lang === 'ar' ? 'طلبات السوق' : 'Special Requests'}</h3>
                <p className="text-white/60 text-sm font-bold">{lang === 'ar' ? 'تصفح طلبات العملاء الخاصة والمباشرة.' : 'Browse custom requests from the market.'}</p>
             </div>
          </div>
        </div>

        {/* Right Sidebar Column */}
        <div className="lg:col-span-4 space-y-8">
           <RecentNotifications />
           
           <div className="p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <span className="material-symbols-outlined text-5xl text-primary">auto_awesome</span>
              </div>
              <p className="text-[11px] font-black text-primary tracking-[0.2em] mb-4">{lang === 'ar' ? 'رؤى سريعة' : 'Vendor Insight'}</p>
              <p className="text-sm font-bold leading-relaxed text-slate-600 dark:text-slate-300 italic">
                {lang === 'ar' 
                  ? `أداء التوريد لديك مستقر بنسبة ٩٤٪ هذا الشهر. التركيز على سرعة الرد يزيد من فرص التعاقد.` 
                  : `Your fulfillment rate is stable at 94% this month. Faster response times significantly boost closure rates.`}
              </p>
           </div>
        </div>
      </div>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default SupplierDashboard;
