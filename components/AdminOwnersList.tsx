import React, { useState, useEffect } from 'react';
import { useLanguage } from '../App';
import { api } from '../api';
import { useToast } from '../contexts/ToastContext';
import EmptyState from './EmptyState';
import PaginationFooter from './PaginationFooter';

export interface Category {
  id: string;
  name: string;
  arabicName: string;
}

export interface SubCategory {
  id: string;
  name: string;
  arabicName: string;
}

export interface Subscription {
  id: string;
  planId: string;
  planName: string;
  numberOfUsers: number;
  usedUsers: number;
  remainingUsers: number;
  subscriptionDate?: string;
  expiryDate?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  accountStatus: 'ACTIVE' | 'INACTIVE';
  ownerId?: string;
  phoneNumber?: string;
  category?: Category;
  subCategories?: SubCategory[];
  subscription?: Subscription;
  organizationName?: string;
  organizationCRN?: string;
  organizationCRNImage?: string;
  profileImage?: string;
}

export interface SupplierStats {
  totalProducts: number;
  inStockProducts: number;
  totalOrderLines: number;
  distinctOrders: number;
  orderLinesByStatus?: Record<string, number>;
}

export interface CustomerStats {
  totalOrders: number;
  ordersByStatus?: Record<string, number>;
}

export interface UserDetailsResponse {
  user: User;
  staff: User[];
  supplierStats?: SupplierStats;
  customerStats?: CustomerStats;
}

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  SUPPLIER_OWNER: { ar: 'موزع', en: 'Distributor' },
  CUSTOMER_OWNER: { ar: 'عميل', en: 'Customer' },
  SUPPLIER_STAFF: { ar: 'موظف موزع', en: 'Distributor Staff' },
  CUSTOMER_STAFF: { ar: 'موظف عميل', en: 'Customer Staff' },
};

const ORDER_STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  NEW: { ar: 'جديد', en: 'New' },
  NEGOTIATING: { ar: 'تفاوض', en: 'Negotiating' },
  UNDER_CONFIRMATION: { ar: 'قيد التأكيد', en: 'Under confirmation' },
  COMPLETED: { ar: 'مكتمل', en: 'Completed' },
  CANCELLED: { ar: 'ملغي', en: 'Cancelled' },
};

const LINE_STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  PENDING: { ar: 'قيد الانتظار', en: 'Pending' },
  RESPONDED: { ar: 'تم الرد', en: 'Responded' },
  APPROVED: { ar: 'معتمد', en: 'Approved' },
  REJECTED: { ar: 'مرفوض', en: 'Rejected' },
  COMPLETED: { ar: 'مكتمل', en: 'Completed' },
};

type OwnerType = 'suppliers' | 'customers';

interface AdminOwnersListProps {
  type: OwnerType;
  titleAr: string;
  titleEn: string;
  emptyTitleAr: string;
  emptyTitleEn: string;
}

