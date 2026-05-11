import React, { useState, useEffect, useRef } from 'react'
import { FaBox, FaTruck, FaClock, FaCalendarAlt, FaUser, FaTimes, FaComments, FaUtensils, FaCog } from 'react-icons/fa'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/use-toast'
import DeliveryAssignmentModal from '../../components/delivery/DeliveryAssignmentModal'
import DeliveryChat from '../../components/delivery/DeliveryChat'
import LogisticsDestination from '../../components/delivery/LogisticsDestination'
import { getSocket } from '../../services/socket'
import { buildOrderLifecycleSteps } from '../../utils/orderLifecycle'
import { resolveImageUrl, FALLBACK_IMAGE } from '../../utils/imageUtils'

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
    const [activeTab, setActiveTab] = useState('pending')
    const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 })
    const [currentPage, setCurrentPage] = useState(1)
    const [expandedOrderId, setExpandedOrderId] = useState(null)
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [sellerSettings, setSellerSettings] = useState({
        autoConfirmFastFood: false,
        autoConfirmProducts: false,
        defaultProductShippingType: 'collected_from_seller'
    })
    const [isSavingSettings, setIsSavingSettings] = useState(false)
    const [selectedOrderIds, setSelectedOrderIds] = useState([])
    const { user } = useAuth()
    const { toast } = useToast()
    const pageSize = 15

    const PENDING_STATUSES = [
        'order_placed', 'seller_confirmed', 'en_route_to_warehouse',
        'at_warehouse', 'ready_for_pickup', 'in_transit',
        'processing', 'super_admin_confirmed'
    ]
    const COMPLETED_STATUSES = ['delivered', 'failed', 'cancelled']
    const FINALIZED_STATUSES = ['completed']
    const RETURN_STATUSES = [
        'return_approved', 'return_at_pick_station', 'return_in_transit', 
        'return_at_warehouse', 'returned', 'return_rejected'
    ]

    useEffect(() => {
        let alive = true
        const load = async (showLoading = true) => {
            try {
                if (showLoading) setLoading(true)
                
                let statuses = ''
                if (activeTab === 'pending') statuses = PENDING_STATUSES.join(',')
                else if (activeTab === 'completed') statuses = COMPLETED_STATUSES.join(',')
                else if (activeTab === 'finalized') statuses = FINALIZED_STATUSES.join(',')
                else if (activeTab === 'returns') statuses = RETURN_STATUSES.join(',')

                const res = await api.get(`/orders/super-admin-products?status=${statuses}&page=${currentPage}&pageSize=${pageSize}`)
                if (!alive) return
                
                const dataObj = res.data
                setRows(dataObj.data || [])
                setMeta(dataObj.meta || { total: 0, page: 1, totalPages: 1 })
                setSelectedOrderIds([]) // Clear selection on load
            } catch (e) {
                console.error('Failed to load admin product orders:', e)
                toast({ title: 'Error', description: 'Failed to load orders', variant: 'destructive' })
            } finally { if (alive && showLoading) setLoading(false) }
        }
        
        load()
        fetchSellerSettings()
        
        return () => { alive = false }
    }, [activeTab, currentPage])

    const toggleOrderSelection = (id) => {
        setSelectedOrderIds(prev => 
            prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
        )
    }

    const toggleAllSelection = () => {
        const confirmableRows = rows.filter(r => r.status === 'order_placed')
        if (selectedOrderIds.length === confirmableRows.length && confirmableRows.length > 0) {
            setSelectedOrderIds([])
        } else {
            setSelectedOrderIds(confirmableRows.map(r => r.id))
        }
    }

    const handleBulkConfirm = async () => {
        if (!selectedOrderIds.length) return
        try {
            const res = await api.post('/orders/bulk-seller-confirm', {
                orderIds: selectedOrderIds,
                shippingType
            })
            if (res.data.success) {
                toast({ title: 'Bulk Success', description: `Confirmed ${res.data.results.success.length} orders.` })
                setSelectedOrderIds([])
                // Refresh list
                const statuses = activeTab === 'pending' ? PENDING_STATUSES.join(',') : COMPLETED_STATUSES.join(',')
                const updatedRes = await api.get(`/orders/super-admin-products?status=${statuses}&page=${currentPage}&pageSize=${pageSize}`)
                setRows(updatedRes.data.data || [])
            }
        } catch (error) {
            toast({ title: 'Bulk Error', description: error.message, variant: 'destructive' })
        }
    }

    const fetchSellerSettings = async () => {
        try {
            const res = await api.get('/auth/me')
            if (res.data) {
                setSellerSettings({
                    autoConfirmFastFood: res.data.autoConfirmFastFood || false,
                    autoConfirmProducts: res.data.autoConfirmProducts || false,
                    defaultProductShippingType: res.data.defaultProductShippingType || 'collected_from_seller'
                })
            }
        } catch (err) {
            console.error('Failed to fetch seller settings:', err)
        }
    }

    const handleSaveSettings = async (newSettings) => {
        try {
            setIsSavingSettings(true)
            const res = await api.patch('/seller/settings', newSettings)
            if (res.data.success) {
                setSellerSettings(res.data.settings)
                setShowSettingsModal(false)
                toast({ title: 'Settings Saved', description: 'Your logistics preferences have been updated.' })
            }
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.error || err.message, variant: 'destructive' })
        } finally {
            setIsSavingSettings(false)
        }
    }

    useEffect(() => {
        const socket = getSocket()
        const handleOrderMessage = (data) => {
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
                        ? { ...order, sellerConfirmed: true, status: 'seller_confirmed' }
                        : order
                ))
                setShowConfirmModal(false)
                setMessage('')
                toast({ title: 'Success', description: 'Order confirmed successfully!' })
            }
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || error.message, variant: 'destructive' })
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
                toast({ title: 'Success', description: 'Driver assigned successfully' })
                // Refresh list
                const statuses = activeTab === 'pending' ? PENDING_STATUSES.join(',') : COMPLETED_STATUSES.join(',')
                const updatedRes = await api.get(`/orders/super-admin-products?status=${statuses}&page=${currentPage}&pageSize=${pageSize}`)
                setRows(updatedRes.data.data || [])
            }
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || error.message, variant: 'destructive' })
        }
    }

    const getOrderItemImage = (item) => {
        if (!item) return null;
        if (item.FastFood || item.fastFood) {
            const f = item.FastFood || item.fastFood;
            return f.mainImage || f.image || f.coverImage;
        }
        if (item.Product || item.product) {
            const p = item.Product || item.product;
            const firstImage = (imgField) => {
                if (!imgField) return null;
                if (Array.isArray(imgField)) return imgField[0];
                if (typeof imgField === 'string' && imgField.startsWith('[')) {
                    try { return JSON.parse(imgField)[0]; } catch (e) { return null; }
                }
                return imgField;
            };
            return p.coverImage || p.mainImage || firstImage(p.images) || firstImage(p.galleryImages) || p.image;
        }
        return item.image || item.imageUrl || null;
    }

    const getStatusBadge = (status) => {
        const badges = {
            'order_placed': 'bg-amber-100 text-amber-700 border border-amber-200',
            'seller_confirmed': 'bg-blue-100 text-blue-700 border border-blue-200',
            'super_admin_confirmed': 'bg-indigo-100 text-indigo-700 border border-indigo-200',
            'processing': 'bg-purple-100 text-purple-700 border border-purple-200',
            'en_route_to_warehouse': 'bg-cyan-100 text-cyan-700 border border-cyan-200',
            'at_warehouse': 'bg-teal-100 text-teal-700 border border-teal-200',
            'ready_for_pickup': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
            'in_transit': 'bg-sky-100 text-sky-700 border border-sky-200',
            'delivered': 'bg-green-100 text-green-700 border border-green-200',
            'cancelled': 'bg-red-100 text-red-700 border border-red-200',
            'failed': 'bg-rose-100 text-rose-700 border border-rose-200',
            'return_approved': 'bg-pink-100 text-pink-700 border border-pink-200',
            'return_at_pick_station': 'bg-pink-100 text-pink-700 border border-pink-200',
            'return_in_transit': 'bg-pink-100 text-pink-700 border border-pink-200',
            'return_at_warehouse': 'bg-pink-100 text-pink-700 border border-pink-200',
            'returned': 'bg-pink-200 text-pink-800 border border-pink-300',
            'return_rejected': 'bg-gray-100 text-gray-700 border border-gray-200'
        }
        return badges[status] || 'bg-gray-100 text-gray-700'
    }



    return (
        <div className="w-full min-h-[1000px] flex flex-col p-4 sm:p-6 relative">
            <div className="flex justify-between items-center mb-6 gap-4">
                <div className="flex-1">
                    <h1 className="text-[clamp(1.1rem,4vw,1.8rem)] font-black text-gray-800 leading-tight">My Sales Management</h1>

                </div>
                <button
                    onClick={() => setShowSettingsModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-[clamp(0.65rem,1.8vw,0.75rem)] font-black text-gray-700 shadow-sm hover:bg-gray-50 transition-all active:scale-95 whitespace-nowrap"
                >
                    <FaCog className="text-gray-400" />
                    <span className="hidden xs:inline">Logistics Settings</span>
                    <span className="xs:hidden">Settings</span>
                </button>
            </div>

            {/* Bulk Action Bar */}
            {selectedOrderIds.length > 0 && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 duration-300 border border-white/10 backdrop-blur-xl">
                    <div className="flex flex-col">
                        <span className="text-lg font-black">{selectedOrderIds.length} Selected</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bulk Actions Available</span>
                    </div>
                    <div className="h-8 w-px bg-white/20"></div>
                    <div className="flex gap-3">
                        <button 
                            onClick={handleBulkConfirm}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-xl text-xs font-black uppercase transition-all active:scale-95 shadow-lg shadow-green-900/20"
                        >
                            Confirm All
                        </button>
                        <button 
                            onClick={() => setSelectedOrderIds([])}
                            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex space-x-2 sm:space-x-4 mb-6 border-b border-gray-200 overflow-x-auto no-scrollbar">
                {[
                    { id: 'pending', label: 'Pending Sales' },
                    { id: 'completed', label: 'Delivered Sales' },
                    { id: 'finalized', label: 'Finalized Sales' },
                    { id: 'returns', label: 'Returns', color: 'pink' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                        className={`pb-2 px-1 text-[clamp(0.65rem,2.2vw,0.875rem)] font-black transition-all uppercase tracking-tight whitespace-nowrap ${activeTab === tab.id ? `border-b-2 border-${tab.color || 'blue'}-600 text-${tab.color || 'blue'}-600` : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[900px]">
                <div className="overflow-x-auto pb-4">
                    <table className="w-full table-fixed text-sm">
                        <thead className="bg-gray-50 text-gray-700">
                            <tr>
                                <th className="p-1.5 sm:p-3 w-[12%]">
                                    {activeTab === 'pending' && rows.some(r => r.status === 'order_placed') && (
                                        <input 
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={selectedOrderIds.length > 0 && selectedOrderIds.length === rows.filter(r => r.status === 'order_placed').length}
                                            onChange={toggleAllSelection}
                                        />
                                    )}
                                </th>
                                <th className="text-left p-1.5 sm:p-3 font-black uppercase tracking-wider text-[9px] w-[53%] md:w-[30%]">Order #</th>
                                <th className="text-left p-1.5 sm:p-3 font-black uppercase tracking-wider text-[9px] w-[35%] md:w-[20%]">Status</th>
                                <th className="hidden md:table-cell text-right p-1.5 sm:p-3 font-black uppercase tracking-wider text-[9px] md:w-[20%]">Earnings</th>
                                <th className="hidden md:table-cell text-left p-1.5 sm:p-3 font-black uppercase tracking-wider text-[9px] md:w-[20%]">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                                            <span className="text-xs font-bold animate-pulse text-blue-600 uppercase tracking-widest">Loading Sales...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-gray-400 font-bold italic text-sm">No {activeTab} sales found.</td>
                                </tr>
                            ) : (
                                rows.map(o => {
                                    const isExpanded = expandedOrderId === o.id;
                                    const isSelected = selectedOrderIds.includes(o.id);
                                    const itemCount = (o.OrderItems || []).reduce((a, b) => a + (b.quantity || 0), 0);
                                    return (
                                        <React.Fragment key={o.id}>
                                            <tr 
                                                className={`border-t hover:bg-gray-50 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/30' : ''} ${isSelected ? 'bg-blue-50/50' : ''}`}
                                                onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                                            >
                                                <td className="p-1.5 sm:p-3" onClick={e => e.stopPropagation()}>
                                                    {o.status === 'order_placed' && (
                                                        <input 
                                                            type="checkbox" 
                                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            checked={isSelected}
                                                            onChange={() => toggleOrderSelection(o.id)}
                                                        />
                                                    )}
                                                </td>
                                                <td className="p-1.5 sm:p-3 min-w-0">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className={`flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                                                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                                        </span>
                                                        <span className="font-black text-gray-900 text-[11px] truncate">{o.orderNumber}</span>
                                                    </div>
                                                </td>
                                                <td className="p-1.5 sm:p-3 whitespace-nowrap">
                                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${getStatusBadge(o.status)}`}>
                                                                        {o.status.replace(/_/g, ' ')}
                                                                    </span>
                                                                </td>
                                                                <td className="hidden md:table-cell p-1.5 sm:p-3 text-right font-black text-blue-600 whitespace-nowrap">KES {Number(o.sellerTotal || 0).toLocaleString()}</td>
                                                                <td className="hidden md:table-cell p-1.5 sm:p-3 text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">{new Date(o.createdAt).toLocaleString()}</td>
                                                            </tr>
                                                            {isExpanded && (
                                                                <tr className="bg-blue-50/20 border-b-2 border-blue-100">
                                                                    <td colSpan="5" className="p-1.5 sm:p-4">
                                                        <div className="sticky left-0 w-[calc(100vw-20px)] sm:w-full ml-0">
                                                            <div className="bg-white rounded-2xl border border-blue-100 shadow-xl p-4 sm:p-6 animate-in slide-in-from-top-4 duration-300">
                                                                <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-100">
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Earnings</p>
                                                                        <p className="text-lg font-black text-blue-600">KES {Number(o.sellerTotal || 0).toLocaleString()}</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Order Date</p>
                                                                        <p className="text-[11px] font-black text-gray-900 uppercase">{new Date(o.createdAt).toLocaleDateString()}</p>
                                                                        <p className="text-[9px] font-bold text-gray-400">{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="flex justify-between items-center mb-6">
                                                                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Ordered Items ({itemCount})</h4>
                                                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ref: {o.orderNumber}</span>
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                                                    {(o.OrderItems || []).map((item) => (
                                                                        <div key={item.id} className="flex items-start gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-blue-200 transition-colors">
                                                                            <div className="w-14 h-14 bg-white rounded-xl overflow-hidden border border-gray-100 flex-shrink-0 shadow-sm mt-0.5">
                                                                                <img
                                                                                    src={resolveImageUrl(getOrderItemImage(item))}
                                                                                    alt={item.name}
                                                                                    className="w-full h-full object-cover"
                                                                                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                                                                                />
                                                                            </div>
                                                                            <div className="min-w-0 flex-1">
                                                                                <p className="text-sm font-black text-gray-900 leading-tight mb-1">{item.itemLabel || item.name || item.Product?.name || item.FastFood?.name}</p>
                                                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Qty: {item.quantity} × KES {Number(item.Product?.basePrice || item.FastFood?.basePrice || 0).toLocaleString()}</p>
                                                                                <p className="text-sm font-black text-blue-600 mt-1">KES {Number((item.Product?.basePrice || item.FastFood?.basePrice || 0) * item.quantity).toLocaleString()}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Actions Section */}
                                                                <div className="pt-6 border-t border-gray-100">
                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Available Actions</p>
                                                                    <div className="flex flex-row gap-1.5 sm:gap-3">
                                                                        {o.status === 'order_placed' && (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); setShippingType('shipped_from_seller'); setShowConfirmModal(true); }}
                                                                                className="flex-1 min-w-0 px-1 py-2.5 bg-green-600 text-white text-[9px] xs:text-[10px] font-black uppercase rounded-xl shadow-md hover:bg-green-700 active:scale-95 transition-all flex flex-col xs:flex-row items-center justify-center gap-1"
                                                                            >
                                                                                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                                                <span className="truncate">Confirm</span>
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); setActiveChat({ orderId: o.id, receiverId: o.sellerId, receiverName: "Admin Sales" }); }}
                                                                            className="flex-1 min-w-0 px-1 py-2.5 bg-blue-600 text-white text-[9px] xs:text-[10px] font-black uppercase rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition-all flex flex-col xs:flex-row items-center justify-center gap-1"
                                                                        >
                                                                            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                                                            <span className="truncate">Chat</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); setShowDetailsModal(true); }}
                                                                            className="flex-1 min-w-0 px-1 py-2.5 bg-gray-600 text-white text-[9px] xs:text-[10px] font-black uppercase rounded-xl shadow-md hover:bg-gray-700 active:scale-95 transition-all flex flex-col xs:flex-row items-center justify-center gap-1"
                                                                        >
                                                                            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                            <span className="truncate">Details</span>
                                                                        </button>
                                                                        {['order_placed', 'seller_confirmed', 'super_admin_confirmed', 'en_route_to_warehouse', 'at_warehouse', 'ready_for_pickup'].includes(o.status) && (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); setOrderToAssign(o); setIsAssignModalOpen(true); }}
                                                                                className="flex-1 min-w-0 px-1 py-2.5 bg-blue-500 text-white text-[9px] xs:text-[10px] font-black uppercase rounded-xl shadow-md hover:bg-blue-600 active:scale-95 transition-all flex flex-col xs:flex-row items-center justify-center gap-1"
                                                                            >
                                                                                <FaTruck size={12} className="flex-shrink-0" />
                                                                                <span className="truncate">Assign</span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {meta.totalPages > 1 && (
                    <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Page {meta.page} of {meta.totalPages} • Total {meta.total} Sales</span>
                        <div className="flex gap-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                                className="px-4 py-1 bg-white border rounded-lg text-xs font-bold disabled:opacity-50 active:scale-95 transition-all"
                            >
                                Previous
                            </button>
                            <button
                                disabled={currentPage === meta.totalPages}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                className="px-4 py-1 bg-white border rounded-lg text-xs font-bold disabled:opacity-50 active:scale-95 transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals - These stay largely the same but with UI tweaks for consistency */}
            <DeliveryAssignmentModal
                isOpen={isAssignModalOpen}
                order={orderToAssign}
                onClose={() => { setIsAssignModalOpen(false); setOrderToAssign(null); }}
                onAssign={handleAssignDriver}
            />

            {/* Logistics Settings Modal */}
            {showSettingsModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-gray-900">Admin Sales Settings</h3>
                            <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><FaTimes /></button>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div>
                                    <p className="text-sm font-black text-gray-900">Auto-Confirm FastFood</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Confirm fries/food orders instantly</p>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={sellerSettings.autoConfirmFastFood}
                                    onChange={e => setSellerSettings({...sellerSettings, autoConfirmFastFood: e.target.checked})}
                                    className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                            </div>
                            
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div>
                                    <p className="text-sm font-black text-gray-900">Auto-Confirm Products</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Confirm generic products instantly</p>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={sellerSettings.autoConfirmProducts}
                                    onChange={e => setSellerSettings({...sellerSettings, autoConfirmProducts: e.target.checked})}
                                    className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button 
                                onClick={() => setShowSettingsModal(false)}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 text-xs font-black uppercase rounded-2xl hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => handleSaveSettings(sellerSettings)}
                                disabled={isSavingSettings}
                                className="flex-1 py-3 bg-blue-600 text-white text-xs font-black uppercase rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isSavingSettings ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Modal */}
            {activeChat && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="font-black text-gray-900">Chat with Customer</h3>
                            <button onClick={() => setActiveChat(null)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
                        </div>
                        <DeliveryChat 
                            orderId={activeChat.orderId} 
                            receiverId={activeChat.receiverId} 
                            receiverName={activeChat.receiverName} 
                        />
                    </div>
                </div>
            )}

            {/* Confirm Order Modal */}
            {showConfirmModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-black mb-6">Confirm Order #{selectedOrder.orderNumber}</h3>
                        <div className="mb-6">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Shipping Type</label>
                            <select 
                                value={shippingType}
                                onChange={e => setShippingType(e.target.value)}
                                className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="shipped_from_seller">Normal Shipment (Pickup/Dropoff)</option>
                                <option value="collected_from_seller">Direct Pickup by Logistics</option>
                            </select>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-700 text-xs font-black uppercase rounded-2xl">Cancel</button>
                            <button onClick={() => handleConfirmOrder(selectedOrder.id)} className="flex-1 py-4 bg-green-600 text-white text-xs font-black uppercase rounded-2xl shadow-lg shadow-green-200">Confirm Order</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
                        <button onClick={() => setShowDetailsModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"><FaTimes size={20}/></button>
                        
                        <div className="mb-8">
                            <h3 className="text-2xl font-black text-gray-900">Order #{selectedOrder.orderNumber}</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Placed on {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">Customer Info</h4>
                                <p className="text-sm font-black text-gray-900">{selectedOrder.user?.name}</p>
                                <p className="text-xs font-bold text-blue-700 mt-1">{selectedOrder.user?.phone}</p>
                                <div className="mt-4 pt-4 border-t border-blue-100">
                                    <p className="text-[9px] font-black text-blue-600 uppercase mb-1">Delivery Address</p>
                                    <p className="text-xs font-bold text-gray-700 leading-relaxed">{selectedOrder.deliveryAddress}</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Earnings</h4>
                                <p className="text-3xl font-black text-blue-600">KES {Number(selectedOrder.sellerTotal || 0).toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase mt-2">Status: {selectedOrder.status.replace(/_/g, ' ')}</p>
                            </div>
                        </div>

                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Order Items</h4>
                        <div className="space-y-3 mb-8">
                            {(selectedOrder.OrderItems || []).map(item => (
                                <div key={item.id} className="flex items-center justify-between p-4 border rounded-2xl bg-white shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl overflow-hidden border">
                                            <img src={resolveImageUrl(getOrderItemImage(item))} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900">{item.itemLabel || item.name}</p>
                                            <p className="text-[10px] text-gray-500 font-bold">Qty: {item.quantity}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-black text-blue-600">KES {Number(item.total || 0).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={() => setShowDetailsModal(false)}
                            className="w-full py-4 bg-gray-900 text-white text-xs font-black uppercase rounded-2xl shadow-xl active:scale-95 transition-all"
                        >
                            Close Details
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
