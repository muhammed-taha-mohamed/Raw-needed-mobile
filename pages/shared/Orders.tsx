
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../App';
import { api } from '../../api';
import OrderChat from '../../components/OrderChat';
import EmptyState from '../../components/EmptyState';
import PaginationFooter from '../../components/PaginationFooter';
import FloatingLabelInput from '../../components/FloatingLabelInput';

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
  specialOfferId?: string; // Flag to indicate if order is from special offer
}

interface SupplierResponse {
  price: number;
  shippingCost: number;
  estimatedDelivery: string;
  respondedAt: string;
  availableQuantity: number;
  shippingInfo: string;
  phoneNumber?: string;
  analysisCertificateUrl?: string;
}

interface RFQLine {
  id: string;
  orderId: string;
  supplierId: string;
  supplierName: string;
  supplierOrganizationName: string;
  supplierPhone: string;
  productId: string | null;
  productName: string;
  productEnglishName?: string | null;
  productArabicName?: string | null;
  productImage: string;
  unit?: string | null;
  categoryId?: string | null;
  subCategoryId?: string | null;
  extraFieldValues?: Record<string, string>;
  manualOrder?: boolean;
  quantity: number;
  status: string;
  supplierResponse: SupplierResponse | null;
  specialOfferId?: string; // Flag to indicate if order line is from special offer
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
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<RFQOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [coaPreviewUrl, setCoaPreviewUrl] = useState<string | null>(null);

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
  const [lineSearchName, setLineSearchName] = useState('');

  const [orderToCancel, setOrderToCancel] = useState<RFQOrder | null>(null);
  const [lineToApprove, setLineToApprove] = useState<RFQLine | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const lastHandledDeepLinkRef = useRef('');

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

