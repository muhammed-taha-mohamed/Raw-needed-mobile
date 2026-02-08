
import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../App';
import { Plan, SpecialOffer, BillingFrequency, PlanType, PlanFeature as PlanFeatureType, ProductSearchesConfig } from '../types';
import { api } from '../api';
import { getPlanFeaturesForType, getPlanFeatureLabel } from '../constants';
import Dropdown from './Dropdown';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId?: string | null;
  onSuccess: () => void;
}

const PlanModal: React.FC<PlanModalProps> = ({ isOpen, onClose, planId, onSuccess }) => {
  const { lang, t } = useLanguage();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    // Fix: Added description to form state
    description: '',
    pricePerUser: '',
    billingFrequency: 'MONTHLY' as BillingFrequency,
    planType: 'CUSTOMER' as PlanType,
    exclusive: false,
    hasAdvertisements: false
  });

  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]);
  const [features, setFeatures] = useState<string[]>(['']);
  const [planFeaturesWithPrices, setPlanFeaturesWithPrices] = useState<{ feature: string; price: string }[]>([]);
  const [productSearchesConfig, setProductSearchesConfig] = useState<ProductSearchesConfig>({ from: undefined, to: undefined, unlimited: false, pricePerSearch: undefined });
  const [baseSubscriptionPrice, setBaseSubscriptionPrice] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (planId) fetchPlanDetails(planId);
      else {
        setFormData({ name: '', description: '', pricePerUser: '', billingFrequency: 'MONTHLY', planType: 'CUSTOMER', exclusive: false, hasAdvertisements: false });
        setSpecialOffers([]);
        setFeatures(['']);
        setPlanFeaturesWithPrices([]);
        setProductSearchesConfig({ from: undefined, to: undefined, unlimited: false, pricePerSearch: undefined });
        setBaseSubscriptionPrice('');
        setError(null);
      }
    }
  }, [isOpen, planId]);

  const fetchPlanDetails = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const allPlans = await api.get<Plan[]>('/api/v1/plans');
      const plan = allPlans.find(p => p.id === id);
      if (plan) {
        // Fix: Populate description from fetched data
        setFormData({ 
          name: plan.name, 
          description: plan.description || '', 
          pricePerUser: plan.pricePerUser.toString(), 
          billingFrequency: plan.billingFrequency, 
          planType: plan.planType || 'CUSTOMER', 
          exclusive: !!plan.exclusive,
          hasAdvertisements: !!plan.hasAdvertisements
        });
        setSpecialOffers(plan.specialOffers || []);
        const featList = plan.features || [];
        if (featList.length > 0 && typeof featList[0] === 'object' && 'feature' in featList[0] && 'price' in featList[0]) {
          setPlanFeaturesWithPrices((featList as PlanFeatureType[]).map(f => ({ feature: String(f.feature), price: String((f as PlanFeatureType).price) })));
          setFeatures([]);
        } else {
          setFeatures(Array.isArray(featList) && featList.every(f => typeof f === 'string') ? (featList as string[]) : ['']);
          setPlanFeaturesWithPrices([]);
        }
        if (plan.productSearchesConfig) {
          setProductSearchesConfig({
            from: plan.productSearchesConfig.from,
            to: plan.productSearchesConfig.to,
            unlimited: !!plan.productSearchesConfig.unlimited,
            pricePerSearch: plan.productSearchesConfig.pricePerSearch,
          });
        } else {
          setProductSearchesConfig({ from: undefined, to: undefined, unlimited: false, pricePerSearch: undefined });
        }
        setBaseSubscriptionPrice(plan.baseSubscriptionPrice != null ? String(plan.baseSubscriptionPrice) : '');
      } else setError(lang === 'ar' ? 'الخطة غير موجودة' : 'Plan not found');
    } catch (err: any) { setError(err.message); } finally { setIsLoading(false); }
  };

  const addOffer = () => setSpecialOffers([...specialOffers, { minUserCount: 0, discountPercentage: 0, description: '' }]);
  const removeOffer = (index: number) => setSpecialOffers(specialOffers.filter((_, i) => i !== index));
  const updateOffer = (index: number, field: keyof SpecialOffer, value: any) => {
    const updated = [...specialOffers];
    updated[index] = { ...updated[index], [field]: value };
    setSpecialOffers(updated);
  };

  const addFeature = () => setFeatures([...features, '']);
  const removeFeature = (index: number) => {
    if (features.length > 1) setFeatures(features.filter((_, i) => i !== index));
  };
  const updateFeature = (index: number, value: string) => {
    const updated = [...features];
    updated[index] = value;
    setFeatures(updated);
  };

  const availableFeatureKeys = useMemo(() => getPlanFeaturesForType(formData.planType), [formData.planType]);
  const addPlanFeature = () => setPlanFeaturesWithPrices([...planFeaturesWithPrices, { feature: availableFeatureKeys[0] || '', price: '' }]);
  const removePlanFeature = (index: number) => setPlanFeaturesWithPrices(planFeaturesWithPrices.filter((_, i) => i !== index));
  const updatePlanFeature = (index: number, field: 'feature' | 'price', value: string) => {
    const next = [...planFeaturesWithPrices];
    next[index] = { ...next[index], [field]: value };
    setPlanFeaturesWithPrices(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload: any = {
      name: formData.name,
      description: formData.description,
      pricePerUser: parseFloat(formData.pricePerUser) || 0,
      billingFrequency: formData.billingFrequency,
      planType: formData.planType,
      exclusive: formData.exclusive,
      hasAdvertisements: formData.hasAdvertisements,
      specialOffers: specialOffers.map(offer => ({
        ...offer,
        minUserCount: Number(offer.minUserCount),
        discountPercentage: Number(offer.discountPercentage)
      }))
    };
    if (planFeaturesWithPrices.length > 0) {
      payload.features = planFeaturesWithPrices
        .filter(p => p.feature && (p.price === '' || !Number.isNaN(Number(p.price))))
        .map(p => ({ feature: p.feature, price: Number(p.price) || 0 }));
    } else {
      payload.features = features.filter(f => f.trim() !== '');
    }
    if (formData.planType === 'CUSTOMER' && (productSearchesConfig.unlimited || productSearchesConfig.from != null || productSearchesConfig.pricePerSearch != null)) {
      payload.productSearchesConfig = {
        from: productSearchesConfig.from,
        to: productSearchesConfig.to,
        unlimited: productSearchesConfig.unlimited,
        pricePerSearch: productSearchesConfig.pricePerSearch != null ? Number(productSearchesConfig.pricePerSearch) : undefined,
      };
    }
    try {
      if (planId) await api.put(`/api/v1/plans/${planId}`, payload);
      else await api.post('/api/v1/plans', payload);
      onSuccess();
      onClose();
    } catch (err: any) { setError(err.message); } finally { setIsSubmitting(false); }
  };

  const frequencies: {id: BillingFrequency, label: string}[] = [
    { id: 'MONTHLY', label: t.plans.monthly },
    { id: 'QUARTERLY', label: t.plans.quarterly },
    { id: 'YEARLY', label: t.plans.yearly }
  ];

  const planTypes: {id: PlanType, label: string}[] = [
    { id: 'CUSTOMER', label: lang === 'ar' ? 'عميل' : 'Customer' },
    { id: 'SUPPLIER', label: lang === 'ar' ? 'مورد' : 'Supplier' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-[90%] md:w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 max-h-[90vh] flex flex-col">
        
        <div className="p-5 border-b border-primary/10 dark:border-slate-800 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{planId ? (lang === 'ar' ? 'تعديل الخطة' : 'Edit Plan') : t.plans.addNew}</h2>
          <button onClick={onClose} className="size-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors"><span className="material-symbols-outlined text-xl">close</span></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-10 w-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
              <p className="text-[10px] font-bold text-slate-400      ">Fetching Details...</p>
            </div>
          ) : (
            <form id="planForm" onSubmit={handleSubmit} className="space-y-8">
              {error && <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-center gap-3 text-xs font-bold"><span className="material-symbols-outlined">error</span>{error}</div>}

              <div className="grid gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400       px-1" htmlFor="plan_name">{lang === 'ar' ? 'اسم الخطة' : 'Plan Name'}</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">label</span>
                    <input className="w-full pl-12 pr-6 py-3.5 rounded-2xl border-2 border-primary/20 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-300 focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 font-bold transition-all text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium" id="plan_name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder={t.plans.planNamePlaceholder} required type="text" disabled={isSubmitting} />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400       px-1" htmlFor="plan_desc">{lang === 'ar' ? 'الوصف' : 'Description'}</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">description</span>
                    <input className="w-full pl-12 pr-6 py-3.5 rounded-2xl border-2 border-primary/20 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-300 focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 font-bold transition-all text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium" id="plan_desc" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder={t.plans.planDescPlaceholder} required type="text" disabled={isSubmitting} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-400 tracking-[0.2em] px-1">{lang === 'ar' ? 'نوع الخطة' : 'Plan Type'}</label>
                    <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                      {planTypes.map((pt) => (
                        <button
                          key={pt.id}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => setFormData({ ...formData, planType: pt.id })}
                          className={`py-2.5 rounded-xl text-[10px] font-bold tracking-tight transition-all duration-200 ${formData.planType === pt.id ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 dark:text-slate-300'}`}
                        >
                          {pt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-400 tracking-[0.2em] px-1">{t.plans.frequency}</label>
                    <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                      {frequencies.map((f) => (
                        <button key={f.id} type="button" disabled={isSubmitting} onClick={() => setFormData({...formData, billingFrequency: f.id})} className={`py-2.5 rounded-xl text-[10px] font-bold    tracking-tight transition-all duration-200 ${formData.billingFrequency === f.id ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{f.label}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400       px-1" htmlFor="price">{t.plans.pricePerUser} ({t.plans.currency})</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">payments</span>
                    <input className="w-full pl-12 pr-6 py-3.5 rounded-2xl border-2 border-primary/20 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-300 focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 font-bold transition-all text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium" id="price" value={formData.pricePerUser} onChange={(e) => setFormData({...formData, pricePerUser: e.target.value})} placeholder={t.plans.pricePlaceholder} required type="number" step="0.01" disabled={isSubmitting} />
                    <span className={`absolute ${lang === 'ar' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400`}>{t.plans.currency}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 mt-1 px-1">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="exclusive" className="rounded-md border-primary/30 text-primary focus:ring-primary size-4" checked={formData.exclusive} onChange={(e) => setFormData({...formData, exclusive: e.target.checked})} disabled={isSubmitting} />
                    <label htmlFor="exclusive" className="text-xs font-bold text-slate-500 cursor-pointer">{lang === 'ar' ? 'خطة حصرية (Exclusive)' : 'Exclusive Plan'}</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="hasAdsModal" className="rounded-md border-primary/30 text-primary focus:ring-primary size-4" checked={formData.hasAdvertisements} onChange={(e) => setFormData({...formData, hasAdvertisements: e.target.checked})} disabled={isSubmitting} />
                    <label htmlFor="hasAdsModal" className="text-xs font-bold text-slate-500 cursor-pointer">{lang === 'ar' ? 'يحتوي على إعلانات' : 'Has Advertisements'}</label>
                  </div>
                </div>
              </div>

              <div className="h-px bg-primary/10 dark:bg-slate-800"></div>

              {/* Plan features with prices (enum-based) */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="size-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary"><span className="material-symbols-outlined text-[20px]">task_alt</span></div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-white    tracking-tight">{lang === 'ar' ? 'مميزات الخطة (مع السعر)' : 'Plan Features (with price)'}</h3>
                  </div>
                  <button type="button" disabled={isSubmitting || availableFeatureKeys.length === 0} onClick={addPlanFeature} className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary text-slate-500 dark:text-slate-400 rounded-xl text-[9px] font-bold       transition-all border border-primary/20 shadow-sm"><span className="material-symbols-outlined text-[16px]">add_circle</span>{lang === 'ar' ? 'إضافة ميزة' : 'Add Feature'}</button>
                </div>
                {planFeaturesWithPrices.length > 0 && (
                  <div className="grid grid-cols-1 gap-3">
                    {planFeaturesWithPrices.map((pf, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <div className="flex-1 min-w-0">
                          <Dropdown options={availableFeatureKeys.map(k => ({ value: k, label: getPlanFeatureLabel(k, lang === 'ar' ? 'ar' : 'en') }))} value={pf.feature} onChange={(v) => updatePlanFeature(idx, 'feature', v)} placeholder={lang === 'ar' ? 'الميزة' : 'Feature'} showClear={false} isRtl={lang === 'ar'} disabled={isSubmitting} triggerClassName="w-full min-h-[42px] flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-primary/20 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-bold focus:border-primary outline-none text-slate-900 dark:text-white cursor-pointer text-start disabled:opacity-50 pl-4 pr-10 rtl:pl-10 rtl:pr-4" />
                        </div>
                        <input type="number" step="0.01" min="0" value={pf.price} onChange={(e) => updatePlanFeature(idx, 'price', e.target.value)} className="w-24 px-3 py-2.5 rounded-xl border border-primary/20 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-bold focus:border-primary outline-none text-slate-900 dark:text-white placeholder:text-slate-400" placeholder={t.plans.pricePlaceholder} disabled={isSubmitting} />
                        <button type="button" onClick={() => removePlanFeature(idx)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-[18px]">delete_outline</span></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Product searches config (Customer plans) */}
              {formData.planType === 'CUSTOMER' && (
                <>
                  <div className="h-px bg-primary/10 dark:bg-slate-800"></div>
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white    tracking-tight flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">search</span>
                      {lang === 'ar' ? 'إعدادات بحث المنتجات' : 'Product Searches Configuration'}
                    </h3>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="searchesUnlimited" className="rounded border-primary/30 text-primary size-4" checked={productSearchesConfig.unlimited} onChange={(e) => setProductSearchesConfig({ ...productSearchesConfig, unlimited: e.target.checked })} disabled={isSubmitting} />
                      <label htmlFor="searchesUnlimited" className="text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">{lang === 'ar' ? 'غير محدود' : 'Unlimited'}</label>
                    </div>
                    {!productSearchesConfig.unlimited && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 px-1 block mb-1">{lang === 'ar' ? 'من' : 'From'}</label>
                            <input type="number" min="0" value={productSearchesConfig.from ?? ''} onChange={(e) => setProductSearchesConfig({ ...productSearchesConfig, from: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })} placeholder={t.plans.fromPlaceholder} className="w-full px-4 py-2.5 rounded-xl border border-primary/20 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400" disabled={isSubmitting} />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 px-1 block mb-1">{lang === 'ar' ? 'إلى' : 'To'}</label>
                            <input type="number" min="0" value={productSearchesConfig.to ?? ''} onChange={(e) => setProductSearchesConfig({ ...productSearchesConfig, to: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })} placeholder={t.plans.toPlaceholder} className="w-full px-4 py-2.5 rounded-xl border border-primary/20 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400" disabled={isSubmitting} />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 px-1 block mb-1">{lang === 'ar' ? 'السعر لكل بحث' : 'Price per search'}</label>
                          <input type="number" step="0.01" min="0" value={productSearchesConfig.pricePerSearch ?? ''} onChange={(e) => setProductSearchesConfig({ ...productSearchesConfig, pricePerSearch: e.target.value === '' ? undefined : parseFloat(e.target.value) })} placeholder={t.plans.pricePerSearchPlaceholder} className="w-full px-4 py-2.5 rounded-xl border border-primary/20 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400" disabled={isSubmitting} />
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              <div className="h-px bg-primary/10 dark:bg-slate-800"></div>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="size-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary"><span className="material-symbols-outlined text-[20px]">loyalty</span></div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-white    tracking-tight">{t.plans.specialOffers}</h3>
                  </div>
                  <button type="button" disabled={isSubmitting} onClick={addOffer} className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary text-slate-500 dark:text-slate-400 rounded-xl text-[9px] font-bold       transition-all border border-primary/20 shadow-sm"><span className="material-symbols-outlined text-[16px]">add_circle</span>{t.plans.addOffer}</button>
                </div>
                <div className="space-y-4">
                  {specialOffers.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-primary/10 dark:border-slate-800 rounded-3xl"><p className="text-[10px] text-slate-300 dark:text-slate-600 font-bold      ">{t.plans.noOffers}</p></div>
                  ) : (
                    specialOffers.map((offer, idx) => (
                      <div key={idx} className="p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-primary/20 relative">
                        <button type="button" disabled={isSubmitting} onClick={() => removeOffer(idx)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-[18px]">cancel</span></button>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5"><label className="text-[9px] font-bold text-slate-400       px-1">{t.plans.minUsers}</label><input type="number" value={offer.minUserCount} onChange={(e) => updateOffer(idx, 'minUserCount', e.target.value)} placeholder={t.plans.minUsersPlaceholder} className="w-full px-4 py-2.5 rounded-xl border border-primary/20 bg-white dark:bg-slate-900 text-sm font-bold focus:ring-1 focus:ring-primary outline-none placeholder:text-slate-400" required disabled={isSubmitting} /></div>
                          <div className="space-y-1.5"><label className="text-[9px] font-bold text-slate-400       px-1">{t.plans.discount}</label><input type="number" value={offer.discountPercentage} onChange={(e) => updateOffer(idx, 'discountPercentage', e.target.value)} placeholder={t.plans.discountPlaceholder} className="w-full px-4 py-2.5 rounded-xl border border-primary/20 bg-white dark:bg-slate-900 text-sm font-bold focus:ring-1 focus:ring-primary outline-none placeholder:text-slate-400" required step="0.01" disabled={isSubmitting} /></div>
                        </div>
                        <div className="mt-3 space-y-1.5"><label className="text-[9px] font-bold text-slate-400       px-1">{t.plans.offerDesc}</label><input type="text" value={offer.description} onChange={(e) => updateOffer(idx, 'description', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-primary/20 bg-white dark:bg-slate-900 text-sm font-bold focus:ring-1 focus:ring-primary outline-none" placeholder={t.plans.offerDescPlaceholder} disabled={isSubmitting} /></div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="p-8 border-t border-primary/10 dark:border-slate-800 flex gap-4 shrink-0 bg-slate-50/50 dark:bg-slate-800/20">
          <button type="button" onClick={onClose} className="flex-1 py-3.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all       border border-primary/10" disabled={isSubmitting}>{t.categories.cancel}</button>
          <button type="submit" form="planForm" disabled={isSubmitting || isLoading} className="flex-[2] py-3.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3   text-xs disabled:opacity-50">{isSubmitting ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><span className="material-symbols-outlined text-[18px]">verified</span>{planId ? (lang === 'ar' ? 'تحديث الخطة' : 'Update Plan') : t.plans.savePlan}</>}</button>
        </div>
      </div>
    </div>
  );
};

export default PlanModal;
