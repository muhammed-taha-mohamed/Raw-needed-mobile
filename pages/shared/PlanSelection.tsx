
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '../../App';
import { useLocation } from 'react-router-dom';
import { Plan, BillingFrequency, UserSubscription, PlanType, CalculatePriceResponse, PlanFeature, PaymentInfo as PaymentInfoType, PaymentType } from '../../types';
import { api } from '../../api';
import { getPlanFeatureLabel } from '../../constants';
import { clearSubscriptionCache } from '../../utils/subscription';

type CheckoutStep = 'calculate' | 'upload' | 'success';

const PlanSelection: React.FC = () => {
  const { lang, t } = useLanguage();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentInfoType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tooltip states
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null);
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);
  const [paymentMethodsTooltipOpen, setPaymentMethodsTooltipOpen] = useState(false);
  const [copiedTransferId, setCopiedTransferId] = useState<string | null>(null);
  const [subscriptionDetailsTooltipOpen, setSubscriptionDetailsTooltipOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('calculate');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [userCount, setUserCount] = useState<number>(1);
  const [numberOfSearches, setNumberOfSearches] = useState<number>(0);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [calcResult, setCalcResult] = useState<CalculatePriceResponse | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add more searches (partial renewal)
  const [addSearchesCount, setAddSearchesCount] = useState<number>(50);
  const [addSearchesPrice, setAddSearchesPrice] = useState<number | null>(null);
  const [addSearchesPriceLoading, setAddSearchesPriceLoading] = useState(false);
  const [addSearchesFile, setAddSearchesFile] = useState<File | null>(null);
  const [addSearchesFilePreview, setAddSearchesFilePreview] = useState<string | null>(null);
  const [addSearchesSubmitting, setAddSearchesSubmitting] = useState(false);
  const [addSearchesSuccess, setAddSearchesSuccess] = useState(false);
  const [addSearchesError, setAddSearchesError] = useState<string | null>(null);
  const [addSearchesModalOpen, setAddSearchesModalOpen] = useState(false);
  const addSearchesRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialData();
    
    const handleClickOutside = () => {
      setActiveFeatureId(null);
      setActiveOfferId(null);
      setPaymentMethodsTooltipOpen(false);
      setSubscriptionDetailsTooltipOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if ((location.state as any)?.openAddSearches) {
      setAddSearchesModalOpen(true);
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.state, location.pathname]);

  const fetchAddSearchesPrice = async () => {
    if (addSearchesCount < 1) return;
    setAddSearchesPriceLoading(true);
    setAddSearchesError(null);
    try {
      const res = await api.get<any>(`/api/v1/user-subscriptions/add-searches/price?numberOfSearches=${addSearchesCount}`);
      const data = res?.content?.data ?? res?.data ?? res;
      setAddSearchesPrice(typeof data?.totalPrice === 'number' ? data.totalPrice : null);
    } catch (err: any) {
      setAddSearchesPrice(null);
      setAddSearchesError(err?.message || (lang === 'ar' ? 'فشل حساب السعر' : 'Failed to get price'));
    } finally {
      setAddSearchesPriceLoading(false);
    }
  };

  useEffect(() => {
    if (subscription && subscription.remainingSearches != null && subscription.status === 'APPROVED' && addSearchesCount >= 1) {
      fetchAddSearchesPrice();
    } else {
      setAddSearchesPrice(null);
    }
  }, [addSearchesCount, subscription?.id, subscription?.status]);

  const handleAddSearchesFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAddSearchesFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAddSearchesFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitAddSearches = async () => {
    if (addSearchesCount < 1) return;
    setAddSearchesSubmitting(true);
    setAddSearchesError(null);
    try {
      let receiptUrl = '';
      if (addSearchesFile) {
        const formData = new FormData();
        formData.append('file', addSearchesFile);
        receiptUrl = await api.post<string>('/api/v1/image/upload', formData);
      }
      await api.post('/api/v1/user-subscriptions/add-searches', {
        numberOfSearches: addSearchesCount,
        receiptFile: receiptUrl || ''
      });
      clearSubscriptionCache();
      setAddSearchesSuccess(true);
      await fetchInitialData();
      setAddSearchesFile(null);
      setAddSearchesFilePreview(null);
    } catch (err: any) {
      setAddSearchesError(err?.message || (lang === 'ar' ? 'فشل إرسال الطلب' : 'Submission failed'));
    } finally {
      setAddSearchesSubmitting(false);
    }
  };

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      const role = (userData?.role || '')  ;
      
      let planTarget: 'CUSTOMER' | 'SUPPLIER' = 'CUSTOMER';
      if (role.includes('SUPPLIER')) planTarget = 'SUPPLIER';

      const [plansData, subData, paymentData] = await Promise.allSettled([
        api.get<Plan[]>(`/api/v1/plans/type/${planTarget}`),
        api.get<UserSubscription>('/api/v1/user-subscriptions/my-subscription'),
        api.get<PaymentInfoType[]>('/api/v1/admin/payment-info').then((d) => (Array.isArray(d) ? d : [])).catch(() => [])
      ]);

      if (plansData.status === 'fulfilled') {
        setPlans(plansData.value.filter(p => p.active));
      }
      if (subData.status === 'fulfilled') {
        setSubscription(subData.value);
      }
      if (paymentData.status === 'fulfilled' && Array.isArray(paymentData.value)) {
        setPaymentMethods(paymentData.value.filter((p: PaymentInfoType) => p.active));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load portal data.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = () => {
    if (!subscription) return null;
    const status = subscription.status;
    
    const config = {
      PENDING: {
        dot: 'bg-amber-500',
        text: lang === 'ar' ? 'قيد المراجعة' : 'Pending Verification',
        textColor: 'text-amber-400'
      },
      APPROVED: {
        dot: 'bg-emerald-500',
        text: lang === 'ar' ? 'حساب مفعل' : 'Identity Verified',
        textColor: 'text-emerald-400'
      },
      REJECTED: {
        dot: 'bg-red-500',
        text: lang === 'ar' ? 'طلب مرفوض' : 'Rejected',
        textColor: 'text-red-400'
      }
    };

    const current = config[status] || config.PENDING;

    return (
      <div className="flex items-center gap-1.5 mt-0.5">
         <span className={`size-1.5 rounded-full ${current.dot} animate-pulse`}></span>
         <span className={`text-[11px] font-black ${current.textColor} `}>{current.text}</span>
      </div>
    );
  };

  const openCheckout = (plan: Plan) => {
    setSelectedPlan(plan);
    setUserCount(1);
    setNumberOfSearches(0);
    setSelectedFeatures([]);
    setCalcResult(null);
    setCheckoutStep('calculate');
    setSelectedFile(null);
    setFilePreview(null);
    setIsModalOpen(true);
    setError(null);
  };

  const planFeaturesWithPrices = useMemo(() => {
    if (!selectedPlan || !selectedPlan.features || selectedPlan.features.length === 0) return [];
    const first = selectedPlan.features[0];
    if (typeof first === 'string') return [];
    return selectedPlan.features as PlanFeature[];
  }, [selectedPlan]);

  const productSearchesConfig = selectedPlan?.planType === 'CUSTOMER' ? selectedPlan.productSearchesConfig : undefined;
  const showSearchesInput = !!productSearchesConfig && !productSearchesConfig.unlimited;
  const showFeaturesCheckboxes = planFeaturesWithPrices.length > 0;

  const toggleFeature = (featureKey: string) => {
    setSelectedFeatures(prev => prev.includes(featureKey) ? prev.filter(f => f !== featureKey) : [...prev, featureKey]);
    setCalcResult(null);
  };

  const handleCalculate = async () => {
    if (!selectedPlan || userCount < 1) return;

    setIsCalculating(true);
    setError(null);
    try {
      const body: { planId: string; numberOfUsers: number; numberOfSearches?: number; selectedFeatures?: string[] } = {
        planId: selectedPlan.id,
        numberOfUsers: userCount
      };
      if (showSearchesInput && numberOfSearches > 0) body.numberOfSearches = numberOfSearches;
      if (showFeaturesCheckboxes && selectedFeatures.length > 0) body.selectedFeatures = selectedFeatures;
      const response = await api.post<CalculatePriceResponse>('/api/v1/user-subscriptions/calculate-price', body);
      setCalcResult(response);
      
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (err: any) {
      setError(err.message || "Calculation failed.");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFinalSubmit = async () => {
    if (!selectedPlan || !calcResult) return;

    setIsSubmitting(true);
    setError(null);
    let imageUrl: string | null = null;

    try {
      if (selectedFile) {
        try {
          const formData = new FormData();
          formData.append('file', selectedFile);
          imageUrl = await api.post<string>('/api/v1/image/upload', formData);
        } catch (uploadErr) {
          imageUrl = null;
        }
      }

      const submitBody: { planId: string; numberOfUsers: number; subscriptionFile: string; numberOfSearches?: number; selectedFeatures?: string[] } = {
        planId: selectedPlan.id,
        numberOfUsers: userCount,
        subscriptionFile: imageUrl || ''
      };
      if (showSearchesInput && numberOfSearches > 0) submitBody.numberOfSearches = numberOfSearches;
      if (showFeaturesCheckboxes && selectedFeatures.length > 0) submitBody.selectedFeatures = selectedFeatures;
      await api.post('/api/v1/user-subscriptions/submit', submitBody);

      // Clear subscription cache so feature checks will be updated
      clearSubscriptionCache();
      
      setCheckoutStep('success');
    } catch (err: any) {
      setError(err.message || "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFreqLabel = (freq: BillingFrequency, lang: string) => {
    switch (freq) {
      case 'MONTHLY': return lang === 'ar' ? 'شهري' : 'Monthly';
      case 'QUARTERLY': return lang === 'ar' ? 'ربع سنوي' : 'Quarterly';
      case 'YEARLY': return lang === 'ar' ? 'سنوي' : 'Yearly';
      default: return freq;
    }
  };

  const paymentTypeLabel = (type: PaymentType) =>
    type === 'BANK_ACCOUNT' ? t.planSelection.bankAccount : t.planSelection.electronicWallet;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 mx-4 md:px-10 my-8">
        <div className="h-8 w-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold text-[12px]">Retrieving Pricing...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-6 flex flex-col gap-6 font-display animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-x-hidden min-w-0">
      
      {subscription && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-1000">
           <div className="bg-slate-900 dark:bg-slate-800 rounded-xl p-6 text-white relative overflow-hidden shadow-xl border border-white/5">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                 <span className="material-symbols-outlined text-[80px]">verified</span>
              </div>
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                 <div className="lg:col-span-4 flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
                       <span className="material-symbols-outlined text-2xl fill-1">workspace_premium</span>
                    </div>
                    <div>
                       <h2 className="text-xl font-black ">{subscription.planName || (lang === 'ar' ? 'اشتراكي الحالي' : 'My Active Plan')}</h2>
                       {getStatusBadge()}
                    </div>
                 </div>
                 
                 <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-0.5">
                       <p className=" text-[12px] font-black text-slate-300 ">{lang === 'ar' ? 'عدد التراخيص' : 'Allocated Seats'}</p>
                       <p className="text-sm font-black tabular-nums">{subscription.numberOfUsers || 0}</p>
                    </div>
                    <div className="space-y-0.5">
                       <p className=" text-[12px] font-black text-slate-300 ">{lang === 'ar' ? 'المستخدمين' : 'Used'}</p>
                       <p className="text-sm font-black tabular-nums">{subscription.usedUsers || 0}</p>
                    </div>
                    {subscription.remainingSearches != null && (
                      <div className="space-y-0.5">
                         <p className=" text-[12px] font-black text-slate-300 ">{lang === 'ar' ? 'عمليات البحث المتبقية' : 'Remaining Searches'}</p>
                         <p className="text-sm font-black tabular-nums text-primary">{subscription.remainingSearches}</p>
                      </div>
                    )}
                    {subscription.pointsEarned != null && (
                      <div className="space-y-0.5">
                         <p className=" text-[12px] font-black text-slate-300 ">{lang === 'ar' ? 'النقاط' : 'Points'}</p>
                         <p className="text-sm font-black tabular-nums">{subscription.pointsEarned}</p>
                      </div>
                    )}
                    <div className="space-y-0.5">
                       <p className=" text-[12px] font-black text-slate-300 ">{lang === 'ar' ? 'تاريخ التفعيل' : 'Activated'}</p>
                       <p className="text-[11px] font-bold tabular-nums ">{formatDate(subscription.subscriptionDate)}</p>
                    </div>
                    <div className="space-y-0.5">
                       <p className=" text-[12px] font-black text-slate-300 ">{lang === 'ar' ? 'تاريخ الانتهاء' : 'Expires'}</p>
                       <p className="text-[11px] font-bold tabular-nums  text-primary">{formatDate(subscription.expiryDate)}</p>
                    </div>
                    {subscription.remainingSearches != null && subscription.status === 'APPROVED' && (
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => setAddSearchesModalOpen(true)}
                          className="px-4 py-2.5 rounded-xl bg-primary text-white font-black text-[11px] hover:bg-primary/90 active:scale-95 flex items-center gap-1.5 shrink-0"
                        >
                          <span className="material-symbols-outlined text-base">add_circle</span>
                          {lang === 'ar' ? 'تجديد جزئي' : 'Partial renewal'}
                        </button>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}


      <div className="flex gap-2 flex-wrap">
        <div className="relative inline-block">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPaymentMethodsTooltipOpen((v) => !v);
              setActiveFeatureId(null);
              setActiveOfferId(null);
              setSubscriptionDetailsTooltipOpen(false);
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
                          <span className="material-symbols-outlined text-[18px]">
                            {copiedTransferId === pm.id ? 'check' : 'content_copy'}
                          </span>
                        </button>
                      </div>
                      {pm.accountHolderName && <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{pm.accountHolderName}</p>}
                      {pm.bankName && <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{pm.bankName}</p>}
                      {pm.walletProvider && <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{pm.walletProvider}</p>}
                      {pm.accountNumber && <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'رقم الحساب: ' : 'Account: '}{pm.accountNumber}</p>}
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

        {subscription && (
          <div className="relative inline-block">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSubscriptionDetailsTooltipOpen((v) => !v);
                setActiveFeatureId(null);
                setActiveOfferId(null);
                setPaymentMethodsTooltipOpen(false);
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
                <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between items-start">
                      <span className="font-black text-slate-500">{lang === 'ar' ? 'اسم الخطة:' : 'Plan Name:'}</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 text-right">{subscription.planName}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="font-black text-slate-500">{lang === 'ar' ? 'الحالة:' : 'Status:'}</span>
                      <span className={`font-bold ${subscription.status === 'APPROVED' ? 'text-emerald-600' : subscription.status === 'PENDING' ? 'text-amber-600' : 'text-red-600'}`}>
                        {subscription.status === 'APPROVED' ? (lang === 'ar' ? 'مفعل' : 'Approved') : 
                         subscription.status === 'PENDING' ? (lang === 'ar' ? 'قيد المراجعة' : 'Pending') : 
                         (lang === 'ar' ? 'مرفوض' : 'Rejected')}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="font-black text-slate-500">{lang === 'ar' ? 'عدد التراخيص:' : 'Allocated Seats:'}</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{subscription.numberOfUsers}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="font-black text-slate-500">{lang === 'ar' ? 'المستخدمين:' : 'Used:'}</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{subscription.usedUsers}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="font-black text-slate-500">{lang === 'ar' ? 'المتبقي:' : 'Remaining:'}</span>
                      <span className="font-bold text-primary tabular-nums">{subscription.remainingUsers}</span>
                    </div>
                    {subscription.remainingSearches != null && (
                      <div className="flex justify-between items-start">
                        <span className="font-black text-slate-500">{lang === 'ar' ? 'عمليات البحث المتبقية:' : 'Remaining Searches:'}</span>
                        <span className="font-bold text-primary tabular-nums">{subscription.remainingSearches}</span>
                      </div>
                    )}
                    {subscription.numberOfSearchesPurchased != null && (
                      <div className="flex justify-between items-start">
                        <span className="font-black text-slate-500">{lang === 'ar' ? 'إجمالي عمليات البحث:' : 'Total Searches:'}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{subscription.numberOfSearchesPurchased}</span>
                      </div>
                    )}
                    {subscription.pointsEarned != null && (
                      <div className="flex justify-between items-start">
                        <span className="font-black text-slate-500">{lang === 'ar' ? 'النقاط:' : 'Points:'}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{subscription.pointsEarned}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-start">
                      <span className="font-black text-slate-500">{lang === 'ar' ? 'المجموع:' : 'Total:'}</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{subscription.total.toLocaleString()} {t.plans.currency}</span>
                    </div>
                    {subscription.discount > 0 && (
                      <div className="flex justify-between items-start">
                        <span className="font-black text-slate-500">{lang === 'ar' ? 'الخصم:' : 'Discount:'}</span>
                        <span className="font-bold text-emerald-600 tabular-nums">-{subscription.discount.toLocaleString()} {t.plans.currency}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-start">
                      <span className="font-black text-slate-500">{lang === 'ar' ? 'السعر النهائي:' : 'Final Price:'}</span>
                      <span className="font-bold text-primary tabular-nums">{subscription.finalPrice.toLocaleString()} {t.plans.currency}</span>
                    </div>
                    {subscription.selectedFeatures && subscription.selectedFeatures.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                        <p className="font-black text-slate-500 mb-2">{lang === 'ar' ? 'المميزات المختارة:' : 'Selected Features:'}</p>
                        <div className="space-y-1">
                          {subscription.selectedFeatures.map((feat, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[14px] text-emerald-500">check_circle</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200 text-[10px]">{getPlanFeatureLabel(String(feat), lang === 'ar' ? 'ar' : 'en')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="font-black text-slate-500">{lang === 'ar' ? 'تاريخ التقديم:' : 'Submission Date:'}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 text-[10px]">{formatDate(subscription.submissionDate)}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="font-black text-slate-500">{lang === 'ar' ? 'تاريخ التفعيل:' : 'Activation Date:'}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 text-[10px]">{formatDate(subscription.subscriptionDate)}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="font-black text-slate-500">{lang === 'ar' ? 'تاريخ الانتهاء:' : 'Expiry Date:'}</span>
                        <span className="font-bold text-primary text-[10px]">{formatDate(subscription.expiryDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`absolute -top-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-l border-t border-primary/10 rotate-45 ${lang === 'ar' ? 'right-6' : 'left-6'}`} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* بوب اب شراء عمليات بحث */}
      {addSearchesModalOpen && subscription && subscription.remainingSearches != null && subscription.status === 'APPROVED' && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/50" onClick={() => setAddSearchesModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'شراء عمليات بحث إضافية' : 'Buy more searches'}</h2>
              <button type="button" onClick={() => setAddSearchesModalOpen(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-5">
              {addSearchesSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm font-bold">
                  {lang === 'ar' ? 'تم إرسال طلبك. سيتم مراجعته من الإدارة وتفعيل عمليات البحث بعد التأكد من الدفع.' : 'Request submitted. It will be reviewed by admin and searches will be added after payment verification.'}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[12px] font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'عدد عمليات البحث' : 'Number of searches'}</label>
                    <input
                      type="number"
                      min={1}
                      value={addSearchesCount}
                      onChange={(e) => setAddSearchesCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black outline-none focus:border-primary"
                    />
                    <div className="flex items-center gap-2">
                      {addSearchesPriceLoading ? (
                        <span className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'جاري الحساب...' : 'Calculating...'}</span>
                      ) : addSearchesPrice != null ? (
                        <span className="text-sm font-black text-primary">{addSearchesPrice.toLocaleString()} {t.plans.currency}</span>
                      ) : addSearchesError ? (
                        <span className="text-xs font-bold text-red-500">{addSearchesError}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[12px] font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'إيصال الدفع (صورة) — اختياري' : 'Payment receipt (image) — optional'}</label>
                    {!addSearchesFilePreview ? (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 hover:border-primary cursor-pointer">
                        <span className="material-symbols-outlined text-2xl text-slate-400 mb-1">cloud_upload</span>
                        <span className="text-[11px] font-bold text-slate-500">{lang === 'ar' ? 'اختر صورة' : 'Select image'}</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleAddSearchesFileChange} />
                      </label>
                    ) : (
                      <div className="relative">
                        <img src={addSearchesFilePreview} alt="" className="h-24 w-full object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
                        <button type="button" onClick={() => { setAddSearchesFile(null); setAddSearchesFilePreview(null); }} className="absolute top-1 right-1 size-8 rounded-full bg-red-500 text-white flex items-center justify-center">
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSubmitAddSearches}
                      disabled={addSearchesSubmitting || addSearchesPriceLoading}
                      className="px-6 py-3 rounded-xl bg-primary text-white font-black text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {addSearchesSubmitting ? (
                        <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-lg">add_circle</span>
                      )}
                      {lang === 'ar' ? 'إرسال طلب إضافة البحث' : 'Submit Add Searches Request'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 items-stretch pb-6 overflow-visible min-w-0">
        {plans.map((plan, idx) => {
          const validOffers = plan.specialOffers?.filter(o => o.discountPercentage > 0) || [];
          return (
            <div
              key={plan.id}
              className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100 dark:border-slate-800 relative group overflow-visible flex flex-col animate-in zoom-in-95 duration-700 min-w-0"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div
                className={`absolute top-0 ${lang === 'ar' ? 'right-0' : 'left-0'} w-1.5 h-full bg-primary transition-all duration-300 rounded-b ${lang === 'ar' ? 'rounded-r-[1.5rem]' : 'rounded-l-[1.5rem]'}`}
                style={{ clipPath: lang === 'ar' ? 'polygon(0 0, 100% 10%, 100% 100%, 0 100%)' : 'polygon(0 0, 100% 0, 100% 100%, 0 10%)' }}
              />

              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4 items-center min-w-0">
                  <div className="size-12 rounded-xl bg-primary/5 text-primary border border-primary/10 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[26px]">
                      {plan.billingFrequency === 'YEARLY' ? 'calendar_month' : plan.billingFrequency === 'QUARTERLY' ? 'grid_view' : 'schedule'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white text-[17px] leading-tight truncate">{plan.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-[12px] font-bold text-slate-500">{t.plans.statusActive}</span>
                      {plan.hasAdvertisements && (
                        <span className="flex items-center gap-1 ml-2 text-[9px] bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg text-emerald-600 dark:text-emerald-400 font-black border border-emerald-100 dark:border-emerald-900/30">
                          <span className="material-symbols-outlined text-[12px]">ads_click</span>
                          {lang === 'ar' ? 'إعلانات' : 'ADS'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {plan.exclusive && (
                    <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-lg shadow-sm">
                      {lang === 'ar' ? 'حصري' : 'Exclusive'}
                    </span>
                  )}
                  {plan.isPopular && (
                    <span className="bg-primary/10 text-primary text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap border border-primary/20">
                      {t.plans.popular}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-6 flex-grow">
                <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-500 font-bold text-sm">{t.plans.pricePerUser}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-black text-slate-900 dark:text-white text-xl tabular-nums">{plan.pricePerUser}</span>
                    <span className="text-[12px] text-slate-500 font-bold">{t.plans.currency}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-500 font-bold text-sm">{t.plans.frequency}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-[13px]">{getFreqLabel(plan.billingFrequency, lang)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-4">
                  <div className="relative">
                    {(() => {
                      const featureCount = (plan.features?.length || 0) + (plan.planType === 'CUSTOMER' && plan.productSearchesConfig ? 1 : 0);
                      return (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFeatureId(activeFeatureId === plan.id ? null : plan.id);
                        setActiveOfferId(null);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-[11px] font-black shadow-sm active:scale-95 w-full justify-between ${activeFeatureId === plan.id ? 'bg-primary text-white border-primary' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-primary/10 hover:border-primary'}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{featureCount} {lang === 'ar' ? 'مزايا' : 'Feats'}</span>
                      </div>
                      <span className={`material-symbols-outlined text-base shrink-0 transition-transform duration-300 ${activeFeatureId === plan.id ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                    ); })()}
                    {activeFeatureId === plan.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute bottom-full mb-3 z-[80] w-[min(18rem,calc(100vw-2rem))] sm:w-64 p-5 bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-2xl border border-primary/10 animate-in fade-in zoom-in-95 duration-200 ${lang === 'ar' ? 'right-0' : 'left-0'}`}
                      >
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 pb-2 border-b border-primary/5">{lang === 'ar' ? 'مميزات الباقة' : 'Features'}</p>
                          <div className="space-y-2.5 max-h-[200px] overflow-y-auto no-scrollbar">
                            {plan.features && plan.features.length > 0 ? (
                              plan.features.map((feat, fidx) => {
                                const label = typeof feat === 'string' ? feat : getPlanFeatureLabel(String((feat as PlanFeature).feature), lang === 'ar' ? 'ar' : 'en');
                                const price = typeof feat === 'object' && feat && 'price' in feat ? (feat as PlanFeature).price : null;
                                return (
                                  <div key={fidx} className="flex items-start justify-between gap-3 text-slate-700 dark:text-slate-300">
                                    <div className="flex items-start gap-3">
                                      <span className="material-symbols-outlined text-[18px] text-emerald-500 fill-1">check_circle</span>
                                      <span className="text-[11px] font-bold leading-tight">{label}{price != null ? ` (+${price} ${t.plans.currency})` : ''}</span>
                                    </div>
                                  </div>
                                );
                              })
                            ) : null}
                            {plan.planType === 'CUSTOMER' && plan.productSearchesConfig && (
                              <div className="pt-2 mt-2 border-t border-primary/10">
                                {plan.productSearchesConfig.unlimited ? (
                                  <p className="text-[11px] font-bold text-primary">{lang === 'ar' ? 'غير محدود' : 'Unlimited'}</p>
                                ) : (
                                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap overflow-x-auto no-scrollbar">
                                    {lang === 'ar'
                                      ? `من ${plan.productSearchesConfig.from ?? 0} إلى ${plan.productSearchesConfig.to ?? '—'} عملية بحث${plan.productSearchesConfig.pricePerSearch != null ? ` : ${plan.productSearchesConfig.pricePerSearch} ${t.plans.currency} للعمليه` : ''}`
                                      : `${plan.productSearchesConfig.from ?? 0} to ${plan.productSearchesConfig.to ?? '—'} searches${plan.productSearchesConfig.pricePerSearch != null ? ` : ${plan.productSearchesConfig.pricePerSearch} ${t.plans.currency} per search` : ''}`}
                                  </p>
                                )}
                              </div>
                            )}
                            {(!plan.features || plan.features.length === 0) && !(plan.planType === 'CUSTOMER' && plan.productSearchesConfig) && (
                              <p className="text-[10px] text-slate-400 italic">No features</p>
                            )}
                          </div>
                        </div>
                        <div className={`absolute -bottom-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-r border-b border-primary/10 rotate-45 ${lang === 'ar' ? 'right-6' : 'left-6'}`} />
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveOfferId(activeOfferId === plan.id ? null : plan.id);
                        setActiveFeatureId(null);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-[11px] font-black shadow-sm active:scale-95 w-full justify-between ${activeOfferId === plan.id ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50/50 dark:bg-amber-900/10 text-amber-600 border-amber-500/20 hover:border-amber-500'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{validOffers.length} {lang === 'ar' ? 'خصم' : 'Offers'}</span>
                      </div>
                      <span className={`material-symbols-outlined text-base transition-transform duration-300 ${activeOfferId === plan.id ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                    {activeOfferId === plan.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute bottom-full mb-3 z-[80] w-[min(18rem,calc(100vw-2rem))] sm:w-64 p-5 bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-2xl border border-amber-500/10 animate-in fade-in zoom-in-95 duration-200 ${lang === 'ar' ? 'right-0' : 'left-0'}`}
                      >
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-amber-500 pb-2 border-b border-amber-500/5">{lang === 'ar' ? 'العروض الخاصة' : 'Special Offers'}</p>
                          <div className="space-y-2.5 max-h-[200px] overflow-y-auto no-scrollbar">
                            {validOffers.length > 0 ? (
                              validOffers.map((offer, oidx) => (
                                <div key={oidx} className="p-3 rounded-xl bg-gradient-to-r from-orange-50 to-emerald-50 dark:from-orange-950/10 dark:to-emerald-950/10 border border-orange-100 dark:border-orange-900/20">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-black text-orange-600">{lang === 'ar' ? 'أقل عدد مستخدمين:' : 'Seats:'} {offer.minUserCount}+</span>
                                    <span className="text-[10px] font-black text-emerald-600">%{offer.discountPercentage} OFF</span>
                                  </div>
                                  <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 leading-tight">{offer.description}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-[10px] text-slate-400 italic">No valid offers</p>
                            )}
                          </div>
                        </div>
                        <div className={`absolute -bottom-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-r border-b border-amber-500/10 rotate-45 ${lang === 'ar' ? 'right-6' : 'left-6'}`} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 mt-auto flex flex-col gap-3">
                <button
                  onClick={() => openCheckout(plan)}
                  className="w-full py-3 bg-primary text-white rounded-xl font-black text-[12px] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 group/btn hover:bg-primary/90"
                >
                  {lang === 'ar' ? 'اختيار الخطة' : 'Select'}
                  <span className="material-symbols-outlined text-base transition-transform group-hover/btn:translate-x-1 rtl:group-hover/btn:-translate-x-1">arrow_forward</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-[90%] md:w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-white/10 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
               <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                     <span className="material-symbols-outlined text-xl">
                        {checkoutStep === 'calculate' ? 'receipt_long' : checkoutStep === 'upload' ? 'upload_file' : 'verified_user'}
                     </span>
                  </div>
                  <div>
                     <h3 className="text-base font-black text-slate-700 dark:text-white  leading-none">
                        {checkoutStep === 'calculate' ? (lang === 'ar' ? 'حساب التكلفة' : 'Cost Breakdown') : 
                         checkoutStep === 'upload' ? (lang === 'ar' ? 'رفع الإيصال' : 'Payment Verification') :
                         (lang === 'ar' ? 'اكتمل الطلب' : 'Request Finalized')}
                     </h3>
                     <p className="text-[11px] font-black text-slate-500 mt-1.5">{selectedPlan.name} • {getFreqLabel(selectedPlan.billingFrequency, lang)}</p>
                  </div>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="size-8 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-500 transition-all flex items-center justify-center border border-slate-100 dark:border-slate-800">
                 <span className="material-symbols-outlined text-lg">close</span>
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
               {error && (
                  <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-center gap-2.5 text-[12px] font-black animate-in shake duration-500">
                    <span className="material-symbols-outlined text-base">error</span>
                    {error}
                  </div>
               )}

               {checkoutStep === 'calculate' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                   <div className="space-y-4">
                      <div className="flex justify-between items-end px-1">
                        <label className=" text-[12px] font-black text-slate-500 ">{lang === 'ar' ? 'عدد المستخدمين' : 'Requested Seats'}</label>
                        <div className="text-2xl font-black text-primary tabular-nums er">{userCount}</div>
                      </div>
                      
                      <div className="p-4 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-4 shadow-inner">
                        <input 
                          type="range"
                          min="1"
                          max="1000"
                          value={userCount}
                          onChange={(e) => {
                            setUserCount(parseInt(e.target.value));
                            if (calcResult) setCalcResult(null);
                          }}
                          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-primary"
                        />
                        <div className="relative group">
                          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors text-xl">groups</span>
                          <input 
                            type="number"
                            min="1"
                            value={userCount}
                            onChange={(e) => {
                              setUserCount(Math.max(1, parseInt(e.target.value) || 1));
                              if (calcResult) setCalcResult(null);
                            }}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-white font-black focus:border-primary outline-none transition-all shadow-inner text-sm"
                          />
                        </div>
                      </div>

                      {showSearchesInput && (
                        <div className="space-y-2">
                          <label className="text-[12px] font-black text-slate-500 px-1">{lang === 'ar' ? 'عدد عمليات البحث' : 'Number of searches'}</label>
                          <input 
                            type="number"
                            min="0"
                            value={numberOfSearches}
                            onChange={(e) => {
                              setNumberOfSearches(Math.max(0, parseInt(e.target.value) || 0));
                              if (calcResult) setCalcResult(null);
                            }}
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-white font-black outline-none text-sm"
                          />
                          {!productSearchesConfig?.unlimited && productSearchesConfig?.pricePerSearch != null && (
                            <p className="text-[11px] font-bold text-slate-500">{lang === 'ar' ? `${productSearchesConfig.pricePerSearch} ${t.plans.currency} / عملية` : `${productSearchesConfig.pricePerSearch} ${t.plans.currency} / search`}</p>
                          )}
                        </div>
                      )}

                      {showFeaturesCheckboxes && (
                        <div className="space-y-2">
                          <label className="text-[12px] font-black text-slate-500 px-1">{lang === 'ar' ? 'المميزات الإضافية' : 'Optional features'}</label>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {planFeaturesWithPrices.map((pf) => (
                              <label key={String(pf.feature)} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-primary/30">
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedFeatures.includes(String(pf.feature))} 
                                    onChange={() => toggleFeature(String(pf.feature))} 
                                    className="rounded border-primary/30 text-primary size-4"
                                  />
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{getPlanFeatureLabel(String(pf.feature), lang === 'ar' ? 'ar' : 'en')}</span>
                                </div>
                                <span className="text-[11px] font-black text-primary tabular-nums">+{(pf as PlanFeature).price} {t.plans.currency}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <button 
                        onClick={handleCalculate}
                        disabled={isCalculating}
                        className="w-full py-4 bg-slate-900 dark:bg-primary text-white rounded-xl font-black text-[12px] shadow-lg hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                      >
                        {isCalculating ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (
                          <>
                            <span className="material-symbols-outlined text-lg">calculate</span>
                            {lang === 'ar' ? 'حساب التكلفة' : 'Generate Estimate'}
                          </>
                        )}
                      </button>
                   </div>

                   <div ref={resultRef}>
                    {calcResult && (
                      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500 pb-2">
                          <div className="grid grid-cols-2 gap-3">
                            {(calcResult.basePrice != null || calcResult.searchesPrice != null || calcResult.featuresPrice != null) ? (
                              <>
                                {calcResult.basePrice != null && (
                                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[12px] font-black text-slate-500 mb-1">{lang === 'ar' ? 'السعر الأساسي' : 'Base price'}</p>
                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 tabular-nums">{calcResult.basePrice.toLocaleString()} <span className="text-[11px] opacity-60">{t.plans.currency}</span></p>
                                  </div>
                                )}
                                {calcResult.searchesPrice != null && calcResult.searchesPrice > 0 && (
                                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[12px] font-black text-slate-500 mb-1">{lang === 'ar' ? 'عمليات البحث' : 'Searches'}</p>
                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 tabular-nums">{calcResult.searchesPrice.toLocaleString()} <span className="text-[11px] opacity-60">{t.plans.currency}</span></p>
                                  </div>
                                )}
                                {calcResult.featuresPrice != null && calcResult.featuresPrice > 0 && (
                                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[12px] font-black text-slate-500 mb-1">{lang === 'ar' ? 'المميزات' : 'Features'}</p>
                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 tabular-nums">{calcResult.featuresPrice.toLocaleString()} <span className="text-[11px] opacity-60">{t.plans.currency}</span></p>
                                  </div>
                                )}
                              </>
                            ) : null}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                <p className="text-[12px] font-black text-slate-500 mb-1">{lang === 'ar' ? 'المجموع قبل الخصم' : 'Subtotal'}</p>
                                <p className="text-sm font-black text-slate-700 dark:text-slate-200 tabular-nums">{calcResult.total.toLocaleString()} <span className="text-[11px] opacity-60 ml-0.5">{t.plans.currency}</span></p>
                            </div>
                            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                <p className="text-[12px] font-black text-emerald-600 dark:text-emerald-400 mb-1">{lang === 'ar' ? 'الخصم المطبق' : 'Net Savings'}</p>
                                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">-{calcResult.discount.toLocaleString()} <span className="text-[11px] opacity-60 ml-0.5">{t.plans.currency}</span></p>
                            </div>
                          </div>

                          <div className="p-6 rounded-[1.5rem] bg-slate-900 text-white relative overflow-hidden shadow-xl text-center border border-white/5">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50"></div>
                            <div className="relative z-10 flex flex-col items-center">
                                <span className="text-[11px] font-black text-primary mb-1.5">{lang === 'ar' ? 'المجموع النهائي للتفعيل' : 'Final Activation Total'}</span>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-3xl font-black tabular-nums er">{calcResult.finalPrice.toLocaleString()}</span>
                                  <span className="text-[12px] font-bold text-slate-500">{t.plans.currency}</span>
                                </div>
                            </div>
                          </div>
                      </div>
                    )}
                   </div>
                 </div>
               )}

               {checkoutStep === 'upload' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                     <div className="text-center">
                        <p className="text-[12px] text-slate-500 dark:text-slate-500 font-bold leading-relaxed">
                           {lang === 'ar' ? 'يرجى رفع صورة إيصال الدفع لإتمام عملية التفعيل.' : 'Upload your payment receipt to complete activation.'}
                        </p>
                     </div>

                     <div className="flex flex-col gap-3">
                        <label className=" text-[12px] font-black text-slate-500 px-1">{lang === 'ar' ? 'وثيقة الدفع (صورة)' : 'Payment Evidence'}</label>
                        {!filePreview ? (
                           <label className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[1.5rem] bg-slate-50/50 dark:bg-slate-800/30 hover:bg-primary/5 hover:border-primary transition-all cursor-pointer group shadow-inner">
                              <span className="material-symbols-outlined text-3xl text-slate-300 group-hover:text-primary transition-colors mb-3">cloud_upload</span>
                              <p className=" text-[12px] font-black  text-slate-500 group-hover:text-primary">{lang === 'ar' ? 'اضغط لاختيار صورة' : 'Click to select image'}</p>
                              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                           </label>
                        ) : (
                           <div className="relative rounded-[1.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">
                              <img src={filePreview} alt="Receipt Preview" className="w-full h-48 object-cover" />
                              <button 
                                 onClick={() => {setSelectedFile(null); setFilePreview(null);}}
                                 className="absolute top-3 right-3 size-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                              >
                                 <span className="material-symbols-outlined text-base">close</span>
                              </button>
                           </div>
                        )}
                     </div>
                  </div>
               )}

               {checkoutStep === 'success' && (
                  <div className="py-8 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-700">
                     <div className="size-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-500 mb-6 shadow-inner ring-4 ring-emerald-50 dark:ring-emerald-950/10">
                        <span className="material-symbols-outlined text-3xl">verified</span>
                     </div>
                     <h3 className="text-xl font-black text-slate-700 dark:text-white  mb-2.5">
                        {lang === 'ar' ? 'تم تقديم طلبك' : 'Request Received'}
                     </h3>
                     <p className="text-slate-500 dark:text-slate-500 text-sm font-bold leading-relaxed max-w-[200px]">
                        {lang === 'ar' ? 'فريقنا يراجع طلبك الآن، وسيتم التفعيل قريباً.' : 'We are reviewing your submission. Console access is arriving soon.'}
                     </p>
                  </div>
               )}
            </div>

            <div className="p-6 border-t border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
               {checkoutStep === 'calculate' && (
                  <button 
                    disabled={!calcResult || isCalculating}
                    onClick={() => setCheckoutStep('upload')}
                    className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-[12px]  shadow-lg shadow-primary/30 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-3 group"
                  >
                     {lang === 'ar' ? 'المتابعة للرفع' : 'Continue to Upload'}
                     <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">arrow_forward</span>
                  </button>
               )}

               {checkoutStep === 'upload' && (
                  <div className="flex gap-3">
                     <button 
                       disabled={isSubmitting}
                       onClick={() => setCheckoutStep('calculate')}
                       className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-black text-[12px] transition-all hover:bg-slate-200"
                     >
                        {lang === 'ar' ? 'رجوع' : 'Back'}
                     </button>
                     <button 
                       disabled={isSubmitting}
                       onClick={handleFinalSubmit}
                       className="flex-[2] py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-[12px]  shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-3"
                     >
                        {isSubmitting ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (
                           <>
                              {lang === 'ar' ? 'تأكيد الإرسال' : 'Finalize Submission'}
                              <span className="material-symbols-outlined text-lg">send</span>
                           </>
                        )}
                     </button>
                  </div>
               )}

               {checkoutStep === 'success' && (
                  <button 
                    onClick={() => { setIsModalOpen(false); fetchInitialData(); }}
                    className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-xl font-black text-[12px]  transition-all shadow-xl active:scale-95"
                  >
                     {lang === 'ar' ? 'العودة للوحة التحكم' : 'Return to Hub'}
                  </button>
               )}
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default PlanSelection;
