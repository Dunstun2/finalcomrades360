import React from 'react';
import {
    FaTruck,
    FaMapMarkedAlt,
    FaClipboardCheck,
    FaClock,
    FaCheckCircle,
    FaExclamationCircle,
    FaStore,
    FaWarehouse,
    FaUser,
    FaArrowRight,
    FaArrowDown,
    FaMotorcycle
} from 'react-icons/fa';
import { resolveImageUrl } from '../../utils/imageUtils';
import { formatPrice } from '../../utils/currency';
import api from '../../services/api';

/**
 * DeliveryTaskConsole
 * A unified component to display delivery assignment details.
 * 
 * @param {Object} props
 * @param {Object} props.order - The parent order object
 * @param {Object} props.task - The specific delivery task (optional, defaults to order.deliveryTasks[0])
 * @param {Number} props.agentSharePercent - The agent's current share percentage for earning calculation
 * @param {Boolean} props.isExpanded - Whether to show expanded details
 * @param {Function} props.onToggleExpand - Callback for toggling expansion
 */
const DeliveryTaskConsole = ({
    order,
    task,
    agentSharePercent = 70,
    isExpanded = false,
    onToggleExpand,
    checkbox = null,
    children = null
}) => {
    const activeTask = task || (() => {
        if (!order.deliveryTasks || order.deliveryTasks.length === 0) return null;
        // Defensively sort by createdAt descending to ensure we pick the latest leg
        const sorted = [...order.deliveryTasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return sorted[0];
    })();

    // Task-level deliveryType is the source of truth for the CURRENT LEG.
    // However existing tasks may have a stale/wrong deliveryType (e.g. seller_to_warehouse
    // when the order is actually moving warehouse→customer). So we cross-check with the
    // order's adminRoutingStrategy + status to catch mismatches.
    const derivedDeliveryType = (() => {
        const oStatus = order?.status;
        const routing = order?.adminRoutingStrategy;
        const method = order?.deliveryMethod;

        // Hub-stage statuses: item is at/moving to warehouse. Next leg starts from warehouse.
        const hubStageStatuses = ['en_route_to_warehouse', 'at_warehouse', 'received_at_warehouse', 'awaiting_delivery_assignment', 'processing', 'in_transit'];
        if (hubStageStatuses.includes(oStatus) && routing === 'warehouse') {
            return method === 'pick_station' ? 'warehouse_to_pickup_station' : 'warehouse_to_customer';
        }
        if (hubStageStatuses.includes(oStatus) && routing === 'pick_station') {
            return 'warehouse_to_pickup_station';
        }

        // Seller-dispatch stage
        if (['order_placed', 'seller_confirmed', 'super_admin_confirmed'].includes(oStatus)) {
            if (routing === 'warehouse') return 'seller_to_warehouse';
            if (routing === 'pick_station') return 'seller_to_pickup_station';
            if (routing === 'direct_delivery') return 'seller_to_customer';
        }
        if (oStatus === 'en_route_to_warehouse') {
            // The seller/driver is moving to the warehouse — leg 1
            return 'seller_to_warehouse';
        }

        if (['en_route_to_pick_station', 'at_pick_station', 'ready_for_pickup'].includes(oStatus)) {
            return method === 'home_delivery' ? 'pickup_station_to_customer' : 'warehouse_to_pickup_station';
        }
        if (['out_for_delivery', 'delivered'].includes(oStatus)) {
            return 'seller_to_customer';
        }
        return null; // genuinely unknown
    })();

    // Use the task deliveryType unless it looks stale (e.g. still says seller_to_warehouse
    // but we can tell from order status the item is already past the seller stage).
    const taskType = activeTask?.deliveryType;
    const staleSellerTask = taskType === 'seller_to_warehouse' &&
        ['at_warehouse', 'received_at_warehouse', 'awaiting_delivery_assignment', 'processing', 'in_transit'].includes(order?.status);

    const deliveryType = staleSellerTask
        ? (derivedDeliveryType || taskType)
        : (taskType || derivedDeliveryType || order.deliveryType || 'seller_to_warehouse');
    const status = activeTask ? activeTask.status : order.status;
    const [fetchedOrderItems, setFetchedOrderItems] = React.useState([]);
    const [isFetchingOrderItems, setIsFetchingOrderItems] = React.useState(false);
    // Ref-based guard prevents concurrent fetches without re-triggering the effect
    const isFetchingItemsRef = React.useRef(false);

    const orderItems =
        (Array.isArray(order.OrderItems) && order.OrderItems.length > 0 && order.OrderItems)
        || (Array.isArray(order.orderItems) && order.orderItems.length > 0 && order.orderItems)
        || (Array.isArray(activeTask?.order?.OrderItems) && activeTask.order.OrderItems.length > 0 && activeTask.order.OrderItems)
        || (Array.isArray(activeTask?.order?.orderItems) && activeTask.order.orderItems.length > 0 && activeTask.order.orderItems)
        || (Array.isArray(fetchedOrderItems) && fetchedOrderItems.length > 0 && fetchedOrderItems)
        || [];

    React.useEffect(() => {
        let cancelled = false;

        const loadMissingItems = async () => {
            if (!isExpanded) return;
            if (orderItems.length > 0) return;
            if (!order?.id && !activeTask?.id) return;
            if (isFetchingItemsRef.current) return; // Ref guard: no state change, no effect re-trigger

            try {
                isFetchingItemsRef.current = true;
                setIsFetchingOrderItems(true);
                let items = [];

                // Preferred for delivery agents: task details endpoint includes task.order.OrderItems
                if (activeTask?.id) {
                    const taskRes = await api.get(`/delivery/tasks/${activeTask.id}`);
                    const taskData = taskRes.data || {};
                    const taskOrder = taskData.order || {};
                    items =
                        (Array.isArray(taskOrder.OrderItems) && taskOrder.OrderItems)
                        || (Array.isArray(taskOrder.orderItems) && taskOrder.orderItems)
                        || [];
                }

                // Fallback path for records without a task id
                if (items.length === 0 && order?.id) {
                    const res = await api.get(`/orders/${order.id}`);
                    const details = res.data?.order || res.data || {};
                    items =
                        (Array.isArray(details.OrderItems) && details.OrderItems)
                        || (Array.isArray(details.orderItems) && details.orderItems)
                        || [];
                }

                if (!cancelled) {
                    setFetchedOrderItems(items);
                }
            } catch (e) {
                if (!cancelled) {
                    setFetchedOrderItems([]);
                }
            } finally {
                isFetchingItemsRef.current = false; // Always release the ref guard
                if (!cancelled) {
                    setIsFetchingOrderItems(false);
                }
            }
        };

        loadMissingItems();

        return () => {
            cancelled = true;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isExpanded, order?.id, activeTask?.id, orderItems.length]); // isFetchingOrderItems intentionally excluded — guarded by ref above

    // 1. Unified Status Logic
    const getLegLabel = () => {
        const type = deliveryType;

        // Explicit type always wins
        if (type === 'seller_to_warehouse') return 'Leg 1: Seller → Warehouse';
        if (type === 'seller_to_pickup_station') return 'Leg 1: Seller → Pick Station';
        if (type === 'seller_to_customer') return 'Direct: Seller → Customer';
        if (type === 'warehouse_to_customer') return 'Leg 2: Warehouse → Customer';
        if (type === 'warehouse_to_pickup_station') return 'Leg 2: Warehouse → Pick Station';
        if (type === 'pickup_station_to_customer') return 'Leg 3: Pick Station → Customer';

        return type.replace(/_/g, ' ').toUpperCase();
    };

    const legLabel = getLegLabel();

    const getStatusInfo = (s) => {
        switch (s) {
            case 'requested':
                return { label: 'Request Pending', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <FaClock /> };
            case 'assigned':
                return { label: 'Assigned', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <FaClipboardCheck /> };
            case 'accepted':
                return { label: 'Accepted', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: <FaTruck /> };
            case 'processing':
                return { label: 'Step 1: Processing', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <FaClipboardCheck /> };
            case 'en_route_to_warehouse':
                return { label: 'Moving to Warehouse', color: 'bg-indigo-600 text-white border-indigo-700', icon: <FaTruck className="animate-pulse" /> };
            case 'at_warehouse':
                return { label: 'Arrived at Warehouse', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: <FaWarehouse /> };
            case 'ready_for_pickup':
                return { label: 'Ready for Pickup', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <FaClock /> };
            case 'failed':
                return { label: 'Failed Delivery', color: 'bg-red-100 text-red-700 border-red-200', icon: <FaExclamationCircle /> };
            default:
                return { label: (s || 'Unknown').replace(/_/g, ' ').toUpperCase(), color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <FaClipboardCheck /> };
        }
    };

    const statusInfo = getStatusInfo(status);

    // 2. Address Determination Logic
    const pickupDisplay = (() => {
        if (deliveryType.startsWith('warehouse')) return order.Warehouse?.name || 'Warehouse Hub';
        if (deliveryType.startsWith('pickup_station')) return order.PickupStation?.name || 'Pickup Station';
        return order.seller?.businessName || order.seller?.name || 'Seller';
    })();

    const pickupAddress = (() => {
        const taskLoc = activeTask?.pickupLocation;
        if (taskLoc && !['Seller Address', 'Warehouse', 'Station', 'Seller'].includes(taskLoc)) return taskLoc;

        if (deliveryType.startsWith('warehouse')) {
            const wh = order.Warehouse;
            if (!wh) return 'Warehouse Address';
            return [wh.address, wh.landmark ? `(Near ${wh.landmark})` : null].filter(Boolean).join(', ');
        }
        if (deliveryType.startsWith('pickup_station')) {
            const ps = order.PickupStation;
            if (!ps) return 'Pickup Station Address';
            return [ps.location || ps.address].filter(Boolean).join(', ');
        }
        
        // Comprehensive Seller Address
        const s = order.seller;
        if (!s) return 'Seller Address';
        return [
            s.businessAddress || s.address,
            s.businessLandmark ? `(Near ${s.businessLandmark})` : null,
            s.businessTown,
            s.businessCounty
        ].filter(Boolean).join(', ') || 'Seller Address';
    })();

    const destinationDisplay = (() => {
        if (deliveryType.endsWith('warehouse')) return order.DestinationWarehouse?.name || order.Warehouse?.name || 'Target Warehouse';
        if (deliveryType.endsWith('pickup_station')) return order.DestinationPickStation?.name || order.PickupStation?.name || 'Target Station';
        return order.user?.name || 'Customer';
    })();

    const destinationAddress = (() => {
        const taskLoc = activeTask?.deliveryLocation;
        if (taskLoc && !['Determining automatically...', 'Multiple Destinations', 'Customer Address'].includes(taskLoc)) return taskLoc;

        if (deliveryType.endsWith('warehouse')) {
            const wh = order.DestinationWarehouse || order.Warehouse;
            if (!wh) return 'Warehouse Hub';
            return [wh.address, wh.landmark ? `(Near ${wh.landmark})` : null].filter(Boolean).join(', ');
        }
        if (deliveryType.endsWith('pickup_station')) {
            const ps = order.DestinationPickStation || order.PickupStation;
            if (!ps) return 'Pickup Point';
            return [ps.location || ps.address].filter(Boolean).join(', ');
        }
        return order.deliveryAddress || 'Customer Address';
    })();

    const pickupPhone = (() => {
        if (deliveryType.startsWith('warehouse')) return order.Warehouse?.contactPhone;
        if (deliveryType.startsWith('pickup_station')) return order.PickupStation?.contactPhone;
        return order.seller?.businessPhone || order.seller?.phone;
    })();

    const destinationPhone = (() => {
        if (deliveryType.endsWith('warehouse')) return order.DestinationWarehouse?.contactPhone || order.Warehouse?.contactPhone;
        if (deliveryType.endsWith('pickup_station')) return order.DestinationPickStation?.contactPhone || order.PickupStation?.contactPhone;
        return order.user?.phone;
    })();

    const isTransitional = !deliveryType.endsWith('customer');
    const isFinalCustomerLeg = deliveryType.endsWith('_to_customer');

    // 3. Financial Helpers
    const getOrderItemImage = (item) => {
        const parseMediaList = (value) => {
            if (Array.isArray(value)) return value;
            if (typeof value !== 'string' || !value.trim()) return [];
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [];
            } catch (_) {
                return [];
            }
        };

        const p = item.Product || item.product || item.ProductProfile;
        const f = item.FastFood || item.fastFood || item.FastFoodProfile;
        const s = item.Service || item.service || item.ServiceProfile;
        const fromItem = item.image || item.imageUrl || item.thumbnail || item.coverImage;

        if (fromItem) return fromItem;

        if (f) {
            const ffGallery = parseMediaList(f.galleryImages || f.images);
            return f.coverImage || f.mainImage || ffGallery[0] || null;
        }

        if (p) {
            const productImages = parseMediaList(p.images);
            const productGallery = parseMediaList(p.galleryImages);
            return (
                p.coverImage ||
                p.mainImage ||
                (typeof productImages[0] === 'string' ? productImages[0] : productImages[0]?.url) ||
                (typeof productGallery[0] === 'string' ? productGallery[0] : productGallery[0]?.url) ||
                null
            );
        }

        if (s) {
            const serviceGallery = parseMediaList(s.galleryImages || s.images);
            return s.coverImage || s.mainImage || serviceGallery[0] || null;
        }
        
        return null;
    };

    const computeTotals = () => {
        const items = orderItems;
        const itemsTotal = items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);

        // DB-first: route fee/earnings must come from persisted task/order values, not frontend recomputation.
        const taskDeliveryFee = Number(activeTask?.deliveryFee);
        const orderDeliveryFee = Number(order.deliveryFee);
        const deliveryTotal = Number.isFinite(taskDeliveryFee) && taskDeliveryFee > 0
            ? taskDeliveryFee
            : (Number.isFinite(orderDeliveryFee) ? orderDeliveryFee : 0);

        const taskAgentEarnings = Number(activeTask?.agentEarnings);
        const taskAgentShare = Number(activeTask?.agentShare);
        const fallbackShare = Number.isFinite(taskAgentShare) && taskAgentShare > 0 ? taskAgentShare : 70;
        const fallbackEarnings = deliveryTotal * (fallbackShare / 100);
        const agentEarnings = Number.isFinite(taskAgentEarnings) && taskAgentEarnings > 0
            ? taskAgentEarnings
            : fallbackEarnings;

        const orderTotal = Number(order.total) || (itemsTotal + deliveryTotal);

        return { itemsTotal, deliveryTotal, agentEarnings, orderTotal };
    };

    const totals = computeTotals();

    return (
        <div className={`delivery-console-card bg-white rounded-xl sm:rounded-2xl shadow-sm border transition-all duration-300 ${isExpanded ? 'ring-2 ring-blue-500 border-transparent shadow-xl' : 'hover:border-blue-300'}`}>
            {/* Header Section */}
            <div
                onClick={onToggleExpand}
                className="p-3 sm:p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4"
            >
                <div className="flex items-start gap-4">
                    {checkbox && (
                        <div className="pt-1 pr-2" onClick={(e) => e.stopPropagation()}>
                            {checkbox}
                        </div>
                    )}
                    <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-inner ${statusInfo.color.split(' ')[0]} bg-opacity-10 flex items-center justify-center text-lg sm:text-xl`}>
                        {React.cloneElement(statusInfo.icon, { className: statusInfo.color.includes('text-white') ? 'text-white' : statusInfo.color.split(' ')[1] })}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">{order.orderNumber}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border ${statusInfo.color}`}>
                                {statusInfo.label}
                            </span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-400 font-medium">
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded mr-1.5 uppercase tracking-tighter text-[8px] sm:text-[9px] font-bold">
                                {legLabel}
                            </span>
                            • {orderItems.length || 0} items
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                    <div className="text-right flex items-center gap-3 sm:block">
                        <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5 sm:mb-0">Earnings</p>
                        <p className="text-base sm:text-xl font-black text-green-600">{formatPrice(totals.agentEarnings)}</p>
                    </div>
                    <div className="bg-gray-50 p-1.5 sm:p-2 rounded-full text-gray-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                        {isExpanded ? <FaArrowRight className="-rotate-90 transition-transform" /> : <FaArrowRight className="h-3 w-3 sm:h-auto sm:w-auto" />}
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-5 pb-6 border-t border-gray-100 bg-gray-50/30 animate-in slide-in-from-top-2 duration-300">
                    <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* Route Timeline */}
                        <div className="lg:col-span-12">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Delivery Route Leg</h4>
                            <div className="relative flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-0">

                                {/* Start: Pickup */}
                                <div className="flex-1 bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm relative z-10 transition-transform transform hover:scale-[1.01]">
                                    <div className="flex items-start gap-2 sm:gap-3">
                                        <div className="p-1.5 sm:p-2 bg-orange-50 text-orange-500 rounded-lg text-xs sm:text-sm">
                                            {deliveryType.startsWith('warehouse') ? <FaWarehouse /> : <FaStore />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[9px] font-bold text-orange-400 uppercase tracking-wider mb-0.5">Pickup From</p>
                                            <p className="text-xs sm:text-sm font-black text-gray-800">{pickupDisplay}</p>
                                            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{pickupAddress}</p>
                                            {pickupPhone && (
                                                <p className="text-[10px] sm:text-xs text-blue-600 font-bold mt-1.5 flex items-center gap-1.5">
                                                    📞 {pickupPhone}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Connector */}
                                <div className="hidden md:flex flex-col items-center px-4">
                                    <div className="w-12 h-[2px] bg-gradient-to-r from-orange-200 to-green-200"></div>
                                    <FaArrowRight className="text-gray-200 text-xs mt-[-7px]" />
                                </div>
                                <div className="flex md:hidden justify-center py-1">
                                    <FaArrowDown className="text-gray-200" />
                                </div>

                                {/* End: Destination */}
                                <div className="flex-1 bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm relative z-10 transition-transform transform hover:scale-[1.01]">
                                    <div className="flex items-start gap-2 sm:gap-3">
                                        <div className={`p-1.5 sm:p-2 rounded-lg text-xs sm:text-sm ${isTransitional ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-500'}`}>
                                            {deliveryType.endsWith('warehouse') ? <FaWarehouse /> : deliveryType.endsWith('pickup_station') ? <FaStore /> : <FaUser />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${isTransitional ? 'text-blue-400' : 'text-green-500'}`}>
                                                Deliver To {isTransitional ? '(Final Mile)' : '(Customer)'}
                                            </p>
                                            <p className="text-xs sm:text-sm font-black text-gray-800">{destinationDisplay}</p>
                                            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 italic">{destinationAddress}</p>
                                            {destinationPhone && (
                                                <p className="text-[10px] sm:text-xs text-blue-600 font-bold mt-1.5 flex items-center gap-1.5">
                                                    📞 {destinationPhone}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Final Destination Highlight (for transitional legs) */}
                            {isTransitional && order.deliveryAddress && (
                                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-500">
                                            <FaMapMarkedAlt />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Final Customer Destination</p>
                                            <p className="text-xs font-medium text-gray-700">{order.deliveryAddress}</p>
                                        </div>
                                    </div>
                                    <span className="hidden sm:block text-[9px] font-black bg-blue-600 text-white px-2 py-1 rounded-full uppercase tracking-tighter shadow-sm">
                                        End Goal
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Order Details & Earnings Section */}
                        <div className="lg:col-span-12 mt-4">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Order Details & Earnings</h4>

                            {isFinalCustomerLeg && (
                                <div className="mb-3 p-3 rounded-xl border border-blue-100 bg-blue-50 text-xs text-blue-700 font-semibold">
                                    Final-customer route: earnings are calculated from the order delivery fee, not per-item delivery fees.
                                </div>
                            )}

                            <div className="space-y-3">
                                {orderItems.map((item, idx) => {
                                    const rawItemFee = Number(item.deliveryFee) || 0;
                                    const itemDeliveryFee = isFinalCustomerLeg
                                        ? null
                                        : (rawItemFee > 0 ? rawItemFee : (idx === 0 ? (Number(order.deliveryFee) || 0) : 0));

                                    const agentEarningPerItem = isFinalCustomerLeg
                                        ? null
                                        : itemDeliveryFee * (agentSharePercent / 100);
                                    const isPickStation = order.deliveryMethod === 'pick_station';
                                    const DeliveryIcon = isPickStation ? FaStore : FaMotorcycle;
                                    const itemUnitPrice = Number(item.price) || (Number(item.total) && Number(item.quantity) ? Number(item.total) / Number(item.quantity) : 0);
                                    const itemValue = itemUnitPrice * (Number(item.quantity) || 1);

                                    return (
                                        <div key={item.id} className="flex flex-row items-center space-x-3 p-2 sm:p-3 bg-white border border-gray-100 rounded-xl sm:rounded-2xl shadow-sm transition-hover hover:border-blue-200">
                                            {/* Item Image */}
                                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-lg sm:rounded-xl overflow-hidden flex-shrink-0 border border-gray-100">
                                                <img
                                                    src={resolveImageUrl(getOrderItemImage(item))}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22150%22%20height%3D%22150%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22sans-serif%22%20font-size%3D%2212%22%20fill%3D%22%239ca3af%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E'; }}
                                                />
                                            </div>

                                            {/* Item Info */}
                                            <div className="flex-1 min-w-0 text-center sm:text-left">
                                                <p className="text-sm font-black text-gray-900 truncate">{item.itemLabel || item.name || item.Product?.name || item.product?.name || item.FastFood?.name || item.fastFood?.name || 'Item'}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Qty: {item.quantity || 1} × {formatPrice(itemUnitPrice)}</p>
                                            </div>

                                            {/* Financial Breakdown per item */}
                                            <div className="text-right sm:min-w-[100px] ml-auto">
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">VALUE</p>
                                                <p className="text-sm font-black text-gray-900">{formatPrice(itemValue)}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {orderItems.length === 0 && !isFetchingOrderItems && (
                                    <div className="p-3 sm:p-4 bg-white border border-gray-100 rounded-xl sm:rounded-2xl text-center">
                                        <p className="text-xs font-bold text-gray-500">Order items are not available for this record.</p>
                                    </div>
                                )}
                                {orderItems.length === 0 && isFetchingOrderItems && (
                                    <div className="p-3 sm:p-4 bg-white border border-gray-100 rounded-xl sm:rounded-2xl text-center">
                                        <p className="text-xs font-bold text-blue-600">Loading order items...</p>
                                    </div>
                                )}
                            </div>

                            {/* Totals Breakdown Card */}
                            <div className="mt-4 bg-white border border-blue-100 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                                    <div>
                                        <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Items Total</p>
                                        <p className="text-sm sm:text-base font-black text-gray-900">{formatPrice(totals.itemsTotal)}</p>
                                    </div>
                                    <div className="sm:border-l border-gray-100 sm:pl-6">
                                        <p className="text-[9px] sm:text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-0.5 underline decoration-blue-200 decoration-2">Customer Total</p>
                                        <p className="text-sm sm:text-lg font-black text-gray-900">{formatPrice(totals.orderTotal)}</p>
                                    </div>
                                    <div className="bg-blue-600 rounded-xl p-3 sm:p-4 text-white shadow-lg transform hover:scale-[1.01] transition-transform">
                                        <p className="text-[9px] sm:text-[10px] text-blue-100 font-bold uppercase tracking-widest mb-0.5">Earnings</p>
                                        <p className="text-xl sm:text-2xl font-black">{formatPrice(totals.agentEarnings)}</p>
                                        <p className="text-[8px] sm:text-[9px] text-blue-200 mt-1 italic font-medium opacity-80">Persisted from delivery task</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Custom Actions (Children) */}
                        {children && (
                            <div className="lg:col-span-12 mt-6 pt-6 border-t border-gray-100 flex gap-3 flex-wrap justify-end">
                                {children}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryTaskConsole;
