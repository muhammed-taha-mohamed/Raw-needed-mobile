
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { Category, SubCategory } from '../../types';

interface Product {
  id: string;
  name: string;
  origin: string;
  supplierId: string;
  inStock: boolean;
  stockQuantity: number;
  categoryId: string;
  subCategoryId: string;
  image: string;
  category?: { id: string; name: string; arabicName: string; };
  subCategory?: { id: string | null; name: string; arabicName: string; };
}

const Products: React.FC = () => {
  const { lang, t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 12;

  const [searchName, setSearchName] = useState('');
  const [searchOrigin, setSearchOrigin] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterSubCategoryId, setFilterSubCategoryId] = useState('');
  const [filterSubCategories, setFilterSubCategories] = useState<SubCategory[]>([]);
  
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

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
    image: '' 
  });

  useEffect(() => {
    fetchInitialData();
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) setShowFilters(false);
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
    setFormData({ name: '', origin: '', inStock: true, stockQuantity: '0', categoryId: '', subCategoryId: '', image: '' });
    setSubCategories([]); setIsModalOpen(true);
  };

  const openEditModal = async (product: Product) => {
    setEditingProduct(product); setSelectedFile(null); setImagePreview(product.image || null);
    const catId = product.category?.id || product.categoryId;
    setFormData({ 
      name: product.name, 
      origin: product.origin, 
      inStock: product.inStock, 
      stockQuantity: product.stockQuantity?.toString() || '0', 
      categoryId: catId, 
      subCategoryId: product.subCategory?.id || product.subCategoryId, 
      image: product.image 
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
      const payload = { ...formData, stockQuantity: parseInt(formData.stockQuantity) || 0, supplierId, image: finalImageUrl };
      if (editingProduct) await api.patch(`/api/v1/product/${editingProduct.id}`, payload);
      else await api.post('/api/v1/product', payload);
      await fetchFilteredProducts(currentPage); setIsModalOpen(false);
    } catch (err: any) { setError(err.message || "Operation failed."); } finally { setIsProcessing(false); }
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

  const activeFiltersCount = [filterCategoryId, filterSubCategoryId, searchName, searchOrigin].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-[1200px] px-4 md:px-10 py-6 flex flex-col gap-6 font-display animate-in fade-in slide-in-from-bottom-4 duration-700 pb-40 relative">
      
      {/* Search Header */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative group">
           <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">search</span>
           <input 
             type="text" 
             value={searchName} 
             onChange={(e) => setSearchName(e.target.value)}
             placeholder={t.products.searchPlaceholder}
             className="w-full h-14 pl-12 pr-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:border-primary outline-none transition-all shadow-sm"
           />
        </div>
      </div>

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
              <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4">
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
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-4">
                         <div className="flex items-center gap-1 text-primary">
                            <span className="text-[11px] font-black">{lang === 'ar' ? 'المخزون :' : 'Stock :'}</span>
                            <span className="text-lg font-black tabular-nums">{product.stockQuantity}</span>
                            <span className="text-[11px] font-black uppercase">{lang === 'ar' ? 'وحدة' : 'Units'}</span>
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

      {/* Floating Action Buttons Area */}
      <div className="fixed bottom-32 left-0 right-0 z-[130] pointer-events-none px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col items-end gap-3 pointer-events-auto">
          <button onClick={openAddModal} className="size-14 rounded-full bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center active:scale-90 transition-all border-2 border-white/20"><span className="material-symbols-outlined text-2xl">add</span></button>
          <div className="relative" ref={filterRef}>
            <button onClick={() => setShowFilters(!showFilters)} className={`size-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 border-2 ${activeFiltersCount > 0 ? 'bg-primary text-white border-white/20' : 'bg-slate-900 text-white border-white/10'}`}><span className="material-symbols-outlined text-2xl">tune</span>{activeFiltersCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white size-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-slate-900 shadow-md">{activeFiltersCount}</span>}</button>
            {showFilters && (
              <div className={`absolute bottom-full mb-4 z-[250] w-[320px] sm:w-[450px] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in slide-in-from-bottom-2 duration-200 ${lang === 'ar' ? 'left-0' : 'right-0'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">{lang === 'ar' ? 'تصفية الكتالوج' : 'Catalog Filters'}</h3>
                  <button onClick={resetFilters} className="text-[10px] font-black text-primary hover:underline uppercase">{lang === 'ar' ? 'مسح الكل' : 'Clear All'}</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase px-1">{t.products.category}</label><div className="relative"><select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)} className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-primary transition-all text-slate-900 dark:text-white"><option value="">{lang === 'ar' ? 'الفئات' : 'Categories'}</option>{categories.map(c => <option key={c.id} value={c.id}>{lang === 'ar' ? c.arabicName : c.name}</option>)}</select><span className={`material-symbols-outlined absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg`}>expand_more</span></div></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase px-1">{t.products.subCategory}</label><div className="relative"><select value={filterSubCategoryId} onChange={(e) => setFilterSubCategoryId(e.target.value)} disabled={!filterCategoryId} className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-primary transition-all disabled:opacity-30 text-slate-900 dark:text-white"><option value="">{lang === 'ar' ? 'الأنواع' : 'Types'}</option>{filterSubCategories.map(s => <option key={s.id} value={s.id}>{lang === 'ar' ? s.arabicName : s.name}</option>)}</select><span className={`material-symbols-outlined absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg`}>expand_more</span></div></div>
                  <div className="sm:col-span-2 space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase px-1">{t.products.origin}</label><input type="text" value={searchOrigin} onChange={(e) => setSearchOrigin(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-primary transition-all text-slate-900 dark:text-white" placeholder="Germany..." /></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Compact Slim Pagination Footer (Pill Style) */}
      {(totalPages > 0) && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-slate-100 dark:border-slate-800 animate-in fade-in duration-500 mt-6 max-w-fit mx-auto sm:mx-0 sm:ml-auto rtl:sm:mr-auto">
           <div className="flex items-center gap-1.5">
              <button 
                onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 0}
                className="size-9 rounded-full border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
              >
                <span className="material-symbols-outlined text-base rtl-flip">chevron_left</span>
              </button>
              
              <div className="flex items-center gap-1">
                 {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                    let pageNum = i;
                    if (totalPages > 5 && currentPage > 2) pageNum = Math.min(currentPage - 2 + i, totalPages - 1);
                    return (
                      <button
                        key={pageNum} onClick={() => handlePageChange(pageNum)}
                        className={`size-9 rounded-full font-black text-[12px] transition-all ${
                          currentPage === pageNum 
                          ? 'bg-primary text-white shadow-md' 
                          : 'bg-white dark:bg-slate-900 text-slate-400 hover:text-primary hover:bg-primary/5'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                 })}
              </div>

              <button 
                onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages - 1}
                className="size-9 rounded-full border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
              >
                <span className="material-symbols-outlined text-base rtl-flip">chevron_right</span>
              </button>
           </div>

           <div className="h-6 w-px bg-slate-100 dark:bg-slate-800 mx-1"></div>

           <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-full shrink-0">
              <span className="text-[11px] font-black text-slate-500 tabular-nums tracking-tighter">
                {products.length} / {totalElements}
              </span>
           </div>
        </div>
      )}

      {/* ... (Add/Edit Product Modal remains the same) ... */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-500 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
                 <div className="flex items-center gap-4"><div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-2xl">inventory_2</span></div><div><h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">{editingProduct ? t.products.editProduct : t.products.addProduct}</h3><p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">{lang === 'ar' ? 'تحديث الكتالوج' : 'Update Catalog'}</p></div></div>
                 <button onClick={() => setIsModalOpen(false)} className="size-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-xl">close</span></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar"><form onSubmit={handleSubmit} id="productForm" className="space-y-5"><div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.products.name}</label><input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white" placeholder="Product Name..." /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.products.origin}</label><input required type="text" value={formData.origin} onChange={(e) => setFormData({...formData, origin: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white" placeholder="Origin..." /></div><div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500 uppercase px-1">{lang === 'ar' ? 'الكمية' : 'Stock Quantity'}</label><input required type="number" min="0" value={formData.stockQuantity} onChange={(e) => setFormData({...formData, stockQuantity: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white" /></div></div><div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.products.category}</label><select required value={formData.categoryId} onChange={(e) => { const catId = e.target.value; setFormData({...formData, categoryId: catId, subCategoryId: ''}); if (catId) api.get<SubCategory[]>(`/api/v1/category/sub-category?categoryId=${catId}`).then(setSubCategories); }} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white"><option value="">Select Category</option>{categories.map(c => <option key={c.id} value={c.id}>{lang === 'ar' ? c.arabicName : c.name}</option>)}</select></div><div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.products.subCategory}</label><select required value={formData.subCategoryId} onChange={(e) => setFormData({...formData, subCategoryId: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white disabled:opacity-30" disabled={!formData.categoryId}><option value="">Select Sub-Category</option>{subCategories.map(s => <option key={s.id} value={s.id}>{lang === 'ar' ? s.arabicName : s.name}</option>)}</select></div><div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.products.image}</label><div onClick={() => fileInputRef.current?.click()} className={`h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${imagePreview ? 'border-primary' : 'border-slate-200 hover:border-primary bg-slate-50/50 dark:bg-slate-800/50'}`}>{imagePreview ? (<img src={imagePreview} className="size-full object-cover" alt="Preview" />) : (<><span className="material-symbols-outlined text-3xl text-slate-300 mb-1">add_a_photo</span><span className="text-[9px] font-black text-slate-400 uppercase">Click to upload</span></>)}</div><input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} /></div><div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700"><input type="checkbox" id="modalStock" className="size-5 rounded-md border-slate-300 text-primary focus:ring-primary" checked={formData.inStock} onChange={(e) => setFormData({...formData, inStock: e.target.checked})} /><label htmlFor="modalStock" className="text-sm font-black text-slate-700 dark:text-slate-300 cursor-pointer">{t.products.stockStatus}</label></div></form></div>
              <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0"><button form="productForm" type="submit" disabled={isProcessing} className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">{isProcessing ? (<div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>) : (<>{editingProduct ? t.profile.saveChanges : t.products.addProduct}<span className="material-symbols-outlined">verified</span></>)}</button></div>
           </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 text-center animate-in zoom-in-95"><div className="size-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6"><span className="material-symbols-outlined text-3xl">warning</span></div><h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">{lang === 'ar' ? 'حذف المنتج؟' : 'Delete Product?'}</h3><p className="text-sm text-slate-500 font-bold mb-8">{t.products.deleteConfirm}</p><div className="flex gap-3"><button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 bg-slate-100 rounded-xl font-black text-slate-500 hover:bg-slate-200 transition-all">{t.categories.cancel}</button><button onClick={handleDelete} disabled={isProcessing} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black shadow-lg hover:bg-red-700 transition-all flex items-center justify-center">{isProcessing ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (lang === 'ar' ? 'حذف' : 'Delete')}</button></div></div>
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
