// Shared delivery route type labels and colors
export const DELIVERY_TYPE_CONFIG = {
    'warehouse_to_customer': {
        label: 'Warehouse → Customer',
        color: 'blue',
        description: 'Standard delivery from warehouse'
    },
    'customer_to_warehouse': {
        label: 'Customer → Warehouse',
        color: 'orange',
        description: 'Returns and exchanges'
    },
    'seller_to_customer': {
        label: 'Seller → Customer',
        color: 'green',
        description: 'Direct seller delivery'
    },
    'seller_to_warehouse': {
        label: 'Seller → Warehouse',
        color: 'purple',
        description: 'Seller inventory drop-off'
    },
    'warehouse_to_seller': {
        label: 'Warehouse → Seller',
        color: 'orange',
        description: 'Returns to seller from hub',
        defaultPayer: 'seller'
    },
    'customer_to_seller': {
        label: 'Customer → Seller',
        color: 'red',
        description: 'Direct return to seller',
        defaultPayer: 'seller'
    },
    'pickup_station_to_warehouse': {
        label: 'Station → Warehouse',
        color: 'purple',
        description: 'Moving returned items from pickstation to warehouse'
    },
    'pickup_station_to_seller': {
        label: 'Station → Seller',
        color: 'red',
        description: 'Direct return from pickstation to seller'
    },
    'warehouse_to_pickup_station': {
        label: 'Warehouse → Station',
        color: 'blue',
        description: 'Moving sorted items to pickup station'
    },
    'seller_to_pickup_station': {
        label: 'Seller → Station',
        color: 'purple',
        description: 'Direct drop-off at local pickup station'
    },
    'pickup_station_to_customer': {
        label: 'Station → Customer',
        color: 'green',
        description: 'Last-mile delivery from pickup station to home'
    },
    'fastfood_pickup_point': {
        label: 'Seller → Pickup Point',
        color: 'purple',
        description: 'Direct drop-off at fastfood pickup point'
    }
};

// Delivery task status configuration
export const TASK_STATUS_CONFIG = {
    'requested': {
        label: 'Request Sent',
        color: 'bg-orange-100 text-orange-800',
        icon: '🤚'
    },
    'assigned': {
        label: 'Assigned',
        color: 'bg-yellow-100 text-yellow-800',
        icon: '📋'
    },
    'accepted': {
        label: 'Accepted',
        color: 'bg-blue-100 text-blue-800',
        icon: '✅'
    },
    'arrived_at_pickup': {
        label: 'Arrived at Pickup',
        color: 'bg-indigo-100 text-indigo-800',
        icon: '📍'
    },
    'rejected': {
        label: 'Rejected',
        color: 'bg-red-100 text-red-800',
        icon: '❌'
    },
    'in_progress': {
        label: 'In Progress',
        color: 'bg-green-100 text-green-800',
        icon: '🚚'
    },
    'completed': {
        label: 'Dropped Off',
        color: 'bg-green-600 text-white',
        icon: '📦'
    },
    'failed': {
        label: 'Failed',
        color: 'bg-red-600 text-white',
        icon: '⚠️'
    },
    'cancelled': {
        label: 'Cancelled',
        color: 'bg-gray-400 text-white',
        icon: '🚫'
    }
};

/**
 * DeliveryTaskBadge - Display delivery task status
 */
export const DeliveryTaskBadge = ({ task }) => {
    if (!task) {
        return <span className="text-xs text-gray-400 italic">No task</span>;
    }

    const config = TASK_STATUS_CONFIG[task.status] || {
        label: task.status,
        color: 'bg-gray-100 text-gray-800',
        icon: '❓'
    };

    return (
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${config.color}`}>
            <span className="mr-1">{config.icon}</span>
            {config.label}
        </span>
    );
};

/**
 * DeliveryTypeBadge - Display delivery type
 */
export const DeliveryTypeBadge = ({ deliveryType }) => {
    if (!deliveryType) {
        return (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500">
                No Route Set
            </span>
        );
    }

    const config = DELIVERY_TYPE_CONFIG[deliveryType];

    if (!config) {
        return (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                Unknown: {deliveryType}
            </span>
        );
    }

    const colorClasses = {
        blue: 'bg-blue-100 text-blue-800',
        orange: 'bg-orange-100 text-orange-800',
        green: 'bg-green-100 text-green-800',
        purple: 'bg-purple-100 text-purple-800'
    };

    return (
        <span
            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${colorClasses[config.color]}`}
            title={config.description}
        >
            {config.label}
        </span>
    );
};

/**
 * DeliveryTaskDetails - Show detailed task information
 */
