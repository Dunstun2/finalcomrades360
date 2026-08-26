import React, { useState } from 'react';
import subscriptionService from '@/shared/services/subscriptionService';
import { toast } from 'react-toastify';
import useScrollLock from '@/hooks/useScrollLock';

const STANDARD_FEATURES = [
  { code: 'free_delivery', name: 'Free Delivery', category: 'Delivery', limitType: 'boolean', description: 'Free delivery on orders / inventory transit', allowedTypes: ['meal', 'laundry', 'delivery', 'seller'],
    summary: 'For customers: free delivery on orders. For sellers: free delivery when transporting inventory to the warehouse or pickup stations.' },
  { code: 'reduced_delivery_fee', name: 'Reduced Delivery Fee', category: 'Delivery', limitType: 'rate', description: 'Percentage waiver on delivery fee', rateLabel: 'Delivery Fee Discount %', ratePlaceholder: 'e.g. 30', allowedTypes: ['meal', 'laundry', 'delivery'],
    summary: 'The subscriber gets a percentage discount on the delivery fee. For example, 30% means they pay only 70% of the normal delivery charge.' },
  { code: 'free_meals', name: 'Free Meals Included', category: 'Meal', limitType: 'counter', description: 'Set amount of free meals per period', counterLabel: 'Number of Free Meals', counterPlaceholder: 'e.g. 5', allowedTypes: ['meal'],
    summary: 'The subscriber receives a set number of completely free meals each period. Once the count is used up, they pay the normal price.' },
  { code: 'meal_discount', name: 'Meal Discount', category: 'Meal', limitType: 'rate', description: 'Discount percentage on meal orders', rateLabel: 'Meal Discount %', ratePlaceholder: 'e.g. 15', allowedTypes: ['meal'],
    summary: 'The subscriber gets a percentage discount on every meal order. For example, 15% off means a KES 1,000 meal costs them KES 850.' },
  { code: 'skip_meals', name: 'Skip Meals', category: 'Meal', limitType: 'boolean', description: 'Allow skipping scheduled deliveries', allowedTypes: ['meal'],
    summary: 'The subscriber can skip upcoming scheduled meal deliveries without being charged. You can limit how many skips are allowed per month.' },
  { code: 'priority_support', name: 'Priority Support', category: 'Support', limitType: 'boolean', description: 'Faster response times and direct channels', allowedTypes: ['seller', 'meal', 'service', 'laundry', 'delivery'],
    summary: 'The subscriber gets priority customer support with faster response times and access to dedicated support channels like phone or live chat.' },
  { code: 'seller_commission_discount', name: 'Seller Commission Discount', category: 'Finance', limitType: 'rate', description: 'Waiver/discount on platform commissions', rateLabel: 'Commission Discount %', ratePlaceholder: 'e.g. 10', allowedTypes: [],
    summary: 'The seller/vendor gets a percentage reduction on the platform commission they pay per order. For example, 10% off a 15% commission = they pay only 13.5%.' },
  { code: 'custom_finance_discount', name: 'Custom Finance Discount', category: 'Finance', limitType: 'rate', description: 'Custom percentage discount', rateLabel: 'Discount %', ratePlaceholder: 'e.g. 20',
    summary: 'A customizable financial discount applied to the subscriber. Set the percentage and conditions below.' },
  
  // Laundry Features
  { code: 'free_laundry_kg', name: 'Free Laundry (Kg)', category: 'Laundry', limitType: 'counter', description: 'Free laundry allowance in kilograms', counterLabel: 'Free Laundry (Kg)', counterPlaceholder: 'e.g. 10', allowedTypes: ['laundry'],
    summary: 'The subscriber gets a set amount of free laundry (measured in kg) each period. Once used, they pay per kg.' },
  { code: 'laundry_discount', name: 'Laundry Discount', category: 'Laundry', limitType: 'rate', description: 'Discount percentage on laundry requests', rateLabel: 'Laundry Discount %', ratePlaceholder: 'e.g. 15', allowedTypes: ['laundry'],
    summary: 'The subscriber gets a percentage discount on all laundry requests.' },
  
  // Service Features
  { code: 'free_services', name: 'Free Services', category: 'Service', limitType: 'counter', description: 'Number of free service requests (e.g., room cleaning)', counterLabel: 'Number of Free Services', counterPlaceholder: 'e.g. 2', allowedTypes: ['service'],
    summary: 'The subscriber receives a set number of completely free service bookings (like cleaning or errands) per period.' },
  { code: 'service_discount', name: 'Service Discount', category: 'Service', limitType: 'rate', description: 'Discount percentage on service requests', rateLabel: 'Service Discount %', ratePlaceholder: 'e.g. 10', allowedTypes: ['service'],
    summary: 'The subscriber gets a percentage discount on service booking fees.' },

  // Visibility / Seller Marketing
  { code: 'featured_product', name: 'Featured Product', category: 'Visibility', limitType: 'boolean', description: 'Allows one of the seller\'s products to be displayed on the homepage Hero banner', allowedTypes: ['seller'],
    summary: 'The seller can select one of their products to be featured on the main homepage hero banner for maximum visibility.' },
  { code: 'boosted_products', name: 'Boosted Products', category: 'Visibility', limitType: 'counter', description: 'Number of products a seller can boost', counterLabel: 'Number of Boosted Products', counterPlaceholder: 'e.g. 5', allowedTypes: ['seller'],
    summary: 'The seller can select a certain number of their products to be boosted to the top of search results.' },
  { code: 'advanced_analytics', name: 'Advanced Analytics', category: 'Visibility', limitType: 'boolean', description: 'Access to advanced customer insights and sales reports', allowedTypes: ['seller'],
    summary: 'The seller unlocks the advanced analytics dashboard to track deep metrics about their store\'s performance.' },

  // Loyalty / Cashback
  { code: 'cashback_orders', name: 'Cashback on Orders', category: 'Finance', limitType: 'rate', description: 'Percentage cashback earned on purchases', rateLabel: 'Cashback %', ratePlaceholder: 'e.g. 5', allowedTypes: ['meal', 'service', 'laundry', 'delivery'],
    summary: 'The subscriber earns a percentage of their order value back into their wallet as cashback.' },
  { code: 'double_points', name: 'Double Loyalty Points', category: 'Finance', limitType: 'boolean', description: 'Earns 2x points on platform purchases', allowedTypes: ['meal', 'service', 'laundry', 'delivery'],
    summary: 'The subscriber automatically earns double the normal loyalty/reward points on all their purchases.' },

  // Limits / Inventory Management
  { code: 'max_products', name: 'Maximum Products', category: 'Limits', limitType: 'counter', description: 'Maximum active products allowed', counterLabel: 'Max Products', counterPlaceholder: 'e.g. 100', allowedTypes: ['seller'],
    summary: 'Limits the total number of active products the seller can have on the platform.' },
  { code: 'max_categories', name: 'Maximum Categories', category: 'Limits', limitType: 'counter', description: 'Maximum product categories allowed', counterLabel: 'Max Categories', counterPlaceholder: 'e.g. 5', allowedTypes: ['seller'],
    summary: 'Limits the number of unique product categories the seller can list items under.' },
  { code: 'inventory_management', name: 'Advanced Inventory Management', category: 'Limits', limitType: 'boolean', description: 'Unlocks advanced stock management features', allowedTypes: ['seller'],
    summary: 'Provides the seller with advanced inventory tools like low stock alerts and detailed stock logs.' },
  
  // Advanced Analytics & Reporting
  { code: 'export_reports', name: 'Export Reports', category: 'Analytics', limitType: 'boolean', description: 'Allows downloading reports as Excel/PDF', allowedTypes: ['seller'],
    summary: 'The seller can export their sales and performance reports.' },
  { code: 'realtime_analytics', name: 'Real-time Analytics', category: 'Analytics', limitType: 'boolean', description: 'Unlocks live data on the dashboard', allowedTypes: ['seller'],
    summary: 'The seller gets real-time metrics and updates on their analytics dashboard.' },
    
  // Marketing & Delivery Tracking (Seller)
  { code: 'delivery_tracking', name: 'Advanced Delivery Tracking', category: 'Delivery', limitType: 'boolean', description: 'Detailed real-time tracking for seller orders', allowedTypes: ['seller', 'meal'],
    summary: 'Unlocks advanced delivery tracking features for the subscriber.' },
  { code: 'free_delivery_promotions', name: 'Free Delivery Promotions', category: 'Marketing', limitType: 'boolean', description: 'Allows running free delivery campaigns', allowedTypes: ['seller'],
    summary: 'The seller can fund and run "Free Delivery" promotions for their buyers.' },
  { code: 'marketing_items_limit', name: 'Marketing Items Limit', category: 'Marketing', limitType: 'counter', description: 'Number of specific items a seller can market/promote for free', counterLabel: 'Max Promoted Items', counterPlaceholder: 'e.g. 5', allowedTypes: ['seller'],
    summary: 'The seller can select a specific number of items to enroll in free platform promotions, waiving the per-item marketing fee.' },
    
  // Financial Admin Tools
  { code: 'express_payout', name: 'Express Payout Processing', category: 'Finance', limitType: 'boolean', description: 'Priority processing for withdrawals', allowedTypes: ['seller', 'service', 'laundry'],
    summary: 'Withdrawal requests from this subscriber are flagged as Priority for faster processing.' },
  { code: 'invoice_generation', name: 'Invoice Generation', category: 'Finance', limitType: 'boolean', description: 'Automated PDF invoices', allowedTypes: ['seller'],
    summary: 'Allows the seller to generate professional PDF invoices for their orders.' },
  { code: 'monthly_statements', name: 'Monthly Statements', category: 'Finance', limitType: 'boolean', description: 'Automated monthly financial statements', allowedTypes: ['seller'],
    summary: 'Unlocks automated monthly financial statements.' },
  { code: 'tax_reports', name: 'Tax Reports', category: 'Finance', limitType: 'boolean', description: 'Specialized reports for tax filing', allowedTypes: ['seller'],
    summary: 'Unlocks specialized tax reporting features.' }
];

