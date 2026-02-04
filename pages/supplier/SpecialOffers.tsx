import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { PlanFeaturesEnum } from '../../types';
import { hasFeature } from '../../utils/subscription';
import { useToast } from '../../contexts/ToastContext';
import PaginationFooter from '../../components/PaginationFooter';

interface SpecialOffer {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  discountPercentage: number;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  image?: string;
}

const SpecialOffers: React.FC = () => {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFeatureAccess, setHasFeatureAccess] = useState<boolean | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<SpecialOffer | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 12;

  const [formData, setFormData] = useState({
    productId: '',
    discountPercentage: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    checkFeature();
  }, []);

  useEffect(() => {
    if (hasFeatureAccess === true) {
      fetchOffers();
      fetchProducts();
    }
  }, [hasFeatureAccess, currentPage]);

  const checkFeature = async () => {
    try {
      const hasAccess = await hasFeature(PlanFeaturesEnum.SUPPLIER_SPECIAL_OFFERS);
      setHasFeatureAccess(hasAccess);
    } catch (err) {
      setHasFeatureAccess(false);
    }
  };

  const fetchOffers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<any>(`/api/v1/special-offers/my-offers?page=${currentPage}&size=${pageSize}`);
      setOffers(response.content || []);
      setTotalPages(response.totalPages || 0);
    } catch (err: any) {
      showToast(err.message || 'Failed to load offers', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      const supplierId = userData?.userInfo?.id || userData?.id;
      
      const filterPayload = { 
        supplierId: supplierId,
        name: null,
        origin: null,
        categoryId: null,
        subCategoryId: null
      };
      
      const data = await api.post<any>(`/api/v1/product/filter?page=0&size=1000`, filterPayload);
      setProducts(data.content || []);
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        productId: formData.productId,
        discountPercentage: parseFloat(formData.discountPercentage),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      };

      if (editingOffer) {
        await api.put(`/api/v1/special-offers/${editingOffer.id}`, payload);
        showToast(lang === 'ar' ? 'تم تحديث العرض بنجاح' : 'Offer updated successfully', 'success');
      } else {
        await api.post('/api/v1/special-offers', payload);
        showToast(lang === 'ar' ? 'تم إنشاء العرض بنجاح' : 'Offer created successfully', 'success');
      }

      setIsModalOpen(false);
      setEditingOffer(null);
      setFormData({ productId: '', discountPercentage: '', startDate: '', endDate: '' });
      fetchOffers();
    } catch (err: any) {
      showToast(err.message || (lang === 'ar' ? 'فشل في حفظ العرض' : 'Failed to save offer'), 'error');
    }
  };

  const handleEdit = (offer: SpecialOffer) => {
    setEditingOffer(offer);
    setFormData({
      productId: offer.productId,
      discountPercentage: offer.discountPercentage.toString(),
      startDate: offer.startDate.split('T')[0],
      endDate: offer.endDate.split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (offerId: string) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا العرض؟' : 'Are you sure you want to delete this offer?')) {
      return;
    }
    try {
      await api.delete(`/api/v1/special-offers/${offerId}`);
      showToast(lang === 'ar' ? 'تم حذف العرض بنجاح' : 'Offer deleted successfully', 'success');
      fetchOffers();
    } catch (err: any) {
      showToast(err.message || (lang === 'ar' ? 'فشل في حذف العرض' : 'Failed to delete offer'), 'error');
    }
  };

  if (hasFeatureAccess === null) {
    return (
      <div className="mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-6 animate-in fade-in duration-700 font-display">
        <div className="flex flex-col items-center justify-center py-40">
          <div className="size-10 border-[3px] border-primary/10 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-slate-400 font-black text-[10px] md:text-xs opacity-50">Loading...</p>
        </div>
      </div>
    );
  }

  if (hasFeatureAccess === false) {
    return (
      <div className="mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-6 animate-in fade-in duration-700 font-display">
        <div className="flex flex-col items-center justify-center py-40 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-red-100 dark:border-red-900/20 shadow-xl">
          <div className="size-20 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-500 mb-6">
            <span className="material-symbols-outlined text-5xl">lock</span>
          </div>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-4">
            {lang === 'ar' ? 'الميزة غير متوفرة' : 'Feature Not Available'}
          </h3>
          <p className="text-base text-slate-600 dark:text-slate-400 mb-8 text-center max-w-md font-bold">
            {lang === 'ar' 
              ? 'هذه الميزة غير متوفرة في خطتك الحالية. يرجى ترقية اشتراكك للوصول إلى العروض الخاصة.'
              : 'This feature is not available in your current plan. Please upgrade your subscription to access special offers.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-6 animate-in fade-in duration-700 font-display">
      <div className="flex items-center justify-end mb-6">
        <button
          onClick={() => {
            setEditingOffer(null);
            setFormData({ productId: '', discountPercentage: '', startDate: '', endDate: '' });
            setIsModalOpen(true);
          }}
          className="hidden md:flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-primary/90 transition-all"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          {lang === 'ar' ? 'إضافة عرض' : 'Add Offer'}
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">local_offer</span>
          <p className="text-slate-500 font-bold">{lang === 'ar' ? 'لا توجد عروض خاصة' : 'No special offers yet'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((offer) => (
            <div key={offer.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
              {offer.productImage && (
                <img src={offer.productImage} alt={offer.productName} className="w-full h-40 object-cover rounded-xl mb-4" />
              )}
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{offer.productName}</h3>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-black text-primary">{offer.discountPercentage}%</span>
                <span className="text-xs text-slate-500 font-bold">
                  {lang === 'ar' ? 'خصم' : 'OFF'}
                </span>
              </div>
              <div className="space-y-2 mb-4 text-xs text-slate-500 font-bold">
                <div className="flex justify-between">
                  <span>{lang === 'ar' ? 'من' : 'From'}:</span>
                  <span>{new Date(offer.startDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{lang === 'ar' ? 'إلى' : 'To'}:</span>
                  <span>{new Date(offer.endDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(offer)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-black text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  {lang === 'ar' ? 'تعديل' : 'Edit'}
                </button>
                <button
                  onClick={() => handleDelete(offer.id)}
                  className="flex-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg font-black text-xs hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                >
                  {lang === 'ar' ? 'حذف' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PaginationFooter
        currentPage={currentPage}
        totalPages={totalPages}
        totalElements={totalPages * pageSize}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        currentCount={offers.length}
      />

      {/* Add/Edit Offer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-500 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-2xl">local_offer</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">
                    {editingOffer ? (lang === 'ar' ? 'تعديل العرض' : 'Edit Offer') : (lang === 'ar' ? 'إضافة عرض' : 'Add Offer')}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">
                    {lang === 'ar' ? 'الخصم والتواريخ' : 'Discount & dates'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="size-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <form id="offerForm" onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase px-1">{lang === 'ar' ? 'المنتج' : 'Product'}</label>
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    required
                    disabled={!!editingOffer}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm md:text-base font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                  >
                    <option value="">{lang === 'ar' ? 'اختر المنتج' : 'Select Product'}</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase px-1">{lang === 'ar' ? 'نسبة الخصم (%)' : 'Discount Percentage (%)'}</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="0.1"
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm md:text-base font-bold placeholder:text-xs md:placeholder:text-sm placeholder:font-medium focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase px-1">{lang === 'ar' ? 'تاريخ البدء' : 'Start Date'}</label>
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm md:text-base font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase px-1">{lang === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}</label>
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm md:text-base font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                  />
                </div>
              </form>
            </div>
            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0 flex gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button form="offerForm" type="submit" className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3">
                {editingOffer ? (lang === 'ar' ? 'تحديث' : 'Update') : (lang === 'ar' ? 'إنشاء' : 'Create')}
                <span className="material-symbols-outlined">verified</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button - Mobile only */}
      <div className="fixed bottom-32 left-0 right-0 z-[130] pointer-events-none px-6 md:hidden">
        <div className="max-w-[1200px] mx-auto flex flex-col items-start gap-3 pointer-events-auto">
          <button 
            onClick={() => {
              setEditingOffer(null);
              setFormData({ productId: '', discountPercentage: '', startDate: '', endDate: '' });
              setIsModalOpen(true);
            }}
            className="size-14 rounded-full bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center active:scale-90 transition-all border-2 border-white/20"
            title={lang === 'ar' ? 'إضافة عرض' : 'Add Offer'}
          >
            <span className="material-symbols-outlined text-2xl">add</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpecialOffers;
