
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { APP_LOGO, getPlanFeatureLabel } from '../../constants';
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
  const [subscriptionDetailsTooltipOpen, setSubscriptionDetailsTooltipOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

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

  useEffect(() => {
    const handleClickOutside = () => {
      setSubscriptionDetailsTooltipOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/'; 
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl pb-12 animate-in fade-in duration-500 font-display">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          <span className="material-symbols-outlined">{toast.type === 'success' ? 'verified' : 'error'}</span>
          <span className="text-sm font-black">{toast.message}</span>
        </div>
      )}

      {/* Hero Header Section */}
      <div className="bg-white dark:bg-slate-900 md:rounded-b-[2.5rem] shadow-sm overflow-hidden border-x border-b border-primary/10 dark:border-slate-800">
        <div className="h-48 md:h-72 bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 relative">
          <img 
             src={APP_LOGO} 
             className="w-full h-full object-cover opacity-50 grayscale dark:opacity-100 dark:grayscale-0 dark:invert dark:hue-rotate-180 dark:brightness-125 transition-all duration-700"
             alt="Banner"
          />
        </div>

        <div className="px-6 md:px-12 pb-8">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 md:-mt-20 relative z-10">
            <div className="relative group">
              <div className="size-32 md:size-44 rounded-full border-[6px] border-white dark:border-slate-900 shadow-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 ring-1 ring-primary/20">
                {imagePreview ? (
                  <img src={imagePreview} className="size-full object-cover" alt={profile?.name} />
                ) : (
                  <div className="size-full flex items-center justify-center text-3xl font-black bg-primary text-white">{profile?.name?.charAt(0)}</div>
                )}
              </div>
              {isEditing && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center text-white rounded-full transition-opacity opacity-0 group-hover:opacity-100"
                >
                  <span className="material-symbols-outlined text-2xl">add_a_photo</span>
                </button>
              )}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>

            <div className="flex-1 text-center md:text-left rtl:md:text-right pb-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-1">
                <h1 className="text-xl font-black text-primary dark:text-white leading-none">
                  {profile?.fullName || profile?.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black border border-primary/20">
                  <span className="material-symbols-outlined text-sm fill-1">verified</span>
                  {profile?.role && formatRole(profile.role)}
                </span>
              </div>
              <p className="text-slate-500 font-bold text-sm flex items-center justify-center md:justify-start gap-2">
                <span className="material-symbols-outlined text-primary text-base">alternate_email</span>
                {profile?.email}
              </p>
            </div>

            <div className="flex gap-3 pb-4">
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`px-8 py-3 rounded-2xl font-black text-xs transition-all active:scale-95 shadow-lg flex items-center gap-2 ${
                  isEditing ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-primary text-white shadow-primary/20'
                }`}
              >
                <span className="material-symbols-outlined text-base">{isEditing ? 'close' : 'edit'}</span>
                {isEditing ? t.team.cancel : t.profile.editProfile}
              </button>
            </div>
          </div>

          <div className="block lg:hidden mt-8 space-y-6 px-2">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border border-primary/10 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4">{t.profileExtra.intro}</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-lg">corporate_fare</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500">{t.profileExtra.organization}</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{profile?.organizationName || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-lg">badge</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500">{t.profileExtra.crnNumber}</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">{profile?.organizationCRN || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-lg">category</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500">{t.profileExtra.businessCategory}</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {profile?.category ? (lang === 'ar' ? profile.category.arabicName : profile.category.name) : '---'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-lg">call</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500">{t.profileExtra.contactPhone}</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">{profile?.phoneNumber || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-lg">translate</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500">{t.profileExtra.languagePref}</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{profile?.languagePreference || 'EN'}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border border-primary/10 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">{t.profileExtra.specializations}</h3>
                <span className="size-7 rounded-lg bg-primary/5 text-primary flex items-center justify-center font-black text-xs">
                  {profile?.subCategories?.length || 0}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile?.subCategories?.map(sub => (
                  <span key={sub.id} className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {lang === 'ar' ? sub.arabicName : sub.name}
                  </span>
                ))}
                {(!profile?.subCategories || profile.subCategories.length === 0) && (
                  <p className="text-xs text-slate-500 font-bold italic py-2">{t.profileExtra.noSpecificUnits}</p>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800 mt-8 mb-2"></div>
          
          <div className="flex gap-8 overflow-x-auto no-scrollbar">
            {[
              { id: 'overview', label: t.profileExtra.overview, icon: 'grid_view' },
              { id: 'documents', label: t.profileExtra.documents, icon: 'description' },
              // Show ads tab only for suppliers
              ...(userRole.includes('SUPPLIER') ? [{ id: 'ads', label: t.profileExtra.myAdsTab, icon: 'ads_click' }] : [])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 border-b-4 transition-all whitespace-nowrap text-xs font-black ${
                  activeTab === tab.id 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-slate-500 hover:text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 md:px-0">
        <div className="hidden lg:block lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-primary/10 dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-900 dark:text-white  mb-6   ">{t.profileExtra.intro}</h3>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                 <div className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary shrink-0">
                   <span className="material-symbols-outlined">corporate_fare</span>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-500 ">{t.profileExtra.organization}</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{profile?.organizationName || 'N/A'}</p>
                 </div>
              </div>

              <div className="flex items-start gap-4">
                 <div className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary shrink-0">
                   <span className="material-symbols-outlined">badge</span>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-500 ">{t.profileExtra.crnNumber}</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">{profile?.organizationCRN || 'N/A'}</p>
                 </div>
              </div>

              <div className="flex items-start gap-4">
                 <div className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary shrink-0">
                   <span className="material-symbols-outlined">category</span>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-500 ">{t.profileExtra.businessCategory}</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {profile?.category ? (lang === 'ar' ? profile.category.arabicName : profile.category.name) : '---'}
                    </p>
                 </div>
              </div>

              <div className="flex items-start gap-4">
                 <div className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary shrink-0">
                   <span className="material-symbols-outlined">call</span>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-500 ">{t.profileExtra.contactPhone}</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">{profile?.phoneNumber || 'N/A'}</p>
                 </div>
              </div>

              <div className="flex items-start gap-4">
                 <div className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary shrink-0">
                   <span className="material-symbols-outlined">translate</span>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-500 ">{t.profileExtra.languagePref}</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{profile?.languagePreference || 'EN'}</p>
                 </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-primary/10 dark:border-slate-800">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-slate-900 dark:text-white ">{t.profileExtra.specializations}</h3>
                <span className="size-8 rounded-lg bg-primary/5 text-primary flex items-center justify-center font-black text-xs">
                  {profile?.subCategories?.length || 0}
                </span>
             </div>
             <div className="flex flex-wrap gap-2">
                {profile?.subCategories?.map(sub => (
                   <span key={sub.id} className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">
                      {lang === 'ar' ? sub.arabicName : sub.name}
                   </span>
                ))}
                {(!profile?.subCategories || profile.subCategories.length === 0) && (
                  <p className="text-xs text-slate-500 font-bold italic py-2">{t.profileExtra.noSpecificUnits}</p>
                )}
             </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-7 space-y-8">
          
          {isEditing ? (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-primary/20 animate-in slide-in-from-top-4 duration-500">
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">{t.profile.editProfile}</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500  px-1">{t.profileExtra.username}</label>
                     <input 
                       type="text" value={formData.name} 
                       onChange={(e) => setFormData({...formData, name: e.target.value})} 
                       placeholder={t.profile.namePlaceholder}
                       className={`w-full bg-slate-50/50 dark:bg-slate-800/50 border-2 border-primary/10 rounded-2xl p-4 font-bold text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                       required
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500  px-1">{t.profileExtra.fullName}</label>
                     <input 
                       type="text" value={formData.fullName} 
                       onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
                       placeholder={t.profile.fullNamePlaceholder}
                       className={`w-full bg-slate-50/50 dark:bg-slate-800/50 border-2 border-primary/10 rounded-2xl p-4 font-bold text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                       required
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500  px-1">{t.profile.phone}</label>
                     <input 
                       type="tel" value={formData.phoneNumber} 
                       onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} 
                       placeholder={t.profile.phonePlaceholder}
                       className={`w-full bg-slate-50/50 dark:bg-slate-800/50 border-2 border-primary/10 rounded-2xl p-4 font-bold text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white tabular-nums ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                       required
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500  px-1">{t.profileExtra.languagePreference}</label>
                     <Dropdown options={[{ value: 'EN', label: 'English' }, { value: 'AR', label: 'Arabic' }]} value={formData.languagePreference} onChange={(v) => setFormData({...formData, languagePreference: v})} placeholder={t.profileExtra.languagePreference} isRtl={lang === 'ar'} triggerClassName="w-full min-h-[48px] flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/50 border-2 border-primary/10 rounded-2xl pl-4 pr-10 rtl:pl-10 rtl:pr-4 p-4 font-bold text-sm focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white cursor-pointer text-start" />
                   </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500  px-1">{t.profileExtra.businessCategoryLabel}</label>
                    <Dropdown options={allCategories.map(cat => ({ value: cat.id, label: lang === 'ar' ? (cat.arabicName || '') : (cat.name || '') }))} value={formData.categoryId} onChange={handleCategoryChange} placeholder={t.profileExtra.selectCategory} isRtl={lang === 'ar'} triggerClassName="w-full min-h-[48px] flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/50 border-2 border-primary/10 rounded-2xl pl-4 pr-10 rtl:pl-10 rtl:pr-4 p-4 font-bold text-sm focus:border-primary outline-none transition-all shadow-inner text-slate-900 dark:text-white cursor-pointer text-start" />
                 </div>

                 {formData.categoryId && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <label className="text-[10px] font-black text-slate-500  px-1">{t.profileExtra.subCategoriesLabel}</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 custom-scrollbar">
                        {availableSubCategories.map(sub => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => sub.id && toggleSubCategory(sub.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all text-xs font-black ${
                              sub.id && formData.subCategoryIds.includes(sub.id)
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:border-primary/30'
                            }`}
                          >
                            <span className="truncate mr-2">{lang === 'ar' ? sub.arabicName : sub.name}</span>
                            {sub.id && formData.subCategoryIds.includes(sub.id) && <span className="material-symbols-outlined text-sm">check_circle</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                 )}

                 <div className="space-y-4 pt-4">
                    <button 
                      type="submit" 
                      disabled={isSaving}
                      className="w-full py-5 bg-primary text-white rounded-2xl font-black text-sm  shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3   "
                    >
                      {isSaving ? (
                        <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">check_circle</span>
                          {t.profile.saveChanges}
                        </>
                      )}
                    </button>
                 </div>
              </form>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-primary/10 dark:border-slate-800">
                    <div className="flex items-center gap-4 mb-8">
                       <div className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg">
                          <span className="material-symbols-outlined text-xl">rocket_launch</span>
                       </div>
                       <div>
                          <h4 className="text-base font-black text-slate-900 dark:text-white leading-none">{t.profileExtra.accountEcosystem}</h4>
                          <p className="text-[10px] font-black text-slate-500 mt-1">{t.profileExtra.operationalSummary}</p>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                          <p className="text-[10px] font-black text-slate-500  mb-2">{t.profileExtra.accountStatus}</p>
                          <div className="flex items-center gap-2">
                             <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                             <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{t.profileExtra.activeVerified}</span>
                          </div>
                       </div>
                       <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                          <p className="text-[10px] font-black text-slate-500  mb-2">{t.profileExtra.systemUuid}</p>
                          <p className="text-sm font-bold text-slate-600 dark:text-slate-300 tabular-nums truncate">{profile?.id}</p>
                       </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 text-slate-900 dark:text-white relative overflow-hidden group shadow-xl border border-primary/10 dark:border-slate-800 animate-in fade-in duration-700">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                       <span className="material-symbols-outlined text-[80px]">workspace_premium</span>
                    </div>
                    <div className="relative z-10 space-y-8">
                       <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                         <div className="flex-1">
                            <p className="text-[10px] font-black text-primary  mb-2   ">{t.profileExtra.enterpriseLicensing}</p>
                            <h3 className="text-xl md:text-2xl font-black leading-tight">
                              {t.profileExtra.currentPlan} 
                              <span className="text-primary">{profile?.subscription?.planName || t.profileExtra.none}</span>
                            </h3>
                         </div>
                         <div className="flex gap-2 flex-wrap">
                           {!profile?.subscription ? (
                             <a href="#/subscription" className="bg-primary text-white px-8 py-3 rounded-2xl font-black text-[11px]  shadow-xl shadow-primary/20 active:scale-95 transition-all hover:bg-slate-900 dark:hover:bg-slate-800">
                               {t.profileExtra.upgradeNow}
                             </a>
                           ) : (
                             <div className="relative inline-block">
                               <button
                                 type="button"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setSubscriptionDetailsTooltipOpen(!subscriptionDetailsTooltipOpen);
                                 }}
                                 className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-primary hover:bg-primary/5 transition-all text-[11px] font-black"
                               >
                                 <span className="material-symbols-outlined text-primary text-lg">info</span>
                                 {lang === 'ar' ? 'تفاصيل الاشتراك الحالي' : 'Current Subscription Details'}
                                 <span className={`material-symbols-outlined text-base transition-transform duration-300 ${subscriptionDetailsTooltipOpen ? 'rotate-180' : ''}`}>expand_more</span>
                               </button>
                               {subscriptionDetailsTooltipOpen && (
                                 <div
                                   onClick={(e) => e.stopPropagation()}
                                   className={`absolute top-full mt-2 z-[60] w-full max-w-[calc(100vw-1.7rem)] sm:w-[320px] sm:max-w-[90vw] p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-primary/10 animate-in fade-in zoom-in-95 duration-200 ${lang === 'ar' ? 'right-0 sm:right-0' : 'left-0 sm:left-0'}`}
                                 >
                                   <div className="flex items-center gap-2 mb-3">
                                     <span className="material-symbols-outlined text-primary text-[20px]">info</span>
                                     <h3 className="text-sm font-black text-slate-700 dark:text-white">{lang === 'ar' ? 'تفاصيل الاشتراك الحالي' : 'Current Subscription Details'}</h3>
                                   </div>
                                   <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
                                     <div className="space-y-2 text-[11px]">
                                       <div className="flex justify-between items-start">
                                         <span className="font-black text-slate-500">{lang === 'ar' ? 'اسم الخطة:' : 'Plan Name:'}</span>
                                         <span className="font-bold text-slate-700 dark:text-slate-200 text-right">{profile.subscription.planName}</span>
                                       </div>
                                       <div className="flex justify-between items-start">
                                         <span className="font-black text-slate-500">{lang === 'ar' ? 'الحالة:' : 'Status:'}</span>
                                         <span className={`font-bold ${profile.subscription.status === 'APPROVED' ? 'text-emerald-600' : profile.subscription.status === 'PENDING' ? 'text-amber-600' : 'text-red-600'}`}>
                                           {profile.subscription.status === 'APPROVED' ? (lang === 'ar' ? 'مفعل' : 'Approved') : 
                                            profile.subscription.status === 'PENDING' ? (lang === 'ar' ? 'قيد المراجعة' : 'Pending') : 
                                            (lang === 'ar' ? 'مرفوض' : 'Rejected')}
                                         </span>
                                       </div>
                                       <div className="flex justify-between items-start">
                                         <span className="font-black text-slate-500">{lang === 'ar' ? 'عدد التراخيص:' : 'Allocated Seats:'}</span>
                                         <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{profile.subscription.numberOfUsers}</span>
                                       </div>
                                       <div className="flex justify-between items-start">
                                         <span className="font-black text-slate-500">{lang === 'ar' ? 'المستخدمين:' : 'Used:'}</span>
                                         <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{profile.subscription.usedUsers}</span>
                                       </div>
                                       <div className="flex justify-between items-start">
                                         <span className="font-black text-slate-500">{lang === 'ar' ? 'المتبقي:' : 'Remaining:'}</span>
                                         <span className="font-bold text-primary tabular-nums">{profile.subscription.remainingUsers}</span>
                                       </div>
                                       {profile.subscription.remainingSearches != null && (
                                         <div className="flex justify-between items-start">
                                           <span className="font-black text-slate-500">{lang === 'ar' ? 'عمليات البحث المتبقية:' : 'Remaining Searches:'}</span>
                                           <span className="font-bold text-primary tabular-nums">{profile.subscription.remainingSearches}</span>
                                         </div>
                                       )}
                                       {profile.subscription.numberOfSearchesPurchased != null && (
                                         <div className="flex justify-between items-start">
                                           <span className="font-black text-slate-500">{lang === 'ar' ? 'إجمالي عمليات البحث:' : 'Total Searches:'}</span>
                                           <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{profile.subscription.numberOfSearchesPurchased}</span>
                                         </div>
                                       )}
                                       {profile.subscription.pointsEarned != null && (
                                         <div className="flex justify-between items-start">
                                           <span className="font-black text-slate-500">{lang === 'ar' ? 'النقاط:' : 'Points:'}</span>
                                           <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{profile.subscription.pointsEarned}</span>
                                         </div>
                                       )}
                                       <div className="flex justify-between items-start">
                                         <span className="font-black text-slate-500">{lang === 'ar' ? 'المجموع:' : 'Total:'}</span>
                                         <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{profile.subscription.total.toLocaleString()} {t.plans.currency}</span>
                                       </div>
                                       {profile.subscription.discount > 0 && (
                                         <div className="flex justify-between items-start">
                                           <span className="font-black text-slate-500">{lang === 'ar' ? 'الخصم:' : 'Discount:'}</span>
                                           <span className="font-bold text-emerald-600 tabular-nums">-{profile.subscription.discount.toLocaleString()} {t.plans.currency}</span>
                                         </div>
                                       )}
                                       <div className="flex justify-between items-start">
                                         <span className="font-black text-slate-500">{lang === 'ar' ? 'السعر النهائي:' : 'Final Price:'}</span>
                                         <span className="font-bold text-primary tabular-nums">{profile.subscription.finalPrice.toLocaleString()} {t.plans.currency}</span>
                                       </div>
                                       {profile.subscription.selectedFeatures && profile.subscription.selectedFeatures.length > 0 && (
                                         <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                                           <p className="font-black text-slate-500 mb-2">{lang === 'ar' ? 'المميزات المختارة:' : 'Selected Features:'}</p>
                                           <div className="space-y-1">
                                             {profile.subscription.selectedFeatures.map((feat, idx) => (
                                               <div key={idx} className="flex items-center gap-1.5">
                                                 <span className="material-symbols-outlined text-[14px] text-emerald-500">check_circle</span>
                                                 <span className="font-bold text-slate-700 dark:text-slate-200 text-[10px]">{getPlanFeatureLabel(String(feat), lang === 'ar' ? 'ar' : 'en')}</span>
                                               </div>
                                             ))}
                                           </div>
                                         </div>
                                       )}
                                       <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1">
                                         <div className="flex justify-between items-start">
                                           <span className="font-black text-slate-500">{lang === 'ar' ? 'تاريخ التقديم:' : 'Submission Date:'}</span>
                                           <span className="font-bold text-slate-700 dark:text-slate-200 text-[10px]">{formatDate(profile.subscription.submissionDate)}</span>
                                         </div>
                                         <div className="flex justify-between items-start">
                                           <span className="font-black text-slate-500">{lang === 'ar' ? 'تاريخ التفعيل:' : 'Activation Date:'}</span>
                                           <span className="font-bold text-slate-700 dark:text-slate-200 text-[10px]">{formatDate(profile.subscription.subscriptionDate)}</span>
                                         </div>
                                         <div className="flex justify-between items-start">
                                           <span className="font-black text-slate-500">{lang === 'ar' ? 'تاريخ الانتهاء:' : 'Expiry Date:'}</span>
                                           <span className="font-bold text-primary text-[10px]">{formatDate(profile.subscription.expiryDate)}</span>
                                         </div>
                                       </div>
                                     </div>
                                   </div>
                                   <div className={`absolute -top-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-l border-t border-primary/10 rotate-45 ${lang === 'ar' ? 'right-6' : 'left-6'}`} />
                                 </div>
                               )}
                             </div>
                           )}
                         </div>
                       </div>
                       
                       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                          <div className="space-y-1">
                             <p className="text-[9px] font-black text-slate-500 ">{t.profileExtra.seats}</p>
                             <p className="text-sm font-black tabular-nums text-slate-700 dark:text-slate-200">{profile?.subscription?.numberOfUsers ?? '00'}</p>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[9px] font-black text-slate-500 ">{t.profileExtra.utilized}</p>
                             <p className="text-sm font-black tabular-nums text-slate-700 dark:text-slate-200">{profile?.subscription?.usedUsers ?? '00'}</p>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[9px] font-black text-slate-500 ">{t.profileExtra.available}</p>
                             <p className="text-sm font-black tabular-nums text-primary">{profile?.subscription?.remainingUsers ?? '00'}</p>
                          </div>
                          {profile?.subscription?.remainingSearches != null && (
                            <div className="space-y-1">
                               <p className="text-[9px] font-black text-slate-500 ">{t.profileExtra.remainingSearchesLabel}</p>
                               <p className="text-sm font-black tabular-nums text-primary">{profile.subscription.remainingSearches}</p>
                            </div>
                          )}
                          {profile?.subscription?.pointsEarned != null && (
                            <div className="space-y-1">
                               <p className="text-[9px] font-black text-slate-500 ">{t.profileExtra.pointsLabel}</p>
                               <p className="text-sm font-black tabular-nums text-slate-700 dark:text-slate-200">{profile.subscription.pointsEarned}</p>
                            </div>
                          )}
                       </div>
                    </div>
                  </div>

                  {/* Red Logout Button at the end of overview */}
                  <div className="pt-4">
                     <button 
                       onClick={handleLogout}
                       className="w-full flex items-center justify-center gap-3 py-5 rounded-[1.5rem] border-2 border-red-500/20 text-red-500 font-black text-sm  hover:bg-red-500 hover:text-white transition-all active:scale-[0.98] shadow-sm"
                     >
                       <span className="material-symbols-outlined">logout</span>
                       {t.nav.logout}
                     </button>
                  </div>
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-primary/10 dark:border-slate-800">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white  mb-8   ">{t.profileExtra.registrationCertificate}</h3>
                    
                    {profile?.organizationCRNImage ? (
                      <div 
                        onClick={() => setSelectedReceipt(profile.organizationCRNImage!)}
                        className="relative group cursor-pointer overflow-hidden rounded-3xl border-4 border-slate-50 dark:border-slate-800 shadow-xl"
                      >
                         <img src={profile.organizationCRNImage} alt="CRN Certificate" className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-105" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                           <div className="flex flex-col items-center gap-2">
                             <span className="material-symbols-outlined text-2xl">zoom_in</span>
                             <span className="text-[10px] font-black ">{t.profileExtra.previewDocument}</span>
                           </div>
                         </div>
                      </div>
                    ) : (
                      <div className="p-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                         <span className="material-symbols-outlined text-4xl text-slate-200 mb-4">document_scanner</span>
                         <p className="text-xs font-bold text-slate-500">{t.profileExtra.noCrnDocument}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'ads' && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-primary/10 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-sm font-black text-slate-900 dark:text-white   ">{t.ads.myAds}</h3>
                       <button 
                         onClick={openAddAd}
                         className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-black text-[10px] shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95"
                       >
                         <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
                         {t.ads.addNew}
                       </button>
                    </div>

                    {isAdsLoading ? (
                      <div className="py-20 flex justify-center">
                         <div className="size-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                      </div>
                    ) : myAds.length === 0 ? (
                      <div className="p-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                         <span className="material-symbols-outlined text-4xl text-slate-200 mb-4">campaign</span>
                         <p className="text-xs font-bold text-slate-500">{t.ads.empty}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {myAds.map((ad, idx) => (
                          <div 
                            key={ad.id} 
                            className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-primary/5 overflow-hidden flex flex-col group transition-all hover:shadow-xl hover:border-primary/20 animate-in zoom-in-95"
                            style={{ animationDelay: `${idx * 50}ms` }}
                          >
                             <div className="aspect-video relative overflow-hidden bg-slate-200 dark:bg-slate-900">
                                <img src={ad.image} className="size-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Ad" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                   <button onClick={() => openEditAd(ad)} className="size-10 rounded-xl bg-white text-slate-900 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"><span className="material-symbols-outlined">edit</span></button>
                                   <button onClick={() => setDeleteConfirmId(ad.id)} className="size-10 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"><span className="material-symbols-outlined">delete</span></button>
                                </div>
                             </div>
                             <div className="p-4 flex flex-col flex-1">
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">{ad.text}</p>
                             </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Ad Modal */}
      {isAdModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-500 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
                       <span className="material-symbols-outlined text-2xl">ads_click</span>
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">{editingAd ? t.ads.edit : t.ads.addNew}</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">{t.profileExtra.marketingTool}</p>
                    </div>
                 </div>
                 <button onClick={() => setIsAdModalOpen(false)} className="size-8 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0">
                   <span className="material-symbols-outlined text-xl">close</span>
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <form id="adFormProfile" onSubmit={handleAdSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                     <label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.ads.image}</label>
                     {!adImagePreview ? (
                        <div onClick={() => adFileInputRef.current?.click()} className="h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer border-slate-200 hover:border-primary bg-slate-50/50 dark:bg-slate-800/50">
                          <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">add_a_photo</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase">{lang === 'ar' ? 'اضغط لرفع الصورة' : 'Click to upload'}</span>
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
                    <label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.ads.text}</label>
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
                 <button type="submit" form="adFormProfile" disabled={isSaving} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
                   {isSaving ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>{t.profileExtra.saveAd}<span className="material-symbols-outlined">verified</span></>}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Ad Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
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
          className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setSelectedReceipt(null)}
        >
          <div className="relative max-w-4xl w-full flex flex-col items-center animate-in zoom-in-95 duration-500">
             <img src={selectedReceipt} alt="Payment Receipt" className="max-h-[85vh] rounded-[2.5rem] shadow-2xl border-4 border-white/20 object-contain" />
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
  );
};

export default Profile;
