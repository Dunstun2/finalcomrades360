import React, { useState, useEffect, useCallback } from 'react';
import subscriptionService from '@/shared/services/subscriptionService';
import api from '@/shared/services/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import MealPlanBuilder from '@/shared/components/MealPlanBuilder';
import useScrollLock from '@/hooks/useScrollLock';

export default function AdminPlanEditorModal({ plan, onClose, onSave }) {
  useScrollLock(true);
  const isEditing = !!plan;

  // ── Top-level plan metadata ───────────────────────────────────────────────
  const [formData, setFormData] = useState({
    name:            plan?.name            || '',
    description:     plan?.description     || '',
    type:            plan?.type            || 'seller',
    status:          plan?.status          || 'Draft',
    price:           plan?.price           || 0,
    billingCycle:    plan?.billingCycle     || 'weekly',
    currency:        plan?.currency        || 'KES',
    gracePeriodDays: plan?.type === 'meal' ? 0 : (plan?.gracePeriodDays ?? 3),
    trialPeriodDays: plan?.trialPeriodDays  ?? 0,
    isVisible:       plan?.isVisible        ?? true,
    tags:            plan?.tags            || [],
    imageUrl:        plan?.imageUrl        || '',
    benefitPackageId: plan?.benefitPackageId ? String(plan.benefitPackageId) : '',
    // For non-meal plans — manual benefits still supported
    benefits: (plan?.benefits || []).map(b => ({
      featureCode: b.featureCode || b.feature?.code || '',
      featureName: b.featureName || b.feature?.name || '',
      description: b.description || b.feature?.description || '',
      category:    b.category    || b.feature?.category    || 'Meal',
      limitType:   b.limitType   || 'counter',
      value:       b.value       || { limit: 1, enabled: true },
      startDate:   b.startDate   || '',
      endDate:     b.endDate     || '',
    })),
  });

  // ── Meal-plan builder state (lifted from MealPlanBuilder) ─────────────────
  const [mealSchedule,    setMealSchedule]    = useState(() => {
    // Convert legacy fastFoodItemIds[] → fastFoodItemQtys{} so the builder
    // can display and edit existing slots correctly
    return (plan?.templateSchedule || []).map(s => {
      if (s.fastFoodItemQtys && Object.keys(s.fastFoodItemQtys).length) {
        return { ...s, _id: s._id || Math.random().toString(36).slice(2) };
      }
      // Build qty map from flat array (ids repeated for qty > 1)
      const ids = s.fastFoodItemIds?.length
        ? s.fastFoodItemIds
        : s.fastFoodItemId ? [s.fastFoodItemId] : [];
      const qtys = ids.reduce((acc, id) => {
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});
      return { ...s, _id: Math.random().toString(36).slice(2), fastFoodItemQtys: qtys };
    });
  });
  const [computedPrice,   setComputedPrice]   = useState(plan?.price || 0);

  // ── Support data ──────────────────────────────────────────────────────────
  const [benefitPackages, setBenefitPackages] = useState([]);
  const [fastFoodItems,   setFastFoodItems]   = useState([]);
  const [loadingFoods,    setLoadingFoods]    = useState(false);
  const [isSaving,        setIsSaving]        = useState(false);
  const [fieldErrors,     setFieldErrors]     = useState({});

  useEffect(() => {
    fetchBenefitPackages();
  }, []);

  useEffect(() => {
    if (formData.type === 'meal') fetchFoods();
  }, [formData.type]);

  // Auto-sync price for meal plans (computed by MealPlanBuilder)
  useEffect(() => {
    if (formData.type === 'meal') {
      setFormData(prev => ({ ...prev, price: computedPrice, billingCycle: 'weekly' }));
    }
  }, [computedPrice, formData.type]);

  const fetchBenefitPackages = async () => {
    try {
      const data = await subscriptionService.getBenefitPackages();
      setBenefitPackages(data || []);
    } catch { toast.error('Failed to load benefit packages'); }
  };

  const fetchFoods = async () => {
    setLoadingFoods(true);
    try {
      const res = await api.get('/fastfood?limit=100');
      setFastFoodItems(res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []));
    } catch { toast.error('Failed to load fast food items'); }
    finally { setLoadingFoods(false); }
  };

  // ── Resolve active benefits for simulation table ───────────────────────────
  // Prefer selected package benefits; fall back to manual plan benefits
  const activeBenefits = React.useMemo(() => {
    if (formData.benefitPackageId) {
      const pkg = benefitPackages.find(p => String(p.id) === formData.benefitPackageId);
      if (pkg?.benefits?.length) return pkg.benefits;
    }
    return formData.benefits || [];
  }, [formData.benefitPackageId, formData.benefits, benefitPackages]);

  // ── MealPlanBuilder callbacks ─────────────────────────────────────────────
  const handleScheduleChange = useCallback((slots) => setMealSchedule(slots), []);
  const handlePriceChange    = useCallback((p)     => setComputedPrice(p), []);

  // ── Status-only save (bypasses schedule validation) ───────────────────────
  const handleStatusSave = async () => {
    if (!isEditing) return;
    setIsSaving(true);
    try {
      await subscriptionService.updatePlan(plan.id, {
        status: formData.status,
        isVisible: formData.isVisible,
      });
      toast.success('Plan status updated');
      onSave();
    } catch (err) {
      const data = err.response?.data;
      toast.error(data?.error || data?.message || 'Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Form submission ───────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    // ── Front-end field validation ────────────────────────────────────────
    const errs = {};

    if (!formData.name?.trim()) {
      errs.name = 'Plan name is required';
    }
    if (formData.type !== 'meal') {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price < 0) errs.price = 'Price must be 0 or more';
      if (!formData.billingCycle) errs.billingCycle = 'Billing cycle is required';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      // Scroll the first error into view
      toast.error('Please fix the highlighted fields before saving');
      return;
    }
    setFieldErrors({});
    setIsSaving(true);

    try {
      const payload = { ...formData };
      payload.price           = parseFloat(payload.price) || 0;
      payload.gracePeriodDays = payload.type === 'meal' ? 0 : parseInt(payload.gracePeriodDays || 0, 10);
      payload.trialPeriodDays = parseInt(payload.trialPeriodDays || 0, 10);
      payload.benefitPackageId = payload.benefitPackageId ? parseInt(payload.benefitPackageId) : null;
      payload.benefits = (payload.benefits || []).map(({ featureName, category, startDate, endDate, ...b }) => ({
        ...b, featureName, category,
        startDate: startDate || null,
        endDate:   endDate   || null,
      }));

      if (payload.type === 'meal') {
        if (mealSchedule.some(s => !Object.keys(s.fastFoodItemQtys || {}).length)) {
          toast.error('Please assign at least one food item to every schedule slot');
          setIsSaving(false);
          return;
        }
        payload.templateSchedule = mealSchedule.map(({ _id, fastFoodItemId: _l, fastFoodItemIds: _li, fastFoodItemQtys, ...rest }) => ({
          ...rest,
          fastFoodItemIds: Object.entries(fastFoodItemQtys || {}).flatMap(([id, qty]) =>
            Array(qty).fill(Number(id))
          ),
        }));
        payload.tags     = payload.tags || [];
      } else {
        payload.templateSchedule = null;
        payload.tags             = [];
        payload.imageUrl         = '';
      }

      if (isEditing) {
        await subscriptionService.updatePlan(plan.id, payload);
        toast.success('Plan updated');
      } else {
        await subscriptionService.createPlan(payload);
        toast.success('Plan created');
      }
      onSave();
    } catch (err) {
      // Surface the most useful message — backend sends either error or details array
      const data = err.response?.data;
      if (data?.details?.length) {
        // Show each backend validation message as a separate toast
        data.details.forEach(msg => toast.error(msg));
      } else {
        toast.error(data?.error || data?.message || 'Operation failed');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const set = (key) => (val) => {
    setFormData(prev => ({ ...prev, [key]: val }));
    setFieldErrors(prev => ({ ...prev, [key]: undefined }));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center sm:pt-16 sm:pb-4 sm:px-4 bg-gray-900/75 overflow-y-auto">
      <div className="bg-white rounded-none sm:rounded-xl shadow-xl max-w-3xl w-full min-h-screen sm:min-h-0 sm:mb-8 flex flex-col">

        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-none sm:rounded-t-xl z-10">
          <h3 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Plan' : 'Create New Plan'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1 max-h-[calc(100vh-120px)] sm:max-h-[80vh]">

          {/* ── Core plan fields ── */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select value={formData.type}
                onChange={e => {
                  const t = e.target.value;
                  setFormData(prev => ({
                    ...prev, type: t,
                    gracePeriodDays: t === 'meal' ? 0 : (prev.gracePeriodDays || 3),
                    billingCycle:    t === 'meal' ? 'weekly' : prev.billingCycle,
                  }));
                  setFieldErrors(prev => ({ ...prev, type: undefined }));
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border">
                <option value="seller">Seller</option>
                <option value="meal">Meal</option>
                <option value="service">Service</option>
                <option value="laundry">Laundry</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              {plan?.firstPublishedAt ? (
                <>
                  <div className="flex gap-2 mt-1">
                    <select value={formData.status} onChange={e => setFormData(p => ({...p, status: e.target.value}))}
                      className="flex-1 block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border">
                      <option value="Published">Published</option>
                      <option value="Archived">Archived</option>
                      <option value="Disabled">Disabled</option>
                    </select>
                    {isEditing && formData.type === 'meal' && (
                      <button type="button" onClick={handleStatusSave} disabled={isSaving}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">
                        Apply
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-amber-600">
                    Published on {new Date(plan.firstPublishedAt).toLocaleDateString()}. Draft is no longer available.
                  </p>
                </>
              ) : (
                <div className="flex gap-2 mt-1">
                  <select value={formData.status} onChange={e => setFormData(p => ({...p, status: e.target.value}))}
                    className="flex-1 block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border">
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                    <option value="Archived">Archived</option>
                  </select>
                  {isEditing && formData.type === 'meal' && (
                    <button type="button" onClick={handleStatusSave} disabled={isSaving}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">
                      Apply
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Price + Billing cycle — only for non-meal types */}
            {formData.type !== 'meal' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price ({formData.currency})</label>
                  <input type="number" step="0.01" min="0" value={formData.price}
                    onChange={e => { setFormData(p => ({...p, price: e.target.value})); setFieldErrors(p => ({...p, price: undefined})); }}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border ${fieldErrors.price ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
                  {fieldErrors.price && <p className="mt-1 text-xs text-red-600">{fieldErrors.price}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Billing Cycle</label>
                  <select value={formData.billingCycle}
                    onChange={e => { setFormData(p => ({...p, billingCycle: e.target.value})); setFieldErrors(p => ({...p, billingCycle: undefined})); }}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border ${fieldErrors.billingCycle ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  {fieldErrors.billingCycle && <p className="mt-1 text-xs text-red-600">{fieldErrors.billingCycle}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Grace Period (days)</label>
                  <input type="number" min="0" value={formData.gracePeriodDays}
                    onChange={e => setFormData(p => ({...p, gracePeriodDays: parseInt(e.target.value) || 0}))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Trial Period (days)</label>
                  <input type="number" min="0" value={formData.trialPeriodDays}
                    onChange={e => setFormData(p => ({...p, trialPeriodDays: parseInt(e.target.value) || 0}))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
                </div>
              </>
            )}

            {/* Visible toggle */}
            <div className="sm:col-span-2 flex items-start gap-3">
              <input id="vis" type="checkbox" checked={formData.isVisible}
                onChange={e => setFormData(p => ({...p, isVisible: e.target.checked}))}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              <label htmlFor="vis" className="text-sm">
                <span className="font-medium text-gray-700">Visible on Pricing Page</span>
                <p className="text-gray-500 mt-0.5">Uncheck to hide this plan from the public directory.</p>
              </label>
            </div>
          </div>

          {/* ── MealPlanBuilder — only shown for type=meal ── */}
          {formData.type === 'meal' ? (
            <MealPlanBuilder
              mode="admin"
              planName={formData.name}
              onPlanNameChange={set('name')}
              description={formData.description}
              onDescriptionChange={set('description')}
              billingCycle={formData.billingCycle}
              onBillingCycleChange={set('billingCycle')}
              benefitPackages={benefitPackages.filter(p => p.type === 'meal')}
              selectedPackageId={formData.benefitPackageId ? parseInt(formData.benefitPackageId) : null}
              onPackageChange={(id) => setFormData(p => ({ ...p, benefitPackageId: id ? String(id) : '' }))}
              activeBenefits={activeBenefits}
              fastFoodItems={fastFoodItems}
              loadingFoods={loadingFoods}
              initialSchedule={mealSchedule}
              onScheduleChange={handleScheduleChange}
              onPriceChange={handlePriceChange}
              onSubmit={handleSubmit}
              isSubmitting={isSaving}
              submitLabel={isEditing ? 'Save Changes' : 'Create Plan'}
            />
          ) : (
            /* ── Non-meal plans: keep existing name/description + package selector ── */
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Plan Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={formData.name}
                  onChange={e => { setFormData(p => ({...p, name: e.target.value})); setFieldErrors(p => ({...p, name: undefined})); }}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border ${fieldErrors.name ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
                {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea rows={2} value={formData.description}
                  onChange={e => setFormData(p => ({...p, description: e.target.value}))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border resize-none" />
              </div>

              {/* Benefit package selector for non-meal plans */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 space-y-3">
                <h4 className="font-bold text-gray-900 text-sm">Benefit Package Assignment</h4>
                <select value={formData.benefitPackageId}
                  onChange={e => setFormData(p => ({...p, benefitPackageId: e.target.value}))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border">
                  <option value="">-- No Package --</option>
                  {benefitPackages.filter(p => p.type === formData.type).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {(() => {
                  const pkg = benefitPackages.find(p => String(p.id) === formData.benefitPackageId);
                  if (!pkg?.benefits?.length) return null;
                  return (
                    <ul className="mt-2 space-y-1">
                      {pkg.benefits.map((b, i) => (
                        <li key={i} className="text-xs bg-white/60 rounded px-3 py-1.5 border border-blue-200/50">
                          <span className="font-semibold text-blue-900">{b.feature?.name || b.featureName || b.featureCode}</span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>

              {/* Save button for non-meal plans */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="button" onClick={handleSubmit} disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {isSaving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
