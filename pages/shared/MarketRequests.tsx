import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../App';
import { api } from '../../api';
import OrderChat from '../../components/OrderChat';
import FeatureUpgradePrompt from '../../components/FeatureUpgradePrompt';
import EmptyState from '../../components/EmptyState';
import PaginationFooter from '../../components/PaginationFooter';
import { useToast } from '../../contexts/ToastContext';
import { MODAL_DROPDOWN_TRIGGER_CLASS, MODAL_OVERLAY_BASE_CLASS, MODAL_PANEL_BASE_CLASS } from '../../components/modalTheme';
import FloatingLabelInput from '../../components/FloatingLabelInput';
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
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [userRole, setUserRole] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [postToDelete, setPostToDelete] = useState<MarketPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [offerPost, setOfferPost] = useState<MarketPost | null>(null);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerPrice, setOfferPrice] = useState<string>('');
  const [offerQty, setOfferQty] = useState<string>('');
  const [offerShip, setOfferShip] = useState<string>('');
  const [offerDelivery, setOfferDelivery] = useState<string>('');
  const [offerNotes, setOfferNotes] = useState<string>('');
  const [viewOffersPost, setViewOffersPost] = useState<MarketPost | null>(null);
  const [viewOffersData, setViewOffersData] = useState<any[] | null>(null);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [respondOfferId, setRespondOfferId] = useState<string | null>(null);
  const [respondAccept, setRespondAccept] = useState<boolean | null>(null);
  const [respondMsg, setRespondMsg] = useState<string>('');
  const [isResponding, setIsResponding] = useState(false);
  const [postToClose, setPostToClose] = useState<MarketPost | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Market Post Item Interface - Multiple Orders Support
  interface MarketPostItem {
    id: string; // unique id for each post item
    materialName: string;
    quantity: string;
    unit: string;
    orderType: 'SAMPLE' | 'QUANTITY' | null;
    targetType: 'SUPPLIERS' | 'CUSTOMERS' | 'BOTH';
    imported: boolean | null;
    image: string;
    file: File | null;
    preview: string | null;
  }

  const [marketPosts, setMarketPosts] = useState<MarketPostItem[]>([]);
  const marketFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [hasPrivateOrdersFeature, setHasPrivateOrdersFeature] = useState<boolean | null>(null);
  const pageSize = 10;

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const parsedUser = JSON.parse(userStr);
      const role = (parsedUser.role || '').toUpperCase();
      setUserRole(role);
      const uid = parsedUser?.userInfo?.id || parsedUser?.id || '';
      setCurrentUserId(uid);

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
    if (userRole.includes('SUPPLIER')) {
      setActiveTab('all');
      setCurrentPage(0);
    }
  }, [userRole]);

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
        ? `/api/v1/raw-material-advance?page=${page}&size=${size}`
        : `/api/v1/raw-material-advance/my-raw-material-advance?page=${page}&size=${size}`;
      const response = await api.get<any>(endpoint);
      setPosts(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
      setCurrentPage(response.number || page);
    } catch (err) { } finally { setIsLoading(false); }
  };

  const createNewMarketPost = (): MarketPostItem => ({
    id: `post-${Date.now()}-${Math.random()}`,
    materialName: '',
    quantity: '',
    unit: '',
    orderType: null,
    targetType: 'CUSTOMERS',
    imported: null,
    image: '',
    file: null,
    preview: null
  });

  const addMarketPost = () => {
    setMarketPosts(prev => [...prev, createNewMarketPost()]);
  };

  const removeMarketPost = (postId: string) => {
    setMarketPosts(prev => prev.filter(post => post.id !== postId));
    // Clean up ref
    delete marketFileInputRefs.current[postId];
  };

  const handleMarketFileChange = (postId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMarketPosts(prev => prev.map(post =>
          post.id === postId
            ? { ...post, file, preview: reader.result as string }
            : post
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  const resetCreatePostForm = () => {
    setMarketPosts([createNewMarketPost()]);
    marketFileInputRefs.current = {};
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all posts
    const invalidPosts = marketPosts.filter(post =>
      !post.materialName.trim() || !post.unit.trim() || Number(post.quantity) <= 0 || !post.orderType
    );

    if (invalidPosts.length > 0) {
      showToast(lang === 'ar' ? 'يرجى إدخال بيانات صحيحة لجميع الطلبات' : 'Please fill valid details for all requests', 'warning');
      return;
    }

    setIsSubmittingPost(true);
    try {
      if (editingPostId) {
        const post = marketPosts[0];
        let imageUrl = '';
        if (post.file) {
          const formData = new FormData();
          formData.append('file', post.file);
          imageUrl = await api.post<string>('/api/v1/image/upload', formData);
        }
        const payload = {
          materialName: post.materialName.trim(),
          quantity: Number(post.quantity),
          unit: post.unit.trim(),
          orderType: post.orderType,
          targetType: 'CUSTOMERS',
          imported: post.imported,
          image: imageUrl || post.image.trim() || null
        };
        await api.put(`/api/v1/clients-special-orders/${editingPostId}`, payload);
      } else {
        // Process all posts and upload images for creation
        const postsData = await Promise.all(marketPosts.map(async (post) => {
          let imageUrl = '';
          if (post.file) {
            const formData = new FormData();
            formData.append('file', post.file);
            imageUrl = await api.post<string>('/api/v1/image/upload', formData);
          }

          return {
            materialName: post.materialName.trim(),
            quantity: Number(post.quantity),
            unit: post.unit.trim(),
            orderType: post.orderType,
            targetType: 'CUSTOMERS',
            imported: post.imported,
            image: imageUrl || post.image.trim() || null,
          };
        }));

        // Send all posts sequentially
        for (const postData of postsData) {
          await api.post('/api/v1/raw-material-advance', postData);
        }
      }

      showToast(t.marketRequests.postSuccess, 'success');
      setIsCreateModalOpen(false);
      setEditingPostId(null);
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

  const postStatusConfig = (status?: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'OPEN') {
      return {
        label: lang === 'ar' ? 'مفتوح' : 'Open',
        cls: 'bg-emerald-50 text-emerald-600 border-emerald-200'
      };
    }
    if (s === 'CLOSED') {
      return {
        label: lang === 'ar' ? 'مغلق' : 'Closed',
        cls: 'bg-red-50 text-red-600 border-red-200'
      };
    }
    return {
      label: lang === 'ar' ? 'مكتمل' : 'Completed',
      cls: 'bg-slate-100 text-slate-600 border-slate-300'
    };
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
      {!isSupplier && (
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
                  setMarketPosts([createNewMarketPost()]);
                  setIsCreateModalOpen(true);
                }}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-black transition-all ${activeTab === 'create' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                {t.marketRequests.createPost}
              </button>
            )}
          </div>
        </div>
      )}

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
                    <div className="flex items-center justify-between">
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
                            {post.createdById && (
                              <button
                                onClick={async () => {
                                  setViewOffersPost(post);
                                  setIsLoadingOffers(true);
                                  setViewOffersData(null);
                                  try {
                                    const data = await api.get<any>(`/api/v1/raw-material-advance/${post.id}`);
                                    setViewOffersData(data?.offers || []);
                                  } catch (err) {
                                    setViewOffersData([]);
                                  } finally {
                                    setIsLoadingOffers(false);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black border border-slate-200 dark:border-slate-700 hover:bg-slate-200/60"
                                title={lang === 'ar' ? 'عرض العروض' : 'View offers'}
                              >
                                <span className="material-symbols-outlined text-[14px]">local_offer</span>
                                {(post.offers?.length || 0)} {t.marketRequests.offers}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="shrink-0 flex items-center gap-2">
                        {activeTab === 'mine' ? (
                          <>
                            <button
                              onClick={() => {
                                setEditingPostId(post.id);
                                setMarketPosts([{
                                  id: `edit-${post.id}`,
                                  materialName: post.materialName,
                                  quantity: String(post.quantity || ''),
                                  unit: post.unit || '',
                                  targetType: ((post as any).targetType === 'BOTH' ? 'SUPPLIERS' : (post as any).targetType) || 'SUPPLIERS',
                                  imported: (post as any).imported ?? null,
                                  image: post.image || '',
                                  file: null,
                                  preview: post.image || null
                                }]);
                                setIsCreateModalOpen(true);
                              }}
                              className="size-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-primary hover:border-primary transition-all flex items-center justify-center"
                              title={lang === 'ar' ? 'تعديل' : 'Edit'}
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            {post.status === 'OPEN' && (
                              <button
                                onClick={() => setPostToClose(post)}
                                className="size-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-amber-600 hover:border-amber-300 transition-all flex items-center justify-center"
                                title={lang === 'ar' ? 'إغلاق الطلب' : 'Close Request'}
                              >
                                <span className="material-symbols-outlined text-[18px]">lock</span>
                              </button>
                            )}
                            <button
                              onClick={() => setPostToDelete(post)}
                              className="size-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-500 hover:border-red-300 transition-all flex items-center justify-center"
                              title={lang === 'ar' ? 'حذف' : 'Delete'}
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </>
                        ) : (
                          isSupplier && post.createdById !== currentUserId && (post.targetType === 'SUPPLIERS' || post.targetType === 'BOTH') && (
                            <button
                              onClick={() => {
                                setOfferPost(post);
                                setOfferPrice('');
                                setOfferQty(String(post.quantity || ''));
                                setOfferShip('');
                                setOfferDelivery('');
                                setOfferNotes('');
                              }}
                              className="px-3 h-9 rounded-lg bg-primary text-white font-black text-xs shadow-md hover:bg-slate-900 dark:hover:bg-slate-800 transition-all"
                              title={lang === 'ar' ? 'تقديم عرض' : 'Submit Offer'}
                            >
                              {lang === 'ar' ? 'تقديم عرض' : 'Submit Offer'}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5">
                        <p className="text-[10px] font-black text-slate-500">{t.marketRequests.quantity}</p>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5">{post.quantity || 0} {post.unit || '-'}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5">
                        <p className="text-[10px] font-black text-slate-500">{lang === 'ar' ? 'الحالة' : 'Status'}</p>
                        {(() => {
                          const cfg = postStatusConfig(post.status);
                          return (
                            <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-lg border text-[11px] font-black ${cfg.cls}`}>
                              {cfg.label}
                            </span>
                          );
                        })()}
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
        <div className={`fixed inset-0 z-[500] ${MODAL_OVERLAY_BASE_CLASS}`} onClick={() => { setIsCreateModalOpen(false); resetCreatePostForm(); if (activeTab === 'create') setActiveTab('all'); }}>
          <div className={`${MODAL_PANEL_BASE_CLASS} md:max-w-lg`} onClick={(e) => e.stopPropagation()}>
            <div
              className="md:hidden pt-3 pb-2 flex justify-center shrink-0 cursor-grab active:cursor-grabbing"
              onTouchStart={(e) => handleMobileSheetDrag(e, () => { setIsCreateModalOpen(false); resetCreatePostForm(); if (activeTab === 'create') setActiveTab('all'); })}
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
              <button onClick={() => { setIsCreateModalOpen(false); resetCreatePostForm(); if (activeTab === 'create') setActiveTab('all'); }} className="size-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <form id="createPostForm" onSubmit={handleCreatePost} className="space-y-6">
                {marketPosts.map((post, index) => (
                  <div key={post.id} className="space-y-5 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30">
                    {/* Post Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                      <h4 className="text-sm font-black text-slate-700 dark:text-slate-300">
                        {lang === 'ar' ? `طلب ${index + 1}` : `Request ${index + 1}`}
                      </h4>
                      {marketPosts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMarketPost(post.id)}
                          className="size-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex items-center justify-center active:scale-95"
                          title={lang === 'ar' ? 'حذف الطلب' : 'Remove Request'}
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      )}
                    </div>

                    {/* Material Name */}
                    <FloatingLabelInput
                      required
                      type="text"
                      label={t.marketRequests.materialName}
                      value={post.materialName}
                      onChange={(e) => setMarketPosts(prev => prev.map(p => p.id === post.id ? { ...p, materialName: e.target.value } : p))}
                      isRtl={lang === 'ar'}
                    />

                    {/* Quantity & Unit */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FloatingLabelInput
                        required
                        type="number"
                        label={t.marketRequests.quantity}
                        min={1}
                        step={0.01}
                        value={post.quantity}
                        onChange={(e) => setMarketPosts(prev => prev.map(p => p.id === post.id ? { ...p, quantity: e.target.value } : p))}
                        isRtl={lang === 'ar'}
                      />
                      <FloatingLabelInput
                        required
                        type="text"
                        label={t.marketRequests.unit}
                        value={post.unit}
                        onChange={(e) => setMarketPosts(prev => prev.map(p => p.id === post.id ? { ...p, unit: e.target.value } : p))}
                        isRtl={lang === 'ar'}
                      />
                    </div>

                    {/* Order Type (Sample vs Quantity) */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'نوع الطلب' : 'Order Type'}</label>
                      <p className="text-[10px] font-bold text-slate-400 px-1 mb-1">
                        {lang === 'ar' ? 'اختر إذا كنت تحتاج عينة للتجربة أو كمية للتوريد' : 'Choose whether you need a small sample or full quantity for supply'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setMarketPosts(prev => prev.map(p => p.id === post.id ? { ...p, orderType: 'SAMPLE' } : p))}
                          className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${post.orderType === 'SAMPLE' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                        >
                          {lang === 'ar' ? 'عينة' : 'Sample'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMarketPosts(prev => prev.map(p => p.id === post.id ? { ...p, orderType: 'QUANTITY' } : p))}
                          className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${post.orderType === 'QUANTITY' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                        >
                          {lang === 'ar' ? 'كمية' : 'Quantity'}
                        </button>
                      </div>
                    </div>

                    {/* Local vs Imported */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'نوع المصدر' : 'Origin Type'}</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setMarketPosts(prev => prev.map(p => p.id === post.id ? { ...p, imported: false } : p))}
                          className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${post.imported === false ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                        >
                          {lang === 'ar' ? 'محلي' : 'Local'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMarketPosts(prev => prev.map(p => p.id === post.id ? { ...p, imported: true } : p))}
                          className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${post.imported === true ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                        >
                          {lang === 'ar' ? 'مستورد' : 'Imported'}
                        </button>
                      </div>
                    </div>

                    {/* Target Type removed: default to CUSTOMERS */}

                    {/* Image Upload */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'صورة المنتج (اختياري)' : 'Product Image (Optional)'}</label>
                      <div
                        onClick={() => marketFileInputRefs.current[post.id]?.click()}
                        className={`h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${post.preview ? 'border-primary' : 'border-slate-200 hover:border-primary bg-slate-50/50 dark:bg-slate-800/50'}`}
                      >
                        {post.preview ? (
                          <img src={post.preview} className="size-full object-cover" alt="" />
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">add_a_photo</span>
                            <span className="text-[9px] font-black text-slate-400">{lang === 'ar' ? 'اضغط للرفع' : 'Click to upload'}</span>
                          </>
                        )}
                      </div>
                      <input
                        ref={(el) => { marketFileInputRefs.current[post.id] = el; }}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleMarketFileChange(post.id, e)}
                      />
                    </div>
                  </div>
                ))}

                {/* Add Another Post Button */}
                <button
                  type="button"
                  onClick={addMarketPost}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 dark:bg-primary/10 text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-all font-black text-sm flex items-center justify-center gap-2 active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  {lang === 'ar' ? 'إضافة طلب آخر' : 'Add Another Request'}
                </button>
              </form>
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0 flex gap-3">
              <button
                type="button"
                onClick={() => { setIsCreateModalOpen(false); resetCreatePostForm(); if (activeTab === 'create') setActiveTab('all'); }}
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

      {/* Delete Confirmation Modal */}
      {postToDelete && (
        <div className={`fixed inset-0 z-[600] ${MODAL_OVERLAY_BASE_CLASS}`} onClick={() => !isDeleting && setPostToDelete(null)}>
          <div className={`${MODAL_PANEL_BASE_CLASS} md:max-w-sm`} onClick={(e) => e.stopPropagation()}>
            <div
              className="md:hidden pt-3 pb-2 flex justify-center shrink-0 cursor-grab active:cursor-grabbing"
              onTouchStart={(e) => handleMobileSheetDrag(e, () => { if (!isDeleting) setPostToDelete(null); })}
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
            </div>
            <div className="p-8 text-center">
              <div className="size-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl">warning</span>
              </div>
              <h3 className="text-xl md:text-2xl font-black mb-2">{lang === 'ar' ? 'حذف الطلب؟' : 'Delete Request?'}</h3>
              <p className="text-sm md:text-base text-slate-500 font-bold mb-8">
                {lang === 'ar' ? 'هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع.' : 'Are you sure you want to delete this request? This action cannot be undone.'}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setPostToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3.5 bg-slate-100 rounded-xl font-black text-slate-500 hover:bg-slate-200 transition-all text-[10px] md:text-xs"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={async () => {
                    if (!postToDelete) return;
                    setIsDeleting(true);
                    try {
                      await api.delete(`/api/v1/raw-material-advance/${postToDelete.id}`);
                      await fetchData(currentPage, activeTab, pageSize);
                      setPostToDelete(null);
                    } catch (err) {
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  disabled={isDeleting}
                  className="flex-1 py-3.5 bg-red-600 text-white rounded-xl font-black shadow-lg hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center text-[10px] md:text-xs"
                >
                  {isDeleting ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Offer Modal */}
      {offerPost && (
        <div className={`fixed inset-0 z-[600] ${MODAL_OVERLAY_BASE_CLASS}`} onClick={() => !isSubmittingOffer && setOfferPost(null)}>
          <div className={`${MODAL_PANEL_BASE_CLASS} md:max-w-md`} onClick={(e) => e.stopPropagation()}>
            <div
              className="md:hidden pt-3 pb-2 flex justify-center shrink-0 cursor-grab active:cursor-grabbing"
              onTouchStart={(e) => handleMobileSheetDrag(e, () => { if (!isSubmittingOffer) setOfferPost(null); })}
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
            </div>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-2xl">sell</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">
                    {lang === 'ar' ? 'تقديم عرض' : 'Submit Offer'}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 mt-2">{offerPost.materialName}</p>
                </div>
              </div>
              <button onClick={() => !isSubmittingOffer && setOfferPost(null)} className="size-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FloatingLabelInput
                  required
                  type="number"
                  label={lang === 'ar' ? 'السعر' : 'Price'}
                  min={0.01}
                  step={0.01}
                  value={offerPrice}
                  onChange={(e) => setOfferPrice((e.target as HTMLInputElement).value)}
                  isRtl={lang === 'ar'}
                />
                <FloatingLabelInput
                  required
                  type="number"
                  label={lang === 'ar' ? 'الكمية المتاحة' : 'Available Quantity'}
                  min={0.01}
                  step={0.01}
                  value={offerQty}
                  onChange={(e) => setOfferQty((e.target as HTMLInputElement).value)}
                  isRtl={lang === 'ar'}
                />
              </div>
              <FloatingLabelInput
                type="text"
                label={lang === 'ar' ? 'معلومات الشحن' : 'Shipping Info'}
                value={offerShip}
                onChange={(e) => setOfferShip((e.target as HTMLInputElement).value)}
                isRtl={lang === 'ar'}
              />
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'موعد التسليم' : 'Estimated Delivery'}</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200"
                  value={offerDelivery}
                  onChange={(e) => setOfferDelivery(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200"
                  value={offerNotes}
                  onChange={(e) => setOfferNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0 flex gap-3">
              <button
                type="button"
                onClick={() => !isSubmittingOffer && setOfferPost(null)}
                className="flex-1 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isSubmittingOffer}
                onClick={async () => {
                  if (!offerPost) return;
                  const price = Number(offerPrice);
                  const qty = Number(offerQty);
                  if (!price || price <= 0 || !qty || qty <= 0) {
                    showToast(lang === 'ar' ? 'أدخل سعراً وكمية صحيحة' : 'Enter valid price and quantity', 'warning');
                    return;
                  }
                  setIsSubmittingOffer(true);
                  try {
                    const payload: any = {
                      price,
                      availableQuantity: qty,
                      shippingInfo: offerShip || null,
                      estimatedDelivery: offerDelivery ? offerDelivery : null,
                      notes: offerNotes || null
                    };
                    await api.post(`/api/v1/raw-material-advance/${offerPost.id}/offers`, payload);
                    showToast(lang === 'ar' ? 'تم إرسال العرض بنجاح' : 'Offer submitted successfully', 'success');
                    setOfferPost(null);
                    await fetchData(currentPage, activeTab, pageSize);
                  } catch (err: any) {
                    showToast(err?.message || (lang === 'ar' ? 'فشل إرسال العرض' : 'Failed to submit offer'), 'error');
                  } finally {
                    setIsSubmittingOffer(false);
                  }
                }}
                className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isSubmittingOffer ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (lang === 'ar' ? 'تقديم العرض' : 'Submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Confirmation Modal */}
      {postToClose && (
        <div className={`fixed inset-0 z-[600] ${MODAL_OVERLAY_BASE_CLASS}`} onClick={() => !isClosing && setPostToClose(null)}>
          <div className={`${MODAL_PANEL_BASE_CLASS} md:max-w-sm`} onClick={(e) => e.stopPropagation()}>
            <div
              className="md:hidden pt-3 pb-2 flex justify-center shrink-0 cursor-grab active:cursor-grabbing"
              onTouchStart={(e) => handleMobileSheetDrag(e, () => { if (!isClosing) setPostToClose(null); })}
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
            </div>
            <div className="p-8 text-center">
              <div className="size-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl">lock</span>
              </div>
              <h3 className="text-xl md:text-2xl font-black mb-2">{lang === 'ar' ? 'إغلاق الطلب؟' : 'Close Request?'}</h3>
              <p className="text-sm md:text-base text-slate-500 font-bold mb-8">
                {lang === 'ar' ? 'لن يتلقى الطلب مزيداً من العروض بعد الإغلاق.' : 'The request will stop receiving offers after closing.'}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setPostToClose(null)}
                  disabled={isClosing}
                  className="flex-1 py-3.5 bg-slate-100 rounded-xl font-black text-slate-500 hover:bg-slate-200 transition-all text-[10px] md:text-xs"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={async () => {
                    if (!postToClose) return;
                    setIsClosing(true);
                    try {
                      await api.put(`/api/v1/clients-special-orders/${postToClose.id}/close`, {});
                      showToast(lang === 'ar' ? 'تم إغلاق الطلب' : 'Request closed', 'success');
                      await fetchData(currentPage, activeTab, pageSize);
                      setPostToClose(null);
                    } catch (err: any) {
                      showToast(err?.message || (lang === 'ar' ? 'فشل إغلاق الطلب' : 'Failed to close request'), 'error');
                    } finally {
                      setIsClosing(false);
                    }
                  }}
                  disabled={isClosing}
                  className="flex-1 py-3.5 bg-amber-600 text-white rounded-xl font-black shadow-lg hover:bg-amber-700 transition-all active:scale-95 flex items-center justify-center text-[10px] md:text-xs"
                >
                  {isClosing ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (lang === 'ar' ? 'تأكيد الإغلاق' : 'Confirm Close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Offers Modal */}
      {viewOffersPost && (
        <div className={`fixed inset-0 z-[650] ${MODAL_OVERLAY_BASE_CLASS}`} onClick={() => !isResponding && setViewOffersPost(null)}>
          <div className={`${MODAL_PANEL_BASE_CLASS} md:max-w-xl`} onClick={(e) => e.stopPropagation()}>
            <div
              className="md:hidden pt-3 pb-2 flex justify-center shrink-0 cursor-grab active:cursor-grabbing"
              onTouchStart={(e) => handleMobileSheetDrag(e, () => { if (!isResponding) setViewOffersPost(null); })}
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
            </div>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center">
                  <span className="material-symbols-outlined">local_offer</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'عروض السعر' : 'Offers'}</h3>
                  <p className="text-[10px] font-black text-slate-500">{viewOffersPost.materialName}</p>
                </div>
              </div>
              <button onClick={() => !isResponding && setViewOffersPost(null)} className="size-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {isLoadingOffers ? (
                <div className="py-16 flex items-center justify-center">
                  <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                </div>
              ) : !viewOffersData || viewOffersData.length === 0 ? (
                <EmptyState title={lang === 'ar' ? 'لا توجد عروض' : 'No offers yet'} />
              ) : (
                viewOffersData.map((offer: any) => {
                  const isCreator = viewOffersPost?.createdById === currentUserId;
                  const isMyOffer = offer.offeredById === currentUserId;
                  const responded = offer.accepted !== null && offer.accepted !== undefined;
                  const offerStatusBadge = responded
                    ? offer.accepted
                      ? { txt: lang === 'ar' ? 'تم القبول' : 'Accepted', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' }
                      : { txt: lang === 'ar' ? 'مرفوض' : 'Rejected', cls: 'bg-red-50 text-red-600 border-red-200' }
                    : null;
                  return (
                    <div key={offer.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {offer.offeredByOrganizationName || offer.offeredByName || (lang === 'ar' ? 'مورد' : 'Supplier')}
                            </span>
                            {isMyOffer && (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-200">
                                {lang === 'ar' ? 'عرضي' : 'My Offer'}
                              </span>
                            )}
                            {offerStatusBadge && (
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${offerStatusBadge.cls}`}>
                                {offerStatusBadge.txt}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div>
                              <p className="text-[10px] font-black text-slate-500">{lang === 'ar' ? 'السعر' : 'Price'}</p>
                              <p className="text-sm font-black text-slate-800 dark:text-slate-100">{offer.price} EGP</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-500">{lang === 'ar' ? 'الكمية المتاحة' : 'Available Qty'}</p>
                              <p className="text-sm font-black text-slate-800 dark:text-slate-100">{offer.availableQuantity}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-500">{lang === 'ar' ? 'التسليم' : 'Delivery'}</p>
                              <p className="text-sm font-black text-slate-800 dark:text-slate-100">{offer.estimatedDelivery || '-'}</p>
                            </div>
                          </div>
                          {offer.shippingInfo && (
                            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-2 break-words">{offer.shippingInfo}</p>
                          )}
                          {offer.notes && (
                            <p className="text-[11px] font-bold text-slate-500 mt-1 italic break-words">{offer.notes}</p>
                          )}
                          {responded && (
                            <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-2.5">
                              <p className="text-[10px] font-black text-slate-500">{lang === 'ar' ? 'رد صاحب الطلب' : 'Customer Response'}</p>
                              {!!offer.responseMessage && (
                                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mt-0.5 break-words">{offer.responseMessage}</p>
                              )}
                              {!!offer.respondedAt && (
                                <p className="text-[10px] font-bold text-slate-400 mt-1">
                                  {(lang === 'ar' ? 'في' : 'At') + ' ' + new Date(offer.respondedAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          {isCreator && !responded ? (
                            <>
                              <button
                                onClick={() => { setRespondOfferId(offer.id); setRespondAccept(true); }}
                                disabled={isResponding}
                                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 active:scale-95"
                              >
                                {lang === 'ar' ? 'قبول' : 'Accept'}
                              </button>
                              <button
                                onClick={() => { setRespondOfferId(offer.id); setRespondAccept(false); }}
                                disabled={isResponding}
                                className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-black hover:bg-red-700 active:scale-95"
                              >
                                {lang === 'ar' ? 'رفض' : 'Reject'}
                              </button>
                            </>
                          ) : isMyOffer ? (
                            <>
                              <button
                                onClick={() => {
                                  setOfferPost(viewOffersPost);
                                  setOfferPrice(String(offer.price || ''));
                                  setOfferQty(String(offer.availableQuantity || ''));
                                  setOfferShip(offer.shippingInfo || '');
                                  setOfferDelivery(offer.estimatedDelivery || '');
                                  setOfferNotes(offer.notes || '');
                                }}
                                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-black hover:bg-slate-50 dark:hover:bg-slate-800"
                              >
                                {lang === 'ar' ? 'تعديل عرضي' : 'Edit Offer'}
                              </button>
                              <button
                                onClick={() => {
                                  showToast(lang === 'ar' ? 'لا توجد واجهة لإلغاء العرض حالياً' : 'Canceling offer is not supported yet', 'warning');
                                }}
                                className="px-3 py-2 rounded-lg border border-red-300 text-red-600 text-xs font-black hover:bg-red-50"
                              >
                                {lang === 'ar' ? 'إلغاء عرضي' : 'Cancel Offer'}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {(viewOffersPost?.createdById === currentUserId && respondOfferId !== null && respondAccept !== null) && (
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'رسالة للمورد (اختياري)' : 'Message to supplier (optional)'}</label>
                  <textarea
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200"
                    value={respondMsg}
                    onChange={(e) => setRespondMsg(e.target.value)}
                  />
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => { setRespondOfferId(null); setRespondAccept(null); setRespondMsg(''); }}
                      disabled={isResponding}
                      className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {lang === 'ar' ? 'رجوع' : 'Back'}
                    </button>
                    <button
                      onClick={async () => {
                        if (!viewOffersPost || !respondOfferId || respondAccept === null) return;
                        setIsResponding(true);
                        try {
                          await api.post(`/api/v1/raw-material-advance/offers/respond?privateOrderId=${viewOffersPost.id}&offerId=${respondOfferId}`, {
                            accepted: respondAccept,
                            responseMessage: respondMsg || null
                          });
                          showToast(lang === 'ar' ? 'تم إرسال الرد بنجاح' : 'Response submitted', 'success');
                          const data = await api.get<any>(`/api/v1/clients-special-orders/${viewOffersPost.id}`);
                          setViewOffersData(data?.offers || []);
                          setRespondOfferId(null);
                          setRespondAccept(null);
                          setRespondMsg('');
                        } catch (err: any) {
                          showToast(err?.message || (lang === 'ar' ? 'فشل إرسال الرد' : 'Failed to submit response'), 'error');
                        } finally {
                          setIsResponding(false);
                        }
                      }}
                      disabled={isResponding}
                      className="flex-1 py-3 rounded-xl bg-primary text-white font-black hover:bg-slate-900 dark:hover:bg-slate-800 disabled:opacity-50"
                    >
                      {isResponding ? (lang === 'ar' ? 'جارٍ الإرسال...' : 'Submitting...') : (respondAccept ? (lang === 'ar' ? 'تأكيد القبول' : 'Confirm Accept') : (lang === 'ar' ? 'تأكيد الرفض' : 'Confirm Reject'))}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketRequests;
