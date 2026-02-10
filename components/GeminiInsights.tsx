import React, { useState } from 'react';
import { useLanguage } from '../App';
import { GoogleGenAI } from "@google/genai";

const GeminiInsights: React.FC = () => {
  const { lang, t } = useLanguage();
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsight = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this SaaS performance: Revenue 45k EGP, 12 new users, 85% retention. Provide 3 short bullet points of strategic advice in ${lang === 'ar' ? 'Arabic' : 'English'}.`,
      });
      setInsight(response.text || t.gemini.noInsights);
    } catch (error) {
      setInsight(t.gemini.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[2rem] bg-gradient-to-br from-primary/10 via-white to-accent/5 dark:from-primary/20 dark:via-slate-900 dark:to-slate-800 p-8 border border-primary/20 shadow-xl overflow-hidden relative group transition-all hover:shadow-primary/5">
      <div className="absolute -top-10 -right-10 size-40 bg-primary/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center text-primary border border-primary/10 animate-pulse">
            <span className="material-symbols-outlined text-3xl">auto_awesome</span>
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {t.gemini.title}
            </h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
              {t.gemini.subtitle}
            </p>
          </div>
        </div>

        <button 
          onClick={generateInsight}
          disabled={loading}
          className="bg-primary hover:bg-primary/90 text-white px-8 py-3.5 rounded-xl font-black text-xs shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <span className="material-symbols-outlined text-lg">insights</span>
          )}
          {t.gemini.generateInsights}
        </button>
      </div>

      {insight && (
        <div className="mt-8 p-6 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-primary/5 animate-in slide-in-from-top-4 duration-500">
          <div className="text-slate-700 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-wrap">
            {insight}
          </div>
        </div>
      )}
    </div>
  );
};

export default GeminiInsights;