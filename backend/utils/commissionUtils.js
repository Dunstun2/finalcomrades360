/**
 * Utility for calculating marketing commissions based on business rules.
 */

/**
 * Calculates the total commission for a given quantity of an item.
 * 
 * @param {Object} itemDetails - Product or FastFood model instance/object
 * @param {Number} price - The effective selling price per unit
 * @param {Number} quantity - Number of items
 * @returns {Number} Total commission amount
 */
const calculateItemCommission = (itemDetails, price, quantity) => {
    if (!itemDetails) {
        return 0;
    }

    // Only calculate commission if marketing is enabled for this item
    if (!itemDetails.marketingEnabled) {
        return 0;
    }

    const parsedPrice = Number(price || 0);
    const parsedQuantity = Number(quantity || 0);
    const commission = Number(itemDetails.marketingCommission || 0);

    // Use the absolute per-unit commission stored in the DB (set by admin)
    const totalCommissionAmount = commission * parsedQuantity;

    console.log(`[commissionUtils] Calculated: ${commission} * ${parsedQuantity} = ${totalCommissionAmount}`);

    return totalCommissionAmount;
};

module.exports = {
    calculateItemCommission
};
