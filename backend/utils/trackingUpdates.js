const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return [];
  }
};

const appendOrderTrackingUpdate = async (order, update, options = {}) => {
  if (!order) return;

  const trackingUpdates = parseJsonArray(order.trackingUpdates);
  trackingUpdates.push({
    status: update.status || order.status,
    message: update.message || 'Order movement update',
    timestamp: update.timestamp || new Date().toISOString(),
    location: update.location || null,
    updatedBy: update.updatedBy || null,
    updatedByRole: update.updatedByRole || null,
  });

  await order.update(
    { trackingUpdates: JSON.stringify(trackingUpdates) },
    options.transaction ? { transaction: options.transaction } : undefined
  );
};

module.exports = {
  appendOrderTrackingUpdate,
};
