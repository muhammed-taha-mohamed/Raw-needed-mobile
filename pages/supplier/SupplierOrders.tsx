
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import OrderChat from '../../components/OrderChat';

interface SupplierResponse {
  price: number;
  shippingCost: number;
  estimatedDelivery: string;
  respondedAt: string;
  availableQuantity: number;
  shippingInfo: string;
}

interface RFQOffer {
  id: string;
  orderId: string;
  supplierId: string;
  supplierName: string;
  supplierOrganizationName: string;
  customerOwnerId: string | null;
  customerOrganizationName: string;
  customerOrganizationCRN: string;
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  status: 'PENDING' | 'RESPONDED' | 'REJECTED' | 'APPROVED' | 'COMPLETED';
  supplierResponse: SupplierResponse | null;
}

interface PaginatedOffers {
  content: RFQOffer[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

const SupplierOrders: React.FC = () => {
  const { lang, t } = useLanguage();
  const [offers, setOffers] = useState<RFQOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Action States
  const [respondingOffer, setRespondingOffer] = useState<RFQOffer | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Chat State
  const [chatOffer, setChatOffer] = useState<RFQOffer | null>(null);

  // Form State
  const [formPrice, setFormPrice] = useState<string>('');
  const [formShipping, setFormShipping] = useState<string>('0');
  const [formDelivery, setFormDelivery] = useState<string>('');
  const [formAvailableQty, setFormAvailableQty] = useState<string>('');
  const [formShippingInfo, setFormShippingInfo] = useState<string>('');
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchOffers(currentPage, statusFilter, pageSize);
  }, [currentPage, statusFilter, pageSize]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchOffers = async (page: number, status: string | null, size: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const statusParam = status ? `&status=${status}` : '';
      const response = await api.get<PaginatedOffers>(`/api/v1/rfq/supplier/offers?page=${page}&size=${size}${statusParam}`);
      setOffers(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load offers.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenResponse = (offer: RFQOffer) => {
    setRespondingOffer(offer);
    setFormPrice(offer.supplierResponse?.price?.toString() || '');
    setFormShipping(offer.supplierResponse?.shippingCost?.toString() || '0');
    setFormDelivery(offer.supplierResponse?.estimatedDelivery || '');
    setFormAvailableQty(offer.supplierResponse?.availableQuantity?.toString() || offer.quantity.toString());
    setFormShippingInfo(offer.supplierResponse?.shippingInfo || '');
  };

  const handleCompleteOffer = async (offerId: string) => {
    setCompletingId(offerId);
    try {
      await api.post(`/api/v1/rfq/line/${offerId}/complete`, {});
      setToast({ 
        message: lang === 'ar' ? 'تم إتمام الطلب بنجاح' : 'Order completed successfully', 
        type: 'success' 
      });
      fetchOffers(currentPage, statusFilter, pageSize);
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to complete order', type: 'error' });
    } finally {
      setCompletingId(null);
    }
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingOffer) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        price: parseFloat(formPrice),
        shippingCost: parseFloat(formShipping),
        estimatedDelivery: formDelivery,
        respondedAt: new Date().toISOString(),
        availableQuantity: parseInt(formAvailableQty),
        shippingInfo: formShippingInfo
      };

      await api.post(`/api/v1/rfq/line/${respondingOffer.id}/respond`, payload);
      
      setToast({ 
        message: lang === 'ar' ? 'تم إرسال العرض بنجاح' : 'Response sent successfully', 
        type: 'success' 
      });
      
      setRespondingOffer(null);
      fetchOffers(currentPage, statusFilter, pageSize);
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to send response', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusConfig = (status: RFQOffer['status']) => {
    const configs = {
      PENDING: { 
        label: lang === 'ar' ? 'قيد الانتظار' : 'Pending', 
        bg: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800',
        dot: 'bg-amber-500'
      },
      RESPONDED: { 
        label: lang === 'ar' ? 'تم الرد' : 'Responded', 
        bg: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800',
        dot: 'bg-blue-500'
      },
      APPROVED: { 
        label: lang === 'ar' ? 'تم الاعتماد' : 'Approved', 
        bg: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800',
        dot: 'bg-indigo-500'
      },
      COMPLETED: { 
        label: lang === 'ar' ? 'مكتمل' : 'Completed', 
        bg: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800',
        dot: 'bg-emerald-500'
      },
      REJECTED: { 
        label: lang === 'ar' ? 'مرفوض' : 'Rejected', 
        bg: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:border-red-800',
        dot: 'bg-red-500'
      }
    };
    return configs[status] || configs.PENDING;
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const filterOptions = [
    { id: null, label: lang === 'ar' ? 'الكل' : 'All Offers' },
    { id: 'PENDING', label: lang === 'ar' ? 'طلبات جديدة' : 'New Offers' },
    { id: 'RESPONDED', label: lang === 'ar' ? 'تم الرد عليها' : 'Responded' },
    { id: 'APPROVED', label: lang === 'ar' ? 'تم اعتمادها' : 'Approved' },
    { id: 'COMPLETED', label: lang === 'ar' ? 'مكتملة' : 'Completed' }
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-4 md:px-10 py-6 animate-in fade-in slide-in-from-bottom-4 duration-700 font-display relative pb-32">
      
      {toast && (
        <div className={`fixed bottom-32 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-xl shadow-2xl font-black text-xs animate-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>
           {toast.message}
        </div>
      )}

      {/* List Area */}
      <div className="min-h-[400px]">
        {isLoading && offers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40">
             <div className="size-10 border-[3px] border-primary/10 border-t-primary rounded-full animate-spin mb-4"></div>
             <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest opacity-50">Accessing Supply Ledger...</p>
          </div>
        ) : offers.length === 0 ? (
          <div className="py-32 text-center flex flex-col items-center gap-6 opacity-30 animate-in fade-in duration-700">
             <span className="material-symbols-outlined text-7xl">request_quote</span>
             <div className="space-y-1">
               <h3 className="text-xl font-black">{lang === 'ar' ? 'لا توجد طلبات' : 'No RFQs Found'}</h3>
               <p className="text-sm font-bold">{lang === 'ar' ? 'لم تصلك أي طلبات عروض أسعار جديدة حالياً.' : 'No new supply requests received yet.'}</p>
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {offers.map((offer, idx) => {
              const status = getStatusConfig(offer.status);
              return (
                <div key={offer.id} className="bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row items-center gap-3 group animate-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 30}ms` }}>
                  
                  <div className="flex items-center gap-3.5 flex-1 w-full">
                    <div className="size-14 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                       {offer.productImage ? (
                         <img src={offer.productImage} className="size-full object-cover" />
                       ) : (
                         <span className="material-symbols-outlined text-2xl text-slate-300">inventory_2</span>
                       )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 mb-1">
                        <h3 className="text-sm font-black text-slate-800 dark:text-white truncate">{offer.productName}</h3>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${status.bg}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-400">
                         <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">corporate_fare</span> {offer.customerOrganizationName}</span>
                         <span className="w-1 h-1 rounded-full bg-slate-200 dark:border-slate-700"></span>
                         <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">numbers</span> {offer.quantity} {lang === 'ar' ? 'وحدة' : 'Units'}</span>
                         <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-200 dark:border-slate-700"></span>
                         <span className="hidden sm:inline flex items-center gap-1 uppercase tracking-tighter">Ref: {offer.id.slice(-8).toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    {offer.status !== 'PENDING' && (
                       <button 
                         onClick={() => setChatOffer(offer)}
                         className="size-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-100 dark:border-blue-800 transition-all active:scale-90 flex items-center justify-center"
                         title={lang === 'ar' ? 'دردشة' : 'Chat'}
                       >
                         <span className="material-symbols-outlined text-xl">forum</span>
                       </button>
                    )}

                    {offer.status === 'APPROVED' ? (
                       <button 
                         disabled={completingId === offer.id}
                         onClick={() => handleCompleteOffer(offer.id)}
                         className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] hover:bg-emerald-700 transition-all active:scale-95 whitespace-nowrap shadow-md shadow-emerald-600/10 uppercase tracking-wider"
                       >
                          {completingId === offer.id ? (
                            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-base">task_alt</span>
                              {lang === 'ar' ? 'إتمام الطلب' : 'Complete'}
                            </>
                          )}
                       </button>
                    ) : offer.status === 'COMPLETED' ? (
                       <div className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-100 dark:border-emerald-800 rounded-xl font-black text-[10px] cursor-default whitespace-nowrap uppercase tracking-wider">
                          <span className="material-symbols-outlined text-base">check_circle</span>
                          {lang === 'ar' ? 'مكتمل' : 'Finalized'}
                       </div>
                    ) : (
                      <button 
                        onClick={() => handleOpenResponse(offer)}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] transition-all active:scale-95 whitespace-nowrap shadow-md uppercase tracking-wider ${
                          offer.status === 'RESPONDED' 
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary' 
                          : 'bg-primary text-white shadow-primary/10 hover:bg-slate-900 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">{offer.status === 'RESPONDED' ? 'edit_square' : 'send'}</span>
                        {offer.status === 'RESPONDED' ? (lang === 'ar' ? 'تعديل السعر' : 'Edit Quote') : (lang === 'ar' ? 'تقديم عرض' : 'Submit Quote')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Filter FAB */}
      <div className="fixed bottom-32 left-0 right-0 z-[130] pointer-events-none px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col items-end pointer-events-auto">
          <div className="relative" ref={filterRef}>
            <button 
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="size-14 rounded-full bg-primary text-white flex items-center justify-center shadow-2xl transition-all active:scale-90 border-2 border-white/20"
            >
              <span className="material-symbols-outlined text-2xl">tune</span>
              {statusFilter && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white size-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-slate-900 shadow-md">
                  1
                </span>
              )}
            </button>

            {showFilterMenu && (
              <div className={`absolute bottom-full mb-4 z-[250] w-60 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-4 animate-in fade-in slide-in-from-bottom-2 duration-200 ${lang === 'ar' ? 'left-0' : 'right-0'}`}>
                <div className="flex justify-between items-center mb-4 px-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{lang === 'ar' ? 'تصفية الحالة' : 'Status Filter'}</h3>
                  {statusFilter && (
                    <button onClick={() => {setStatusFilter(null); setShowFilterMenu(false);}} className="text-[10px] font-black text-red-500 uppercase">{lang === 'ar' ? 'مسح' : 'Clear'}</button>
                  )}
                </div>
                <div className="space-y-1">
                  {filterOptions.map((opt) => (
                    <button
                      key={opt.id as any}
                      onClick={() => { setStatusFilter(opt.id); setCurrentPage(0); setShowFilterMenu(false); }}
                      className={`w-full text-start px-4 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-between ${
                        statusFilter === opt.id 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                      {statusFilter === opt.id && <span className="material-symbols-outlined text-base">check</span>}
                    </button>
                  ))}
                </div>
                <div className={`absolute -bottom-2 w-4 h-4 bg-white dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-800 rotate-45 ${lang === 'ar' ? 'left-8' : 'right-8'}`}></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pagination Footer */}
      {(totalPages > 1 || offers.length > 0) && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-slate-100 dark:border-slate-800 animate-in fade-in duration-500 mt-8 max-w-fit mx-auto sm:mx-0 sm:ml-auto rtl:sm:mr-auto">
           <div className="flex items-center gap-1">
              <button 
                onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 0}
                className="size-8 rounded-full border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
              >
                <span className="material-symbols-outlined text-base rtl-flip">chevron_left</span>
              </button>
              
              <div className="flex items-center gap-1">
                 {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                    let pageNum = i;
                    if (totalPages > 5 && currentPage > 2) pageNum = Math.min(currentPage - 2 + i, totalPages - 1);
                    return (
                      <button
                        key={pageNum} onClick={() => handlePageChange(pageNum)}
                        className={`size-8 rounded-full font-black text-[11px] transition-all ${
                          currentPage === pageNum 
                          ? 'bg-primary text-white shadow-md shadow-primary/20' 
                          : 'bg-white dark:bg-slate-900 text-slate-400 hover:text-primary hover:bg-primary/5'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                 })}
              </div>

              <button 
                onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages - 1}
                className="size-8 rounded-full border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
              >
                <span className="material-symbols-outlined text-base rtl-flip">chevron_right</span>
              </button>
           </div>

           <div className="h-5 w-px bg-slate-100 dark:bg-slate-800 mx-1"></div>

           <div className="px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-full shrink-0">
              <span className="text-[10px] font-black text-slate-500 tabular-nums">
                {offers.length} / {totalElements}
              </span>
           </div>
        </div>
      )}

      {/* Response Modal (تقديم عرض السعر) */}
      {respondingOffer && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 flex flex-col max-h-[90vh]">
            
            <div className="px-10 py-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-5">
                  <div className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                     <span className="material-symbols-outlined text-3xl">request_quote</span>
                  </div>
                  <div>
                     <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-none mb-2">
                        {lang === 'ar' ? 'تقديم عرض سعر' : 'Supply Quotation'}
                     </h3>
                     <p className="text-[12px] font-bold text-slate-400 tabular-nums">Ref #{respondingOffer.id.slice(-8).toUpperCase()} • {respondingOffer.productName}</p>
                  </div>
               </div>
               <button 
                 onClick={() => setRespondingOffer(null)} 
                 className="size-12 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-500 transition-all flex items-center justify-center border border-slate-200 dark:border-slate-800 active:scale-90 shadow-sm"
               >
                 <span className="material-symbols-outlined text-2xl">close</span>
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              <form onSubmit={handleSubmitResponse} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 px-1 uppercase tracking-wider">{lang === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</label>
                    <div className="relative group">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">EGP</span>
                       <input 
                         type="number" required step="0.01" min="0.01"
                         value={formPrice} onChange={(e) => setFormPrice(e.target.value)}
                         className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-black text-lg focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none tabular-nums shadow-inner"
                         placeholder="0.00"
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 px-1 uppercase tracking-wider">{lang === 'ar' ? 'تكلفة الشحن' : 'Shipping Cost'}</label>
                    <div className="relative group">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">EGP</span>
                       <input 
                         type="number" required step="0.01" min="0"
                         value={formShipping} onChange={(e) => setFormShipping(e.target.value)}
                         className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-black text-lg focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none tabular-nums shadow-inner"
                         placeholder="0.00"
                       />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 px-1 uppercase tracking-wider">{lang === 'ar' ? 'الكمية المتوفرة' : 'Available Quantity'}</label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">inventory</span>
                      <input 
                        type="number" required min="1"
                        value={formAvailableQty} onChange={(e) => setFormAvailableQty(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-bold focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none shadow-inner"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 px-1 uppercase tracking-wider">{lang === 'ar' ? 'تاريخ التسليم المتوقع' : 'Estimated Delivery Date'}</label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">calendar_today</span>
                      <input 
                        type="date" required min={new Date().toISOString().split('T')[0]}
                        value={formDelivery} onChange={(e) => setFormDelivery(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-bold focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none shadow-inner"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 px-1 uppercase tracking-wider">{lang === 'ar' ? 'معلومات الشحن' : 'Shipping Information'}</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-4 text-slate-300 group-focus-within:text-primary transition-colors">local_shipping</span>
                    <textarea 
                      value={formShippingInfo} onChange={(e) => setFormShippingInfo(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-bold focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none shadow-inner min-h-[100px]"
                      placeholder={lang === 'ar' ? 'مثال: الشحن عبر البريد السريع أو الاستلام من المخزن...' : 'e.g. Shipping via express courier or warehouse pickup...'}
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-5 bg-primary text-white rounded-[1.5rem] font-black text-sm shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-4 uppercase tracking-[0.1em]"
                  >
                    {isSubmitting ? (
                      <div className="size-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">send</span>
                        {respondingOffer.status === 'RESPONDED' ? (lang === 'ar' ? 'تحديث عرض السعر' : 'Update Quote') : (lang === 'ar' ? 'إرسال عرض السعر' : 'Finalize Quote')}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Chat Component Integration */}
      {chatOffer && (
        <OrderChat 
          isOpen={!!chatOffer}
          onClose={() => setChatOffer(null)}
          orderId={chatOffer.id}
          orderNumber={chatOffer.id.slice(-8).toUpperCase()}
          title={chatOffer.productName}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 154, 167, 0.2); border-radius: 10px; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </div>
  );
};

export default SupplierOrders;
