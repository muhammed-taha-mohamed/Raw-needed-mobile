
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

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const parsed = JSON.parse(userStr);
      const role = (parsed.userInfo?.role || parsed.role || '').toUpperCase();
      setUserRole(role);
    }
    fetchAds();
  }, []);

  useEffect(() => {
    if (ads.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % ads.length);
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [ads]);

  const fetchAds = async () => {
    try {
      const response = await api.get<{ content: Advertisement[] }>('/api/v1/advertisements?page=0&size=10');
      setAds(response.content || []);
    } catch (err) {
      console.error("Ads fetch error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdClick = (ad: Advertisement) => {
    const supplierId = ad.userId || ad.supplierId;
    if (supplierId) {
      navigate('/vendors', { state: { initialSupplierId: supplierId } });
    }
  };

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
                  <div className={`absolute top-5 ${lang === 'ar' ? 'right-6' : 'left-6'} z-20`}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdClick(ad);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary hover:bg-white text-white hover:text-primary text-[10px] font-black  shadow-2xl border border-white/20 transition-all active:scale-95 group/label"
                    >
                      <span className="size-2 rounded-full bg-white group-hover/label:bg-primary animate-pulse transition-colors"></span>
                      {lang === 'ar' ? 'عرض الكتالوج' : 'View Catalog'}
                      <span className="material-symbols-outlined text-sm rtl-flip group-hover/label:translate-x-1 rtl:group-hover/label:-translate-x-1 transition-transform">arrow_forward</span>
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
    </div>
  );
};

export default AdSlider;