const AdminOwnersList: React.FC<AdminOwnersListProps> = ({
  type,
  titleAr,
  titleEn,
  emptyTitleAr,
  emptyTitleEn,
}) => {
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const orderStatusLabel = (status: string) =>
    lang === 'ar' ? (ORDER_STATUS_LABELS[status]?.ar ?? status) : (ORDER_STATUS_LABELS[status]?.en ?? status);
  const lineStatusLabel = (status: string) =>
    lang === 'ar' ? (LINE_STATUS_LABELS[status]?.ar ?? status) : (LINE_STATUS_LABELS[status]?.en ?? status);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize] = useState(10);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [detailsUserId, setDetailsUserId] = useState<string | null>(null);
  const [detailsData, setDetailsData] = useState<UserDetailsResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchUsers = async (page: number, size: number) => {
    setIsLoading(true);
    try {
      const res = await api.get<any>(`/api/v1/admin/users/${type}?page=${page}&size=${size}`);
      const data = res?.content != null ? res : res?.data ?? res;
      const list = Array.isArray(data?.content) ? data.content : [];
      setUsers(list);
      setTotalPages(data?.totalPages ?? 0);
      setTotalElements(data?.totalElements ?? 0);
    } catch (err: any) {
      showToast(err.message || (lang === 'ar' ? 'فشل تحميل القائمة' : 'Failed to load list'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage, pageSize);
  }, [currentPage, pageSize, type]);

  useEffect(() => {
    if (!detailsUserId) {
      setDetailsData(null);
      return;
    }
    setLoadingDetails(true);
    api
      .get<UserDetailsResponse>(`/api/v1/admin/users/${detailsUserId}/details`)
      .then((res: any) => {
        const d = res?.user ? res : res?.data ?? res;
        if (d?.user) setDetailsData({
          user: d.user,
          staff: Array.isArray(d.staff) ? d.staff : [],
          supplierStats: d.supplierStats ?? undefined,
          customerStats: d.customerStats ?? undefined,
        });
        else setDetailsData(null);
      })
      .catch(() => {
        showToast(lang === 'ar' ? 'فشل تحميل التفاصيل' : 'Failed to load details', 'error');
        setDetailsData(null);
      })
      .finally(() => setLoadingDetails(false));
  }, [detailsUserId, lang, showToast]);

  const handleActivate = async (userId: string) => {
    setProcessingUserId(userId);
    try {
      await api.put(`/api/v1/admin/users/${userId}/activate`);
      showToast(lang === 'ar' ? 'تم التفعيل بنجاح' : 'Activated successfully', 'success');
      fetchUsers(currentPage, pageSize);
      if (detailsUserId === userId) setDetailsUserId(null);
    } catch (err: any) {
      showToast(err.message || (lang === 'ar' ? 'فشل التفعيل' : 'Activation failed'), 'error');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleDeactivate = async (userId: string) => {
    setProcessingUserId(userId);
    try {
      await api.put(`/api/v1/admin/users/${userId}/deactivate`);
      showToast(lang === 'ar' ? 'تم التعطيل بنجاح' : 'Deactivated successfully', 'success');
      fetchUsers(currentPage, pageSize);
      setDeleteConfirmId(null);
      if (detailsUserId === userId) setDetailsUserId(null);
    } catch (err: any) {
      showToast(err.message || (lang === 'ar' ? 'فشل التعطيل' : 'Deactivation failed'), 'error');
    } finally {
      setProcessingUserId(null);
    }
  };

  const getRoleLabel = (role: string) => ROLE_LABELS[role] || { ar: role, en: role };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) setCurrentPage(newPage);
  };

  return (
    <div className="w-full py-6 animate-in fade-in duration-700" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {isLoading && users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white/40 dark:bg-slate-900/40 rounded-[2rem] border border-slate-200 dark:border-slate-800">
          <div className="size-12 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-bold text-sm">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          title={emptyTitleAr}
          subtitle={lang === 'ar' ? 'لا توجد عناصر في هذه القائمة.' : 'No items in this list.'}
        />
      ) : (
        <>
          <div className="hidden md:block mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
              <div className="flex flex-col min-h-0 h-[90vh]">
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                  <table className={`w-full border-collapse bg-white dark:bg-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
                      <tr className="text-[12px] font-black text-slate-600 dark:text-slate-400">
                        <th className="px-6 py-4">{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                        <th className="px-6 py-4">{lang === 'ar' ? 'المؤسسة' : 'Organization'}</th>
                        <th className="px-6 py-4">{lang === 'ar' ? 'الهاتف' : 'Phone'}</th>
                        <th className="px-6 py-4">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5 dark:divide-slate-700">
                      {users.map((user) => (
                        <tr key={user.id} className="group hover:bg-primary/5 dark:hover:bg-slate-700/20 transition-all">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                                <span className="material-symbols-outlined text-xl">person</span>
                              </div>
                              <div className="min-w-0">
                                <div className={`font-black text-sm truncate ${user.accountStatus === 'INACTIVE' ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                                  {user.name}
                                </div>
                                <div className="text-[11px] text-slate-400 font-bold mt-1.5 truncate max-w-[200px]">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{user.organizationName || '—'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{user.phoneNumber || '—'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => (user.accountStatus === 'ACTIVE' ? setDeleteConfirmId(user.id) : handleActivate(user.id))}
                              disabled={!!processingUserId}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                                user.accountStatus === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-400'
                              }`}
                            >
                              {processingUserId === user.id ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                </div>
                              ) : (
                                <span className={`inline-block size-4 transform rounded-full bg-white shadow-lg ${user.accountStatus === 'ACTIVE' ? 'translate-x-6 rtl:translate-x-0 rtl:-translate-x-6' : 'translate-x-1 rtl:translate-x-6'}`} />
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => setDetailsUserId(user.id)}
                              className="px-3 py-1.5 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary/20 dark:hover:bg-primary/30 transition-all text-xs font-black flex items-center gap-1.5 border border-primary/20"
                            >
                              <span className="material-symbols-outlined text-base">visibility</span>
                              {lang === 'ar' ? 'عرض التفاصيل' : 'View details'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 0 && (
                  <PaginationFooter
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalElements={totalElements}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    currentCount={users.length}
                    asTableFooter
                  />
                )}
              </div>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-4 mb-6">
            {users.map((user) => (
              <div key={user.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined text-xl">person</span>
                    </div>
                    <div className="min-w-0">
                      <div className={`font-black text-sm truncate ${user.accountStatus === 'INACTIVE' ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>{user.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold truncate">{user.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailsUserId(user.id)}
                    className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-black border border-primary/20 shrink-0"
                  >
                    {lang === 'ar' ? 'عرض التفاصيل' : 'View details'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="md:hidden">
            {totalPages > 0 && (
              <PaginationFooter
                currentPage={currentPage}
                totalPages={totalPages}
                totalElements={totalElements}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                currentCount={users.length}
              />
            )}
          </div>
        </>
      )}

      {/* Detail modal — استايل مثل تعديل الخطة: خلفية بيضاء، زوايا دائرية، زر إغلاق واضح */}
      {detailsUserId && (
        <>
          <div className="fixed inset-0 z-[290] bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDetailsUserId(null)} />
          <div className="fixed inset-0 z-[300] flex items-end md:items-center justify-center pointer-events-none p-0 md:p-4">
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-t-[1.75rem] md:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 pointer-events-auto animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* هيدر: مقبض سحب + زر إغلاق (X) واضح */}
              <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 z-10">
                <div className="flex items-center justify-center pt-2 pb-1">
                  <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />
                </div>
                <div className="flex items-center justify-between px-5 pb-3">
                  <span className="w-9" />
                  <h3 className="text-base font-black text-slate-800 dark:text-white">{lang === 'ar' ? 'التفاصيل' : 'Details'}</h3>
                  <button
                    type="button"
                    onClick={() => setDetailsUserId(null)}
                    className="size-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
                  >
                    <span className="material-symbols-outlined text-2xl">close</span>
                  </button>
                </div>
              </div>
              <div className="p-5 md:p-6">
                {loadingDetails ? (
                  <div className="flex justify-center py-12">
                    <div className="size-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : detailsData ? (
                  <div className="space-y-6">
                    {/* User info */}
                    <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                      <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 overflow-hidden">
                        {detailsData.user.profileImage ? (
                          <img src={detailsData.user.profileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-3xl">person</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-lg font-black ${detailsData.user.accountStatus === 'INACTIVE' ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                          {detailsData.user.name}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{detailsData.user.email}</div>
                        {detailsData.user.organizationName && (
                          <div className="text-sm font-bold text-slate-600 dark:text-slate-400 mt-1">{detailsData.user.organizationName}</div>
                        )}
                      </div>
                    </div>

                    {/* Contact: Email & Phone */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-black text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'التواصل' : 'Contact'}</span>
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-slate-500 text-xl">mail</span>
                          <a href={`mailto:${detailsData.user.email}`} className="text-sm font-bold text-primary break-all hover:underline">{detailsData.user.email || '—'}</a>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-slate-500 text-xl">phone</span>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{detailsData.user.phoneNumber || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Category & Subcategories (supplier only) — اسم الفئة باللون البيماري فقط */}
                    {detailsData.user.role === 'SUPPLIER_OWNER' && (detailsData.user.category || (detailsData.user.subCategories && detailsData.user.subCategories.length > 0)) && (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-sm font-black text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'الفئة والفئات الفرعية' : 'Category & Subcategories'}</span>
                        </div>
                        <div className="p-4 space-y-2">
                          {detailsData.user.category && (
                            <p className="text-primary font-black text-sm">
                              {lang === 'ar' ? detailsData.user.category.arabicName : detailsData.user.category.name}
                            </p>
                          )}
                          {detailsData.user.subCategories && detailsData.user.subCategories.length > 0 && (
                            <p className="text-primary font-bold text-sm">
                              {detailsData.user.subCategories.map((sub: SubCategory, idx: number) => (lang === 'ar' ? sub.arabicName : sub.name)).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Plan / Subscription — اسم الباقة باللون البيماري فقط، بدون users 1/0 */}
                    {detailsData.user.subscription && (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-sm font-black text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'الباقة / الاشتراك' : 'Plan / Subscription'}</span>
                        </div>
                        <div className="p-4 space-y-2">
                          <div>
                            <span className="text-xs font-black text-slate-500 dark:text-slate-400 block mb-1">{lang === 'ar' ? 'اسم الباقة' : 'Plan name'}</span>
                            <p className="text-primary font-black text-sm">{detailsData.user.subscription.planName}</p>
                          </div>
                          {detailsData.user.subscription.expiryDate && (
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold pt-1">
                              <span>{lang === 'ar' ? 'ينتهي' : 'Expires'}</span>
                              <span>{new Date(detailsData.user.subscription.expiryDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Supplier report: products & orders */}
                    {detailsData.supplierStats && (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="px-4 py-3 bg-primary/5 dark:bg-primary/10 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-sm font-black text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'تقرير الموزع' : 'Distributor Report'}</span>
                        </div>
                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-200 dark:border-slate-700">
                              <p className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'إجمالي المنتجات' : 'Total products'}</p>
                              <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{detailsData.supplierStats.totalProducts}</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-200 dark:border-slate-700">
                              <p className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'في المخزون' : 'In stock'}</p>
                              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{detailsData.supplierStats.inStockProducts}</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-200 dark:border-slate-700">
                              <p className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'عدد الطلبات' : 'Orders'}</p>
                              <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{detailsData.supplierStats.distinctOrders}</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-200 dark:border-slate-700">
                              <p className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'بنود الطلبات' : 'Order lines'}</p>
                              <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{detailsData.supplierStats.totalOrderLines}</p>
                            </div>
                          </div>
                          {detailsData.supplierStats.orderLinesByStatus && Object.keys(detailsData.supplierStats.orderLinesByStatus).length > 0 && (
                            <div>
                              <p className="text-xs font-black text-slate-500 dark:text-slate-400 mb-2">{lang === 'ar' ? 'البنود حسب الحالة' : 'Lines by status'}</p>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(detailsData.supplierStats.orderLinesByStatus).map(([status, count]) => (
                                  <span key={status} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold">
                                    {lineStatusLabel(status)}: <span className="tabular-nums">{count}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Customer report: orders by status */}
                    {detailsData.customerStats && (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="px-4 py-3 bg-primary/5 dark:bg-primary/10 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-sm font-black text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'تقرير العميل' : 'Customer Report'}</span>
                        </div>
                        <div className="p-4 space-y-4">
                          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'إجمالي الطلبات' : 'Total orders'}</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{detailsData.customerStats.totalOrders}</p>
                          </div>
                          {detailsData.customerStats.ordersByStatus && Object.keys(detailsData.customerStats.ordersByStatus).length > 0 && (
                            <div>
                              <p className="text-xs font-black text-slate-500 dark:text-slate-400 mb-2">{lang === 'ar' ? 'الطلبات حسب الحالة' : 'Orders by status'}</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {Object.entries(detailsData.customerStats.ordersByStatus).map(([status, count]) => (
                                  <div key={status} className="rounded-lg bg-slate-100 dark:bg-slate-700 px-3 py-2">
                                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400">{orderStatusLabel(status)}</p>
                                    <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{count}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Staff — يظهر دائماً لكل مورد/عميل */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                          {lang === 'ar' ? 'الموظفون' : 'Staff'}
                          {detailsData.staff && detailsData.staff.length > 0 ? ` (${detailsData.staff.length})` : ''}
                        </span>
                      </div>
                      {detailsData.staff && detailsData.staff.length > 0 ? (
                        <ul className="divide-y divide-slate-200 dark:divide-slate-700 max-h-60 overflow-y-auto">
                          {detailsData.staff.map((s) => (
                            <li key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="size-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                  <span className="material-symbols-outlined text-lg text-slate-500">person</span>
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{s.name}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.email}</div>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold shrink-0 ${s.accountStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                {s.accountStatus === 'ACTIVE' ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'معطل' : 'Inactive')}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400 font-bold">
                          {lang === 'ar' ? 'لا يوجد موظفون' : 'No staff'}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                      {detailsData.user.accountStatus === 'ACTIVE' ? (
                        <button
                          onClick={() => { setDetailsUserId(null); setDeleteConfirmId(detailsData.user.id); }}
                          disabled={!!processingUserId}
                          className="flex-1 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2 border border-red-200 dark:border-red-800"
                        >
                          {lang === 'ar' ? 'تعطيل' : 'Deactivate'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(detailsData.user.id)}
                          disabled={!!processingUserId}
                          className="flex-1 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-800"
                        >
                          {lang === 'ar' ? 'تفعيل' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm font-bold py-8 text-center">{lang === 'ar' ? 'فشل تحميل التفاصيل' : 'Failed to load details'}</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Deactivate confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{lang === 'ar' ? 'تعطيل الحساب؟' : 'Deactivate account?'}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{lang === 'ar' ? 'سيتم تعطيل هذا الحساب وجميع الموظفين المرتبطين به إن وجدوا.' : 'This account and any linked staff will be deactivated.'}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-sm">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => handleDeactivate(deleteConfirmId)}
                disabled={!!processingUserId}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-black text-sm disabled:opacity-50"
              >
                {lang === 'ar' ? 'تأكيد التعطيل' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOwnersList;
