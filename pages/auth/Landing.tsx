
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../App';
import { APP_LOGO } from '../../constants';

interface LandingProps {
  isLoggedIn: boolean;
}

const Landing: React.FC<LandingProps> = ({ isLoggedIn }) => {
  const { lang, setLang, t, isDarkMode, toggleDarkMode } = useApp();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-screen min-h-[100dvh] flex flex-col md:flex-row bg-[#20a7b2] dark:bg-slate-950 transition-colors duration-500 overflow-hidden font-display relative">
      <style>{`
        @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .animate-slide-down { animation: slideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-up { opacity: 0; animation: fadeInUp 0.8s ease-out forwards; }
        .animate-zoom { opacity: 0; animation: zoomIn 0.8s ease-out forwards; }
      `}</style>

      <div className="flex-none h-[45vh] md:min-h-full md:h-full md:w-1/2 md:order-2 bg-white dark:bg-slate-900 relative rounded-b-[4rem] md:rounded-none overflow-hidden shadow-2xl z-10 animate-slide-down md:animate-none md:animate-fade-up border-b-4 md:border-b-0 md:border-l-4 border-white/10 dark:border-primary/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            src={APP_LOGO} 
            className="w-full h-full min-w-full min-h-full object-cover object-center transition-all duration-700 dark:invert dark:hue-rotate-180 dark:brightness-125"
            alt="Business Growth"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#20a7b2]/40 dark:from-slate-950/20 via-transparent to-transparent"></div>
      </div>

      {/* Floating settings - bottom right (EN) / bottom left (AR), opens toward screen */}
      <div className={`fixed z-[200] ${lang === 'ar' ? 'left-6 bottom-6' : 'right-6 bottom-6'}`} ref={settingsRef}>
        <button type="button" onClick={() => setSettingsOpen((o) => !o)} className={`size-14 flex items-center justify-center bg-slate-900/60 backdrop-blur-md rounded-2xl text-white border border-white/30 shadow-2xl transition-all duration-300 active:scale-95 hover:bg-slate-800/70 hover:scale-105 ${settingsOpen ? 'rotate-90' : ''}`} aria-label={lang === 'ar' ? 'الإعدادات' : 'Settings'}>
          <span className="material-symbols-outlined text-[24px]">settings</span>
        </button>
        {settingsOpen && (
          <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`absolute bottom-full mb-2 flex flex-col gap-1.5 p-1.5 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-white/30 dark:border-slate-600/50 shadow-xl origin-bottom duration-300 ease-out ${lang === 'ar' ? 'left-0 animate-in fade-in slide-in-from-left-2 zoom-in-95' : 'right-0 animate-in fade-in slide-in-from-right-2 zoom-in-95'}`}>
            <Link to="/" onClick={() => setSettingsOpen(false)} className="size-11 flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50 transition-all active:scale-95" aria-label={lang === 'ar' ? 'الرئيسية' : 'Home'}><span className="material-symbols-outlined text-[22px]">home</span></Link>
            <button type="button" onClick={() => { setLang(lang === 'en' ? 'ar' : 'en'); setSettingsOpen(false); }} className="size-11 flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50 transition-all active:scale-95" aria-label={lang === 'ar' ? 'اللغة' : 'Language'}><span className="material-symbols-outlined text-[22px]">language</span></button>
            <button type="button" onClick={() => { toggleDarkMode(); setSettingsOpen(false); }} className="size-11 flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50 transition-all active:scale-95" aria-label={isDarkMode ? (lang === 'ar' ? 'الوضع الفاتح' : 'Light mode') : (lang === 'ar' ? 'الوضع الداكن' : 'Dark mode')}><span className="material-symbols-outlined text-[22px]">{isDarkMode ? 'light_mode' : 'dark_mode'}</span></button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 md:w-1/2 md:min-h-full flex flex-col justify-center px-8 sm:px-12 md:px-20 lg:px-32 py-12 md:py-0 md:order-1">
        <div className="max-w-xl mx-auto md:mx-0 w-full space-y-10">
          <div className="space-y-6 text-center md:text-left rtl:md:text-right">
            <h1 className="text-white text-3xl md:text-5xl lg:text-6xl font-black leading-[1.1] animate-fade-up" style={{ animationDelay: '0.4s' }}>
              {t.landing.heroTitle}
            </h1>
            <p className="text-white/80 text-base md:text-lg font-bold leading-relaxed max-w-lg animate-fade-up" style={{ animationDelay: '0.6s' }}>
              {t.landing.heroSubtitle}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-5 max-w-md mx-auto md:mx-0 w-full animate-fade-up" style={{ animationDelay: '0.8s' }}>
            <button 
              onClick={() => navigate('/login')}
              className="flex-1 py-5 bg-white text-[#20a7b2] rounded-3xl font-black text-sm md:text-base shadow-[0_20px_50px_rgba(0,0,0,0.2)] hover:bg-slate-50 transition-all active:scale-95   flex items-center justify-center gap-3 group"
            >
              {t.landing.signIn}
              <span className="material-symbols-outlined text-xl group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">login</span>
            </button>
            
            <button 
              onClick={() => navigate('/register')}
              className="flex-1 py-5 bg-transparent border-2 border-white/40 text-white rounded-3xl font-black text-sm md:text-base shadow-sm hover:bg-white/10 transition-all active:scale-95  flex items-center justify-center gap-3"
            >
              {t.landing.getStarted}
              <span className="material-symbols-outlined text-xl">person_add</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="h-10 md:hidden flex-none"></div>
    </div>
  );
};

export default Landing;
