
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../App';
import { AdPackage, AdSettings, AdSubscription, Advertisement } from '../../types';
import { api } from '../../api';
import PaginationFooter from '../../components/PaginationFooter';
import EmptyState from '../../components/EmptyState';
import { MODAL_DROPDOWN_TRIGGER_CLASS, MODAL_OVERLAY_BASE_CLASS, MODAL_PANEL_BASE_CLASS, MODAL_TEXTAREA_CLASS } from '../../components/modalTheme';

interface PaginatedAds {
  content: Advertisement[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

const Advertisements: React.FC = () => {
  const { lang, t } = useLanguage();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [userRole, setUserRole] = useState<string>('');
  const [adPackages, setAdPackages] = useState<AdPackage[]>([]);
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [featured, setFeatured] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({ text: '', image: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [hasActiveAdSubscription, setHasActiveAdSubscription] = useState<boolean | null>(null);
  /** First APPROVED subscription for supplier – used as the only allowed package when adding an ad */
  const [supplierApprovedSubscription, setSupplierApprovedSubscription] = useState<AdSubscription | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const parsed = JSON.parse(userStr);
      setUserRole((parsed.role || '').toUpperCase());
    }
  }, []);

  useEffect(() => {
    const role = (localStorage.getItem('user') && JSON.parse(localStorage.getItem('user')!).role || '').toUpperCase();
    const isSupplier = role.includes('SUPPLIER') && role !== 'SUPER_ADMIN' && role !== 'ADMIN';
    if (!isSupplier) {
      setHasActiveAdSubscription(true);
      setSupplierApprovedSubscription(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<any>('/api/v1/supplier/ad-subscriptions');
        const list = Array.isArray(res)
          ? res
          : (res?.content?.data ?? res?.data ?? []);
        const approved = list.filter(
          (s: AdSubscription) =>
            s.status === 'APPROVED' &&
            (s.remainingAds == null || s.remainingAds > 0) &&
            (s.endDate == null || s.endDate === '' || new Date(s.endDate) > new Date())
        );
        const active = approved.length > 0;
        if (!cancelled) {
          setHasActiveAdSubscription(active);
          setSupplierApprovedSubscription(active ? approved[0] : null);
        }
      } catch {
        if (!cancelled) {
          setHasActiveAdSubscription(false);
          setSupplierApprovedSubscription(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [userRole]);

  useEffect(() => {
    fetchAds(currentPage, pageSize);
  }, [currentPage, pageSize]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
  const isSupplier = userRole.includes('SUPPLIER') && !isAdmin;
  const canCreateAds = isAdmin || (isSupplier && hasActiveAdSubscription === true);

  const fetchAds = async (page: number, size: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<PaginatedAds>(`/api/v1/advertisements?page=${page}&size=${size}`);
      setAds(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load advertisements.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const openAddModal = async () => {
    if (!canCreateAds) return;
    setEditingAd(null);
    setSelectedFile(null);
    setImagePreview(null);
    setFormData({ text: '', image: '' });
    if (isSupplier && supplierApprovedSubscription) {
      setSelectedPackageId(supplierApprovedSubscription.adPackageId);
      setFeatured(!!(supplierApprovedSubscription as any).featured);
    } else {
      setSelectedPackageId('');
      setFeatured(false);
    }
    if (isSupplier || isAdmin) {
      try {
        const [pkgRes, setRes] = await Promise.all([
          api.get<{ data: AdPackage[] }>('/api/v1/advertisements/packages'),
          api.get<{ data: AdSettings }>('/api/v1/advertisements/settings'),
        ]);
        setAdPackages(pkgRes.data || []);
        setAdSettings(setRes.data || null);
        if (isAdmin && (pkgRes.data?.length ?? 0) > 0) setSelectedPackageId((prev) => prev || pkgRes.data![0].id);
      } catch (e) {
        setToast({ message: (e as Error).message || 'Failed to load options', type: 'error' });
      }
    }
    setIsModalOpen(true);
  };

  const openEditModal = (ad: Advertisement) => {
    if (!canCreateAds) {
      setToast({ 
        message: t.ads.featureRequired, 
        type: 'error' 
      });
      return;
    }
    setEditingAd(ad);
    setSelectedFile(null);
    setImagePreview(ad.image);
    setFormData({ text: ad.text, image: ad.image });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setIsProcessing(true);
    try {
      await api.delete(`/api/v1/advertisements/${deleteConfirmId}`);
      setToast({ message: t.ads.successDelete, type: 'success' });
      setDeleteConfirmId(null);
      await fetchAds(currentPage, pageSize);
    } catch (err: any) {
      setToast({ message: err.message || "Deletion failed", type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateAds) return;
    const effectivePackageId = isSupplier && supplierApprovedSubscription
      ? supplierApprovedSubscription.adPackageId
      : (selectedPackageId || adPackages[0]?.id);
    if (!editingAd && !effectivePackageId) {
      setToast({
        message: lang === 'ar'
          ? 'لا يمكن نشر إعلان بدون اشتراك معتمد. اشترك في باقة وانتظر الموافقة.'
          : 'You need an approved ad subscription to publish. Subscribe to a package and wait for approval.',
        type: 'error',
      });
      return;
    }
    setIsProcessing(true);
    setError(null);

    let finalImageUrl = formData.image;

    try {
      if (selectedFile) {
        const uploadData = new FormData();
        uploadData.append('file', selectedFile);
        finalImageUrl = await api.post<string>('/api/v1/image/upload', uploadData);
      }

      if (editingAd) {
        const payload = { text: formData.text, image: finalImageUrl };
        await api.put(`/api/v1/advertisements/${editingAd.id}`, payload);
        setToast({ message: t.ads.successUpdate, type: 'success' });
      } else {
        const payload = {
          text: formData.text,
          image: finalImageUrl,
          adPackageId: effectivePackageId,
          featured: isSupplier ? featured : false,
        };
        await api.post('/api/v1/advertisements', payload);
        setToast({ message: t.ads.successAdd, type: 'success' });
      }

      await fetchAds(currentPage, pageSize);
      setIsModalOpen(false);
    } catch (err: any) {
      setError((err as Error).message || 'Operation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="w-full py-8 flex flex-col gap-8 font-display animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {toast && (
        <div className={`fixed top-24 ${lang === 'ar' ? 'left-10' : 'right-10'} z-[300] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border animate-in slide-in-from-top-10 duration-500 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <span className="material-symbols-outlined">{toast.type === 'success' ? 'verified' : 'error'}</span>
          <span className="font-black text-sm">{toast.message}</span>
        </div>
      )}

      {isSupplier && hasActiveAdSubscription === false && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 flex flex-wrap items-center gap-2">
          <span className="material-symbols-outlined text-2xl">info</span>
          <span className="font-bold flex-1">
            {lang === 'ar'
              ? 'لإضافة إعلانات يجب الاشتراك في باقة إعلانات والدفع ثم انتظار موافقة الأدمن.'
              : 'To add ads you must subscribe to an ad package, pay, then wait for admin approval.'}
          </span>
          <Link
            to="/ad-packages"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90"
          >
            {lang === 'ar' ? 'باقات الإعلانات' : 'Ad Packages'}
          </Link>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 mb-6">
        {canCreateAds && (
          <button 
            onClick={openAddModal}
            className="hidden md:flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-3.5 rounded-xl shadow-lg shadow-primary/20 font-black text-xs transition-all active:scale-95 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
            {t.ads.addNew}
          </button>
        )}
      </div>

      {isLoading && ads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-primary/5">
           <div className="size-12 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
           <p className="text-slate-500 font-black text-[12px]">Fetching Promotions...</p>
        </div>
      ) : error ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/20 rounded-xl shadow-2xl">
           <span className="material-symbols-outlined text-red-500 text-6xl mb-6">cloud_off</span>
           <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Sync Error</h3>
           <p className="text-slate-500 mb-8 font-bold">{error}</p>
           <button onClick={() => fetchAds(0, pageSize)} className="px-12 py-4 bg-primary text-white rounded-2xl font-black active:scale-95 shadow-xl shadow-primary/20">Retry Sync</button>
        </div>
      ) : ads.length === 0 ? (
        <div className="bg-white/40 dark:bg-slate-900/40 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
           <EmptyState title={t.ads.empty} subtitle={lang === 'ar' ? 'عد لاحقاً لتحديثات جديدة.' : 'Check back later for exciting updates.'} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
          {ads.map((ad, idx) => (
            <div 
              key={ad.id} 
              className="bg-white dark:bg-slate-900 rounded-xl border border-primary/5 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col animate-in zoom-in-95 h-full group"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-b border-slate-50 dark:border-slate-800 relative">
                 <img src={ad.image} className="size-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Promotion" />
                 {canCreateAds && (
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                      <div className="flex gap-2">
                         <button onClick={() => openEditModal(ad)} className="size-10 rounded-xl bg-white text-slate-900 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"><span className="material-symbols-outlined text-xl">edit</span></button>
                         <button onClick={() => setDeleteConfirmId(ad.id)} className="size-10 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"><span className="material-symbols-outlined text-xl">delete</span></button>
                      </div>
                   </div>
                 )}
              </div>
              <div className="p-6 flex flex-col flex-1">
                 <p className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-3 leading-relaxed">
                   {ad.text}
                 </p>
                 <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 tabular-nums">{t.ads.refLabel}: #{ad.id.slice(-6)}</span>
                    <div className="flex items-center gap-1">
                       <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                       <span className="text-[9px] font-black text-emerald-500">{t.common.live}</span>
                    </div>
                 </div>
              </div>
            </div>
          ))}
          
          {canCreateAds && (
            <div 
              onClick={openAddModal}
              className="rounded-xl border-2 border-dashed border-primary/10 hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center min-h-[300px] cursor-pointer group"
            >
               <div className="size-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white shadow-sm transition-all">
                  <span className="material-symbols-outlined text-4xl">add</span>
               </div>
               <p className="mt-4 text-xs font-black text-slate-400 group-hover:text-primary">{t.ads.newPromotion}</p>
            </div>
          )}
        </div>
      )}

      <PaginationFooter
        currentPage={currentPage}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        currentCount={ads.length}
      />

      {/* Delete Confirmation */}
      {canCreateAds && deleteConfirmId && (
        <div className="fixed inset-0 z-[400] flex items-end md:items-center justify-center bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full md:w-[90%] md:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-xl shadow-2xl border-t border-x md:border border-primary/20 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300">
            
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
                  setDeleteConfirmId(null);
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
            
            <div className="p-10 text-center">
              <div className="mx-auto size-20 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-red-50/50">
                <span className="material-symbols-outlined text-5xl">warning</span>
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">
                {lang === 'ar' ? 'حذف الإعلان؟' : 'Delete Ad?'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-500 mb-10 leading-relaxed font-bold">
                {t.ads.deleteConfirm}
              </p>
              <div className="flex gap-4">
                <button 
                  disabled={isProcessing}
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-4 text-[12px] font-black text-slate-500 hover:bg-slate-50 rounded-xl transition-all border border-slate-100"
                >
                  {t.categories.cancel}
                </button>
                <button 
                  disabled={isProcessing}
                  onClick={handleDelete}
                  className="flex-[1.5] py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-lg shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center text-[12px] gap-2"
                >
                  {isProcessing ? (
                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">delete_forever</span>
                      {lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {canCreateAds && isModalOpen && (
        <div className={`fixed inset-0 z-[150] ${MODAL_OVERLAY_BASE_CLASS}`}>
          <div className={`${MODAL_PANEL_BASE_CLASS} md:max-w-xl`}>
            
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
                  setIsModalOpen(false);
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
            
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-2xl">ads_click</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">{editingAd ? t.ads.edit : t.ads.addNew}</h3>
                  <p className="text-[10px] font-black text-slate-400 mt-2">{t.ads.designPlacement}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="size-8 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <form id="adForm" onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
                    <p className="text-sm font-black text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 px-1">{t.ads.image}</label>
                  {!imagePreview ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden border-slate-200 hover:border-primary bg-slate-50/50 dark:bg-slate-800/50"
                    >
                      <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">add_a_photo</span>
                      <span className="text-[9px] font-black text-slate-400">{t.common.clickToUpload}</span>
                    </div>
                  ) : (
                    <div className="relative h-40 rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 group">
                      <img src={imagePreview} className="size-full object-cover" alt="Ad" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="size-10 bg-white text-primary rounded-full shadow-lg flex items-center justify-center"><span className="material-symbols-outlined">edit</span></button>
                        <button type="button" onClick={() => { setSelectedFile(null); setImagePreview(null); setFormData({ ...formData, image: '' }); }} className="size-10 bg-red-500 text-white rounded-full shadow-lg flex items-center justify-center"><span className="material-symbols-outlined">delete</span></button>
                      </div>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                  <p className="text-[9px] font-black text-slate-400 px-1">16:9 recommended</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 px-1">{t.ads.text}</label>
                  <textarea
                    required
                    value={formData.text}
                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                    placeholder={t.ads.textPlaceholder}
                    className={MODAL_TEXTAREA_CLASS}
                  />
                </div>

                {!editingAd && isAdmin && adPackages.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'باقة العرض' : 'Ad package'}</label>
                    <select
                      required
                      value={selectedPackageId}
                      onChange={(e) => setSelectedPackageId(e.target.value)}
                      className={MODAL_DROPDOWN_TRIGGER_CLASS}
                    >
                      {adPackages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {lang === 'ar' ? (p.nameAr || `${p.numberOfDays} أيام`) : (p.nameEn || `${p.numberOfDays} days`)} — {(p as any).pricePerAd ?? (p as any).price ?? 0} EGP / {lang === 'ar' ? 'إعلان' : 'ad'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {!editingAd && isSupplier && supplierApprovedSubscription && (
                  <>
                    <div className="p-4 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20">
                      <p className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'الباقة المعتمدة' : 'Approved package'}</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                        {lang === 'ar' ? (supplierApprovedSubscription.packageNameAr || supplierApprovedSubscription.packageNameEn) : (supplierApprovedSubscription.packageNameEn || supplierApprovedSubscription.packageNameAr)} — {lang === 'ar' ? 'متبقي' : 'remaining'}: {supplierApprovedSubscription.remainingAds ?? 0}
                      </p>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-5 rounded-md border-slate-300 text-primary focus:ring-primary" />
                        <span className="text-sm font-black text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'عرض الإعلان في الأول' : 'Display ad first'}</span>
                      </label>
                      <span className="text-sm font-bold text-primary">+{(adSettings?.featuredPrice ?? 0)} EGP</span>
                    </div>
                  </>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        {editingAd ? (lang === 'ar' ? 'تحديث الإعلان' : 'Update') : (lang === 'ar' ? 'نشر الإعلان' : 'Publish')}
                        <span className="material-symbols-outlined">verified</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button - Mobile only */}
      {canCreateAds && (
        <div className="fixed bottom-32 left-0 right-0 z-[130] pointer-events-none px-6 md:hidden">
          <div className="w-full flex flex-col items-start gap-3 pointer-events-auto">
            <button 
              onClick={openAddModal}
              className="size-14 rounded-full bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center active:scale-90 transition-all border-2 border-white/20"
              title={t.ads.addNew}
            >
              <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
            </button>
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

export default Advertisements;
