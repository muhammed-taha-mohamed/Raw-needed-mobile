
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { useNavigate } from 'react-router-dom';

interface CartItem {
  id: string;
  name: string;
  origin: string;
  supplierId: string;
  supplierName: string;
  inStock: boolean;
  quantity: number;
  image: string | null;
}

interface CartData {
  userId: string;
  items: CartItem[];
}

const Cart: React.FC = () => {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      const userId = userData?.userInfo?.id || userData?.id;
      if (!userId) throw new Error("Auth required");
      const data = await api.get<CartData>(`/api/v1/cart/${userId}`);
      setCart(data);
    } catch (err: any) {
      setError(err.message || "Failed to load your cart.");
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (productId: string) => {
    setIsProcessing(productId);
    try {
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      const userId = userData?.userInfo?.id || userData?.id;
      await api.delete(`/api/v1/cart/remove-item?userId=${userId}&productId=${productId}`);
      await fetchCart();
    } catch (err: any) {
      setCart(prev => prev ? { ...prev, items: prev.items.filter(item => item.id !== productId) } : null);
    } finally {
      setIsProcessing(null);
    }
  };

  const clearCart = async () => {
    setIsClearing(true);
    try {
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      const userId = userData?.userInfo?.id || userData?.id;
      await api.delete(`/api/v1/cart/${userId}`);
      setCart(null);
      setShowClearConfirm(false);
    } catch (err: any) {
      setError(err.message || "Failed to clear cart.");
    } finally {
      setIsClearing(false);
    }
  };

  const updateQty = async (productId: string, newQty: number) => {
    if (newQty < 1) return;
    setIsProcessing(productId);
    try {
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      const userId = userData?.userInfo?.id || userData?.id;
      await api.post(`/api/v1/cart/add-item?userId=${userId}&productId=${productId}&quantity=${newQty}`, {});
      await fetchCart();
    } catch (err: any) {
      setCart(prev => prev ? { 
        ...prev, 
        items: prev.items.map(item => item.id === productId ? { ...item, quantity: newQty } : item) 
      } : null);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleFinalizeRFQ = async () => {
    if (!cart || cart.items.length === 0) return;
    setIsSubmittingOrder(true);
    setError(null);
    try {
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      const userId = userData?.userInfo?.id || userData?.id;
      if (!userId) throw new Error("Authentication required");
      
      const payload = {
        userId: userId,
        items: cart.items.map(item => ({
          id: item.id,
          name: item.name,
          origin: item.origin,
          supplierId: item.supplierId,
          supplierName: item.supplierName,
          inStock: item.inStock,
          quantity: item.quantity,
          image: item.image
        }))
      };

      // 1. Send RFQ
      await api.post('/api/v1/rfq', payload);
      
      // 2. New: API call to empty cart after successful RFQ dispatch
      try {
        await api.delete(`/api/v1/cart/${userId}`);
      } catch (clearErr) {
        console.warn("RFQ sent but failed to clear cart API", clearErr);
      }

      setCart(null);
      setCheckoutSuccess(true);
    } catch (err: any) {
      setError(err.message || "Submission failed. Please try again.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const uniqueSuppliersCount = cart ? new Set(cart.items.map(i => i.supplierId)).size : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-48">
        <div className="size-14 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-6"></div>
        <p className="text-slate-500 font-black text-[10px] animate-pulse ">Loading...</p>
      </div>
    );
  }

  if (checkoutSuccess) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 md:px-10 py-32 flex flex-col items-center text-center animate-in fade-in zoom-in duration-700">
        <div className="size-40 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-500 mb-10 shadow-inner ring-8 ring-emerald-50/50">
           <span className="material-symbols-outlined text-8xl">verified</span>
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">{lang === 'ar' ? 'تم إرسال الطلبات بنجاح' : 'Requests Dispatched'}</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={() => navigate('/orders')} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs shadow-xl active:scale-95 flex items-center gap-3">
            <span className="material-symbols-outlined">receipt_long</span>
            {lang === 'ar' ? 'عرض طلباتي' : 'My Orders'}
          </button>
          <button onClick={() => navigate('/product-search')} className="px-10 py-4 bg-primary text-white rounded-2xl font-black text-xs shadow-xl active:scale-95 flex items-center gap-3">
            <span className="material-symbols-outlined">explore</span>
            {lang === 'ar' ? 'العودة للسوق' : 'Market'}
          </button>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 md:px-10 py-32 flex flex-col items-center text-center animate-in fade-in zoom-in duration-700">
        <div className="size-32 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center text-slate-200 dark:text-slate-700 mb-10">
           <span className="material-symbols-outlined text-7xl">shopping_cart</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">{lang === 'ar' ? 'العربة فارغة' : 'Your cart is empty'}</h2>
        <button onClick={() => navigate('/product-search')} className="px-10 py-4 bg-primary text-white rounded-2xl font-black text-xs shadow-2xl active:scale-95 flex items-center gap-3 ">
          <span className="material-symbols-outlined">explore</span>
          {lang === 'ar' ? 'تصفح السوق' : 'Explore Market'}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 md:px-10 py-6 animate-in fade-in slide-in-from-bottom-4 duration-700 font-display">
      
      {/* Top Header Controls */}
      <div className="flex justify-between items-center mb-8 bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] shadow-sm border border-primary/5">
        <h2 className="text-lg font-black text-primary">{lang === 'ar' ? 'محتويات العربة' : 'Cart Contents'}</h2>
        <button 
          onClick={() => setShowClearConfirm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-100 dark:border-red-900/30 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95 text-[10px] font-black "
        >
          <span className="material-symbols-outlined text-lg">delete_sweep</span>
          {lang === 'ar' ? 'تفريغ' : 'Empty'}
        </button>
      </div>

      {/* Grid: Reversed columns logic for standard RTL/LTR UX */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-40">
        
        {/* Summary Card - Moved to the right in LTR / left in RTL but appears logically based on grid order */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 order-last lg:order-none rtl:lg:order-first">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-primary/10 relative overflow-hidden flex flex-col gap-4 animate-in slide-in-from-left-4 duration-700">
            
            <div className="flex items-center justify-between">
               <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">{lang === 'ar' ? 'ملخص الطلب' : 'Order Summary'}</h3>
                  <p className="text-[9px] font-bold text-slate-500 mt-0.5 ">{lang === 'ar' ? 'مراجعة قبل الإرسال' : 'Review before sending'}</p>
               </div>
               <div className="size-10 rounded-xl bg-[#e0f5f6] dark:bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/10">
                  <span className="material-symbols-outlined text-xl">description</span>
               </div>
            </div>

            <div className="h-px bg-slate-50 dark:bg-slate-800"></div>

            <div className="grid grid-cols-1 gap-2.5">
               {/* Total Items */}
               <div className="bg-slate-50/60 dark:bg-slate-800/40 rounded-[1.2rem] p-3.5 flex items-center justify-between border border-slate-100/50 dark:border-slate-700/50">
                  <div>
                     <p className="text-[11px] font-black text-slate-700 dark:text-white">{lang === 'ar' ? 'إجمالي المواد' : 'Total Items'}</p>
                     <p className="text-[8px] font-bold text-slate-500">{lang === 'ar' ? 'في عربتك' : 'In cart'}</p>
                  </div>
                  <div className="text-xl font-black text-primary tabular-nums ">
                     {cart.items.length}
                  </div>
               </div>

               {/* Total Suppliers */}
               <div className="bg-slate-50/60 dark:bg-slate-800/40 rounded-[1.2rem] p-3.5 flex items-center justify-between border border-slate-100/50 dark:border-slate-700/50">
                  <div>
                     <p className="text-[11px] font-black text-slate-700 dark:text-white">{lang === 'ar' ? 'الموردون' : 'Suppliers'}</p>
                     <p className="text-[8px] font-bold text-slate-500">{lang === 'ar' ? 'المعتمدون' : 'Selected'}</p>
                  </div>
                  <div className="text-xl font-black text-slate-700 dark:text-white tabular-nums ">
                     {uniqueSuppliersCount}
                  </div>
               </div>
            </div>

            <div className="bg-[#f0f9fa] dark:bg-primary/5 rounded-xl p-3.5 border border-primary/10 text-center">
               <p className="text-[9px] font-bold text-primary leading-relaxed">
                  {lang === 'ar' 
                    ? 'سيتم إرسال طلب عرض سعر (RFQ) لكل مورد لتحديد الأسعار والشحن.' 
                    : 'An RFQ will be sent to each supplier separately to determine final pricing.'}
               </p>
            </div>

            <button 
              onClick={handleFinalizeRFQ} 
              disabled={isSubmittingOrder} 
              className="w-full py-3.5 bg-primary text-white rounded-[1.2rem] font-black text-xs shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 mt-1"
            >
              {isSubmittingOrder ? (
                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">rocket_launch</span>
                  {lang === 'ar' ? 'إرسال الطلبات' : 'Send Requests'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Product List - Occupies the rest */}
        <div className="lg:col-span-8 space-y-10 order-first lg:order-none">
          {Object.entries(cart.items.reduce((acc, item) => {
            if (!acc[item.supplierId]) acc[item.supplierId] = { name: item.supplierName, items: [] };
            acc[item.supplierId].items.push(item);
            return acc;
          }, {} as Record<string, { name: string; items: CartItem[] }>) || {}).map(([supplierId, supplier]: [string, any], sIdx) => (
            <div key={supplierId} className="space-y-4 animate-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${sIdx * 100}ms` }}>
              
              <div className="flex justify-between items-center px-4">
                 <div className="flex items-center gap-2 order-last rtl:order-first">
                    <span className="text-[11px] font-black text-slate-800 dark:text-white ">{lang === 'ar' ? 'مورد' : 'Supplier'}</span>
                    <div className="size-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-md">
                       <span className="material-symbols-outlined text-sm">store</span>
                    </div>
                 </div>
                 <h3 className="text-xs font-black text-slate-500 ">
                    {supplier.name}
                 </h3>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-primary/5 shadow-sm overflow-hidden divide-y divide-slate-50 dark:divide-slate-800">
                {supplier.items.map((item: CartItem) => (
                  <div key={item.id} className="p-4 flex items-center gap-3 md:gap-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all group relative overflow-hidden">
                    
                    {/* Elements Order: Image (Start/Right in AR) -> Info (Middle) -> Qty (Middle) -> Delete (End/Left in AR) */}
                    
                    {/* 1. Product Image */}
                    <div className="size-14 md:size-16 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                      {item.image ? (
                        <img src={item.image} className="size-full object-cover" alt={item.name} />
                      ) : (
                        <div className="size-full flex flex-col items-center justify-center text-slate-200">
                           <span className="material-symbols-outlined text-2xl">inventory_2</span>
                        </div>
                      )}
                    </div>

                    {/* 2. Product Info */}
                    <div className="flex-1 min-w-0 flex flex-col text-start">
                       <h4 className="text-[12px] md:text-base font-black text-slate-700 dark:text-white truncate leading-none mb-1">{item.name}</h4>
                       <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black  ${item.inStock ? 'text-emerald-500' : 'text-red-500'}`}>
                            {item.inStock ? (lang === 'ar' ? 'متوفر' : 'In Stock') : (lang === 'ar' ? 'نفذ' : 'Out')}
                          </span>
                          <span className="material-symbols-outlined text-slate-300 text-[14px]">public</span>
                          <span className="text-[10px] font-bold text-slate-500  tabular-nums">{item.origin}</span>
                       </div>
                    </div>

                    {/* 3. Quantity Selector */}
                    <div className="flex items-center bg-slate-50 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-inner shrink-0">
                      <button 
                        disabled={isProcessing === item.id} 
                        onClick={() => updateQty(item.id, item.quantity + 1)} 
                        className="size-7 md:size-8 rounded-lg bg-white dark:bg-slate-700 text-slate-500 hover:text-primary transition-all flex items-center justify-center active:scale-90"
                      >
                         <span className="material-symbols-outlined text-base">add</span>
                      </button>
                      <span className="w-8 text-center text-xs md:text-sm font-black text-slate-900 dark:text-white tabular-nums">
                        {item.quantity}
                      </span>
                      <button 
                        disabled={isProcessing === item.id} 
                        onClick={() => updateQty(item.id, item.quantity - 1)} 
                        className="size-7 md:size-8 rounded-lg bg-white dark:bg-slate-700 text-slate-500 hover:text-primary transition-all flex items-center justify-center active:scale-90"
                      >
                         <span className="material-symbols-outlined text-base">remove</span>
                      </button>
                    </div>

                    {/* 4. Delete Action */}
                    <button 
                      disabled={isProcessing === item.id} 
                      onClick={() => removeItem(item.id)} 
                      className="size-9 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all flex items-center justify-center shrink-0 active:scale-90"
                    >
                       {isProcessing === item.id ? <div className="size-4 border-2 border-slate-300 border-t-red-500 rounded-full animate-spin"></div> : <span className="material-symbols-outlined text-xl">delete</span>}
                    </button>

                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Clear Cart Confirmation - Equal buttons size */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 text-center animate-in zoom-in-95">
              <div className="size-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6"><span className="material-symbols-outlined text-4xl">warning</span></div>
              <h3 className="text-xl font-black mb-2">{lang === 'ar' ? 'تفريغ العربة؟' : 'Clear Cart?'}</h3>
              <p className="text-sm text-slate-500 font-bold mb-8">{lang === 'ar' ? 'سيتم حذف جميع المواد من العربة بشكل نهائي.' : 'All items will be permanently removed from your cart.'}</p>
              <div className="flex gap-4">
                 <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-3.5 bg-slate-100 rounded-xl font-black text-slate-500 hover:bg-slate-200 transition-all  text-[10px] ">{t.team.cancel}</button>
                 <button onClick={clearCart} disabled={isClearing} className="flex-1 py-3.5 bg-red-600 text-white rounded-xl font-black shadow-lg hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center text-[10px]  ">
                   {isClearing ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Clear')}
                 </button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 154, 167, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Cart;
