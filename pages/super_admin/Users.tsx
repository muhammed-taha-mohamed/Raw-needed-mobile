import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { useToast } from '../../contexts/ToastContext';
import Dropdown from '../../components/Dropdown';
import EmptyState from '../../components/EmptyState';

interface Category {
  id: string;
  name: string;
  arabicName: string;
}

interface SubCategory {
  id: string;
  name: string;
  arabicName: string;
}

interface Subscription {
  id: string;
  planId: string;
  planName: string;
  numberOfUsers: number;
  usedUsers: number;
  remainingUsers: number;
  subscriptionDate: string;
  expiryDate: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  accountStatus: 'ACTIVE' | 'INACTIVE';
  ownerId?: string;
  phoneNumber?: string;
  category?: Category;
  subCategories?: SubCategory[];
  subscription?: Subscription;
  organizationName?: string;
  organizationCRN?: string;
  organizationCRNImage?: string;
  profileImage?: string;
}

interface PaginatedUsers {
  content: User[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

const Users: React.FC = () => {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [desktopDetailsUserId, setDesktopDetailsUserId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('');

  useEffect(() => {
    fetchUsers(currentPage, pageSize);
  }, [currentPage, pageSize]);

  const fetchUsers = async (page: number, size: number) => {
    setIsLoading(true);
    try {
      const response = await api.get<any>(`/api/v1/admin/users?page=${page}&size=${size}`);
      const data = response?.data?.data || response?.data || response;
      setUsers(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (err: any) {
      showToast(err.message || (lang === 'ar' ? 'فشل تحميل المستخدمين' : 'Failed to load users'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async (userId: string) => {
    setProcessingUserId(userId);
    try {
      await api.put(`/api/v1/admin/users/${userId}/activate`);
      showToast(lang === 'ar' ? 'تم تفعيل المستخدم بنجاح' : 'User activated successfully', 'success');
      await fetchUsers(currentPage, pageSize);
    } catch (err: any) {
      showToast(err.message || (lang === 'ar' ? 'فشل تفعيل المستخدم' : 'Failed to activate user'), 'error');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleDeactivate = async (userId: string) => {
    setProcessingUserId(userId);
    try {
      await api.put(`/api/v1/admin/users/${userId}/deactivate`);
      showToast(lang === 'ar' ? 'تم تعطيل المستخدم بنجاح' : 'User deactivated successfully', 'success');
      await fetchUsers(currentPage, pageSize);
      setDeleteConfirmId(null);
    } catch (err: any) {
      showToast(err.message || (lang === 'ar' ? 'فشل تعطيل المستخدم' : 'Failed to deactivate user'), 'error');
    } finally {
      setProcessingUserId(null);
    }
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, { ar: string; en: string }> = {
      'SUPER_ADMIN': { ar: 'مسؤول النظام', en: 'Super Admin' },
      'CUSTOMER_OWNER': { ar: 'عميل', en: 'Customer Owner' },
      'CUSTOMER_STAFF': { ar: 'موظف عميل', en: 'Customer Staff' },
      'SUPPLIER_OWNER': { ar: 'مورد', en: 'Supplier Owner' },
      'SUPPLIER_STAFF': { ar: 'موظف مورد', en: 'Supplier Staff' },
    };
    return roleMap[role] || { ar: role, en: role };
  };

  const filteredUsers = users.filter(user => {
    if (user.role === 'SUPER_ADMIN') return false;
    if (roleFilter && user.role !== roleFilter) return false;
    return true;
  });

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="w-full py-6 animate-in fade-in duration-700">

      {isLoading && users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white/40 dark:bg-slate-900/40 rounded-[2rem] border border-slate-200 dark:border-slate-800">
          <div className="size-12 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-bold text-sm">{lang === 'ar' ? 'جاري التحميل...' : 'Loading users...'}</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState title={lang === 'ar' ? 'لا توجد مستخدمين' : 'No Users Found'} subtitle={lang === 'ar' ? 'لا توجد مستخدمين متاحين حالياً.' : 'No users available at the moment.'} />
      ) : (
        <>
        {/* Desktop Table View - Fixed Size with Scroll */}
        <div className="hidden md:block mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-primary/20 dark:border-primary/10 shadow-lg overflow-hidden">
            <div className="h-[90vh] flex flex-col">
              {/* Scrollable Table Container */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`w-full border-collapse bg-white dark:bg-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                  <thead className="sticky top-0 z-10 bg-primary/10 dark:bg-primary/5">
                    <tr className="text-[12px] font-black text-slate-600 dark:text-slate-400 border-b-2 border-primary/20">
                      <th className="px-6 py-4">{lang === 'ar' ? 'المستخدم' : 'User'}</th>
                      <th className="px-6 py-4">{lang === 'ar' ? 'الدور' : 'Role'}</th>
                      <th className="px-6 py-4">{lang === 'ar' ? 'المؤسسة' : 'Organization'}</th>
                      <th className="px-6 py-4">{lang === 'ar' ? 'الهاتف' : 'Phone'}</th>
                      <th className="px-6 py-4">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5 dark:divide-slate-700">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">person_off</span>
                            <p className="text-sm font-bold text-slate-400 dark:text-slate-500">{lang === 'ar' ? 'لا توجد بيانات' : 'No data available'}</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user, idx) => {
                        return (
                          <tr 
                            key={user.id} 
                            className="group hover:bg-primary/5 dark:hover:bg-slate-700/20 transition-all"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="size-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                                  <span className="material-symbols-outlined text-xl">person</span>
                                </div>
                                <div className="min-w-0">
                                  <div className={`font-black text-sm truncate ${
                                    user.accountStatus === 'INACTIVE' 
                                      ? 'text-red-600 dark:text-red-400' 
                                      : 'text-slate-900 dark:text-white'
                                  }`}>
                                    {user.name}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-bold mt-1.5 truncate max-w-[200px]">
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1.5 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary text-xs font-black border border-primary/20 inline-block w-fit">
                                {lang === 'ar' ? getRoleLabel(user.role).ar : getRoleLabel(user.role).en}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {user.organizationName ? (
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                  {user.organizationName}
                                </span>
                              ) : (
                                <span className="text-sm font-bold text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {user.phoneNumber ? (
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                  {user.phoneNumber}
                                </span>
                              ) : (
                                <span className="text-sm font-bold text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2 rtl:justify-start">
                                <button
                                  onClick={() => {
                                    if (user.accountStatus === 'ACTIVE') {
                                      setDeleteConfirmId(user.id);
                                    } else {
                                      handleActivate(user.id);
                                    }
                                  }}
                                  disabled={processingUserId === user.id}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md ${
                                    user.accountStatus === 'ACTIVE' 
                                      ? 'bg-emerald-500' 
                                      : 'bg-red-400'
                                  }`}
                                >
                                  {processingUserId === user.id ? (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className={`size-3 border-2 border-white/30 border-t-white rounded-full animate-spin`}></div>
                                    </div>
                                  ) : (
                                    <span
                                      className={`inline-block size-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                                        user.accountStatus === 'ACTIVE' ? 'translate-x-6' : 'translate-x-1'
                                      }`}
                                    />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2 rtl:justify-start">
                                <button
                                  onClick={() => setDesktopDetailsUserId(user.id)}
                                  className="px-3 py-1.5 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary/20 dark:hover:bg-primary/30 transition-all text-xs font-black flex items-center gap-1.5 border border-primary/20 shadow-sm active:scale-95"
                                >
                                  <span className="material-symbols-outlined text-base">more_horiz</span>
                                  {lang === 'ar' ? 'المزيد' : 'More'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
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

        {/* Desktop Details Modal */}
        {desktopDetailsUserId && (() => {
          const user = users.find(u => u.id === desktopDetailsUserId);
          if (!user) return null;
          return (
            <>
              <div 
                className="fixed inset-0 z-[290] bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setDesktopDetailsUserId(null)}
              ></div>
              <div className={`fixed inset-0 z-[300] flex items-end md:items-center justify-center pointer-events-none`}>
                <div 
                  className="w-full md:max-w-3xl bg-white dark:bg-slate-800 rounded-t-3xl md:rounded-2xl shadow-2xl border-t border-x md:border border-primary/20 p-6 pointer-events-auto animate-in slide-in-from-bottom-5 md:zoom-in-95 fade-in duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="md:hidden pt-1 pb-3 flex justify-center shrink-0 cursor-grab active:cursor-grabbing"
                    onTouchStart={(e) => {
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
                          setDesktopDetailsUserId(null);
                        } else {
                          modal.style.transform = '';
                          modal.style.transition = '';
                        }
                        document.removeEventListener('touchmove', handleMove);
                        document.removeEventListener('touchend', handleEnd);
                      };

                      document.addEventListener('touchmove', handleMove);
                      document.addEventListener('touchend', handleEnd);
                    }}
                  >
                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {lang === 'ar' ? 'تفاصيل المستخدم' : 'User Details'}
                    </h3>
                    <button
                      onClick={() => setDesktopDetailsUserId(null)}
                      className="size-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                  </div>
                  
                  {/* User Header */}
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-700">
                    <div className="size-16 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 border-2 border-primary/20 overflow-hidden">
                      {user.profileImage ? (
                        <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-3xl">person</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xl font-black mb-1 ${
                        user.accountStatus === 'INACTIVE' 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-slate-900 dark:text-white'
                      }`}>
                        {user.name}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 font-bold">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  {/* User Details Table */}
                  <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full border-collapse">
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 w-[140px] border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                            {lang === 'ar' ? 'الدور' : 'Role'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-3 py-1.5 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary text-xs font-black border border-primary/20 inline-block">
                              {lang === 'ar' ? getRoleLabel(user.role).ar : getRoleLabel(user.role).en}
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 w-[140px] border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                            {lang === 'ar' ? 'الحالة' : 'Status'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black ${
                              user.accountStatus === 'ACTIVE' 
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                            }`}>
                              <span className={`size-1.5 rounded-full ${
                                user.accountStatus === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'
                              }`}></span>
                              {user.accountStatus === 'ACTIVE' 
                                ? (lang === 'ar' ? 'نشط' : 'Active') 
                                : (lang === 'ar' ? 'معطل' : 'Inactive')}
                            </span>
                          </td>
                        </tr>
                        {user.organizationName && (
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 w-[140px] border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                              {lang === 'ar' ? 'المؤسسة' : 'Organization'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                {user.organizationName}
                              </span>
                            </td>
                          </tr>
                        )}
                        {user.organizationCRN && (
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 w-[140px] border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                              {lang === 'ar' ? 'رقم الترخيص' : 'CRN'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                {user.organizationCRN}
                              </span>
                            </td>
                          </tr>
                        )}
                        {user.phoneNumber && (
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 w-[140px] border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                              {lang === 'ar' ? 'الهاتف' : 'Phone'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                {user.phoneNumber}
                              </span>
                            </td>
                          </tr>
                        )}
                        {user.email && (
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 w-[140px] border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                              {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-bold text-slate-600 dark:text-slate-400 break-all">
                                {user.email}
                              </span>
                            </td>
                          </tr>
                        )}
                        {user.category && (
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 w-[140px] border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 align-top">
                              {lang === 'ar' ? 'القطاع' : 'Category'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-2">
                                <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-black border border-slate-200 dark:border-slate-600 inline-block w-fit">
                                  {lang === 'ar' ? user.category.arabicName : user.category.name}
                                </span>
                                {user.subCategories && user.subCategories.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {user.subCategories.map((sub, idx) => (
                                      <span key={idx} className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold border border-slate-200 dark:border-slate-700">
                                        {lang === 'ar' ? sub.arabicName : sub.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                        {user.subscription && (
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 w-[140px] border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 align-top">
                              {lang === 'ar' ? 'الاشتراك' : 'Subscription'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-2">
                                <span className="px-3 py-1.5 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary text-sm font-black border border-primary/20 inline-block w-fit">
                                  {user.subscription.planName}
                                </span>
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                                    {user.subscription.usedUsers}/{user.subscription.numberOfUsers} {lang === 'ar' ? 'مستخدم' : 'users'}
                                  </span>
                                  {user.subscription.subscriptionDate && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                                      {lang === 'ar' ? 'تاريخ الاشتراك' : 'Subscription Date'}: {new Date(user.subscription.subscriptionDate).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                                    </span>
                                  )}
                                  {user.subscription.expiryDate && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                                      {lang === 'ar' ? 'ينتهي' : 'Expires'}: {new Date(user.subscription.expiryDate).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        {user.organizationCRNImage && (
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 w-[140px] border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 align-top">
                              {lang === 'ar' ? 'صورة الترخيص' : 'CRN Image'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden max-w-md">
                                <img 
                                  src={user.organizationCRNImage} 
                                  alt={lang === 'ar' ? 'صورة الترخيص' : 'CRN Image'} 
                                  className="w-full h-auto max-h-64 object-contain bg-slate-50 dark:bg-slate-900"
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Action Button */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                    {user.accountStatus === 'ACTIVE' ? (
                      <button
                        onClick={() => {
                          setDesktopDetailsUserId(null);
                          setDeleteConfirmId(user.id);
                        }}
                        disabled={processingUserId === user.id}
                        className="w-full py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all text-sm font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-red-200 dark:border-red-800"
                      >
                        {processingUserId === user.id ? (
                          <div className="size-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                        ) : (
                          <span className="material-symbols-outlined text-lg">block</span>
                        )}
                        {lang === 'ar' ? 'تعطيل' : 'Deactivate'}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setDesktopDetailsUserId(null);
                          handleActivate(user.id);
                        }}
                        disabled={processingUserId === user.id}
                        className="w-full py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all text-sm font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-800"
                      >
                        {processingUserId === user.id ? (
                          <div className="size-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin"></div>
                        ) : (
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                        )}
                        {lang === 'ar' ? 'تفعيل' : 'Activate'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          );
        })()}

        {/* Mobile View */}
        <div className="md:hidden space-y-4 mb-6">
          {filteredUsers.map((user, idx) => {
            const isExpanded = expandedUserId === user.id;
            return (
              <div 
                key={user.id} 
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="p-4 flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                    <span className="material-symbols-outlined text-xl">person</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`font-black text-sm truncate ${
                        user.accountStatus === 'INACTIVE' 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-slate-900 dark:text-white'
                      }`}>
                        {user.name}
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary text-[10px] font-black border border-primary/20 shrink-0">
                        {lang === 'ar' ? getRoleLabel(user.role).ar : getRoleLabel(user.role).en}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">
                      {user.email}
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                    className="size-8 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center border border-primary/20 hover:bg-primary/20 transition-all active:scale-90"
                  >
                    <span className={`material-symbols-outlined text-lg transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>
                </div>
                {isExpanded && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-[290] bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                      onClick={() => setExpandedUserId(null)}
                    ></div>
                    {/* Popup */}
                    <div className={`fixed inset-0 z-[300] flex items-end md:items-center justify-center pointer-events-none`}>
                      <div 
                        className="w-full md:w-[85%] bg-white dark:bg-slate-800 rounded-t-3xl md:rounded-2xl shadow-2xl border-t border-x border-primary/20 p-6 pointer-events-auto animate-in slide-in-from-bottom-5 md:zoom-in-95 fade-in duration-300 max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className="md:hidden pt-1 pb-3 flex justify-center shrink-0 cursor-grab active:cursor-grabbing"
                          onTouchStart={(e) => {
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
                                setExpandedUserId(null);
                              } else {
                                modal.style.transform = '';
                                modal.style.transition = '';
                              }
                              document.removeEventListener('touchmove', handleMove);
                              document.removeEventListener('touchend', handleEnd);
                            };

                            document.addEventListener('touchmove', handleMove);
                            document.addEventListener('touchend', handleEnd);
                          }}
                        >
                          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                        </div>
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                          <h3 className="text-base font-black text-slate-900 dark:text-white">
                            {lang === 'ar' ? 'تفاصيل المستخدم' : 'User Details'}
                          </h3>
                          <button
                            onClick={() => setExpandedUserId(null)}
                            className="size-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors"
                          >
                            <span className="material-symbols-outlined text-xl">close</span>
                          </button>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                          <div className="space-y-0 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                              <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الدور' : 'Role'}</span>
                              <span className="px-2 py-1 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary text-xs font-black border border-primary/20">
                                {lang === 'ar' ? getRoleLabel(user.role).ar : getRoleLabel(user.role).en}
                              </span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                              <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الحالة' : 'Status'}</span>
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-black ${
                                user.accountStatus === 'ACTIVE' 
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                              }`}>
                                <span className={`size-1.5 rounded-full ${
                                  user.accountStatus === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'
                                }`}></span>
                                {user.accountStatus === 'ACTIVE' 
                                  ? (lang === 'ar' ? 'نشط' : 'Active') 
                                  : (lang === 'ar' ? 'معطل' : 'Inactive')}
                              </span>
                            </div>
                            {user.organizationName && (
                              <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                                <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'المؤسسة' : 'Organization'}</span>
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 text-end max-w-[60%]">
                                  {user.organizationName}
                                </span>
                              </div>
                            )}
                            {user.organizationCRN && (
                              <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                                <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'رقم الترخيص' : 'CRN'}</span>
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 text-end">
                                  {user.organizationCRN}
                                </span>
                              </div>
                            )}
                            {user.category && (
                              <div className="flex items-start justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                                <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'القطاع' : 'Category'}</span>
                                <div className="flex flex-col items-end gap-1 max-w-[60%]">
                                  <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black border border-slate-200 dark:border-slate-600 inline-block">
                                    {lang === 'ar' ? user.category.arabicName : user.category.name}
                                  </span>
                                  {user.subCategories && user.subCategories.length > 0 && (
                                    <div className="flex flex-wrap gap-1 justify-end mt-1">
                                      {user.subCategories.map((sub, idx) => (
                                        <span key={idx} className="px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                                          {lang === 'ar' ? sub.arabicName : sub.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {user.subscription && (
                              <div className="flex items-start justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                                <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الاشتراك' : 'Subscription'}</span>
                                <div className="flex flex-col items-end gap-1 max-w-[60%]">
                                  <span className="px-2 py-1 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary text-xs font-black border border-primary/20 inline-block">
                                    {user.subscription.planName}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-bold">
                                    {user.subscription.usedUsers}/{user.subscription.numberOfUsers} {lang === 'ar' ? 'مستخدم' : 'users'}
                                  </span>
                                  {user.subscription.subscriptionDate && (
                                    <span className="text-[10px] text-slate-400 font-bold">
                                      {lang === 'ar' ? 'تاريخ الاشتراك' : 'Subscription Date'}: {new Date(user.subscription.subscriptionDate).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                                    </span>
                                  )}
                                  {user.subscription.expiryDate && (
                                    <span className="text-[10px] text-slate-400 font-bold">
                                      {lang === 'ar' ? 'ينتهي' : 'Expires'}: {new Date(user.subscription.expiryDate).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            {user.phoneNumber && (
                              <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                                <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الهاتف' : 'Phone'}</span>
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 text-end">
                                  {user.phoneNumber}
                                </span>
                              </div>
                            )}
                            {user.email && (
                              <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">
                                <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</span>
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 break-all text-end max-w-[60%]">
                                  {user.email}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                          {user.accountStatus === 'ACTIVE' ? (
                            <button
                              onClick={() => {
                                setExpandedUserId(null);
                                setDeleteConfirmId(user.id);
                              }}
                              disabled={processingUserId === user.id}
                              className="w-full py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-red-200 dark:border-red-800"
                            >
                              {processingUserId === user.id ? (
                                <div className="size-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                              ) : (
                                <span className="material-symbols-outlined text-base">block</span>
                              )}
                              {lang === 'ar' ? 'تعطيل' : 'Deactivate'}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setExpandedUserId(null);
                                handleActivate(user.id);
                              }}
                              disabled={processingUserId === user.id}
                              className="w-full py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-800"
                            >
                              {processingUserId === user.id ? (
                                <div className="size-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin"></div>
                              ) : (
                                <span className="material-symbols-outlined text-base">check_circle</span>
                              )}
                              {lang === 'ar' ? 'تفعيل' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile Pagination */}
        {totalPages > 0 && (
          <div className="md:hidden mb-24 px-4">
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 max-w-sm mx-auto">
              <div className="px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg shrink-0 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 tabular-nums">
                  {currentPage + 1} / {totalPages}
                </span>
              </div>
              <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5"></div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)} 
                  disabled={currentPage === 0 || isLoading}
                  className="size-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-primary hover:border-primary disabled:opacity-30 transition-all flex items-center justify-center active:scale-90"
                >
                  <span className="material-symbols-outlined text-sm rtl-flip">chevron_left</span>
                </button>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => handlePageChange(currentPage)}
                    className="size-7 rounded-lg font-black text-xs bg-primary text-white shadow-sm active:scale-95 transition-all"
                  >
                    {currentPage + 1}
                  </button>
                </div>
                <button 
                  onClick={() => handlePageChange(currentPage + 1)} 
                  disabled={currentPage >= totalPages - 1 || isLoading}
                  className="size-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-primary hover:border-primary disabled:opacity-30 transition-all flex items-center justify-center active:scale-90"
                >
                  <span className="material-symbols-outlined text-sm rtl-flip">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        )}
        </>
      )}

      {/* Deactivate Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[400] flex items-end md:items-center justify-center bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full md:w-[90%] md:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-xl shadow-2xl border-t border-x md:border border-primary/20 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300">
            <div className="p-10 text-center">
              <div className="mx-auto size-20 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-red-50/50">
                <span className="material-symbols-outlined text-5xl">warning</span>
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">
                {lang === 'ar' ? 'تعطيل المستخدم؟' : 'Deactivate User?'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-500 mb-10 leading-relaxed font-bold">
                {lang === 'ar' 
                  ? 'سيتم تعطيل هذا المستخدم ولن يتمكن من تسجيل الدخول. إذا كان المستخدم OWNER، سيتم تعطيل جميع الموظفين المرتبطين به أيضاً.' 
                  : 'This user will be deactivated and will not be able to login. If the user is an OWNER, all associated staff members will also be deactivated.'}
              </p>
              <div className="flex gap-4">
                <button 
                  disabled={processingUserId === deleteConfirmId}
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-4 text-[12px] font-black text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-100 dark:border-slate-800"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button 
                  disabled={processingUserId === deleteConfirmId}
                  onClick={() => handleDeactivate(deleteConfirmId)}
                  className="flex-[1.5] py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-lg shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center text-[12px] gap-2"
                >
                  {processingUserId === deleteConfirmId ? (
                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">block</span>
                      {lang === 'ar' ? 'تأكيد التعطيل' : 'Confirm Deactivate'}
                    </>
                  )}
                </button>
              </div>
            </div>
            {/* Close Button at Bottom - Mobile Only */}
            <div className="md:hidden px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                onClick={() => setDeleteConfirmId(null)}
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

export default Users;