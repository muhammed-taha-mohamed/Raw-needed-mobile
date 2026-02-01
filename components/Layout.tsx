
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useApp } from '../App';
import { api } from '../api';
import RecentNotifications from './RecentNotifications';

interface LayoutProps {
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ onLogout }) => {
  const { lang, setLang, t, isDarkMode, toggleDarkMode } = useApp();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [userData, setUserData] = useState<any>(null);
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      setUserData(JSON.parse(user));
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    fetchUnreadCount();

    const handleNotifRead = () => fetchUnreadCount();
    window.addEventListener('notificationRead', handleNotifRead);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('notificationRead', handleNotifRead);
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const data = await api.get<{ count: number, success: boolean }>('/api/v1/notifications/user/unread-count');
      setUnreadCount(data.count || 0);
    } catch (e) {}
  };

  const role = (userData?.role || '').toUpperCase();
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isCustomer = role.includes('CUSTOMER');
  const isSupplier = role.includes('SUPPLIER');
  const isStaff = role.includes('STAFF');
  
  const allowedScreens = useMemo(() => {
    return userData?.userInfo?.allowedScreens || userData?.allowedScreens || [];
  }, [userData]);

  const sidebarNavItems = useMemo(() => {
    if (isAdmin) {
      return [
        { name: lang === 'ar' ? 'لوحة القيادة' : 'Dashboard', icon: 'grid_view', path: '/' },
        { name: lang === 'ar' ? 'الخطط' : 'Plans', icon: 'loyalty', path: '/plans' },
        { name: lang === 'ar' ? 'معلومات الدفع' : 'Payment Info', icon: 'payments', path: '/payment-info' },
        { name: lang === 'ar' ? 'الفئات' : 'Categories', icon: 'category', path: '/categories' },
        { name: lang === 'ar' ? 'الموافقات' : 'Verified', icon: 'verified', path: '/approvals' },
        { name: lang === 'ar' ? 'المستخدمين' : 'Users', icon: 'group', path: '/users' },
        { name: lang === 'ar' ? 'التحليلات' : 'Analytics', icon: 'analytics', path: '/analytics' },
        { name: lang === 'ar' ? 'الدعم' : 'Support', icon: 'support_agent', path: '/support' },
        { name: lang === 'ar' ? 'حسابي' : 'Profile', icon: 'person', path: '/profile' },
      ];
    }
    
    const items = [
      { name: lang === 'ar' ? 'لوحة القيادة' : 'Dashboard', icon: 'grid_view', path: '/' },
      { name: lang === 'ar' ? 'السوق' : 'Marketplace', icon: 'explore', path: '/product-search' },
      { name: lang === 'ar' ? 'الموردون' : 'Vendors', icon: 'storefront', path: '/vendors' },
      { name: lang === 'ar' ? 'العربة' : 'Cart', icon: 'shopping_cart', path: '/cart' },
      { name: lang === 'ar' ? 'الطلبات' : 'Orders', icon: 'receipt_long', path: '/orders' },
      { name: lang === 'ar' ? 'طلبات خاصة' : 'Special Requests', icon: 'campaign', path: '/market-requests' },
      { name: lang === 'ar' ? 'منتجاتي' : 'My Products', icon: 'inventory_2', path: '/products' },
      { name: lang === 'ar' ? 'فريقي' : 'My Team', icon: 'group', path: '/my-team' },
      { name: lang === 'ar' ? 'الملف الشخصي' : 'Profile', icon: 'person', path: '/profile' },
      { name: lang === 'ar' ? 'إدارة الاشتراك' : 'Subscription', icon: 'loyalty', path: '/subscription' },
      { name: lang === 'ar' ? 'الدعم والشكاوى' : 'Support', icon: 'support_agent', path: '/support' },
    ];

    let filtered = items;
    
    if (isCustomer) {
      filtered = items.filter(i => !['/products'].includes(i.path));
    } else if (isSupplier) {
      filtered = items.filter(i => !['/product-search', '/vendors', '/cart'].includes(i.path));
    }

    return filtered.map(item => ({
      ...item,
      disabled: isStaff && !allowedScreens.includes(item.path)
    }));
  }, [lang, role, isAdmin, isStaff, isCustomer, isSupplier, allowedScreens]);

  const bottomNavItems = useMemo(() => {
    let items = [];
    
    if (isAdmin) {
      items = [
        { name: lang === 'ar' ? 'الرئيسية' : 'Home', icon: 'home', path: '/' },
        { name: lang === 'ar' ? 'الخطط' : 'Plans', icon: 'loyalty', path: '/plans' },
        { name: lang === 'ar' ? 'الفئات' : 'Categories', icon: 'category', path: '/categories' },
        { name: lang === 'ar' ? 'الموافقات' : 'Approvals', icon: 'verified', path: '/approvals' },
        { name: lang === 'ar' ? 'المزيد' : 'More', icon: 'menu', path: 'SIDEBAR_TRIGGER' },
      ];
    } else if (isSupplier) {
      items = [
        { name: lang === 'ar' ? 'الرئيسية' : 'Home', icon: 'home', path: '/' },
        { name: lang === 'ar' ? 'منتجاتي' : 'Products', icon: 'inventory_2', path: '/products' },
        { name: lang === 'ar' ? 'الطلبات' : 'Orders', icon: 'receipt_long', path: '/orders' },
        { name: lang === 'ar' ? 'طلبات خاصة' : 'Special Req', icon: 'campaign', path: '/market-requests' },
        { name: lang === 'ar' ? 'المزيد' : 'More', icon: 'menu', path: 'SIDEBAR_TRIGGER' },
      ];
    } else if (isCustomer) {
      items = [
        { name: lang === 'ar' ? 'الرئيسية' : 'Home', icon: 'home', path: '/' },
        { name: lang === 'ar' ? 'السوق' : 'Market', icon: 'explore', path: '/product-search' },
        { name: lang === 'ar' ? 'العربة' : 'Cart', icon: 'shopping_cart', path: '/cart' },
        { name: lang === 'ar' ? 'الموردون' : 'Vendors', icon: 'storefront', path: '/vendors' },
        { name: lang === 'ar' ? 'المزيد' : 'More', icon: 'menu', path: 'SIDEBAR_TRIGGER' },
      ];
    } else {
      items = [
        { name: lang === 'ar' ? 'الرئيسية' : 'Home', icon: 'home', path: '/' },
        { name: lang === 'ar' ? 'الطلبات' : 'Orders', icon: 'receipt_long', path: '/orders' },
        { name: lang === 'ar' ? 'الملف' : 'Profile', icon: 'person', path: '/profile' },
        { name: lang === 'ar' ? 'الدعم' : 'Support', icon: 'support_agent', path: '/support' },
        { name: lang === 'ar' ? 'المزيد' : 'More', icon: 'menu', path: 'SIDEBAR_TRIGGER' },
      ];
    }

    return items.map(item => ({
      ...item,
      disabled: isStaff && item.path !== 'SIDEBAR_TRIGGER' && !allowedScreens.includes(item.path)
    }));
  }, [lang, isAdmin, isCustomer, isSupplier, isStaff, allowedScreens]);

  const pageInfo = useMemo(() => {
    const path = location.pathname;
    let info = {
      title: lang === 'ar' ? 'بوابة راو نيدد' : 'Raw Needed Portal',
      subtitle: lang === 'ar' ? 'مرحباً بك في لوحة تحكم أعمالك' : 'Welcome to your business dashboard'
    };

    if (path === '/') info = { title: lang === 'ar' ? 'لوحة القيادة' : 'Dashboard', subtitle: t.header.performance };
    else if (path === '/payment-info') info = { title: lang === 'ar' ? 'معلومات الدفع' : 'Payment Information', subtitle: lang === 'ar' ? 'إدارة حسابات التحويل والمحافظ.' : 'Manage transfer accounts and wallets.' };
    else if (path === '/vendors') info = { title: lang === 'ar' ? 'دليل الموردين' : 'Vendor Directory', subtitle: lang === 'ar' ? 'استكشف الموردين المعتمدين.' : 'Explore verified suppliers.' };
    else if (path === '/product-search') info = { title: t.productSearch.title, subtitle: t.productSearch.subtitle };
    else if (path === '/products') info = { title: t.products.title, subtitle: t.products.subtitle };
    else if (path === '/orders') info = { title: lang === 'ar' ? 'سجل الطلبات' : 'Order History', subtitle: lang === 'ar' ? 'تتبع وإدارة جميع طلباتك.' : 'Track and manage all your requests.' };
    else if (path === '/market-requests') info = { title: t.marketRequests.title, subtitle: t.marketRequests.subtitle };
    else if (path === '/my-team') info = { title: t.team.title, subtitle: t.team.subtitle };
    else if (path === '/support') info = { title: t.complaints.title, subtitle: t.complaints.subtitle };
    else if (path === '/subscription') info = { title: lang === 'ar' ? 'إدارة الاشتراك' : 'Subscription', subtitle: lang === 'ar' ? 'خطة أعمالك الحالية.' : 'Your current business plan.' };
    else if (path === '/profile') info = { title: t.profile.title, subtitle: t.profile.subtitle };
    else if (path === '/cart') info = { title: lang === 'ar' ? 'عربة الطلبات' : 'Procurement Cart', subtitle: lang === 'ar' ? 'راجع المواد قبل الإرسال.' : 'Review items before sending.' };

    return info;
  }, [location.pathname, lang, t, isAdmin]);

  const getDynamicPath = () => {
    return `M 0 25 C 0 11.1929 11.1929 0 25 0 H 325 C 338.807 0 350 11.1929 350 25 V 60 C 350 73.8071 338.807 85 325 85 H 25 C 11.1929 85 0 73.8071 0 60 V 25 Z`;
  };

  const getProfileInitial = () => {
    if (userData?.name) return userData.name.charAt(0);
    return 'ع';
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark transition-colors duration-300 font-display text-slate-800 dark:text-slate-100">
      
      {/* Backdrop: mobile only (on desktop sidebar is always visible) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-[190] bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-300 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar: on mobile slides in/out; on lg+ always visible */}
      <aside className={`
        fixed inset-y-0 ${lang === 'ar' ? 'right-0' : 'left-0'} z-[200] flex flex-col bg-white dark:bg-slate-900 transition-all duration-500 ease-in-out border-primary/60 shadow-xl ${lang === 'ar' ? 'border-l' : 'border-r'}
        ${isSidebarOpen ? 'translate-x-0' : (lang === 'ar' ? 'translate-x-full' : '-translate-x-full')}
        lg:translate-x-0
        w-[85%] sm:w-80 lg:w-64
      `}>
        
        <div className="p-6 flex items-center gap-4 pt-12 md:pt-6">
          <div className="relative group shrink-0">
             <div className="size-14 rounded-2xl bg-[#e0f5f6] dark:bg-primary/5 flex items-center justify-center text-primary font-black text-2xl border border-primary/40 shadow-sm overflow-hidden">
                {userData?.profileImage ? (
                  <img src={userData.profileImage} className="size-full object-cover" alt="Profile" />
                ) : (
                  getProfileInitial()
                )}
             </div>
             <div className="absolute -bottom-1 -right-1 size-4 bg-emerald-50 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"></div>
          </div>
          
          <div className="min-w-0 flex-1 animate-in fade-in duration-500">
             <h3 className="text-slate-900 dark:text-white font-black text-sm md:text-base leading-tight truncate">
               {userData?.organizationName || userData?.name || (lang === 'ar' ? 'عميل' : 'Customer')}
             </h3>
             <Link 
               to="/profile" 
               onClick={() => setIsSidebarOpen(false)}
               className="text-primary font-bold text-[10px] md:text-[11px] hover:underline flex items-center gap-1 mt-1"
             >
               {lang === 'ar' ? 'عرض الملف' : 'View Profile'}
               <span className="material-symbols-outlined text-[14px] rtl-flip">arrow_forward</span>
             </Link>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar px-4 pb-4 mt-2">
           <div className="space-y-1">
             {sidebarNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.disabled ? '#' : item.path}
                onClick={(e) => {
                  if (item.disabled) { e.preventDefault(); return; }
                  setIsSidebarOpen(false);
                }}
                className={({ isActive }) => `
                  flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 relative group
                  ${isActive && !item.disabled
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : item.disabled 
                      ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50 grayscale'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-primary/10 hover:text-primary'}
                `}
              >
                <span className={`material-symbols-outlined text-[22px]`}>{item.icon}</span>
                <span className="text-[14px] font-bold ">{item.name}</span>
                {item.disabled && (
                   <span className="material-symbols-outlined text-[14px] ml-auto opacity-40">lock</span>
                )}
              </NavLink>
             ))}
           </div>
           
           <div className="mt-auto pt-6 px-2">
             <div className="space-y-2 border-t border-primary/30 dark:border-slate-800 pt-6">
               <button 
                  onClick={toggleDarkMode}
                  className="w-full flex items-center transition-all duration-300 rounded-2xl group gap-4 px-4 py-3 border border-primary/30 hover:border-primary hover:bg-primary/5 text-slate-700 dark:text-slate-200"
               >
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary">
                    {isDarkMode ? 'light_mode' : 'dark_mode'}
                  </span>
                  <div className="flex-1 flex justify-between items-center">
                    <span className="text-[12px] font-bold">{lang === 'ar' ? 'المظهر' : 'Appearance'}</span>
                    <span className="text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-md ">
                      {isDarkMode ? (lang === 'ar' ? 'نهاري' : 'Light') : (lang === 'ar' ? 'ليلي' : 'Dark')}
                    </span>
                  </div>
               </button>
               <button 
                  onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                  className="w-full flex items-center transition-all duration-300 rounded-2xl group gap-4 px-4 py-3 border border-primary/30 hover:border-primary hover:bg-primary/5 text-slate-700 dark:text-slate-200"
               >
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary">language</span>
                  <div className="flex-1 flex justify-between items-center">
                    <span className="text-[12px] font-bold">{lang === 'ar' ? 'اللغة' : 'Language'}</span>
                    <span className="text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-md ">{lang === 'ar' ? 'English' : 'العربية'}</span>
                  </div>
               </button>
               <button 
                  onClick={onLogout}
                  className="w-full flex items-center transition-all duration-300 rounded-2xl group gap-4 px-4 py-3 border border-primary/30 hover:border-red-100 hover:bg-red-50/30 text-slate-700 dark:text-slate-200 hover:text-red-500"
               >
                  <span className="material-symbols-outlined rtl-flip text-slate-400 group-hover:text-red-500">logout</span>
                  <span className="text-[12px] font-black">{lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>
               </button>
             </div>
           </div>
        </div>
      </aside>

      {/* Main content: on lg+ add margin so content is beside sidebar */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden relative ${lang === 'ar' ? 'lg:mr-64' : 'lg:ml-64'}`}>
        <header className="sticky top-0 z-[100] bg-white dark:bg-slate-900 border-b border-primary/30 px-6 flex items-end md:items-center justify-between shrink-0 shadow-sm mobile-header-safe-height pb-4 md:pb-0 md:h-20">
          
          <div className="flex items-center gap-4 min-w-0">
             <button 
               onClick={() => navigate('/')}
               className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-primary transition-all active:scale-90 shadow-sm shrink-0"
               title={lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
             >
               <span className="material-symbols-outlined rtl-flip text-[22px]">arrow_back</span>
             </button>
             
             <div className="min-w-0 animate-in fade-in slide-in-from-right-2 duration-500">
                <h1 className="text-sm md:text-base font-black text-slate-900 dark:text-white  leading-tight truncate">
                   {pageInfo.title}
                </h1>
                <p className="text-[10px] md:text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 truncate leading-tight opacity-80">
                   {pageInfo.subtitle}
                </p>
             </div>
          </div>

          <div className="flex items-center relative" ref={notifRef}>
            <button 
              className={`relative p-2.5 transition-colors active:scale-95 rounded-xl ${showNotifications ? 'bg-primary/10 text-primary shadow-inner' : 'text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5'}`}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <span className="material-symbols-outlined text-[28px]">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className={`absolute top-full mt-3 ${lang === 'ar' ? 'left-0' : 'right-0'} w-[320px] sm:w-[400px] z-[300] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300`}>
                 <div className="shadow-2xl ring-1 ring-black/5 rounded-[2rem] overflow-hidden">
                    <RecentNotifications />
                 </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark focus:outline-none transition-all duration-300 custom-scrollbar pb-32 lg:pb-8">
          <Outlet />
        </main>

        {/* Bottom nav: mobile only; hidden on desktop (lg+) */}
        <div className="fixed bottom-6 left-6 right-6 z-[120] pointer-events-none lg:hidden">
          <div className="relative w-full max-w-[450px] mx-auto h-[85px] pointer-events-auto">
            <svg className="absolute inset-0 w-full h-full drop-shadow-[0_-8px_25px_rgba(0,0,0,0.12)]" viewBox="0 0 350 85" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                className="transition-all duration-500 ease-out" 
                d={getDynamicPath()} 
                fill={isDarkMode ? "#1e293b" : "white"} 
                stroke="#009aa7" 
                strokeWidth="1.2" 
                strokeOpacity="0.3"
              />
            </svg>

            <nav className="relative z-10 flex items-center justify-between h-full px-2">
              {bottomNavItems.map((item, idx) => {
                const isSidebarTrigger = item.path === 'SIDEBAR_TRIGGER';
                
                if (isSidebarTrigger) {
                  return (
                    <button key="bottom-more" onClick={() => setIsSidebarOpen(true)} className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 ${isSidebarOpen ? 'text-primary' : 'text-slate-400'}`}>
                      <span className="material-symbols-outlined text-[28px]">{item.icon}</span>
                      <span className="text-[10px] font-black  mt-1 ">{item.name}</span>
                    </button>
                  );
                }

                return (
                  <NavLink 
                    key={item.path} 
                    to={item.disabled ? '#' : item.path} 
                    onClick={(e) => { if (item.disabled) e.preventDefault(); }}
                    className={({ isActive }) => `
                      flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 
                      ${isActive && !item.disabled ? 'text-primary -translate-y-1' : item.disabled ? 'text-slate-200 cursor-not-allowed opacity-40' : 'text-slate-400'}
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`material-symbols-outlined text-[28px] ${isActive && !item.disabled ? 'fill-1' : ''}`}>{item.icon}</span>
                        <span className="text-[10px] font-black  mt-1 ">{item.name}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
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

export default Layout;
