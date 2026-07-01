import React from 'react';
import { Link } from 'react-router-dom';
import { FaExclamationCircle, FaArrowRight } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';

export default function VerificationNotice() {
  const { user } = useAuth();
  const isMarketingMode = localStorage.getItem('marketing_mode') === 'true';

  // Only show for logged-in users who haven't verified their phone
  // We don't show this in marketing mode to avoid cluttering the interface for marketers
  if (!user || user.phoneVerified || isMarketingMode) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 py-2 px-4 animate-in fade-in slide-in-from-top duration-500 sticky top-16 z-40">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center text-amber-800 text-[11px] sm:text-xs font-bold uppercase tracking-tight">
          <FaExclamationCircle className="mr-2 text-amber-500 shrink-0" size={14} />
          <span>Action Required: Your phone number is not verified.</span>
        </div>
        <Link
          to="/customer/account-verification"
          className="flex items-center gap-1 text-[10px] font-black text-white bg-amber-600 hover:bg-amber-700 px-4 py-1.5 rounded-full transition-all shadow-sm active:scale-95 whitespace-nowrap uppercase"
        >
          Verify Now <FaArrowRight size={10} />
        </Link>
      </div>
    </div>
  );
}
