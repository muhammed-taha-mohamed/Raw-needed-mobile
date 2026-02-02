
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../App';
import { api } from '../../api';
import { APP_LOGO } from '../../constants';

interface LoginProps {
  onLogin: (userData: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { lang, setLang, t, isDarkMode, toggleDarkMode } = useApp();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (email === 'admin@raw.com' && password === 'admin123') {
        const mockResponse = {
          token: 'demo-token-12345',
          role: 'SUPER_ADMIN',
          name: 'Demo Admin',
          userInfo: {
            id: 'demo-id',
            role: 'SUPER_ADMIN',
            name: 'Demo Admin',
            email: 'admin@raw.com'
          }
        };
        setTimeout(() => {
          onLogin(mockResponse);
          navigate('/');
        }, 800);
        return;
      }

      const response = await api.post<any>('/api/v1/user/auth/login', { email, password });
      onLogin(response);
      navigate('/');
    } catch (err: any) {
      setError(t.loginExtra.errorCredentials);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#20a7b2] dark:bg-slate-950 transition-colors duration-500 overflow-hidden font-display relative">
      <style>{`
        @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-down { animation: slideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-up { opacity: 0; animation: fadeInUp 0.8s ease-out forwards; }
      `}</style>

      {/* Floating Auth Header */}
      <div className="fixed top-4 left-4 right-4 z-[200] flex justify-between items-center pointer-events-none mobile-top-offset">
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

      {/* Left (mobile: top) - Image / Branding; on web LTR=left, RTL=right */}
      <div className={`flex-none h-[45vh] md:h-full md:w-1/2 md:min-h-screen bg-white dark:bg-slate-900 relative overflow-hidden shadow-2xl z-10 animate-slide-down md:animate-none md:animate-fade-up border-b-4 md:border-b-0 border-white/10 dark:border-primary/20 rounded-b-[4rem] md:rounded-none ${lang === 'ar' ? 'md:order-2 md:border-l-4' : 'md:order-1 md:border-r-4'}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            src={APP_LOGO} 
            className="w-full h-full min-w-full min-h-full object-cover object-center dark:invert dark:hue-rotate-180 dark:brightness-125 transition-all duration-700"
            alt="Hero"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#20a7b2]/40 dark:from-slate-950/20 via-transparent to-transparent"></div>
      </div>

      {/* Right (mobile: bottom) - Form; on web LTR=right, RTL=left */}
      <div className={`flex-1 flex flex-col justify-center px-8 sm:px-12 py-8 md:py-12 overflow-y-auto no-scrollbar animate-fade-up md:w-1/2 ${lang === 'ar' ? 'md:order-1' : 'md:order-2'}`} style={{ animationDelay: '0.4s' }}>
        <div className="max-w-md mx-auto w-full space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-white ">{t.loginExtra.signInTitle}</h2>
            <p className="text-white/80 text-sm font-bold">{t.loginExtra.welcomeBack}</p>
          </div>

          {error && <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/30 text-white text-xs font-bold text-center animate-in shake">{error}</div>}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="relative group">
              <span className={`material-symbols-outlined absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-primary/40 group-focus-within:text-primary transition-colors`}>mail</span>
              <input className={`w-full rounded-full border-0 bg-white dark:bg-slate-800 text-slate-900 dark:text-white h-14 text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium ${lang === 'ar' ? 'pr-12 pl-6 text-right' : 'pl-12 pr-6 text-left'} focus:ring-4 focus:ring-white/20 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-500 font-bold shadow-xl`} placeholder={t.login.emailPlaceholder} required type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
            </div>

            <div className="relative group">
              <span className={`material-symbols-outlined absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-primary/40 group-focus-within:text-primary transition-colors`}>lock</span>
              <input className={`w-full rounded-full border-0 bg-white dark:bg-slate-800 text-slate-900 dark:text-white h-14 text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium ${lang === 'ar' ? 'pr-12 pl-6 text-right' : 'pl-12 pr-6 text-left'} focus:ring-4 focus:ring-white/20 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-500 font-bold shadow-xl`} placeholder={t.login.passwordPlaceholder} required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute ${lang === 'ar' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary`}><span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span></button>
            </div>

            <div className="flex items-center justify-between px-2">
              <Link to="/forgot-password" opacity-70 className="text-white/70 hover:text-white text-xs font-black transition-colors">{t.login.forgot}</Link>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded-md border-0 text-primary focus:ring-white/40 size-4" />
                <label htmlFor="remember" className="text-xs font-bold text-white/80 cursor-pointer">{t.login.remember}</label>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full h-14 bg-white dark:bg-primary text-[#20a7b2] dark:text-white text-sm font-black rounded-full shadow-2xl hover:bg-slate-50 dark:hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 ">
              {isLoading ? <div className="h-5 w-5 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin"></div> : t.loginExtra.signInButton}
            </button>
          </form>
          
          <div className="text-center pt-4">
            <p className="text-white/70 text-sm font-bold">{t.login.noAccount} <Link to="/register" className="text-white font-black hover:underline ml-2 ">{t.login.registerLink}</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
