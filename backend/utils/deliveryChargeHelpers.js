const SELLER_PAID_ROUTE_TYPES = new Set([
  'seller_to_warehouse',
  'seller_to_pickup_station',
  'warehouse_to_seller',
  'pickup_station_to_seller',
  'customer_to_seller'
]);

const CUSTOMER_PAID_ROUTE_TYPES = new Set([
  'seller_to_customer',
  'warehouse_to_customer',
  'pickup_station_to_customer',
  'warehouse_to_pickup_station',
  'customer_to_pickup_station',
  'customer_to_warehouse',
  'fastfood_pickup_point'
]);

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const calculateSellerMerchandisePayout = (order, orderItems = []) => {
  if (Array.isArray(orderItems) && orderItems.length > 0) {
    return roundMoney(orderItems.reduce((sum, item) => sum + Number(item.total || 0), 0));
  }

  return roundMoney(Math.max(0, Number(order?.total || 0) - Number(order?.deliveryFee || 0)));
};

const getRoutePayer = (order, routeType) => {
  if (SELLER_PAID_ROUTE_TYPES.has(routeType)) {
    return {
      payerType: 'seller',
      payerUserId: order?.sellerId || null,
      fundingSource: 'seller_wallet',
      note: 'Seller-funded first-mile or reverse logistics leg.'
    };
  }

  if (CUSTOMER_PAID_ROUTE_TYPES.has(routeType)) {
    return {
      payerType: 'customer',
      payerUserId: order?.userId || null,
      fundingSource: 'order_delivery_fee',
      note: 'Customer-funded downstream delivery leg.'
    };
  }

  return {
    payerType: 'platform',
    payerUserId: null,
    fundingSource: 'platform',
    note: 'Platform-funded internal or fallback logistics leg.'
  };
};

const upsertDeliveryChargeForTask = async ({
  DeliveryCharge,
  transaction,
  order,
  task,
  deliveryFee,
  agentSharePercent,
  deliveryType,
  deliveryAgentId
}) => {
  const existingCharge = await DeliveryCharge.findOne({
    where: { deliveryTaskId: task.id },
    transaction
  });

  const grossAmount = roundMoney(deliveryFee);
  const sharePercent = roundMoney(agentSharePercent);
  let agentAmount = 0;
  let platformAmount = 0;
  // Patch: For fastfood pickup point, use order.deliveryFee as grossAmount
  if ((order.adminRoutingStrategy === 'fastfood_pickup_point' || order.routingStrategy === 'fastfood_pickup_point') && Number(order.deliveryFee) > 0) {
    agentAmount = roundMoney(Number(order.deliveryFee) * (sharePercent / 100));
    platformAmount = roundMoney(Number(order.deliveryFee) - agentAmount);
  } else {
    agentAmount = roundMoney(grossAmount * (sharePercent / 100));
    platformAmount = roundMoney(grossAmount - agentAmount);
  }
  const sellerMerchandisePayout = calculateSellerMerchandisePayout(order, order?.OrderItems);
  const routeFunding = getRoutePayer(order, deliveryType);
  const isCustomerChargeCaptured = routeFunding.payerType === 'customer' && !!order?.paymentConfirmed;
  const existingCharged = roundMoney(existingCharge?.chargedAmount || 0);
  const chargedAmount = roundMoney(isCustomerChargeCaptured ? grossAmount : Math.min(existingCharged, grossAmount));
  const outstandingAmount = roundMoney(Math.max(0, grossAmount - chargedAmount));

  const payload = {
    orderId: order.id,
    deliveryTaskId: task.id,
    routeType: deliveryType,
    payerType: routeFunding.payerType,
    payerUserId: routeFunding.payerUserId,
    payeeUserId: deliveryAgentId || task.deliveryAgentId || null,
    grossAmount,
    chargedAmount,
    outstandingAmount,
    agentSharePercent: sharePercent,
    agentAmount,
    platformAmount,
    sellerMerchandisePayout,
    fundingSource: routeFunding.fundingSource,
    fundingStatus: isCustomerChargeCaptured ? 'charged' : (outstandingAmount <= 0 ? 'charged' : 'quoted'),
    quotedAt: new Date(),
    invoicedAt: routeFunding.payerType === 'seller' ? new Date() : existingCharge?.invoicedAt || null,
    chargedAt: isCustomerChargeCaptured ? new Date() : null,
    note: routeFunding.note
  };

  if (existingCharge) {
    await existingCharge.update(payload, { transaction });
    return existingCharge;
  }

  return DeliveryCharge.create(payload, { transaction });
};

const invoiceSellerChargeImmediately = async ({
  DeliveryCharge,
  Wallet,
  Transaction,
  transaction,
  task,
  order
}) => {
  const charge = await DeliveryCharge.findOne({
    where: { deliveryTaskId: task.id },
    transaction
  });

  if (!charge || charge.payerType !== 'seller' || !charge.payerUserId) {
    return charge;
  }

  const outstanding = roundMoney(charge.outstandingAmount || 0);
  if (outstanding <= 0) return charge;

  let sellerWallet = await Wallet.findOne({ where: { userId: charge.payerUserId }, transaction });
  if (!sellerWallet) {
    sellerWallet = await Wallet.create({ userId: charge.payerUserId, balance: 0, pendingBalance: 0, successBalance: 0 }, { transaction });
  }

  const walletBalance = roundMoney(sellerWallet.balance || 0);
  const amountToDebit = roundMoney(Math.min(walletBalance, outstanding));

  if (amountToDebit > 0) {
    await sellerWallet.update({
      balance: roundMoney(walletBalance - amountToDebit)
    }, { transaction });

    await Transaction.create({
      userId: charge.payerUserId,
      amount: amountToDebit,
      type: 'debit',
      status: 'completed',
      description: `Delivery Invoice (${task.deliveryType}) for Order #${order.orderNumber}`,
      orderId: order.id
    }, { transaction });
  }

  const chargedAmount = roundMoney((charge.chargedAmount || 0) + amountToDebit);
  const updatedOutstanding = roundMoney(Math.max(0, charge.grossAmount - chargedAmount));

  await charge.update({
    chargedAmount,
    outstandingAmount: updatedOutstanding,
    fundingStatus: updatedOutstanding <= 0 ? 'charged' : 'quoted',
    invoicedAt: charge.invoicedAt || new Date(),
    chargedAt: amountToDebit > 0 ? new Date() : charge.chargedAt,
    note: updatedOutstanding > 0
      ? `Seller invoice partially funded from wallet. Outstanding ${updatedOutstanding}.`
      : 'Seller invoice fully funded from wallet.'
  }, { transaction });

  return charge;
};

const settleDeliveryChargeForTask = async ({ DeliveryCharge, transaction, taskId, markCharged = false }) => {
  const charge = await DeliveryCharge.findOne({
    where: { deliveryTaskId: taskId },
    transaction
  });

  if (!charge) return null;
  if (charge.fundingStatus === 'settled') return charge;

  await charge.update({
    fundingStatus: 'settled',
    chargedAt: markCharged && !charge.chargedAt ? new Date() : charge.chargedAt,
    settledAt: new Date()
  }, { transaction });

  return charge;
};

module.exports = {
  SELLER_PAID_ROUTE_TYPES,
  CUSTOMER_PAID_ROUTE_TYPES,
  calculateSellerMerchandisePayout,
  getRoutePayer,
  upsertDeliveryChargeForTask,
  invoiceSellerChargeImmediately,
  settleDeliveryChargeForTask
};