import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import subscriptionService from '@/shared/services/subscriptionService';
import api from '@/shared/services/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import MealPlanBuilder from '@/shared/components/MealPlanBuilder';

export default function CreatePersonalMealPlan() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // ── Data ──────────────────────────────────────────────
  const [fastFoodItems,     setFastFoodItems]     = useState([]);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [loading,           setLoading]           = useState(true);

  // ── Builder lift-state ────────────────────────────────
  const [planName,         setPlanName]         = useState('');
  const [billingCycle,     setBillingCycle]     = useState('weekly');
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [isSubmitting,     setIsSubmitting]     = useState(false);
  const [currentSlots,     setCurrentSlots]     = useState([]);
  const [displayPrice,     setDisplayPrice]     = useState(0);

  const [activeTab,          setActiveTab]          = useState('create'); // 'create' or 'packages'
  const [expandedPkgId,      setExpandedPkgId]      = useState(null); // ID of package showing details

  const describeBenefit = (benefit) => {
    const name = benefit.feature?.name || benefit.featureName || benefit.featureCode || 'This feature';
    const val = benefit.value || {};

    if (benefit.limitType === 'counter') {
      const limit = val.limit ?? 0;
      const period = val.resetPeriod || 'monthly';
      const periodText = period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month';
      return `The subscriber gets ${limit} ${name} every ${periodText}.`;
    }

    if (benefit.limitType === 'value') {
      const amount = val.amount ?? 0;
      const unit = val.unit || 'KES';
      return `The subscriber receives ${amount} ${unit} as ${name}.`;
    }

    if (benefit.limitType === 'rate') {
      const pct = val.discountPercent ?? 0;
      const minOrder = val.conditions?.minOrderValue;
      const maxLimit = val.maxDiscount;
      const limit = val.limit;
      const period = val.resetPeriod || 'monthly';
      const periodText = period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month';

      let parts = [`The subscriber receives a ${pct}% ${name}`];
      if (minOrder > 0) parts.push(`on orders over ${minOrder} KES`);
      if (maxLimit > 0) parts.push(`up to a maximum discount of ${maxLimit} KES`);
      if (limit > 0) parts.push(`, limited to ${limit} times per ${periodText}`);
      else parts.push(`, with unlimited usage`);
      return parts.join(' ') + '.';
    }

    if (benefit.limitType === 'boolean') {
      const enabled = val.enabled ?? true;
      if (!enabled) return `${name} is currently disabled.`;

      if (benefit.featureCode === 'free_delivery' || benefit.feature?.code === 'free_delivery') {
        const minOrder = val.conditions?.minOrderValue;
        const maxDeliveries = val.maxFreeDeliveries;
        const period = val.resetPeriod || 'monthly';
        let msg = `The subscriber gets free delivery`;
        if (minOrder > 0) msg += ` on orders over ${minOrder} KES`;
        if (maxDeliveries > 0) msg += `, limited to ${maxDeliveries} times per ${period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'}`;
        else msg += `, with unlimited usage`;
        return msg + '.';
      }

      const category = benefit.category || benefit.feature?.category || '';
      if (category === 'Support') {
        const rt = val.responseTime;
        const ch = Array.isArray(val.supportChannels) ? val.supportChannels.join(', ') : val.supportChannels;
        let msg = `The subscriber has Priority Support enabled`;
        if (rt || ch) msg += ` (`;
        if (rt) msg += `Response time: ${rt}`;
        if (rt && ch) msg += `, `;
        if (ch) msg += `Channels: ${ch}`;
        if (rt || ch) msg += `)`;
        return msg + '.';
      }
      return `${name} is enabled.`;
    }

    return name;
  };

  const handleApplyPackage = (pkgId) => {
    setSelectedPackageId(pkgId);
    setActiveTab('create');
    toast.success('Benefit package applied to your meal plan configuration!');
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [foodRes, packagesRes] = await Promise.all([
        api.get('/fastfood?limit=100'),
        subscriptionService.getAvailablePackages(),
      ]);
      setFastFoodItems(foodRes.data?.data || (Array.isArray(foodRes.data) ? foodRes.data : []));
      setAvailablePackages(packagesRes || []);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (payload, subscribeNow = false) => {
    setIsSubmitting(true);
    try {
      if (!payload.name) payload.name = 'My Meal Plan';
      if (!payload.description) payload.description = '';
      
      // Always create the plan first
      const planRes = await subscriptionService.createUserPlan(payload);
      const createdPlan = planRes.data || planRes.plan;
      
      if (!createdPlan?.id) {
        throw new Error('Plan created but ID not returned');
      }

      if (subscribeNow) {
        // Step 2: Create payment for the plan
        console.log('💳 Creating payment...');
        const payment = await subscriptionService.createSubscriptionPayment(
          createdPlan.id,
          'mpesa' // Default to M-Pesa for logged users, could be made configurable
        );
        
        // Step 3: Process M-Pesa payment
        console.log('📱 Processing M-Pesa payment...');
        const PaymentService = (await import('@/modules/services/services/paymentService.js')).default;
        const paymentResult = await PaymentService.initiateMpesaPayment(
          payment.orderId,
          user?.phone, // Use user's registered phone
          payment.amount
        );
        
        // Step 4: Poll for payment completion
        let paymentCompleted = false;
        let attempts = 0;
        const maxAttempts = 30;
        
        while (!paymentCompleted && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          const paymentId = paymentResult.payment?.id || paymentResult.paymentId;
          const status = await PaymentService.checkPaymentStatus(paymentId);
          
          if (status.payment?.status === 'completed') {
            paymentCompleted = true;
            break;
          } else if (status.payment?.status === 'failed') {
            throw new Error('Payment failed. Please try again.');
          }
          
          attempts++;
        }
        
        if (!paymentCompleted) {
          throw new Error('Payment is taking longer than expected. Please check your M-Pesa and try again.');
        }
        
        // Step 5: Confirm subscription after successful payment
        console.log('✅ Confirming subscription...');
        await subscriptionService.confirmSubscriptionPayment(payment.id, {
          paymentId: paymentResult.payment?.id || paymentResult.paymentId
        });
        
        toast.success('🎉 Plan created and payment successful! Your subscription is now active!');
        navigate('/customer/my-subscription');
      } else {
        // Regular create flow - just create and go to plans list
        toast.success('✅ Your personal meal plan has been created!');
        navigate('/customer/meal-plans');
      }
    } catch (err) {
      console.error('❌ Operation failed:', err);
      toast.error(err.response?.data?.error || err.message || `Failed to ${subscribeNow ? 'create and subscribe to' : 'create'} meal plan`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (subscribeNow) => {
    // Validate
    if (currentSlots.length === 0) {
      toast.error('Please add at least one meal slot');
      return;
    }
    if (currentSlots.some(s => !Object.keys(s.fastFoodItemQtys || {}).length)) {
      toast.error('Every slot must have at least one dish assigned');
      return;
    }

    // Build the payload from current state
    const payload = {
      name: planName || 'My Meal Plan',
      description: '',
      billingCycle,
      templateSchedule: currentSlots.map(({ _id, fastFoodItemId: _l, fastFoodItemIds: _li, fastFoodItemQtys, ...rest }) => ({
        ...rest,
        fastFoodItemIds: Object.entries(fastFoodItemQtys || {}).flatMap(([id, qty]) =>
          Array(qty).fill(Number(id))
        ),
      })),
      benefitPackageId: selectedPackageId || null,
    };
    
    handleSubmit(payload, subscribeNow);
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

      <div className="mb-4 sm:mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Configure Meal Subscription</h2>
          <p className="text-sm text-gray-500 mt-1">Design a plan or explore benefit options</p>
        </div>
      </div>

      {/* Segmented Controls / Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl mb-6 max-w-md">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2 px-3 text-center font-bold text-xs sm:text-sm rounded-lg transition-all ${
            activeTab === 'create'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🍳 Create Meal Plan
        </button>
        <button
          onClick={() => setActiveTab('packages')}
          className={`flex-1 py-2 px-3 text-center font-bold text-xs sm:text-sm rounded-lg transition-all ${
            activeTab === 'packages'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          💎 Benefit Packages
        </button>
      </div>

      {activeTab === 'create' ? (
        <div className="space-y-6">
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
            onScheduleChange={setCurrentSlots}
            onPriceChange={setDisplayPrice}
            onSubmit={() => {}} // Disabled - we handle submission in custom footer
            isSubmitting={isSubmitting}
            submitLabel="" // Hide default footer
          />

          {/* Custom Footer with Two Buttons */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 flex flex-col lg:flex-row items-center justify-between gap-4 mt-6">
            <div>
              <p className="text-white text-3xl font-extrabold">KES {Math.round(displayPrice || 0)}</p>
              <p className="text-blue-100 text-sm mt-1">Final price with benefits applied</p>
              {currentSlots.filter(s => !Object.keys(s.fastFoodItemQtys || {}).length).length > 0 && (
                <p className="text-amber-300 text-sm mt-1">
                  <span>({currentSlots.filter(s => !Object.keys(s.fastFoodItemQtys || {}).length).length} slot{currentSlots.filter(s => !Object.keys(s.fastFoodItemQtys || {}).length).length !== 1 ? 's' : ''} without a dish)</span>
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleFormSubmit(false)}
                disabled={isSubmitting || currentSlots.length === 0 || currentSlots.some(s => !Object.keys(s.fastFoodItemQtys || {}).length)}
                className="bg-white/20 hover:bg-white/30 text-white font-bold px-6 py-3 rounded-lg border border-white/30 transition-all text-sm shadow-lg disabled:opacity-50 flex-1 sm:flex-none whitespace-nowrap"
              >
                {isSubmitting ? 'Creating...' : 'Create & Save for Later'}
              </button>
              <button
                type="button"
                onClick={() => handleFormSubmit(true)}
                disabled={isSubmitting || currentSlots.length === 0 || currentSlots.some(s => !Object.keys(s.fastFoodItemQtys || {}).length)}
                className="bg-white text-blue-700 font-bold px-8 py-3 rounded-lg shadow-xl hover:bg-blue-50 transition-all text-sm disabled:opacity-50 flex-1 sm:flex-none whitespace-nowrap"
              >
                {isSubmitting ? 'Processing...' : '⚡ Create & Subscribe Now'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4 max-w-3xl">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>💎 Available Benefit Packages</span>
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Review packages that apply discounts, free food, or free delivery to your custom meal schedule.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availablePackages.map(pkg => {
              const isExpanded = expandedPkgId === pkg.id;
              return (
                <div key={pkg.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-all flex flex-col h-full justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h4 className="font-bold text-base text-gray-800">{pkg.name}</h4>
                      <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {pkg.price > 0 ? `KES ${pkg.price}` : 'Free'}
                      </span>
                    </div>
                    {pkg.description && (
                      <p className="text-xs text-gray-500 mb-4">{pkg.description}</p>
                    )}
                    
                    {/* Benefit Highlight Bullet Items */}
                    <div className="space-y-2 mb-4">
                      {pkg.benefits?.map((benefit, bIdx) => {
                        const name = benefit.feature?.name || benefit.featureName || benefit.featureCode || 'Feature';
                        const val = benefit.value || {};
                        
                        let desc = '';
                        if (benefit.limitType === 'rate') {
                          desc = `${val.discountPercent}% Off ${name}`;
                          if (val.conditions?.minOrderValue) desc += ` (Min: KES ${val.conditions.minOrderValue})`;
                        } else if (benefit.limitType === 'boolean' && (benefit.featureCode === 'free_delivery' || benefit.feature?.code === 'free_delivery')) {
                          desc = `Free Delivery`;
                          if (val.maxFreeDeliveries) desc += ` (Up to ${val.maxFreeDeliveries})`;
                        } else {
                          desc = `${name}`;
                        }

                        return (
                          <div key={bIdx} className="flex items-start gap-1.5 text-xs text-gray-700">
                            <span className="text-blue-500 font-bold">✓</span>
                            <span>{desc}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Detailed sentence descriptions if expanded */}
                    {isExpanded && pkg.benefits?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 bg-blue-50/30 rounded-lg p-3 space-y-2">
                        <h5 className="text-[10px] font-bold text-blue-900 uppercase tracking-wider mb-1.5">Package Specifications:</h5>
                        {pkg.benefits.map((benefit, bIdx) => (
                          <div key={bIdx} className="text-xs text-blue-950/80 leading-relaxed pl-2 border-l border-blue-200">
                            • {describeBenefit(benefit)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedPkgId(isExpanded ? null : pkg.id)}
                      className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold border border-gray-200 transition-colors shadow-sm whitespace-nowrap"
                    >
                      {isExpanded ? 'Hide Details' : '🔍 View Details'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPackage(pkg.id)}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm whitespace-nowrap"
                    >
                      ✓ Apply Package
                    </button>
                  </div>
                </div>
              );
            })}
            {availablePackages.length === 0 && (
              <p className="text-xs text-gray-400 italic text-center py-4 col-span-2">No benefit packages available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}