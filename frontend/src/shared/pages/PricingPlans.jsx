import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import subscriptionService from '@/shared/services/subscriptionService';
import api from '@/shared/services/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '@/shared/components/LoadingSpinner';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEAL_TIMES = ['breakfast', 'lunch', 'dinner'];
const DEFAULT_TIMES = { breakfast: '08:00', lunch: '12:30', dinner: '19:00' };

export default function PricingPlans() {
  const [activeTab, setActiveTab] = useState('meal'); // 'meal' or 'seller'
  const [mealTabMode, setMealTabMode] = useState('packages'); // 'packages' or 'custom'
  const [sellerPlans, setSellerPlans] = useState([]);
  const [mealPlans, setMealPlans] = useState([]); // Pre-built packages
  const [fastFoodItems, setFastFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Custom meal builder state
  const [customSchedule, setCustomSchedule] = useState([]); 
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [billingCycle, setBillingCycle] = useState('weekly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [foodSearchTerm, setFoodSearchTerm] = useState('');
  const [selectedFoodCategory, setSelectedFoodCategory] = useState('all');

  // Guest checkout state (for both custom schedule and packages)
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestInfo, setGuestInfo] = useState({ guestName: '', guestPhone: '', guestEmail: '', guestDeliveryAddress: '' });

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sPlans, mPlans, foodRes] = await Promise.all([
        subscriptionService.getPlans('seller'),
        subscriptionService.getPlans('meal'),
        api.get('/fastfood?limit=100')
      ]);
      setSellerPlans(sPlans || []);
      setMealPlans(mPlans || []);
      setFastFoodItems(foodRes.data?.items || foodRes.data || []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // ─── Meal Builder Logic ────────────────────────────────────────────────────

  const toggleMealSlot = (day, mealTime) => {
    const key = `${day}_${mealTime}`;
    const existing = customSchedule.find(e => e.key === key);
    if (existing) {
      setCustomSchedule(prev => prev.filter(e => e.key !== key));
    } else {
      setCustomSchedule(prev => [...prev, {
        key,
        dayOfWeek: day,
        mealTimeType: mealTime,
        preferredTime: DEFAULT_TIMES[mealTime],
        fastFoodItemId: null,
        deliveryAddress: ''
      }]);
    }
  };

  const updateSlot = (key, field, value) => {
    setCustomSchedule(prev => prev.map(e => e.key === key ? { ...e, [field]: value } : e));
  };

  // Recalculate custom schedule total
  useEffect(() => {
    let total = 0;
    for (const entry of customSchedule) {
      if (entry.fastFoodItemId) {
        const item = fastFoodItems.find(f => f.id === entry.fastFoodItemId);
        if (item) total += parseFloat(item.price) || 0;
      }
    }
    const multiplier = billingCycle === 'monthly' ? 4 : (billingCycle === 'daily' ? 1 / 7 : 1);
    setWeeklyTotal(parseFloat((total * multiplier).toFixed(2)));
  }, [customSchedule, fastFoodItems, billingCycle]);

  const availableFoodCategories = React.useMemo(() => {
    const categories = fastFoodItems
      .map(item => (item.category || 'Uncategorized').trim())
      .filter(Boolean);
    return Array.from(new Set(categories));
  }, [fastFoodItems]);

  const filteredFoodItems = React.useMemo(() => {
    return fastFoodItems.filter(item => {
      const matchesSearch = foodSearchTerm.trim().length === 0 ||
        `${item.name || ''} ${item.shortDescription || ''} ${item.category || ''}`
          .toLowerCase()
          .includes(foodSearchTerm.trim().toLowerCase());

      const matchesCategory = selectedFoodCategory === 'all' ||
        (item.category || 'Uncategorized') === selectedFoodCategory;

      return matchesSearch && matchesCategory;
    });
  }, [fastFoodItems, foodSearchTerm, selectedFoodCategory]);

  const isSlotSelected = (day, mealTime) =>
    customSchedule.some(e => e.key === `${day}_${mealTime}`);

  // ─── Checkout ──────────────────────────────────────────────────────────────

  const handleCustomCheckout = () => {
    if (customSchedule.length === 0) return toast.error('Please select at least one meal slot');
    const missingFood = customSchedule.some(e => !e.fastFoodItemId);
    if (missingFood) return toast.error('Please choose a food item for each selected meal slot');

    setSelectedPlanForCheckout(null); // Indicates custom schedule build
    if (!user) {
      setShowGuestForm(true);
    } else {
      executeSubscription({});
    }
  };

  const handlePlanCheckout = (plan) => {
    setSelectedPlanForCheckout(plan);
    if (!user) {
      setShowGuestForm(true);
    } else {
      executeSubscription({}, plan.id);
    }
  };

  const handleGuestCheckoutSubmit = (e) => {
    e.preventDefault();
    if (!guestInfo.guestName || !guestInfo.guestPhone) return toast.error('Name and phone are required');
    executeSubscription(guestInfo, selectedPlanForCheckout?.id);
  };

  const executeSubscription = async (extra = {}, planId = null) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...extra
      };

      if (planId) {
        payload.planId = planId;
      } else {
        payload.customSchedule = customSchedule.map(({ key, ...rest }) => rest);
        payload.billingCycle = billingCycle;
      }

      const res = await subscriptionService.subscribe(payload);
      toast.success(res.message || 'Subscribed successfully!');

      if (res.guestManageToken) {
        toast.info('A management link has been generated!');
        navigate(`/guest/subscriptions/${res.guestManageToken}`);
      } else {
        navigate(activeTab === 'seller' ? '/seller/subscriptions' : '/customer/subscriptions');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to create subscription');
    } finally {
      setIsSubmitting(false);
      setShowGuestForm(false);
    }
  };

  const handleSellerSubscribe = async (plan) => {
    if (!user) {
      toast.info('Please log in to subscribe to a seller plan');
      navigate('/login');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await subscriptionService.subscribe({ planId: plan.id });
      toast.success(res.message || 'Subscribed successfully!');
      navigate('/seller/subscriptions');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Subscription failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-950"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-white mb-3">Subscription Plans</h1>
          <p className="text-blue-300 text-lg">Build your custom meal plan or get tools to grow your business</p>
        </div>

        {/* Tab level 1: Meal vs Seller */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 rounded-xl p-1 flex gap-1">
            <button
              onClick={() => setActiveTab('meal')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'meal' ? 'bg-white text-blue-900 shadow' : 'text-white/70 hover:text-white'}`}
            >
              🍽 Meal Plans
            </button>
            <button
              onClick={() => setActiveTab('seller')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'seller' ? 'bg-white text-blue-900 shadow' : 'text-white/70 hover:text-white'}`}
            >
              🏪 Seller Tools
            </button>
          </div>
        </div>

        {/* Tab level 2 (Only for Meal Plans): Packages vs Custom */}
        {activeTab === 'meal' && (
          <div className="flex justify-center mb-8">
            <div className="bg-white/5 rounded-lg p-1 flex gap-1">
              <button
                onClick={() => setMealTabMode('packages')}
                className={`px-4 py-1.5 rounded text-xs font-semibold transition-all ${mealTabMode === 'packages' ? 'bg-blue-500 text-white shadow' : 'text-white/60 hover:text-white'}`}
              >
                📦 Pre-configured Packages
              </button>
              <button
                onClick={() => setMealTabMode('custom')}
                className={`px-4 py-1.5 rounded text-xs font-semibold transition-all ${mealTabMode === 'custom' ? 'bg-blue-500 text-white shadow' : 'text-white/60 hover:text-white'}`}
              >
                🛠 Build Your Own Custom Plan
              </button>
            </div>
          </div>
        )}

        {/* ── MEAL PACKAGES TAB ── */}
        {activeTab === 'meal' && mealTabMode === 'packages' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mealPlans.length === 0 ? (
              <div className="col-span-full text-center text-white/50 py-16">No pre-configured meal packages available yet.</div>
            ) : (
              mealPlans.map(plan => (
                <div key={plan.id} className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/10 flex flex-col justify-between hover:border-blue-400/50 transition-all hover:-translate-y-1">
                  <div>
                    {plan.imageUrl && (
                      <img src={plan.imageUrl} alt={plan.name} className="w-full h-40 object-cover rounded-xl mb-4" />
                    )}
                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-white/60 text-sm mb-4">{plan.description}</p>
                    
                    {plan.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {plan.tags.map(tag => (
                          <span key={tag} className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-full uppercase">{tag}</span>
                        ))}
                      </div>
                    )}

                    {/* Template Schedule Details */}
                    {plan.templateSchedule?.length > 0 && (
                      <div className="mb-6 bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Included Deliveries</p>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                          {plan.templateSchedule.map((entry, idx) => {
                            const foodItem = fastFoodItems.find(f => f.id === entry.fastFoodItemId);
                            return (
                              <div key={idx} className="flex justify-between text-xs text-white/80 bg-white/5 rounded px-2 py-1">
                                <span className="capitalize font-medium">{entry.dayOfWeek.slice(0,3)} {entry.mealTimeType}</span>
                                <span className="text-blue-300">{foodItem?.name || `Food #${entry.fastFoodItemId}`}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold text-white mb-1">KES {plan.price}</p>
                    <p className="text-white/50 text-xs mb-6">/{plan.billingCycle}</p>
                    <button
                      onClick={() => handlePlanCheckout(plan)}
                      disabled={isSubmitting}
                      className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                    >
                      Subscribe Package
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── CUSTOM MEAL BUILDER ── */}
        {activeTab === 'meal' && mealTabMode === 'custom' && (
          <div className="space-y-6">
            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur">
              <h2 className="text-white font-bold text-lg mb-3">1. Choose Billing Cycle</h2>
              <div className="flex gap-3">
                {['weekly', 'monthly'].map(cycle => (
                  <button
                    key={cycle}
                    onClick={() => setBillingCycle(cycle)}
                    className={`px-5 py-2 rounded-lg font-medium transition-all capitalize ${billingCycle === cycle ? 'bg-blue-500 text-white' : 'bg-white/20 text-white/80 hover:bg-white/30'}`}
                  >
                    {cycle}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur">
              <h2 className="text-white font-bold text-lg mb-4">2. Pick Your Days & Meals</h2>
              <div className="space-y-4 mb-6">
                <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/80">Search meals</label>
                    <input
                      type="text"
                      value={foodSearchTerm}
                      onChange={e => setFoodSearchTerm(e.target.value)}
                      placeholder="Search by name, description or category"
                      className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/40 focus:border-blue-400 focus:bg-white/15 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/80">Filter by category</label>
                    <select
                      value={selectedFoodCategory}
                      onChange={e => setSelectedFoodCategory(e.target.value)}
                      className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:border-blue-400 focus:bg-white/15 focus:outline-none"
                    >
                      <option value="all">All categories</option>
                      {availableFoodCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p>
                      Filtered meals: <span className="font-semibold text-white">{filteredFoodItems.length}</span>
                      {selectedFoodCategory !== 'all' && ` in ${selectedFoodCategory}`}
                    </p>
                    {filteredFoodItems.length === 0 && (
                      <p className="text-amber-300">Try a different keyword or category.</p>
                    )}
                  </div>
                  {filteredFoodItems.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                      {filteredFoodItems.slice(0, 8).map(item => (
                        <div key={item.id} className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white/90">
                          {item.name} — KES {item.price} <span className="text-white/50">{item.category || 'Uncategorized'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left text-white/60 pb-3 pr-4 w-28">Meal</th>
                      {DAYS.map(d => (
                        <th key={d} className="text-center text-white/60 pb-3 px-2 capitalize text-xs">{d.slice(0,3)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MEAL_TIMES.map(mt => (
                      <tr key={mt}>
                        <td className="py-2 pr-4 text-white/80 capitalize font-medium">{mt}</td>
                        {DAYS.map(day => (
                          <td key={day} className="py-2 px-2 text-center">
                            <button
                              onClick={() => toggleMealSlot(day, mt)}
                              className={`w-8 h-8 rounded-lg border-2 transition-all text-sm ${isSlotSelected(day, mt)
                                ? 'bg-green-500 border-green-400 text-white shadow-lg'
                                : 'border-white/20 text-white/30 hover:border-white/50 hover:text-white/60'}`}
                            >
                              {isSlotSelected(day, mt) ? '✓' : '+'}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {customSchedule.length > 0 && (
              <div className="bg-white/10 rounded-2xl p-5 backdrop-blur">
                <h2 className="text-white font-bold text-lg mb-4">3. Choose Your Food for Each Slot</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customSchedule.map(slot => {
                    const selectedFoodItem = fastFoodItems.find(item => item.id === slot.fastFoodItemId);
                    const slotOptions = selectedFoodItem && !filteredFoodItems.some(item => item.id === selectedFoodItem.id)
                      ? [selectedFoodItem, ...filteredFoodItems]
                      : filteredFoodItems;

                    return (
                      <div key={slot.key} className="bg-white/10 rounded-xl p-4">
                        <p className="text-white font-semibold capitalize mb-2">
                          {slot.dayOfWeek.slice(0,3)} — {slot.mealTimeType}
                        </p>
                        <select
                          className="w-full rounded-lg bg-white/20 text-white border border-white/20 px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          value={slot.fastFoodItemId || ''}
                          onChange={e => updateSlot(slot.key, 'fastFoodItemId', parseInt(e.target.value))}
                        >
                          <option value="">Select food item...</option>
                          {slotOptions.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name} — KES {item.price}
                            </option>
                          ))}
                        </select>
                        {filteredFoodItems.length === 0 && (
                          <p className="text-xs text-amber-200">No items match your filter. Clear the search or choose a different category.</p>
                        )}
                        <input
                        type="time"
                        className="w-full rounded-lg bg-white/20 text-white border border-white/20 px-3 py-2 text-sm focus:outline-none"
                        value={slot.preferredTime}
                        onChange={e => updateSlot(slot.key, 'preferredTime', e.target.value)}
                      />
                    </div>
                  )})}
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-blue-200 text-sm">{billingCycle === 'weekly' ? 'Weekly' : 'Monthly'} Total</p>
                <p className="text-white text-4xl font-extrabold">
                  KES {weeklyTotal.toFixed(2)}
                </p>
                <p className="text-blue-200 text-sm mt-1">{customSchedule.length} meal{customSchedule.length !== 1 ? 's' : ''} selected</p>
              </div>
              <button
                onClick={handleCustomCheckout}
                disabled={isSubmitting || customSchedule.length === 0}
                className="bg-white text-blue-700 font-bold px-8 py-4 rounded-xl shadow-xl hover:bg-blue-50 transition-all text-lg disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : user ? 'Subscribe Now →' : 'Checkout as Guest →'}
              </button>
            </div>
          </div>
        )}

        {/* ── SELLER PLANS TAB ── */}
        {activeTab === 'seller' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sellerPlans.length === 0 ? (
              <div className="col-span-full text-center text-white/50 py-16">No seller plans available yet.</div>
            ) : (
              sellerPlans.map(plan => (
                <div key={plan.id} className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/10 hover:border-blue-400/50 transition-all hover:-translate-y-1">
                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-white/60 text-sm mb-4">{plan.description}</p>
                  <p className="text-3xl font-extrabold text-white mb-1">KES {plan.price}</p>
                  <p className="text-white/50 text-xs mb-6">/{plan.billingCycle}</p>
                  <button
                    onClick={() => handleSellerSubscribe(plan)}
                    disabled={isSubmitting}
                    className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                  >
                    Subscribe
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── GUEST CHECKOUT MODAL ── */}
      {showGuestForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Guest Checkout</h3>
            <p className="text-sm text-gray-500 mb-5">No account needed. We'll send a management link to your phone/email to track and skip deliveries.</p>

            <form onSubmit={handleGuestCheckoutSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input required type="text"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={guestInfo.guestName}
                  onChange={e => setGuestInfo({ ...guestInfo, guestName: e.target.value })}
                  placeholder="e.g. John Kamau"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number * (for M-Pesa payment)</label>
                <input required type="tel"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={guestInfo.guestPhone}
                  onChange={e => setGuestInfo({ ...guestInfo, guestPhone: e.target.value })}
                  placeholder="e.g. 0712345678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional — for backup link)</label>
                <input type="email"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={guestInfo.guestEmail}
                  onChange={e => setGuestInfo({ ...guestInfo, guestEmail: e.target.value })}
                  placeholder="e.g. john@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address (optional)</label>
                <input type="text"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={guestInfo.guestDeliveryAddress}
                  onChange={e => setGuestInfo({ ...guestInfo, guestDeliveryAddress: e.target.value })}
                  placeholder="e.g. Westlands, Nairobi"
                />
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                <strong>
                  Total: KES {selectedPlanForCheckout ? selectedPlanForCheckout.price : weeklyTotal.toFixed(2)}/{selectedPlanForCheckout ? selectedPlanForCheckout.billingCycle : billingCycle}
                </strong>
                <br />
                An M-Pesa STK push will be sent to your phone to complete payment.
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowGuestForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isSubmitting ? 'Processing...' : `Confirm — KES ${selectedPlanForCheckout ? selectedPlanForCheckout.price : weeklyTotal.toFixed(2)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
