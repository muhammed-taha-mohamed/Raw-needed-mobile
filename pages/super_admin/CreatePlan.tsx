
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../../App';
import { Plan, SpecialOffer, BillingFrequency, PlanType } from '../../types';
import { api } from '../../api';
import Dropdown from '../../components/Dropdown';

const CreatePlan: React.FC = () => {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
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

  useEffect(() => {
    if (id) {
      fetchPlanDetails(id);
    }
  }, [id]);

  const fetchPlanDetails = async (planId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const allPlans = await api.get<Plan[]>('/api/v1/plans');
      const plan = allPlans.find(p => p.id === planId);
      
      if (plan) {
        setFormData({
          name: plan.name,
          // Fix: Populate description from fetched data
          description: plan.description || '',
          pricePerUser: plan.pricePerUser.toString(),
          billingFrequency: plan.billingFrequency,
          planType: plan.planType || 'CUSTOMER',
          exclusive: !!plan.exclusive,
          hasAdvertisements: !!plan.hasAdvertisements
        });
        setSpecialOffers(plan.specialOffers || []);
        setFeatures(plan.features && plan.features.length > 0 ? plan.features : ['']);
      } else {
        setError(lang === 'ar' ? 'الخطة غير موجودة' : 'Plan not found');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      name: formData.name,
      // Fix: Include description in save payload
      description: formData.description,
      pricePerUser: parseFloat(formData.pricePerUser) || 0,
      billingFrequency: formData.billingFrequency,
      planType: formData.planType,
      exclusive: formData.exclusive,
      hasAdvertisements: formData.hasAdvertisements,
      features: features.filter(f => f.trim() !== ''),
      specialOffers: specialOffers.map(offer => ({
        ...offer,
        minUserCount: Number(offer.minUserCount),
        discountPercentage: Number(offer.discountPercentage)
      }))
    };

    try {
      if (id) await api.put(`/api/v1/plans/${id}`, payload);
      else await api.post('/api/v1/plans', payload);
      navigate('/plans');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const frequencies: {id: BillingFrequency, label: string}[] = [
    { id: 'MONTHLY', label: t.plans.monthly },
    { id: 'QUARTERLY', label: t.plans.quarterly },
    { id: 'YEARLY', label: t.plans.yearly }
  ];

  const planTypes: {id: PlanType, label: string}[] = [
    { id: 'CUSTOMER', label: lang === 'ar' ? 'عميل' : 'Customer' },
    { id: 'SUPPLIER', label: lang === 'ar' ? 'مورد' : 'Supplier' },
    { id: 'BOTH', label: lang === 'ar' ? 'عامة' : 'General' }
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="h-12 w-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold text-xs">Fetching Details...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-2xl mb-10 flex flex-col gap-4">
        <div>
          <button onClick={() => navigate('/plans')} className={`group flex items-center gap-2 text-slate-500 hover:text-accent transition-colors text-sm  font-bold`}>
            <span className={`material-symbols-outlined text-[20px] ${lang === 'ar' ? 'group-hover:translate-x-1' : 'group-hover:-translate-x-1'} transition-transform`}>
              {lang === 'ar' ? 'arrow_forward' : 'arrow_back'}
            </span>
            {lang === 'ar' ? 'العودة للخطط' : 'Back to Plans'}
          </button>
        </div>
        <h2 className="text-4xl font-black text-primary dark:text-white er">
          {id ? (lang === 'ar' ? 'تعديل الخطة' : 'Edit Plan') : t.plans.addNew}
        </h2>
        <p className="text-slate-500 dark:text-slate-500 font-medium">Configure tier details and specialized pricing models.</p>
      </div>

      {error && (
        <div className="w-full max-w-2xl p-4 mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-12">
        <form className="p-10 flex flex-col gap-8" onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold text-slate-500  px-1" htmlFor="plan_name">Plan Name</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-accent transition-colors">label</span>
                <input className="w-full pl-12 pr-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-300 focus:outline-none focus:border-accent focus:bg-white dark:focus:bg-slate-900 font-bold transition-all text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium" id="plan_name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder={t.plans.planNamePlaceholder} required type="text" disabled={isSubmitting} />
              </div>
            </div>

            {/* Fix: Added description field to the create/edit UI to match its display in user-facing pages */}
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold text-slate-500  px-1" htmlFor="plan_description">{t.plans.description}</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-accent transition-colors">description</span>
                <input className="w-full pl-12 pr-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-300 focus:outline-none focus:border-accent focus:bg-white dark:focus:bg-slate-900 font-bold transition-all text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium" id="plan_description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder={t.plans.planDescPlaceholder} required type="text" disabled={isSubmitting} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-slate-500  px-1">{lang === 'ar' ? 'نوع الخطة' : 'Plan Type'}</label>
                <Dropdown options={planTypes.map(pt => ({ value: pt.id, label: pt.label }))} value={formData.planType} onChange={(v) => setFormData({...formData, planType: v as PlanType})} placeholder={lang === 'ar' ? 'نوع الخطة' : 'Plan Type'} showClear={false} isRtl={lang === 'ar'} disabled={isSubmitting} triggerClassName="w-full min-h-[52px] flex items-center justify-between gap-2 pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:border-primary font-bold transition-all cursor-pointer text-start disabled:opacity-50" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-slate-500  px-1">{t.plans.frequency}</label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  {frequencies.map((f) => (
                    <button key={f.id} type="button" disabled={isSubmitting} onClick={() => setFormData({...formData, billingFrequency: f.id})} className={`py-3 rounded-xl text-[11px] font-bold  transition-all duration-200 ${formData.billingFrequency === f.id ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold text-slate-500  px-1" htmlFor="price">{t.plans.pricePerUser} ({t.plans.currency})</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-accent transition-colors">payments</span>
                <input className="w-full pl-12 pr-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-300 focus:outline-none focus:border-accent focus:bg-white dark:focus:bg-slate-900 font-bold transition-all text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium" id="price" value={formData.pricePerUser} onChange={(e) => setFormData({...formData, pricePerUser: e.target.value})} placeholder={t.plans.pricePlaceholder} required type="number" step="0.01" disabled={isSubmitting} />
                <span className={`absolute ${lang === 'ar' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-[12px] font-bold text-slate-500`}>{t.plans.currency}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 mt-1 px-1">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="exclusiveMain" className="rounded-md border-slate-200 text-primary focus:ring-primary size-4" checked={formData.exclusive} onChange={(e) => setFormData({...formData, exclusive: e.target.checked})} disabled={isSubmitting} />
                <label htmlFor="exclusiveMain" className="text-sm  font-bold text-slate-500 cursor-pointer">{lang === 'ar' ? 'خطة حصرية (Exclusive)' : 'Exclusive Plan'}</label>
              </div>
              
              <div className="flex items-center gap-2">
                <input type="checkbox" id="hasAds" className="rounded-md border-slate-200 text-primary focus:ring-primary size-4" checked={formData.hasAdvertisements} onChange={(e) => setFormData({...formData, hasAdvertisements: e.target.checked})} disabled={isSubmitting} />
                <label htmlFor="hasAds" className="text-sm  font-bold text-slate-500 cursor-pointer">{lang === 'ar' ? 'يحتوي على إعلانات' : 'Has Advertisements'}</label>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="size-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                   <span className="material-symbols-outlined text-[20px]">task_alt</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white ">{lang === 'ar' ? 'المميزات' : 'Plan Features'}</h3>
              </div>
              <button type="button" disabled={isSubmitting} onClick={addFeature} className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary text-slate-500 dark:text-slate-500 rounded-xl text-[12px] font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                {lang === 'ar' ? 'إضافة ميزة' : 'Add Feature'}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {features.map((feature, idx) => (
                <div key={idx} className="relative group/feat">
                  <input type="text" value={feature} onChange={(e) => updateFeature(idx, e.target.value)} className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium font-bold focus:border-primary outline-none transition-all" placeholder={t.plans.featureDescPlaceholder} required disabled={isSubmitting} />
                  <button type="button" onClick={() => removeFeature(idx)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors" title="Remove">
                    <span className="material-symbols-outlined text-[18px]">delete_outline</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="size-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                   <span className="material-symbols-outlined text-[20px]">loyalty</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white ">{t.plans.specialOffers}</h3>
              </div>
              <button type="button" disabled={isSubmitting} onClick={addOffer} className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-accent/10 hover:text-accent text-slate-500 dark:text-slate-500 rounded-xl text-[12px] font-bold transition-all border border-slate-200 dark:border-slate-700 hover:border-accent/30 shadow-sm">
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                {t.plans.addOffer}
              </button>
            </div>
            <div className="space-y-4">
              {specialOffers.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                   <p className="text-sm  text-slate-500 font-bold">{t.plans.noOffers}</p>
                </div>
              ) : (
                specialOffers.map((offer, idx) => (
                  <div key={idx} className="p-6 rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 space-y-4 relative group/offer">
                    <button type="button" disabled={isSubmitting} onClick={() => removeOffer(idx)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><span className="material-symbols-outlined">cancel</span></button>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-500 px-1">{t.plans.minUsers}</label>
                        <input type="number" value={offer.minUserCount} onChange={(e) => updateOffer(idx, 'minUserCount', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold focus:ring-2 focus:ring-accent outline-none" required disabled={isSubmitting} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-500 px-1">{t.plans.discount}</label>
                        <input type="number" value={offer.discountPercentage} onChange={(e) => updateOffer(idx, 'discountPercentage', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold focus:ring-2 focus:ring-accent outline-none" required step="0.01" disabled={isSubmitting} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 px-1">{t.plans.offerDesc}</label>
                      <input type="text" value={offer.description} onChange={(e) => updateOffer(idx, 'description', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium font-bold focus:ring-2 focus:ring-accent outline-none" placeholder={t.plans.offerDescPlaceholder} disabled={isSubmitting} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-4">
            <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-accent hover:bg-accent/90 text-white font-bold rounded-2xl shadow-xl shadow-accent/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3  text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><span className="material-symbols-outlined text-[20px]">verified</span>{id ? (lang === 'ar' ? 'تحديث الخطة' : 'Update Plan') : t.plans.savePlan}</>}
            </button>
            <button type="button" onClick={() => navigate('/plans')} className="w-full py-4 text-sm  font-bold text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" disabled={isSubmitting}>{t.categories.cancel}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePlan;
