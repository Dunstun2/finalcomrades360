import React, { useState, useEffect } from 'react';
import subscriptionService from '@/shared/services/subscriptionService';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { toast } from 'react-toastify';

export default function SellerAnalytics() {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      setLoading(true);
      const data = await subscriptionService.getMySubscriptions();
      const activeSubs = data.filter(s => s.status === 'Active' || s.status === 'Trial');
      let unlocked = false;
      
      for (const sub of activeSubs) {
        if (sub.plan && sub.plan.benefits) {
          const hasAnalytics = sub.plan.benefits.some(b => b.feature?.code === 'advanced_analytics');
          if (hasAnalytics) {
            unlocked = true;
            break;
          }
        }
      }
      
      setHasAccess(unlocked);
    } catch (err) {
      toast.error('Failed to verify access');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;

  if (!hasAccess) {
    return (
      <div className="p-6 w-full flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 text-center max-w-md">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Advanced Analytics Locked</h2>
          <p className="text-gray-600 mb-6">
            Upgrade your seller subscription to unlock a premium dashboard showing customer graphs, visitor counts, traffic sources, and advanced sales metrics.
          </p>
          <a href="/pricing" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
            View Plans
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 sm:p-6 w-full">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 leading-tight mb-6">Advanced Analytics</h1>
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm text-gray-600 text-center">
        Charts and top products will appear here
      </div>
    </div>
  );
}
