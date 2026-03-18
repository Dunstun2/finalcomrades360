import React, { useState } from 'react';
import { FaBox, FaTimes, FaMapMarkerAlt, FaStickyNote } from 'react-icons/fa';
import { formatPrice } from '../../utils/currency';

export default function CollectionConfirmationModal({ isOpen, task, onClose, onConfirm }) {
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm(task.id, notes);
            setNotes('');
            onClose();
        } catch (error) {
            console.error('Failed to confirm collection:', error);
            alert('Failed to confirm collection. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !task) return null;

    // Determine delivery type label
    const getDeliveryTypeLabel = () => {
        switch (task.deliveryType) {
            case 'warehouse_to_customer': return 'Warehouse to Customer';
            case 'seller_to_customer': return 'Seller to Customer (Direct)';
            case 'seller_to_warehouse': return 'Seller to Warehouse';
            case 'seller_to_pickup_station': return 'Seller to Pickup Station';
            case 'customer_to_warehouse': return 'Customer to Warehouse (Return)';
            default: return task.deliveryType?.replace(/_/g, ' ') || 'Unknown';
        }
    };

    // Standardize items access (handle OrderItems, order_items, etc)
    const items = task.order?.OrderItems || task.order?.order_items || task.order?.items || [];
    const persistedRouteFee = Number(task.deliveryFee ?? task.order?.deliveryFee ?? 0) || 0;
    const persistedShare = Number(task.agentShare);
    const fallbackShare = Number.isFinite(persistedShare) && persistedShare > 0 ? persistedShare : 70;
    const persistedAgentEarningsValue = Number(task.agentEarnings);
    const persistedAgentEarnings = Number.isFinite(persistedAgentEarningsValue) && persistedAgentEarningsValue > 0
        ? persistedAgentEarningsValue
        : (persistedRouteFee * (fallbackShare / 100));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <FaBox className="text-blue-600" />
                        Confirm Collection
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={loading}>
                        <FaTimes />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3">
                        <p className="text-sm font-bold text-blue-900">Order: #{task.order?.orderNumber || 'N/A'}</p>
                        <p className="text-xs text-blue-700 mt-1">Delivery Type: {getDeliveryTypeLabel()}</p>

                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Logistics Type</span>
                            <span className="font-bold text-blue-600 uppercase">{task.deliveryType?.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Gross Delivery Fee (Route)</span>
                            <span className="font-bold text-gray-900">{formatPrice(persistedRouteFee)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Agent Earning (Persisted)</span>
                            <div className="text-right">
                                <span className="text-lg font-bold text-green-600 block">
                                    {formatPrice(persistedAgentEarnings)}
                                </span>
                                <span className="text-[10px] text-gray-400">Read from delivery task in database</span>
                            </div>
                        </div>
                    </div>

                    {/* Order Items Table */}
                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-3 py-2 border-b">
                            <h4 className="text-sm font-bold text-gray-700">Items to Collect</h4>
                        </div>
                        <div className="overflow-x-auto">
                            {items.length > 0 ? (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs font-semibold text-gray-500 uppercase bg-gray-50 border-b">
                                            <th className="px-3 py-2 text-left">Item</th>
                                            <th className="px-3 py-2 text-center">Qty</th>
                                            <th className="px-3 py-2 text-right">Subtotal</th>
                                            <th className="px-3 py-2 text-right whitespace-nowrap">
                                                Delivery Fee
                                                <span className="block font-normal normal-case text-gray-400">(per unit)</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {items.map((item, index) => {
                                            const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                                            const itemFee = Number(item.deliveryFee || item.delivery_fee || 0);
                                            return (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="px-3 py-2">
                                                        <p className="font-medium text-gray-900">{item.name}</p>
                                                        {item.itemLabel && (
                                                            <p className="text-xs text-gray-400 mt-0.5">{item.itemLabel}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-gray-700">{item.quantity}</td>
                                                    <td className="px-3 py-2 text-right font-medium text-gray-900">
                                                        KSh {lineTotal.toLocaleString()}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-blue-700 font-medium">
                                                        {itemFee > 0
                                                            ? `KSh ${itemFee.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                                                            : <span className="text-gray-400">—</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-50 border-t font-semibold text-sm">
                                            <td className="px-3 py-2 text-gray-700" colSpan={2}>Totals</td>
                                            <td className="px-3 py-2 text-right text-gray-900">
                                                KSh {(task.order?.total || 0).toLocaleString()}
                                            </td>
                                            <td className="px-3 py-2 text-right text-blue-700">
                                                {formatPrice(persistedRouteFee)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            ) : (
                                <div className="px-3 py-4 text-center text-sm text-gray-500">
                                    No items listed
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pickup & Delivery Locations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pickup Point</p>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <FaMapMarkerAlt className="text-blue-600" />
                                </div>
                                <div className="text-sm text-gray-800">
                                    {task.deliveryType === 'warehouse_to_customer' && (
                                        <>
                                            <p className="font-bold">📦 {task.order?.warehouse?.name || 'Main Warehouse'}</p>
                                            <p className="text-xs text-gray-600 mt-1">
                                                {task.order?.warehouse?.address || task.pickupLocation || 'Warehouse location'}
                                            </p>
                                            {task.order?.warehouse?.landmark && (
                                                <p className="text-xs text-blue-600 mt-1 font-medium">📍 {task.order.warehouse.landmark}</p>
                                            )}
                                            {task.order?.warehouse?.contactPhone && (
                                                <p className="text-xs text-green-600 mt-1 font-medium">📞 {task.order.warehouse.contactPhone}</p>
                                            )}
                                        </>
                                    )}
                                    {(task.deliveryType === 'seller_to_customer' || task.deliveryType === 'seller_to_warehouse') && (
                                        <>
                                            <p className="font-bold">🏪 {task.order?.seller?.name || 'Seller'}'s Store</p>
                                            <p className="text-xs text-gray-600 mt-1">
                                                {task.order?.seller?.businessAddress || task.pickupLocation || 'Seller location'}
                                            </p>
                                            {(task.order?.seller?.businessLandmark || task.order?.seller?.landmark) && (
                                                <p className="text-xs text-blue-600 mt-1 font-medium">📍 {task.order.seller.businessLandmark || task.order.seller.landmark}</p>
                                            )}
                                            {(task.order?.seller?.businessPhone || task.order?.seller?.phone) && (
                                                <p className="text-xs text-green-600 mt-1 font-medium">📞 {task.order.seller.businessPhone || task.order.seller.phone}</p>
                                            )}
                                        </>
                                    )}
                                    {task.deliveryType === 'customer_to_warehouse' && (
                                        <>
                                            <p className="font-bold">👤 Customer Pickup</p>
                                            <p className="text-xs text-gray-600 mt-1">
                                                {task.pickupLocation || task.order?.deliveryAddress || 'Pickup address'}
                                            </p>
                                            {task.order?.user?.phone && (
                                                <p className="text-xs text-green-600 mt-1 font-medium">📞 {task.order.user.phone}</p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Delivery Destination</p>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <FaMapMarkerAlt className="text-green-600" />
                                </div>
                                <div className="text-sm text-gray-800">
                                    {(task.deliveryType === 'seller_to_warehouse' || task.deliveryType === 'seller_to_pickup_station') ? (
                                        <>
                                            {task.deliveryType === 'seller_to_warehouse' ? (
                                                <>
                                                    <p className="font-bold">🏢 {task.order?.DestinationWarehouse?.name || task.order?.Warehouse?.name || task.order?.warehouse?.name || 'Warehouse Hub'}</p>
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        {task.order?.DestinationWarehouse?.address || task.order?.Warehouse?.address || task.order?.warehouse?.address || 'Warehouse location'}
                                                    </p>
                                                    {(task.order?.DestinationWarehouse?.landmark || task.order?.Warehouse?.landmark || task.order?.warehouse?.landmark) && (
                                                        <p className="text-xs text-blue-600 mt-1 font-medium">📍 {task.order?.DestinationWarehouse?.landmark || task.order?.Warehouse?.landmark || task.order?.warehouse?.landmark}</p>
                                                    )}
                                                    {(task.order?.DestinationWarehouse?.contactPhone || task.order?.Warehouse?.contactPhone || task.order?.warehouse?.contactPhone) && (
                                                        <p className="text-xs text-green-600 mt-1 font-medium">📞 {task.order?.DestinationWarehouse?.contactPhone || task.order?.Warehouse?.contactPhone || task.order?.warehouse?.contactPhone}</p>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <p className="font-bold">🏪 {task.order?.DestinationPickStation?.name || task.order?.PickupStation?.name || 'Pickup Station'}</p>
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        {task.order?.DestinationPickStation?.location || task.order?.PickupStation?.location || 'Station location'}
                                                    </p>
                                                    {(task.order?.DestinationPickStation?.landmark || task.order?.PickupStation?.landmark) && (
                                                        <p className="text-xs text-blue-600 mt-1 font-medium">📍 {task.order?.DestinationPickStation?.landmark || task.order?.PickupStation?.landmark}</p>
                                                    )}
                                                    {(task.order?.DestinationPickStation?.contactPhone || task.order?.PickupStation?.contactPhone) && (
                                                        <p className="text-xs text-green-600 mt-1 font-medium">📞 {task.order?.DestinationPickStation?.contactPhone || task.order?.PickupStation?.contactPhone}</p>
                                                    )}
                                                </>
                                            )}
                                            <div className="mt-2 text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full inline-block font-bold">
                                                🔐 Customer Privacy Active
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <p className="font-bold">👤 {task.order?.user?.name || 'Customer'}</p>
                                            <p className="text-xs text-gray-600 mt-1">
                                                {task.deliveryLocation || task.order?.deliveryAddress || 'Delivery Address'}
                                            </p>
                                            {task.order?.user?.phone && (
                                                <p className="text-xs text-green-600 mt-1 font-medium">📞 {task.order.user.phone}</p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <FaStickyNote className="text-gray-400" />
                            Collection Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g., Package condition, special instructions, customer requests..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows="3"
                            disabled={loading}
                        />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800">
                            <strong>⚠️ Important:</strong> Verify all items listed above are present before confirming collection.
                            The order status will be automatically updated.
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 p-4 border-t bg-gray-50 sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                Confirming...
                            </span>
                        ) : (
                            'Confirm Collection'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
