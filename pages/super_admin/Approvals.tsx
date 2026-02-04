import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../App';
import { api } from '../../api';

interface PendingSubscription {
  id: string;
  userId: string;
  planId: string;
  planName: string | null;
  userName?: string;
  userImage?: string;
  numberOfUsers: number;
  usedUsers: number;
  remainingUsers: number;
  total: number;
  discount: number;
  finalPrice: number;
  filePath: string;
  status: string;
  submissionDate: string;
}

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

interface ApprovalsProps {
  /** When true, rendered inside another page (e.g. Plans tab) - reduces top padding */
  embedded?: boolean;
}

const Approvals: React.FC<ApprovalsProps> = ({ embedded }) => {
  const { lang, t } = useLanguage();
  const [viewType, setViewType] = useState<'grid' | 'table'>('grid');
  const [requests, setRequests] = useState<PendingSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  // Action States
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  
  // User Info States
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isFetchingUser, setIsFetchingUser] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  // Rejection Modal State
  const [rejectingRequest, setRejectingRequest] = useState<PendingSubscription | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchPendingRequests(currentPage);
  }, [currentPage]);

  const fetchPendingRequests = async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<PaginatedResponse<PendingSubscription>>(
        `/api/v1/admin/user-subscriptions/pending?page=${page}&size=${pageSize}`
      );
      setRequests(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load pending approvals.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    setIsFetchingUser(true);
    setSelectedUser(null);
    setShowUserModal(true);
    try {
      const userData = await api.get<any>(`/api/v1/user/${userId}`);
      setSelectedUser(userData);
    } catch (err: any) {
      alert(err.message || "Failed to load user info.");
      setShowUserModal(false);
    } finally {
      setIsFetchingUser(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await api.post(`/api/v1/admin/user-subscriptions/${id}/approve`, {});
      await fetchPendingRequests(currentPage);
    } catch (err: any) {
      alert(err.message || "Failed to approve request.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingRequest || !rejectionReason.trim()) return;
    
    setProcessingId(rejectingRequest.id);
    try {
      await api.post(`/api/v1/admin/user-subscriptions/${rejectingRequest.id}/reject`, {
        reason: rejectionReason
      });
      await fetchPendingRequests(currentPage);
      setRejectingRequest(null);
      setRejectionReason('');
    } catch (err: any) {
      alert(err.message || "Failed to reject request.");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className={`animate-in fade-in slide-in-from-bottom-4 duration-700 font-display ${embedded ? 'pt-0 pb-6 w-full max-w-full px-0' : 'mx-auto max-w-[1200px] md:max-w-[1600px] px-4 md:px-10 py-6'}`}>
      
      {/* Action Section */}
      <div className="flex items-center justify-end gap-3 mb-8">
        <div className="flex gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button 
            onClick={() => setViewType('grid')}
            className={`p-2 rounded-lg transition-all ${viewType === 'grid' ? 'bg-primary/10 text-primary dark:bg-primary/30 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <span className="material-symbols-outlined text-[22px]">grid_view</span>
          </button>
          <button 
            onClick={() => setViewType('table')}
            className={`p-2 rounded-lg transition-all ${viewType === 'table' ? 'bg-primary/10 text-primary dark:bg-primary/30 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <span className="material-symbols-outlined text-[22px]">view_list</span>
          </button>
        </div>
        <button 
          onClick={() => fetchPendingRequests(currentPage)}
          className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-primary rounded-xl border border-slate-200 dark:border-slate-800 transition-all shadow-sm active:scale-95"
        >
          <span className="material-symbols-outlined">refresh</span>
        </button>
      </div>

      {isLoading && requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white/40 dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
          <div className="h-10 w-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-slate-400 font-bold text-[11px] ">Reviewing submissions...</p>
        </div>
      ) : error ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-lg">
          <span className="material-symbols-outlined text-red-400 text-5xl mb-4">cloud_off</span>
          <h3 className="text-2xl font-black text-slate-700 dark:text-white mb-2">Load Failed</h3>
          <p className="text-slate-500 text-base mb-6">{error}</p>
          <button onClick={() => fetchPendingRequests(currentPage)} className="px-10 py-3 bg-primary text-white rounded-xl font-bold text-base shadow-md active:scale-95">Retry Sync</button>
        </div>
      ) : requests.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center text-center bg-white/40 dark:bg-slate-900/40 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
          <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 mb-6">
            <span className="material-symbols-outlined text-4xl">check_circle</span>
          </div>
          <h3 className="text-xl font-black text-slate-700 dark:text-white">{lang === 'ar' ? 'لا توجد طلبات معلقة' : 'No Pending Requests'}</h3>
          <p className="text-sm text-slate-400 font-medium mt-2">{lang === 'ar' ? 'لقد قمت بمراجعة جميع الطلبات الحالية.' : 'You have reviewed all current subscription requests.'}</p>
        </div>
      ) : (
        <>
          {viewType === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {requests.map((req, idx) => (
                <div 
                  key={req.id} 
                  className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100 dark:border-slate-800 relative group overflow-hidden flex flex-col animate-in zoom-in-95 duration-700"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className={`absolute top-0 ${lang === 'ar' ? 'right-0' : 'left-0'} w-1.5 h-full bg-primary transition-all duration-300`}></div>
                  
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4 items-center min-w-0">
                      <div className="size-11 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0 text-slate-400 shadow-inner overflow-hidden">
                        {req.userImage ? (
                          <img src={req.userImage} className="size-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-xl">person</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-slate-700 dark:text-white text-[17px] leading-tight truncate ">
                          {req.userName || (lang === 'ar' ? 'مستخدم جديد' : 'New User')}
                        </h3>
                        <span className="text-[11px] text-primary font-black  mt-1 block truncate">
                          {req.planName || (lang === 'ar' ? 'خطة اشتراك' : 'Subscription Plan')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-6 flex-grow">
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 font-bold text-[12px]  ">{lang === 'ar' ? 'عدد التراخيص' : 'Seats'}</span>
                      <span className="font-black text-slate-800 dark:text-slate-200 text-sm tabular-nums">{req.numberOfUsers}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 font-bold text-[12px]  ">{lang === 'ar' ? 'السعر قبل الخصم' : 'Base Price'}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-sm tabular-nums">{req.total?.toLocaleString() || '0'}</span>
                        <span className="text-[11px] text-slate-400 font-bold ">{t.plans.currency}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 font-bold text-[12px]  ">{lang === 'ar' ? 'قيمة الخصم' : 'Discount value'}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-black text-orange-500 text-sm tabular-nums">-{req.discount?.toLocaleString() || '0'}</span>
                        <span className="text-[11px] text-orange-400 font-bold ">{t.plans.currency}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 font-bold text-[12px]  ">{lang === 'ar' ? 'تاريخ التقديم' : 'Submitted'}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">{formatDate(req.submissionDate)}</span>
                    </div>

                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-500 dark:text-slate-400 font-bold text-[12px]  ">{lang === 'ar' ? 'الإجمالي النهائي' : 'Final Total'}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-black text-primary text-lg tabular-nums">{req.finalPrice.toLocaleString()}</span>
                        <span className="text-[11px] text-slate-400 font-bold ">{t.plans.currency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pt-5 border-t border-slate-100 dark:border-slate-800 mt-auto">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => fetchUserDetails(req.userId)}
                          className="text-primary text-[12px] font-black hover:underline flex items-center gap-1 transition-all group/btn  whitespace-nowrap"
                        >
                          <span className="material-symbols-outlined text-[16px]">person</span>
                          {lang === 'ar' ? 'الحساب' : 'Profile'}
                        </button>
                        
                        <button 
                          onClick={() => setSelectedReceipt(req.filePath)}
                          className="text-primary text-[12px] font-black hover:underline flex items-center gap-1 transition-all group/btn  whitespace-nowrap"
                        >
                          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                          {lang === 'ar' ? 'الايصال' : 'Receipt'}
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          disabled={!!processingId}
                          onClick={() => setRejectingRequest(req)}
                          className="size-9 rounded-xl bg-red-50 text-red-600 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all dark:bg-red-900/20 dark:text-red-400 active:scale-90 shadow-sm disabled:opacity-50" 
                          title={lang === 'ar' ? 'رفض' : 'Reject'}
                        >
                          <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                        <button 
                          disabled={!!processingId}
                          onClick={() => handleApprove(req.id)}
                          className="size-9 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all dark:bg-emerald-900/20 dark:text-emerald-400 active:scale-90 shadow-sm disabled:opacity-50"
                          title={lang === 'ar' ? 'موافقة' : 'Approve'}
                        >
                          {processingId === req.id ? (
                            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <span className="material-symbols-outlined text-[20px]">check</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in duration-500 mb-8">
              <div className="overflow-x-auto">
                <table className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'} border-collapse`}>
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[12px] text-slate-500 dark:text-slate-400 font-bold  whitespace-nowrap">
                      <th className="px-8 py-5">{lang === 'ar' ? 'المستخدم' : 'Applicant'}</th>
                      <th className="px-8 py-5">{lang === 'ar' ? 'الخطة' : 'Subscription'}</th>
                      <th className="px-8 py-5">{lang === 'ar' ? 'السعر والخصم' : 'Base & Discount'}</th>
                      <th className="px-8 py-5">{lang === 'ar' ? 'الإجمالي النهائي' : 'Final Total'}</th>
                      <th className={`px-8 py-5 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{lang === 'ar' ? 'الإدارة' : 'Governance'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {requests.map((req, idx) => (
                      <tr key={req.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-all group animate-in slide-in-from-right-2 duration-300" style={{ animationDelay: `${idx * 25}ms` }}>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700 overflow-hidden">
                              {req.userImage ? (
                                 <img src={req.userImage} className="size-full object-cover" />
                              ) : (
                                 <span className="material-symbols-outlined text-xl">person</span>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-black text-slate-700 dark:text-white  text-sm truncate">{req.userName}</span>
                              <button 
                                onClick={() => fetchUserDetails(req.userId)}
                                className="text-primary text-[11px] font-black  hover:underline text-left rtl:text-right mt-0.5 flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">person</span>
                                {lang === 'ar' ? 'الحساب' : 'Profile'}
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-primary  whitespace-nowrap">
                              {req.planName || (lang === 'ar' ? 'خطة اشتراك' : 'Standard Plan')}
                            </span>
                            <span className="text-[12px] text-slate-400 font-bold ">{req.numberOfUsers} {lang === 'ar' ? 'تراخيص' : 'Seats'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                               <span className="text-[12px] font-bold text-slate-400 ">{lang === 'ar' ? 'الأصلي:' : 'Base:'}</span>
                               <span className="text-sm font-bold text-slate-600 dark:text-slate-300 tabular-nums">{req.total?.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                               <span className="text-[12px] font-bold text-orange-400 ">{lang === 'ar' ? 'الخصم:' : 'Discount:'}</span>
                               <span className="text-sm font-black text-orange-500 tabular-nums">-{req.discount?.toLocaleString()}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <div className="flex items-baseline gap-1">
                              <span className="text-base font-black text-slate-700 dark:text-white tabular-nums">{req.finalPrice.toLocaleString()}</span>
                              <span className="text-[11px] text-slate-400 font-bold ">{t.plans.currency}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-bold ">{formatDate(req.submissionDate)}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className={`flex items-center ${lang === 'ar' ? 'justify-start' : 'justify-end'} gap-4`}>
                            <button 
                              onClick={() => setSelectedReceipt(req.filePath)}
                              className="text-primary text-[12px] font-black hover:underline  flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                              {lang === 'ar' ? 'الايصال' : 'Receipt'}
                            </button>
                            <button 
                              disabled={!!processingId}
                              onClick={() => setRejectingRequest(req)}
                              className="size-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center dark:bg-red-950/30"
                            >
                              <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                            <button 
                              disabled={!!processingId}
                              onClick={() => handleApprove(req.id)}
                              className="size-8 rounded-lg bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center dark:bg-emerald-950/30"
                            >
                              {processingId === req.id ? (
                                <div className="size-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <span className="material-symbols-outlined text-[18px]">check</span>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-primary/10 dark:border-slate-800 animate-in fade-in duration-500">
               <div className="text-sm font-bold text-slate-400  ">
                  {lang === 'ar' 
                    ? `إظهار ${requests.length} من أصل ${totalElements} طلب` 
                    : `Showing ${requests.length} of ${totalElements} requests`}
               </div>
               <div className="flex items-center gap-2">
                  <button 
                     onClick={() => handlePageChange(currentPage - 1)}
                     disabled={currentPage === 0}
                     className="size-10 rounded-xl border border-primary/10 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-primary hover:text-primary disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center shadow-sm active:scale-90"
                  >
                     <span className="material-symbols-outlined rtl-flip">chevron_left</span>
                  </button>
                  <div className="flex items-center gap-1.5">
                     {Array.from({ length: totalPages }, (_, i) => (
                       <button
                         key={i}
                         onClick={() => handlePageChange(i)}
                         className={`size-10 rounded-xl font-black text-[11px] transition-all shadow-sm ${
                           currentPage === i 
                           ? 'bg-primary text-white scale-110 shadow-primary/20' 
                           : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-primary/10 hover:border-primary hover:text-primary active:scale-95'
                         }`}
                       >
                         {i + 1}
                       </button>
                     ))}
                  </div>
                  <button 
                     onClick={() => handlePageChange(currentPage + 1)}
                     disabled={currentPage >= totalPages - 1}
                     className="size-10 rounded-xl border border-primary/10 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-primary hover:text-primary disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center shadow-sm active:scale-90"
                  >
                     <span className="material-symbols-outlined rtl-flip">chevron_right</span>
                  </button>
               </div>
            </div>
          )}
        </>
      )}

      {/* User Info Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-primary/20 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-primary/10 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
               <div className="flex items-center gap-4">
                  <div className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                     <span className="material-symbols-outlined text-3xl">person</span>
                  </div>
                  <div>
                     <h3 className="text-xl font-black text-slate-700 dark:text-white  leading-none">{lang === 'ar' ? 'بيانات المستخدم' : 'Applicant Identity'}</h3>
                  </div>
               </div>
               <button onClick={() => setShowUserModal(false)} className="size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors flex items-center justify-center">
                 <span className="material-symbols-outlined">close</span>
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
              {isFetchingUser ? (
                <div className="py-20 flex flex-col items-center justify-center">
                   <div className="size-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                   <p className="text-[12px] font-black text-slate-500 ">Synchronizing Profile...</p>
                </div>
              ) : selectedUser ? (
                <div className="space-y-10">
                   {/* Personal Profile */}
                   <div className="flex items-center gap-6">
                      <div className="size-24 rounded-3xl border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0 ring-1 ring-primary/10">
                         {selectedUser.profileImage ? (
                           <img src={selectedUser.profileImage} className="size-full object-cover" alt="Profile" />
                         ) : (
                           <div className="size-full flex items-center justify-center text-3xl font-black bg-primary/5 text-primary">
                             {selectedUser.name?.charAt(0)}
                           </div>
                         )}
                      </div>
                      <div className="min-w-0">
                         <h4 className="text-2xl font-black text-slate-700 dark:text-white  leading-none mb-2">{selectedUser.name}</h4>
                         <p className="text-sm font-bold text-slate-500 mb-3">{selectedUser.email}</p>
                         <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-[12px] font-black   border border-primary/20">
                            {selectedUser.role?.replace('_', ' ')}
                         </span>
                      </div>
                   </div>

                   {/* Organization Section */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/40 border border-primary/5">
                      <div className="space-y-1">
                         <p className="text-[11px] font-black text-slate-400  ">{lang === 'ar' ? 'المؤسسة' : 'Organization'}</p>
                         <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedUser.organizationName || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[11px] font-black text-slate-400  ">{lang === 'ar' ? 'رقم السجل' : 'CRN Number'}</p>
                         <p className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">{selectedUser.organizationCRN || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[11px] font-black text-slate-400  ">{lang === 'ar' ? 'رقم الهاتف' : 'Phone'}</p>
                         <p className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">{selectedUser.phoneNumber || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[11px] font-black text-slate-400  ">{lang === 'ar' ? 'الفئة' : 'Industry Vertical'}</p>
                         <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                           {lang === 'ar' ? selectedUser.category?.arabicName : selectedUser.category?.name}
                         </p>
                      </div>
                   </div>

                   {/* Specializations */}
                   <div className="space-y-4">
                      <p className="text-[12px] font-black text-slate-400   px-1">{lang === 'ar' ? 'التخصصات' : 'Domain Specializations'}</p>
                      <div className="flex flex-wrap gap-2">
                         {selectedUser.subCategories?.map((sub: any) => (
                           <span key={sub.id} className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-primary/10 text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm">
                             {lang === 'ar' ? sub.arabicName : sub.name}
                           </span>
                         ))}
                         {(!selectedUser.subCategories || selectedUser.subCategories.length === 0) && (
                            <p className="text-sm text-slate-300 font-medium italic">No specializations listed.</p>
                         )}
                      </div>
                   </div>

                   {/* Document Preview */}
                   {selectedUser.organizationCRNImage && (
                     <div className="space-y-4">
                        <p className="text-[12px] font-black text-slate-400   px-1">{lang === 'ar' ? 'شهادة السجل التجاري' : 'Registration Certificate'}</p>
                        <div 
                          onClick={() => setSelectedReceipt(selectedUser.organizationCRNImage)}
                          className="relative group cursor-pointer overflow-hidden rounded-3xl border-2 border-primary/10 shadow-lg h-40"
                        >
                           <img src={selectedUser.organizationCRNImage} className="size-full object-cover grayscale transition-all group-hover:grayscale-0 group-hover:scale-105" alt="CRN" />
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                             <span className="material-symbols-outlined text-3xl">zoom_in</span>
                           </div>
                        </div>
                     </div>
                   )}
                </div>
              ) : (
                <div className="text-center py-20">
                   <p className="text-slate-400 font-bold">Failed to load profile.</p>
                </div>
              )}
            </div>
            
            <div className="p-8 border-t border-primary/10 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
               <button 
                 onClick={() => setShowUserModal(false)}
                 className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm   shadow-xl transition-all active:scale-95"
               >
                 {lang === 'ar' ? 'إغلاق النافذة' : 'Dismiss Profile'}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-500">
             <div className="p-8">
                <div className="size-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 mb-6">
                   <span className="material-symbols-outlined text-2xl">cancel</span>
                </div>
                <h3 className="text-xl font-black text-slate-700 dark:text-white mb-2">{lang === 'ar' ? 'سبب الرفض' : 'Rejection Reason'}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">
                  {lang === 'ar' ? 'يرجى تقديم سبب واضح للرفض ليتمكن المستخدم من معرفة المشكلة.' : 'Please provide a clear reason for rejection so the user can understand the issue.'}
                </p>
                <textarea 
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={lang === 'ar' ? 'ادخل السبب هنا...' : 'Enter reason here...'}
                  className="w-full h-24 p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-bold focus:border-red-500 outline-none transition-all resize-none mb-6"
                />
                <div className="flex gap-3">
                   <button 
                     onClick={() => {setRejectingRequest(null); setRejectionReason('');}}
                     className="flex-1 py-3 text-sm font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-100 dark:border-slate-800 "
                   >
                     {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                   </button>
                   <button 
                     disabled={!rejectionReason.trim() || !!processingId}
                     onClick={handleReject}
                     className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-xl shadow-red-600/20 transition-all active:scale-95 disabled:opacity-50 text-sm "
                   >
                     {processingId === rejectingRequest.id ? '...' : (lang === 'ar' ? 'تأكيد الرفض' : 'Reject')}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Lightbox for Receipt */}
      {selectedReceipt && (
        <div 
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl animate-in fade-in duration-300"
          onClick={() => setSelectedReceipt(null)}
        >
          <div className="relative max-w-4xl w-full flex flex-col items-center animate-in zoom-in-95 duration-500">
             <img src={selectedReceipt} alt="Document View" className="max-h-[80vh] rounded-[2rem] shadow-2xl border-4 border-white/20 object-contain" />
             <div className="mt-6 flex gap-4">
                <a 
                  href={selectedReceipt} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={(e) => e.stopPropagation()}
                  className="px-8 py-3 bg-white text-slate-700 rounded-xl font-black text-sm  flex items-center gap-2 shadow-xl hover:scale-105 transition-transform"
                >
                  <span className="material-symbols-outlined">open_in_new</span>
                  {lang === 'ar' ? 'فتح في نافذة جديدة' : 'Open in New Tab'}
                </a>
                <button 
                  onClick={() => setSelectedReceipt(null)}
                  className="px-8 py-3 bg-red-500 text-white rounded-xl font-black text-sm  flex items-center gap-2 shadow-xl hover:scale-105 transition-transform"
                >
                  <span className="material-symbols-outlined">close</span>
                  {lang === 'ar' ? 'إغلاق' : 'Close'}
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Approvals;