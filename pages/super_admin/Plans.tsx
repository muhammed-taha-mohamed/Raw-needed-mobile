import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { Plan, BillingFrequency, PlanType, PlanFeature } from '../../types';
import { api } from '../../api';
import PlanModal from '../../components/PlanModal';
import Approvals from './Approvals';
import { getPlanFeatureLabel } from '../../constants';

interface ApprovedSubscription {
  id: string;
  userId: string;
  planId: string;
  planName: string | null;
  userName?: string;
  numberOfUsers: number;
  usedUsers?: number;
  remainingUsers?: number;
  total: number;
  finalPrice: number;
  status: string;
  submissionDate?: string;
  subscriptionDate?: string;
  expiryDate?: string;
}

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

const Plans: React.FC = () => {
  const { lang, t } = useLanguage();
  const [viewType, setViewType] = useState<'grid' | 'table'>('grid');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [isStatusChanging, setIsStatusChanging] = useState<string | null>(null);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeTab, setActiveTab] = useState<'plans' | 'approvals' | 'subscriptions'>('plans');
  const [approvedSubscriptions, setApprovedSubscriptions] = useState<ApprovedSubscription[]>([]);
  const [loadingApproved, setLoadingApproved] = useState(false);
  const [approvedPage, setApprovedPage] = useState(0);
  const [approvedTotalPages, setApprovedTotalPages] = useState(0);
  const approvedPageSize = 15;

  // Tooltip states for features and offers
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null);
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
    
    const handleClickOutside = () => {
      setActiveFeatureId(null);
      setActiveOfferId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      fetchApprovedSubscriptions(approvedPage);
    }
  }, [activeTab, approvedPage]);

  const fetchApprovedSubscriptions = async (page: number) => {
    setLoadingApproved(true);
    try {
      const response = await api.get<PaginatedResponse<ApprovedSubscription>>(
        `/api/v1/admin/user-subscriptions/approved?page=${page}&size=${approvedPageSize}`
      );
      setApprovedSubscriptions(response.content || []);
      setApprovedTotalPages(response.totalPages || 0);
    } catch (err: any) {
      setApprovedSubscriptions([]);
    } finally {
      setLoadingApproved(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const fetchPlans = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<Plan[]>('/api/v1/plans');
      setPlans(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getFreqLabel = (freq: BillingFrequency) => {
    switch (freq) {
      case 'MONTHLY': return t.plans.monthly;
      case 'QUARTERLY': return t.plans.quarterly;
      case 'YEARLY': return t.plans.yearly;
      default: return freq;
    }
  };

  const getPlanTypeConfig = (type: PlanType | null | undefined) => {
    if (!type || type === 'BOTH') {
      return {
        label: lang === 'ar' ? 'عامة' : 'General',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
      };
    }
    switch (type) {
      case 'CUSTOMER':
        return {
          label: lang === 'ar' ? 'عملاء' : 'Customers',
          classes: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800'
        };
      case 'SUPPLIER':
        return {
          label: lang === 'ar' ? 'موردين' : 'Suppliers',
          classes: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800'
        };
      default:
        return {
          label: type,
          classes: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
        };
    }
  };

  const togglePlanStatus = async (plan: Plan) => {
    const isCurrentlyActive = plan.active;
    const action = isCurrentlyActive ? 'deactivate' : 'activate';
    
    setIsStatusChanging(plan.id);
    try {
      await api.put(`/api/v1/plans/${plan.id}/${action}`, {});
      setPlans(prev => prev.map(p => 
        p.id === plan.id ? { ...p, active: !isCurrentlyActive } : p
      ));
    } catch (err: any) {
      alert(err.message || `Failed to ${action} plan`);
    } finally {
      setIsStatusChanging(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/v1/plans/${deleteConfirmId}`);
      setPlans(prev => prev.filter(p => p.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete plan');
    } finally {
      setIsDeleting(false);
    }
  };

  const openAddModal = () => {
    setEditingPlanId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (id: string) => {
    setEditingPlanId(id);
    setIsModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-6 flex flex-col gap-8 font-display animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Tabs - full width of container */}
      <div className="flex gap-1 p-1 mb-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 w-full min-w-0">
        <button
          onClick={() => setActiveTab('plans')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-black transition-all ${activeTab === 'plans' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
        >
          {lang === 'ar' ? 'الخطط' : 'Plans'}
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-black transition-all ${activeTab === 'approvals' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
        >
          {lang === 'ar' ? 'الموافقات' : 'Approvals'}
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-black transition-all ${activeTab === 'subscriptions' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
        >
          {lang === 'ar' ? 'الاشتراكات النشطة' : 'Active'}
        </button>
      </div>

      {/* Tab: Plans */}
      {activeTab === 'plans' && (
        <>
          <div className="flex items-center justify-end gap-4">
            <div className="flex gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <button onClick={() => setViewType('grid')} className={`p-2 rounded-lg transition-all ${viewType === 'grid' ? 'bg-primary/10 text-primary dark:bg-primary/30 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                <span className="material-symbols-outlined text-[22px]">grid_view</span>
              </button>
              <button onClick={() => setViewType('table')} className={`p-2 rounded-lg transition-all ${viewType === 'table' ? 'bg-primary/10 text-primary dark:bg-primary/30 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                <span className="material-symbols-outlined text-[22px]">view_list</span>
              </button>
            </div>
            <button onClick={openAddModal} className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-lg shadow-primary/20 font-bold transition-all active:scale-95 whitespace-nowrap text-sm  ">
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>{t.plans.addNew}</span>
            </button>
          </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white/40 dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
          <div className="h-10 w-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-bold text-[11px]">Syncing Pricing Data...</p>
        </div>
      ) : error ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-lg">
          <span className="material-symbols-outlined text-red-400 text-5xl mb-4">cloud_off</span>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Failed to load plans</h3>
          <p className="text-slate-500 text-base mb-6">{error}</p>
          <button onClick={fetchPlans} className="px-10 py-3 bg-primary text-white rounded-xl font-bold text-base shadow-md active:scale-95">Retry</button>
        </div>
      ) : (
        <>

          {viewType === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
              {plans.map((plan, idx) => {
                const typeConfig = getPlanTypeConfig(plan.planType);
                const validOffers = plan.specialOffers?.filter(o => o.discountPercentage > 0) || [];
                return (
                  <div 
                    key={plan.id}
                    className={`bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100 dark:border-slate-800 relative group overflow-hidden flex flex-col animate-in zoom-in-95 duration-700 ${plan.active ? '' : 'opacity-85 grayscale-[0.15]'}`}
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div className={`absolute top-0 ${lang === 'ar' ? 'right-0' : 'left-0'} w-1.5 h-full ${plan.active ? 'bg-primary' : 'bg-slate-300'} transition-all duration-300`}></div>

                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-4 items-center min-w-0">
                        <div className={`size-12 rounded-xl flex items-center justify-center border shrink-0 shadow-sm transition-all duration-300 ${plan.active ? 'bg-primary/5 text-primary border-primary/10' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                          <span className="material-symbols-outlined text-[26px]">
                            {plan.billingFrequency === 'YEARLY' ? 'calendar_month' : plan.billingFrequency === 'QUARTERLY' ? 'grid_view' : 'schedule'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 dark:text-white text-[17px] leading-tight truncate  ">{plan.name}</h3>
                          <div className="flex items-center gap-1.5 mt-1">
                             <span className={`size-2 rounded-full ${plan.active ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                             <span className="text-[12px] font-bold text-slate-500  ">
                               {plan.active ? t.plans.statusActive : t.plans.statusArchived}
                             </span>
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
                          <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-lg  shadow-sm  ">
                            {lang === 'ar' ? 'حصري' : 'Exclusive'}
                          </span>
                        )}
                        {plan.isPopular && (
                          <span className="bg-primary/10 text-primary text-[9px] font-bold px-2 py-0.5 rounded-full  whitespace-nowrap border border-primary/20">
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
                          <span className="text-[12px] text-slate-500 font-bold ">{t.plans.currency}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-500 font-bold text-sm">{t.plans.frequency}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-[13px]">{getFreqLabel(plan.billingFrequency)}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 pt-4">
                        <div className="relative">                      
                          <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               setActiveFeatureId(activeFeatureId === plan.id ? null : plan.id);
                               setActiveOfferId(null);
                             }}
                             className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-[11px] font-black  shadow-sm active:scale-95 w-full justify-between ${
                               activeFeatureId === plan.id 
                               ? 'bg-primary text-white border-primary' 
                               : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-primary/10 hover:border-primary'
                             }`}
                          >
                             <div className="flex items-center gap-2">
                                <span>{plan.features?.length || 0} {lang === 'ar' ? 'مزايا' : 'Feats'}</span>
                             </div>
                             <span className={`material-symbols-outlined text-base transition-transform duration-300 ${activeFeatureId === plan.id ? 'rotate-180' : ''}`}>expand_more</span>
                          </button>

                          {activeFeatureId === plan.id && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute bottom-full mb-3 z-[60] w-64 p-5 bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-2xl border border-primary/10 animate-in fade-in zoom-in-95 duration-200 ${lang === 'ar' ? 'right-0' : 'left-0'}`}
                            >
                              <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 pb-2 border-b border-primary/5  ">
                                  {lang === 'ar' ? 'مميزات الباقة' : 'Features'}
                                </p>
                                <div className="space-y-2.5 max-h-[200px] overflow-y-auto no-scrollbar">
                                  {plan.features && plan.features.length > 0 ? (
                                    plan.features.map((feat, fidx) => {
                                      const label = typeof feat === 'string' ? feat : getPlanFeatureLabel(String((feat as PlanFeature).feature), lang === 'ar' ? 'ar' : 'en');
                                      const price = typeof feat === 'object' && feat && 'price' in feat ? (feat as PlanFeature).price : null;
                                      return (
                                        <div key={fidx} className="flex items-start justify-between gap-3 text-slate-700 dark:text-slate-300">
                                          <div className="flex items-start gap-3">
                                            <span className="material-symbols-outlined text-[18px] text-emerald-500 fill-1">check_circle</span>
                                            <span className="text-[11px] font-bold leading-tight">{label}{price != null ? ` (+${price})` : ''}</span>
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <p className="text-[10px] text-slate-400 italic">No features</p>
                                  )}
                                </div>
                              </div>
                              <div className={`absolute -bottom-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-r border-b border-primary/10 rotate-45 ${lang === 'ar' ? 'right-6' : 'left-6'}`}></div>
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
                             className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-[11px] font-black  shadow-sm active:scale-95 w-full justify-between ${
                               activeOfferId === plan.id 
                               ? 'bg-amber-500 text-white border-amber-500' 
                               : 'bg-amber-50/50 dark:bg-amber-900/10 text-amber-600 border-amber-500/20 hover:border-amber-500'
                             }`}
                          >
                             <div className="flex items-center gap-2">
                                <span>{validOffers.length} {lang === 'ar' ? 'خصم' : 'Offers'}</span>
                             </div>
                             <span className={`material-symbols-outlined text-base transition-transform duration-300 ${activeOfferId === plan.id ? 'rotate-180' : ''}`}>expand_more</span>
                          </button>

                          {activeOfferId === plan.id && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute bottom-full mb-3 z-[60] w-64 p-5 bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-2xl border border-amber-500/10 animate-in fade-in zoom-in-95 duration-200 ${lang === 'ar' ? 'right-0' : 'left-0'}`}
                            >
                              <div className="space-y-3">
                                <p className="text-[10px] font-black text-amber-500 pb-2 border-b border-amber-500/5  ">
                                  {lang === 'ar' ? 'العروض الخاصة' : 'Special Offers'}
                                </p>
                                <div className="space-y-2.5 max-h-[200px] overflow-y-auto no-scrollbar">
                                  {validOffers.length > 0 ? (
                                    validOffers.map((offer, oidx) => (
                                      <div key={oidx} className="p-3 rounded-xl bg-gradient-to-r from-orange-50 to-emerald-50 dark:from-orange-950/10 dark:to-emerald-950/10 border border-orange-100 dark:border-orange-900/20">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[9px] font-black text-orange-600">
                                            {lang === 'ar' ? 'أقل عدد مستخدمين:' : 'Seats:'} {offer.minUserCount}+
                                          </span>
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
                              <div className={`absolute -bottom-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-r border-b border-amber-500/10 rotate-45 ${lang === 'ar' ? 'right-6' : 'left-6'}`}></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-5 border-t border-slate-100 dark:border-slate-800 mt-auto -mx-6 px-6 -mb-6 pb-6 bg-slate-50/30 dark:bg-slate-800/20">
                      <div className="flex gap-3 items-center">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black    border shrink-0 shadow-sm transition-colors ${typeConfig.classes}`}>
                          {typeConfig.label}
                        </span>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        <button onClick={() => openEditModal(plan.id)} className="text-primary text-sm font-bold hover:text-primary/80 flex items-center gap-1 transition-all group/btn">
                          {t.plans.edit}
                          <span className="material-symbols-outlined text-[16px]">edit_square</span>
                        </button>
                        
                        <button 
                          onClick={() => togglePlanStatus(plan)}
                          disabled={isStatusChanging === plan.id}
                          className={`text-sm font-bold flex items-center gap-1 transition-all disabled:opacity-50 ${plan.active ? 'text-orange-500' : 'text-emerald-500'}`}
                        >
                          {isStatusChanging === plan.id ? (
                             <div className="size-4 border-2 border-current/20 border-t-current rounded-full animate-spin"></div>
                          ) : (
                            <>
                              {plan.active ? t.plans.deactivate : t.plans.activate}
                              <span className="material-symbols-outlined text-[20px]">
                                {plan.active ? 'pause_circle' : 'play_circle'}
                              </span>
                            </>
                          )}
                        </button>
                      </div>

                      <button onClick={() => setDeleteConfirmId(plan.id)} className="size-9 rounded-xl bg-red-50 text-red-600 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all dark:bg-red-900/20 dark:text-red-400 active:scale-90 shadow-sm" title="Delete">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              
              <div onClick={openAddModal} className="rounded-[1.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center min-h-[300px] cursor-pointer group animate-in zoom-in-95 duration-700">
                <div className="bg-slate-50 dark:bg-slate-800 group-hover:bg-primary text-slate-500 group-hover:text-white rounded-xl p-4 mb-3 transition-all shadow-sm duration-300">
                  <span className="material-symbols-outlined text-3xl">add</span>
                </div>
                <h3 className="text-sm font-bold text-slate-500 group-hover:text-primary transition-colors ">{t.plans.addNew}</h3>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in duration-500">
              <div className="overflow-x-auto">
                <table className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'} border-collapse`}>
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-500 font-bold   whitespace-nowrap">
                      <th className="px-8 py-5">{t.plans.name}</th>
                      <th className="px-8 py-5">{t.plans.pricePerUser}</th>
                      <th className="px-8 py-5">{t.plans.frequency}</th>
                      <th className="px-8 py-5">{lang === 'ar' ? 'النوع' : 'Target'}</th>
                      <th className="px-8 py-5">{lang === 'ar' ? 'الإعلانات' : 'Ads'}</th>
                      <th className="px-8 py-5">{t.plans.status}</th>
                      <th className={`px-8 py-5 ${lang === 'ar' ? 'text-left' : 'text-right'}`}></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {plans.map((plan, idx) => {
                      const typeConfig = getPlanTypeConfig(plan.planType);
                      const validOffers = plan.specialOffers?.filter(o => o.discountPercentage > 0) || [];
                      return (
                        <tr key={plan.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-all group animate-in slide-in-from-right-2 duration-300" style={{ animationDelay: `${idx * 25}ms` }}>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className={`size-11 rounded-xl flex items-center justify-center transition-all shadow-sm ${plan.active ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-500'}`}>
                                 <span className="material-symbols-outlined text-[22px]">
                                    {plan.billingFrequency === 'YEARLY' ? 'calendar_month' : plan.billingFrequency === 'QUARTERLY' ? 'grid_view' : 'schedule'}
                                 </span>
                              </div>
                              <div className="flex gap-4">
                                <div className="flex flex-col relative">
                                  <span className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                                    {plan.name}
                                    {plan.exclusive && <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-amber-500 text-[8px] text-white">VIP</span>}
                                  </span>
                                  
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveFeatureId(activeFeatureId === plan.id ? null : plan.id);
                                      setActiveOfferId(null);
                                    }}
                                    className="text-[11px] font-black text-primary hover:underline mt-1 flex items-center gap-1"
                                  >
                                    {plan.features?.length || 0} {lang === 'ar' ? 'مميزات' : 'features'}
                                  </button>
    
                                  {activeFeatureId === plan.id && (
                                    <div 
                                      onClick={(e) => e.stopPropagation()}
                                      className={`absolute top-full left-0 mt-2 z-[60] w-64 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-primary/10 animate-in fade-in zoom-in-95 duration-200`}
                                    >
                                      <div className="space-y-2">
                                        {plan.features?.map((feat, fidx) => {
                                            const label = typeof feat === 'string' ? feat : getPlanFeatureLabel(String((feat as PlanFeature).feature), lang === 'ar' ? 'ar' : 'en');
                                            const price = typeof feat === 'object' && feat && 'price' in feat ? (feat as PlanFeature).price : null;
                                            return (
                                              <div key={fidx} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                <span className="material-symbols-outlined text-[16px] text-emerald-500">check_circle</span>
                                                <span className="text-xs font-bold">{label}{price != null ? ` (+${price})` : ''}</span>
                                              </div>
                                            );
                                          })}
                                      </div>
                                      <div className={`absolute -top-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-l border-t border-primary/10 rotate-45 left-6`}></div>
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-col relative">
                                  <span className="text-transparent pointer-events-none text-base leading-tight">.</span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveOfferId(activeOfferId === plan.id ? null : plan.id);
                                      setActiveFeatureId(null);
                                    }}
                                    className="text-[11px] font-black text-amber-600 hover:underline mt-1 flex items-center gap-1"
                                  >
                                    {validOffers.length} {lang === 'ar' ? 'عروض' : 'offers'}
                                  </button>

                                  {activeOfferId === plan.id && (
                                    <div 
                                      onClick={(e) => e.stopPropagation()}
                                      className={`absolute top-full left-0 mt-2 z-[60] w-64 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-amber-500/20 animate-in fade-in zoom-in-95 duration-200`}
                                    >
                                      <div className="space-y-2">
                                        {validOffers.length > 0 ? (
                                          validOffers.map((offer, oidx) => (
                                            <div key={oidx} className="flex items-start gap-2 text-slate-600 dark:text-slate-300 border-b border-slate-50 dark:border-slate-800 pb-2 last:border-0">
                                              <span className="material-symbols-outlined text-[16px] text-orange-500">loyalty</span>
                                              <div className="flex flex-col">
                                                <span className="text-xs font-black text-emerald-600">%{offer.discountPercentage} Discount</span>
                                                <span className="text-[10px] font-bold opacity-60">
                                                  {lang === 'ar' ? 'أقل عدد مستخدمين:' : 'Min Seats:'} {offer.minUserCount}
                                                </span>
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <p className="text-xs text-slate-400 italic">No valid offers</p>
                                        )}
                                      </div>
                                      <div className={`absolute -top-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-l border-t border-amber-500/20 rotate-45 left-6`}></div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{plan.pricePerUser}</span>
                              <span className="text-[12px] text-slate-500 font-bold  ">{t.plans.currency}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                             <span className="text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                               {getFreqLabel(plan.billingFrequency)}
                             </span>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-3 py-1 rounded-lg text-[11px] font-black    border transition-colors ${typeConfig.classes}`}>
                              {typeConfig.label}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border ${plan.hasAdvertisements ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                               <span className="material-symbols-outlined text-[14px]">{plan.hasAdvertisements ? 'ads_click' : 'block'}</span>
                               {plan.hasAdvertisements ? (lang === 'ar' ? 'نعم' : 'Yes') : (lang === 'ar' ? 'لا' : 'No')}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                             <span className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-bold border ${plan.active ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                <span className={`size-2 rounded-full ${plan.active ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                {plan.active ? t.plans.statusActive : t.plans.statusArchived}
                             </span>
                          </td>
                          <td className="px-8 py-5">
                            <div className={`flex items-center ${lang === 'ar' ? 'justify-start' : 'justify-end'} gap-5`}>
                              <button onClick={() => togglePlanStatus(plan)} disabled={isStatusChanging === plan.id} className={`text-sm font-bold hover:underline disabled:opacity-50 ${plan.active ? 'text-orange-500' : 'text-emerald-500'}`}>
                                {isStatusChanging === plan.id ? '...' : (plan.active ? t.plans.deactivate : t.plans.activate)}
                              </button>
                              <button onClick={() => openEditModal(plan.id)} className="text-primary hover:underline text-sm font-bold">{t.plans.edit}</button>
                              <button onClick={() => setDeleteConfirmId(plan.id)} className="text-slate-300 hover:text-red-500 transition-all active:scale-90 flex items-center justify-center p-2 rounded-xl hover:bg-red-50">
                                 <span className="material-symbols-outlined text-[24px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
        )
        </>
      )}

      {/* Tab: Approvals - full Approvals page with all style */}
      {activeTab === 'approvals' && (
        <Approvals embedded />
      )}

      {/* Tab: Active subscriptions (approved, non-pending) */}
      {activeTab === 'subscriptions' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="text-base font-black text-slate-800 dark:text-white mb-4">
            {lang === 'ar' ? 'الاشتراكات النشطة (المعتمدة)' : 'Active subscriptions (approved)'}
          </h2>
          {loadingApproved && approvedSubscriptions.length === 0 ? (
            <div className="flex justify-center py-12">
              <div className="size-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : approvedSubscriptions.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm py-6">
              {lang === 'ar' ? 'لا توجد اشتراكات معتمدة.' : 'No approved subscriptions.'}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'المستخدم' : 'User'}</th>
                      <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'الخطة' : 'Plan'}</th>
                      <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'المقاعد' : 'Seats'}</th>
                      <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'المستخدم / المتبقي' : 'Used / Left'}</th>
                      <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                      <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'تاريخ البدء' : 'Start'}</th>
                      <th className="text-left p-3 font-black text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'صلاحية حتى' : 'Expires'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedSubscriptions.map((sub) => (
                      <tr key={sub.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="p-3 font-bold text-slate-800 dark:text-white">{sub.userName || sub.userId?.slice(-8) || '—'}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{sub.planName || '—'}</td>
                        <td className="p-3 font-bold text-slate-800 dark:text-white">{sub.numberOfUsers ?? '—'}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {(sub.usedUsers ?? 0)} / {(sub.remainingUsers ?? sub.numberOfUsers ?? 0)}
                        </td>
                        <td className="p-3 font-bold text-primary">{sub.finalPrice != null ? `${Number(sub.finalPrice).toLocaleString()} ${t.plans.currency}` : '—'}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{formatDate(sub.subscriptionDate || sub.submissionDate)}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{formatDate(sub.expiryDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {approvedTotalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button onClick={() => setApprovedPage((p) => Math.max(0, p - 1))} disabled={approvedPage === 0} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm disabled:opacity-50">
                    {lang === 'ar' ? 'السابق' : 'Prev'}
                  </button>
                  <span className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400">{approvedPage + 1} / {approvedTotalPages}</span>
                  <button onClick={() => setApprovedPage((p) => Math.min(approvedTotalPages - 1, p + 1))} disabled={approvedPage >= approvedTotalPages - 1} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm disabled:opacity-50">
                    {lang === 'ar' ? 'التالي' : 'Next'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 text-center">
              <div className="mx-auto size-16 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl">warning</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{lang === 'ar' ? 'تأكيد الحذف' : 'Delete Plan'}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-500 mb-8 leading-relaxed font-medium">
                {lang === 'ar' ? 'هل أنت متأكد من حذف هذه الخطة؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this plan? This action cannot be undone.'}
              </p>
              <div className="flex gap-4">
                <button disabled={isDeleting} onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-100 dark:border-slate-800">{t.categories.cancel}</button>
                <button disabled={isDeleting} onClick={handleDelete} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-xl shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center text-sm">
                  {isDeleting ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (lang === 'ar' ? 'حذف' : 'Delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PlanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} planId={editingPlanId} onSuccess={fetchPlans} />
    </div>
  );
};

export default Plans;