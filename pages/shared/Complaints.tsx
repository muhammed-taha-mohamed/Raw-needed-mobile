
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { Complaint, ComplaintMessage } from '../../types';

const Complaints: React.FC = () => {
  const { lang, t } = useLanguage();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Detail & Chat State
  const [selectedTicket, setSelectedTicket] = useState<Complaint | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // New Ticket Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', image: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const parsedUser = JSON.parse(userStr);
      setUserRole((parsedUser.role || ''));
    }
  }, []);

  useEffect(() => {
    if (userRole) fetchComplaints(0);
  }, [userRole]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedTicket?.messages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';

  const fetchComplaints = async (pageNum: number) => {
    setIsLoading(true);
    try {
      const endpoint = isAdmin 
        ? `/api/v1/complaints/admin/all?page=${pageNum}&size=10`
        : `/api/v1/complaints/my-complaints?page=${pageNum}&size=10`;
      
      const response = await api.get<any>(endpoint);
      const data = response.data || response;
      
      setComplaints(data.content || []);
      setTotalPages(data.totalPages || 1);
      setTotalElements(data.totalElements || 0);
      setPage(data.number || 0);
    } catch (err) {
      console.error("Fetch complaints failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.description.trim()) return;
    setIsProcessing(true);
    try {
      let imageUrl = '';
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        imageUrl = await api.post<string>('/api/v1/image/upload', formData);
      }
      await api.post('/api/v1/complaints', { 
        subject: newTicket.subject, 
        description: newTicket.description, 
        image: imageUrl || null 
      });
      setIsCreateModalOpen(false);
      resetForm();
      fetchComplaints(0);
    } catch (err) { console.error(err); } finally { setIsProcessing(false); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newMessage.trim()) return;
    setIsSending(true);
    try {
      const response = await api.post<ComplaintMessage>(`/api/v1/complaints/${selectedTicket.id}/messages`, {
        message: newMessage,
        image: null 
      });
      setSelectedTicket(prev => prev ? { ...prev, messages: [...(prev.messages || []), response] } : null);
      setNewMessage('');
    } catch (err) { console.error(err); } finally { setIsSending(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setNewTicket({ subject: '', description: '', image: '' });
    setSelectedFile(null);
    setPreview(null);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-6 animate-in fade-in duration-700 font-display min-h-screen relative pb-32 md:pb-8">
      
      {/* Top Add Button - Web only */}
      {!isAdmin && (
        <div className="hidden md:block mb-6">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 rounded-2xl bg-primary text-white font-black text-sm shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all border border-primary/20 flex items-center gap-2"
            title={t.complaints.addNew}
          >
            <span className="material-symbols-outlined text-xl">add_comment</span>
            {t.complaints.addNew}
          </button>
        </div>
      )}

      {/* Floating Action Button for New Ticket - Mobile only */}
      {!isAdmin && (
        <div className="md:hidden fixed bottom-32 left-0 right-0 z-[130] pointer-events-none px-6">
          <div className="max-w-[1200px] mx-auto flex flex-col items-end pointer-events-auto">
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="size-14 rounded-full bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center active:scale-90 transition-all border-2 border-white/20 group overflow-hidden"
              title={t.complaints.addNew}
            >
              <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">add_comment</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Tickets List Sidebar */}
        <div className="lg:col-span-4 space-y-4">
           {isLoading && complaints.length === 0 ? (
             <div className="py-20 flex justify-center">
               <div className="size-10 border-[3px] border-primary/10 border-t-primary rounded-full animate-spin"></div>
             </div>
           ) : complaints.length === 0 ? (
             <div className="py-32 text-center flex flex-col items-center gap-6 opacity-30 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
               <span className="material-symbols-outlined text-7xl">support_agent</span>
               <div className="space-y-1">
                 <h3 className="text-xl font-black">{t.complaints.empty}</h3>
                 {!isAdmin && <p className="text-sm font-bold">{lang === 'ar' ? 'يمكنك البدء بفتح تذكرة جديدة للحصول على المساعدة.' : 'Open a new ticket to get assistance.'}</p>}
               </div>
             </div>
           ) : (
             <div className="space-y-4">
               {complaints.map((ticket, idx) => (
                 <div 
                   key={ticket.id} 
                   onClick={() => setSelectedTicket(ticket)} 
                   className={`p-6 rounded-[2rem] border transition-all cursor-pointer relative overflow-hidden animate-in slide-in-from-right-4 duration-500 ${selectedTicket?.id === ticket.id ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-primary/30 shadow-sm'}`}
                   style={{ animationDelay: `${idx * 50}ms` }}
                 >
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${ticket.status === 'OPEN' ? (selectedTicket?.id === ticket.id ? 'bg-white/20 text-white border-white/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100') : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {ticket.status === 'OPEN' ? t.complaints.statusOpen : t.complaints.statusClosed}
                      </span>
                      <span className="text-[10px] font-black opacity-60 tabular-nums">{formatDate(ticket.createdAt)}</span>
                    </div>
                    <h3 className="text-base font-black truncate mb-1">{ticket.subject}</h3>
                    <p className="text-[11px] font-medium line-clamp-1 opacity-80">{ticket.description}</p>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* Chat Detail Area */}
        <div className="lg:col-span-8 h-[650px] flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-primary/10 shadow-sm overflow-hidden animate-in zoom-in-95 duration-700">
           {selectedTicket ? (
             <>
               <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="size-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-xl">forum</span></div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white leading-none truncate max-w-[200px] md:max-w-md">{selectedTicket.subject}</h3>
                      <p className="text-[9px] font-black text-slate-400  mt-1.5">Ticket ID: #{selectedTicket.id.slice(-6)}</p>
                    </div>
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 custom-scrollbar bg-slate-50/20 dark:bg-slate-800/5">
                  <div className="flex justify-center mb-10">
                    <div className="max-w-[90%] bg-white dark:bg-slate-900 p-8 rounded-xl border border-primary/5 shadow-sm text-center">
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed italic">{selectedTicket.description}</p>
                      {selectedTicket.image && (
                        <div className="mt-6 rounded-2xl overflow-hidden border border-slate-100 max-w-xs mx-auto shadow-lg">
                          <img src={selectedTicket.image} className="w-full h-auto" alt="Attached Document" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {selectedTicket.messages?.map((msg, mIdx) => (
                    <div key={msg.id} className={`flex ${isAdmin ? (msg.admin ? 'justify-end' : 'justify-start') : (msg.admin ? 'justify-start' : 'justify-end')} animate-in fade-in slide-in-from-bottom-2 duration-500`} style={{ animationDelay: `${mIdx * 30}ms` }}>
                      <div className={`max-w-[80%] px-5 py-3.5 rounded-[1.8rem] shadow-sm ${msg.admin ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200' : 'bg-primary text-white'}`}>
                        <p className="text-sm font-bold leading-relaxed">{msg.message}</p>
                        <div className="flex justify-end mt-1">
                          <span className="text-[8px] opacity-40 font-black  tabular-nums">{formatDate(msg.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
               </div>
               
               {selectedTicket.status === 'OPEN' && (
                 <div className="p-6 border-t border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                    <form onSubmit={handleSendMessage} className="flex gap-4">
                      <input 
                        type="text" 
                        value={newMessage} 
                        onChange={(e) => setNewMessage(e.target.value)} 
                        placeholder={t.complaints.messagePlaceholder} 
                        className="flex-1 h-14 px-6 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-bold outline-none focus:border-primary transition-all shadow-inner text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium" 
                      />
                      <button 
                        type="submit" 
                        disabled={isSending || !newMessage.trim()} 
                        className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50 transition-all"
                      >
                        {isSending ? (
                          <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <span className="material-symbols-outlined text-xl rtl-flip">send</span>
                        )}
                      </button>
                    </form>
                 </div>
               )}
             </>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-20">
               <span className="material-symbols-outlined text-8xl text-primary mb-8">chat_bubble</span>
               <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">{lang === 'ar' ? 'اختر تذكرة لمراجعتها' : 'Select a ticket to view'}</h3>
             </div>
           )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-[90%] md:w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-2xl">add_comment</span></div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">{t.complaints.addNew}</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">Subject, description & attachment</p>
                    </div>
                 </div>
                 <button onClick={() => setIsCreateModalOpen(false)} className="size-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-xl">close</span></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <form id="ticketForm" onSubmit={handleCreateTicket} className="space-y-5">
                   <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.complaints.subject}</label>
                      <input
                        required
                        type="text"
                        value={newTicket.subject}
                        onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                        placeholder={t.complaints.subjectPlaceholder}
                        className={`w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:border-primary outline-none transition-all shadow-inner text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.complaints.description}</label>
                      <textarea
                        required
                        value={newTicket.description}
                        onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                        placeholder={t.complaints.descriptionPlaceholder}
                        className={`w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:border-primary outline-none transition-all shadow-inner min-h-[120px] text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.complaints.image}</label>
                      {!preview ? (
                        <div onClick={() => fileInputRef.current?.click()} className="h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer border-slate-200 hover:border-primary bg-slate-50/50 dark:bg-slate-800/50">
                          <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">add_a_photo</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase">{lang === 'ar' ? 'إرفاق لقطة شاشة' : 'Attach screenshot'}</span>
                        </div>
                      ) : (
                        <div className="relative h-40 rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 group">
                          <img src={preview} className="size-full object-cover" alt="" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button type="button" onClick={() => { setSelectedFile(null); setPreview(null); }} className="size-10 bg-red-500 text-white rounded-full shadow-lg flex items-center justify-center"><span className="material-symbols-outlined">delete</span></button>
                          </div>
                        </div>
                      )}
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                   </div>
                </form>
              </div>

              <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
                 <button form="ticketForm" type="submit" disabled={isProcessing} className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">
                   {isProcessing ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>{lang === 'ar' ? 'إرسال التذكرة' : 'Dispatch Ticket'}<span className="material-symbols-outlined">verified</span></>}
                 </button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 154, 167, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Complaints;
