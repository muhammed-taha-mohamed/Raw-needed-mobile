
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../App';
import { Advertisement } from '../../types';
import { api } from '../../api';

interface PaginatedAds {
  content: Advertisement[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

const Advertisements: React.FC = () => {
  const { lang, t } = useLanguage();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({ text: '', image: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchAds(currentPage, pageSize);
  }, [currentPage, pageSize]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchAds = async (page: number, size: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<PaginatedAds>(`/api/v1/advertisements?page=${page}&size=${size}`);
      setAds(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load advertisements.");
    } finally {
      setIsLoading(false);
    }
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

  const openAddModal = () => {
    setEditingAd(null);
    setSelectedFile(null);
    setImagePreview(null);
    setFormData({ text: '', image: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (ad: Advertisement) => {
    setEditingAd(ad);
    setSelectedFile(null);
    setImagePreview(ad.image);
    setFormData({ text: ad.text, image: ad.image });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setIsProcessing(true);
    try {
      await api.delete(`/api/v1/advertisements/${deleteConfirmId}`);
      setToast({ message: t.ads.successDelete, type: 'success' });
      setDeleteConfirmId(null);
      await fetchAds(currentPage, pageSize);
    } catch (err: any) {
      setToast({ message: err.message || "Deletion failed", type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    let finalImageUrl = formData.image;

    try {
      if (selectedFile) {
        const uploadData = new FormData();
        uploadData.append('file', selectedFile);
        finalImageUrl = await api.post<string>('/api/v1/image/upload', uploadData);
      }

      const payload = { text: formData.text, image: finalImageUrl };

      if (editingAd) {
        await api.put(`/api/v1/advertisements/${editingAd.id}`, payload);
        setToast({ message: t.ads.successUpdate, type: 'success' });
      } else {
        await api.post('/api/v1/advertisements', payload);
        setToast({ message: t.ads.successAdd, type: 'success' });
      }
      
      await fetchAds(currentPage, pageSize);
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Operation failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-10 py-8 flex flex-col gap-8 font-display animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {toast && (
        <div className={`fixed top-24 ${lang === 'ar' ? 'left-10' : 'right-10'} z-[300] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border animate-in slide-in-from-top-10 duration-500 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <span className="material-symbols-outlined">{toast.type === 'success' ? 'verified' : 'error'}</span>
          <span className="font-black text-sm">{toast.message}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-primary dark:text-white leading-none">
            {t.ads.title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-base">
            {t.ads.subtitle}
          </p>
        </div>

        <button 
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-3.5 rounded-xl shadow-lg shadow-primary/20 font-black text-xs transition-all active:scale-95 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
          {t.ads.addNew}
        </button>
      </div>

      {isLoading && ads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 bg-white/40 dark:bg-slate-900/40 rounded-[2.5rem] border border-primary/5">
           <div className="size-12 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
           <p className="text-slate-500 font-black text-[12px]">Fetching Promotions...</p>
        </div>
      ) : error ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/20 rounded-[2.5rem] shadow-2xl">
           <span className="material-symbols-outlined text-red-500 text-6xl mb-6">cloud_off</span>
           <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Sync Error</h3>
           <p className="text-slate-500 mb-8 font-bold">{error}</p>
           <button onClick={() => fetchAds(0, pageSize)} className="px-12 py-4 bg-primary text-white rounded-2xl font-black active:scale-95 shadow-xl shadow-primary/20">Retry Sync</button>
        </div>
      ) : ads.length === 0 ? (
        <div className="py-40 flex flex-col items-center justify-center text-center bg-white/40 dark:bg-slate-900/40 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
           <div className="size-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 mb-6">
              <span className="material-symbols-outlined text-6xl">campaign</span>
           </div>
           <h3 className="text-2xl font-black text-slate-800 dark:text-white">{t.ads.empty}</h3>
           <p className="text-sm text-slate-400 font-bold mt-2">Start your first marketing campaign now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
          {ads.map((ad, idx) => (
            <div 
              key={ad.id} 
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-primary/5 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col animate-in zoom-in-95 h-full group"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-b border-slate-50 dark:border-slate-800 relative">
                 <img src={ad.image} className="size-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Promotion" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                    <div className="flex gap-2">
                       <button onClick={() => openEditModal(ad)} className="size-10 rounded-xl bg-white text-slate-900 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"><span className="material-symbols-outlined text-xl">edit</span></button>
                       <button onClick={() => setDeleteConfirmId(ad.id)} className="size-10 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"><span className="material-symbols-outlined text-xl">delete</span></button>
                    </div>
                 </div>
              </div>
              <div className="p-6 flex flex-col flex-1">
                 <p className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-3 leading-relaxed">
                   {ad.text}
                 </p>
                 <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400    tabular-nums">Ref: #{ad.id.slice(-6)}</span>
                    <div className="flex items-center gap-1">
                       <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                       <span className="text-[9px] font-black text-emerald-500 uppercase">Live</span>
                    </div>
                 </div>
              </div>
            </div>
          ))}
          
          <div 
            onClick={openAddModal}
            className="rounded-[2.5rem] border-2 border-dashed border-primary/10 hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center min-h-[300px] cursor-pointer group"
          >
             <div className="size-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white shadow-sm transition-all">
                <span className="material-symbols-outlined text-4xl">add</span>
             </div>
             <p className="mt-4 text-xs font-black text-slate-400 group-hover:text-primary   ">New Promotion</p>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {(totalPages > 0) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-10 py-6 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-primary/10 animate-in fade-in duration-500">
           <div className="flex items-center gap-4">
              <div className="text-[11px] font-black text-slate-500   ">
                {lang === 'ar' 
                  ? `إظهار ${ads.length} من أصل ${totalElements} إعلان` 
                  : `Showing ${ads.length} of ${totalElements} ads`}
              </div>
              <div className="hidden sm:flex items-center gap-2 border-l rtl:border-r border-slate-100 dark:border-slate-800 pl-4 rtl:pr-4">
                 <span className="text-[12px] font-black text-slate-400 uppercase">{lang === 'ar' ? 'النتائج:' : 'Size:'}</span>
                 <select 
                   value={pageSize}
                   onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
                   className="bg-transparent border-none text-[11px] font-black text-slate-600 dark:text-slate-300 focus:ring-0 cursor-pointer"
                 >
                    {[5, 10, 20].map(size => <option key={size} value={size}>{size}</option>)}
                 </select>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0 || isLoading}
                className="size-11 rounded-xl border border-primary/10 bg-white dark:bg-slate-900 text-slate-500 hover:border-primary hover:text-primary disabled:opacity-30 transition-all flex items-center justify-center active:scale-90 shadow-sm"
              >
                <span className="material-symbols-outlined rtl-flip">chevron_left</span>
              </button>
              
              <div className="flex items-center gap-1.5">
                 {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => handlePageChange(i)}
                      className={`size-11 rounded-xl font-black text-sm transition-all shadow-sm ${
                        currentPage === i 
                        ? 'bg-primary text-white scale-110 shadow-primary/30 z-10' 
                        : 'bg-white dark:bg-slate-900 text-slate-500 border border-primary/5 hover:border-primary'
                      }`}
                    >
                      {i + 1}
                    </button>
                 ))}
              </div>

              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages - 1 || isLoading}
                className="size-11 rounded-xl border border-primary/10 bg-white dark:bg-slate-900 text-slate-500 hover:border-primary hover:text-primary disabled:opacity-30 transition-all flex items-center justify-center active:scale-90 shadow-sm"
              >
                <span className="material-symbols-outlined rtl-flip">chevron_right</span>
              </button>
           </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 text-center">
              <div className="mx-auto size-20 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-red-50/50">
                <span className="material-symbols-outlined text-5xl">warning</span>
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 uppercase">
                {lang === 'ar' ? 'حذف الإعلان؟' : 'Delete Ad?'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-500 mb-10 leading-relaxed font-bold">
                {t.ads.deleteConfirm}
              </p>
              <div className="flex gap-4">
                <button 
                  disabled={isProcessing}
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-4 text-[12px] font-black text-slate-500 hover:bg-slate-50 rounded-xl transition-all border border-slate-100"
                >
                  {t.categories.cancel}
                </button>
                <button 
                  disabled={isProcessing}
                  onClick={handleDelete}
                  className="flex-[1.5] py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-lg shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center text-[12px] gap-2"
                >
                  {isProcessing ? (
                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">delete_forever</span>
                      {lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 flex flex-col max-h-[90vh]">
            
            <div className="px-10 py-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
               <div className="flex items-center gap-5">
                  <div className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                     <span className="material-symbols-outlined text-3xl">ads_click</span>
                  </div>
                  <div>
                     <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none mb-2">
                        {editingAd ? t.ads.edit : t.ads.addNew}
                     </h3>
                     <p className="text-[12px] font-bold text-slate-400   ">Ad Design & Placement</p>
                  </div>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="size-12 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-500 transition-all flex items-center justify-center border border-slate-200 dark:border-slate-800 active:scale-90">
                 <span className="material-symbols-outlined text-2xl">close</span>
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              <form id="adForm" onSubmit={handleSubmit} className="space-y-8">
                {error && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-black animate-in shake">
                     {error}
                  </div>
                )}

                <div className="space-y-3">
                   <label className="text-[11px] font-black text-slate-400 px-1   ">{t.ads.image}</label>
                   {!imagePreview ? (
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-48 border-2 border-dashed border-primary/20 rounded-3xl bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-all group"
                      >
                         <span className="material-symbols-outlined text-5xl mb-2 group-hover:scale-110 transition-transform">add_a_photo</span>
                         <span className="text-[10px] font-black   ">Select Promotion Visual</span>
                      </button>
                   ) : (
                      <div className="relative h-56 rounded-3xl overflow-hidden shadow-xl border border-primary/10 group">
                         <img src={imagePreview} className="size-full object-cover" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="size-12 bg-white text-primary rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"><span className="material-symbols-outlined">edit</span></button>
                            <button type="button" onClick={() => {setSelectedFile(null); setImagePreview(null); setFormData({...formData, image: ''});}} className="size-12 bg-red-500 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"><span className="material-symbols-outlined">delete</span></button>
                         </div>
                      </div>
                   )}
                   <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                   <p className="text-[9px] text-slate-400 font-bold px-1 italic">Optimal ratio: 16:9 (Landscape)</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 px-1   ">{t.ads.text}</label>
                  <textarea 
                    required value={formData.text} onChange={(e) => setFormData({...formData, text: e.target.value})}
                    className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-bold focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none shadow-inner min-h-[120px]"
                    placeholder="Describe the offer or promotion details..."
                  />
                </div>

                <div className="pt-6">
                  <button 
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-5 bg-primary text-white rounded-[1.5rem] font-black text-sm shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-4 "
                  >
                    {isProcessing ? (
                      <div className="size-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">send</span>
                        {editingAd ? (lang === 'ar' ? 'تحديث الإعلان' : 'Update Content') : (lang === 'ar' ? 'نشر الإعلان' : 'Publish Ad')}
                      </>
                    )}
                  </button>
                </div>
              </form>
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

export default Advertisements;
