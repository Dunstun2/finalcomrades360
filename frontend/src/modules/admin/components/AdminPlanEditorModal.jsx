import React, { useState, useEffect } from 'react';
import subscriptionService from '@/shared/services/subscriptionService';
import api from '@/shared/services/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '@/shared/components/LoadingSpinner';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEAL_TIMES = ['breakfast', 'lunch', 'dinner'];
const DEFAULT_TIMES = { breakfast: '08:00', lunch: '12:30', dinner: '19:00' };

export default function AdminPlanEditorModal({ plan, onClose, onSave }) {
  const isEditing = !!plan;
  
  const [newSlotDate, setNewSlotDate] = useState('');
  const [newSlotMeal, setNewSlotMeal] = useState('lunch');

  const [formData, setFormData] = useState({
    name: plan?.name || '',
    description: plan?.description || '',
    type: plan?.type || 'seller',
    status: plan?.status || 'Draft',
    price: plan?.price || 0,
    billingCycle: plan?.billingCycle || 'weekly',
    currency: plan?.currency || 'KES',
    gracePeriodDays: plan?.gracePeriodDays ?? 3,
    trialPeriodDays: plan?.trialPeriodDays ?? 0,
    isVisible: plan?.isVisible ?? true,
    tags: plan?.tags || [],
    imageUrl: plan?.imageUrl || '',
    templateSchedule: (plan?.templateSchedule || []).map(s => ({ ...s, id: Math.random().toString() }))
  });

  const [fastFoodItems, setFastFoodItems] = useState([]);
  const [foodSearchTerm, setFoodSearchTerm] = useState('');
  const [selectedFoodCategory, setSelectedFoodCategory] = useState('all');
  const [loadingFoods, setLoadingFoods] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (formData.type === 'meal') {
      fetchFoods();
    }
  }, [formData.type]);

  // Returns the actual price the customer pays (displayPrice with discount, or displayPrice, or basePrice as last resort)
  const getCustomerPrice = (food) => {
    if (!food) return 0;
    const discount = food.discountPrice ? Number(food.discountPrice) : 0;
    const display = food.displayPrice ? Number(food.displayPrice) : 0;
    const base = food.basePrice ? Number(food.basePrice) : 0;
    if (discount > 0) return discount;
    if (display > 0) return display;
    return base;
  };

  useEffect(() => {
    if (formData.type === 'meal') {
      const total = formData.templateSchedule.reduce((sum, slot) => {
        const food = fastFoodItems.find(f => f.id === slot.fastFoodItemId);
        return sum + getCustomerPrice(food);
      }, 0);
      setFormData(prev => ({ ...prev, price: total, billingCycle: 'custom' }));
    }
  }, [formData.templateSchedule, formData.type, fastFoodItems]);

  const availableFoodCategories = React.useMemo(() => {
    const categories = fastFoodItems
      .map(item => (item.category || 'Uncategorized').trim())
      .filter(Boolean);
    return Array.from(new Set(categories));
  }, [fastFoodItems]);

  const filteredFastFoodItems = React.useMemo(() => {
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

  const fetchFoods = async () => {
    setLoadingFoods(true);
    try {
      const res = await api.get('/fastfood?limit=100');
      const items = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
      setFastFoodItems(items);
    } catch (err) {
      toast.error('Failed to load fast food items');
    } finally {
      setLoadingFoods(false);
    }
  };

  const toggleMealSlot = (day, mealTime) => {
    const hasSlot = formData.templateSchedule.some(
      e => e.dayOfWeek === day && e.mealTimeType === mealTime
    );

    if (hasSlot) {
      setFormData(prev => ({
        ...prev,
        templateSchedule: prev.templateSchedule.filter(
          e => !(e.dayOfWeek === day && e.mealTimeType === mealTime)
        )
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        templateSchedule: [...prev.templateSchedule, {
          id: Math.random().toString(),
          dayOfWeek: day,
          mealTimeType: mealTime,
          preferredTime: DEFAULT_TIMES[mealTime],
          fastFoodItemId: ''
        }]
      }));
    }
  };

  const addDishToSlot = (day, mealTime) => {
    setFormData(prev => ({
      ...prev,
      templateSchedule: [...prev.templateSchedule, {
        id: Math.random().toString(),
        dayOfWeek: day,
        mealTimeType: mealTime,
        preferredTime: DEFAULT_TIMES[mealTime],
        fastFoodItemId: ''
      }]
    }));
  };

  const removeDishFromSlot = (id) => {
    setFormData(prev => ({
      ...prev,
      templateSchedule: prev.templateSchedule.filter(e => e.id !== id)
    }));
  };

  const updateSlot = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      templateSchedule: prev.templateSchedule.map(e => 
        e.id === id ? { ...e, [field]: value } : e
      )
    }));
  };

  const formatSlotDate = (dateString) => {
    if (!dateString) return '';
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    if (days.includes(dateString.toLowerCase())) return dateString.charAt(0).toUpperCase() + dateString.slice(1);
    
    try {
      // Split YYYY-MM-DD to avoid timezone shifting
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(d);
      }
      return dateString;
    } catch {
      return dateString;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    // Validate slots if meal plan
    if (formData.type === 'meal' && formData.templateSchedule.length > 0) {
      const missingFood = formData.templateSchedule.some(s => !s.fastFoodItemId);
      if (missingFood) {
        setIsSaving(false);
        return toast.error('Please assign a food item to all selected schedule slots');
      }
    }

    try {
      const payload = { ...formData };
      // Format numeric/JSON fields correctly
      payload.price = parseFloat(payload.price);
      if (payload.type !== 'meal') {
        payload.templateSchedule = null;
        payload.tags = [];
        payload.imageUrl = '';
      } else {
        // Strip the temporary 'id' field used for rendering
        payload.templateSchedule = payload.templateSchedule.map(({ id, ...rest }) => rest);
      }

      if (isEditing) {
        await subscriptionService.updatePlan(plan.id, payload);
        toast.success('Plan updated successfully');
      } else {
        await subscriptionService.createPlan(payload);
        toast.success('Plan created successfully');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 pb-4 px-4 bg-gray-900 bg-opacity-75 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mb-8 max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-xl z-10">
          <h3 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Plan' : 'Create New Plan'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Plan Name</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border">
                <option value="seller">Seller</option>
                <option value="meal">Meal</option>
                <option value="service">Service</option>
                <option value="laundry">Laundry</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border">
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            {formData.type !== 'meal' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">{formData.currency}</span>
                    </div>
                    <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="block w-full pl-12 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Billing Cycle</label>
                  <select value={formData.billingCycle} onChange={e => setFormData({...formData, billingCycle: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </>
            )}

            {formData.type === 'meal' && (
              <>
                <div className="sm:col-span-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>Custom Package Total:</strong> KES {formData.price}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">The total is automatically calculated from the dishes you add to the schedule below. This is a one-time custom package, not a recurring subscription.</p>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Grace Period (Days)</label>
              <input type="number" required value={formData.gracePeriodDays} onChange={e => setFormData({...formData, gracePeriodDays: parseInt(e.target.value)})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
            </div>

            {formData.type !== 'meal' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Trial Period (Days)</label>
                <input type="number" required value={formData.trialPeriodDays} onChange={e => setFormData({...formData, trialPeriodDays: parseInt(e.target.value)})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
              </div>
            )}
            
            <div className="sm:col-span-2">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input type="checkbox" checked={formData.isVisible} onChange={e => setFormData({...formData, isVisible: e.target.checked})} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded" />
                </div>
                <div className="ml-3 text-sm">
                  <label className="font-medium text-gray-700">Visible on Pricing Page</label>
                  <p className="text-gray-500">Uncheck to hide this plan from the public directory.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Meal schedule template builder */}
          {formData.type === 'meal' && (
            <div className="border-t border-gray-200 pt-6 space-y-4">
              <h4 className="text-md font-bold text-gray-900">Configure Pre-built Meal Schedule</h4>
              <p className="text-sm text-gray-500">Choose the days and times this package delivers, and assign food items to each slot.</p>

              {loadingFoods ? (
                <div className="flex justify-center"><LoadingSpinner /></div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Search dishes</label>
                      <input
                        type="text"
                        value={foodSearchTerm}
                        onChange={e => setFoodSearchTerm(e.target.value)}
                        placeholder="Search by name, description or category"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Filter by category</label>
                      <select
                        value={selectedFoodCategory}
                        onChange={e => setSelectedFoodCategory(e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                      >
                        <option value="all">All categories</option>
                        {availableFoodCategories.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p>
                        Showing <strong>{filteredFastFoodItems.length}</strong> dish{filteredFastFoodItems.length !== 1 ? 'es' : ''}
                        {selectedFoodCategory !== 'all' && ` in ${selectedFoodCategory}`}
                      </p>
                      {filteredFastFoodItems.length === 0 && (
                        <p className="text-sm text-amber-600">No dishes match your filter.</p>
                      )}
                    </div>
                    {filteredFastFoodItems.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                        {filteredFastFoodItems.slice(0, 8).map(item => (
                          <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-2 text-xs">
                            <p className="font-medium text-gray-800">{item.name}</p>
                            <p className="text-gray-500 text-xs">KES {getCustomerPrice(item)} · {item.category || 'Uncategorized'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Calendar Date Picker Row */}
                  <div className="flex flex-col sm:flex-row items-end gap-3 bg-white p-4 rounded-lg border border-gray-300 shadow-sm">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Select Date</label>
                      <input 
                        type="date" 
                        value={newSlotDate}
                        onChange={e => setNewSlotDate(e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border bg-gray-50" 
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Meal Time</label>
                      <select 
                        value={newSlotMeal}
                        onChange={e => setNewSlotMeal(e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border bg-gray-50"
                      >
                        {MEAL_TIMES.map(mt => <option key={mt} value={mt} className="capitalize">{mt}</option>)}
                      </select>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        if (newSlotDate) {
                          addDishToSlot(newSlotDate, newSlotMeal);
                        } else {
                          toast.error('Please select a date from the calendar');
                        }
                      }}
                      className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-md shadow hover:bg-blue-700 text-sm font-bold transition-colors"
                    >
                      + Add Schedule Slot
                    </button>
                  </div>

                  {/* Food selectors for active slots */}
                  {formData.templateSchedule.length > 0 && (
                    <>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-sm font-semibold text-gray-800 mb-2">Choose food items for each schedule slot</p>
                        <p className="text-xs text-gray-500">Use the search bar above to filter available dishes by name, description, or category before selecting from the dropdown list.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(
                        formData.templateSchedule.reduce((acc, slot) => {
                          const key = `${slot.dayOfWeek}|${slot.mealTimeType}`;
                          if (!acc[key]) acc[key] = [];
                          acc[key].push(slot);
                          return acc;
                        }, {})
                      ).map(([key, slots]) => {
                        const [day, mealTime] = key.split('|');
                        return (
                          <div key={key} className="border border-gray-200 rounded-lg p-3 bg-white space-y-3">
                            <div className="flex justify-between items-center border-b pb-2">
                              <p className="text-sm font-semibold text-gray-800">
                                {formatSlotDate(day)} — <span className="capitalize">{mealTime}</span>
                              </p>
                              <button
                                type="button"
                                onClick={() => addDishToSlot(day, mealTime)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                + Add Dish
                              </button>
                            </div>
                             
                            {slots.map((slot, idx) => (
                              <div key={slot.id} className="space-y-2 relative bg-gray-50 p-2 rounded-md border border-gray-100">
                                {slots.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeDishFromSlot(slot.id)}
                                    className="absolute top-1 right-1 text-red-500 hover:text-red-700 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full bg-white border border-red-200"
                                    title="Remove this dish"
                                  >
                                    ✕
                                  </button>
                                )}
                                <select
                                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs mt-3"
                                  value={slot.fastFoodItemId || ''}
                                  onChange={e => updateSlot(slot.id, 'fastFoodItemId', parseInt(e.target.value))}
                                >
                                  <option value="">Choose food item...</option>
                                  {(() => {
                                    const selectedItem = fastFoodItems.find(item => item.id === slot.fastFoodItemId);
                                    const options = selectedItem && !filteredFastFoodItems.some(item => item.id === selectedItem.id)
                                      ? [selectedItem, ...filteredFastFoodItems]
                                      : filteredFastFoodItems;
                                    return options.map(item => (
                                      <option key={item.id} value={item.id}>
                                        {item.name} — KES {getCustomerPrice(item)}
                                      </option>
                                    ));
                                  })()}
                                </select>
                                <input
                                  type="time"
                                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                                  value={slot.preferredTime}
                                  onChange={e => updateSlot(slot.id, 'preferredTime', e.target.value)}
                                />
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </>
                  )}
                </div>              )}
            </div>
          )}

          <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200">
            <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
