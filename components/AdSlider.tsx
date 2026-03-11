
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../App';
import { Advertisement } from '../types';
import { api } from '../api';

const AdSlider: React.FC = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const parsed = JSON.parse(userStr);
      const role = (parsed.userInfo?.role || parsed.role || '').toUpperCase();
      setUserRole(role);
      // Only fetch ads for customers
      if (role.includes('CUSTOMER')) {
        fetchAds();
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ads.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % ads.length);
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [ads]);

  useEffect(() => {
    if (!isFullscreenOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullscreenOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isFullscreenOpen]);

  const fetchAds = async () => {
    try {
      // Try dashboard endpoint first (list, not paginated), fallback to paginated endpoint
      try {
        const dashboardResponse = await api.get<Advertisement[]>('/api/v1/admin/dashboard/advertisements');
        const adsList = Array.isArray(dashboardResponse) ? dashboardResponse : (dashboardResponse?.data || []);
        if (adsList.length > 0) {
          setAds(adsList);
          setIsLoading(false);
          return;
        }
      } catch (dashboardErr) {
        // Fallback to paginated endpoint
      }
      
      const response = await api.get<{ content: Advertisement[] }>('/api/v1/advertisements?page=0&size=10');
      setAds(response.content || []);
    } catch (err) {
      console.error("Ads fetch error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdClick = async (ad: Advertisement) => {
    // View is already recorded when ad appears in slider, no need to record again on click
    const supplierId = ad.userId || ad.supplierId;
    if (supplierId) {
      navigate('/vendors', { state: { initialSupplierId: supplierId } });
    }
  };

  // Record view when ad is displayed in slider (only for logged-in customers)
  useEffect(() => {
    if (ads.length > 0 && currentIndex < ads.length && userRole.includes('CUSTOMER')) {
      const currentAd = ads[currentIndex];
      if (currentAd?.id) {
        // Record view when ad appears in slider (only once per user per ad)
        api.post(`/api/v1/advertisements/${currentAd.id}/view`).catch(() => {
          // Silent fail - view tracking is not critical
        });
      }
    }
  }, [currentIndex, ads, userRole]);

  // Only show ads for customers
  if (!userRole.includes('CUSTOMER')) return null;
  if (isLoading || ads.length === 0) return null;

  return (
    <div className="w-full mb-8 animate-in fade-in duration-1000">
      <div className="relative h-[260px] md:h-[340px] w-full rounded-[2.5rem] overflow-hidden shadow-xl border border-primary/20 group ring-1 ring-primary/5 bg-slate-100 dark:bg-slate-800">
        
        <div 
          className="flex h-full transition-transform duration-1000 ease-out" 
          style={{ transform: `translateX(${lang === 'ar' ? (currentIndex * 100) : -(currentIndex * 100)}%)` }}
        >
          {ads.map((ad) => {
            const supplierId = ad.userId || ad.supplierId;
            return (
              <div 
                key={ad.id} 
                className="min-w-full h-full relative"
              >
                <img 
                  src={ad.image} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                  alt="Advertisement"
                />
                
                {supplierId && (
                  <div className={`absolute top-5 ${lang === 'ar' ? 'right-6' : 'left-6'} z-20 flex items-center gap-2`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFullscreenOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md text-white text-[10px] font-black shadow-2xl border border-white/20 transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_full</span>
                      {lang === 'ar' ? 'عرض الصورة' : 'Full Screen'}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdClick(ad);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary hover:bg-white text-white hover:text-primary text-[10px] font-black  shadow-2xl border border-white/20 transition-all active:scale-95 group/label"
                    >
                      <span className="size-2 rounded-full bg-white group-hover/label:bg-primary animate-pulse transition-colors"></span>
                      {lang === 'ar' ? 'الكتالوج' : 'Catalog'}
                      <span className="material-symbols-outlined text-sm rtl-flip group-hover/label:translate-x-1 rtl:group-hover/label:-translate-x-1 transition-transform">arrow_forward</span>
                    </button>
                  </div>
                )}

                {!supplierId && (
                  <div className={`absolute top-5 ${lang === 'ar' ? 'right-6' : 'left-6'} z-20`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFullscreenOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md text-white text-[10px] font-black shadow-2xl border border-white/20 transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_full</span>
                      {lang === 'ar' ? 'عرض الصورة' : 'Full Screen'}
                    </button>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent flex items-end p-8 md:p-10">
                  <div className="animate-in slide-in-from-bottom-8 duration-700 w-full">
                     <div className="max-w-3xl">
                        <h2 className="text-lg md:text-2xl font-black text-white leading-tight drop-shadow-2xl">
                           {ad.text}
                        </h2>
                     </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {ads.length > 1 && (
          <div className={`absolute bottom-6 ${lang === 'ar' ? 'left-8' : 'right-8'} flex gap-2.5 z-20`}>
            {ads.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  currentIndex === i ? 'w-8 bg-primary shadow-lg shadow-primary/50' : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {ads.length > 1 && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length); }}
              className={`absolute top-1/2 -translate-y-1/2 ${lang === 'ar' ? 'right-4' : 'left-4'} size-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-primary active:scale-90 z-20 shadow-2xl`}
            >
              <span className="material-symbols-outlined text-lg rtl-flip">chevron_left</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev + 1) % ads.length); }}
              className={`absolute top-1/2 -translate-y-1/2 ${lang === 'ar' ? 'left-4' : 'right-4'} size-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-primary active:scale-90 z-20 shadow-2xl`}
            >
              <span className="material-symbols-outlined text-lg rtl-flip">chevron_right</span>
            </button>
          </>
        )}
      </div>

      {isFullscreenOpen && ads[currentIndex] && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
          onClick={() => setIsFullscreenOpen(false)}
        >
          <button
            onClick={() => setIsFullscreenOpen(false)}
            className={`absolute top-4 ${lang === 'ar' ? 'left-4' : 'right-4'} size-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-colors z-10`}
            aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          {ads.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
                }}
                className={`absolute top-1/2 -translate-y-1/2 ${lang === 'ar' ? 'right-4' : 'left-4'} size-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-colors z-10`}
                aria-label={lang === 'ar' ? 'السابق' : 'Previous'}
              >
                <span className="material-symbols-outlined rtl-flip">chevron_left</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev + 1) % ads.length);
                }}
                className={`absolute top-1/2 -translate-y-1/2 ${lang === 'ar' ? 'left-4' : 'right-4'} size-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-colors z-10`}
                aria-label={lang === 'ar' ? 'التالي' : 'Next'}
              >
                <span className="material-symbols-outlined rtl-flip">chevron_right</span>
              </button>
            </>
          )}

          <div
            className="relative w-full max-w-7xl max-h-full flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={ads[currentIndex].image}
              alt="Advertisement Full Screen"
              className="max-w-full max-h-[82vh] object-contain rounded-[2rem] shadow-2xl"
            />
            {ads[currentIndex].text && (
              <div className="w-full max-w-4xl rounded-[1.5rem] bg-white/10 border border-white/10 px-5 py-4 text-center">
                <p className="text-white text-sm md:text-base font-black leading-relaxed">
                  {ads[currentIndex].text}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdSlider;
