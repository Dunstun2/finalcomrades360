import React, { useState, useEffect } from 'react';
import { 
  FaTimes, FaClipboardList, FaSpinner, FaSearch, 
  FaSignInAlt, FaUserShield, FaShoppingBag, FaCalendarAlt 
} from 'react-icons/fa';
import { adminApi } from '@/shared/services/api';
import { useToast } from '@/shared/components/use-toast';
import { format } from 'date-fns';

const AdminUserActivityModal = ({ isOpen, onClose }) => {
  const [userId, setUserId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!userId) return;

    try {
      setSearching(true);
      const response = await adminApi.adminGetUserActivity(userId);
      if (response.data.success) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Error fetching user activity:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch user activity.',
        variant: 'destructive',
      });
      setData(null);
    } finally {
      setSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
              <FaClipboardList className="text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Account Activity Log</h2>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Full Audit Trail</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full transition-all">
            <FaTimes />
          </button>
        </div>

        <div className="p-6 shrink-0 border-b border-gray-100">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="Enter User ID to load activity..."
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={searching || !userId}
              className="px-8 bg-indigo-600 text-white rounded-2xl font-black tracking-tight hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {searching ? <FaSpinner className="animate-spin" /> : 'LOAD LOGS'}
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-50/50">
          {!data && !searching ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
              <FaClipboardList className="text-6xl opacity-10" />
              <p className="text-sm font-medium">Enter a User ID above to see their history</p>
            </div>
          ) : searching ? (
            <div className="h-full flex flex-col items-center justify-center text-indigo-600 space-y-3">
              <FaSpinner className="text-4xl animate-spin" />
              <p className="text-sm font-bold animate-pulse">Scanning database...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
              {/* Login History */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <FaSignInAlt className="text-indigo-500" /> Recent Logins
                </h3>
                <div className="space-y-2">
                  {data.logins.length === 0 ? (
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 text-center text-xs text-gray-400 italic">No login records found</div>
                  ) : (
                    data.logins.map(log => (
                      <div key={log.id} className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3">
                        <div className={`mt-1 w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-xs font-bold text-gray-900 truncate">{log.ipAddress}</p>
                            <span className="text-[10px] text-gray-400 font-medium shrink-0">
                              {format(new Date(log.createdAt), 'MMM dd, HH:mm')}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 truncate mt-0.5">{log.browser} on {log.device || log.os}</p>
                          {log.location && <p className="text-[9px] text-indigo-500 font-bold mt-1 uppercase tracking-tighter">{log.location}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Admin Actions */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <FaUserShield className="text-orange-500" /> Admin Interventions
                </h3>
                <div className="space-y-2">
                  {data.adminActions.length === 0 ? (
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 text-center text-xs text-gray-400 italic">No admin actions found</div>
                  ) : (
                    data.adminActions.map(action => (
                      <div key={action.id} className="p-3 bg-white rounded-2xl border border-orange-100 shadow-sm flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 text-xs shrink-0">
                          <FaUserShield />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-wider">{action.action.replace(/_/g, ' ')}</p>
                            <span className="text-[10px] text-gray-400 font-medium shrink-0">
                              {format(new Date(action.createdAt), 'MMM dd, HH:mm')}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-gray-800 mt-0.5">By {action.admin?.name || action.adminName || 'Unknown'}</p>
                          {action.details?.reason && <p className="text-[10px] text-gray-500 italic mt-1 line-clamp-1">"{action.details.reason}"</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Orders */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <FaShoppingBag className="text-emerald-500" /> Recent Purchase Activity
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.orders.length === 0 ? (
                    <div className="sm:col-span-2 lg:col-span-3 p-4 bg-white rounded-2xl border border-gray-100 text-center text-xs text-gray-400 italic">No order records found</div>
                  ) : (
                    data.orders.map(order => (
                      <div key={order.id} className="p-3 bg-white rounded-2xl border border-emerald-50 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Order #{order.id}</span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg font-bold">{order.status}</span>
                        </div>
                        <p className="text-sm font-black text-gray-900">KES {parseFloat(order.total).toLocaleString()}</p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-2 font-medium">
                          <FaCalendarAlt />
                          <span>{format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserActivityModal;
