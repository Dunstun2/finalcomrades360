import React, { useState, useEffect } from 'react';
import { FaUserTie, FaMapMarkerAlt, FaExclamationCircle, FaExchangeAlt, FaStickyNote, FaMoneyBillWave, FaRoute, FaTruck, FaLock, FaLockOpen } from 'react-icons/fa';
import api from '../../services/api';
import { DELIVERY_TYPE_CONFIG } from './DeliveryTaskComponents';
import DeliveryChat from './DeliveryChat';
import AdminPasswordDialog from '../AdminPasswordDialog';

const DeliveryAssignmentModal = ({ order, isOpen, onClose, onAssign, isBulk = false, selectedOrderIds = [] }) => {
    const [selectedDriverId, setSelectedDriverId] = useState('');
    const [deliveryType, setDeliveryType] = useState('warehouse_to_customer');
    const [pickupLocation, setPickupLocation] = useState('');
    const [deliveryLocation, setDeliveryLocation] = useState('');
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [notes, setNotes] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [agentMatches, setAgentMatches] = useState([]);
    const [suggestions, setSuggestions] = useState(null);
    const [loadingAgents, setLoadingAgents] = useState(false);
    const [bulkOrders, setBulkOrders] = useState([]);
    const [loadingBulk, setLoadingBulk] = useState(false);
    const [routeFees, setRouteFees] = useState({});
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
    const [pickupStations, setPickupStations] = useState([]);
    const [selectedDestId, setSelectedDestId] = useState('');
    const [selectedOriginId, setSelectedOriginId] = useState('');
    const [isDestLocked, setIsDestLocked] = useState(true);

    const lastResetOrderId = React.useRef(null);

    const normalizeDeliveryType = (type) => type;

    const getKnownRouteLocations = (currentOrder, currentSuggestions = null) => {
        const getSellerAddr = (seller) => {
            if (!seller) return null;
            return seller.businessAddress 
                || seller.address 
                || (seller.businessTown && seller.businessCounty ? `${seller.businessTown}, ${seller.businessCounty}` : null) 
                || seller.businessTown 
                || seller.businessCounty;
        };

        let sellerAddress = currentOrder?.pickupLocation || getSellerAddr(currentOrder?.seller);
        
        // Fallback for multi-seller orders: lookup in items
        if (!sellerAddress && currentOrder?.OrderItems?.length > 0) {
            for (const item of currentOrder.OrderItems) {
                const itemSeller = item.seller || item.Product?.seller || item.FastFood?.vendorDetail;
                const addr = getSellerAddr(itemSeller);
                if (addr) {
                    sellerAddress = addr;
                    break;
                }
            }
        }

        if (!sellerAddress && currentSuggestions?.sellerAddress) {
            sellerAddress = currentSuggestions.sellerAddress;
        }

        const warehouseAddress = currentOrder?.DestinationWarehouse?.address
            || currentOrder?.DestinationWarehouse?.landmark
            || currentOrder?.Warehouse?.address
            || currentOrder?.Warehouse?.landmark
            || currentSuggestions?.warehouseAddress
            || '';

        const pickupStationAddress = currentOrder?.DestinationPickStation?.location
            || currentOrder?.DestinationPickStation?.address
            || currentOrder?.PickupStation?.location
            || currentOrder?.PickupStation?.address
            || currentOrder?.DestinationFastFoodPickupPoint?.address
            || currentOrder?.pickStation
            || currentSuggestions?.pickStationAddress
            || '';

        const customerAddress = currentOrder?.deliveryLocation
            || currentOrder?.deliveryAddress
            || currentSuggestions?.customerAddress
            || '';

        return {
            sellerAddress: sellerAddress || '',
            warehouseAddress,
            pickupStationAddress,
            customerAddress
        };
    };

    const getRouteLocations = (route, currentOrder, currentSuggestions = null) => {
        const knownLocations = getKnownRouteLocations(currentOrder, currentSuggestions);
        const sellerAddr = knownLocations.sellerAddress;
        const warehouseAddr = knownLocations.warehouseAddress;
        const pickupStationAddr = knownLocations.pickupStationAddress;
        const customerAddr = knownLocations.customerAddress;

        const routeMapping = {
            seller_to_warehouse: { pickup: sellerAddr, destination: warehouseAddr },
            seller_to_customer: { pickup: sellerAddr, destination: customerAddr },
            warehouse_to_customer: { pickup: warehouseAddr, destination: customerAddr },
            customer_to_warehouse: { pickup: customerAddr, destination: warehouseAddr },
            warehouse_to_seller: { pickup: warehouseAddr, destination: sellerAddr },
            customer_to_seller: { pickup: customerAddr, destination: sellerAddr },
            warehouse_to_pickup_station: { pickup: warehouseAddr, destination: pickupStationAddr },
            seller_to_pickup_station: { pickup: sellerAddr, destination: pickupStationAddr },
            fastfood_pickup_point: { pickup: sellerAddr, destination: pickupStationAddr },
            pickup_station_to_customer: { pickup: pickupStationAddr, destination: customerAddr },
            pickup_station_to_warehouse: { pickup: pickupStationAddr, destination: warehouseAddr }
        };

        return routeMapping[normalizeDeliveryType(route)] || { pickup: sellerAddr, destination: customerAddr || pickupStationAddr };
    };

    // Dynamic route visibility based on order status
    // Dynamic route visibility based on order status and delivery method
    const getVisibleRoutes = () => {
        if (!order) return Object.entries(DELIVERY_TYPE_CONFIG);
        const allRoutes = Object.entries(DELIVERY_TYPE_CONFIG);
        const status = order.status;
        const method = order.deliveryMethod;

        const isFastFood = order.orderCategory === 'fastfood' || order.OrderItems?.some(i => i.FastFood);
        if (isFastFood) {
            if (order.adminRoutingStrategy === 'fastfood_pickup_point' || method === 'pickup_point' || method === 'pick_station') {
                return allRoutes.filter(([key]) => ['seller_to_customer', 'fastfood_pickup_point'].includes(key));
            }
            return allRoutes.filter(([key]) => ['seller_to_customer'].includes(key));
        }

        // Home Delivery preference: Prioritize direct delivery if confirmed
        if (method === 'home_delivery' && ['order_placed', 'seller_confirmed', 'super_admin_confirmed'].includes(status)) {
             return allRoutes.filter(([key]) => [
                'seller_to_customer',
                'seller_to_warehouse',
                'warehouse_to_customer'
            ].includes(key));
        }

        // Pick Station preference
        if (method === 'pick_station' && ['order_placed', 'seller_confirmed', 'super_admin_confirmed'].includes(status)) {
            return allRoutes.filter(([key]) => [
                'seller_to_pickup_station',
                'seller_to_warehouse',
                'warehouse_to_pickup_station'
            ].includes(key));
        }

        // Logic-based filtering by status (fallback)
        if (['order_placed', 'seller_confirmed', 'super_admin_confirmed', 'en_route_to_warehouse'].includes(status)) {
            return allRoutes.filter(([key]) => [
                'seller_to_warehouse',
                'seller_to_customer',
                'seller_to_pickup_station',
                'warehouse_to_customer',
                'warehouse_to_pickup_station'
            ].includes(key));
        }

        // Hub/Warehouse stage routes
        if (['at_warehouse', 'received_at_warehouse'].includes(status)) {
            return allRoutes.filter(([key]) => [
                'warehouse_to_customer',
                'warehouse_to_seller',
                'warehouse_to_pickup_station'
            ].includes(key));
        }

        // Pick Station stage routes
        if (status === 'ready_for_pickup' || method === 'pick_station') {
            return allRoutes.filter(([key]) => [
                'pickup_station_to_customer',
                'warehouse_to_pickup_station',
                'pickup_station_to_warehouse',
                'warehouse_to_customer'
            ].includes(key));
        }

        // Return/Failed routes
        if (['delivered', 'returned', 'failed'].includes(status)) {
            return allRoutes.filter(([key]) => [
                'customer_to_warehouse',
                'warehouse_to_seller',
                'customer_to_seller',
                'pickup_station_to_warehouse',
                'pickup_station_to_seller'
            ].includes(key));
        }

        return allRoutes; // Default show all if status is unusual
    };

    const visibleRoutes = getVisibleRoutes();

    // Fetch route fees only when needed

    const fetchRouteFees = async () => {
        setLoadingConfig(true);
        try {
            const res = await api.get('/admin/config/delivery_route_fees');
            if (res.data.success) {
                setRouteFees(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch route fees:', error);
        } finally {
            setLoadingConfig(false);
        }
    };

    useEffect(() => {
        if (isOpen && order) {
            // Only reset state if the order ID has changed or it's the first open for this order
            if (lastResetOrderId.current !== order.id) {
                const possibleRoutes = getVisibleRoutes();
                const defaultRoute = possibleRoutes.length > 0 ? possibleRoutes[0][0] : 'seller_to_warehouse';
                let initialRoute = normalizeDeliveryType(order.deliveryType) || defaultRoute;
                const isFastFoodPickupStrategy = order.adminRoutingStrategy === 'fastfood_pickup_point' || order.deliveryMethod === 'pickup_point';
                if (isFastFoodPickupStrategy && initialRoute === 'seller_to_pickup_station') {
                    initialRoute = 'fastfood_pickup_point';
                }

                if (['at_warehouse', 'received_at_warehouse', 'ready_for_pickup'].includes(order.status)) {
                    if (possibleRoutes.some(([key]) => key === 'warehouse_to_customer')) {
                        initialRoute = 'warehouse_to_customer';
                    }
                } else if (order.status !== 'delivered' && order.selfDispatcherName) {
                    // If seller is self-dispatching, Leg 1 is handled by them.
                    // Anticipate assigning the *next* leg.
                    if (order.deliveryMethod === 'pick_station' && possibleRoutes.some(([key]) => key === 'warehouse_to_pickup_station')) {
                        initialRoute = 'warehouse_to_pickup_station';
                    } else if (possibleRoutes.some(([key]) => key === 'warehouse_to_customer')) {
                        initialRoute = 'warehouse_to_customer';
                    }
                }

                setDeliveryType(initialRoute);
                setSelectedDestId('');
                setSelectedOriginId('');
                setDeliveryFee(order.deliveryFee || 0);
                setNotes(order.deliveryInstructions || '');
                setIsDestLocked(true); // Re-arm lock for new order

                const preferredDriverId = order.deliveryAgentId || order.deliveryAgent?.id || '';
                const isHubStatus = ['at_warehouse', 'received_at_warehouse', 'ready_for_pickup'].includes(order.status);

                // For delivery-request approval, preserve the requesting agent even if the modal
                // normalizes the route type from a provisional/null value.
                if (isHubStatus) {
                    setSelectedDriverId(''); // Always force new agent selection for hub dispatch
                } else if (preferredDriverId) {
                    setSelectedDriverId(String(preferredDriverId));
                } else if (initialRoute !== order.deliveryType || (initialRoute === 'warehouse_to_customer' && order.status === 'at_warehouse' && !order.deliveryAgentId)) {
                    setSelectedDriverId('');
                } else {
                    setSelectedDriverId(order.deliveryAgentId || '');
                }

                lastResetOrderId.current = order.id;
            }

            const fallbackOpenRoute = order.deliveryType || getVisibleRoutes()[0]?.[0] || 'seller_to_warehouse';
            const initialDisplayRoute =
                (order.adminRoutingStrategy === 'fastfood_pickup_point' || order.deliveryMethod === 'pickup_point')
                    && normalizeDeliveryType(fallbackOpenRoute) === 'seller_to_pickup_station'
                    ? 'fastfood_pickup_point'
                    : fallbackOpenRoute;
            const initialLocations = getRouteLocations(initialDisplayRoute, order);
            setPickupLocation(initialLocations.pickup || '');
            setDeliveryLocation(initialLocations.destination || '');

            fetchAgentDistances(order.id);
            fetchRouteFees();

            // Fetch hub data
            api.get('/warehouses').then(res => setWarehouses(res.data?.warehouses || [])).catch(() => { });
            api.get('/pickup-stations').then(res => setPickupStations(res.data?.stations || [])).catch(() => { });
        } else if (!isOpen) {
            lastResetOrderId.current = null; // Prepare for next open
        }
    }, [isOpen, order, isBulk, selectedOrderIds]);

    const fetchBulkOrdersDetails = async () => {
        setLoadingBulk(true);
        try {
            const res = await api.get(`/orders?ids=${selectedOrderIds.join(',')}`);
            setBulkOrders(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Failed to fetch bulk order details:', error);
        } finally {
            setLoadingBulk(false);
        }
    };

    // Update fee when route type changes
    useEffect(() => {
        if (!order) return;

        // Customer-facing routes use itemized/product-specific fees
        const isCustomerRoute = ['warehouse_to_customer', 'seller_to_customer', 'pickup_station_to_customer', 'warehouse_to_pickup_station', 'fastfood_pickup_point'].includes(normalizeDeliveryType(deliveryType));

        // 1. Customer Routes Strategy: Sum product delivery fees
        if (isCustomerRoute) {
            // Priority 1: Fastfood Pickup Points – use fee persisted on order at checkout (source of truth, same as CustomerOrders.jsx)
            if (deliveryType === 'fastfood_pickup_point' && (order.deliveryMethod === 'pickup_point' || order.adminRoutingStrategy === 'fastfood_pickup_point')) {
                // Use order-level deliveryFee which was set at checkout based on the pickup point's configured fee
                if (Number(order.deliveryFee) > 0) {
                    setDeliveryFee(Number(order.deliveryFee));
                    return;
                }
                // Fallback to pickup point object fee if available
                const pointFee = order.pickupPointPrice
                    || order.DestinationFastFoodPickupPoint?.deliveryFee
                    || order.FastFoodPickupPoint?.deliveryFee
                    || 0;
                if (pointFee > 0) {
                    const items = order.OrderItems || order.items || [];
                    const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
                    setDeliveryFee(pointFee * totalQty);
                    return;
                }
            }

            // Priority 2: User's selected pickstation price if applicable
            const isPickStation = order.deliveryMethod === 'pick_station';
            if (isPickStation && (deliveryType === 'pickup_station_to_customer' || deliveryType === 'warehouse_to_customer' || deliveryType === 'warehouse_to_pickup_station') && order.pickStationId) {
                const items = order.OrderItems || order.items || [];
                const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
                const stationPrice = order.pickStationPrice || (order.PickupStation?.price) || 0;

                if (stationPrice > 0) {
                    setDeliveryFee(stationPrice * totalQty);
                    return;
                }
            }

            // Fallback: Sum product specific delivery fees
            let productFee = 0;
            const items = order.OrderItems || order.items || [];
            items.forEach(item => {
                const fee = item.Product?.deliveryFee || item.FastFood?.deliveryFee || item.deliveryFee || 0;
                productFee += (parseFloat(fee) || 0);
            });

            if (productFee > 0) {
                setDeliveryFee(productFee);
                return;
            }
        }

        // 2. Logistics/Transfer Routes Strategy: Use fixed route fees defined by admin
        if (routeFees[deliveryType]) {
            setDeliveryFee(routeFees[deliveryType].fee);
        }
    }, [deliveryType, routeFees, order]);

    // Update locations when deliveryType changes
    useEffect(() => {
        if (!order || !deliveryType) return;
        
        const locations = getRouteLocations(deliveryType, order);
        
        // Prevent clearing if nothing found but previous was better? No, usually we want it to stay in sync.
        // But for hub routes, if an origin/destination is already selected, let that logic handle it.
        const startsWithHub = deliveryType.startsWith('warehouse') || deliveryType.startsWith('pickup_station');
        const endsWithHub = deliveryType.endsWith('warehouse') || deliveryType.endsWith('pickup_station');

        if (!startsWithHub) {
            setPickupLocation(locations.pickup || '');
        }
        if (!endsWithHub) {
            setDeliveryLocation(locations.destination || '');
        }
    }, [deliveryType, order]);

    const fetchAgentDistances = async (orderId) => {
        setLoadingAgents(true);
        try {
            const res = await api.get(`/admin/delivery/agents/available/${orderId}`);
            // Robust handling for both old and new response formats
            if (res.data.agents && res.data.suggestions) {
                setAgentMatches(res.data.agents);
                setSuggestions(res.data.suggestions);
            } else {
                setAgentMatches(Array.isArray(res.data) ? res.data : []);
            }
        } catch (error) {
            console.error('Failed to fetch agent distances:', error);
        } finally {
            setLoadingAgents(false);
        }
    };

    // Handle dynamic address population and ID initialization
    useEffect(() => {
        if (!suggestions || !order) return;        // 1. Use the actively selected delivery type
        const targetRoute = deliveryType;

        // 2. Set IDs and Lock state
        let destId = '';
        let originId = '';
        let lock = false;

        if (targetRoute.endsWith('warehouse') && suggestions.warehouseId) {
            destId = String(suggestions.warehouseId);
            lock = true;
        } else if (targetRoute.endsWith('pickup_station') && suggestions.pickStationId) {
            destId = String(suggestions.pickStationId);
            lock = true;
        }

        if (targetRoute.startsWith('warehouse') && suggestions.warehouseId) {
            originId = String(suggestions.warehouseId);
            lock = true;
        } else if (targetRoute.startsWith('pickup_station') && suggestions.pickStationId) {
            originId = String(suggestions.pickStationId);
            lock = true;
        }

        // Apply state updates cautiously (don't overwrite manual user settings if they already exist)
        if (targetRoute !== deliveryType) {
            setDeliveryType(targetRoute);
        }

        // Try to resolve IDs automatically even if they are missing (ID Discovery)
        let resolvedDestId = destId;
        let resolvedOriginId = originId;
        const { warehouseOrderId, pickStationOrderId } = resolveOrderHubIds();

        if (!resolvedDestId && targetRoute.endsWith('warehouse')) {
            resolvedDestId = warehouseOrderId;
        }
        if (!resolvedDestId && targetRoute.endsWith('pickup_station')) {
            resolvedDestId = pickStationOrderId;
        }
        if (!resolvedDestId && targetRoute.includes('warehouse')) {
            const match = warehouses.find(w => w.address === deliveryLocation || w.name === deliveryLocation);
            if (match) resolvedDestId = String(match.id);
        }
        if (!resolvedOriginId && targetRoute.startsWith('warehouse')) {
            resolvedOriginId = warehouseOrderId;
        }
        if (!resolvedOriginId && targetRoute.startsWith('pickup_station')) {
            resolvedOriginId = pickStationOrderId;
        }
        if (!resolvedOriginId && targetRoute.startsWith('warehouse')) {
            const match = warehouses.find(w => w.address === pickupLocation || w.name === pickupLocation);
            if (match) resolvedOriginId = String(match.id);
        }

        if (resolvedDestId && !selectedDestId) {
            setSelectedDestId(resolvedDestId);
        }

        if (resolvedOriginId && !selectedOriginId) {
            setSelectedOriginId(resolvedOriginId);
        }

        // Only lock if we actually have an ID to lock to, and don't re-lock if user manually changed it
        if (lock && (!!resolvedDestId || !!resolvedOriginId)) {
            // Only set to true if it hasn't been manually cleared/unlocked 
            // (heuristic: if it's currently unlocked but we HAVE suggested IDs, it means user likely unlocked it)
            if (isDestLocked === false && (!selectedDestId && !selectedOriginId)) {
                setIsDestLocked(true);
            } else if (isDestLocked === true) {
                // Keep it locked if it already was
            }
        } else {
            setIsDestLocked(false);
        }

        // 3. Addresses: prefer known order routing data, then suggestions as fallback
        const routeLocations = getRouteLocations(targetRoute, order, suggestions);
        if (routeLocations) {
            if (routeLocations.pickup && !routeLocations.pickup.includes('not set')) setPickupLocation(routeLocations.pickup);
            if (routeLocations.destination && !routeLocations.destination.includes('not set')) setDeliveryLocation(routeLocations.destination);
        }
    }, [deliveryType, suggestions, order]);

    const resolveOrderHubIds = () => {
        const warehouseOrderId =
            order?.destinationWarehouseId ||
            order?.warehouseId ||
            order?.DestinationWarehouse?.id ||
            order?.Warehouse?.id ||
            '';

        const pickStationOrderId =
            order?.destinationFastFoodPickupPointId ||
            order?.destinationPickStationId ||
            order?.pickupStationId ||
            order?.pickStationId ||
            order?.DestinationPickStation?.id ||
            order?.PickupStation?.id ||
            '';

        return {
            warehouseOrderId: String(warehouseOrderId || ''),
            pickStationOrderId: String(pickStationOrderId || '')
        };
    };

    const getFallbackHubIds = () => {
        const route = normalizeDeliveryType(deliveryType);
        const { warehouseOrderId, pickStationOrderId } = resolveOrderHubIds();
        const fallbackDestId = route.endsWith('warehouse')
            ? String(selectedDestId || warehouseOrderId || '')
            : route.endsWith('pickup_station')
                ? String(selectedDestId || pickStationOrderId || '')
                : String(selectedDestId || '');

        const fallbackOriginId = route.startsWith('warehouse')
            ? String(selectedOriginId || warehouseOrderId || '')
            : route.startsWith('pickup_station')
                ? String(selectedOriginId || pickStationOrderId || '')
                : String(selectedOriginId || '');

        return { fallbackDestId, fallbackOriginId };
    };

    const activeAssignment = order?.deliveryTasks?.find(t => t.status === 'assigned');
    const isAssignmentLocked = (() => {
        if (!activeAssignment) return false;
        const assignedAt = new Date(activeAssignment.assignedAt);
        const expiryTime = new Date(assignedAt.getTime() + 30 * 60 * 1000);
        return new Date() < expiryTime;
    })();

    const handleConfirm = () => {
        if (!selectedDriverId) return;
        if (isAssignmentLocked) {
            alert('Reassignment is locked until the current agent\'s 30-minute window expires.');
            return;
        }
        const route = normalizeDeliveryType(deliveryType);
        const { fallbackDestId, fallbackOriginId } = getFallbackHubIds();
        // ... (remaining validation logic)
        // Require selection for routes that need it
        if (
            (route.endsWith('warehouse') || route.endsWith('pickup_station')) &&
            !['warehouse_to_customer', 'seller_to_customer'].includes(route) &&
            !fallbackDestId &&
            !(deliveryLocation && String(deliveryLocation).trim())
        ) {
            alert('Please select a destination.');
            return;
        }
        if (
            (route.startsWith('warehouse') || route.startsWith('pickup_station')) &&
            !fallbackOriginId &&
            !(pickupLocation && String(pickupLocation).trim())
        ) {
            alert(route.startsWith('warehouse') ? 'Please select an origin warehouse.' : 'Please select an origin pickup station.');
            return;
        }
        setIsPasswordDialogOpen(true);
    };

    const handlePasswordConfirm = async (reason, password) => {
        setAssigning(true);
        try {
            const route = normalizeDeliveryType(deliveryType);
            const { fallbackDestId, fallbackOriginId } = getFallbackHubIds();
            const payload = {
                password,
                deliveryAgentId: selectedDriverId,
                deliveryType: route,
                pickupLocation,
                deliveryLocation,
                deliveryFee,
                notes
            };
            // Set Warehouse ID from either destination or origin depending on route
            if (route.endsWith('warehouse') && fallbackDestId) {
                payload.warehouseId = fallbackDestId;
            } else if (route.startsWith('warehouse') && fallbackOriginId) {
                payload.warehouseId = fallbackOriginId;
            }

            // Set Pickup Station ID from either destination or origin depending on route
            if (route.endsWith('pickup_station') && fallbackDestId) {
                payload.pickupStationId = fallbackDestId;
            } else if (route.startsWith('pickup_station') && fallbackOriginId) {
                payload.pickupStationId = fallbackOriginId;
            }
            await onAssign(order.id, payload);
            onClose();
        } finally {
            setAssigning(false);
        }
    };

    if (!isOpen || (!order && !isBulk)) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm overflow-y-auto pt-10 md:pt-20">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 animate-in fade-in zoom-in duration-200 relative">
                <div className={`p-6 text-white ${isBulk ? 'bg-indigo-700' : 'bg-blue-600'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-bold">
                            {isBulk ? 'Bulk Dispatch Assignment' : 'Assign Delivery Agent'}
                        </h3>
                        <button onClick={onClose} className="text-white hover:text-blue-100 transition-colors">
                            <span className="text-2xl">&times;</span>
                        </button>
                    </div>
                    <p className={`${isBulk ? 'text-indigo-100' : 'text-blue-100'} text-sm font-medium`}>
                        {isBulk ? `Processing ${selectedOrderIds.length} Shipments` : `Order #${order?.orderNumber}`}
                        {!isBulk && deliveryType !== 'seller_to_warehouse' && ` • ${order?.user?.name || order?.customerName || 'Customer'}`}
                    </p>
                </div>

                <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    {/* Bulk Route Summary */}
                    {isBulk && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-2 flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
                            <div className="bg-white p-2.5 rounded-xl shadow-sm border border-indigo-100">
                                <FaRoute className="text-indigo-600 h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-black text-indigo-900 leading-none">Route Consolidation</h4>
                                <p className="text-[11px] font-bold text-indigo-400 leading-tight mt-1.5">
                                    You are assigning an agent to <span className="text-indigo-700 underline underline-offset-2">{selectedOrderIds.length} orders</span>.
                                    Common route parameters will be applied.
                                </p>
                            </div>
                        </div>
                    )}
                    {/* Bulk Destination Breakdown */}
                    {isBulk && bulkOrders.length > 0 && (
                        <div className="space-y-3">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <FaMapMarkerAlt className="text-indigo-500" /> Destination Breakdown ({bulkOrders.length} orders)
                            </label>
                            <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                                <ul className="divide-y divide-gray-100 max-h-48 overflow-y-auto custom-scrollbar">
                                    {bulkOrders.map(o => (
                                        <li key={o.id} className="p-3 hover:bg-white transition-colors flex items-start gap-3">
                                            <div className="mt-1 bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                                                {o.orderNumber?.split('-').pop()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black text-gray-800 truncate">
                                                    {o.user?.name || o.customerName || 'Customer'}
                                                </p>
                                                <p className="text-[10px] text-gray-500 line-clamp-1 italic">
                                                    {o.deliveryAddress}
                                                </p>
                                            </div>
                                            <div className="text-[9px] font-bold text-gray-400 whitespace-nowrap">
                                                {o.OrderItems?.length || 0} items
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Routing Options */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <FaRoute className="text-blue-500" /> Delivery Route Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {visibleRoutes.map(([key, config]) => (
                                <button
                                    key={key}
                                    onClick={() => setDeliveryType(key)}
                                    className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${deliveryType === key
                                        ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100 shadow-sm'
                                        : 'border-gray-200 hover:border-blue-300 bg-white'
                                        }`}
                                >
                                    <span className="text-sm font-bold flex items-center gap-2 whitespace-nowrap">
                                        {config.label}
                                    </span>
                                    <span className="text-[10px] text-gray-500 line-clamp-1">{config.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Origin Selector for Routes starting at Hubs/Stations */}
                    {(deliveryType.startsWith('warehouse') || deliveryType.startsWith('pickup_station')) && (!isDestLocked || !selectedOriginId) && (
                        <div>
                            <label
                                onDoubleClick={() => setIsDestLocked(!isDestLocked)}
                                className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2 cursor-pointer select-none group"
                                title="Double-click to unlock/lock"
                            >
                                <FaMapMarkerAlt className="text-red-500" />
                                {deliveryType.startsWith('warehouse') ? 'Select Origin Warehouse' : 'Select Origin Pickup Station'}
                                <span className="text-red-500">*</span>
                                {isDestLocked ? <FaLock className="text-amber-500 ml-auto h-3 w-3" /> : <FaLockOpen className="text-blue-500 ml-auto h-3 w-3" />}
                            </label>
                            <select
                                value={selectedOriginId}
                                disabled={isDestLocked}
                                onDoubleClick={() => setIsDestLocked(!isDestLocked)}
                                onChange={(e) => {
                                    const id = e.target.value;
                                    setSelectedOriginId(id);
                                    if (deliveryType.startsWith('warehouse')) {
                                        const wh = warehouses.find(w => String(w.id) === id);
                                        if (wh) setPickupLocation(wh.address || wh.name);
                                    } else {
                                        const ps = pickupStations.find(p => String(p.id) === id);
                                        if (ps) setPickupLocation(ps.location || ps.name);
                                    }
                                }}
                                className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all ${isDestLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-dashed' : 'hover:border-blue-300'}`}
                            >
                                <option value="">-- Choose {deliveryType.startsWith('warehouse') ? 'a Warehouse' : 'a Pickup Station'} --</option>
                                {deliveryType.startsWith('warehouse')
                                    ? warehouses.map(w => (
                                        <option key={w.id} value={w.id}>
                                            {w.name}{w.address ? ` — ${w.address}` : ''}
                                        </option>
                                    ))
                                    : pickupStations.filter(p => p.isActive !== false).map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}{p.location ? ` — ${p.location}` : ''}
                                        </option>
                                    ))
                                }
                            </select>
                            {isDestLocked && (
                                <p className="text-[9px] text-amber-600 font-bold mt-1 uppercase tracking-tighter animate-pulse">
                                    Locked to Admin Routing Strategy. Double-click to override.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Destination Selector for Routes needing Hubs/Stations */}
                    {(deliveryType.includes('warehouse') || deliveryType.includes('pickup_station')) && !['warehouse_to_customer', 'seller_to_customer'].includes(deliveryType) && (!isDestLocked || !selectedDestId) && (
                        <div>
                            <label
                                onDoubleClick={() => setIsDestLocked(!isDestLocked)}
                                className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2 cursor-pointer select-none group"
                                title="Double-click to unlock/lock"
                            >
                                <FaMapMarkerAlt className="text-green-500" />
                                {deliveryType.endsWith('warehouse') ? 'Select Destination Warehouse' : 'Select Destination Pickup Station'}
                                <span className="text-red-500">*</span>
                                {isDestLocked ? <FaLock className="text-amber-500 ml-auto h-3 w-3" /> : <FaLockOpen className="text-blue-500 ml-auto h-3 w-3" />}
                            </label>
                            <select
                                value={selectedDestId}
                                disabled={isDestLocked}
                                onDoubleClick={() => setIsDestLocked(!isDestLocked)}
                                onChange={(e) => {
                                    const id = e.target.value;
                                    setSelectedDestId(id);
                                    if (deliveryType.endsWith('warehouse')) {
                                        const wh = warehouses.find(w => String(w.id) === id);
                                        if (wh) setDeliveryLocation(wh.address || wh.name);
                                    } else {
                                        const ps = pickupStations.find(p => String(p.id) === id);
                                        if (ps) setDeliveryLocation(ps.location || ps.name);
                                    }
                                }}
                                className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all ${isDestLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-dashed' : 'hover:border-blue-300'}`}
                            >
                                <option value="">-- Choose {deliveryType.endsWith('warehouse') ? 'a Warehouse' : 'a Pickup Station'} --</option>
                                {deliveryType.endsWith('warehouse')
                                    ? warehouses.map(w => (
                                        <option key={w.id} value={w.id}>
                                            {w.name}{w.address ? ` — ${w.address}` : ''}
                                        </option>
                                    ))
                                    : pickupStations.filter(p => p.isActive !== false).map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}{p.location ? ` — ${p.location}` : ''}
                                        </option>
                                    ))
                                }
                            </select>
                            {isDestLocked && (
                                <p className="text-[9px] text-amber-600 font-bold mt-1 uppercase tracking-tighter animate-pulse">
                                    Locked to Admin Routing Strategy. Double-click to override.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Locations */}
                    <div className="grid grid-cols-1 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div>
                            <label
                                onDoubleClick={() => setIsDestLocked(!isDestLocked)}
                                className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 cursor-pointer"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                {deliveryType.startsWith('warehouse') || deliveryType.startsWith('pickup_station') ? 'Pickup Hub' : 'Pickup Point'}
                            </label>
                            <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <div className="mt-1 bg-red-50 p-2 rounded-lg">
                                    <FaMapMarkerAlt className="text-red-500 h-3 w-3" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-900 leading-tight mb-1">
                                        {(() => {
                                            if (deliveryType.startsWith('warehouse') && selectedOriginId) {
                                                const wh = warehouses.find(w => String(w.id) === selectedOriginId);
                                                return wh ? wh.name : pickupLocation;
                                            }
                                            if (deliveryType.startsWith('pickup_station') && selectedOriginId) {
                                                const ps = pickupStations.find(p => String(p.id) === selectedOriginId);
                                                return ps ? ps.name : pickupLocation;
                                            }
                                            return pickupLocation || 'Determining location...';
                                        })()}
                                    </p>
                                    <p className="text-[10px] text-gray-500 line-clamp-2 italic">
                                        {pickupLocation}
                                    </p>
                                    {suggestions?.sellerLandmark && (
                                        <p className="text-[10px] text-gray-400 italic flex items-center gap-1 mt-1">
                                            Landmark: {suggestions.sellerLandmark}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center -my-2 z-10">
                            <div className="bg-white p-1.5 rounded-full shadow-md border border-gray-100">
                                <FaExchangeAlt className="text-gray-300 h-3 w-3 rotate-90" />
                            </div>
                        </div>

                        <div>
                            <label
                                onDoubleClick={() => setIsDestLocked(!isDestLocked)}
                                className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 cursor-pointer"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                {deliveryType.endsWith('warehouse') || deliveryType.endsWith('pickup_station') ? 'Destination Hub' : 'Drop-off Point'}
                            </label>
                            <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <div className="mt-1 bg-green-50 p-2 rounded-lg">
                                    <FaMapMarkerAlt className="text-green-500 h-3 w-3" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-900 leading-tight mb-1">
                                        {isBulk ? 'Consolidated/Multiple Destinations' : (
                                            (() => {
                                                if (deliveryType.endsWith('warehouse') && selectedDestId) {
                                                    const wh = warehouses.find(w => String(w.id) === selectedDestId);
                                                    return wh ? wh.name : deliveryLocation;
                                                }
                                                if (deliveryType.endsWith('pickup_station') && selectedDestId) {
                                                    const ps = pickupStations.find(p => String(p.id) === selectedDestId);
                                                    return ps ? ps.name : deliveryLocation;
                                                }
                                                return deliveryLocation || 'Determining location...';
                                            })()
                                        )}
                                    </p>
                                    {!isBulk && (
                                        <p className="text-[10px] text-gray-500 line-clamp-2 italic">
                                            {deliveryLocation}
                                        </p>
                                    )}
                                    {suggestions?.customerLandmark && (
                                        <p className="text-[10px] text-gray-400 italic mt-1">
                                            Landmark: {suggestions.customerLandmark}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fee and Notes */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                                <span className="flex items-center gap-1"><FaMoneyBillWave className="text-green-600" /> Suggested Fee</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${['warehouse_to_customer', 'seller_to_customer', 'pickup_station_to_customer', 'warehouse_to_pickup_station'].includes(deliveryType)
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-orange-100 text-orange-700'
                                    }`}>
                                    {['warehouse_to_customer', 'seller_to_customer', 'pickup_station_to_customer', 'warehouse_to_pickup_station'].includes(deliveryType)
                                        ? 'Customer Paid Fee'
                                        : 'Admin Route Fee'}
                                </span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">KES</span>
                                <input
                                    type="number"
                                    value={deliveryFee}
                                    onChange={(e) => setDeliveryFee(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            {(!['warehouse_to_customer', 'seller_to_customer', 'pickup_station_to_customer', 'warehouse_to_pickup_station'].includes(deliveryType)) && (
                                <p className="text-[10px] text-orange-600 mt-1 italic leading-tight">
                                    Uses fixed logistics rate. (Order delivery fee was KES {order.deliveryFee || 0})
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <FaStickyNote className="text-yellow-600" /> Notes
                            </label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Instructions..."
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Driver Selection */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 font-outfit">Select Close Agent</label>
                        <div className="relative">
                            <FaUserTie className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={selectedDriverId}
                                onChange={(e) => setSelectedDriverId(e.target.value)}
                                className={`w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none text-gray-800 font-medium ${loadingAgents ? 'opacity-50' : ''}`}
                                disabled={loadingAgents}
                            >
                                <option value="">{loadingAgents ? 'Calculating distances...' : 'Choose a delivery agent...'}</option>
                                {(() => {
                                    const nearby = [];
                                    const others = [];

                                    agentMatches.forEach(match => {
                                        const { agent, distances } = match;
                                        let dist = null;

                                        // Pickup location determines proximity priority
                                        if (deliveryType.startsWith('seller')) {
                                            dist = distances.agentToSeller;
                                        } else if (deliveryType.startsWith('warehouse') || deliveryType.startsWith('pickup_station')) {
                                            dist = distances.agentToWarehouse;
                                        } else if (deliveryType.startsWith('customer')) {
                                            dist = distances.agentToCustomer;
                                        }

                                        if (dist !== null && dist <= 20) { // Within 20km is "nearby"
                                            nearby.push({ ...match, distLabel: `${dist.toFixed(1)} km` });
                                        } else {
                                            others.push({ ...match, distLabel: dist ? `${dist.toFixed(1)} km` : 'Location unknown' });
                                        }
                                    });

                                    return (
                                        <>
                                            {nearby.length > 0 && (
                                                <optgroup label="Nearby Agents (Proximity Match)">
                                                    {nearby.map(({ agent, distLabel }) => (
                                                        <option 
                                                            key={agent.id} 
                                                            value={agent.id}
                                                            disabled={!agent.isActive || !agent.isComplete}
                                                            className={!agent.isActive || !agent.isComplete ? 'text-gray-400' : ''}
                                                        >
                                                            {agent.name} (Nearby: {distLabel})
                                                            {!agent.isActive ? ' — OFFLINE' : !agent.isComplete ? ' — INCOMPLETE' : !agent.isAvailable ? ' — OUTSIDE SHIFT' : ''}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {others.length > 0 && (
                                                <optgroup label={nearby.length > 0 ? "Other Registered Agents" : "Available Agents"}>
                                                    {others.map(({ agent, distLabel }) => (
                                                        <option 
                                                            key={agent.id} 
                                                            value={agent.id}
                                                            disabled={!agent.isActive || !agent.isComplete}
                                                            className={!agent.isActive || !agent.isComplete ? 'text-gray-400' : ''}
                                                        >
                                                            {agent.name} {distLabel !== 'Location unknown' ? `(${distLabel})` : ''}{!agent.isActive ? ' — OFFLINE' : !agent.isComplete ? ' — INCOMPLETE' : ''}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </>
                                    );
                                })()}
                            </select>
                        </div>
                        {agentMatches.length === 0 && !loadingAgents && (
                            <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
                                <p className="text-xs text-red-600 font-bold flex items-center gap-1">
                                    <FaExclamationCircle /> No Delivery Agents Found
                                </p>
                                <p className="text-[10px] text-red-500 mt-1">
                                    No active delivery agents were found in the system. Please ensure agents are registered and their accounts are not deactivated.
                                </p>
                            </div>
                        )}
                        {agentMatches.length > 0 && Array.isArray(agentMatches) && !agentMatches.some(m => m.distLabel && !m.distLabel.includes('unknown')) && (
                            <p className="mt-2 text-[10px] text-gray-500 flex items-center italic">
                                <FaExclamationCircle className="mr-1 text-yellow-500" /> Proximity data unavailable for some agents.
                            </p>
                        )}
                    </div>
                </div>

                {/* Communication Channel (Only if assigned) */}
                {order.deliveryAgentId && (
                    <div className="pt-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-600 p-1 rounded-md text-[10px]">NEW</span>
                            Communication Follow-up
                        </label>
                        <DeliveryChat
                            orderId={order.id}
                            receiverId={order.deliveryAgentId}
                            receiverName={order.deliveryAgent?.name || 'Assigned Agent'}
                        />
                    </div>
                )}

                <div className="p-6 flex gap-3 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 font-bold text-sm hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    {isAssignmentLocked ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-700">
                            <div className="flex items-center gap-1.5 font-bold text-sm">
                                🔒 Reassignment Locked
                            </div>
                            <div className="text-[10px] text-amber-600 text-center">
                                Agent has {Math.ceil((new Date(activeAssignment.assignedAt).getTime() + 30 * 60 * 1000 - Date.now()) / 60000)} min left to accept
                            </div>
                        </div>
                    ) : (() => {
                        const canSubmit = ['seller_confirmed', 'super_admin_confirmed', 'at_warehouse', 'received_at_warehouse', 'ready_for_pickup'].includes(order.status);
                        const isSubmitDisabled = !selectedDriverId || assigning || !canSubmit;
                        
                        return (
                            <button
                                onClick={handleConfirm}
                                disabled={isSubmitDisabled}
                                className={`flex-1 px-4 py-3 rounded-xl text-white font-bold text-sm shadow-lg transition-all ${isSubmitDisabled
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-200'
                                    }`}
                            >
                                {assigning ? 'Assigning...' : 'Complete Assignment'}
                            </button>
                        );
                    })()}
                </div>

                <AdminPasswordDialog
                    isOpen={isPasswordDialogOpen}
                    onClose={() => setIsPasswordDialogOpen(false)}
                    onConfirm={handlePasswordConfirm}
                    title="Confirm Assignment"
                    actionDescription={`Assigning agent to Order #${order.orderNumber}. This action requires authentication.`}
                />
            </div>
        </div>
    );
};

export default DeliveryAssignmentModal;
