const COMPLETED_STATUSES = new Set(['delivered', 'completed']);
const TRANSIT_STATUSES = new Set(['in_transit', 'out_for_delivery']);
const PICK_STATION_PROGRESS_STATUSES = new Set([
  'en_route_to_pick_station',
  'at_pick_station',
  'ready_for_pickup',
  'awaiting_delivery_assignment',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'completed'
]);
const WAREHOUSE_REACHED_OR_BEYOND = new Set([
  'at_warehouse',
  'received_at_warehouse',
  'en_route_to_pick_station',
  'at_pick_station',
  'ready_for_pickup',
  'awaiting_delivery_assignment',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'completed'
]);

const isFastFoodOnlyOrder = (order) => {
  const items = order?.OrderItems || order?.orderItems || [];
  if (!items.length) return false;
  return items.every((item) => !!(item?.FastFoodId || item?.FastFood || item?.itemType === 'fastfood'));
};

export const buildOrderLifecycleSteps = (order) => {
  const status = String(order?.status || '').toLowerCase();
  const routing = String(order?.adminRoutingStrategy || '').toLowerCase();
  const deliveryMethod = String(order?.deliveryMethod || '').toLowerCase();
  const deliveryType = String(order?.deliveryType || '').toLowerCase();

  const fastFoodOnly = isFastFoodOnlyOrder(order) || String(order?.orderCategory || '').toLowerCase() === 'fastfood';
  const hasPickStationSignals =
    ['pick_station', 'fastfood_pickup_point'].includes(routing) ||
    ['en_route_to_pick_station', 'at_pick_station', 'ready_for_pickup'].includes(status) ||
    deliveryType.includes('pickup_station') ||
    !!order?.DestinationPickStation ||
    !!order?.pickupStationId ||
    !!order?.destinationPickStationId;

  const directRoute = routing === 'direct_delivery' || deliveryType === 'seller_to_customer';
  const hasWarehouseSignals =
    routing === 'warehouse' ||
    ['en_route_to_warehouse', 'at_warehouse', 'received_at_warehouse'].includes(status) ||
    deliveryType.includes('warehouse') ||
    !!order?.DestinationWarehouse ||
    !!order?.warehouseId;

  const includeWarehouse = hasWarehouseSignals && !directRoute && !(fastFoodOnly && !hasPickStationSignals);
  const includePickStation = hasPickStationSignals;
  const customerDropOff = deliveryMethod === 'home_delivery' || directRoute || status === 'delivered' || status === 'completed';

  const adminConfirmedDone = !!order?.superAdminConfirmed || status !== 'order_placed';
  const sellerConfirmedDone = !!order?.sellerConfirmed || adminConfirmedDone;

  const steps = [
    { label: 'Placed', status: 'order_placed', done: true },
    { label: 'Admin Confirmed', status: 'super_admin_confirmed', done: adminConfirmedDone },
    { label: 'Seller Confirmed', status: 'seller_confirmed', done: sellerConfirmedDone }
  ];

  if (includeWarehouse) {
    steps.push({
      label: 'At Warehouse',
      status: 'at_warehouse',
      done: !!order?.warehouseArrivalDate || WAREHOUSE_REACHED_OR_BEYOND.has(status)
    });
  }

  if (includePickStation) {
    steps.push({
      label: 'To Pick Station',
      status: 'en_route_to_pick_station',
      done: PICK_STATION_PROGRESS_STATUSES.has(status)
    });
    steps.push({
      label: 'At Pick Station',
      status: 'at_pick_station',
      done: ['at_pick_station', 'ready_for_pickup', 'awaiting_delivery_assignment', 'in_transit', 'out_for_delivery', 'delivered', 'completed'].includes(status)
    });
  }

  if (customerDropOff) {
    const transitDone =
      TRANSIT_STATUSES.has(status) ||
      COMPLETED_STATUSES.has(status) ||
      (includePickStation && ['at_pick_station', 'ready_for_pickup', 'awaiting_delivery_assignment'].includes(status));
    steps.push({ label: 'In Transit', status: 'in_transit', done: transitDone });
  } else if (includePickStation) {
    steps.push({
      label: 'Ready for Pickup',
      status: 'ready_for_pickup',
      done: ['ready_for_pickup', 'awaiting_delivery_assignment', 'completed'].includes(status)
    });
  }

  steps.push(
    { label: 'Delivered', status: 'delivered', done: COMPLETED_STATUSES.has(status) },
    { label: 'Complete', status: 'completed', done: status === 'completed' }
  );

  return steps;
};
