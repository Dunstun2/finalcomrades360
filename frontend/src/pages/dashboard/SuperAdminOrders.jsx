import { useState, useEffect } from 'react'
import { FaBox, FaTruck, FaClock, FaCalendarAlt, FaUser, FaTimes, FaComments } from 'react-icons/fa'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import DeliveryAssignmentModal from '../../components/delivery/DeliveryAssignmentModal'
import DeliveryChat from '../../components/delivery/DeliveryChat'
import LogisticsDestination from '../../components/delivery/LogisticsDestination'
import { getSocket } from '../../services/socket'

export default function SuperAdminOrders() {
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [showMessageModal, setShowMessageModal] = useState(false)
    const [message, setMessage] = useState('')
    const [communicationLog, setCommunicationLog] = useState([])
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [shippingType, setShippingType] = useState('shipped_from_seller')
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
    const [orderToAssign, setOrderToAssign] = useState(null)
    const [activeChat, setActiveChat] = useState(null)
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState('pending')

    const PENDING_STATUSES = [
        'order_placed', 'seller_confirmed', 'en_route_to_warehouse',
        'at_warehouse', 'ready_for_pickup', 'out_for_delivery',
        'processing', 'received_at_warehouse', 'super_admin_confirmed'
    ]
    const COMPLETED_STATUSES = ['delivered', 'failed', 'cancelled', 'returned']

    const filteredRows = rows.filter(order => {
        if (activeTab === 'pending') return PENDING_STATUSES.includes(order.status)
        if (activeTab === 'completed') return COMPLETED_STATUSES.includes(order.status)
        return true
    })

    useEffect(() => {
        let alive = true
        const load = async () => {
            try {
                const res = await api.get('/orders/super-admin-products')
                if (!alive) return
                setRows(res.data || [])
            } catch (e) {
                console.error('Failed to load admin product orders:', e)
            } finally { if (alive) setLoading(false) }
        }
        load()
        return () => { alive = false }
    }, [])

    useEffect(() => {
        const socket = getSocket()
        const handleOrderMessage = (data) => {
            console.log('Received real-time order message (SuperAdmin):', data);
            if (selectedOrder && selectedOrder.id === data.orderId) {
                loadCommunicationLog(data.orderId);
            }
        }
        socket.on('orderMessage', handleOrderMessage)
        return () => {
            socket.off('orderMessage', handleOrderMessage)
        }
    }, [selectedOrder])

    const handleConfirmOrder = async (orderId) => {
        try {
            const res = await api.post(`/orders/${orderId}/seller-confirm`, {
                shippingType,
                message: message || null
            })
            if (res.data.success) {
                setRows(rows.map(order =>
                    order.id === orderId
                        ? { ...order, ...res.data.order }
                        : order
                ))
                setShowConfirmModal(false)
                setMessage('')
                setShippingType('shipped_from_seller')
                alert('Order confirmed successfully!')
            }
        } catch (error) {
            alert('Failed to confirm order: ' + (error.response?.data?.message || error.message))
        }
    }

    const handleWarehouseReceived = async (orderId) => {
        try {
            const res = await api.post(`/orders/${orderId}/warehouse-received`)
            if (res.data.success) {
                setRows(rows.map(order =>
                    order.id === orderId
                        ? { ...order, ...res.data.order }
                        : order
                ))
                alert('Order marked as received at warehouse!')
            }
        } catch (error) {
            alert('Failed to mark received: ' + (error.response?.data?.message || error.message))
        }
    }

    const handleSendMessage = async (orderId) => {
        try {
            const res = await api.post(`/orders/${orderId}/message`, {
                message: message
            })
            if (res.data.success) {
                const newMsg = { sender: 'admin', senderName: 'Me (Admin)', message, timestamp: new Date() }
                setCommunicationLog([...communicationLog, newMsg])
                setMessage('')
            }
        } catch (error) {
            alert('Failed to send message: ' + (error.response?.data?.message || error.message))
        }
    }

    const loadCommunicationLog = async (orderId) => {
        try {
            const res = await api.get(`/orders/${orderId}/communication`)
            if (res.data.success) {
                setCommunicationLog(res.data.communicationLog || [])
            }
        } catch (error) {
            console.error('Failed to load communication log:', error)
            setCommunicationLog([])
        }
    }

    const handleAssignDriver = async (orderId, assignmentData) => {
        try {
            const res = await api.patch(`/orders/${orderId}/assign`, assignmentData)
            if (res.data.success) {
                // Refresh rows to get updated status and task info
                const updatedRes = await api.get('/orders/super-admin-products')
                setRows(updatedRes.data || [])
                alert('Driver assigned successfully')
            }
        } catch (error) {
            alert('Failed: ' + (error.response?.data?.message || error.message))
        }
    }

    const getStatusBadge = (status) => {
        const statusColors = {
            'order_placed': 'bg-yellow-100 text-yellow-800',
            'seller_confirmed': 'bg-blue-100 text-blue-800',
            'en_route_to_warehouse': 'bg-indigo-100 text-indigo-800',
            'received_at_warehouse': 'bg-teal-100 text-teal-800',
            'super_admin_confirmed': 'bg-green-100 text-green-800',
            'processing': 'bg-purple-100 text-purple-800',
            'ready_for_pickup': 'bg-sky-100 text-sky-800',
            'out_for_delivery': 'bg-orange-100 text-orange-800',
            'delivered': 'bg-green-600 text-white',
            'failed': 'bg-red-600 text-white',
            'cancelled': 'bg-red-100 text-red-800',
            'returned': 'bg-gray-100 text-gray-800'
        }
        return statusColors[status] || 'bg-gray-100 text-gray-800'
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-semibold mb-4 text-secondary">My Sales Management (Admin Added Items)</h1>

            <div className="flex gap-4 mb-6 border-b">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`pb-2 px-1 font-medium text-sm transition-colors relative ${activeTab === 'pending' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Pending Sales
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`pb-2 px-1 font-medium text-sm transition-colors relative ${activeTab === 'completed' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Completed Sales
                </button>
            </div>

            {loading ? (
                <div className="text-gray-600">Loading...</div>
            ) : filteredRows.length === 0 ? (
                <div className="bg-white p-4 text-gray-600 rounded-lg shadow">No {activeTab} sales found.</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-gray-700">
                            <tr>
                                <th className="text-left p-3">Order #</th>
                                <th className="text-left p-3">Status</th>
                                <th className="text-right p-3">Items</th>
                                <th className="text-right p-3">Earnings (KES)</th>
                                <th className="text-left p-3">Date</th>
                                <th className="text-left p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.map(o => (
                                <tr key={o.id} className="border-t hover:bg-gray-50">
                                    <td className="p-3 font-medium">#{o.orderNumber}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(o.status)}`}>
                                            {o.status.replace(/_/g, ' ').toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">{(o.OrderItems || []).reduce((a, b) => a + (b.quantity || 0), 0)}</td>
                                    <td className="p-3 text-right font-semibold text-blue-600">KES {o.sellerTotal?.toLocaleString()}</td>
                                    <td className="p-3 text-gray-500">{new Date(o.createdAt).toLocaleString()}</td>
                                    <td className="p-3">
                                        <div className="flex gap-2">
                                            {o.status === 'order_placed' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedOrder(o)
                                                        setShippingType('shipped_from_seller')
                                                        setShowConfirmModal(true)
                                                    }}
                                                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                                                >
                                                    Confirm
                                                </button>
                                            )}
                                            {/* Manual Receipt button removed to enforce code-based entry */}
                                            {(o.status === 'seller_confirmed' || o.status === 'super_admin_confirmed') && o.shippingType === 'collected_from_seller' && (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await api.patch(`/orders/${o.id}/status`, { status: 'en_route_to_warehouse' })
                                                            setRows(rows.map(order => order.id === o.id ? { ...order, status: 'en_route_to_warehouse' } : order))
                                                        } catch (e) { alert('Failed to update status') }
                                                    }}
                                                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                                >
                                                    Pick Up
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setSelectedOrder(o)
                                                    setShowMessageModal(true)
                                                    loadCommunicationLog(o.id)
                                                }}
                                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                            >
                                                Chat
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedOrder(o)
                                                    setShowDetailsModal(true)
                                                }}
                                                className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                                            >
                                                Details
                                            </button>
                                            {['order_placed', 'seller_confirmed', 'super_admin_confirmed', 'en_route_to_warehouse', 'at_warehouse', 'ready_for_pickup', 'returned', 'failed', 'cancelled'].includes(o.status) && (
                                                <button
                                                    onClick={() => {
                                                        setOrderToAssign(o);
                                                        setIsAssignModalOpen(true);
                                                    }}
                                                    disabled={!o.sellerConfirmed && !['cancelled', 'failed', 'at_warehouse', 'ready_for_pickup', 'returned'].includes(o.status)}
                                                    className={`px-3 py-1 text-white text-xs rounded transition-colors inline-flex items-center gap-1 ${(!o.sellerConfirmed && !['cancelled', 'failed', 'at_warehouse', 'ready_for_pickup', 'returned'].includes(o.status)) ? 'bg-gray-400 cursor-not-allowed opacity-70' : 'bg-blue-600 hover:bg-blue-700'}`}
                                                    title={(!o.sellerConfirmed && !['cancelled', 'failed', 'at_warehouse', 'ready_for_pickup', 'returned'].includes(o.status)) ? "Awaiting Seller Confirmation" : "Assign Driver"}
                                                >
                                                    <FaTruck className="h-3 w-3" /> Assign
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Driver Assignment Modal */}
            <DeliveryAssignmentModal
                isOpen={isAssignModalOpen}
                order={orderToAssign}
                onClose={() => {
                    setIsAssignModalOpen(false);
                    setOrderToAssign(null);
                }}
                onAssign={handleAssignDriver}
            />

            {/* Confirm Order Modal */}
            {showConfirmModal && selectedOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-4">Confirm Order #{selectedOrder.orderNumber}</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2 text-gray-700">Logistics Method:</label>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 border p-3 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                                    <input
                                        type="radio"
                                        name="shippingType"
                                        value="shipped_from_seller"
                                        checked={shippingType === 'shipped_from_seller'}
                                        onChange={(e) => setShippingType(e.target.value)}
                                        className="text-blue-600"
                                    />
                                    <div>
                                        <div className="font-medium text-gray-900">Normal Shipment</div>
                                        <div className="text-xs text-gray-500">Item will be picked up by agent or dropped off at hub</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2 text-gray-700">Internal Note (Optional):</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                rows="3"
                                placeholder="Logistics notes..."
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleConfirmOrder(selectedOrder.id)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                Confirm & Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Overlay Modal */}
            {activeChat && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
                        <div className="relative">
                            <button
                                onClick={() => setActiveChat(null)}
                                className="absolute top-3 right-4 z-10 p-1.5 bg-white/80 hover:bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm transition-colors border border-gray-100"
                            >
                                <FaTimes size={16} />
                            </button>
                            <DeliveryChat
                                orderId={activeChat.orderId}
                                receiverId={activeChat.receiverId}
                                receiverName={activeChat.receiverName}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Old Message Modal (Removed redundant parts, keeping logic for simple logging if needed elsewhere but updating to use Chat) */}
            {showMessageModal && selectedOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="flex justify-between items-center mb-4 border-b pb-4">
                            <h3 className="text-lg font-semibold">Communication Log - Order #{selectedOrder.orderNumber}</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setShowMessageModal(false);
                                        setActiveChat({
                                            orderId: selectedOrder.id,
                                            receiverId: selectedOrder.sellerId,
                                            receiverName: `Seller (${selectedOrder.seller?.name || 'Unknown'})`
                                        });
                                    }}
                                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                                >
                                    <FaComments /> Open Live Chat
                                </button>
                                <button onClick={() => setShowMessageModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto mb-4 border rounded-lg p-3 bg-gray-50 min-h-[300px]">
                            {communicationLog.length === 0 ? (
                                <p className="text-gray-500 text-center italic mt-20">No logs for this order.</p>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {communicationLog.map((msg, index) => {
                                        const isAdmin = msg.sender === 'admin' || msg.senderRole === 'admin' || msg.senderRole === 'super_admin';
                                        return (
                                            <div key={index} className={`max-w-[85%] p-3 rounded-lg border shadow-sm ${isAdmin ? 'bg-blue-50 self-end ml-auto' : 'bg-white self-start'}`}>
                                                <div className="flex justify-between items-baseline gap-4 mb-1 border-b pb-1">
                                                    <span className={`text-xs font-bold ${isAdmin ? 'text-blue-600' : 'text-gray-700'}`}>{msg.senderName || msg.sender}</span>
                                                    <span className="text-[10px] text-gray-400">{new Date(msg.timestamp).toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm text-gray-800 pt-1">{msg.message}</p>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Add log/message..."
                                onKeyDown={(e) => e.key === 'Enter' && message.trim() && handleSendMessage(selectedOrder.id)}
                            />
                            <button
                                onClick={() => handleSendMessage(selectedOrder.id)}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                disabled={!message.trim()}
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Details Modal */}
            {showDetailsModal && selectedOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Order Details #{selectedOrder.orderNumber}</h3>
                                <p className="text-sm text-gray-500">Placed on {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-900 text-2xl">&times;</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <h4 className="font-bold text-gray-900 border-l-4 border-blue-600 pl-3">Order Information</h4>
                                <div className="mt-4">
                                    <LogisticsDestination order={selectedOrder} />
                                </div>
                                <div className="mt-4 space-y-3">
                                    <p className="text-sm"><strong>Current Status:</strong> {selectedOrder.status.replace(/_/g, ' ').toUpperCase()}</p>
                                    <p className="text-sm"><strong>Total Items:</strong> {(selectedOrder.OrderItems || []).reduce((a, b) => a + (b.quantity || 0), 0)}</p>
                                    <p className="text-sm font-bold mt-2 text-blue-700">Earnings: KES {selectedOrder.sellerTotal?.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <h4 className="font-semibold text-gray-700 mb-2">Logistics</h4>
                                <p className="text-sm"><strong>Seller Confirmed:</strong> {selectedOrder.sellerConfirmed ? 'YES' : 'NO'}</p>
                                <p className="text-sm"><strong>Shipping Type:</strong> {selectedOrder.shippingType || 'Not Set'}</p>
                            </div>
                        </div>

                        {/* Status Lifecycle */}
                        <div className="mb-8 border-t pt-6">
                            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                Status Lifecycle
                            </h4>
                            {(() => {
                                const isFastFoodOnlyOrder = (order) => {
                                    return (order.OrderItems || []).every(item => !!item.FastFoodId);
                                };
                                const fastFoodOnly = isFastFoodOnlyOrder(selectedOrder);
                                const hideWarehouseStep = selectedOrder.adminRoutingStrategy === 'direct_delivery' || fastFoodOnly;
                                const lifecycleSteps = [
                                    { label: 'Placed', status: 'order_placed', done: true },
                                    { label: 'Admin Confirmed', status: 'super_admin_confirmed', done: selectedOrder.superAdminConfirmed },
                                    { label: 'Seller Confirmed', status: 'seller_confirmed', done: selectedOrder.sellerConfirmed },
                                    { label: 'At Warehouse', status: 'at_warehouse', done: !!selectedOrder.warehouseArrivalDate || ['at_warehouse', 'received_at_warehouse', 'ready_for_pickup', 'in_transit', 'delivered', 'completed'].includes(selectedOrder.status) },
                                    { label: 'In Transit', status: 'in_transit', done: ['in_transit', 'delivered', 'completed'].includes(selectedOrder.status) },
                                    { label: 'Delivered', status: 'delivered', done: ['delivered', 'completed'].includes(selectedOrder.status) },
                                    { label: 'Complete', status: 'completed', done: selectedOrder.status === 'completed' }
                                ];
                                const steps = hideWarehouseStep
                                    ? lifecycleSteps.filter((step) => step.status !== 'at_warehouse')
                                    : lifecycleSteps;

                                return (
                                    <div className="flex flex-wrap gap-4 items-start justify-between relative before:absolute before:h-0.5 before:bg-gray-100 before:top-4 before:left-0 before:right-0 before:-z-10">
                                        {steps.map((step, idx) => (
                                            <div key={idx} className="flex flex-col items-center gap-1 bg-white px-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step.done ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>
                                                    {step.done ? '✓' : idx + 1}
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase tracking-tighter ${step.done ? 'text-green-700' : 'text-gray-400'}`}>{step.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>

                        <h4 className="font-bold text-gray-900 mb-4 text-lg">Items List</h4>
                        <div className="space-y-3">
                            {(selectedOrder.OrderItems || []).map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-4 border rounded-xl hover:shadow-md transition-shadow">
                                    <div>
                                        <h5 className="font-bold text-gray-900">{item.itemLabel || item.name}</h5>
                                        <p className="text-sm text-gray-500">Quantity: <span className="font-medium text-gray-900">{item.quantity}</span></p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-blue-600 text-lg">
                                            KES {((item.Product?.basePrice || item.FastFood?.basePrice || 0) * item.quantity).toLocaleString()}
                                        </p>
                                        <p className="text-[10px] text-gray-400">
                                            KES {(item.Product?.basePrice || item.FastFood?.basePrice || 0).toLocaleString()} per unit
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="px-8 py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-colors font-bold shadow-lg"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
