import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { AdPackage, AdSubscription } from '../../types';
import { useToast } from '../../contexts/ToastContext';

const SupplierAdPackages: React.FC = () => {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<AdPackage | null>(null);
  const [numberOfAds, setNumberOfAds] = useState(1);
  const [paymentProofPath, setPaymentProofPath] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewType, setViewType] = useState<'grid' | 'table'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pkgRes, subRes] = await Promise.all([
        api.get<AdPackage[] | { data: AdPackage[] }>('/api/v1/advertisements/packages'),
        api.get<AdSubscription[] | { data: AdSubscription[] }>('/api/v1/supplier/ad-subscriptions'),
      ]);
      const pkgList = Array.isArray(pkgRes) ? pkgRes : (pkgRes as { data?: AdPackage[] })?.data ?? [];
      const subList = Array.isArray(subRes) ? subRes : (subRes as { data?: AdSubscription[] })?.data ?? [];
      setPackages(pkgList);
      setSubscriptions(subList);
    } catch (e: any) {
      showToast(e.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (pkg: AdPackage) => {
    setSelectedPackage(pkg);
    setNumberOfAds(1);
    setSelectedFile(null);
    setPreview(null);
    setPaymentProofPath('');
    setModalOpen(true);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const pricePerAd = selectedPackage ? Number((selectedPackage as any).pricePerAd ?? (selectedPackage as any).price ?? 0) : 0;
  const totalPrice = numberOfAds * pricePerAd;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage || numberOfAds < 1) {
      showToast(lang === 'ar' ? 'اختر الباقة وعدد الإعلانات' : 'Select package and number of ads', 'error');
      return;
    }
    setSubmitting(true);
    try {
      let proofPath = paymentProofPath;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        proofPath = await api.post<string>('/api/v1/image/upload', formData);
      }
      await api.post('/api/v1/supplier/ad-subscriptions', {
        adPackageId: selectedPackage.id,
        numberOfAds,
        paymentProofPath: proofPath || undefined,
      });
      showToast(lang === 'ar' ? 'تم إرسال طلب الاشتراك. انتظر موافقة الأدمن.' : 'Subscription request sent. Wait for admin approval.', 'success');
      setModalOpen(false);
      setSelectedPackage(null);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const activeSubscription = subscriptions.find(
    (s) => s.status === 'APPROVED' && s.endDate && new Date(s.endDate) > new Date() && (s.remainingAds ?? 0) > 0
  );
  const hasActive = !!activeSubscription;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-6 flex items-center justify-center min-h-[300px]">
        <div className="size-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-6 font-display animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 mb-6">
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="flex gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <button onClick={() => setViewType('grid')} className={`p-2 rounded-lg transition-all ${viewType === 'grid' ? 'bg-primary/10 text-primary dark:bg-primary/30 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              <span className="material-symbols-outlined text-[22px]">grid_view</span>
            </button>
            <button onClick={() => setViewType('table')} className={`p-2 rounded-lg transition-all ${viewType === 'table' ? 'bg-primary/10 text-primary dark:bg-primary/30 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              <span className="material-symbols-outlined text-[22px]">view_list</span>
            </button>
          </div>
        </div>
      </div>

      {/* My subscriptions - same style as admin "Pending supplier ad subscriptions" */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-8 shadow-sm">
        <h2 className="text-base font-black text-slate-800 dark:text-white mb-4">
          {lang === 'ar' ? 'اشتراكاتي' : 'My subscriptions'}
        </h2>
        {subscriptions.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm py-4">
            {lang === 'ar' ? 'لا توجد اشتراكات.' : 'No subscriptions yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'الباقة' : 'Package'}</th>
                  <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'عدد الإعلانات' : 'Ads'}</th>
                  <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'المتبقي' : 'Remaining'}</th>
                  <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'المبلغ' : 'Total'}</th>
                  <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'صلاحية حتى' : 'Valid until'}</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="p-3 font-bold text-slate-800 dark:text-white">
                      {lang === 'ar' ? sub.packageNameAr || sub.packageNameEn : sub.packageNameEn || sub.packageNameAr}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                          sub.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            : sub.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-700 dark:text-red-300'
                            : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {sub.status === 'PENDING' ? (lang === 'ar' ? 'قيد المراجعة' : 'Pending') : sub.status === 'APPROVED' ? (lang === 'ar' ? 'معتمد' : 'Approved') : (lang === 'ar' ? 'مرفوض' : 'Rejected')}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-800 dark:text-white">{sub.numberOfAds ?? '—'}</td>
                    <td className="p-3 font-bold text-primary">{sub.remainingAds != null ? sub.remainingAds : '—'}</td>
                    <td className="p-3 font-bold text-slate-700 dark:text-slate-300">{sub.totalPrice != null ? `${Number(sub.totalPrice)} EGP` : '—'}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{formatDate(sub.requestedAt)}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{formatDate(sub.endDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {hasActive && activeSubscription && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex flex-wrap items-center gap-3">
          <span className="material-symbols-outlined text-2xl">check_circle</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold">
              {lang === 'ar' ? 'لديك اشتراك فعّال.' : 'You have an active subscription.'}
              {activeSubscription.remainingAds != null && (
                <span className="ml-2 font-black">
                  {lang === 'ar' ? `إعلانات متبقية: ${activeSubscription.remainingAds}` : `Remaining ads: ${activeSubscription.remainingAds}`}
                </span>
              )}
            </p>
            <p className="text-sm mt-0.5 opacity-90">
              {lang === 'ar' ? 'صلاحية حتى' : 'Valid until'} {formatDate(activeSubscription.endDate)} — {lang === 'ar' ? 'أضف إعلاناتك من صفحة «إعلاناتي».' : 'Add ads from "My Ads" page.'}
            </p>
          </div>
        </div>
      )}

      {/* Packages list - same structure as admin */}
      <div className="mb-8">
        <h2 className="text-base md:text-lg font-black text-slate-800 dark:text-white mb-4">
          {lang === 'ar' ? 'الباقات (سعر الإعلان + مدة الظهور)' : 'Packages (price per ad + display days)'}
        </h2>

        {packages.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
            <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-400">campaign</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
              {lang === 'ar' ? 'لا توجد باقات متاحة حالياً.' : 'No packages available.'}
            </p>
          </div>
        ) : viewType === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 items-stretch">
            {packages.map((p, idx) => {
              const pricePerAd = Number((p as any).pricePerAd ?? (p as any).price ?? 0);
              return (
                <div
                  key={p.id}
                  className="relative bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 p-5 md:p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col animate-in zoom-in-95"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className={`absolute top-0 ${lang === 'ar' ? 'right-0' : 'left-0'} w-1.5 h-full ${p.active ? 'bg-primary' : 'bg-slate-300'} rounded-tl rounded-bl`} />
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`size-12 rounded-xl flex items-center justify-center border shrink-0 ${p.active ? 'bg-primary/5 text-primary border-primary/10' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                        <span className="material-symbols-outlined text-[26px]">campaign</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 dark:text-white text-[17px] leading-tight truncate">
                          {lang === 'ar' ? (p.nameAr || `${p.numberOfDays} أيام`) : (p.nameEn || `${p.numberOfDays} days`)}
                        </h3>
                        {p.nameAr && p.nameEn && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate">{lang === 'ar' ? p.nameEn : p.nameAr}</p>
                        )}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${p.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-200 text-slate-500'}`}>
                      {p.active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'غير نشط' : 'Inactive')}
                    </span>
                  </div>
                  <div className="space-y-3 flex-grow mb-5">
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-500 text-lg">calendar_today</span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'مدة ظهور الإعلان' : 'Display days'}</span>
                      </div>
                      <span className="text-base font-black text-slate-900 dark:text-white">{p.numberOfDays}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/10">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">payments</span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'سعر الإعلان' : 'Price per ad'}</span>
                      </div>
                      <span className="text-lg font-black text-primary">{pricePerAd} <span className="text-sm font-bold">EGP</span></span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => p.active && openModal(p)}
                      disabled={!p.active}
                      className="w-full py-2.5 rounded-xl bg-primary text-white font-black text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                      {lang === 'ar' ? 'اختيار الباقة' : 'Select'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left p-4 font-black text-slate-700 dark:text-slate-300">#</th>
                  <th className="text-left p-4 font-black text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="text-left p-4 font-black text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'أيام الظهور' : 'Days'}</th>
                  <th className="text-left p-4 font-black text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'سعر الإعلان' : 'Price per ad'}</th>
                  <th className="text-left p-4 font-black text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="text-left p-4 font-black text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((p, idx) => {
                  const pricePerAd = Number((p as any).pricePerAd ?? (p as any).price ?? 0);
                  return (
                    <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-4 font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-white">{lang === 'ar' ? p.nameAr || p.nameEn : p.nameEn || p.nameAr}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{p.numberOfDays}</td>
                      <td className="p-4 font-black text-primary">{pricePerAd} EGP</td>
                      <td className="p-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${p.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-200 text-slate-500'}`}>
                          {p.active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'غير نشط' : 'Inactive')}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => p.active && openModal(p)}
                          disabled={!p.active}
                          className="px-3 py-1.5 rounded-lg bg-primary text-white font-bold text-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {lang === 'ar' ? 'اختيار' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subscription request modal */}
      {modalOpen && selectedPackage && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-5 duration-500">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-2xl">receipt_long</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">
                    {lang === 'ar' ? 'طلب اشتراك' : 'Subscription request'}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">
                    {lang === 'ar' ? selectedPackage.nameAr || selectedPackage.nameEn : selectedPackage.nameEn || selectedPackage.nameAr} • {pricePerAd} EGP / {lang === 'ar' ? 'إعلان' : 'ad'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setModalOpen(false); setSelectedPackage(null); }} className="size-8 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <div className="space-y-5">
                <div className="flex justify-between items-end">
                  <label className="text-[11px] font-black text-slate-500 uppercase px-1">{lang === 'ar' ? 'عدد الإعلانات' : 'Number of ads'}</label>
                  <span className="text-2xl font-black text-primary tabular-nums">{numberOfAds}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800">
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={numberOfAds}
                    onChange={(e) => setNumberOfAds(parseInt(e.target.value, 10) || 1)}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between mt-2 text-[10px] font-black text-slate-400">1 — 50</div>
                </div>
                <div className="p-4 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 flex items-center justify-between">
                  <span className="text-sm font-black text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'الإجمالي' : 'Total'}</span>
                  <span className="text-xl font-black text-primary">{totalPrice} EGP</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase px-1">{lang === 'ar' ? 'إثبات الدفع (اختياري)' : 'Payment proof (optional)'}</label>
                <div onClick={() => fileInputRef.current?.click()} className="h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer border-slate-200 hover:border-primary bg-slate-50/50 dark:bg-slate-800/50 overflow-hidden">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                  {preview ? (
                    <img src={preview} alt="Preview" className="size-full object-cover" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">add_a_photo</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase">{lang === 'ar' ? 'اضغط لرفع صورة' : 'Click to upload'}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalOpen(false); setSelectedPackage(null); }} className="flex-1 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" disabled={submitting} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">
                  {submitting ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>{lang === 'ar' ? 'إرسال الطلب' : 'Submit request'}<span className="material-symbols-outlined">verified</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierAdPackages;
