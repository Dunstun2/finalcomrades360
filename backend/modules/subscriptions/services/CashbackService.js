const { Subscription, Order, OrderItem } = require('../../../database/models.registry');
const BenefitService = require('./BenefitService');
const UsageService = require('./UsageService');
const BillingService = require('./BillingService');
const { Op } = require('sequelize');

class CashbackService {
  /**
   * Process cashback for a completed/delivered order
   * @param {number} orderId - The order ID
   * @returns {Promise<Object>} - { applied: boolean, cashbackAmount: number, message: string }
   */
  async processCashbackForOrder(orderId) {
    try {
      const order = await Order.findByPk(orderId, {
        include: [
          { model: OrderItem, as: 'OrderItems' }
        ]
      });

      if (!order) {
        return { applied: false, cashbackAmount: 0, message: 'Order not found' };
      }

      // Only process cashback for delivered or completed orders
      if (!['delivered', 'completed'].includes(order.status)) {
        return { applied: false, cashbackAmount: 0, message: 'Order not yet delivered or completed' };
      }

      // Only process if order hasn't been cashbacked before
      if (order.cashbackProcessed) {
        return { applied: false, cashbackAmount: 0, message: 'Cashback already processed for this order' };
      }

      // Check if user has an active subscription
      const subscription = await Subscription.findOne({
        where: {
          userId: order.userId,
          status: { [Op.in]: ['Active', 'Trial', 'Grace'] }
        }
      });

      if (!subscription) {
        // Mark as processed even if no subscription (to avoid reprocessing)
        await order.update({ cashbackProcessed: true });
        return { applied: false, cashbackAmount: 0, message: 'No active subscription found' };
      }

      // Get cashback benefit
      const cashbackBenefit = await BenefitService.getActiveBenefit(subscription, 'cashback_orders');

      if (!cashbackBenefit) {
        await order.update({ cashbackProcessed: true });
        return { applied: false, cashbackAmount: 0, message: 'No cashback benefit found' };
      }

      // Check if usage limit is reached
      const remainingUsage = await UsageService.getRemaining(subscription.id, 'cashback_orders');
      if (remainingUsage <= 0) {
        await order.update({ cashbackProcessed: true });
        return { applied: false, cashbackAmount: 0, message: 'Cashback usage limit reached' };
      }

      // Get benefit configuration
      const cashbackPercent = parseFloat(cashbackBenefit.value?.cashbackPercent || cashbackBenefit.value?.discountPercent || cashbackBenefit.value?.amount || 0);
      const minOrderValue = parseFloat(cashbackBenefit.value?.conditions?.minOrderValue || cashbackBenefit.value?.minOrderValue || 0);
      const maxCashbackAmount = parseFloat(cashbackBenefit.value?.maxCashbackAmount || 0);

      if (cashbackPercent <= 0) {
        await order.update({ cashbackProcessed: true });
        return { applied: false, cashbackAmount: 0, message: 'Invalid cashback percentage' };
      }

      // Calculate order subtotal (excluding delivery fee)
      const orderSubtotal = parseFloat(order.total || 0) - parseFloat(order.deliveryFee || 0);

      // Check minimum order value requirement
      if (orderSubtotal < minOrderValue) {
        await order.update({ cashbackProcessed: true });
        return { 
          applied: false, 
          cashbackAmount: 0, 
          message: `Order total (${orderSubtotal.toFixed(2)} KES) is below minimum requirement (${minOrderValue} KES)` 
        };
      }

      // Calculate cashback amount
      let cashbackAmount = (orderSubtotal * cashbackPercent) / 100;

      // Apply maximum cashback limit if specified
      if (maxCashbackAmount > 0 && cashbackAmount > maxCashbackAmount) {
        cashbackAmount = maxCashbackAmount;
      }

      // Round to 2 decimal places
      cashbackAmount = parseFloat(cashbackAmount.toFixed(2));

      if (cashbackAmount <= 0) {
        await order.update({ cashbackProcessed: true });
        return { applied: false, cashbackAmount: 0, message: 'Calculated cashback is zero' };
      }

      // Credit wallet with cashback
      await BillingService.creditWallet(
        order.userId,
        cashbackAmount,
        `Cashback from order ${order.orderNumber} (${cashbackPercent}% of ${orderSubtotal.toFixed(2)} KES)`,
        null // transaction will be handled by creditWallet
      );

      // Track usage (increment by 1 for each cashback applied)
      await UsageService.trackUsage(subscription.id, 'cashback_orders', 1);

      // Mark order as cashback processed
      await order.update({ 
        cashbackProcessed: true,
        cashbackAmount: cashbackAmount
      });

      console.log(`[CashbackService] Applied ${cashbackAmount} KES cashback to user ${order.userId} for order ${order.orderNumber}`);

      return { 
        applied: true, 
        cashbackAmount, 
        message: `Cashback of ${cashbackAmount} KES credited successfully` 
      };

    } catch (error) {
      console.error('[CashbackService] Error processing cashback:', error);
      return { 
        applied: false, 
        cashbackAmount: 0, 
        message: `Error: ${error.message}` 
      };
    }
  }

  /**
   * Bulk process cashback for multiple orders
   * @param {Array<number>} orderIds - Array of order IDs
   * @returns {Promise<Array>} - Array of results
   */
  async processBulkCashback(orderIds) {
    const results = [];
    
    for (const orderId of orderIds) {
      const result = await this.processCashbackForOrder(orderId);
      results.push({ orderId, ...result });
    }

    return results;
  }

  /**
   * Get cashback summary for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} - Cashback statistics
   */
  async getCashbackSummary(userId) {
    try {
      const orders = await Order.findAll({
        where: {
          userId,
          cashbackProcessed: true,
          cashbackAmount: { [Op.gt]: 0 }
        },
        attributes: ['id', 'orderNumber', 'cashbackAmount', 'createdAt'],
        order: [['createdAt', 'DESC']]
      });

      const totalCashback = orders.reduce((sum, order) => sum + parseFloat(order.cashbackAmount || 0), 0);
      const totalOrders = orders.length;

      return {
        totalCashback: parseFloat(totalCashback.toFixed(2)),
        totalOrders,
        orders: orders.map(o => ({
          orderId: o.id,
          orderNumber: o.orderNumber,
          cashbackAmount: parseFloat(o.cashbackAmount || 0),
          date: o.createdAt
        }))
      };
    } catch (error) {
      console.error('[CashbackService] Error getting cashback summary:', error);
      return { totalCashback: 0, totalOrders: 0, orders: [] };
    }
  }
}

module.exports = new CashbackService();
