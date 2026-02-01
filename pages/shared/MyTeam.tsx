
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';

interface StaffMember {
  id: string;
  name: string;
  fullName?: string;
  role: string;
  email: string;
  phoneNumber: string;
  allowedScreens?: string[];
  profileImage?: string;
  languagePreference?: string;
}

interface PaginatedStaff {
  content: StaffMember[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

const MyTeam: React.FC = () => {
  const { lang, t } = useLanguage();
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerRole, setOwnerRole] = useState<string>('');
  
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    allowedScreenIds: [] as string[],
    profileImage: '',
    languagePreference: 'EN'
  });

  const allPossibleScreens = [
    { id: '/', name: lang === 'ar' ? 'لوحة القيادة' : 'Dashboard', icon: 'grid_view', roles: ['CUSTOMER_OWNER', 'SUPPLIER_OWNER', 'ADMIN', 'SUPER_ADMIN'] },
    { id: '/product-search', name: lang === 'ar' ? 'السوق' : 'Marketplace', icon: 'explore', roles: ['CUSTOMER_OWNER'] },
    { id: '/vendors', name: lang === 'ar' ? 'الموردون' : 'Vendors', icon: 'storefront', roles: ['CUSTOMER_OWNER'] },
    { id: '/cart', name: lang === 'ar' ? 'العربة' : 'Cart', icon: 'shopping_cart', roles: ['CUSTOMER_OWNER'] },
    { id: '/orders', name: lang === 'ar' ? 'الطلبات' : 'Orders', icon: 'receipt_long', roles: ['CUSTOMER_OWNER', 'SUPPLIER_OWNER'] },
    { id: '/market-requests', name: lang === 'ar' ? 'طلبات خاصة' : 'Special Requests', icon: 'campaign', roles: ['CUSTOMER_OWNER', 'SUPPLIER_OWNER'] },
    { id: '/products', name: lang === 'ar' ? 'منتجاتي' : 'My Products', icon: 'inventory_2', roles: ['SUPPLIER_OWNER'] },
    { id: '/my-team', name: lang === 'ar' ? 'فريقي' : 'My Team', icon: 'group', roles: ['CUSTOMER_OWNER', 'SUPPLIER_OWNER'] },
    { id: '/profile', name: lang === 'ar' ? 'الملف الشخصي' : 'Profile', icon: 'person', roles: ['CUSTOMER_OWNER', 'SUPPLIER_OWNER'] },
    { id: '/subscription', name: lang === 'ar' ? 'الاشتراك' : 'Subscription', icon: 'loyalty', roles: ['CUSTOMER_OWNER', 'SUPPLIER_OWNER'] },
    { id: '/support', name: lang === 'ar' ? 'الدعم' : 'Support', icon: 'support_agent', roles: ['CUSTOMER_OWNER', 'SUPPLIER_OWNER'] },
  ];

  const availableScreens = useMemo(() => {
    const role = ownerRole;
    return allPossibleScreens.filter(s => s.roles.includes(role));
  }, [ownerRole, lang]);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const parsed = JSON.parse(userStr);
      setOwnerRole(parsed.role || '');
    }
    fetchTeam(currentPage);
    
    const handleClickOutside = () => setActiveTooltipId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [currentPage]);

  const fetchTeam = async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      const ownerId = userData?.userInfo?.id || userData?.id;
      if (!ownerId) throw new Error("Identity mismatch.");
      
      const data = await api.get<PaginatedStaff>(`/api/v1/user/owner/${ownerId}?page=${page}&size=${pageSize}`);
      setMembers(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (err: any) {
      setError(err.message || "Failed to sync team.");
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
    setEditingMember(null); setSelectedFile(null); setImagePreview(null);
    setFormData({ name: '', email: '', phoneNumber: '', password: '', allowedScreenIds: ['/'], profileImage: '', languagePreference: 'EN' });
    setIsModalOpen(true);
  };

  const openEditModal = (member: StaffMember) => {
    setEditingMember(member); setSelectedFile(null); setImagePreview(member.profileImage || null);
    setFormData({ name: member.name, email: member.email, phoneNumber: member.phoneNumber, password: '', allowedScreenIds: member.allowedScreens || ['/'], profileImage: member.profileImage || '', languagePreference: member.languagePreference || 'EN' });
    setIsModalOpen(true);
  };

  const toggleScreen = (screenId: string) => {
    setFormData(prev => ({
      ...prev,
      allowedScreenIds: prev.allowedScreenIds.includes(screenId)
        ? prev.allowedScreenIds.filter(id => id !== screenId)
        : [...prev.allowedScreenIds, screenId]
    }));
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
    e.preventDefault();
    setIsProcessing(true);
    try {
      let finalImageUrl = formData.profileImage;
      if (selectedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);
        finalImageUrl = await api.post<string>('/api/v1/image/upload', uploadFormData);
      }
      const submissionData = { ...formData, fullName: formData.name, profileImage: finalImageUrl, allowedScreens: formData.allowedScreenIds };
      if (editingMember) await api.patch(`/api/v1/user/${editingMember.id}`, submissionData);
      else await api.post('/api/v1/user/create-staff-user', submissionData);
      await fetchTeam(currentPage);
      setIsModalOpen(false);
    } catch (err: any) { setError(err.message || "Operation failed."); } finally { setIsProcessing(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setIsProcessing(true);
    try {
      await api.delete(`/api/v1/user/${deleteConfirmId}`);
      await fetchTeam(currentPage);
      setDeleteConfirmId(null);
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-10 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700 font-display min-h-screen pb-40">
      
      {/* Floating Action Button - Positioned above bottom nav */}
      <div className="fixed bottom-32 left-0 right-0 z-[180] pointer-events-none px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col items-end pointer-events-auto">
          <button 
            onClick={openAddModal}
            className="size-14 rounded-full bg-primary text-white shadow-[0_15px_35px_rgba(0,154,167,0.4)] flex items-center justify-center active:scale-90 transition-all border-2 border-white/20 group hover:bg-slate-900"
          >
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">person_add</span>
          </button>
        </div>
      </div>

      {/* Main Content Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-primary/10 dark:border-slate-800 mb-10 overflow-visible">
         <div className="overflow-visible min-h-[400px]">
           {isLoading && members.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-40"><div className="size-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div><p className="text-slate-400 font-black text-xs    ">Loading team...</p></div>
           ) : members.length === 0 ? (
             <div className="py-40 text-center opacity-30"><span className="material-symbols-outlined text-7xl">group_off</span><h3 className="text-xl font-black mt-4">{t.team.noTeam}</h3></div>
           ) : (
             <table className="w-full text-left rtl:text-right border-collapse">
               <thead>
                 <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-primary/10 text-[12px] font-black text-slate-500    ">
                   <th className="px-8 py-5">{t.team.name}</th>
                   <th className="px-8 py-5 hidden md:table-cell">{t.team.email}</th>
                   <th className="px-8 py-5">{lang === 'ar' ? 'الوصول' : 'Access'}</th>
                   <th className="px-8 py-5"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-primary/5 dark:divide-slate-800">
                 {members.map((member, idx) => (
                   <tr key={member.id} className="group hover:bg-primary/5 dark:hover:bg-slate-800/20 transition-all animate-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 40}ms` }}>
                     <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                           <div className="size-11 rounded-xl bg-primary/5 text-primary flex items-center justify-center shrink-0 overflow-hidden border border-primary/10 shadow-sm font-black text-sm">
                              {member.profileImage ? <img src={member.profileImage} className="size-full object-cover" /> : member.name.charAt(0)}
                           </div>
                           <div className="min-w-0">
                              <p className="font-black text-slate-900 dark:text-white text-sm truncate leading-none">{member.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-1.5 tabular-nums">{member.phoneNumber}</p>
                           </div>
                        </div>
                     </td>
                     <td className="px-8 py-5 hidden md:table-cell">
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{member.email}</span>
                     </td>
                     {/* Using relative + conditional z-index to fix "under nav" issue */}
                     <td className={`px-8 py-5 ${activeTooltipId === member.id ? 'z-[400] relative' : ''}`}>
                        <div className="relative inline-block">
                           <button 
                             onClick={(e) => { e.stopPropagation(); setActiveTooltipId(activeTooltipId === member.id ? null : member.id); }}
                             className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-black     shadow-sm ${activeTooltipId === member.id ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-800 text-slate-500 border-primary/10 hover:border-primary/40'}`}
                           >
                              <span className="material-symbols-outlined text-base">shield_person</span>
                              <span className="hidden sm:inline">{member.allowedScreens?.length || 0} {lang === 'ar' ? 'صلاحيات' : 'Perms'}</span>
                           </button>
                           {activeTooltipId === member.id && (
                             <div className={`absolute top-full mt-3 z-[500] w-64 p-5 bg-white dark:bg-slate-800 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-primary/20 animate-in fade-in zoom-in-95 duration-200 ${lang === 'ar' ? 'right-0' : 'left-0'}`} onClick={(e) => e.stopPropagation()}>
                               <p className="text-[9px] font-black text-slate-400   mb-3 border-b border-primary/5 pb-2">{lang === 'ar' ? 'الشاشات المتاحة' : 'Authorized Screens'}</p>
                               <div className="space-y-2.5 max-h-48 overflow-y-auto no-scrollbar">
                                  {member.allowedScreens?.map(screenId => {
                                    const details = allPossibleScreens.find(s => s.id === screenId);
                                    return details ? (
                                      <div key={screenId} className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                                         <span className="material-symbols-outlined text-[18px] text-primary/60">{details.icon}</span>
                                         <span className="text-[11px] font-bold leading-none">{details.name}</span>
                                      </div>
                                    ) : null;
                                  })}
                                  {(!member.allowedScreens || member.allowedScreens.length === 0) && <p className="text-[10px] text-slate-400 italic">Access restricted.</p>}
                               </div>
                               <div className={`absolute -top-2 w-4 h-4 bg-white dark:bg-slate-800 border-l border-t border-primary/20 rotate-45 ${lang === 'ar' ? 'right-8' : 'left-8'}`}></div>
                             </div>
                           )}
                        </div>
                     </td>
                     <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button onClick={() => openEditModal(member)} className="size-9 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary border border-slate-100 dark:border-slate-700 transition-all active:scale-90 flex items-center justify-center"><span className="material-symbols-outlined text-lg">edit</span></button>
                           <button onClick={() => setDeleteConfirmId(member.id)} className="size-9 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white border border-red-100 transition-all active:scale-90 flex items-center justify-center"><span className="material-symbols-outlined text-lg">delete</span></button>
                        </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           )}
         </div>
      </div>

      {/* Pagination Footer - Compact Pill Style as requested */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-slate-100 dark:border-slate-800 animate-in fade-in duration-500 max-w-fit mx-auto sm:mx-0 sm:ml-auto rtl:sm:mr-auto mb-10">
           {/* Current Page / Total Pages indicator */}
           <div className="px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-full shrink-0">
              <span className="text-[11px] font-black text-slate-500 tabular-nums  er">
                {currentPage + 1} / {totalPages}
              </span>
           </div>

           {/* Vertical Separator */}
           <div className="h-6 w-px bg-slate-100 dark:bg-slate-800 mx-1"></div>

           {/* Navigation Controls */}
           <div className="flex items-center gap-1.5">
              <button 
                onClick={() => handlePageChange(currentPage - 1)} 
                disabled={currentPage === 0}
                className="size-9 rounded-full border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
              >
                <span className="material-symbols-outlined text-base rtl-flip">chevron_left</span>
              </button>
              
              <div className="flex items-center gap-1">
                 {/* Current page circle highlighted */}
                 <button
                    onClick={() => handlePageChange(currentPage)}
                    className="size-9 rounded-full font-black text-[12px] bg-primary text-white shadow-md active:scale-95 transition-all"
                  >
                    {currentPage + 1}
                  </button>
              </div>

              <button 
                onClick={() => handlePageChange(currentPage + 1)} 
                disabled={currentPage >= totalPages - 1}
                className="size-9 rounded-full border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
              >
                <span className="material-symbols-outlined text-base rtl-flip">chevron_right</span>
              </button>
           </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl border border-primary/20 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 flex flex-col max-h-[92vh]">
              <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 shrink-0">
                 <div className="flex items-center gap-5"><div className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-3xl">person_add</span></div><div><h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{editingMember ? t.team.editStaff : t.team.addStaff}</h3><p className="text-[10px] font-black text-slate-400     mt-2">Member Identity & Access</p></div></div>
                 <button onClick={() => setIsModalOpen(false)} className="size-10 rounded-full hover:bg-red-50 text-slate-400 transition-all active:scale-90"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                 <form id="staffForm" onSubmit={handleSubmit} className="space-y-8">
                    <div className="flex flex-col items-center gap-3">
                       <div onClick={() => fileInputRef.current?.click()} className="relative size-28 rounded-full border-4 border-slate-50 dark:border-slate-800 shadow-xl overflow-hidden cursor-pointer group bg-slate-50">
                          {imagePreview ? <img src={imagePreview} className="size-full object-cover" /> : <div className="size-full flex items-center justify-center text-slate-200"><span className="material-symbols-outlined text-5xl">account_circle</span></div>}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-white text-3xl">add_a_photo</span></div>
                       </div>
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500   px-1">{t.team.name}</label><input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white" /></div>
                       <div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500   px-1">{t.team.email}</label><input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white" /></div>
                       <div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500   px-1">{t.team.phone}</label><input required type="tel" value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white tabular-nums" /></div>
                       <div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500   px-1">{t.team.password}</label><input required={!editingMember} type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white" placeholder={editingMember ? '••••••••' : ''} /></div>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[11px] font-black text-slate-500   px-1">{t.team.screens}</label>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 border border-primary/5 rounded-3xl bg-slate-50/30 custom-scrollbar">
                          {availableScreens.map(screen => (
                            <button key={screen.id} type="button" onClick={() => toggleScreen(screen.id)} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${formData.allowedScreenIds.includes(screen.id) ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-600 hover:border-primary/30'}`}>
                               <div className="flex items-center gap-3"><span className={`material-symbols-outlined text-xl ${formData.allowedScreenIds.includes(screen.id) ? 'text-white' : 'text-primary/60'}`}>{screen.icon}</span><span className="text-[12px] font-black">{screen.name}</span></div>
                               {formData.allowedScreenIds.includes(screen.id) && <span className="material-symbols-outlined text-sm">check_circle</span>}
                            </button>
                          ))}
                       </div>
                    </div>
                 </form>
              </div>
              <div className="p-10 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 shrink-0 flex gap-4">
                 <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black text-xs     hover:bg-slate-100 rounded-2xl transition-all border border-slate-100">{t.team.cancel}</button>
                 <button type="submit" form="staffForm" disabled={isProcessing} className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-xs shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3  ">{isProcessing ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>{editingMember ? t.team.save : t.team.addStaff}<span className="material-symbols-outlined text-lg">verified</span></>}</button>
              </div>
           </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-10 text-center animate-in zoom-in-95">
             <div className="size-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-red-50/50"><span className="material-symbols-outlined text-4xl">warning</span></div>
             <h3 className="text-xl font-black mb-2">{lang === 'ar' ? 'حذف الموظف؟' : 'Remove Staff?'}</h3>
             <p className="text-sm text-slate-500 font-bold mb-10">{lang === 'ar' ? 'سيتم إلغاء صلاحيات الوصول فوراً.' : 'Access will be revoked immediately.'}</p>
             <div className="flex gap-4">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black text-slate-500   text-[10px]   transition-all">Cancel</button>
                <button onClick={handleDelete} disabled={isProcessing} className="flex-[1.5] py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg   text-[10px]   flex items-center justify-center gap-2">{isProcessing ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><span className="material-symbols-outlined text-base">delete_forever</span> Delete</>}</button>
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

export default MyTeam;
