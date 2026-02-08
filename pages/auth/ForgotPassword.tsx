import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../App';
import { api } from '../../api';
import { APP_LOGO } from '../../constants';

const ForgotPassword: React.FC = () => {
  const { lang, setLang, t, isDarkMode, toggleDarkMode } = useApp();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await api.post('/api/v1/user/auth/send-forgot-password-otp', { email });
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError(t.forgotPasswordExtra.otpRequired);
      setIsLoading(false);
      return;
    }

    try {
      await api.post('/api/v1/user/auth/update-password-by-otp', {
        email,
        otp: otpString,
        newPassword
      });
      setSuccess(t.forgotPassword.success);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
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

      {/* Left (mobile: top) - Image / Branding */}
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

      {/* Right (mobile: bottom) - Form */}
      <div className={`flex-1 flex flex-col justify-center px-8 sm:px-12 py-8 md:py-12 overflow-y-auto no-scrollbar animate-fade-up md:w-1/2 ${lang === 'ar' ? 'md:order-1' : 'md:order-2'}`} style={{ animationDelay: '0.4s' }}>
        <div className="max-w-md mx-auto w-full space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-white ">
              {step === 1 ? t.forgotPassword.title : t.forgotPassword.verifyTitle}
            </h2>
            <p className="text-white/70 text-sm font-bold">
              {step === 1 ? t.forgotPassword.subtitle : t.forgotPassword.verifySubtitle}
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/30 text-white text-xs font-bold text-center animate-in shake duration-300">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-white text-xs font-bold text-center animate-in bounce duration-500">
              {success}
            </div>
          )}

          {step === 1 ? (
            <form className="space-y-6" onSubmit={handleSendOtp}>
              <div className="relative group">
                <span className={`material-symbols-outlined absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-primary/40 group-focus-within:text-primary transition-colors`}>mail</span>
                <input 
                  className={`w-full rounded-full border-0 bg-white dark:bg-slate-800 text-slate-900 dark:text-white h-14 text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium ${lang === 'ar' ? 'pr-12 pl-6 text-right' : 'pl-12 pr-6 text-left'} focus:ring-4 focus:ring-white/20 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-500 font-bold shadow-xl`} 
                  placeholder={t.forgotPassword.emailPlaceholder} 
                  required 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-white dark:bg-primary text-[#20a7b2] dark:text-white text-sm font-black rounded-full shadow-2xl hover:bg-slate-50 dark:hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2  "
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin"></div>
                ) : (
                  <>
                    {t.forgotPassword.sendCode}
                    <span className="material-symbols-outlined text-lg">send</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-white/70 hover:text-white font-black text-xs   flex items-center justify-center gap-2">
                  <span className={`material-symbols-outlined text-lg ${lang === 'ar' ? 'rtl-flip' : ''}`}>arrow_back</span>
                  {t.forgotPassword.backToLogin}
                </Link>
              </div>
            </form>
          ) : (
            <form className="space-y-8" onSubmit={handleUpdatePassword}>
              <div className="space-y-4">
                <p className="text-[10px] font-black text-white/60  text-center">{t.forgotPassword.otpLabel}</p>
                <div className={`flex gap-3 justify-center ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-11 h-14 rounded-2xl border-0 bg-white dark:bg-slate-800 text-center text-xl font-black text-[#20a7b2] dark:text-primary focus:ring-4 focus:ring-white/20 transition-all outline-none shadow-lg"
                      disabled={isLoading}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
              </div>

              <div className="relative group">
                <span className={`material-symbols-outlined absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-primary/40 group-focus-within:text-primary transition-colors`}>lock</span>
                <input 
                  className={`w-full rounded-full border-0 bg-white dark:bg-slate-800 text-slate-900 dark:text-white h-14 text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium ${lang === 'ar' ? 'pr-12 pl-6 text-right' : 'pl-12 pr-6 text-left'} focus:ring-4 focus:ring-white/20 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-500 font-bold shadow-xl`} 
                  placeholder={t.forgotPassword.newPasswordPlaceholder} 
                  required 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-white dark:bg-primary text-[#20a7b2] dark:text-white text-sm font-black rounded-full shadow-2xl hover:bg-slate-50 dark:hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 "
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin"></div>
                ) : (
                  <>
                    {t.forgotPassword.resetSubmit}
                    <span className="material-symbols-outlined text-lg">update</span>
                  </>
                )}
              </button>

              <div className="flex flex-col gap-4 items-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-white/60 hover:text-white text-[10px] font-black  transition-colors"
                >
                  {t.forgotPassword.resend}
                </button>
                <Link 
                  to="/login"
                  className="text-white font-black text-[10px]     hover:underline"
                >
                  {t.forgotPassword.backToLogin}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
      
      
    </div>
  );
};

export default ForgotPassword;
