import React, { useState, useEffect } from 'react';
import subscriptionService from '@/shared/services/subscriptionService';
import { toast } from 'react-toastify';
import LoadingSpinner from '@/shared/components/LoadingSpinner';

export default function CustomerSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for the meal schedule modal/manager
  const [managingSubId, setManagingSubId] = useState(null);
  const [occurrences, setOccurrences] = useState([]);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await subscriptionService.getMySubscriptions();
      setSubscriptions(data.filter(s => s.plan?.type === 'meal'));
    } catch (err) {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleManageMeals = async (subId) => {
    setManagingSubId(subId);
    setLoadingOccurrences(true);
    try {
      const data = await subscriptionService.getMealOccurrences(subId);
      setOccurrences(data || []);
    } catch (err) {
      toast.error('Failed to load meal calendar');
    } finally {
      setLoadingOccurrences(false);
    }
  };

  const handleSkipMeal = async (occurrenceId) => {
    if (!window.confirm('Are you sure you want to skip this meal? A refund will be credited to your wallet.')) return;
    try {
      await subscriptionService.skipMeal(occurrenceId);
      toast.success('Meal skipped successfully');
      handleManageMeals(managingSubId); // Refresh calendar
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to skip meal');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;

  if (managingSubId) {
    return (
      <div className="p-6">
        <button onClick={() => setManagingSubId(null)} className="mb-4 flex items-center text-sm text-gray-500 hover:text-gray-700">
          &larr; Back to Subscriptions
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Meal Calendar</h2>
        
        {loadingOccurrences ? (
           <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {occurrences.map(occ => {
                const isSkipped = occ.status === 'skipped';
                const isDelivered = occ.status === 'delivered';
                const deliveryDate = new Date(occ.scheduledDate);
                const isToday = deliveryDate.toDateString() === new Date().toDateString();
                
                return (
                  <li key={occ.id} className={`p-4 ${isSkipped ? 'bg-gray-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${isSkipped ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {deliveryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at {occ.scheduledTime}
                        </span>
                        <span className="text-sm text-gray-500">
                          {occ.mealTimeType.charAt(0).toUpperCase() + occ.mealTimeType.slice(1)} Delivery
                        </span>
                        {!isSkipped && (
                          <span className="text-xs text-gray-400 mt-1">Deliver to: {occ.deliveryAddress || 'Default Address'}</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          isSkipped ? 'bg-gray-100 text-gray-800' :
                          isDelivered ? 'bg-green-100 text-green-800' :
                          isToday ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {isToday && !isSkipped && !isDelivered ? 'Today' : occ.status}
                        </span>
                        {!isSkipped && !isDelivered && occ.status === 'scheduled' && (
                          <button 
                            onClick={() => handleSkipMeal(occ.id)}
                            className="text-sm text-red-600 hover:text-red-900 font-medium"
                          >
                            Skip Meal
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
              {occurrences.length === 0 && (
                <li className="p-4 text-center text-gray-500">No upcoming meals found. Check your weekly schedule.</li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">My Meal Plans</h2>

      {subscriptions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Meal Plans</h3>
          <p className="mt-1 text-sm text-gray-500">Subscribe to a meal plan to get daily deliveries.</p>
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
              <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{sub.plan?.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">Renews on {sub.autoRenew ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'N/A (Cancelled)'}</p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    sub.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {sub.status}
                  </span>
                </div>
              </div>
              <div className="px-4 py-4 sm:px-6 flex justify-end space-x-3 bg-gray-50">
                <button 
                  onClick={() => handleManageMeals(sub.id)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Manage Calendar
                </button>
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Edit Weekly Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
