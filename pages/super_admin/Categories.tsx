import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { Category, SubCategory } from '../../types';
import { api } from '../../api';

const Categories: React.FC = () => {
  const { lang, setLang, t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'grid' | 'table'>('grid');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [expandedCats, setExpandedCats] = useState<string[]>([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'category' | 'subcategory' } | null>(null);
  const [newCat, setNewCat] = useState({ name: '', arabicName: '' });
  const [newSub, setNewSub] = useState({ name: '', arabicName: '', categoryId: '', parentName: '' });
  
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
      setToast({ message: t.categories.successAdd, type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.name || !newSub.arabicName || !newSub.categoryId) {
       console.error("Missing fields for sub-category", newSub);
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
      setToast({ message: t.categories.successAddSub, type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
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
        setToast({ message: t.categories.successDelete, type: 'success' });
      } else {
        await api.delete(`/api/v1/category/sub-category?subCategoryId=${itemToDelete.id}`);
        setCategories(prev => prev.map(c => ({
          ...c,
          subCategories: c.subCategories?.filter(s => s.id !== itemToDelete.id)
        })));
        setToast({ message: t.categories.successDeleteSub, type: 'success' });
      }
      setItemToDelete(null);
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-10 py-6 relative font-display animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-24 ${lang === 'ar' ? 'left-10' : 'right-10'} z-[200] flex items-center gap-3 px-6 py-4 rounded-xl shadow-xl border animate-in slide-in-from-top-10 duration-500 ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300' 
            : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
        }`}>
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
             <span className="material-symbols-outlined text-sm">{toast.type === 'success' ? 'check' : 'priority_high'}</span>
          </div>
          <span className="font-bold text-base ">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      )}

      {/* Action Section */}
      <div className="flex items-center justify-end gap-4 mb-10">
        <div className="flex gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-primary/20 dark:border-slate-800 shadow-sm">
          <button 
            onClick={() => setViewType('grid')}
            className={`p-2 rounded-lg transition-all ${viewType === 'grid' ? 'bg-primary/10 text-primary dark:bg-primary/30 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            title="Grid"
          >
            <span className="material-symbols-outlined text-2xl">grid_view</span>
          </button>
          <button 
            onClick={() => setViewType('table')}
            className={`p-2 rounded-lg transition-all ${viewType === 'table' ? 'bg-primary/10 text-primary dark:bg-primary/30 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            title="List"
          >
            <span className="material-symbols-outlined text-2xl">view_list</span>
          </button>
        </div>

        <button 
          onClick={() => setShowCatModal(true)}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-lg shadow-primary/20 font-bold transition-all active:scale-95 whitespace-nowrap text-sm   "
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          {t.categories.addCategory}
        </button>
      </div>

      {isLoading && categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white/40 dark:bg-slate-900/40 rounded-[2.5rem] border border-primary/10 dark:border-slate-800">
          <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-slate-400 font-bold text-xs   ">Syncing Hierarchy...</p>
        </div>
      ) : error ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-primary/20 dark:border-slate-800 rounded-[2.5rem] shadow-lg">
          <span className="material-symbols-outlined text-5xl text-red-500 mb-6">cloud_off</span>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Connection Error</h3>
          <p className="text-slate-500 mb-8 text-base">{error}</p>
          <button onClick={fetchCategories} className="px-10 py-3 bg-primary text-white rounded-xl font-bold text-base active:scale-95 shadow-md">Retry</button>
        </div>
      ) : viewType === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {categories.map((cat, idx) => (
            <div 
              key={cat.id} 
              className={`bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm hover:shadow-xl border border-primary/10 dark:border-slate-800 transition-all duration-500 flex flex-col overflow-hidden group h-auto animate-in zoom-in-95 duration-700`}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="size-11 rounded-xl bg-primary/5 text-primary flex items-center justify-center border border-primary/10 shadow-sm transition-all group-hover:bg-primary group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/30">
                      <span className="material-symbols-outlined text-[26px]">folder</span>
                    </div>
                    <div>
                      <h3 className="text-[17px] font-bold text-slate-900 dark:text-white  leading-none">
                        {lang === 'ar' ? cat.arabicName : cat.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-bold mt-0.5">
                        {lang === 'ar' ? cat.name : cat.arabicName}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setItemToDelete({ id: cat.id, type: 'category' })}
                    className="size-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 transition-all shadow-sm active:scale-90"
                    title="Delete category"
                  >
                    <span className="material-symbols-outlined text-[24px]">delete</span>
                  </button>
                </div>

                <div className="mt-6 border border-primary/10 dark:border-slate-800 rounded-[1.25rem] bg-slate-50/30 dark:bg-slate-800/20 overflow-hidden transition-all duration-300">
                  <button 
                    onClick={() => toggleExpand(cat.id)}
                    className={`w-full flex items-center justify-between px-5 py-3.5 text-sm font-bold transition-all hover:bg-primary/5 dark:hover:bg-slate-800 ${
                      expandedCats.includes(cat.id) 
                      ? 'text-primary' 
                      : ' text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <span>{expandedCats.includes(cat.id) ? (lang === 'ar' ? 'إخفاء التفاصيل' : 'Hide details') : (lang === 'ar' ? 'عرض التفاصيل' : 'Show details')}</span>
                    <span className={`material-symbols-outlined text-[22px] transition-transform duration-300 ${expandedCats.includes(cat.id) ? 'rotate-180' : ''}`}>
                      keyboard_arrow_down
                    </span>
                  </button>

                  <div className={`overflow-hidden transition-all duration-300 ${expandedCats.includes(cat.id) ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-3 pb-3 space-y-1.5 bg-slate-50 dark:bg-slate-900/40">
                      {cat.isLoadingSubs ? (
                        <div className="flex justify-center py-8">
                          <div className="size-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        </div>
                      ) : cat.subCategories && cat.subCategories.length > 0 ? (
                        <>
                          <div className="h-px bg-primary/10 dark:bg-slate-800 mb-2 mx-2"></div>
                          {cat.subCategories.map(sub => (
                            <div key={sub.id} className="flex justify-between items-center px-4 py-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 transition-all group/sub border border-primary/5 hover:border-primary/20 animate-in slide-in-from-left-2 duration-200 shadow-sm hover:shadow-md">
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                {lang === 'ar' ? sub.arabicName : sub.name}
                              </span>
                              <button 
                                onClick={() => setItemToDelete({ id: sub.id, type: 'subcategory' })}
                                className="size-7 flex items-center justify-center text-slate-300 hover:text-red-500 transition-all hover:scale-110"
                              >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                              </button>
                            </div>
                          ))}
                          <button 
                            onClick={() => openSubModal(cat)}
                            className="w-full py-2.5 flex items-center justify-center gap-2 text-xs font-black text-primary hover:bg-primary/10 rounded-xl mt-3 transition-colors border border-dashed border-primary/30 active:scale-95   "
                          >
                            <span className="material-symbols-outlined text-[18px]">add_circle</span>
                            {t.categories.addSubCategory}
                          </button>
                        </>
                      ) : (
                        <div className="text-center py-10 text-xs text-slate-400 font-bold italic">
                          {t.categories.noSubs}
                          <button 
                            onClick={() => openSubModal(cat)}
                            className="block mx-auto mt-3 text-primary font-black not-italic hover:underline hover:scale-105 transition-transform   "
                          >
                             {t.categories.addSubCategory}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div 
            onClick={() => setShowCatModal(true)}
            className="rounded-[1.5rem] border-2 border-dashed border-primary/20 dark:border-slate-800 hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center min-h-[220px] cursor-pointer group animate-in zoom-in-95 duration-700"
          >
            <div className="bg-slate-50 dark:bg-slate-800 group-hover:bg-primary text-primary/40 group-hover:text-white rounded-2xl p-4 mb-4 transition-all shadow-sm border border-primary/10">
              <span className="material-symbols-outlined text-3xl">add</span>
            </div>
            <h3 className="text-xs font-black text-slate-400 group-hover:text-primary transition-colors   ">
              {t.categories.addCategory}
            </h3>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-primary/10 dark:border-slate-800 overflow-hidden animate-in fade-in duration-500">
          <div className="overflow-x-auto">
            <table className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'} border-collapse`}>
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-primary/10 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-bold    whitespace-nowrap">
                  <th className="px-8 py-5">Index</th>
                  <th className="px-8 py-5">Category name</th>
                  <th className="px-8 py-5">Identity</th>
                  <th className="px-8 py-5 text-center">Items</th>
                  <th className={`px-8 py-5 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5 dark:divide-slate-800">
                {categories.map((cat, idx) => (
                  <tr key={cat.id} className="hover:bg-primary/5 dark:hover:bg-slate-800/20 transition-all group animate-in slide-in-from-right-2 duration-300" style={{ animationDelay: `${idx * 25}ms` }}>
                    <td className="px-8 py-5 text-xs font-black text-slate-400 group-hover:text-primary tabular-nums">
                       #{(idx + 1).toString().padStart(3, '0')}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-xl bg-primary/5 dark:bg-slate-800 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm border border-primary/10">
                           <span className="material-symbols-outlined text-[20px]">folder</span>
                        </div>
                        <span className="font-black text-slate-900 dark:text-white text-base leading-tight">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <span className="text-base font-bold text-slate-500 dark:text-slate-400">{cat.arabicName}</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                       <span className="inline-block px-4 py-1.5 rounded-xl text-xs font-black bg-primary/5 dark:bg-slate-800 text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm    border border-primary/10">
                         {cat.subCategories?.length || 0} units
                       </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className={`flex items-center ${lang === 'ar' ? 'justify-start' : 'justify-end'} gap-5`}>
                        <button 
                           onClick={() => openSubModal(cat)}
                           className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-1.5 rounded-lg text-xs font-black transition-all active:scale-95    whitespace-nowrap shadow-sm"
                        >
                          {t.categories.addSubCategory}
                        </button>
                        <button className="text-slate-400 hover:text-primary transition-all active:scale-90 p-1.5 rounded-lg hover:bg-primary/5">
                           <span className="material-symbols-outlined text-[22px]">edit</span>
                        </button>
                        <button 
                           onClick={() => setItemToDelete({ id: cat.id, type: 'category' })}
                           className="text-slate-300 hover:text-red-500 transition-all active:scale-90 p-1.5 rounded-lg hover:bg-red-50"
                        >
                           <span className="material-symbols-outlined text-[24px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {categories.length === 0 && (
             <div className="p-24 text-center flex flex-col items-center gap-6 opacity-50 bg-slate-50/50 dark:bg-slate-800/20">
                <span className="material-symbols-outlined text-7xl text-slate-300">folder_off</span>
                <div className="space-y-1">
                  <p className="text-lg font-black text-slate-900 dark:text-white">Database is empty</p>
                  <p className="text-base font-bold text-slate-500">Add your first category to get started.</p>
                </div>
             </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 text-center">
              <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mb-6 ring-4 ring-red-50 dark:ring-red-900/10">
                <span className="material-symbols-outlined text-4xl">warning</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 ">
                {lang === 'ar' ? 'هل أنت متأكد؟' : 'Confirm Action'}
              </h3>
              <p className="text-base text-slate-500 dark:text-slate-400 mb-8 leading-relaxed font-bold">
                {lang === 'ar' ? 'سيتم مسح العناصر المرتبطة ولن يمكنك التراجع عن هذا الإجراء.' : 'This entry and all related items will be permanently removed. This action cannot be reversed.'}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  disabled={isProcessing}
                  onClick={() => setItemToDelete(null)} 
                  className="py-3.5 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all border border-primary/10   "
                >
                  {t.categories.cancel}
                </button>
                <button 
                  disabled={isProcessing}
                  onClick={confirmDeleteAction}
                  className="py-3.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-xl shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center text-xs   "
                >
                  {isProcessing ? <div className="h-5 w-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div> : (lang === 'ar' ? 'تأكيد الحذف' : 'Confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
            <div className="p-8 border-b border-primary/10 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="size-11 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/30">
                   <span className="material-symbols-outlined text-2xl">category</span>
                </div>
                <h3 className="text-xl font-black text-primary dark:text-white ">{t.categories.addCategory}</h3>
              </div>
              <button onClick={() => setShowCatModal(false)} className="size-10 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors border border-primary/10">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddCategory} className="p-8 space-y-8">
              <div className="space-y-2.5">
                <label className="text-xs font-black text-slate-400 px-1   ">{t.categories.nameEn}</label>
                <input 
                  type="text" 
                  value={newCat.name}
                  onChange={(e) => setNewCat({...newCat, name: e.target.value})}
                  className="w-full rounded-2xl border-2 border-primary/20 bg-slate-50/50 dark:bg-slate-800/50 p-4 text-sm font-black focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-900 dark:text-white transition-all shadow-inner placeholder:text-slate-300"
                  placeholder="Example: Raw Materials"
                  required
                />
              </div>
              <div className="space-y-2.5">
                <label className="text-xs font-black text-slate-400 px-1 text-right block   ">{t.categories.nameAr}</label>
                <input 
                  type="text" 
                  value={newCat.arabicName}
                  onChange={(e) => setNewCat({...newCat, arabicName: e.target.value})}
                  className="w-full rounded-2xl border-2 border-primary/20 bg-slate-50/50 dark:bg-slate-800/50 p-4 text-sm font-black focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-900 dark:text-white text-right font-display shadow-inner placeholder:text-slate-300"
                  dir="rtl"
                  placeholder="مثال: المواد الخام"
                  required
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowCatModal(false)} className="flex-1 py-4 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all border border-primary/10   ">
                  {t.categories.cancel}
                </button>
                <button 
                  type="submit" 
                  disabled={isProcessing}
                  className="flex-[2] py-4 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm   "
                >
                  {isProcessing ? <div className="h-6 w-6 border-2 border-white/40 border-t-white rounded-full animate-spin"></div> : t.categories.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sub-category Modal */}
      {showSubModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
            <div className="p-8 border-b border-primary/10 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="size-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                   <span className="material-symbols-outlined text-2xl">list_alt</span>
                </div>
                <div>
                   <h3 className="text-xl font-black text-primary dark:text-white  leading-none">{t.categories.addSubCategory}</h3>
                   <p className="text-[10px] font-black text-slate-400       mt-1.5">{lang === 'ar' ? 'إضافة إلى: ' : 'Adding to: '} {newSub.parentName}</p>
                </div>
              </div>
              <button onClick={() => setShowSubModal(false)} className="size-10 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors border border-primary/10">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddSubCategory} className="p-8 space-y-8">
              <div className="space-y-2.5">
                <label className="text-xs font-black text-slate-400 px-1   ">{t.categories.nameEn}</label>
                <input 
                  type="text" 
                  value={newSub.name}
                  onChange={(e) => setNewSub({...newSub, name: e.target.value})}
                  className="w-full rounded-2xl border-2 border-primary/20 bg-slate-50/50 dark:bg-slate-800/50 p-4 text-sm font-black focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-900 dark:text-white transition-all shadow-inner placeholder:text-slate-300"
                  placeholder="e.g. Copper wire"
                  required
                />
              </div>
              <div className="space-y-2.5">
                <label className="text-xs font-black text-slate-400 px-1 text-right block   ">{t.categories.nameAr}</label>
                <input 
                  type="text" 
                  value={newSub.arabicName}
                  onChange={(e) => setNewSub({...newSub, arabicName: e.target.value})}
                  className="w-full rounded-2xl border-2 border-primary/20 bg-slate-50/50 dark:bg-slate-800/50 p-4 text-sm font-black focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-900 dark:text-white text-right font-display shadow-inner placeholder:text-slate-300"
                  dir="rtl"
                  placeholder="مثال: أسلاك النحاس"
                  required
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowSubModal(false)} className="flex-1 py-4 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all border border-primary/10   ">
                  {t.categories.cancel}
                </button>
                <button 
                  type="submit" 
                  disabled={isProcessing}
                  className="flex-[2] py-4 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm   "
                >
                  {isProcessing ? <div className="h-6 w-6 border-2 border-white/40 border-t-white rounded-full animate-spin"></div> : t.categories.saveSub}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;