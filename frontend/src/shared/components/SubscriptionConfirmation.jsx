import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import MpesaManualInstructions from './MpesaManualInstructions';
import api from '@/shared/services/api';

// Component for showing subscription confirmation before payment
export default function SubscriptionConfirmation({ plan, onConfirm, onCancel, isLoading }) {
  const { user } = useAuth();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('mpesa');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [guestData, setGuestData] = useState({
    name: '',
    email: '',
    phone: '',
    deliveryAddress: ''
  });
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [eligibilityError, setEligibilityError] = useState(null);
  const [showGuestForm, setShowGuestForm] = useState(!user);

  const computeFinalPrice = (plan) => {
    // Same logic as in CustomerMealPlans.jsx
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

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const getScheduleDateRange = (plan) => {
    const schedule = plan.templateSchedule || [];
    if (schedule.length === 0) {
      return { startDate: new Date(), endDate: new Date(), duration: 0 };
    }

    // Extract all unique dates from the schedule
    const scheduledDates = schedule.map(entry => {
      // If dayOfWeek is a date string (YYYY-MM-DD), use it directly
      if (entry.dayOfWeek && entry.dayOfWeek.includes('-')) {
        return new Date(entry.dayOfWeek);
      }
      // If it's a day name, we'll need to calculate from context
      // For now, assume it's relative to current week
      const today = new Date();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayIndex = dayNames.indexOf(entry.dayOfWeek.toLowerCase());
      
      if (dayIndex !== -1) {
        const date = new Date(today);
        const currentDay = date.getDay();
        const diff = dayIndex - currentDay;
        date.setDate(date.getDate() + (diff >= 0 ? diff : diff + 7));
        return date;
      }
      
      return today;
    }).filter(date => date instanceof Date && !isNaN(date));

    if (scheduledDates.length === 0) {
      return { startDate: new Date(), endDate: new Date(), duration: 0 };
    }

    // Sort dates to get start and end
    scheduledDates.sort((a, b) => a - b);
    const startDate = scheduledDates[0];
    const endDate = scheduledDates[scheduledDates.length - 1];
    
    // Calculate duration in days
    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1; // +1 to include end date
    const uniqueDays = new Set(scheduledDates.map(date => date.toDateString())).size;

    return { startDate, endDate, duration, uniqueDays, totalMeals: schedule.length };
  };

  const finalPrice = computeFinalPrice(plan);
  const originalPrice = plan.price || 0;
  const savings = originalPrice - finalPrice;
  const { startDate, endDate, duration, uniqueDays, totalMeals } = getScheduleDateRange(plan);

  const benefits = plan.benefitPackage?.benefits || plan.benefits || [];
  const isPersonalPlan = plan.createdBy || plan.userId || plan.isPersonal || 
                        plan.description?.includes('Personal custom') || 
                        plan.name?.includes('My Meal Plan');

  const paymentMethods = [
    { value: 'mpesa', label: 'M-Pesa', icon: '📱', description: 'Pay using M-Pesa' },
    { value: 'airtel_money', label: 'Airtel Money', icon: '📲', description: 'Pay using Airtel Money' },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦', description: 'Manual bank transfer' }
  ];

  const handleGuestDataChange = (field, value) => {
    setGuestData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    if (showGuestForm) {
      const guestValid = guestData.name && guestData.email && guestData.phone && guestData.deliveryAddress;
      // Payment proof is required for activation
      return guestValid && paymentProofUrl;
    }
    // Payment proof is required for activation
    return paymentProofUrl;
  };

  const handleConfirm = () => {
    const paymentData = {
      paymentSubMethod: selectedPaymentMethod, // mpesa, airtel_money, bank_transfer
      phoneNumber: phoneNumber || guestData.phone,
      paymentProofUrl: paymentProofUrl, // Include payment proof URL
      guestData: showGuestForm ? guestData : null
    };
    onConfirm(plan, paymentData);
  };

  const getBenefitDetails = (benefit) => {
    const val = benefit.value || {};
    const featureCode = benefit.featureCode || benefit.feature?.code || '';
    
    switch (benefit.limitType) {
      case 'counter':
        const limit = val.limit || 0;
        const period = val.resetPeriod || 'monthly';
        const periodText = period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month';
        return `Get ${limit} times per ${periodText}`;
        
      case 'value':
        const amount = val.amount || 0;
        const unit = val.unit || 'KES';
        return `Receive ${amount} ${unit}`;
        
      case 'rate':
        const pct = val.discountPercent || val.amount || 0;
        const minOrder = val.conditions?.minOrderValue || val.minOrderValue;
        const maxDiscount = val.maxDiscount;
        let rateText = `${pct}% discount`;
        if (minOrder > 0) rateText += ` on orders over ${minOrder} KES`;
        if (maxDiscount > 0) rateText += ` (max ${maxDiscount} KES)`;
        return rateText;
        
      case 'boolean':
        if (featureCode === 'free_delivery') {
          const minOrder = val.conditions?.minOrderValue || val.minOrderValue || 0;
          const maxDeliveries = val.maxFreeDeliveries || val.limit;
          let deliveryText = 'Free delivery';
          if (minOrder > 0) deliveryText += ` on orders over ${minOrder} KES`;
          if (maxDeliveries > 0) deliveryText += ` (up to ${maxDeliveries} deliveries)`;
          else deliveryText += ' (unlimited)';
          return deliveryText;
        }
        
        if (featureCode === 'reduced_delivery_fee') {
          const discountPct = val.discountPercent || val.amount || 0;
          return `${discountPct}% off delivery fees`;
        }
        
        if (featureCode === 'free_meals') {
          const freeLimit = val.limit || 0;
          const maxValue = val.maxMealValue || 0;
          let mealText = `${freeLimit} free meals`;
          if (maxValue > 0) mealText += ` (up to ${maxValue} KES each)`;
          return mealText;
        }
        
        if (featureCode === 'meal_discount' || featureCode === 'disc') {
          const discountPct = val.discountPercent || val.amount || 0;
          const minOrder = val.conditions?.minOrderValue || val.minOrderValue || 0;
          let discountText = `${discountPct}% off meals`;
          if (minOrder > 0) discountText += ` on orders over ${minOrder} KES`;
          return discountText;
        }
        
        if (featureCode === 'cashback_orders') {
          const cashbackPct = val.cashbackPercent || val.amount || 0;
          const maxCashback = val.maxCashback || 0;
          let cashbackText = `${cashbackPct}% cashback on orders`;
          if (maxCashback > 0) cashbackText += ` (max ${maxCashback} KES)`;
          return cashbackText;
        }
        
        if (featureCode === 'priority_support') {
          const responseTime = val.responseTime;
          const channels = val.supportChannels;
          let supportText = 'Priority customer support';
          if (responseTime) supportText += ` with ${responseTime} response time`;
          if (channels) supportText += ` via ${Array.isArray(channels) ? channels.join(', ') : channels}`;
          return supportText;
        }
        
        return 'Feature enabled';
        
      default:
        // Fallback for any unhandled benefit types
        if (benefit.description) return benefit.description;
        if (benefit.feature?.description) return benefit.feature.description;
        return 'Included in your plan';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold">Confirm Subscription</h2>
          <p className="text-blue-100 text-sm mt-1">Review your meal plan before subscribing</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Plan Details */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Plan Details</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Plan Name:</span>
                <span className="font-semibold text-gray-900">{plan.name}</span>
              </div>
              {isPersonalPlan && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="text-purple-600 font-semibold">👤 Personal Plan</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Billing Type:</span>
                <span className="font-semibold text-gray-900">Custom Schedule</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-semibold text-gray-900">
                  {duration > 1 ? `${duration} Days` : '1 Day'} 
                  {uniqueDays && uniqueDays !== duration && (
                    <span className="text-sm text-gray-500 ml-1">({uniqueDays} meal days)</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Start Date:</span>
                <span className="font-semibold text-gray-900">{formatDate(startDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expires On:</span>
                <span className="font-semibold text-gray-900">{formatDate(endDate)}</span>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Pricing</h3>
            <div className="bg-green-50 rounded-lg p-4 space-y-2">
              {savings > 0 ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Original Price:</span>
                    <span className="text-gray-500 line-through">KES {originalPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700 font-semibold">You Save:</span>
                    <span className="text-green-700 font-bold">KES {savings}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="text-lg font-bold text-gray-900">Final Price:</span>
                    <span className="text-2xl font-bold text-green-600">KES {finalPrice}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-900">Total Price:</span>
                  <span className="text-2xl font-bold text-blue-600">KES {finalPrice}</span>
                </div>
              )}
            </div>
          </div>

          {/* Benefits */}
          {benefits.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Included Benefits</h3>
              <div className="space-y-3">
                {benefits.map((benefit, idx) => {
                  const benefitDetails = getBenefitDetails(benefit);
                  return (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1">
                          {benefit.feature?.name || benefit.featureName || benefit.featureCode}
                        </div>
                        <div className="text-sm text-green-700">
                          {benefitDetails}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Meals Count */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Meal Schedule</h3>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Meals:</span>
                <span className="font-semibold text-blue-900">
                  {totalMeals || (plan.templateSchedule || []).length} meals scheduled
                </span>
              </div>
              {uniqueDays && uniqueDays !== totalMeals && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-600">Meal Days:</span>
                  <span className="font-semibold text-blue-900">
                    {uniqueDays} different days
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Payment Method</h3>
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <label key={method.value} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.value}
                    checked={selectedPaymentMethod === method.value}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="text-2xl">{method.icon}</span>
                  <div>
                    <div className="font-semibold">{method.label}</div>
                    <div className="text-sm text-gray-600">{method.description}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* M-Pesa Manual Instructions */}
            {selectedPaymentMethod === 'mpesa' && (
              <div className="mt-4">
                <MpesaManualInstructions 
                  amount={finalPrice}
                  orderId={plan.id}
                  onScreenshotUpload={(url) => setPaymentProofUrl(url)}
                  required={true}
                />
              </div>
            )}

            {/* Airtel Money Instructions - Same Paybill Flow as M-Pesa */}
            {selectedPaymentMethod === 'airtel_money' && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 mr-3 flex items-center justify-center text-white font-bold text-xs">
                    A
                  </div>
                  <h4 className="font-semibold text-blue-900">Airtel Money Payment Instructions</h4>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm text-blue-800">
                    Please complete your payment using the details below:
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded border border-blue-100 flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Paybill Number</p>
                        <p className="text-lg font-bold text-gray-900 tracking-wider">714888</p>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded border border-blue-100 flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Account Number</p>
                        <p className="text-lg font-bold text-gray-900 tracking-wider">223052</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded border border-blue-100 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Exact Amount</p>
                      <p className="text-lg font-bold text-gray-900">KES {finalPrice.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="text-xs text-blue-700 bg-blue-100/50 p-2 rounded border border-blue-200 mt-2">
                    <span className="font-semibold block mb-1">Steps:</span>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Dial *150*60# on your Airtel phone</li>
                      <li>Select "Pay Bill"</li>
                      <li>Enter Business Number <strong>714888</strong></li>
                      <li>Enter Account Number <strong>223052</strong></li>
                      <li>Enter Amount <strong>KES {finalPrice}</strong></li>
                      <li>Enter your Airtel Money PIN and confirm</li>
                    </ol>
                  </div>

                  <p className="text-xs text-blue-600 mt-2 bg-blue-100 p-2 rounded">
                    💡 After payment, please contact support with your Airtel Money confirmation details for verification.
                  </p>
                </div>
              </div>
            )}

            {/* Bank Transfer Instructions - Same Structure with Screenshot Upload */}
            {selectedPaymentMethod === 'bank_transfer' && (
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 rounded-full bg-gray-500 mr-3 flex items-center justify-center text-white font-bold text-xs">
                    B
                  </div>
                  <h4 className="font-semibold text-gray-900">Bank Transfer Payment Instructions</h4>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm text-gray-800">
                    Please complete your payment using the details below:
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded border border-gray-100 flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Bank Name</p>
                        <p className="text-lg font-bold text-gray-900">Equity Bank</p>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded border border-gray-100 flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Account Number</p>
                        <p className="text-lg font-bold text-gray-900 tracking-wider">1130180617720</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded border border-gray-100 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Account Name</p>
                      <p className="text-lg font-bold text-gray-900">Comrades360 Ltd</p>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded border border-gray-100 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Exact Amount</p>
                      <p className="text-lg font-bold text-gray-900">KES {finalPrice.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-700 bg-gray-100/50 p-2 rounded border border-gray-200 mt-2">
                    <span className="font-semibold block mb-1">Steps:</span>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Visit your bank or use mobile banking</li>
                      <li>Transfer to Account <strong>1130180617720</strong></li>
                      <li>Account Name: <strong>Comrades360 Ltd</strong></li>
                      <li>Amount: <strong>KES {finalPrice}</strong></li>
                      <li>Reference: <strong>{plan.name}</strong></li>
                      <li>Keep your bank slip/confirmation</li>
                    </ol>
                  </div>

                  <div className="mt-4 border-t border-gray-200 pt-3">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Upload Payment Screenshot (Required for verification)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          
                          try {
                            const formData = new FormData();
                            formData.append('file', file);
                            const res = await api.post('/upload', formData, {
                              headers: { 'Content-Type': 'multipart/form-data' }
                            });
                            if (res.data?.url) {
                              setPaymentProofUrl(res.data.url);
                            }
                          } catch (err) {
                            console.error('Failed to upload screenshot', err);
                            alert('Failed to upload screenshot. Please try again.');
                          }
                        }}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition-all cursor-pointer"
                      />
                    </div>
                    {paymentProofUrl && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-100 p-2 rounded">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Screenshot attached successfully!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Guest users enter phone in their info section */}
          </div>

          {/* Guest User Form */}
          {showGuestForm && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Your Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={guestData.name}
                    onChange={(e) => handleGuestDataChange('name', e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={guestData.email}
                    onChange={(e) => handleGuestDataChange('email', e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
                  <textarea
                    value={guestData.deliveryAddress}
                    onChange={(e) => handleGuestDataChange('deliveryAddress', e.target.value)}
                    placeholder="Enter your full delivery address"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Warning for existing subscription */}
          {currentSubscription && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-800 mb-2">⚠️ Existing Subscription</h4>
              <p className="text-amber-700 text-sm">
                You have an active meal subscription. Subscribing to this plan will replace your current subscription.
              </p>
            </div>
          )}

          {/* Error */}
          {eligibilityError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">❌ {eligibilityError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <div className="flex-1">
            {!paymentProofUrl && (
              <p className="text-xs text-red-600 mb-2 text-center">
                📷 Upload payment proof to activate subscription
              </p>
            )}
            <button
              onClick={handleConfirm}
              disabled={isLoading || !!eligibilityError || !isFormValid()}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Processing...
                </>
              ) : (
                <>
                  <span>💳</span>
                  Subscribe Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}