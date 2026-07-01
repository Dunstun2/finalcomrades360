import React, { useState, useEffect } from 'react';
import subscriptionService from '@/shared/services/subscriptionService';
import { toast } from 'react-toastify';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AdminPlanEditorModal from '../components/AdminPlanEditorModal';

export default function AdminSubscriptions() {
  const [activeTab, setActiveTab] = useState('plans'); // 'plans' or 'subscribers'
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'plans') {
        const data = await subscriptionService.getAllPlans();
        setPlans(data || []);
      } else if (activeTab === 'subscribers') {
        const data = await subscriptionService.getAllSubscriptions();
        setSubscriptions(data || []);
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setShowPlanModal(true);
  };

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setShowPlanModal(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
          <p className="mt-2 text-sm text-gray-700">Manage plan templates, view subscribers, and monitor billing.</p>
        </div>
        {activeTab === 'plans' && (
          <div className="mt-4 sm:mt-0">
            <button onClick={handleCreatePlan} className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none sm:w-auto">
              Create New Plan
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('plans')}
            className={`${activeTab === 'plans' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
          >
            Plan Templates
          </button>
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`${activeTab === 'subscribers' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
          >
            Subscribers
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><LoadingSpinner size="lg" /></div>
      ) : activeTab === 'plans' ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="relative px-6 py-3"><span className="sr-only">Edit</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                    <div className="text-sm text-gray-500">{plan.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800 uppercase">
                      {plan.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {plan.type === 'meal'
                      ? `${plan.currency} ${plan.price} — custom package`
                      : `${plan.currency} ${plan.price} / ${plan.billingCycle}`
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      plan.status === 'Published' ? 'bg-green-100 text-green-800' :
                      plan.status === 'Archived' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {plan.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEditPlan(plan)} className="text-blue-600 hover:text-blue-900">Edit</button>
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-500">No plans configured yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Renews At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subscriptions.map((sub) => (
                <tr key={sub.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    User #{sub.userId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sub.plan?.name || `Plan ID: ${sub.planId}`}
                    <div className="text-xs text-gray-400 capitalize">{sub.plan?.type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      sub.status === 'Active' ? 'bg-green-100 text-green-800' :
                      sub.status === 'Grace_Period' ? 'bg-yellow-100 text-yellow-800' :
                      sub.status === 'Past_Due' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sub.autoRenew ? (sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'N/A') : 'Auto-renew off'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {subscriptions.length === 0 && (
                <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-500">No active subscribers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showPlanModal && (
        <AdminPlanEditorModal 
          plan={editingPlan} 
          onClose={() => setShowPlanModal(false)} 
          onSave={() => {
            setShowPlanModal(false);
            fetchData();
          }} 
        />
      )}
    </div>
  );
}
