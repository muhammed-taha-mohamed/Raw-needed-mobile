import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import OrderChat from '../../components/OrderChat';

interface MarketPost {
  id: string;
  materialName: string;
  image: string;
  quantity: number;
  unit: string;
  postType: 'SUPPLIERS' | 'CUSTOMERS' | 'BOTH';
  createdById: string;
  createdByName: string;
  createdByOrganizationName: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  status: string;
  offers: any[];
}

const MarketRequests: React.FC = () => {
  const { lang, t } = useLanguage();
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewType, setViewType] = useState<'grid' | 'table'>('grid');
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [userRole, setUserRole] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const parsedUser = JSON.parse(userStr);
      setUserRole((parsedUser.role || ''));
    }
    fetchData(0, 'all', 12);
  }, []);

  const fetchData = async (page: number, tab: 'all' | 'mine', size: number) => {
    setIsLoading(true);
    try {
      const endpoint = tab === 'all' ? `/api/v1/posts?page=${page}&size=${size}` : `/api/v1/posts/my-posts?page=${page}&size=${size}`;
      const response = await api.get<any>(endpoint);
      setPosts(response.content || []);
    } catch (err) {} finally { setIsLoading(false); }
  };

  const canCreate = userRole.includes('CUSTOMER_OWNER');

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-10 py-6 animate-in fade-in duration-700 font-display">
      <div className="flex flex-wrap items-center justify-end gap-4 mb-10">
        <div className="flex gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button onClick={() => setViewType('grid')} className={`p-2 rounded-lg transition-all ${viewType === 'grid' ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:text-slate-600'}`}><span className="material-symbols-outlined text-[22px]">grid_view</span></button>
          <button onClick={() => setViewType('table')} className={`p-2 rounded-lg transition-all ${viewType === 'table' ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:text-slate-600'}`}><span className="material-symbols-outlined text-[22px]">view_list</span></button>
        </div>
        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-primary/10 shadow-sm flex">
          <button onClick={() => { setActiveTab('all'); fetchData(0, 'all', 12); }} className={`px-8 py-2.5 rounded-xl text-[12px] font-black transition-all ${activeTab === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-primary hover:bg-primary/5'}`}>{t.marketRequests.filterAll}</button>
          <button onClick={() => { setActiveTab('mine'); fetchData(0, 'mine', 12); }} className={`px-8 py-2.5 rounded-xl text-[12px] font-black transition-all ${activeTab === 'mine' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-primary hover:bg-primary/5'}`}>{t.marketRequests.myPosts}</button>
        </div>
        {canCreate && (<button onClick={() => setIsCreateModalOpen(true)} className="bg-primary text-white px-8 py-3.5 rounded-2xl font-black text-[13px] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"><span className="material-symbols-outlined">add_box</span>{t.marketRequests.createPost}</button>)}
      </div>

      <div className="min-h-[500px]">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center"><div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8">
            {posts.map((post, idx) => (
              <div key={post.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-primary/5 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col animate-in zoom-in-95" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="p-6 pb-4 border-b border-slate-50 dark:border-slate-800"><h4 className="text-sm font-black text-slate-900 dark:text-white truncate">{post.createdByOrganizationName || post.createdByName}</h4></div>
                <div className="p-6 space-y-5 flex-1"><h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight">{post.materialName}</h3><div className="aspect-video w-full rounded-[2rem] overflow-hidden bg-slate-50 dark:bg-slate-800/50">{post.image && <img src={post.image} className="size-full object-cover" />}</div></div>
                <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center"><span className="text-[12px] font-black text-slate-500 ">{post.offers?.length || 0} {t.marketRequests.offers}</span><button className="px-6 py-3 bg-primary text-white rounded-xl font-black text-[11px] shadow-lg">{lang === 'ar' ? 'عرض' : 'View'}</button></div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* ... (باقي المودالز تظل كما هي) ... */}
    </div>
  );
};

export default MarketRequests;