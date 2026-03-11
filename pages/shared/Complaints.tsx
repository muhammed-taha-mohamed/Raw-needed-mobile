
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { Complaint, ComplaintMessage } from '../../types';
import EmptyState from '../../components/EmptyState';
import FloatingLabelInput, { FloatingLabelTextarea } from '../../components/FloatingLabelInput';
import PaginationFooter from '../../components/PaginationFooter';
import ComplaintChat from '../../components/ComplaintChat';
import { useToast } from '../../contexts/ToastContext';

const Complaints: React.FC = () => {
  const { lang, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  const [selectedTicket, setSelectedTicket] = useState<Complaint | null>(null);
  const [chatTicket, setChatTicket] = useState<Complaint | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isClosingTicket, setIsClosingTicket] = useState(false);
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // New Ticket Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', image: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const [confirmAction, setConfirmAction] = useState<{ type: 'close' | 'delete'; id: string } | null>(null);
  const lastHandledDeepLinkRef = useRef('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const parsedUser = JSON.parse(userStr);
      setUserRole((parsedUser.role || ''));
      setCurrentUserId(parsedUser.userInfo?.id || parsedUser.id || '');
    }
  }, []);

  useEffect(() => {
    if (userRole) fetchComplaints();
  }, [userRole, currentPage, pageSize, statusFilter]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';

  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      const baseEndpoint = isAdmin
        ? `/api/v1/complaints/admin/all?page=${currentPage}&size=${pageSize}`
        : `/api/v1/complaints/my-complaints?page=${currentPage}&size=${pageSize}`;
      const endpoint = statusFilter === 'ALL' ? baseEndpoint : `${baseEndpoint}&status=${statusFilter}`;
      const response = await api.get<any>(endpoint);
      const data = response.data || response;
      const list: Complaint[] = data.content || [];
      setComplaints(list);
      setTotalPages(data.totalPages ?? 0);
      setTotalElements(data.totalElements ?? (Array.isArray(list) ? list.length : 0));
      setUnreadCounts(computeUnread(list));
    } catch (err) {
      console.error("Fetch complaints failed", err);
      setComplaints([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setIsLoading(false);
    }
  };

  const computeUnread = (list: Complaint[]) => {
    const m: Record<string, number> = {};
    const readMapStr = localStorage.getItem('complaintsReadAt') || '{}';
    const readMap = JSON.parse(readMapStr || '{}') as Record<string, string>;
    const isAdminUser = isAdmin;
    for (const c of list) {
      const last = (c.messages && c.messages.length > 0) ? c.messages[c.messages.length - 1] : null;
      if (!last) { m[c.id] = 0; continue; }
      const readAt = readMap[c.id] ? new Date(readMap[c.id]).getTime() : 0;
      const lastTime = new Date(last.createdAt).getTime();
      const isFromOtherSide = isAdminUser ? !last.admin : last.admin;
      m[c.id] = (lastTime > readAt && isFromOtherSide) ? 1 : 0;
    }
    return m;
  };

  const markRead = (complaintId: string) => {
    const now = new Date().toISOString();
    const readMapStr = localStorage.getItem('complaintsReadAt') || '{}';
    const readMap = JSON.parse(readMapStr || '{}') as Record<string, string>;
    readMap[complaintId] = now;
    localStorage.setItem('complaintsReadAt', JSON.stringify(readMap));
    setUnreadCounts(prev => ({ ...prev, [complaintId]: 0 }));
  };

  // ترتيب: آخر شكوى فيها رسالة (أحدث نشاط) تكون الأولى
  const sortedComplaints = useMemo(() => {
    const filtered = complaints.filter(c => statusFilter === 'ALL' ? true : c.status === statusFilter);
    return [...filtered].sort((a, b) => {
      const lastActivity = (c: Complaint) => {
        const msgs = c.messages;
        if (msgs?.length) return new Date(msgs[msgs.length - 1].createdAt).getTime();
        return new Date(c.updatedAt || c.createdAt).getTime();
      };
      return lastActivity(b) - lastActivity(a);
    });
  }, [complaints, statusFilter]);

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
  const closeComplaintById = async (id: string) => {
    setIsClosingTicket(true);
    try {
      const complaint = await api.put<Complaint>(`/api/v1/complaints/${id}/close`, {});
      setComplaints(prev => prev.map(c => c.id === complaint.id ? complaint : c));
      showToast(lang === 'ar' ? 'تم إغلاق الشكوى بنجاح' : 'Ticket closed successfully', 'success');
    } catch (err) {
      console.error(err);
      showToast(lang === 'ar' ? 'فشل إغلاق الشكوى' : 'Failed to close ticket', 'error');
    } finally {
      setIsClosingTicket(false);
    }
  };

  const handleDeleteComplaint = async () => {
    if (!selectedTicket || selectedTicket.status !== 'CLOSED') return;
    const ok = await confirmDialog({
      variant: 'danger',
      title: lang === 'ar' ? 'حذف الشكوى؟' : 'Delete ticket?',
      message: lang === 'ar' ? 'سيتم حذف الشكوى نهائيًا. لا يمكن التراجع.' : 'Ticket will be permanently deleted. This cannot be undone.',
      confirmText: lang === 'ar' ? 'حذف' : 'Delete',
      cancelText: lang === 'ar' ? 'إلغاء' : 'Cancel'
    });
    if (!ok) return;
    setIsDeletingTicket(true);
    try {
      await api.delete(`/api/v1/complaints/${selectedTicket.id}`);
      setComplaints(prev => prev.filter(c => c.id !== selectedTicket.id));
      if (chatTicket?.id === selectedTicket.id) setChatTicket(null);
      setSelectedTicket(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingTicket(false);
    }
  };
  const deleteComplaintById = async (id: string) => {
    setIsDeletingTicket(true);
    try {
      await api.delete(`/api/v1/complaints/${id}`);
      setComplaints(prev => prev.filter(c => c.id !== id));
      if (chatTicket?.id === id) setChatTicket(null);
      if (selectedTicket?.id === id) setSelectedTicket(null);
      showToast(lang === 'ar' ? 'تم حذف الشكوى' : 'Ticket deleted', 'success');
    } catch (err) {
      console.error(err);
      showToast(lang === 'ar' ? 'فشل حذف الشكوى' : 'Failed to delete ticket', 'error');
    } finally {
      setIsDeletingTicket(false);
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

  const AUTO_REPLY_KEY = 'COMPLAINT_AUTO_REPLY';

  useEffect(() => {
    const complaintId = searchParams.get('complaintId') || '';
    const openChat = searchParams.get('openChat') === '1';
    const navTs = searchParams.get('navTs') || '';

    if (!complaintId) return;

    const deepLinkKey = `${complaintId}|${openChat}|${navTs}`;
    if (lastHandledDeepLinkRef.current === deepLinkKey) return;

    const openDeepLinkedComplaint = async () => {
      try {
        let targetComplaint = complaints.find((complaint) => complaint.id === complaintId) || null;
        if (!targetComplaint) {
          targetComplaint = await api.get<Complaint>(`/api/v1/complaints/${complaintId}`);
        }
        if (!targetComplaint) return;

        lastHandledDeepLinkRef.current = deepLinkKey;
        markRead(targetComplaint.id);

        if (openChat) {
          setChatTicket(targetComplaint);
          setSelectedTicket(null);
        } else {
          setSelectedTicket(targetComplaint);
          setChatTicket(null);
        }
      } catch (err) {
        console.error('Failed to open complaint deep link', err);
      }
    };

    void openDeepLinkedComplaint();
  }, [searchParams, complaints]);

  return (
    <div className="w-full py-6 animate-in fade-in slide-in-from-bottom-4 duration-700 font-display relative pb-32 md:pb-8">
      <div className="hidden md:block mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-primary/20 dark:border-primary/10 shadow-lg overflow-hidden">
          <div className="h-[90vh] flex flex-col">
            <div className="flex-shrink-0 bg-primary/10 dark:bg-primary/5 border-b-2 border-primary/20 px-6 py-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="material-symbols-outlined text-lg text-primary">filter_list</span>
                <span className="text-xs font-black text-slate-400">{lang === 'ar' ? 'الحالة:' : 'Status:'}</span>
                {[
                  { id: 'ALL', label: lang === 'ar' ? 'الكل' : 'All' },
                  { id: 'OPEN', label: t.complaints.statusOpen },
                  { id: 'CLOSED', label: t.complaints.statusClosed }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setStatusFilter(opt.id as any); setCurrentPage(0); }}
                    className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${statusFilter === opt.id
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary border border-primary/20'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
                {!isAdmin && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="ms-auto px-4 py-2 rounded-xl bg-primary text-white font-black shadow-md shadow-primary/20 hover:bg-slate-900 dark:hover:bg-slate-800 transition-all active:scale-95"
                  >
                    {t.complaints.addNew}
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30">
              {isLoading && complaints.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40">
                  <div className="size-10 border-[3px] border-primary/10 border-t-primary rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-400 font-black text-xs opacity-50">Loading...</p>
                </div>
              ) : sortedComplaints.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <EmptyState title={t.complaints.empty} subtitle={!isAdmin ? (lang === 'ar' ? 'افتح تذكرة جديدة للحصول على المساعدة.' : 'Open a new ticket to get assistance.') : undefined} />
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {sortedComplaints.map(ticket => {
                    const lastMsg = ticket.messages?.length ? ticket.messages[ticket.messages.length - 1] : null;
                    const preview = lastMsg ? lastMsg.message : ticket.description;
                    const statusCls = ticket.status === 'OPEN'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : 'bg-slate-100 text-slate-600 border-slate-200';
                    return (
                      <div key={ticket.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group">
                        <div className={`size-12 rounded-2xl flex items-center justify-center border shrink-0 transition-all ${statusCls} group-hover:scale-105 shadow-inner`}>
                          <span className="material-symbols-outlined text-xl">support_agent</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                            <h3 className="text-base font-black text-slate-800 dark:text-white truncate">{isAdmin ? (ticket.userName || ticket.subject) : ticket.subject}</h3>
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${statusCls}`}>{ticket.status === 'OPEN' ? t.complaints.statusOpen : t.complaints.statusClosed}</span>
                            {unreadCounts[ticket.id] > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black">{unreadCounts[ticket.id]}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">calendar_today</span> {formatDate(lastMsg?.createdAt || ticket.createdAt)}</span>
                            {isAdmin && ticket.userName && (<><span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></span><span className="text-primary">{ticket.subject}</span></>)}
                          </div>
                          <p className="text-xs mt-1 text-slate-500 dark:text-slate-400 truncate">{(lastMsg?.message === AUTO_REPLY_KEY ? t.complaints.autoReply : preview) || '—'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {(ticket.status === 'OPEN' && (isAdmin || ticket.userId === currentUserId)) && (
                            <button
                      onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'close', id: ticket.id }); }}
                              className="size-10 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all active:scale-95"
                              title={t.complaints.closeTicket}
                            >
                              <span className="material-symbols-outlined text-lg">lock</span>
                            </button>
                          )}
                          {ticket.status === 'CLOSED' && (
                            <button
                      onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'delete', id: ticket.id }); }}
                              className="size-10 rounded-xl border border-slate-100 dark:border-slate-800 text-red-500 hover:text-white hover:bg-red-600 transition-all active:scale-95"
                              title={lang === 'ar' ? 'حذف الشكوى' : 'Delete complaint'}
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          )}
                          <button
                            onClick={() => { setSelectedTicket(ticket); markRead(ticket.id); }}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-black text-xs hover:bg-slate-900 dark:hover:bg-slate-800 transition-all active:scale-95 whitespace-nowrap shadow-md shadow-primary/10"
                          >
                            <span className="material-symbols-outlined text-base">visibility</span>
                            {lang === 'ar' ? 'التفاصيل' : 'Details'}
                          </button>
                          <button
                            onClick={() => { setChatTicket(ticket); markRead(ticket.id); }}
                            className="size-10 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                            title={lang === 'ar' ? 'دردشة' : 'Chat'}
                          >
                            <span className="material-symbols-outlined text-xl">forum</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <PaginationFooter
              currentPage={currentPage}
              totalPages={totalPages}
              totalElements={totalElements}
              pageSize={pageSize}
              onPageChange={(p) => { if (p >= 0 && p < totalPages) setCurrentPage(p); }}
              currentCount={complaints.length}
              asTableFooter
            />
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        <div className="min-h-[400px] mb-6">
          {isLoading && complaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40">
              <div className="size-10 border-[3px] border-primary/10 border-t-primary rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400 font-black text-[10px] md:text-xs opacity-50">Loading...</p>
            </div>
          ) : sortedComplaints.length === 0 ? (
            <div className="flex flex-col items-center gap-4">
              <EmptyState title={t.complaints.empty} subtitle={!isAdmin ? (lang === 'ar' ? 'افتح تذكرة جديدة للحصول على المساعدة.' : 'Open a new ticket to get assistance.') : undefined} />
              {!isAdmin && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-6 py-3 rounded-2xl bg-primary text-white font-black shadow-lg active:scale-95"
                >
                  {lang === 'ar' ? 'تذكرة جديدة' : 'New Ticket'}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {sortedComplaints.map((ticket, idx) => {
                const statusCls = ticket.status === 'OPEN'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  : 'bg-slate-100 text-slate-600 border-slate-200';
                const lastMsg = ticket.messages?.length ? ticket.messages[ticket.messages.length - 1] : null;
                const preview = lastMsg ? lastMsg.message : ticket.description;
                return (
                  <div
                    key={ticket.id}
                    className="bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row items-center gap-3 group animate-in slide-in-from-bottom-2"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <div className="flex items-center gap-3.5 flex-1 w-full">
                      <div className={`size-11 rounded-2xl flex items-center justify-center border shrink-0 transition-all duration-500 ${statusCls} group-hover:scale-105 shadow-inner`}>
                        <span className="material-symbols-outlined text-lg">support_agent</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 mb-1">
                          <h3 className="text-sm md:text-base font-black text-slate-800 dark:text-white truncate">
                            {isAdmin ? (ticket.userName || ticket.subject) : ticket.subject}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] md:text-xs font-black border ${statusCls}`}>
                            {ticket.status === 'OPEN' ? t.complaints.statusOpen : t.complaints.statusClosed}
                          </span>
                          {unreadCounts[ticket.id] > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black">{unreadCounts[ticket.id]}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] md:text-xs font-bold text-slate-400">
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">calendar_today</span> <span className="font-black text-slate-600 dark:text-slate-300">{formatDate(lastMsg?.createdAt || ticket.createdAt)}</span></span>
                          {isAdmin && ticket.userName && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                              <span className="text-primary truncate">{ticket.subject}</span>
                            </>
                          )}
                        </div>
                        <p className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 truncate">
                          {(preview) || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                      {(ticket.status === 'OPEN' && (isAdmin || ticket.userId === currentUserId)) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'close', id: ticket.id }); }}
                          className="size-9 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all active:scale-90"
                          title={t.complaints.closeTicket}
                        >
                          <span className="material-symbols-outlined text-base">lock</span>
                        </button>
                      )}
                      {ticket.status === 'CLOSED' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'delete', id: ticket.id }); }}
                          className="size-9 rounded-xl border border-slate-100 dark:border-slate-800 text-red-500 hover:text-white hover:bg-red-600 transition-all active:scale-90"
                          title={lang === 'ar' ? 'حذف الشكوى' : 'Delete complaint'}
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      )}
                      <button
                        onClick={() => { setSelectedTicket(ticket); markRead(ticket.id); }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-black text-[10px] md:text-xs hover:bg-slate-900 dark:hover:bg-slate-800 transition-all active:scale-95 whitespace-nowrap shadow-md shadow-primary/10"
                      >
                        <span className="material-symbols-outlined text-base">visibility</span>
                        {lang === 'ar' ? 'التفاصيل' : 'Details'}
                      </button>
                      <button
                        onClick={() => { setChatTicket(ticket); markRead(ticket.id); }}
                        className="size-9 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                        title={lang === 'ar' ? 'دردشة' : 'Chat'}
                      >
                        <span className="material-symbols-outlined text-lg">forum</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Filter FAB - Mobile only */}
        <div className="fixed bottom-32 left-0 right-0 z-[130] pointer-events-none px-6">
          <div className="w-full flex flex-col items-end pointer-events-auto">
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="size-14 rounded-full bg-primary text-white flex items-center justify-center shadow-2xl transition-all active:scale-90 border-2 border-white/20"
              >
                <span className="material-symbols-outlined text-2xl">tune</span>
                {statusFilter !== 'ALL' && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white size-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-slate-900 shadow-md">
                    1
                  </span>
                )}
              </button>
              {!isAdmin && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="size-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-2xl transition-all active:scale-90 border-2 border-white/20 absolute -top-20 end-0"
                  title={lang === 'ar' ? 'تذكرة جديدة' : 'New Ticket'}
                >
                  <span className="material-symbols-outlined text-2xl">edit_square</span>
                </button>
              )}

              {showFilterMenu && (
                <div className={`absolute bottom-full mb-4 z-[250] w-60 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-4 animate-in fade-in slide-in-from-bottom-2 duration-200 ${lang === 'ar' ? 'left-0' : 'right-0'}`}>
                  <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-[10px] font-black  text-slate-400">{lang === 'ar' ? 'تصفية الحالة' : 'Status Filter'}</h3>
                    {statusFilter !== 'ALL' && (
                      <button onClick={() => { setStatusFilter('ALL'); setShowFilterMenu(false); }} className="text-[10px] font-black text-red-500   ">{lang === 'ar' ? 'مسح' : 'Clear'}</button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {[
                      { id: 'ALL', label: lang === 'ar' ? 'الكل' : 'All' },
                      { id: 'OPEN', label: t.complaints.statusOpen },
                      { id: 'CLOSED', label: t.complaints.statusClosed }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setStatusFilter(opt.id as any); setCurrentPage(0); setShowFilterMenu(false); }}
                        className={`w-full text-start px-4 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-between ${statusFilter === opt.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                      >
                        {opt.label}
                        {statusFilter === opt.id && <span className="material-symbols-outlined text-base">check</span>}
                      </button>
                    ))}
                  </div>
                  <div className={`absolute -bottom-2 w-4 h-4 bg-white dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-800 rotate-45 ${lang === 'ar' ? 'left-8' : 'right-8'}`}></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Pagination */}
        {totalPages > 0 && (
          <div className="px-4 mb-24">
            <PaginationFooter
              currentPage={currentPage}
              totalPages={totalPages}
              totalElements={totalElements}
              pageSize={pageSize}
              onPageChange={(p) => { if (p >= 0 && p < totalPages) setCurrentPage(p); }}
              currentCount={complaints.length}
            />
          </div>
        )}
      </div>

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

      {/* Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[400] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full md:w-[80vw] md:max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-xl shadow-2xl border-t border-x md:border border-primary/20 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-xl">support_agent</span>
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white leading-none">{isAdmin ? (selectedTicket.userName || selectedTicket.subject) : selectedTicket.subject}</h3>
                  <p className="text-[10px] md:text-xs font-black text-slate-400 mt-1">#{selectedTicket.id.slice(-8).toUpperCase()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && selectedTicket.status === 'OPEN' && (
                  <button
                    onClick={handleCloseComplaint}
                    disabled={isClosingTicket}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black hover:bg-red-50 hover:text-red-600 transition-all"
                  >
                    {isClosingTicket ? (lang === 'ar' ? 'جاري...' : '...') : (lang === 'ar' ? 'إغلاق الشكوى' : 'Close ticket')}
                  </button>
                )}
                {selectedTicket.status === 'CLOSED' && (
                  <button
                    onClick={handleDeleteComplaint}
                    disabled={isDeletingTicket}
                    className="px-3 py-2 rounded-xl bg-red-600 text-white text-[10px] font-black shadow-lg hover:bg-red-700 active:scale-95 transition-all"
                    title={lang === 'ar' ? 'حذف الشكوى' : 'Delete complaint'}
                  >
                    {isDeletingTicket ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (lang === 'ar' ? 'حذف' : 'Delete')}
                  </button>
                )}
                <button onClick={() => setSelectedTicket(null)} className="size-9 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center border border-slate-100 dark:border-slate-800 active:scale-90">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <div className="text-[10px] font-black text-slate-400">{lang === 'ar' ? 'الموضوع' : 'Subject'}</div>
                <div className="text-sm font-black text-slate-900 dark:text-white">{selectedTicket.subject}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-black text-slate-400">{lang === 'ar' ? 'الوصف' : 'Description'}</div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedTicket.description || '-'}</div>
              </div>
              {selectedTicket.image && (
                <div className="space-y-2">
                  <div className="text-[10px] font-black text-slate-400">{lang === 'ar' ? 'مرفق' : 'Attachment'}</div>
                  <button onClick={() => setLightboxImage(selectedTicket.image!)} className="rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-md">
                    <img src={selectedTicket.image} className="w-full max-h-72 object-cover" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[550] flex items-end md:items-center justify-center bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full md:w-[90%] md:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-200">
            <div className="p-6 md:p-7 text-center space-y-4">
              <div className={`mx-auto size-16 rounded-full ${confirmAction.type === 'delete' ? 'bg-red-500' : 'bg-amber-500'} text-white flex items-center justify-center shadow-lg`}>
                <span className="material-symbols-outlined text-3xl">{confirmAction.type === 'delete' ? 'delete' : 'lock'}</span>
              </div>
              <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
                {confirmAction.type === 'delete' ? (lang === 'ar' ? 'حذف الشكوى؟' : 'Delete ticket?') : (lang === 'ar' ? 'إغلاق الشكوى؟' : 'Close ticket?')}
              </h3>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {confirmAction.type === 'delete'
                  ? (lang === 'ar' ? 'لا يمكن التراجع عن الحذف بعد تأكيده.' : 'This action cannot be undone.')
                  : (lang === 'ar' ? 'يمكنك فتح تذكرة جديدة لاحقًا إذا احتجت.' : 'You can open a new ticket later if needed.')}
              </p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setConfirmAction(null)} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black">
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={async () => {
                    const id = confirmAction.id;
                    setConfirmAction(null);
                    if (confirmAction.type === 'delete') await deleteComplaintById(id);
                    else await closeComplaintById(id);
                  }}
                  className={`flex-1 py-3 rounded-2xl text-white font-black ${confirmAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                >
                  {confirmAction.type === 'delete' ? (lang === 'ar' ? 'حذف' : 'Delete') : (lang === 'ar' ? 'إغلاق' : 'Close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image lightbox */}
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

      {chatTicket && (
        <ComplaintChat
          isOpen={!!chatTicket}
          onClose={() => setChatTicket(null)}
          complaintId={chatTicket.id}
          subject={isAdmin ? (chatTicket.userName || chatTicket.subject) : chatTicket.subject}
          ticketRef={chatTicket.id}
        />
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
