import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { useToast } from '../../contexts/ToastContext';
import Dropdown from '../../components/Dropdown';
import EmptyState from '../../components/EmptyState';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  accountStatus: 'ACTIVE' | 'INACTIVE';
  ownerId?: string;
  phoneNumber?: string;
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

  useEffect(() => {
    fetchUsers(currentPage, pageSize);
  }, [currentPage, pageSize]);

  const fetchUsers = async (page: number, size: number) => {
    setIsLoading(true);
    try {
      const response = await api.get<PaginatedUsers>(`/api/v1/admin/users?page=${page}&size=${size}`);
      setUsers(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
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

  const filteredUsers = users.filter(user => 
    user.role !== 'SUPER_ADMIN'
  );

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
        <div className="overflow-x-auto animate-in fade-in duration-500 table-thead-primary">
          <table className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'} border-collapse`}>
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="px-4 md:px-6 py-4 text-xs font-black text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">person</span>
                      <span>{lang === 'ar' ? 'المستخدم' : 'User'}</span>
                    </div>
                  </th>
                  <th className="px-4 md:px-6 py-4 text-xs font-black text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">badge</span>
                      <span>{lang === 'ar' ? 'الدور' : 'Role'}</span>
                    </div>
                  </th>
                  <th className="hidden md:table-cell px-6 py-4 text-xs font-black text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">phone</span>
                      {lang === 'ar' ? 'الهاتف' : 'Phone'}
                    </div>
                  </th>
                  <th className="hidden md:table-cell px-4 md:px-6 py-4 text-xs font-black text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">toggle_on</span>
                      {lang === 'ar' ? 'الحالة' : 'Status'}
                    </div>
                  </th>
                  <th className="hidden md:table-cell px-6 py-4 text-xs font-black text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">settings</span>
                      {lang === 'ar' ? 'الإجراءات' : 'Actions'}
                    </div>
                  </th>
                  <th className="md:hidden px-4 py-4 text-xs font-black text-slate-600 dark:text-slate-400">
                    {lang === 'ar' ? 'المزيد' : 'More'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {filteredUsers.map((user, idx) => {
                  const isExpanded = expandedUserId === user.id;
                  return (
                    <tr 
                      key={user.id} 
                      className="group hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-300 animate-in slide-in-from-right-2"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="size-8 md:size-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                            <span className="material-symbols-outlined text-lg md:text-xl">person</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-slate-400 md:hidden mb-0.5">{lang === 'ar' ? 'المستخدم' : 'User'}</p>
                            <div className={`font-black text-xs md:text-sm truncate ${
                              user.accountStatus === 'INACTIVE' 
                                ? 'text-red-600 dark:text-red-400' 
                                : 'text-slate-900 dark:text-white'
                            }`}>
                              {user.name}
                            </div>
                            <div className="text-[9px] md:text-[10px] text-slate-400 font-bold mt-0.5 truncate">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] font-black text-slate-400 md:hidden mb-0.5">{lang === 'ar' ? 'الدور' : 'Role'}</p>
                          <span className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary text-[10px] md:text-xs font-black border border-primary/20 inline-block w-fit">
                            {lang === 'ar' ? getRoleLabel(user.role).ar : getRoleLabel(user.role).en}
                          </span>
                          {user.ownerId && (
                            <span className="text-[9px] text-slate-400 font-bold">{lang === 'ar' ? 'موظف' : 'Staff'}</span>
                          )}
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-6 py-5">
                        <div className="flex items-center gap-2">
                          {user.phoneNumber ? (
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                              {user.phoneNumber}
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 md:px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-black ${
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
                      <td className="hidden md:table-cell px-6 py-5">
                        <div className="flex items-center justify-center gap-2">
                          {user.accountStatus === 'ACTIVE' ? (
                            <button
                              onClick={() => setDeleteConfirmId(user.id)}
                              disabled={processingUserId === user.id}
                              className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 border border-red-200 dark:border-red-800 shadow-sm active:scale-95"
                            >
                              {processingUserId === user.id ? (
                                <div className="size-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                              ) : (
                                <span className="material-symbols-outlined text-base">block</span>
                              )}
                              {lang === 'ar' ? 'تعطيل' : 'Deactivate'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(user.id)}
                              disabled={processingUserId === user.id}
                              className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 shadow-sm active:scale-95"
                            >
                              {processingUserId === user.id ? (
                                <div className="size-3.5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin"></div>
                              ) : (
                                <span className="material-symbols-outlined text-base">check_circle</span>
                              )}
                              {lang === 'ar' ? 'تفعيل' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                      {/* Mobile: More button with popup */}
                      <td className="md:hidden px-4 py-4 relative">
                        <button
                          onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                          className="size-8 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center border border-primary/20 hover:bg-primary/20 transition-all active:scale-90"
                        >
                          <span className={`material-symbols-outlined text-lg transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                            expand_more
                          </span>
                        </button>
                        {isExpanded && (
                          <>
                            {/* Backdrop */}
                            <div 
                              className="fixed inset-0 z-[290] bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                              onClick={() => setExpandedUserId(null)}
                            ></div>
                            {/* Popup */}
                            <div className={`fixed inset-0 z-[300] flex items-center justify-center pointer-events-none`}>
                              <div 
                                className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-primary/20 p-6 pointer-events-auto animate-in zoom-in-95 fade-in duration-200"
                                onClick={(e) => e.stopPropagation()}
                              >
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
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الهاتف' : 'Phone'}</span>
                                    <span className="text-base font-bold text-slate-600 dark:text-slate-400">
                                      {user.phoneNumber || '—'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</span>
                                    <span className="text-base font-bold text-slate-600 dark:text-slate-400 truncate max-w-[60%]">
                                      {user.email}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الحالة' : 'Status'}</span>
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
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </div>

        {totalPages > 1 && (
          <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-full shadow-sm mt-8 max-w-fit mx-auto sm:mx-0 sm:ml-auto rtl:sm:mr-auto">
            <div className="px-3 py-1.5 bg-white dark:bg-slate-900 rounded-full shrink-0">
              <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 tabular-nums">
                {filteredUsers.length} / {totalElements}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => handlePageChange(currentPage - 1)} 
                disabled={currentPage === 0 || isLoading} 
                className="size-8 md:size-9 rounded-full bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-primary disabled:opacity-30 transition-all flex items-center justify-center active:scale-90"
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
                      className={`size-8 md:size-9 rounded-full font-black text-[11px] md:text-xs transition-all ${
                        currentPage === pageNum 
                        ? 'bg-primary text-white shadow-md shadow-primary/20' 
                        : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5'
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
                className="size-8 md:size-9 rounded-full bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-primary disabled:opacity-30 transition-all flex items-center justify-center active:scale-90"
              >
                <span className="material-symbols-outlined text-base rtl-flip">chevron_right</span>
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {/* Deactivate Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-[90%] md:w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
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
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;