export const DeliveryTaskDetails = ({ task, order }) => {
    if (!task) return null;

    const config = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.assigned;
    const deliveryConfig = DELIVERY_TYPE_CONFIG[task.deliveryType] || DELIVERY_TYPE_CONFIG['warehouse_to_customer'];

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-700">Delivery Task</h4>
                <DeliveryTaskBadge task={task} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                    <span className="text-gray-500">Type:</span>
                    <div className="mt-1">
                        <DeliveryTypeBadge deliveryType={task.deliveryType} />
                    </div>
                </div>

                {task.deliveryAgent && (
                    <div>
                        <span className="text-gray-500">Agent:</span>
                        <div className="font-medium text-gray-900 mt-1">{task.deliveryAgent.name}</div>
                    </div>
                )}

                {task.pickupLocation && (
                    <div className="col-span-2">
                        <span className="text-gray-500 font-medium">Pickup Point:</span>
                        <div className="text-gray-800 mt-1 bg-white p-2 rounded border border-gray-100 shadow-sm transition-hover hover:border-blue-200">
                            <div className="font-semibold">{task.pickupLocation}</div>
                            {/* Enhanced Pickup Details */}
                            {order?.seller && (task.deliveryType === 'seller_to_customer' || task.deliveryType === 'seller_to_warehouse') && (
                                <div className="mt-1 space-y-1">
                                    {(order.seller.businessLandmark || order.seller.landmark) && (
                                        <div className="text-[10px] text-blue-600 flex items-center gap-1">
                                            <span className="text-xs">📍</span> Landmark: {order.seller.businessLandmark || order.seller.landmark}
                                        </div>
                                    )}
                                    {(order.seller.businessPhone || order.seller.phone) && (
                                        <div className="text-[10px] text-green-600 flex items-center gap-1">
                                            <span className="text-xs">📞</span> Contact: {order.seller.businessPhone || order.seller.phone}
                                        </div>
                                    )}
                                </div>
                            )}
                            {order?.warehouse && task.deliveryType === 'warehouse_to_customer' && (
                                <div className="mt-1 space-y-1">
                                    {order.warehouse.landmark && (
                                        <div className="text-[10px] text-blue-600 flex items-center gap-1">
                                            <span className="text-xs">📍</span> Landmark: {order.warehouse.landmark}
                                        </div>
                                    )}
                                    {order.warehouse.contactPhone && (
                                        <div className="text-[10px] text-green-600 flex items-center gap-1">
                                            <span className="text-xs">📞</span> Contact: {order.warehouse.contactPhone}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {task.deliveryLocation && (
                    <div className="col-span-2">
                        <span className="text-gray-500 font-medium">Delivery Destination:</span>
                        <div className="text-gray-800 mt-1 bg-white p-2 rounded border border-gray-100 shadow-sm transition-hover hover:border-green-200">
                            <div className="font-semibold">
                                {task.deliveryType === 'seller_to_warehouse' ? 'Warehouse Hub' : task.deliveryLocation}
                            </div>

                            {/* Privacy & Enhanced Delivery Details */}
                            {task.deliveryType === 'seller_to_warehouse' && order?.warehouse ? (
                                <div className="mt-1 space-y-1">
                                    <div className="text-xs font-bold text-purple-700">{order.warehouse.name}</div>
                                    {order.warehouse.landmark && (
                                        <div className="text-[10px] text-blue-600 flex items-center gap-1">
                                            <span className="text-xs">📍</span> Landmark: {order.warehouse.landmark}
                                        </div>
                                    )}
                                    {order.warehouse.contactPhone && (
                                        <div className="text-[10px] text-green-600 flex items-center gap-1">
                                            <span className="text-xs">📞</span> Contact: {order.warehouse.contactPhone}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                !['seller_to_warehouse'].includes(task.deliveryType) && (
                                    <div className="mt-1 space-y-1">
                                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Recipient Details</div>
                                        <div className="text-xs text-gray-800 font-medium">{order?.user?.name || 'Customer'}</div>
                                        {order?.user?.phone && (
                                            <div className="text-[10px] text-green-600 flex items-center gap-1">
                                                <span className="text-xs">📞</span> {order.user.phone}
                                            </div>
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}

                {task.agentNotes && (
                    <div className="col-span-2">
                        <span className="text-gray-500">Agent Notes:</span>
                        <div className="text-gray-800 mt-1 italic">{task.agentNotes}</div>
                    </div>
                )}

                {task.rejectionReason && (
                    <div className="col-span-2">
                        <span className="text-red-600 font-medium">Rejection Reason:</span>
                        <div className="text-red-800 mt-1">{task.rejectionReason}</div>
                    </div>
                )}
            </div>

            {task.status === 'completed' && task.completedAt && (
                <div className="text-xs text-green-600 font-medium pt-2 border-t">
                    ✓ Dropped off on {new Date(task.completedAt).toLocaleString()}
                </div>
            )}
        </div>
    );
};

/**
 * Get the first delivery task for an order (most orders have one task)
 */
export const getOrderDeliveryTask = (order) => {
    if (!order) return null;
    const tasks = order.deliveryTasks || order.DeliveryTasks;
    if (Array.isArray(tasks) && tasks.length > 0) {
        // Sort by ID descending to get the LATEST task first
        return [...tasks].sort((a, b) => (b.id || 0) - (a.id || 0))[0];
    }
    return null;
};
