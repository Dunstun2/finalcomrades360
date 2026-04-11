import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import { FaTruck, FaUserTie, FaClock, FaCheckCircle, FaTimesCircle, FaExclamationCircle, FaRoute, FaEye, FaPhone, FaMapMarkerAlt, FaEnvelope, FaBoxOpen, FaInfoCircle } from 'react-icons/fa';
import { formatPrice } from '../../utils/currency';
import Dialog from '../../components/Dialog';
import { getSocket, joinAdminRoom } from '../../services/socket';

const DeliveryRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modal, setModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });
    const [processingId, setProcessingId] = useState(null);
    const [rejectModal, setRejectModal] = useState({ isOpen: false, request: null, reason: '' });
    const [agentShare, setAgentShare] = useState(80); // Default 80%
    const [selectedIds, setSelectedIds] = useState([]);
    const [viewingRequest, setViewingRequest] = useState(null);
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    const [isBulkRejectModalOpen, setIsBulkRejectModalOpen] = useState(false);
    const [bulkRejectReason, setBulkRejectReason] = useState('Admin rejected requests');
    const [autoApprove, setAutoApprove] = useState(false);
    const [isConfigLoading, setIsConfigLoading] = useState(false);
    const inFlightFetchRef = useRef(false);
    const lastFetchAtRef = useRef(0);
    const inFlightApproveRef = useRef(new Set());

    const fetchRequests = useCallback(async (showLoading = true, force = false) => {
        const now = Date.now();
        if (!force && inFlightFetchRef.current) return;
        if (!force && !showLoading && now - lastFetchAtRef.current < 1500) return;

        try {
            inFlightFetchRef.current = true;
            lastFetchAtRef.current = now;
            if (showLoading) setLoading(true);
            const res = await api.get('/delivery/requests');
            setRequests(res.data || []);
            setError(null);
        } catch (err) {
            console.error('Failed to load requests:', err);
            setError('Failed to load delivery requests.');
        } finally {
            inFlightFetchRef.current = false;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests(true, true);
        fetchLogisticConfig();
        joinAdminRoom();

        // Socket.IO listeners for real-time updates
        const socket = getSocket();
        const handleNewRequest = (data) => {
            console.log('🔔 New delivery request received:', data);
            fetchRequests(false);
        };
        socket.on('deliveryRequestUpdate', handleNewRequest);

        // Polling every 30 seconds as fallback
        const interval = setInterval(() => {
            fetchRequests(false);
        }, 30000);

        // Fetch finance config
        api.get('/finance/config')
            .then(res => {
                if (res.data?.agentShare) setAgentShare(res.data.agentShare);
            })
            .catch(err => console.error('Failed to load finance config', err));

        return () => {
            socket.off('deliveryRequestUpdate', handleNewRequest);
            clearInterval(interval);
        };
    }, [fetchRequests]);

    const fetchLogisticConfig = async () => {
        try {
            const res = await api.get('/admin/config/logistic_settings');
            if (res.data?.success && res.data.data) {
                setAutoApprove(!!res.data.data.autoApproveRequests);
            }
        } catch (err) {
            console.error('Failed to fetch logistic config:', err);
        }
    };

    const toggleAutoApprove = async () => {
        try {
            setIsConfigLoading(true);
            const newValue = !autoApprove;
            
            // Fetch current to avoid overwriting other sub-keys
            const currentRes = await api.get('/admin/config/logistic_settings');
            const currentData = currentRes.data?.data || {};
            
            const updatedData = {
                ...currentData,
                autoApproveRequests: newValue
            };

            await api.post('/admin/config/logistic_settings', { value: updatedData });
            setAutoApprove(newValue);
            
            setModal({
                isOpen: true,
                type: 'success',
                title: 'Settings Updated',
                message: `Auto-approval is now ${newValue ? 'ENABLED' : 'DISABLED'}.`
            });
        } catch (err) {
            console.error('Failed to update auto-approve setting:', err);
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Update Failed',
                message: 'Could not update auto-approve setting.'
            });
        } finally {
            setIsConfigLoading(false);
        }
    };

    /**
     * Derive the correct deliveryType based on the order's current routing state.
     * Mirrors getProvisionalDeliveryType() in deliveryController.js.
     */
    const resolveDeliveryType = (order, taskType) => {
        if (!order) return taskType || 'seller_to_customer';
        const status = order.status;
        const routing = order.adminRoutingStrategy;
        const method = order.deliveryMethod;

        if (routing === 'direct_delivery') return 'seller_to_customer';

        if (routing === 'warehouse') {
            const hubStage = ['at_warehouse', 'at_warehouse'];
            const isTerminalTask = taskType?.includes('_to_customer');
            if (hubStage.includes(status) || (status === 'in_transit' && isTerminalTask)) {
                return method === 'pick_station' ? 'warehouse_to_pickup_station' : 'warehouse_to_customer';
            }
            if (status === 'en_route_to_warehouse' || (status === 'in_transit' && !isTerminalTask)) {
                return 'seller_to_warehouse';
            }
            if (['en_route_to_pick_station', 'at_pick_station', 'ready_for_pickup'].includes(status)) {
                return method === 'home_delivery' ? 'pickup_station_to_customer' : 'warehouse_to_pickup_station';
            }
            return 'seller_to_warehouse';
        }

        if (routing === 'pick_station') {
            if (['awaiting_delivery_assignment', 'in_transit', 'ready_for_pickup'].includes(status)) {
                return 'pickup_station_to_customer';
            }
            return 'seller_to_pickup_station';
        }

        if (routing === 'fastfood_pickup_point') return 'fastfood_pickup_point';

        return taskType || 'seller_to_customer';
    };

    /**
     * Approves the delivery request directly using the new approval endpoint
     */
    const confirmApprove = async (request) => {
        if (!request?.id) return;
        if (inFlightApproveRef.current.has(request.id)) return;
        try {
            inFlightApproveRef.current.add(request.id);
            setProcessingId(request.id);

            // Re-derive deliveryType from the order's current state (same logic as backend)
            const resolvedType = resolveDeliveryType(request.order, request.deliveryType);

            const approvalData = {
                deliveryType: resolvedType,
                deliveryFee: request.order?.deliveryFee,
                notes: 'Approved by admin'
            };

            await api.post(`/admin/delivery/requests/${request.id}/approve`, approvalData);

            setModal({
                isOpen: true,
                type: 'success',
                title: 'Request Approved',
                message: `Delivery request approved successfully. The agent has been notified.`
            });
            // Remove approved request from list
            setRequests(prev => prev.filter(r => r.id !== request.id));
        } catch (err) {
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Approval Failed',
                message: err.response?.data?.error || err.response?.data?.message || err.message
            });
        } finally {
            inFlightApproveRef.current.delete(request.id);
            setProcessingId(null);
        }
    };

    const confirmReject = (request) => {
        setRejectModal({ isOpen: true, request, reason: 'Admin rejected request' });
    };

    const handleReject = async () => {
        const { request, reason } = rejectModal;
        if (!request || !reason) return;

        try {
            setProcessingId(request.id);
            await api.post(`/admin/delivery/requests/${request.id}/reject`, { reason });

            setModal({
                isOpen: true,
                type: 'success',
                title: 'Request Rejected',
                message: 'Request has been rejected.'
            });
            setRequests(prev => prev.filter(r => r.id !== request.id));
        } catch (err) {
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Rejection Failed',
                message: err.response?.data?.error || err.message
            });
        } finally {
            setProcessingId(null);
            setRejectModal({ isOpen: false, request: null, reason: '' });
        }
    };

    const closeModal = () => setModal({ ...modal, isOpen: false });

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        setSelectedIds(prev => prev.length === requests.length ? [] : requests.map(r => r.id));
    };

    const handleBulkApprove = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Are you sure you want to approve ${selectedIds.length} requests?`)) return;

        try {
            setIsBulkProcessing(true);
            const res = await api.post('/admin/delivery/requests/bulk-approve', { taskIds: selectedIds });

            setModal({
                isOpen: true,
                type: 'success',
                title: 'Bulk Approval Success',
                message: `Successfully approved ${res.data.approvedIds?.length || selectedIds.length} requests.`
            });
            setRequests(prev => prev.filter(r => !selectedIds.includes(r.id)));
            setSelectedIds([]);
        } catch (err) {
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Bulk Approval Failed',
                message: err.response?.data?.error || err.message
            });
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const handleBulkReject = async () => {
        if (selectedIds.length === 0 || !bulkRejectReason.trim()) return;

        try {
            setIsBulkProcessing(true);
            await api.post('/admin/delivery/requests/bulk-reject', { taskIds: selectedIds, reason: bulkRejectReason });

            setModal({
                isOpen: true,
                type: 'success',
                title: 'Bulk Rejection Success',
                message: `Successfully rejected ${selectedIds.length} requests.`
            });
            setRequests(prev => prev.filter(r => !selectedIds.includes(r.id)));
            setSelectedIds([]);
            setIsBulkRejectModalOpen(false);
        } catch (err) {
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Bulk Rejection Failed',
                message: err.response?.data?.error || err.message
            });
        } finally {
            setIsBulkProcessing(false);
        }
    };

    /**
     * Detail Modal for a single request
     */
    const RequestDetailModal = ({ request, onClose }) => {
        if (!request) return null;
        const order = request.order;
        const agent = request.deliveryAgent;

        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col transform transition-all animate-in fade-in zoom-in duration-300">
                    {/* Header */}
                    <div className="p-8 border-b flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 font-outfit tracking-tight">Request Details</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Order #{order?.orderNumber}</span>
                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                <span className="text-xs text-blue-600 font-black uppercase tracking-widest">Requested {new Date(request.createdAt).toLocaleDateString()} @ {new Date(request.createdAt).toLocaleTimeString()}</span>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-3 hover:bg-red-50 rounded-2xl transition-all text-gray-400 hover:text-red-500 hover:rotate-90 duration-300"
                        >
                            <FaTimesCircle size={28} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Order Section */}
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">
                                    <FaBoxOpen className="text-blue-400" /> Order Information
                                </h4>
                                <div className="bg-blue-50/30 p-5 rounded-[2rem] border border-blue-100 shadow-sm space-y-4">
                                    <div className="flex justify-between items-center bg-white/60 p-3 rounded-2xl">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</span>
                                        <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-blue-200">
                                            {order?.status?.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Value</span>
                                        <span className="text-lg font-black text-gray-900">{formatPrice(order?.total)}</span>
                                    </div>
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Delivery Fee</span>
                                        <span className="font-black text-gray-900">{formatPrice(order?.deliveryFee)}</span>
                                    </div>
                                    <div className="pt-4 border-t border-blue-100/50">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-3 ml-2">Shipment Contents</p>
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                            {order?.OrderItems?.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-4 text-xs bg-white p-3 rounded-2xl border border-blue-50 shadow-sm hover:border-blue-200 transition-colors group">
                                                    <div className="w-8 h-8 bg-blue-50 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1 font-bold text-gray-700 truncate">{item.name || 'Product Item'}</div>
                                                    <div className="px-2 py-1 bg-gray-50 rounded-lg font-black text-gray-900">x{item.quantity || 1}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Agent Section */}
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">
                                    <FaUserTie className="text-orange-400" /> Agent Profile
                                </h4>
                                <div className="bg-orange-50/30 p-6 rounded-[2rem] border border-orange-100 shadow-sm space-y-6">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-[1.5rem] flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-orange-200">
                                            {agent?.name ? agent.name[0].toUpperCase() : '?'}
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900 text-xl tracking-tight leading-none mb-1">{agent?.name}</p>
                                            <p className="text-[10px] text-orange-600 font-black uppercase tracking-widest bg-orange-100/50 px-2 py-0.5 rounded-full w-fit">
                                                {agent?.businessName || 'Elite Partner'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-3 pt-2">
                                        <a href={`tel:${agent?.phone}`} className="flex items-center gap-3 text-sm text-gray-700 bg-white/70 hover:bg-white p-3 rounded-2xl border border-transparent hover:border-orange-200 transition-all shadow-sm">
                                            <FaPhone className="text-orange-400" size={14} /> 
                                            <span className="font-bold">{agent?.phone}</span>
                                        </a>
                                        <div className="flex items-center gap-3 text-sm text-gray-700 bg-white/70 p-3 rounded-2xl">
                                            <FaEnvelope className="text-gray-400" size={14} /> 
                                            <span className="font-medium truncate">{agent?.email}</span>
                                        </div>
                                        {agent?.deliveryProfile?.location && (
                                            <div className="flex items-center gap-3 text-xs text-blue-700 font-black bg-blue-50/50 p-3 rounded-2xl border border-blue-100">
                                                <FaMapMarkerAlt className="text-blue-400" size={14} /> 
                                                <span>LIVE: {agent.deliveryProfile.location}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 shadow-sm text-center">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Your Split ({agentShare}%)</p>
                                        <p className="text-2xl font-black text-green-600 tracking-tight">
                                            {formatPrice((parseFloat(order?.deliveryFee || 0) * (agentShare / 100)))}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Route Section */}
                        <div className="space-y-4">
                            <h4 className="flex items-center gap-2 text-[10px] font-black text-purple-500 uppercase tracking-[0.2em]">
                                <FaRoute className="text-purple-400" /> Fulfillment Strategy
                            </h4>
                            <div className="bg-purple-50/30 p-8 rounded-[2.5rem] border border-purple-100 shadow-sm">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-4">
                                        <div className="space-y-1 ml-2">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Customer Contact</p>
                                            <p className="text-lg font-black text-gray-900">{order?.user?.name || 'Guest User'}</p>
                                        </div>
                                        <a href={`tel:${order?.user?.phone}`} className="flex items-center gap-2.5 text-xs font-black text-purple-700 bg-white hover:bg-purple-50 py-2.5 px-4 rounded-2xl border border-purple-100 w-fit transition-all shadow-sm">
                                            <FaPhone size={12} /> {order?.user?.phone || 'Private Number'}
                                        </a>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Destination Address</p>
                                        <div className="p-4 bg-white rounded-[1.5rem] border border-purple-100 shadow-sm flex items-start gap-3">
                                            <FaMapMarkerAlt className="text-purple-300 mt-1" />
                                            <p className="text-xs text-gray-700 leading-relaxed font-bold">
                                                {order?.deliveryAddress || (order?.deliveryMethod === 'pick_station' ? `Station: ${order?.pickStation}` : 'Standard Address')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-10 grid grid-cols-2 gap-4">
                                    <div className="p-5 bg-white/60 rounded-3xl border border-purple-200/50">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Admin Strategy</p>
                                        <p className="text-xs font-black text-purple-800 uppercase bg-purple-100 px-3 py-1.5 rounded-xl w-fit border border-purple-200">
                                            {order?.adminRoutingStrategy?.replace(/_/g, ' ') || 'STANDARD'}
                                        </p>
                                    </div>
                                    <div className="p-5 bg-white/60 rounded-3xl border border-indigo-200/50 text-right">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Specific Leg</p>
                                        <p className="text-xs font-black text-indigo-800 uppercase bg-indigo-100 px-3 py-1.5 rounded-xl w-fit ml-auto border border-indigo-200">
                                            {request.deliveryType?.replace(/_/g, ' ') || 'LAST MILE'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t bg-gray-50 flex flex-col sm:flex-row justify-end gap-3 px-10">
                        <button
                            onClick={() => confirmReject(request)}
                            className="px-8 py-3.5 bg-white border-2 border-red-100 text-red-500 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] hover:bg-red-50 hover:border-red-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <FaTimesCircle /> Reject Request
                        </button>
                        <button
                            onClick={() => confirmApprove(request)}
                            disabled={processingId === request?.id}
                            className="px-12 py-3.5 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-gray-200 flex items-center justify-center gap-2"
                        >
                            {processingId === request?.id ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <FaCheckCircle className="text-green-400" />} Approve & Dispatch
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500 font-medium">Loading requests...</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-32">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 font-outfit tracking-tight">Delivery Requests</h1>
                    <p className="text-gray-500 text-sm mt-1">Gating and approving active agent self-assignments. {requests.length} pending.</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Auto-Approve Toggle */}
                    <div className="flex items-center gap-3 bg-white border border-gray-200 px-5 py-2 rounded-2xl shadow-sm">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Auto-Approve</span>
                            <span className={`text-[10px] font-bold ${autoApprove ? 'text-green-600' : 'text-gray-400'} uppercase mt-0.5`}>
                                {autoApprove ? 'Active' : 'Disabled'}
                            </span>
                        </div>
                        <button
                            onClick={toggleAutoApprove}
                            disabled={isConfigLoading}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${autoApprove ? 'bg-green-500' : 'bg-gray-200'}`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoApprove ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                        </button>
                    </div>

                    <button
                        onClick={fetchRequests}
                        className="px-6 py-2.5 bg-white border border-gray-200 rounded-2xl text-gray-600 font-black text-[11px] uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                    >
                        Refresh List
                    </button>
                </div>
            </div>

            {/* Selection Bar (Sticky) */}
            {selectedIds.length > 0 && (
                <div className="sticky top-4 z-40 flex items-center justify-between p-4 bg-gray-900 text-white rounded-[2rem] shadow-2xl animate-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-4 ml-2">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-black text-lg">
                            {selectedIds.length}
                        </div>
                        <div>
                            <p className="font-black text-sm uppercase tracking-wider">Requests Selected</p>
                            <p className="text-[10px] text-gray-400 font-medium">Performing bulk logistic operation</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsBulkRejectModalOpen(true)}
                            disabled={isBulkProcessing}
                            className="px-6 py-2.5 bg-red-600/20 hover:bg-red-600 border border-red-600/50 text-red-500 hover:text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                        >
                            Reject All
                        </button>
                        <button
                            onClick={handleBulkApprove}
                            disabled={isBulkProcessing}
                            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/40 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isBulkProcessing ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <FaCheckCircle />}
                            Approve All
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center text-red-600 font-bold text-sm">
                    <FaExclamationCircle className="mr-2" /> {error}
                </div>
            )}

            {requests.length === 0 ? (
                <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-gray-100">
                    <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <FaUserTie className="text-gray-200 text-4xl" />
                    </div>
                    <h3 className="text-gray-900 font-black text-2xl tracking-tight">Zero Activity</h3>
                    <p className="text-gray-400 max-w-xs mx-auto mt-2 font-medium">When agents request assignments, they will appear here in real-time.</p>
                </div>
            ) : (
                <div className="bg-white rounded-[3rem] shadow-2xl shadow-gray-200 border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto overflow-y-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-5 w-10">
                                        <div className="flex items-center justify-center relative">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.length === requests.length && requests.length > 0}
                                                onChange={toggleSelectAll}
                                                className="w-5 h-5 rounded-lg border-2 border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 transition-all cursor-pointer appearance-none checked:bg-blue-600"
                                            />
                                        </div>
                                    </th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Order Overview</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Route Destination</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Proposing Agent</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Financials</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {requests.map((req) => (
                                    <tr key={req.id} className={`group transition-all duration-300 ${selectedIds.includes(req.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50/80'}`}>
                                        <td className="px-6 py-6 text-center">
                                            <div className="flex items-center justify-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedIds.includes(req.id)}
                                                    onChange={() => toggleSelect(req.id)}
                                                    className="w-5 h-5 rounded-lg border-2 border-gray-200 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 align-top">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-black text-gray-900 text-sm tracking-tight">#{req.order?.orderNumber}</span>
                                                    <span className="px-2.5 py-1 rounded-xl text-[9px] font-black bg-white border border-blue-100 text-blue-600 uppercase tracking-widest shadow-sm">
                                                        {req.order?.status?.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    {req.order?.deliveryMethod && (
                                                        <div className="text-[9px] text-indigo-600 font-black uppercase bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100/50">
                                                            {req.order.deliveryMethod.replace(/_/g, ' ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-6 align-top max-w-[240px]">
                                            <div className="space-y-2">
                                                <p className="text-sm font-black text-gray-800 tracking-tight">{req.order?.user?.name || 'Guest User'}</p>
                                                <p className="text-[11px] text-gray-400 font-bold leading-relaxed line-clamp-2">
                                                    {req.order?.deliveryAddress || (req.order?.deliveryMethod === 'pick_station' ? `STATION: ${req.order?.pickStation}` : 'Standard Pickup')}
                                                </p>
                                            </div>
                                        </td>

                                        <td className="px-6 py-6 align-top">
                                            <div className="flex flex-col">
                                                <p className="text-sm font-black text-gray-900 tracking-tight">{req.deliveryAgent?.name}</p>
                                                <p className="text-[11px] text-gray-400 font-bold mt-0.5">{req.deliveryAgent?.phone}</p>
                                                {req.deliveryAgent?.deliveryProfile?.location && (
                                                    <div className="flex items-center gap-1.5 text-[9px] text-indigo-600 font-black mt-2 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-50 tracking-tighter w-fit">
                                                        <FaMapMarkerAlt size={8} /> {req.deliveryAgent.deliveryProfile.location.toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-6 py-6 align-top whitespace-nowrap">
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Proposed Split</p>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-lg font-black text-gray-900 tracking-tighter">{formatPrice(req.order?.total)}</span>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Total</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 text-[9px] font-black text-indigo-600 bg-indigo-50/50 px-3 py-1.5 rounded-full border border-indigo-100/50 w-fit">
                                                    <FaRoute size={10} />
                                                    {req.deliveryType?.replace(/_/g, ' ').toUpperCase() || 'AUTO-DERIVED'}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-6 align-top text-right">
                                            <div className="flex flex-col gap-2.5 items-end">
                                                <button
                                                    onClick={() => setViewingRequest(req)}
                                                    className="w-10 h-10 bg-white border border-gray-200 text-gray-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-xl transition-all flex items-center justify-center shadow-sm"
                                                    title="View Details"
                                                >
                                                    <FaEye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => confirmApprove(req)}
                                                    disabled={processingId === req.id}
                                                    className="w-36 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 shadow-lg shadow-gray-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {processingId === req.id ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <FaCheckCircle className="text-green-400" />}
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => confirmReject(req)}
                                                    disabled={processingId === req.id}
                                                    className="w-36 py-2 bg-white border border-gray-200 text-gray-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    <FaTimesCircle className="text-red-400" />
                                                    Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Request Detail Modal */}
            {viewingRequest && (
                <RequestDetailModal 
                    request={viewingRequest} 
                    onClose={() => setViewingRequest(null)} 
                />
            )}

            {/* Rejection Modal (Regular) */}
            {rejectModal.isOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 transform transition-all animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                                <FaExclamationCircle size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900">Reject Request</h3>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-0.5">Order #{rejectModal.request?.order?.orderNumber}</p>
                            </div>
                        </div>
                        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                            Providing a clear reason helps delivery agents understand why their request was not accepted.
                        </p>
                        <textarea
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-[1.5rem] text-sm font-medium focus:ring-4 focus:ring-red-100 focus:bg-white focus:border-red-300 transition-all outline-none mb-6 min-h-[120px]"
                            placeholder="Type your reason here..."
                            value={rejectModal.reason}
                            onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                        ></textarea>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setRejectModal({ isOpen: false, request: null, reason: '' })}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!!processingId || !rejectModal.reason.trim()}
                                className="flex-[2] py-3 bg-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-700 shadow-xl shadow-red-200 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {processingId ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <FaTimesCircle />}
                                Confirm Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Rejection Modal */}
            {isBulkRejectModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 transform transition-all animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-red-200">
                                <FaTimesCircle size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900">Bulk Reject</h3>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-0.5">{selectedIds.length} Requests Selected</p>
                            </div>
                        </div>
                        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                            You are about to reject multiple delivery requests. This action will notify all involved agents.
                        </p>
                        <textarea
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-[1.5rem] text-sm font-medium focus:ring-4 focus:ring-red-100 focus:bg-white focus:border-red-300 transition-all outline-none mb-6 min-h-[120px]"
                            placeholder="Reason for bulk rejection..."
                            value={bulkRejectReason}
                            onChange={(e) => setBulkRejectReason(e.target.value)}
                        ></textarea>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsBulkRejectModalOpen(false)}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkReject}
                                disabled={isBulkProcessing || !bulkRejectReason.trim()}
                                className="flex-[2] py-3 bg-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-700 shadow-xl shadow-red-200 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isBulkProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <FaTimesCircle />}
                                Bulk Reject Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Dialog
                isOpen={modal.isOpen}
                onClose={closeModal}
                title={modal.title}
                message={modal.message}
                type={modal.type}
            />
        </div>
    );
};

export default DeliveryRequests;
