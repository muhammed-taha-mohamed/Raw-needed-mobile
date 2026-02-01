
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '../../App';
import { Plan, BillingFrequency, UserSubscription, PlanType, CalculatePriceResponse, PlanFeature, PaymentInfo as PaymentInfoType, PaymentType } from '../../types';
import { api } from '../../api';
import { getPlanFeatureLabel } from '../../constants';

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

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialData();
    
    const handleClickOutside = () => {
      setActiveFeatureId(null);
      setActiveOfferId(null);
      setPaymentMethodsTooltipOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

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
      <div className="flex flex-col items-center justify-center py-24 bg-white/40 dark:bg-slate-900/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 mx-4 md:px-10 my-8">
        <div className="h-8 w-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold text-[12px]">Retrieving Pricing...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-6 flex flex-col gap-6 font-display animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {subscription && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-1000">
           <div className="bg-slate-900 dark:bg-slate-800 rounded-[2rem] p-6 text-white relative overflow-hidden shadow-xl border border-white/5">
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
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
         <h1 className="text-2xl font-black text-primary dark:text-white  leading-none">
            {t.planSelection.pageTitle}
          </h1>
          <p className="text-slate-500 dark:text-slate-500 font-medium text-sm max-w-2xl">
            {t.planSelection.pageSubtitle}
          </p>
        </div>
      </div>

      <div className="relative inline-block">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPaymentMethodsTooltipOpen((v) => !v);
              setActiveFeatureId(null);
              setActiveOfferId(null);
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch pb-6">
        {plans.map((plan, idx) => {
          const validOffers = plan.specialOffers?.filter(o => o.discountPercentage > 0) || [];
          return (
            <div 
              key={plan.id}
              className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100 dark:border-slate-800 relative group flex flex-col animate-in zoom-in-95 duration-700"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary shadow-inner border border-primary/5 shrink-0">
                    <span className="material-symbols-outlined text-[24px]">
                      {plan.billingFrequency === 'YEARLY' ? 'calendar_month' : plan.billingFrequency === 'QUARTERLY' ? 'grid_view' : 'schedule'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-700 dark:text-white text-base leading-tight  truncate">{plan.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] font-black text-primary ">{getFreqLabel(plan.billingFrequency, lang)}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border ${plan.hasAdvertisements ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                         {plan.hasAdvertisements ? (lang === 'ar' ? 'بإعلانات' : 'Ads') : (lang === 'ar' ? 'بدون إعلانات' : 'No Ads')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {plan.isPopular && (
                    <span className="bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md ">
                      {t.plans.popular}
                    </span>
                  )}
                  {plan.exclusive && (
                    <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md">
                      {lang === 'ar' ? 'حصري' : 'VIP'}
                    </span>
                  )}
                </div>
              </div>

              {plan.planType === 'CUSTOMER' && plan.productSearchesConfig ? (
                <div className="mb-5 space-y-2 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <span className="material-symbols-outlined text-primary text-[20px]">search</span>
                    <span className="text-[11px] font-black">{lang === 'ar' ? 'إعدادات بحث المنتجات' : 'Product searches'}</span>
                  </div>
                  {plan.productSearchesConfig.unlimited ? (
                    <p className="text-sm font-black text-primary">{lang === 'ar' ? 'غير محدود' : 'Unlimited'}</p>
                  ) : (
                    <>
                      {(plan.productSearchesConfig.from != null || plan.productSearchesConfig.to != null) && (
                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          {lang === 'ar' ? 'من' : 'From'} {plan.productSearchesConfig.from ?? '—'} {lang === 'ar' ? 'إلى' : 'to'} {plan.productSearchesConfig.to ?? '—'}
                        </p>
                      )}
                      {!plan.productSearchesConfig.unlimited && plan.productSearchesConfig.pricePerSearch != null && (
                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          {lang === 'ar' ? 'السعر لكل بحث:' : 'Price per search:'} {plan.productSearchesConfig.pricePerSearch} {t.plans.currency}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ) : plan.planType !== 'CUSTOMER' ? (
                <div className="mb-5 flex items-baseline gap-2 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-2xl font-black text-slate-700 dark:text-white tabular-nums er">{plan.pricePerUser}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-500 font-black ">{t.plans.currency}</span>
                    <span className="text-[10px] text-slate-400 font-bold">/ {lang === 'ar' ? 'لكل مستخدم' : 'Per User'}</span>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3 flex-grow mb-5">
                <div className="relative">
                  <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFeatureId(activeFeatureId === plan.id ? null : plan.id);
                        setActiveOfferId(null);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-[11px] font-black  shadow-sm active:scale-95 w-full justify-between ${
                        activeFeatureId === plan.id 
                        ? 'bg-primary text-white border-primary' 
                        : 'bg-white dark:bg-slate-800 text-slate-600 border-primary/20 hover:border-primary'
                      }`}
                  >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">verified</span>
                        <span>{plan.features?.length || 0} {lang === 'ar' ? 'مميزات' : 'Features'}</span>
                      </div>
                      <span className={`material-symbols-outlined text-base transition-transform duration-300 ${activeFeatureId === plan.id ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>

                  {activeFeatureId === plan.id && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute bottom-full mb-3 z-[60] w-64 p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-primary/10 animate-in fade-in zoom-in-95 duration-200 ${lang === 'ar' ? 'right-0' : 'left-0'}`}
                    >
                      <div className="space-y-3 max-h-[200px] overflow-y-auto no-scrollbar">
                        <p className="text-[10px] font-black text-slate-400 pb-2 border-b border-primary/5 ">
                          {lang === 'ar' ? 'المميزات' : 'Included'}
                        </p>
                        
                        {/* Ad Info Integration */}
                        <div className={`flex items-start gap-2 font-black ${plan.hasAdvertisements ? 'text-emerald-600' : 'text-orange-600'}`}>
                          <span className="material-symbols-outlined text-[16px] mt-0.5">{plan.hasAdvertisements ? 'ads_click' : 'block'}</span>
                          <span className="text-[11px]  leading-tight">
                            {plan.hasAdvertisements 
                              ? (lang === 'ar' ? 'تتضمن إعلانات' : 'Includes Ads') 
                              : (lang === 'ar' ? 'بدون إعلانات' : 'Ad-Free experience')}
                          </span>
                        </div>

                        {plan.features && plan.features.length > 0 ? (
                          plan.features.map((feat, fidx) => {
                            const label = typeof feat === 'string' ? feat : getPlanFeatureLabel(String((feat as PlanFeature).feature), lang === 'ar' ? 'ar' : 'en');
                            const price = typeof feat === 'object' && feat && 'price' in feat ? (feat as PlanFeature).price : null;
                            return (
                              <div key={fidx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                                <span className="material-symbols-outlined text-[16px] text-emerald-500 mt-0.5">check_circle</span>
                                <span className="text-[11px] font-bold leading-tight">{label}{price != null ? ` (+${price} ${t.plans.currency})` : ''}</span>
                              </div>
                            );
                          })
                        ) : null}
                      </div>
                      <div className={`absolute -bottom-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-r border-b border-primary/10 rotate-45 ${lang === 'ar' ? 'right-10' : 'left-10'}`}></div>
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
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-[11px] font-black shadow-sm active:scale-95 w-full justify-between ${
                        activeOfferId === plan.id 
                        ? 'bg-amber-500 text-white border-amber-500' 
                        : 'bg-amber-50 dark:bg-amber-900/10 text-amber-600 border-amber-500/20 hover:border-amber-500'
                      }`}
                  >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">loyalty</span>
                        <span>{validOffers.length} {lang === 'ar' ? 'خصومات متاحة' : 'Discounts'}</span>
                      </div>
                      <span className={`material-symbols-outlined text-base transition-transform duration-300 ${activeOfferId === plan.id ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>

                  {activeOfferId === plan.id && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute bottom-full mb-3 z-[60] w-64 p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-amber-500/20 animate-in fade-in zoom-in-95 duration-200 ${lang === 'ar' ? 'right-0' : 'left-0'}`}
                    >
                      <div className="space-y-3 max-h-[200px] overflow-y-auto no-scrollbar">
                        <p className="text-[10px] font-black text-amber-500 pb-2 border-b border-amber-500/10 ">
                          {lang === 'ar' ? 'العروض والخصومات' : 'Exclusive Offers'}
                        </p>
                        {validOffers.length > 0 ? (
                          validOffers.map((offer, oidx) => (
                            <div key={oidx} className="p-3 rounded-xl bg-gradient-to-r from-orange-50 to-emerald-50 dark:from-orange-950/10 dark:to-emerald-950/10 border border-orange-100 dark:border-orange-900/20">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black text-orange-600 ">
                                  {lang === 'ar' ? 'أقل عدد مستخدمين:' : 'Min Seats:'} {offer.minUserCount}
                                </span>
                                <span className="text-xs font-black text-emerald-600">%{offer.discountPercentage} OFF</span>
                              </div>
                              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-tight">{offer.description}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">No current volume discounts.</p>
                        )}
                      </div>
                      <div className={`absolute -bottom-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-r border-b border-amber-500/20 rotate-45 ${lang === 'ar' ? 'right-10' : 'left-10'}`}></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="material-symbols-outlined text-primary text-[18px]">schedule</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400">{t.planSelection.receiptUploadTime}</p>
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{t.planSelection.receiptUploadTimeValue}</p>
                  <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-1 leading-tight">{t.planSelection.receiptUploadReminder}</p>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => openCheckout(plan)}
                  className="w-full py-3 bg-primary dark:bg-primary text-white rounded-xl font-black text-[12px] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 group/btn hover:bg-slate-900 "
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pb-24 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-white/10 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh]">
            
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
                            <p className="text-[11px] font-bold text-slate-500">{lang === 'ar' ? 'السعر لكل بحث:' : 'Price per search:'} {productSearchesConfig.pricePerSearch} {t.plans.currency}</p>
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
