import React, { useState, useEffect } from 'react';
import { FaBox, FaCheckCircle, FaTimes, FaExclamationTriangle, FaSearch, FaWarehouse } from 'react-icons/fa';
import api from '../../services/api';
import HandoverCodeWidget from './HandoverCodeWidget';

export default function WarehouseReceiptModal({ isOpen, onClose, selectedOrderIds, onComplete }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmedItems, setConfirmedItems] = useState({}); // { orderId: { itemId: boolean } }
    const [warehouseId, setWarehouseId] = useState('');
    const [warehouses, setWarehouses] = useState([]);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && selectedOrderIds.length > 0) {
            fetchOrderDetails();
            fetchWarehouses();
        }
    }, [isOpen, selectedOrderIds]);

    const fetchOrderDetails = async () => {
        try {
            setLoading(true);
            const ordersData = [];
            for (const id of selectedOrderIds) {
                const response = await api.get(`/orders/${id}`);
                ordersData.push(response.data);
            }
            setOrders(ordersData);

            // Initialize all items as unconfirmed (or auto-confirm if you prefer, but requirement says "confirmed to have arrived")
            const initialConfirmed = {};
            ordersData.forEach(order => {
                initialConfirmed[order.id] = {};
                (order.OrderItems || []).forEach(item => {
                    initialConfirmed[order.id][item.id] = false;
                });
            });
            setConfirmedItems(initialConfirmed);
        } catch (error) {
            console.error('Failed to fetch order details for receipt:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWarehouses = async () => {
        try {
            const response = await api.get('/admin/warehouses');
            setWarehouses(response.data || []);
            if (response.data?.length > 0) {
                setWarehouseId(response.data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch warehouses:', error);
        }
    };

    const toggleItem = (orderId, itemId) => {
        setConfirmedItems(prev => ({
            ...prev,
            [orderId]: {
                ...prev[orderId],
                [itemId]: !prev[orderId][itemId]
            }
        }));
    };

    const toggleAllInOrder = (orderId, value) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        const newItems = {};
        (order.OrderItems || []).forEach(item => {
            newItems[item.id] = value;
        });
        setConfirmedItems(prev => ({
            ...prev,
            [orderId]: newItems
        }));
    };

    const toggleAllEverything = (value) => {
        const newConfirmed = {};
        orders.forEach(order => {
            newConfirmed[order.id] = {};
            (order.OrderItems || []).forEach(item => {
                newConfirmed[order.id][item.id] = value;
            });
        });
        setConfirmedItems(newConfirmed);
    };

    const handleSubmit = async () => {
        // Check if every selected order has at least one item confirmed
        // Or if we should only process fully confirmed orders? 
        // Usually, in bulk receipt, we want to confirm what arrived.
        const partiallyConfirmed = orders.filter(o => {
            const items = Object.values(confirmedItems[o.id] || {});
            return items.some(v => v);
        });

        if (partiallyConfirmed.length === 0) {
            alert('Please confirm at least one item has arrived.');
            return;
        }

        if (!warehouseId) {
            alert('Please select a receiving warehouse.');
            return;
        }

        try {
            setSubmitting(true);

            // Prepare notes about what was verified
            const verificationSummary = orders.map(o => {
                const totalItems = (o.OrderItems || []).length;
                const verifiedCount = Object.values(confirmedItems[o.id] || {}).filter(v => v).length;
                return `Order ${o.orderNumber}: ${verifiedCount}/${totalItems} items verified.`;
            }).join('\n');

            const finalNotes = notes ? `${notes}\n\nVerification:\n${verificationSummary}` : `Verification:\n${verificationSummary}`;

            await api.post('/orders/bulk-warehouse-received', {
                orderIds: partiallyConfirmed.map(o => o.id),
                warehouseId,
                notes: finalNotes
            });

            alert(`Successfully processed receipt for ${partiallyConfirmed.length} orders.`);
            onComplete();
            onClose();
        } catch (error) {
            alert('Failed to process warehouse receipt: ' + (error.response?.data?.error || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-700 to-blue-800 p-6 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <FaWarehouse className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black">Bulk Warehouse Receipt</h2>
                            <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Verifying {selectedOrderIds.length} Shipments</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <FaTimes className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase">Receiving Hub</label>
                            <select
                                value={warehouseId}
                                onChange={(e) => setWarehouseId(e.target.value)}
                                className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-colors"
                                disabled={loading}
                            >
                                <option value="">Select Warehouse</option>
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>{w.name} - {w.location}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase">Receiving Notes</label>
                            <input
                                type="text"
                                placeholder="Scanner issues, partial delivery notes, etc."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-colors"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Handover code confirmation — warehouse enters agent's code per order */}
                    {orders.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Handover Code Confirmation</p>
                            {orders.map(order => {
                                const task = (order.deliveryTasks || [])[0];
                                if (!task) return null;
                                return (
                                    <div key={order.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                                        <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Order #{order.orderNumber}</p>
                                        <HandoverCodeWidget
                                            mode="receiver"
                                            handoverType={order.shippingType === 'shipped_from_seller' ? 'seller_to_warehouse' : 'agent_to_warehouse'}
                                            orderId={order.id}
                                            taskId={task?.id}
                                            onConfirmed={() => {
                                                // Auto-verify all items in this order when code confirmed
                                                toggleAllInOrder(order.id, true);
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <h3 className="font-black text-gray-800 flex items-center gap-2">
                            <FaBox className="text-indigo-500" />
                            Item Verification Checklist
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => toggleAllEverything(true)}
                                className="text-[10px] font-black uppercase text-indigo-600 hover:underline"
                            >
                                Verify All Items
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                                onClick={() => toggleAllEverything(false)}
                                className="text-[10px] font-black uppercase text-gray-400 hover:underline"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            <p className="text-sm font-black text-gray-400 animate-pulse">Loading order Manifests...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orders.map(order => (
                                <div key={order.id} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-b border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-black tracking-tighter">
                                                {order.orderNumber}
                                            </span>
                                            <span className="text-xs font-bold text-gray-600">{order.seller?.businessName || 'Seller ID: ' + order.sellerId}</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const allVerified = (order.OrderItems || []).every(item => confirmedItems[order.id]?.[item.id]);
                                                toggleAllInOrder(order.id, !allVerified);
                                            }}
                                            className="text-[10px] font-black text-indigo-600 uppercase hover:bg-white px-3 py-1 rounded-full border border-indigo-100 transition-colors"
                                        >
                                            Toggle Order
                                        </button>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {(order.OrderItems || []).map(item => (
                                            <div
                                                key={item.id}
                                                onClick={() => toggleItem(order.id, item.id)}
                                                className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${confirmedItems[order.id]?.[item.id] ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}
                                            >
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${confirmedItems[order.id]?.[item.id] ? 'bg-green-600 border-green-600 shadow-md scale-110' : 'border-gray-200 bg-white'}`}>
                                                    {confirmedItems[order.id]?.[item.id] && <FaCheckCircle className="text-white text-[10px]" />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-sm font-bold ${confirmedItems[order.id]?.[item.id] ? 'text-green-900 line-through decoration-green-300' : 'text-gray-800'}`}>
                                                        {item.itemLabel || item.name}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Qty: {item.quantity}</p>
                                                </div>
                                                {confirmedItems[order.id]?.[item.id] && (
                                                    <span className="text-[9px] font-black text-green-600 uppercase bg-white px-2 py-1 rounded-full border border-green-100 shadow-sm transition-all animate-in zoom-in">
                                                        Item Verified
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
                    <div className="hidden sm:block">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                            Total Progress: {Object.values(confirmedItems).reduce((sum, orderItems) => sum + Object.values(orderItems).filter(v => v).length, 0)} / {Object.values(confirmedItems).reduce((sum, orderItems) => sum + Object.values(orderItems).length, 0)} Items
                        </p>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-xl text-sm font-black hover:bg-gray-100 transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || loading || !warehouseId}
                            className="flex-1 sm:flex-none px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Finalizing...
                                </>
                            ) : (
                                <>
                                    <FaCheckCircle /> Finalize Batch Receipt
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
