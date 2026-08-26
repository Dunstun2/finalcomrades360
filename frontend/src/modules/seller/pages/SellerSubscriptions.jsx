import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import subscriptionService from '@/shared/services/subscriptionService';
import { toast } from 'react-toastify';
import LoadingSpinner from '@/shared/components/LoadingSpinner';

const STATUS_COLORS = {
  Active:    'bg-green-100 text-green-800',
  Trial:     'bg-blue-100 text-blue-800',
  Grace:     'bg-yellow-100 text-yellow-800',
  'Past Due':'bg-orange-100 text-orange-800',
  Cancelled: 'bg-red-100 text-red-800',
  Expired:   'bg-gray-100 text-gray-800',
};

export default function SellerSubscriptions() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [subscriptions, setSubscriptions]   = useState([]);
  const [loading, setLoading]               = useState(true);

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradingSubId, setUpgradingSubId]     = useState(null);
  const [availablePlans, setAvailablePlans]     = useState([]);
  const [selectedPlanId, setSelectedPlanId]     = useState('');
  const [upgrading, setUpgrading]               = useState(false);
  const [loadingPlans, setLoadingPlans]         = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await subscriptionService.getMySubscriptions('seller');
      setSubscriptions(data || []);
    } catch (err) {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (subId) => {
    if (!window.confirm(
      'Are you sure you want to cancel your seller subscription? ' +
      'Your listings may be hidden at the end of the billing cycle.'
    )) return;
    try {
      await subscriptionService.cancel(subId);
      toast.success('Subscription cancelled');
      fetchSubscriptions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel');
    }
  };

  const openUpgradeModal = async (subId) => {
    setUpgradingSubId(subId);
    setSelectedPlanId('');
    setShowUpgradeModal(true);
    setLoadingPlans(true);
    try {
      const plans = await subscriptionService.getPlans('seller');
      setAvailablePlans(plans || []);
    } catch (err) {
      toast.error('Failed to load plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPlanId) return toast.error('Please select a plan');
    setUpgrading(true);
    try {
      await subscriptionService.upgrade(parseInt(selectedPlanId));
      toast.success('Plan upgraded successfully');
      setShowUpgradeModal(false);
      fetchSubscriptions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upgrade failed');
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <LoadingSpinner size="lg" />
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Seller Plan &amp; Subscriptions</h2>
        <a
          href="/pricing"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Browse Plans
        </a>
      </div>

      {subscriptions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Plan</h3>
          <p className="mt-1 text-sm text-gray-500">You don't have an active seller plan.</p>
          <div className="mt-6">
            <a
              href="/pricing"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              View Plans
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {subscriptions.map(sub => {
            // Use the actual backend field names
            const renewalDate = sub.renewalDate || sub.expiryDate;
            const startDate   = sub.startDate;

            return (
              <div key={sub.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                  {/* Header row */}
                  <div className="sm:flex sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {sub.plan?.name || `Plan #${sub.planId}`}
                      </h3>
                      {sub.plan?.description && (
                        <p className="mt-1 max-w-xl text-sm text-gray-500">{sub.plan.description}</p>
                      )}
                    </div>
                    <span className={`mt-3 sm:mt-0 inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${
                      STATUS_COLORS[sub.status] || 'bg-gray-100 text-gray-800'
                    }`}>
                      {sub.status}
                    </span>
                  </div>

                  {/* Stat cards */}
                  <dl className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <div className="px-4 py-5 bg-gray-50 shadow rounded-lg sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">Renewal Date</dt>
                      <dd className="mt-1 text-xl font-semibold text-gray-900">
                        {sub.autoRenew && renewalDate
                          ? new Date(renewalDate).toLocaleDateString()
                          : 'Auto-renew off'}
                      </dd>
                    </div>
                    <div className="px-4 py-5 bg-gray-50 shadow rounded-lg sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">Price</dt>
                      <dd className="mt-1 text-xl font-semibold text-gray-900">
                        {sub.plan?.currency || 'KES'} {sub.plan?.price} / {sub.plan?.billingCycle}
                      </dd>
                    </div>
                    <div className="px-4 py-5 bg-gray-50 shadow rounded-lg sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Since</dt>
                      <dd className="mt-1 text-xl font-semibold text-gray-900">
                        {startDate ? new Date(startDate).toLocaleDateString() : '—'}
                      </dd>
                    </div>
                  </dl>

                  {/* Benefits pills */}
                  {sub.plan?.benefits?.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Included Benefits</p>
                      <div className="flex flex-wrap gap-2">
                        {sub.plan.benefits.map((b, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full"
                          >
                            {b.feature?.name || b.featureName || b.featureCode}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-200 pt-6">
                    {['Active', 'Trial', 'Grace', 'Past Due'].includes(sub.status) && (
                      <button
                        onClick={() => openUpgradeModal(sub.id)}
                        className="inline-flex items-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
                      >
                        Upgrade / Change Plan
                      </button>
                    )}
                    {sub.autoRenew && sub.status !== 'Cancelled' && (
                      <button
                        onClick={() => handleCancel(sub.id)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                      >
                        Cancel Auto-Renew
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Upgrade Modal ── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Change / Upgrade Plan</h3>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {loadingPlans ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : availablePlans.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No other seller plans available right now.</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {availablePlans.map(plan => (
                  <label
                    key={plan.id}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedPlanId === String(plan.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="upgradePlan"
                      value={plan.id}
                      checked={selectedPlanId === String(plan.id)}
                      onChange={() => setSelectedPlanId(String(plan.id))}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-900 text-sm">{plan.name}</span>
                        <span className="text-sm font-bold text-blue-700 whitespace-nowrap">
                          {plan.currency || 'KES'} {plan.price} / {plan.billingCycle}
                        </span>
                      </div>
                      {plan.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
                      )}
                      {plan.benefits?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {plan.benefits.slice(0, 4).map((b, i) => (
                            <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              {b.feature?.name || b.featureName || b.featureCode}
                            </span>
                          ))}
                          {plan.benefits.length > 4 && (
                            <span className="text-[10px] text-gray-400">+{plan.benefits.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            <p className="mt-4 text-xs text-gray-500">
              Upgrading applies a prorated credit for remaining time on your current plan. Downgrading refunds the difference.
            </p>

            <div className="mt-5 flex gap-3 justify-end">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpgrade}
                disabled={!selectedPlanId || upgrading}
                className="px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {upgrading ? 'Upgrading…' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
