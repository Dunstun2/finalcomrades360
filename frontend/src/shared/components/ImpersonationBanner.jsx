import React, { useState, useEffect } from 'react';
import { FaUserSecret, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';

export default function ImpersonationBanner() {
  const { user } = useAuth();
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsImpersonating(!!localStorage.getItem('admin_token_backup'));
    };

    check();
    window.addEventListener('storage', check);
    // Also check on location change / window focus
    window.addEventListener('focus', check);
    return () => {
      window.removeEventListener('storage', check);
      window.removeEventListener('focus', check);
    };
  }, []);

  if (!isImpersonating) return null;

  const handleExit = () => {
    const backupToken = localStorage.getItem('admin_token_backup');
    const backupUser = localStorage.getItem('admin_user_backup');

    if (backupToken) {
      localStorage.setItem('token', backupToken);
      localStorage.removeItem('admin_token_backup');

      if (backupUser) {
        localStorage.setItem('user', backupUser);
        localStorage.removeItem('admin_user_backup');
      } else {
        localStorage.removeItem('user');
      }

      // Clear any session/cart caches from impersonation
      localStorage.removeItem('marketing_mode');

      // Hard redirect to admin dashboard to reload full admin state
      window.location.href = '/dashboard/admin-tools';
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-[99999] flex items-center shadow-2xl animate-fade-in-up">
      <div className="bg-amber-500 text-gray-950 px-4 py-3 rounded-l-2xl border-2 border-r-0 border-amber-300 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg backdrop-blur-md">
        <FaUserSecret className="text-lg text-gray-900 shrink-0 animate-pulse" />
        <span className="truncate max-w-[180px] sm:max-w-[260px]">
          Impersonating: <strong className="font-extrabold">{user?.name || user?.email || 'User'}</strong>
        </span>
      </div>
      <button
        onClick={handleExit}
        title="Exit impersonation and return to Admin"
        className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-3 rounded-r-2xl border-2 border-indigo-400 font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg hover:brightness-110"
      >
        <FaSignOutAlt className="text-base" />
        <span>EXIT</span>
      </button>
    </div>
  );
}
