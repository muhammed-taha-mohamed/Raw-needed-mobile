import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { useToast } from '../../contexts/ToastContext';
import PaginationFooter from '../../components/PaginationFooter';
import EmptyState from '../../components/EmptyState';
import { MODAL_INPUT_CLASS, MODAL_OVERLAY_BASE_CLASS, MODAL_PANEL_BASE_CLASS } from '../../components/modalTheme';
import Dropdown from '../../components/Dropdown';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | string;
  accountStatus?: 'ACTIVE' | 'INACTIVE' | string;
}

const AdminManagement: React.FC = () => {
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const currentRole = useMemo(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return '';
    try {
      const parsed = JSON.parse(userStr);
      return String(parsed?.userInfo?.role || parsed?.role || '').toUpperCase();
    } catch {
      return '';
    }
  }, []);

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingAdminId, setDeletingAdminId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [detailsAdminId, setDetailsAdminId] = useState<string | null>(null);
  const [expandedAdminId, setExpandedAdminId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    role: 'ADMIN' as 'ADMIN' | 'SUPER_ADMIN',
  });

  const roleLabel = (role: string) => {
    if (role === 'SUPER_ADMIN') return lang === 'ar' ? 'سوبر أدمن' : 'Super Admin';
    if (role === 'ADMIN') return lang === 'ar' ? 'أدمن' : 'Admin';
    return role;
  };

  const fetchAdmins = async (pageNumber: number) => {
    setIsLoading(true);
    try {
      const response = await api.get<any>(`/api/v1/admin/users/admin-accounts?page=${pageNumber}&size=${pageSize}`);
      const data = response?.data?.data || response?.data || response;
      setAdmins(data?.content || []);
      setTotalPages(data?.totalPages || 0);
      setTotalElements(data?.totalElements || 0);
    } catch (err: any) {
      showToast(err?.message || (lang === 'ar' ? 'فشل تحميل حسابات الإدارة' : 'Failed to load admin accounts'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentRole === 'SUPER_ADMIN') {
      fetchAdmins(page);
    }
  }, [page, currentRole]);

  const handleCreateOrUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast(lang === 'ar' ? 'يرجى استكمال البيانات الأساسية' : 'Please complete required fields', 'warning');
      return;
    }
    if (!editingAdminId) {
      if (!formData.password) {
        showToast(lang === 'ar' ? 'يرجى إدخال كلمة المرور' : 'Please enter password', 'warning');
        return;
      }
      if (formData.password.length < 6) {
        showToast(lang === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters', 'warning');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        showToast(lang === 'ar' ? 'كلمة المرور وتأكيدها غير متطابقين' : 'Password and confirmation do not match', 'warning');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim() || null,
        role: formData.role,
      };
      if (!editingAdminId) {
        payload.password = formData.password;
        payload.confirmPassword = formData.confirmPassword;
      }

      if (editingAdminId) {
        await api.put(`/api/v1/admin/users/admin-accounts/${editingAdminId}`, payload);
      } else {
        await api.post('/api/v1/admin/users/admin-accounts', payload);
      }

      showToast(
        editingAdminId
          ? (lang === 'ar' ? 'تم تحديث بيانات المسؤول بنجاح' : 'Admin account updated successfully')
          : (lang === 'ar' ? 'تم إنشاء حساب الإدارة بنجاح' : 'Admin account created successfully'),
        'success'
      );
      setFormData({
        name: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        role: 'ADMIN',
      });
      setEditingAdminId(null);
      setPage(0);
      await fetchAdmins(0);
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(
        err?.message ||
          (editingAdminId
            ? (lang === 'ar' ? 'فشل تحديث بيانات المسؤول' : 'Failed to update admin account')
            : (lang === 'ar' ? 'فشل إنشاء حساب الإدارة' : 'Failed to create admin account')),
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddModal = () => {
    setEditingAdminId(null);
    setFormData({
      name: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      role: 'ADMIN',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (admin: AdminUser) => {
    setEditingAdminId(admin.id);
    setFormData({
      name: admin.name || '',
      email: admin.email || '',
      phoneNumber: admin.phoneNumber || '',
      password: '',
      confirmPassword: '',
      role: (admin.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN'),
    });
    setIsModalOpen(true);
  };

  const handleDeleteAdmin = async (admin: AdminUser) => {
    if (admin.role === 'SUPER_ADMIN') {
      showToast(lang === 'ar' ? 'لا يمكن حذف حساب سوبر أدمن' : 'Super Admin account cannot be deleted', 'warning');
      return;
    }

    const confirmed = window.confirm(
      lang === 'ar'
        ? `هل أنت متأكد من حذف المسؤول ${admin.name}؟`
        : `Are you sure you want to delete admin ${admin.name}?`
    );
    if (!confirmed) return;

    setDeletingAdminId(admin.id);
    try {
      await api.delete(`/api/v1/admin/users/admin-accounts/${admin.id}`);
      showToast(lang === 'ar' ? 'تم حذف المسؤول بنجاح' : 'Admin account deleted successfully', 'success');
      const targetPage = admins.length === 1 && page > 0 ? page - 1 : page;
      setPage(targetPage);
      await fetchAdmins(targetPage);
      if (detailsAdminId === admin.id) setDetailsAdminId(null);
      if (expandedAdminId === admin.id) setExpandedAdminId(null);
    } catch (err: any) {
      showToast(err?.message || (lang === 'ar' ? 'فشل حذف المسؤول' : 'Failed to delete admin account'), 'error');
    } finally {
      setDeletingAdminId(null);
    }
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 0 || nextPage >= totalPages) return;
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const attachMobileDragToClose = (
    e: React.TouchEvent<HTMLDivElement>,
    close: () => void
  ) => {
    const startY = e.touches[0].clientY;
    const modal = e.currentTarget.closest('.fixed')?.querySelector('.w-full') as HTMLElement | null;
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
        close();
      } else {
        modal.style.transform = '';
        modal.style.transition = '';
      }
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  };

  if (currentRole !== 'SUPER_ADMIN') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="w-full py-4 animate-in fade-in slide-in-from-bottom-4 duration-700 font-display min-h-screen pb-40">
      <div className="fixed bottom-32 left-0 right-0 z-[180] pointer-events-none px-6 md:hidden">
        <div className="w-full flex flex-col items-end pointer-events-auto">
          <button
            onClick={openAddModal}
            className="size-14 rounded-full bg-primary text-white shadow-[0_15px_35px_rgba(0,154,167,0.4)] flex items-center justify-center active:scale-90 transition-all border-2 border-white/20 group hover:bg-slate-900"
          >
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">admin_panel_settings</span>
          </button>
        </div>
      </div>

      <div className="hidden md:block mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-primary/20 dark:border-primary/10 shadow-lg overflow-hidden">
          <div className="bg-primary/10 dark:bg-primary/5 border-b-2 border-primary/20 px-6 py-3 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-700 dark:text-slate-300">
              {lang === 'ar' ? 'إدارة المسؤولين' : 'Admin Management'}
            </h2>
            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg shadow-md shadow-primary/20 font-black transition-all active:scale-95 text-xs"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              {lang === 'ar' ? 'إضافة مسؤول' : 'Add Admin'}
            </button>
          </div>
          <div className="h-[90vh] flex flex-col">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isLoading && admins.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40"><div className="size-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div><p className="text-slate-400 font-black text-xs">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p></div>
              ) : admins.length === 0 ? (
                <div className="py-40 px-4"><EmptyState title={lang === 'ar' ? 'لا يوجد مسؤولين' : 'No admin accounts found'} /></div>
              ) : (
                <table dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`w-full border-collapse bg-white dark:bg-slate-800 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                  <thead className="sticky top-0 z-10 bg-primary/10 dark:bg-primary/5">
                    <tr className="text-[12px] font-black text-slate-600 dark:text-slate-400 border-b-2 border-primary/20">
                      <th className="px-6 py-4">{lang === 'ar' ? 'المسؤول' : 'Admin'}</th>
                      <th className="px-6 py-4">{lang === 'ar' ? 'البريد' : 'Email'}</th>
                      <th className="px-6 py-4">{lang === 'ar' ? 'الدور' : 'Role'}</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5 dark:divide-slate-700">
                    {admins.map((admin) => (
                      <tr key={admin.id} className="group hover:bg-primary/5 dark:hover:bg-slate-700/20 transition-all">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 border border-primary/20 overflow-hidden">
                              <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
                            </div>
                            <div className="min-w-0">
                              <div className="font-black text-sm truncate text-slate-900 dark:text-white">{admin.name}</div>
                              <div className="text-[11px] text-slate-400 font-bold mt-1.5 truncate max-w-[220px]">{admin.phoneNumber || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">{admin.email}</span></td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${admin.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' : 'bg-primary/10 text-primary border-primary/20'}`}>
                            {roleLabel(admin.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 rtl:justify-start">
                            <button onClick={() => openEditModal(admin)} className="size-9 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary border border-slate-100 dark:border-slate-700 transition-all active:scale-90 flex items-center justify-center">
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteAdmin(admin)}
                              disabled={deletingAdminId === admin.id || admin.role === 'SUPER_ADMIN'}
                              className="size-9 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:text-red-600 border border-red-100 dark:border-red-800 transition-all active:scale-90 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingAdminId === admin.id ? (
                                <div className="size-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                              ) : (
                                <span className="material-symbols-outlined text-lg">delete</span>
                              )}
                            </button>
                            <button onClick={() => setDetailsAdminId(admin.id)} className="size-9 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary border border-slate-100 dark:border-slate-700 transition-all active:scale-90 flex items-center justify-center">
                              <span className="material-symbols-outlined text-lg">visibility</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden space-y-4 mb-6">
        {isLoading && admins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40"><div className="size-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div><p className="text-slate-400 font-black text-xs">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p></div>
        ) : admins.length === 0 ? (
          <EmptyState title={lang === 'ar' ? 'لا يوجد مسؤولين' : 'No admin accounts found'} />
        ) : (
          admins.map((admin) => {
            const isExpanded = expandedAdminId === admin.id;
            return (
              <div key={admin.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <div className="p-4 flex items-center gap-3">
                  <button onClick={() => setExpandedAdminId(isExpanded ? null : admin.id)} className="size-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 border border-primary/20 hover:bg-primary/20 transition-all active:scale-90">
                    <span className={`material-symbols-outlined text-xl transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-black text-sm truncate text-slate-900 dark:text-white">{admin.name}</div>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${admin.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' : 'bg-primary/10 text-primary border-primary/20'}`}>{roleLabel(admin.role)}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">{admin.email}</div>
                  </div>
                  <button onClick={() => openEditModal(admin)} className="size-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 border border-primary/20 hover:bg-primary/20 transition-all active:scale-90">
                    <span className="material-symbols-outlined text-xl">edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteAdmin(admin)}
                    disabled={deletingAdminId === admin.id || admin.role === 'SUPER_ADMIN'}
                    className="size-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 shrink-0 border border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingAdminId === admin.id ? (
                      <div className="size-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                    ) : (
                      <span className="material-symbols-outlined text-xl">delete</span>
                    )}
                  </button>
                  <button onClick={() => setDetailsAdminId(admin.id)} className="size-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 border border-primary/20 hover:bg-primary/20 transition-all active:scale-90">
                    <span className="material-symbols-outlined text-xl">person</span>
                  </button>
                </div>
                {isExpanded && (
                  <>
                    <div className="fixed inset-0 z-[290] bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setExpandedAdminId(null)}></div>
                    <div className="fixed inset-0 z-[300] flex items-end justify-center pointer-events-none">
                      <div className="w-full bg-white dark:bg-slate-800 rounded-t-3xl shadow-2xl border-t border-x border-primary/20 p-6 pointer-events-auto animate-in slide-in-from-bottom-5 fade-in duration-300 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="md:hidden pt-1 pb-3 flex justify-center shrink-0 cursor-grab active:cursor-grabbing" onTouchStart={(e) => attachMobileDragToClose(e, () => setExpandedAdminId(null))}>
                          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                        </div>
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                          <h3 className="text-base font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'تفاصيل المسؤول' : 'Admin Details'}</h3>
                          <button onClick={() => setExpandedAdminId(null)} className="size-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors"><span className="material-symbols-outlined text-xl">close</span></button>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar flex-1">
                          <div className="space-y-0 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700"><span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الدور' : 'Role'}</span><span className="text-xs font-black text-primary">{roleLabel(admin.role)}</span></div>
                            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700"><span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الهاتف' : 'Phone'}</span><span className="text-xs font-bold text-slate-700 dark:text-slate-300">{admin.phoneNumber || '-'}</span></div>
                            <div className="flex items-center justify-between px-4 py-3"><span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</span><span className="text-xs font-bold text-slate-700 dark:text-slate-300 break-all">{admin.email}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <PaginationFooter
        currentPage={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        currentCount={admins.length}
      />

      {isModalOpen && (
        <div className={`fixed inset-0 z-[600] ${MODAL_OVERLAY_BASE_CLASS}`} onClick={() => setIsModalOpen(false)}>
          <div className={`${MODAL_PANEL_BASE_CLASS} md:max-w-2xl`} onClick={(e) => e.stopPropagation()}>
            <div className="md:hidden pt-3 pb-2 flex justify-center shrink-0 cursor-grab active:cursor-grabbing" onTouchStart={(e) => attachMobileDragToClose(e, () => setIsModalOpen(false))}>
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
            </div>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-2xl">admin_panel_settings</span></div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">{editingAdminId ? (lang === 'ar' ? 'تعديل مسؤول' : 'Edit Admin') : (lang === 'ar' ? 'إضافة مسؤول' : 'Add Admin')}</h3>
                  <p className="text-[10px] font-black text-slate-400 mt-2">{editingAdminId ? (lang === 'ar' ? 'تحديث بيانات حساب الإدارة' : 'Update admin account details') : (lang === 'ar' ? 'إضافة حساب Admin / Super Admin' : 'Create ADMIN / SUPER_ADMIN account')}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="size-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-xl">close</span></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <form id="adminForm" onSubmit={handleCreateOrUpdateAdmin} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'الاسم' : 'Name'}</label>
                    <input required value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} placeholder={lang === 'ar' ? 'مثال: محمد أحمد' : 'e.g. John Doe'} className={MODAL_INPUT_CLASS} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                    <input required type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} placeholder={lang === 'ar' ? 'مثال: admin@company.com' : 'e.g. admin@company.com'} className={MODAL_INPUT_CLASS} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'الهاتف' : 'Phone'}</label>
                    <input value={formData.phoneNumber} onChange={(e) => setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))} placeholder={lang === 'ar' ? 'مثال: 01000000000' : 'e.g. 01000000000'} className={MODAL_INPUT_CLASS} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'الدور' : 'Role'}</label>
                    <Dropdown
                      options={[
                        { value: 'ADMIN', label: lang === 'ar' ? 'أدمن' : 'Admin' },
                        { value: 'SUPER_ADMIN', label: lang === 'ar' ? 'سوبر أدمن' : 'Super Admin' },
                      ]}
                      value={formData.role}
                      onChange={(value) => setFormData((prev) => ({ ...prev, role: (value || 'ADMIN') as 'ADMIN' | 'SUPER_ADMIN' }))}
                      placeholder={lang === 'ar' ? 'اختر الدور' : 'Select role'}
                      isRtl={lang === 'ar'}
                      showClear={false}
                      wrapperClassName="space-y-1"
                      triggerClassName={`${MODAL_INPUT_CLASS} min-h-[48px] cursor-pointer`}
                    />
                  </div>
                  {!editingAdminId && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'كلمة المرور' : 'Password'}</label>
                        <input required type="password" value={formData.password} onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))} placeholder={lang === 'ar' ? '6 أحرف على الأقل' : 'At least 6 characters'} className={MODAL_INPUT_CLASS} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500 px-1">{lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                        <input required type="password" value={formData.confirmPassword} onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))} placeholder={lang === 'ar' ? 'أعد كتابة كلمة المرور' : 'Re-enter password'} className={MODAL_INPUT_CLASS} />
                      </div>
                    </>
                  )}
                </div>
              </form>
            </div>
            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0 flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
              <button type="submit" form="adminForm" disabled={isSubmitting} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
                {isSubmitting ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><span className="material-symbols-outlined">verified</span>{editingAdminId ? (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : (lang === 'ar' ? 'إضافة مسؤول' : 'Add Admin')}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailsAdminId && (() => {
        const admin = admins.find((a) => a.id === detailsAdminId);
        if (!admin) return null;
        return (
          <>
            <div className="fixed inset-0 z-[290] bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDetailsAdminId(null)}></div>
            <div className="fixed inset-0 z-[300] flex items-end md:items-center justify-center pointer-events-none">
              <div className="w-full md:max-w-md bg-white dark:bg-slate-800 rounded-t-3xl md:rounded-2xl shadow-2xl border-t border-x md:border border-primary/20 p-6 pointer-events-auto animate-in slide-in-from-bottom-5 md:zoom-in-95 fade-in duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="md:hidden pt-1 pb-3 flex justify-center shrink-0 cursor-grab active:cursor-grabbing" onTouchStart={(e) => attachMobileDragToClose(e, () => setDetailsAdminId(null))}>
                  <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                </div>
                <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'تفاصيل المسؤول' : 'Admin Details'}</h3>
                  <button onClick={() => setDetailsAdminId(null)} className="size-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-xl">close</span></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 mt-4">
                  <div className="space-y-0 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700"><span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الاسم' : 'Name'}</span><span className="text-xs font-bold text-slate-700 dark:text-slate-300">{admin.name}</span></div>
                    <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700"><span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الدور' : 'Role'}</span><span className="text-xs font-bold text-primary">{roleLabel(admin.role)}</span></div>
                    <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700"><span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الهاتف' : 'Phone'}</span><span className="text-xs font-bold text-slate-700 dark:text-slate-300">{admin.phoneNumber || '-'}</span></div>
                    <div className="flex items-center justify-between px-4 py-3"><span className="text-xs font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</span><span className="text-xs font-bold text-slate-700 dark:text-slate-300 break-all">{admin.email}</span></div>
                  </div>
                </div>
                <div className="p-2 border-t border-slate-100 dark:border-slate-800 shrink-0 flex gap-2">
                  <button onClick={() => { setDetailsAdminId(null); openEditModal(admin); }} className="flex-1 py-3 rounded-xl bg-primary text-white font-black text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-base">edit</span>
                    {lang === 'ar' ? 'تعديل' : 'Edit'}
                  </button>
                  <button
                    onClick={() => handleDeleteAdmin(admin)}
                    disabled={deletingAdminId === admin.id || admin.role === 'SUPER_ADMIN'}
                    className="flex-1 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-100 dark:border-red-800 font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingAdminId === admin.id ? (
                      <div className="size-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">delete</span>
                        {lang === 'ar' ? 'حذف' : 'Delete'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 154, 167, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default AdminManagement;
