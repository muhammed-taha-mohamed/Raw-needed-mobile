import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { AdPackage, AdSettings, AdSubscription } from '../../types';
import { useToast } from '../../contexts/ToastContext';

interface PendingPage {
  content: AdSubscription[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

const AdPackages: React.FC = () => {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [settings, setSettings] = useState<AdSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [featuredPrice, setFeaturedPrice] = useState<string>('');
  const [savingFeatured, setSavingFeatured] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdPackage | null>(null);
  const [form, setForm] = useState({ nameAr: '', nameEn: '', numberOfDays: 7, pricePerAd: '0', active: true, sortOrder: 0 });
  const [viewType, setViewType] = useState<'grid' | 'table'>('grid');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pendingSubscriptions, setPendingSubscriptions] = useState<AdSubscription[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'packages' | 'pending' | 'active'>('packages');

  const fetchPackages = async () => {
    try {
      const res = await api.get<AdPackage[] | { data: AdPackage[] }>('/api/v1/admin/ad-packages');
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      setPackages(list);
    } catch (e: any) {
      showToast(e.message || 'Failed to load packages', 'error');
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get<AdSettings | { data: AdSettings }>('/api/v1/admin/ad-packages/settings');
      const s = res && typeof res === 'object' && 'featuredPrice' in res ? res as AdSettings : (res as { data?: AdSettings })?.data;
      setSettings(s || null);
      setFeaturedPrice(String((s?.featuredPrice ?? 0)));
    } catch (e: any) {
      showToast(e.message || 'Failed to load settings', 'error');
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

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPackages(), fetchSettings()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPendingSubscriptions();
  }, []);

  const handleSaveFeatured = async () => {
    const num = parseFloat(featuredPrice);
    if (isNaN(num) || num < 0) {
      showToast(lang === 'ar' ? 'أدخل سعراً صحيحاً' : 'Enter a valid price', 'error');
      return;
    }
    setSavingFeatured(true);
    try {
      await api.put('/api/v1/admin/ad-packages/settings', { featuredPrice: num });
      setSettings({ featuredPrice: num });
      showToast(lang === 'ar' ? 'تم تحديث سعر عرض أولاً' : 'Featured price updated', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to update', 'error');
    } finally {
      setSavingFeatured(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ nameAr: '', nameEn: '', numberOfDays: 7, pricePerAd: '0', active: true, sortOrder: packages.length });
    setModalOpen(true);
  };

  const openEdit = (p: AdPackage) => {
    setEditing(p);
    setForm({
      nameAr: p.nameAr || '',
      nameEn: p.nameEn || '',
      numberOfDays: p.numberOfDays,
      pricePerAd: String((p as any).pricePerAd ?? p.price ?? 0),
      active: p.active,
      sortOrder: p.sortOrder ?? 0,
    });
    setModalOpen(true);
  };

  const handleSavePackage = async () => {
    const numDays = form.numberOfDays;
    const pricePerAd = parseFloat(form.pricePerAd);
    if (numDays < 1 || isNaN(pricePerAd) || pricePerAd < 0) {
      showToast(lang === 'ar' ? 'عدد الأيام وسعر الإعلان مطلوبان وصحيحان' : 'Valid days and price per ad required', 'error');
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

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 md:px-10 py-6 flex items-center justify-center min-h-[300px]">
        <div className="size-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const activePackages = packages.filter((p) => p.active);

  return (
    <div className="mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-6 font-display animate-in fade-in duration-500">
      {/* Tabs */}
      <div className="flex gap-1 p-1 mb-6 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 w-full max-w-md">
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
          {lang === 'ar' ? 'طلبات الاشتراك' : 'Pending'}
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-black transition-all ${activeTab === 'active' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
        >
          {lang === 'ar' ? 'الباقات النشطة' : 'Active'}
        </button>
      </div>

      {(activeTab === 'packages' || activeTab === 'active') && (
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
            {activeTab === 'packages' && (
              <button onClick={openAdd} className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-lg shadow-primary/20 font-bold transition-all active:scale-95 whitespace-nowrap text-sm">
                <span className="material-symbols-outlined text-[20px]">add</span>
                {lang === 'ar' ? 'إضافة باقة' : 'Add package'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab: Pending ad subscriptions */}
      {activeTab === 'pending' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-8 shadow-sm">
          <h2 className="text-base font-black text-slate-800 dark:text-white mb-4">
            {lang === 'ar' ? 'طلبات اشتراك الموردين (بانتظار الموافقة)' : 'Pending supplier ad subscriptions'}
          </h2>
        {loadingPending ? (
          <div className="flex justify-center py-8">
            <div className="size-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : pendingSubscriptions.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm py-4">
            {lang === 'ar' ? 'لا توجد طلبات معلقة.' : 'No pending requests.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'المورد' : 'Supplier'}</th>
                  <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'الباقة' : 'Package'}</th>
                  <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'عدد الإعلانات' : 'Ads'}</th>
                  <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'المبلغ' : 'Total'}</th>
                  <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'إثبات الدفع' : 'Proof'}</th>
                  <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {pendingSubscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="p-3 font-mono text-xs text-slate-600 dark:text-slate-400">{sub.supplierId?.slice(-8) || '—'}</td>
                    <td className="p-3 font-bold text-slate-800 dark:text-white">
                      {lang === 'ar' ? sub.packageNameAr || sub.packageNameEn : sub.packageNameEn || sub.packageNameAr}
                    </td>
                    <td className="p-3 font-bold text-slate-800 dark:text-white">{sub.numberOfAds ?? '—'}</td>
                    <td className="p-3 font-bold text-primary">{sub.totalPrice != null ? `${Number(sub.totalPrice)} EGP` : '—'}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {sub.requestedAt ? new Date(sub.requestedAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en') : '—'}
                    </td>
                    <td className="p-3">
                      {sub.paymentProofPath ? (
                        <a href={sub.paymentProofPath} target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline text-xs">
                          {lang === 'ar' ? 'عرض' : 'View'}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="p-3 flex gap-2">
                      <button
                        onClick={() => handleApproveSubscription(sub.id)}
                        disabled={actingId !== null}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {actingId === sub.id ? '...' : (lang === 'ar' ? 'موافقة' : 'Approve')}
                      </button>
                      <button
                        onClick={() => handleRejectSubscription(sub.id)}
                        disabled={actingId !== null}
                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 disabled:opacity-50"
                      >
                        {lang === 'ar' ? 'رفض' : 'Reject'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      )}

      {/* Tab: Packages (all) */}
      {activeTab === 'packages' && (
        <>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-8 shadow-sm">
            <h2 className="text-base font-black text-slate-800 dark:text-white mb-2">
              {lang === 'ar' ? 'سعر خيار «عرض أولاً»' : 'Featured (display first) price'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {lang === 'ar' ? 'السعر الإضافي الذي يدفعه المورد ليظهر إعلانه في الأول.' : 'Extra price the supplier pays to display their ad first.'}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={0}
                step={0.01}
                value={featuredPrice}
                onChange={(e) => setFeaturedPrice(e.target.value)}
                className="w-32 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              />
              <span className="text-sm font-bold text-slate-500">EGP</span>
              <button
                onClick={handleSaveFeatured}
                disabled={savingFeatured}
                className="px-5 py-2.5 rounded-xl bg-primary text-white font-black text-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {savingFeatured ? (lang === 'ar' ? 'جاري...' : 'Saving...') : (lang === 'ar' ? 'حفظ' : 'Save')}
              </button>
            </div>
          </div>

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
              {lang === 'ar' ? 'لا توجد باقات. أضف باقة لإتاحة الإعلانات للموردين.' : 'No packages. Add a package to allow suppliers to create ads.'}
            </p>
          </div>
        ) : viewType === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 items-stretch">
            {packages.map((p, idx) => {
              const pricePerAd = Number((p as any).pricePerAd ?? (p as any).price ?? 0);
              return (
                <div 
                  key={p.id} 
                  className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 p-5 md:p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col animate-in zoom-in-95"
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
                  <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => openEdit(p)} className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-primary hover:text-white font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-base">edit</span>
                      {lang === 'ar' ? 'تعديل' : 'Edit'}
                    </button>
                    <button onClick={() => setDeleteId(p.id)} className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 font-black text-xs transition-all active:scale-95 flex items-center justify-center">
                      <span className="material-symbols-outlined text-base">delete</span>
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
                      <td className="p-4 flex gap-2">
                        <button onClick={() => openEdit(p)} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-bold text-xs hover:bg-primary hover:text-white">Edit</button>
                        <button onClick={() => setDeleteId(p.id)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
          </div>
        </>
      )}

      {/* Tab: Active packages only */}
      {activeTab === 'active' && (
        <div className="mb-8">
          <h2 className="text-base md:text-lg font-black text-slate-800 dark:text-white mb-4">
            {lang === 'ar' ? 'الباقات النشطة' : 'Active packages'}
          </h2>
          {activePackages.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
              <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl text-slate-400">campaign</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
                {lang === 'ar' ? 'لا توجد باقات نشطة.' : 'No active packages.'}
              </p>
            </div>
          ) : viewType === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 items-stretch">
              {activePackages.map((p, idx) => {
                const pricePerAd = Number((p as any).pricePerAd ?? (p as any).price ?? 0);
                return (
                  <div key={p.id} className="relative bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 p-5 md:p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col animate-in zoom-in-95" style={{ animationDelay: `${idx * 40}ms` }}>
                    <div className={`absolute top-0 ${lang === 'ar' ? 'right-0' : 'left-0'} w-1.5 h-full bg-primary rounded-tl rounded-bl`} />
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-12 rounded-xl flex items-center justify-center border shrink-0 bg-primary/5 text-primary border-primary/10">
                          <span className="material-symbols-outlined text-[26px]">campaign</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 dark:text-white text-[17px] leading-tight truncate">
                            {lang === 'ar' ? (p.nameAr || `${p.numberOfDays} أيام`) : (p.nameEn || `${p.numberOfDays} days`)}
                          </h3>
                          {p.nameAr && p.nameEn && <p className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate">{lang === 'ar' ? p.nameEn : p.nameAr}</p>}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{lang === 'ar' ? 'نشط' : 'Active'}</span>
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
                    <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button onClick={() => openEdit(p)} className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-primary hover:text-white font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-base">edit</span>
                        {lang === 'ar' ? 'تعديل' : 'Edit'}
                      </button>
                      <button onClick={() => setDeleteId(p.id)} className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 font-black text-xs transition-all active:scale-95 flex items-center justify-center">
                        <span className="material-symbols-outlined text-base">delete</span>
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
                    <th className="text-left p-4 font-black text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'إجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {activePackages.map((p, idx) => {
                    const pricePerAd = Number((p as any).pricePerAd ?? (p as any).price ?? 0);
                    return (
                      <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-4 font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-4 font-bold text-slate-800 dark:text-white">{lang === 'ar' ? p.nameAr || p.nameEn : p.nameEn || p.nameAr}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">{p.numberOfDays}</td>
                        <td className="p-4 font-black text-primary">{pricePerAd} EGP</td>
                        <td className="p-4 flex gap-2">
                          <button onClick={() => openEdit(p)} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-bold text-xs hover:bg-primary hover:text-white">Edit</button>
                          <button onClick={() => setDeleteId(p.id)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100">Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit package modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-500 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-2xl">sell</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">
                    {editing ? (lang === 'ar' ? 'تعديل الباقة' : 'Edit package') : (lang === 'ar' ? 'إضافة باقة' : 'Add package')}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">Name, days & price per ad</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="size-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <form id="adPkgForm" onSubmit={(e) => { e.preventDefault(); handleSavePackage(); }} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase px-1">{lang === 'ar' ? 'الاسم (ع)' : 'Name (AR)'}</label>
                  <input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm md:text-base font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase px-1">{lang === 'ar' ? 'الاسم (en)' : 'Name (EN)'}</label>
                  <input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm md:text-base font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase px-1">{lang === 'ar' ? 'عدد الأيام' : 'Number of days'}</label>
                  <input type="number" min={1} value={form.numberOfDays} onChange={(e) => setForm({ ...form, numberOfDays: parseInt(e.target.value, 10) || 1 })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase px-1">{lang === 'ar' ? 'سعر الإعلان الواحد (EGP)' : 'Price per ad (EGP)'}</label>
                  <input type="number" min={0} step={0.01} value={form.pricePerAd} onChange={(e) => setForm({ ...form, pricePerAd: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white" />
                </div>
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <input type="checkbox" id="active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="size-5 rounded-md border-slate-300 text-primary focus:ring-primary" />
                  <label htmlFor="active" className="text-sm font-black text-slate-700 dark:text-slate-300 cursor-pointer">{lang === 'ar' ? 'نشط' : 'Active'}</label>
                </div>
              </form>
            </div>
            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0 flex gap-3">
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
              <button type="submit" form="adPkgForm" disabled={saving} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">
                {saving ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>{lang === 'ar' ? 'حفظ' : 'Save'}<span className="material-symbols-outlined">verified</span></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button - Mobile only, Packages tab */}
      {activeTab === 'packages' && (
        <div className="fixed bottom-32 left-0 right-0 z-[130] pointer-events-none px-6 md:hidden">
          <div className="max-w-[1200px] mx-auto flex flex-col items-start gap-3 pointer-events-auto">
            <button 
              onClick={openAdd}
              className="size-14 rounded-full bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center active:scale-90 transition-all border-2 border-white/20"
              title={lang === 'ar' ? 'إضافة باقة' : 'Add package'}
            >
              <span className="material-symbols-outlined text-2xl">add</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <p className="text-slate-700 dark:text-slate-300 font-bold mb-4">{lang === 'ar' ? 'حذف هذه الباقة؟' : 'Delete this package?'}</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-black">{(lang === 'ar' ? 'حذف' : 'Delete')}</button>
              <button onClick={() => setDeleteId(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdPackages;
