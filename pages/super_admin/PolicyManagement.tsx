import React, { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { useToast } from '../../contexts/ToastContext';
import FloatingLabelInput from '../../components/FloatingLabelInput';
import { MODAL_OVERLAY_BASE_CLASS, MODAL_PANEL_BASE_CLASS } from '../../components/modalTheme';

type LangLists = { ar: string[]; en: string[] };
type PolicyData = { acceptableUse: LangLists; privacy: LangLists };

// Moving sub-component OUTSIDE the main component to fix the focus loss issue
const PolicyItem = React.memo(({ 
  item, 
  onRemove, 
  isRtl 
}: { 
  item: string; 
  onRemove: () => void; 
  isRtl?: boolean 
}) => (
  <div 
    className="group/item flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/30 hover:shadow-sm transition-all animate-in fade-in slide-in-from-bottom-1 duration-200"
  >
    <p className={`text-sm font-bold text-slate-700 dark:text-slate-300 flex-1 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {item}
    </p>
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      className="size-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-all opacity-0 group-hover/item:opacity-100"
    >
      <span className="material-symbols-outlined text-sm">close</span>
    </button>
  </div>
));

const PolicyManagement: React.FC = () => {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  
  const [policy, setPolicy] = useState<PolicyData>({
    acceptableUse: { ar: [], en: [] },
    privacy: { ar: [], en: [] },
  });

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeSection, setActiveSection] = useState<'acceptableUse' | 'privacy' | null>(null);
  const [newItem, setNewItem] = useState({ ar: '', en: '' });

  const getData = (resp: any) => resp?.data?.data || resp?.data || resp;

  useEffect(() => {
    const fetchPolicies = async () => {
      setIsLoading(true);
      try {
        const resp = await api.get<any>('/api/v1/admin/policies');
        const data = getData(resp);
        const normalized: PolicyData = {
          acceptableUse: {
            ar: Array.isArray(data?.acceptableUse?.ar) ? data.acceptableUse.ar : [],
            en: Array.isArray(data?.acceptableUse?.en) ? data.acceptableUse.en : [],
          },
          privacy: {
            ar: Array.isArray(data?.privacy?.ar) ? data.privacy.ar : [],
            en: Array.isArray(data?.privacy?.en) ? data.privacy.en : [],
          },
        };
        setPolicy(normalized);
      } catch (err: any) {
        showToast(err?.message || (lang === 'ar' ? 'فشل تحميل السياسات' : 'Failed to load policies'), 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPolicies();
  }, [lang, showToast]);

  const openModal = (section: 'acceptableUse' | 'privacy') => {
    setActiveSection(section);
    setNewItem({ ar: '', en: '' });
    setShowAddModal(true);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSection) return;
    
    const arVal = newItem.ar.trim();
    const enVal = newItem.en.trim();
    
    if (!arVal && !enVal) return;

    setPolicy(prev => {
      const updated = { ...prev };
      if (arVal) updated[activeSection].ar = [...updated[activeSection].ar, arVal];
      if (enVal) updated[activeSection].en = [...updated[activeSection].en, enVal];
      return updated;
    });
    
    setShowAddModal(false);
    setActiveSection(null);
    setNewItem({ ar: '', en: '' });
  };

  const removeItem = useCallback((section: 'acceptableUse' | 'privacy', locale: 'ar' | 'en', idx: number) => {
    setPolicy(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [locale]: prev[section][locale].filter((_, i) => i !== idx),
      },
    }));
  }, []);

  const save = async () => {
    setIsSaving(true);
    try {
      await api.put('/api/v1/admin/policies', policy);
      showToast(lang === 'ar' ? 'تم حفظ السياسات بنجاح' : 'Policies saved successfully', 'success');
    } catch (err: any) {
      showToast(err?.message || (lang === 'ar' ? 'فشل حفظ السياسات' : 'Failed to save policies'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="w-full py-6 pb-24 md:pb-6 relative font-display animate-in fade-in slide-in-from-bottom-4 duration-700">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="size-12 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-bold text-sm">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto space-y-6 px-4 md:px-0">
          {/* Main Card */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
            
            {/* Elegant Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 px-8 py-10 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <span className="material-symbols-outlined text-[120px] rotate-12">gavel</span>
              </div>
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest border border-white/10">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {lang === 'ar' ? 'لوحة التحكم' : 'Admin Panel'}
                  </div>
                  <h2 className="text-3xl font-black tracking-tight">
                    {lang === 'ar' ? 'إدارة السياسات' : 'Policy Management'}
                  </h2>
                  <p className="text-white/70 font-bold text-sm max-w-md">
                    {lang === 'ar' 
                      ? 'قم بتعديل وتحديث سياسات الاستخدام والخصوصية لضمان حماية حقوق المستخدمين والمنصة.' 
                      : 'Modify and update usage and privacy policies to ensure the protection of users and platform rights.'}
                  </p>
                </div>
                
                <button
                  onClick={save}
                  disabled={isSaving}
                  className="group relative h-14 px-8 bg-white text-primary rounded-2xl font-black text-sm shadow-xl shadow-black/10 hover:shadow-white/20 transition-all active:scale-95 disabled:opacity-50 overflow-hidden shrink-0"
                >
                  <div className="relative z-10 flex items-center justify-center gap-3">
                    {isSaving ? (
                      <div className="size-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-xl transition-transform group-hover:rotate-12">save</span>
                        {lang === 'ar' ? 'حفظ كافة التغييرات' : 'Save All Changes'}
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Sections Container */}
            <div className="p-8 space-y-8">
              
              {/* Acceptable Use Section */}
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleSection('acceptableUse')}>
                    <div className={`size-12 rounded-2xl flex items-center justify-center transition-all ${expandedSections.includes('acceptableUse') ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      <span className="material-symbols-outlined">verified_user</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">
                        {lang === 'ar' ? 'سياسة الاستخدام المقبول' : 'Acceptable Use Policy'}
                      </h3>
                      <p className="text-xs font-bold text-slate-400">
                        {lang === 'ar' ? 'القواعد العامة لاستخدام المنصة' : 'General rules for using the platform'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => openModal('acceptableUse')}
                      className="flex items-center gap-2 bg-primary/10 dark:bg-primary/20 text-primary px-4 py-2 rounded-xl border border-primary/20 hover:bg-primary hover:text-white transition-all font-black text-xs"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      {lang === 'ar' ? 'إضافة بند' : 'Add Item'}
                    </button>
                    <div 
                      onClick={() => toggleSection('acceptableUse')}
                      className={`size-10 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 transition-all ${expandedSections.includes('acceptableUse') ? 'rotate-180' : ''}`}
                    >
                      <span className="material-symbols-outlined">expand_more</span>
                    </div>
                  </div>
                </div>

                {expandedSections.includes('acceptableUse') && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Arabic Column */}
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-primary uppercase tracking-widest">{lang === 'ar' ? 'البنود بالعربية' : 'Arabic Items'}</h4>
                        <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-500">{policy.acceptableUse.ar.length} {lang === 'ar' ? 'بند' : 'items'}</span>
                      </div>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {policy.acceptableUse.ar.length > 0 ? (
                          policy.acceptableUse.ar.map((item, idx) => (
                            <PolicyItem key={`au-ar-${idx}`} item={item} isRtl onRemove={() => removeItem('acceptableUse', 'ar', idx)} />
                          ))
                        ) : (
                          <div className="text-center py-8 opacity-40 grayscale flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-4xl">inventory_2</span>
                            <p className="text-xs font-bold">{lang === 'ar' ? 'لا توجد بنود' : 'No items yet'}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* English Column */}
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-primary uppercase tracking-widest">{lang === 'ar' ? 'البنود بالإنجليزية' : 'English Items'}</h4>
                        <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-500">{policy.acceptableUse.en.length} {lang === 'ar' ? 'items' : 'items'}</span>
                      </div>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {policy.acceptableUse.en.length > 0 ? (
                          policy.acceptableUse.en.map((item, idx) => (
                            <PolicyItem key={`au-en-${idx}`} item={item} onRemove={() => removeItem('acceptableUse', 'en', idx)} />
                          ))
                        ) : (
                          <div className="text-center py-8 opacity-40 grayscale flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-4xl">inventory_2</span>
                            <p className="text-xs font-bold">{lang === 'ar' ? 'No items yet' : 'No items yet'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

              {/* Privacy Policy Section */}
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleSection('privacy')}>
                    <div className={`size-12 rounded-2xl flex items-center justify-center transition-all ${expandedSections.includes('privacy') ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      <span className="material-symbols-outlined">security</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">
                        {lang === 'ar' ? 'سياسة الخصوصية والبيانات' : 'Privacy & Data Policy'}
                      </h3>
                      <p className="text-xs font-bold text-slate-400">
                        {lang === 'ar' ? 'كيفية التعامل مع بيانات المستخدمين' : 'How user data is handled'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => openModal('privacy')}
                      className="flex items-center gap-2 bg-primary/10 dark:bg-primary/20 text-primary px-4 py-2 rounded-xl border border-primary/20 hover:bg-primary hover:text-white transition-all font-black text-xs"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      {lang === 'ar' ? 'إضافة بند' : 'Add Item'}
                    </button>
                    <div 
                      onClick={() => toggleSection('privacy')}
                      className={`size-10 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 transition-all ${expandedSections.includes('privacy') ? 'rotate-180' : ''}`}
                    >
                      <span className="material-symbols-outlined">expand_more</span>
                    </div>
                  </div>
                </div>

                {expandedSections.includes('privacy') && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Arabic Column */}
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-primary uppercase tracking-widest">{lang === 'ar' ? 'البنود بالعربية' : 'Arabic Items'}</h4>
                        <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-500">{policy.privacy.ar.length} {lang === 'ar' ? 'بند' : 'items'}</span>
                      </div>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {policy.privacy.ar.length > 0 ? (
                          policy.privacy.ar.map((item, idx) => (
                            <PolicyItem key={`pr-ar-${idx}`} item={item} isRtl onRemove={() => removeItem('privacy', 'ar', idx)} />
                          ))
                        ) : (
                          <div className="text-center py-8 opacity-40 grayscale flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-4xl">inventory_2</span>
                            <p className="text-xs font-bold">{lang === 'ar' ? 'لا توجد بنود' : 'No items yet'}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* English Column */}
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-primary uppercase tracking-widest">{lang === 'ar' ? 'البنود بالإنجليزية' : 'English Items'}</h4>
                        <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-500">{policy.privacy.en.length} {lang === 'ar' ? 'items' : 'items'}</span>
                      </div>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {policy.privacy.en.length > 0 ? (
                          policy.privacy.en.map((item, idx) => (
                            <PolicyItem key={`pr-en-${idx}`} item={item} onRemove={() => removeItem('privacy', 'en', idx)} />
                          ))
                        ) : (
                          <div className="text-center py-8 opacity-40 grayscale flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-4xl">inventory_2</span>
                            <p className="text-xs font-bold">{lang === 'ar' ? 'No items yet' : 'No items yet'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Policy Item Modal */}
      {showAddModal && (
        <div className={`fixed inset-0 z-[300] ${MODAL_OVERLAY_BASE_CLASS}`}>
          <div className={`${MODAL_PANEL_BASE_CLASS} md:max-w-lg md:rounded-[2rem]`}>
            {/* Modal Header */}
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20">
                  <span className="material-symbols-outlined text-2xl">add_notes</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {lang === 'ar' ? 'إضافة بند جديد' : 'Add New Policy Item'}
                  </h3>
                  <p className="text-xs font-black text-slate-400 mt-1 uppercase tracking-widest">
                    {activeSection === 'acceptableUse' 
                      ? (lang === 'ar' ? 'سياسة الاستخدام المقبول' : 'Acceptable Use Policy')
                      : (lang === 'ar' ? 'سياسة الخصوصية والبيانات' : 'Privacy & Data Policy')
                    }
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setShowAddModal(false); setActiveSection(null); }} 
                className="size-10 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
              <form id="addPolicyForm" onSubmit={handleAddItem} className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-2.5 rounded-full bg-primary"></div>
                    <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                      {lang === 'ar' ? 'النص بالعربية' : 'Arabic Translation'}
                    </h4>
                  </div>
                  <FloatingLabelInput
                    required
                    type="text"
                    label={lang === 'ar' ? 'اكتب البند بالعربية' : 'Item text in Arabic'}
                    value={newItem.ar}
                    onChange={(e) => setNewItem({ ...newItem, ar: e.target.value })}
                    placeholder={lang === 'ar' ? 'مثال: يمنع استخدام المنصة لأغراض غير قانونية...' : 'Example: It is forbidden to use the platform for illegal purposes...'}
                    isRtl
                    className="text-right"
                  />
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-2.5 rounded-full bg-primary"></div>
                    <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                      {lang === 'ar' ? 'النص بالإنجليزية' : 'English Translation'}
                    </h4>
                  </div>
                  <FloatingLabelInput
                    required
                    type="text"
                    label={lang === 'ar' ? 'Item text in English' : 'Item text in English'}
                    value={newItem.en}
                    onChange={(e) => setNewItem({ ...newItem, en: e.target.value })}
                    placeholder="Example: It is forbidden to use the platform for illegal purposes..."
                  />
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0 flex gap-4">
              <button 
                type="button" 
                onClick={() => { setShowAddModal(false); setActiveSection(null); }} 
                className="flex-1 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-black text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                form="addPolicyForm" 
                type="submit" 
                className="flex-2 py-4 px-8 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {lang === 'ar' ? 'تأكيد الإضافة' : 'Confirm Add'}
                <span className="material-symbols-outlined text-xl">check_circle</span>
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

export default PolicyManagement;



