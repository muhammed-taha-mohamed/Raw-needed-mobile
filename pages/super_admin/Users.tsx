import React, { useState } from 'react';
import { useLanguage } from '../../App';

const Users: React.FC = () => {
  const { lang, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');

  const mockUsers = [
    { id: '1', name: 'Ahmed Hassan', email: 'ahmed@example.com', role: 'SUPPLIER_OWNER', status: 'Active' },
    { id: '2', name: 'Sarah Miller', email: 'sarah@test.com', role: 'CUSTOMER_OWNER', status: 'Active' },
    { id: '3', name: 'John Smith', email: 'john@corp.com', role: 'SUPPLIER_OWNER', status: 'Suspended' },
  ];

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-10 py-6 animate-in fade-in duration-700">
      <div className="flex items-center justify-end mb-10">
        <div className="relative group w-full md:w-80">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
          <input 
            type="text" 
            placeholder={lang === 'ar' ? 'ابحث بالاسم أو البريد...' : 'Search users...'}
            className="w-full pl-12 pr-6 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 focus:border-primary outline-none transition-all font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400  ">
                <th className="px-8 py-5">{lang === 'ar' ? 'المستخدم' : 'User'}</th>
                <th className="px-8 py-5">{lang === 'ar' ? 'الدور' : 'Role'}</th>
                <th className="px-8 py-5">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {mockUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="size-11 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-black">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 dark:text-white text-base ">{user.name}</p>
                        <p className="text-xs font-bold text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black  ">
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black    ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      <span className={`size-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="text-slate-400 hover:text-primary transition-all">
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Users;