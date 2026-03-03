import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts';

// ——— Types (match backend AdminDashboardOverviewDto) ———
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

interface PendingCounts {
  pendingSubscriptions: number;
  pendingAdSubscriptions: number;
  pendingAddSearches: number;
}

interface TimeSeriesPoint {
  label: string;
  value: number;
}

interface PieSlice {
  name: string;
  value: number;
}

interface RecentOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  userName: string;
  organizationName?: string;
  numberOfLines: number;
  createdAt: string;
}

interface RecentComplaintSummary {
  id: string;
  subject: string;
  status: string;
  userId: string;
  createdAt: string;
}

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalOrderLines: number;
  ordersThisMonth: number;
  ordersLastMonth: number;
  monthlyGrowthPercentage: number;
}

interface DashboardCharts {
  ordersOverTime: TimeSeriesPoint[];
  subscriptionsOverTime: TimeSeriesPoint[];
  revenueOverTime: TimeSeriesPoint[];
  ordersByStatus: PieSlice[];
  usersByRole: PieSlice[];
}

interface DashboardCounts {
  totalProducts: number;
  totalCategories: number;
  totalSubCategories: number;
  totalComplaints: number;
  openComplaints: number;
  totalPosts: number;
  totalOffers: number;
  totalNotifications: number;
  totalSubscriptionRevenue: number;
  subscriptionRevenueThisMonth: number;
  addSearchesPending: number;
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

const ORDER_STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  NEW: { ar: 'جديد', en: 'New' },
  NEGOTIATING: { ar: 'تفاوض', en: 'Negotiating' },
  UNDER_CONFIRMATION: { ar: 'قيد التأكيد', en: 'Under confirmation' },
  COMPLETED: { ar: 'مكتمل', en: 'Completed' },
  CANCELLED: { ar: 'ملغي', en: 'Cancelled' },
};

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  SUPER_ADMIN: { ar: 'مدير عام', en: 'Super Admin' },
  ADMIN: { ar: 'مدير', en: 'Admin' },
  CUSTOMER_OWNER: { ar: 'عميل (مالك)', en: 'Customer Owner' },
  CUSTOMER_STAFF: { ar: 'موظف عميل', en: 'Customer Staff' },
  SUPPLIER_OWNER: { ar: 'موزع (مالك)', en: 'Distributor Owner' },
  SUPPLIER_STAFF: { ar: 'موظف موزع', en: 'Distributor Staff' },
};

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const BASE = '/api/v1/admin/dashboard';