// Helper to get the matched standard feature for a benefit
const getMatchedFeature = (featureCode) => STANDARD_FEATURES.find(f => f.code === featureCode);

const generateDynamicSummary = (benefit, packageType) => {
  const name = benefit.featureName || 'This feature';
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

const TYPE_ALLOWED_CATEGORIES = {
  meal: ['Meal', 'Delivery', 'Finance', 'Support'],
  seller: ['Visibility', 'Finance', 'Support', 'Limits', 'Analytics', 'Marketing', 'Delivery'],
  service: ['Service', 'Support', 'Finance'],
  laundry: ['Laundry', 'Delivery', 'Support', 'Finance'],
  delivery: ['Delivery', 'Support', 'Finance']
};

const ALL_CATEGORIES = [
  { value: 'Meal', label: '🍽️ Meal' },
  { value: 'Delivery', label: '🚚 Delivery' },
  { value: 'Laundry', label: '🧺 Laundry' },
  { value: 'Service', label: '🛠️ Service' },
  { value: 'Finance', label: '💰 Finance' },
  { value: 'Support', label: '🎧 Support' },
  { value: 'Visibility', label: '👁️ Visibility' },
  { value: 'Limits', label: '🔒 Limits' },
  { value: 'Analytics', label: '📈 Analytics' },
  { value: 'Marketing', label: '📢 Marketing' }
];

export default function AdminBenefitPackageModal({ pkg, onClose, onSave }) {
  useScrollLock(true);
  const isEditing = !!pkg;
  
  const [formData, setFormData] = useState({
    name: pkg?.name || '',
    description: pkg?.description || '',
    type: pkg?.type || 'seller',
    benefits: (pkg?.benefits || []).map(benefit => {
      const val = benefit.value || { limit: 1, discountPercent: 0, freeDeliveryCount: 0, bonusMeals: 0, enabled: true };
      const isComplex = Object.keys(val).some(k => !['limit', 'discountPercent', 'freeDeliveryCount', 'bonusMeals', 'enabled'].includes(k));
      return {
        featureCode: benefit.featureCode || benefit.feature?.code || '',
        featureName: benefit.featureName || benefit.feature?.name || '',
        description: benefit.description || benefit.feature?.description || '',
        category: benefit.category || benefit.feature?.category || 'Meal',
        limitType: benefit.limitType || 'counter',
        value: val,
        startDate: benefit.startDate || '',
        endDate: benefit.endDate || '',
        id: benefit.id || Math.random().toString(),
        isJsonMode: isComplex,
        rawJsonStr: JSON.stringify(val, null, 2)
      };
    })
  });

  const [isSaving, setIsSaving] = useState(false);

  const addBenefit = () => {
    const allowed = TYPE_ALLOWED_CATEGORIES[formData.type] || ['Meal'];
    const defaultCategory = allowed[0] || 'Meal';
    setFormData(prev => ({
      ...prev,
      benefits: [
        ...(prev.benefits || []),
        {
          featureCode: '',
          featureName: '',
          description: '',
          category: defaultCategory,
          limitType: 'counter',
          value: { limit: 1, discountPercent: 0, freeDeliveryCount: 0, bonusMeals: 0, enabled: true },
          id: Math.random().toString(),
          isJsonMode: false,
          rawJsonStr: JSON.stringify({ limit: 1, discountPercent: 0, freeDeliveryCount: 0, bonusMeals: 0, enabled: true }, null, 2)
        }
      ]
    }));
  };

  const handleFeatureCodeChange = (id, code) => {
    const matched = STANDARD_FEATURES.find(f => f.code === code);
    if (matched) {
      setFormData(prev => ({
        ...prev,
        benefits: prev.benefits.map(b => {
          if (b.id !== id) return b;
          let defaultValue = { enabled: true };
          if (matched.limitType === 'counter') {
            defaultValue = { limit: 1, resetPeriod: 'monthly' };
          } else if (matched.limitType === 'rate') {
            defaultValue = { discountPercent: 10, conditions: { minOrderValue: 0 } };
          }
          
          return {
            ...b,
            featureCode: matched.code,
            featureName: matched.name,
            category: matched.category,
            limitType: matched.limitType,
            description: matched.description,
            value: defaultValue,
            rawJsonStr: JSON.stringify(defaultValue, null, 2)
          };
        })
      }));
    } else {
      updateBenefit(id, 'featureCode', code);
    }
  };

  const updateBenefit = (id, field, val) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.map(benefit => {
        if (benefit.id !== id) return benefit;
        
        let updated = { ...benefit };
        if (field.startsWith('value.')) {
          const keyPath = field.split('.').slice(1);
          const newValue = { ...benefit.value };
          
          let current = newValue;
          for (let i = 0; i < keyPath.length - 1; i++) {
            const k = keyPath[i];
            if (!current[k] || typeof current[k] !== 'object') {
              current[k] = {};
            }
            current[k] = { ...current[k] };
            current = current[k];
          }
          current[keyPath[keyPath.length - 1]] = val;
          
          updated.value = newValue;
          updated.rawJsonStr = JSON.stringify(newValue, null, 2);
        } else {
          updated[field] = val;
        }
        return updated;
      })
    }));
  };

  const updateRawJson = (id, jsonStr) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.map(benefit => {
        if (benefit.id !== id) return benefit;
        let parsedVal = benefit.value;
        try {
          parsedVal = JSON.parse(jsonStr);
        } catch (e) {
          // Ignored while typing
        }
        return {
          ...benefit,
          rawJsonStr: jsonStr,
          value: parsedVal
        };
      })
    }));
  };

  const toggleJsonMode = (id) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.map(benefit => {
        if (benefit.id !== id) return benefit;
        
        if (benefit.isJsonMode) {
          try {
            const parsed = JSON.parse(benefit.rawJsonStr);
            return {
              ...benefit,
              value: parsed,
              isJsonMode: false
            };
          } catch (err) {
            toast.error('Invalid JSON format. Please fix the syntax before switching back.');
            return benefit;
          }
        } else {
          return {
            ...benefit,
            rawJsonStr: JSON.stringify(benefit.value, null, 2),
            isJsonMode: true
          };
        }
      })
    }));
  };

  const removeBenefit = (id) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter(benefit => benefit.id !== id)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const cleanBenefits = [];
      for (let i = 0; i < formData.benefits.length; i++) {
        const b = formData.benefits[i];
        let finalValue = b.value;
        if (b.isJsonMode) {
          try {
            finalValue = JSON.parse(b.rawJsonStr);
          } catch (e) {
            toast.error(`Invalid JSON configuration in Benefit #${i + 1}`);
            setIsSaving(false);
            return;
          }
        }
        const feat = STANDARD_FEATURES.find(f => f.code === b.featureCode);
        if (feat && feat.allowedTypes && !feat.allowedTypes.includes(formData.type)) {
          toast.error(`Feature "${feat.name}" is not allowed for package type "${formData.type}"`);
          setIsSaving(false);
          return;
        }

        cleanBenefits.push({
          featureCode: b.featureCode,
          featureName: b.featureName,
          description: b.description,
          category: b.category,
          limitType: b.limitType,
          value: finalValue,
          startDate: b.startDate || null,
          endDate: b.endDate || null
        });
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        benefits: cleanBenefits
      };

      if (isEditing) {
        await subscriptionService.updateBenefitPackage(pkg.id, payload);
        toast.success('Benefit package updated successfully');
      } else {
        await subscriptionService.createBenefitPackage(payload);
        toast.success('Benefit package created successfully');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center sm:pt-20 sm:pb-4 sm:px-4 bg-gray-900 bg-opacity-75 overflow-y-auto">
      <div className="bg-white rounded-none sm:rounded-xl shadow-xl max-w-3xl w-full min-h-screen sm:min-h-0 sm:mb-8 flex flex-col">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-none sm:rounded-t-xl z-10">
          <h3 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Benefit Package' : 'Create Benefit Package'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1 max-h-[calc(100vh-120px)] sm:max-h-[80vh]">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Package Name</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select value={formData.type} onChange={e => {
                const newType = e.target.value;
                const allowed = TYPE_ALLOWED_CATEGORIES[newType] || [];
                setFormData(prev => ({
                  ...prev,
                  type: newType,
                  benefits: prev.benefits.filter(b => {
                    const isCategoryAllowed = allowed.includes(b.category);
                    const feat = STANDARD_FEATURES.find(f => f.code === b.featureCode);
                    const isFeatureAllowed = !feat || !feat.allowedTypes || feat.allowedTypes.includes(newType);
                    return isCategoryAllowed && isFeatureAllowed;
                  })
                }));
              }} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border">
                <option value="seller">Seller</option>
                <option value="meal">Meal</option>
                <option value="service">Service</option>
                <option value="laundry">Laundry</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-md font-bold text-gray-900">Features / Benefits</h4>
                <p className="text-sm text-gray-600">Define the features included in this package.</p>
              </div>
              <button type="button" onClick={addBenefit} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                + Add Benefit
              </button>
            </div>

            {(formData.benefits || []).length === 0 ? (
              <div className="rounded-lg border border-dashed border-blue-200 bg-white p-4 text-sm text-gray-500">No benefits added yet.</div>
            ) : (
              <div className="space-y-4">
                {formData.benefits.map((benefit, index) => (
                  <div key={benefit.id || index} className="rounded-xl border border-blue-100 bg-white p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b pb-2">
                      <p className="font-bold text-gray-800">Benefit #{index + 1}</p>
                      <button type="button" onClick={() => removeBenefit(benefit.id)} className="text-sm font-semibold text-red-600 hover:text-red-700">Remove</button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* 1. CATEGORY — First, since it drives everything else */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                        <select className="rounded-md border border-gray-300 p-2 text-sm w-full" value={benefit.category || 'Meal'} onChange={e => {
                          updateBenefit(benefit.id, 'category', e.target.value);
                          // Reset feature code when category changes to avoid mismatches
                          updateBenefit(benefit.id, 'featureCode', '');
                          updateBenefit(benefit.id, 'featureName', '');
                          updateBenefit(benefit.id, 'description', '');
                        }}>
                          {(() => {
                            const allowed = TYPE_ALLOWED_CATEGORIES[formData.type] || [];
                            return ALL_CATEGORIES
                              .filter(c => allowed.includes(c.value))
                              .map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                              ));
                          })()}
                        </select>
                      </div>

                      {/* 2. FEATURE NAME — Dropdown filtered by category, sets code behind the scenes */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Feature Name</label>
                        <select
                          className="rounded-md border border-gray-300 p-2 text-sm w-full"
                          value={STANDARD_FEATURES.some(f => f.code === benefit.featureCode) ? benefit.featureCode : 'custom'}
                          onChange={e => {
                            if (e.target.value === 'custom') {
                              updateBenefit(benefit.id, 'featureCode', '');
                              updateBenefit(benefit.id, 'featureName', '');
                              updateBenefit(benefit.id, 'description', '');
                            } else if (e.target.value === '') {
                              // placeholder selected
                            } else {
                              handleFeatureCodeChange(benefit.id, e.target.value);
                            }
                          }}
                        >
                          <option value="">-- Select Feature --</option>
                          {STANDARD_FEATURES
                            .filter(f => f.category === benefit.category && (!f.allowedTypes || f.allowedTypes.includes(formData.type)))
                            .map(f => (
                              <option key={f.code} value={f.code}>{f.name}</option>
                            ))}
                          <option value="custom">✏️ Custom Feature</option>
                        </select>
                        {(!STANDARD_FEATURES.some(f => f.code === benefit.featureCode) || benefit.featureCode === '') && (
                          <div className="mt-2 space-y-2">
                            <input
                              className="rounded-md border border-gray-300 p-2 text-sm w-full"
                              placeholder="Custom feature name (e.g., Special Reward)"
                              value={benefit.featureName || ''}
                              onChange={e => updateBenefit(benefit.id, 'featureName', e.target.value)}
                            />
                            <input
                              className="rounded-md border border-gray-300 p-2 text-sm w-full text-gray-500"
                              placeholder="Feature code (e.g., special_reward)"
                              value={benefit.featureCode || ''}
                              onChange={e => updateBenefit(benefit.id, 'featureCode', e.target.value)}
                            />
                          </div>
                        )}
                      </div>

                      {/* 3. LIMIT TYPE — Auto-set and locked for standard features */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Limit Type
                          {STANDARD_FEATURES.some(f => f.code === benefit.featureCode) && (
                            <span className="ml-2 text-xs text-green-600 font-normal">🔒 Auto-set</span>
                          )}
                        </label>
                        <select
                          className={`rounded-md border p-2 text-sm w-full ${STANDARD_FEATURES.some(f => f.code === benefit.featureCode) ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                          value={benefit.limitType || 'counter'}
                          disabled={STANDARD_FEATURES.some(f => f.code === benefit.featureCode)}
                          onChange={e => updateBenefit(benefit.id, 'limitType', e.target.value)}
                        >
                          <option value="counter">Counter (Limited count)</option>
                          <option value="rate">Rate (Percentage/Discounts)</option>
                          <option value="boolean">Boolean (Yes/No toggle)</option>
                          <option value="value">Value (Specific Amounts/Points/Cash)</option>
                        </select>
                      </div>

                      {/* 4. SHORT DESCRIPTION — Locked for standard features */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Short Description
                          {STANDARD_FEATURES.some(f => f.code === benefit.featureCode) && (
                            <span className="ml-2 text-xs text-green-600 font-normal">🔒 Auto-set</span>
                          )}
                        </label>
                        <input
                          className={`rounded-md border p-2 text-sm w-full ${STANDARD_FEATURES.some(f => f.code === benefit.featureCode) ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                          placeholder="Short description of the benefit"
                          value={benefit.description || ''}
                          disabled={STANDARD_FEATURES.some(f => f.code === benefit.featureCode)}
                          onChange={e => updateBenefit(benefit.id, 'description', e.target.value)}
                        />
                      </div>

                      {/* Configurable Benefit Section */}
                      <div className="md:col-span-2 border-t pt-3 mt-2">
                        <div className="mb-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Value Configuration</label>
                        </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-gray-50 p-3 rounded-t-lg border border-b-0">
                            
                            {/* Limit Type: Boolean (True/False toggle) */}
                            {benefit.limitType === 'boolean' && (
                              <>
                                <div className="flex items-center space-x-2 py-2 col-span-full">
                                  <input
                                    type="checkbox"
                                    id={`enabled-${benefit.id}`}
                                    checked={benefit.value?.enabled ?? true}
                                    onChange={e => updateBenefit(benefit.id, 'value.enabled', e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                  />
                                  <label htmlFor={`enabled-${benefit.id}`} className="text-sm font-semibold text-gray-700">
                                    {benefit.featureCode === 'free_delivery' ? 'Free Delivery Enabled' :
                                     benefit.featureCode === 'skip_meals' ? 'Allow Meal Skipping' :
                                     benefit.featureCode === 'priority_support' ? 'Priority Support Enabled' :
                                     'Feature Enabled'}
                                  </label>
                                </div>

                                {/* Delivery-specific: Free Delivery conditions */}
                                {benefit.category === 'Delivery' && (
                                  <>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600">Min Order Value (KES)</label>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="0 = no minimum"
                                        value={benefit.value?.conditions?.minOrderValue ?? ''}
                                        onChange={e => updateBenefit(benefit.id, 'value.conditions.minOrderValue', parseInt(e.target.value || '0', 10))}
                                        className="mt-1 block w-full rounded-md border-gray-300 sm:text-xs p-1.5 border"
                                      />
                                      <p className="text-[10px] text-gray-400 mt-0.5">Minimum order amount to qualify for free delivery</p>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600">Max Free Deliveries / Period</label>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="0 = unlimited"
                                        value={benefit.value?.maxFreeDeliveries ?? ''}
                                        onChange={e => updateBenefit(benefit.id, 'value.maxFreeDeliveries', parseInt(e.target.value || '0', 10))}
                                        className="mt-1 block w-full rounded-md border-gray-300 sm:text-xs p-1.5 border"
                                      />
                                      <p className="text-[10px] text-gray-400 mt-0.5">0 or empty = unlimited free deliveries</p>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600">Reset Period</label>
                                      <select
                                        value={benefit.value?.resetPeriod || 'monthly'}
                                        onChange={e => updateBenefit(benefit.id, 'value.resetPeriod', e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 sm:text-xs p-1.5 border"
                                      >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                      </select>
                                      <p className="text-[10px] text-gray-400 mt-0.5">How often the free delivery count resets</p>
                                    </div>
                                  </>
                                )}

                                {/* Support-specific fields */}
                                {benefit.category === 'Support' && (
                                  <>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600">Response Time</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. 2 hours"
                                        value={benefit.value?.responseTime ?? ''}
                                        onChange={e => updateBenefit(benefit.id, 'value.responseTime', e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 sm:text-xs p-1.5 border"
                                      />
                                    </div>
                                    <div className="sm:col-span-2">
                                      <label className="block text-xs font-medium text-gray-600">Support Channels</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. chat, phone"
                                        value={Array.isArray(benefit.value?.supportChannels) ? benefit.value.supportChannels.join(', ') : (benefit.value?.supportChannels ?? '')}
                                        onChange={e => updateBenefit(benefit.id, 'value.supportChannels', e.target.value.split(',').map(s => s.trim()))}
                                        className="mt-1 block w-full rounded-md border-gray-300 sm:text-xs p-1.5 border"
                                      />
                                    </div>
                                  </>
                                )}

                                {/* Meal skip-specific fields */}
                                {benefit.category === 'Meal' && benefit.featureCode?.includes('skip') && (
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600">Allowed Skips / Month</label>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="e.g. 2"
                                      value={benefit.value?.skipsPerMonth ?? ''}
                                      onChange={e => updateBenefit(benefit.id, 'value.skipsPerMonth', parseInt(e.target.value || '0', 10))}
                                      className="mt-1 block w-full rounded-md border-gray-300 sm:text-xs p-1.5 border"
                                    />
                                  </div>
                                )}
                              </>
                            )}

                            {/* Limit Type: Rate (Percentage waivers, discounts, conditions) */}
                            {benefit.limitType === 'rate' && (() => {
                              const matched = getMatchedFeature(benefit.featureCode);
                              const rateLabel = matched?.rateLabel || 'Discount % (Waiver)';
                              const ratePlaceholder = matched?.ratePlaceholder || 'e.g. 10';
                              return (
                              <>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600">{rateLabel}</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder={ratePlaceholder}
                                    value={benefit.value?.discountPercent ?? ''}
                                    onChange={e => updateBenefit(benefit.id, 'value.discountPercent', parseInt(e.target.value || '0', 10))}
                                    className="mt-1 block w-full rounded-md border-gray-300 sm:text-xs p-1.5 border"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600">Min Order Value (KES)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="e.g. 500"
                                    value={benefit.value?.conditions?.minOrderValue ?? ''}
                                    onChange={e => updateBenefit(benefit.id, 'value.conditions.minOrderValue', parseInt(e.target.value || '0', 10))}
                                    className="mt-1 block w-full rounded-md border-gray-300 sm:text-xs p-1.5 border"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600">Max Discount Limit (KES)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="e.g. 150"
                                    value={benefit.value?.maxDiscount ?? ''}
                                    onChange={e => updateBenefit(benefit.id, 'value.maxDiscount', parseInt(e.target.value || '0', 10))}
                                    className="mt-1 block w-full rounded-md border-gray-300 sm:text-xs p-1.5 border"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600">Max Usage Limit</label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0 = unlimited"
                                    value={benefit.value?.limit ?? ''}
                                    onChange={e => updateBenefit(benefit.id, 'value.limit', parseInt(e.target.value || '0', 10))}
                                    className="mt-1 block w-full rounded-md border-gray-300 sm:text-xs p-1.5 border"
                                  />
                                  <p className="text-[10px] text-gray-400 mt-0.5">0 or empty = unlimited usage</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600">Reset Period</label>
                                  <select
                                    value={benefit.value?.resetPeriod || 'monthly'}
                                    onChange={e => updateBenefit(benefit.id, 'value.resetPeriod', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 sm:text-xs p-1.5 border"
                                  >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                  </select>
                                  <p className="text-[10px] text-gray-400 mt-0.5">How often the usage count resets</p>
                                </div>
                              </>
                              );
                            })()}

                            {/* Limit Type: Counter (Numerical counts, usage limits, resets) */}
                            {benefit.limitType === 'counter' && (() => {
                              const matched = getMatchedFeature(benefit.featureCode);
                              const counterLabel = matched?.counterLabel || `Number of ${benefit.featureName || 'Uses'}`;
                              const counterPlaceholder = matched?.counterPlaceholder || 'e.g. 4';
                              return (
                              <>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600">{counterLabel}</label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder={counterPlaceholder}
                                    value={benefit.value?.limit ?? ''}
                                    onChange={e => updateBenefit(benefit.id, 'value.limit', parseInt(e.target.value || '0', 10))}
                                    className="mt-1 block w-full rounded-md border-gray-300 sm:text-xs p-1.5 border"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600">Reset Period</label>
                                  <select
                                    value={benefit.value?.resetPeriod || 'monthly'}
                                    onChange={e => updateBenefit(benefit.id, 'value.resetPeriod', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 sm:text-xs p-1.5 border"
                                  >
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="daily">Daily</option>
                                  </select>
                                </div>

                                {benefit.category === 'Meal' && (
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600">Max Value per Meal (KES)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="e.g. 1000"
                                      value={benefit.value?.maxMealValue ?? ''}
                                      onChange={e => updateBenefit(benefit.id, 'value.maxMealValue', parseInt(e.target.value || '0', 10))}
                                      className="mt-1 block w-full rounded-md border-gray-300 sm:text-xs p-1.5 border"
                                    />
                                  </div>
                                )}
                              </>
                              );
                            })()}

                            {/* Limit Type: Value (Specific amounts, cash, points) */}
                            {benefit.limitType === 'value' && (
                              <>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600">Amount</label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="e.g. 500"
                                    value={benefit.value?.amount ?? ''}
                                    onChange={e => updateBenefit(benefit.id, 'value.amount', parseInt(e.target.value || '0', 10))}
                                    className="mt-1 block w-full rounded-md border-gray-300 sm:text-xs p-1.5 border"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600">Unit / Currency</label>
                                  <select
                                    value={benefit.value?.unit || 'KES'}
                                    onChange={e => updateBenefit(benefit.id, 'value.unit', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 sm:text-xs p-1.5 border"
                                  >
                                    <option value="KES">KES (Cash/Wallet)</option>
                                    <option value="Points">Loyalty Points</option>
                                    <option value="Tokens">Tokens</option>
                                  </select>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Dynamic live summary at the bottom */}
                          <div className="bg-blue-50/50 border border-t-0 rounded-b-lg p-3">
                            <p className="text-[13px] text-blue-900 leading-relaxed flex items-center gap-2">
                              <span>💡</span>
                              <strong>Summary:</strong>
                              <span>{generateDynamicSummary(benefit, formData.type)}</span>
                            </p>
                          </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200">
            <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save Package'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
