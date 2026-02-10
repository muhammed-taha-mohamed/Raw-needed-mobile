
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { Category, CategoryExtraField, SubCategory } from '../../types';
import Dropdown from '../../components/Dropdown';
import EmptyState from '../../components/EmptyState';

interface Supplier {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  category: { id: string; name: string; arabicName: string } | null;
  subCategories: { id: string; name: string; arabicName: string }[] | null;
  profileImage: string | null;
  organizationName: string | null;
  organizationCRN: string | null;
}

interface Product {
  id: string;
  name: string;
  origin: string;
  image: string;
  inStock: boolean;
  stockQuantity: number;
  category?: { id: string; name: string; arabicName: string };
  subCategory?: { id: string | null; name: string; arabicName: string };
  unit?: string;
  productionDate?: string;
  expirationDate?: string;
  extraFieldValues?: Record<string, string>;
}

interface CartItem {
  id: string;
  name: string;
  quantity: number;
}

interface CartData {
  userId: string;
  items: CartItem[];
}

interface PaginatedSuppliers {
  content: Supplier[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  last: boolean;
  first: boolean;
}

interface PaginatedProducts {
  content: Product[];
  totalPages: number;
  totalElements: number;
}

const Vendors: React.FC = () => {
  const { lang, t } = useLanguage();
  const location = useLocation();

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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [detailsModalVendor, setDetailsModalVendor] = useState<Supplier | null>(null);

  // Catalog Modal States
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [supplierProducts, setSupplierProducts] = useState<Product[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [productsPage, setProductsPage] = useState(0);
  const [productsTotalPages, setProductsTotalPages] = useState(0);
  const [productsTotalElements, setProductsTotalElements] = useState(0);

  const [cartItems, setCartItems] = useState<Record<string, number>>({});
  const [localQtys, setLocalQtys] = useState<Record<string, number>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Catalog Internal Filters
  const [prodSearchName, setProdSearchName] = useState('');
  const [prodSearchOrigin, setProdSearchOrigin] = useState('');
  const [prodSearchCat, setProdSearchCat] = useState('');
  const [prodSearchSub, setProdSearchSub] = useState('');
  const [catalogSubCategories, setCatalogSubCategories] = useState<SubCategory[]>([]);
  const [showCatalogFilters, setShowCatalogFilters] = useState(false);
  
  // Manual Order States
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualFormData, setManualFormData] = useState({
    name: '',
    origin: '',
    quantity: 1,
    unit: '',
    categoryId: '',
    subCategoryId: ''
  });
  const [manualSubCategories, setManualSubCategories] = useState<SubCategory[]>([]);
  const [manualCategoryExtraFields, setManualCategoryExtraFields] = useState<CategoryExtraField[]>([]);
  const [manualExtraFieldValues, setManualExtraFieldValues] = useState<Record<string, string>>({});
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualPreview, setManualPreview] = useState<string | null>(null);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const manualFileInputRef = useRef<HTMLInputElement>(null);

  const catalogFilterRef = useRef<HTMLDivElement>(null);
  const hasOpenedFromAdRef = useRef<boolean>(false);

