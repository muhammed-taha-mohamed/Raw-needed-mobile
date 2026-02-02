
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import OrderChat from '../../components/OrderChat';

interface RFQOrder {
  id: string;
  orderNumber: string;
  userId: string;
  userName: string;
  ownerId: string;
  organizationName: string;
  organizationCRN: string;
  status: 'NEW' | 'NEGOTIATING' | 'UNDER_CONFIRMATION' | 'COMPLETED' | 'CANCELLED';
  numberOfLines: number;
  createdAt: string;
  createdByOwner: boolean;
}

interface SupplierResponse {
  price: number;
  shippingCost: number;
  estimatedDelivery: string;
  respondedAt: string;
  availableQuantity: number;
  shippingInfo: string;
  phoneNumber?: string; 
}

interface RFQLine {
  id: string;
  orderId: string;
  supplierId: string;
  supplierName: string;
  supplierOrganizationName: string;
  supplierPhone: string;
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  status: string;
  supplierResponse: SupplierResponse | null;
}

interface PaginatedRFQ {
  content: RFQOrder[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

const Orders: React.FC = () => {
  const { lang, t } = useLanguage();
  const [orders, setOrders] = useState<RFQOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const [selectedOrder, setSelectedOrder] = useState<RFQOrder | null>(null);
  const [orderLines, setOrderLines] = useState<RFQLine[]>([]);
  const [isLoadingLines, setIsLoadingLines] = useState(false);
  const [processingLineId, setProcessingLineId] = useState<string | null>(null);
  const [chatOrderLine, setChatOrderLine] = useState<RFQLine | null>(null);

  const [orderToCancel, setOrderToCancel] = useState<RFQOrder | null>(null);
  const [lineToApprove, setLineToApprove] = useState<RFQLine | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchOrders(currentPage, statusFilter, pageSize);
  }, [currentPage, statusFilter, pageSize]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchOrders = async (page: number, status: string | null, size: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const statusParam = status ? `&status=${status}` : '';
      const response = await api.get<PaginatedRFQ>(`/api/v1/rfq/by-creator?page=${page}&size=${size}${statusParam}`);
      setOrders(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load orders history.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrderDetails = async (order: RFQOrder) => {
    setSelectedOrder(order);
    setIsLoadingLines(true);
    setOrderLines([]);
    try {
      const data = await api.get<RFQLine[]>(`/api/v1/rfq/${order.id}/lines`);
      setOrderLines(data || []);
    } catch (err: any) {
      console.error("Failed to load line details", err);
    } finally {
      setIsLoadingLines(false);
    }
  };

  const handleApproveConfirm = async () => {
    if (!lineToApprove) return;
    setProcessingLineId(lineToApprove.id);
    try {
      await api.post(`/api/v1/rfq/line/${lineToApprove.id}/approve`, {});
      setToast({ message: lang === 'ar' ? 'تم اعتماد العرض بنجاح' : 'Offer approved successfully', type: 'success' });
      setLineToApprove(null);
      if (selectedOrder) fetchOrderDetails(selectedOrder);
      fetchOrders(currentPage, statusFilter, pageSize);
    } catch (err: any) {
      setToast({ message: err.message || (lang === 'ar' ? 'فشل في عملية الاعتماد' : 'Approval failed'), type: 'error' });
    } finally {
      setProcessingLineId(null);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel) return;
    setIsCancelling(true);
    try {
      await api.delete(`/api/v1/rfq/${orderToCancel.id}`);
      setToast({ message: lang === 'ar' ? 'تم إلغاء الطلب' : 'Order cancelled', type: 'success' });
      await fetchOrders(currentPage, statusFilter, pageSize);
      setOrderToCancel(null);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to cancel order", type: 'error' });
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusConfig = (status: RFQOrder['status']) => {
    const configs = {
      NEW: { label: lang === 'ar' ? 'طلب جديد' : 'New RFQ', bg: 'bg-blue-50 text-blue-600 border-blue-100', dot: 'bg-blue-500' },
      NEGOTIATING: { label: lang === 'ar' ? 'تفاوض' : 'Negotiating', bg: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-500' },
      UNDER_CONFIRMATION: { label: lang === 'ar' ? 'في انتظار التأكيد' : 'Waiting confirmation', bg: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-amber-500' },
      COMPLETED: { label: lang === 'ar' ? 'مكتمل' : 'Completed', bg: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-500' },
      CANCELLED: { label: lang === 'ar' ? 'ملغي' : 'Cancelled', bg: 'bg-red-50 text-red-600 border-red-100', dot: 'bg-red-500' }
    };
    return configs[status] || configs.NEW;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const filterOptions = [
    { id: null, label: lang === 'ar' ? 'الكل' : 'All Requests' },
    { id: 'NEW', label: lang === 'ar' ? 'طلبات جديدة' : 'New Requests' },
    { id: 'NEGOTIATING', label: lang === 'ar' ? 'قيد التفاوض' : 'Negotiating' },
    { id: 'COMPLETED', label: lang === 'ar' ? 'طلبات مكتملة' : 'Completed' },
    { id: 'CANCELLED', label: lang === 'ar' ? 'طلبات ملغاة' : 'Cancelled' }
  ];

  return (
    <div className="mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-6 animate-in fade-in slide-in-from-bottom-4 duration-700 font-display relative pb-32 md:pb-8">
      
      {/* Top Filter Bar - Web only */}
      <div className="hidden md:flex flex-wrap items-center gap-2 mb-6 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <span className="text-xs font-black text-slate-400 mr-2">{lang === 'ar' ? 'الحالة:' : 'Status:'}</span>
        {filterOptions.map((opt) => (
          <button
            key={opt.id as any}
            onClick={() => { setStatusFilter(opt.id); setCurrentPage(0); }}
            className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
              statusFilter === opt.id
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary'
            }`}
          >
            {opt.label}
          </button>
        ))}
        {statusFilter && (
          <button onClick={() => { setStatusFilter(null); setCurrentPage(0); }} className="text-xs font-black text-red-500 hover:underline ml-2">
            {lang === 'ar' ? 'مسح' : 'Clear'}
          </button>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-32 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-xl shadow-2xl font-black text-xs animate-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>
           {toast.message}
        </div>
      )}

      {/* Main List Area */}
      <div className="min-h-[400px]">
        {isLoading && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40">
             <div className="size-10 border-[3px] border-primary/10 border-t-primary rounded-full animate-spin mb-4"></div>
             <p className="text-slate-400 font-black text-[10px] md:text-xs opacity-50">Loading...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-32 text-center flex flex-col items-center gap-6 opacity-30 animate-in fade-in duration-700">
             <span className="material-symbols-outlined text-7xl">receipt_long</span>
             <div className="space-y-1">
               <h3 className="text-xl md:text-2xl font-black">{lang === 'ar' ? 'لا يوجد طلبات' : 'No Orders Found'}</h3>
               <p className="text-sm md:text-base font-bold">{lang === 'ar' ? 'لم تقم بإرسال أي طلبات عروض أسعار بعد.' : 'You haven\'t sent any RFQs yet.'}</p>
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {orders.map((order, idx) => {
              const status = getStatusConfig(order.status);
              const isCancelable = order.status === 'NEW' || order.status === 'NEGOTIATING';
              
              return (
                <div key={order.id} className="bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row items-center gap-3 group animate-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 30}ms` }}>
                  <div className="flex items-center gap-3.5 flex-1 w-full">
                    <div className={`size-11 rounded-2xl flex items-center justify-center border shrink-0 transition-all duration-500 ${status.bg} group-hover:scale-105 shadow-inner`}>
                      <span className="material-symbols-outlined text-lg">request_quote</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 mb-1">
                        <h3 className="text-sm md:text-base font-black text-slate-800 dark:text-white tabular-nums ">#{order.orderNumber}</h3>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] md:text-xs font-black border ${status.bg}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] md:text-xs font-bold text-slate-400">
                         <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">inventory_2</span> {order.numberOfLines} {lang === 'ar' ? 'مواد' : 'Items'}</span>
                         <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                         <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">calendar_today</span> {formatDate(order.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <button 
                      onClick={() => isCancelable && setOrderToCancel(order)} 
                      disabled={!isCancelable}
                      className={`size-9 rounded-xl border transition-all flex items-center justify-center active:scale-90 ${isCancelable ? 'border-red-50 dark:border-red-900/20 text-red-400 hover:bg-red-500 hover:text-white' : 'border-slate-100 dark:border-slate-800 text-slate-200 dark:text-slate-700 cursor-not-allowed opacity-40'}`}
                      title={lang === 'ar' ? 'إلغاء الطلب' : 'Cancel Order'}
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                    <button 
                      onClick={() => fetchOrderDetails(order)} 
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-black text-[10px] md:text-xs hover:bg-slate-900 dark:hover:bg-slate-800 transition-all active:scale-95 whitespace-nowrap shadow-md shadow-primary/10  "
                    >
                      <span className="material-symbols-outlined text-base">visibility</span>
                      {lang === 'ar' ? 'التفاصيل' : 'Details'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Filter FAB - Mobile only */}
      <div className="md:hidden fixed bottom-32 left-0 right-0 z-[130] pointer-events-none px-6">
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
                  <h3 className="text-[10px] font-black  text-slate-400">{lang === 'ar' ? 'تصفية الحالة' : 'Status Filter'}</h3>
                  {statusFilter && (
                    <button onClick={() => {setStatusFilter(null); setShowFilterMenu(false);}} className="text-[10px] font-black text-red-500   ">{lang === 'ar' ? 'مسح' : 'Clear'}</button>
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

      {/* Pagination Footer - Slim Pill Style */}
      {(totalPages > 1 || orders.length > 0) && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-slate-100 dark:border-slate-800 animate-in fade-in duration-500 mt-8 max-w-fit mx-auto sm:mx-0 sm:ml-auto rtl:sm:mr-auto">
           <div className="flex items-center gap-1">
              <button 
                onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 0}
                className="size-8 md:size-9 rounded-full border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
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
                        className={`size-8 md:size-9 rounded-full font-black text-[11px] md:text-xs transition-all ${
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
                className="size-8 md:size-9 rounded-full border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
              >
                <span className="material-symbols-outlined text-base rtl-flip">chevron_right</span>
              </button>
           </div>

           <div className="h-5 w-px bg-slate-100 dark:bg-slate-800 mx-1"></div>

           <div className="px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-full shrink-0">
              <span className="text-[10px] md:text-xs font-black text-slate-500 tabular-nums">
                {orders.length} / {totalElements}
              </span>
           </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-primary/10 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 flex flex-col h-[85vh]">
                 <div className="p-5 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="size-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-xl">fact_check</span></div>
                    <div>
                       <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white leading-none">#{selectedOrder.orderNumber}</h3>
                       <p className="text-[9px] md:text-xs font-black text-slate-400    mt-2  ">{lang === 'ar' ? 'تفاصيل بنود العرض' : 'RFQ Items & Responses'}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedOrder(null)} className="size-9 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center border border-slate-100 dark:border-slate-800 active:scale-90"><span className="material-symbols-outlined text-lg">close</span></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 md:p-8 custom-scrollbar space-y-4 bg-slate-50/20">
                 {isLoadingLines ? (
                   <div className="py-20 flex flex-col items-center justify-center"><div className="size-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
                 ) : (
                   orderLines.map((line) => (
                     <div key={line.id} className="bg-white dark:bg-slate-900 rounded-[1.8rem] p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex flex-col md:flex-row gap-5">
                           <div className="flex items-center gap-4 flex-1">
                              <div className="size-14 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0 shadow-inner">{line.productImage ? <img src={line.productImage} className="size-full object-cover" /> : <div className="size-full flex items-center justify-center text-slate-200"><span className="material-symbols-outlined text-2xl">inventory_2</span></div>}</div>
                              <div className="min-w-0">
                                 <h4 className="text-sm md:text-base font-black text-slate-800 dark:text-white truncate">{line.productName}</h4>
                                 <p className="text-[10px] md:text-xs font-bold text-slate-500">{lang === 'ar' ? 'المورد: ' : 'Supplier: '} {line.supplierOrganizationName || line.supplierName}</p>
                                 <p className="text-[10px] md:text-xs font-black text-primary mt-1">{lang === 'ar' ? 'الكمية المطلوبة: ' : 'Requested Qty: '} {line.quantity}</p>
                              </div>
                           </div>
                           
                           <div className="flex items-center gap-3">
                              {line.supplierResponse ? (
                                <div className="flex-1 bg-primary/5 dark:bg-slate-800 rounded-2xl p-3 border border-primary/10 shadow-sm min-w-[180px]">
                                   <div className="flex justify-between items-center mb-1.5"><span className="text-[9px] md:text-xs font-black text-emerald-500   ">{lang === 'ar' ? 'عرض السعر' : 'Quote Received'}</span><span className="text-base md:text-lg font-black tabular-nums text-slate-900 dark:text-white">{line.supplierResponse.price} <span className="text-[10px] md:text-xs font-bold opacity-50">EGP</span></span></div>
                                   <div className="grid grid-cols-2 gap-3 pt-1.5 border-t border-primary/5 dark:border-slate-800">
                                      <div><p className="text-[8px] md:text-[10px] font-bold text-slate-400">{lang === 'ar' ? 'الشحن' : 'Shipping'}</p><p className="text-[10px] md:text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums">{line.supplierResponse.shippingCost} EGP</p></div>
                                      <div><p className="text-[8px] md:text-[10px] font-bold text-slate-400">{lang === 'ar' ? 'التسليم' : 'Delivery'}</p><p className="text-[10px] md:text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums">{formatDate(line.supplierResponse.estimatedDelivery)}</p></div>
                                   </div>
                                </div>
                              ) : (
                                <div className="flex-1 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-dashed border-slate-200 dark:border-slate-700 text-center min-w-[180px] flex items-center justify-center"><p className="text-[10px] md:text-xs font-bold text-slate-400">{lang === 'ar' ? 'في انتظار رد المورد...' : 'Waiting for supplier...'}</p></div>
                              )}
                              
                              <div className="flex flex-col sm:flex-row gap-2 items-center">
                                 {line.supplierResponse && line.status === 'RESPONDED' && (
                                   <button 
                                     disabled={processingLineId === line.id}
                                     onClick={() => setLineToApprove(line)}
                                     className="size-10 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shrink-0"
                                   ><span className="material-symbols-outlined text-xl">check_circle</span></button>
                                 )}
                                 <div className="flex items-center gap-2">
                                   <button onClick={() => setChatOrderLine(line)} className="size-10 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shrink-0" title={lang === 'ar' ? 'دردشة' : 'Chat'}><span className="material-symbols-outlined text-xl">forum</span></button>
                                   {line.supplierResponse?.phoneNumber && (() => {
                                     const phone = String(line.supplierResponse!.phoneNumber).trim().replace(/\D/g, '');
                                     if (!phone) return null;
                                     const defaultMessage = lang === 'ar'
                                       ? 'مرحباً، أتصل بخصوص طلب عرض السعر / الطلب.'
                                       : 'Hello, I am contacting regarding the quote/order.';
                                     const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(defaultMessage)}`;
                                     return (
                                       <a
                                         href={waUrl}
                                         target="_blank"
                                         rel="noopener noreferrer"
                                         className="size-10 rounded-xl bg-[#25D366] text-white shadow-lg shadow-[#25D366]/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shrink-0"
                                         title={lang === 'ar' ? 'واتساب' : 'WhatsApp'}
                                       >
                                         <svg className="size-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                       </a>
                                     );
                                   })()}
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 text-center animate-in zoom-in-95">
              <div className="size-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6"><span className="material-symbols-outlined text-4xl">warning</span></div>
              <h3 className="text-xl md:text-2xl font-black mb-2">{lang === 'ar' ? 'إلغاء الطلب؟' : 'Cancel Order?'}</h3>
              <p className="text-sm md:text-base text-slate-500 font-bold mb-8">{lang === 'ar' ? 'هل أنت متأكد من رغبتك في إلغاء الطلب بالكامل؟' : 'Are you sure you want to cancel the entire request?'}</p>
              <div className="flex gap-4">
                 <button onClick={() => setOrderToCancel(null)} className="flex-1 py-3.5 bg-slate-100 rounded-xl font-black text-slate-500 hover:bg-slate-200 transition-all    text-[10px] md:text-xs  ">{t.team.cancel}</button>
                 <button onClick={handleCancelOrder} disabled={isCancelling} className="flex-1 py-3.5 bg-red-600 text-white rounded-xl font-black shadow-lg hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center text-[10px] md:text-xs     ">
                   {isCancelling ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (lang === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancel')}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Approval Confirmation Modal */}
      {lineToApprove && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 text-center animate-in zoom-in-95">
              <div className="size-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6"><span className="material-symbols-outlined text-4xl">verified</span></div>
              <h3 className="text-xl md:text-2xl font-black mb-2">{lang === 'ar' ? 'اعتماد عرض السعر؟' : 'Approve Offer?'}</h3>
              <p className="text-sm md:text-base text-slate-500 font-bold mb-8">{lang === 'ar' ? 'بمجرد الاعتماد، ستتحول الحالة لمرحلة التأكيد النهائية.' : 'Once approved, the status will move to final confirmation.'}</p>
              <div className="flex gap-4">
                 <button onClick={() => setLineToApprove(null)} className="flex-1 py-3.5 bg-slate-100 rounded-xl font-black text-slate-500 hover:bg-slate-200 transition-all    text-[10px] md:text-xs  ">{t.team.cancel}</button>
                 <button onClick={handleApproveConfirm} disabled={!!processingLineId} className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-black shadow-lg hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center text-[10px] md:text-xs     ">
                   {processingLineId ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (lang === 'ar' ? 'تأكيد الاعتماد' : 'Confirm Approval')}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Chat Component */}
      {chatOrderLine && (
        <OrderChat 
          isOpen={!!chatOrderLine}
          onClose={() => setChatOrderLine(null)}
          orderId={chatOrderLine.id}
          orderNumber={selectedOrder?.orderNumber || chatOrderLine.id.slice(-6)}
          title={chatOrderLine.productName}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 154, 167, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Orders;
