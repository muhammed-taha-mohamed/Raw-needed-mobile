
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { APP_LOGO } from '../../constants';
import { UserSubscription, Category, SubCategory, Advertisement } from '../../types';
import Dropdown from '../../components/Dropdown';

interface ProfileData {
  id: string;
  name: string;
  fullName?: string;
  role: string;
  email: string;
  phoneNumber: string | null;
  category: { id: string; name: string; arabicName: string } | null;
  subCategories: { id: string; name: string; arabicName: string }[] | null;
  profileImage?: string;
  organizationName?: string;
  organizationCRN?: string;
  organizationCRNImage?: string;
  subscription?: UserSubscription | null;
  languagePreference?: string;
}

const Profile: React.FC = () => {
  const { lang, t } = useLanguage();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'ads'>('overview');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [availableSubCategories, setAvailableSubCategories] = useState<SubCategory[]>([]);
  const [fetchingOptions, setFetchingOptions] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Advertisements State
  const [myAds, setMyAds] = useState<Advertisement[]>([]);
  const [isAdsLoading, setIsAdsLoading] = useState(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [adFormData, setAdFormData] = useState({ text: '', image: '' });
  const [adSelectedFile, setAdSelectedFile] = useState<File | null>(null);
  const [adImagePreview, setAdImagePreview] = useState<string | null>(null);
  const adFileInputRef = useRef<HTMLInputElement>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [changePasswordForm, setChangePasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    fullName: '',
    phoneNumber: '',
    profileImage: '',
    languagePreference: 'EN',
    categoryId: '',
    subCategoryIds: [] as string[]
  });

  useEffect(() => {
    fetchProfile();
    // Get user role from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const parsed = JSON.parse(userStr);
      const role = (parsed.userInfo?.role || parsed.role || '').toUpperCase();
      setUserRole(role);
    }
  }, []);

  useEffect(() => {
    if (isEditing) {
      fetchCategoryOptions();
    }
  }, [isEditing]);

  useEffect(() => {
    // Only fetch ads if user is supplier and ads tab is active
    if (activeTab === 'ads' && userRole.includes('SUPPLIER')) {
      fetchMyAds();
    }
  }, [activeTab, userRole]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      const userId = userData?.userInfo?.id || userData?.id;
      if (!userId) throw new Error("Auth required");

      const data = await api.get<ProfileData>(`/api/v1/user/${userId}`);
      setProfile(data);
      setImagePreview(data.profileImage || null);
      
      const currentSubIds = data.subCategories?.map(s => s.id).filter((id): id is string => id !== null) || [];
      
      setFormData({
        name: data.name || '',
        fullName: data.fullName || data.name || '',
        phoneNumber: data.phoneNumber || '',
        profileImage: data.profileImage || '',
        languagePreference: data.languagePreference || 'EN',
        categoryId: data.category?.id || '',
        subCategoryIds: currentSubIds
      });

      if (data.category?.id) {
        fetchSubCategoryOptions(data.category.id);
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Sync error', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyAds = async () => {
    setIsAdsLoading(true);
    try {
      const data = await api.get<Advertisement[]>(`/api/v1/advertisements/my-advertisements`);
      setMyAds(data || []);
    } catch (err) {
      console.error("Ads fetch failed");
      setMyAds([]);
    } finally {
      setIsAdsLoading(false);
    }
  };

  const fetchCategoryOptions = async () => {
    setFetchingOptions(true);
    try {
      const cats = await api.get<Category[]>('/api/v1/category/all');
      setAllCategories(cats);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setFetchingOptions(false); 
    }
  };

  const fetchSubCategoryOptions = async (catId: string) => {
    try {
      const subs = await api.get<SubCategory[]>(`/api/v1/category/sub-category?categoryId=${catId}`);
      setAvailableSubCategories(subs || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCategoryChange = (catId: string) => {
    setFormData(prev => ({ ...prev, categoryId: catId, subCategoryIds: [] }));
    if (catId) {
      fetchSubCategoryOptions(catId);
    } else {
      setAvailableSubCategories([]);
    }
  };

  const toggleSubCategory = (subId: string) => {
    setFormData(prev => ({
      ...prev,
      subCategoryIds: prev.subCategoryIds.includes(subId)
        ? prev.subCategoryIds.filter(id => id !== subId)
        : [...prev.subCategoryIds, subId]
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let finalImageUrl = formData.profileImage;
      if (selectedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);
        finalImageUrl = await api.post<string>('/api/v1/image/upload', uploadFormData);
      }
      
      const userId = profile?.id;
      if (!userId) throw new Error("ID mismatch");

      const payload = { 
        ...formData, 
        profileImage: finalImageUrl,
        categoryId: formData.categoryId || null
      };

      await api.patch(`/api/v1/user/${userId}`, payload);
      setToast({ message: t.profile.successUpdate, type: 'success' });
      setIsEditing(false);
      await fetchProfile();
    } catch (err: any) {
      setToast({ message: err.message || 'Update failed', type: 'error' });
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleLogout = () => {
    api.post('/api/v1/user/auth/logout', {}).catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/'; 
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePasswordForm.oldPassword || !changePasswordForm.newPassword || !changePasswordForm.confirmNewPassword) {
      setToast({ message: lang === 'ar' ? 'يرجى استكمال كل حقول كلمة المرور' : 'Please fill all password fields', type: 'error' });
      return;
    }
    if (changePasswordForm.newPassword.length < 6) {
      setToast({ message: lang === 'ar' ? 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' : 'New password must be at least 6 characters', type: 'error' });
      return;
    }
    if (changePasswordForm.newPassword !== changePasswordForm.confirmNewPassword) {
      setToast({ message: lang === 'ar' ? 'كلمة المرور الجديدة وتأكيدها غير متطابقين' : 'New password and confirmation do not match', type: 'error' });
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/api/v1/user/auth/change-password', changePasswordForm);
      setToast({ message: lang === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully', type: 'success' });
      setChangePasswordForm({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err: any) {
      setToast({ message: err?.message || (lang === 'ar' ? 'فشل تغيير كلمة المرور' : 'Failed to change password'), type: 'error' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Advertisement Handlers
  const handleAdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAdSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAdImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const openAddAd = () => {
    setEditingAd(null);
    setAdSelectedFile(null);
    setAdImagePreview(null);
    setAdFormData({ text: '', image: '' });
    setIsAdModalOpen(true);
  };

  const openEditAd = (ad: Advertisement) => {
    setEditingAd(ad);
    setAdSelectedFile(null);
    setAdImagePreview(ad.image);
    setAdFormData({ text: ad.text, image: ad.image });
    setIsAdModalOpen(true);
  };

  const handleAdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let finalImageUrl = adFormData.image;
      if (adSelectedFile) {
        const uploadData = new FormData();
        uploadData.append('file', adSelectedFile);
        finalImageUrl = await api.post<string>('/api/v1/image/upload', uploadData);
      }

      const payload = { text: adFormData.text, image: finalImageUrl };

      if (editingAd) {
        await api.put(`/api/v1/advertisements/${editingAd.id}`, payload);
        setToast({ message: t.ads.successUpdate, type: 'success' });
      } else {
        await api.post('/api/v1/advertisements', payload);
        setToast({ message: t.ads.successAdd, type: 'success' });
      }
      
      setIsAdModalOpen(false);
      fetchMyAds();
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdDelete = async () => {
    if (!deleteConfirmId) return;
    setIsSaving(true);
    try {
      await api.delete(`/api/v1/advertisements/${deleteConfirmId}`);
      setToast({ message: t.ads.successDelete, type: 'success' });
      setDeleteConfirmId(null);
      fetchMyAds();
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const formatRole = (role: string) => {
    return role.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  const getSubscriptionStatusLabel = (status?: UserSubscription['status']) => {
    if (!status) return lang === 'ar' ? 'غير متاح' : 'N/A';
    if (status === 'APPROVED') return lang === 'ar' ? 'مفعلة' : 'Approved';
    if (status === 'PENDING') return lang === 'ar' ? 'قيد المراجعة' : 'Pending';
    return lang === 'ar' ? 'مرفوضة' : 'Rejected';
  };

  const isAdminRole = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  const isSupplierRole = userRole.includes('SUPPLIER');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-100 dark:bg-slate-950 py-4 md:py-6 animate-in fade-in duration-500 font-display">
      <div className="w-full px-3 md:px-4">
      {toast && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          <span className="material-symbols-outlined">{toast.type === 'success' ? 'verified' : 'error'}</span>
          <span className="text-sm font-black">{toast.message}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="h-44 md:h-64 bg-gradient-to-r from-[#bfe8ee] via-[#cdeef3] to-[#bfe8ee] dark:from-[#071235] dark:via-[#0a1a45] dark:to-[#071235] relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white,transparent_45%)] dark:opacity-25" />
          <div className="absolute inset-0 flex items-center justify-start px-6 md:px-14 pointer-events-none">
            <img src={APP_LOGO} alt="App Logo" className="h-28 md:h-44 lg:h-48 object-contain opacity-45 dark:hidden" />
            <img src={APP_LOGO} alt="App Logo Dark" className="hidden dark:block h-28 md:h-44 lg:h-48 object-contain brightness-125 contrast-110 saturate-75 opacity-95" />
          </div>
        </div>
        <div className="px-4 md:px-6 pb-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 -mt-14 md:-mt-16">
            <div className="order-3 md:order-1">
              <button
                onClick={() => setIsEditing((prev) => !prev)}
                className={`h-10 px-4 rounded-lg text-xs font-black transition-all active:scale-95 inline-flex items-center justify-center gap-2 ${
                  isEditing ? 'bg-red-500 text-white' : 'bg-primary text-white'
                }`}
              >
                <span className="material-symbols-outlined text-base">{isEditing ? 'close' : 'edit'}</span>
                {isEditing ? t.team.cancel : t.profile.editProfile}
              </button>
            </div>

            <div className="order-2 md:order-2 flex-1 text-center md:text-left rtl:md:text-right md:pb-2">
              <h1 className="text-xl md:text-[2rem] font-black text-slate-900 dark:text-white">{profile?.fullName || profile?.name}</h1>
              <div className="mt-2 flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black border border-primary/20">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  {profile?.role && formatRole(profile.role)}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{profile?.email}</span>
              </div>
            </div>

            <div className="relative group order-1 md:order-3 self-center md:self-auto">
              <div className="size-28 md:size-40 rounded-full border-4 border-white dark:border-slate-900 shadow-xl overflow-hidden bg-slate-200 dark:bg-slate-800 ring-2 ring-slate-200 dark:ring-slate-700">
                {imagePreview ? (
                  <img src={imagePreview} className="size-full object-cover" alt={profile?.name} />
                ) : (
                  <div className="size-full flex items-center justify-center text-2xl font-black bg-primary text-white">{profile?.name?.charAt(0)}</div>
                )}
              </div>
              {isEditing && (
                <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-2xl">add_a_photo</span>
                </button>
              )}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
          </div>
        </div>

        {!isEditing && (
          <div className="px-4 md:px-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2 py-2">
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {[{ id: 'overview', label: t.profileExtra.overview, icon: 'person' },
                  ...(!isAdminRole ? [{ id: 'documents', label: t.profileExtra.documents, icon: 'description' }] : []),
                  ...(!isAdminRole && isSupplierRole ? [{ id: 'ads', label: t.profileExtra.myAdsTab, icon: 'ads_click' }] : [])].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`h-10 px-4 rounded-lg text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      activeTab === tab.id ? 'bg-primary/10 text-primary dark:bg-slate-800 dark:text-primary' : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleLogout}
                className="h-9 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-black inline-flex items-center gap-1.5 shrink-0"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                {t.nav.logout}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        {isEditing ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-6">{t.profile.editProfile}</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder={t.profile.namePlaceholder} className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-white ${lang === 'ar' ? 'text-right' : 'text-left'}`} required />
                <input type="text" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} placeholder={t.profile.fullNamePlaceholder} className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-white ${lang === 'ar' ? 'text-right' : 'text-left'}`} required />
                <input type="tel" value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} placeholder={t.profile.phonePlaceholder} className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-white ${lang === 'ar' ? 'text-right' : 'text-left'}`} required />
                <Dropdown options={[{ value: 'EN', label: 'English' }, { value: 'AR', label: 'Arabic' }]} value={formData.languagePreference} onChange={(v) => setFormData({...formData, languagePreference: v})} placeholder={t.profileExtra.languagePreference} isRtl={lang === 'ar'} triggerClassName="w-full min-h-[46px] border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white text-start" />
              </div>

              {!isAdminRole && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500">{t.profileExtra.businessCategoryLabel}</label>
                    <Dropdown options={allCategories.map(cat => ({ value: cat.id, label: lang === 'ar' ? (cat.arabicName || '') : (cat.name || '') }))} value={formData.categoryId} onChange={handleCategoryChange} placeholder={t.profileExtra.selectCategory} isRtl={lang === 'ar'} triggerClassName="w-full min-h-[46px] border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white text-start" />
                  </div>
                  {formData.categoryId && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableSubCategories.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => sub.id && toggleSubCategory(sub.id)}
                          className={`p-2.5 rounded-lg border text-xs font-black text-start ${
                            sub.id && formData.subCategoryIds.includes(sub.id)
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {lang === 'ar' ? sub.arabicName : sub.name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              <button type="submit" disabled={isSaving} className="w-full h-11 rounded-lg bg-primary text-white text-sm font-black transition-all active:scale-95 disabled:opacity-50">
                {isSaving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t.profile.saveChanges}
              </button>
            </form>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className={`animate-in fade-in duration-300 ${isAdminRole ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-12 gap-4'}`}>
                {!isAdminRole && (
                  <div className="lg:col-span-4 space-y-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white mb-3">{lang === 'ar' ? 'المقدمة' : 'Intro'}</h3>
                      <div className="space-y-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2"><span className="material-symbols-outlined text-base">corporate_fare</span><span>{profile?.organizationName || '-'}</span></div>
                        <div className="flex items-center gap-2"><span className="material-symbols-outlined text-base">badge</span><span>{profile?.organizationCRN || '-'}</span></div>
                        <div className="flex items-center gap-2"><span className="material-symbols-outlined text-base">category</span><span>{profile?.category ? (lang === 'ar' ? profile.category.arabicName : profile.category.name) : '-'}</span></div>
                        <div className="flex items-center gap-2"><span className="material-symbols-outlined text-base">workspace_premium</span><span>{profile?.subscription?.planName || (lang === 'ar' ? 'لا توجد باقة' : 'No Plan')}</span></div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white mb-3">{t.profileExtra.specializations}</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile?.subCategories?.map((sub) => (
                          <span key={sub.id} className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {lang === 'ar' ? sub.arabicName : sub.name}
                          </span>
                        ))}
                        {(!profile?.subCategories || profile.subCategories.length === 0) && (
                          <span className="text-xs text-slate-500 font-bold">{t.profileExtra.noSpecificUnits}</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">{lang === 'ar' ? 'الباقة' : 'Plan'}</h3>
                        <span className="material-symbols-outlined text-primary text-base">workspace_premium</span>
                      </div>
                      {profile?.subscription ? (
                        <div className="space-y-2">
                          <div className="text-xs font-black text-slate-700 dark:text-slate-200">{profile.subscription.planName}</div>
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'الحالة:' : 'Status:'} {getSubscriptionStatusLabel(profile.subscription.status)}</div>
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {lang === 'ar' ? 'تنتهي في:' : 'Expires:'} {profile.subscription.expiryDate ? new Date(profile.subscription.expiryDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB') : '-'}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'لا توجد باقة مفعلة حالياً' : 'No active plan yet'}</p>
                          <button
                            onClick={() => { window.location.hash = '#/subscription'; }}
                            className="h-8 px-3 rounded-lg bg-primary text-white text-[11px] font-black inline-flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-sm">upgrade</span>
                            {lang === 'ar' ? 'اختيار باقة' : 'Choose Plan'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className={isAdminRole ? 'space-y-4' : 'lg:col-span-8 space-y-4'}>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4">
                      {lang === 'ar' ? 'بيانات الحساب' : 'Account Information'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-[10px] font-black text-slate-500">{lang === 'ar' ? 'الاسم' : 'Name'}</p><p className="text-sm font-bold text-slate-800 dark:text-slate-100">{profile?.fullName || profile?.name || '-'}</p></div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-[10px] font-black text-slate-500">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</p><p className="text-sm font-bold text-slate-800 dark:text-slate-100 break-all">{profile?.email || '-'}</p></div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-[10px] font-black text-slate-500">{lang === 'ar' ? 'الهاتف' : 'Phone'}</p><p className="text-sm font-bold text-slate-800 dark:text-slate-100">{profile?.phoneNumber || '-'}</p></div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-[10px] font-black text-slate-500">{lang === 'ar' ? 'الدور' : 'Role'}</p><p className="text-sm font-bold text-slate-800 dark:text-slate-100">{profile?.role ? formatRole(profile.role) : '-'}</p></div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-[10px] font-black text-slate-500">{lang === 'ar' ? 'اللغة' : 'Language'}</p><p className="text-sm font-bold text-slate-800 dark:text-slate-100">{profile?.languagePreference || 'EN'}</p></div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-[10px] font-black text-slate-500">{lang === 'ar' ? 'معرّف النظام' : 'System ID'}</p><p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{profile?.id || '-'}</p></div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4">
                      {lang === 'ar' ? 'تعديل كلمة المرور' : 'Change Password'}
                    </h3>
                    <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input type="password" value={changePasswordForm.oldPassword} onChange={(e) => setChangePasswordForm((prev) => ({ ...prev, oldPassword: e.target.value }))} placeholder={lang === 'ar' ? 'كلمة المرور الحالية' : 'Old Password'} className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold ${lang === 'ar' ? 'text-right' : 'text-left'}`} />
                      <input type="password" value={changePasswordForm.newPassword} onChange={(e) => setChangePasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))} placeholder={lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'} className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold ${lang === 'ar' ? 'text-right' : 'text-left'}`} />
                      <input type="password" value={changePasswordForm.confirmNewPassword} onChange={(e) => setChangePasswordForm((prev) => ({ ...prev, confirmNewPassword: e.target.value }))} placeholder={lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'} className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold ${lang === 'ar' ? 'text-right' : 'text-left'}`} />
                      <div className="md:col-span-3">
                        <button type="submit" disabled={isChangingPassword} className="w-full md:w-auto px-8 h-10 rounded-lg bg-primary text-white text-xs font-black transition-all active:scale-95 disabled:opacity-50">
                          {isChangingPassword ? (lang === 'ar' ? 'جارٍ التحديث...' : 'Updating...') : (lang === 'ar' ? 'تحديث كلمة المرور' : 'Update Password')}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {!isAdminRole && activeTab === 'documents' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 dark:text-white mb-5">{t.profileExtra.registrationCertificate}</h3>
                {profile?.organizationCRNImage ? (
                  <div onClick={() => setSelectedReceipt(profile.organizationCRNImage!)} className="cursor-pointer rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={profile.organizationCRNImage} alt="CRN Certificate" className="w-full h-auto object-contain" />
                  </div>
                ) : (
                  <div className="p-16 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-slate-500 text-sm font-bold">
                    {t.profileExtra.noCrnDocument}
                  </div>
                )}
              </div>
            )}

            {!isAdminRole && activeTab === 'ads' && isSupplierRole && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">{t.ads.myAds}</h3>
                  <button onClick={openAddAd} className="h-9 px-4 rounded-lg bg-primary text-white text-xs font-black inline-flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">add</span>
                    {t.ads.addNew}
                  </button>
                </div>
                {isAdsLoading ? (
                  <div className="py-16 flex justify-center"><div className="size-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
                ) : myAds.length === 0 ? (
                  <div className="p-14 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-slate-500 text-sm font-bold">{t.ads.empty}</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {myAds.map((ad) => (
                      <div key={ad.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/50">
                        <img src={ad.image} className="w-full aspect-video object-cover" alt="Ad" />
                        <div className="p-3">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-2">{ad.text}</p>
                          <div className="mt-3 flex gap-2">
                            <button onClick={() => openEditAd(ad)} className="flex-1 h-8 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-black text-slate-600 dark:text-slate-300">{lang === 'ar' ? 'تعديل' : 'Edit'}</button>
                            <button onClick={() => setDeleteConfirmId(ad.id)} className="flex-1 h-8 rounded-lg border border-red-300 text-xs font-black text-red-600">{lang === 'ar' ? 'حذف' : 'Delete'}</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Ad Modal */}
      {isAdModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full md:w-[90%] md:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-xl shadow-2xl border-t border-x md:border border-primary/20 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
             
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
                   setIsAdModalOpen(false);
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
                       <span className="material-symbols-outlined text-2xl">ads_click</span>
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">{editingAd ? t.ads.edit : t.ads.addNew}</h3>
                       <p className="text-[10px] font-black text-slate-400 mt-2">{t.profileExtra.marketingTool}</p>
                    </div>
                 </div>
                 <button onClick={() => setIsAdModalOpen(false)} className="size-8 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0">
                   <span className="material-symbols-outlined text-xl">close</span>
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <form id="adFormProfile" onSubmit={handleAdSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                     <label className="text-[11px] font-black text-slate-500 px-1">{t.ads.image}</label>
                     {!adImagePreview ? (
                        <div onClick={() => adFileInputRef.current?.click()} className="h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer border-slate-200 hover:border-primary bg-slate-50/50 dark:bg-slate-800/50">
                          <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">add_a_photo</span>
                          <span className="text-[9px] font-black text-slate-400">{t.common.clickToUpload}</span>
                        </div>
                     ) : (
                        <div className="relative h-40 rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 group">
                          <img src={adImagePreview} className="size-full object-cover" alt="" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button type="button" onClick={() => adFileInputRef.current?.click()} className="size-10 bg-white text-primary rounded-full shadow-lg flex items-center justify-center"><span className="material-symbols-outlined">edit</span></button>
                            <button type="button" onClick={() => { setAdSelectedFile(null); setAdImagePreview(null); setAdFormData({ ...adFormData, image: '' }); }} className="size-10 bg-red-500 text-white rounded-full shadow-lg flex items-center justify-center"><span className="material-symbols-outlined">delete</span></button>
                          </div>
                        </div>
                     )}
                     <input type="file" ref={adFileInputRef} className="hidden" accept="image/*" onChange={handleAdFileChange} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 px-1">{t.ads.text}</label>
                    <textarea
                      required
                      value={adFormData.text}
                      onChange={(e) => setAdFormData({ ...adFormData, text: e.target.value })}
                      placeholder={t.profileExtra.describeOffer}
                      className={`w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:border-primary outline-none transition-all shadow-inner min-h-[100px] text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                    />
                  </div>
                </form>
              </div>

              <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0 flex gap-3">
                 <button type="button" onClick={() => setIsAdModalOpen(false)} className="flex-1 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">{t.team.cancel}</button>
                 <button type="submit" form="adFormProfile" disabled={isSaving} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
                   {isSaving ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>{t.profileExtra.saveAd}<span className="material-symbols-outlined">verified</span></>}
                 </button>
              </div>
              
           </div>
        </div>
      )}

      {/* Ad Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[500] flex items-end md:items-center justify-center bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full md:w-[90%] md:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-xl shadow-2xl border-t border-x md:border border-primary/20 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300">
            
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
            
            <div className="p-10 text-center">
              <div className="mx-auto size-16 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mb-6 ring-8 ring-red-50/50">
                <span className="material-symbols-outlined text-3xl">warning</span>
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">{t.profileExtra.deleteAdConfirm}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed font-bold">{t.ads.deleteConfirm}</p>
              <div className="flex gap-4">
                <button disabled={isSaving} onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3.5 text-[11px] font-black text-slate-500 hover:bg-slate-50 rounded-xl transition-all border border-slate-100   ">{t.profileExtra.cancel}</button>
                <button disabled={isSaving} onClick={handleAdDelete} className="flex-1.5 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-lg active:scale-95 transition-all text-[11px]    flex items-center justify-center gap-2">
                  {isSaving ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><span className="material-symbols-outlined text-base">delete_forever</span> {t.profileExtra.confirmDelete}</>}
                </button>
              </div>
              
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {selectedReceipt && (
        <div 
          className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setSelectedReceipt(null)}
        >
          <div className="relative max-w-4xl w-full flex flex-col items-center animate-in zoom-in-95 duration-500">
             <img src={selectedReceipt} alt="Payment Receipt" className="max-h-[85vh] rounded-xl shadow-2xl border-4 border-white/20 object-contain" />
             <div className="mt-6 flex gap-4">
                <button 
                  onClick={() => setSelectedReceipt(null)}
                  className="px-10 py-3.5 bg-white text-slate-900 rounded-xl font-black text-[10px] flex items-center gap-2 shadow-xl hover:scale-105 transition-transform"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                  {t.profileExtra.closeViewer}
                </button>
             </div>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 154, 167, 0.2); border-radius: 10px; }
      `}</style>
      </div>
    </div>
  );
};

export default Profile;
