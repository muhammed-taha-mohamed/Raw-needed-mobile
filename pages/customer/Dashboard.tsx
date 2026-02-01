
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { UserSubscription } from '../../types';
import { useNavigate } from 'react-router-dom';
import AdSlider from '../../components/AdSlider';
import RecentNotifications from '../../components/RecentNotifications';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';

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
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch customer stats", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const statusDistributionData = [
    { name: lang === 'ar' ? 'قيد المراجعة' : 'Pending', value: 3, color: '#f59e0b' },
    { name: lang === 'ar' ? 'قيد التفاوض' : 'Negotiating', value: 0, color: '#3b82f6' },
    { name: lang === 'ar' ? 'تحت التأكيد' : 'Confirmation', value: 0, color: '#8b5cf6' },
    { name: lang === 'ar' ? 'مكتملة' : 'Completed', value: 2, color: '#10b981' },
    { name: lang === 'ar' ? 'ملغاة' : 'Cancelled', value: 2, color: '#ef4444' },
  ];

  const totalRequested = statusDistributionData.reduce((acc, curr) => acc + curr.value, 0);

  const chartData = stats?.monthlyStats.map(s => {
    const monthParts = s.month.split(' ');
    const label = lang === 'ar' ? monthParts[0] : monthParts[0].substring(0, 3);
    return { name: label, orders: s.orderCount };
  }) || [];

  return (
    <div className="mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-display text-slate-800 dark:text-slate-100 antialiased">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-8">
          
          <AdSlider />

          {/* Order Status Distribution Card - Made smaller by reducing padding and heights */}
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

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 flex flex-col min-h-[350px]">
             <div className="mb-8 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white ">{lang === 'ar' ? 'حجم الطلبات الشهري' : 'Monthly Request Volume'}</h3>
                </div>
             </div>
             
             <div className="flex-1 w-full mt-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} allowDecimals={false} />
                    <Bar dataKey="orders" radius={[10, 10, 4, 4]} animationDuration={1500}>
                       {chartData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.orders > 0 ? '#009aa7' : '#f1f5f9'} />
                       ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* Right Sidebar Column */}
        <div className="lg:col-span-4 space-y-8">
           <RecentNotifications />
           
           <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-15 transition-opacity duration-700">
                 <span className="material-symbols-outlined text-5xl">auto_awesome</span>
              </div>
              <p className="text-[11px] font-black text-primary  mb-4">{lang === 'ar' ? 'رؤى سريعة' : 'Data Insight'}</p>
              <p className="text-sm font-medium leading-relaxed opacity-80 italic">
                {lang === 'ar' 
                  ? `تحليل البيانات يشير إلى كفاءة عالية في عمليات التوريد الحالية.` 
                  : `Data metrics indicate high operational efficiency in your current procurement cycles.`}
              </p>
           </div>
        </div>
      </div>
     
    </div>
  );
};

export default CustomerDashboard;
