import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { PlanFeaturesEnum } from '../../types';
import { hasFeature } from '../../utils/subscription';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import PaginationFooter from '../../components/PaginationFooter';

interface SpecialOffer {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierOrganizationName?: string;
  productId: string;
  productName: string;
  productImage?: string;
  discountPercentage: number;
  startDate: string;
  endDate: string;
  active: boolean;
}

const ViewSpecialOffers: React.FC = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFeatureAccess, setHasFeatureAccess] = useState<boolean | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 12;

  useEffect(() => {
    checkFeature();
  }, []);

  useEffect(() => {
    if (hasFeatureAccess === true) {
      fetchOffers();
    }
  }, [hasFeatureAccess, currentPage]);

  const checkFeature = async () => {
    try {
      const hasAccess = await hasFeature(PlanFeaturesEnum.CUSTOMER_VIEW_SUPPLIER_OFFERS);
      setHasFeatureAccess(hasAccess);
    } catch (err) {
      setHasFeatureAccess(false);
    }
  };

  const fetchOffers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<any>(`/api/v1/special-offers/active?page=${currentPage}&size=${pageSize}`);
      setOffers(response.content || []);
      setTotalPages(response.totalPages || 0);
    } catch (err: any) {
      showToast(err.message || 'Failed to load offers', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = async (offer: SpecialOffer) => {
    try {
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      const userId = userData?.userInfo?.id || userData?.id;
      if (!userId) {
        showToast(lang === 'ar' ? 'يجب تسجيل الدخول' : 'Please login', 'error');
        return;
      }

      // Add product to cart with special offer flag
      await api.post(`/api/v1/cart/add-item?userId=${userId}&productId=${offer.productId}&quantity=1&specialOfferId=${offer.id}`, {});
      showToast(lang === 'ar' ? 'تم إضافة المنتج للعربة' : 'Product added to cart', 'success');
    } catch (err: any) {
      showToast(err.message || (lang === 'ar' ? 'فشل في إضافة المنتج' : 'Failed to add product'), 'error');
    }
  };

  const handleCreateOrder = async (offer: SpecialOffer) => {
    try {
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      const userId = userData?.userInfo?.id || userData?.id;
      if (!userId) {
        showToast(lang === 'ar' ? 'يجب تسجيل الدخول' : 'Please login', 'error');
        return;
      }

      // Create order directly with special offer
      const payload = {
        userId: userId,
        items: [{
          id: offer.productId,
          name: offer.productName,
          origin: '',
          supplierId: offer.supplierId,
          supplierName: offer.supplierName,
          inStock: true,
          quantity: 1,
          image: offer.productImage,
          specialOfferId: offer.id // Flag for special offer
        }],
        specialOfferId: offer.id // Add specialOfferId at order level
      };

      await api.post('/api/v1/rfq', payload);
      showToast(lang === 'ar' ? 'تم إنشاء الطلب بنجاح' : 'Order created successfully', 'success');
      navigate('/orders');
    } catch (err: any) {
      showToast(err.message || (lang === 'ar' ? 'فشل في إنشاء الطلب' : 'Failed to create order'), 'error');
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
              ? 'هذه الميزة غير متوفرة في خطتك الحالية. يرجى ترقية اشتراكك للوصول إلى العروض الخاصة للموردين.'
              : 'This feature is not available in your current plan. Please upgrade your subscription to view supplier special offers.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-6 animate-in fade-in duration-700 font-display">
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 animate-pulse">
              <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">local_offer</span>
          <p className="text-slate-500 font-bold">{lang === 'ar' ? 'لا توجد عروض خاصة متاحة حالياً' : 'No special offers available at the moment'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((offer) => (
            <div key={offer.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 hover:shadow-lg transition-all">
              {offer.productImage && (
                <img src={offer.productImage} alt={offer.productName} className="w-full h-40 object-cover rounded-xl mb-4" />
              )}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex-1">{offer.productName}</h3>
                <span className="bg-primary/10 text-primary px-2 py-1 rounded-lg text-xs font-black">
                  {offer.discountPercentage}% {lang === 'ar' ? 'OFF' : 'OFF'}
                </span>
              </div>
              {offer.supplierOrganizationName && (
                <p className="text-sm text-slate-500 font-bold mb-4">{offer.supplierOrganizationName}</p>
              )}
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
                  onClick={() => handleAddToCart(offer)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-black text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">shopping_cart</span>
                  {lang === 'ar' ? 'عربة' : 'Cart'}
                </button>
                <button
                  onClick={() => handleCreateOrder(offer)}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg font-black text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">receipt_long</span>
                  {lang === 'ar' ? 'طلب' : 'Order'}
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
    </div>
  );
};

export default ViewSpecialOffers;