  const fetchOrderDetails = async (order: RFQOrder): Promise<RFQLine[]> => {
    setSelectedOrder(order);
    setIsLoadingLines(true);
    setOrderLines([]);
    try {
      const data = await api.get<RFQLine[]>(`/api/v1/rfq/${order.id}/lines`);
      setOrderLines(data || []);
      return data || [];
    } catch (err: any) {
      console.error("Failed to load line details", err);
      return [];
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

  const renderExtraFields = (line: RFQLine) => {
    const extra = line.extraFieldValues || {};
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

  const filteredLines = useMemo(() => {
    const term = lineSearchName.trim().toLowerCase();
    if (!term) return orderLines;
    return orderLines.filter((l) => {
      const combinedName = `${l.productName || ''} ${(l.extraFieldValues?.serviceName || '')}`;
      return combinedName.toLowerCase().includes(term);
    });
  }, [orderLines, lineSearchName]);

  useEffect(() => {
    const orderId = searchParams.get('orderId') || '';
    const lineId = searchParams.get('lineId') || '';
    const openChat = searchParams.get('openChat') === '1';
    const navTs = searchParams.get('navTs') || '';

    if (!orderId && !lineId) return;

    const deepLinkKey = `${orderId}|${lineId}|${openChat}|${navTs}`;
    if (lastHandledDeepLinkRef.current === deepLinkKey) return;
    lastHandledDeepLinkRef.current = deepLinkKey;

    const openDeepLinkedOrder = async () => {
      try {
        const targetOrder = await api.get<RFQOrder>(`/api/v1/rfq/${orderId}`);
        const lines = await fetchOrderDetails(targetOrder);

        if (openChat && lineId) {
          const targetLine = lines.find((line) => line.id === lineId);
          if (targetLine) {
            setChatOrderLine(targetLine);
          }
        }
      } catch (err) {
        console.error('Failed to open notification deep link', err);
      }
    };

    if (orderId) {
      void openDeepLinkedOrder();
    }
  }, [searchParams]);

  return (
    <div className="w-full py-6 animate-in fade-in slide-in-from-bottom-4 duration-700 font-display relative pb-32 md:pb-8">

      {toast && (
        <div className={`fixed bottom-32 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-xl shadow-2xl font-black text-xs animate-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>
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
                    className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${statusFilter === opt.id
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
              {isLoading && orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40">
                  <div className="size-10 border-[3px] border-primary/10 border-t-primary rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-400 font-black text-xs opacity-50">Loading...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <EmptyState title={lang === 'ar' ? 'لا يوجد طلبات' : 'No Orders Found'} subtitle={lang === 'ar' ? 'لم تقم بإرسال أي طلبات عروض أسعار بعد.' : 'You haven\'t sent any RFQs yet.'} />
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {orders.map((order, idx) => {
                    const status = getStatusConfig(order.status);
                    const isCancelable = order.status === 'NEW' || order.status === 'NEGOTIATING';

                    return (
                      <div key={order.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group">
                        <div className={`size-12 rounded-2xl flex items-center justify-center border shrink-0 transition-all ${status.bg} group-hover:scale-105 shadow-inner`}>
                          <span className="material-symbols-outlined text-xl">request_quote</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                            <h3 className="text-base font-black text-slate-800 dark:text-white tabular-nums">#{order.orderNumber}</h3>
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${status.bg}`}>
                              {status.label}
                            </span>
                            {order.specialOfferId && (
                              <span className="px-2 py-0.5 rounded-lg text-xs font-black border bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">local_offer</span>
                                {lang === 'ar' ? 'عرض خاص' : 'Special Offer'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">inventory_2</span> {order.numberOfLines} {lang === 'ar' ? 'مواد' : 'Items'}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">calendar_today</span> {lang === 'ar' ? 'تاريخ الطلب:' : 'Order Date:'} <span className="font-black text-slate-600 dark:text-slate-300">{formatDate(order.createdAt)}</span></span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => isCancelable && setOrderToCancel(order)}
                            disabled={!isCancelable}
                            className={`size-10 rounded-xl border transition-all flex items-center justify-center active:scale-90 ${isCancelable ? 'border-red-50 dark:border-red-900/20 text-red-400 hover:bg-red-500 hover:text-white' : 'border-slate-100 dark:border-slate-800 text-slate-200 dark:text-slate-700 cursor-not-allowed opacity-40'}`}
                            title={lang === 'ar' ? 'إلغاء الطلب' : 'Cancel Order'}
                          >
                            <span className="material-symbols-outlined text-lg">close</span>
                          </button>
                          <button
                            onClick={() => fetchOrderDetails(order)}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-black text-xs hover:bg-slate-900 dark:hover:bg-slate-800 transition-all active:scale-95 whitespace-nowrap shadow-md shadow-primary/10"
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
            <PaginationFooter
              currentPage={currentPage}
              totalPages={totalPages}
              totalElements={totalElements}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              currentCount={orders.length}
              asTableFooter
            />
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        {/* Main List Area */}
        <div className="min-h-[400px] mb-6">
          {isLoading && orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40">
              <div className="size-10 border-[3px] border-primary/10 border-t-primary rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400 font-black text-[10px] md:text-xs opacity-50">Loading...</p>
            </div>
          ) : orders.length === 0 ? (
            <EmptyState title={lang === 'ar' ? 'لا يوجد طلبات' : 'No Orders Found'} subtitle={lang === 'ar' ? 'لم تقم بإرسال أي طلبات عروض أسعار بعد.' : 'You haven\'t sent any RFQs yet.'} />
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
                          {order.specialOfferId && (
                            <span className="px-2 py-0.5 rounded-lg text-[9px] md:text-xs font-black border bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[10px]">local_offer</span>
                              {lang === 'ar' ? 'عرض خاص' : 'Special Offer'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] md:text-xs font-bold text-slate-400">
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">inventory_2</span> {order.numberOfLines} {lang === 'ar' ? 'مواد' : 'Items'}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">calendar_today</span> {lang === 'ar' ? 'تاريخ الطلب:' : 'Order Date:'} <span className="font-black text-slate-600 dark:text-slate-300">{formatDate(order.createdAt)}</span></span>
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
                    <h3 className="text-[10px] font-black  text-slate-400">{lang === 'ar' ? 'تصفية الحالة' : 'Status Filter'}</h3>
                    {statusFilter && (
                      <button onClick={() => { setStatusFilter(null); setShowFilterMenu(false); }} className="text-[10px] font-black text-red-500   ">{lang === 'ar' ? 'مسح' : 'Clear'}</button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {filterOptions.map((opt) => (
                      <button
                        key={opt.id as any}
                        onClick={() => { setStatusFilter(opt.id); setCurrentPage(0); setShowFilterMenu(false); }}
                        className={`w-full text-start px-4 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-between ${statusFilter === opt.id
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
        {totalPages > 0 && (
          <div className="px-4 mb-24">
            <PaginationFooter
              currentPage={currentPage}
              totalPages={totalPages}
              totalElements={totalElements}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              currentCount={orders.length}
            />
          </div>
        )}
      </div>



      {/* Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`w-full md:w-[85vw] md:max-w-[85vw] bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-xl shadow-2xl border-t border-x md:border border-primary/10 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 flex flex-col h-[85vh] ${chatOrderLine ? 'md:h-[65vh]' : 'md:h-[85vh]'}`}>

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
                  setSelectedOrder(null);
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

            <div className="p-5 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="flex items-center gap-4 shrink-0">
                  <div className="size-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg">
                    <span className="material-symbols-outlined text-xl">fact_check</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white leading-none">#{selectedOrder.orderNumber}</h3>
                      {selectedOrder.specialOfferId && (
                        <span className="px-2 py-1 rounded-lg text-[9px] md:text-xs font-black border bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[10px]">local_offer</span>
                          {lang === 'ar' ? 'عرض خاص' : 'Special Offer'}
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] md:text-xs font-black text-slate-400 mt-2">{lang === 'ar' ? 'تفاصيل بنود العرض' : 'RFQ Items & Responses'}</p>
                  </div>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 min-w-[160px]">
                      <FloatingLabelInput
                        label={lang === 'ar' ? 'بحث باسم المنتج' : 'Search by product'}
                        placeholder={lang === 'ar' ? 'ابحث باسم المنتج...' : 'Search product name...'}
                        value={lineSearchName}
                        onChange={(e) => setLineSearchName((e.target as HTMLInputElement).value)}
                        leadingIcon="search"
                        isRtl={lang === 'ar'}
                      />
                    </div>
                    {lineSearchName && (
                      <button
                        onClick={() => setLineSearchName('')}
                        className="text-[10px] font-black text-red-500"
                      >
                        {lang === 'ar' ? 'مسح' : 'Clear'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="self-start">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="size-9 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center border border-slate-100 dark:border-slate-800 active:scale-90"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-8 custom-scrollbar space-y-4 bg-slate-50/20">
              {isLoadingLines ? (
                <div className="py-20 flex flex-col items-center justify-center"><div className="size-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
              ) : (
                filteredLines.map((line) => (
                  <div key={line.id} className="bg-white dark:bg-slate-900 rounded-[1.8rem] p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-5">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="size-14 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0 shadow-inner">{line.productImage ? <img src={line.productImage} className="size-full object-cover" /> : <div className="size-full flex items-center justify-center text-slate-200"><span className="material-symbols-outlined text-2xl">inventory_2</span></div>}</div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="text-sm md:text-base font-black text-slate-800 dark:text-white truncate">
                              {(lang === 'ar' ? (line.productArabicName || line.productName || line.productEnglishName) : (line.productEnglishName || line.productName || line.productArabicName)) as string}
                            </h4>
                            {line.manualOrder && (
                              <span className="px-2 py-0.5 rounded-lg text-[8px] md:text-[9px] font-black border bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[9px]">edit_document</span>
                                {lang === 'ar' ? 'طلب يدوي' : 'Manual Request'}
                              </span>
                            )}
                            {line.specialOfferId && (
                              <span className="px-2 py-0.5 rounded-lg text-[8px] md:text-[9px] font-black border bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[9px]">local_offer</span>
                                {lang === 'ar' ? 'عرض خاص' : 'Special Offer'}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] md:text-xs font-bold text-slate-500">{lang === 'ar' ? 'الموزع: ' : 'Distributor: '} {line.supplierOrganizationName || line.supplierName}</p>
                          <p className="text-[10px] md:text-xs font-black text-primary mt-1">
                            {lang === 'ar' ? 'الكمية المطلوبة: ' : 'Requested Qty: '} {line.quantity} {line.unit || (lang === 'ar' ? 'وحدة' : 'Units')}
                          </p>
                          {(line.categoryId || line.subCategoryId) && (
                            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 mt-1 break-all">
                              {line.categoryId ? `${lang === 'ar' ? 'الفئة:' : 'Category:'} ${line.categoryId}` : ''}
                              {line.categoryId && line.subCategoryId ? ' • ' : ''}
                              {line.subCategoryId ? `${lang === 'ar' ? 'النوع:' : 'Subcategory:'} ${line.subCategoryId}` : ''}
                            </p>
                          )}
                          {renderExtraFields(line)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {line.supplierResponse ? (
                          <div className="flex-1 bg-primary/5 dark:bg-slate-800 rounded-2xl p-3 border border-primary/10 shadow-sm min-w-[220px] md:min-w-[300px]">
                            <div className="flex justify-between items-center mb-1.5"><span className="text-[9px] md:text-xs font-black text-emerald-500   ">{lang === 'ar' ? 'عرض السعر' : 'Quote Received'}</span><span className="text-base md:text-lg font-black tabular-nums text-slate-900 dark:text-white">{line.supplierResponse.price} <span className="text-[10px] md:text-xs font-bold opacity-50">EGP</span></span></div>
                            <div className="grid grid-cols-2 gap-3 pt-1.5 border-t border-primary/5 dark:border-slate-800">
                              <div><p className="text-[8px] md:text-[10px] font-bold text-slate-400">{lang === 'ar' ? 'الشحن' : 'Shipping'}</p><p className="text-[10px] md:text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums">{line.supplierResponse.shippingCost} EGP</p></div>
                              <div><p className="text-[8px] md:text-[10px] font-bold text-slate-400">{lang === 'ar' ? 'التسليم' : 'Delivery'}</p><p className="text-[10px] md:text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums">{formatDate(line.supplierResponse.estimatedDelivery)}</p></div>
                            </div>
                            {!!line.supplierResponse.analysisCertificateUrl && (
                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={() => setCoaPreviewUrl(line.supplierResponse!.analysisCertificateUrl!)}
                                  className="inline-flex items-center gap-1 text-[10px] md:text-xs font-black text-primary hover:underline"
                                >
                                  <span className="material-symbols-outlined text-sm">image</span>
                                  {lang === 'ar' ? 'عرض شهادة التحليل' : 'View Certificate of Analysis'}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex-1 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-dashed border-slate-200 dark:border-slate-700 text-center min-w-[180px] flex items-center justify-center"><p className="text-[10px] md:text-xs font-bold text-slate-400">{lang === 'ar' ? 'في انتظار رد الموزع...' : 'Waiting for distributor...'}</p></div>
                        )}

                        <div className="flex flex-col gap-2 w-[7.5rem] md:w-[8rem] shrink-0">
                          <div className="grid grid-cols-2 gap-2">
                            {/* Chat */}
                            <button
                              onClick={() => setChatOrderLine(line)}
                              className="size-10 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                              title={lang === 'ar' ? 'دردشة' : 'Chat'}
                            >
                              <span className="material-symbols-outlined text-xl">forum</span>
                            </button>
                            {/* WhatsApp */}
                            {line.supplierResponse?.phoneNumber ? (() => {
                              const phone = String(line.supplierResponse.phoneNumber).trim().replace(/\D/g, '');
                              if (!phone) return <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center" />;
                              const defaultMessage = lang === 'ar'
                                ? 'مرحباً، أتصل بخصوص طلب عرض السعر / الطلب.'
                                : 'Hello, I am contacting regarding the quote/order.';
                              const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(defaultMessage)}`;
                              return (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="size-10 rounded-xl bg-[#25D366] text-white shadow-lg shadow-[#25D366]/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                                  title="WhatsApp"
                                >
                                  <svg className="size-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                </a>
                              );
                            })() : (
                              <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg">chat</span>
                              </div>
                            )}
                            {/* Decision zone */}
                            {(() => {
                              const approved = line.status === 'APPROVED';
                              const rejected = line.status === 'REJECTED';
                              const hasSupplierResponse = !!line.supplierResponse;
                              const canDecide = hasSupplierResponse && !(approved || rejected);
                              if (approved || rejected) {
                                if (!hasSupplierResponse) {
                                  return null;
                                }
                                return (
                                  <button
                                    disabled
                                    className={`col-span-2 h-10 rounded-xl font-black text-xs flex items-center justify-center ${approved
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800'} `}
                                    style={{ gridColumn: '1 / span 2' }}
                                  >
                                    {approved ? (lang === 'ar' ? 'تم الموافقة' : 'Approved') : (lang === 'ar' ? 'تم الرفض' : 'Rejected')}
                                  </button>
                                );
                              }
                              if (!canDecide) {
                                return null;
                              }
                              return (
                                <>
                                  <button
                                    onClick={() => setLineToApprove(line)}
                                    className="size-10 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-center hover:bg-emerald-700 active:scale-95 transition-all"
                                    title={lang === 'ar' ? 'قبول' : 'Accept'}
                                  >
                                    <span className="material-symbols-outlined text-xl">check</span>
                                  </button>
                                  <button
                                    onClick={async () => {
                                      setProcessingLineId(line.id);
                                      try {
                                        await api.post(`/api/v1/rfq/line/${line.id}/reject`, {});
                                        setToast({ message: lang === 'ar' ? 'تم رفض العرض' : 'Offer rejected', type: 'success' });
                                        if (selectedOrder) fetchOrderDetails(selectedOrder);
                                        fetchOrders(currentPage, statusFilter, pageSize);
                                      } catch (err: any) {
                                        setToast({ message: err.message || (lang === 'ar' ? 'فشل الرفض' : 'Reject failed'), type: 'error' });
                                      } finally {
                                        setProcessingLineId(null);
                                      }
                                    }}
                                    className="size-10 rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/20 flex items-center justify-center hover:bg-red-700 active:scale-95 transition-all"
                                    title={lang === 'ar' ? 'رفض' : 'Reject'}
                                  >
                                    <span className="material-symbols-outlined text-xl">close</span>
                                  </button>
                                </>
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
        <div className="fixed inset-0 z-[500] flex items-end md:items-center justify-center bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full md:w-[90%] md:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-xl shadow-2xl p-8 text-center animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300">

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
                  setOrderToCancel(null);
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
        <div className="fixed inset-0 z-[500] flex items-end md:items-center justify-center bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full md:w-[90%] md:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-xl shadow-2xl p-8 text-center animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300">

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
                  setLineToApprove(null);
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
          parentOrderId={selectedOrder?.id || (chatOrderLine as any).orderId}
          orderNumber={selectedOrder?.orderNumber || chatOrderLine.id.slice(-6)}
          title={(lang === 'ar' ? (chatOrderLine.productArabicName || chatOrderLine.productName || chatOrderLine.productEnglishName) : (chatOrderLine.productEnglishName || chatOrderLine.productName || chatOrderLine.productArabicName)) as string}
        />
      )}

      {/* COA Image Preview */}
      {coaPreviewUrl && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setCoaPreviewUrl(null)}
        >
          <div
            className="w-[92%] md:max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setCoaPreviewUrl(null)}
              className="absolute top-3 end-3 size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 transition-all flex items-center justify-center"
              aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 relative z-[1]">
              <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">
                {lang === 'ar' ? 'عرض شهادة التحليل' : 'View Certificate of Analysis'}
              </h3>
            </div>
            <div className="p-3">
              <img src={coaPreviewUrl} alt="COA Preview" className="w-full max-h-[80vh] object-contain rounded-xl" />
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

export default Orders;
