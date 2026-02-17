import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../App';
import { api } from '../../api';
import OrderChat from '../../components/OrderChat';
import FeatureUpgradePrompt from '../../components/FeatureUpgradePrompt';
import EmptyState from '../../components/EmptyState';
import PaginationFooter from '../../components/PaginationFooter';
import { useToast } from '../../contexts/ToastContext';
import { MODAL_DROPDOWN_TRIGGER_CLASS, MODAL_INPUT_CLASS, MODAL_OVERLAY_BASE_CLASS, MODAL_PANEL_BASE_CLASS } from '../../components/modalTheme';
import { PlanFeaturesEnum } from '../../types';
import { hasFeature } from '../../utils/subscription';

interface MarketPost {
  id: string;
  materialName: string;
  image: string;
  quantity: number;
  unit: string;
  targetType: 'SUPPLIERS' | 'CUSTOMERS' | 'BOTH';
  createdById: string;
  createdByName: string;
  createdByOrganizationName: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  status: string;
  offers: any[];
}

const MarketRequests: React.FC = () => {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'create'>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [userRole, setUserRole] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [newPostForm, setNewPostForm] = useState({
    materialName: '',
    quantity: '',
    unit: '',
    targetType: 'SUPPLIERS' as 'SUPPLIERS' | 'CUSTOMERS' | 'BOTH',
    image: '',
  });
  const [hasPrivateOrdersFeature, setHasPrivateOrdersFeature] = useState<boolean | null>(null);
  const pageSize = 10;

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const parsedUser = JSON.parse(userStr);
      const role = (parsedUser.role || '').toUpperCase();
      setUserRole(role);
      
      // Check if user has private orders feature
      if (role === 'CUSTOMER_OWNER') {
        hasFeature(PlanFeaturesEnum.CUSTOMER_PRIVATE_ORDERS).then(setHasPrivateOrdersFeature);
      } else if (role.includes('SUPPLIER')) {
        hasFeature(PlanFeaturesEnum.SUPPLIER_PRIVATE_ORDERS).then(setHasPrivateOrdersFeature);
      } else {
        setHasPrivateOrdersFeature(true); // Admins always have access
      }
    }
  }, []);

  useEffect(() => {
    if (hasPrivateOrdersFeature === null || hasPrivateOrdersFeature === false) {
      return; // Don't fetch if feature check is pending or not available
    }
    if (activeTab === 'create') return;
    fetchData(currentPage, activeTab, pageSize);
  }, [activeTab, hasPrivateOrdersFeature, currentPage]);

  const fetchData = async (page: number, tab: 'all' | 'mine', size: number) => {
    setIsLoading(true);
    try {
      const endpoint = tab === 'all'
        ? `/api/v1/clients-special-orders?page=${page}&size=${size}`
        : `/api/v1/clients-special-orders/my-clients-special-orders?page=${page}&size=${size}`;
      const response = await api.get<any>(endpoint);
      setPosts(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
      setCurrentPage(response.number || page);
    } catch (err) {} finally { setIsLoading(false); }
  };

  const resetCreatePostForm = () => {
    setNewPostForm({
      materialName: '',
      quantity: '',
      unit: '',
      targetType: 'SUPPLIERS',
      image: '',
    });
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostForm.materialName.trim() || !newPostForm.unit.trim() || Number(newPostForm.quantity) <= 0) {
      showToast(lang === 'ar' ? 'يرجى إدخال بيانات صحيحة للطلب' : 'Please fill valid request details', 'warning');
      return;
    }

    setIsSubmittingPost(true);
    try {
      await api.post('/api/v1/clients-special-orders', {
        materialName: newPostForm.materialName.trim(),
        quantity: Number(newPostForm.quantity),
        unit: newPostForm.unit.trim(),
        targetType: newPostForm.targetType,
        image: newPostForm.image.trim() || null,
      });
      showToast(t.marketRequests.postSuccess, 'success');
      setIsCreateModalOpen(false);
      resetCreatePostForm();
      setActiveTab('mine');
      setCurrentPage(0);
      await fetchData(0, 'mine', pageSize);
    } catch (err: any) {
      showToast(err?.message || (lang === 'ar' ? 'فشل إنشاء الطلب' : 'Failed to create request'), 'error');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const isCustomer = userRole === 'CUSTOMER_OWNER';
  const isSupplier = userRole.includes('SUPPLIER');
  const canCreate = isCustomer && hasPrivateOrdersFeature === true;
  const canAccess = hasPrivateOrdersFeature === true || (!isCustomer && !isSupplier);
  const visiblePosts = posts;

  const targetTypeLabel = (type?: string) => {
    if (type === 'SUPPLIERS') return t.marketRequests.suppliersOnly;
    if (type === 'CUSTOMERS') return t.marketRequests.customersOnly;
    return t.marketRequests.both;
  };

  const handleMobileSheetDrag = (
    e: React.TouchEvent<HTMLDivElement>,
    close: () => void
  ) => {
    const startY = e.touches[0].clientY;
    const modal = e.currentTarget.closest('.fixed')?.querySelector('.w-full') as HTMLElement | null;
    if (!modal) return;

    const onMove = (moveEvent: TouchEvent) => {
      const currentY = moveEvent.touches[0].clientY;
      const diff = currentY - startY;
      if (diff > 0) {
        modal.style.transform = `translateY(${diff}px)`;
        modal.style.transition = 'none';
      }
    };

    const onEnd = () => {
      const finalY = modal.getBoundingClientRect().top;
      if (finalY > window.innerHeight * 0.3) {
        close();
      } else {
        modal.style.transform = '';
        modal.style.transition = '';
      }
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };

    document.addEventListener('touchmove', onMove);
    document.addEventListener('touchend', onEnd);
  };

  // Show loading while checking feature
  if ((isCustomer || isSupplier) && hasPrivateOrdersFeature === null) {
    return (
      <div className="w-full py-6 animate-in fade-in duration-700 font-display">
        <div className="flex flex-col items-center justify-center py-40">
          <div className="size-10 border-[3px] border-primary/10 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-slate-400 font-black text-[10px] md:text-xs opacity-50">Loading...</p>
        </div>
      </div>
    );
  }

  // Show feature error if user doesn't have access
  if ((isCustomer || isSupplier) && hasPrivateOrdersFeature === false) {
    const privateOrdersLabel = lang === 'ar' ? 'طلبات العملاء الخاصة' : 'Clients Special Orders';
    return (
      <FeatureUpgradePrompt
        lang={lang}
        title={t.orders.featureRequiredTitle}
        description={t.orders.featureRequired}
        featureLabel={privateOrdersLabel}
        actionLabel={lang === 'ar' ? 'ترقية الباقة' : 'Upgrade Plan'}
        onUpgrade={() => navigate('/subscription')}
      />
    );
  }

  return (
    <div className="w-full py-6 animate-in fade-in duration-700 font-display">
      <div className="flex flex-wrap items-center justify-end gap-4 mb-10">
        <div className="w-full flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 min-w-0">
          <button
            onClick={() => { setActiveTab('all'); setCurrentPage(0); fetchData(0, 'all', pageSize); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-black transition-all ${activeTab === 'all' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            {t.marketRequests.filterAll}
          </button>
          <button
            onClick={() => { setActiveTab('mine'); setCurrentPage(0); fetchData(0, 'mine', pageSize); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-black transition-all ${activeTab === 'mine' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            {t.marketRequests.myPosts}
          </button>
          {canCreate && (
            <button
              onClick={() => {
                setActiveTab('create');
                setIsCreateModalOpen(true);
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-black transition-all ${activeTab === 'create' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              {t.marketRequests.createPost}
            </button>
          )}
        </div>
      </div>

      <div className="min-h-[500px]">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center"><div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div></div>
        ) : (
          visiblePosts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <EmptyState title={t.marketRequests.empty} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
              {visiblePosts.map((post, idx) => (
                <div key={post.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col animate-in zoom-in-95" style={{ animationDelay: `${idx * 40}ms` }}>
                  <div className="p-4 md:p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="size-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shrink-0">
                        {post.image ? (
                          <img src={post.image} alt={post.materialName} className="size-full object-cover" />
                        ) : (
                          <div className="size-full flex items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined">inventory_2</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white break-words">{post.materialName}</h3>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black border border-primary/20">
                            {targetTypeLabel(post.targetType)}
                          </span>
                          <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black border border-slate-200 dark:border-slate-700">
                            {(post.offers?.length || 0)} {t.marketRequests.offers}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5">
                        <p className="text-[10px] font-black text-slate-500">{t.marketRequests.quantity}</p>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5">{post.quantity || 0} {post.unit || '-'}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5">
                        <p className="text-[10px] font-black text-slate-500">{lang === 'ar' ? 'الحالة' : 'Status'}</p>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5">{post.status || '-'}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5">
                      <p className="text-[10px] font-black text-slate-500">{t.marketRequests.requestedBy}</p>
                      <p className="text-xs font-black text-slate-700 dark:text-slate-200 mt-0.5 break-words">{post.createdByOrganizationName || post.createdByName || '-'}</p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span>{lang === 'ar' ? 'تاريخ الإنشاء' : 'Created at'}</span>
                      <span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : '-'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {activeTab !== 'create' && (
        <PaginationFooter
          currentPage={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={(page) => {
            if (page < 0 || page >= totalPages) return;
            setCurrentPage(page);
          }}
          currentCount={visiblePosts.length}
        />
      )}

      {isCreateModalOpen && (
        <div className={`fixed inset-0 z-[500] ${MODAL_OVERLAY_BASE_CLASS}`} onClick={() => { setIsCreateModalOpen(false); if (activeTab === 'create') setActiveTab('all'); }}>
          <div className={`${MODAL_PANEL_BASE_CLASS} md:max-w-lg`} onClick={(e) => e.stopPropagation()}>
            <div
              className="md:hidden pt-3 pb-2 flex justify-center shrink-0 cursor-grab active:cursor-grabbing"
              onTouchStart={(e) => handleMobileSheetDrag(e, () => { setIsCreateModalOpen(false); if (activeTab === 'create') setActiveTab('all'); })}
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
            </div>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-2xl">add_box</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">
                    {t.marketRequests.createPost}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 mt-2">{lang === 'ar' ? 'إنشاء طلب خامة جديد' : 'Create a new material request'}</p>
                </div>
              </div>
              <button onClick={() => { setIsCreateModalOpen(false); if (activeTab === 'create') setActiveTab('all'); }} className="size-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <form id="createPostForm" onSubmit={handleCreatePost} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 px-1">{t.marketRequests.materialName}</label>
                  <input
                    required
                    type="text"
                    value={newPostForm.materialName}
                    onChange={(e) => setNewPostForm((prev) => ({ ...prev, materialName: e.target.value }))}
                    className={MODAL_INPUT_CLASS}
                    placeholder={t.marketRequests.materialName}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 px-1">{t.marketRequests.quantity}</label>
                    <input
                      required
                      type="number"
                      min="1"
                      step="0.01"
                      value={newPostForm.quantity}
                      onChange={(e) => setNewPostForm((prev) => ({ ...prev, quantity: e.target.value }))}
                      className={MODAL_INPUT_CLASS}
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 px-1">{t.marketRequests.unit}</label>
                    <input
                      required
                      type="text"
                      value={newPostForm.unit}
                      onChange={(e) => setNewPostForm((prev) => ({ ...prev, unit: e.target.value }))}
                      className={MODAL_INPUT_CLASS}
                      placeholder={lang === 'ar' ? 'مثال: كجم' : 'e.g. KG'}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 px-1">{t.marketRequests.target}</label>
                  <select
                    value={newPostForm.targetType}
                    onChange={(e) => setNewPostForm((prev) => ({ ...prev, targetType: e.target.value as 'SUPPLIERS' | 'CUSTOMERS' | 'BOTH' }))}
                    className={MODAL_DROPDOWN_TRIGGER_CLASS}
                  >
                    <option value="SUPPLIERS">{t.marketRequests.suppliersOnly}</option>
                    <option value="CUSTOMERS">{t.marketRequests.customersOnly}</option>
                    <option value="BOTH">{t.marketRequests.both}</option>
                  </select>
                </div>
              </form>
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0 flex gap-3">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                form="createPostForm"
                type="submit"
                disabled={isSubmittingPost}
                className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isSubmittingPost ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (lang === 'ar' ? 'نشر الطلب' : 'Publish Request')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketRequests;