import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import subscriptionService from '@/shared/services/subscriptionService';
import paymentService from '@/modules/services/services/paymentService';
import api from '@/shared/services/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import ScheduleProjectedCost from '@/shared/components/ScheduleProjectedCost';
import SubscriptionConfirmation from '@/shared/components/SubscriptionConfirmation';

const generateBenefitSummary = (benefit, packageType = 'meal') => {
  const name = benefit.feature?.name || benefit.featureName || 'This feature';
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
    
    if (benefit.category === 'Delivery' && benefit.featureCode === 'free_delivery') {
      const minOrder = val.conditions?.minOrderValue;
      const maxDeliveries = val.maxFreeDeliveries;
      const period = val.resetPeriod || 'monthly';
      
      if (packageType === 'seller') {
        let msg = `The seller gets free delivery when transporting inventory to the warehouse or pickup station`;
        if (maxDeliveries > 0) msg += `, limited to ${maxDeliveries} times per ${period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'}`;
        else msg += `, with unlimited usage`;
        return msg + '.';
      }

      let msg = `The subscriber gets free delivery`;
      if (minOrder > 0) msg += ` on orders over ${minOrder} KES`;
      if (maxDeliveries > 0) msg += `, limited to ${maxDeliveries} times per ${period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'}`;
      else msg += `, with unlimited usage`;
      return msg + '.';
    }
    
    if (benefit.category === 'Support') {
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
    
    if (benefit.category === 'Meal' && benefit.featureCode?.includes('skip')) {
       const skips = val.skipsPerMonth;
       if (skips > 0) return `The subscriber is allowed to skip ${skips} meals per month.`;
       return `The subscriber is allowed to skip meals (unlimited skips).`;
    }
    
    return `${name} is enabled for this subscriber.`;
  }
  
  return 'Configure the exact values below.';
};

// Compute original price without benefits (raw food + delivery cost)
const computeOriginalPrice = (plan) => {
  const FALLBACK_FEE = 50;
  const INCREMENT_RATE = 0.55;

  const schedule = plan.templateSchedule || [];

  // Group by delivery trip (same day+time)
  const grouped = {};
  schedule.forEach(entry => {
    const key = `${entry.dayOfWeek}|${entry.preferredTime}`;
    if (!grouped[key]) grouped[key] = [];
    const items = entry.fastFoodItems || (entry.fastFoodItem ? [entry.fastFoodItem] : []);
    items.forEach(f => grouped[key].push({
      basePrice: parseFloat(f.discountPrice || f.displayPrice || f.basePrice || 0),
      sellerId: f.sellerId || 'x',
      deliveryFee: parseFloat(f.deliveryFee || FALLBACK_FEE)
    }));
  });

  let totalFood = 0;
  let totalDel = 0;
  
  Object.values(grouped).forEach(items => {
    if (!items.length) return;
    
    // Calculate food cost (no discounts)
    items.forEach(item => {
      totalFood += item.basePrice;
    });
    
    // Calculate delivery cost
    const vQty = {}, vFee = {};
    items.forEach(i => {
      vQty[i.sellerId] = (vQty[i.sellerId] || 0) + 1;
      if (vFee[i.sellerId] === undefined) vFee[i.sellerId] = i.deliveryFee;
    });
    Object.keys(vQty).forEach(v => { 
      totalDel += vFee[v] + vFee[v] * INCREMENT_RATE * Math.max(0, vQty[v] - 1); 
    });
  });

  return Math.round(totalFood + totalDel);
};

// Compute final price after benefits and delivery for a plan
const computeFinalPrice = (plan) => {
  const FALLBACK_FEE = 50;
  const INCREMENT_RATE = 0.55;

  const schedule = plan.templateSchedule || [];
  const benefits = plan.benefitPackage?.benefits || plan.benefits || [];

  const freeMealsBenefit    = benefits.find(b => (b.featureCode || b.feature?.code) === 'free_meals');
  const freeDeliveryBenefit = benefits.find(b => ['free_delivery', 'reduced_delivery_fee'].includes(b.featureCode || b.feature?.code));
  const mealDiscountBenefit = benefits.find(b => ['meal_discount', 'disc'].includes(b.featureCode || b.feature?.code));

  const maxFreeMeals      = freeMealsBenefit?.value?.limit || 0;
  const maxMealValue      = freeMealsBenefit?.value?.maxMealValue || 0;
  const hasFreeDelivery   = !!freeDeliveryBenefit;
  const isFDUnlimited     = !freeDeliveryBenefit?.value?.limit && !freeDeliveryBenefit?.value?.maxFreeDeliveries;
  const maxFreeDeliveries = freeDeliveryBenefit?.value?.limit || freeDeliveryBenefit?.value?.maxFreeDeliveries || 0;
  const mealDiscountPct   = mealDiscountBenefit?.value?.discountPercent || mealDiscountBenefit?.value?.amount || 0;
  const mealDiscountMin   = mealDiscountBenefit?.value?.conditions?.minOrderValue || mealDiscountBenefit?.value?.minOrderValue || 0;

  // Group by delivery trip (same day+time)
  const grouped = {};
  schedule.forEach(entry => {
    const key = `${entry.dayOfWeek}|${entry.preferredTime}`;
    if (!grouped[key]) grouped[key] = [];
    const items = entry.fastFoodItems || (entry.fastFoodItem ? [entry.fastFoodItem] : []);
    items.forEach(f => grouped[key].push({
      basePrice: parseFloat(f.discountPrice || f.displayPrice || f.basePrice || 0),
      sellerId: f.sellerId || 'x',
      deliveryFee: parseFloat(f.deliveryFee || FALLBACK_FEE)
    }));
  });

  let freeMealsUsed = 0;
  let freeDeliveriesUsed = 0;
  let finalFood = 0;
  let finalDel = 0;
  Object.values(grouped).forEach(items => {
    if (!items.length) return;
    const totalBase = items.reduce((s, i) => s + i.basePrice, 0);

    const vQty = {}, vFee = {};
    items.forEach(i => {
      vQty[i.sellerId] = (vQty[i.sellerId] || 0) + 1;
      if (vFee[i.sellerId] === undefined) vFee[i.sellerId] = i.deliveryFee;
    });
    let calcDel = 0;
    Object.keys(vQty).forEach(v => { calcDel += vFee[v] + vFee[v] * INCREMENT_RATE * Math.max(0, vQty[v] - 1); });

    let rowFood = 0;
    items.forEach(item => {
      let price = item.basePrice;
      if (freeMealsUsed < maxFreeMeals) {
        price = Math.max(0, price - (maxMealValue > 0 ? Math.min(price, maxMealValue) : price));
        freeMealsUsed++;
      } else if (mealDiscountPct > 0 && totalBase >= mealDiscountMin) {
        price = Math.max(0, price * (1 - mealDiscountPct / 100));
      }
      rowFood += price;
    });

    let rowDel = calcDel;
    if (hasFreeDelivery && (isFDUnlimited || freeDeliveriesUsed < maxFreeDeliveries)) {
      const minOrder = freeDeliveryBenefit.value?.conditions?.minOrderValue || freeDeliveryBenefit.value?.minOrderValue || 0;
      if (totalBase >= minOrder) {
        const pct = freeDeliveryBenefit.value?.discountPercent || freeDeliveryBenefit.value?.amount;
        rowDel = (pct > 0 && pct < 100) ? Math.max(0, calcDel * (1 - pct / 100)) : 0;
        freeDeliveriesUsed++;
      }
    }

    finalFood += rowFood;
    finalDel  += rowDel;
  });

  return Math.round(finalFood + finalDel);
};

