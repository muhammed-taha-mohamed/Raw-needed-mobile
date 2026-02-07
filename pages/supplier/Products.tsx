
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../App';
import { api, BASE_URL } from '../../api';
import { Category, SubCategory, Product } from '../../types';
import Dropdown from '../../components/Dropdown';
import PaginationFooter from '../../components/PaginationFooter';
import { useToast } from '../../contexts/ToastContext';

const Products: React.FC = () => {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();

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
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);
  const mobileActionsRef = useRef<HTMLDivElement>(null);
  
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  const [searchName, setSearchName] = useState('');
  const [searchOrigin, setSearchOrigin] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterSubCategoryId, setFilterSubCategoryId] = useState('');
  const [filterSubCategories, setFilterSubCategories] = useState<SubCategory[]>([]);
  
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [subCategoryDropdownOpen, setSubCategoryDropdownOpen] = useState(false);
  const categoryDropRef = useRef<HTMLDivElement>(null);
  const subCategoryDropRef = useRef<HTMLDivElement>(null);
  const categoryDropRefMob = useRef<HTMLDivElement>(null);
  const subCategoryDropRefMob = useRef<HTMLDivElement>(null);
  const [categoryDropdownOpenMob, setCategoryDropdownOpenMob] = useState(false);
  const [subCategoryDropdownOpenMob, setSubCategoryDropdownOpenMob] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    origin: '', 
    inStock: true, 
    stockQuantity: '0', 
    categoryId: '', 
    subCategoryId: '', 
    image: '',
    unit: '',
    productionDate: '',
    expirationDate: ''
  });

  useEffect(() => {
    fetchInitialData();
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (filterRef.current && !filterRef.current.contains(target)) setShowFilters(false);
      if (mobileActionsRef.current && !mobileActionsRef.current.contains(target)) setShowMobileActions(false);
      if (categoryDropRef.current && !categoryDropRef.current.contains(target)) setCategoryDropdownOpen(false);
      if (subCategoryDropRef.current && !subCategoryDropRef.current.contains(target)) setSubCategoryDropdownOpen(false);
      if (categoryDropRefMob.current && !categoryDropRefMob.current.contains(target)) setCategoryDropdownOpenMob(false);
      if (subCategoryDropRefMob.current && !subCategoryDropRefMob.current.contains(target)) setSubCategoryDropdownOpenMob(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchInitialData = async () => {
    try {
      const data = await api.get<Category[]>('/api/v1/category/all');
      setCategories(data || []);
    } catch (e) {}
  };

  useEffect(() => {
    if (filterCategoryId) {
      const fetchFilterSubs = async () => {
        try {
          const data = await api.get<SubCategory[]>(`/api/v1/category/sub-category?categoryId=${filterCategoryId}`);
          setFilterSubCategories(data || []);
        } catch (e) {}
      };
      fetchFilterSubs();
    } else {
      setFilterSubCategories([]);
      setFilterSubCategoryId('');
    }
  }, [filterCategoryId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFilteredProducts(currentPage);
    }, 400);
    return () => clearTimeout(timer);
  }, [currentPage, filterCategoryId, filterSubCategoryId, searchName, searchOrigin]);

  const fetchFilteredProducts = async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      const supplierId = userData?.userInfo?.id || userData?.id;
      
      const filterPayload = { 
        name: searchName || null, 
        origin: searchOrigin || null, 
        supplierId: supplierId, 
        categoryId: filterCategoryId || null, 
        subCategoryId: filterSubCategoryId || null 
      };
      
      const data = await api.post<any>(`/api/v1/product/filter?page=${page}&size=${pageSize}`, filterPayload);
      setProducts(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (err: any) { 
      setError(err.message || "Failed to load catalog."); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const openAddModal = () => {
    setEditingProduct(null); setSelectedFile(null); setImagePreview(null);
    setFormData({ name: '', origin: '', inStock: true, stockQuantity: '0', categoryId: '', subCategoryId: '', image: '', unit: '', productionDate: '', expirationDate: '' });
    setSubCategories([]); setIsModalOpen(true);
  };

  const openEditModal = async (product: Product) => {
    setEditingProduct(product); setSelectedFile(null); setImagePreview(product.image || null);
    const catId = product.category?.id || product.categoryId;
    setFormData({ 
      name: product.name, 
      origin: product.origin || '', 
      inStock: product.inStock, 
      stockQuantity: product.stockQuantity?.toString() || '0', 
      categoryId: catId || '', 
      subCategoryId: product.subCategory?.id || product.subCategoryId || '', 
      image: product.image || '',
      unit: product.unit || '',
      productionDate: product.productionDate ? product.productionDate.split('T')[0] : '',
      expirationDate: product.expirationDate ? product.expirationDate.split('T')[0] : ''
    });
    if (catId) {
      try { 
        const data = await api.get<SubCategory[]>(`/api/v1/category/sub-category?categoryId=${catId}`); 
        setSubCategories(data || []); 
      } catch (err) {}
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsProcessing(true); setError(null);
    const userStr = localStorage.getItem('user');
    const userData = userStr ? JSON.parse(userStr) : null;
    const supplierId = userData?.userInfo?.id || userData?.id;
    let finalImageUrl = formData.image;
    try {
      if (selectedFile) {
        const uploadData = new FormData(); uploadData.append('file', selectedFile);
        finalImageUrl = await api.post<string>('/api/v1/image/upload', uploadData);
      }
      const payload: any = { 
        ...formData, 
        stockQuantity: parseInt(formData.stockQuantity) || 0, 
        supplierId, 
        image: finalImageUrl,
        unit: formData.unit || null,
        productionDate: formData.productionDate || null,
        expirationDate: formData.expirationDate || null
      };
      // Remove empty optional fields
      if (!payload.unit) delete payload.unit;
      if (!payload.productionDate) delete payload.productionDate;
      if (!payload.expirationDate) delete payload.expirationDate;
      
      if (editingProduct) await api.patch(`/api/v1/product/${editingProduct.id}`, payload);
      else await api.post('/api/v1/product', payload);
      await fetchFilteredProducts(currentPage); setIsModalOpen(false);
    } catch (err: any) { 
      const errorMessage = err.message || "Operation failed.";
      // Check if error is about duplicate product name
      if (errorMessage.includes('PRODUCT_NAME_EXISTS_FOR_SUPPLIER') || 
          errorMessage.includes('already exists') || 
          errorMessage.includes('موجود بالفعل')) {
        setError(t.products.duplicateNameError);
      } else {
        setError(errorMessage);
      }
    } finally { setIsProcessing(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setIsProcessing(true);
    try {
      await api.delete(`/api/v1/product/${deleteConfirmId}`);
      setDeleteConfirmId(null); await fetchFilteredProducts(currentPage);
    } catch (err: any) { alert(err.message || "Failed to delete product."); } finally { setIsProcessing(false); }
  };

  const resetFilters = () => {
    setSearchName(''); setSearchOrigin(''); setFilterCategoryId(''); setFilterSubCategoryId('');
    setCurrentPage(0);
  };

  const handleExportStock = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const langHeader = localStorage.getItem('lang') || 'ar';
      const response = await fetch(`${BASE_URL}/api/v1/product/export-stock`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Accept-Language': langHeader,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.errorMessage || t.products.exportError);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const now = new Date();
      const fileName = `stock-report-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.xlsx`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Show success message
      showToast(t.products.exportSuccess, 'success');
    } catch (err: any) {
      const errorMsg = err.message || t.products.exportError;
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const langHeader = localStorage.getItem('lang') || 'ar';
      const response = await fetch(`${BASE_URL}/api/v1/product/download-template`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Accept-Language': langHeader,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.errorMessage || t.products.downloadTemplateError);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'products-template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showToast(t.products.downloadTemplateSuccess, 'success');
    } catch (err: any) {
      const errorMsg = err.message || t.products.downloadTemplateError;
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      showToast(t.products.invalidFileType, 'error');
      return;
    }

    handleUploadProducts(file);
  };

  const handleUploadProducts = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadResult(null);
    
    try {
      const token = localStorage.getItem('token');
      const langHeader = localStorage.getItem('lang') || 'ar';

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${BASE_URL}/api/v1/product/upload-products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept-Language': langHeader,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.errorMessage || t.products.uploadError);
      }

      const data = await response.json();
      // Support response shape: { content: { success, data: { totalRows, successCount, failedCount, errors } } }
      const result = data.content?.data ?? data.data ?? data;
      const payload = {
        totalRows: result.totalRows ?? 0,
        successCount: result.successCount ?? 0,
        failedCount: result.failedCount ?? 0,
        errors: Array.isArray(result.errors) ? result.errors : [],
      };
      setUploadResult(payload);
      setShowUploadModal(true);

      if (payload.successCount > 0) {
        showToast(
          lang === 'ar' 
            ? `تم إضافة ${payload.successCount} منتج بنجاح`
            : `Successfully added ${payload.successCount} product(s)!`,
          'success'
        );
        await fetchFilteredProducts(currentPage);
      }

      // Don't show toast for failed uploads - details are shown in the report on screen
      // The report will be visible automatically via uploadResult state
    } catch (err: any) {
      const errorMsg = err.message || t.products.uploadError;
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setIsUploading(false);
      if (uploadFileInputRef.current) {
        uploadFileInputRef.current.value = '';
      }
    }
  };

  const activeFiltersCount = [filterCategoryId, filterSubCategoryId, searchName, searchOrigin].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-6 flex flex-col gap-6 font-display animate-in fade-in slide-in-from-bottom-4 duration-700 pb-40 md:pb-8 relative">
      
      {/* Search Header — mobile only; on web search is inside filters */}
      <div className="flex items-center gap-4 md:hidden">
        <div className="flex-1 relative group">
           <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors rtl:left-auto rtl:right-4">search</span>
           <input 
             type="text" 
             value={searchName} 
             onChange={(e) => setSearchName(e.target.value)}
             placeholder={t.products.searchPlaceholder}
             className="w-full h-14 pl-12 pr-6 rtl:pl-6 rtl:pr-12 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold placeholder:text-[11px] placeholder:font-normal focus:border-primary outline-none transition-all shadow-sm"
           />
        </div>
      </div>

      {/* Web: Inline filters (no tooltip) — hidden on mobile; includes search by name */}
      <div className="hidden md:block rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[180px] flex-1 max-w-[240px] space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase px-1 block">{lang === 'ar' ? 'بحث بالاسم' : 'Search by name'}</label>
            <input type="text" value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder={t.products.searchPlaceholder} className="w-full min-h-[42px] bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold placeholder:text-[10px] placeholder:font-medium outline-none focus:border-primary transition-all text-slate-900 dark:text-white" />
          </div>
          <div className="min-w-[160px] space-y-1" ref={categoryDropRef}>
            <label className="text-[10px] font-black text-slate-500 uppercase px-1 block">{t.products.category}</label>
            <div className="relative">
              <button type="button" onClick={() => { setCategoryDropdownOpen((o) => !o); setSubCategoryDropdownOpen(false); }} className="w-full min-h-[42px] flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-2.5 text-xs font-bold outline-none focus:border-primary transition-all text-slate-900 dark:text-white cursor-pointer text-start">
                <span className="truncate pr-6 rtl:pl-6 rtl:pr-0">{filterCategoryId ? (lang === 'ar' ? categories.find(c => c.id === filterCategoryId)?.arabicName : categories.find(c => c.id === filterCategoryId)?.name) : t.products.selectCategory}</span>
                <span className={`material-symbols-outlined absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg shrink-0 transition-transform duration-200 ${categoryDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              {categoryDropdownOpen && (
                <div className={`absolute top-full mt-1.5 z-[100] w-full min-w-[200px] max-h-[240px] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-2 custom-scrollbar animate-in fade-in duration-150 ${lang === 'ar' ? 'right-0' : 'left-0'}`}>
                  <button type="button" onClick={() => { setFilterCategoryId(''); setCategoryDropdownOpen(false); }} className="w-full px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-start transition-colors first:rounded-t-xl">
                    {t.products.selectCategory}
                  </button>
                  {categories.map((c) => (
                    <button key={c.id} type="button" onClick={() => { setFilterCategoryId(c.id); setCategoryDropdownOpen(false); }} className="w-full px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-start transition-colors">
                      {lang === 'ar' ? c.arabicName : c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="min-w-[160px] space-y-1" ref={subCategoryDropRef}>
            <label className="text-[10px] font-black text-slate-500 uppercase px-1 block">{t.products.subCategory}</label>
            <div className="relative">
              <button type="button" onClick={() => { setSubCategoryDropdownOpen((o) => !o); setCategoryDropdownOpen(false); }} disabled={!filterCategoryId} className="w-full min-h-[42px] flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-2.5 text-xs font-bold outline-none focus:border-primary transition-all disabled:opacity-30 text-slate-900 dark:text-white cursor-pointer text-start disabled:cursor-not-allowed">
                <span className="truncate pr-6 rtl:pl-6 rtl:pr-0">{filterSubCategoryId ? (lang === 'ar' ? filterSubCategories.find(s => s.id === filterSubCategoryId)?.arabicName : filterSubCategories.find(s => s.id === filterSubCategoryId)?.name) : t.products.selectSubCategory}</span>
                <span className={`material-symbols-outlined absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg shrink-0 transition-transform duration-200 ${subCategoryDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              {subCategoryDropdownOpen && (
                <div className={`absolute top-full mt-1.5 z-[100] w-full min-w-[200px] max-h-[240px] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-2 custom-scrollbar animate-in fade-in duration-150 ${lang === 'ar' ? 'right-0' : 'left-0'}`}>
                  <button type="button" onClick={() => { setFilterSubCategoryId(''); setSubCategoryDropdownOpen(false); }} className="w-full px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-start transition-colors first:rounded-t-xl">
                    {t.products.selectSubCategory}
                  </button>
                  {filterSubCategories.map((s) => (
                    <button key={s.id} type="button" onClick={() => { setFilterSubCategoryId(s.id); setSubCategoryDropdownOpen(false); }} className="w-full px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-start transition-colors">
                      {lang === 'ar' ? s.arabicName : s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="min-w-[180px] flex-1 space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase px-1 block">{t.products.origin}</label>
            <input type="text" value={searchOrigin} onChange={(e) => setSearchOrigin(e.target.value)} placeholder={t.products.originPlaceholder} className="w-full min-h-[42px] bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold placeholder:text-[10px] placeholder:font-medium outline-none focus:border-primary transition-all text-slate-900 dark:text-white" />
          </div>
          <button type="button" onClick={resetFilters} className="text-[10px] font-black text-primary hover:underline uppercase shrink-0 self-end pb-2.5">{t.products.clearAll}</button>
          <button 
            type="button" 
            onClick={handleDownloadTemplate} 
            disabled={isDownloadingTemplate}
            className="shrink-0 self-end pb-2.5 min-h-[42px] px-5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-black text-[12px] hover:border-primary hover:text-primary transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloadingTemplate ? (
              <div className="size-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">file_download</span>
                {t.products.downloadTemplate}
              </>
            )}
          </button>
          <label className="shrink-0 self-end pb-2.5 min-h-[42px] px-5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-black text-[12px] hover:border-primary hover:text-primary transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            {isUploading ? (
              <div className="size-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">upload_file</span>
                {t.products.uploadProducts}
              </>
            )}
            <input
              ref={uploadFileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="hidden"
            />
          </label>
          <button 
            type="button" 
            onClick={handleExportStock} 
            disabled={isExporting}
            className="shrink-0 self-end pb-2.5 min-h-[42px] px-5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-black text-[12px] hover:border-primary hover:text-primary transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <div className="size-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">download</span>
                {t.products.exportStock}
              </>
            )}
          </button>
          <button type="button" onClick={openAddModal} className="shrink-0 self-end pb-2.5 min-h-[42px] px-5 rounded-xl bg-primary text-white font-black text-[12px] shadow-lg hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-lg">add</span>
            {t.products.addProduct}
          </button>
        </div>
      </div>

      {/* Upload Results Report - Visible on Screen */}
      {uploadResult && (
        <div className={`rounded-2xl border-2 p-6 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300 ${
          uploadResult.failedCount > 0 
            ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800' 
            : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`size-10 rounded-xl flex items-center justify-center ${
                uploadResult.failedCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'
              } text-white`}>
                <span className="material-symbols-outlined text-xl">
                  {uploadResult.failedCount > 0 ? 'warning' : 'check_circle'}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'تقرير رفع المنتجات' : 'Upload Report'}
                </h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {lang === 'ar' ? 'ملخص تفصيلي للعملية' : 'Detailed operation summary'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => { setUploadResult(null); setShowUploadModal(false); }}
              className="size-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-all flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{lang === 'ar' ? 'إجمالي الصفوف' : 'Total Rows'}</p>
              <p className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">{uploadResult.totalRows || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700">
              <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase mb-1">{lang === 'ar' ? 'نجح' : 'Success'}</p>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">{uploadResult.successCount || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700">
              <p className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase mb-1">{lang === 'ar' ? 'فشل' : 'Failed'}</p>
              <p className="text-2xl font-black text-red-700 dark:text-red-400 tabular-nums">{uploadResult.failedCount || 0}</p>
            </div>
          </div>

          {/* Errors Details */}
          {uploadResult.errors && uploadResult.errors.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-red-500">error</span>
                {lang === 'ar' ? 'تفاصيل الأخطاء' : 'Error Details'} ({uploadResult.errors.length})
              </h4>
              <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-red-200 dark:border-red-800 overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left rtl:text-right">
                    <thead className="bg-red-50 dark:bg-red-900/20 border-b-2 border-red-200 dark:border-red-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-[11px] font-black text-red-700 dark:text-red-400 uppercase">{lang === 'ar' ? 'رقم الصف' : 'Row #'}</th>
                        <th className="px-4 py-3 text-[11px] font-black text-red-700 dark:text-red-400 uppercase">{lang === 'ar' ? 'اسم المنتج' : 'Product Name'}</th>
                        <th className="px-4 py-3 text-[11px] font-black text-red-700 dark:text-red-400 uppercase">{lang === 'ar' ? 'رسالة الخطأ' : 'Error Message'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100 dark:divide-red-900/20">
                      {uploadResult.errors.map((error: any, index: number) => (
                        <tr key={index} className="hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                          <td className="px-4 py-3 text-sm font-black text-slate-700 dark:text-slate-300 tabular-nums bg-slate-50 dark:bg-slate-800/50">
                            {error.rowNumber || index + 1}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                            {error.productName || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400">
                            {error.errorMessage || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {(!uploadResult.errors || uploadResult.errors.length === 0) && uploadResult.successCount > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700">
              <span className="material-symbols-outlined text-2xl text-emerald-600 dark:text-emerald-400">check_circle</span>
              <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                {lang === 'ar' 
                  ? `تم رفع ${uploadResult.successCount} منتج بنجاح!` 
                  : `Successfully uploaded ${uploadResult.successCount} product(s)!`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Grid Area */}
      <div className="min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40">
             <div className="size-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-4"></div>
             <p className="text-[13px] font-black text-slate-500 animate-pulse uppercase tracking-[0.2em]">Synchronizing...</p>
          </div>
        ) : (
          <>
            {products.length === 0 ? (
              <div className="py-32 text-center flex flex-col items-center gap-6 opacity-30 animate-in fade-in duration-700">
                 <span className="material-symbols-outlined text-7xl">inventory_2</span>
                 <div className="space-y-1">
                   <h3 className="text-xl font-black">{t.products.empty}</h3>
                   <p className="text-sm font-bold">{lang === 'ar' ? 'ابدأ بإضافة منتجاتك الأولى للكتالوج.' : 'Start by adding your first products to the catalog.'}</p>
                 </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {products.map((product, idx) => (
                  <div 
                    key={product.id} 
                    className="group relative bg-white dark:bg-slate-900 rounded-[1.5rem] p-3 md:p-4 shadow-sm border border-slate-100 dark:border-slate-800 transition-all duration-300 hover:border-primary/40 animate-in fade-in slide-in-from-bottom-2 flex gap-4 md:gap-6 items-center"
                    style={{ animationDelay: `${idx * 20}ms` }}
                  >
                    <div className="relative size-24 md:size-32 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0 shadow-inner">
                      {product.image ? (
                        <img src={product.image} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" alt={product.name} />
                      ) : (
                        <div className="size-full flex items-center justify-center text-slate-200">
                           <span className="material-symbols-outlined text-3xl">image</span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                         <div className={`size-2.5 rounded-full border-2 border-white dark:border-slate-900 ${product.inStock ? 'bg-emerald-500' : 'bg-red-500'} shadow-sm`}></div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-1">
                      <div>
                        <h4 className="text-sm md:text-base font-black text-slate-800 dark:text-white line-clamp-1 leading-tight tracking-tight">{product.name}</h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                           <div className="flex items-center gap-1.5 text-slate-400">
                              <span className="material-symbols-outlined text-[18px] text-primary/60">category</span>
                              <span className="text-[11px] font-bold uppercase truncate max-w-[180px]">
                                {lang === 'ar' 
                                  ? `${product.category?.arabicName || ''} > ${product.subCategory?.arabicName || ''}`
                                  : `${product.category?.name || ''} > ${product.subCategory?.name || ''}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400">
                               <span className="material-symbols-outlined text-[18px] text-primary/60">public</span>
                               <span className="text-[11px] font-bold uppercase tabular-nums">{product.origin}</span>
                            </div>
                            {product.unit && (
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <span className="material-symbols-outlined text-[18px] text-primary/60">straighten</span>
                                <span className="text-[11px] font-bold uppercase">{product.unit}</span>
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
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-4">
                         <div className="flex items-center gap-1 text-primary">
                            <span className="text-[11px] font-black">{lang === 'ar' ? 'المخزون :' : 'Stock :'}</span>
                            <span className="text-lg font-black tabular-nums">{product.stockQuantity}</span>
                            {product.unit && (
                              <span className="text-[11px] font-black uppercase">{product.unit}</span>
                            )}
                            {!product.unit && (
                              <span className="text-[11px] font-black uppercase">{lang === 'ar' ? 'وحدة' : 'Units'}</span>
                            )}
                         </div>
                         <div className="flex items-center gap-2">
                            <button onClick={() => openEditModal(product)} className="size-9 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center border border-slate-200/50"><span className="material-symbols-outlined text-lg">edit</span></button>
                            <button onClick={() => setDeleteConfirmId(product.id)} className="size-9 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center border border-red-100"><span className="material-symbols-outlined text-lg">delete</span></button>
                         </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Action Buttons Area — mobile only */}
      <div className="fixed bottom-32 left-0 right-0 z-[130] pointer-events-none px-6 md:hidden">
        <div className="max-w-[1200px] mx-auto flex flex-col items-end gap-3 pointer-events-auto">
          <button onClick={openAddModal} className="size-14 rounded-full bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center active:scale-90 transition-all border-2 border-white/20"><span className="material-symbols-outlined text-2xl">add</span></button>
          {/* Actions FAB: Template / Upload / Export */}
          <div className="relative" ref={mobileActionsRef}>
            <button 
              onClick={() => setShowMobileActions(!showMobileActions)} 
              className="size-14 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xl border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-90 transition-all hover:border-primary hover:text-primary"
            >
              <span className="material-symbols-outlined text-2xl">more_vert</span>
            </button>
            {showMobileActions && (
              <div className="absolute bottom-full mb-3 z-[250] w-[260px] left-0 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">{lang === 'ar' ? 'خيارات' : 'Actions'}</p>
                </div>
                <div className="py-2">
                <button 
                  type="button"
                  onClick={() => { handleDownloadTemplate(); setShowMobileActions(false); }}
                  disabled={isDownloadingTemplate}
                  className="w-full px-4 py-3 flex items-center gap-3 text-start text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {isDownloadingTemplate ? <div className="size-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin" /> : <span className="material-symbols-outlined text-xl text-slate-500">file_download</span>}
                  {t.products.downloadTemplate}
                </button>
                <label className="w-full px-4 py-3 flex items-center gap-3 text-start text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                  {isUploading ? <div className="size-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin" /> : <span className="material-symbols-outlined text-xl text-slate-500">upload_file</span>}
                  {t.products.uploadProducts}
                  <input ref={uploadFileInputRef} type="file" accept=".xlsx" onChange={(e) => { handleFileSelect(e); setShowMobileActions(false); }} disabled={isUploading} className="hidden" />
                </label>
                <button 
                  type="button"
                  onClick={() => { handleExportStock(); setShowMobileActions(false); }}
                  disabled={isExporting}
                  className="w-full px-4 py-3 flex items-center gap-3 text-start text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {isExporting ? <div className="size-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin" /> : <span className="material-symbols-outlined text-xl text-slate-500">download</span>}
                  {t.products.exportStock}
                </button>
                </div>
              </div>
            )}
          </div>
          <div className="relative" ref={filterRef}>
            <button onClick={() => setShowFilters(!showFilters)} className={`size-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 border-2 ${activeFiltersCount > 0 ? 'bg-primary text-white border-white/20' : 'bg-slate-900 text-white border-white/10'}`}><span className="material-symbols-outlined text-2xl">tune</span>{activeFiltersCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white size-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-slate-900 shadow-md">{activeFiltersCount}</span>}</button>
            {showFilters && (
              <div className={`absolute bottom-full mb-4 z-[250] w-[320px] sm:w-[450px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in slide-in-from-bottom-2 duration-200 ${lang === 'ar' ? 'left-0' : 'right-0'}`}>
                <div className="flex justify-end items-center mb-6">
                  <button onClick={resetFilters} className="text-[10px] font-black text-primary hover:underline uppercase">{t.products.clearAll}</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5" ref={categoryDropRefMob}>
                    <label className="text-[10px] font-black text-slate-500 uppercase px-1">{t.products.category}</label>
                    <div className="relative">
                      <button type="button" onClick={() => { setCategoryDropdownOpenMob((o) => !o); setSubCategoryDropdownOpenMob(false); }} className="w-full min-h-[42px] flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-2.5 text-xs font-bold outline-none focus:border-primary transition-all text-slate-900 dark:text-white cursor-pointer text-start">
                        <span className="truncate pr-6 rtl:pl-6 rtl:pr-0">{filterCategoryId ? (lang === 'ar' ? categories.find(c => c.id === filterCategoryId)?.arabicName : categories.find(c => c.id === filterCategoryId)?.name) : t.products.selectCategory}</span>
                        <span className={`material-symbols-outlined absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg shrink-0 transition-transform duration-200 ${categoryDropdownOpenMob ? 'rotate-180' : ''}`}>expand_more</span>
                      </button>
                      {categoryDropdownOpenMob && (
                        <div className={`absolute top-full mt-1.5 z-[260] w-full min-w-[200px] max-h-[220px] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-2 custom-scrollbar animate-in fade-in duration-150 ${lang === 'ar' ? 'right-0' : 'left-0'}`}>
                          <button type="button" onClick={() => { setFilterCategoryId(''); setCategoryDropdownOpenMob(false); }} className="w-full px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-start transition-colors">{t.products.selectCategory}</button>
                          {categories.map((c) => (
                            <button key={c.id} type="button" onClick={() => { setFilterCategoryId(c.id); setCategoryDropdownOpenMob(false); }} className="w-full px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-start transition-colors">{lang === 'ar' ? c.arabicName : c.name}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5" ref={subCategoryDropRefMob}>
                    <label className="text-[10px] font-black text-slate-500 uppercase px-1">{t.products.subCategory}</label>
                    <div className="relative">
                      <button type="button" onClick={() => { setSubCategoryDropdownOpenMob((o) => !o); setCategoryDropdownOpenMob(false); }} disabled={!filterCategoryId} className="w-full min-h-[42px] flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-2.5 text-xs font-bold outline-none focus:border-primary transition-all disabled:opacity-30 text-slate-900 dark:text-white cursor-pointer text-start disabled:cursor-not-allowed">
                        <span className="truncate pr-6 rtl:pl-6 rtl:pr-0">{filterSubCategoryId ? (lang === 'ar' ? filterSubCategories.find(s => s.id === filterSubCategoryId)?.arabicName : filterSubCategories.find(s => s.id === filterSubCategoryId)?.name) : t.products.selectSubCategory}</span>
                        <span className={`material-symbols-outlined absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg shrink-0 transition-transform duration-200 ${subCategoryDropdownOpenMob ? 'rotate-180' : ''}`}>expand_more</span>
                      </button>
                      {subCategoryDropdownOpenMob && (
                        <div className={`absolute top-full mt-1.5 z-[260] w-full min-w-[200px] max-h-[220px] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-2 custom-scrollbar animate-in fade-in duration-150 ${lang === 'ar' ? 'right-0' : 'left-0'}`}>
                          <button type="button" onClick={() => { setFilterSubCategoryId(''); setSubCategoryDropdownOpenMob(false); }} className="w-full px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-start transition-colors">{t.products.selectSubCategory}</button>
                          {filterSubCategories.map((s) => (
                            <button key={s.id} type="button" onClick={() => { setFilterSubCategoryId(s.id); setSubCategoryDropdownOpenMob(false); }} className="w-full px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-start transition-colors">{lang === 'ar' ? s.arabicName : s.name}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="sm:col-span-2 space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase px-1">{t.products.origin}</label><input type="text" value={searchOrigin} onChange={(e) => setSearchOrigin(e.target.value)} placeholder={t.products.originPlaceholder} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold placeholder:text-[10px] placeholder:font-medium outline-none focus:border-primary transition-all text-slate-900 dark:text-white" /></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <PaginationFooter
        currentPage={currentPage}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        currentCount={products.length}
      />

      {/* ... (Add/Edit Product Modal remains the same) ... */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-[90%] md:w-full max-w-lg md:max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-500 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
                 <div className="flex items-center gap-4"><div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-2xl">inventory_2</span></div><div><h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">{editingProduct ? t.products.editProduct : t.products.addProduct}</h3><p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">{t.products.updateCatalog}</p></div></div>
                 <button onClick={() => setIsModalOpen(false)} className="size-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-xl">close</span></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {error && (
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
                    <p className="text-sm font-black text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}
                <form onSubmit={handleSubmit} id="productForm" className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.products.name}</label>
                    <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm md:text-base font-bold placeholder:text-xs md:placeholder:text-sm placeholder:font-medium focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white" placeholder={t.products.namePlaceholder} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.products.origin}</label>
                      <input required type="text" value={formData.origin} onChange={(e) => setFormData({...formData, origin: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm md:text-base font-bold placeholder:text-xs md:placeholder:text-sm placeholder:font-medium focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white" placeholder={t.products.originPlaceholder} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 uppercase px-1">{lang === 'ar' ? 'الكمية' : 'Stock Quantity'}</label>
                      <input required type="number" min="0" value={formData.stockQuantity} onChange={(e) => setFormData({...formData, stockQuantity: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.products.unit}</label>
                      <input type="text" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold placeholder:text-xs placeholder:font-medium focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white" placeholder={lang === 'ar' ? 'مثال: كجم، لتر' : 'e.g. kg, liter'} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.products.productionDate}</label>
                      <input type="date" value={formData.productionDate} onChange={(e) => setFormData({...formData, productionDate: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.products.expirationDate}</label>
                      <input type="date" value={formData.expirationDate} onChange={(e) => setFormData({...formData, expirationDate: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.products.category}</label>
                    <Dropdown options={categories.map(c => ({ value: c.id, label: lang === 'ar' ? (c.arabicName || '') : (c.name || '') }))} value={formData.categoryId} onChange={(catId) => { setFormData({...formData, categoryId: catId, subCategoryId: ''}); if (catId) api.get<SubCategory[]>(`/api/v1/category/sub-category?categoryId=${catId}`).then(setSubCategories); }} placeholder={t.products.selectCategory} isRtl={lang === 'ar'} triggerClassName="w-full min-h-[44px] flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white cursor-pointer text-start" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.products.subCategory}</label>
                    <Dropdown options={subCategories.map(s => ({ value: s.id, label: lang === 'ar' ? (s.arabicName || '') : (s.name || '') }))} value={formData.subCategoryId} onChange={(v) => setFormData({...formData, subCategoryId: v})} placeholder={t.products.selectSubCategory} disabled={!formData.categoryId} isRtl={lang === 'ar'} triggerClassName="w-full min-h-[44px] flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white cursor-pointer text-start disabled:opacity-30 disabled:cursor-not-allowed" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.products.image}</label>
                    <div onClick={() => fileInputRef.current?.click()} className={`h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${imagePreview ? 'border-primary' : 'border-slate-200 hover:border-primary bg-slate-50/50 dark:bg-slate-800/50'}`}>
                      {imagePreview ? (
                        <img src={imagePreview} className="size-full object-cover" alt="Preview" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">add_a_photo</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase">{t.products.clickToUpload}</span>
                        </>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <input type="checkbox" id="modalStock" className="size-5 rounded-md border-slate-300 text-primary focus:ring-primary" checked={formData.inStock} onChange={(e) => setFormData({...formData, inStock: e.target.checked})} />
                    <label htmlFor="modalStock" className="text-sm font-black text-slate-700 dark:text-slate-300 cursor-pointer">{t.products.stockStatus}</label>
                  </div>
                </form>
              </div>
              <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0"><button form="productForm" type="submit" disabled={isProcessing} className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">{isProcessing ? (<div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>) : (<>{editingProduct ? t.profile.saveChanges : t.products.addProduct}<span className="material-symbols-outlined">verified</span></>)}</button></div>
           </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-[90%] md:w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 p-8 text-center animate-in zoom-in-95"><div className="size-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6"><span className="material-symbols-outlined text-3xl">warning</span></div><h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">{lang === 'ar' ? 'حذف المنتج؟' : 'Delete Product?'}</h3><p className="text-sm text-slate-500 font-bold mb-8">{t.products.deleteConfirm}</p><div className="flex gap-3"><button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 bg-slate-100 rounded-xl font-black text-slate-500 hover:bg-slate-200 transition-all">{t.categories.cancel}</button><button onClick={handleDelete} disabled={isProcessing} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black shadow-lg hover:bg-red-700 transition-all flex items-center justify-center">{isProcessing ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (lang === 'ar' ? 'حذف' : 'Delete')}</button></div></div>
        </div>
      )}

      {/* Upload Results Modal */}
      {showUploadModal && uploadResult && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-500 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className={`size-12 rounded-xl flex items-center justify-center shadow-lg ${uploadResult.failedCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'} text-white`}>
                  <span className="material-symbols-outlined text-2xl">
                    {uploadResult.failedCount > 0 ? 'warning' : 'check_circle'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">
                    {lang === 'ar' ? 'نتائج رفع المنتجات' : 'Upload Results'}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">
                    {lang === 'ar' ? 'ملخص العملية' : 'Operation Summary'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setShowUploadModal(false); setUploadResult(null); }} 
                className="size-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{lang === 'ar' ? 'إجمالي الصفوف' : 'Total Rows'}</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">{uploadResult.totalRows || 0}</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase mb-2">{lang === 'ar' ? 'نجح' : 'Success'}</p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{uploadResult.successCount || 0}</p>
                </div>
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase mb-2">{lang === 'ar' ? 'فشل' : 'Failed'}</p>
                  <p className="text-2xl font-black text-red-600 dark:text-red-400 tabular-nums">{uploadResult.failedCount || 0}</p>
                </div>
              </div>

              {/* Errors Table */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white">
                    {lang === 'ar' ? 'الأخطاء' : 'Errors'} ({uploadResult.errors.length})
                  </h4>
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left rtl:text-right">
                        <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                          <tr>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase">{lang === 'ar' ? 'الصف' : 'Row'}</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase">{lang === 'ar' ? 'اسم المنتج' : 'Product Name'}</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase">{lang === 'ar' ? 'الخطأ' : 'Error'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {uploadResult.errors.map((error: any, index: number) => (
                            <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                              <td className="px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-300 tabular-nums">
                                {error.rowNumber || index + 1}
                              </td>
                              <td className="px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-200">
                                {error.productName || '-'}
                              </td>
                              <td className="px-4 py-3 text-xs font-bold text-red-600 dark:text-red-400">
                                {error.errorMessage || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {(!uploadResult.errors || uploadResult.errors.length === 0) && (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-6xl text-emerald-500 mb-4">check_circle</span>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-300">
                    {lang === 'ar' ? 'تم رفع جميع المنتجات بنجاح!' : 'All products uploaded successfully!'}
                  </p>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
              <button 
                onClick={() => { setShowUploadModal(false); setUploadResult(null); }} 
                className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
                <span className="material-symbols-outlined">check</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 154, 167, 0.2); border-radius: 10px; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </div>
  );
};

export default Products;
