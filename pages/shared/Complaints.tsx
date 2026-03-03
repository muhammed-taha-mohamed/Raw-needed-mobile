
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { Complaint, ComplaintMessage } from '../../types';
import EmptyState from '../../components/EmptyState';
import FloatingLabelInput, { FloatingLabelTextarea } from '../../components/FloatingLabelInput';

const Complaints: React.FC = () => {
  const { lang, t } = useLanguage();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  // Detail & Chat State
  const [selectedTicket, setSelectedTicket] = useState<Complaint | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [messageImageFile, setMessageImageFile] = useState<File | null>(null);
  const [messageImagePreview, setMessageImagePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isClosingTicket, setIsClosingTicket] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messageImageInputRef = useRef<HTMLInputElement>(null);

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
    if (userRole) fetchComplaints();
  }, [userRole]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedTicket?.messages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';

  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      const endpoint = isAdmin
        ? `/api/v1/complaints/admin/all?page=0&size=500`
        : `/api/v1/complaints/my-complaints?page=0&size=500`;
      const response = await api.get<any>(endpoint);
      const data = response.data || response;
      const list: Complaint[] = data.content || [];
      setComplaints(list);
    } catch (err) {
      console.error("Fetch complaints failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ترتيب: آخر شكوى فيها رسالة (أحدث نشاط) تكون الأولى
  const sortedComplaints = useMemo(() => {
    return [...complaints].sort((a, b) => {
      const lastActivity = (c: Complaint) => {
        const msgs = c.messages;
        if (msgs?.length) return new Date(msgs[msgs.length - 1].createdAt).getTime();
        return new Date(c.updatedAt || c.createdAt).getTime();
      };
      return lastActivity(b) - lastActivity(a);
    });
  }, [complaints]);

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
      fetchComplaints();
    } catch (err) { console.error(err); } finally { setIsProcessing(false); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || (!newMessage.trim() && !messageImageFile)) return;
    setIsSending(true);
    try {
      let imageUrl: string | null = null;
      if (messageImageFile) {
        const formData = new FormData();
        formData.append('file', messageImageFile);
        imageUrl = await api.post<string>('/api/v1/image/upload', formData);
      }
      const response = await api.post<ComplaintMessage>(`/api/v1/complaints/${selectedTicket.id}/messages`, {
        message: newMessage.trim() || (imageUrl ? ' ' : ''),
        image: imageUrl
      });
      setSelectedTicket(prev => prev ? { ...prev, messages: [...(prev.messages || []), response] } : null);
      setNewMessage('');
      setMessageImageFile(null);
      setMessageImagePreview(null);
    } catch (err) { console.error(err); } finally { setIsSending(false); }
  };

  const handleMessageImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMessageImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setMessageImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCloseComplaint = async () => {
    if (!selectedTicket || selectedTicket.status === 'CLOSED' || !isAdmin) return;
    setIsClosingTicket(true);
    try {
      const complaint = await api.put<Complaint>(`/api/v1/complaints/${selectedTicket.id}/close`, {});
      setSelectedTicket(complaint);
      setComplaints(prev => prev.map(c => c.id === complaint.id ? complaint : c));
    } catch (err) {
      console.error(err);
    } finally {
      setIsClosingTicket(false);
    }
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

  // اليوم الساعة كذا / الأمس الساعة كذا / أو التاريخ الكامل
  const formatMessageDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const timeStr = date.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    if (msgDay.getTime() === today.getTime()) {
      return lang === 'ar' ? `اليوم الساعة ${timeStr}` : `Today at ${timeStr}`;
    }
    if (msgDay.getTime() === yesterday.getTime()) {
      return lang === 'ar' ? `الأمس الساعة ${timeStr}` : `Yesterday at ${timeStr}`;
    }
    return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const AUTO_REPLY_KEY = 'COMPLAINT_AUTO_REPLY';

  // Messenger/WhatsApp Desktop: on mobile show either list or chat (back clears selection)
  const showList = !selectedTicket;
  const showChat = !!selectedTicket;

  return (
    <div className="w-full mt-4 md:mt-5 h-[calc(100vh-7.5rem)] md:h-[calc(100vh-6.5rem)] min-h-[420px] flex animate-in fade-in duration-500 font-display overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
      {/* Left: Conversation list (sidebar) - hidden on mobile when chat is open */}
      <aside className={`flex flex-col w-full md:w-[340px] lg:w-[380px] shrink-0 border-slate-200 dark:border-slate-800 md:border-r bg-slate-50/50 dark:bg-slate-900/50 ${showChat ? 'hidden md:flex' : 'flex'}`}>
        {/* Sidebar header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white truncate">
              {isAdmin ? (lang === 'ar' ? 'الشكاوى' : 'Complaints') : t.complaints.title}
            </h2>
            {!isAdmin && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="size-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/25 hover:bg-primary/90 active:scale-95 transition-all shrink-0"
                title={t.complaints.addNew}
              >
                <span className="material-symbols-outlined text-xl">edit_square</span>
              </button>
            )}
          </div>
        </div>
        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          {isLoading && complaints.length === 0 ? (
            <div className="py-16 flex justify-center">
              <div className="size-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-6">
              <EmptyState title={t.complaints.empty} subtitle={!isAdmin ? (lang === 'ar' ? 'افتح تذكرة جديدة للحصول على المساعدة.' : 'Open a new ticket to get assistance.') : undefined} />
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {sortedComplaints.map((ticket) => {
                const lastMsg = ticket.messages?.length ? ticket.messages[ticket.messages.length - 1] : null;
                const preview = lastMsg ? lastMsg.message : ticket.description;
                const isSelected = selectedTicket?.id === ticket.id;
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${isSelected ? 'bg-primary/15 dark:bg-primary/20 border border-primary/30' : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'}`}
                  >
                    <div className={`size-12 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                      <span className="material-symbols-outlined text-2xl">support_agent</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`text-sm font-black truncate ${isSelected ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                          {isAdmin ? (ticket.userName || ticket.subject) : ticket.subject}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 tabular-nums shrink-0">{formatDate(lastMsg?.createdAt || ticket.createdAt)}</span>
                      </div>
                      {isAdmin && ticket.userName && (
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">{ticket.subject}</p>
                      )}
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {(lastMsg?.message === AUTO_REPLY_KEY ? t.complaints.autoReply : preview) || '—'}
                      </p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-black ${ticket.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-600 dark:text-slate-400'}`}>
                        {ticket.status === 'OPEN' ? t.complaints.statusOpen : t.complaints.statusClosed}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Right: Chat area (Messenger/WhatsApp style) */}
      <main className={`flex-1 flex flex-col min-w-0 bg-slate-50/30 dark:bg-slate-800/20 ${showChat ? 'flex' : 'hidden md:flex'}`}>
        {selectedTicket ? (
          <>
            {/* Chat header */}
            <header className="h-16 px-4 flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
              <button type="button" onClick={() => setSelectedTicket(null)} className="md:hidden size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center shrink-0" aria-label="Back">
                <span className="material-symbols-outlined text-2xl text-slate-600 dark:text-slate-300 rtl-flip">arrow_back</span>
              </button>
              <div className="size-10 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">forum</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {isAdmin ? (selectedTicket.userName || selectedTicket.subject) : selectedTicket.subject}
                </h3>
                <p className="text-[10px] font-bold text-slate-400">
                  {isAdmin && selectedTicket.userName ? `${selectedTicket.subject} · ` : ''}#{selectedTicket.id.slice(-8).toUpperCase()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${selectedTicket.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-600 dark:text-slate-400'}`}>
                  {selectedTicket.status === 'OPEN' ? t.complaints.statusOpen : t.complaints.statusClosed}
                </span>
                {isAdmin && selectedTicket.status === 'OPEN' && (
                  <button
                    type="button"
                    onClick={handleCloseComplaint}
                    disabled={isClosingTicket}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-black bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-all disabled:opacity-50"
                    title={t.complaints.closeTicket}
                  >
                    {isClosingTicket ? (lang === 'ar' ? 'جاري...' : '...') : (lang === 'ar' ? 'إغلاق الشكوى' : 'Close ticket')}
                  </button>
                )}
              </div>
            </header>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0">
              {selectedTicket.messages?.map((msg) => {
                const isMe = isAdmin ? msg.admin : !msg.admin;
                const displayText = msg.message === AUTO_REPLY_KEY ? t.complaints.autoReply : msg.message;
                const showSenderName = msg.admin && msg.userName;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${showSenderName ? 'gap-0.5' : ''}`}>
                    {showSenderName && (
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1">{msg.userName}</span>
                    )}
                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`w-fit max-w-[75%] md:max-w-[65%] px-4 py-2.5 rounded-2xl ${isMe ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700'} shadow-sm`}>
                        {msg.image && (
                          <button type="button" onClick={() => setLightboxImage(msg.image!)} className="rounded-xl overflow-hidden border border-white/20 dark:border-slate-600 mb-2 max-w-[220px] block text-left focus:outline-none focus:ring-2 focus:ring-primary/50">
                            <img src={msg.image} className="w-full h-auto object-cover cursor-pointer hover:opacity-95 transition-opacity" alt="" />
                          </button>
                        )}
                        {displayText.trim() ? <p className="text-sm font-bold leading-relaxed break-words">{displayText}</p> : null}
                        <p className={`text-[10px] mt-1 tabular-nums ${isMe ? 'text-white/70' : 'text-slate-400'}`}>{formatMessageDate(msg.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            {/* Input bar (fixed at bottom of chat) */}
            {selectedTicket.status === 'OPEN' && (
              <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
                {messageImagePreview && (
                  <div className="mb-2 relative inline-block">
                    <img src={messageImagePreview} alt="" className="h-20 w-20 object-cover rounded-xl border-2 border-primary/30" />
                    <button type="button" onClick={() => { setMessageImageFile(null); setMessageImagePreview(null); }} className="absolute -top-1.5 -right-1.5 size-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg" aria-label="Remove">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                  <input type="file" ref={messageImageInputRef} className="hidden" accept="image/*" onChange={handleMessageImageChange} />
                  <button type="button" onClick={() => messageImageInputRef.current?.click()} className="size-12 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-primary hover:text-primary flex items-center justify-center transition-all shrink-0" title={lang === 'ar' ? 'إرفاق صورة' : 'Attach image'}>
                    <span className="material-symbols-outlined text-xl">add_photo_alternate</span>
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t.complaints.messagePlaceholder}
                    className="flex-1 min-w-0 h-12 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:border-primary transition-all text-sm placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={isSending || (!newMessage.trim() && !messageImageFile)}
                    className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/25 active:scale-95 disabled:opacity-50 transition-all shrink-0"
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
          /* Empty state when no ticket selected (desktop) */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <span className="material-symbols-outlined text-7xl mb-4 opacity-50">chat_bubble_outline</span>
            <p className="text-sm font-black text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'اختر تذكرة من القائمة' : 'Select a ticket from the list'}</p>
          </div>
        )}
      </main>

      {/* New Ticket Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full md:w-[90%] md:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-xl shadow-2xl border-t border-x md:border border-primary/20 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
             
             {/* Drag Handle - Mobile Only */}
             <div className="md:hidden pt-3 pb-2 flex justify-center shrink-0 cursor-grab active:cursor-grabbing" onTouchStart={(e) => {
               const startY = e.touches[0].clientY;
               const modal = e.currentTarget.closest('.fixed')?.querySelector('.w-full') as HTMLElement;
               if (!modal) return;
               
               const handleMove = (moveEvent: TouchEvent) => {
                 const currentY = moveEvent.touches[0].clientY;
                 const diff = currentY - startY;
                 if (diff > 0) {
                   modal.style.transform = `translateY(${diff}px)`;
                   modal.style.transition = 'none';
                 }
               };
               
               const handleEnd = () => {
                 const finalY = modal.getBoundingClientRect().top;
                 if (finalY > window.innerHeight * 0.3) {
                   setIsCreateModalOpen(false);
                 } else {
                   modal.style.transform = '';
                   modal.style.transition = '';
                 }
                 document.removeEventListener('touchmove', handleMove);
                 document.removeEventListener('touchend', handleEnd);
               };
               
               document.addEventListener('touchmove', handleMove);
               document.addEventListener('touchend', handleEnd);
             }}>
               <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
             </div>
             
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-2xl">add_comment</span></div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">{t.complaints.addNew}</h3>
                       <p className="text-[10px] font-black text-slate-400 mt-2">{t.complaints.subjectDescriptionAttachment}</p>
                    </div>
                 </div>
                 <button onClick={() => setIsCreateModalOpen(false)} className="size-8 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-xl">close</span></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <form id="ticketForm" onSubmit={handleCreateTicket} className="space-y-5">
                   <FloatingLabelInput
                     required
                     type="text"
                     label={t.complaints.subjectPlaceholder}
                     value={newTicket.subject}
                     onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                     placeholder={t.complaints.subjectPlaceholder}
                     isRtl={lang === 'ar'}
                   />
                   <FloatingLabelTextarea
                     required
                     label={t.complaints.descriptionPlaceholder}
                     value={newTicket.description}
                     onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                     placeholder={t.complaints.descriptionPlaceholder}
                   />
                   <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-500 px-1">{t.complaints.image}</label>
                      {!preview ? (
                        <div onClick={() => fileInputRef.current?.click()} className="h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer border-slate-200 hover:border-primary bg-slate-50/50 dark:bg-slate-800/50">
                          <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">add_a_photo</span>
                          <span className="text-[9px] font-black text-slate-400">{lang === 'ar' ? 'إرفاق لقطة شاشة' : 'Attach screenshot'}</span>
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
                 <button form="ticketForm" type="submit" disabled={isProcessing} className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">
                   {isProcessing ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>{lang === 'ar' ? 'إرسال التذكرة' : 'Dispatch Ticket'}<span className="material-symbols-outlined">verified</span></>}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Image lightbox - click to open, click overlay or close to dismiss */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'ar' ? 'عرض الصورة' : 'View image'}
        >
          <button type="button" onClick={() => setLightboxImage(null)} className="absolute top-4 right-4 size-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-10" aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}>
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
          <img src={lightboxImage} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
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
