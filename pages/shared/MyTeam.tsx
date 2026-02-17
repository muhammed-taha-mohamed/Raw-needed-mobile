
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import PaginationFooter from '../../components/PaginationFooter';
import { MODAL_INPUT_CLASS, MODAL_OVERLAY_BASE_CLASS, MODAL_PANEL_BASE_CLASS } from '../../components/modalTheme';

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

interface SearchOperationSummary {
  userId: string;
  userName: string;
  searchCount: number;
}

const MyTeam: React.FC = () => {
  const { lang, t } = useLanguage();
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerRole, setOwnerRole] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'team' | 'search-operations'>('team');
  const [searchRows, setSearchRows] = useState<SearchOperationSummary[]>([]);
  const [isSearchRowsLoading, setIsSearchRowsLoading] = useState(false);
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [detailsMemberId, setDetailsMemberId] = useState<string | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  
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
    { id: '/product-search', name: lang === 'ar' ? 'السوق' : 'Marketplace', icon: 'storefront', roles: ['CUSTOMER_OWNER'] },
    { id: '/vendors', name: lang === 'ar' ? 'الموردون' : 'Vendors', icon: 'explore', roles: ['CUSTOMER_OWNER'] },
    { id: '/cart', name: lang === 'ar' ? 'العربة' : 'Cart', icon: 'shopping_cart', roles: ['CUSTOMER_OWNER'] },
    { id: '/orders', name: lang === 'ar' ? 'الطلبات' : 'Orders', icon: 'receipt_long', roles: ['CUSTOMER_OWNER', 'SUPPLIER_OWNER'] },
    { id: '/market-requests', name: lang === 'ar' ? 'طلبات خاصة' : 'Special Requests', icon: 'campaign', roles: ['CUSTOMER_OWNER', 'SUPPLIER_OWNER'] },
    { id: '/products', name: lang === 'ar' ? 'المخزون' : 'My Products', icon: 'inventory_2', roles: ['SUPPLIER_OWNER'] },
    { id: '/advanced-reports', name: lang === 'ar' ? 'التقارير المتقدمة' : 'Advanced Reports', icon: 'analytics', roles: ['SUPPLIER_OWNER'] },
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

  useEffect(() => {
    if (activeTab !== 'search-operations') return;
    fetchSearchOperationsSummary();
  }, [activeTab, selectedMonth, selectedYear]);

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

  const fetchSearchOperationsSummary = async () => {
    setIsSearchRowsLoading(true);
    try {
      const data = await api.get<SearchOperationSummary[]>(
        `/api/v1/user/search-operations/summary?year=${selectedYear}&month=${selectedMonth}`
      );
      setSearchRows(data || []);
    } catch (err: any) {
      setError(err.message || (lang === 'ar' ? 'فشل تحميل عمليات البحث' : 'Failed to load search operations'));
      setSearchRows([]);
    } finally {
      setIsSearchRowsLoading(false);
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

  const totalSearchOperations = useMemo(
    () => searchRows.reduce((sum, row) => sum + (row.searchCount ?? 0), 0),
    [searchRows]
  );
  const usersWithSearches = useMemo(
    () => searchRows.filter((row) => (row.searchCount ?? 0) > 0).length,
    [searchRows]
  );
  const monthInputValue = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  return (
    <div className="w-full py-4 animate-in fade-in slide-in-from-bottom-4 duration-700 font-display min-h-screen pb-40">
      

      {/* Floating Action Button — mobile only */}
      <div className={`fixed bottom-32 left-0 right-0 z-[180] pointer-events-none px-6 md:hidden ${activeTab !== 'team' ? 'hidden' : ''}`}>
        <div className="w-full flex flex-col items-end pointer-events-auto">
          <button 
            onClick={openAddModal}
            className="size-14 rounded-full bg-primary text-white shadow-[0_15px_35px_rgba(0,154,167,0.4)] flex items-center justify-center active:scale-90 transition-all border-2 border-white/20 group hover:bg-slate-900"
          >
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">person_add</span>
          </button>
        </div>
      </div>

      {/* Tabs + Search operations filters */}
      <div className="mb-4">
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 w-full min-w-0">
          <button
            onClick={() => setActiveTab('team')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-black transition-all ${activeTab === 'team' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            {lang === 'ar' ? 'فريقي' : 'My Team'}
          </button>
          <button
            onClick={() => setActiveTab('search-operations')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'search-operations' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <span>{lang === 'ar' ? 'عمليات البحث' : 'Search Operations'}</span>
            {totalSearchOperations > 0 && (
              <span className={`min-w-[22px] h-5 px-1.5 rounded-full text-[10px] font-black tabular-nums flex items-center justify-center ${activeTab === 'search-operations' ? 'bg-primary text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300'}`}>
                {totalSearchOperations}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'search-operations' && (
          <div className="mt-3 flex flex-col md:flex-row md:items-center gap-3">
            <div className="md:ms-auto w-full md:w-auto">
              <input
                type="month"
                value={monthInputValue}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!raw) return;
                  const [yy, mm] = raw.split('-').map((v) => parseInt(v, 10));
                  if (!Number.isNaN(yy) && !Number.isNaN(mm)) {
                    setSelectedYear(yy);
                    setSelectedMonth(mm);
                  }
                }}
                className="w-full md:w-[210px] max-w-[210px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] md:text-xs font-black text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      {activeTab === 'team' && (
      <div className="hidden md:block mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-primary/20 dark:border-primary/10 shadow-lg overflow-hidden">
          {/* Table Header with Add Button */}
          <div className="bg-primary/10 dark:bg-primary/5 border-b-2 border-primary/20 px-6 py-3 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-700 dark:text-slate-300">
              {lang === 'ar' ? 'فريقي' : 'My Team'}
            </h2>
            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg shadow-md shadow-primary/20 font-black transition-all active:scale-95 text-xs"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              {t.team.addStaff}
            </button>
          </div>
          <div className="h-[90vh] flex flex-col">
            {/* Scrollable Table Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isLoading && members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40"><div className="size-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div><p className="text-slate-400 font-black text-xs">Loading team...</p></div>
              ) : members.length === 0 ? (
                <div className="py-40 text-center opacity-30"><span className="material-symbols-outlined text-7xl">group_off</span><h3 className="text-xl font-black mt-4">{t.team.noTeam}</h3></div>
              ) : (
                <table dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`w-full border-collapse bg-white dark:bg-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                  <thead className="sticky top-0 z-10 bg-primary/10 dark:bg-primary/5">
                    <tr className="text-[12px] font-black text-slate-600 dark:text-slate-400 border-b-2 border-primary/20">
                      <th className="px-6 py-4">{t.team.name}</th>
                      <th className="px-6 py-4">{t.team.email}</th>
                      <th className="px-6 py-4">{lang === 'ar' ? 'الوصول' : 'Access'}</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5 dark:divide-slate-700">
                    {members.map((member, idx) => {
                      const getRoleLabel = (role: string) => {
                        const roleMap: Record<string, { ar: string; en: string }> = {
                          'SUPPLIER_STAFF': { ar: 'موظف مورد', en: 'Supplier Staff' },
                        };
                        return roleMap[role] || { ar: role, en: role };
                      };
                      
                      return (
                        <tr key={member.id} className="group hover:bg-primary/5 dark:hover:bg-slate-700/20 transition-all">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 border border-primary/20 overflow-hidden">
                                {member.profileImage ? (
                                  <img src={member.profileImage} className="size-full object-cover" alt={member.name} />
                                ) : (
                                  <span className="material-symbols-outlined text-xl">person</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-black text-sm truncate text-slate-900 dark:text-white">
                                  {member.name}
                                </div>
                                <div className="text-[11px] text-slate-400 font-bold mt-1.5 truncate max-w-[200px]">
                                  {member.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{member.email}</span>
                          </td>
                          <td className={`px-6 py-4 ${activeTooltipId === member.id ? 'z-[400] relative' : ''}`}>
                            <div className="relative inline-block">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setActiveTooltipId(activeTooltipId === member.id ? null : member.id); }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-black shadow-sm ${activeTooltipId === member.id ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-800 text-slate-500 border-primary/10 hover:border-primary/40'}`}
                              >
                                <span className="material-symbols-outlined text-base">shield_person</span>
                                <span>{member.allowedScreens?.length || 0} {lang === 'ar' ? 'صلاحيات' : 'Perms'}</span>
                              </button>
                              {activeTooltipId === member.id && (
                                <div className={`absolute top-full mt-3 z-[500] w-64 p-5 bg-white dark:bg-slate-800 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-primary/20 animate-in fade-in zoom-in-95 duration-200 ${lang === 'ar' ? 'right-0' : 'left-0'}`} onClick={(e) => e.stopPropagation()}>
                                  <p className="text-[9px] font-black text-slate-400 mb-3 border-b border-primary/5 pb-2">{lang === 'ar' ? 'الشاشات المتاحة' : 'Authorized Screens'}</p>
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
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2 rtl:justify-start">
                              <button onClick={() => openEditModal(member)} className="size-9 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary border border-slate-100 dark:border-slate-700 transition-all active:scale-90 flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg">edit</span>
                              </button>
                              <button onClick={() => setDeleteConfirmId(member.id)} className="size-9 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white border border-red-100 transition-all active:scale-90 flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {/* Pagination Footer - Fixed at Bottom */}
            {totalPages > 0 && (
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
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i;
                        } else if (currentPage < 3) {
                          pageNum = i;
                        } else if (currentPage > totalPages - 4) {
                          pageNum = totalPages - 5 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`size-9 rounded-full font-black text-xs transition-all ${
                              currentPage === pageNum 
                              ? 'bg-primary text-white shadow-md' 
                              : 'bg-white dark:bg-slate-800 text-slate-400 border border-primary/20 hover:border-primary'
                            }`}
                          >
                            {pageNum + 1}
                          </button>
                        );
                      })}
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
      )}

      {/* Mobile View - Cards */}
      <div className={`md:hidden space-y-4 mb-6 ${activeTab !== 'team' ? 'hidden' : ''}`}>
        {isLoading && members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40"><div className="size-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div><p className="text-slate-400 font-black text-xs">Loading team...</p></div>
        ) : members.length === 0 ? (
          <div className="py-40 text-center opacity-30"><span className="material-symbols-outlined text-7xl">group_off</span><h3 className="text-xl font-black mt-4">{t.team.noTeam}</h3></div>
        ) : (
          members.map((member, idx) => {
            const isExpanded = expandedMemberId === member.id;
            const getRoleLabel = (role: string) => {
              const roleMap: Record<string, { ar: string; en: string }> = {
                'CUSTOMER_STAFF': { ar: 'موظف عميل', en: 'Customer Staff' },
                'SUPPLIER_STAFF': { ar: 'موظف مورد', en: 'Supplier Staff' },
              };
              return roleMap[role] || { ar: role, en: role };
            };
            
            return (
              <div 
                key={member.id} 
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="p-4 flex items-center gap-3">
                  <button
                    onClick={() => setExpandedMemberId(isExpanded ? null : member.id)}
                    className="size-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 border border-primary/20 hover:bg-primary/20 transition-all active:scale-90"
                  >
                    <span className={`material-symbols-outlined text-xl transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-black text-sm truncate text-slate-900 dark:text-white">
                        {member.name}
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary text-[10px] font-black border border-primary/20 shrink-0">
                        {lang === 'ar' ? getRoleLabel(member.role).ar : getRoleLabel(member.role).en}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">
                      {member.email}
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailsMemberId(member.id)}
                    className="size-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 border border-primary/20 hover:bg-primary/20 transition-all active:scale-90"
                  >
                    <span className="material-symbols-outlined text-xl">person</span>
                  </button>
                </div>
                {isExpanded && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-[290] bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                      onClick={() => setExpandedMemberId(null)}
                    ></div>
                    {/* Popup */}
                    <div className={`fixed inset-0 z-[300] flex items-end md:items-center justify-center pointer-events-none`}>
                      <div 
                        className="w-full md:w-[85%] bg-white dark:bg-slate-800 rounded-t-3xl md:rounded-2xl shadow-2xl border-t border-x border-primary/20 p-6 pointer-events-auto animate-in slide-in-from-bottom-5 md:zoom-in-95 fade-in duration-300 max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                      >
                        
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
                              setExpandedMemberId(null);
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
                        
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
                          <h3 className="text-base font-black text-slate-900 dark:text-white">
                            {lang === 'ar' ? 'تفاصيل المستخدم' : 'User Details'}
                          </h3>
                          <button
                            onClick={() => setExpandedMemberId(null)}
                            className="size-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors"
                          >
                            <span className="material-symbols-outlined text-xl">close</span>
                          </button>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar flex-1">
                          <div className="space-y-0 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                              <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الدور' : 'Role'}</span>
                              <span className="px-2 py-1 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary text-xs font-black border border-primary/20">
                                {lang === 'ar' ? getRoleLabel(member.role).ar : getRoleLabel(member.role).en}
                              </span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                              <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الحالة' : 'Status'}</span>
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-black bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <span className="size-1.5 rounded-full bg-emerald-500"></span>
                                {lang === 'ar' ? 'نشط' : 'Active'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                              <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الهاتف' : 'Phone'}</span>
                              <span className="text-sm font-bold text-slate-600 dark:text-slate-400 text-end">
                                {member.phoneNumber || '—'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                              <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</span>
                              <span className="text-sm font-bold text-slate-600 dark:text-slate-400 text-end break-all">
                                {member.email}
                              </span>
                            </div>
                            <div className="flex items-start justify-between px-4 py-3">
                              <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الشاشات المتاحة' : 'Allowed Screens'}</span>
                              <div className="flex flex-wrap gap-1.5 justify-end max-w-[60%]">
                                {member.allowedScreens && member.allowedScreens.length > 0 ? (
                                  member.allowedScreens.map(screenId => {
                                    const details = allPossibleScreens.find(s => s.id === screenId);
                                    return details ? (
                                      <span key={screenId} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-600">
                                        {details.name}
                                      </span>
                                    ) : null;
                                  })
                                ) : (
                                  <span className="text-xs text-slate-400">—</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700 shrink-0 flex gap-3">
                          <button
                            onClick={() => {
                              setExpandedMemberId(null);
                              openEditModal(member);
                            }}
                            className="flex-1 py-3 rounded-xl bg-primary text-white font-black text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                            {lang === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                          <button
                            onClick={() => {
                              setExpandedMemberId(null);
                              setDeleteConfirmId(member.id);
                            }}
                            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-black text-sm shadow-xl shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                            {lang === 'ar' ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
        
        {/* Mobile Pagination */}
        {totalPages > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md p-4 flex items-center justify-center gap-3">
            <button 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage === 0 || isLoading}
              className="size-9 rounded-full border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
            >
              <span className="material-symbols-outlined text-base rtl-flip">chevron_left</span>
            </button>
            <div className="size-9 rounded-full font-black text-xs bg-primary text-white shadow-md flex items-center justify-center">
              {currentPage + 1}
            </div>
            <button 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage >= totalPages - 1 || isLoading}
              className="size-9 rounded-full border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-primary disabled:opacity-20 transition-all flex items-center justify-center active:scale-90"
            >
              <span className="material-symbols-outlined text-base rtl-flip">chevron_right</span>
            </button>
            <div className="h-6 w-px bg-slate-100 dark:bg-slate-800 mx-1"></div>
            <div className="px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-full shrink-0">
              <span className="text-[11px] font-black text-slate-500 tabular-nums">
                {currentPage + 1} / {totalPages}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Search Operations Tab Content */}
      {activeTab === 'search-operations' && (
        <div className="space-y-4">
          {isSearchRowsLoading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="size-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400 font-black text-xs">{lang === 'ar' ? 'تحميل عمليات البحث...' : 'Loading search operations...'}</p>
            </div>
          ) : searchRows.length === 0 ? (
            <div className="py-24 text-center opacity-40">
              <span className="material-symbols-outlined text-6xl">search_off</span>
              <h3 className="text-lg font-black mt-3">{lang === 'ar' ? 'لا توجد عمليات بحث في هذا الشهر' : 'No searches in this month'}</h3>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <div className="col-span-1 text-xs font-black text-slate-500">#</div>
                  <div className="col-span-7 text-xs font-black text-slate-500">{lang === 'ar' ? 'المستخدم' : 'User'}</div>
                  <div className="col-span-4 text-xs font-black text-slate-500 text-end">{lang === 'ar' ? 'عدد عمليات البحث' : 'Search Count'}</div>
                </div>
                {searchRows.map((row, index) => (
                  <div key={row.userId} className="grid grid-cols-12 gap-2 px-6 py-4 border-b last:border-b-0 border-slate-100 dark:border-slate-800">
                    <div className="col-span-1 text-sm font-black text-slate-400 tabular-nums">{index + 1}</div>
                    <div className="col-span-7 text-sm font-black text-slate-800 dark:text-slate-200 truncate">{row.userName || row.userId}</div>
                    <div className="col-span-4 text-sm font-black text-primary text-end tabular-nums">{row.searchCount ?? 0}</div>
                  </div>
                ))}
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-3">
                {searchRows.map((row, index) => (
                  <div key={row.userId} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="size-7 rounded-full bg-primary/10 text-primary text-[11px] font-black flex items-center justify-center shrink-0 tabular-nums">
                          {index + 1}
                        </span>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">{row.userName || row.userId}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-black tabular-nums border border-primary/20">
                        {row.searchCount ?? 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <PaginationFooter
        currentPage={currentPage}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        currentCount={members.length}
      />

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className={`fixed inset-0 z-[600] ${MODAL_OVERLAY_BASE_CLASS}`}>
           <div className={`${MODAL_PANEL_BASE_CLASS} md:max-w-2xl`}>
             
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
                   setIsModalOpen(false);
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
                 <div className="flex items-center gap-4"><div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-2xl">person_add</span></div><div><h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">{editingMember ? t.team.editStaff : t.team.addStaff}</h3><p className="text-[10px] font-black text-slate-400 mt-2">{t.team.memberIdentityAccess}</p></div></div>
                 <button onClick={() => setIsModalOpen(false)} className="size-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-xl">close</span></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                 <form id="staffForm" onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'صورة الملف الشخصي' : 'Profile Image'}</label>
                      <div onClick={() => fileInputRef.current?.click()} className={`h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${imagePreview ? 'border-primary' : 'border-slate-200 hover:border-primary bg-slate-50/50 dark:bg-slate-800/50'}`}>
                        {imagePreview ? (
                          <img src={imagePreview} className="size-full object-cover" alt="Preview" />
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">add_a_photo</span>
                            <span className="text-[9px] font-black text-slate-400">{lang === 'ar' ? 'اضغط لرفع الصورة' : 'Click to upload image'}</span>
                          </>
                        )}
                      </div>
                      <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                         <label className="text-[11px] font-black text-slate-500 px-1">{t.team.name}</label>
                         <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder={t.team.namePlaceholder} className={MODAL_INPUT_CLASS} />
                       </div>
                       <div className="space-y-1.5">
                         <label className="text-[11px] font-black text-slate-500 px-1">{t.team.email}</label>
                         <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder={t.team.emailPlaceholder} className={MODAL_INPUT_CLASS} />
                       </div>
                       <div className="space-y-1.5">
                         <label className="text-[11px] font-black text-slate-500 px-1">{t.team.phone}</label>
                         <input required type="tel" value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} placeholder={t.team.phonePlaceholder} className={`${MODAL_INPUT_CLASS} tabular-nums`} />
                       </div>
                       <div className="space-y-1.5">
                         <label className="text-[11px] font-black text-slate-500 px-1">{t.team.password}</label>
                         <input required={!editingMember} type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder={editingMember ? t.team.passwordPlaceholderEdit : t.team.passwordPlaceholder} className={MODAL_INPUT_CLASS} />
                       </div>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[11px] font-black text-slate-500 px-1">{t.team.screens}</label>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 border border-slate-100 dark:border-slate-700 rounded-2xl bg-slate-50/30 dark:bg-slate-800/30 custom-scrollbar">
                          {availableScreens.map(screen => (
                            <button key={screen.id} type="button" onClick={() => toggleScreen(screen.id)} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${formData.allowedScreenIds.includes(screen.id) ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-600 hover:border-primary/30'}`}>
                               <div className="flex items-center gap-2.5">
                                 <span className={`material-symbols-outlined text-lg ${formData.allowedScreenIds.includes(screen.id) ? 'text-white' : 'text-primary/60'}`}>{screen.icon}</span>
                                 <span className="text-xs font-black">{screen.name}</span>
                               </div>
                               {formData.allowedScreenIds.includes(screen.id) && <span className="material-symbols-outlined text-sm">check_circle</span>}
                            </button>
                          ))}
                       </div>
                    </div>
                 </form>
              </div>
              <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0 flex gap-3">
                 <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">{t.team.cancel}</button>
                 <button type="submit" form="staffForm" disabled={isProcessing} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">{isProcessing ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>{editingMember ? t.team.save : t.team.addStaff}<span className="material-symbols-outlined">verified</span></>}</button>
              </div>
              
           </div>
        </div>
      )}

      {/* Member Details Modal */}
      {detailsMemberId && (() => {
        const member = members.find(m => m.id === detailsMemberId);
        if (!member) return null;
        
        const getRoleLabel = (role: string) => {
          const roleMap: Record<string, { ar: string; en: string }> = {
            'CUSTOMER_STAFF': { ar: 'موظف عميل', en: 'Customer Staff' },
            'SUPPLIER_STAFF': { ar: 'موظف مورد', en: 'Supplier Staff' },
          };
          return roleMap[role] || { ar: role, en: role };
        };
        
        return (
          <>
            <div 
              className="fixed inset-0 z-[290] bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setDetailsMemberId(null)}
            ></div>
            <div className={`fixed inset-0 z-[300] flex items-end md:items-center justify-center pointer-events-none`}>
              <div 
                className="w-full md:max-w-md bg-white dark:bg-slate-800 rounded-t-3xl md:rounded-2xl shadow-2xl border-t border-x md:border border-primary/20 p-6 pointer-events-auto animate-in slide-in-from-bottom-5 md:zoom-in-95 fade-in duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                
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
                      setDetailsMemberId(null);
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
                
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'تفاصيل المستخدم' : 'User Details'}</h3>
                  <button onClick={() => setDetailsMemberId(null)} className="size-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-0 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الدور' : 'Role'}</span>
                      <span className="px-2 py-1 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary text-xs font-black border border-primary/20 inline-block">
                        {lang === 'ar' ? getRoleLabel(member.role).ar : getRoleLabel(member.role).en}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الحالة' : 'Status'}</span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-black bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                        <span className="size-2 rounded-full bg-emerald-500"></span>
                        {lang === 'ar' ? 'نشط' : 'Active'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الهاتف' : 'Phone'}</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{member.phoneNumber || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{member.email}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الشاشات المتاحة' : 'Allowed Screens'}</span>
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {member.allowedScreens && member.allowedScreens.length > 0 ? (
                          member.allowedScreens.slice(0, 2).map(screenId => {
                            const details = allPossibleScreens.find(s => s.id === screenId);
                            return details ? (
                              <span key={screenId} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                                {details.name}
                              </span>
                            ) : null;
                          })
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                        {member.allowedScreens && member.allowedScreens.length > 2 && (
                          <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                            +{member.allowedScreens.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 shrink-0 flex gap-3">
                  <button 
                    onClick={() => {
                      setDetailsMemberId(null);
                      openEditModal(member);
                    }}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-black text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                    {lang === 'ar' ? 'تعديل' : 'Edit'}
                  </button>
                  <button 
                    onClick={() => {
                      setDetailsMemberId(null);
                      setDeleteConfirmId(member.id);
                    }}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-sm shadow-xl shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                    {lang === 'ar' ? 'حذف' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[700] flex items-end md:items-center justify-center bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full md:w-[90%] md:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-xl shadow-2xl p-10 text-center animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300">
            
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
                  setDeleteConfirmId(null);
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
