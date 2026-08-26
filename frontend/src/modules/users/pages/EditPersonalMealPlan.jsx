import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import subscriptionService from '@/shared/services/subscriptionService';
import api from '@/shared/services/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import MealPlanBuilder from '@/shared/components/MealPlanBuilder';

export default function EditPersonalMealPlan() {
  const navigate = useNavigate();
  const { planId } = useParams();

  // ── Data ──────────────────────────────────────────────
  const [fastFoodItems,     setFastFoodItems]     = useState([]);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [existingPlan,      setExistingPlan]      = useState(null);

  // ── Builder lift-state ────────────────────────────────
  const [planName,         setPlanName]         = useState('');
  const [billingCycle,     setBillingCycle]     = useState('weekly');
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [isSubmitting,     setIsSubmitting]     = useState(false);

  useEffect(() => { fetchData(); }, [planId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [foodRes, packagesRes, plansRes] = await Promise.all([
        api.get('/fastfood?limit=100'),
        subscriptionService.getAvailablePackages(),
        subscriptionService.getPlans('meal'),
      ]);
      
      setFastFoodItems(foodRes.data?.data || (Array.isArray(foodRes.data) ? foodRes.data : []));
      setAvailablePackages(packagesRes || []);
      
      // Find the specific plan
      const allPlans = plansRes || [];
      const plan = allPlans.find(p => p.id === parseInt(planId));
      
      if (!plan) {
        toast.error('Meal plan not found');
        navigate('/customer/meal-plans');
        return;
      }
      
      // Fetch user's active subscriptions to see if this plan is currently active
      const mySubs = await subscriptionService.getMySubscriptions('meal');
      const hasActiveSub = (mySubs || []).some(sub => sub.planId === plan.id && sub.status === 'Active');
      
      if (hasActiveSub) {
        toast.error('This plan cannot be edited because you have an active subscription to it.');
        navigate('/customer/meal-plans');
        return;
      }

      // Check if it's the user's own plan (they can only edit plans they created)
      if (!plan.creatorId) {
        toast.error('Only personal plans can be edited');
        navigate('/customer/meal-plans');
        return;
      }
      
      setExistingPlan(plan);
      
      console.log('📋 Loaded plan for editing:', plan);
      console.log('📋 Template schedule:', plan.templateSchedule);
      console.log('📋 Benefit package ID:', plan.benefitPackageId);
      
      // Clean up display name (remove date pattern)
      let displayName = plan.name;
      displayName = displayName.replace(/[–-]\s*\d{1,2}\/\d{1,2}\/\d{4}/, '').trim();
      
      setPlanName(displayName);
      setBillingCycle(plan.billingCycle || 'weekly');
      setSelectedPackageId(plan.benefitPackageId || null);
      
    } catch (err) {
      toast.error('Failed to load data');
      navigate('/customer/meal-plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (payload) => {
    setIsSubmitting(true);
    try {
      if (!payload.name) payload.name = 'My Meal Plan';
      if (!payload.description) payload.description = '';
      
      // Call customer-facing update endpoint
      const res = await api.put(`/subscriptions/my/plans/${planId}`, payload);
      toast.success(res.data?.message || 'Your meal plan has been updated!');
      navigate('/customer/meal-plans');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update meal plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/customer/meal-plans')}
        className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Meal Plans
      </button>

      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Your Personal Meal Plan</h2>
        <p className="text-sm sm:text-base text-gray-500 mt-1">Modify your custom meal plan before subscribing</p>
      </div>

      <MealPlanBuilder
        mode="customer"
        planName={planName}
        onPlanNameChange={setPlanName}
        billingCycle={billingCycle}
        onBillingCycleChange={setBillingCycle}
        benefitPackages={availablePackages}
        selectedPackageId={selectedPackageId}
        onPackageChange={setSelectedPackageId}
        fastFoodItems={fastFoodItems}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Update My Meal Plan →"
        initialSchedule={existingPlan?.templateSchedule || []}
      />
    </div>
  );
}
