
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { Category, CategoryExtraField, SubCategory, UserSubscription } from '../../types';
import Dropdown from '../../components/Dropdown';
import { getCountryOptions, getCountryName } from '../../utils/countries';
import EmptyState from '../../components/EmptyState';
import PaginationFooter from '../../components/PaginationFooter';
import { clearSubscriptionCache } from '../../utils/subscription';
import { APP_LOGO } from '../../constants';

interface Product {
  id: string;
  name: string;
  origin: string;
  image: string;
  inStock: boolean;
  stockQuantity: number;
  supplierId: string;
  supplierName?: string;
  category?: { id: string; name: string; arabicName: string };
  subCategory?: { id: string | null; name: string; arabicName: string };
  unit?: string;
  productionDate?: string;
  expirationDate?: string;
  extraFieldValues?: Record<string, string>;
}

interface Supplier {
  id: string;
  name: string;
  profileImage: string | null;
  organizationName: string | null;
  category?: { id: string; name: string; arabicName: string };
}

interface PaginatedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
}

interface CartItem {
  id: string;
  name: string;
  quantity: number;
}

interface CartData {
  items: CartItem[];
}

const INITIAL_PAGE_SIZE = 10;

const ProductSearch: React.FC = () => {
  const { lang, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (lang === 'ar') {
        return date.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
      }
      return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return dateString;
    }
  };
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);

  const [selectedCat, setSelectedCat] = useState('');
  const [selectedSub, setSelectedSub] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchOrigin, setSearchOrigin] = useState('');

  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(INITIAL_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [cartItems, setCartItems] = useState<Record<string, number>>({});
  const [localQtys, setLocalQtys] = useState<Record<string, number>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [showBuySearchesFromApi, setShowBuySearchesFromApi] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const fetchInProgressRef = useRef(false);
  const lastFetchKeyRef = useRef<string>('');
  const filtersJustChangedRef = useRef(false);

  // Manual Order State - Multiple Orders Support
  interface ManualOrderItem {
    id: string; // unique id for each order item
    supplierId: string;
    name: string;
    origin: string;
    quantity: number;
    unit: string;
    image: string;
    categoryId: string;
    subCategoryId: string;
    subCategories: SubCategory[];
    categoryExtraFields: CategoryExtraField[];
    extraFieldValues: Record<string, string>;
    file: File | null;
    preview: string | null;
  }

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualOrders, setManualOrders] = useState<ManualOrderItem[]>([]);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const manualFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Add Searches (partial renewal) popup
  const [addSearchesModalOpen, setAddSearchesModalOpen] = useState(false);
  const [addSearchesCount, setAddSearchesCount] = useState(50);
  const [addSearchesPrice, setAddSearchesPrice] = useState<number | null>(null);
  const [addSearchesPriceLoading, setAddSearchesPriceLoading] = useState(false);
  const [addSearchesFile, setAddSearchesFile] = useState<File | null>(null);
  const [addSearchesFilePreview, setAddSearchesFilePreview] = useState<string | null>(null);
  const [addSearchesSubmitting, setAddSearchesSubmitting] = useState(false);
  const [addSearchesSuccess, setAddSearchesSuccess] = useState(false);
  const [addSearchesError, setAddSearchesError] = useState<string | null>(null);

  // Handle Initial Supplier from Navigation (Advertisements)
  useEffect(() => {
    if (location.state?.initialSupplierId) {
      setSelectedSupplier(location.state.initialSupplierId);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    fetchCategories();
    fetchSuppliersList();
    fetchCart();
    fetchMySubscription();

    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedCat) fetchSubCategories(selectedCat);
    else {
      setSubCategories([]);
      setSelectedSub('');
    }
  }, [selectedCat]);

  useEffect(() => {
    if (!selectedSupplier || !selectedCat) return;
    const isAllowed = getCategoriesForSupplier(selectedSupplier).some(c => c.id === selectedCat);
    if (!isAllowed) {
      setSelectedCat('');
      setSelectedSub('');
    }
  }, [selectedSupplier, selectedCat, suppliersList, categories]);

  // When filters change, reset to first page and mark so fetch runs once with page 0
  useEffect(() => {
    filtersJustChangedRef.current = true;
    setPage(0);
  }, [selectedCat, selectedSub, selectedSupplier, searchName, searchOrigin]);

  // Single useEffect: one place that triggers filter API (no duplicate calls)
  useEffect(() => {
    const usePage = filtersJustChangedRef.current ? 0 : page;
    if (filtersJustChangedRef.current) filtersJustChangedRef.current = false;

    const fetchKey = `${usePage}-${pageSize}-${selectedCat}-${selectedSub}-${selectedSupplier}-${searchName}-${searchOrigin}`;
    if (lastFetchKeyRef.current === fetchKey) return;
    lastFetchKeyRef.current = fetchKey;

    if (fetchInProgressRef.current) return;
    fetchInProgressRef.current = true;

    const payload = {
      name: searchName || null,
      origin: searchOrigin || null,
      categoryId: selectedCat || null,
      subCategoryId: selectedSub || null,
      supplierId: selectedSupplier || null,
    };
    setIsLoading(true);
    api
      .post<PaginatedResponse<Product>>(`/api/v1/product/filter?page=${usePage}&size=${pageSize}`, payload)
      .then((response) => {
        setResults(response.content || []);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
        const qtys: Record<string, number> = {};
        (response.content || []).forEach((p) => {
          if (!cartItems[p.id]) qtys[p.id] = 1;
        });
        setLocalQtys((prev) => ({ ...prev, ...qtys }));
      })
      .catch((err: any) => {
        if (err?.errorCode === '518') {
          setShowBuySearchesFromApi(true);
          fetchMySubscription();
        } else {
          const msg = err?.message || '';
          if (msg.includes(NO_SEARCHES_MSG) || msg.toLowerCase().includes('no searches') || msg.toLowerCase().includes('no points')) {
            setToast({ message: t.productSearch.noSearchesOrPoints, type: 'error' });
          }
        }
        setResults([]);
      })
      .finally(() => {
        setIsLoading(false);
        fetchInProgressRef.current = false;
      });
  }, [page, pageSize, selectedCat, selectedSub, selectedSupplier, searchName, searchOrigin]);

  const fetchCart = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      const userId = userData?.userInfo?.id || userData?.id;
      if (!userId) return;
      const data = await api.get<CartData>(`/api/v1/cart/${userId}`);
      const map: Record<string, number> = {};
      data.items.forEach(i => map[i.id] = i.quantity);
      setCartItems(map);
    } catch (e) { }
  };

  const fetchMySubscription = async () => {
    try {
      const data = await api.get<UserSubscription>('/api/v1/user-subscriptions/my-subscription');
      setSubscription(data);
    } catch (e) {
      setSubscription(null);
    }
  };

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
    if (addSearchesModalOpen && subscription && subscription.remainingSearches != null && subscription.status === 'APPROVED' && addSearchesCount >= 1) {
      fetchAddSearchesPrice();
    } else if (!addSearchesModalOpen) {
      setAddSearchesPrice(null);
      setAddSearchesError(null);
    }
  }, [addSearchesModalOpen, addSearchesCount, subscription?.id, subscription?.status]);

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
      await fetchMySubscription();
      setShowBuySearchesFromApi(false);
      setAddSearchesFile(null);
      setAddSearchesFilePreview(null);
    } catch (err: any) {
      setAddSearchesError(err?.message || (lang === 'ar' ? 'فشل إرسال الطلب' : 'Submission failed'));
    } finally {
      setAddSearchesSubmitting(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await api.get<Category[]>('/api/v1/category/all');
      setCategories(data || []);
    } catch (e) { }
  };

  const fetchSuppliersList = async () => {
    try {
      const data = await api.get<Supplier[]>('/api/v1/user/suppliers-list');
      setSuppliersList(data || []);
    } catch (e) { }
  };

  const fetchSubCategories = async (catId: string) => {
    try {
      const data = await api.get<SubCategory[]>(`/api/v1/category/sub-category?categoryId=${catId}`);
      setSubCategories(data || []);
    } catch (e) { }
  };

  const NO_SEARCHES_MSG = 'NO_SEARCHES_OR_POINTS_AVAILABLE';

  const getCategoriesForSupplier = (supplierId: string) => {
    const supplier = suppliersList.find(s => s.id === supplierId);
    if (!supplier?.category?.id) return categories;
    return categories.filter(c => c.id === supplier.category?.id);
  };

  const categoryOptionsForSearch = selectedSupplier ? getCategoriesForSupplier(selectedSupplier) : categories;

  const fetchProducts = async (pageNum: number, sizeNum: number) => {
    setIsLoading(true);
    try {
      const payload = {
        name: searchName || null,
        origin: searchOrigin || null,
        categoryId: selectedCat || null,
        subCategoryId: selectedSub || null,
        supplierId: selectedSupplier || null,
      };
      const response = await api.post<PaginatedResponse<Product>>(`/api/v1/product/filter?page=${pageNum}&size=${sizeNum}`, payload);
      setResults(response.content || []);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
      const qtys: Record<string, number> = {};
      response.content.forEach(p => { if (!cartItems[p.id]) qtys[p.id] = 1; });
      setLocalQtys(prev => ({ ...prev, ...qtys }));
      await fetchMySubscription();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes(NO_SEARCHES_MSG) || msg.toLowerCase().includes('no searches') || msg.toLowerCase().includes('no points')) {
        setToast({ message: t.productSearch.noSearchesOrPoints, type: 'error' });
      }
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = async (productId: string, qtyOverride?: number) => {
    const userStr = localStorage.getItem('user');
    const userData = userStr ? JSON.parse(userStr) : null;
    const userId = userData?.userInfo?.id || userData?.id;
    if (!userId) return;

    const qty = qtyOverride !== undefined ? qtyOverride : (localQtys[productId] || 1);
    setProcessingId(productId);
    try {
      await api.post(`/api/v1/cart/add-item?userId=${userId}&productId=${productId}&quantity=${qty}`, {});
      await fetchCart();
      setToast({ message: lang === 'ar' ? ' تم تحديث عربة التسوق' : 'Cart updated', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (e) { } finally {
      setProcessingId(null);
    }
  };

  const updateLocalQty = (id: string, delta: number) => {
    setLocalQtys(prev => ({ ...prev, [id]: Math.max(1, (prev[id] || 1) + delta) }));
  };

  const handleQtyChange = (productId: string, value: string) => {
    const numValue = parseInt(value) || 1;
    const validQty = Math.max(1, numValue);
    setLocalQtys(prev => ({ ...prev, [productId]: validQty }));
  };

  const resetFilters = () => {
    setSelectedCat('');
    setSelectedSub('');
    setSelectedSupplier('');
    setSearchName('');
    setSearchOrigin('');
    setPage(0);
  };

  const createNewManualOrder = (): ManualOrderItem => ({
    id: `order-${Date.now()}-${Math.random()}`,
    supplierId: '',
    name: '',
    origin: '',
    quantity: 1,
    unit: '',
    image: '',
    categoryId: '',
    subCategoryId: '',
    subCategories: [],
    categoryExtraFields: [],
    extraFieldValues: {},
    file: null,
    preview: null
  });

  const handleManualFileChange = (orderId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setManualOrders(prev => prev.map(order =>
          order.id === orderId
            ? { ...order, file, preview: reader.result as string }
            : order
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  const addManualOrder = () => {
    setManualOrders(prev => [...prev, createNewManualOrder()]);
  };

  const removeManualOrder = (orderId: string) => {
    setManualOrders(prev => prev.filter(order => order.id !== orderId));
    // Clean up ref
    delete manualFileInputRefs.current[orderId];
  };

  const openManualModal = () => {
    setManualOrders([createNewManualOrder()]);
    setIsManualModalOpen(true);
  };

  const buildManualExtraFieldValues = (extraFields: CategoryExtraField[], extraFieldValues: Record<string, string>) => {
    const values: Record<string, string> = {};
    if (extraFields.some(f => f.key === 'dimensions')) {
      const length = (extraFieldValues.dimensions_length || '').trim();
      const width = (extraFieldValues.dimensions_width || '').trim();
      const height = (extraFieldValues.dimensions_height || '').trim();
      if (length) values.dimensions_length = length;
      if (width) values.dimensions_width = width;
      if (height) values.dimensions_height = height;
    }
    if (extraFields.some(f => f.key === 'note')) {
      const note = (extraFieldValues.note || '').trim();
      if (note) values.note = note;
    }
    if (extraFields.some(f => f.key === 'serviceName')) {
      const v = (extraFieldValues.serviceName || '').trim();
      if (v) values.serviceName = v;
    }
    if (extraFields.some(f => f.key === 'colorCount')) {
      const v = (extraFieldValues.colorCount || '').trim();
      if (v) values.colorCount = v;
    }
    if (extraFields.some(f => f.key === 'paperSize')) {
      const v = (extraFieldValues.paperSize || '').trim();
      if (v) values.paperSize = v;
    }
    return values;
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all orders have supplier selected
    const ordersWithoutSupplier = manualOrders.filter(order => !order.supplierId);
    if (ordersWithoutSupplier.length > 0) {
      setToast({ message: lang === 'ar' ? 'يرجى اختيار المورد لجميع الطلبات' : 'Please select a supplier for all orders', type: 'error' });
      return;
    }

    const userStr = localStorage.getItem('user');
    const userData = userStr ? JSON.parse(userStr) : null;
    const userId = userData?.userInfo?.id || userData?.id;
    if (!userId) return;

    setIsSubmittingManual(true);
    try {
      // Process all orders and upload images
      const items = await Promise.all(manualOrders.map(async (order) => {
        let imageUrl = '';
        if (order.file) {
          const formData = new FormData();
          formData.append('file', order.file);
          imageUrl = await api.post<string>('/api/v1/image/upload', formData);
        }

        const selectedVendor = suppliersList.find(s => s.id === order.supplierId);
        const productName = (order.categoryExtraFields.some(f => f.key === 'serviceName') && (order.extraFieldValues.serviceName || '').trim())
          ? (order.extraFieldValues.serviceName || '').trim()
          : order.name;

        return {
          id: null,
          name: productName,
          origin: order.origin,
          supplierId: order.supplierId,
          supplierName: selectedVendor?.organizationName || selectedVendor?.name || 'Manual Vendor',
          inStock: true,
          quantity: order.quantity,
          unit: order.unit || null,
          image: imageUrl || null,
          categoryId: order.categoryId || null,
          subCategoryId: order.subCategoryId || null,
          extraFieldValues: buildManualExtraFieldValues(order.categoryExtraFields, order.extraFieldValues)
        };
      }));

      const payload = {
        userId: userId,
        items
      };

      await api.post('/api/v1/rfq', payload);
      setToast({ message: t.manualOrder.success, type: 'success' });
      setIsManualModalOpen(false);
      setManualOrders([]);
      manualFileInputRefs.current = {};
    } catch (err: any) {
      setToast({ message: err.message || 'Submission failed', type: 'error' });
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const activeFiltersCount = [selectedCat, selectedSub, selectedSupplier, searchName, searchOrigin].filter(Boolean).length;

  // Helper function to get categories for a specific supplier
  const getCategoriesForManualOrder = (supplierId: string) => {
    if (!supplierId) return categories;
    const supplier = suppliersList.find(s => s.id === supplierId);
    if (!supplier?.category?.id) return categories;
    return categories.filter(c => c.id === supplier.category?.id);
  };

  const remainingSearches = subscription?.remainingSearches ?? null;
  const pointsEarned = subscription?.points ?? subscription?.pointsEarned ?? null;
  const isCustomerWithSearches = remainingSearches !== null;
  const lowSearches = isCustomerWithSearches && remainingSearches !== undefined && remainingSearches <= 5 && (pointsEarned ?? 0) <= 5;
  const noSearchesLeft = isCustomerWithSearches && (remainingSearches ?? 0) === 0 && (pointsEarned ?? 0) === 0;
  const showNoSearchesBanner = noSearchesLeft || showBuySearchesFromApi;

  // Reset "buy searches" banner when subscription has credit again (e.g. after buying more)
  useEffect(() => {
    if (subscription && ((subscription.remainingSearches ?? 0) > 0 || (subscription.points ?? subscription.pointsEarned ?? 0) > 0)) {
      setShowBuySearchesFromApi(false);
    }
  }, [subscription]);

  return (
    <div className="w-full py-6 flex flex-col gap-6 font-display animate-in fade-in slide-in-from-bottom-4 duration-700 pb-40 md:pb-8 relative">

      {/* Web: Inline filters + Manual Order at top — hidden on mobile */}
      <div className="hidden md:block rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[180px] flex-1 max-w-[240px] space-y-1">
            <label className="text-[10px] font-black text-slate-500 px-1 block">{lang === 'ar' ? 'بحث بالاسم' : 'Search by name'}</label>
            <input type="text" value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder={t.productSearch.searchLabel} className="w-full min-h-[42px] bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold placeholder:text-[10px] placeholder:font-medium outline-none focus:border-primary transition-all text-slate-900 dark:text-white" />
          </div>
          <div className="min-w-[160px] space-y-1">
            <label className="text-[10px] font-black text-slate-500 px-1 block">{t.products.category}</label>
            <Dropdown options={categoryOptionsForSearch.map(c => ({ value: c.id, label: lang === 'ar' ? (c.arabicName || '') : (c.name || '') }))} value={selectedCat} onChange={setSelectedCat} placeholder={lang === 'ar' ? 'الفئات' : 'Categories'} isRtl={lang === 'ar'} showClear={true} triggerClassName="w-full min-h-[42px] flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-2.5 text-xs font-bold outline-none focus:border-primary transition-all text-slate-900 dark:text-white cursor-pointer text-start" />
          </div>
          <div className="min-w-[160px] space-y-1">
            <label className="text-[10px] font-black text-slate-500 px-1 block">{t.products.subCategory}</label>
            <Dropdown options={subCategories.map(s => ({ value: s.id, label: lang === 'ar' ? (s.arabicName || '') : (s.name || '') }))} value={selectedSub} onChange={setSelectedSub} placeholder={lang === 'ar' ? 'الأنواع' : 'Types'} disabled={!selectedCat} isRtl={lang === 'ar'} showClear={true} triggerClassName="w-full min-h-[42px] flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-2.5 text-xs font-bold outline-none focus:border-primary transition-all disabled:opacity-30 text-slate-900 dark:text-white cursor-pointer text-start disabled:cursor-not-allowed" />
          </div>
          <div className="min-w-[160px] space-y-1">
            <label className="text-[10px] font-black text-slate-500 px-1 block">{lang === 'ar' ? 'المورد' : 'Supplier'}</label>
            <Dropdown options={suppliersList.map(s => ({ value: s.id, label: s.organizationName || s.name || '' }))} value={selectedSupplier} onChange={setSelectedSupplier} placeholder={lang === 'ar' ? 'الموردين' : 'Suppliers'} isRtl={lang === 'ar'} showClear={true} triggerClassName="w-full min-h-[42px] flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-2.5 text-xs font-bold outline-none focus:border-primary transition-all text-slate-900 dark:text-white cursor-pointer text-start" />
          </div>
          {/* Temporarily hidden country filter */}
          {/* <div className="min-w-[180px] flex-1 space-y-1">
            <label className="text-[10px] font-black text-slate-500 px-1 block">{t.products.origin}</label>
            <Dropdown options={getCountryOptions(lang)} value={searchOrigin} onChange={(v) => setSearchOrigin(v)} placeholder={t.products.originPlaceholder} isRtl={lang === 'ar'} searchable searchPlaceholder={lang === 'ar' ? 'ابحث عن الدولة...' : 'Search country...'} noResultsText={lang === 'ar' ? 'لا توجد نتائج' : 'No results'} showClear triggerClassName="w-full min-h-[42px] bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-primary transition-all text-slate-900 dark:text-white" />
          </div> */}
          <button
            type="button"
            onClick={resetFilters}
            className="shrink-0 self-end min-h-[42px] px-3 rounded-full bg-primary/10 text-primary border border-primary/30 hover:border-primary hover:bg-primary/15 transition-all active:scale-95 flex items-center justify-center"
            title={t.products.clearAll}
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
          <button
            type="button"
            onClick={openManualModal}
            className="shrink-0 self-end min-h-[42px] px-5 rounded-xl bg-primary/10 text-primary font-black text-[12px] border border-primary/30 hover:border-primary hover:bg-primary/15 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">edit_document</span>
            <span>{lang === 'ar' ? 'طلب يدوي' : 'Manual Order'}</span>
          </button>
        </div>
      </div>

      {showNoSearchesBanner && (
        <div className="flex flex-wrap items-center gap-4 p-5 rounded-2xl border-2 border-primary/30 bg-primary/5 dark:bg-primary/10">
          <span className="material-symbols-outlined text-primary text-4xl">search_off</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'عمليات البحث خلصت' : 'No searches left'}</h3>
            <p className="text-[12px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">{lang === 'ar' ? 'يمكنك شراء عمليات بحث إضافية (تجديد جزئي) — اضغط لفتح اشتراكك الحالي وإضافة رصيد.' : 'You can buy more searches (partial renewal) — open your current subscription to add credit.'}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setAddSearchesSuccess(false);
              setAddSearchesError(null);
              setAddSearchesModalOpen(true);
              fetchMySubscription();
            }}
            className="px-5 py-3 rounded-xl bg-primary text-white font-black text-sm shadow-lg hover:bg-primary/90 active:scale-95 flex items-center gap-2 shrink-0"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            {lang === 'ar' ? 'شراء عمليات بحث' : 'Buy more searches'}
          </button>
        </div>
      )}

      {/* Add Searches popup: current subscription + partial renewal */}
      {addSearchesModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setAddSearchesModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl shadow-2xl max-w-lg w-full md:max-w-lg max-h-[90vh] overflow-y-auto border-t border-x md:border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="md:hidden pt-3 pb-1 flex justify-center shrink-0 cursor-grab active:cursor-grabbing" onTouchStart={(e) => {
              const startY = e.touches[0].clientY;
              const modal = e.currentTarget.parentElement as HTMLElement;
              if (!modal) return;
              const handleMove = (moveEvent: TouchEvent) => {
                const currentY = moveEvent.touches[0].clientY;
                const diff = currentY - startY;
                if (diff > 0) {
                  modal.style.transform = `translateY(${diff}px)`;
                  modal.style.transition = 'none';
                }
              };
              const handleEnd = () => {
                const finalY = modal.getBoundingClientRect().top;
                if (finalY > window.innerHeight * 0.3) {
                  setAddSearchesModalOpen(false);
                } else {
                  modal.style.transform = '';
                  modal.style.transition = '';
                }
                document.removeEventListener('touchmove', handleMove);
                document.removeEventListener('touchend', handleEnd);
              };
              document.addEventListener('touchmove', handleMove);
              document.addEventListener('touchend', handleEnd);
            }}>
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
            </div>
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'اشتراكك الحالي — شراء عمليات بحث' : 'Your subscription — Buy more searches'}</h2>
              <button type="button" onClick={() => setAddSearchesModalOpen(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Current subscription summary */}
              {subscription && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 mb-2">{lang === 'ar' ? 'الاشتراك الحالي' : 'Current subscription'}</h3>
                  <div className="flex flex-wrap gap-4 text-[12px] font-bold">
                    <span className="text-slate-600 dark:text-slate-400">{subscription.planName}</span>
                    {subscription.remainingSearches != null && (
                      <span>{lang === 'ar' ? 'عمليات بحث متبقية:' : 'Remaining searches:'} <strong className="text-primary">{subscription.remainingSearches}</strong></span>
                    )}
                    <span>{lang === 'ar' ? 'النقاط:' : 'Points:'} <strong className="text-accent">{(subscription as any).points ?? subscription.pointsEarned ?? 0}</strong></span>
                    <span className={subscription.status === 'APPROVED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}>{subscription.status}</span>
                  </div>
                </div>
              )}

              {/* Partial renewal — add searches */}
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 rounded-xl border border-primary/20 p-4">
                <h3 className="text-base font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'شراء عمليات بحث إضافية' : 'Buy more searches'}</h3>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{lang === 'ar' ? 'تجديد جزئي — أضف عمليات بحث لاشتراكك الحالي وادفع الفرق' : 'Partial renewal — add searches to your current subscription and pay the difference'}</p>
                {addSearchesSuccess ? (
                  <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm font-bold">
                    {lang === 'ar' ? 'تم إرسال طلبك. سيتم مراجعته من الإدارة وتفعيل عمليات البحث بعد التأكد من الدفع.' : 'Request submitted. It will be reviewed by admin and searches will be added after payment verification.'}
                  </div>
                ) : (
                  <>
                    <div className="mt-4 space-y-2">
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
                    <div className="mt-4 space-y-2">
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
                    <div className="mt-4 flex items-center gap-3 flex-wrap">
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
        </div>
      )}
      {isCustomerWithSearches && !showNoSearchesBanner && (
        <div className={`flex flex-wrap items-center gap-4 p-4 rounded-2xl border ${lowSearches ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'}`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">search</span>
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{lang === 'ar' ? 'عمليات البحث المتبقية:' : 'Remaining searches:'}</span>
            <span className="text-lg font-black tabular-nums text-primary">{remainingSearches}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-accent text-xl">stars</span>
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{lang === 'ar' ? 'النقاط:' : 'Points:'}</span>
            <span className="text-lg font-black tabular-nums text-accent">{pointsEarned ?? 0}</span>
          </div>
          {lowSearches && (
            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 w-full">
              {lang === 'ar' ? 'عمليات البحث أو النقاط منخفضة. ' : 'Searches or points are low. '}
              <button type="button" onClick={() => { setAddSearchesSuccess(false); setAddSearchesError(null); setAddSearchesModalOpen(true); fetchMySubscription(); }} className="underline font-black hover:text-primary">{lang === 'ar' ? 'شراء عمليات بحث' : 'Buy more searches'}</button>
            </p>
          )}
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-32 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-xl shadow-2xl font-black text-sm animate-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>
          {toast.message}
        </div>
      )}

      {/* Main Content Area */}
      <div className="min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="size-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-[13px] font-black text-slate-500 animate-pulse">{t.common.synchronizing}</p>
          </div>
        ) : (
          <>
            {results.length === 0 ? (
              <EmptyState title={t.productSearch.empty} subtitle={t.productSearch.refine} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-5">
                {results.map((product, idx) => {
                  const isInCart = !!cartItems[product.id];
                  const cartQty = cartItems[product.id] || 0;
                  const isReallyInStock = product.inStock && product.stockQuantity > 0;

                  return (
                    <div
                      key={product.id}
                      className={`group relative rounded-3xl p-4 md:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] border transition-all duration-300 bg-gradient-to-br from-white to-slate-50/60 dark:from-slate-900 dark:to-slate-950 flex gap-4 md:gap-5 items-center hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(15,23,42,0.25)] ${isInCart ? 'border-primary/60 ring-2 ring-primary/10' : 'border-slate-100 dark:border-slate-800'}`}
                      style={{ animationDelay: `${idx * 20}ms` }}
                    >
                      {/* Product Image - compact badge style */}
                      <div className="relative size-20 md:size-24 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0 shadow-inner border border-slate-100/70 dark:border-slate-700/70">
                        {product.image ? (
                          <img
                            src={product.image}
                            className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
                            alt={product.name}
                          />
                        ) : (
                          <img src={APP_LOGO} alt="" className="size-full object-contain p-2" />
                        )}

                        <div className="absolute top-2 left-2">
                          <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black shadow-sm backdrop-blur bg-white/80 dark:bg-slate-900/80 ${isReallyInStock ? 'text-emerald-600' : 'text-red-500'}`}>
                            <span className={`size-2 rounded-full ${isReallyInStock ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <span>{isReallyInStock ? (lang === 'ar' ? 'متوفر' : 'In stock') : (lang === 'ar' ? 'غير متوفر' : 'Out of stock')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Product Details - Horizontal Style */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-1">
                        <div>
                          <h4 className="text-sm md:text-base font-black text-slate-900 dark:text-white line-clamp-1 leading-tight">
                            {product.name}
                          </h4>

                          {/* Metadata Row */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-slate-400">
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <span className="material-symbols-outlined text-[18px] text-primary/60">category</span>
                              <span className="text-[11px] font-bold truncate max-w-[200px]">
                                {lang === 'ar'
                                  ? `${product.category?.arabicName || ''} > ${product.subCategory?.arabicName || ''}`
                                  : `${product.category?.name || ''} > ${product.subCategory?.name || ''}`
                                }
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <span className="material-symbols-outlined text-[18px] text-primary/60">public</span>
                              <span className="text-[11px] font-bold tabular-nums">{getCountryName(product.origin, lang)}</span>
                            </div>
                            {product.unit && (
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <span className="material-symbols-outlined text-[18px] text-primary/60">straighten</span>
                                <span className="text-[11px] font-bold">{product.unit}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <span className="material-symbols-outlined text-[16px] text-primary/60">calendar_today</span>
                              <span className="text-[10px] font-bold">{lang === 'ar' ? 'إنتاج:' : 'Prod:'} {product.productionDate ? formatDate(product.productionDate) : 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <span className="material-symbols-outlined text-[16px] text-primary/60">event_available</span>
                              <span className="text-[10px] font-bold">{lang === 'ar' ? 'انتهاء:' : 'Exp:'} {product.expirationDate ? formatDate(product.expirationDate) : 'N/A'}</span>
                            </div>
                          </div>

                          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                            <span className="material-symbols-outlined text-[14px] text-primary/40 shrink-0">store</span>
                            <span className="truncate">{product.supplierName || 'Supplier'}</span>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
                          {/* Single Line Stock Quantity Display */}
                          <div className="flex items-center gap-1 text-primary">
                            <span className="text-[11px] font-black">{lang === 'ar' ? 'متوفر :' : 'Available :'}</span>
                            <span className="text-lg font-black tabular-nums">{product.stockQuantity}</span>
                            {product.unit && (
                              <span className="text-[11px] font-black">{product.unit}</span>
                            )}
                            {!product.unit && (
                              <span className="text-[11px] font-black">{lang === 'ar' ? 'وحدة' : 'Units'}</span>
                            )}
                          </div>

                          {/* Action Area */}
                          <div className="flex items-center gap-2">
                            {isInCart ? (
                              <div className="flex items-center bg-emerald-500/10 dark:bg-emerald-500/5 p-1 rounded-xl border border-emerald-500/20 animate-in zoom-in-95">
                                <button
                                  onClick={() => handleAddToCart(product.id, cartItems[product.id] - 1)}
                                  disabled={processingId === product.id}
                                  className="size-7 rounded-lg bg-white dark:bg-slate-700 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center shadow-sm disabled:opacity-30"
                                >
                                  <span className="material-symbols-outlined text-sm">remove</span>
                                </button>
                                <div className="flex items-center gap-1 px-2">
                                  <input
                                    type="number"
                                    min="1"
                                    value={cartQty}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 1;
                                      handleAddToCart(product.id, Math.max(1, val));
                                    }}
                                    onBlur={(e) => {
                                      const val = parseInt(e.target.value) || 1;
                                      handleAddToCart(product.id, Math.max(1, val));
                                    }}
                                    disabled={processingId === product.id}
                                    className="w-12 text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums text-center bg-transparent border-none outline-none focus:ring-0 disabled:opacity-30"
                                  />
                                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                    {product.unit || (lang === 'ar' ? 'وحدة' : 'Units')}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleAddToCart(product.id, cartItems[product.id] + 1)}
                                  disabled={processingId === product.id}
                                  className="size-7 rounded-lg bg-white dark:bg-slate-700 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center shadow-sm disabled:opacity-30"
                                >
                                  <span className="material-symbols-outlined text-sm">add</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
                                  <button
                                    onClick={() => updateLocalQty(product.id, -1)}
                                    className="size-7 rounded-lg bg-white dark:bg-slate-700 text-slate-500 hover:text-primary transition-all flex items-center justify-center shadow-sm"
                                  >
                                    <span className="material-symbols-outlined text-sm">remove</span>
                                  </button>
                                  <div className="flex items-center gap-1 px-2">
                                    <input
                                      type="number"
                                      min="1"
                                      value={localQtys[product.id] || 1}
                                      onChange={(e) => handleQtyChange(product.id, e.target.value)}
                                      onBlur={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        handleQtyChange(product.id, Math.max(1, val).toString());
                                      }}
                                      className="w-12 text-sm font-black text-slate-800 dark:text-white tabular-nums text-center bg-transparent border-none outline-none focus:ring-0"
                                    />
                                    <span className="text-sm font-black text-slate-800 dark:text-white">
                                      {product.unit || (lang === 'ar' ? 'وحدة' : 'Units')}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => updateLocalQty(product.id, 1)}
                                    className="size-7 rounded-lg bg-white dark:bg-slate-700 text-slate-500 hover:text-primary transition-all flex items-center justify-center shadow-sm"
                                  >
                                    <span className="material-symbols-outlined text-sm">add</span>
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleAddToCart(product.id)}
                                  disabled={processingId === product.id || !isReallyInStock}
                                  className="size-9 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95 flex items-center justify-center disabled:grayscale disabled:opacity-50"
                                >
                                  {processingId === product.id ? (
                                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                  ) : (
                                    <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Action Buttons Area — mobile only */}
      <div className="fixed bottom-32 left-0 right-0 z-[130] pointer-events-none px-6 md:hidden">
        <div className="w-full flex flex-col items-end gap-3 pointer-events-auto">
          <button
            onClick={openManualModal}
            className="size-14 rounded-full bg-primary/10 text-primary shadow-2xl shadow-primary/20 flex items-center justify-center active:scale-90 transition-all border border-primary/30"
            title={t.manualOrder.btn}
          >
            <span className="material-symbols-outlined text-2xl">edit_document</span>
          </button>

          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`size-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 border-2 ${activeFiltersCount > 0
                ? 'bg-primary text-white border-white/20'
                : 'bg-slate-900 text-white border-white/10'
                }`}
              title={lang === 'ar' ? 'تصفية' : 'Filters'}
            >
              <span className="material-symbols-outlined text-2xl">tune</span>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white size-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-slate-900 shadow-md">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {showFilters && (
              <div className={`absolute bottom-full mb-4 z-[250] w-[320px] sm:w-[450px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in slide-in-from-bottom-2 duration-200 ${lang === 'ar' ? 'left-0' : 'right-0'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black  text-slate-900 dark:text-white">{lang === 'ar' ? 'تصفية السوق' : 'Market Filters'}</h3>
                  <button onClick={resetFilters} className="text-[10px] font-black text-primary hover:underline">{lang === 'ar' ? 'مسح الكل' : 'Clear All'}</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Dropdown label={t.products.category} options={categoryOptionsForSearch.map(c => ({ value: c.id, label: lang === 'ar' ? (c.arabicName || '') : (c.name || '') }))} value={selectedCat} onChange={setSelectedCat} placeholder={lang === 'ar' ? 'الفئات' : 'Categories'} isRtl={lang === 'ar'} wrapperClassName="space-y-1" triggerClassName="w-full min-h-[42px] flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-2.5 text-xs font-bold outline-none focus:border-primary transition-all text-slate-900 dark:text-white cursor-pointer text-start" />
                  </div>

                  <div className="space-y-1.5">
                    <Dropdown label={t.products.subCategory} options={subCategories.map(s => ({ value: s.id, label: lang === 'ar' ? (s.arabicName || '') : (s.name || '') }))} value={selectedSub} onChange={setSelectedSub} placeholder={lang === 'ar' ? 'الأنواع' : 'Types'} disabled={!selectedCat} isRtl={lang === 'ar'} wrapperClassName="space-y-1" triggerClassName="w-full min-h-[42px] flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-2.5 text-xs font-bold outline-none focus:border-primary transition-all disabled:opacity-30 text-slate-900 dark:text-white cursor-pointer text-start disabled:cursor-not-allowed" />
                  </div>

                  <div className="space-y-1.5">
                    <Dropdown label={lang === 'ar' ? 'المورد' : 'Supplier'} options={suppliersList.map(s => ({ value: s.id, label: s.organizationName || s.name || '' }))} value={selectedSupplier} onChange={setSelectedSupplier} placeholder={lang === 'ar' ? 'الموردين' : 'Suppliers'} isRtl={lang === 'ar'} wrapperClassName="space-y-1" triggerClassName="w-full min-h-[42px] flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-2.5 text-xs font-bold outline-none focus:border-primary transition-all text-slate-900 dark:text-white cursor-pointer text-start" />
                  </div>

                  {/* Temporarily hidden country filter */}
                  {/* <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 px-1">{lang === 'ar' ? 'المنشأ' : 'Origin'}</label>
                      <Dropdown options={getCountryOptions(lang)} value={searchOrigin} onChange={(v) => setSearchOrigin(v)} placeholder={t.products.originPlaceholder} isRtl={lang === 'ar'} searchable searchPlaceholder={lang === 'ar' ? 'ابحث عن الدولة...' : 'Search country...'} noResultsText={lang === 'ar' ? 'لا توجد نتائج' : 'No results'} showClear triggerClassName="w-full min-h-[42px] bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-primary transition-all text-slate-900 dark:text-white cursor-pointer text-start" />
                  </div> */}
                </div>

                <div className="mt-6 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 px-1">{lang === 'ar' ? 'اسم المادة' : 'Product Search'}</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg">search</span>
                    <input
                      type="text" value={searchName} onChange={(e) => setSearchName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm md:text-base font-bold outline-none focus:border-primary transition-all shadow-inner text-slate-900 dark:text-white placeholder:text-xs md:placeholder:text-sm placeholder:font-medium"
                      placeholder={t.productSearch.searchLabel}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Order Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full md:w-[90%] md:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-xl shadow-2xl border-t border-x md:border border-primary/20 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 flex flex-col max-h-[90vh]">

            {/* Drag Handle - Mobile Only */}
            <div className="md:hidden pt-3 pb-2 flex justify-center shrink-0 cursor-grab active:cursor-grabbing" onTouchStart={(e) => {
              const startY = e.touches[0].clientY;
              const modal = e.currentTarget.closest('.fixed')?.querySelector('.w-full') as HTMLElement;
              if (!modal) return;

              const handleMove = (moveEvent: TouchEvent) => {
                const currentY = moveEvent.touches[0].clientY;
                const diff = currentY - startY;
                if (diff > 0) {
                  modal.style.transform = `translateY(${diff}px)`;
                  modal.style.transition = 'none';
                }
              };

              const handleEnd = () => {
                const finalY = modal.getBoundingClientRect().top;
                if (finalY > window.innerHeight * 0.3) {
                  setIsManualModalOpen(false);
                } else {
                  modal.style.transform = '';
                  modal.style.transition = '';
                }
                document.removeEventListener('touchmove', handleMove);
                document.removeEventListener('touchend', handleEnd);
              };

              document.addEventListener('touchmove', handleMove);
              document.addEventListener('touchend', handleEnd);
            }}>
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
            </div>

            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-2xl">edit_document</span></div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">{t.manualOrder.title}</h3>
                  <p className="text-[10px] font-black text-slate-400  mt-2 ">{t.manualOrder.subtitle}</p>
                </div>
              </div>
              <button onClick={() => setIsManualModalOpen(false)} className="size-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-xl">close</span></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <form id="manualProductSearchForm" onSubmit={handleManualSubmit} className="space-y-6">
                {manualOrders.map((order, index) => {
                  const categoryOptionsForOrder = order.supplierId ? getCategoriesForManualOrder(order.supplierId) : categories;
                  return (
                    <div key={order.id} className="space-y-5 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30">
                      {/* Order Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                        <h4 className="text-sm font-black text-slate-700 dark:text-slate-300">
                          {lang === 'ar' ? `طلب ${index + 1}` : `Order ${index + 1}`}
                        </h4>
                        {manualOrders.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeManualOrder(order.id)}
                            className="size-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex items-center justify-center active:scale-95"
                            title={lang === 'ar' ? 'حذف الطلب' : 'Remove Order'}
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        )}
                      </div>

                      {/* Supplier Selection */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 px-1">{t.manualOrder.selectSupplier}</label>
                        <Dropdown
                          options={suppliersList.map(s => ({ value: s.id, label: s.organizationName || s.name || '' }))}
                          value={order.supplierId}
                          onChange={(v) => {
                            setManualOrders(prev => prev.map(o => {
                              if (o.id === order.id) {
                                if (v) {
                                  const categoryOptions = getCategoriesForManualOrder(v);
                                  return {
                                    ...o,
                                    supplierId: v,
                                    categoryId: '',
                                    subCategoryId: '',
                                    subCategories: [],
                                    categoryExtraFields: [],
                                    extraFieldValues: {}
                                  };
                                }
                                return { ...o, supplierId: v, categoryId: '', subCategoryId: '', subCategories: [], categoryExtraFields: [], extraFieldValues: {} };
                              }
                              return o;
                            }));
                          }}
                          placeholder={lang === 'ar' ? 'اختر المورد من القائمة' : 'Select a Supplier'}
                          isRtl={lang === 'ar'}
                          triggerClassName="w-full min-h-[44px] flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 border-primary/10 bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white cursor-pointer text-start"
                        />
                      </div>

                      {/* Category & SubCategory */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-500 px-1">{t.products.category}</label>
                          <Dropdown
                            options={categoryOptionsForOrder.map(c => ({ value: c.id, label: lang === 'ar' ? (c.arabicName || '') : (c.name || '') }))}
                            value={order.categoryId}
                            onChange={(value) => {
                              const category = categories.find(c => c.id === value);
                              setManualOrders(prev => prev.map(o => {
                                if (o.id === order.id) {
                                  if (value) {
                                    api.get<SubCategory[]>(`/api/v1/category/sub-category?categoryId=${value}`)
                                      .then((data) => {
                                        setManualOrders(prevOrders => prevOrders.map(ord =>
                                          ord.id === order.id ? { ...ord, subCategories: data || [] } : ord
                                        ));
                                      })
                                      .catch(() => {
                                        setManualOrders(prevOrders => prevOrders.map(ord =>
                                          ord.id === order.id ? { ...ord, subCategories: [] } : ord
                                        ));
                                      });
                                  }
                                  return {
                                    ...o,
                                    categoryId: value,
                                    subCategoryId: '',
                                    categoryExtraFields: category?.extraFields || [],
                                    extraFieldValues: {}
                                  };
                                }
                                return o;
                              }));
                            }}
                            placeholder={t.products.selectCategory}
                            disabled={!order.supplierId}
                            isRtl={lang === 'ar'}
                            triggerClassName="w-full min-h-[44px] flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 border-primary/10 bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white cursor-pointer text-start disabled:opacity-40 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-500 px-1">{t.products.subCategory}</label>
                          <Dropdown
                            options={order.subCategories.map(s => ({ value: s.id, label: lang === 'ar' ? (s.arabicName || '') : (s.name || '') }))}
                            value={order.subCategoryId}
                            onChange={(value) => setManualOrders(prev => prev.map(o => o.id === order.id ? { ...o, subCategoryId: value } : o))}
                            placeholder={t.products.selectSubCategory}
                            disabled={!order.categoryId}
                            isRtl={lang === 'ar'}
                            triggerClassName="w-full min-h-[44px] flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 border-primary/10 bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white cursor-pointer text-start disabled:opacity-40 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                      {/* Extra Fields */}
                      {order.categoryExtraFields.length > 0 && (
                        <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4">
                          {order.categoryExtraFields.some(field => field.key === 'serviceName') && (
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'اسم الخدمة' : 'Service Name'}</label>
                              <input
                                type="text"
                                value={order.extraFieldValues.serviceName || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setManualOrders(prev => prev.map(o =>
                                    o.id === order.id
                                      ? { ...o, extraFieldValues: { ...o.extraFieldValues, serviceName: val }, name: val }
                                      : o
                                  ));
                                }}
                                placeholder={lang === 'ar' ? 'أدخل اسم الخدمة' : 'Enter service name'}
                                className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-white dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                              />
                            </div>
                          )}
                          {order.categoryExtraFields.some(field => field.key === 'dimensions') && (
                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'الابعاد (طول/عرض/ارتفاع)' : 'Dimensions (L/W/H)'}</label>
                              <div className="grid grid-cols-3 gap-2">
                                <input
                                  type="text"
                                  value={order.extraFieldValues.dimensions_length || ''}
                                  onChange={(e) => setManualOrders(prev => prev.map(o =>
                                    o.id === order.id
                                      ? { ...o, extraFieldValues: { ...o.extraFieldValues, dimensions_length: e.target.value } }
                                      : o
                                  ))}
                                  placeholder={lang === 'ar' ? 'طول' : 'Length'}
                                  className="w-full px-3 py-2 rounded-xl border-2 border-primary/10 bg-white dark:bg-slate-800 text-xs font-bold focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                />
                                <input
                                  type="text"
                                  value={order.extraFieldValues.dimensions_width || ''}
                                  onChange={(e) => setManualOrders(prev => prev.map(o =>
                                    o.id === order.id
                                      ? { ...o, extraFieldValues: { ...o.extraFieldValues, dimensions_width: e.target.value } }
                                      : o
                                  ))}
                                  placeholder={lang === 'ar' ? 'عرض' : 'Width'}
                                  className="w-full px-3 py-2 rounded-xl border-2 border-primary/10 bg-white dark:bg-slate-800 text-xs font-bold focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                />
                                <input
                                  type="text"
                                  value={order.extraFieldValues.dimensions_height || ''}
                                  onChange={(e) => setManualOrders(prev => prev.map(o =>
                                    o.id === order.id
                                      ? { ...o, extraFieldValues: { ...o.extraFieldValues, dimensions_height: e.target.value } }
                                      : o
                                  ))}
                                  placeholder={lang === 'ar' ? 'ارتفاع' : 'Height'}
                                  className="w-full px-3 py-2 rounded-xl border-2 border-primary/10 bg-white dark:bg-slate-800 text-xs font-bold focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                />
                              </div>
                            </div>
                          )}
                          {order.categoryExtraFields.some(field => field.key === 'note') && (
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'ملاحظة' : 'Note'}</label>
                              <textarea
                                value={order.extraFieldValues.note || ''}
                                onChange={(e) => setManualOrders(prev => prev.map(o =>
                                  o.id === order.id
                                    ? { ...o, extraFieldValues: { ...o.extraFieldValues, note: e.target.value } }
                                    : o
                                ))}
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-white dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                placeholder={lang === 'ar' ? 'اكتب ملاحظات إضافية...' : 'Write additional notes...'}
                              />
                            </div>
                          )}
                          {order.categoryExtraFields.some(field => field.key === 'colorCount') && (
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'عدد الألوان' : 'Color Count'}</label>
                              <input
                                type="text"
                                value={order.extraFieldValues.colorCount || ''}
                                onChange={(e) => setManualOrders(prev => prev.map(o =>
                                  o.id === order.id
                                    ? { ...o, extraFieldValues: { ...o.extraFieldValues, colorCount: e.target.value } }
                                    : o
                                ))}
                                placeholder={lang === 'ar' ? 'أدخل عدد الألوان' : 'Enter color count'}
                                className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-white dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                              />
                            </div>
                          )}
                          {order.categoryExtraFields.some(field => field.key === 'paperSize') && (
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'حجم الورق' : 'Paper Size'}</label>
                              <input
                                type="text"
                                value={order.extraFieldValues.paperSize || ''}
                                onChange={(e) => setManualOrders(prev => prev.map(o =>
                                  o.id === order.id
                                    ? { ...o, extraFieldValues: { ...o.extraFieldValues, paperSize: e.target.value } }
                                    : o
                                ))}
                                placeholder={lang === 'ar' ? 'أدخل حجم الورق' : 'Enter paper size'}
                                className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-white dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Product Name */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 px-1">{t.manualOrder.prodName}</label>
                        <input
                          required
                          type="text"
                          value={order.name}
                          onChange={(e) => setManualOrders(prev => prev.map(o => o.id === order.id ? { ...o, name: e.target.value } : o))}
                          className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-slate-50 dark:bg-slate-800 text-sm md:text-base font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white placeholder:text-xs md:placeholder:text-sm placeholder:font-medium"
                          placeholder={t.manualOrder.prodNamePlaceholder}
                        />
                      </div>

                      {/* Origin & Quantity */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-500 px-1">{t.manualOrder.origin}</label>
                          <Dropdown
                            options={getCountryOptions(lang)}
                            value={order.origin}
                            onChange={(v) => setManualOrders(prev => prev.map(o => o.id === order.id ? { ...o, origin: v } : o))}
                            placeholder={t.products.originPlaceholder}
                            isRtl={lang === 'ar'}
                            searchable
                            searchPlaceholder={lang === 'ar' ? 'ابحث عن الدولة...' : 'Search country...'}
                            noResultsText={lang === 'ar' ? 'لا توجد نتائج' : 'No results'}
                            showClear={false}
                            triggerClassName="w-full min-h-[44px] px-4 py-3 rounded-xl border-2 border-primary/10 bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white cursor-pointer text-start"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-500 px-1">{t.manualOrder.qty}</label>
                          <input
                            required
                            type="number"
                            min="1"
                            value={order.quantity}
                            onChange={(e) => setManualOrders(prev => prev.map(o => o.id === order.id ? { ...o, quantity: parseInt(e.target.value) || 1 } : o))}
                            className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Unit */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'الوحدة' : 'Unit'}</label>
                        <input
                          required
                          type="text"
                          value={order.unit}
                          onChange={(e) => setManualOrders(prev => prev.map(o => o.id === order.id ? { ...o, unit: e.target.value } : o))}
                          placeholder={lang === 'ar' ? 'مثال: كيلو / طن / قطعة / كرتونة' : 'e.g. kg / ton / piece / carton'}
                          className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-slate-50 dark:bg-slate-800 text-sm md:text-base font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white placeholder:text-xs md:placeholder:text-sm placeholder:font-medium"
                        />
                      </div>

                      {/* Image */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 px-1">{t.manualOrder.image}</label>
                        <div
                          onClick={() => manualFileInputRefs.current[order.id]?.click()}
                          className={`h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${order.preview ? 'border-primary' : 'border-primary/20 hover:border-primary bg-slate-50/50 dark:bg-slate-800/50'}`}
                        >
                          {order.preview ? (
                            <img src={order.preview} className="size-full object-cover" alt="" />
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">add_a_photo</span>
                              <span className="text-[9px] font-black text-slate-400">{t.common.clickToUpload}</span>
                            </>
                          )}
                        </div>
                        <input
                          ref={(el) => { manualFileInputRefs.current[order.id] = el; }}
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => handleManualFileChange(order.id, e)}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Add Another Order Button */}
                <button
                  type="button"
                  onClick={addManualOrder}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 dark:bg-primary/10 text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-all font-black text-sm flex items-center justify-center gap-2 active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  {lang === 'ar' ? 'إضافة طلب آخر' : 'Add Another Order'}
                </button>
              </form>
            </div>

            <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
              <button
                form="manualProductSearchForm"
                type="submit"
                disabled={isSubmittingManual}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm  shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSubmittingManual ? (
                  <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    {t.manualOrder.submit}
                    <span className="material-symbols-outlined">send</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      <PaginationFooter
        currentPage={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={pageSize}
        onPageChange={setPage}
        currentCount={results.length}
      />

      <style>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 154, 167, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ProductSearch;
