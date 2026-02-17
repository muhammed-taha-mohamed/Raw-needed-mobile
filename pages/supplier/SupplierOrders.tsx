
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import OrderChat from '../../components/OrderChat';
import EmptyState from '../../components/EmptyState';
import PaginationFooter from '../../components/PaginationFooter';

interface SupplierResponse {
  price: number;
  shippingCost: number;
  estimatedDelivery: string;
  respondedAt: string;
  availableQuantity: number;
  shippingInfo: string;
  phoneNumber?: string; // WhatsApp from supplier response
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
  productId: string | null;
  productName: string;
  productImage: string;
  unit?: string | null;
  categoryId?: string | null;
  subCategoryId?: string | null;
  extraFieldValues?: Record<string, string>;
  manualOrder?: boolean;
  quantity: number;
  status: 'PENDING' | 'RESPONDED' | 'REJECTED' | 'APPROVED' | 'COMPLETED';
  supplierResponse: SupplierResponse | null;
  specialOfferId?: string; // Flag to indicate if order line is from special offer
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
  const [detailsOffer, setDetailsOffer] = useState<RFQOffer | null>(null);

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

  const renderExtraFields = (offer: RFQOffer) => {
    const extra = offer.extraFieldValues || {};
    const hasNote = !!extra.note;
    const hasDims = !!(extra.dimensions_length || extra.dimensions_width || extra.dimensions_height);
    const hasServiceName = !!extra.serviceName;
    const hasColorCount = !!extra.colorCount;
    const hasPaperSize = !!extra.paperSize;
    if (!hasNote && !hasDims && !hasServiceName && !hasColorCount && !hasPaperSize) return null;
    return (
      <div className="mt-2 rounded-xl border border-primary/15 bg-primary/5 dark:bg-primary/10 p-2.5 space-y-1.5">
        {hasDims && (
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-600 dark:text-slate-300">
              {lang === 'ar' ? 'الأبعاد (سم):' : 'Dimensions (cm):'}
            </p>
            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
              {lang === 'ar' ? 'طول' : 'Length'}: {extra.dimensions_length || '-'} {lang === 'ar' ? 'سم' : 'cm'} - {lang === 'ar' ? 'عرض' : 'Width'}: {extra.dimensions_width || '-'} {lang === 'ar' ? 'سم' : 'cm'} - {lang === 'ar' ? 'ارتفاع' : 'Height'}: {extra.dimensions_height || '-'} {lang === 'ar' ? 'سم' : 'cm'}
            </p>
          </div>
        )}
        {hasServiceName && (
          <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 break-words">
            {lang === 'ar' ? 'اسم الخدمة:' : 'Service Name:'} {extra.serviceName}
          </p>
        )}
        {hasColorCount && (
          <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 break-words">
            {lang === 'ar' ? 'عدد الألوان:' : 'Color Count:'} {extra.colorCount}
          </p>
        )}
        {hasPaperSize && (
          <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 break-words">
            {lang === 'ar' ? 'حجم الورق:' : 'Paper Size:'} {extra.paperSize}
          </p>
        )}
        {hasNote && (
          <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 break-words">
            {lang === 'ar' ? 'ملاحظة:' : 'Note:'} {extra.note}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full py-6 animate-in fade-in slide-in-from-bottom-4 duration-700 font-display relative pb-32 md:pb-8">
      
      {toast && (
        <div className={`fixed bottom-32 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-xl shadow-2xl font-black text-sm animate-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>
           {toast.message}
        </div>
      )}

      {/* Desktop View - Fixed Size Container */}
      <div className="hidden md:block mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-primary/20 dark:border-primary/10 shadow-lg overflow-hidden">
          <div className="h-[90vh] flex flex-col">
            {/* Filter Section */}
            <div className="flex-shrink-0 bg-primary/10 dark:bg-primary/5 border-b-2 border-primary/20 px-6 py-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="material-symbols-outlined text-lg text-primary">filter_list</span>
                <span className="text-xs font-black text-slate-400">{lang === 'ar' ? 'الحالة:' : 'Status:'}</span>
                {filterOptions.map((opt) => (
                  <button
                    key={opt.id as any}
                    onClick={() => { setStatusFilter(opt.id); setCurrentPage(0); }}
                    className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                      statusFilter === opt.id
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary border border-primary/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                {statusFilter && (
                  <button onClick={() => { setStatusFilter(null); setCurrentPage(0); }} className="text-xs font-black text-red-500 hover:underline">
                    {lang === 'ar' ? 'مسح' : 'Clear'}
                  </button>
                )}
              </div>
            </div>
            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30">
              {isLoading && offers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40">
                  <div className="size-10 border-[3px] border-primary/10 border-t-primary rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-400 font-black text-xs opacity-50">{t.common.accessingSupplyLedger}</p>
                </div>
              ) : offers.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <EmptyState title={lang === 'ar' ? 'لا توجد طلبات' : 'No RFQs Found'} subtitle={lang === 'ar' ? 'لم تصلك أي طلبات عروض أسعار جديدة حالياً.' : 'No new supply requests received yet.'} />
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {offers.map((offer, idx) => {
                    const status = getStatusConfig(offer.status);
                    return (
                      <div key={offer.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group">
                        <div className="size-14 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                          {offer.productImage ? (
                            <img src={offer.productImage} className="size-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-2xl text-slate-300">inventory_2</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                            <h3 className="text-base font-black text-slate-800 dark:text-white truncate">{offer.productName}</h3>
                            {offer.manualOrder && (
                              <span className="px-2 py-1 rounded-lg text-xs font-black border bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">edit_document</span>
                                {lang === 'ar' ? 'طلب يدوي' : 'Manual Request'}
                              </span>
                            )}
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${status.bg}`}>
                              {status.label}
                            </span>
                            {offer.specialOfferId && (
                              <span className="px-2 py-1 rounded-lg text-xs font-black border bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">local_offer</span>
                                {lang === 'ar' ? 'عرض خاص' : 'Special Offer'}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">corporate_fare</span> {offer.customerOrganizationName}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200 dark:border-slate-700"></span>
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">numbers</span> {offer.quantity} {offer.unit || (lang === 'ar' ? 'وحدة' : 'Units')}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200 dark:border-slate-700"></span>
                            <span className="flex items-center gap-1 tracking-tighter">Ref: {offer.id.slice(-8).toUpperCase()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setDetailsOffer(offer)}
                            className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-900 hover:text-white border border-slate-200 dark:border-slate-700 transition-all active:scale-90 flex items-center justify-center"
                            title={lang === 'ar' ? 'تفاصيل الطلب' : 'Order details'}
                          >
                            <span className="material-symbols-outlined text-xl">visibility</span>
                          </button>
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
                              className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs hover:bg-emerald-700 transition-all active:scale-95 whitespace-nowrap shadow-md shadow-emerald-600/10"
                            >
                              {completingId === offer.id ? (
                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-lg">task_alt</span>
                                  {lang === 'ar' ? 'إتمام الطلب' : 'Complete'}
                                </>
                              )}
                            </button>
                          ) : offer.status === 'COMPLETED' ? (
                            <div className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-100 dark:border-emerald-800 rounded-xl font-black text-xs cursor-default whitespace-nowrap">
                              <span className="material-symbols-outlined text-lg">check_circle</span>
                              {lang === 'ar' ? 'مكتمل' : 'Finalized'}
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleOpenResponse(offer)}
                              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-xs transition-all active:scale-95 whitespace-nowrap shadow-md ${
                                offer.status === 'RESPONDED' 
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary' 
                                : 'bg-primary text-white shadow-primary/10 hover:bg-slate-900 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className="material-symbols-outlined text-lg">{offer.status === 'RESPONDED' ? 'edit_square' : 'send'}</span>
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
            {/* Pagination Footer - Fixed at Bottom */}
            {totalPages > 1 && (
              <div className="flex-shrink-0 border-t-2 border-primary/20 bg-primary/5 dark:bg-primary/5 px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full shrink-0 border border-primary/20">
                    <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 tabular-nums">
                      {currentPage + 1} / {totalPages}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-primary/20 mx-1"></div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => handlePageChange(currentPage - 1)} 
                      disabled={currentPage === 0}
                      className="size-9 rounded-full border border-primary/20 bg-white dark:bg-slate-800 text-slate-400 hover:text-primary hover:border-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
                    >
                      <span className="material-symbols-outlined text-base rtl-flip">chevron_left</span>
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                        let pageNum = i;
                        if (totalPages > 5 && currentPage > 2) pageNum = Math.min(currentPage - 2 + i, totalPages - 1);
                        return (
                          <button
                            key={pageNum} 
                            onClick={() => handlePageChange(pageNum)}
                            className={`size-9 rounded-full font-black text-xs transition-all ${
                              currentPage === pageNum 
                              ? 'bg-primary text-white shadow-md' 
                              : 'bg-white dark:bg-slate-800 text-slate-400 border border-primary/20 hover:border-primary'
                            }`}
                          >
                            {pageNum + 1}
                          </button>
                        );
                      })}
                    </div>
                    <button 
                      onClick={() => handlePageChange(currentPage + 1)} 
                      disabled={currentPage >= totalPages - 1}
                      className="size-9 rounded-full border border-primary/20 bg-white dark:bg-slate-800 text-slate-400 hover:text-primary hover:border-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
                    >
                      <span className="material-symbols-outlined text-base rtl-flip">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        {/* List Area */}
        <div className="min-h-[400px] mb-6">
          {isLoading && offers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40">
              <div className="size-10 border-[3px] border-primary/10 border-t-primary rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400 font-black text-xs opacity-50">{t.common.accessingSupplyLedger}</p>
            </div>
          ) : offers.length === 0 ? (
            <EmptyState title={lang === 'ar' ? 'لا توجد طلبات' : 'No RFQs Found'} subtitle={lang === 'ar' ? 'لم تصلك أي طلبات عروض أسعار جديدة حالياً.' : 'No new supply requests received yet.'} />
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
                        <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                          <h3 className="text-base font-black text-slate-800 dark:text-white truncate">{offer.productName}</h3>
                          {offer.manualOrder && (
                            <span className="px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-black border bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[10px]">edit_document</span>
                              {lang === 'ar' ? 'طلب يدوي' : 'Manual Request'}
                            </span>
                          )}
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black border ${status.bg}`}>
                            {status.label}
                          </span>
                          {offer.specialOfferId && (
                            <span className="px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-black border bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[10px]">local_offer</span>
                              {lang === 'ar' ? 'عرض خاص' : 'Special Offer'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400">
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[15px]">corporate_fare</span> {offer.customerOrganizationName}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-200 dark:border-slate-700"></span>
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[15px]">numbers</span> {offer.quantity} {offer.unit || (lang === 'ar' ? 'وحدة' : 'Units')}</span>
                          <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-200 dark:border-slate-700"></span>
                          <span className="hidden sm:inline flex items-center gap-1 tracking-tighter">Ref: {offer.id.slice(-8).toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                      <button
                        onClick={() => setDetailsOffer(offer)}
                        className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-900 hover:text-white border border-slate-200 dark:border-slate-700 transition-all active:scale-90 flex items-center justify-center"
                        title={lang === 'ar' ? 'تفاصيل الطلب' : 'Order details'}
                      >
                        <span className="material-symbols-outlined text-xl">visibility</span>
                      </button>
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
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs hover:bg-emerald-700 transition-all active:scale-95 whitespace-nowrap shadow-md shadow-emerald-600/10"
                        >
                          {completingId === offer.id ? (
                            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-lg">task_alt</span>
                              {lang === 'ar' ? 'إتمام الطلب' : 'Complete'}
                            </>
                          )}
                        </button>
                      ) : offer.status === 'COMPLETED' ? (
                        <div className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-100 dark:border-emerald-800 rounded-xl font-black text-xs cursor-default whitespace-nowrap">
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                          {lang === 'ar' ? 'مكتمل' : 'Finalized'}
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleOpenResponse(offer)}
                          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-xs transition-all active:scale-95 whitespace-nowrap shadow-md ${
                            offer.status === 'RESPONDED' 
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary' 
                            : 'bg-primary text-white shadow-primary/10 hover:bg-slate-900 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="material-symbols-outlined text-lg">{offer.status === 'RESPONDED' ? 'edit_square' : 'send'}</span>
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

        {/* Floating Filter FAB - Mobile only */}
        <div className="fixed bottom-32 left-0 right-0 z-[130] pointer-events-none px-6">
          <div className="w-full flex flex-col items-end pointer-events-auto">
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
                    <h3 className="text-xs font-black tracking-[0.2em] text-slate-400">{lang === 'ar' ? 'تصفية الحالة' : 'Status Filter'}</h3>
                    {statusFilter && (
                      <button onClick={() => {setStatusFilter(null); setShowFilterMenu(false);}} className="text-xs font-black text-red-500">{lang === 'ar' ? 'مسح' : 'Clear'}</button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {filterOptions.map((opt) => (
                      <button
                        key={opt.id as any}
                        onClick={() => { setStatusFilter(opt.id); setCurrentPage(0); setShowFilterMenu(false); }}
                        className={`w-full text-start px-4 py-3 rounded-xl text-sm font-black transition-all flex items-center justify-between ${
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

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="mb-24 px-4">
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border-2 border-slate-200 dark:border-slate-800 max-w-md mx-auto">
              <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl shrink-0 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-black text-slate-600 dark:text-slate-400 tabular-nums">
                  {currentPage + 1} / {totalPages}
                </span>
              </div>
              <div className="h-7 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)} 
                  disabled={currentPage === 0}
                  className="size-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-primary hover:border-primary disabled:opacity-30 transition-all flex items-center justify-center active:scale-90 shadow-sm"
                >
                  <span className="material-symbols-outlined text-lg rtl-flip">chevron_left</span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage)}
                    className="size-10 rounded-xl font-black text-sm bg-primary text-white shadow-md active:scale-95 transition-all"
                  >
                    {currentPage + 1}
                  </button>
                </div>
                <button 
                  onClick={() => handlePageChange(currentPage + 1)} 
                  disabled={currentPage >= totalPages - 1}
                  className="size-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-primary hover:border-primary disabled:opacity-30 transition-all flex items-center justify-center active:scale-90 shadow-sm"
                >
                  <span className="material-symbols-outlined text-lg rtl-flip">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <PaginationFooter
        currentPage={currentPage}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        currentCount={offers.length}
      />

      {respondingOffer && (
        <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full md:w-[90%] md:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-xl shadow-2xl border-t border-x md:border border-primary/20 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            
            {/* Drag Handle - Mobile Only */}
            <div className="md:hidden pt-3 pb-2 flex justify-center shrink-0 cursor-grab active:cursor-grabbing" onTouchStart={(e) => {
              const startY = e.touches[0].clientY;
              const modal = e.currentTarget.closest('.fixed')?.querySelector('.w-full') as HTMLElement;
              if (!modal) return;
              
              const handleMove = (moveEvent: TouchEvent) => {
                const currentY = moveEvent.touches[0].clientY;
                const diff = currentY - startY;
                if (diff > 0) {
                  modal.style.transform = `translateY(${diff}px)`;
                  modal.style.transition = 'none';
                }
              };
              
              const handleEnd = () => {
                const finalY = modal.getBoundingClientRect().top;
                if (finalY > window.innerHeight * 0.3) {
                  setRespondingOffer(null);
                } else {
                  modal.style.transform = '';
                  modal.style.transition = '';
                }
                document.removeEventListener('touchmove', handleMove);
                document.removeEventListener('touchend', handleEnd);
              };
              
              document.addEventListener('touchmove', handleMove);
              document.addEventListener('touchend', handleEnd);
            }}>
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
            </div>
            
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
                    <label className="text-[11px] font-black text-slate-400 px-1">{lang === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</label>
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
                    <label className="text-[11px] font-black text-slate-400 px-1">{lang === 'ar' ? 'تكلفة الشحن' : 'Shipping Cost'}</label>
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
                    <label className="text-[11px] font-black text-slate-400 px-1">{lang === 'ar' ? 'الكمية المتوفرة' : 'Available Quantity'}</label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">inventory</span>
                      <input 
                        type="number" required min="1"
                        value={formAvailableQty} onChange={(e) => setFormAvailableQty(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-bold focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none shadow-inner"
                        placeholder={t.orders.quantityPlaceholder}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 px-1">{lang === 'ar' ? 'تاريخ التسليم المتوقع' : 'Estimated Delivery Date'}</label>
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
                  <label className="text-[11px] font-black text-slate-400 px-1">{lang === 'ar' ? 'معلومات الشحن' : 'Shipping Information'}</label>
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
                    className="w-full py-5 bg-primary text-white rounded-[1.5rem] font-black text-sm shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-4 tracking-[0.1em]"
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

      {detailsOffer && (
        <div className="fixed inset-0 z-[170] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full md:w-[90%] md:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-xl shadow-2xl border-t border-x md:border border-primary/20 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="md:hidden pt-3 pb-2 flex justify-center shrink-0 cursor-grab active:cursor-grabbing" onTouchStart={(e) => {
              const startY = e.touches[0].clientY;
              const modal = e.currentTarget.closest('.fixed')?.querySelector('.w-full') as HTMLElement;
              if (!modal) return;
              const handleMove = (moveEvent: TouchEvent) => {
                const currentY = moveEvent.touches[0].clientY;
                const diff = currentY - startY;
                if (diff > 0) {
                  modal.style.transform = `translateY(${diff}px)`;
                  modal.style.transition = 'none';
                }
              };
              const handleEnd = () => {
                const finalY = modal.getBoundingClientRect().top;
                if (finalY > window.innerHeight * 0.3) {
                  setDetailsOffer(null);
                } else {
                  modal.style.transform = '';
                  modal.style.transition = '';
                }
                document.removeEventListener('touchmove', handleMove);
                document.removeEventListener('touchend', handleEnd);
              };
              document.addEventListener('touchmove', handleMove);
              document.addEventListener('touchend', handleEnd);
            }}>
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
            </div>

            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'تفاصيل الطلب' : 'Order details'}</h3>
                <p className="text-[11px] font-bold text-slate-400">Ref: {detailsOffer.id.slice(-8).toUpperCase()}</p>
              </div>
              <button onClick={() => setDetailsOffer(null)} className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 transition-all flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                <p className="text-sm font-black text-slate-800 dark:text-white">{detailsOffer.productName}</p>
                <p className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'العميل:' : 'Customer:'} {detailsOffer.customerOrganizationName || '-'}</p>
                <p className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'الكمية:' : 'Quantity:'} {detailsOffer.quantity} {detailsOffer.unit || (lang === 'ar' ? 'وحدة' : 'Units')}</p>
                <p className="text-xs font-bold text-slate-500 break-all">{lang === 'ar' ? 'رقم الطلب:' : 'Order ID:'} {detailsOffer.orderId}</p>
                <p className="text-xs font-bold text-slate-500 break-all">{lang === 'ar' ? 'الفئة:' : 'Category ID:'} {detailsOffer.categoryId || '-'}</p>
                <p className="text-xs font-bold text-slate-500 break-all">{lang === 'ar' ? 'الفئة الفرعية:' : 'Subcategory ID:'} {detailsOffer.subCategoryId || '-'}</p>
              </div>

              {(detailsOffer.manualOrder || detailsOffer.specialOfferId) && (
                <div className="flex flex-wrap gap-2">
                  {detailsOffer.manualOrder && (
                    <span className="px-2 py-1 rounded-lg text-xs font-black border bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                      {lang === 'ar' ? 'طلب يدوي' : 'Manual Request'}
                    </span>
                  )}
                  {detailsOffer.specialOfferId && (
                    <span className="px-2 py-1 rounded-lg text-xs font-black border bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                      {lang === 'ar' ? 'عرض خاص' : 'Special Offer'}
                    </span>
                  )}
                </div>
              )}

              {renderExtraFields(detailsOffer)}

              {detailsOffer.supplierResponse ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4 space-y-2">
                  <p className="text-xs font-black text-slate-700 dark:text-slate-200">{lang === 'ar' ? 'تفاصيل عرض السعر' : 'Quote details'}</p>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{lang === 'ar' ? 'سعر الوحدة:' : 'Unit price:'} {detailsOffer.supplierResponse.price} EGP</p>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{lang === 'ar' ? 'تكلفة الشحن:' : 'Shipping cost:'} {detailsOffer.supplierResponse.shippingCost} EGP</p>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{lang === 'ar' ? 'الكمية المتاحة:' : 'Available quantity:'} {detailsOffer.supplierResponse.availableQuantity}</p>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{lang === 'ar' ? 'موعد التسليم:' : 'Delivery date:'} {detailsOffer.supplierResponse.estimatedDelivery}</p>
                  {!!detailsOffer.supplierResponse.shippingInfo && (
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 break-words">{lang === 'ar' ? 'معلومات الشحن:' : 'Shipping info:'} {detailsOffer.supplierResponse.shippingInfo}</p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4">
                  <p className="text-xs font-bold text-slate-400">{lang === 'ar' ? 'لم يتم إرسال عرض سعر بعد' : 'No quote submitted yet'}</p>
                </div>
              )}
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
