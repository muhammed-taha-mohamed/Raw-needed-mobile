import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { AdPackage, AdSubscription } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import EmptyState from '../../components/EmptyState';
import { MODAL_INPUT_CLASS, MODAL_OVERLAY_BASE_CLASS, MODAL_PANEL_BASE_CLASS } from '../../components/modalTheme';

interface PendingPage {
  content: AdSubscription[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

const AdPackages: React.FC = () => {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdPackage | null>(null);
  const [form, setForm] = useState<{ nameAr: string; nameEn: string; numberOfDays: string; pricePerAd: string; featuredPrice: string; active: boolean; sortOrder: number }>({ nameAr: '', nameEn: '', numberOfDays: '', pricePerAd: '', featuredPrice: '', active: true, sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pendingSubscriptions, setPendingSubscriptions] = useState<AdSubscription[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [approvedSubscriptions, setApprovedSubscriptions] = useState<AdSubscription[]>([]);
  const [loadingApproved, setLoadingApproved] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;
  const [actingId, setActingId] = useState<string | null>(null);
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'packages' | 'pending' | 'subscriptions'>('packages');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isFetchingUser, setIsFetchingUser] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  const fetchPackages = async () => {
    try {
      const res = await api.get<AdPackage[] | { data: AdPackage[] }>('/api/v1/admin/ad-packages');
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      setPackages(list);
    } catch (e: any) {
      showToast(e.message || 'Failed to load packages', 'error');
    }
  };


  const fetchPendingSubscriptions = async () => {
    setLoadingPending(true);
    try {
      const res = await api.get<PendingPage | { content: AdSubscription[] }>('/api/v1/admin/ad-subscriptions/pending?page=0&size=50');
      const list = res && typeof res === 'object' && 'content' in res ? (res as PendingPage).content : [];
      setPendingSubscriptions(Array.isArray(list) ? list : []);
    } catch (e: any) {
      showToast(e.message || 'Failed to load pending', 'error');
    } finally {
      setLoadingPending(false);
    }
  };

  const fetchApprovedSubscriptions = async (page: number) => {
    setLoadingApproved(true);
    try {
      const response = await api.get<any>('/api/v1/admin/ad-subscriptions/approved?page=' + page + '&size=' + pageSize);
      // Handle nested response structure: content.data or data or direct response
      const data = response?.content?.data || response?.data || response;
      const list = data?.content || [];
      setApprovedSubscriptions(Array.isArray(list) ? list : []);
      setTotalPages(data?.totalPages || 0);
      setTotalElements(data?.totalElements || 0);
    } catch (e: any) {
      showToast(e.message || 'Failed to load approved', 'error');
    } finally {
      setLoadingApproved(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchPackages().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPendingSubscriptions();
  }, []);

  // Load approved (active) subscriptions when user opens that tab or changes page
  useEffect(() => {
    if (activeTab === 'subscriptions') {
      fetchApprovedSubscriptions(currentPage);
    }
  }, [activeTab, currentPage]);


  const openAdd = () => {
    setEditing(null);
    setForm({ nameAr: '', nameEn: '', numberOfDays: '', pricePerAd: '', featuredPrice: '', active: true, sortOrder: packages.length });
    setModalOpen(true);
  };

  const openEdit = (p: AdPackage) => {
    setEditing(p);
    setForm({
      nameAr: p.nameAr || '',
      nameEn: p.nameEn || '',
      numberOfDays: p.numberOfDays != null ? String(p.numberOfDays) : '',
      pricePerAd: String((p as any).pricePerAd ?? p.price ?? ''),
      featuredPrice: String((p as any).featuredPrice ?? ''),
      active: p.active,
      sortOrder: p.sortOrder ?? 0,
    });
    setModalOpen(true);
  };

  const handleSavePackage = async () => {
    const numDays = parseInt(String(form.numberOfDays).trim(), 10);
    const pricePerAd = parseFloat(String(form.pricePerAd).trim());
    const featuredPrice = parseFloat(String(form.featuredPrice).trim());
    if (isNaN(numDays) || numDays < 1) {
      showToast(lang === 'ar' ? 'أدخل مدة صحيحة (يوم)' : 'Enter valid duration (days)', 'error');
      return;
    }
    if (isNaN(pricePerAd) || pricePerAd < 0) {
      showToast(lang === 'ar' ? 'أدخل سعر الإعلان الواحد صحيحاً' : 'Enter valid price per ad', 'error');
      return;
    }
    if (isNaN(featuredPrice) || featuredPrice < 0) {
      showToast(lang === 'ar' ? 'أدخل سعر عرض أولاً صحيحاً' : 'Enter valid featured price', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/api/v1/admin/ad-packages/${editing.id}`, {
          nameAr: form.nameAr || undefined,
          nameEn: form.nameEn || undefined,
          numberOfDays: numDays,
          pricePerAd,
          featuredPrice,
          active: form.active,
          sortOrder: form.sortOrder,
        });
        showToast(lang === 'ar' ? 'تم تحديث الباقة' : 'Package updated', 'success');
      } else {
        await api.post('/api/v1/admin/ad-packages', {
          nameAr: form.nameAr || undefined,
          nameEn: form.nameEn || undefined,
          numberOfDays: numDays,
          pricePerAd,
          featuredPrice,
          active: form.active,
          sortOrder: form.sortOrder,
        });
        showToast(lang === 'ar' ? 'تم إضافة الباقة' : 'Package created', 'success');
      }
      setModalOpen(false);
      fetchPackages();
    } catch (e: any) {
      showToast(e.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/v1/admin/ad-packages/${id}`);
      showToast(lang === 'ar' ? 'تم حذف الباقة' : 'Package deleted', 'success');
      setDeleteId(null);
      fetchPackages();
    } catch (e: any) {
      showToast(e.message || 'Failed to delete', 'error');
    }
  };

  const handleApproveSubscription = async (id: string) => {
    setActingId(id);
    try {
      await api.post(`/api/v1/admin/ad-subscriptions/${id}/approve`, {});
      showToast(lang === 'ar' ? 'تمت الموافقة على الاشتراك' : 'Subscription approved', 'success');
      fetchPendingSubscriptions();
    } catch (e: any) {
      showToast(e.message || 'Failed to approve', 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleRejectSubscription = async (id: string) => {
    setActingId(id);
    try {
      await api.post(`/api/v1/admin/ad-subscriptions/${id}/reject`, {});
      showToast(lang === 'ar' ? 'تم رفض الاشتراك' : 'Subscription rejected', 'success');
      fetchPendingSubscriptions();
    } catch (e: any) {
      showToast(e.message || 'Failed to reject', 'error');
    } finally {
      setActingId(null);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    setIsFetchingUser(true);
    setSelectedUser(null);
    setShowUserModal(true);
    try {
      const userData = await api.get<any>(`/api/v1/user/${userId}`);
      setSelectedUser(userData);
    } catch (err: any) {
      showToast(err.message || (lang === 'ar' ? 'فشل تحميل بيانات المستخدم' : 'Failed to load user'), 'error');
      setShowUserModal(false);
    } finally {
      setIsFetchingUser(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-6 flex items-center justify-center min-h-[300px]">
        <div className="size-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const activePackages = packages.filter((p) => p.active);

  return (
    <div className="w-full py-6 flex flex-col gap-8 font-display animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Tabs - full width of container */}
      <div className="flex gap-1 p-1 mb-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 w-full min-w-0">
        <button
          onClick={() => setActiveTab('packages')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-black transition-all ${activeTab === 'packages' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
        >
          {lang === 'ar' ? 'الباقات' : 'Packages'}
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-black transition-all ${activeTab === 'pending' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
        >
          <span className="inline-flex items-center gap-1.5">
            <span>{lang === 'ar' ? 'طلبات الاشتراك' : 'Pending'}</span>
            {pendingSubscriptions.length > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-[10px] leading-none font-black inline-flex items-center justify-center tabular-nums">
                {pendingSubscriptions.length}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-black transition-all ${activeTab === 'subscriptions' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
        >
          <span className="hidden md:inline">{lang === 'ar' ? 'الاشتراكات النشطة' : 'Subscriptions'}</span>
          <span className="md:hidden">{lang === 'ar' ? 'الاشتراكات' : 'Subs'}</span>
        </button>
        <button
          onClick={openAdd}
          className={`flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-black transition-all ${activeTab === 'add' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          title={lang === 'ar' ? 'إضافة باقة' : 'Add package'}
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
        </button>
      </div>

      {/* Tab: Pending ad subscriptions */}
      {activeTab === 'pending' && (
        <>
          {loadingPending ? (
            <div className="flex flex-col items-center justify-center py-32 animate-in fade-in duration-500">
              <div className="h-10 w-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400 font-bold text-[11px]">{lang === 'ar' ? 'جاري المراجعة...' : 'Reviewing submissions...'}</p>
            </div>
          ) : pendingSubscriptions.length === 0 ? (
            <EmptyState title={lang === 'ar' ? 'لا توجد طلبات معلقة' : 'No Pending Requests'} subtitle={lang === 'ar' ? 'لقد قمت بمراجعة جميع الطلبات الحالية.' : 'You have reviewed all current subscription requests.'} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
                {pendingSubscriptions.map((sub, idx) => (
                  <div 
                    key={sub.id} 
                    className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100 dark:border-slate-800 relative group overflow-hidden flex flex-col animate-in zoom-in-95 duration-700"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div className={`absolute top-0 ${lang === 'ar' ? 'right-0' : 'left-0'} w-1.5 h-full bg-primary transition-all duration-300`}></div>
                    
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex gap-4 items-center min-w-0">
                        <div className="size-11 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0 text-slate-400 shadow-inner overflow-hidden">
                          {sub.supplierImage ? (
                            <img src={sub.supplierImage} alt="" className="size-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-xl">store</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-slate-700 dark:text-white text-[17px] leading-tight truncate">
                            {sub.supplierOrganizationName || sub.supplierName || sub.supplierId?.slice(-8) || (lang === 'ar' ? 'مورد' : 'Supplier')}
                          </h3>
                          <span className="text-[11px] text-primary font-black mt-1 block truncate">
                            {lang === 'ar' ? sub.packageNameAr || sub.packageNameEn : sub.packageNameEn || sub.packageNameAr}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6 flex-grow">
                      <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 font-bold text-[12px]">{lang === 'ar' ? 'عدد الإعلانات' : 'Ads'}</span>
                        <span className="font-black text-slate-800 dark:text-slate-200 text-sm tabular-nums">{sub.numberOfAds ?? '—'}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 font-bold text-[12px]">{lang === 'ar' ? 'تاريخ التقديم' : 'Submitted'}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                          {sub.requestedAt ? new Date(sub.requestedAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-2">
                        <span className="text-slate-500 dark:text-slate-400 font-bold text-[12px]">{lang === 'ar' ? 'الإجمالي النهائي' : 'Final Total'}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-black text-primary text-lg tabular-nums">{sub.totalPrice != null ? Number(sub.totalPrice).toLocaleString() : '0'}</span>
                          <span className="text-[11px] text-slate-400 font-bold">EGP</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 pt-5 border-t border-slate-100 dark:border-slate-800 mt-auto">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-4 flex-wrap">
                          <button
                            type="button"
                            onClick={() => fetchUserDetails(sub.supplierId)}
                            className="text-primary text-[12px] font-black hover:underline flex items-center gap-1 transition-all group/btn whitespace-nowrap"
                          >
                            <span className="material-symbols-outlined text-[16px]">person</span>
                            {lang === 'ar' ? 'عرض الحساب' : 'Profile'}
                          </button>
                          {sub.paymentProofPath && (
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt(sub.paymentProofPath!)}
                              className="text-primary text-[12px] font-black hover:underline flex items-center gap-1 transition-all group/btn whitespace-nowrap"
                            >
                              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                              {lang === 'ar' ? 'عرض الإيصال' : 'Receipt'}
                            </button>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button 
                            disabled={!!actingId}
                            onClick={() => handleRejectSubscription(sub.id)}
                            className="size-9 rounded-xl bg-red-50 text-red-600 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all dark:bg-red-900/20 dark:text-red-400 active:scale-90 shadow-sm disabled:opacity-50" 
                            title={lang === 'ar' ? 'رفض' : 'Reject'}
                          >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                          </button>
                          <button 
                            disabled={!!actingId}
                            onClick={() => handleApproveSubscription(sub.id)}
                            className="size-9 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all dark:bg-emerald-900/20 dark:text-emerald-400 active:scale-90 shadow-sm disabled:opacity-50"
                            title={lang === 'ar' ? 'موافقة' : 'Approve'}
                          >
                            {actingId === sub.id ? (
                              <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                              <span className="material-symbols-outlined text-[20px]">check</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {/* Tab: Packages */}
      {activeTab === 'packages' && (
        <>
          {loading && packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white/40 dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
              <div className="h-10 w-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-bold text-[11px]">{lang === 'ar' ? 'جاري تحميل الباقات...' : 'Loading packages...'}</p>
            </div>
          ) : packages.length === 0 ? (
            <EmptyState title={lang === 'ar' ? 'لا توجد باقات' : 'No packages'} subtitle={lang === 'ar' ? 'أضف باقة إعلانات جديدة.' : 'Add a new ad package.'} />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
                {packages.map((p, idx) => {
                  const pricePerAd = Number((p as any).pricePerAd ?? (p as any).price ?? 0);
                  return (
                    <div
                      key={p.id}
                      className={`bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100 dark:border-slate-800 relative group overflow-hidden flex flex-col animate-in zoom-in-95 duration-700 ${p.active ? '' : 'opacity-85 grayscale-[0.15]'}`}
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <div className={`absolute top-0 ${lang === 'ar' ? 'right-0' : 'left-0'} w-1.5 h-full ${p.active ? 'bg-primary' : 'bg-slate-300'} transition-all duration-300`}></div>

                      <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-4 items-center min-w-0">
                          <div className={`size-12 rounded-xl flex items-center justify-center border shrink-0 shadow-sm transition-all duration-300 ${p.active ? 'bg-primary/5 text-primary border-primary/10' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                            <span className="material-symbols-outlined text-[26px]">campaign</span>
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 dark:text-white text-[17px] leading-tight truncate">
                              {p.nameAr || p.nameEn || (lang === 'ar' ? `${p.numberOfDays} أيام` : `${p.numberOfDays} days`)}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`size-2 rounded-full ${p.active ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                              <span className="text-[12px] font-bold text-slate-500">
                                {p.active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'غير نشط' : 'Inactive')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-6 flex-grow">
                        <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 dark:border-slate-800">
                          <span className="text-slate-500 dark:text-slate-500 font-bold text-sm">{lang === 'ar' ? 'مدة كل إعلان' : 'Per-ad duration'}</span>
                          <div className="flex items-baseline gap-1">
                            <span className="font-black text-slate-900 dark:text-white text-xl tabular-nums">{p.numberOfDays}</span>
                            <span className="text-sm text-slate-500 font-bold">
                              {lang === 'ar' ? (p.numberOfDays === 1 ? 'يوم' : 'أيام') : (p.numberOfDays === 1 ? 'day' : 'days')}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 dark:border-slate-800">
                          <span className="text-slate-500 dark:text-slate-500 font-bold text-sm">{lang === 'ar' ? 'سعر الإعلان' : 'Price per Ad'}</span>
                          <div className="flex items-baseline gap-1">
                            <span className="font-black text-slate-900 dark:text-white text-xl tabular-nums">{pricePerAd}</span>
                            <span className="text-[12px] text-slate-500 font-bold">EGP</span>
                          </div>
                        </div>
                        {(p as any).featuredPrice != null && (
                          <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500 dark:text-slate-500 font-bold text-sm">{lang === 'ar' ? 'سعر عرض أولاً' : 'Featured Price'}</span>
                            <div className="flex items-baseline gap-1">
                              <span className="font-black text-primary text-xl tabular-nums">{(p as any).featuredPrice}</span>
                              <span className="text-[12px] text-slate-500 font-bold">EGP</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-5 border-t border-slate-100 dark:border-slate-800 mt-auto -mx-6 px-6 -mb-6 pb-6 bg-slate-50/30 dark:bg-slate-800/20">
                        <div className="flex gap-3 items-center">
                          <button onClick={() => openEdit(p)} className="text-primary text-sm font-bold hover:text-primary/80 flex items-center gap-1 transition-all group/btn">
                            {lang === 'ar' ? 'تعديل' : 'Edit'}
                            <span className="material-symbols-outlined text-[16px]">edit_square</span>
                          </button>
                        </div>
                        <button onClick={() => setDeleteId(p.id)} className="size-9 rounded-xl bg-red-50 text-red-600 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all dark:bg-red-900/20 dark:text-red-400 active:scale-90 shadow-sm" title="Delete">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div onClick={openAdd} className="rounded-[1.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center min-h-[300px] cursor-pointer group animate-in zoom-in-95 duration-700">
                  <div className="bg-slate-50 dark:bg-slate-800 group-hover:bg-primary text-slate-500 group-hover:text-white rounded-xl p-4 mb-3 transition-all shadow-sm duration-300">
                    <span className="material-symbols-outlined text-3xl">add</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-500 group-hover:text-primary transition-colors">{lang === 'ar' ? 'إضافة باقة' : 'Add package'}</h3>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Tab: Active subscriptions (approved, non-pending) */}
      {activeTab === 'subscriptions' && (
        <div className="overflow-hidden animate-in fade-in duration-500">
          {/* Desktop Table View - Fixed Size with Scroll */}
          <div className="hidden md:block mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-primary/20 dark:border-primary/10 shadow-lg overflow-hidden">
              <div className="h-[90vh] flex flex-col">
                {/* Scrollable Table Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {loadingApproved && approvedSubscriptions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-40">
                      <div className="size-12 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                      <p className="text-slate-500 font-bold text-sm">{lang === 'ar' ? 'جاري التحميل...' : 'Loading subscriptions...'}</p>
                    </div>
                  ) : approvedSubscriptions.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <EmptyState title={lang === 'ar' ? 'لا توجد اشتراكات نشطة' : 'No Active Subscriptions'} subtitle={lang === 'ar' ? 'لا توجد اشتراكات معتمدة حالياً.' : 'No approved subscriptions at the moment.'} />
                    </div>
                  ) : (
                    <table dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`w-full border-collapse bg-white dark:bg-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                      <thead className="sticky top-0 z-10 bg-primary/10 dark:bg-primary/5">
                        <tr className="text-[12px] font-black text-slate-600 dark:text-slate-400 border-b-2 border-primary/20">
                          <th className="px-6 py-4">{lang === 'ar' ? 'المورد' : 'Supplier'}</th>
                          <th className="px-6 py-4">{lang === 'ar' ? 'الباقة' : 'Package'}</th>
                          <th className="px-6 py-4">{lang === 'ar' ? 'متبقي / إجمالي' : 'Remaining / Total'}</th>
                          <th className="px-6 py-4">{lang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                          <th className="px-6 py-4">{lang === 'ar' ? 'تاريخ الموافقة' : 'Approved'}</th>
                          <th className="px-6 py-4">{lang === 'ar' ? 'مدة كل إعلان' : 'Per-ad duration'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-primary/5 dark:divide-slate-700">
                        {approvedSubscriptions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-20 text-center">
                              <div className="flex flex-col items-center gap-3">
                                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">subscriptions</span>
                                <p className="text-sm font-bold text-slate-400 dark:text-slate-500">{lang === 'ar' ? 'لا توجد بيانات' : 'No data available'}</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          approvedSubscriptions.map((sub, idx) => {
                            const formatDate = (dateStr?: string) => {
                              if (!dateStr) return '—';
                              return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                            };
                            return (
                              <tr 
                                key={sub.id} 
                                className="group hover:bg-primary/5 dark:hover:bg-slate-700/20 transition-all"
                              >
                                <td className="px-6 py-4">
                                  <div className={`flex items-center gap-3 ${lang === 'ar' ? 'justify-end' : 'justify-start'}`}>
                                    <div className="size-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                                      <span className="material-symbols-outlined text-xl">store</span>
                                    </div>
                                    <div className="min-w-0 text-right rtl:text-right">
                                      <div className="font-black text-sm text-slate-900 dark:text-white truncate">
                                        {sub.supplierOrganizationName || sub.supplierName || '—'}
                                      </div>
                                      {(sub.supplierOrganizationName && sub.supplierName) && (
                                        <div className="text-[11px] text-slate-400 font-bold mt-1.5">
                                          {sub.supplierName}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="px-3 py-1.5 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary text-xs font-black border border-primary/20">
                                    {lang === 'ar' ? sub.packageNameAr || sub.packageNameEn : sub.packageNameEn || sub.packageNameAr}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="font-black text-slate-900 dark:text-white text-base tabular-nums">
                                    {(sub.remainingAds ?? 0)} / {(sub.numberOfAds ?? 0)}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-baseline gap-1">
                                    <span className="font-black text-primary text-lg tabular-nums">
                                      {sub.totalPrice != null ? Number(sub.totalPrice).toLocaleString() : '—'}
                                    </span>
                                    {sub.totalPrice != null && (
                                      <span className="text-xs text-slate-400 font-bold">EGP</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-slate-400 text-base">event</span>
                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                      {formatDate(sub.approvedAt)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-slate-400 text-base">schedule</span>
                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                      {sub.numberOfDays != null ? (lang === 'ar' ? `${sub.numberOfDays} يوم` : `${sub.numberOfDays} days`) : '—'}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
                {/* Pagination Footer - Fixed at Bottom */}
                {totalPages > 0 && (
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
                          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} 
                          disabled={currentPage === 0}
                          className="size-9 rounded-full border border-primary/20 bg-white dark:bg-slate-800 text-slate-400 hover:text-primary hover:border-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
                        >
                          <span className="material-symbols-outlined text-base rtl-flip">chevron_left</span>
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i;
                            } else if (currentPage < 3) {
                              pageNum = i;
                            } else if (currentPage > totalPages - 4) {
                              pageNum = totalPages - 5 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
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
                          onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))} 
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
            {loadingApproved && approvedSubscriptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 animate-in fade-in duration-500">
                <div className="size-12 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-bold text-sm">{lang === 'ar' ? 'جاري التحميل...' : 'Loading subscriptions...'}</p>
              </div>
            ) : approvedSubscriptions.length === 0 ? (
              <EmptyState title={lang === 'ar' ? 'لا توجد اشتراكات نشطة' : 'No Active Subscriptions'} subtitle={lang === 'ar' ? 'لا توجد اشتراكات معتمدة حالياً.' : 'No approved subscriptions at the moment.'} />
            ) : (
              <div className="space-y-4 mb-6">
                {approvedSubscriptions.map((sub, idx) => {
                  const isExpanded = expandedSubscriptionId === sub.id;
                  const formatDate = (dateStr?: string) => {
                    if (!dateStr) return '—';
                    return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                  };
                  return (
                    <div 
                      key={sub.id} 
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                    >
                      <div className="p-4 flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                          <span className="material-symbols-outlined text-xl">store</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-sm text-slate-900 dark:text-white truncate">
                            {sub.supplierOrganizationName || sub.supplierName || '—'}
                          </div>
                          {(sub.supplierOrganizationName && sub.supplierName) && (
                            <div className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">
                              {sub.supplierName}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setExpandedSubscriptionId(isExpanded ? null : sub.id)}
                          className="size-8 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center border border-primary/20 hover:bg-primary/20 transition-all active:scale-90"
                        >
                          <span className={`material-symbols-outlined text-lg transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                            expand_more
                          </span>
                        </button>
                      </div>
                      {isExpanded && (
                        <>
                          <div 
                            className="fixed inset-0 z-[290] bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                            onClick={() => setExpandedSubscriptionId(null)}
                          ></div>
                          <div className={`fixed inset-0 z-[300] flex items-end md:items-center justify-center pointer-events-none`}>
                            <div 
                              className="w-full md:max-w-sm bg-white dark:bg-slate-800 rounded-t-3xl md:rounded-2xl shadow-2xl border-t border-x md:border border-primary/20 p-6 pointer-events-auto animate-in slide-in-from-bottom-5 md:zoom-in-95 fade-in duration-300 max-h-[90vh] flex flex-col"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                                <h3 className="text-base font-black text-slate-900 dark:text-white">
                                  {lang === 'ar' ? 'تفاصيل الاشتراك' : 'Subscription Details'}
                                </h3>
                                <button
                                  onClick={() => setExpandedSubscriptionId(null)}
                                  className="size-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-xl">close</span>
                                </button>
                              </div>
                              <div className="space-y-0 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                <div className="flex justify-between items-center px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                                  <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الباقة' : 'Package'}</span>
                                  <span className="px-3 py-1.5 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary text-xs font-black border border-primary/20">
                                    {lang === 'ar' ? sub.packageNameAr || sub.packageNameEn : sub.packageNameEn || sub.packageNameAr}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                                  <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'إعلانات متبقية' : 'Remaining ads'}</span>
                                  <span className="font-black text-slate-900 dark:text-white text-lg tabular-nums">
                                    {(sub.remainingAds ?? 0)} / {(sub.numberOfAds ?? 0)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                                  <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الإجمالي' : 'Total'}</span>
                                  <div className="flex items-baseline gap-1">
                                    <span className="font-black text-primary text-xl tabular-nums">
                                      {sub.totalPrice != null ? Number(sub.totalPrice).toLocaleString() : '—'}
                                    </span>
                                    {sub.totalPrice != null && (
                                      <span className="text-sm text-slate-400 font-bold">EGP</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex justify-between items-center px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                                  <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'تاريخ الموافقة' : 'Approved'}</span>
                                  <span className="text-base font-bold text-slate-600 dark:text-slate-400">
                                    {formatDate(sub.approvedAt)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center px-4 py-3">
                                  <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'مدة كل إعلان' : 'Per-ad duration'}</span>
                                  <span className="text-base font-bold text-slate-600 dark:text-slate-400">
                                    {sub.numberOfDays != null ? (lang === 'ar' ? `${sub.numberOfDays} يوم` : `${sub.numberOfDays} days`) : '—'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Close Button at Bottom - Mobile Only */}
                              <div className="md:hidden px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
                                <button
                                  onClick={() => setExpandedSubscriptionId(null)}
                                  className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-black text-sm flex items-center justify-center gap-2 active:scale-95"
                                >
                                  <span className="material-symbols-outlined text-lg">close</span>
                                  {lang === 'ar' ? 'إغلاق' : 'Close'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {/* Mobile Pagination */}
            {totalPages > 0 && (
              <div className="mb-24 px-4">
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 max-w-md mx-auto">
                  <div className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg shrink-0 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 tabular-nums">
                      {currentPage + 1} / {totalPages}
                    </span>
                  </div>
                  <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5"></div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} 
                      disabled={currentPage === 0}
                      className="size-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-primary hover:border-primary disabled:opacity-30 transition-all flex items-center justify-center active:scale-90 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-sm rtl-flip">chevron_left</span>
                    </button>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => setCurrentPage(currentPage)}
                        className="size-7 rounded-lg font-black text-[10px] bg-primary text-white shadow-sm active:scale-95 transition-all"
                      >
                        {currentPage + 1}
                      </button>
                    </div>
                    <button 
                      onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))} 
                      disabled={currentPage >= totalPages - 1}
                      className="size-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-primary hover:border-primary disabled:opacity-30 transition-all flex items-center justify-center active:scale-90 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-sm rtl-flip">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit package modal */}
      {modalOpen && (
        <div className={`fixed inset-0 z-[200] ${MODAL_OVERLAY_BASE_CLASS}`} onClick={() => setModalOpen(false)}>
          <div className={`${MODAL_PANEL_BASE_CLASS} md:max-w-md`} onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-2xl">sell</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">
                    {editing ? (lang === 'ar' ? 'تعديل الباقة' : 'Edit package') : (lang === 'ar' ? 'إضافة باقة' : 'Add package')}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 mt-2">{lang === 'ar' ? 'الاسم، المدة، الأسعار والحالة' : 'Name, days, prices & status'}</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="size-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <form id="adPkgForm" onSubmit={(e) => { e.preventDefault(); handleSavePackage(); }} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'الاسم (ع)' : 'Name (AR)'}</label>
                  <input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder={t.adPackage.nameArPlaceholder} className={MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'الاسم (en)' : 'Name (EN)'}</label>
                  <input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} placeholder={t.adPackage.nameEnPlaceholder} className={MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'مدة كل إعلان (يوم)' : 'Per-ad duration (days)'}</label>
                  <input type="number" min={1} value={form.numberOfDays} onChange={(e) => setForm({ ...form, numberOfDays: e.target.value })} placeholder={t.adPackage.durationDaysPlaceholder} className={MODAL_INPUT_CLASS} />
                  <p className="text-[10px] text-slate-400 px-1">{lang === 'ar' ? 'كل إعلان يظهر لهذه المدة ثم يختفي' : 'Each ad is shown for this many days then hidden'}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'سعر الإعلان الواحد (EGP)' : 'Price per ad (EGP)'}</label>
                  <input type="number" min={0} step={0.01} value={form.pricePerAd} onChange={(e) => setForm({ ...form, pricePerAd: e.target.value })} placeholder={t.adPackage.pricePerAdPlaceholder} className={MODAL_INPUT_CLASS} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'سعر عرض أولاً (EGP)' : 'Featured price (EGP)'}</label>
                  <input type="number" min={0} step={0.01} value={form.featuredPrice} onChange={(e) => setForm({ ...form, featuredPrice: e.target.value })} placeholder={t.adPackage.featuredPricePlaceholder} className={MODAL_INPUT_CLASS} />
                  <p className="text-[10px] text-slate-400 px-1">{lang === 'ar' ? 'السعر الإضافي الذي يدفعه المورد ليظهر إعلانه في الأول' : 'Extra price the supplier pays to display their ad first'}</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <input type="checkbox" id="active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="size-5 rounded-md border-slate-300 text-primary focus:ring-primary" />
                  <label htmlFor="active" className="text-sm font-black text-slate-700 dark:text-slate-300 cursor-pointer">{lang === 'ar' ? 'نشط' : 'Active'}</label>
                </div>
              </form>
            </div>
            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0 flex gap-3">
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
              <button type="submit" form="adPkgForm" disabled={saving} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">
                {saving ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>{lang === 'ar' ? 'حفظ' : 'Save'}<span className="material-symbols-outlined">verified</span></>}
              </button>
            </div>
            
            {/* Close Button at Bottom - Mobile Only */}
            <div className="md:hidden px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                onClick={() => setModalOpen(false)}
                className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-black text-sm flex items-center justify-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl shadow-2xl w-full md:w-[90%] md:max-w-sm p-6 animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <p className="text-slate-700 dark:text-slate-300 font-bold mb-4">{lang === 'ar' ? 'حذف هذه الباقة؟' : 'Delete this package?'}</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-black">{(lang === 'ar' ? 'حذف' : 'Delete')}</button>
              <button onClick={() => setDeleteId(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
            </div>
            
            {/* Close Button at Bottom - Mobile Only */}
            <div className="md:hidden px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 shrink-0">
              <button
                onClick={() => setDeleteId(null)}
                className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-black text-sm flex items-center justify-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Info Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-[220] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full md:w-[90%] md:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-xl shadow-2xl border-t border-x md:border border-primary/20 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            
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
                  setModalOpen(false);
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
            <div className="p-8 border-b border-primary/10 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-3xl">person</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-700 dark:text-white leading-none">{lang === 'ar' ? 'بيانات المورد' : 'Supplier Profile'}</h3>
                </div>
              </div>
              <button onClick={() => setShowUserModal(false)} className="size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
              {isFetchingUser ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <div className="size-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                  <p className="text-[12px] font-black text-slate-500">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
                </div>
              ) : selectedUser ? (
                <div className="space-y-10">
                  <div className="flex items-center gap-6">
                    <div className="size-24 rounded-3xl border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0 ring-1 ring-primary/10">
                      {selectedUser.profileImage ? (
                        <img src={selectedUser.profileImage} className="size-full object-cover" alt="Profile" />
                      ) : (
                        <div className="size-full flex items-center justify-center text-3xl font-black bg-primary/5 text-primary">
                          {selectedUser.name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-2xl font-black text-slate-700 dark:text-white leading-none mb-2">{selectedUser.name}</h4>
                      <p className="text-sm font-bold text-slate-500 mb-3">{selectedUser.email}</p>
                      <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-[12px] font-black border border-primary/20">
                        {selectedUser.role?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/40 border border-primary/5">
                    <div className="space-y-1">
                      <p className="text-[11px] font-black text-slate-400">{lang === 'ar' ? 'المؤسسة' : 'Organization'}</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedUser.organizationName || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-black text-slate-400">{lang === 'ar' ? 'رقم الهاتف' : 'Phone'}</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">{selectedUser.phoneNumber || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-slate-400 font-bold">{lang === 'ar' ? 'فشل تحميل الملف الشخصي.' : 'Failed to load profile.'}</p>
                </div>
              )}
            </div>
            <div className="p-8 border-t border-primary/10 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
              <button onClick={() => setShowUserModal(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95">
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Lightbox */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-[300] flex items-end md:items-center justify-center bg-slate-900/95 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setSelectedReceipt(null)}>
          <div className="relative max-w-4xl w-full md:w-[90%] md:w-full flex flex-col items-center animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <img src={selectedReceipt} alt="Receipt" className="max-h-[80vh] rounded-[2rem] shadow-2xl border-4 border-white/20 object-contain" />
            <div className="mt-6 flex gap-4">
              <a href={selectedReceipt} target="_blank" rel="noopener noreferrer" className="px-8 py-3 bg-white text-slate-700 rounded-xl font-black text-sm flex items-center gap-2 shadow-xl hover:scale-105 transition-transform">
                <span className="material-symbols-outlined">open_in_new</span>
                {lang === 'ar' ? 'فتح في نافذة جديدة' : 'Open in New Tab'}
              </a>
              <button onClick={() => setSelectedReceipt(null)} className="px-8 py-3 bg-red-500 text-white rounded-xl font-black text-sm flex items-center gap-2 shadow-xl hover:scale-105 transition-transform">
                <span className="material-symbols-outlined">close</span>
                {lang === 'ar' ? 'إغلاق' : 'Close'}
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

export default AdPackages;
