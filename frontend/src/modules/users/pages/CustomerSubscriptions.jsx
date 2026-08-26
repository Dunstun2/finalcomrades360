import React, { useState, useEffect } from 'react';
import subscriptionService from '@/shared/services/subscriptionService';
import api from '@/shared/services/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import ScheduleProjectedCost from '@/shared/components/ScheduleProjectedCost';
import SavedCostProjectionTable from '@/shared/components/SavedCostProjectionTable';
import CustomDialog from '@/shared/components/CustomDialog';

const STATUS_COLORS = {
  Active: 'bg-green-100 text-green-800 ring-green-200',
  Trial: 'bg-blue-100 text-blue-800 ring-blue-200',
  Grace: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
  'Past Due': 'bg-orange-100 text-orange-800 ring-orange-200',
  Cancelled: 'bg-red-100 text-red-800 ring-red-200',
  Expired: 'bg-gray-100 text-gray-800 ring-gray-200',
};

const getCustomerPrice = (item) => {
  if (!item) return 0;
  const discount = item.discountPrice ? Number(item.discountPrice) : 0;
  const display  = item.displayPrice  ? Number(item.displayPrice)  : 0;
  const base     = item.basePrice     ? Number(item.basePrice)     : 0;
  if (discount > 0) return discount;
  if (display  > 0) return display;
  return base;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

export default function CustomerSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [scheduleData, setScheduleData] = useState({}); // Store detailed schedule data by subscription ID
  const [benefitsData, setBenefitsData] = useState({}); // Store benefits data by subscription ID
  const [fastFoodItems, setFastFoodItems] = useState([]); // Store food items for the table
  const [loading, setLoading] = useState(true);

  // Cancel Modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelSubscriptionId, setCancelSubscriptionId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelPassword, setCancelPassword] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Filter state
  const [activeFilter, setActiveFilter] = useState('All');

  // Expanded/Selected state
  const [selectedSubscription, setSelectedSubscription] = useState(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      
      // Fetch subscriptions and food items in parallel
      const [subscriptionsData, foodItemsResponse] = await Promise.all([
        subscriptionService.getMySubscriptions('meal'),
        api.get('/fastfood?limit=1000').catch(() => ({ data: { data: [] } }))
      ]);
      
      const subs = subscriptionsData || [];
      const foods = foodItemsResponse.data?.data || (Array.isArray(foodItemsResponse.data) ? foodItemsResponse.data : []);
      
      setSubscriptions(subs);
      setFastFoodItems(foods);
      
      // Fetch detailed schedule data and benefits for each subscription
      const dataPromises = subs.map(async (subscription) => {
        try {
          const [schedule, benefits] = await Promise.all([
            subscriptionService.getMealSchedule(subscription.id),
            subscriptionService.getSubscriptionBenefits(subscription.id).catch(() => [])
          ]);
          return { 
            subscriptionId: subscription.id, 
            schedule,
            benefits
          };
        } catch (err) {
          console.error(`Failed to fetch data for subscription ${subscription.id}:`, err);
          return { 
            subscriptionId: subscription.id, 
            schedule: null,
            benefits: []
          };
        }
      });
      
      const results = await Promise.all(dataPromises);
      const scheduleMap = {};
      const benefitsMap = {};
      results.forEach(({ subscriptionId, schedule, benefits }) => {
        scheduleMap[subscriptionId] = schedule;
        benefitsMap[subscriptionId] = benefits;
      });
      setScheduleData(scheduleMap);
      setBenefitsData(benefitsMap);
      
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = (subscriptionId) => {
    setCancelSubscriptionId(subscriptionId);
    setCancelReason('');
    setCancelPassword('');
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelSubscriptionId) return;
    if (!cancelReason) {
      toast.error('Please select a reason for cancellation.');
      return;
    }
    if (!cancelPassword) {
      toast.error('Please enter your password to confirm cancellation.');
      return;
    }
    setCancelLoading(true);
    try {
      await subscriptionService.cancel(cancelSubscriptionId, {
        reason: cancelReason,
        issueRefund: true, // Always refund for customer-initiated cancellations
        password: cancelPassword
      });
      toast.success('Subscription cancelled. Any unfulfilled meals have been refunded to your wallet.');
      setShowCancelModal(false);
      setCancelSubscriptionId(null);
      setCancelReason('');
      setCancelPassword('');
      fetchSubscriptions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel subscription');
    } finally {
      setCancelLoading(false);
    }
  };

  const STATUS_FILTERS = ['All', 'Active', 'Trial', 'Grace', 'Past Due', 'Cancelled', 'Expired'];

  const filteredSubscriptions = activeFilter === 'All'
    ? subscriptions
    : subscriptions.filter(s => s.status === activeFilter);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-0">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        
        {/* Single Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">My Subscriptions</h1>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600">View your active meal plan subscriptions and details</p>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-4 sm:mb-6 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {STATUS_FILTERS.map((filter) => {
              const count = filter === 'All'
                ? subscriptions.length
                : subscriptions.filter(s => s.status === filter).length;
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                    activeFilter === filter
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {filter.toUpperCase()} {count > 0 ? `(${count})` : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content - Single Page Layout */}
        {filteredSubscriptions.length === 0 ? (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-lg border border-gray-200 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              {activeFilter === 'All' ? 'No Subscriptions' : `No ${activeFilter} Subscriptions`}
            </h3>
            <p className="text-sm sm:text-base text-gray-500">
              {activeFilter === 'All'
                ? "You don't have any meal plan subscriptions at the moment."
                : `You don't have any subscriptions with status "${activeFilter}".`}
            </p>
          </div>
        ) : (
          <>
            {filteredSubscriptions.map((subscription, index) => (
              <div key={subscription.id} className={`bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden ${index > 0 ? 'mt-4' : ''}`}>
                
                {/* Subscription Header - Collapsible summary */}
                <div 
                  className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 hover:bg-gray-50/80 transition-colors cursor-pointer"
                  onClick={() => setSelectedSubscription(selectedSubscription?.id === subscription.id ? null : subscription)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight truncate">
                          {subscription.plan?.name || 'Custom Meal Plan'}
                        </h2>
                        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider ${
                          STATUS_COLORS[subscription.status] || 'bg-gray-100 text-gray-800'
                        }`}>
                          {subscription.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500 font-medium">
                        <span className="uppercase tracking-wider">ID: #{subscription.id}</span>
                        <span>&bull;</span>
                        <span>{formatDate(subscription.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm sm:text-base font-black text-gray-900">
                          {subscription.costProjectionSnapshot?.totals?.finalTotal ? (
                            `KES ${Math.round(subscription.costProjectionSnapshot.totals.finalTotal)}`
                          ) : subscription.customPrice ? (
                            `KES ${subscription.customPrice}`
                          ) : subscription.plan?.price ? (
                            `KES ${subscription.plan.price}`
                          ) : getCustomerPrice(subscription.plan) > 0 ? (
                            `KES ${getCustomerPrice(subscription.plan)}`
                          ) : (
                            'N/A'
                          )}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider">
                          {subscription.plan?.durationDays 
                            ? `${subscription.plan.durationDays} Days`
                            : subscription.startDate && subscription.expiryDate
                              ? `${Math.max(1, Math.round((new Date(subscription.expiryDate) - new Date(subscription.startDate)) / (1000 * 60 * 60 * 24)))} Days`
                              : 'Custom'}
                        </p>
                      </div>
                      <div className="text-gray-400">
                        <svg className={`w-5 h-5 transition-transform duration-200 ${selectedSubscription?.id === subscription.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Subscription Information */}
                {selectedSubscription?.id === subscription.id && (
                  <>
                    <div className="p-4 sm:p-6 lg:p-8 border-t border-gray-100 bg-gray-50/30">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-4 sm:mb-8">
                      
                      {/* Pricing Card */}
                    <div className="bg-blue-50 rounded-lg p-2 sm:p-4 lg:p-6 border border-blue-200">
                      <div className="text-center">
                        <h3 className="text-[10px] sm:text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1 sm:mb-2">Pricing</h3>
                        {subscription.costProjectionSnapshot?.totals?.finalTotal ? (
                          <p className="text-sm sm:text-xl lg:text-2xl font-bold text-blue-600 mb-0.5 sm:mb-1">
                            KES {Math.round(subscription.costProjectionSnapshot.totals.finalTotal)}
                          </p>
                        ) : subscription.customPrice ? (
                          <p className="text-sm sm:text-xl lg:text-2xl font-bold text-blue-600 mb-0.5 sm:mb-1">
                            KES {subscription.customPrice}
                          </p>
                        ) : subscription.plan?.price ? (
                          <p className="text-sm sm:text-xl lg:text-2xl font-bold text-blue-600 mb-0.5 sm:mb-1">
                            KES {subscription.plan.price}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500 mb-0.5">N/A</p>
                        )}
                        {subscription.plan?.billingCycle && (
                          <p className="text-[10px] sm:text-xs text-blue-700 font-medium">
                            {subscription.plan.type === 'meal'
                              ? `Entire Schedule`
                              : `per ${subscription.plan.billingCycle}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Start Date Card */}
                    <div className="bg-green-50 rounded-lg p-2 sm:p-4 lg:p-6 border border-green-200">
                      <div className="text-center">
                        <h3 className="text-[10px] sm:text-xs font-semibold text-green-900 uppercase tracking-wide mb-1 sm:mb-2">Started</h3>
                        <p className="text-xs sm:text-base lg:text-lg font-semibold text-green-800">
                          {subscription.startDate ? formatDate(subscription.startDate) : 'Not set'}
                        </p>
                      </div>
                    </div>

                    {/* Expiry Date Card */}
                    <div className="bg-red-50 rounded-lg p-2 sm:p-4 lg:p-6 border border-red-200">
                      <div className="text-center">
                        <h3 className="text-[10px] sm:text-xs font-semibold text-red-900 uppercase tracking-wide mb-1 sm:mb-2">Expires</h3>
                        <p className="text-xs sm:text-base lg:text-lg font-semibold text-red-800">
                          {subscription.expiryDate 
                            ? formatDate(subscription.expiryDate)
                            : 'Not set'}
                        </p>
                        <p className="text-[9px] sm:text-xs text-red-600 mt-0.5 sm:mt-1">
                          Renew to continue
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Plan Benefits Section */}
                  {subscription.plan?.benefits?.length > 0 && (
                    <div className="mb-6 sm:mb-8">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Plan Benefits</h3>
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        {subscription.plan.benefits.map((benefit, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                          >
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="truncate">{benefit.feature?.name || benefit.featureName || benefit.featureCode}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Weekly Schedule Section - Show saved snapshot or fallback to recalculated */}
                  {(() => {
                    // Priority 1: Use saved cost projection snapshot if available
                    if (subscription.costProjectionSnapshot) {
                      return (
                        <SavedCostProjectionTable
                          snapshot={subscription.costProjectionSnapshot}
                          title="📊 Schedule & Projected Cost"
                          description={`Breakdown of your scheduled meals and costs for the plan duration.`}
                        />
                      );
                    }

                    // Priority 2: Fallback to dynamic calculation if no snapshot exists
                    const detailedSchedule = scheduleData[subscription.id];
                    const templateSchedule = subscription.plan?.templateSchedule;
                    const scheduleToShow = detailedSchedule || templateSchedule;
                    
                    // Get benefits from the benefits API call and normalize to array
                    let benefits = benefitsData[subscription.id] || subscription.plan?.benefits || [];
                    
                    // If benefits is an object with a 'benefits' property (API response wrapper), extract it
                    if (benefits && typeof benefits === 'object' && !Array.isArray(benefits)) {
                      if (Array.isArray(benefits.benefits)) {
                        benefits = benefits.benefits;
                      } else if (Array.isArray(benefits.data)) {
                        benefits = benefits.data;
                      } else {
                        // Try to convert object values to array
                        benefits = Object.values(benefits).filter(v => v && typeof v === 'object');
                      }
                    }
                    
                    // Ensure we have an array
                    if (!Array.isArray(benefits)) {
                      benefits = [];
                    }
                    
                    if (!scheduleToShow?.length) {
                      return (
                        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-xs sm:text-sm text-yellow-700">No schedule data available for this subscription.</p>
                        </div>
                      );
                    }
                    
                    return (
                      <>
                        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                          ℹ️ Cost projection is being calculated in real-time. For subscriptions created going forward, the exact breakdown from creation time will be displayed.
                        </div>
                        <ScheduleProjectedCost
                          slots={scheduleToShow}
                          fastFoodItems={fastFoodItems}
                          activeBenefits={benefits}
                          title="📊 Schedule & Projected Cost"
                          description={`Preview of your scheduled meals and costs for the plan duration.`}
                          billingCycle={subscription.plan?.billingCycle || 'Cycle'}
                        />
                      </>
                    );
                  })()}
                </div>

                {/* Footer with Subscription ID and Cancel */}
                <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                    <div className="text-xs text-gray-500">
                      <span>
                        Subscription ID: <span className="font-mono font-medium">{subscription.id}</span>
                      </span>
                      {subscription.createdAt && (
                        <span className="ml-3">
                          Created: {formatDate(subscription.createdAt)}
                        </span>
                      )}
                    </div>
                    {(subscription.status === 'Active' || subscription.status === 'Trial') && (
                      <button
                        onClick={() => handleCancelClick(subscription.id)}
                        className="px-4 py-2 text-xs sm:text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors"
                      >
                        Cancel Subscription
                      </button>
                    )}
                  </div>
                </div>
                  </>
                )}
              </div>
            ))}

            {/* Support Information - Bottom of Page */}
            <div className="mt-8 sm:mt-12 bg-blue-50 border-2 border-blue-200 rounded-lg sm:rounded-xl p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start max-w-3xl mx-auto gap-3 sm:gap-4">
                <div className="flex-shrink-0 self-center sm:self-start">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-2">Need Help with Your Subscription?</h3>
                  <p className="text-sm sm:text-base text-blue-800">
                    If you need to make changes to your subscription or have questions about your meal plans, 
                    please contact our support team for assistance. We're here to help you get the most out of your meal plan experience.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Customer Cancel Subscription Modal */}
      <CustomDialog
        isOpen={showCancelModal}
        title="Cancel Subscription"
        message="We're sad to see you go! Please let us know why you're cancelling so we can improve our service. Any unfulfilled meals will be automatically refunded to your wallet."
        type="danger"
        confirmText={cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
        cancelText="Keep Subscription"
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelModal(false)}
      >
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Why are you cancelling?
            </label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
            >
              <option value="" disabled>Select a reason...</option>
              <option value="I am traveling / on holiday">I am traveling / on holiday</option>
              <option value="It's too expensive">It's too expensive</option>
              <option value="I wasn't happy with the food quality">I wasn't happy with the food quality</option>
              <option value="Delivery times don't work for me">Delivery times don't work for me</option>
              <option value="I am moving away">I am moving away</option>
              <option value="I found an alternative">I found an alternative</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              The value of your remaining unfulfilled meals will be credited back to your Comrades360 Wallet.
            </p>
          </div>

          <div className="pt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={cancelPassword}
              onChange={(e) => setCancelPassword(e.target.value)}
              placeholder="Enter your password to confirm"
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
            />
          </div>
        </div>
      </CustomDialog>
    </div>
  );
}
