import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../App';
import { api } from '../../api';
import { APP_LOGO } from '../../constants';
import { Category, SubCategory } from '../../types';
import Dropdown from '../../components/Dropdown';

type Role = 'CUSTOMER_OWNER' | 'SUPPLIER_OWNER';

const InputGroup = ({ label, icon, lang, ...props }: any) => (
  <div className="relative group">
    <span className={`material-symbols-outlined absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-primary/40 group-focus-within:text-primary transition-colors text-xl`}>
      {icon}
    </span>
    <input 
      {...props}
      className={`w-full rounded-full border-0 bg-white dark:bg-slate-800 text-slate-900 dark:text-white h-12 text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium ${lang === 'ar' ? 'pr-12 pl-6 text-right' : 'pl-12 pr-6 text-left'} focus:ring-4 focus:ring-white/20 transition-all shadow-lg font-bold`}
    />
  </div>
);

const Register: React.FC = () => {
  const { lang, setLang, t, isDarkMode, toggleDarkMode } = useApp();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [fetchingData, setFetchingData] = useState(false);

  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [crnFile, setCrnFile] = useState<File | null>(null);
  const [crnPreview, setCrnPreview] = useState<string | null>(null);

  const profileInputRef = useRef<HTMLInputElement>(null);
  const crnInputRef = useRef<HTMLInputElement>(null);

  const [agreePolicy, setAgreePolicy] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragTranslate, setDragTranslate] = useState(0);
  const dragThreshold = 120;
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policies, setPolicies] = useState<{ acceptableUse: { ar: string[]; en: string[] }; privacy: { ar: string[]; en: string[] } } | null>(null);

  const [formData, setFormData] = useState({
    role: '' as Role,
    name: '', 
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    categoryId: '',
    subCategoryIds: [] as string[],
    organizationName: '',
    organizationCRN: '',
    profileImage: '',
    organizationCRNImage: ''
  });

  useEffect(() => {
    if (step === 3 && formData.role === 'SUPPLIER_OWNER') fetchCategories();
  }, [step, formData.role]);
  useEffect(() => {
    const fetchPolicies = async () => {
      setPolicyLoading(true);
      try {
        const resp = await api.get<any>('/api/v1/admin/policies');
        const data = resp?.data?.data || resp?.data || resp;
        const acceptableUse = {
          ar: Array.isArray(data?.acceptableUse?.ar) ? data.acceptableUse.ar : [],
          en: Array.isArray(data?.acceptableUse?.en) ? data.acceptableUse.en : [],
        };
        const privacy = {
          ar: Array.isArray(data?.privacy?.ar) ? data.privacy.ar : [],
          en: Array.isArray(data?.privacy?.en) ? data.privacy.en : [],
        };
        setPolicies({ acceptableUse, privacy });
      } catch {
        setPolicies(null);
      } finally {
        setPolicyLoading(false);
      }
    };
    fetchPolicies();
  }, []);

  const fetchCategories = async () => {
    setFetchingData(true);
    try {
      const data = await api.get<Category[]>('/api/v1/category/all');
      setCategories(data || []);
    } catch (err) {
      console.error("Categories fetch error");
    } finally {
      setFetchingData(false);
    }
  };

  const handleCategoryChange = async (catId: string) => {
    setFormData(prev => ({ ...prev, categoryId: catId, subCategoryIds: [] }));
    if (!catId) return;
    
    setFetchingData(true);
    try {
      const data = await api.get<SubCategory[]>(`/api/v1/category/sub-category?categoryId=${catId}`);
      setSubCategories(data || []);
    } catch (err) {
      console.error("Sub-categories fetch error");
    } finally {
      setFetchingData(false);
    }
  };

  const toggleSubCategory = (subId: string) => {
    setFormData(prev => {
      const exists = prev.subCategoryIds.includes(subId);
      return {
        ...prev,
        subCategoryIds: exists 
          ? prev.subCategoryIds.filter(id => id !== subId) 
          : [...prev.subCategoryIds, subId]
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'crn') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'profile') {
          setProfileFile(file);
          setProfilePreview(reader.result as string);
        } else {
          setCrnFile(file);
          setCrnPreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const uploadData = new FormData();
    uploadData.append('file', file);
    return await api.post<string>('/api/v1/image/upload', uploadData);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (formData.password !== formData.confirmPassword) {
        setError(lang === 'ar' ? 'كلمة المرور وتأكيدها غير متطابقين' : 'Password and confirm password do not match');
        return;
      }
      let profileUrl = '';
      let crnUrl = '';

      if (profileFile) profileUrl = await uploadImage(profileFile);
      if (crnFile) crnUrl = await uploadImage(crnFile);

      const payload = {
        ...formData,
        profileImage: profileUrl,
        organizationCRNImage: crnUrl,
        categoryId: formData.categoryId || null
      };

      await api.post('/api/v1/user/auth/register', payload);
      navigate('/login', { state: { registered: true } });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const isEmailValid = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isStepValid = () => {
    if (step === 1) return !!formData.role;
    if (step === 2) {
      return (
        formData.name.trim() !== '' &&
        isEmailValid(formData.email) &&
        formData.password.length >= 6 &&
        formData.password === formData.confirmPassword &&
        formData.phoneNumber.trim() !== ''
      );
    }
    if (step === 3) {
      const orgValid =
        formData.organizationName.trim() !== '' &&
        formData.organizationCRN.trim() !== '' &&
        !!crnPreview;
      if (formData.role === 'SUPPLIER_OWNER') {
        return !!formData.categoryId && orgValid && agreePolicy;
      }
      return orgValid && agreePolicy;
    }
    return false;
  };

  const handleNext = () => {
    if (!isStepValid()) return;
    if (step < 3) {
      setStep((step + 1) as any);
    } else {
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full min-h-[100dvh] flex flex-col md:flex-row bg-[#20a7b2] dark:bg-slate-950 transition-colors duration-500 overflow-hidden font-display relative">
      <style>{`
        @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-down { animation: slideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-up { opacity: 0; animation: fadeInUp 0.8s ease-out forwards; }
      `}</style>

      {/* Floating Auth Header */}
      <div className="fixed top-4 left-4 right-4 z-[200] flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto">
          <Link 
            to="/" 
            className="size-11 flex items-center justify-center bg-slate-900/40 backdrop-blur-md rounded-full text-white border border-white/30 shadow-2xl transition-all active:scale-90 hover:bg-slate-900/60"
          >
            <span className="material-symbols-outlined text-lg">home</span>
          </Link>
        </div>
        <div className="flex gap-2 pointer-events-auto">
          <button 
            onClick={toggleDarkMode}
            className="size-11 rounded-full bg-slate-900/40 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-2xl transition-all active:scale-90 hover:bg-slate-900/60"
          >
            <span className="material-symbols-outlined text-[20px]">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>
          <button 
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="size-11 flex items-center justify-center bg-slate-900/40 backdrop-blur-md rounded-full text-xs font-black text-white border border-white/30 shadow-2xl transition-all active:scale-90 hover:bg-slate-900/60 "
          >
            {lang === 'en' ? t.common.langSwitchAr : t.common.langSwitchEn}
          </button>
        </div>
      </div>

      {/* Left (mobile: top) - Image / Branding */}
      <div className={`flex-none h-[45vh] md:h-full md:w-1/2 md:min-h-screen bg-white dark:bg-slate-900 relative overflow-hidden shadow-2xl z-10 animate-slide-down md:animate-none md:animate-fade-up border-b-4 md:border-b-0 border-white/10 dark:border-primary/20 rounded-b-[4rem] md:rounded-none ${lang === 'ar' ? 'md:order-2 md:border-l-4' : 'md:order-1 md:border-r-4'}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            src={APP_LOGO} 
            className="w-full h-full min-w-full min-h-full object-cover object-center opacity-100 dark:invert dark:hue-rotate-180 dark:brightness-125 transition-all duration-700"
            alt="Hero"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#20a7b2]/40 dark:from-slate-950/20 via-transparent to-transparent"></div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
           {[1, 2, 3].map(s => (
             <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${step >= s ? 'w-8 bg-primary' : 'w-4 bg-slate-200 dark:bg-slate-700'}`}></div>
           ))}
        </div>
      </div>

      {/* Right (mobile: bottom) - Form */}
      <div className={`flex-1 flex flex-col justify-center px-8 sm:px-12 py-8 md:py-12 overflow-y-auto no-scrollbar animate-fade-up md:w-1/2 ${lang === 'ar' ? 'md:order-1' : 'md:order-2'}`} style={{ animationDelay: '0.4s' }}>
        <div className="max-w-md mx-auto w-full space-y-8">
          <div className="text-center">
             <h2 className="text-3xl font-black text-white ">
               {step === 1 ? t.registerExtra.step1Title : 
                step === 2 ? t.registerExtra.step2Title : 
                t.registerExtra.step3Title}
             </h2>
          </div>

          {error && <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/30 text-white text-xs font-bold text-center animate-in shake">{error}</div>}

          <div className="space-y-6">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-white/80 font-bold text-center text-sm">{t.register.roleTitle}</p>
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => setFormData({...formData, role: 'CUSTOMER_OWNER'})} className={`group flex items-center gap-4 p-5 rounded-3xl transition-all ${formData.role === 'CUSTOMER_OWNER' ? 'bg-white dark:bg-slate-800 shadow-2xl ring-4 ring-white/20 dark:ring-white/5' : 'bg-white/10 text-white hover:bg-white/20'}`}><div className={`size-12 rounded-2xl flex items-center justify-center transition-all ${formData.role === 'CUSTOMER_OWNER' ? 'bg-[#20a7b2] text-white shadow-md' : 'bg-white/20 text-white'}`}><span className="material-symbols-outlined text-2xl">shopping_basket</span></div><div className="text-left rtl:text-right"><p className={`font-black text-sm ${formData.role === 'CUSTOMER_OWNER' ? 'text-[#20a7b2] dark:text-primary' : 'text-white'}`}>{t.register.customer}</p><p className={`text-[10px] font-bold ${formData.role === 'CUSTOMER_OWNER' ? 'text-slate-400 dark:text-slate-500' : 'text-white/60'}`}>{t.register.customerDesc}</p></div></button>
                  <button onClick={() => setFormData({...formData, role: 'SUPPLIER_OWNER'})} className={`group flex items-center gap-4 p-5 rounded-3xl transition-all ${formData.role === 'SUPPLIER_OWNER' ? 'bg-white dark:bg-slate-800 shadow-2xl ring-4 ring-white/20 dark:ring-white/5' : 'bg-white/10 text-white hover:bg-white/20'}`}><div className={`size-12 rounded-2xl flex items-center justify-center transition-all ${formData.role === 'SUPPLIER_OWNER' ? 'bg-[#20a7b2] text-white shadow-md' : 'bg-white/20 text-white'}`}><span className="material-symbols-outlined text-2xl">factory</span></div><div className="text-left rtl:text-right"><p className={`font-black text-sm ${formData.role === 'SUPPLIER_OWNER' ? 'text-[#20a7b2] dark:text-primary' : 'text-white'}`}>{t.register.supplier}</p><p className={`text-[10px] font-bold ${formData.role === 'SUPPLIER_OWNER' ? 'text-slate-400 dark:text-slate-500' : 'text-white/60'}`}>{t.register.supplierDesc}</p></div></button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-500">
                <div className="flex flex-col items-center gap-3 mb-2">
                  <div className="relative group cursor-pointer" onClick={() => profileInputRef.current?.click()}><div className="size-24 rounded-full border-4 border-white/20 p-0.5 transition-all group-hover:border-white shadow-2xl overflow-hidden bg-white/10 flex items-center justify-center">{profilePreview ? <img src={profilePreview} className="size-full object-cover rounded-full" alt="Profile" /> : <span className="material-symbols-outlined text-4xl text-white/50">person_add</span>}</div><div className="absolute bottom-0 right-0 size-8 bg-white dark:bg-primary text-[#20a7b2] dark:text-white rounded-full flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-sm">photo_camera</span></div></div>
                  <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'profile')} />
                </div>
                <div className="space-y-4">
                  <InputGroup icon="person" type="text" lang={lang} value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} placeholder={t.registerExtra.fullNamePlaceholder} required />
                  <InputGroup icon="call" type="tel" lang={lang} value={formData.phoneNumber} onChange={(e: any) => setFormData({...formData, phoneNumber: e.target.value})} placeholder={t.register.phonePlaceholder} required />
                  <div className="space-y-1">
                    <InputGroup icon="mail" type="email" lang={lang} value={formData.email} onChange={(e: any) => setFormData({...formData, email: e.target.value})} placeholder={t.register.emailPlaceholder} required />
                    {formData.email.length > 0 && !isEmailValid(formData.email) && (
                      <p className="text-[10px] text-red-300 font-bold px-4 animate-in fade-in slide-in-from-top-1">
                        {t.registerExtra.invalidEmail}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <InputGroup icon="lock" type="password" lang={lang} value={formData.password} onChange={(e: any) => setFormData({...formData, password: e.target.value})} placeholder={t.register.passwordPlaceholder} required minLength={6} />
                    <p className="text-[10px] text-white/60 px-4">{t.registerExtra.passwordHint}</p>
                  </div>
                  <div className="space-y-1">
                    <InputGroup icon="lock_reset" type="password" lang={lang} value={formData.confirmPassword} onChange={(e: any) => setFormData({...formData, confirmPassword: e.target.value})} placeholder={lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'} required minLength={6} />
                    {formData.confirmPassword.length > 0 && formData.confirmPassword !== formData.password && (
                      <p className="text-[10px] text-red-300 font-bold px-4 animate-in fade-in slide-in-from-top-1">
                        {lang === 'ar' ? 'كلمة المرور غير متطابقة' : 'Passwords do not match'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-500 pb-4">
                <InputGroup icon="corporate_fare" type="text" lang={lang} value={formData.organizationName} onChange={(e: any) => setFormData({...formData, organizationName: e.target.value})} placeholder={t.register.orgNamePlaceholder} required />
                <InputGroup icon="badge" type="text" lang={lang} value={formData.organizationCRN} onChange={(e: any) => setFormData({...formData, organizationCRN: e.target.value})} placeholder={t.register.orgCRNPlaceholder} required />
                <div onClick={() => crnInputRef.current?.click()} className={`relative h-28 rounded-3xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center bg-white/10 dark:bg-slate-800/40 group ${crnPreview ? 'border-white' : 'border-white/30 hover:border-white'}`}>{crnPreview ? <img src={crnPreview} className="size-full object-contain p-2" alt="CRN" /> : <><span className="material-symbols-outlined text-2xl text-white/50 mb-1">cloud_upload</span><span className="text-[10px] font-black text-white/60  ">{t.register.orgCRNImage}</span></>}</div>
                <input type="file" ref={crnInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'crn')} />
                {formData.role === 'SUPPLIER_OWNER' && (
                  <>
                    <Dropdown options={categories.map(c => ({ value: c.id, label: lang === 'ar' ? (c.arabicName || '') : (c.name || '') }))} value={formData.categoryId} onChange={handleCategoryChange} placeholder={t.register.selectCategory} isRtl={lang === 'ar'} wrapperClassName="space-y-1" triggerClassName="w-full min-h-[48px] flex items-center justify-between gap-2 rounded-full border-0 bg-white dark:bg-slate-800 text-slate-900 dark:text-white pl-5 pr-12 rtl:pl-12 rtl:pr-5 font-bold text-[16px] md:text-sm shadow-lg focus:ring-4 focus:ring-white/20 transition-all cursor-pointer text-start" />
                    {formData.categoryId && subCategories.length > 0 && <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">{subCategories.map(s => <button key={s.id} type="button" onClick={() => toggleSubCategory(s.id)} className={`px-3 py-2 rounded-full border-0 text-[10px] font-black transition-all text-center leading-tight shadow-sm ${formData.subCategoryIds.includes(s.id) ? 'bg-white dark:bg-primary text-[#20a7b2] dark:text-white' : 'bg-white/10 dark:bg-white/5 text-white/70'}`}>{lang === 'ar' ? s.arabicName : s.name}</button>)}</div>}
                  </>
                )}
                <label className="flex items-start gap-3 bg-white/10 dark:bg-slate-800/40 rounded-2xl p-3 border border-white/20">
                  <input
                    type="checkbox"
                    checked={agreePolicy}
                    onChange={(e) => setAgreePolicy(e.target.checked)}
                    className="mt-1 size-4 rounded border-white/40 bg-transparent text-primary focus:ring-0"
                  />
                  <span className="text-[11px] font-bold text-white/80">
                    {lang === 'ar' ? 'أوافق على ' : 'I agree to the '}
                    <button type="button" onClick={() => setShowPolicy(true)} className="underline font-black text-white">
                      {lang === 'ar' ? 'سياسة الاستخدام والخصوصية' : 'Terms & Privacy Policy'}
                    </button>
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {step > 1 && <button onClick={() => setStep((step - 1) as any)} className="flex-1 h-14 rounded-full font-black text-xs text-white/80 bg-white/10 border border-white/20 transition-all active:scale-95">{t.register.back}</button>}
            <button onClick={handleNext} disabled={isLoading || !isStepValid()} className={`h-14 rounded-full font-black text-xs  text-[#20a7b2] dark:text-white bg-white dark:bg-primary shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-30 ${step === 1 ? 'w-full' : 'flex-[2]'}`}>
              {isLoading ? <div className="size-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div> : <>{step === 3 ? t.register.submit : t.register.next}<span className="material-symbols-outlined text-lg">arrow_forward</span></>}
            </button>
          </div>

          <div className="text-center"><p className="text-white/60 text-xs font-bold">{t.registerExtra.alreadyHaveAccount} <Link to="/login" className="text-white font-black hover:underline ml-2 ">{t.registerExtra.loginLink}</Link></p></div>
        </div>
      </div>
      {showPolicy && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm md:flex md:items-center md:justify-center">
          <style>{`
            @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            @keyframes sheetDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
          `}</style>
          <div 
            className="absolute inset-x-0 bottom-0 md:static md:w-[92%] md:max-w-3xl md:max-h-[80vh] overflow-hidden rounded-t-3xl md:rounded-3xl bg-white dark:bg-slate-900 border-t border-white/20 dark:border-slate-700 md:border md:shadow-2xl"
            style={{ transform: `translateY(${dragTranslate}px)`, animation: dragTranslate === 0 ? 'sheetUp 300ms cubic-bezier(0.16, 1, 0.3, 1)' : undefined }}
            onMouseDown={(e) => { setDragStartY(e.clientY); }}
            onMouseMove={(e) => { if (dragStartY !== null) { const dy = Math.max(0, e.clientY - dragStartY); setDragTranslate(dy); } }}
            onMouseUp={() => { if (dragTranslate > dragThreshold) { setShowPolicy(false); } setDragStartY(null); setDragTranslate(0); }}
            onTouchStart={(e) => { setDragStartY(e.touches[0].clientY); }}
            onTouchMove={(e) => { if (dragStartY !== null) { const dy = Math.max(0, e.touches[0].clientY - dragStartY); setDragTranslate(dy); } }}
            onTouchEnd={() => { if (dragTranslate > dragThreshold) { setShowPolicy(false); } setDragStartY(null); setDragTranslate(0); }}
          >
            <div className="md:hidden flex items-center justify-center py-2">
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
            </div>
            <div className="flex items-center justify-between px-4 pt-2 pb-4 md:p-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-[#20a7b2]/10 to-transparent">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {lang === 'ar' ? 'سياسة الاستخدام والخصوصية' : 'Terms of Use & Privacy Policy'}
              </h2>
              <button onClick={() => setShowPolicy(false)} className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto md:max-h-[70vh] space-y-6 text-sm leading-6 font-bold">
              <section className="rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/60 dark:bg-emerald-900/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">verified_user</span>
                  <h3 className="text-base font-black text-emerald-700 dark:text-emerald-300">
                    {lang === 'ar' ? 'الاستخدام المقبول' : 'Acceptable Use'}
                  </h3>
                </div>
                <div className="pl-1 space-y-1 text-slate-700 dark:text-slate-300">
                  {policyLoading ? (
                    <div className="text-[11px]">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
                  ) : (policies?.acceptableUse[(lang === 'ar') ? 'ar' : 'en']?.length
                      ? policies!.acceptableUse[(lang === 'ar') ? 'ar' : 'en'].map((item, idx) => <p key={idx}>{item}</p>)
                      : (
                        <>
                          <p>{lang === 'ar' ? 'عدم إساءة استخدام المنصة أو محاولة اختراقها.' : 'Do not misuse or attempt to compromise the platform.'}</p>
                          <p>{lang === 'ar' ? 'الالتزام بالقوانين المحلية والدولية.' : 'Comply with local and international laws.'}</p>
                          <p>{lang === 'ar' ? 'التقديم بمعلومات صحيحة ومحدثة.' : 'Provide accurate and up-to-date information.'}</p>
                        </>
                      )
                    )}
                </div>
              </section>
              <section className="rounded-2xl p-4 border border-sky-100 dark:border-sky-900/30 bg-sky-50/60 dark:bg-sky-900/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-sky-600 dark:text-sky-400">lock</span>
                  <h3 className="text-base font-black text-sky-700 dark:text-sky-300">
                    {lang === 'ar' ? 'الخصوصية والبيانات' : 'Privacy & Data'}
                  </h3>
                </div>
                <div className="pl-1 space-y-1 text-slate-700 dark:text-slate-300">
                  {policyLoading ? (
                    <div className="text-[11px]">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
                  ) : (policies?.privacy[(lang === 'ar') ? 'ar' : 'en']?.length
                      ? policies!.privacy[(lang === 'ar') ? 'ar' : 'en'].map((item, idx) => <p key={idx}>{item}</p>)
                      : (
                        <>
                          <p>{lang === 'ar' ? 'نستخدم بياناتك لتقديم الخدمات وحمايتها.' : 'We use your data to deliver and protect the services.'}</p>
                          <p>{lang === 'ar' ? 'لن نبيع بياناتك لطرف ثالث.' : 'We do not sell your data to third parties.'}</p>
                          <p>{lang === 'ar' ? 'يمكنك طلب حذف بياناتك وفقًا للقانون.' : 'You may request data deletion subject to applicable law.'}</p>
                        </>
                      )
                    )}
                </div>
              </section>
              <section className="rounded-2xl p-4 border border-amber-100 dark:border-amber-900/30 bg-amber-50/60 dark:bg-amber-900/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">update</span>
                  <h3 className="text-base font-black text-amber-700 dark:text-amber-300">
                    {lang === 'ar' ? 'التحديثات' : 'Updates'}
                  </h3>
                </div>
                <p className="text-slate-700 dark:text-slate-300">
                  {lang === 'ar'
                    ? 'قد نقوم بتحديث هذه السياسة من وقت لآخر. استمرارك في الاستخدام يعني الموافقة على أي تحديثات.'
                    : 'We may update this policy from time to time. Continued use constitutes acceptance of any updates.'}
                </p>
              </section>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-white dark:bg-slate-900">
              <button onClick={() => setShowPolicy(false)} className="px-5 h-10 rounded-xl bg-primary text-white text-xs font-black">
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
