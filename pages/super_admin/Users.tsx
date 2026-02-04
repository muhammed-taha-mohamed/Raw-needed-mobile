import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { useToast } from '../../contexts/ToastContext';
import Dropdown from '../../components/Dropdown';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-none mb-2">
            {lang === 'ar' ? 'إدارة المستخدمين' : 'Users Management'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
            {lang === 'ar' ? 'عرض وإدارة جميع المستخدمين' : 'View and manage all users'}
          </p>
        </div>
        <div className="relative group w-full md:w-80">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
          <input 
            type="text" 
            placeholder={lang === 'ar' ? 'ابحث بالاسم أو البريد...' : 'Search users...'}
            className="w-full pl-12 pr-6 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 focus:border-primary outline-none transition-all font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading && users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
          <div className="size-12 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-black text-sm">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 p-20 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">people</span>
          <p className="text-slate-500 font-black">{lang === 'ar' ? 'لا توجد مستخدمين' : 'No users found'}</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards View */}
          <div className="md:hidden space-y-4 mb-6">
            {filteredUsers.map((user, idx) => (
              <div 
                key={user.id} 
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="size-14 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-black text-lg shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 dark:text-white text-base mb-1">
                      {user.name}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    {user.phoneNumber && (
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">{user.phoneNumber}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'الدور' : 'Role'}</span>
                    <div className="flex flex-col items-end">
                      <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase">
                        {lang === 'ar' ? getRoleLabel(user.role).ar : getRoleLabel(user.role).en}
                      </span>
                      {user.ownerId && (
                        <span className="text-[9px] text-slate-400 mt-1">{lang === 'ar' ? 'موظف' : 'Staff'}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'الحالة' : 'Status'}</span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${
                      user.accountStatus === 'ACTIVE' 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    }`}>
                      <span className={`size-1.5 rounded-full ${
                        user.accountStatus === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'
                      }`}></span>
                      {user.accountStatus === 'ACTIVE' 
                        ? (lang === 'ar' ? 'نشط' : 'Active') 
                        : (lang === 'ar' ? 'معطل' : 'Inactive')}
                    </span>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  {user.accountStatus === 'ACTIVE' ? (
                    <button
                      onClick={() => setDeleteConfirmId(user.id)}
                      disabled={processingUserId === user.id}
                      className="w-full py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                      onClick={() => handleActivate(user.id)}
                      disabled={processingUserId === user.id}
                      className="w-full py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="px-8 py-5">{lang === 'ar' ? 'المستخدم' : 'User'}</th>
                    <th className="px-8 py-5">{lang === 'ar' ? 'الدور' : 'Role'}</th>
                    <th className="px-8 py-5">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="px-8 py-5 text-center">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="size-11 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-black">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 dark:text-white text-base">{user.name}</p>
                            <p className="text-xs font-bold text-slate-400">{user.email}</p>
                            {user.phoneNumber && (
                              <p className="text-xs font-bold text-slate-400">{user.phoneNumber}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase">
                          {lang === 'ar' ? getRoleLabel(user.role).ar : getRoleLabel(user.role).en}
                        </span>
                        {user.ownerId && (
                          <p className="text-[9px] text-slate-400 mt-1">{lang === 'ar' ? 'موظف' : 'Staff'}</p>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${
                          user.accountStatus === 'ACTIVE' 
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        }`}>
                          <span className={`size-1.5 rounded-full ${
                            user.accountStatus === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'
                          }`}></span>
                          {user.accountStatus === 'ACTIVE' 
                            ? (lang === 'ar' ? 'نشط' : 'Active') 
                            : (lang === 'ar' ? 'معطل' : 'Inactive')}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-center gap-2">
                          {user.accountStatus === 'ACTIVE' ? (
                            <button
                              onClick={() => setDeleteConfirmId(user.id)}
                              disabled={processingUserId === user.id}
                              className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                              onClick={() => handleActivate(user.id)}
                              disabled={processingUserId === user.id}
                              className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-10 py-6 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  {lang === 'ar' 
                    ? `إظهار ${users.length} من أصل ${totalElements} مستخدم` 
                    : `Showing ${users.length} of ${totalElements} users`}
                </div>
                <div className="hidden sm:flex items-center gap-2 border-l rtl:border-r border-slate-100 dark:border-slate-800 pl-4 rtl:pr-4">
                  <span className="text-[12px] font-black text-slate-400 uppercase">{lang === 'ar' ? 'النتائج:' : 'Size:'}</span>
                  <Dropdown 
                    options={[10, 20, 50].map(size => ({ value: String(size), label: String(size) }))} 
                    value={String(pageSize)} 
                    onChange={(v) => { setPageSize(Number(v)); setCurrentPage(0); }} 
                    placeholder={String(pageSize)} 
                    showClear={false} 
                    isRtl={lang === 'ar'} 
                    triggerClassName="min-w-[60px] min-h-[36px] flex items-center justify-between gap-1 bg-transparent border-none text-[11px] font-black text-slate-600 dark:text-slate-300 focus:ring-0 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 pl-4 pr-8 rtl:pl-8 rtl:pr-4" 
                  />
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
                        className={`size-11 rounded-xl font-black text-sm transition-all shadow-sm ${
                          currentPage === pageNum 
                          ? 'bg-primary text-white scale-110 shadow-primary/30 z-10' 
                          : 'bg-white dark:bg-slate-900 text-slate-500 border border-primary/5 hover:border-primary'
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
                  className="size-11 rounded-xl border border-primary/10 bg-white dark:bg-slate-900 text-slate-500 hover:border-primary hover:text-primary disabled:opacity-30 transition-all flex items-center justify-center active:scale-90 shadow-sm"
                >
                  <span className="material-symbols-outlined rtl-flip">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Deactivate Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 text-center">
              <div className="mx-auto size-20 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-red-50/50">
                <span className="material-symbols-outlined text-5xl">warning</span>
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 uppercase">
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