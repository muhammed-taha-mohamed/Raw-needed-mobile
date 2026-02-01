
import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/super_admin/Dashboard';
import Plans from './pages/super_admin/Plans';
import Approvals from './pages/super_admin/Approvals';
import Categories from './pages/super_admin/Categories';
import Analytics from './pages/super_admin/Analytics';
import Users from './pages/super_admin/Users';
import PaymentInfo from './pages/super_admin/PaymentInfo';
import Orders from './pages/shared/Orders';
import SupplierOrders from './pages/supplier/SupplierOrders';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import PlanSelection from './pages/shared/PlanSelection';
import CustomerDashboard from './pages/customer/Dashboard';
import SupplierDashboard from './pages/supplier/Dashboard';
import MyTeam from './pages/shared/MyTeam';
import Products from './pages/supplier/Products';
import Vendors from './pages/customer/Vendors';
import ProductSearch from './pages/customer/ProductSearch';
import Cart from './pages/customer/Cart';
import MarketRequests from './pages/shared/MarketRequests';
import Complaints from './pages/shared/Complaints';
import { Language, translations } from './translations';

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

const App: React.FC = () => {
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const t = translations[lang];

  const PortalContent = () => {
    if (!user) return <Navigate to="/" replace />;
    const role = (user.role || '').toUpperCase();
    const hasSubscription = !!user.userInfo?.subscription;
    
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
            <Route path="/users" element={<Users />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/market-requests" element={<MarketRequests />} />
            <Route path="/support" element={<Complaints />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      );
    }

    if (!hasSubscription && (role === 'CUSTOMER_OWNER' || role === 'SUPPLIER_OWNER')) {
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
            <Route path="/market-requests" element={<MarketRequests />} />
            <Route path="/support" element={<Complaints />} />
            <Route path="/orders" element={<SupplierOrders />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/subscription" element={<PlanSelection />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      );
    }

    return (
      <Routes>
        <Route element={<Layout onLogout={handleLogout} />}>
          <Route path="/" element={role.includes('CUSTOMER') ? <CustomerDashboard /> : <SupplierDashboard />} />
          <Route path="/market-requests" element={<MarketRequests />} />
          <Route path="/support" element={<Complaints />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  };

  return (
    <AppContext.Provider value={{ lang, setLang, t, isDarkMode, toggleDarkMode }}>
      <Routes>
        <Route path="/" element={!user ? <Landing isLoggedIn={!!user} /> : <PortalContent />} />
        <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" replace />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />
        <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/" replace />} />
        <Route path="*" element={<PortalContent />} />
      </Routes>
    </AppContext.Provider>
  );
};

export default App;
