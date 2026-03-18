import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FaTruck, FaUserTie, FaClock, FaCheckCircle, FaTimesCircle, FaExclamationCircle, FaRoute } from 'react-icons/fa';
import { formatPrice } from '../../utils/currency';
import Dialog from '../../components/Dialog';
import DeliveryAssignmentModal from '../../components/delivery/DeliveryAssignmentModal';

const DeliveryRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modal, setModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });
    const [processingId, setProcessingId] = useState(null);
    const [rejectModal, setRejectModal] = useState({ isOpen: false, request: null, reason: '' });
    const [agentShare, setAgentShare] = useState(80); // Default 80%

    // Assignment modal state (replaces old approve modal)
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [orderForAssignment, setOrderForAssignment] = useState(null);
    const [pendingRequestId, setPendingRequestId] = useState(null);

    useEffect(() => {
        fetchRequests();
        // Fetch finance config
        api.get('/finance/config')
            .then(res => {
                if (res.data?.agentShare) setAgentShare(res.data.agentShare);
            })
            .catch(err => console.error('Failed to load finance config', err));
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await api.get('/delivery/requests');
            setRequests(res.data || []);
            setError(null);
        } catch (err) {
            console.error('Failed to load requests:', err);
            setError('Failed to load delivery requests.');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Opens the full DeliveryAssignmentModal so the admin can specify:
     * - Delivery route type (seller_to_warehouse, seller_to_customer, etc.)
     * - Destination warehouse / pickup station
     * - Delivery fee
     * The agent from the request is pre-selected in the modal.
     */
    const confirmApprove = (request) => {
        // Build a synthetic "order" object that the assignment modal expects.
        // Pre-populate the agent with the one who made the request.
        const orderObj = {
            ...(request.order || {}),
            // Pre-select the requesting agent
            deliveryAgentId: request.deliveryAgentId,
            deliveryAgent: request.deliveryAgent,
        };
        setOrderForAssignment(orderObj);
        setPendingRequestId(request.id);
        setIsAssignModalOpen(true);
    };

    /**
     * Called when admin confirms the assignment from the modal.
     * Calls PATCH /orders/:orderId/assign with full route details including deliveryType.
     */
    const handleAssignFromModal = async (orderId, assignmentData) => {
        try {
            setProcessingId(pendingRequestId);
            await api.patch(`/orders/${orderId}/assign`, assignmentData);

            setModal({
                isOpen: true,
                type: 'success',
                title: 'Request Approved',
                message: `Order assigned successfully. Route: ${assignmentData.deliveryType || 'specified'}. The agent has been notified.`
            });
            // Remove the approved request from the list
            setRequests(prev => prev.filter(r => r.id !== pendingRequestId));
        } catch (err) {
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Approval Failed',
                message: err.response?.data?.error || err.response?.data?.message || err.message
            });
        } finally {
            setProcessingId(null);
            setPendingRequestId(null);
            setOrderForAssignment(null);
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
            await api.post(`/delivery/requests/${request.id}/reject`, { reason });

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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500 font-medium">Loading requests...</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 font-outfit tracking-tight">Delivery Requests</h1>
                    <p className="text-gray-500 text-sm">Review and approve delivery assignments requested by agents. You will specify the route when approving.</p>
                </div>
                <button
                    onClick={fetchRequests}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
                >
                    Refresh List
                </button>
            </div>

            {/* Info banner */}
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                <FaRoute className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                    <strong>Route Assignment:</strong> When you approve a request, a detailed assignment form will open so you can set the delivery route (e.g. Seller → Warehouse, Warehouse → Customer) and fee. This ensures the correct leg is determined at assignment time, not before.
                </p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center text-red-600">
                    <FaExclamationCircle className="mr-2" /> {error}
                </div>
            )}

            {requests.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-100">
                    <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaUserTie className="text-gray-300 text-3xl" />
                    </div>
                    <h3 className="text-gray-900 font-bold text-lg">No Pending Requests</h3>
                    <p className="text-gray-500 max-w-xs mx-auto mt-1">When agents request orders, they will appear here for your approval.</p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order Details</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer & Location</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Requested By (Agent)</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Financials</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900">#{req.order?.orderNumber}</span>
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">
                                                        {req.order?.status?.replace(/_/g, ' ') || 'Pending'}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                    <FaClock className="text-gray-400" />
                                                    {new Date(req.createdAt).toLocaleString()}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {req.order?.OrderItems?.length || 0} Items
                                                </div>
                                                {req.order?.deliveryMethod && (
                                                    <div className="text-[10px] text-purple-600 font-bold uppercase mt-1 bg-purple-50 px-1.5 py-0.5 rounded w-fit">
                                                        {req.order.deliveryMethod.replace(/_/g, ' ')}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 align-top max-w-xs">
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{req.order?.user?.name || 'Guest Customer'}</p>
                                                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                                                    {req.order?.deliveryAddress || (req.order?.deliveryMethod === 'pick_station' ? `Pick Station: ${req.order?.pickStation}` : 'No address provided')}
                                                </p>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 align-top">
                                            <div className="flex items-start gap-2">
                                                <div className="mt-0.5 p-1 bg-gray-100 rounded text-gray-500">
                                                    <FaUserTie size={12} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">{req.deliveryAgent?.name}</p>
                                                    <p className="text-xs text-gray-500">{req.deliveryAgent?.phone}</p>
                                                    {req.deliveryAgent?.deliveryProfile?.location && (
                                                        <p className="text-xs text-blue-600 mt-0.5">
                                                            📍 {req.deliveryAgent.deliveryProfile.location}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 align-top whitespace-nowrap">
                                            <div>
                                                <div className="text-xs text-gray-500">Order Value</div>
                                                <div className="font-bold text-gray-900">{formatPrice(req.order?.total)}</div>

                                                <div className="mt-2 space-y-1">
                                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Fee Split</div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-gray-500">Est. Fee:</span>
                                                        <span className="font-medium text-gray-700">{formatPrice(req.order?.deliveryFee)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs pt-1 border-t border-dashed border-gray-200">
                                                        <span className="text-green-600 font-bold">Agent ({agentShare}%):</span>
                                                        <span className="font-bold text-green-600">
                                                            {formatPrice((parseFloat(req.order?.deliveryFee || 0) * (agentShare / 100)))}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Route will be set on approval */}
                                                <div className="mt-2 text-[10px] text-orange-600 bg-orange-50 px-2 py-1 rounded font-bold">
                                                    Route set on approval
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 align-top text-right">
                                            <div className="flex flex-col gap-2 items-end">
                                                <button
                                                    onClick={() => confirmApprove(req)}
                                                    disabled={processingId === req.id}
                                                    className="w-32 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                                >
                                                    <FaRoute />
                                                    Approve & Route
                                                </button>
                                                <button
                                                    onClick={() => confirmReject(req)}
                                                    disabled={processingId === req.id}
                                                    className="w-32 py-1.5 border border-red-200 text-red-600 bg-white rounded-lg text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                                >
                                                    <FaTimesCircle />
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

            {/* Rejection Modal */}
            {rejectModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 transform transition-all">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Reject Request</h3>
                        <p className="text-gray-500 text-sm mb-4">
                            Please provide a reason for rejecting this request.
                        </p>
                        <textarea
                            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-4"
                            rows="3"
                            placeholder="Reason for rejection..."
                            value={rejectModal.reason}
                            onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                        ></textarea>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setRejectModal({ isOpen: false, request: null, reason: '' })}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!!processingId || !rejectModal.reason.trim()}
                                className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50"
                            >
                                {processingId ? 'Rejecting...' : 'Reject Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Assignment Modal — opens when admin approves a request */}
            <DeliveryAssignmentModal
                isOpen={isAssignModalOpen}
                order={orderForAssignment}
                onClose={() => {
                    setIsAssignModalOpen(false);
                    setOrderForAssignment(null);
                    setPendingRequestId(null);
                }}
                onAssign={handleAssignFromModal}
                isBulk={false}
            />

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
