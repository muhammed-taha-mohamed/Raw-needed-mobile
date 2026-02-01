
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../App';

interface LandingProps {
  isLoggedIn: boolean;
}

const Landing: React.FC<LandingProps> = ({ isLoggedIn }) => {
  const { lang, setLang, t, isDarkMode, toggleDarkMode } = useApp();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#20a7b2] dark:bg-slate-950 transition-colors duration-500 overflow-hidden font-display relative">
      <style>{`
        @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .animate-slide-down { animation: slideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-up { opacity: 0; animation: fadeInUp 0.8s ease-out forwards; }
        .animate-zoom { opacity: 0; animation: zoomIn 0.8s ease-out forwards; }
      `}</style>

      <div className="fixed top-4 left-4 right-4 z-[200] flex justify-between items-center pointer-events-none mobile-top-offset">
        <div className="pointer-events-auto flex gap-2">
           <Link 
            to="/" 
            className="size-11 flex items-center justify-center bg-slate-900/40 backdrop-blur-md rounded-full text-white border border-white/30 shadow-2xl transition-all active:scale-90 hover:bg-slate-900/60"
          >
            <span className="material-symbols-outlined text-lg">home</span>
          </Link>
           {isLoggedIn && (
             <button 
               onClick={() => navigate('/')}
               className="px-6 py-2 bg-slate-900/40 backdrop-blur-md rounded-full text-xs font-black text-white border border-white/30 shadow-2xl transition-all active:scale-90 hover:bg-slate-900/60   flex items-center gap-2"
             >
               <span className="material-symbols-outlined text-sm">dashboard</span>
               {t.landing.portal}
             </button>
           )}
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
            className="size-11 flex items-center justify-center bg-slate-900/40 backdrop-blur-md rounded-full text-xs font-black text-white border border-white/30 shadow-2xl transition-all active:scale-90 hover:bg-slate-900/60"
          >
            {lang === 'en' ? t.common.langSwitchAr : t.common.langSwitchEn}
          </button>
        </div>
      </div>

      <div className="flex-none h-[45vh] md:h-screen md:w-1/2 md:order-2 bg-white dark:bg-slate-900 relative rounded-b-[4rem] md:rounded-none overflow-hidden shadow-2xl z-10 animate-slide-down md:animate-none md:animate-fade-up border-b-4 md:border-b-0 md:border-l-4 border-white/10 dark:border-primary/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            src="https://res.cloudinary.com/drzge8ywz/image/upload/v1767623747/trust-app-images/hj0hmskzhvumytynnjbj.png" 
            className="w-full h-full min-w-full min-h-full object-cover object-center transition-all duration-700 dark:invert dark:hue-rotate-180 dark:brightness-125"
            alt="Business Growth"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#20a7b2]/40 dark:from-slate-950/20 via-transparent to-transparent"></div>
      </div>

      <div className="flex-1 md:w-1/2 flex flex-col justify-center px-8 sm:px-12 md:px-20 lg:px-32 py-12 md:py-0 md:order-1 relative">
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
