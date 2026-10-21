import React, { useState, useEffect, useMemo } from 'react';
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
  const [activeTab, setActiveTab] = useState('verification'); // 'verification', 'plans', 'packages', 'subscribers'
  const [plans, setPlans] = useState([]);
  const [packages, setPackages] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Status Counts & Badge state (Gap #15)
  const [statusCounts, setStatusCounts] = useState({
    total: 0,
    active: 0,
    trial: 0,
    pending: 0,
    grace: 0,
    pastDue: 0,
    cancelled: 0,
    expired: 0,
    paused: 0
  });
  const [pendingVerificationCount, setPendingVerificationCount] = useState(0);

  // Subscribers Search, Filter & Pagination state (Gap #6, Gap #13)
  const [subSearch, setSubSearch] = useState('');
  const [subStatus, setSubStatus] = useState('all');
  const [subPlanType, setSubPlanType] = useState('all');
  const [subStartDate, setSubStartDate] = useState('');
  const [subEndDate, setSubEndDate] = useState('');
  const [subPage, setSubPage] = useState(1);
  const [subLimit, setSubLimit] = useState(20);
  const [totalSubscribers, setTotalSubscribers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);

  // Bulk Actions state (Gap #12)
  const [selectedSubIds, setSelectedSubIds] = useState(new Set());
  const [bulkActionModal, setBulkActionModal] = useState({ isOpen: false, action: '', reason: '' });
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Modal states for Plans & Packages
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);

  // Plan Preview Modal (Gap #18)
  const [previewPlan, setPreviewPlan] = useState(null);

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
  const [activeModalTab, setActiveModalTab] = useState('overview'); // 'overview', 'benefits', 'invoices', 'occurrences', 'override'
  useScrollLock(showSubscriptionDetails || !!previewPlan);

  // Meal occurrences and benefits inside modal
  const [subscriptionOccurrences, setSubscriptionOccurrences] = useState([]);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);
  const [selectedSubscriptionSchedule, setSelectedSubscriptionSchedule] = useState(null);
  const [selectedSubscriptionBenefits, setSelectedSubscriptionBenefits] = useState([]);
  const [fastFoodItems, setFastFoodItems] = useState([]);
  const [loadingScheduleDetails, setLoadingScheduleDetails] = useState(false);

  // Occurrence editing states (Gap #8)
  const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, occurrence: null, newDate: '' });
  const [addressModal, setAddressModal] = useState({ isOpen: false, occurrence: null, newAddress: '' });
  const [processingOccurrenceId, setProcessingOccurrenceId] = useState(null);

  // Manual Status Override state (Gap #9)
  const [overrideStatus, setOverrideStatus] = useState('');
  const [extendDays, setExtendDays] = useState(0);
  const [overrideReason, setOverrideReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Plan Migration state (Gap #11)
  const [migrationModal, setMigrationModal] = useState({ isOpen: false, targetPlanId: '', reason: '' });
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'subscribers') {
      fetchSubscribers();
    }
  }, [subPage, subLimit, subStatus, subPlanType]);

  // Poll pending verification count for badge
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await api.get('/admin/payments/pending');
        const count = res.data?.payments?.length || (Array.isArray(res.data) ? res.data.length : 0);
        setPendingVerificationCount(count);
      } catch (e) {
        // Silent catch for background poll
      }
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

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
        await fetchSubscribers();
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscribers = async () => {
    setLoadingSubscribers(true);
    try {
      const params = {
        page: subPage,
        limit: subLimit,
        status: subStatus !== 'all' ? subStatus : undefined,
        planType: subPlanType !== 'all' ? subPlanType : undefined,
        search: subSearch.trim() || undefined,
        startDate: subStartDate || undefined,
        endDate: subEndDate || undefined
      };

      const res = await subscriptionService.getAllSubscriptions(params);

      if (res && res.subscriptions) {
        setSubscriptions(res.subscriptions);
        setTotalSubscribers(res.total || 0);
        setTotalPages(res.totalPages || 1);
        if (res.statusCounts) {
          setStatusCounts(res.statusCounts);
        }
      } else if (Array.isArray(res)) {
        setSubscriptions(res);
        setTotalSubscribers(res.length);
        setTotalPages(1);
      } else {
        setSubscriptions([]);
      }
    } catch (err) {
      console.error('Failed to fetch subscribers:', err);
      toast.error('Failed to load subscribers');
    } finally {
      setLoadingSubscribers(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e?.preventDefault) e.preventDefault();
    setSubPage(1);
    fetchSubscribers();
  };

  const handleClearFilters = () => {
    setSubSearch('');
    setSubStatus('all');
    setSubPlanType('all');
    setSubStartDate('');
    setSubEndDate('');
    setSubPage(1);
  };

  // Plan CRUD Handlers
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
        if (result.warning) toast.info(result.warning);
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

  // View Subscription Details Modal
  const handleViewSubscriptionDetails = async (subscription) => {
    setSelectedSubscription(subscription);
    setOverrideStatus(subscription.status);
    setExtendDays(0);
    setOverrideReason('');
    setActiveModalTab('overview');
    setShowSubscriptionDetails(true);

    // Fetch active benefits summary (Gap #16)
    try {
      const benefitsData = await subscriptionService.getSubscriptionBenefits(subscription.id);
      setSelectedSubscriptionBenefits(benefitsData || []);
    } catch (e) {
      console.warn('Could not load specific benefits:', e);
      setSelectedSubscriptionBenefits([]);
    }

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

      const hasSnapshot = !!subscription.costProjectionSnapshot;
      if (!hasSnapshot) {
        promises.push(
          subscriptionService.getMealSchedule(subscription.id).catch(err => {
            console.error('Failed to load meal schedule:', err);
            return null;
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
          setFastFoodItems(results[2] || []);
        }
      } catch (err) {
        console.error('Failed to load subscriber detailed data:', err);
        toast.error('Failed to load meal details');
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

  // Manual Status Override Handler (Gap #9)
  const handleSaveStatusOverride = async () => {
    if (!selectedSubscription) return;
    setIsUpdatingStatus(true);
    try {
      await subscriptionService.updateAdminSubscriptionStatus(selectedSubscription.id, {
        status: overrideStatus,
        extendDays: extendDays > 0 ? extendDays : undefined,
        reason: overrideReason
      });
      toast.success(`Subscription updated to ${overrideStatus}`);
      fetchSubscribers();
      handleCloseSubscriptionDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update subscription status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Plan Migration Handler (Gap #11)
  const handleExecuteMigration = async () => {
    if (!selectedSubscription || !migrationModal.targetPlanId) {
      toast.error('Please select a target plan');
      return;
    }
    setIsMigrating(true);
    try {
      await subscriptionService.adminMigrateSubscription(selectedSubscription.id, {
        newPlanId: migrationModal.targetPlanId,
        reason: migrationModal.reason
      });
      toast.success('Subscriber migrated successfully!');
      setMigrationModal({ isOpen: false, targetPlanId: '', reason: '' });
      fetchSubscribers();
      handleCloseSubscriptionDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to migrate subscriber');
    } finally {
      setIsMigrating(false);
    }
  };

  // Meal Occurrence Management Handlers (Gap #8)
  const handleUpdateOccurrenceStatus = async (occurrenceId, newStatus) => {
    setProcessingOccurrenceId(occurrenceId);
    try {
      await subscriptionService.adminManageOccurrence(occurrenceId, { status: newStatus });
      toast.success(`Occurrence marked as ${newStatus}`);
      // Refresh occurrences in modal
      const updated = await subscriptionService.getMealOccurrences(selectedSubscription.id);
      setSubscriptionOccurrences(updated || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update occurrence');
    } finally {
      setProcessingOccurrenceId(null);
    }
  };

  const handleRescheduleOccurrenceSubmit = async () => {
    if (!rescheduleModal.occurrence || !rescheduleModal.newDate) {
      toast.error('Please select a new date');
      return;
    }
    setProcessingOccurrenceId(rescheduleModal.occurrence.id);
    try {
      await subscriptionService.adminManageOccurrence(rescheduleModal.occurrence.id, {
        date: rescheduleModal.newDate
      });
      toast.success('Occurrence rescheduled successfully');
      setRescheduleModal({ isOpen: false, occurrence: null, newDate: '' });
      const updated = await subscriptionService.getMealOccurrences(selectedSubscription.id);
      setSubscriptionOccurrences(updated || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reschedule occurrence');
    } finally {
      setProcessingOccurrenceId(null);
    }
  };

  const handleUpdateOccurrenceAddressSubmit = async () => {
    if (!addressModal.occurrence || !addressModal.newAddress) {
      toast.error('Please enter a delivery address');
      return;
    }
    setProcessingOccurrenceId(addressModal.occurrence.id);
    try {
      await subscriptionService.adminManageOccurrence(addressModal.occurrence.id, {
        deliveryAddress: addressModal.newAddress
      });
      toast.success('Delivery address updated');
      setAddressModal({ isOpen: false, occurrence: null, newAddress: '' });
      const updated = await subscriptionService.getMealOccurrences(selectedSubscription.id);
      setSubscriptionOccurrences(updated || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update address');
    } finally {
      setProcessingOccurrenceId(null);
    }
  };

  // Bulk Actions Handlers (Gap #12)
  const handleToggleSelectAll = () => {
    if (selectedSubIds.size === subscriptions.length) {
      setSelectedSubIds(new Set());
    } else {
      setSelectedSubIds(new Set(subscriptions.map(s => s.id)));
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedSubIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExecuteBulkAction = async () => {
    if (selectedSubIds.size === 0) return;
    setIsProcessingBulk(true);
    try {
      await subscriptionService.adminBulkSubscriptionAction({
        subscriptionIds: Array.from(selectedSubIds),
        action: bulkActionModal.action,
        reason: bulkActionModal.reason
      });
      toast.success(`Bulk ${bulkActionModal.action} completed for ${selectedSubIds.size} subscriptions`);
      setBulkActionModal({ isOpen: false, action: '', reason: '' });
      setSelectedSubIds(new Set());
      fetchSubscribers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to perform bulk action');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Export CSV Handler (Gap #12)
  const handleExportCSV = () => {
    const subsToExport = subscriptions.filter(s => selectedSubIds.size === 0 || selectedSubIds.has(s.id));
    if (subsToExport.length === 0) {
      toast.warning('No subscribers to export');
      return;
    }

    const headers = ['Subscription ID', 'Customer Name', 'Email', 'Phone', 'User Type', 'Plan Name', 'Plan Type', 'Status', 'Price (KES)', 'Start Date', 'Expiry Date', 'Auto Renew'];
    const rows = subsToExport.map(s => [
      s.id,
      `"${s.user?.name || s.guestName || 'Unnamed'}"`,
      `"${s.user?.email || s.guestEmail || ''}"`,
      `"${s.user?.phone || s.guestPhone || ''}"`,
      s.userId ? 'Registered' : 'Guest',
      `"${s.plan?.name || 'Custom Plan'}"`,
      s.plan?.type || '',
      s.status,
      s.costProjectionSnapshot?.totals?.finalTotal ? Math.round(s.costProjectionSnapshot.totals.finalTotal) : (s.customPrice || s.plan?.price || 0),
      s.startDate ? new Date(s.startDate).toLocaleDateString() : '',
      s.expiryDate ? new Date(s.expiryDate).toLocaleDateString() : (s.renewalDate ? new Date(s.renewalDate).toLocaleDateString() : ''),
      s.autoRenew ? 'Yes' : 'No'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `subscribers_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${subsToExport.length} subscribers to CSV`);
  };

  // Cancellation Modal Handlers
  const handleCancelClick = (subscriptionId) => {
    setCancelSubscriptionId(subscriptionId);
    setCancelReason('');
    setCancelPassword('');
    setShowCancelModal(true);
    setShowSubscriptionDetails(false);
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
      fetchSubscribers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel subscription');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800 border-green-200';
      case 'Trial': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Grace': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Past Due': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Paused': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Expired': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getOccurrenceStatusColor = (status) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'skipped': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-4 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Subscription Operations Hub</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-600">
            Real-time subscriber lifecycle management, plan templates, packages, and manual payment verification.
          </p>
        </div>
        {activeTab === 'plans' && (
          <div className="mt-4 sm:mt-0">
            <button
              onClick={handleCreatePlan}
              className="inline-flex items-center justify-center rounded-xl border border-transparent bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors gap-2"
            >
              <span>+</span> Create New Plan
            </button>
          </div>
        )}
        {activeTab === 'packages' && (
          <div className="mt-4 sm:mt-0">
            <button
              onClick={handleCreatePackage}
              className="inline-flex items-center justify-center rounded-xl border border-transparent bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors gap-2"
            >
              <span>+</span> Create New Package
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs with Badges (Gap #15) */}
      <div className="mb-4 sm:mb-6 border-b border-gray-200 overflow-x-auto scrollbar-none">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max pb-1">
          <button
            onClick={() => setActiveTab('verification')}
            className={`${activeTab === 'verification' ? 'border-red-500 text-red-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap pb-3 sm:pb-4 px-1 border-b-2 text-xs sm:text-sm flex items-center gap-2`}
          >
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            Payment Verification
            {pendingVerificationCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm animate-bounce">
                {pendingVerificationCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`${activeTab === 'plans' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap pb-3 sm:pb-4 px-1 border-b-2 text-xs sm:text-sm flex items-center gap-2`}
          >
            Plan Templates
            {plans.length > 0 && (
              <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                {plans.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={`${activeTab === 'packages' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap pb-3 sm:pb-4 px-1 border-b-2 text-xs sm:text-sm flex items-center gap-2`}
          >
            Benefit Packages
            {packages.length > 0 && (
              <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                {packages.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`${activeTab === 'subscribers' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap pb-3 sm:pb-4 px-1 border-b-2 text-xs sm:text-sm flex items-center gap-2`}
          >
            Subscribers
            {statusCounts.total > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
                {statusCounts.total}
              </span>
            )}
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner size="lg" /></div>
      ) : activeTab === 'verification' ? (
        <PaymentVerificationQueue />
      ) : activeTab === 'plans' ? (
        <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-100">
          {/* Plan Templates List */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase">Plan Name</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase">Price</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase">Billing Cycle</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase w-48">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{plan.name}</div>
                      <div className="text-xs text-gray-500 truncate max-w-sm">{plan.description || 'No description'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 capitalize">
                        {plan.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      KES {plan.price ? Number(plan.price).toLocaleString() : '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                      {plan.billingCycle || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(plan.status)}`}>
                        {plan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      {/* Customer Preview Button (Gap #18) */}
                      <button
                        onClick={() => setPreviewPlan(plan)}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold"
                        title="Preview Customer View"
                      >
                        👁️ Preview
                      </button>
                      <button
                        onClick={() => handleEditPlan(plan)}
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan)}
                        className="text-red-600 hover:text-red-800 font-semibold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {plans.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                      No plan templates created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Plan Cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {plans.map((plan) => (
              <div key={plan.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                    <p className="text-xs text-gray-500 line-clamp-1">{plan.description}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(plan.status)}`}>
                    {plan.status}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 border-t pt-2">
                  <span>Type: <strong className="capitalize">{plan.type}</strong></span>
                  <span>Price: <strong>KES {plan.price}</strong> / {plan.billingCycle}</span>
                </div>
                <div className="flex justify-end gap-3 text-xs font-semibold pt-1">
                  <button onClick={() => setPreviewPlan(plan)} className="text-indigo-600">👁️ Preview</button>
                  <button onClick={() => handleEditPlan(plan)} className="text-blue-600">Edit</button>
                  <button onClick={() => handleDeletePlan(plan)} className="text-red-600">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'packages' ? (
        <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-100">
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase">Package Name</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase">Included Benefits</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{pkg.name}</div>
                      <div className="text-xs text-gray-500 max-w-md truncate">{pkg.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 uppercase">
                        {pkg.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {pkg.benefits?.length || 0} features bundled
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button onClick={() => handleEditPackage(pkg)} className="text-blue-600 hover:text-blue-800">
                        Edit
                      </button>
                      <button onClick={() => handleDeletePackage(pkg)} className="text-red-600 hover:text-red-800">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {packages.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                      No benefit packages configured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* SUBSCRIBERS TAB (Gaps #6, #8, #9, #10, #11, #12, #13, #14, #16, #19) */
        <div className="space-y-4">
          {/* Status Metric Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {[
              { label: 'All Subscribers', key: 'all', count: statusCounts.total, color: 'border-blue-200 bg-blue-50/50 text-blue-900' },
              { label: 'Active', key: 'Active', count: statusCounts.active, color: 'border-green-200 bg-green-50/50 text-green-900' },
              { label: 'In Trial', key: 'Trial', count: statusCounts.trial, color: 'border-indigo-200 bg-indigo-50/50 text-indigo-900' },
              { label: 'Pending Payment', key: 'Pending', count: statusCounts.pending, color: 'border-yellow-200 bg-yellow-50/50 text-yellow-900' },
              { label: 'Past Due', key: 'Past Due', count: statusCounts.pastDue, color: 'border-orange-200 bg-orange-50/50 text-orange-900' },
              { label: 'Paused', key: 'Paused', count: statusCounts.paused, color: 'border-purple-200 bg-purple-50/50 text-purple-900' },
              { label: 'Cancelled', key: 'Cancelled', count: statusCounts.cancelled, color: 'border-red-200 bg-red-50/50 text-red-900' },
            ].map(pill => (
              <button
                key={pill.key}
                onClick={() => { setSubStatus(pill.key); setSubPage(1); }}
                className={`p-3 rounded-xl border text-left transition-all ${subStatus === pill.key ? 'ring-2 ring-blue-500 font-bold shadow-sm' : 'hover:bg-white'} ${pill.color}`}
              >
                <div className="text-xs font-medium text-gray-500">{pill.label}</div>
                <div className="text-lg font-extrabold mt-0.5">{pill.count || 0}</div>
              </button>
            ))}
          </div>

          {/* Search & Filter Toolbar (Gap #6) */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-3">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  placeholder="Search by customer name, email, phone, or subscription ID..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
              </div>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
              >
                Search
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-600">Plan Type:</span>
                <select
                  value={subPlanType}
                  onChange={(e) => { setSubPlanType(e.target.value); setSubPage(1); }}
                  className="p-1.5 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="meal">Meal</option>
                  <option value="seller">Seller</option>
                  <option value="service">Service</option>
                  <option value="laundry">Laundry</option>
                  <option value="delivery">Delivery</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-600">Date Range:</span>
                <input
                  type="date"
                  value={subStartDate}
                  onChange={(e) => setSubStartDate(e.target.value)}
                  className="p-1 border border-gray-300 rounded-md"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={subEndDate}
                  onChange={(e) => setSubEndDate(e.target.value)}
                  className="p-1 border border-gray-300 rounded-md"
                />
                {(subStartDate || subEndDate) && (
                  <button
                    type="button"
                    onClick={() => { setSubStartDate(''); setSubEndDate(''); setSubPage(1); }}
                    className="text-red-500 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-gray-500 hover:text-gray-800 underline"
                >
                  Reset All Filters
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-md transition-colors"
                >
                  📥 Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Selection Actions Bar (Gap #12) */}
          {selectedSubIds.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                  {selectedSubIds.size}
                </span>
                subscriber(s) selected
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBulkActionModal({ isOpen: true, action: 'activate', reason: '' })}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Bulk Activate
                </button>
                <button
                  onClick={() => setBulkActionModal({ isOpen: true, action: 'pause', reason: '' })}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Bulk Pause
                </button>
                <button
                  onClick={() => setBulkActionModal({ isOpen: true, action: 'cancel', reason: '' })}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Bulk Cancel
                </button>
                <button
                  onClick={() => setSelectedSubIds(new Set())}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* Subscribers Table (Desktop) */}
          <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-200">
            {loadingSubscribers ? (
              <div className="py-16 flex justify-center"><LoadingSpinner size="md" /></div>
            ) : (
              <>
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={subscriptions.length > 0 && selectedSubIds.size === subscriptions.length}
                            onChange={handleToggleSelectAll}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase">Plan</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase">Expires At (Gap #14)</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase">Started</th>
                        <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {subscriptions.map((sub) => {
                        const isSelected = selectedSubIds.has(sub.id);
                        const effectiveExpiry = sub.expiryDate || sub.renewalDate;

                        return (
                          <tr key={sub.id} className={`hover:bg-blue-50/30 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectOne(sub.id)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-0.5">
                                <div className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
                                  {sub.user?.name || sub.guestName || `Customer #${sub.userId || sub.id}`}
                                  {!sub.userId && (
                                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                                      GUEST
                                    </span>
                                  )}
                                </div>
                                {(sub.user?.email || sub.guestEmail) && (
                                  <div className="text-xs text-blue-600 flex items-center gap-1">
                                    <span>✉️</span> {sub.user?.email || sub.guestEmail}
                                  </div>
                                )}
                                {(sub.user?.phone || sub.guestPhone) && (
                                  <div className="text-xs text-emerald-700 flex items-center gap-1">
                                    <span>📱</span> {sub.user?.phone || sub.guestPhone}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-sm text-gray-900">{sub.plan?.name || `Plan #${sub.planId}`}</div>
                              <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-gray-100 text-gray-600 capitalize">
                                {sub.plan?.type || 'meal'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${getStatusColor(sub.status)}`}>
                                {sub.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              KES {sub.costProjectionSnapshot?.totals?.finalTotal ? Math.round(sub.costProjectionSnapshot.totals.finalTotal).toLocaleString() : (sub.customPrice || sub.plan?.price || 0).toLocaleString()}
                            </td>
                            {/* Gap #14: Reveal Actual Expiry Date regardless of autoRenew */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {effectiveExpiry ? (
                                <div className="space-y-0.5">
                                  <div className="font-medium text-gray-900">
                                    {new Date(effectiveExpiry).toLocaleDateString()}
                                  </div>
                                  <div className="text-[10px] text-gray-500">
                                    {sub.autoRenew ? '🔄 Auto-renews' : '⏹️ Auto-renew off'}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">No expiry set</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                              {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : new Date(sub.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleViewSubscriptionDetails(sub)}
                                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-xs transition-colors"
                              >
                                Manage ⚙️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {subscriptions.length === 0 && (
                        <tr>
                          <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                            No subscriptions match the selected criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards for Subscribers */}
                <div className="lg:hidden divide-y divide-gray-100">
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-1">
                            {sub.user?.name || sub.guestName || `Customer #${sub.userId || sub.id}`}
                            {!sub.userId && <span className="px-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">GUEST</span>}
                          </div>
                          <div className="text-xs text-gray-500">{sub.user?.email || sub.guestEmail || sub.user?.phone || sub.guestPhone}</div>
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getStatusColor(sub.status)}`}>
                          {sub.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 border-t pt-2">
                        <div>
                          <span className="text-gray-400 block">Plan:</span>
                          <span className="font-semibold">{sub.plan?.name || `Plan #${sub.planId}`}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block">Expiry:</span>
                          <span className="font-semibold">
                            {sub.expiryDate ? new Date(sub.expiryDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1 border-t">
                        <button
                          onClick={() => handleViewSubscriptionDetails(sub)}
                          className="px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg shadow-sm"
                        >
                          Manage Subscriber
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls (Gap #13) */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-gray-600">
                    Showing <span className="font-bold">{subscriptions.length}</span> of <span className="font-bold">{totalSubscribers}</span> total records
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSubPage(p => Math.max(1, p - 1))}
                      disabled={subPage <= 1}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      ← Previous
                    </button>
                    <span className="text-xs font-semibold text-gray-700 px-2">
                      Page {subPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setSubPage(p => Math.min(totalPages, p + 1))}
                      disabled={subPage >= totalPages}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── CUSTOMER PREVIEW MODAL (Gap #18) ── */}
      {previewPlan && (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-gray-900 via-gray-900 to-black rounded-3xl max-w-md w-full p-6 text-white border border-gray-800 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-start mb-4">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/30 uppercase">
                Customer View Preview
              </span>
              <button onClick={() => setPreviewPlan(null)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-black">{previewPlan.name}</h3>
                <p className="text-gray-400 text-xs mt-1">{previewPlan.description || 'No public description provided'}</p>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">KES {Number(previewPlan.price || 0).toLocaleString()}</span>
                  <span className="text-xs text-gray-400">/{previewPlan.billingCycle}</span>
                </div>
                {previewPlan.trialPeriodDays > 0 && (
                  <p className="text-emerald-400 text-xs font-bold mt-1">
                    🎁 Includes {previewPlan.trialPeriodDays}-day free trial!
                  </p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Included Benefits</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {previewPlan.benefits && previewPlan.benefits.length > 0 ? (
                    previewPlan.benefits.map((b, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-gray-200">
                        <span className="text-green-400">✓</span>
                        <div>
                          <strong>{b.feature?.name || b.featureCode}</strong>: {b.description || 'Benefit enabled'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 italic">Standard features bundled with plan.</p>
                  )}
                </div>
              </div>

              <button
                disabled
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl text-center shadow-lg opacity-80 cursor-not-allowed text-sm"
              >
                Customer "Subscribe" Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAILED SUBSCRIPTION MANAGE MODAL (Gaps #8, #9, #10, #11, #16, #19) ── */}
      {showSubscriptionDetails && selectedSubscription && (
        <div className="fixed inset-0 z-[150] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    Subscription #{selectedSubscription.id}
                  </h3>
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${getStatusColor(selectedSubscription.status)}`}>
                    {selectedSubscription.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {selectedSubscription.user?.name || selectedSubscription.guestName || 'Guest'} • Created {new Date(selectedSubscription.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={handleCloseSubscriptionDetails}
                className="text-gray-400 hover:text-gray-700 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="px-6 border-b border-gray-200 bg-white">
              <nav className="-mb-px flex space-x-6 text-sm font-semibold">
                <button
                  onClick={() => setActiveModalTab('overview')}
                  className={`py-3 border-b-2 ${activeModalTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  Overview & Plan
                </button>
                <button
                  onClick={() => setActiveModalTab('benefits')}
                  className={`py-3 border-b-2 ${activeModalTab === 'benefits' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  Active Benefits & Usage (Gap #16)
                </button>
                <button
                  onClick={() => setActiveModalTab('invoices')}
                  className={`py-3 border-b-2 ${activeModalTab === 'invoices' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  Invoice History (Gap #10)
                </button>
                {selectedSubscription.plan?.type === 'meal' && (
                  <button
                    onClick={() => setActiveModalTab('occurrences')}
                    className={`py-3 border-b-2 ${activeModalTab === 'occurrences' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    Meal Delivery Schedule (Gap #8)
                  </button>
                )}
                <button
                  onClick={() => setActiveModalTab('override')}
                  className={`py-3 border-b-2 ${activeModalTab === 'override' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  Status Override & Migration (Gaps #9, #11)
                </button>
              </nav>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* TAB 1: OVERVIEW */}
              {activeModalTab === 'overview' && (
                <div className="space-y-6">
                  {/* Customer Card */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Customer Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 block text-xs">Customer Name</span>
                        <strong className="text-gray-900">{selectedSubscription.user?.name || selectedSubscription.guestName || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs">Email</span>
                        <strong className="text-blue-600">{selectedSubscription.user?.email || selectedSubscription.guestEmail || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs">Phone</span>
                        <strong className="text-green-700">{selectedSubscription.user?.phone || selectedSubscription.guestPhone || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs">Account Type</span>
                        <strong className="text-gray-800">{selectedSubscription.userId ? 'Registered User' : 'Guest Checkout'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Plan & Timeline Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-xl p-4 bg-white">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Plan Metadata</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-gray-500">Plan Name</span>
                          <strong>{selectedSubscription.plan?.name || 'Custom Plan'}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-gray-500">Type</span>
                          <strong className="capitalize">{selectedSubscription.plan?.type || 'meal'}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-gray-500">Price</span>
                          <strong className="text-green-700 font-extrabold">
                            KES {selectedSubscription.costProjectionSnapshot?.totals?.finalTotal ? Math.round(selectedSubscription.costProjectionSnapshot.totals.finalTotal).toLocaleString() : (selectedSubscription.customPrice || selectedSubscription.plan?.price || 0).toLocaleString()}
                          </strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-gray-500">Auto Renewal</span>
                          <strong>{selectedSubscription.autoRenew ? 'Active (Automatic)' : 'Off (Manual)'}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-4 bg-white">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Timeline</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-gray-500">Start Date</span>
                          <strong>{new Date(selectedSubscription.startDate).toLocaleDateString()}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-gray-500">Expiry Date (Gap #14)</span>
                          <strong className="text-blue-700">{new Date(selectedSubscription.expiryDate).toLocaleDateString()}</strong>
                        </div>
                        {selectedSubscription.activatedAt && (
                          <div className="flex justify-between py-1 border-b border-gray-50">
                            <span className="text-gray-500">Activated At</span>
                            <strong>{new Date(selectedSubscription.activatedAt).toLocaleDateString()}</strong>
                          </div>
                        )}
                        {selectedSubscription.cancelledAt && (
                          <div className="flex justify-between py-1 border-b border-gray-50 text-red-600">
                            <span>Cancelled At</span>
                            <strong>{new Date(selectedSubscription.cancelledAt).toLocaleDateString()}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ACTIVE BENEFITS & USAGE (Gap #16) */}
              {activeModalTab === 'benefits' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
                    ℹ️ Real-time benefit limits and consumption counters tracked for this subscription period.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedSubscriptionBenefits && selectedSubscriptionBenefits.length > 0 ? (
                      selectedSubscriptionBenefits.map((b, i) => (
                        <div key={i} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                          <div className="flex justify-between items-start">
                            <strong className="text-gray-900 text-sm">{b.featureName || b.featureCode}</strong>
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-bold rounded">
                              ACTIVE
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{b.description || 'Benefit enabled'}</p>
                          <div className="mt-3 pt-3 border-t border-gray-100 text-xs flex justify-between text-gray-700">
                            <span>Allocation: <strong>{b.limitType || 'Allowance'}</strong></span>
                            <span>Limit: <strong>{b.value?.limit ?? 'Unlimited'}</strong></span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-8 text-center text-gray-500 text-sm">
                        No custom benefit records attached to this plan.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: INVOICES & PAYMENT HISTORY (Gap #10) */}
              {activeModalTab === 'invoices' && (
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reference</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Method</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {selectedSubscription.invoices && selectedSubscription.invoices.length > 0 ? (
                          selectedSubscription.invoices.map((inv) => (
                            <tr key={inv.id}>
                              <td className="px-4 py-3 font-mono text-xs">{inv.paymentReference || `INV-${inv.id}`}</td>
                              <td className="px-4 py-3 font-bold text-gray-900">KES {Number(inv.amount || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 uppercase text-xs">{inv.paymentMethod || 'Manual'}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${inv.status === 'paid' ? 'bg-green-100 text-green-800' : inv.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500">
                                {inv.paidAt ? new Date(inv.paidAt).toLocaleString() : new Date(inv.dueDate || inv.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="px-4 py-8 text-center text-gray-500 text-xs">
                              No invoice entries recorded yet for this subscriber.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: MEAL OCCURRENCE MANAGEMENT (Gap #8) */}
              {activeModalTab === 'occurrences' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-gray-800">Scheduled Meal Deliveries</h4>
                    {loadingOccurrences && <LoadingSpinner size="sm" />}
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Meal Details</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Routing / Address</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-600">Admin Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {subscriptionOccurrences.map((occ) => (
                          <tr key={occ.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                              {new Date(occ.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold">{occ.schedule?.preferredFastFoodItem?.name || 'Selected Dish'}</div>
                              <div className="text-gray-500 capitalize">{occ.schedule?.mealTimeType} • {occ.schedule?.preferredTime}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 font-bold rounded-full text-[10px] ${getOccurrenceStatusColor(occ.status)}`}>
                                {occ.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 max-w-xs truncate text-gray-600">
                              {occ.deliveryAddress || (occ.pickupStationId ? 'Pickup Station' : 'Standard Address')}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right space-x-1.5">
                              {occ.status !== 'delivered' && (
                                <button
                                  onClick={() => handleUpdateOccurrenceStatus(occ.id, 'delivered')}
                                  disabled={processingOccurrenceId === occ.id}
                                  className="px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 font-bold rounded border border-green-200"
                                >
                                  ✓ Deliver
                                </button>
                              )}
                              {occ.status !== 'skipped' && (
                                <button
                                  onClick={() => handleUpdateOccurrenceStatus(occ.id, 'skipped')}
                                  disabled={processingOccurrenceId === occ.id}
                                  className="px-2 py-1 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 font-bold rounded border border-yellow-200"
                                >
                                  Skip
                                </button>
                              )}
                              <button
                                onClick={() => setRescheduleModal({ isOpen: true, occurrence: occ, newDate: occ.date })}
                                className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded border border-blue-200"
                              >
                                Reschedule
                              </button>
                              <button
                                onClick={() => setAddressModal({ isOpen: true, occurrence: occ, newAddress: occ.deliveryAddress || '' })}
                                className="px-2 py-1 bg-gray-50 text-gray-700 hover:bg-gray-100 font-bold rounded border border-gray-200"
                              >
                                Edit Addr
                              </button>
                            </td>
                          </tr>
                        ))}
                        {subscriptionOccurrences.length === 0 && (
                          <tr>
                            <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                              No meal delivery records generated yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: STATUS OVERRIDE & MIGRATION (Gaps #9, #11) */}
              {activeModalTab === 'override' && (
                <div className="space-y-6">
                  {/* Manual Status Override Form */}
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
                    <h4 className="text-sm font-bold text-gray-900">Manual Status & Expiry Override (Gap #9)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Set Subscription Status</label>
                        <select
                          value={overrideStatus}
                          onChange={(e) => setOverrideStatus(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
                        >
                          <option value="Active">Active</option>
                          <option value="Trial">Trial</option>
                          <option value="Paused">Paused</option>
                          <option value="Grace">Grace</option>
                          <option value="Past Due">Past Due</option>
                          <option value="Expired">Expired</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Extend Validity (Days)</label>
                        <input
                          type="number"
                          min="0"
                          value={extendDays}
                          onChange={(e) => setExtendDays(parseInt(e.target.value, 10) || 0)}
                          placeholder="e.g. 7 or 30 days"
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Reason for Override (Audit Log)</label>
                      <input
                        type="text"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="e.g. Customer payment dispute resolved / manual extension"
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    <button
                      onClick={handleSaveStatusOverride}
                      disabled={isUpdatingStatus}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm disabled:opacity-50"
                    >
                      {isUpdatingStatus ? 'Updating...' : 'Save Status & Expiry Override'}
                    </button>
                  </div>

                  {/* Plan Migration Form (Gap #11) */}
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-4">
                    <h4 className="text-sm font-bold text-purple-900">Migrate Subscriber to Another Plan (Gap #11)</h4>
                    <p className="text-xs text-purple-700">
                      Instantly upgrades or migrates this subscriber to any published plan without re-registering.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Target Plan</label>
                        <select
                          value={migrationModal.targetPlanId}
                          onChange={(e) => setMigrationModal(m => ({ ...m, targetPlanId: e.target.value }))}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
                        >
                          <option value="">Select Target Plan...</option>
                          {plans.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.type} - KES {p.price})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Migration Reason</label>
                        <input
                          type="text"
                          value={migrationModal.reason}
                          onChange={(e) => setMigrationModal(m => ({ ...m, reason: e.target.value }))}
                          placeholder="e.g. Customer upgraded via support"
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleExecuteMigration}
                      disabled={isMigrating || !migrationModal.targetPlanId}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-sm disabled:opacity-50"
                    >
                      {isMigrating ? 'Migrating...' : 'Confirm Plan Migration'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              {selectedSubscription.status === 'Active' && (
                <button
                  onClick={() => handleCancelClick(selectedSubscription.id)}
                  className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-xl font-bold text-xs transition-colors"
                >
                  Cancel Subscription...
                </button>
              )}
              <div className="ml-auto">
                <button
                  onClick={handleCloseSubscriptionDetails}
                  className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RESCHEDULE OCCURRENCE MODAL (Gap #8) ── */}
      {rescheduleModal.isOpen && rescheduleModal.occurrence && (
        <div className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h4 className="font-bold text-gray-900 text-sm">Reschedule Meal Occurrence</h4>
            <p className="text-xs text-gray-500">Pick a new delivery date for this specific meal occurrence.</p>
            <input
              type="date"
              value={rescheduleModal.newDate}
              onChange={(e) => setRescheduleModal(r => ({ ...r, newDate: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRescheduleModal({ isOpen: false, occurrence: null, newDate: '' })}
                className="px-3 py-1.5 text-xs text-gray-600 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRescheduleOccurrenceSubmit}
                className="px-4 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg shadow-sm"
              >
                Save Date
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADDRESS OCCURRENCE MODAL (Gap #8) ── */}
      {addressModal.isOpen && addressModal.occurrence && (
        <div className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h4 className="font-bold text-gray-900 text-sm">Update Delivery Routing</h4>
            <p className="text-xs text-gray-500">Update destination delivery address for this occurrence.</p>
            <input
              type="text"
              value={addressModal.newAddress}
              onChange={(e) => setAddressModal(a => ({ ...a, newAddress: e.target.value }))}
              placeholder="e.g. Hall 4, Room 12 or Street Address"
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAddressModal({ isOpen: false, occurrence: null, newAddress: '' })}
                className="px-3 py-1.5 text-xs text-gray-600 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateOccurrenceAddressSubmit}
                className="px-4 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg shadow-sm"
              >
                Save Routing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK ACTION CONFIRMATION MODAL (Gap #12) ── */}
      {bulkActionModal.isOpen && (
        <div className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 capitalize">
              Confirm Bulk {bulkActionModal.action}
            </h3>
            <p className="text-sm text-gray-600">
              You are about to <strong>{bulkActionModal.action}</strong> {selectedSubIds.size} subscription(s).
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Bulk Action</label>
              <input
                type="text"
                value={bulkActionModal.reason}
                onChange={(e) => setBulkActionModal(b => ({ ...b, reason: e.target.value }))}
                placeholder="e.g. End of semester batch update"
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setBulkActionModal({ isOpen: false, action: '', reason: '' })}
                className="px-4 py-2 text-xs font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkAction}
                disabled={isProcessingBulk}
                className={`px-4 py-2 text-white font-bold text-xs rounded-lg shadow-sm ${bulkActionModal.action === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isProcessingBulk ? 'Processing...' : `Confirm Bulk ${bulkActionModal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {showDeleteConfirm && deleteCheckInfo && deletingItem && (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">
              {deleteCheckInfo.canDelete ? 'Confirm Deletion' : 'Cannot Delete'}
            </h3>
            <p className="text-sm text-gray-600">{deleteCheckInfo.reason}</p>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={cancelDelete} className="px-4 py-2 text-sm text-gray-600 font-semibold">
                Cancel
              </button>
              {deleteCheckInfo.canDelete && (
                <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-lg shadow-sm">
                  Confirm Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS: Plan Editor & Package Editor ── */}
      {showPlanModal && (
        <AdminPlanEditorModal
          plan={editingPlan}
          onClose={() => { setShowPlanModal(false); setEditingPlan(null); }}
          onSave={() => { setShowPlanModal(false); setEditingPlan(null); fetchData(); }}
        />
      )}

      {showPackageModal && (
        <AdminBenefitPackageModal
          pkg={editingPackage}
          onClose={() => { setShowPackageModal(false); setEditingPackage(null); }}
          onSave={() => { setShowPackageModal(false); setEditingPackage(null); fetchData(); }}
        />
      )}

      {/* ── CANCEL SUBSCRIPTION DIALOG ── */}
      <CustomDialog
        isOpen={showCancelModal}
        onClose={() => { setShowCancelModal(false); setCancelSubscriptionId(null); }}
        title="Cancel Subscription"
        confirmText="Confirm Cancellation"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        onConfirm={handleConfirmCancel}
      >
        <div className="space-y-4 text-left">
          <p className="text-sm text-gray-600">
            Are you sure you want to cancel this subscription? The user will lose access to all subscription benefits.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="" disabled>Select a reason</option>
              <option value="Customer Requested">Customer Requested</option>
              <option value="Payment Failed / Fraud">Payment Failed / Fraud</option>
              <option value="Logistical / Delivery Area Issue">Logistical / Delivery Area Issue</option>
              <option value="Violation of Terms">Violation of Terms</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={issueRefund}
              onChange={(e) => setIssueRefund(e.target.checked)}
              className="mt-1 h-4 w-4 text-red-600 rounded"
            />
            <div className="text-xs">
              <span className="font-bold text-gray-900 block">Issue Prorated Refund to Wallet</span>
              <span className="text-gray-500">Calculates value of remaining unfulfilled meals and credits wallet.</span>
            </div>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Admin Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={cancelPassword}
              onChange={(e) => setCancelPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </CustomDialog>
    </div>
  );
}
