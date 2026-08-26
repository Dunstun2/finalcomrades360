import React, { useState, useEffect } from 'react';
import subscriptionService from '@/shared/services/subscriptionService';
import { toast } from 'react-toastify';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AdminPlanEditorModal from '../components/AdminPlanEditorModal';
import AdminBenefitPackageModal from '../components/AdminBenefitPackageModal';
import PaymentVerificationQueue from '../components/PaymentVerificationQueue';
import SavedCostProjectionTable from '@/shared/components/SavedCostProjectionTable';
import ScheduleProjectedCost from '@/shared/components/ScheduleProjectedCost';
import CustomDialog from '@/shared/components/CustomDialog';
import api from '@/shared/services/api';
import useScrollLock from '@/hooks/useScrollLock';

export default function AdminSubscriptions() {
  const [activeTab, setActiveTab] = useState('verification'); // 'plans', 'packages', 'subscribers', 'verification'
  const [plans, setPlans] = useState([]);
  const [packages, setPackages] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);

  // Deletion state
  const [deletingItem, setDeletingItem] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteCheckInfo, setDeleteCheckInfo] = useState(null);

  // Cancel Modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelSubscriptionId, setCancelSubscriptionId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelPassword, setCancelPassword] = useState('');
  const [issueRefund, setIssueRefund] = useState(true);

  // Subscription management state
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);
  
  // Active scroll lock hook for details modal
  useScrollLock(showSubscriptionDetails);
  const [subscriptionOccurrences, setSubscriptionOccurrences] = useState([]);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);
  const [selectedSubscriptionSchedule, setSelectedSubscriptionSchedule] = useState(null);
  const [selectedSubscriptionBenefits, setSelectedSubscriptionBenefits] = useState([]);
  const [fastFoodItems, setFastFoodItems] = useState([]);
  const [loadingScheduleDetails, setLoadingScheduleDetails] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'plans') {
        const data = await subscriptionService.getAllPlans();
        setPlans(data || []);
      } else if (activeTab === 'packages') {
        const data = await subscriptionService.getBenefitPackages();
        setPackages(data || []);
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

  const handleEditPackage = (pkg) => {
    setEditingPackage(pkg);
    setShowPackageModal(true);
  };

  const handleCreatePackage = () => {
    setEditingPackage(null);
    setShowPackageModal(true);
  };

  const handleDeletePlan = async (plan) => {
    try {
      setLoading(true);
      const checkInfo = await subscriptionService.checkPlanDeletion(plan.id);
      setDeleteCheckInfo(checkInfo);
      setDeletingItem({ type: 'plan', item: plan });
      setShowDeleteConfirm(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to check plan deletion');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async (pkg) => {
    try {
      setLoading(true);
      const checkInfo = await subscriptionService.checkPackageDeletion(pkg.id);
      setDeleteCheckInfo(checkInfo);
      setDeletingItem({ type: 'package', item: pkg });
      setShowDeleteConfirm(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to check package deletion');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;

    try {
      setLoading(true);
      if (deletingItem.type === 'plan') {
        const result = await subscriptionService.deletePlan(deletingItem.item.id);
        toast.success(result.message || 'Plan deleted successfully');
      } else {
        const result = await subscriptionService.deleteBenefitPackage(deletingItem.item.id);
        toast.success(result.message || 'Benefit package deleted successfully');
        if (result.warning) {
          toast.info(result.warning);
        }
      }
      setShowDeleteConfirm(false);
      setDeletingItem(null);
      setDeleteCheckInfo(null);
      fetchData();
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.details) {
        toast.error(errorData.details.message);
        if (errorData.details.suggestion) {
          toast.info(errorData.details.suggestion, { autoClose: 8000 });
        }
      } else {
        toast.error(errorData?.error || 'Failed to delete');
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeletingItem(null);
    setDeleteCheckInfo(null);
  };

  const handleViewSubscriptionDetails = async (subscription) => {
    setSelectedSubscription(subscription);
    setShowSubscriptionDetails(true);
    
    // Fetch meal occurrences and schedule details if it's a meal subscription
    if (subscription.plan?.type === 'meal') {
      setLoadingOccurrences(true);
      setLoadingScheduleDetails(true);
      
      const promises = [
        subscriptionService.getMealOccurrences(subscription.id).catch(err => {
          console.error('Failed to load meal occurrences:', err);
          return [];
        })
      ];
      
      // If we don't have a snapshot, we need schedule, benefits, and food items for dynamic calculation
      const hasSnapshot = !!subscription.costProjectionSnapshot;
      if (!hasSnapshot) {
        promises.push(
          subscriptionService.getMealSchedule(subscription.id).catch(err => {
            console.error('Failed to load meal schedule:', err);
            return null;
          }),
          subscriptionService.getSubscriptionBenefits(subscription.id).catch(err => {
            console.error('Failed to load subscription benefits:', err);
            return [];
          }),
          api.get('/fastfood?limit=1000').then(res => res.data?.data || (Array.isArray(res.data) ? res.data : [])).catch(err => {
            console.error('Failed to load fast food items:', err);
            return [];
          })
        );
      }
      
      try {
        const results = await Promise.all(promises);
        setSubscriptionOccurrences(results[0] || []);
        
        if (!hasSnapshot) {
          setSelectedSubscriptionSchedule(results[1]);
          setSelectedSubscriptionBenefits(results[2] || []);
          setFastFoodItems(results[3] || []);
        }
      } catch (err) {
        console.error('Failed to load subscriber detailed data:', err);
        toast.error('Failed to load subscription details');
      } finally {
        setLoadingOccurrences(false);
        setLoadingScheduleDetails(false);
      }
    }
  };

  const handleCloseSubscriptionDetails = () => {
    setShowSubscriptionDetails(false);
    setSelectedSubscription(null);
    setSubscriptionOccurrences([]);
    setSelectedSubscriptionSchedule(null);
    setSelectedSubscriptionBenefits([]);
  };

  const handleCancelClick = (subscriptionId) => {
    setCancelSubscriptionId(subscriptionId);
    setCancelReason('');
    setCancelPassword('');
    setShowCancelModal(true);
    setShowSubscriptionDetails(false); // Close details modal to show cancel modal
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
    try {
      await subscriptionService.cancel(cancelSubscriptionId, {
        reason: cancelReason,
        issueRefund: issueRefund,
        password: cancelPassword
      });
      toast.success('Subscription cancelled successfully');
      setShowCancelModal(false);
      setCancelReason('');
      setCancelPassword('');
      setCancelSubscriptionId(null);
      handleCloseSubscriptionDetails();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel subscription');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Trial': return 'bg-blue-100 text-blue-800';
      case 'Grace': return 'bg-yellow-100 text-yellow-800';
      case 'Past Due': return 'bg-orange-100 text-orange-800';
      case 'Paused': return 'bg-gray-100 text-gray-800';
      case 'Expired': return 'bg-red-100 text-red-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOccurrenceStatusColor = (status) => {
    switch(status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'skipped': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="sm:flex sm:items-center sm:justify-between mb-4 sm:mb-8">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Subscription Management</h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-700">Manage plan templates, view subscribers, and monitor billing.</p>
        </div>
        {activeTab === 'plans' && (
          <div className="mt-4 sm:mt-0">
            <button onClick={handleCreatePlan} className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none sm:w-auto">
              Create New Plan
            </button>
          </div>
        )}
        {activeTab === 'packages' && (
          <div className="mt-4 sm:mt-0">
            <button onClick={handleCreatePackage} className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none sm:w-auto">
              Create New Package
            </button>
          </div>
        )}
      </div>

      <div className="mb-3 sm:mb-6 border-b border-gray-200 overflow-x-auto scrollbar-none">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max pb-1">
          <button
            onClick={() => setActiveTab('verification')}
            className={`${activeTab === 'verification' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap pb-3 sm:pb-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2`}
          >
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse"></span>
            Payment Verification
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`${activeTab === 'plans' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap pb-3 sm:pb-4 px-1 border-b-2 font-medium text-xs sm:text-sm`}
          >
            Plan Templates
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={`${activeTab === 'packages' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap pb-3 sm:pb-4 px-1 border-b-2 font-medium text-xs sm:text-sm`}
          >
            Benefit Packages
          </button>
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`${activeTab === 'subscribers' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap pb-3 sm:pb-4 px-1 border-b-2 font-medium text-xs sm:text-sm`}
          >
            Subscribers
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><LoadingSpinner size="lg" /></div>
      ) : activeTab === 'verification' ? (
        <PaymentVerificationQueue />
      ) : activeTab === 'plans' ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creator</th>
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
                      {plan.creator ? (() => {
                        const roles = plan.creator.roles || [];
                        const isAdmin = roles.includes('superadmin') || roles.includes('admin') || roles.includes('super_admin');
                        return (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">{plan.creator.name}</span>
                            <span className={`text-xs font-semibold ${isAdmin ? 'text-purple-600' : 'text-blue-600'}`}>
                              {isAdmin ? '👑 Admin' : '👤 Customer'}
                            </span>
                          </div>
                        );
                      })() : (
                        <span className="text-sm text-gray-400 italic">System</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        plan.status === 'Published' ? 'bg-green-100 text-green-800' :
                        plan.status === 'Archived' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {plan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button onClick={() => handleEditPlan(plan)} className="text-blue-600 hover:text-blue-900">
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeletePlan(plan)} 
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {plans.length === 0 && (
                  <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500">No plans configured yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden divide-y divide-gray-200 bg-white">
            {plans.map((plan) => (
              <div key={plan.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{plan.name}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
                  </div>
                  <span className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-semibold rounded-full ${
                    plan.status === 'Published' ? 'bg-green-100 text-green-800' :
                    plan.status === 'Archived' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {plan.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-100 pt-2">
                  <div>
                    <span className="text-gray-500 block">Type</span>
                    <span className="font-semibold text-gray-900 uppercase text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full inline-block mt-0.5">
                      {plan.type}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Pricing</span>
                    <span className="font-semibold text-gray-900">
                      {plan.type === 'meal'
                        ? `${plan.currency} ${plan.price} — custom package`
                        : `${plan.currency} ${plan.price} / ${plan.billingCycle}`
                      }
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 block">Creator</span>
                    <span className="font-semibold text-gray-900">
                      {plan.creator ? (
                        `${plan.creator.name} (${plan.creator.roles?.includes('admin') || plan.creator.roles?.includes('superadmin') || plan.creator.roles?.includes('super_admin') ? '👑 Admin' : '👤 Customer'})`
                      ) : (
                        <span className="text-gray-400 italic">System</span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end gap-3 border-t border-gray-100 pt-2 text-sm font-medium">
                  <button onClick={() => handleEditPlan(plan)} className="text-blue-600 hover:text-blue-900">
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeletePlan(plan)} 
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {plans.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">No plans configured yet.</div>
            )}
          </div>
        </div>
      ) : activeTab === 'packages' ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Benefits Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {packages.map((pkg) => (
                  <tr key={pkg.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{pkg.name}</div>
                      <div className="text-sm text-gray-500 max-w-md truncate" title={pkg.description}>
                        {pkg.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 uppercase">
                        {pkg.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pkg.benefits?.length || 0} benefits
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button onClick={() => handleEditPackage(pkg)} className="text-blue-600 hover:text-blue-900">
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeletePackage(pkg)} 
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {packages.length === 0 && (
                  <tr><td colSpan="4" className="px-6 py-4 text-center text-gray-500">No benefit packages configured yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden divide-y divide-gray-200 bg-white">
            {packages.map((pkg) => (
              <div key={pkg.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{pkg.name}</h4>
                    <p className="text-xs text-gray-500 mt-0.5 max-w-xs line-clamp-2" title={pkg.description}>
                      {pkg.description}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 inline-flex text-[10px] leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 uppercase">
                    {pkg.type}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-2">
                  <div>
                    <span className="text-gray-500">Benefits: </span>
                    <span className="font-semibold text-gray-900">{pkg.benefits?.length || 0} benefits</span>
                  </div>
                  <div className="flex gap-3 text-sm font-medium">
                    <button onClick={() => handleEditPackage(pkg)} className="text-blue-600 hover:text-blue-900">
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeletePackage(pkg)} 
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {packages.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">No benefit packages configured yet.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sub.user ? (
                        <div className="space-y-1">
                          <div className="font-semibold text-base text-gray-900">
                            {sub.user.name || 'Unnamed User'}
                          </div>
                          {sub.user.email && (
                            <div className="text-xs text-blue-600">
                              📧 {sub.user.email}
                            </div>
                          )}
                          {sub.user.phone && (
                            <div className="text-xs text-green-600">
                              📱 {sub.user.phone}
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            User ID: {sub.userId}
                          </div>
                        </div>
                      ) : sub.guestName ? (
                        <div className="space-y-1">
                          <div className="font-semibold text-base text-gray-900">
                            {sub.guestName} <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Guest</span>
                          </div>
                          {sub.guestEmail && (
                            <div className="text-xs text-blue-600">
                              📧 {sub.guestEmail}
                            </div>
                          )}
                          {sub.guestPhone && (
                            <div className="text-xs text-green-600">
                              📱 {sub.guestPhone}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          User #{sub.userId || 'Unknown'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sub.plan?.name || `Plan ID: ${sub.planId}`}
                      <div className="text-xs text-gray-400 capitalize">{sub.plan?.type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(sub.status)}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-medium">
                        KES {sub.costProjectionSnapshot?.totals?.finalTotal ? Math.round(sub.costProjectionSnapshot.totals.finalTotal) : sub.customPrice ? parseFloat(sub.customPrice).toFixed(2) : sub.plan?.price ? parseFloat(sub.plan.price).toFixed(2) : '0.00'}
                      </span>
                      <div className="text-xs text-gray-400">
                        {sub.plan?.type === 'meal' 
                          ? 'Entire Schedule'
                          : (sub.plan?.billingCycle ? `per ${sub.plan.billingCycle}` : '')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sub.autoRenew ? (sub.renewalDate ? new Date(sub.renewalDate).toLocaleDateString() : 'N/A') : 'Auto-renew off'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewSubscriptionDetails(sub)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
                {subscriptions.length === 0 && (
                  <tr><td colSpan="7" className="px-6 py-4 text-center text-gray-500">No active subscribers found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden divide-y divide-gray-200 bg-white">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="text-sm font-medium text-gray-900">
                    {sub.user ? (
                      <div className="space-y-0.5">
                        <div className="font-semibold text-gray-900">
                          {sub.user.name || 'Unnamed User'}
                        </div>
                        {sub.user.email && (
                          <div className="text-xs text-blue-600">
                            📧 {sub.user.email}
                          </div>
                        )}
                        {sub.user.phone && (
                          <div className="text-xs text-green-600">
                            📱 {sub.user.phone}
                          </div>
                        )}
                      </div>
                    ) : sub.guestName ? (
                      <div className="space-y-0.5">
                        <div className="font-semibold text-gray-900">
                          {sub.guestName} <span className="text-[10px] bg-gray-100 text-gray-600 px-1 py-0.2 rounded">Guest</span>
                        </div>
                        {sub.guestEmail && (
                          <div className="text-xs text-blue-600">
                            📧 {sub.guestEmail}
                          </div>
                        )}
                        {sub.guestPhone && (
                          <div className="text-xs text-green-600">
                            📱 {sub.guestPhone}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">
                        User #{sub.userId || 'Unknown'}
                      </div>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-semibold rounded-full ${getStatusColor(sub.status)}`}>
                    {sub.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-100 pt-2">
                  <div>
                    <span className="text-gray-500 block">Plan</span>
                    <span className="font-semibold text-gray-900">{sub.plan?.name || `Plan ID: ${sub.planId}`}</span>
                    <span className="text-[10px] text-gray-400 block capitalize">{sub.plan?.type}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Amount Paid</span>
                    <span className="font-semibold text-gray-900">
                      KES {sub.costProjectionSnapshot?.totals?.finalTotal ? Math.round(sub.costProjectionSnapshot.totals.finalTotal) : sub.customPrice ? parseFloat(sub.customPrice).toFixed(2) : sub.plan?.price ? parseFloat(sub.plan.price).toFixed(2) : '0.00'}
                    </span>
                    <span className="text-[10px] text-gray-400 block">
                      {sub.plan?.type === 'meal' ? 'Entire Schedule' : (sub.plan?.billingCycle ? `per ${sub.plan.billingCycle}` : '')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Start Date</span>
                    <span className="font-medium text-gray-900">
                      {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : new Date(sub.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Expires At</span>
                    <span className="font-medium text-gray-900">
                      {sub.autoRenew ? (sub.renewalDate ? new Date(sub.renewalDate).toLocaleDateString() : 'N/A') : 'Auto-renew off'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end border-t border-gray-100 pt-2">
                  <button
                    onClick={() => handleViewSubscriptionDetails(sub)}
                    className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-900 px-3 py-1.5 rounded font-medium"
                  >
                    Manage
                  </button>
                </div>
              </div>
            ))}
            {subscriptions.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">No active subscribers found.</div>
            )}
          </div>
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

      {showPackageModal && (
        <AdminBenefitPackageModal
          pkg={editingPackage}
          onClose={() => setShowPackageModal(false)}
          onSave={() => {
            setShowPackageModal(false);
            fetchData();
          }}
        />
      )}

      {showSubscriptionDetails && selectedSubscription && (
        <div className="fixed inset-0 z-[200] overflow-y-auto sm:pt-[80px]">
          <div className="flex items-start sm:items-center justify-center min-h-screen text-center p-0 sm:px-4 sm:py-6">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleCloseSubscriptionDetails}></div>

            <div className="inline-block w-full max-w-4xl p-4 sm:p-6 sm:my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-none sm:rounded-xl relative z-10 min-h-screen sm:min-h-0">
              {/* Header */}
              <div className="flex items-start justify-between mb-4 sm:mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Subscription Management</h3>
                  <p className="text-sm text-gray-500 mt-1">ID: {selectedSubscription.id}</p>
                </div>
                <button
                  onClick={handleCloseSubscriptionDetails}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Subscriber Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Subscriber Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{selectedSubscription.user?.name || selectedSubscription.guestName || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-blue-600">{selectedSubscription.user?.email || selectedSubscription.guestEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium text-green-600">{selectedSubscription.user?.phone || selectedSubscription.guestPhone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">User Type</p>
                    <p className="font-medium">{selectedSubscription.userId ? 'Registered User' : 'Guest'}</p>
                  </div>
                </div>
              </div>

              {/* Subscription Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Subscription Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Plan</span>
                      <span className="font-medium">{selectedSubscription.plan?.name || 'Custom Plan'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Type</span>
                      <span className="font-medium capitalize">{selectedSubscription.plan?.type || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Status</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedSubscription.status)}`}>
                        {selectedSubscription.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Amount</span>
                      <span className="font-bold text-green-600">
                        KES {selectedSubscription.costProjectionSnapshot?.totals?.finalTotal ? Math.round(selectedSubscription.costProjectionSnapshot.totals.finalTotal) : selectedSubscription.customPrice || selectedSubscription.plan?.price || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">{selectedSubscription.plan?.type === 'meal' ? 'Coverage' : 'Billing Cycle'}</span>
                      <span className="font-medium capitalize">
                        {selectedSubscription.plan?.type === 'meal'
                          ? 'Entire Schedule'
                          : (selectedSubscription.plan?.billingCycle || 'N/A')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Auto-Renew</span>
                      <span className="font-medium">{selectedSubscription.autoRenew ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Timeline</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Start Date</span>
                      <span className="font-medium">{new Date(selectedSubscription.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Expires At</span>
                      <span className="font-medium">{new Date(selectedSubscription.expiryDate).toLocaleDateString()}</span>
                    </div>
                    {selectedSubscription.autoRenew && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Next Renewal</span>
                        <span className="font-medium">{new Date(selectedSubscription.renewalDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedSubscription.activatedAt && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Activated At</span>
                        <span className="font-medium">{new Date(selectedSubscription.activatedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedSubscription.cancelledAt && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Cancelled At</span>
                        <span className="font-medium text-red-600">{new Date(selectedSubscription.cancelledAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Days Remaining</span>
                      <span className="font-bold text-blue-600">
                        {Math.max(0, Math.ceil((new Date(selectedSubscription.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)))} days
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule & Projected Cost */}
              {selectedSubscription.plan?.type === 'meal' && (
                <div className="mb-6">
                  {(() => {
                    // Priority 1: Use saved cost projection snapshot if available
                    if (selectedSubscription.costProjectionSnapshot) {
                      return (
                        <SavedCostProjectionTable
                          snapshot={selectedSubscription.costProjectionSnapshot}
                          title="📊 Schedule & Projected Cost"
                          description={`Preview of how benefits apply across the scheduled meals.`}
                        />
                      );
                    }

                    // Priority 2: Fallback to dynamic calculation if no snapshot exists
                    if (loadingScheduleDetails) {
                      return (
                        <div className="mt-6 border-t pt-5">
                          <h4 className="text-sm font-bold text-gray-800 mb-3">📊 Schedule & Projected Cost</h4>
                          <div className="flex justify-center py-8"><LoadingSpinner size="sm" /></div>
                        </div>
                      );
                    }

                    const scheduleToShow = selectedSubscriptionSchedule;

                    // Get benefits and normalize to array
                    let benefits = selectedSubscriptionBenefits || [];
                    if (benefits && typeof benefits === 'object' && !Array.isArray(benefits)) {
                      if (Array.isArray(benefits.benefits)) {
                        benefits = benefits.benefits;
                      } else if (Array.isArray(benefits.data)) {
                        benefits = benefits.data;
                      } else {
                        benefits = Object.values(benefits).filter(v => v && typeof v === 'object');
                      }
                    }
                    if (!Array.isArray(benefits)) benefits = [];

                    if (!scheduleToShow?.length) {
                      return (
                        <div className="mt-6 border-t pt-5">
                          <h4 className="text-sm font-bold text-gray-800 mb-1">📊 Schedule & Projected Cost</h4>
                          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-xs text-yellow-700">No schedule data available for this subscription.</p>
                          </div>
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
                          description={`Preview of how benefits apply across the scheduled meals.`}
                          billingCycle={selectedSubscription.plan?.billingCycle || 'Cycle'}
                        />
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Meal Occurrences (for meal subscriptions) */}
              {selectedSubscription.plan?.type === 'meal' && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span>Meal Delivery Schedule</span>
                    {loadingOccurrences && <LoadingSpinner size="sm" />}
                  </h4>
                  
                  {!loadingOccurrences && subscriptionOccurrences.length > 0 ? (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meal</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {subscriptionOccurrences.map((occ) => (
                            <tr key={occ.id}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {new Date(occ.date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                <div>
                                  {occ.schedule?.preferredFastFoodItem?.name || 'N/A'}
                                  <div className="text-xs text-gray-500 capitalize">
                                    {occ.schedule?.mealTimeType} • {occ.schedule?.preferredTime}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getOccurrenceStatusColor(occ.status)}`}>
                                  {occ.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {occ.deliveryAddress ? 'Home Delivery' : occ.pickupStationId ? 'Pickup Station' : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : !loadingOccurrences ? (
                    <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                      No meal occurrences scheduled yet
                    </div>
                  ) : null}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                {selectedSubscription.status === 'Active' && (
                  <button
                    onClick={() => handleCancelClick(selectedSubscription.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Cancel Subscription
                  </button>
                )}
                <button
                  onClick={handleCloseSubscriptionDetails}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deleteCheckInfo && deletingItem && (
        <div className="fixed inset-0 z-[200] overflow-y-auto" style={{ paddingTop: '80px' }}>
          <div className="flex items-center justify-center min-h-screen px-4 py-6 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={cancelDelete}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg relative z-10">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {deleteCheckInfo.canDelete ? (
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    {deleteCheckInfo.canDelete ? 'Confirm Deletion' : 'Cannot Delete'}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-700 font-semibold mb-2">
                      {deletingItem.type === 'plan' ? 'Plan:' : 'Package:'} {deletingItem.item.name}
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      {deleteCheckInfo.reason}
                    </p>

                    {/* Details for plans */}
                    {deletingItem.type === 'plan' && (
                      <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Subscriptions:</span>
                          <span className="font-medium">{deleteCheckInfo.subscriptionCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Active Subscriptions:</span>
                          <span className="font-medium">{deleteCheckInfo.activeSubscriptionCount}</span>
                        </div>
                      </div>
                    )}

                    {/* Details for packages */}
                    {deletingItem.type === 'package' && (
                      <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Plans Using Package:</span>
                          <span className="font-medium">{deleteCheckInfo.plansUsing}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Published Plans:</span>
                          <span className="font-medium">{deleteCheckInfo.publishedPlansUsing}</span>
                        </div>
                        {deleteCheckInfo.publishedPlanNames?.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-1">Published plans using this package:</p>
                            <ul className="list-disc list-inside text-xs text-gray-700">
                              {deleteCheckInfo.publishedPlanNames.map((name, idx) => (
                                <li key={idx}>{name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {deleteCheckInfo.suggestion && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-800">
                          <strong>💡 Suggestion:</strong> {deleteCheckInfo.suggestion}
                        </p>
                      </div>
                    )}

                    {deleteCheckInfo.canDelete && (deletingItem.type === 'package' && deleteCheckInfo.plansUsing > 0) && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
                          <strong>⚠️ Warning:</strong> This will unlink the package from {deleteCheckInfo.plansUsing} draft plan(s).
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse space-x-reverse space-x-3">
                {deleteCheckInfo.canDelete ? (
                  <>
                    <button
                      type="button"
                      onClick={confirmDelete}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={cancelDelete}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={cancelDelete}
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:w-auto sm:text-sm"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Admin Cancel Subscription Modal */}
      <CustomDialog
        isOpen={showCancelModal}
        title="Cancel Subscription"
        message="Please provide a reason for cancelling this subscription. If applicable, you can issue a prorated refund to the customer's wallet for unfulfilled meals."
        type="danger"
        confirmText="Terminate Subscription"
        confirmDisabled={!cancelReason || !cancelPassword}
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelModal(false)}
      >
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Cancellation <span className="text-red-500">*</span>
            </label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="" disabled>Select a reason</option>
              <option value="Customer Requested">Customer Requested</option>
              <option value="Payment Failed / Fraud">Payment Failed / Fraud</option>
              <option value="Logistical / Delivery Area Issue">Logistical / Delivery Area Issue</option>
              <option value="Violation of Terms">Violation of Terms</option>
              <option value="Restaurant Closed / Plan Unavailable">Restaurant Closed / Plan Unavailable</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                checked={issueRefund}
                onChange={(e) => setIssueRefund(e.target.checked)}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Issue Prorated Refund to Wallet</p>
              <p className="text-xs text-gray-500 mt-1">
                Automatically calculates the value of remaining unfulfilled meals and credits it to the customer's wallet.
              </p>
            </div>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm your Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              placeholder="Enter your admin password"
              value={cancelPassword}
              onChange={(e) => setCancelPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
      </CustomDialog>
    </div>
  );
}