export default function CustomerMealPlans() {
  const [mealPlans, setMealPlans] = useState([]);
  const [fastFoodItems, setFastFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingPlan, setViewingPlan] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [subscribedPlanIds, setSubscribedPlanIds] = useState(new Set());

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const fetchList = [
        subscriptionService.getPlans('meal'),
        api.get('/fastfood?limit=100')
      ];
      // Also fetch user's subscriptions if logged in
      if (user) {
        fetchList.push(subscriptionService.getMySubscriptions('meal'));
      }
      const results = await Promise.all(fetchList);
      const mPlans = results[0];
      const foodRes = results[1];
      const mySubs = results[2] || [];

      // Build set of plan IDs the user is subscribed to
      const subPlanIds = new Set();
      (Array.isArray(mySubs) ? mySubs : []).forEach(sub => {
        if (sub.planId) subPlanIds.add(sub.planId);
      });
      setSubscribedPlanIds(subPlanIds);

      // Only show published plans to customers
      const filteredPlans = (mPlans || []).filter(plan => plan.status === 'Published' && (plan.isVisible || plan.creatorId === user?.id));
      console.log('📋 All meal plans:', filteredPlans);
      setMealPlans(filteredPlans);
      setFastFoodItems(foodRes.data?.data || (Array.isArray(foodRes.data) ? foodRes.data : []));
    } catch (err) {
      toast.error('Failed to load meal plans');
    } finally {
      setLoading(false);
    }
  };
  const handleViewPlan = (plan) => {
    console.log('📊 Viewing plan:', plan);
    console.log('📦 Benefits:', plan.benefits);
    console.log('🎁 Benefit Package:', plan.benefitPackage);
    setViewingPlan(plan);
    setShowViewModal(true);
  };

  const handlePlanCheckout = async (plan) => {
    // Support both logged in users and guests for meal plans
    // (Seller plans would still require login)
    
    // Step 1: Show confirmation dialog
    setSelectedPlan(plan);
    setShowConfirmation(true);
  };

  const handleConfirmSubscription = async (plan, paymentData) => {
    setIsSubmitting(true);
    
    try {
      // Create subscription with payment verification data
      console.log('📋 Creating subscription...');
      const subscriptionPayload = {
        planId: plan.id,
        customSchedule: plan.templateSchedule,
        // Add payment verification fields
        paymentProofUrl: paymentData.paymentProofUrl,
        paymentMethod: `Prepay - ${paymentData.paymentSubMethod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        paymentSubType: paymentData.paymentSubMethod
      };

      // Add guest data if user is not logged in
      if (paymentData.guestData) {
        subscriptionPayload.guestName = paymentData.guestData.name;
        subscriptionPayload.guestEmail = paymentData.guestData.email;
        subscriptionPayload.guestPhone = paymentData.guestData.phone;
        subscriptionPayload.guestDeliveryAddress = paymentData.guestData.deliveryAddress;
      }

      // Create subscription with payment verification
      const subscriptionResponse = await api.post('/subscriptions/subscribe', subscriptionPayload);
      const { subscription, guestManageToken, manageUrl, paymentStatus } = subscriptionResponse.data;
      
      console.log('✅ Subscription created:', subscription.id);

      // Check if payment verification is needed
      if (paymentStatus === 'pending_verification') {
        toast.success('Subscription created! Your payment is being verified. You will be notified once approved.', {
          duration: 6000,
          position: 'top-center',
        });
      } else {
        toast.success('Subscription activated successfully!', {
          duration: 4000,
          position: 'top-center',
        });
      }

      // Update state and close dialog
      setShowConfirmation(false);
      setSelectedPlan(null);
      
      // Redirect based on user type
      if (paymentData.guestData) {
        if (manageUrl) {
          toast.info(`📧 Save this link to manage your subscription: ${window.location.origin}${manageUrl}`);
        } else {
          toast.info('📧 Subscription details sent to your email.');
        }
      } else {
        // For registered users, redirect to orders page
        navigate('/customer/orders');
        toast.info('💡 Track your subscription status in "My Orders".');
      }
      
    } catch (err) {
      console.error('❌ Subscription failed:', err);
      toast.error(err.response?.data?.error || err.message || 'Subscription failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setSelectedPlan(null);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-3 sm:py-8 sm:px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">Available Meal Plans</h1>
          <p className="text-sm sm:text-base text-gray-600">Choose a meal plan that fits your lifestyle and budget</p>
        </div>

        {/* Meal Plans Grid */}
        {mealPlans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
            <div className="text-gray-400 text-4xl sm:text-5xl mb-4">🍽️</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">No Meal Plans Available</h3>
            <p className="text-sm sm:text-base text-gray-500 mb-6">
              We're currently working on adding meal plans. Check back soon!
            </p>
            <button
              onClick={() => navigate('/customer/subscriptions/create')}
              className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              Create Custom Meal Plan Instead
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {mealPlans.map(plan => {
              const originalPrice = computeOriginalPrice(plan);
              const finalPrice = computeFinalPrice(plan);
              const hasDiscount = finalPrice < originalPrice;
              const savingsAmount = originalPrice - finalPrice;
              
              console.log(`Plan "${plan.name}":`, {
                originalPrice,
                finalPrice,
                hasDiscount,
                savingsAmount,
                hasBenefits: (plan.benefitPackage?.benefits?.length || plan.benefits?.length || 0) > 0
              });
              
              // Check if this is a personal plan (created by the current user)
              const isPersonalPlan = plan.creatorId === user?.id;
              
              // Clean up personal plan display
              let displayName = plan.name;
              let displayDescription = plan.description;
              
              if (isPersonalPlan) {
                // Remove date pattern like "– 7/7/2026" or "- 7/7/2026"
                displayName = displayName.replace(/[–-]\s*\d{1,2}\/\d{1,2}\/\d{4}/, '').trim();
                // Remove "Personal custom meal plan" text
                if (displayDescription?.includes('Personal custom meal plan')) {
                  displayDescription = '';
                }
              }
              
              return (
                <div
                  key={plan.id}
                  onClick={() => handleViewPlan(plan)}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group flex flex-col border border-gray-100 cursor-pointer"
                >
                  {/* Plan Image */}
                  <div className="relative overflow-hidden bg-gray-100 h-28 sm:h-32 md:h-40">
                    <img
                      src={plan.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'}
                      alt={plan.name}
                      loading="lazy"
                      className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80';
                      }}
                    />
                    
                    {/* Personal Plan Badge - Top Left */}
                    {isPersonalPlan && (
                      <div className="absolute top-2 left-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
                        👤 My Plan
                      </div>
                    )}

                    {/* Subscribed Badge - Bottom Left */}
                    {subscribedPlanIds.has(plan.id) && (
                      <div className="absolute bottom-2 left-2 bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1">
                        ✅ Subscribed
                      </div>
                    )}
                    
                    {/* Benefits Badge - Top Right */}
                    {(plan.benefitPackage?.benefits?.length > 0 || plan.benefits?.length > 0) && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
                        {(plan.benefitPackage?.benefits?.length || plan.benefits?.length || 0)} Benefits
                      </div>
                    )}
                  </div>

                  <div className="p-3 sm:p-4 flex flex-col flex-1">
                    {/* Plan Header */}
                    <div className="mb-2 sm:mb-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 line-clamp-2 flex-1">{displayName}</h3>
                        {isPersonalPlan && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap flex-shrink-0">
                            Personal
                          </span>
                        )}
                      </div>
                      {displayDescription && <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{displayDescription}</p>}
                    </div>


                    {/* Price and CTA */}
                    <div className="mt-auto">
                      <div className="mb-2 sm:mb-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg sm:text-xl font-bold text-gray-900">KES {finalPrice}</span>
                          {hasDiscount && originalPrice && (
                            <span className="text-xs text-gray-500 line-through">KES {originalPrice}</span>
                          )}
                        </div>
                        {/* Savings Display */}
                        {savingsAmount > 0 && (
                          <p className="text-xs font-semibold text-green-600 mt-1">
                            🔥 You Save KES {savingsAmount}
                          </p>
                        )}
                      </div>
                      
                      {/* Button Layout: Personal plans get Edit + Subscribe, Admin plans get View + Subscribe */}
                      <div className="flex gap-2">
                        {isPersonalPlan ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (subscribedPlanIds.has(plan.id)) {
                                  toast.info("Active plans cannot be edited. Please cancel your subscription to make changes.");
                                  return;
                                }
                                navigate(`/customer/meal-plans/${plan.id}/edit`);
                              }}
                              className={`flex-1 font-medium py-2 px-3 rounded text-xs sm:text-sm transition-colors ${
                                subscribedPlanIds.has(plan.id)
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : "bg-purple-600 hover:bg-purple-700 text-white"
                              }`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (subscribedPlanIds.has(plan.id)) return;
                                handlePlanCheckout(plan);
                              }}
                              disabled={isSubmitting || subscribedPlanIds.has(plan.id)}
                              className={`flex-1 font-medium py-2 px-3 rounded text-xs sm:text-sm transition-colors ${
                                subscribedPlanIds.has(plan.id)
                                  ? "bg-green-100 text-green-700 cursor-default"
                                  : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                              }`}
                            >
                              {subscribedPlanIds.has(plan.id) ? 'Subscribed' : isSubmitting ? 'Processing...' : 'Subscribe'}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewPlan(plan);
                              }}
                              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded text-xs sm:text-sm transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (subscribedPlanIds.has(plan.id)) return;
                                handlePlanCheckout(plan);
                              }}
                              disabled={isSubmitting || subscribedPlanIds.has(plan.id)}
                              className={`flex-1 font-medium py-2 px-3 rounded text-xs sm:text-sm transition-colors ${
                                subscribedPlanIds.has(plan.id)
                                  ? "bg-green-100 text-green-700 cursor-default"
                                  : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                              }`}
                            >
                              {subscribedPlanIds.has(plan.id) ? 'Subscribed' : isSubmitting ? 'Processing...' : 'Subscribe'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View Plan Details Modal */}
        {showViewModal && viewingPlan && (
          <div className="fixed inset-0 z-50">
            {/* Desktop Backdrop */}
            <div className="hidden md:block absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            
            {/* Mobile Layout - Full Screen Below Top Nav */}
            <div className="md:hidden fixed inset-x-0 top-16 bottom-0 bg-white flex flex-col z-50">
              {/* Mobile Header */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 flex-shrink-0 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-white truncate">{viewingPlan.name}</h2>
                    <p className="text-blue-100 text-xs line-clamp-1">{viewingPlan.description}</p>
                  </div>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-white hover:text-blue-100 p-2 rounded-full hover:bg-white/10 transition-colors ml-2 flex-shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Mobile Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                
                {/* Meal Schedule Section */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">📅</span>
                    <h3 className="text-base font-bold text-orange-900 uppercase tracking-wider">
                      Meal Schedule
                    </h3>
                  </div>
                  
                  {viewingPlan.templateSchedule?.length > 0 ? (
                    <div className="space-y-2">
                      {viewingPlan.templateSchedule.map((entry, idx) => {
                        const foodItems = entry.fastFoodItems || (entry.fastFoodItem ? [entry.fastFoodItem] : []);
                        const mealIcon = {
                          breakfast: '🌅',
                          lunch: '☀️',
                          dinner: '🌙'
                        }[entry.mealTimeType] || '🍽️';

                        return (
                          <div key={idx} className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2 shadow-sm">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-lg">{mealIcon}</span>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-900">{entry.dayOfWeek}</span>
                                <span className="text-xs text-gray-500 capitalize">
                                  {entry.mealTimeType} {entry.preferredTime && `· ${entry.preferredTime}`}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              {foodItems.length > 0 ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  {foodItems.slice(0, 2).map((f, fi) => (
                                    <span key={fi} className="text-xs font-semibold text-orange-600">{f.name}</span>
                                  ))}
                                  {foodItems.length > 2 && <span className="text-xs text-gray-400">+{foodItems.length - 2} more</span>}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">{entry.fastFoodItemIds?.length || 0} items</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No scheduled meals</p>
                  )}
                </div>

                {/* Schedule & Projected Cost Section */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  {(() => {
                    const slots = (viewingPlan.templateSchedule || []).map(entry => ({
                      dayOfWeek: entry.dayOfWeek,
                      preferredTime: entry.preferredTime,
                      mealTimeType: entry.mealTimeType,
                      fastFoodItemIds: entry.fastFoodItemIds || (entry.fastFoodItemId ? [entry.fastFoodItemId] : [])
                    }));
                    const allFoodItems = [];
                    (viewingPlan.templateSchedule || []).forEach(entry => {
                      (entry.fastFoodItems || (entry.fastFoodItem ? [entry.fastFoodItem] : [])).forEach(f => {
                        if (!allFoodItems.find(x => x.id === f.id)) allFoodItems.push(f);
                      });
                    });
                    const benefits = viewingPlan.benefitPackage?.benefits || viewingPlan.benefits || [];
                    return (
                      <ScheduleProjectedCost
                        slots={slots}
                        fastFoodItems={allFoodItems}
                        activeBenefits={benefits}
                        title="📊 Schedule & Projected Cost"
                        description="Preview of how benefits apply across the scheduled meals"
                        billingCycle={viewingPlan.billingCycle || 'Cycle'}
                      />
                    );
                  })()}
                </div>

                {/* Benefit Package Section */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <div className="mb-3">
                    <h3 className="text-base font-bold text-green-900 flex items-center gap-2">
                      <span>🎁</span>
                      Benefit Package
                    </h3>
                  </div>

                  {(() => {
                    const benefits = viewingPlan.benefits?.length > 0 
                      ? viewingPlan.benefits 
                      : viewingPlan.benefitPackage?.benefits || [];
                    
                    if (benefits.length > 0) {
                      return (
                        <div className="space-y-2">
                          {benefits.map((benefit, idx) => {
                            const featureName = benefit.feature?.name || benefit.featureName || benefit.featureCode;
                            const summary = generateBenefitSummary(benefit, viewingPlan.type || 'meal');
                            
                            return (
                              <div key={idx} className="bg-white rounded-lg p-3 border border-green-200">
                                <h5 className="font-bold text-gray-900 text-sm mb-1">{featureName}</h5>
                                <p className="text-xs text-green-700 leading-relaxed">
                                  💡 <strong>Summary:</strong> {summary}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    } else {
                      return (
                        <div className="bg-white rounded-lg p-4 text-center border border-green-200">
                          <p className="text-gray-500 text-sm">No benefits package assigned to this meal plan.</p>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>

              {/* Mobile Footer - Part of Modal */}
              <div className="bg-white border-t border-gray-200 p-4 pb-20 shadow-lg flex-shrink-0">
                <div className="mb-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">KES {computeFinalPrice(viewingPlan)}</p>
                    {(() => {
                      const originalPrice = viewingPlan.price || 0;
                      const finalPrice = computeFinalPrice(viewingPlan);
                      const savings = originalPrice - finalPrice;
                      
                      if (savings > 0) {
                        return (
                          <div className="mt-1">
                            <span className="text-sm text-gray-500 line-through">KES {originalPrice}</span>
                            <span className="ml-2 text-sm font-bold text-green-600">You Save KES {savings}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-colors text-sm"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      handlePlanCheckout(viewingPlan);
                    }}
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 text-sm shadow-lg"
                  >
                    {isSubmitting ? 'Processing...' : 'Subscribe Now'}
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex items-center justify-center p-4 fixed inset-0 z-50">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Desktop Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold text-white truncate">{viewingPlan.name}</h2>
                    <p className="text-blue-100 text-sm line-clamp-2">{viewingPlan.description}</p>
                  </div>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-white hover:text-blue-100 p-2 rounded-full hover:bg-white/10 transition-colors ml-2 flex-shrink-0"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Desktop Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                
                {/* Meal Schedule Section */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 border border-orange-200">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">📅</span>
                    <h3 className="text-lg font-bold text-orange-900 uppercase tracking-wider">
                      Meal Schedule
                    </h3>
                  </div>
                  
                  {viewingPlan.templateSchedule?.length > 0 ? (
                    <div className="space-y-2">
                      {viewingPlan.templateSchedule.map((entry, idx) => {
                        const foodItems = entry.fastFoodItems || (entry.fastFoodItem ? [entry.fastFoodItem] : []);
                        const mealIcon = {
                          breakfast: '🌅',
                          lunch: '☀️',
                          dinner: '🌙'
                        }[entry.mealTimeType] || '🍽️';

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-3 bg-white rounded-lg px-4 py-3 shadow-sm"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-2xl">{mealIcon}</span>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-900">
                                  {entry.dayOfWeek}
                                </span>
                                <span className="text-xs text-gray-500 capitalize">
                                  {entry.mealTimeType} {entry.preferredTime && `· ${entry.preferredTime}`}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              {foodItems.length > 0 ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  {foodItems.map((f, fi) => (
                                    <span key={fi} className="text-sm font-semibold text-orange-600">{f.name}</span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">{entry.fastFoodItemIds?.length || 0} items</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No scheduled meals</p>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-orange-200">
                    <p className="text-sm text-orange-700 flex items-center gap-2">
                      <span>✓</span>
                      <span className="font-semibold">
                        {viewingPlan.templateSchedule?.length || 0} scheduled {viewingPlan.templateSchedule?.length === 1 ? 'meal' : 'meals'}
                      </span>
                    </p>
                  </div>
                </div>
                {/* Schedule & Projected Cost Section */}
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                  {(() => {
                    // Build slots in the format ScheduleProjectedCost expects
                    const slots = (viewingPlan.templateSchedule || []).map(entry => ({
                      dayOfWeek: entry.dayOfWeek,
                      preferredTime: entry.preferredTime,
                      mealTimeType: entry.mealTimeType,
                      fastFoodItemIds: entry.fastFoodItemIds || (entry.fastFoodItemId ? [entry.fastFoodItemId] : [])
                    }));
                    // Collect all embedded food items from the plan
                    const allFoodItems = [];
                    (viewingPlan.templateSchedule || []).forEach(entry => {
                      (entry.fastFoodItems || (entry.fastFoodItem ? [entry.fastFoodItem] : [])).forEach(f => {
                        if (!allFoodItems.find(x => x.id === f.id)) allFoodItems.push(f);
                      });
                    });
                    const benefits = viewingPlan.benefitPackage?.benefits || viewingPlan.benefits || [];
                    return (
                      <ScheduleProjectedCost
                        slots={slots}
                        fastFoodItems={allFoodItems}
                        activeBenefits={benefits}
                        title="📊 Schedule & Projected Cost"
                        description="Preview of how benefits apply across the scheduled meals"
                        billingCycle={viewingPlan.billingCycle || 'Cycle'}
                      />
                    );
                  })()}
                </div>

                {/* Benefit Package Section */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-green-900 flex items-center gap-2">
                      <span>🎁</span>
                      Benefit Package
                    </h3>
                  </div>

                  {(() => {
                    // Check both plan.benefits and plan.benefitPackage.benefits
                    const benefits = viewingPlan.benefits?.length > 0 
                      ? viewingPlan.benefits 
                      : viewingPlan.benefitPackage?.benefits || [];
                    
                    const packageName = viewingPlan.benefitPackage?.name || 'Benefits Package';

                    if (benefits.length > 0) {
                      return (
                        <>
                          <div className="bg-white rounded-lg p-4 border border-green-200 mb-4">
                            <select className="w-full px-4 py-2 text-sm font-semibold text-green-900 bg-green-50 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                              <option>{packageName} — {benefits.length} benefits</option>
                            </select>
                          </div>

                          <div className="space-y-3">
                            <h4 className="text-sm font-bold text-green-900 uppercase tracking-wider">
                              Included Benefits
                            </h4>
                            {benefits.map((benefit, idx) => {
                              const featureName = benefit.feature?.name || benefit.featureName || benefit.featureCode;
                              const summary = generateBenefitSummary(benefit, viewingPlan.type || 'meal');
                              
                              return (
                                <div
                                  key={idx}
                                  className="bg-white rounded-lg p-4 border border-green-200 hover:shadow-md transition-shadow"
                                >
                                  <div className="mb-2">
                                    <h5 className="font-bold text-gray-900 mb-2">{featureName}</h5>
                                    <p className="text-sm text-green-700 leading-relaxed">
                                      💡 <strong>Summary:</strong> {summary}
                                    </p>
                                  </div>
                                  {(benefit.description || benefit.feature?.description) && (
                                    <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                                      {benefit.description || benefit.feature?.description}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    } else {
                      return (
                        <div className="bg-white rounded-lg p-6 text-center border border-green-200">
                          <p className="text-gray-500 text-sm">
                            No benefits package assigned to this meal plan.
                          </p>
                        </div>
                      );
                    }
                  })()}
                </div>
                </div>

                {/* Desktop Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between flex-shrink-0 shadow-lg">
                  <div className="text-left">
                    <p className="text-3xl font-bold text-gray-900">KES {computeFinalPrice(viewingPlan)}</p>
                    {(() => {
                      const originalPrice = viewingPlan.price || 0;
                      const finalPrice = computeFinalPrice(viewingPlan);
                      const savings = originalPrice - finalPrice;
                      
                      if (savings > 0) {
                        return (
                          <div className="mt-1">
                            <span className="text-base text-gray-500 line-through">KES {originalPrice}</span>
                            <span className="ml-3 text-base font-bold text-green-600">You Save KES {savings}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowViewModal(false)}
                      className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-colors text-base"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setShowViewModal(false);
                        handlePlanCheckout(viewingPlan);
                      }}
                      disabled={isSubmitting}
                      className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 text-base shadow-lg"
                    >
                      {isSubmitting ? 'Processing...' : 'Subscribe Now'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      
        {/* Create Custom Plan CTA */}
        {mealPlans.length > 0 && (
          <div className="mt-6 sm:mt-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg sm:rounded-xl p-4 sm:p-6 text-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="text-center sm:text-left">
                <h3 className="text-lg sm:text-xl font-bold mb-1">Want something different?</h3>
                <p className="text-blue-100 text-sm">
                  Build your own custom meal plan with your preferred meals and schedule
                </p>
              </div>
              <button
                onClick={() => navigate('/customer/subscriptions/create')}
                className="bg-white text-blue-700 font-medium sm:font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap text-sm sm:text-base"
              >
                Create Custom Plan →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Confirmation Modal */}
      {showConfirmation && selectedPlan && (
        <SubscriptionConfirmation
          plan={selectedPlan}
          onConfirm={handleConfirmSubscription}
          onCancel={handleCancelConfirmation}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
}