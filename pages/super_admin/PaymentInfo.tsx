
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { PaymentInfo as PaymentInfoType, PaymentType } from '../../types';
import { api } from '../../api';
import Dropdown from '../../components/Dropdown';

const PaymentInfo: React.FC = () => {
  const { lang, t } = useLanguage();
  const [list, setList] = useState<PaymentInfoType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    transferNumber: '',
    accountNumber: '',
    paymentType: 'BANK_ACCOUNT' as PaymentType,
    accountHolderName: '',
    bankName: '',
    walletProvider: '',
    active: true,
  });

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<PaymentInfoType[]>('/api/v1/admin/payment-info');
      setList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
      setList([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({
      transferNumber: '',
      accountNumber: '',
      paymentType: 'BANK_ACCOUNT',
      accountHolderName: '',
      bankName: '',
      walletProvider: '',
      active: true,
    });
    setIsModalOpen(true);
  };

  const openEdit = (item: PaymentInfoType) => {
    setEditingId(item.id);
    setFormData({
      transferNumber: item.transferNumber,
      accountNumber: item.accountNumber || '',
      paymentType: item.paymentType,
      accountHolderName: item.accountHolderName || '',
      bankName: item.bankName || '',
      walletProvider: item.walletProvider || '',
      active: item.active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: any = {
        transferNumber: formData.transferNumber.trim(),
        accountNumber: formData.accountNumber.trim() || undefined,
        paymentType: formData.paymentType,
        accountHolderName: formData.accountHolderName.trim() || undefined,
        active: formData.active,
      };
      if (formData.paymentType === 'BANK_ACCOUNT') {
        payload.bankName = formData.bankName.trim() || undefined;
      } else {
        payload.walletProvider = formData.walletProvider.trim() || undefined;
      }
      if (editingId) {
        await api.put(`/api/v1/admin/payment-info/${editingId}`, payload);
      } else {
        await api.post('/api/v1/admin/payment-info', payload);
      }
      setIsModalOpen(false);
      fetchList();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/v1/admin/payment-info/${deleteConfirmId}`);
      setDeleteConfirmId(null);
      fetchList();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const paymentTypeLabel = (t: PaymentType) => {
    if (t === 'BANK_ACCOUNT') return lang === 'ar' ? 'حساب بنكي' : 'Bank Account';
    return lang === 'ar' ? 'محفظة إلكترونية' : 'Electronic Wallet';
  };

  return (
    <div className="mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-6 pb-24 md:pb-6 flex flex-col gap-8 font-display animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Desktop: Add button at top when there are items */}
      {!isLoading && list.length > 0 && (
        <div className="hidden md:flex justify-start">
          <button onClick={openCreate} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-lg shadow-primary/20 font-bold text-sm transition-all active:scale-95">
            <span className="material-symbols-outlined text-[20px]">add</span>
            {lang === 'ar' ? 'إضافة معلومات دفع' : 'Add Payment Info'}
          </button>
        </div>
      )}

      {error && !isModalOpen && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="h-10 w-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-bold text-[11px]">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      ) : list.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-5xl mb-4">account_balance_wallet</span>
          <h3 className="text-lg font-black text-slate-700 dark:text-slate-200 mb-2">{lang === 'ar' ? 'لا توجد معلومات دفع' : 'No payment info yet'}</h3>
          <p className="text-slate-500 text-sm mb-6">{lang === 'ar' ? 'أضف حساب تحويل أو محفظة لعرضها للمستخدمين.' : 'Add a transfer account or wallet to show to users.'}</p>
          <button onClick={openCreate} className="px-8 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg active:scale-95">
            {lang === 'ar' ? 'إضافة أول عنصر' : 'Add first entry'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black    border ${item.paymentType === 'BANK_ACCOUNT' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800' : 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'}`}>
                  {paymentTypeLabel(item.paymentType)}
                </span>
                <span className={`size-2 rounded-full ${item.active ? 'bg-emerald-500' : 'bg-slate-300'}`} title={item.active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'غير نشط' : 'Inactive')} />
              </div>
              <p className="text-slate-500 dark:text-slate-500 text-[10px] font-bold    mb-1">{lang === 'ar' ? 'رقم التحويل' : 'Transfer number'}</p>
              <p className="text-slate-900 dark:text-white font-black text-base mb-3 tabular-nums">{item.transferNumber}</p>
              {item.accountNumber && (
                <>
                  <p className="text-slate-500 dark:text-slate-500 text-[10px] font-bold    mb-1">{lang === 'ar' ? 'رقم الحساب' : 'Account number'}</p>
                  <p className="text-slate-700 dark:text-slate-200 font-bold text-sm tabular-nums">{item.accountNumber}</p>
                </>
              )}
              {item.paymentType === 'BANK_ACCOUNT' && item.bankName && (
                <p className="text-slate-600 dark:text-slate-300 text-xs font-bold mt-2">{item.bankName}</p>
              )}
              {item.paymentType === 'ELECTRONIC_WALLET' && item.walletProvider && (
                <p className="text-slate-600 dark:text-slate-300 text-xs font-bold mt-2">{item.walletProvider}</p>
              )}
              <div className="mt-auto pt-4 flex gap-2">
                <button onClick={() => openEdit(item)} className="flex-1 py-2 rounded-xl border border-primary/20 text-primary font-bold text-xs hover:bg-primary/10 transition-all flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-base">edit</span>
                  {lang === 'ar' ? 'تعديل' : 'Edit'}
                </button>
                <button onClick={() => setDeleteConfirmId(item.id)} className="p-2 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-500 hover:text-white transition-all">
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-[90%] md:w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {editingId ? (lang === 'ar' ? 'تعديل معلومات الدفع' : 'Edit Payment Info') : (lang === 'ar' ? 'إضافة معلومات دفع' : 'Add Payment Info')}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form id="paymentInfoForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 text-red-700 dark:text-red-300 rounded-xl flex items-center gap-2 text-sm font-bold">
                  <span className="material-symbols-outlined">error</span>
                  {error}
                </div>
              )}
              <div>
                <label className="text-[11px] font-bold text-slate-500    px-1 block mb-1.5">{lang === 'ar' ? 'رقم التحويل' : 'Transfer number'} *</label>
                <input
                  type="text"
                  value={formData.transferNumber}
                  onChange={(e) => setFormData({ ...formData, transferNumber: e.target.value })}
                  placeholder={t.paymentInfo.transferNumberPlaceholder}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-bold focus:border-primary outline-none text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500    px-1 block mb-1.5">{lang === 'ar' ? 'رقم الحساب' : 'Account number'}</label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder={t.paymentInfo.accountNumberPlaceholder}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-bold focus:border-primary outline-none text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500    px-1 block mb-1.5">{lang === 'ar' ? 'نوع الدفع' : 'Payment type'}</label>
                <Dropdown options={[{ value: 'BANK_ACCOUNT', label: lang === 'ar' ? 'حساب بنكي' : 'Bank Account' }, { value: 'ELECTRONIC_WALLET', label: lang === 'ar' ? 'محفظة إلكترونية' : 'Electronic Wallet' }]} value={formData.paymentType} onChange={(v) => setFormData({ ...formData, paymentType: v as PaymentType })} placeholder={lang === 'ar' ? 'نوع الدفع' : 'Payment type'} showClear={false} isRtl={lang === 'ar'} disabled={isSubmitting} triggerClassName="w-full min-h-[48px] flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-bold focus:border-primary outline-none cursor-pointer text-start disabled:opacity-50 disabled:cursor-not-allowed pl-4 pr-10 rtl:pl-10 rtl:pr-4" />
              </div>
              {formData.paymentType === 'BANK_ACCOUNT' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500    px-1 block mb-1.5">{lang === 'ar' ? 'اسم البنك' : 'Bank name'}</label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder={t.paymentInfo.bankNamePlaceholder}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-bold focus:border-primary outline-none text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium"
                    disabled={isSubmitting}
                  />
                </div>
              )}
              {formData.paymentType === 'ELECTRONIC_WALLET' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500    px-1 block mb-1.5">{lang === 'ar' ? 'مزود المحفظة' : 'Wallet provider'}</label>
                  <input
                    type="text"
                    value={formData.walletProvider}
                    onChange={(e) => setFormData({ ...formData, walletProvider: e.target.value })}
                    placeholder={t.paymentInfo.walletProviderPlaceholder}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-bold focus:border-primary outline-none text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium"
                    disabled={isSubmitting}
                  />
                </div>
              )}
              <div>
                <label className="text-[11px] font-bold text-slate-500    px-1 block mb-1.5">{lang === 'ar' ? 'اسم صاحب الحساب' : 'Account holder name'}</label>
                <input
                  type="text"
                  value={formData.accountHolderName}
                  onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                  placeholder={t.paymentInfo.accountHolderPlaceholder}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-bold focus:border-primary outline-none text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium"
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="paymentActive"
                  className="rounded border-slate-200 text-primary focus:ring-primary size-4"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  disabled={isSubmitting}
                />
                <label htmlFor="paymentActive" className="text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                  {lang === 'ar' ? 'نشط (معروض للمستخدمين)' : 'Active (shown to users)'}
                </label>
              </div>
            </form>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all" disabled={isSubmitting}>
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="submit" form="paymentInfoForm" disabled={isSubmitting} className="flex-[2] py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                {isSubmitting ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (editingId ? (lang === 'ar' ? 'تحديث' : 'Update') : (lang === 'ar' ? 'إضافة' : 'Save'))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
          <div className="w-[90%] md:w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8">
            <div className="mx-auto size-16 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white text-center mb-2">{lang === 'ar' ? 'تأكيد الحذف' : 'Delete payment info?'}</h3>
            <p className="text-slate-500 text-sm text-center mb-6">{lang === 'ar' ? 'هل أنت متأكد من حذف هذه المعلومات؟' : 'This action cannot be undone.'}</p>
            <div className="flex gap-3">
              <button disabled={isDeleting} onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button disabled={isDeleting} onClick={handleDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                {isDeleting ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (lang === 'ar' ? 'حذف' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: FAB above bottom nav (same as Products/Categories) */}
      <div className="md:hidden fixed bottom-32 left-0 right-0 z-[130] pointer-events-none px-6">
        <div className={`max-w-[1200px] mx-auto flex justify-end pointer-events-auto ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={openCreate}
            className="size-12 rounded-full bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/30 flex items-center justify-center active:scale-95 transition-all border-2 border-white/20"
            aria-label={lang === 'ar' ? 'إضافة معلومات دفع' : 'Add Payment Info'}
          >
            <span className="material-symbols-outlined text-2xl">add</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentInfo;
