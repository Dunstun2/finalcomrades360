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
    FaMotorcycle,
    FaPhone,
    FaWhatsapp,
    FaBox
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
    groupColor = null,
    isSelected = false,
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
        // Hub-stage statuses: item is actually at the warehouse or being handled there.
        // en_route_to_warehouse and in_transit are removed from this list as they represents legs in transit.
        const hubStageStatuses = ['at_warehouse', 'at_warehouse'];
        if (hubStageStatuses.includes(oStatus) && routing === 'warehouse') {
            return method === 'pick_station' ? 'warehouse_to_pickup_station' : 'warehouse_to_customer';
        }
        if (hubStageStatuses.includes(oStatus) && routing === 'pick_station') {
            return 'warehouse_to_pickup_station';
        }

        // Seller-dispatch or Leg 1 stage
        if (['order_placed', 'seller_confirmed', 'super_admin_confirmed', 'en_route_to_warehouse', 'in_transit'].includes(oStatus)) {
            // If the explicit task type is already a hub-to-hub or hub-to-customer, 
            // and status is in_transit, we shouldn't force it back to seller_to_hub.
            // But if there's NO task, or the task IS seller_to_hub, then in_transit here means Leg 1.
            const isTaskTerminal = activeTask?.deliveryType?.includes('_to_customer');
            if (!isTaskTerminal) {
                if (routing === 'warehouse') return 'seller_to_warehouse';
                if (routing === 'pick_station') return 'seller_to_pickup_station';
                if (routing === 'direct_delivery') return 'seller_to_customer';
            }
        }

        if (['en_route_to_pick_station', 'at_pick_station', 'ready_for_pickup'].includes(oStatus)) {
            return method === 'home_delivery' ? 'pickup_station_to_customer' : 'warehouse_to_pickup_station';
        }
        if (['in_transit', 'delivered'].includes(oStatus) || (oStatus === 'in_transit' && activeTask?.deliveryType?.includes('_to_customer'))) {
            // in_transit is primarily used for the final delivery leg (warehouse/station to customer)
            // but we only override to it if we aren't already identified as a seller-to-hub leg above.
            return routing === 'warehouse' ? 'warehouse_to_customer' : 'seller_to_customer';
        }
        return null; // genuinely unknown
        return null; // genuinely unknown
    })();

    // Use the task deliveryType unless it looks stale (e.g. still says seller_to_warehouse
    // but we can tell from order status the item is already past the seller stage).
    const taskType = activeTask?.deliveryType;
    const isEarlyStage = ['order_placed', 'seller_confirmed', 'super_admin_confirmed', 'en_route_to_warehouse', 'assigned', 'accepted', 'arrived_at_pickup', 'request_pending', 'requested'].includes(order?.status);
    
    // Safety check: if task is a HUB-based leg but order is still at SELLER-based stage, it's a mismatch.
    const wrongHubTask = (taskType?.startsWith('warehouse') || taskType?.startsWith('pickup_station')) && isEarlyStage;

    const staleSellerTask = taskType === 'seller_to_warehouse' &&
        ['at_warehouse', 'at_warehouse', 'in_transit'].includes(order?.status);

    const deliveryType = (staleSellerTask || wrongHubTask)
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

    const isAtStationStatus = (s) => ['at_pick_station', 'return_at_pick_station', 'ready_for_pickup'].includes(s);
    const isAtWarehouseStatus = (s) => ['at_warehouse', 'at_warehouse', 'return_at_warehouse'].includes(s);
    const isAtHubStatus = (s) => isAtStationStatus(s) || isAtWarehouseStatus(s);

    const getStatusInfo = (s) => {
        // Core Logic: If it's a "processing" or "awaiting assignment" order at a station/warehouse leg, simplify it to "At Station/Warehouse"
        const atStation = isAtStationStatus(s) || (['processing', 'awaiting_delivery_assignment'].includes(s) && deliveryType.startsWith('pickup_station'));
        const atWarehouse = isAtWarehouseStatus(s) || (['processing', 'awaiting_delivery_assignment'].includes(s) && (deliveryType.startsWith('warehouse') || ['seller_to_warehouse'].includes(deliveryType)));

        if (atStation) return { label: s === 'at_pick_station' ? 'At Station' : s === 'ready_for_pickup' ? 'Ready for Pickup' : 'At Station (Handling)', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <FaStore /> };
        if (atWarehouse) return { label: (s === 'at_warehouse' || s === 'at_warehouse') ? 'At Warehouse' : 'At Warehouse (Handling)', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: <FaWarehouse /> };

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

    const hasFastFood = (orderItems || []).some(item => !!item.fastFoodId || item.itemType === 'fastfood' || item.FastFood || item.fastFood) ||
                        ['direct_delivery', 'fastfood_pickup_point'].includes(order.adminRoutingStrategy);

    const isTransitional = !hasFastFood && !deliveryType.endsWith('customer');
    const isFinalCustomerLeg = hasFastFood || deliveryType.endsWith('_to_customer');

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
            // mainImage is the primary FastFood image field; coverImage is alias
            return f.coverImage || f.mainImage || f.image || ffGallery[0] || null;
        }

        if (p) {
            const productImages = parseMediaList(p.images);
            const productGallery = parseMediaList(p.galleryImages);
            return (
                p.coverImage ||
                p.mainImage ||
                p.image ||
                (typeof productImages[0] === 'string' ? productImages[0] : productImages[0]?.url) ||
                (typeof productGallery[0] === 'string' ? productGallery[0] : productGallery[0]?.url) ||
                null
            );
        }

        if (s) {
            const serviceGallery = parseMediaList(s.galleryImages || s.images);
            return s.coverImage || s.mainImage || s.image || (typeof serviceGallery[0] === 'string' ? serviceGallery[0] : serviceGallery[0]?.imageUrl) || null;
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

    // Trigger periodic updates for the elapsed timer (every 60 seconds)
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const getElapsedTimeInfo = () => {
        const assignedTime = activeTask?.assignedAt || activeTask?.createdAt || order?.createdAt;
        if (!assignedTime) return null;
        
        const assignedDate = new Date(assignedTime);
        const now = new Date();
        const diffMs = now - assignedDate;
        
        const diffMins = Math.floor(Math.max(0, diffMs) / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        let elapsedText = '';
        if (diffMins < 1) {
            elapsedText = 'just now';
        } else if (diffMins < 60) {
            elapsedText = `${diffMins}m ago`;
        } else if (diffHours < 24) {
            const minsLeft = diffMins % 60;
            elapsedText = minsLeft > 0 ? `${diffHours}h ${minsLeft}m ago` : `${diffHours}h ago`;
        } else {
            elapsedText = `${diffDays}d ago`;
        }
        
        // Mark as warning/delay if assigned for more than 30 minutes and not yet started/completed
        const isDelayed = diffMins >= 30 && !['completed', 'failed', 'cancelled'].includes(activeTask?.status || order?.status); 

        return {
            formattedTime: assignedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
            formattedDate: assignedDate.toLocaleDateString([], { month: 'short', day: 'numeric' }),
            elapsedText,
            isDelayed,
            diffMins
        };
    };

    const getExpectedDeliveryInfo = () => {
        const estTime = activeTask?.estimatedDeliveryTime || order?.deliveryTimePreference;
        if (!estTime) return null;
        
        const estDate = new Date(estTime);
        
        if (isNaN(estDate.getTime())) {
            if (typeof estTime === 'string') {
                return {
                    isStringPreference: true,
                    text: estTime
                };
            }
            return null;
        }
        
        const now = new Date();
        const diffMs = estDate - now;
        const diffMins = Math.floor(diffMs / 60000);
        const isOverdue = diffMins < 0 && !['completed', 'failed', 'cancelled'].includes(activeTask?.status || order?.status);
        
        let dueText = '';
        if (diffMins < 0) {
            const absMins = Math.abs(diffMins);
            if (absMins < 60) {
                dueText = `${absMins}m overdue`;
            } else {
                const hours = Math.floor(absMins / 60);
                const mins = absMins % 60;
                dueText = mins > 0 ? `${hours}h ${mins}m overdue` : `${hours}h overdue`;
            }
        } else {
            if (diffMins < 60) {
                dueText = `in ${diffMins}m`;
            } else {
                const hours = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                dueText = mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`;
            }
        }
        
        return {
            isStringPreference: false,
            formattedTime: estDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
            formattedDate: estDate.toLocaleDateString([], { month: 'short', day: 'numeric' }),
            dueText,
            isOverdue,
            diffMins
        };
    };

    const elapsedInfo = getElapsedTimeInfo();
    const expectedInfo = getExpectedDeliveryInfo();

    return (
        <div 
            className={`delivery-console-card bg-white rounded-xl sm:rounded-2xl shadow-sm border transition-all duration-300 
                ${isExpanded ? 'ring-2 ring-blue-500 border-transparent shadow-xl' : 'hover:border-blue-300'}
                ${isSelected ? 'bg-blue-50/50' : ''}`}
            style={groupColor ? { borderLeft: `6px solid ${groupColor}` } : {}}
        >
            {/* Header Section */}
            <div
                onClick={onToggleExpand}
                className="p-2 sm:p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4"
            >
                <div className="flex items-start gap-4">
                    {checkbox && (
                        <div className="pt-1 pr-2" onClick={(e) => e.stopPropagation()}>
                            {checkbox}
                        </div>
                    )}

                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">{order.orderNumber}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border ${statusInfo.color}`}>
                                {statusInfo.label}
                            </span>
                            {activeTask?.collectionAlertedAt && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 bg-purple-100 text-purple-700 border-purple-200`}
                                    title={`Customer notified at ${new Date(activeTask.collectionAlertedAt).toLocaleString()}`}
                                >
                                    <FaCheckCircle size={9} className="text-purple-500" /> Notified
                                </span>
                            )}
                            {elapsedInfo && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 
                                    ${elapsedInfo.isDelayed ? 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse' : 'bg-slate-100 text-slate-700 border-slate-200'}`}
                                    title={`Assigned at ${elapsedInfo.formattedTime}`}
                                >
                                    <FaClock size={9} className={elapsedInfo.isDelayed ? 'text-amber-500' : 'text-slate-400'} />
                                    {elapsedInfo.elapsedText}
                                </span>
                            )}
                            {expectedInfo && !expectedInfo.isStringPreference && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 
                                    ${expectedInfo.isOverdue ? 'bg-red-100 text-red-700 border-red-200 animate-pulse' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}
                                    title={`Deliver by ${expectedInfo.formattedTime}`}
                                >
                                    <FaClock size={9} className={expectedInfo.isOverdue ? 'text-red-500' : 'text-emerald-500'} />
                                    {expectedInfo.dueText}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-bold mt-1 flex items-center gap-1.5">
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                <FaBox size={8} /> Items
                            </span>
                            <span className="truncate max-w-[250px] md:max-w-md inline-block">
                                {orderItems.length > 0 
                                    ? orderItems.map(item => item.itemLabel || item.name || item.Product?.name || item.product?.name || item.FastFood?.name || item.fastFood?.name || 'Item').join(', ')
                                    : 'Loading items...'}
                            </span>
                        </p>
                        {/* Consolidated Info Line - Visible when collapsed */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                            {order.deliveryAddress && (
                                <p className="text-[10px] sm:text-xs text-blue-600 font-semibold flex items-center gap-1 truncate max-w-[200px] md:max-w-xs">
                                    <FaMapMarkedAlt className="flex-shrink-0 text-blue-400" />
                                    {order.deliveryAddress}
                                </p>
                            )}
                            
                            {(order.customerName || order.User?.name) && (
                                <p className="text-[10px] sm:text-xs text-gray-700 font-bold flex items-center gap-1">
                                    <FaUser className="text-gray-400 text-[9px]" />
                                    {order.customerName || order.User?.name}
                                </p>
                            )}

                            {(order.customerPhone || order.User?.phone) && (
                                <p className="text-[10px] sm:text-xs text-indigo-600 font-black flex items-center gap-1">
                                    <FaPhone className="text-indigo-300 text-[9px]" />
                                    {order.customerPhone || order.User?.phone}
                                </p>
                            )}

                            {elapsedInfo && (
                                <p className={`text-[10px] sm:text-xs font-semibold flex items-center gap-1 ${elapsedInfo.isDelayed ? 'text-amber-600' : 'text-slate-600'}`}>
                                    <FaClock size={9} className={elapsedInfo.isDelayed ? 'text-amber-500' : 'text-slate-400'} />
                                    <span>Assigned: {elapsedInfo.formattedTime} ({elapsedInfo.elapsedText})</span>
                                </p>
                            )}

                            {expectedInfo && (
                                <p className={`text-[10px] sm:text-xs font-black flex items-center gap-1 ${expectedInfo.isOverdue ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    <FaClock size={9} className={expectedInfo.isOverdue ? 'text-rose-500' : 'text-emerald-500'} />
                                    <span>
                                        {expectedInfo.isStringPreference ? (
                                            `Expected: ${expectedInfo.text}`
                                        ) : (
                                            `Deliver by: ${expectedInfo.formattedTime} (${expectedInfo.dueText})`
                                        )}
                                    </span>
                                </p>
                            )}
                        </div>
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
                <div className="px-1.5 pb-4 border-t border-gray-100 bg-gray-50/30 animate-in slide-in-from-top-2 duration-300">
                    <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* Route Timeline */}
                        <div className="lg:col-span-12">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Delivery Route Leg</h4>
                            <div className="relative flex flex-row items-stretch gap-2 md:gap-0">
                                {/* Start: Pickup */}
                                <div className="flex-1 bg-white p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm relative z-10 transition-transform transform hover:scale-[1.01]">
                                    <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
                                        <div className="p-1.5 sm:p-2 bg-orange-50 text-orange-500 rounded-lg text-[10px] sm:text-sm">
                                            {deliveryType.startsWith('warehouse') ? <FaWarehouse /> : <FaStore />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[8px] sm:text-[9px] font-bold text-orange-400 uppercase tracking-wider mb-0.5">Pickup From</p>
                                            <p className="text-[10px] sm:text-sm font-black text-gray-800 truncate">{pickupDisplay}</p>
                                            <p className="text-[9px] sm:text-xs text-gray-500 mt-0.5 truncate">{pickupAddress}</p>
                                            {pickupPhone && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                  <a href={`tel:${pickupPhone}`} className="px-2 sm:px-3 py-1 bg-blue-50 text-blue-600 text-[8px] sm:text-[10px] font-bold rounded-lg flex items-center gap-1 hover:bg-blue-100 border border-blue-200">
                                                    <FaPhone size={8} className="sm:w-2.5 sm:h-2.5" /> Call
                                                  </a>
                                                  <a href={`https://wa.me/${pickupPhone.replace(/\+/g, '')}`} target="_blank" rel="noopener noreferrer" className="px-2 sm:px-3 py-1 bg-green-50 text-green-600 text-[8px] sm:text-[10px] font-bold rounded-lg flex items-center gap-1 hover:bg-green-100 border border-green-200">
                                                    <FaWhatsapp size={8} className="sm:w-2.5 sm:h-2.5" /> WhatsApp
                                                  </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Connector - Always horizontal */}
                                <div className="flex flex-col items-center justify-center px-1 sm:px-4">
                                    <div className="w-4 sm:w-12 h-[1px] sm:h-[2px] bg-gradient-to-r from-orange-200 to-green-200"></div>
                                    <FaArrowRight className="text-gray-200 text-[8px] sm:text-xs mt-[-4px] sm:mt-[-7px]" />
                                </div>

                                {/* End: Destination */}
                                <div className="flex-1 bg-white p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm relative z-10 transition-transform transform hover:scale-[1.01]">
                                    <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
                                        <div className={`p-1.5 sm:p-2 rounded-lg text-[10px] sm:text-sm ${isTransitional ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-500'}`}>
                                            {deliveryType.endsWith('warehouse') ? <FaWarehouse /> : deliveryType.endsWith('pickup_station') ? <FaStore /> : <FaUser />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider mb-0.5 ${isTransitional ? 'text-blue-400' : 'text-green-500'}`}>
                                                Deliver To {isTransitional ? '(Final Mile)' : '(Customer)'}
                                            </p>
                                            <p className="text-[10px] sm:text-sm font-black text-gray-800 truncate">{destinationDisplay}</p>
                                            <p className="text-[9px] sm:text-xs text-gray-500 mt-0.5 italic truncate">{destinationAddress}</p>
                                            {destinationPhone && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                  <a href={`tel:${destinationPhone}`} className="px-2 sm:px-3 py-1 bg-blue-50 text-blue-600 text-[8px] sm:text-[10px] font-bold rounded-lg flex items-center gap-1 hover:bg-blue-100 border border-blue-200">
                                                    <FaPhone size={8} className="sm:w-2.5 sm:h-2.5" /> Call
                                                  </a>
                                                  <a href={`https://wa.me/${destinationPhone.replace(/\+/g, '')}`} target="_blank" rel="noopener noreferrer" className="px-2 sm:px-3 py-1 bg-green-50 text-green-600 text-[8px] sm:text-[10px] font-bold rounded-lg flex items-center gap-1 hover:bg-green-100 border border-green-200">
                                                    <FaWhatsapp size={8} className="sm:w-2.5 sm:h-2.5" /> WhatsApp
                                                  </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Final Destination Highlight (for transitional legs) */}
                            {isTransitional && order.deliveryAddress && (
                                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-500">
                                            <FaMapMarkedAlt size={14} />
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

                        {/* Task Timeline & Tracking Progress */}
                        {(elapsedInfo || expectedInfo || activeTask?.acceptedAt || activeTask?.collectedAt || activeTask?.startedAt || activeTask?.completedAt) && (
                            <div className="lg:col-span-12 mt-4 bg-white p-4 rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                                    <FaClock className="text-blue-500" /> Task Timeline & Timing Details
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {elapsedInfo && (
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Assigned At</p>
                                            <p className="text-xs font-black text-slate-700 mt-1">{elapsedInfo.formattedTime}</p>
                                            <p className="text-[9px] font-medium text-slate-500 mt-0.5">{elapsedInfo.formattedDate} ({elapsedInfo.elapsedText})</p>
                                        </div>
                                    )}
                                    {activeTask?.acceptedAt ? (
                                        <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex flex-col justify-between">
                                            <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-wider">Accepted At</p>
                                            <p className="text-xs font-black text-indigo-700 mt-1">
                                                {new Date(activeTask.acceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </p>
                                            <p className="text-[9px] font-medium text-indigo-500 mt-0.5">
                                                {new Date(activeTask.acceptedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100/50 flex flex-col justify-between opacity-50">
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Accepted At</p>
                                            <p className="text-xs font-bold text-gray-400 mt-1">—</p>
                                            <p className="text-[9px] text-gray-400 mt-0.5">Not accepted yet</p>
                                        </div>
                                    )}
                                    {activeTask?.collectedAt ? (
                                        <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/70 flex flex-col justify-between">
                                            <p className="text-[8px] font-bold text-amber-500 uppercase tracking-wider">Collected At</p>
                                            <p className="text-xs font-black text-amber-700 mt-1">
                                                {new Date(activeTask.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </p>
                                            <p className="text-[9px] font-medium text-amber-600 mt-0.5">
                                                {new Date(activeTask.collectedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100/50 flex flex-col justify-between opacity-50">
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Collected At</p>
                                            <p className="text-xs font-bold text-gray-400 mt-1">—</p>
                                            <p className="text-[9px] text-gray-400 mt-0.5">Not collected yet</p>
                                        </div>
                                    )}
                                    {activeTask?.completedAt ? (
                                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col justify-between">
                                            <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-wider">Completed At</p>
                                            <p className="text-xs font-black text-emerald-700 mt-1">
                                                {new Date(activeTask.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </p>
                                            <p className="text-[9px] font-medium text-emerald-600 mt-0.5">
                                                {new Date(activeTask.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </p>
                                        </div>
                                    ) : expectedInfo ? (
                                        <div className={`p-3 rounded-xl border flex flex-col justify-between 
                                            ${expectedInfo.isOverdue ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50/40 border-emerald-100'}`}>
                                            <p className={`text-[8px] font-bold uppercase tracking-wider ${expectedInfo.isOverdue ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                Target Delivery
                                            </p>
                                            <p className={`text-xs font-black mt-1 ${expectedInfo.isOverdue ? 'text-rose-700' : 'text-emerald-700'}`}>
                                                {expectedInfo.isStringPreference ? expectedInfo.text : expectedInfo.formattedTime}
                                            </p>
                                            <p className={`text-[9px] font-black mt-0.5 uppercase tracking-tighter ${expectedInfo.isOverdue ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>
                                                {expectedInfo.isStringPreference ? 'Preference' : expectedInfo.dueText}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100/50 flex flex-col justify-between opacity-50">
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Target Delivery</p>
                                            <p className="text-xs font-bold text-gray-400 mt-1">—</p>
                                            <p className="text-[9px] text-gray-400 mt-0.5">Not specified</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

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
                                    // Use item.total directly if available (price * quantity persisted at order time)
                                    const itemValue = Number(item.total) > 0 
                                        ? Number(item.total) 
                                        : (itemUnitPrice * (Number(item.quantity) || 1));

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
                            <div className="mt-4 bg-white border border-blue-100 rounded-xl sm:rounded-2xl p-2 sm:p-5 shadow-sm">
                                <div className="grid grid-cols-3 gap-2 sm:gap-6 items-stretch">
                                    <div className="flex flex-col justify-center">
                                        <p className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Items Total</p>
                                        <p className="text-[10px] sm:text-base font-black text-gray-900">{formatPrice(totals.itemsTotal)}</p>
                                    </div>
                                    <div className="border-l border-gray-100 pl-2 sm:pl-6 flex flex-col justify-center">
                                        <p className="text-[8px] sm:text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-0.5 underline decoration-blue-200 decoration-1 sm:decoration-2">Customer Total</p>
                                        <p className="text-[10px] sm:text-lg font-black text-gray-900">{formatPrice(totals.orderTotal)}</p>
                                    </div>
                                    <div className="bg-blue-600 rounded-lg sm:rounded-xl p-2 sm:p-4 text-white shadow-lg transform hover:scale-[1.01] transition-transform flex flex-col justify-center">
                                        <p className="text-[8px] sm:text-[10px] text-blue-100 font-bold uppercase tracking-widest mb-0.5">Earnings</p>
                                        <p className="text-xs sm:text-2xl font-black">{formatPrice(totals.agentEarnings)}</p>
                                        <p className="hidden sm:block text-[8px] sm:text-[9px] text-blue-200 mt-1 italic font-medium opacity-80">Persisted</p>
                                    </div>
                                </div>
                            </div>

                            {/* Proof of Payment Screenshot Viewer */}
                            {(order.paymentType === 'prepay' && order.paymentProofUrl) && (
                                <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-center gap-4">
                                    <div className="w-20 h-20 bg-white rounded-xl overflow-hidden shadow-sm border border-indigo-200 flex-shrink-0 group relative cursor-pointer hover:border-indigo-400 transition-colors">
                                        <a href={resolveImageUrl(order.paymentProofUrl)} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                            <img
                                                src={resolveImageUrl(order.paymentProofUrl)}
                                                alt="Payment Proof Screenshot"
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22150%22%20height%3D%22150%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22sans-serif%22%20font-size%3D%2212%22%20fill%3D%22%239ca3af%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3EError%20Loading%3C%2Ftext%3E%3C%2Fsvg%3E'; }}
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold uppercase transition-opacity">
                                                🔍 View
                                            </div>
                                        </a>
                                    </div>
                                    <div className="flex-1 text-center sm:text-left min-w-0">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">Prepaid Proof of Payment</p>
                                        <p className="text-xs font-bold text-gray-700">Prepaid Order Verified</p>
                                        <p className="text-[10px] text-gray-400 mt-1">This order was prepaid when placed. Click the thumbnail to securely inspect the full screenshot proof of payment.</p>
                                    </div>
                                </div>
                            )}
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
