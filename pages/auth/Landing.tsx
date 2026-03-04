
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../App';
import { APP_LOGO } from '../../constants';

interface LandingProps {
  isLoggedIn: boolean;
}

const Landing: React.FC<LandingProps> = ({ isLoggedIn }) => {
  const { lang, setLang, t, isDarkMode, toggleDarkMode } = useApp();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-[#020617] transition-colors duration-700 font-display overflow-hidden selection:bg-primary selection:text-white">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        @keyframes blob {
          0%, 100% { border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%; }
          33% { border-radius: 70% 30% 46% 54% / 30% 29% 71% 70%; }
          66% { border-radius: 100% 60% 60% 100% / 100% 100% 60% 60%; }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        .animate-blob { animation: blob 15s linear infinite; }
        .text-gradient { background: linear-gradient(135deg, #20a7b2 0%, #158a94 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      `}</style>

      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 dark:bg-primary/5 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

        {/* Animated Shapes */}
        <div className="absolute top-[20%] right-[15%] size-64 bg-primary/5 dark:bg-primary/10 animate-blob blur-3xl"></div>
        <div className="absolute bottom-[20%] left-[10%] size-80 bg-blue-400/5 dark:bg-blue-400/10 animate-blob blur-3xl" style={{ animationDelay: '5s' }}></div>
      </div>

      {/* Hero Section */}
      <main className="relative z-[300] min-h-[100dvh] px-6 flex items-center">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-8 md:gap-12 lg:gap-24">
          {/* Left Content */}
          <div className="order-2 lg:order-1 mt-4 md:mt-6 lg:mt-0 flex-1 text-center lg:text-left rtl:lg:text-right space-y-5 md:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="space-y-5">
              <div className={`inline-flex items-center gap-2 ${lang === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="px-4 py-2 rounded-full bg-primary/10 text-primary text-[11px] font-black uppercase tracking-widest border border-primary/20">
                  <span className="inline-block size-2 rounded-full bg-primary animate-ping mr-2 align-middle"></span>
                  {lang === 'ar' ? 'أهلاً بك في المستقبل' : 'Welcome to the Future'}
                </div>
                <div className="relative z-[220]">
                  <button
                    onClick={() => setFabOpen(!fabOpen)}
                    className="px-3 h-9 rounded-full bg-primary/10 text-primary border border-primary/20 font-black text-[11px] flex items-center gap-1 shadow-sm active:scale-95"
                    aria-label="Actions"
                  >
                    <span className="material-symbols-outlined text-sm">{fabOpen ? 'close' : 'apps'}</span>
                    {lang === 'ar' ? 'أدوات' : 'Tools'}
                  </button>
                  <div className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} top-full mt-2 flex flex-col gap-2 transition-all ${fabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
                    <button
                      onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
                      className="h-9 px-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-lg text-[11px] font-black"
                      title={lang === 'ar' ? 'English' : 'العربية'}
                    >
                      {lang === 'ar' ? 'English' : 'العربية'}
                    </button>
                    <button
                      onClick={toggleDarkMode}
                      className="h-9 px-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-lg text-[11px] font-black flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
                      {lang === 'ar' ? 'الوضع' : 'Theme'}
                    </button>
                    <button
                      onClick={() => (window.location.href = '/')}
                      className="h-9 px-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-lg text-[11px] font-black flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">home</span>
                      {lang === 'ar' ? 'الرئيسية' : 'Home'}
                    </button>
                  </div>
                </div>
              </div>

              <h1 className="text-3xl md:text-5xl lg:text-7xl font-black text-slate-900 dark:text-white leading-[1.15] tracking-tight">
                {t.landing.heroTitle.split(' ').map((word, i) => (
                  <span key={i} className={i > 2 ? 'text-gradient' : ''}>{word} </span>
                ))}
              </h1>

              <p className="text-slate-500 dark:text-slate-400 text-[15px] md:text-lg lg:text-xl font-bold leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {t.landing.heroSubtitle}
              </p>
            </div>

            {/* Mobile segmented actions */}
            <div className="md:hidden bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-1 shadow-sm max-w-md mx-auto flex">
              <button
                onClick={() => navigate('/register')}
                className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-black active:scale-95 transition-all"
              >
                {lang === 'ar' ? 'ابدأ الآن' : 'Get Started'}
              </button>
              <button
                onClick={() => navigate('/login')}
                className="flex-1 py-3 rounded-xl text-sm font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 active:scale-95 transition-all"
              >
                {lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
              </button>
            </div>

            {/* Desktop/tablet buttons */}
            <div className="hidden md:flex flex-row gap-4 justify-center lg:justify-start max-w-md mx-auto lg:mx-0">
              <button
                onClick={() => navigate('/register')}
                className="flex-1 h-16 bg-primary text-white rounded-2xl font-black text-base shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-3 group"
              >
                {t.landing.getStarted}
                <span className="material-symbols-outlined text-2xl group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">arrow_forward</span>
              </button>

              <button
                onClick={() => navigate('/login')}
                className="flex-1 h-16 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-base shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {t.landing.signIn}
                <span className="material-symbols-outlined text-2xl">login</span>
              </button>
            </div>
          </div>

          {/* Right Visual - Image/Logo */}
          <div className="order-1 lg:order-2 flex-1 relative w-full max-w-2xl animate-in fade-in zoom-in duration-1000 delay-300">
            <div className="relative aspect-[4/3] md:aspect-[4/3] lg:aspect-square flex items-center justify-center">
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-blue-500/20 rounded-[3rem] rotate-6 scale-95 blur-2xl"></div>

              {/* Main Image Container */}
              <div className="relative w-full h-full bg-white dark:bg-slate-900 rounded-[3rem] border-4 border-white dark:border-slate-800 shadow-2xl overflow-hidden animate-float">
                <img
                  src={APP_LOGO}
                  className="w-full h-full object-cover transition-all duration-700 dark:invert dark:hue-rotate-180 dark:brightness-125"
                  alt="Platform Preview"
                />

                {/* Floating UI Elements */}
                <div className="absolute top-3 right-3 md:top-8 md:right-8 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-2 md:p-4 rounded-2xl shadow-xl border border-white/20 animate-float" style={{ animationDelay: '-2s' }}>
                  <div className="flex items-center gap-3">
                    <div className="size-7 md:size-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                      <span className="material-symbols-outlined">trending_up</span>
                    </div>
                    <div>
                      <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{lang === 'ar' ? 'النمو' : 'Growth'}</div>
                      <div className="text-xs md:text-sm font-black text-slate-900 dark:text-white">+124%</div>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-4 left-3 md:bottom-12 md:left-8 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-2 md:p-4 rounded-2xl shadow-xl border border-white/20 animate-float" style={{ animationDelay: '-4s' }}>
                  <div className="flex items-center gap-3">
                    <div className="size-7 md:size-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined">verified</span>
                    </div>
                    <div>
                      <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{lang === 'ar' ? 'موثوق' : 'Verified'}</div>
                      <div className="text-xs md:text-sm font-black text-slate-900 dark:text-white">Global Network</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main >

      {/* Click-away to close tools */}
      {fabOpen && <div className="fixed inset-0 z-[100]" onClick={() => setFabOpen(false)} />}
    </div >
  );
};

export default Landing;
