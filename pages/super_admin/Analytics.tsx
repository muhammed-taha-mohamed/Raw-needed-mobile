
import React from 'react';
import { useLanguage } from '../../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const Analytics: React.FC = () => {
  const { lang, t } = useLanguage();

  const data = [
    { name: 'Jan', revenue: 4000, users: 240 },
    { name: 'Feb', revenue: 3000, users: 198 },
    { name: 'Mar', revenue: 2000, users: 980 },
    { name: 'Apr', revenue: 2780, users: 390 },
    { name: 'May', revenue: 1890, users: 480 },
    { name: 'Jun', revenue: 2390, users: 380 },
  ];

  return (
    <div className="mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-8 animate-in fade-in duration-700">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {lang === 'ar' ? 'التحليلات والنظام' : 'System Analytics'}
        </h1>
        <p className="text-slate-500 font-bold mt-2">Comprehensive overview of platform metrics and health.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-black mb-8 text-slate-800 dark:text-white uppercase tracking-wider">{lang === 'ar' ? 'نمو الإيرادات' : 'Revenue Performance'}</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="revenue" fill="#009aa7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-black mb-8 text-slate-800 dark:text-white uppercase tracking-wider">{lang === 'ar' ? 'نشاط المستخدمين' : 'User Acquisition'}</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Line type="monotone" dataKey="users" stroke="#003259" strokeWidth={3} dot={{ r: 6, fill: '#003259' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
