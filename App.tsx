
import React, { Suspense, lazy, useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Language, translations } from './translations';
import { ToastProvider, useToast } from './contexts/ToastContext';
import Toast from './components/Toast';
import { setToastService, setSessionExpiredCallback } from './api';
import { clearSubscriptionCache } from './utils/subscription';
import { api } from './api';
import SessionExpiredModal from './components/SessionExpiredModal';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { setAlertService } from './services/alerts';
import { navigateToNotificationTarget } from './utils/notificationNavigation';

interface UserData {
  token: string;
  role: string;
  name?: string;
  userInfo?: {
    id: string;
    role: string;
    name: string;
    email: string;
    subscription: any | null;
    [key: string]: any;
  };
  [key: string]: any;
}

interface AppContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: any;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./pages/super_admin/Dashboard'));
const Plans = lazy(() => import('./pages/super_admin/Plans'));
const Approvals = lazy(() => import('./pages/super_admin/Approvals'));
const Categories = lazy(() => import('./pages/super_admin/Categories'));
const Suppliers = lazy(() => import('./pages/super_admin/Suppliers'));
const Customers = lazy(() => import('./pages/super_admin/Customers'));
const AdPackages = lazy(() => import('./pages/super_admin/AdPackages'));
const AdminManagement = lazy(() => import('./pages/super_admin/AdminManagement'));
const PaymentInfo = lazy(() => import('./pages/super_admin/PaymentInfo'));
const Orders = lazy(() => import('./pages/shared/Orders'));
const SupplierOrders = lazy(() => import('./pages/supplier/SupplierOrders'));
const SpecialOffers = lazy(() => import('./pages/supplier/SpecialOffers'));
const Profile = lazy(() => import('./pages/shared/Profile'));
const Login = lazy(() => import('./pages/auth/Login'));
const Landing = lazy(() => import('./pages/auth/Landing'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const PlanSelection = lazy(() => import('./pages/shared/PlanSelection'));
const CustomerDashboard = lazy(() => import('./pages/customer/Dashboard'));
const SupplierDashboard = lazy(() => import('./pages/supplier/Dashboard'));
const ViewSpecialOffers = lazy(() => import('./pages/customer/ViewSpecialOffers'));
const MyTeam = lazy(() => import('./pages/shared/MyTeam'));
const Products = lazy(() => import('./pages/supplier/Products'));
const PolicyManagement = lazy(() => import('./pages/super_admin/PolicyManagement'));
const SupplierAdPackages = lazy(() => import('./pages/supplier/AdPackages'));
const AdvancedReports = lazy(() => import('./pages/supplier/AdvancedReports'));
const Advertisements = lazy(() => import('./pages/shared/Advertisements'));
const Vendors = lazy(() => import('./pages/customer/Vendors'));
const ProductSearch = lazy(() => import('./pages/customer/ProductSearch'));
const Cart = lazy(() => import('./pages/customer/Cart'));
const MarketRequests = lazy(() => import('./pages/shared/MarketRequests'));
const Complaints = lazy(() => import('./pages/shared/Complaints'));

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

// Compatibility export
export const useLanguage = useApp;

const PlaceholderPage = ({ name }: { name: string }) => (
  <div className="p-10 text-center animate-in fade-in duration-500">
    <div className="size-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
      <span className="material-symbols-outlined text-4xl">construction</span>
    </div>
    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{name}</h2>
    <p className="text-slate-500 font-bold">This module is under development and will be available soon.</p>
  </div>
);

const AppLoader: React.FC = () => {
  const lang = typeof document !== 'undefined'
    ? (document.documentElement.lang || 'ar')
    : 'ar';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
          {lang === 'ar' ? 'جار تحميل التطبيق...' : 'Loading application...'}
        </p>
      </div>
    </div>
  );
};

const scheduleBackgroundTask = (task: () => void | Promise<void>, delay = 800) => {
  if (typeof window === 'undefined') {
    void Promise.resolve().then(task);
    return () => { };
  }

  let cancelled = false;
  let timeoutId: number | undefined;
  let idleId: number | undefined;

  const runTask = () => {
    if (cancelled) return;
    void Promise.resolve().then(() => {
      if (!cancelled) {
        void task();
      }
    });
  };

  if ('requestIdleCallback' in window) {
    idleId = window.requestIdleCallback(runTask, { timeout: Math.max(delay, 1500) });
  } else {
    timeoutId = window.setTimeout(runTask, delay);
  }

  return () => {
    cancelled = true;
    if (idleId !== undefined && 'cancelIdleCallback' in window) {
      window.cancelIdleCallback(idleId);
    }
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  };
};

const markNotificationAsRead = async (notificationId?: string) => {
  if (!notificationId) return;
  try {
    await api.patch(`/api/v1/notifications/${notificationId}/mark-read`, {});
    try { window.dispatchEvent(new CustomEvent('notificationRead')); } catch { }
  } catch { }
};

const AppContent: React.FC = () => {
  const { showToast, showAlert } = useToast() as any;
  const [user, setUser] = useState<UserData | null>(() => {
    const saved = localStorage.getItem('user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('lang') as Language) || 'ar';
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || document.documentElement.classList.contains('dark');
  });

  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);

  // Connect toast service to API
  useEffect(() => {
    setToastService(showToast);
  }, [showToast]);
  useEffect(() => {
    setAlertService(showAlert);
  }, [showAlert]);

  // Connect session expired callback to API
  useEffect(() => {
    setSessionExpiredCallback(() => {
      setShowSessionExpiredModal(true);
    });
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('lang', lang);
  }, [lang]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const data = event?.data;
      if (data?.type !== 'RN_NOTIFICATION_CLICK') return;
      void markNotificationAsRead(data?.payload?.notificationId);
      navigateToNotificationTarget(data?.payload);
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isCancelled = false;

    const setupForegroundMessages = async () => {
      try {
        const { subscribeForegroundMessages } = await import('./services/fcm');
        if (isCancelled) return;

        unsubscribe = subscribeForegroundMessages((payload: any) => {
          const d = payload?.data || {};
          const n = payload?.notification || {};
          const titleAr = d.titleAr || d.title_ar || d['title-ar'];
          const titleEn = d.titleEn || d.title_en || d['title-en'];
          const messageAr = d.messageAr || d.bodyAr || d.message_ar || d['message-ar'] || d.body_ar || d['body-ar'];
          const messageEn = d.messageEn || d.bodyEn || d.message_en || d['message-en'] || d.body_en || d['body-en'];
          let title = (lang === 'ar' ? titleAr : titleEn) || n.title || (lang === 'ar' ? 'إشعار' : 'Notification');
          let message = (lang === 'ar' ? messageAr : messageEn) || n.body || '';

          if (lang === 'ar' && (!titleAr || !messageAr)) {
            const type = String(d.type || '').toUpperCase();
            const supplier = d.supplierName || d.supplier || '';
            const product = d.productName || d.product || '';
            const orderCode = d.orderCode || d.orderId || '';
            if (type === 'RFQ_RESPONSE') {
              title = 'تلقي رد المورد';
              message = supplier
                ? `قام ${supplier} بالرد على طلبك${product ? ` لـ ${product}` : ''}`
                : 'تم استلام رد من المورد على طلبك';
            } else if (type === 'ORDER_CREATED') {
              title = 'تم إنشاء الطلب';
              message = orderCode ? `تم إنشاء الطلب رقم ${orderCode}` : 'تم إنشاء طلب جديد';
            } else if (type === 'QUOTATION_SENT') {
              title = 'تم إرسال عرض السعر';
              message = supplier
                ? `قام ${supplier} بإرسال عرض سعر${product ? ` لـ ${product}` : ''}`
                : 'تم إرسال عرض سعر جديد';
            } else if (type === 'QUOTATION_ACCEPTED') {
              title = 'تم قبول عرض السعر';
              message = supplier ? `تم قبول عرض ${supplier}` : 'تم قبول عرض السعر';
            } else if (type === 'QUOTATION_REJECTED') {
              title = 'تم رفض عرض السعر';
              message = supplier ? `تم رفض عرض ${supplier}` : 'تم رفض عرض السعر';
            } else if (type === 'ORDER_STATUS_UPDATED') {
              title = 'تم تحديث حالة الطلب';
              message = orderCode ? `تم تحديث حالة الطلب رقم ${orderCode}` : 'تم تحديث حالة أحد الطلبات';
            }
          }

          showAlert({
            title,
            message,
            type: 'info',
            duration: 8000,
            actions: [
              {
                label: lang === 'ar' ? 'فتح' : 'Open',
                onClick: () => {
                  void markNotificationAsRead(payload?.data?.notificationId || payload?.notificationId);
                  navigateToNotificationTarget({
                    notificationId: payload?.data?.notificationId || payload?.notificationId,
                    type: d.type || payload?.type,
                    relatedEntityId: d.relatedEntityId || payload?.relatedEntityId,
                    relatedEntityType: d.relatedEntityType || payload?.relatedEntityType,
                    metadata: d.metadata || payload?.metadata,
                    path: d.path || payload?.path,
                    route: d.route || payload?.route,
                    url: d.url || payload?.url,
                    screen: d.screen || payload?.screen
                  });
                }
              }
            ]
          });
        });
      } catch { }
    };

    const cancelScheduledSetup = scheduleBackgroundTask(setupForegroundMessages, 1200);

    return () => {
      isCancelled = true;
      cancelScheduledSetup();
      try { unsubscribe?.(); } catch { }
    };
  }, [lang, showAlert]);

  useEffect(() => {
    const uid = user?.userInfo?.id || user?.id;
    const token = user?.token;
    if (!uid || !token) return;
    let teardown: (() => void) | undefined;
    let isCancelled = false;

    const setupNotificationService = async () => {
      try {
        const {
          initNotificationService,
          disconnectNotificationService,
          playNotificationSound
        } = await import('./services/notificationService');
        if (isCancelled) return;

        const unsub = initNotificationService(uid, token, lang);
        const handler = (e: any) => {
          const n = e?.detail || {};
          const title = lang === 'ar' ? (n.titleAr || n.titleEn || 'إشعار') : (n.titleEn || n.titleAr || 'Notification');
          const message = lang === 'ar' ? (n.messageAr || n.messageEn || '') : (n.messageEn || n.messageAr || '');
          showAlert({
            title,
            message,
            type: 'info',
            duration: 8000,
            actions: [
              {
                label: lang === 'ar' ? 'فتح' : 'Open',
                onClick: () => {
                  void markNotificationAsRead(n.id);
                  navigateToNotificationTarget(n);
                }
              }
            ]
          });
        };
        const chatHandler = (e: any) => {
          const d = e?.detail || {};
          const m = d.message || {};
          let shouldSuppress = false;
          try {
            const activeOrder = (window as any).__activeOrderChatId;
            const activeComplaint = (window as any).__activeComplaintId;
            const isSameChat = (d.kind === 'order' && activeOrder && activeOrder === d.orderId) ||
              (d.kind === 'order-line' && activeOrder && activeOrder === d.lineId) ||
              (d.kind === 'complaint' && activeComplaint && activeComplaint === d.complaintId);
            const hasFocus = typeof document !== 'undefined' ? (!document.hidden && document.hasFocus && document.hasFocus()) : true;
            if (isSameChat && hasFocus) shouldSuppress = true;
          } catch { }
          const from = m.userOrganizationName || m.userName || '';
          const title = lang === 'ar' ? 'رسالة جديدة' : 'New message';
          const body = `${from ? `${from}: ` : ''}${m.message || ''}`;
          if (!shouldSuppress) {
            try { playNotificationSound(); } catch { }
            showAlert({
              title,
              message: body,
              type: 'info',
              duration: 8000,
              actions: [
                {
                  label: lang === 'ar' ? 'فتح' : 'Open',
                  onClick: () => navigateToNotificationTarget({
                    kind: d.kind,
                    orderId: d.orderId,
                    lineId: d.lineId,
                    complaintId: d.complaintId
                  })
                }
              ]
            });
            try {
              if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                const tag =
                  d.kind === 'order-line'
                    ? `chat-line-${d.lineId}`
                    : d.kind === 'order'
                      ? `chat-order-${d.orderId}`
                      : `chat-complaint-${d.complaintId}`;
                const n = new Notification(title, { body, icon: '/favicon.ico', badge: '/favicon.ico', tag, silent: false });
                try {
                  n.onclick = () => {
                    try { window.focus(); } catch { }
                    navigateToNotificationTarget({
                      kind: d.kind,
                      orderId: d.orderId,
                      lineId: d.lineId,
                      complaintId: d.complaintId
                    });
                    try { n.close(); } catch { }
                  };
                } catch { }
                setTimeout(() => { try { n.close(); } catch { } }, 5000);
              }
            } catch { }
          }
        };

        window.addEventListener('newNotification', handler as any);
        window.addEventListener('newChatMessage', chatHandler as any);

        teardown = () => {
          try { unsub && (unsub as any)(); } catch { }
          window.removeEventListener('newNotification', handler as any);
          window.removeEventListener('newChatMessage', chatHandler as any);
          disconnectNotificationService();
        };
      } catch { }
    };

    const cancelScheduledSetup = scheduleBackgroundTask(setupNotificationService, 1500);

    return () => {
      isCancelled = true;
      cancelScheduledSetup();
      try { teardown?.(); } catch { }
    };
  }, [user?.userInfo?.id, user?.token, lang, showAlert]);

  const location = useLocation();
  const isAuthRoute = ['/', '/login', '/register', '/forgot-password'].includes(location.pathname);
  useEffect(() => {
    if (isAuthRoute && !user) {
      document.body.classList.add('auth-page');
    } else {
      document.body.classList.remove('auth-page');
    }
    return () => document.body.classList.remove('auth-page');
  }, [isAuthRoute, user]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleLogin = (userData: UserData) => {
    const extractedRole = userData.userInfo?.role || userData.role || 'UNKNOWN';
    const extractedName = userData.userInfo?.name || userData.name || 'User';

    const finalUser = {
      ...userData,
      role: extractedRole,
      name: extractedName,
      userInfo: userData.userInfo
    };

    localStorage.setItem('token', finalUser.token);
    localStorage.setItem('user', JSON.stringify(finalUser));
    setUser(finalUser);
  };

  useEffect(() => {
    if (!user?.token) return;
    const cancelScheduledTask = scheduleBackgroundTask(async () => {
      const { getWebPushToken, saveWebTokenToBackend } = await import('./services/fcm');
      try { console.debug('[Auto] User available, attempting web push token...'); } catch { }
      const token = await getWebPushToken();
      if (token) {
        try { console.debug('[Auto] Web push token obtained, saving...'); } catch { }
        try { await saveWebTokenToBackend(token); } finally {
          try { console.debug('[Auto] Save web token call finished'); } catch { }
        }
      } else {
        try { console.debug('[Auto] No web push token generated'); } catch { }
        try {
          if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
            const onceKey = 'rn_notif_prompted';
            if (!sessionStorage.getItem(onceKey)) {
              sessionStorage.setItem(onceKey, '1');
              showAlert({
                title: lang === 'ar' ? 'تفعيل الإشعارات' : 'Enable notifications',
                message: lang === 'ar'
                  ? 'يرجى السماح بإشعارات المتصفح حتى تستقبل التنبيهات.'
                  : 'Please allow browser notifications to receive alerts.',
                type: 'warning',
                duration: 6000
              });
            }
          }
        } catch { }
      }
    }, 2500);

    return () => {
      cancelScheduledTask();
    };
  }, [user?.token]);
  const handleLogout = () => {
    api.post('/api/v1/user/auth/logout', {}).catch(() => { });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearSubscriptionCache();
    setUser(null);
    setShowSessionExpiredModal(false);
  };

  const handleSessionExpiredClose = () => {
    handleLogout();
    // Redirect to login page
    window.location.href = '/login';
  };

  const t = translations[lang];

  const PortalContent = () => {
    if (!user) return <Navigate to="/" replace />;
    const role = (user.role || '').toUpperCase();
    const allowedScreensRaw = ((user.userInfo?.allowedScreens || user.allowedScreens || []) as string[]);
    const allowedScreens = allowedScreensRaw.map((s) => String(s || '').trim().toLowerCase());
    const isStaffRole = role === 'CUSTOMER_STAFF' || role === 'SUPPLIER_STAFF';
    const canAccess = (path: string) => !isStaffRole || allowedScreens.includes(path.toLowerCase());
    const sub = user.userInfo?.subscription;
    // Active = has subscription, (approved if status present), and not expired (no expiry or expiryDate > now)
    const hasActiveSubscription = sub && (sub.status == null || sub.status === 'APPROVED') && (!sub.expiryDate || new Date(sub.expiryDate) > new Date());
    const mustRestrictToSubscription = (role === 'CUSTOMER_OWNER' || role === 'SUPPLIER_OWNER') && !hasActiveSubscription;

    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      return (
        <Routes>
          <Route element={<Layout onLogout={handleLogout} />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/payment-info" element={<PaymentInfo />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/users" element={<Navigate to="/suppliers" replace />} />
            <Route path="/ad-packages" element={<AdPackages />} />
            <Route path="/policy-management" element={<PolicyManagement />} />
            {role === 'SUPER_ADMIN' && (
              <Route path="/admin-management" element={<AdminManagement />} />
            )}
            <Route path="/market-requests" element={<MarketRequests />} />
            <Route path="/support" element={<Complaints />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      );
    }

    // No subscription, pending, or expired: only subscription / profile / support
    if (mustRestrictToSubscription) {
      return (
        <Routes>
          <Route element={<Layout onLogout={handleLogout} />}>
            <Route path="/subscription" element={<PlanSelection />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/support" element={<Complaints />} />
            <Route path="*" element={<Navigate to="/subscription" replace />} />
          </Route>
        </Routes>
      );
    }

    if (role === 'CUSTOMER_OWNER') {
      return (
        <Routes>
          <Route element={<Layout onLogout={handleLogout} />}>
            <Route path="/" element={<CustomerDashboard />} />
            <Route path="/my-team" element={<MyTeam />} />
            <Route path="/product-search" element={<ProductSearch />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/special-offers" element={<ViewSpecialOffers />} />
            <Route path="/market-requests" element={<MarketRequests />} />
            <Route path="/support" element={<Complaints />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/subscription" element={<PlanSelection />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      );
    }

    if (role === 'SUPPLIER_OWNER') {
      return (
        <Routes>
          <Route element={<Layout onLogout={handleLogout} />}>
            <Route path="/" element={<SupplierDashboard />} />
            <Route path="/my-team" element={<MyTeam />} />
            <Route path="/products" element={<Products />} />
            <Route path="/special-offers" element={<SpecialOffers />} />
            {/* market-requests: customers only; hide from suppliers */}
            <Route path="/support" element={<Complaints />} />
            <Route path="/orders" element={<SupplierOrders />} />
            <Route path="/ad-packages" element={<SupplierAdPackages />} />
            <Route path="/advertisements" element={<Advertisements />} />
            <Route path="/advanced-reports" element={<AdvancedReports />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/subscription" element={<PlanSelection />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      );
    }

    if (role === 'CUSTOMER_STAFF') {
      return (
        <Routes>
          <Route element={<Layout onLogout={handleLogout} />}>
            <Route path="/" element={canAccess('/') ? <CustomerDashboard /> : <Navigate to="/profile" replace />} />
            <Route path="/product-search" element={canAccess('/product-search') ? <ProductSearch /> : <Navigate to="/" replace />} />
            <Route path="/vendors" element={canAccess('/vendors') ? <Vendors /> : <Navigate to="/" replace />} />
            <Route path="/special-offers" element={canAccess('/special-offers') ? <ViewSpecialOffers /> : <Navigate to="/" replace />} />
            {/* market-requests: customers only; hide from suppliers staff */}
            <Route path="/support" element={canAccess('/support') ? <Complaints /> : <Navigate to="/" replace />} />
            <Route path="/cart" element={canAccess('/cart') ? <Cart /> : <Navigate to="/" replace />} />
            <Route path="/profile" element={canAccess('/profile') ? <Profile /> : <Navigate to="/" replace />} />
            <Route path="/orders" element={canAccess('/orders') ? <Orders /> : <Navigate to="/" replace />} />
            <Route path="/my-team" element={canAccess('/my-team') ? <MyTeam /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      );
    }

    if (role === 'SUPPLIER_STAFF') {
      return (
        <Routes>
          <Route element={<Layout onLogout={handleLogout} />}>
            <Route path="/" element={canAccess('/') ? <SupplierDashboard /> : <Navigate to="/profile" replace />} />
            <Route path="/products" element={canAccess('/products') ? <Products /> : <Navigate to="/" replace />} />
            <Route path="/special-offers" element={canAccess('/special-offers') ? <SpecialOffers /> : <Navigate to="/" replace />} />
            {/* market-requests: customers only; hide from suppliers staff */}
            <Route path="/support" element={canAccess('/support') ? <Complaints /> : <Navigate to="/" replace />} />
            <Route path="/orders" element={canAccess('/orders') ? <SupplierOrders /> : <Navigate to="/" replace />} />
            <Route path="/ad-packages" element={canAccess('/ad-packages') ? <SupplierAdPackages /> : <Navigate to="/" replace />} />
            <Route path="/advertisements" element={canAccess('/advertisements') ? <Advertisements /> : <Navigate to="/" replace />} />
            <Route path="/advanced-reports" element={canAccess('/advanced-reports') ? <AdvancedReports /> : <Navigate to="/" replace />} />
            <Route path="/profile" element={canAccess('/profile') ? <Profile /> : <Navigate to="/" replace />} />
            <Route path="/my-team" element={canAccess('/my-team') ? <MyTeam /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      );
    }

    return (
      <Routes>
        <Route element={<Layout onLogout={handleLogout} />}>
          <Route path="/" element={role.includes('CUSTOMER') ? <CustomerDashboard /> : <SupplierDashboard />} />
          {/* market-requests accessible for customers only; default unreachable here */}
          <Route path="/support" element={<Complaints />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  };

  return (
    <AppContext.Provider value={{ lang, setLang, t, isDarkMode, toggleDarkMode }}>
      <ConfirmProvider>
        <Toast />
        <SessionExpiredModal
          isOpen={showSessionExpiredModal}
          onClose={handleSessionExpiredClose}
          lang={lang}
        />
        <Suspense fallback={<AppLoader />}>
          <Routes>
            <Route path="/" element={!user ? <Landing isLoggedIn={!!user} /> : <PortalContent />} />
            <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" replace />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />
            <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/" replace />} />
            <Route path="*" element={<PortalContent />} />
          </Routes>
        </Suspense>
      </ConfirmProvider>
    </AppContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;
