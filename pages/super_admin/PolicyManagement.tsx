import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { useToast } from '../../contexts/ToastContext';
import FloatingLabelInput from '../../components/FloatingLabelInput';
import EmptyState from '../../components/EmptyState';
import PaginationFooter from '../../components/PaginationFooter';

type LangLists = { ar: string[]; en: string[] };
type PolicyData = { acceptableUse: LangLists; privacy: LangLists };

const PolicyManagement: React.FC = () => {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [policy, setPolicy] = useState<PolicyData>({
    acceptableUse: { ar: [], en: [] },
    privacy: { ar: [], en: [] },
  });

  const [drafts, setDrafts] = useState({
    acceptableUseAr: '',
    acceptableUseEn: '',
    privacyAr: '',
    privacyEn: '',
  });

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

  const addItem = (section: 'acceptableUse' | 'privacy', locale: 'ar' | 'en', value: string) => {
    const v = value.trim();
    if (!v) return;
    setPolicy(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [locale]: [...prev[section][locale], v],
      },
    }));
  };

  const removeItem = (section: 'acceptableUse' | 'privacy', locale: 'ar' | 'en', idx: number) => {
    setPolicy(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [locale]: prev[section][locale].filter((_, i) => i !== idx),
      },
    }));
  };

  const save = async () => {
    setIsSaving(true);
    try {
      await api.put('/api/v1/admin/policies', policy);
      showToast(lang === 'ar' ? 'تم حفظ السياسات' : 'Policies saved', 'success');
    } catch (err: any) {
      showToast(err?.message || (lang === 'ar' ? 'فشل حفظ السياسات' : 'Failed to save policies'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const Section = ({
    titleAr,
    titleEn,
    section,
  }: {
    titleAr: string;
    titleEn: string;
    section: 'acceptableUse' | 'privacy';
  }) => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4">
        {lang === 'ar' ? titleAr : titleEn}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <FloatingLabelInput
            type="text"
            label={lang === 'ar' ? 'أضف بند (عربي)' : 'Add item (Arabic)'}
            value={section === 'acceptableUse' ? drafts.acceptableUseAr : drafts.privacyAr}
            onChange={(e) =>
              setDrafts(prev => ({
                ...prev,
                [section === 'acceptableUse' ? 'acceptableUseAr' : 'privacyAr']: e.target.value,
              }))
            }
            placeholder={lang === 'ar' ? 'اكتب بنداً...' : 'Write an item...'}
            isRtl
          />
          <button
            type="button"
            onClick={() => {
              const val = section === 'acceptableUse' ? drafts.acceptableUseAr : drafts.privacyAr;
              addItem(section, 'ar', val);
              setDrafts(prev => ({ ...prev, [section === 'acceptableUse' ? 'acceptableUseAr' : 'privacyAr']: '' }));
            }}
            className="h-10 px-4 rounded-xl bg-primary text-white text-xs font-black"
          >
            {lang === 'ar' ? 'إضافة' : 'Add'}
          </button>
          <div className="flex flex-wrap gap-2 mt-2">
            {policy[section].ar.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeItem(section, 'ar', idx)}
                  className="size-5 rounded-full bg-red-500 text-white inline-flex items-center justify-center"
                  title={lang === 'ar' ? 'حذف' : 'Remove'}
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <FloatingLabelInput
            type="text"
            label={lang === 'ar' ? 'أضف بند (إنجليزي)' : 'Add item (English)'}
            value={section === 'acceptableUse' ? drafts.acceptableUseEn : drafts.privacyEn}
            onChange={(e) =>
              setDrafts(prev => ({
                ...prev,
                [section === 'acceptableUse' ? 'acceptableUseEn' : 'privacyEn']: e.target.value,
              }))
            }
            placeholder={lang === 'ar' ? 'اكتب بنداً...' : 'Write an item...'}
          />
          <button
            type="button"
            onClick={() => {
              const val = section === 'acceptableUse' ? drafts.acceptableUseEn : drafts.privacyEn;
              addItem(section, 'en', val);
              setDrafts(prev => ({ ...prev, [section === 'acceptableUse' ? 'acceptableUseEn' : 'privacyEn']: '' }));
            }}
            className="h-10 px-4 rounded-xl bg-primary text-white text-xs font-black"
          >
            {lang === 'ar' ? 'إضافة' : 'Add'}
          </button>
          <div className="flex flex-wrap gap-2 mt-2">
            {policy[section].en.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeItem(section, 'en', idx)}
                  className="size-5 rounded-full bg-red-500 text-white inline-flex items-center justify-center"
                  title={lang === 'ar' ? 'حذف' : 'Remove'}
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full py-6 pb-24 md:pb-6 relative font-display animate-in fade-in slide-in-from-bottom-4 duration-700">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="size-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-bold text-sm">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      ) : (
        <>
          <Section titleAr="الاستخدام المقبول" titleEn="Acceptable Use" section="acceptableUse" />
          <div className="h-4"></div>
          <Section titleAr="الخصوصية والبيانات" titleEn="Privacy & Data" section="privacy" />
          <div className="mt-6 flex gap-3">
            <button
              onClick={save}
              disabled={isSaving}
              className="h-12 px-6 rounded-xl bg-primary text-white text-sm font-black shadow-xl disabled:opacity-50"
            >
              {isSaving ? (lang === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ السياسات' : 'Save Policies')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PolicyManagement;
