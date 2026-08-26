import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import subscriptionService from '@/shared/services/subscriptionService';
import { toast } from 'react-toastify';
import LoadingSpinner from '@/shared/components/LoadingSpinner';

export default function SubscriptionBenefits() {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();
  const [benefits, setBenefits] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchBenefits();
  }, [subscriptionId]);
  
  const fetchBenefits = async () => {
    try {
      setLoading(true);
      const data = await subscriptionService.getSubscriptionBenefits(subscriptionId);
      setBenefits(data);
    } catch (err) {
      toast.error('Failed to load subscription benefits');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return (
    <div className="flex justify-center py-12">
      <LoadingSpinner size="lg" />
    </div>
  );
  
  if (!benefits) return (
    <div className="p-6">
      <p className="text-center text-gray-500">No benefits data available</p>
    </div>
  );
  
  const statusColor = {
    Active: 'text-green-600',
    Cancelled: 'text-red-600',
    Trial: 'text-blue-600',
    Grace: 'text-orange-600',
    'Past Due': 'text-red-600'
  };
  
  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Subscription Benefits</h2>
          <p className="text-sm sm:text-base text-gray-500 mt-1 truncate">{benefits.planName}</p>
        </div>
        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-start sm:self-auto ${statusColor[benefits.status] || 'text-gray-600'}`}>
          {benefits.status}
        </span>
      </div>
      
      {benefits.benefits?.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 sm:p-8 text-center">
          <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Benefits</h3>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">This subscription doesn't have any benefits configured.</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {benefits.benefits?.map((benefit, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-2 gap-2 sm:gap-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2">{benefit.featureName}</h3>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full capitalize self-start sm:self-auto">
                  {benefit.source}
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <span className="text-gray-500">Category:</span>
                  <span className="ml-2 text-gray-900 capitalize">{benefit.category}</span>
                </div>
                <div>
                  <span className="text-gray-500">Limit Type:</span>
                  <span className="ml-2 text-gray-900 capitalize">{benefit.limitType || 'N/A'}</span>
                </div>
              </div>
              
              {benefit.limitType && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-gray-500">Remaining Usage</span>
                    <span className="text-base sm:text-lg font-bold text-gray-900">
                      {benefit.remaining === Infinity ? 'Unlimited' : benefit.remaining}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 sm:mt-6">
        <button
          onClick={() => navigate('/customer/subscriptions')}
          className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 shadow-sm text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          &larr; Back to Subscriptions
        </button>
      </div>
    </div>
  );
}