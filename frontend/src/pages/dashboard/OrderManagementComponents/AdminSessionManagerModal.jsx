import React, { useState, useEffect } from 'react';
import { FaTimes, FaLock, FaUserSecret, FaDesktop, FaMobileAlt, FaSearch, FaExclamationTriangle, FaCheckCircle, FaTrashAlt, FaPowerOff, FaMapMarkerAlt, FaHistory } from 'react-icons/fa';
import { adminApi } from '../../../services/api';

export default function AdminSessionManagerModal({ isOpen, onClose, onSuccess }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState('');

  // Auto-search users
  useEffect(() => {
    if (isOpen && searchTerm.length >= 3) {
      const delayDebounceFn = setTimeout(() => {
        handleSearchUsers();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchTerm, isOpen]);

  useEffect(() => {
    if (selectedUser) {
      fetchSessions();
    }
  }, [selectedUser]);

  const handleSearchUsers = async () => {
    setLoadingSearch(true);
    setError('');
    try {
      const res = await adminApi.getUsers({ search: searchTerm });
      setUsers(res.data.users || []);
    } catch (err) {
      setError('Failed to fetch users.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await adminApi.adminGetUserSessions(selectedUser.id);
      setSessions(res.data.sessions || []);
    } catch (err) {
      setError('Failed to fetch sessions.');
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleForceLogout = async () => {
    if (!selectedUser) return;
    if (!window.confirm(`Are you sure you want to LOGOUT ALL active sessions for ${selectedUser.name}? This will invalidate their current login token and force them to re-authenticate.`)) {
      return;
    }

    setLoadingAction(true);
    try {
      const res = await adminApi.adminForceLogout({ userId: selectedUser.id });
      if (onSuccess) onSuccess(res.data.message);
      closeModal();
    } catch (err) {
      setError('Failed to force logout user.');
    } finally {
      setLoadingAction(false);
    }
  };

  if (!isOpen) return null;

  const closeModal = () => {
    setSearchTerm('');
    setUsers([]);
    setSelectedUser(null);
    setSessions([]);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up my-auto">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <FaUserSecret className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Session Manager</h2>
              <p className="text-gray-400 text-xs font-medium">Control active user logins and force logouts</p>
            </div>
          </div>
          <button onClick={closeModal} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors">
            <FaTimes />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
              <FaExclamationTriangle className="text-red-500 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* User Selection */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Find User</label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name or phone..."
                    className="w-full border-2 border-gray-100 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:border-gray-900 transition-all outline-none"
                  />
                  {loadingSearch && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />}
                </div>
              </div>

              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      selectedUser?.id === user.id ? 'border-gray-900 bg-gray-50' : 'border-gray-50 hover:border-gray-200'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-black text-xs">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{user.name}</p>
                      <p className="text-[10px] text-gray-400">{user.phone || user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Session List */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Login History & State</label>
              
              {selectedUser ? (
                <div className="space-y-4">
                   <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black text-amber-700 uppercase">Current State</p>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Tokens Active
                        </span>
                      </div>
                      <button 
                        onClick={handleForceLogout}
                        disabled={loadingAction}
                        className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                         {loadingAction ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><FaPowerOff /> Force Universal Logout</>}
                      </button>
                   </div>

                   <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {loadingSessions ? (
                        <div className="py-10 text-center animate-pulse text-gray-300 text-[10px] font-bold">Fetching recent logins...</div>
                      ) : sessions.length === 0 ? (
                        <div className="py-10 text-center text-gray-300 text-[10px] font-bold italic">No login records found.</div>
                      ) : (
                        sessions.map(session => (
                          <div key={session.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                             <div className="flex justify-between items-center">
                                <span className="flex items-center gap-2 text-[10px] font-bold text-gray-800">
                                   {session.device === 'Mobile' ? <FaMobileAlt className="text-gray-400" /> : <FaDesktop className="text-gray-400" />}
                                   {session.browser || 'Browser'} on {session.os || 'OS'}
                                </span>
                                <span className="text-[8px] font-black text-gray-400 uppercase">{new Date(session.createdAt).toLocaleDateString()}</span>
                             </div>
                             <div className="flex items-center gap-3 text-[9px] text-gray-400">
                                <span className="flex items-center gap-1"><FaMapMarkerAlt /> {session.location || 'Unknown'}</span>
                                <span className="flex items-center gap-1"><FaHistory /> {session.ipAddress}</span>
                             </div>
                          </div>
                        ))
                      )}
                   </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-3 opacity-30">
                   <FaUserSecret className="text-4xl text-gray-300" />
                   <p className="text-xs font-bold text-gray-400">Select a user to manage sessions</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end">
           <button onClick={closeModal} className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-all">
             Close Manager
           </button>
        </div>
      </div>
    </div>
  );
}
