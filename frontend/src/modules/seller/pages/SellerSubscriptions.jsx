import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import subscriptionService from '@/shared/services/subscriptionService';
import { toast } from 'react-toastify';
import LoadingSpinner from '@/shared/components/LoadingSpinner';

export default function SellerSubscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await subscriptionService.getMySubscriptions();
      setSubscriptions(data.filter(s => s.plan?.type === 'seller'));
    } catch (err) {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (subId) => {
    if (!window.confirm('Are you sure you want to cancel your seller subscription? Your listings may be hidden at the end of the billing cycle.')) return;
    try {
      await subscriptionService.cancel(subId);
      toast.success('Subscription cancelled');
      fetchSubscriptions();
    } catch (err) {
      toast.error('Failed to cancel');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Seller Plan & Subscriptions</h2>

      {subscriptions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Plan</h3>
          <p className="mt-1 text-sm text-gray-500">You don't have an active seller plan.</p>
          <div className="mt-6">
            <a href="/pricing" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
              View Plans
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {subscriptions.map(sub => (
            <div key={sub.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <div className="sm:flex sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {sub.plan?.name}
                    </h3>
                    <div className="mt-2 max-w-xl text-sm text-gray-500">
                      <p>{sub.plan?.description}</p>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-0 sm:ml-6 sm:flex-shrink-0 sm:flex sm:items-center space-x-3">
                    <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${
                      sub.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sub.status}
                    </span>
                  </div>
                </div>
                
                <dl className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">Renewal Date</dt>
                    <dd className="mt-1 text-xl font-semibold text-gray-900">
                      {sub.autoRenew ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'Auto-renew cancelled'}
                    </dd>
                  </div>
                  <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">Price</dt>
                    <dd className="mt-1 text-xl font-semibold text-gray-900">
                      {sub.plan?.currency} {sub.plan?.price} / {sub.plan?.billingCycle}
                    </dd>
                  </div>
                  <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">Usage Limits</dt>
                    <dd className="mt-1 text-sm font-medium text-blue-600">
                      <button className="hover:underline">View current usage limits</button>
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 flex space-x-4 border-t border-gray-200 pt-6">
                  <a href="/pricing" className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Change Plan
                  </a>
                  {sub.autoRenew && (
                    <button onClick={() => handleCancel(sub.id)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200">
                      Cancel Auto-Renew
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
