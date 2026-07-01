import React, { useState, useEffect } from 'react';
import { FaTimes, FaChartBar, FaUserMinus, FaTruck, FaClock, FaCheckCircle, FaExclamationTriangle, FaChartLine, FaUsers, FaArrowRight } from 'react-icons/fa';
import { adminApi } from '@/shared/services/api';

export default function AdminAdvancedAnalyticsModal({ isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.adminGetAdvancedAnalytics();
      setData(res.data);
    } catch (err) {
      setError('Failed to fetch advanced analytics.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-fade-in-up my-auto">
        {/* Header */}
        <div className="bg-teal-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <FaChartBar className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Advanced Analytics</h2>
              <p className="text-teal-100 text-xs font-medium">Churn, SLA, and Operational Performance</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors">
            <FaTimes />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
               <div className="w-12 h-12 border-4 border-teal-700/30 border-t-teal-700 rounded-full animate-spin" />
               <p className="text-sm font-bold text-teal-900 animate-pulse uppercase tracking-widest">Crunching Platform Data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
              <FaExclamationTriangle className="text-red-500 shrink-0" />
              <p>{error}</p>
            </div>
          ) : data && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Churn Analytics */}
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                     <h3 className="text-sm font-black text-orange-900 uppercase tracking-wider flex items-center gap-2">
                        <FaUserMinus className="text-orange-500" /> Customer Churn
                     </h3>
                     <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">30 DAYS</span>
                  </div>
                  <div className="flex items-end gap-3">
                     <p className="text-4xl font-black text-orange-700">{data.churn.count}</p>
                     <p className="text-[10px] text-orange-800 font-medium pb-1.5 italic">Users inactive for over a month</p>
                  </div>
                  <div className="space-y-2">
                     <p className="text-[10px] font-bold text-orange-700 uppercase">Recent Inactive Users</p>
                     <div className="space-y-1">
                        {data.churn.sample.slice(0, 3).map(u => (
                          <div key={u.id} className="bg-white/50 rounded-lg p-2 flex justify-between items-center">
                             <p className="text-[10px] font-bold text-gray-800">{u.name}</p>
                             <p className="text-[9px] text-gray-400">{new Date(u.lastLoginAt).toLocaleDateString()}</p>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>

                {/* Delivery Performance */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                     <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                        <FaTruck className="text-emerald-500" /> SLA & Delivery
                     </h3>
                     <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">PLATFORM</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <p className="text-[9px] text-emerald-600 font-bold uppercase mb-1">Avg Fulfillment</p>
                        <p className="text-2xl font-black text-emerald-700">{data.delivery.avgDays} <span className="text-[10px] font-bold">days</span></p>
                     </div>
                     <div>
                        <p className="text-[9px] text-emerald-600 font-bold uppercase mb-1">Total Fulfilled</p>
                        <p className="text-2xl font-black text-emerald-700">{data.delivery.total}</p>
                     </div>
                  </div>
                  <div className="pt-3 border-t border-emerald-200 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <FaClock className="text-emerald-500 text-xs" />
                        <span className="text-[10px] font-bold text-emerald-800">Late / Stuck Orders</span>
                     </div>
                     <span className={`text-xs font-black ${data.delivery.lateCount > 0 ? 'text-red-600 animate-pulse' : 'text-emerald-600'}`}>
                        {data.delivery.lateCount}
                     </span>
                  </div>
                </div>
              </div>

              {/* Insights */}
              <div className="bg-teal-900 rounded-2xl p-6 text-white space-y-4 shadow-xl">
                 <div className="flex items-center gap-3">
                    <FaChartLine className="text-teal-400 text-xl" />
                    <h4 className="font-bold text-lg">Operational Insights</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/10 rounded-xl p-4 border border-white/5 space-y-1">
                       <p className="text-[10px] font-bold text-teal-300 uppercase">Retention Strategy</p>
                       <p className="text-xs leading-relaxed">Consider a broadcast re-engagement promo for the {data.churn.count} churned users.</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 border border-white/5 space-y-1">
                       <p className="text-[10px] font-bold text-teal-300 uppercase">SLA Compliance</p>
                       <p className="text-xs leading-relaxed">Platform fulfillment is at {data.delivery.avgDays} days. Targeted goal: &lt; 1.0 day.</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 border border-white/5 space-y-1">
                       <p className="text-[10px] font-bold text-teal-300 uppercase">Incident Response</p>
                       <p className="text-xs leading-relaxed">{data.delivery.lateCount} orders require immediate review by logistics managers.</p>
                    </div>
                 </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
             <button 
               onClick={fetchAnalytics}
               className="px-6 py-2.5 text-xs font-black text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-all uppercase tracking-widest"
             >
                Refresh Data
             </button>
             <button 
               onClick={onClose}
               className="px-8 py-2.5 text-xs font-black text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all uppercase tracking-widest shadow-lg"
             >
                Close Reports
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
