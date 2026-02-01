
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../App';
import { api } from '../api';
import { OrderMessage } from '../types';

interface OrderChatProps {
  orderId: string;
  orderNumber: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

const OrderChat: React.FC<OrderChatProps> = ({ orderId, orderNumber, isOpen, onClose, title }) => {
  const { lang } = useLanguage();
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setCurrentUserId(user.userInfo?.id || user.id || '');
      fetchMessages();
      const interval = setInterval(fetchMessages, 10000); // Polling every 10s
      return () => clearInterval(interval);
    }
  }, [isOpen, orderId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const data = await api.get<OrderMessage[]>(`/api/v1/orders/${orderId}/messages`);
      setMessages(data || []);
    } catch (err) {
      console.error("Failed to fetch order messages", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent, imageUrl: string | null = null) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !imageUrl) return;

    setIsSending(true);
    try {
      const response = await api.post<OrderMessage>(`/api/v1/orders/${orderId}/messages`, {
        message: newMessage,
        image: imageUrl
      });
      setMessages(prev => [...prev, response]);
      setNewMessage('');
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const imageUrl = await api.post<string>('/api/v1/image/upload', formData);
      await handleSendMessage(null as any, imageUrl);
    } catch (err) {
      console.error("Image upload failed", err);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 flex flex-col h-[80vh]">
        
        {/* Chat Header */}
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-2xl">chat_bubble</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white leading-none truncate max-w-[300px]">{title}</h2>
              <p className="text-[10px] font-bold text-slate-500 mt-2 ">Order #{orderNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="size-10 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center border border-slate-100 dark:border-slate-800">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/20 dark:bg-slate-800/10">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
              <div className="size-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
              <p className="text-[10px] font-black ">Loading Conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
               <span className="material-symbols-outlined text-7xl mb-4">forum</span>
               <h3 className="text-xl font-black">{lang === 'ar' ? 'ابدأ المحادثة' : 'Start the conversation'}</h3>
               <p className="text-sm font-bold">{lang === 'ar' ? 'تواصل مباشرة مع الطرف الآخر بخصوص هذا الطلب.' : 'Connect directly about this order.'}</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isOwn = msg.userId === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] space-y-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                    <div className={`px-5 py-3.5 rounded-[1.8rem] shadow-sm ${
                      isOwn 
                      ? 'bg-primary text-white rounded-br-none' 
                      : 'bg-white dark:bg-slate-800 border border-primary/5 text-slate-800 dark:text-slate-200 rounded-bl-none'
                    }`}>
                      {msg.message && <p className="text-sm font-bold leading-relaxed">{msg.message}</p>}
                      {msg.image && (
                        <div className={`mt-2 rounded-xl overflow-hidden border border-white/20 shadow-md ${msg.message ? 'max-w-[240px]' : ''}`}>
                          <img src={msg.image} className="w-full h-auto cursor-zoom-in" alt="Chat attachment" onClick={() => window.open(msg.image!, '_blank')} />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 px-2">
                       {!isOwn && <span className="text-[9px] font-black text-primary   ">{msg.userOrganizationName || msg.userName}</span>}
                       <span className="text-[9px] font-bold text-slate-400    tabular-nums">{formatTime(msg.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <form onSubmit={(e) => handleSendMessage(e)} className="flex gap-3">
             <button 
               type="button"
               onClick={() => fileInputRef.current?.click()}
               disabled={isSending}
               className="size-14 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center shrink-0 active:scale-95"
             >
                <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
             </button>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
             
             <div className="flex-1 relative">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={lang === 'ar' ? 'اكتب رسالتك...' : 'Type your message...'}
                  className="w-full h-14 pl-6 pr-14 py-4 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-bold focus:border-primary outline-none transition-all shadow-inner"
                />
                <button 
                   type="submit"
                   disabled={isSending || (!newMessage.trim())}
                   className={`absolute ${lang === 'ar' ? 'left-2' : 'right-2'} top-2 size-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg transition-all active:scale-90 disabled:opacity-30`}
                >
                   {isSending ? (
                     <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   ) : (
                     <span className="material-symbols-outlined text-xl rtl-flip">send</span>
                   )}
                </button>
             </div>
          </form>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 154, 167, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default OrderChat;