const Dashboard: React.FC = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [subscriptionSummary, setSubscriptionSummary] = useState<SubscriptionSummary | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [adSubscriptionStats, setAdSubscriptionStats] = useState<AdSubscriptionStats | null>(null);
  const [pendingCounts, setPendingCounts] = useState<PendingCounts | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrderSummary[]>([]);
  const [recentComplaints, setRecentComplaints] = useState<RecentComplaintSummary[]>([]);
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [historicalSubscriptions, setHistoricalSubscriptions] = useState<HistoricalSub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get<SubscriptionSummary>(`${BASE}/subscription-summary`),
      api.get<UserStats>(`${BASE}/user-stats`),
      api.get<AdSubscriptionStats>(`${BASE}/ad-subscription-stats`),
      api.get<PendingCounts>(`${BASE}/pending-counts`),
      api.get<DashboardStats>(`${BASE}/stats`),
      api.get<DashboardCharts>(`${BASE}/charts`),
      api.get<RecentOrderSummary[]>(`${BASE}/recent-orders`),
      api.get<RecentComplaintSummary[]>(`${BASE}/recent-complaints`),
      api.get<DashboardCounts>(`${BASE}/counts`),
      api.get<HistoricalSub[]>(`${BASE}/historical-subscriptions`),
    ])
      .then(
        ([
          sub,
          users,
          ads,
          pending,
          stats,
          chartsData,
          orders,
          complaints,
          countsData,
          historical,
        ]) => {
          if (cancelled) return;
          setSubscriptionSummary(sub ?? null);
          setUserStats(users ?? null);
          setAdSubscriptionStats(ads ?? null);
          setPendingCounts(pending ?? null);
          setDashboardStats(stats ?? null);
          setCharts(chartsData ?? null);
          setRecentOrders(Array.isArray(orders) ? orders : []);
          setRecentComplaints(Array.isArray(complaints) ? complaints : []);
          setCounts(countsData ?? null);
          setHistoricalSubscriptions(Array.isArray(historical) ? historical : []);
        }
      )
      .catch(() => {
        if (!cancelled) {
          setSubscriptionSummary(null);
          setUserStats(null);
          setAdSubscriptionStats(null);
          setPendingCounts(null);
          setDashboardStats(null);
          setCharts(null);
          setRecentOrders([]);
          setRecentComplaints([]);
          setCounts(null);
          setHistoricalSubscriptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const orderStatusLabel = (name: string) =>
    lang === 'ar' ? ORDER_STATUS_LABELS[name]?.ar ?? name : ORDER_STATUS_LABELS[name]?.en ?? name;
  const roleLabel = (name: string) =>
    lang === 'ar' ? ROLE_LABELS[name]?.ar ?? name : ROLE_LABELS[name]?.en ?? name;

  const ordersChartData = charts?.ordersOverTime?.map((p) => ({ name: p.label, orders: p.value })) ?? [];
  const subscriptionsChartData =
    charts?.subscriptionsOverTime?.map((p) => ({ name: p.label, subscriptions: p.value })) ?? [];
  const revenueChartData = charts?.revenueOverTime?.map((p) => ({ name: p.label, revenue: p.value })) ?? [];
  const areaChartData = (() => {
    const map = new Map<string, { name: string; orders: number; subscriptions: number }>();
    ordersChartData.forEach((o) => map.set(o.name, { name: o.name, orders: o.orders, subscriptions: 0 }));
    subscriptionsChartData.forEach((s) => {
      const e = map.get(s.name) ?? { name: s.name, orders: 0, subscriptions: 0 };
      e.subscriptions = s.subscriptions;
      map.set(s.name, e);
    });
    return Array.from(map.values());
  })();
  const ordersPieData =
    charts?.ordersByStatus
      ?.filter((s) => s.value > 0)
      .map((s, i) => ({ ...s, name: orderStatusLabel(s.name), color: CHART_COLORS[i % CHART_COLORS.length] })) ?? [];
  const usersPieData =
    charts?.usersByRole
      ?.filter((s) => s.value > 0)
      .map((s, i) => ({ ...s, name: roleLabel(s.name), color: CHART_COLORS[i % CHART_COLORS.length] })) ?? [];
  const ordersTotal = ordersPieData.reduce((a, b) => a + (b.value || 0), 0);
  const usersTotal = usersPieData.reduce((a, b) => a + (b.value || 0), 0);
  const ordersLegend = ordersPieData.map((s) => ({
    ...s,
    percent: ordersTotal ? Math.round((s.value / ordersTotal) * 100) : 0,
  }));
  const usersLegend = usersPieData.map((s) => ({
    ...s,
    percent: usersTotal ? Math.round((s.value / usersTotal) * 100) : 0,
  }));

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div
      className={`w-full py-6 flex flex-col gap-8 font-display animate-in fade-in slide-in-from-bottom-4 duration-700 ${lang === 'ar' ? '' : ''}`}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-slate-200 dark:bg-slate-700 h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Row 1: Main KPIs — Orders, Users, Revenue, Subscriptions */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              className="rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 p-5 text-white shadow-lg shadow-indigo-500/25 cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02]"
              onClick={() => navigate('/orders')}
            >
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-white/15 p-3">
                  <span className="material-symbols-outlined text-3xl">receipt_long</span>
                </div>
                <span className="text-3xl font-black tabular-nums">
                  {dashboardStats?.totalOrders ?? 0}
                </span>
              </div>
              <p className="text-sm font-bold text-white/90 mt-2">
                {lang === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}
              </p>
              <p className="text-xs text-white/70 mt-0.5">
                {lang === 'ar' ? 'هذا الشهر' : 'This month'}: {dashboardStats?.ordersThisMonth ?? 0} (
                {(dashboardStats?.monthlyGrowthPercentage ?? 0).toFixed(1)}%)
              </p>
            </div>

            <div
              className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-lg shadow-emerald-500/25 cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02]"
              onClick={() => navigate('/users')}
            >
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-white/15 p-3">
                  <span className="material-symbols-outlined text-3xl">groups</span>
                </div>
                <span className="text-3xl font-black tabular-nums">{userStats?.totalUsers ?? 0}</span>
              </div>
              <p className="text-sm font-bold text-white/90 mt-2">
                {lang === 'ar' ? 'المستخدمون' : 'Users'}
              </p>
              <p className="text-xs text-white/70 mt-0.5">
                {userStats?.totalSuppliers ?? 0} {lang === 'ar' ? 'موزع' : 'distributors'} ·{' '}
                {userStats?.totalCustomers ?? 0} {lang === 'ar' ? 'عميل' : 'customers'}
              </p>
            </div>

            <div
              className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-lg shadow-amber-500/25 cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02]"
              onClick={() => navigate('/plans')}
            >
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-white/15 p-3">
                  <span className="material-symbols-outlined text-3xl">payments</span>
                </div>
                <span className="text-2xl font-black tabular-nums">
                  {formatCurrency(counts?.totalSubscriptionRevenue ?? 0)}
                </span>
              </div>
              <p className="text-sm font-bold text-white/90 mt-2">
                {lang === 'ar' ? 'إيراد الاشتراكات' : 'Subscription Revenue'}
              </p>
              <p className="text-xs text-white/70 mt-0.5">
                {lang === 'ar' ? 'هذا الشهر' : 'This month'}: {formatCurrency(counts?.subscriptionRevenueThisMonth ?? 0)} EGP
              </p>
            </div>

            <div
              className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 p-5 text-white shadow-lg shadow-violet-500/25 cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02]"
              onClick={() => navigate('/plans')}
            >
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-white/15 p-3">
                  <span className="material-symbols-outlined text-3xl">subscriptions</span>
                </div>
                <span className="text-3xl font-black tabular-nums">
                  {subscriptionSummary?.activeSubscriptions ?? 0}
                </span>
              </div>
              <p className="text-sm font-bold text-white/90 mt-2">
                {lang === 'ar' ? 'اشتراكات نشطة' : 'Active Subscriptions'}
              </p>
              <p className="text-xs text-white/70 mt-0.5">
                {pendingCounts?.pendingSubscriptions ?? 0} {lang === 'ar' ? 'في الانتظار' : 'pending'}
              </p>
            </div>
          </div>

          {/* Row 2: Secondary KPIs — Products, Categories, Ads, Complaints, Market */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div
              className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => navigate('/categories')}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">inventory_2</span>
                </div>
                <div>
                  <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                    {counts?.totalProducts ?? 0}
                  </p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {lang === 'ar' ? 'منتجات' : 'Products'}
                  </p>
                </div>
              </div>
            </div>
            <div
              className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => navigate('/categories')}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/30 p-2">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-xl">category</span>
                </div>
                <div>
                  <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                    {(counts?.totalCategories ?? 0) + (counts?.totalSubCategories ?? 0)}
                  </p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {lang === 'ar' ? 'تصنيفات' : 'Categories'}
                  </p>
                </div>
              </div>
            </div>
            <div
              className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => navigate('/ad-packages')}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-teal-100 dark:bg-teal-900/30 p-2">
                  <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-xl">campaign</span>
                </div>
                <div>
                  <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                    {adSubscriptionStats?.activeAdSubscriptions ?? 0}
                  </p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {lang === 'ar' ? 'إعلانات نشطة' : 'Active Ads'}
                  </p>
                </div>
              </div>
            </div>
            <div
              className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => navigate('/support')}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-rose-100 dark:bg-rose-900/30 p-2">
                  <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-xl">support_agent</span>
                </div>
                <div>
                  <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                    {counts?.totalComplaints ?? 0}
                  </p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {lang === 'ar' ? 'شكاوى' : 'Complaints'}
                  </p>
                  {(counts?.openComplaints ?? 0) > 0 && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                      {counts.openComplaints} {lang === 'ar' ? 'مفتوحة' : 'open'}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div
              className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => navigate('/market-requests')}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2">
                  <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-xl">request_quote</span>
                </div>
                <div>
                  <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                    {counts?.totalPosts ?? 0}
                  </p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {lang === 'ar' ? 'طلبات السوق' : 'Market Requests'}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-100 dark:bg-slate-700 p-2">
                  <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 text-xl">notifications</span>
                </div>
                <div>
                  <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                    {counts?.totalNotifications ?? 0}
                  </p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {lang === 'ar' ? 'إشعارات' : 'Notifications'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
                {lang === 'ar' ? 'الطلبات والاشتراكات (آخر 6 أشهر)' : 'Orders & Subscriptions (Last 6 Months)'}
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaChartData}>
                    <defs>
                      <linearGradient id="colorOrdersAdmin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSubsAdmin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-slate-500" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-slate-500" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '14px',
                        border: 'none',
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                        backgroundColor: '#0f172a',
                        color: '#fff',
                        fontWeight: 900,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fill="url(#colorOrdersAdmin)"
                      animationDuration={1800}
                      name={lang === 'ar' ? 'طلبات' : 'Orders'}
                    />
                    <Area
                      type="monotone"
                      dataKey="subscriptions"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#colorSubsAdmin)"
                      animationDuration={1800}
                      name={lang === 'ar' ? 'اشتراكات' : 'Subscriptions'}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
                {lang === 'ar' ? 'إيراد الاشتراكات (آخر 6 أشهر)' : 'Subscription Revenue (Last 6 Months)'}
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChartData} barSize={40}>
                    <defs>
                      <linearGradient id="colorRevenueAdmin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.85}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.25}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-slate-500" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-slate-500" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '14px',
                        border: 'none',
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                        backgroundColor: '#0f172a',
                        color: '#fff',
                        fontWeight: 900,
                      }}
                      formatter={(value: number) => [formatCurrency(value) + ' EGP', lang === 'ar' ? 'إيراد' : 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="url(#colorRevenueAdmin)" radius={[10, 10, 4, 4]} name={lang === 'ar' ? 'إيراد' : 'Revenue'} animationDuration={1800} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
                {lang === 'ar' ? 'الطلبات حسب الحالة' : 'Orders by Status'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="order-2 md:order-1 space-y-3">
                  {ordersPieData.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-block size-2 rounded-full" style={{ backgroundColor: s.color }}></span>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">{s.name}</span>
                      </div>
                      <span className="text-sm font-black tabular-nums" style={{ color: s.color }}>{s.value}</span>
                    </div>
                  ))}
                </div>
                <div className="h-72 flex justify-center order-1 md:order-2">
                {ordersPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ordersPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius={95}
                        paddingAngle={6}
                        cornerRadius={8}
                        isAnimationActive
                        animationDuration={1200}
                        labelLine={false}
                      >
                        {ordersPieData.map((_, index) => (
                          <Cell key={index} fill={ordersPieData[index].color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, lang === 'ar' ? 'عدد' : 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 self-center">{lang === 'ar' ? 'لا توجد بيانات' : 'No data'}</p>
                )}
                <div className="pointer-events-none absolute self-center justify-self-center flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-black tabular-nums">{ordersTotal}</div>
                    <div className="text-[10px] font-black text-slate-400">{lang === 'ar' ? 'إجمالي' : 'Total'}</div>
                  </div>
                </div>
                </div>
              </div>
              {ordersLegend.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3 justify-center">
                  {ordersLegend.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
                      <span className="inline-block size-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-black text-slate-600 dark:text-slate-300">{item.name}</span>
                      <span className="text-xs font-black tabular-nums" style={{ color: item.color }}>{item.percent}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
                {lang === 'ar' ? 'المستخدمون حسب الدور' : 'Users by Role'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="order-2 md:order-1 space-y-3">
                  {usersPieData.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-block size-2 rounded-full" style={{ backgroundColor: s.color }}></span>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">{s.name}</span>
                      </div>
                      <span className="text-sm font-black tabular-nums" style={{ color: s.color }}>{s.value}</span>
                    </div>
                  ))}
                </div>
                <div className="h-72 flex justify-center order-1 md:order-2">
                {usersPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={usersPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius={95}
                        paddingAngle={6}
                        cornerRadius={8}
                        isAnimationActive
                        animationDuration={1200}
                        labelLine={false}
                      >
                        {usersPieData.map((_, index) => (
                          <Cell key={index} fill={usersPieData[index].color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, lang === 'ar' ? 'عدد' : 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 self-center">{lang === 'ar' ? 'لا توجد بيانات' : 'No data'}</p>
                )}
                <div className="pointer-events-none absolute self-center justify-self-center flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-black tabular-nums">{usersTotal}</div>
                    <div className="text-[10px] font-black text-slate-400">{lang === 'ar' ? 'إجمالي' : 'Total'}</div>
                  </div>
                </div>
                </div>
              </div>
              {usersLegend.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3 justify-center">
                  {usersLegend.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
                      <span className="inline-block size-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-black text-slate-600 dark:text-slate-300">{item.name}</span>
                      <span className="text-xs font-black tabular-nums" style={{ color: item.color }}>{item.percent}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent orders & complaints */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'أحدث الطلبات' : 'Recent Orders'}
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('/orders')}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  {lang === 'ar' ? 'عرض الكل' : 'View all'}
                </button>
              </div>
              <div className="overflow-x-auto max-h-80">
                {recentOrders?.length ? (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400">
                          {lang === 'ar' ? 'الحالة' : 'Status'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400">
                          {lang === 'ar' ? 'العميل' : 'Customer'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400">
                          {lang === 'ar' ? 'التاريخ' : 'Date'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {recentOrders.slice(0, 10).map((o) => (
                        <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{o.orderNumber}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-bold ${
                                o.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : o.status === 'CANCELLED'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              }`}
                            >
                              {orderStatusLabel(o.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                            {o.userName || o.organizationName || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                            {o.createdAt ? new Date(o.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-6 text-slate-400 text-sm">{lang === 'ar' ? 'لا توجد طلبات حديثة' : 'No recent orders'}</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'أحدث الشكاوى' : 'Recent Complaints'}
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('/support')}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  {lang === 'ar' ? 'عرض الكل' : 'View all'}
                </button>
              </div>
              <div className="overflow-x-auto max-h-80">
                {recentComplaints?.length ? (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400">
                          {lang === 'ar' ? 'الموضوع' : 'Subject'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400">
                          {lang === 'ar' ? 'الحالة' : 'Status'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400">
                          {lang === 'ar' ? 'التاريخ' : 'Date'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {recentComplaints.slice(0, 10).map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                            {c.subject || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-bold ${
                                c.status === 'OPEN'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {c.status === 'OPEN' ? (lang === 'ar' ? 'مفتوحة' : 'Open') : lang === 'ar' ? 'مغلقة' : 'Closed'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-6 text-slate-400 text-sm">{lang === 'ar' ? 'لا توجد شكاوى حديثة' : 'No recent complaints'}</p>
                )}
              </div>
            </div>
          </div>
        </>
      )      }

      {/* Historical subscriptions */}
      {loading ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 h-64 animate-pulse" />
      ) : historicalSubscriptions.length > 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
              {lang === 'ar' ? 'الاشتراكات السابقة' : 'Historical Subscriptions'}
            </h3>
            <p className="text-xs text-slate-400 font-bold">
              {lang === 'ar' ? 'الاشتراكات القديمة عند تجديد المستخدمين' : 'Old subscriptions when users renew'}
            </p>
          </div>
          <div className="overflow-x-auto table-thead-primary">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400">
                    {lang === 'ar' ? 'المستخدم' : 'User'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400">
                    {lang === 'ar' ? 'الباقة' : 'Plan'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400">
                    {lang === 'ar' ? 'السعر' : 'Price'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400">
                    {lang === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400">
                    {lang === 'ar' ? 'تاريخ الطلب' : 'Request Date'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400">
                    {lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}
                  </th>
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
                        {sub.status === 'APPROVED'
                          ? lang === 'ar'
                            ? 'معتمد'
                            : 'Approved'
                          : sub.status === 'PENDING'
                          ? lang === 'ar'
                            ? 'قيد المراجعة'
                            : 'Pending'
                          : lang === 'ar'
                          ? 'مرفوض'
                          : 'Rejected'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                        {sub.submissionDate
                          ? new Date(sub.submissionDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')
                          : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                        {sub.expiryDate
                          ? new Date(sub.expiryDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')
                          : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Dashboard;
