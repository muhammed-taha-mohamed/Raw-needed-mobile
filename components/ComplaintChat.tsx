import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../App';
import { api } from '../api';
import { ComplaintMessage } from '../types';
import { fetchComplaintMessages, subscribeToComplaintMessages, sendComplaintMessage } from '../services/realtimeChat';

interface ComplaintChatProps {
  complaintId: string;
  subject: string;
  isOpen: boolean;
  onClose: () => void;
  ticketRef?: string;
}

const ComplaintChat: React.FC<ComplaintChatProps> = ({ complaintId, subject, isOpen, onClose, ticketRef }) => {
  const { lang, t } = useLanguage();
  const [messages, setMessages] = useState<ComplaintMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const fetchFallbackRef = useRef<number | null>(null);
  const loadedRef = useRef(false);
  const retryRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      if (isOpen) {
        (window as any).__activeComplaintId = complaintId;
      }
    } catch { }
    return () => {
      try {
        if ((window as any).__activeComplaintId === complaintId) {
          (window as any).__activeComplaintId = null;
        }
      } catch { }
    };
  }, [isOpen, complaintId]);

  useEffect(() => {
    if (!isOpen) {
      if (unsubscribeRef.current) {
        try { unsubscribeRef.current(); } catch { }
        unsubscribeRef.current = null;
      }
      if (fetchFallbackRef.current) { clearTimeout(fetchFallbackRef.current); fetchFallbackRef.current = null; }
      if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
      loadedRef.current = false;
      return;
    }
    if (unsubscribeRef.current) {
      try { unsubscribeRef.current(); } catch { }
      unsubscribeRef.current = null;
    }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUserId(user.userInfo?.id || user.id || '');
    setIsLoading(true);
    loadedRef.current = false;
    unsubscribeRef.current = subscribeToComplaintMessages(complaintId, (data: any) => {
      if (Array.isArray(data)) {
        const list = data as ComplaintMessage[];
        setMessages(list);
        const ids = new Set<string>();
        for (const m of list) if (m?.id) ids.add(m.id);
        seenIdsRef.current = ids;
        setIsLoading(false);
        loadedRef.current = true;
        if (fetchFallbackRef.current) { clearTimeout(fetchFallbackRef.current); fetchFallbackRef.current = null; }
        if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
        return;
      }
      if (data && data.id && !seenIdsRef.current.has(data.id)) {
        seenIdsRef.current.add(data.id);
        setMessages(prev => [...prev, data]);
        if (data.userId !== (user.userInfo?.id || user.id)) {
          playDing(900);
        }
      }
    });
    // Fallback fetch if snapshot delayed
    fetchFallbackRef.current = window.setTimeout(async () => {
      if (loadedRef.current) return;
      try {
        const list = await fetchComplaintMessages(complaintId);
        if (!loadedRef.current && list.length > 0) {
          setMessages(list);
          const ids = new Set<string>();
          for (const m of list) if (m?.id) ids.add(m.id);
          seenIdsRef.current = ids;
          setIsLoading(false);
          loadedRef.current = true;
        } else if (!loadedRef.current && list.length === 0) {
          retryRef.current = window.setTimeout(async () => {
            if (loadedRef.current) return;
            try {
              const list2 = await fetchComplaintMessages(complaintId);
              setMessages(list2);
              const ids2 = new Set<string>();
              for (const m of list2) if (m?.id) ids2.add(m.id);
              seenIdsRef.current = ids2;
            } finally {
              setIsLoading(false);
              loadedRef.current = true;
            }
          }, 1200);
        }
      } catch {
        retryRef.current = window.setTimeout(async () => {
          if (loadedRef.current) return;
          try {
            const list2 = await fetchComplaintMessages(complaintId);
            setMessages(list2);
            const ids2 = new Set<string>();
            for (const m of list2) if (m?.id) ids2.add(m.id);
            seenIdsRef.current = ids2;
          } finally {
            setIsLoading(false);
            loadedRef.current = true;
          }
        }, 1200);
      }
    }, 1000);
    return () => {
      if (unsubscribeRef.current) {
        try { unsubscribeRef.current(); } catch { }
        unsubscribeRef.current = null;
      }
      if (fetchFallbackRef.current) { clearTimeout(fetchFallbackRef.current); fetchFallbackRef.current = null; }
      if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
      loadedRef.current = false;
    };
  }, [isOpen, complaintId]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < 48;
    setShowScrollDown(!atBottom);
  };

  const fetchMessages = async () => { /* handled by subscription */ };

  const playDing = (ms: number) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const g = ctx.createGain();
      o1.type = 'triangle';
      o2.type = 'sine';
      o1.frequency.value = 880;
      o2.frequency.value = 1320;
      o1.connect(g);
      o2.connect(g);
      g.connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.15, now + 0.05);
      g.gain.linearRampToValueAtTime(0.08, now + 0.2);
      g.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);
      o1.start(now);
      o2.start(now + 0.02);
      o1.stop(now + ms / 1000);
      o2.stop(now + ms / 1000);
    } catch { }
  };

  const handleSendMessage = async (e: React.FormEvent, imageUrl: string | null = null) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !imageUrl) return;
    setIsSending(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user.userInfo?.id || user.id || '';
      const userName = user.userInfo?.name || user.name || 'User';
      const role = (user.userInfo?.role || user.role || '').toUpperCase();
      const admin = role === 'SUPER_ADMIN' || role === 'ADMIN';
      await sendComplaintMessage(complaintId, {
        userId,
        userName,
        admin,
        message: newMessage.trim(),
        image: imageUrl
      });
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
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
      console.error('Image upload failed', err);
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
    <div className={`fixed z-[300] ${lang === 'ar' ? 'left-4' : 'right-4'} bottom-4 w-[calc(100%-2rem)] sm:w-[380px] md:w-[420px]`}>
      <div className={`${isMinimized ? 'h-14' : 'h-[70vh]'} bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden flex flex-col`}>
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/30 dark:bg-slate-800/20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center shadow">
              <span className="material-symbols-outlined text-xl">support_agent</span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900 dark:text-white truncate">{subject}</div>
              <div className="text-[10px] font-bold text-slate-500 truncate">#{(ticketRef || complaintId).slice(-8).toUpperCase()}</div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setIsMinimized(v => !v)} className="size-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary flex items-center justify-center">
              <span className="material-symbols-outlined">{isMinimized ? 'unfold_more' : 'unfold_less'}</span>
            </button>
            <button onClick={onClose} className="size-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-500 flex items-center justify-center">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 custom-scrollbar bg-slate-50/20 dark:bg-slate-800/10 relative" ref={messagesContainerRef} onScroll={handleScroll}>
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30">
                <div className="size-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-black ">{lang === 'ar' ? 'جاري التحميل...' : 'Loading Conversation...'}</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                <span className="material-symbols-outlined text-7xl mb-4">forum</span>
                <h3 className="text-xl font-black">{lang === 'ar' ? 'ابدأ المحادثة' : 'Start the conversation'}</h3>
                <p className="text-sm font-bold">{lang === 'ar' ? 'تواصل مباشرة مع فريق الدعم.' : 'Connect directly with support.'}</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.userId === currentUserId;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                    <div className={`max-w-[85%] space-y-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                      <div className={`px-4 py-3 rounded-2xl shadow-sm ${isOwn
                        ? 'bg-primary text-white rounded-br-md'
                        : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-md'
                        }`}>
                        {msg.message && <p className="text-[13px] md:text-sm font-bold leading-relaxed break-words">{msg.message}</p>}
                        {msg.image && (
                          <div className={`mt-2 rounded-xl overflow-hidden border border-white/20 dark:border-slate-600 shadow-md ${msg.message ? 'max-w-[240px]' : ''}`}>
                            <img src={msg.image} className="w-full h-auto cursor-zoom-in" alt="Chat attachment" onClick={() => window.open(msg.image!, '_blank')} />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 px-2">
                        {!isOwn && <span className="text-[10px] font-bold text-primary">{msg.userName}</span>}
                        <span className="text-[10px] font-bold text-slate-400 tabular-nums">{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
            {showScrollDown && (
              <button
                type="button"
                onClick={scrollToBottom}
                className="absolute bottom-4 right-4 size-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-slate-600 hover:text-primary transition"
                aria-label="Scroll to bottom"
              >
                <span className="material-symbols-outlined">arrow_downward</span>
              </button>
            )}
          </div>
        )}

        {!isMinimized && (
          <div className="p-3 md:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <form onSubmit={(e) => handleSendMessage(e)} className="flex gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
                className="size-12 md:size-14 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center shrink-0 active:scale-95"
              >
                <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

              <div className="flex-1 relative">
                <textarea
                  ref={textAreaRef}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    if (textAreaRef.current) {
                      textAreaRef.current.style.height = 'auto';
                      textAreaRef.current.style.height = Math.min(textAreaRef.current.scrollHeight, 160) + 'px';
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (newMessage.trim()) handleSendMessage(e);
                    }
                  }}
                  placeholder={t.complaints.messagePlaceholder}
                  rows={1}
                  className="w-full min-h-[3rem] max-h-40 pl-4 pr-12 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-bold focus:border-primary outline-none transition-all text-sm md:text-base placeholder:text-xs md:placeholder:text-sm placeholder:font-medium resize-none"
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
        )}
      </div>
    </div>
  );
};

export default ComplaintChat;
