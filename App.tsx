
import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/super_admin/Dashboard';
import Plans from './pages/super_admin/Plans';
import Approvals from './pages/super_admin/Approvals';
import Categories from './pages/super_admin/Categories';
import Suppliers from './pages/super_admin/Suppliers';
import Customers from './pages/super_admin/Customers';
import AdPackages from './pages/super_admin/AdPackages';
import AdminManagement from './pages/super_admin/AdminManagement';
import PaymentInfo from './pages/super_admin/PaymentInfo';
import Orders from './pages/shared/Orders';
import SupplierOrders from './pages/supplier/SupplierOrders';
import SpecialOffers from './pages/supplier/SpecialOffers';
import Profile from './pages/shared/Profile';
import Login from './pages/auth/Login';
import Landing from './pages/auth/Landing';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import PlanSelection from './pages/shared/PlanSelection';
import CustomerDashboard from './pages/customer/Dashboard';
import SupplierDashboard from './pages/supplier/Dashboard';
import ViewSpecialOffers from './pages/customer/ViewSpecialOffers';
import MyTeam from './pages/shared/MyTeam';
import Products from './pages/supplier/Products';
import PolicyManagement from './pages/super_admin/PolicyManagement';
import SupplierAdPackages from './pages/supplier/AdPackages';
import AdvancedReports from './pages/supplier/AdvancedReports';
import Advertisements from './pages/shared/Advertisements';
import Vendors from './pages/customer/Vendors';
import ProductSearch from './pages/customer/ProductSearch';
import Cart from './pages/customer/Cart';
import MarketRequests from './pages/shared/MarketRequests';
import Complaints from './pages/shared/Complaints';
import { Language, translations } from './translations';
import { ToastProvider, useToast } from './contexts/ToastContext';
import Toast from './components/Toast';
import { setToastService, setSessionExpiredCallback } from './api';
import { clearSubscriptionCache } from './utils/subscription';
import { api } from './api';
import SessionExpiredModal from './components/SessionExpiredModal';
import { getWebPushToken, saveWebTokenToBackend } from './services/fcm';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { setAlertService } from './services/alerts';
import { subscribeForegroundMessages } from './services/fcm';
import { initNotificationService, disconnectNotificationService, playNotificationSound } from './services/notificationService';

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
    subscribeForegroundMessages((payload: any) => {
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

      showAlert({ title, message, type: 'info', duration: 8000 });
    });
  }, [lang, showAlert]);

  useEffect(() => {
    const uid = user?.userInfo?.id || user?.id;
    const token = user?.token;
    if (!uid || !token) return;
    const unsub = initNotificationService(uid, token, lang);
    const handler = (e: any) => {
      const n = e?.detail || {};
      const title = lang === 'ar' ? (n.titleAr || n.titleEn || 'إشعار') : (n.titleEn || n.titleAr || 'Notification');
      const message = lang === 'ar' ? (n.messageAr || n.messageEn || '') : (n.messageEn || n.messageAr || '');
      showAlert({ title, message, type: 'info', duration: 8000 });
    };
    window.addEventListener('newNotification', handler as any);
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
      const body = lang === 'ar'
        ? `${from ? from + ': ' : ''}${m.message || ''}`
        : `${from ? from + ': ' : ''}${m.message || ''}`;
      if (!shouldSuppress) {
        try { playNotificationSound(); } catch { }
        showAlert({ title, message: body, type: 'info', duration: 8000 });
        try {
          if (typeof Notification !== 'undefined') {
            if (Notification.permission === 'granted') {
              const tag = d.kind === 'order' ? `chat-order-${d.orderId}` : `chat-complaint-${d.complaintId}`;
              const n = new Notification(title, { body, icon: '/favicon.ico', badge: '/favicon.ico', tag, silent: false });
              try { n.onclick = () => { try { window.focus(); } catch { } try { n.close(); } catch { } }; } catch { }
              setTimeout(() => { try { n.close(); } catch { } }, 5000);
            }
          }
        } catch { }
      }
    };
    window.addEventListener('newChatMessage', chatHandler as any);
    return () => {
      try { unsub && (unsub as any)(); } catch { }
      window.removeEventListener('newNotification', handler as any);
      window.removeEventListener('newChatMessage', chatHandler as any);
      disconnectNotificationService();
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
    (async () => {
      try { console.debug('[Login] Attempting to obtain web push token...'); } catch { }
      const token = await getWebPushToken();
      if (token) {
        try { console.debug('[Login] Web push token obtained, saving...'); } catch { }
        try { await saveWebTokenToBackend(token); } finally {
          try { console.debug('[Login] Save web token call finished'); } catch { }
        }
      } else {
        try { console.debug('[Login] No web push token generated'); } catch { }
        try {
          if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
            showAlert({
              title: lang === 'ar' ? 'تفعيل الإشعارات' : 'Enable notifications',
              message: lang === 'ar'
                ? 'يرجى السماح بإشعارات المتصفح حتى تستقبل التنبيهات.'
                : 'Please allow browser notifications to receive alerts.',
              type: 'warning',
              duration: 6000
            });
          }
        } catch { }
      }
    })();
  };

  useEffect(() => {
    if (!user?.token) return;
    (async () => {
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
    })();
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
        <Routes>
          <Route path="/" element={!user ? <Landing isLoggedIn={!!user} /> : <PortalContent />} />
          <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" replace />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />
          <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/" replace />} />
          <Route path="*" element={<PortalContent />} />
        </Routes>
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
