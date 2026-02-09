import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { Category, SubCategory } from '../../types';
import { api } from '../../api';
import { useToast } from '../../contexts/ToastContext';
import EmptyState from '../../components/EmptyState';

const Categories: React.FC = () => {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedCats, setExpandedCats] = useState<string[]>([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'category' | 'subcategory' } | null>(null);
  const [newCat, setNewCat] = useState({ name: '', arabicName: '' });
  const [newSub, setNewSub] = useState({ name: '', arabicName: '', categoryId: '', parentName: '' });
  
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<Category[]>('/api/v1/category/all');
      setCategories(data.map(c => ({ ...c, subCategories: c.subCategories || [] })));
    } catch (err: any) {
      setError(err.message);
      showToast(err.message || (lang === 'ar' ? 'فشل تحميل الفئات' : 'Failed to load categories'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubCategories = async (categoryId: string) => {
    setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, isLoadingSubs: true } : c));
    try {
      const subs = await api.get<SubCategory[]>(`/api/v1/category/sub-category?categoryId=${categoryId}`);
      setCategories(prev => prev.map(c => 
        c.id === categoryId ? { ...c, subCategories: subs, isLoadingSubs: false } : c
      ));
    } catch (err: any) {
      setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, isLoadingSubs: false } : c));
      showToast(err.message || (lang === 'ar' ? 'فشل تحميل التصنيفات الفرعية' : 'Failed to load subcategories'), 'error');
    }
  };

  const toggleExpand = (id: string) => {
    const isExpanding = !expandedCats.includes(id);
    if (isExpanding) {
      setExpandedCats(prev => [...prev, id]);
      const cat = categories.find(c => c.id === id);
      if (cat && (!cat.subCategories || cat.subCategories.length === 0)) {
        fetchSubCategories(id);
      }
    } else {
      setExpandedCats(prev => prev.filter(i => i !== id));
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.name || !newCat.arabicName) return;
    
    setIsProcessing(true);
    try {
      await api.post('/api/v1/category', {
        name: newCat.name,
        arabicName: newCat.arabicName
      });
      await fetchCategories();
      setNewCat({ name: '', arabicName: '' });
      setShowCatModal(false);
      showToast(t.categories.successAdd, 'success');
    } catch (err: any) {
      showToast(err.message || (lang === 'ar' ? 'فشل إضافة الفئة' : 'Failed to add category'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.name || !newSub.arabicName || !newSub.categoryId) {
      return;
    }
    
    setIsProcessing(true);
    try {
      await api.post('/api/v1/category/sub-category', {
        name: newSub.name,
        arabicName: newSub.arabicName,
        categoryId: newSub.categoryId
      });
      
      await fetchSubCategories(newSub.categoryId);
      setNewSub({ name: '', arabicName: '', categoryId: '', parentName: '' });
      setShowSubModal(false);
      showToast(t.categories.successAddSub, 'success');
    } catch (err: any) {
      showToast(err.message || (lang === 'ar' ? 'فشل إضافة التصنيف الفرعي' : 'Failed to add subcategory'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const openSubModal = (cat: Category) => {
     setNewSub({ 
       name: '', 
       arabicName: '', 
       categoryId: cat.id, 
       parentName: lang === 'ar' ? cat.arabicName : cat.name 
     });
     setShowSubModal(true);
  };

  const confirmDeleteAction = async () => {
    if (!itemToDelete) return;
    setIsProcessing(true);
    
    try {
      if (itemToDelete.type === 'category') {
        await api.delete(`/api/v1/category?categoryId=${itemToDelete.id}`);
        setCategories(prev => prev.filter(c => c.id !== itemToDelete.id));
        showToast(t.categories.successDelete, 'success');
      } else {
        await api.delete(`/api/v1/category/sub-category?subCategoryId=${itemToDelete.id}`);
        setCategories(prev => prev.map(c => ({
          ...c,
          subCategories: c.subCategories?.filter(s => s.id !== itemToDelete.id)
        })));
        showToast(t.categories.successDeleteSub, 'success');
      }
      setItemToDelete(null);
    } catch (err: any) {
      showToast(err.message || (lang === 'ar' ? 'فشل الحذف' : 'Failed to delete'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full py-6 pb-24 md:pb-6 relative font-display animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Mobile: Floating Action Button */}
      <div className="md:hidden fixed bottom-32 left-0 right-0 z-[130] pointer-events-none px-6">
        <div className={`w-full flex justify-end pointer-events-auto ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
          <button 
            onClick={() => setShowCatModal(true)}
            className="size-14 rounded-full bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/40 flex items-center justify-center active:scale-90 transition-all border-2 border-white/20"
            aria-label={t.categories.addCategory}
          >
            <span className="material-symbols-outlined text-2xl">add</span>
          </button>
        </div>
      </div>

      {isLoading && categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="size-12 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-bold text-sm">{lang === 'ar' ? 'جاري التحميل...' : 'Loading categories...'}</p>
        </div>
      ) : error ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-primary/20 dark:border-slate-800 rounded-2xl shadow-lg">
          <span className="material-symbols-outlined text-5xl text-red-500 mb-6">cloud_off</span>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{lang === 'ar' ? 'خطأ في الاتصال' : 'Connection Error'}</h3>
          <p className="text-slate-500 mb-8 text-base">{error}</p>
          <button onClick={fetchCategories} className="px-10 py-3 bg-primary text-white rounded-xl font-black text-base active:scale-95 shadow-md">{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</button>
        </div>
      ) : categories.length === 0 ? (
        <EmptyState 
          title={lang === 'ar' ? 'لا توجد فئات' : 'No Categories'} 
          subtitle={lang === 'ar' ? 'ابدأ بإضافة فئة جديدة' : 'Start by adding a new category'} 
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden">
          {/* Table Header with Add Button */}
          <div className="bg-primary/10 dark:bg-primary/5 border-b-2 border-primary/20 px-6 py-3 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-700 dark:text-slate-300">
              {lang === 'ar' ? 'الفئات والتصنيفات الفرعية' : 'Categories & Subcategories'}
            </h2>
            <button
              onClick={() => setShowCatModal(true)}
              className="hidden md:flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg shadow-md shadow-primary/20 font-black transition-all active:scale-95 text-xs"
            >
              <span className="material-symbols-outlined text-base">add</span>
              {t.categories.addCategory}
            </button>
          </div>

          {/* Tree View List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {categories.map((cat, idx) => {
              const isExpanded = expandedCats.includes(cat.id);
              return (
                <div key={cat.id} className="animate-in fade-in slide-in-from-left-2 duration-200" style={{ animationDelay: `${idx * 30}ms` }}>
                  {/* Category Row */}
                  <div 
                    onClick={() => toggleExpand(cat.id)}
                    className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className={`size-7 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                            isExpanded
                              ? 'bg-primary text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className={`material-symbols-outlined text-base transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                            chevron_right
                          </span>
                        </div>
                        <div className="size-9 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                          <span className="material-symbols-outlined text-lg">folder</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-black text-slate-900 dark:text-white truncate">
                            {lang === 'ar' ? cat.arabicName : cat.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">
                            {lang === 'ar' ? cat.name : cat.arabicName}
                          </div>
                        </div>
                        {cat.subCategories && cat.subCategories.length > 0 && (
                          <span className="px-2.5 py-1 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-xs font-black border border-primary/20 shrink-0">
                            {cat.subCategories.length}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openSubModal(cat)}
                          className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all active:scale-90"
                          title={t.categories.addSubCategory}
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                        <button
                          onClick={() => setItemToDelete({ id: cat.id, type: 'category' })}
                          className="size-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-90"
                          title={lang === 'ar' ? 'حذف الفئة' : 'Delete category'}
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Subcategories - Indented */}
                  {isExpanded && (
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800">
                      {cat.isLoadingSubs ? (
                        <div className="flex justify-center py-8 px-6">
                          <div className="size-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        </div>
                      ) : cat.subCategories && cat.subCategories.length > 0 ? (
                        <div className="px-6 py-3 space-y-2">
                          {cat.subCategories.map((sub, subIdx) => (
                            <div
                              key={sub.id}
                              className="group/sub flex items-center justify-between gap-3 pl-8 pr-4 py-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary/30 hover:shadow-sm transition-all animate-in fade-in slide-in-from-left-2 duration-200"
                              style={{ animationDelay: `${subIdx * 20}ms` }}
                            >
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="size-1.5 rounded-full bg-primary shrink-0"></div>
                                <div className="size-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
                                  <span className="material-symbols-outlined text-sm">label</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                                    {lang === 'ar' ? sub.arabicName : sub.name}
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">
                                    {lang === 'ar' ? sub.name : sub.arabicName}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => setItemToDelete({ id: sub.id, type: 'subcategory' })}
                                className="size-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-all active:scale-90 shrink-0"
                              >
                                <span className="material-symbols-outlined text-sm">close</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-6 py-8 text-center">
                          <p className="text-xs text-slate-400 font-bold mb-3">{t.categories.noSubs}</p>
                          <button
                            onClick={() => openSubModal(cat)}
                            className="px-4 py-2 bg-primary text-white rounded-lg font-black text-xs hover:bg-primary/90 transition-all active:scale-95 inline-flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-sm">add</span>
                            {t.categories.addSubCategory}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[300] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full md:w-[90%] md:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl shadow-2xl border-t border-x md:border border-primary/20 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-8 text-center">
              <div className="mx-auto size-16 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mb-6 ring-4 ring-red-50 dark:ring-red-900/10">
                <span className="material-symbols-outlined text-3xl">warning</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">
                {lang === 'ar' ? 'هل أنت متأكد؟' : 'Confirm Action'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed font-bold">
                {lang === 'ar' ? 'سيتم حذف هذا العنصر ولن يمكنك التراجع عن هذا الإجراء.' : 'This item will be permanently removed. This action cannot be reversed.'}
              </p>
              <div className="flex gap-3">
                <button
                  disabled={isProcessing}
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-3 text-sm font-black text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-slate-700"
                >
                  {t.categories.cancel}
                </button>
                <button
                  disabled={isProcessing}
                  onClick={confirmDeleteAction}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-xl shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center text-sm"
                >
                  {isProcessing ? <div className="size-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div> : (lang === 'ar' ? 'تأكيد الحذف' : 'Confirm')}
                </button>
              </div>
            </div>
            {/* Close Button at Bottom - Mobile Only */}
            <div className="md:hidden px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                onClick={() => setItemToDelete(null)}
                className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-black text-sm flex items-center justify-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-[300] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full md:w-[90%] md:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl shadow-2xl border-t border-x md:border border-primary/20 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            
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
                  setIsSubcategoryModalOpen(false);
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
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-2xl">category</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">{t.categories.addCategory}</h3>
                  <p className="text-[10px] font-black text-slate-400 mt-2">{t.categories.nameEnArLabel}</p>
                </div>
              </div>
              <button onClick={() => setShowCatModal(false)} className="size-8 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <form id="addCatForm" onSubmit={handleAddCategory} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 px-1">{t.categories.nameEn}</label>
                  <input
                    type="text"
                    value={newCat.name}
                    onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                    placeholder={lang === 'ar' ? t.categories.nameArPlaceholder : t.categories.nameEnPlaceholder}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm md:text-base font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 px-1">{t.categories.nameAr}</label>
                  <input
                    type="text"
                    value={newCat.arabicName}
                    onChange={(e) => setNewCat({ ...newCat, arabicName: e.target.value })}
                    placeholder={lang === 'ar' ? t.categories.nameArPlaceholder : t.categories.nameEnPlaceholder}
                    required
                    dir="rtl"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm md:text-base font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white placeholder:text-slate-400 text-right"
                  />
                </div>
              </form>
            </div>
            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0 flex gap-3">
              <button type="button" onClick={() => setShowCatModal(false)} className="flex-1 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">{t.categories.cancel}</button>
              <button form="addCatForm" type="submit" disabled={isProcessing} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">
                {isProcessing ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>{t.categories.save}<span className="material-symbols-outlined">verified</span></>}
              </button>
            </div>
            {/* Close Button at Bottom - Mobile Only */}
            <div className="md:hidden px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                onClick={() => setShowCatModal(false)}
                className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-black text-sm flex items-center justify-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Sub-category Modal */}
      {showSubModal && (
        <div className="fixed inset-0 z-[300] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full md:w-[90%] md:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl shadow-2xl border-t border-x md:border border-primary/20 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-2xl">list_alt</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">{t.categories.addSubCategory}</h3>
                  <p className="text-[10px] font-black text-slate-400 mt-2">{t.categories.addingTo}: {newSub.parentName}</p>
                </div>
              </div>
              <button onClick={() => setShowSubModal(false)} className="size-8 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <form id="addSubForm" onSubmit={handleAddSubCategory} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 px-1">{t.categories.nameEn}</label>
                  <input
                    type="text"
                    value={newSub.name}
                    onChange={(e) => setNewSub({ ...newSub, name: e.target.value })}
                    placeholder={lang === 'ar' ? t.categories.subNameArPlaceholder : t.categories.subNameEnPlaceholder}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm md:text-base font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 px-1">{t.categories.nameAr}</label>
                  <input
                    type="text"
                    value={newSub.arabicName}
                    onChange={(e) => setNewSub({ ...newSub, arabicName: e.target.value })}
                    placeholder={lang === 'ar' ? t.categories.subNameArPlaceholder : t.categories.subNameEnPlaceholder}
                    required
                    dir="rtl"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-sm md:text-base font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white placeholder:text-slate-400 text-right"
                  />
                </div>
              </form>
            </div>
            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0 flex gap-3">
              <button type="button" onClick={() => setShowSubModal(false)} className="flex-1 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">{t.categories.cancel}</button>
              <button form="addSubForm" type="submit" disabled={isProcessing} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">
                {isProcessing ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>{t.categories.saveSub}<span className="material-symbols-outlined">verified</span></>}
              </button>
            </div>
            {/* Close Button at Bottom - Mobile Only */}
            <div className="md:hidden px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                onClick={() => setShowSubModal(false)}
                className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-black text-sm flex items-center justify-center gap-2 active:scale-95"
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
      `}</style>
    </div>
  );
};

export default Categories;
