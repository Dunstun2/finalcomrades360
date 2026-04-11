import React from 'react';
import { FaArrowRight, FaMapMarkerAlt, FaWarehouse, FaUser, FaStore } from 'react-icons/fa';

/**
 * LogisticsDestination Component
 * 
 * Displays the "From" and "To" destinations based on the order's current delivery status.
 * 
 * @param {Object} order - The order object with associations (User, seller, warehouse)
 * @param {Boolean} condensed - If true, show a more compact version for tables
 */
const LogisticsDestination = ({ order, condensed = false }) => {
    if (!order) return null;

    const status = order.status;
    const deliveryType = order.deliveryType;
    const customer = order.user || order.User;
    const seller = order.seller || order.Seller;
    const warehouse = order.warehouse || order.Warehouse;
    const pickStation = order.PickupStation || order.pickupStation;

    // Determine "From" and "To" based on status
    let fromLabel = "Origin";
    let fromName = "N/A";
    let fromIcon = <FaStore />;

    let toLabel = "Destination";
    let toName = "N/A";
    let toIcon = <FaUser />;

    // Initial leg: Seller to Warehouse/Station
    const isEarlyStage = ['order_placed', 'seller_confirmed', 'super_admin_confirmed', 'en_route_to_warehouse', 'assigned', 'accepted', 'arrived_at_pickup', 'request_pending', 'requested'].includes(status);
    
    // Middle stage: Physically at a hub
    const isAtHub = ['at_warehouse', 'at_warehouse', 'at_pick_station'].includes(status);

    // Final leg: Moving toward customer
    const isFinalLeg = ['ready_for_pickup', 'awaiting_delivery_assignment', 'in_transit', 'in_transit', 'delivered', 'completed'].includes(status);

    // Default determination based on status + routing
    const routing = order.adminRoutingStrategy;
    
    const isFirstLeg = isEarlyStage || (isAtHub && routing === 'warehouse' && status === 'at_warehouse' && !order.warehouseArrivalDate);
    const isSecondLeg = isAtHub || isFinalLeg;

    if (isFirstLeg) {
        fromLabel = "From Seller";
        fromName = seller?.businessName || seller?.name || order.sellerName || "Seller";
        fromIcon = <FaStore className="text-orange-500" />;

        if (routing === 'warehouse') {
            toLabel = "To Hub/Warehouse";
            toName = warehouse?.name || "Warehouse Hub";
            toIcon = <FaWarehouse className="text-blue-500" />;
        } else if (routing === 'pick_station' || routing === 'fastfood_pickup_point') {
            toLabel = "To Pick Station";
            toName = pickStation?.name || order.DestinationPickStation?.name || "Pickup Point";
            toIcon = <FaStore className="text-blue-500" />;
        } else {
            toLabel = "To Customer";
            toName = order.customerName || customer?.name || "Customer";
            toIcon = <FaUser className="text-green-500" />;
        }
    } else if (isAtHub || isFinalLeg) {
        if (routing === 'warehouse') {
            fromLabel = "From Hub/Warehouse";
            fromName = warehouse?.name || "Warehouse Hub";
            fromIcon = <FaWarehouse className="text-blue-500" />;
        } else if (routing === 'pick_station' || routing === 'fastfood_pickup_point') {
            fromLabel = "From Pick Station";
            fromName = pickStation?.name || "Pickup Point";
            fromIcon = <FaStore className="text-blue-500" />;
        } else {
            fromLabel = "From Seller";
            fromName = seller?.businessName || seller?.name || "Seller";
            fromIcon = <FaStore className="text-orange-500" />;
        }

        if (order.deliveryMethod === 'pick_station') {
            toLabel = "To Pick Station";
            toName = pickStation?.name || order.DestinationPickStation?.name || "Pickup Point";
            toIcon = <FaMapMarkerAlt className="text-green-500" />;
        } else {
            toLabel = "To Customer";
            toName = order.customerName || customer?.name || "Customer";
            toIcon = <FaUser className="text-green-500" />;
        }
    }

    // Overrides for specific delivery types (Administrative/Logistics routes)
    if (deliveryType === 'warehouse_to_pickup_station') {
        fromLabel = "From Warehouse";
        fromName = warehouse?.name || "Warehouse";
        fromIcon = <FaWarehouse className="text-blue-500" />;
        toLabel = "To Pick Station";
        toName = pickStation?.name || "Station";
        toIcon = <FaMapMarkerAlt className="text-green-500" />;
    } else if (deliveryType === 'pickup_station_to_customer') {
        fromLabel = "From Pick Station";
        fromName = pickStation?.name || "Station";
        fromIcon = <FaMapMarkerAlt className="text-blue-500" />;
        toLabel = "To Customer";
        toName = order.customerName || customer?.name || "Customer";
        toIcon = <FaUser className="text-green-500" />;
    } else if (deliveryType === 'pickup_station_to_warehouse') {
        fromLabel = "From Pick Station";
        fromName = pickStation?.name || "Station";
        fromIcon = <FaMapMarkerAlt className="text-orange-500" />;
        toLabel = "To Warehouse";
        toName = warehouse?.name || "Warehouse";
        toIcon = <FaWarehouse className="text-blue-500" />;
    } else if (deliveryType === 'seller_to_customer') {
        fromLabel = "From Seller";
        fromName = seller?.name || "Seller";
        fromIcon = <FaStore className="text-orange-500" />;
        toLabel = "To Customer";
        toName = order.customerName || customer?.name || "Customer";
        toIcon = <FaUser className="text-green-500" />;
    }

    if (condensed) {
        return (
            <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-800">
                    <span className="truncate max-w-[100px]" title={fromName}>{fromName}</span>
                    <FaArrowRight className="text-gray-300 text-[8px]" />
                    <span className="truncate max-w-[100px]" title={toName}>{toName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[8px] text-gray-400 font-medium">
                    <span className="truncate max-w-[80px]">{warehouse?.address || pickStation?.location || "Address pending"}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex flex-col gap-3">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-full shadow-sm text-xs">
                    {fromIcon}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold leading-tight">{fromLabel}</p>
                    <p className="text-sm font-bold text-gray-800 leading-tight truncate">{fromName}</p>
                    {isFirstLeg && seller?.businessAddress && (
                        <p className="text-[10px] text-gray-500 truncate">{seller.businessAddress}</p>
                    )}
                    {isSecondLeg && !isFirstLeg && (warehouse?.address || pickStation?.location) && (
                        <p className="text-[10px] text-gray-500 truncate">{warehouse?.address || pickStation?.location}</p>
                    )}
                </div>
            </div>

            <div className="ml-4 border-l-2 border-dashed border-gray-200 h-2 my-[-8px]"></div>

            <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-full shadow-sm text-xs">
                    {toIcon}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold leading-tight">{toLabel}</p>
                    <p className="text-sm font-bold text-gray-800 leading-tight truncate">{toName}</p>
                    {isFirstLeg && (warehouse?.address || pickStation?.location) && (
                        <p className="text-[10px] text-gray-500 truncate">{warehouse?.address || pickStation?.location}</p>
                    )}
                    {isSecondLeg && !isFirstLeg && order.deliveryAddress && (
                        <p className="text-[10px] text-gray-500 truncate">{order.deliveryAddress}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LogisticsDestination;