  useEffect(() => {
    fetchCategories();
    fetchCart();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (catalogFilterRef.current && !catalogFilterRef.current.contains(event.target as Node)) {
        setShowCatalogFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchSuppliers(currentPage);
  }, [currentPage, pageSize, selectedCategoryId]);

  // Handle initial supplier from navigation state (from ad click)
  useEffect(() => {
    const initialSupplierId = (location.state as any)?.initialSupplierId;
    if (initialSupplierId && !hasOpenedFromAdRef.current && suppliers.length > 0) {
      hasOpenedFromAdRef.current = true;
      // Check if supplier is in current list
      const supplier = suppliers.find(s => s.id === initialSupplierId);
      if (supplier) {
        // Open catalog for this supplier
        setViewingSupplier(supplier);
        setProductsPage(0);
        setProdSearchName('');
        setProdSearchOrigin('');
        setProdSearchCat('');
        setProdSearchSub('');
        setIsProductsModalOpen(true);
        // Clear the state to prevent reopening on re-render
        window.history.replaceState({}, document.title);
      } else {
        // Supplier not in current page, fetch it directly
        api.get<Supplier>(`/api/v1/user/${initialSupplierId}`)
          .then(supplierData => {
            if (supplierData) {
              setViewingSupplier(supplierData as Supplier);
              setProductsPage(0);
              setProdSearchName('');
              setProdSearchOrigin('');
              setProdSearchCat('');
              setProdSearchSub('');
              setIsProductsModalOpen(true);
              window.history.replaceState({}, document.title);
            }
          })
          .catch(() => {
            // Supplier not found, ignore
          });
      }
    }
  }, [suppliers, location.state]);

  useEffect(() => {
    if (viewingSupplier) {
      const timer = setTimeout(() => {
        fetchSupplierProducts(viewingSupplier.id, productsPage);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [viewingSupplier, productsPage, prodSearchName, prodSearchOrigin, prodSearchCat, prodSearchSub]);

  useEffect(() => {
    if (prodSearchCat) {
      api.get<SubCategory[]>(`/api/v1/category/sub-category?categoryId=${prodSearchCat}`)
        .then(setCatalogSubCategories)
        .catch(() => setCatalogSubCategories([]));
    } else {
      setCatalogSubCategories([]);
      setProdSearchSub('');
    }
  }, [prodSearchCat]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchCart = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      const userId = userData?.userInfo?.id || userData?.id;
      if (!userId) return;
      const data = await api.get<CartData>(`/api/v1/cart/${userId}`);
      const mapping: Record<string, number> = {};
      data.items.forEach(item => { mapping[item.id] = item.quantity; });
      setCartItems(mapping);
    } catch (err) {}
  };

  const fetchCategories = async () => {
    try {
      const data = await api.get<Category[]>('/api/v1/category/all');
      setCategories(data || []);
    } catch (err) {}
  };

  const fetchSuppliers = async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      let url = `/api/v1/user/suppliers?page=${page}&size=${pageSize}`;
      if (selectedCategoryId) url += `&category=${selectedCategoryId}`;
      const response = await api.get<PaginatedSuppliers>(url);
      setSuppliers(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load vendors.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSupplierProducts = async (supplierId: string, page: number) => {
    setIsProductsLoading(true);
    try {
      const payload = {
        supplierId: supplierId,
        name: prodSearchName || null,
        origin: prodSearchOrigin || null,
        categoryId: prodSearchCat || null,
        subCategoryId: prodSearchSub || null
      };
      const response = await api.post<PaginatedProducts>(`/api/v1/product/filter?page=${page}&size=10`, payload);
      setSupplierProducts(response.content || []);
      setProductsTotalPages(response.totalPages || 0);
      setProductsTotalElements(response.totalElements || 0);
      const qtys: Record<string, number> = {};
      response.content.forEach(p => { if (!cartItems[p.id]) qtys[p.id] = 1; });
      setLocalQtys(prev => ({ ...prev, ...qtys }));
    } catch (err) {} finally {
      setIsProductsLoading(false);
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
      setToast({ message: lang === 'ar' ? 'تم تحديث العربة' : 'Cart updated', type: 'success' });
    } catch (e) {} finally { setProcessingId(null); }
  };

  const updateLocalQty = (id: string, delta: number) => {
    setLocalQtys(prev => ({ ...prev, [id]: Math.max(1, (prev[id] || 1) + delta) }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const openProducts = async (supplier: Supplier) => {
    setViewingSupplier(supplier);
    setProductsPage(0);
    setProdSearchName('');
    setProdSearchOrigin('');
    setProdSearchCat('');
    setProdSearchSub('');
    setIsProductsModalOpen(true);
    hasOpenedFromAdRef.current = false; // Reset when manually opening
  };

  const closeProductsModal = () => {
    setIsProductsModalOpen(false);
    hasOpenedFromAdRef.current = false; // Reset when closing
  };

  const handleManualFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setManualFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setManualPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const openManualModal = () => {
    setManualFormData({
      name: '',
      origin: '',
      quantity: 1,
      unit: '',
      categoryId: '',
      subCategoryId: ''
    });
    setManualSubCategories([]);
    setManualCategoryExtraFields([]);
    setManualExtraFieldValues({});
    setManualFile(null);
    setManualPreview(null);
    setIsManualModalOpen(true);
  };

  const buildManualExtraFieldValues = () => {
    const values: Record<string, string> = {};
    if (manualCategoryExtraFields.some(f => f.key === 'dimensions')) {
      const length = (manualExtraFieldValues.dimensions_length || '').trim();
      const width = (manualExtraFieldValues.dimensions_width || '').trim();
      const height = (manualExtraFieldValues.dimensions_height || '').trim();
      if (length) values.dimensions_length = length;
      if (width) values.dimensions_width = width;
      if (height) values.dimensions_height = height;
    }
    if (manualCategoryExtraFields.some(f => f.key === 'note')) {
      const note = (manualExtraFieldValues.note || '').trim();
      if (note) values.note = note;
    }
    return values;
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingSupplier) return;
    setIsSubmittingManual(true);
    try {
      let imageUrl = '';
      if (manualFile) {
        const formData = new FormData();
        formData.append('file', manualFile);
        imageUrl = await api.post<string>('/api/v1/image/upload', formData);
      }
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      const userId = userData?.userInfo?.id || userData?.id;

      const payload = {
        userId,
        items: [{
          id: null,
          name: manualFormData.name,
          origin: manualFormData.origin,
          supplierId: viewingSupplier.id,
          supplierName: viewingSupplier.organizationName || viewingSupplier.name,
          inStock: true,
          quantity: manualFormData.quantity,
          unit: manualFormData.unit || null,
          image: imageUrl || null,
          categoryId: manualFormData.categoryId || null,
          subCategoryId: manualFormData.subCategoryId || null,
          extraFieldValues: buildManualExtraFieldValues()
        }]
      };
      await api.post('/api/v1/rfq', payload);
      setToast({ message: t.manualOrder.success, type: 'success' });
      setIsManualModalOpen(false);
      setManualFormData({ name: '', origin: '', quantity: 1, unit: '', categoryId: '', subCategoryId: '' });
      setManualSubCategories([]);
      setManualCategoryExtraFields([]);
      setManualExtraFieldValues({});
      setManualPreview(null);
      setManualFile(null);
    } catch (err: any) {
      setToast({ message: err.message || 'Submission failed', type: 'error' });
    } finally { setIsSubmittingManual(false); }
  };

  const resetCatalogFilters = () => {
    setProdSearchName('');
    setProdSearchOrigin('');
    setProdSearchCat('');
    setProdSearchSub('');
    setProductsPage(0);
    setShowCatalogFilters(false);
  };

  const activeCatalogFiltersCount = [prodSearchName, prodSearchOrigin, prodSearchCat, prodSearchSub].filter(Boolean).length;
  const supplierScopedCategories = viewingSupplier?.category?.id
    ? categories.filter(c => c.id === viewingSupplier.category?.id)
    : categories;

  useEffect(() => {
    if (!viewingSupplier?.category?.id) return;
    if (prodSearchCat && prodSearchCat !== viewingSupplier.category.id) {
      setProdSearchCat('');
      setProdSearchSub('');
    }
    if (manualFormData.categoryId && manualFormData.categoryId !== viewingSupplier.category.id) {
      setManualFormData(prev => ({ ...prev, categoryId: '', subCategoryId: '' }));
      setManualSubCategories([]);
      setManualCategoryExtraFields([]);
      setManualExtraFieldValues({});
    }
  }, [viewingSupplier, prodSearchCat, manualFormData.categoryId]);

  return (
    <div className="w-full py-6 flex flex-col gap-6 font-display animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {toast && (
        <div className={`fixed bottom-32 left-1/2 -translate-x-1/2 z-[500] px-6 py-3 rounded-xl shadow-2xl font-black text-sm animate-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>
           {toast.message}
        </div>
      )}

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-4 mb-6">
        {suppliers.map((vendor, idx) => (
          <div 
            key={vendor.id} 
            className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {/* Header: avatar + info */}
            <div className="p-5 pb-4 flex items-start gap-4 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10 dark:to-transparent">
              <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg shrink-0 overflow-hidden border-2 border-primary/20 shadow-md">
                {vendor.profileImage ? <img src={vendor.profileImage} className="size-full object-cover" alt="" /> : (vendor.organizationName || vendor.name).charAt(0)}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight mb-2">
                  {vendor.organizationName || vendor.name}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{vendor.name}</p>
                  {vendor.category && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-primary/10 text-primary text-[11px] font-black border border-primary/20">
                      <span className="material-symbols-outlined text-xs">category</span>
                      {lang === 'ar' ? vendor.category.arabicName : vendor.category.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* CTAs: Catalog + Details buttons */}
            <div className="px-5 pb-5 flex gap-3">
              <button 
                onClick={() => openProducts(vendor)} 
                className="flex-1 py-3 rounded-xl bg-primary/10 dark:bg-primary/5 text-primary border-2 border-primary/20 hover:bg-primary/15 dark:hover:bg-primary/10 font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">inventory_2</span>
                {lang === 'ar' ? 'الكتالوج' : 'Catalog'}
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailsModalVendor(vendor);
                }}
                className="px-4 py-3 rounded-xl bg-primary/10 dark:bg-primary/5 text-primary border-2 border-primary/20 hover:bg-primary/15 dark:hover:bg-primary/10 font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center"
                aria-label={lang === 'ar' ? 'عرض التفاصيل' : 'View details'}
              >
                <span className="material-symbols-outlined text-lg">visibility</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Pagination - Visible Above Bottom Nav */}
      {totalElements > 0 && (
        <div className="md:hidden mb-24 px-4">
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border-2 border-slate-200 dark:border-slate-800 max-w-md mx-auto">
            <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl shrink-0 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-black text-slate-600 dark:text-slate-400 tabular-nums">
                {currentPage + 1} / {totalPages}
              </span>
            </div>
            <div className="h-7 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handlePageChange(currentPage - 1)} 
                disabled={currentPage === 0 || isLoading}
                className="size-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-primary hover:border-primary disabled:opacity-30 transition-all flex items-center justify-center active:scale-90 shadow-sm"
              >
                <span className="material-symbols-outlined text-lg rtl-flip">chevron_left</span>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(currentPage)}
                  className="size-10 rounded-xl font-black text-sm bg-primary text-white shadow-md active:scale-95 transition-all"
                >
                  {currentPage + 1}
                </button>
              </div>
              <button 
                onClick={() => handlePageChange(currentPage + 1)} 
                disabled={currentPage >= totalPages - 1 || isLoading}
                className="size-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-primary hover:border-primary disabled:opacity-30 transition-all flex items-center justify-center active:scale-90 shadow-sm"
              >
                <span className="material-symbols-outlined text-lg rtl-flip">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Table View - Fixed Size with Scroll */}
      <div className="hidden md:block mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-primary/20 dark:border-primary/10 shadow-lg overflow-hidden">
          <div className="h-[90vh] flex flex-col">
            {/* Filter Section */}
            <div className="flex-shrink-0 bg-primary/10 dark:bg-primary/5 border-b-2 border-primary/20 px-6 py-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg text-primary">filter_list</span>
                <div className="flex-1 max-w-xs">
                  <Dropdown 
                    options={categories.map(cat => ({ value: cat.id, label: lang === 'ar' ? (cat.arabicName || '') : (cat.name || '') }))} 
                    value={selectedCategoryId} 
                    onChange={(v) => { setSelectedCategoryId(v); setCurrentPage(0); }} 
                    placeholder={lang === 'ar' ? 'جميع الفئات' : 'All Categories'} 
                    isRtl={lang === 'ar'} 
                    triggerClassName="w-full min-h-[40px] flex items-center justify-between gap-2 py-2 rounded-xl border-2 border-primary/20 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:border-primary outline-none transition-all shadow-sm text-sm cursor-pointer text-start pl-3 pr-9 rtl:pl-9 rtl:pr-3" 
                  />
                </div>
              </div>
            </div>
            {/* Scrollable Table Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`w-full border-collapse bg-white dark:bg-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                <thead className="sticky top-0 z-10 bg-primary/10 dark:bg-primary/5">
                  <tr className="text-[12px] font-black text-slate-600 dark:text-slate-400 border-b-2 border-primary/20">
                    <th className="px-6 py-4">{lang === 'ar' ? 'المورد' : 'Supplier'}</th>
                    <th className="px-6 py-4">{lang === 'ar' ? 'المنظمة' : 'Organization'}</th>
                    <th className="px-6 py-4 hidden lg:table-cell">{lang === 'ar' ? 'القطاع' : 'Vertical'}</th>
                    <th className="px-6 py-4 hidden lg:table-cell">{lang === 'ar' ? 'التواصل' : 'Contact'}</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5 dark:divide-slate-700">
                  {suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">inventory_2</span>
                          <p className="text-sm font-bold text-slate-400 dark:text-slate-500">{lang === 'ar' ? 'لا توجد بيانات' : 'No data available'}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((vendor) => (
                      <tr key={vendor.id} className="group hover:bg-primary/5 dark:hover:bg-slate-700/20 transition-all">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-black text-sm shrink-0 overflow-hidden border border-primary/10 shadow-sm">
                              {vendor.profileImage ? <img src={vendor.profileImage} className="size-full object-cover" /> : vendor.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-800 dark:text-white text-sm truncate leading-none">{vendor.organizationName || vendor.name}</p>
                              <p className="text-[11px] font-bold text-slate-400 mt-1.5 truncate max-w-[120px]">{vendor.email}</p> 
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{vendor.organizationName || '---'}</span>
                            <span className="text-[9px] font-bold text-emerald-500 mt-1">{vendor.organizationCRN}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          <span className="px-3 py-1 rounded bg-primary/5 text-primary text-[11px] font-black border border-primary/10 inline-block">
                            {vendor.category ? (lang === 'ar' ? vendor.category.arabicName : vendor.category.name) : '---'}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          <span className="text-sm font-bold text-slate-500 tabular-nums">{vendor.phoneNumber || '---'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`flex items-center gap-3 ${lang === 'ar' ? 'justify-start' : 'justify-end'}`}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailsModalVendor(vendor);
                              }}
                              className="size-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border shadow-sm bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:text-primary hover:border-primary/40"
                              title={lang === 'ar' ? 'التفاصيل' : 'Details'}
                            >
                              <span className="material-symbols-outlined text-[22px]">visibility</span>
                            </button>
                            <button onClick={() => openProducts(vendor)} className="text-primary text-[11px] font-black hover:underline flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all">
                              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                              {lang === 'ar' ? 'الكتالوج' : 'Catalog'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination Footer - Fixed at Bottom */}
            {totalElements > 0 && (
              <div className="flex-shrink-0 border-t-2 border-primary/20 bg-primary/5 dark:bg-primary/5 px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full shrink-0 border border-primary/20">
                    <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 tabular-nums">
                      {currentPage + 1} / {totalPages}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-primary/20 mx-1"></div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => handlePageChange(currentPage - 1)} 
                      disabled={currentPage === 0 || isLoading}
                      className="size-9 rounded-full border border-primary/20 bg-white dark:bg-slate-800 text-slate-400 hover:text-primary hover:border-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
                    >
                      <span className="material-symbols-outlined text-base rtl-flip">chevron_left</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePageChange(currentPage)}
                        className="size-9 rounded-full font-black text-[12px] bg-primary text-white shadow-md active:scale-95 transition-all"
                      >
                        {currentPage + 1}
                      </button>
                    </div>
                    <button 
                      onClick={() => handlePageChange(currentPage + 1)} 
                      disabled={currentPage >= totalPages - 1 || isLoading}
                      className="size-9 rounded-full border border-primary/20 bg-white dark:bg-slate-800 text-slate-400 hover:text-primary hover:border-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
                    >
                      <span className="material-symbols-outlined text-base rtl-flip">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vendor Details Modal - opens from details button so content is fully visible */}
      {detailsModalVendor && (
        <div
          className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setDetailsModalVendor(null)}
        >
          <div
            className="w-full max-h-[85vh] sm:max-w-md sm:max-h-[90vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle - mobile: swipe down to close */}
            <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0 cursor-grab active:cursor-grabbing" onTouchStart={(e) => {
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
                  setDetailsModalVendor(null);
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
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-black text-slate-900 dark:text-white truncate flex-1 pr-2">
                {detailsModalVendor.organizationName || detailsModalVendor.name}
              </h3>
              <button
                onClick={() => setDetailsModalVendor(null)}
                className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center active:scale-90"
                aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4 flex-1 min-h-0">
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black text-primary leading-none mb-1">{lang === 'ar' ? 'القطاع' : 'Vertical'}</p>
                  <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">{detailsModalVendor.category ? (lang === 'ar' ? detailsModalVendor.category.arabicName : detailsModalVendor.category.name) : '---'}</p>
                </div>
                <span className="material-symbols-outlined text-primary text-xl ml-2">category</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 shrink-0"><span className="material-symbols-outlined text-lg">corporate_fare</span></div>
                  <div className="min-w-0 flex-1"><p className="text-[10px] font-black text-slate-400 leading-none mb-0.5">{lang === 'ar' ? 'المؤسسة' : 'Organization'}</p><p className="text-sm font-bold text-slate-700 dark:text-slate-200 break-words">{detailsModalVendor.organizationName || detailsModalVendor.name}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500 shrink-0"><span className="material-symbols-outlined text-lg">badge</span></div>
                  <div className="min-w-0 flex-1"><p className="text-[10px] font-black text-slate-400 leading-none mb-0.5">{lang === 'ar' ? 'السجل' : 'CRN'}</p><p className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">{detailsModalVendor.organizationCRN || '---'}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500 shrink-0"><span className="material-symbols-outlined text-lg">call</span></div>
                  <div className="min-w-0 flex-1"><p className="text-[10px] font-black text-slate-400 leading-none mb-0.5">{lang === 'ar' ? 'الهاتف' : 'Phone'}</p><p className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">{detailsModalVendor.phoneNumber || '---'}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 shrink-0"><span className="material-symbols-outlined text-lg">mail</span></div>
                  <div className="min-w-0 flex-1"><p className="text-[10px] font-black text-slate-400 leading-none mb-0.5">{lang === 'ar' ? 'البريد' : 'Email'}</p><p className="text-sm font-bold text-slate-700 dark:text-slate-200 break-all">{detailsModalVendor.email}</p></div>
                </div>
              </div>
              {detailsModalVendor.subCategories && detailsModalVendor.subCategories.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 mb-2">{lang === 'ar' ? 'التخصصات' : 'Domain'}</p>
                  <div className="flex flex-wrap gap-2">
                    {detailsModalVendor.subCategories.map(sub => (
                      <span key={sub.id} className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold border border-slate-100 dark:border-slate-700">
                        {lang === 'ar' ? sub.arabicName : sub.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                onClick={() => {
                  openProducts(detailsModalVendor);
                  setDetailsModalVendor(null);
                }}
                className="w-full py-3 rounded-xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined text-lg">inventory_2</span>
                {lang === 'ar' ? 'الكتالوج' : 'Catalog'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Modal */}
      {isProductsModalOpen && viewingSupplier && (
        <div
          className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => closeProductsModal()}
        >
           <div
             className="w-full md:w-[90%] md:max-w-5xl bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-xl shadow-2xl border-t border-x md:border border-primary/10 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 flex flex-col h-[90vh] md:h-[90vh] relative"
             onClick={(e) => e.stopPropagation()}
           >
              {/* Drag handle - mobile: swipe down to close */}
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
                    closeProductsModal();
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
              <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-2xl">storefront</span></div>
                    <div>
                       <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none">{viewingSupplier.organizationName || viewingSupplier.name}</h3>
                       <p className="text-[10px] font-black text-slate-400   mt-2   ">{lang === 'ar' ? 'كتالوج المواد الخام' : 'Vendor Product Catalog'}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="relative" ref={catalogFilterRef}>
                     <button type="button" onClick={(e) => { e.stopPropagation(); setShowCatalogFilters(!showCatalogFilters); }} className={`size-10 rounded-xl flex items-center justify-center transition-all border active:scale-90 shrink-0 ${activeCatalogFiltersCount > 0 ? 'bg-primary text-white border-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-primary/40'}`} aria-label={lang === 'ar' ? 'تصفية' : 'Filter'}>
                       <span className="material-symbols-outlined text-xl">tune</span>
                       {activeCatalogFiltersCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white size-4 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-slate-900">{activeCatalogFiltersCount}</span>}
                     </button>
                     {showCatalogFilters && (
                       <div className={`absolute top-full mt-3 z-[260] w-[320px] sm:w-[380px] max-w-[calc(100vw-3rem)] bg-white dark:bg-slate-900 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-primary/10 p-6 animate-in fade-in slide-in-from-top-2 duration-200 ${lang === 'ar' ? 'left-0' : 'right-0'}`}>
                         <div className="flex justify-between items-center mb-6">
                           <h3 className="text-xs font-black text-slate-400">{lang === 'ar' ? 'تصفية المنتجات' : 'Filter Catalog'}</h3>
                           <button type="button" onClick={resetCatalogFilters} className="text-[10px] font-black text-primary hover:underline">{lang === 'ar' ? 'مسح الكل' : 'Clear All'}</button>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div className="sm:col-span-2 space-y-1.5">
                             <label className="text-[10px] font-black text-slate-500 px-1">{lang === 'ar' ? 'اسم المنتج' : 'Product Name'}</label>
                             <input type="text" value={prodSearchName} onChange={(e) => { setProdSearchName(e.target.value); setProductsPage(0); }} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-primary outline-none text-slate-900 dark:text-white" placeholder="..." />
                           </div>
                           <div className="space-y-1.5">
                            <Dropdown label={t.products.category} options={supplierScopedCategories.map(c => ({ value: c.id, label: lang === 'ar' ? (c.arabicName || '') : (c.name || '') }))} value={prodSearchCat} onChange={setProdSearchCat} placeholder={lang === 'ar' ? 'الفئات' : 'Categories'} isRtl={lang === 'ar'} wrapperClassName="space-y-1" triggerClassName="w-full min-h-[42px] flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-2.5 text-[10px] font-bold outline-none focus:border-primary transition-all text-slate-900 dark:text-white cursor-pointer text-start" />
                           </div>
                           <div className="space-y-1.5">
                             <Dropdown label={t.products.subCategory} options={catalogSubCategories.map(s => ({ value: s.id, label: lang === 'ar' ? (s.arabicName || '') : (s.name || '') }))} value={prodSearchSub} onChange={setProdSearchSub} placeholder={lang === 'ar' ? 'الأنواع' : 'Types'} disabled={!prodSearchCat} isRtl={lang === 'ar'} wrapperClassName="space-y-1" triggerClassName="w-full min-h-[42px] flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-2.5 text-[10px] font-bold outline-none focus:border-primary transition-all disabled:opacity-30 text-slate-900 dark:text-white cursor-pointer text-start disabled:cursor-not-allowed" />
                           </div>
                           <div className="sm:col-span-2 space-y-1.5">
                             <label className="text-[10px] font-black text-slate-500 px-1">{lang === 'ar' ? 'المنشأ' : 'Origin'}</label>
                             <input type="text" value={prodSearchOrigin} onChange={(e) => { setProdSearchOrigin(e.target.value); setProductsPage(0); }} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-primary outline-none text-slate-900 dark:text-white" placeholder="..." />
                           </div>
                         </div>
                         <div className={`absolute -top-1.5 w-3 h-3 bg-white dark:bg-slate-900 border-l border-t border-primary/20 rotate-45 ${lang === 'ar' ? 'left-8' : 'right-8'}`} />
                       </div>
                     )}
                   </div>
                   <button
                     type="button"
                     onClick={(e) => { e.stopPropagation(); closeProductsModal(); }}
                     className="size-10 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center border border-slate-100 dark:border-slate-800 active:scale-90 shrink-0"
                   >
                     <span className="material-symbols-outlined">close</span>
                   </button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-slate-50/20 relative">
                 {isProductsLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center"><div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div><p className="text-[11px] font-black text-slate-400 animate-pulse">Syncing Catalog...</p></div>
                 ) : supplierProducts.length === 0 ? (
                    <EmptyState title={t.productSearch.empty} subtitle={t.productSearch.refine} />
                 ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-24">
                       {supplierProducts.map((p, idx) => {
                          const isInCart = !!cartItems[p.id];
                          const cartQty = cartItems[p.id] || 0;
                          return (
                            <div key={p.id} className={`group relative bg-white dark:bg-slate-900 rounded-[1.8rem] p-3 md:p-4 shadow-sm border transition-all duration-300 ${isInCart ? 'border-primary/40 bg-primary/5' : 'border-slate-100 dark:border-slate-800'} animate-in fade-in slide-in-from-bottom-2 flex gap-4 items-center h-full`} style={{ animationDelay: `${idx * 20}ms` }}>
                               <div className="relative size-24 md:size-28 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0 shadow-inner">
                                  {p.image ? <img src={p.image} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" alt={p.name} /> : <div className="size-full flex items-center justify-center text-slate-200"><span className="material-symbols-outlined text-3xl">inventory_2</span></div>}
                                  <div className="absolute top-1.5 left-1.5"><div className={`size-2.5 rounded-full border-2 border-white dark:border-slate-900 ${p.inStock ? 'bg-emerald-500' : 'bg-red-500'} shadow-sm`}></div></div>
                               </div>
                               <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
                                  <div>
                                    <h4 className="text-sm font-black text-slate-800 dark:text-white line-clamp-1 leading-tight ">{p.name}</h4>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                       <div className="flex items-center gap-1.5 text-slate-400"><span className="material-symbols-outlined text-[16px] text-primary/60">category</span><span className="text-[10px] font-bold   truncate max-w-[120px]">{lang === 'ar' ? p.category?.arabicName : p.category?.name}</span></div>
                                       <div className="flex items-center gap-1.5 text-slate-400"><span className="material-symbols-outlined text-[16px] text-primary/60">public</span><span className="text-[10px] font-bold   tabular-nums">{p.origin}</span></div>
                                       {p.unit && (
                                         <div className="flex items-center gap-1.5 text-slate-400">
                                           <span className="material-symbols-outlined text-[16px] text-primary/60">straighten</span>
                                           <span className="text-[10px] font-bold">{p.unit}</span>
                                         </div>
                                       )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                                      <div className="flex items-center gap-1 text-slate-400">
                                        <span className="material-symbols-outlined text-[14px] text-primary/60">calendar_today</span>
                                        <span className="text-[9px] font-bold">{lang === 'ar' ? 'إنتاج:' : 'Prod:'} {p.productionDate ? formatDate(p.productionDate) : 'N/A'}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-slate-400">
                                        <span className="material-symbols-outlined text-[14px] text-primary/60">event_available</span>
                                        <span className="text-[9px] font-bold">{lang === 'ar' ? 'انتهاء:' : 'Exp:'} {p.expirationDate ? formatDate(p.expirationDate) : 'N/A'}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-3 flex items-center justify-between gap-2">
                                     <div className="flex flex-col"><p className="text-[10px] font-black text-slate-400   leading-none mb-1">{lang === 'ar' ? 'المخزون' : 'Stock'}</p><div className="flex items-baseline gap-1 text-primary"><span className="text-base font-black tabular-nums">{p.stockQuantity}</span>{p.unit ? <span className="text-[9px] font-black">{p.unit}</span> : <span className="text-[9px] font-black">{lang === 'ar' ? 'وحدة' : 'Units'}</span>}</div></div>
                                     <div className="flex items-center gap-2">
                                        {isInCart ? (
                                          <div className="flex items-center bg-emerald-500/10 dark:bg-emerald-500/5 p-0.5 rounded-lg border border-emerald-500/20"><button onClick={() => handleAddToCart(p.id, cartItems[p.id] - 1)} disabled={processingId === p.id} className="size-6 rounded-md bg-white dark:bg-slate-700 text-emerald-600 shadow-sm flex items-center justify-center disabled:opacity-30"><span className="material-symbols-outlined text-xs">remove</span></button><span className="px-2 text-[12px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{cartQty}</span><button onClick={() => handleAddToCart(p.id, cartItems[p.id] + 1)} disabled={processingId === p.id} className="size-6 rounded-md bg-white dark:bg-slate-700 text-emerald-600 shadow-sm flex items-center justify-center disabled:opacity-30"><span className="material-symbols-outlined text-xs">add</span></button></div>
                                        ) : (
                                          <div className="flex items-center gap-2"><div className="flex items-center bg-slate-50 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-100 dark:border-slate-700"><button onClick={() => updateLocalQty(p.id, -1)} className="size-6 rounded-md bg-white dark:bg-slate-700 text-slate-500 shadow-sm flex items-center justify-center"><span className="material-symbols-outlined text-xs">remove</span></button><span className="px-2 text-[12px] font-black text-slate-800 dark:text-white tabular-nums">{localQtys[p.id] || 1}</span><button onClick={() => updateLocalQty(p.id, 1)} className="size-6 rounded-md bg-white dark:bg-slate-700 text-slate-500 shadow-sm flex items-center justify-center"><span className="material-symbols-outlined text-xs">add</span></button></div><button onClick={() => handleAddToCart(p.id)} disabled={processingId === p.id || !p.inStock} className="size-8 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95 flex items-center justify-center disabled:grayscale disabled:opacity-50"><span className="material-symbols-outlined text-base">add_shopping_cart</span></button></div>
                                        )}
                                     </div>
                                  </div>
                               </div>
                            </div>
                          );
                       })}
                    </div>
                 )}
              </div>

              {productsTotalPages > 1 && (
                <div className="px-10 py-5 border-t border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex items-center justify-between shrink-0">
                   <div className="text-[10px] font-black text-slate-400 tabular-nums     ">{lang === 'ar' ? 'إجمالي المنتجات: ' : 'Total Products: '} {productsTotalElements}</div>
                   <div className="flex items-center gap-1.5"><button onClick={() => productsPage > 0 && setProductsPage(productsPage - 1)} disabled={productsPage === 0} className="size-9 rounded-xl border border-primary/10 bg-white dark:bg-slate-900 text-slate-500 hover:border-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-95 shadow-sm"><span className="material-symbols-outlined text-lg rtl-flip">chevron_left</span></button><div className="flex items-center gap-1">{Array.from({ length: Math.min(productsTotalPages, 5) }).map((_, i) => <button key={i} onClick={() => setProductsPage(i)} className={`size-9 rounded-xl font-black text-[11px] transition-all shadow-sm ${productsPage === i ? 'bg-primary text-white' : 'bg-white dark:bg-slate-900 text-slate-400 border border-primary/5 hover:border-primary'}`}>{i + 1}</button>)}</div><button onClick={() => productsPage < productsTotalPages - 1 && setProductsPage(productsPage + 1)} disabled={productsPage >= productsTotalPages - 1} className="size-9 rounded-xl border border-primary/10 bg-white dark:bg-slate-900 text-slate-500 hover:border-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-95 shadow-sm"><span className="material-symbols-outlined text-lg rtl-flip">chevron_right</span></button></div>
                </div>
              )}
              
              {/* Bottom: Manual Order + Close - side by side */}
              <div className="px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={openManualModal}
                  className="flex-1 min-w-[140px] py-3 rounded-xl bg-primary text-white font-black text-sm shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">edit_document</span>
                  {lang === 'ar' ? 'طلب يدوي' : 'Manual Order'}
                </button>
                <button
                  onClick={() => closeProductsModal()}
                  className="flex-1 min-w-[140px] py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-black text-sm flex items-center justify-center gap-2 active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                  {lang === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Manual Order Modal */}
      {isManualModalOpen && viewingSupplier && (
        <div className="fixed inset-0 z-[400] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full md:w-[90%] md:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-xl shadow-2xl border-t border-x md:border border-primary/20 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
                 <div className="flex items-center gap-4"><div className="size-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-2xl">edit_document</span></div><div><h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">{t.manualOrder.title}</h3><p className="text-[10px] font-black text-slate-400   mt-2   ">{lang === 'ar' ? `طلب خاص من ${viewingSupplier.organizationName || viewingSupplier.name}` : `Special Request to ${viewingSupplier.organizationName || viewingSupplier.name}`}</p></div></div>
                 <button onClick={() => setIsManualModalOpen(false)} className="size-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-xl">close</span></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                 <form onSubmit={handleManualSubmit} id="manualForm" className="space-y-5">
                    <div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500 px-1">{t.manualOrder.prodName}</label><input required type="text" value={manualFormData.name} onChange={(e) => setManualFormData({...manualFormData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm md:text-base font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white placeholder:text-xs md:placeholder:text-sm placeholder:font-medium" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 px-1">{t.products.category}</label>
                        <Dropdown
                          options={supplierScopedCategories.map(c => ({ value: c.id, label: lang === 'ar' ? (c.arabicName || '') : (c.name || '') }))}
                          value={manualFormData.categoryId}
                          onChange={(value) => {
                            setManualFormData({ ...manualFormData, categoryId: value, subCategoryId: '' });
                            setManualCategoryExtraFields(value ? (categories.find(c => c.id === value)?.extraFields || []) : []);
                            setManualExtraFieldValues({});
                            if (value) {
                              api.get<SubCategory[]>(`/api/v1/category/sub-category?categoryId=${value}`).then((data) => setManualSubCategories(data || [])).catch(() => setManualSubCategories([]));
                            } else {
                              setManualSubCategories([]);
                            }
                          }}
                          placeholder={t.products.selectCategory}
                          isRtl={lang === 'ar'}
                          triggerClassName="w-full min-h-[44px] flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white cursor-pointer text-start"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 px-1">{t.products.subCategory}</label>
                        <Dropdown
                          options={manualSubCategories.map(s => ({ value: s.id, label: lang === 'ar' ? (s.arabicName || '') : (s.name || '') }))}
                          value={manualFormData.subCategoryId}
                          onChange={(value) => setManualFormData({ ...manualFormData, subCategoryId: value })}
                          placeholder={t.products.selectSubCategory}
                          disabled={!manualFormData.categoryId}
                          isRtl={lang === 'ar'}
                          triggerClassName="w-full min-h-[44px] flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white cursor-pointer text-start disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                    {manualCategoryExtraFields.length > 0 && (
                      <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4">
                        <div className="text-[11px] font-black text-slate-600 dark:text-slate-300">
                          {lang === 'ar' ? 'بيانات إضافية حسب الفئة' : 'Additional category-specific data'}
                        </div>
                        {manualCategoryExtraFields.some(field => field.key === 'dimensions') && (
                          <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'الابعاد (طول/عرض/ارتفاع)' : 'Dimensions (L/W/H)'}</label>
                            <div className="grid grid-cols-3 gap-2">
                              <input type="text" value={manualExtraFieldValues.dimensions_length || ''} onChange={(e) => setManualExtraFieldValues(prev => ({ ...prev, dimensions_length: e.target.value }))} placeholder={lang === 'ar' ? 'طول' : 'Length'} className="w-full px-3 py-2 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-bold focus:border-primary outline-none transition-all text-slate-900 dark:text-white" />
                              <input type="text" value={manualExtraFieldValues.dimensions_width || ''} onChange={(e) => setManualExtraFieldValues(prev => ({ ...prev, dimensions_width: e.target.value }))} placeholder={lang === 'ar' ? 'عرض' : 'Width'} className="w-full px-3 py-2 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-bold focus:border-primary outline-none transition-all text-slate-900 dark:text-white" />
                              <input type="text" value={manualExtraFieldValues.dimensions_height || ''} onChange={(e) => setManualExtraFieldValues(prev => ({ ...prev, dimensions_height: e.target.value }))} placeholder={lang === 'ar' ? 'ارتفاع' : 'Height'} className="w-full px-3 py-2 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-bold focus:border-primary outline-none transition-all text-slate-900 dark:text-white" />
                            </div>
                          </div>
                        )}
                        {manualCategoryExtraFields.some(field => field.key === 'note') && (
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'ملاحظة' : 'Note'}</label>
                            <textarea
                              value={manualExtraFieldValues.note || ''}
                              onChange={(e) => setManualExtraFieldValues(prev => ({ ...prev, note: e.target.value }))}
                              rows={3}
                              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                              placeholder={lang === 'ar' ? 'اكتب ملاحظات إضافية...' : 'Write additional notes...'}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500 px-1">{t.manualOrder.origin}</label><input required type="text" value={manualFormData.origin} onChange={(e) => setManualFormData({...manualFormData, origin: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white" /></div><div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500 px-1">{t.manualOrder.qty}</label><input required type="number" min="1" value={manualFormData.quantity} onChange={(e) => setManualFormData({...manualFormData, quantity: parseInt(e.target.value) || 1})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white" /></div></div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'الوحدة' : 'Unit'}</label>
                      <input
                        required
                        type="text"
                        value={manualFormData.unit}
                        onChange={(e) => setManualFormData({ ...manualFormData, unit: e.target.value })}
                        placeholder={lang === 'ar' ? 'مثال: كيلو / طن / قطعة / كرتونة' : 'e.g. kg / ton / piece / carton'}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500 px-1">{t.manualOrder.image}</label><div onClick={() => manualFileInputRef.current?.click()} className={`h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${manualPreview ? 'border-primary' : 'border-slate-200 hover:border-primary bg-slate-50/50 dark:bg-slate-800/50'}`}>{manualPreview ? <img src={manualPreview} className="size-full object-cover" alt="" /> : <><span className="material-symbols-outlined text-3xl text-slate-300 mb-1">add_a_photo</span><span className="text-[9px] font-black text-slate-400">{t.common.clickToUpload}</span></>}</div><input ref={manualFileInputRef} type="file" className="hidden" accept="image/*" onChange={handleManualFileChange} /></div>
                 </form>
              </div>

              <div className="p-6 md:p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0 flex flex-wrap gap-3">
                <button form="manualForm" type="submit" disabled={isSubmittingManual} className="flex-1 min-w-[140px] py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">
                  {isSubmittingManual ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><span className="material-symbols-outlined">send</span>{t.manualOrder.submit}</>}
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="flex-1 min-w-[140px] py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-black text-sm flex items-center justify-center gap-2 active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                  {lang === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 154, 167, 0.2); border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Vendors;
