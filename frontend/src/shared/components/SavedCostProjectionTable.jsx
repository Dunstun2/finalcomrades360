import React from 'react';

/**
 * SavedCostProjectionTable - Displays pre-calculated cost projection snapshot
 * 
 * This component displays the exact Schedule & Projected Cost table as it was
 * calculated and saved when the subscription was created. No recalculation happens.
 * 
 * Props:
 * - snapshot: The costProjectionSnapshot object from the subscription
 * - title: Optional title override
 * - description: Optional description override
 */
export default function SavedCostProjectionTable({ snapshot, title, description }) {
  if (!snapshot || !snapshot.rows || snapshot.rows.length === 0) {
    return (
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-700">No cost projection data available for this subscription.</p>
      </div>
    );
  }

  const { rows, totals, benefitsApplied, billingCycle } = snapshot;
  const hasSavings = totals.totalSavings > 0;

  return (
    <div className="mt-6 border-t pt-5">
      <h4 className="text-sm font-bold text-gray-800 mb-1">
        {title || "📊 Schedule & Projected Cost"}
      </h4>
      <p className="text-xs text-gray-500 mb-3">
        {description || `Breakdown of your scheduled meals and costs per ${billingCycle || 'cycle'}.`}
      </p>
      
      {/* ===== DESKTOP TABLE (hidden on mobile) ===== */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Schedule</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Item</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Base Food</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Delivery</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Benefits Applied</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Final Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2 text-xs text-gray-700 capitalize align-top whitespace-nowrap">
                  {row.schedule}
                </td>
                <td className="px-3 py-2 text-xs font-medium text-gray-900 align-top">
                  {row.items.map((item, itemIdx) => (
                    <div key={itemIdx}>
                      {item.name}
                      {item.quantity > 1 && (
                        <span className="ml-1 text-gray-400 font-normal">×{item.quantity}</span>
                      )}
                    </div>
                  ))}
                </td>
                <td className="px-3 py-2 text-xs text-gray-500 text-right align-top">
                  {row.items.map((item, itemIdx) => (
                    <div key={itemIdx}>KES {item.totalPrice.toFixed(0)}</div>
                  ))}
                </td>
                <td className="px-3 py-2 text-xs text-gray-500 text-right align-top">
                  KES {row.baseDeliveryFee.toFixed(0)}
                </td>
                <td className="px-3 py-2 text-xs align-top">
                  {row.benefitsApplied.map((benefit, benefitIdx) => (
                    <span
                      key={benefitIdx}
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mr-1 mt-1 ${
                        benefit === 'None'
                          ? 'text-gray-400 italic'
                          : benefit.includes('Free Meal')
                          ? 'bg-green-100 text-green-800'
                          : benefit.includes('Delivery')
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {benefit}
                    </span>
                  ))}
                </td>
                <td className="px-3 py-2 text-xs font-bold text-gray-900 text-right align-top">
                  KES {row.finalTotal.toFixed(0)}
                </td>
              </tr>
            ))}
            
            {/* Raw Totals Row */}
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              <td colSpan="2" className="px-3 py-2 text-xs font-semibold text-gray-600 text-right">
                Raw Totals:
              </td>
              <td className="px-3 py-2 text-xs font-semibold text-gray-600 text-right">
                KES {totals.rawFoodCost.toFixed(0)}
              </td>
              <td className="px-3 py-2 text-xs font-semibold text-gray-600 text-right">
                KES {totals.rawDeliveryFee.toFixed(0)}
              </td>
              <td />
              <td className="px-3 py-2 text-xs font-semibold text-gray-600 text-right">
                KES {totals.rawTotal.toFixed(0)}
              </td>
            </tr>

            {/* Benefit Savings Row (if applicable) */}
            {hasSavings && (
              <tr className="bg-green-50 border-t border-gray-200">
                <td colSpan="2" className="px-3 py-2 text-xs font-medium text-green-700 text-right">
                  Benefit Savings:
                </td>
                <td className="px-3 py-2 text-xs font-medium text-green-700 text-right">
                  - KES {totals.foodSavings.toFixed(0)}
                </td>
                <td className="px-3 py-2 text-xs font-medium text-green-700 text-right">
                  - KES {totals.deliverySavings.toFixed(0)}
                </td>
                <td />
                <td className="px-3 py-2 text-xs font-medium text-green-700 text-right">
                  - KES {totals.totalSavings.toFixed(0)}
                </td>
              </tr>
            )}

            {/* Final Totals Row */}
            <tr className={`${hasSavings ? 'bg-blue-50' : 'bg-gray-50'} border-t-2 border-gray-300`}>
              <td colSpan="2" className="px-3 py-3 text-sm font-bold text-gray-900 text-right">
                Final Totals (Entire Schedule):
              </td>
              <td className="px-3 py-3 text-sm font-bold text-gray-900 text-right">
                KES {totals.finalFoodCost.toFixed(0)}
              </td>
              <td className="px-3 py-3 text-sm font-bold text-gray-900 text-right">
                KES {totals.finalDeliveryFee.toFixed(0)}
              </td>
              <td />
              <td className="px-3 py-3 text-sm font-bold text-blue-800 text-right">
                KES {totals.finalTotal.toFixed(0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== MOBILE CARD LAYOUT (visible only on mobile) ===== */}
      <div className="sm:hidden space-y-3">
        {rows.map((row, idx) => (
          <div key={idx} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Card Header - Schedule date */}
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-700 capitalize">
                📅 {row.schedule}
              </span>
              <span className="text-sm font-bold text-gray-900">
                KES {row.finalTotal.toFixed(0)}
              </span>
            </div>

            {/* Card Body - Items */}
            <div className="px-3 py-2 space-y-1.5">
              {row.items.map((item, itemIdx) => (
                <div key={itemIdx} className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-800 font-medium truncate mr-2">
                    {item.name}
                    {item.quantity > 1 && (
                      <span className="text-gray-400 font-normal ml-1">×{item.quantity}</span>
                    )}
                  </span>
                  <span className="text-gray-500 whitespace-nowrap">KES {item.totalPrice.toFixed(0)}</span>
                </div>
              ))}
            </div>

            {/* Card Footer - Delivery & Benefits */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
              <span className="text-[10px] text-gray-500">
                🚚 KES {row.baseDeliveryFee.toFixed(0)}
              </span>
              <div className="flex flex-wrap justify-end gap-1">
                {row.benefitsApplied.map((benefit, benefitIdx) => (
                  benefit !== 'None' && (
                    <span
                      key={benefitIdx}
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${
                        benefit.includes('Free Meal')
                          ? 'bg-green-100 text-green-800'
                          : benefit.includes('Delivery')
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {benefit}
                    </span>
                  )
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Mobile Summary Cards */}
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          {/* Raw Totals */}
          <div className="bg-gray-50 px-3 py-2 flex justify-between text-[11px]">
            <span className="font-semibold text-gray-600">Raw Totals</span>
            <div className="text-right text-gray-600 font-semibold space-x-3">
              <span>Food: KES {totals.rawFoodCost.toFixed(0)}</span>
              <span>Del: KES {totals.rawDeliveryFee.toFixed(0)}</span>
            </div>
          </div>

          {/* Savings */}
          {hasSavings && (
            <div className="bg-green-50 px-3 py-2 flex justify-between text-[11px] border-t border-gray-200">
              <span className="font-medium text-green-700">Savings</span>
              <span className="font-medium text-green-700">- KES {totals.totalSavings.toFixed(0)}</span>
            </div>
          )}

          {/* Final Total */}
          <div className={`${hasSavings ? 'bg-blue-50' : 'bg-gray-50'} px-3 py-3 flex justify-between border-t-2 border-gray-300`}>
            <span className="text-xs font-bold text-gray-900">Final Total</span>
            <span className="text-sm font-bold text-blue-800">KES {totals.finalTotal.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Benefits Summary */}
      {benefitsApplied && (
        <div className="mt-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h5 className="text-[10px] sm:text-xs font-semibold text-blue-900 mb-1.5 sm:mb-2">Benefits Applied:</h5>
          <div className="text-[10px] sm:text-xs text-blue-800 space-y-0.5 sm:space-y-1">
            {benefitsApplied.maxFreeMeals > 0 && (
              <div>
                • Free Meals: {benefitsApplied.freeMealsUsed} of {benefitsApplied.maxFreeMeals} used
              </div>
            )}
            {benefitsApplied.maxFreeDeliveries !== 0 && (
              <div>
                • Free Deliveries: {benefitsApplied.freeDeliveriesUsed} of{' '}
                {benefitsApplied.maxFreeDeliveries === 'unlimited'
                  ? 'unlimited'
                  : benefitsApplied.maxFreeDeliveries}{' '}
                used
              </div>
            )}
            {benefitsApplied.mealDiscountPercent > 0 && (
              <div>• Meal Discount: {benefitsApplied.mealDiscountPercent}% off food items</div>
            )}
          </div>
        </div>
      )}

      {/* Snapshot Metadata */}
      {snapshot.generatedAt && (
        <div className="mt-2 text-[10px] sm:text-xs text-gray-400 text-right">
          Cost calculated at subscription creation: {new Date(snapshot.generatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
