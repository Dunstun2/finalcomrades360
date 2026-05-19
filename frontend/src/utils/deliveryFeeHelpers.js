/**
 * Calculates the incremental delivery fee for Fast Food orders.
 * The formula applies a 15% increment of the base fee for each additional item beyond the first.
 *
 * @param {number} baseFee - The base delivery fee for the item/vendor.
 * @param {number} itemCount - The total quantity of items from the vendor.
 * @returns {number} The calculated incremental delivery fee.
 */
export const calculateFastFoodSellerIncrementalFee = (baseFee, itemCount) => {
  if (itemCount <= 0) return 0;
  if (itemCount === 1) return baseFee;
  // Logic: Base + (Base * 0.55 * (Qty - 1))
  return baseFee + (baseFee * 0.55 * (itemCount - 1));
};
