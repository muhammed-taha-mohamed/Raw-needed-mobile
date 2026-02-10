import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { AdPackage, AdSubscription } from '../../types';
import type { PaymentInfo } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import EmptyState from '../../components/EmptyState';

const SupplierAdPackages: React.FC = () => {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdSubscription[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<AdPackage | null>(null);
  const [numberOfAds, setNumberOfAds] = useState(1);
  const [featured, setFeatured] = useState(false);
  const [paymentProofPath, setPaymentProofPath] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethodsTooltipOpen, setPaymentMethodsTooltipOpen] = useState(false);
  const [subscriptionDetailsTooltipOpen, setSubscriptionDetailsTooltipOpen] = useState(false);
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null);
  const [copiedTransferId, setCopiedTransferId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pkgRes, subRes, paymentData] = await Promise.all([
        api.get<AdPackage[] | { data: AdPackage[] }>('/api/v1/advertisements/packages'),
        api.get<AdSubscription[] | { data: AdSubscription[] }>('/api/v1/supplier/ad-subscriptions'),
        api.get<PaymentInfo[]>('/api/v1/admin/payment-info').then((d) => (Array.isArray(d) ? d : [])).catch(() => []),
      ]);
      const pkgList = Array.isArray(pkgRes) ? pkgRes : (pkgRes as { data?: AdPackage[] })?.data ?? [];
      const subList = Array.isArray(subRes) ? subRes : (subRes as { data?: AdSubscription[] })?.data ?? [];
      setPackages(pkgList);
      setSubscriptions(subList);
      setPaymentMethods(Array.isArray(paymentData) ? paymentData.filter((p) => p.active) : []);
    } catch (e: any) {
      showToast(e.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      setPaymentMethodsTooltipOpen(false);
      setSubscriptionDetailsTooltipOpen(false);
      setActiveFeatureId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const openModal = (pkg: AdPackage) => {
    setSelectedPackage(pkg);
    setNumberOfAds(1);
    setFeatured(false);
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
  const featuredPrice = selectedPackage ? Number((selectedPackage as any).featuredPrice ?? 0) : 0;
  const basePrice = numberOfAds * pricePerAd;
  const totalPrice = basePrice + (featured ? featuredPrice : 0);

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
        featured,
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

  const paymentTypeLabel = (type: string) =>
    type === 'BANK_ACCOUNT' ? t.planSelection.bankAccount : t.planSelection.electronicWallet;

  if (loading) {
    return (
      <div className="w-full py-6 flex items-center justify-center min-h-[300px]">
        <div className="size-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full py-6 flex flex-col gap-6 font-display animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Current ad subscription summary - same style as PlanSelection */}
      {activeSubscription && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="bg-slate-900 dark:bg-slate-800 rounded-xl p-6 text-white relative overflow-hidden shadow-xl border border-white/5">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <span className="material-symbols-outlined text-[80px]">campaign</span>
            </div>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-4 flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-2xl fill-1">campaign</span>
                </div>
                <div>
                  <h2 className="text-xl font-black">
                    {lang === 'ar' ? activeSubscription.packageNameAr || activeSubscription.packageNameEn : activeSubscription.packageNameEn || activeSubscription.packageNameAr}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-black text-emerald-400">{lang === 'ar' ? 'حساب مفعل' : 'Active'}</span>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-0.5">
                  <p className="text-[12px] font-black text-slate-300">{lang === 'ar' ? 'تاريخ الانتهاء' : 'Expires'}</p>
                  <p className="text-[11px] font-bold tabular-nums text-primary">{formatDate(activeSubscription.endDate)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[12px] font-black text-slate-300">{lang === 'ar' ? 'تاريخ التفعيل' : 'Activated'}</p>
                  <p className="text-[11px] font-bold tabular-nums">{formatDate(activeSubscription.startDate || activeSubscription.approvedAt)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[12px] font-black text-slate-300">{lang === 'ar' ? 'عدد الإعلانات' : 'Ads'}</p>
                  <p className="text-sm font-black tabular-nums">{activeSubscription.numberOfAds ?? 0}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[12px] font-black text-slate-300">{lang === 'ar' ? 'المتبقي' : 'Remaining'}</p>
                  <p className="text-sm font-black tabular-nums text-primary">{activeSubscription.remainingAds ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dropdowns: Payment Methods + Current Subscription Details */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative inline-block">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPaymentMethodsTooltipOpen((v) => !v);
              setSubscriptionDetailsTooltipOpen(false);
              setActiveFeatureId(null);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-primary hover:bg-primary/5 transition-all text-[11px] font-black"
          >
            <span className="material-symbols-outlined text-primary text-lg">payments</span>
            {t.planSelection.paymentMethods}
            <span className={`material-symbols-outlined text-base transition-transform duration-300 ${paymentMethodsTooltipOpen ? 'rotate-180' : ''}`}>expand_more</span>
          </button>
          {paymentMethodsTooltipOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className={`absolute top-full mt-2 z-[60] w-full min-w-[320px] max-w-[90vw] sm:min-w-[380px] p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-primary/10 animate-in fade-in zoom-in-95 duration-200 ${lang === 'ar' ? 'right-0' : 'left-0'}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
                <h3 className="text-sm font-black text-slate-700 dark:text-white">{t.planSelection.paymentMethods}</h3>
              </div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{t.planSelection.paymentMethodsSubtitle}</p>
              {paymentMethods.length > 0 ? (
                <div className="space-y-3 max-h-[280px] overflow-y-auto no-scrollbar">
                  {paymentMethods.map((pm) => (
                    <div key={pm.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="material-symbols-outlined text-primary text-base">{pm.paymentType === 'BANK_ACCOUNT' ? 'account_balance' : 'account_balance_wallet'}</span>
                        <span className="text-[10px] font-black text-primary">{paymentTypeLabel(pm.paymentType)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 flex-1 min-w-0 truncate">{pm.transferNumber}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(pm.transferNumber);
                            setCopiedTransferId(pm.id);
                            setTimeout(() => setCopiedTransferId(null), 2000);
                          }}
                          title={t.planSelection.copy}
                          className="shrink-0 p-1.5 rounded-lg hover:bg-primary/10 text-slate-500 hover:text-primary transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">{copiedTransferId === pm.id ? 'check' : 'content_copy'}</span>
                        </button>
                      </div>
                      {pm.accountHolderName && <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{pm.accountHolderName}</p>}
                      {pm.bankName && <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{pm.bankName}</p>}
                      {pm.walletProvider && <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{pm.walletProvider}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{t.planSelection.noPaymentMethods}</p>
              )}
              <div className={`absolute -top-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-l border-t border-primary/10 rotate-45 ${lang === 'ar' ? 'right-6' : 'left-6'}`} />
            </div>
          )}
        </div>

        {subscriptions.length > 0 && (
          <div className="relative inline-block">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSubscriptionDetailsTooltipOpen((v) => !v);
                setPaymentMethodsTooltipOpen(false);
                setActiveFeatureId(null);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-primary hover:bg-primary/5 transition-all text-[11px] font-black"
            >
              <span className="material-symbols-outlined text-primary text-lg">info</span>
              {lang === 'ar' ? 'تفاصيل الاشتراك الحالي' : 'Current Subscription Details'}
              <span className={`material-symbols-outlined text-base transition-transform duration-300 ${subscriptionDetailsTooltipOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            {subscriptionDetailsTooltipOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className={`absolute top-full mt-2 z-[60] w-full max-w-[calc(100vw-1.7rem)] sm:w-[380px] sm:max-w-[90vw] p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-primary/10 animate-in fade-in zoom-in-95 duration-200 ${lang === 'ar' ? 'right-0 sm:right-0' : 'left-0 sm:left-0'}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">info</span>
                  <h3 className="text-sm font-black text-slate-700 dark:text-white">{lang === 'ar' ? 'تفاصيل الاشتراك الحالي' : 'Current Subscription Details'}</h3>
                </div>
                <div className="space-y-3 max-h-[320px] overflow-y-auto no-scrollbar">
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 space-y-2 text-[11px]">
                      <div className="flex justify-between items-start">
                        <span className="font-black text-slate-500">{lang === 'ar' ? 'الباقة:' : 'Package:'}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 text-right">
                          {lang === 'ar' ? sub.packageNameAr || sub.packageNameEn : sub.packageNameEn || sub.packageNameAr}
                        </span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="font-black text-slate-500">{lang === 'ar' ? 'الحالة:' : 'Status:'}</span>
                        <span className={`font-bold ${sub.status === 'APPROVED' ? 'text-emerald-600' : sub.status === 'PENDING' ? 'text-amber-600' : 'text-red-600'}`}>
                          {sub.status === 'APPROVED' ? (lang === 'ar' ? 'معتمد' : 'Approved') : sub.status === 'PENDING' ? (lang === 'ar' ? 'قيد المراجعة' : 'Pending') : (lang === 'ar' ? 'مرفوض' : 'Rejected')}
                        </span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="font-black text-slate-500">{lang === 'ar' ? 'عدد الإعلانات:' : 'Ads:'}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{sub.numberOfAds}</span>
                      </div>
                      {sub.remainingAds != null && (
                        <div className="flex justify-between items-start">
                          <span className="font-black text-slate-500">{lang === 'ar' ? 'المتبقي:' : 'Remaining:'}</span>
                          <span className="font-bold text-primary tabular-nums">{sub.remainingAds}</span>
                        </div>
                      )}
                      {sub.totalPrice != null && (
                        <div className="flex justify-between items-start">
                          <span className="font-black text-slate-500">{lang === 'ar' ? 'المبلغ:' : 'Total:'}</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{sub.totalPrice} EGP</span>
                        </div>
                      )}
                      <div className="flex justify-between items-start pt-1 border-t border-slate-200 dark:border-slate-700">
                        <span className="font-black text-slate-500">{lang === 'ar' ? 'صلاحية حتى:' : 'Valid until:'}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 text-[10px]">{formatDate(sub.endDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`absolute -top-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-l border-t border-primary/10 rotate-45 ${lang === 'ar' ? 'right-6' : 'left-6'}`} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Package cards - same layout as PlanSelection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch pb-6">
        {packages.map((p, idx) => {
          const pricePerAd = Number((p as any).pricePerAd ?? (p as any).price ?? 0);
          const displayName = lang === 'ar' ? p.nameAr || p.nameEn || `${p.numberOfDays} ${lang === 'ar' ? 'أيام' : 'days'}` : p.nameEn || p.nameAr || `${p.numberOfDays} days`;
          const durationLabel = p.numberOfDays >= 365 ? (lang === 'ar' ? 'سنوي' : 'Yearly') : p.numberOfDays >= 90 ? (lang === 'ar' ? 'ربع سنوي' : 'Quarterly') : `${p.numberOfDays} ${lang === 'ar' ? 'يوم' : 'days'}`;
          const featureCount = 1; // Display duration
          const isExclusive = (p as any).exclusive ?? false;
          return (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100 dark:border-slate-800 relative group flex flex-col animate-in zoom-in-95 duration-700"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary shadow-inner border border-primary/5 shrink-0">
                    <span className="material-symbols-outlined text-[24px]">grid_view</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-700 dark:text-white text-base leading-tight truncate">{displayName}</h3>
                    <p className="text-[10px] font-black text-primary mt-0.5">{durationLabel}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {isExclusive && (
                    <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md">{lang === 'ar' ? 'حصري' : 'VIP'}</span>
                  )}
                  {p.active && (
                    <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-full">
                      {lang === 'ar' ? 'نشط' : 'Active'}
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-5 flex items-baseline gap-2 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-2xl font-black text-slate-700 dark:text-white tabular-nums">{pricePerAd}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-500 font-black">ج.م</span>
                  <span className="text-[10px] text-slate-400 font-bold">/ {lang === 'ar' ? 'إعلان' : 'per ad'}</span>
                </div>
              </div>

              <div className="space-y-3 flex-grow mb-5">
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveFeatureId(activeFeatureId === p.id ? null : p.id);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-[11px] font-black shadow-sm active:scale-95 w-full justify-between ${
                      activeFeatureId === p.id ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-800 text-slate-600 border-primary/20 hover:border-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">verified</span>
                      <span>{featureCount} {lang === 'ar' ? 'مميزات' : 'Features'}</span>
                    </div>
                    <span className={`material-symbols-outlined text-base transition-transform duration-300 ${activeFeatureId === p.id ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>
                  {activeFeatureId === p.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute bottom-full mb-3 z-[60] w-64 p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-primary/10 animate-in fade-in zoom-in-95 duration-200 ${lang === 'ar' ? 'right-0' : 'left-0'}`}
                    >
                      <div className="space-y-3 max-h-[200px] overflow-y-auto no-scrollbar">
                        <p className="text-[10px] font-black text-slate-400 pb-2 border-b border-primary/5">{lang === 'ar' ? 'المميزات' : 'Included'}</p>
                        <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                          <span className="material-symbols-outlined text-[16px] text-emerald-500 mt-0.5">check_circle</span>
                          <span className="text-[11px] font-bold leading-tight">
                            {lang === 'ar' ? `ظهور الإعلان لمدة ${p.numberOfDays} يوم` : `Ad display for ${p.numberOfDays} days`}
                          </span>
                        </div>
                      </div>
                      <div className={`absolute -bottom-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-r border-b border-primary/10 rotate-45 ${lang === 'ar' ? 'right-10' : 'left-10'}`} />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 text-[11px] font-black">
                  <span className="material-symbols-outlined text-base">loyalty</span>
                  <span>0 {lang === 'ar' ? 'خصومات متاحة' : 'Discounts'}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => p.active && openModal(p)}
                  disabled={!p.active}
                  className="w-full py-3 bg-primary dark:bg-primary text-white rounded-xl font-black text-[12px] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 group/btn hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {lang === 'ar' ? 'اختيار الخطة' : 'Choose Plan'}
                  <span className="material-symbols-outlined text-base transition-transform group-hover/btn:translate-x-1 rtl:group-hover/btn:-translate-x-1">arrow_forward</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {packages.length === 0 && (
        <EmptyState title={lang === 'ar' ? 'لا توجد باقات متاحة حالياً.' : 'No packages available.'} />
      )}

      {/* Subscription request modal - keep existing */}
      {modalOpen && selectedPackage && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-[90%] md:w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-5 duration-500">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-2xl">receipt_long</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">
                    {lang === 'ar' ? 'طلب اشتراك' : 'Subscription request'}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 mt-2">
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
                  <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'عدد الإعلانات' : 'Number of ads'}</label>
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
                <div className="p-4 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'السعر الأساسي' : 'Base Price'}</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">{basePrice} EGP</span>
                  </div>
                  {featuredPrice > 0 && (
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-primary/20">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="featured" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-4 rounded-md border-slate-300 text-primary focus:ring-primary" />
                        <label htmlFor="featured" className="text-sm font-black text-slate-700 dark:text-slate-300 cursor-pointer">{lang === 'ar' ? 'عرض أولاً' : 'Featured'}</label>
                      </div>
                      <span className="text-sm font-black text-primary">+{featuredPrice} EGP</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'الإجمالي' : 'Total'}</span>
                    <span className="text-xl font-black text-primary">{totalPrice} EGP</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'إثبات الدفع (اختياري)' : 'Payment proof (optional)'}</label>
                <div onClick={() => fileInputRef.current?.click()} className="h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer border-slate-200 hover:border-primary bg-slate-50/50 dark:bg-slate-800/50 overflow-hidden">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                  {preview ? <img src={preview} alt="Preview" className="size-full object-cover" /> : (
                    <>
                      <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">add_a_photo</span>
                      <span className="text-[9px] font-black text-slate-400">{t.common.clickToUpload}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalOpen(false); setSelectedPackage(null); }} className="flex-1 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" disabled={submitting} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">
                  {submitting ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{lang === 'ar' ? 'إرسال الطلب' : 'Submit request'}<span className="material-symbols-outlined">verified</span></>}
                </button>
              </div>
            </form>
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

export default SupplierAdPackages;
