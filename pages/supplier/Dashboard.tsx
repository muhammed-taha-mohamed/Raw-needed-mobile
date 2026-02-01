
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { useNavigate } from 'react-router-dom';
import AdSlider from '../../components/AdSlider';
import RecentNotifications from '../../components/RecentNotifications';
import { 
  PieChart, Pie, ResponsiveContainer, Cell, Tooltip
} from 'recharts';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  sentOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  monthlyStats: any[];
  totalOrderLines: number;
  pendingOrderLines: number;
  respondedOrderLines: number;
}

const SupplierDashboard: React.FC = () => {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-10 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-display">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Main Stats Column */}
        <div className="lg:col-span-8 space-y-8">
          
          <AdSlider />
          
          {/* Enhanced Supply Analytics Section */}
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
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">{lang === 'ar' ? 'إجمالي الحركة' : 'Total Items'}</span>
                       </div>
                    </div>
                  </div>

                  {/* Details Grid Section */}
                  <div className="flex-1 w-full">
                     <div className="mb-6">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">
                           {lang === 'ar' ? 'تحليل العروض والطلبات' : 'Supply Performance Analytics'}
                        </h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
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
                          className="text-[11px] font-black text-primary hover:underline uppercase tracking-widest flex items-center gap-1.5"
                        >
                           {lang === 'ar' ? 'عرض السجل' : 'Full History'}
                           <span className="material-symbols-outlined text-sm rtl-flip">arrow_forward</span>
                        </button>
                     </div>
                  </div>
               </div>
          </div>

          {/* Quick Access Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
             <div 
               onClick={() => navigate('/products')}
               className="p-8 rounded-[2.5rem] bg-gradient-to-br from-primary to-accent text-white shadow-xl shadow-primary/20 cursor-pointer group transition-all hover:-translate-y-1"
             >
                <div className="flex justify-between items-start mb-10">
                   <div className="size-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl">inventory_2</span>
                   </div>
                   <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-all rtl-flip">arrow_forward</span>
                </div>
                <h3 className="text-2xl font-black mb-2">{lang === 'ar' ? 'إدارة المنتجات' : 'Inventory Management'}</h3>
                <p className="text-white/70 text-sm font-bold">{lang === 'ar' ? 'إضافة وتحديث كتالوج المواد الخام.' : 'Update your catalog and stock levels.'}</p>
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
              <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-4">{lang === 'ar' ? 'رؤى سريعة' : 'Vendor Insight'}</p>
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
