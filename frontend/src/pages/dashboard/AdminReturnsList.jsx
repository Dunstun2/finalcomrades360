import React, { useEffect, useState } from 'react';
import { FaBox, FaHistory, FaCheckCircle, FaTimes, FaSearch, FaTruck, FaEye, FaMapMarkerAlt, FaUserPlus, FaMoneyBillWave, FaWarehouse, FaStore, FaRoute, FaSpinner, FaPlus } from 'react-icons/fa';
import api from '../../services/api';
import { formatPrice } from '../../utils/currency';
import { resolveImageUrl, FALLBACK_IMAGE } from '../../utils/imageUtils';
import { ensureArray } from '../../utils/parsingUtils';
import DeliveryAssignmentModal from '../../components/delivery/DeliveryAssignmentModal';

export default function AdminReturnsList() {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [adminNotes, setAdminNotes] = useState('');
    const [refundAmount, setRefundAmount] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [drivers, setDrivers] = useState([]);
    // Per-leg logistics state
    const [returnLogistics, setReturnLogistics] = useState({}); // { [returnId]: { tasks: [] } }
    const [assigningLeg, setAssigningLeg] = useState(null); // which leg is being assigned
    const [selectedLegAgent, setSelectedLegAgent] = useState(''); // agent id for leg assignment
    const [legSubmitting, setLegSubmitting] = useState(false);

    useEffect(() => {
        loadReturns();
        loadDrivers();
    }, [statusFilter, searchTerm]); // Reload on search term change

    // Load logistics when a return is opened in the modal
    useEffect(() => {
        if (selectedReturn) {
            loadReturnLogistics(selectedReturn.id);
        } else {
            setAssigningLeg(null);
            setSelectedLegAgent('');
        }
    }, [selectedReturn?.id]);

    const loadReturns = async () => {
        try {
            setLoading(true);
            const res = await api.get('/returns/admin/all', {
                params: { 
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    q: searchTerm || undefined
                 }
            });
            setReturns(res.data);
        } catch (err) {
            console.error('Failed to load returns:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadDrivers = async () => {
        try {
            const response = await api.get('/admin/delivery/agents');
            setDrivers(response.data || []);
        } catch (error) {
            console.error('Failed to load drivers:', error);
        }
    };

    const loadReturnLogistics = async (returnId) => {
        try {
            const res = await api.get(`/returns/${returnId}/logistics`);
            setReturnLogistics(prev => ({ ...prev, [returnId]: res.data.tasks || [] }));
        } catch (err) {
            console.error('Failed to load logistics:', err);
        }
    };

    const handleAssignAgentLeg = async (returnId, leg) => {
        if (!selectedLegAgent) { alert('Please select an agent.'); return; }
        try {
            setLegSubmitting(true);
            await api.post(`/returns/${returnId}/assign-agent-leg`, { leg, deliveryAgentId: selectedLegAgent });
            await loadReturnLogistics(returnId);
            setAssigningLeg(null);
            setSelectedLegAgent('');
        } catch (err) {
            alert('Assignment failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setLegSubmitting(false);
        }
    };

    const handleCreateWarehouseToSellerTask = async (returnId) => {
        try {
            setLegSubmitting(true);
            await api.post(`/returns/${returnId}/create-warehouse-to-seller-task`, {});
            await loadReturnLogistics(returnId);
        } catch (err) {
            alert('Failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setLegSubmitting(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedReturn) return;
        try {
            setSubmitting(true);
            await api.post(`/returns/${selectedReturn.id}/approve`, { adminNotes });
            alert('Return request approved. You can now assign an agent for pickup.');
            setIsApproveModalOpen(false);
            loadReturns();
            setSelectedReturn(null);
        } catch (err) {
            alert('Approval failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!selectedReturn) return;
        try {
            setSubmitting(true);
            await api.post(`/returns/${selectedReturn.id}/reject`, { adminNotes });
            alert('Return request rejected');
            setIsRejectModalOpen(false);
            loadReturns();
            setSelectedReturn(null);
        } catch (err) {
            alert('Rejection failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleAssignAgent = async (orderId, assignmentData) => {
        if (!selectedReturn) return;
        try {
            setSubmitting(true);
            await api.post(`/returns/${selectedReturn.id}/assign-agent`, assignmentData);
            alert('Agent assigned successfully');
            setIsAssignModalOpen(false);
            loadReturns();
            setSelectedReturn(null);
        } catch (err) {
            alert('Assignment failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleUnassignAgent = async (returnId) => {
        if (!window.confirm('Are you sure you want to unassign the delivery agent? Any active logistics tasks will be cancelled.')) return;
        try {
            setSubmitting(true);
            await api.post(`/returns/${returnId}/unassign-agent`);
            alert('Agent unassigned successfully');
            loadReturns();
        } catch (err) {
            alert('Unassignment failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmReceipt = async (returnId) => {
        if (!window.confirm('Confirm that the returned items have arrived at the warehouse?')) return;
        try {
            const inspectionNotes = prompt('Add inspection notes (optional):') || '';
            const ret = returns.find(r => r.id === returnId);
            await api.post(`/returns/${returnId}/confirm-receipt`, { 
                inspectionNotes,
                itemsStatus: ensureArray(ret.items).map(i => ({ 
                    orderItemId: i.orderItemId, 
                    status: 'completed' 
                }))
            });
            alert('Receipt confirmed at warehouse. Refund can now be processed.');
            loadReturns();
        } catch (err) {
            alert('Confirmation failed: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleRefund = async () => {
        if (!selectedReturn) return;
        try {
            setSubmitting(true);
            await api.post(`/returns/${selectedReturn.id}/refund`, { 
                refundAmount, 
                adminNotes 
            });
            alert(`Refund of ${formatPrice(refundAmount)} processed successfully to customer wallet.`);
            setIsRefundModalOpen(false);
            loadReturns();
            setSelectedReturn(null);
        } catch (err) {
            alert('Refund failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            approved: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            rejected: 'bg-red-100 text-red-800 border-red-200',
            item_collected: 'bg-orange-100 text-orange-800 border-orange-200',
            item_received: 'bg-purple-100 text-purple-800 border-purple-200',
            completed: 'bg-emerald-100 text-emerald-800 border-emerald-200'
        };
        return `px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${badges[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`;
    };

    const getOrderStatusBadge = (status) => {
        const statuses = {
            return_in_progress: 'bg-orange-50 text-orange-700 border-orange-100',
            returned: 'bg-gray-100 text-gray-800 border-gray-200',
            delivered: 'bg-green-100 text-green-800 border-green-200'
        };
        return `px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border ${statuses[status] || 'bg-gray-50 text-gray-500 border-gray-100'}`;
    };

    const filteredReturns = returns.filter(r => 
        r.order?.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const calculateReturnTotal = (ret) => {
        return ensureArray(ret.items).reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-gray-50/50 min-h-screen">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Return Management</h1>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Assign logistics & process refunds</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-3 w-3" />
                        <input 
                            type="text" 
                            placeholder="Search Order # or Customer..." 
                            className="bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer"
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="item_collected">Item Collected</option>
                        <option value="item_received">Item Received</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </header>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : filteredReturns.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 shadow-sm">
                    <FaHistory className="mx-auto h-16 w-16 text-gray-200 mb-4" />
                    <h2 className="text-xl font-black text-gray-300 uppercase">No return requests found</h2>
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/80 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Info</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Items & Value</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Logistics</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredReturns.map(ret => {
                                    const activeTask = ret.order?.deliveryTasks?.find(t => t.deliveryType?.includes('to_warehouse') && t.status !== 'completed');
                                    return (
                                        <tr key={ret.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-black text-blue-900 leading-none">#{ret.order?.orderNumber}</span>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase">{new Date(ret.createdAt).toLocaleString()}</span>
                                                    <div className="flex mt-1">
                                                        <span className={getOrderStatusBadge(ret.order?.status)}>{ret.order?.status.replace('_', ' ')}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-gray-800 uppercase">{ret.user?.name}</span>
                                                    <span className="text-[10px] font-bold text-gray-400">{ret.user?.phone}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex flex-wrap gap-1">
                                                        {ensureArray(ret.items).map((item, idx) => (
                                                            <span key={idx} className="text-[10px] font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                                                {item.quantity}x {item.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <span className="text-xs font-black text-emerald-700 mt-1">{formatPrice(calculateReturnTotal(ret))}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-700 uppercase">
                                                        <FaMapMarkerAlt className="text-blue-500 h-2.5 w-2.5" />
                                                        {ret.pickupMethod === 'drop_off' ? 'Drop-off' : 'Agent Pickup'}
                                                    </div>
                                                    
                                                    {/* Logistics Details */}
                                                    {ret.pickupMethod === 'drop_off' ? (
                                                        <div className="text-[9px] font-bold text-gray-500 flex items-center gap-1">
                                                            <FaWarehouse className="h-2 w-2 text-indigo-400" />
                                                            Station: {ret.pickupStation?.name || 'Pending'}
                                                        </div>
                                                    ) : (
                                                        <div className="text-[9px] font-bold text-gray-500 truncate max-w-[120px]">
                                                            Addr: {ret.pickupAddress}
                                                        </div>
                                                    )}

                                                     {activeTask ? (
                                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 w-fit mt-1">
                                                            <FaTruck className="h-2 w-2" />
                                                            {activeTask.deliveryAgent ? activeTask.deliveryAgent.name : activeTask.deliveryAgentId ? `Agent ID: ${activeTask.deliveryAgentId}` : 'Awaiting agent'}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[9px] font-bold text-gray-300 italic uppercase mt-1">Logistics Pending</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={getStatusBadge(ret.status)}>{ret.status.replace('_', ' ')}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button 
                                                        onClick={() => setSelectedReturn(ret)}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                        title="View Details"
                                                    >
                                                        <FaEye className="h-4 w-4" />
                                                    </button>

                                                    {/* Assignment Actions */}
                                                    {!activeTask && (ret.status === 'approved' || ret.status === 'at_pick_station') && (
                                                        <button 
                                                            onClick={() => { setSelectedReturn(ret); setIsAssignModalOpen(true); }}
                                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                            title="Assign Agent"
                                                        >
                                                            <FaUserPlus className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    {activeTask && (
                                                        <div className="flex gap-1">
                                                            <button 
                                                                onClick={() => { setSelectedReturn(ret); setIsAssignModalOpen(true); }}
                                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                                title="Reassign Agent"
                                                            >
                                                                <FaUserPlus className="h-4 w-4 text-blue-500" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleUnassignAgent(ret.id)}
                                                                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                                title="Cancel Assignment"
                                                            >
                                                                <FaTimes className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                    
                                                    {ret.status === 'pending' && (
                                                        <div className="flex gap-1">
                                                            <button 
                                                                onClick={() => { setSelectedReturn(ret); setIsApproveModalOpen(true); }}
                                                                className="px-3 py-1.5 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-100 active:scale-95 transition-all"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button 
                                                                onClick={() => { setSelectedReturn(ret); setIsRejectModalOpen(true); }}
                                                                className="px-3 py-1.5 bg-white text-red-600 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-50 border border-red-100 active:scale-95 transition-all"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    )}

                                                    {ret.status === 'item_collected' && (
                                                        <button 
                                                            onClick={() => handleConfirmReceipt(ret.id)}
                                                            className="px-3 py-1.5 bg-purple-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-purple-700 shadow-sm shadow-purple-100 flex items-center gap-1.5"
                                                        >
                                                            <FaWarehouse className="h-3 w-3" /> Receive
                                                        </button>
                                                    )}

                                                    {ret.status === 'item_received' && (
                                                        <button 
                                                            onClick={() => { 
                                                                setSelectedReturn(ret); 
                                                                setRefundAmount(calculateReturnTotal(ret));
                                                                setIsRefundModalOpen(true); 
                                                            }}
                                                            className="px-3 py-1.5 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-700 shadow-sm shadow-emerald-100 flex items-center gap-1.5"
                                                        >
                                                            <FaMoneyBillWave className="h-3 w-3" /> Refund
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* View Details Sidebar/Modal */}
            {selectedReturn && !isApproveModalOpen && !isRejectModalOpen && !isAssignModalOpen && !isRefundModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedReturn(null)}>
                    <div className="w-full max-w-2xl bg-white max-h-[90vh] rounded-[32px] shadow-2xl p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <header className="flex items-center justify-between mb-8 pb-4 border-b">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 uppercase">Return Details</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Request #{selectedReturn.id}</p>
                            </div>
                            <button onClick={() => setSelectedReturn(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><FaTimes /></button>
                        </header>

                        <div className="space-y-8">
                            <section>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Order Information</label>
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center shadow-inner">
                                    <div>
                                        <p className="text-sm font-black text-blue-900 uppercase">Order #{selectedReturn.order?.orderNumber}</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase">{selectedReturn.user?.name}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={getStatusBadge(selectedReturn.status)}>{selectedReturn.status}</span>
                                        <span className="text-[9px] font-black text-gray-400 uppercase">{selectedReturn.order?.paymentMethod.replace('_', ' ')}</span>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Items to Return</label>
                                <div className="space-y-2">
                                    {ensureArray(selectedReturn.items).map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-gray-200 transition-colors">
                                            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 border border-gray-100">
                                                <FaBox className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black text-gray-900 uppercase truncate leading-tight">{item.name}</p>
                                                <div className="flex items-center justify-between mt-1">
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase">Quantity: {item.quantity}</p>
                                                    <p className="text-[11px] font-black text-indigo-600">{formatPrice(item.price * item.quantity)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center px-4 pt-4 border-t border-dashed">
                                        <span className="text-[10px] font-black text-gray-400 uppercase">Refund Value</span>
                                        <span className="text-lg font-black text-gray-900">{formatPrice(calculateReturnTotal(selectedReturn))}</span>
                                    </div>
                                </div>
                            </section>

                            {ensureArray(selectedReturn.images).length > 0 && (
                                <section>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Evidence Photos</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {ensureArray(selectedReturn.images).map((img, idx) => (
                                            <div key={idx} className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-100 group relative">
                                                <img 
                                                    src={resolveImageUrl(img)} 
                                                    alt="Evidence" 
                                                    className="w-full h-full object-cover cursor-zoom-in group-hover:scale-110 transition-transform"
                                                    onClick={() => window.open(resolveImageUrl(img), '_blank')}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <section>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Return Reason</label>
                                <div className="p-5 bg-orange-50/50 border border-orange-100 rounded-2xl shadow-sm">
                                    <p className="text-[11px] font-black text-orange-900 uppercase leading-none mb-2">{selectedReturn.reasonCategory.replace('_', ' ')}</p>
                                    <p className="text-xs text-orange-800 italic leading-relaxed">"{selectedReturn.description || 'No description provided'}"</p>
                                </div>
                            </section>

                            <section>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Pickup Logistics</label>
                                <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <FaMapMarkerAlt className="text-blue-600 h-3.5 w-3.5" />
                                            <span className="text-[11px] font-black text-blue-900 uppercase tracking-tight">{selectedReturn.pickupMethod.replace('_', ' ')}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full uppercase">Customer Preference</span>
                                    </div>
                                    <div className="pl-5.5 border-l-2 border-blue-100 py-1">
                                        {selectedReturn.pickupMethod === 'drop_off' ? (
                                            <div className="space-y-1">
                                                <p className="text-[11px] text-blue-800 font-black uppercase">Station: {selectedReturn.pickupStation?.name || 'Unknown'}</p>
                                                <p className="text-[10px] text-blue-600 font-bold italic">{selectedReturn.pickupStation?.location || 'Station address pending'}</p>
                                                <p className="text-[10px] text-gray-400 font-medium">Items will be dropped at this station by customer.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                <p className="text-[11px] text-blue-800 font-black uppercase font-bold">Collection Address:</p>
                                                <p className="text-xs text-blue-900 font-bold italic">{selectedReturn.pickupAddress}</p>
                                                <p className="text-[10px] text-gray-400 font-medium">Agent will collect items from this location.</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Active Agent Tracking (old single-leg) */}
                                    {selectedReturn.order?.deliveryTasks?.find(t => t.deliveryType?.includes('to_warehouse') && t.status !== 'completed')?.deliveryAgent && (
                                        <div className="mt-2 pt-3 border-t border-blue-200 flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                                                <FaTruck />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Assigned Agent</p>
                                                <p className="text-xs font-black text-indigo-900 uppercase">{selectedReturn.order.deliveryTasks.find(t => t.deliveryType?.includes('to_warehouse') && t.status !== 'completed').deliveryAgent.name}</p>
                                                <p className="text-[10px] font-bold text-indigo-500">{selectedReturn.order.deliveryTasks.find(t => t.deliveryType?.includes('to_warehouse') && t.status !== 'completed').deliveryAgent.phone}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* ── 3-Leg Return Logistics ── */}
                            {['approved', 'item_collected', 'item_received', 'completed'].includes(selectedReturn.status) && (() => {
                                const tasks = returnLogistics[selectedReturn.id] || [];
                                const getLegTask = (leg) => tasks.find(t => t.deliveryType === leg);

                                const legs = selectedReturn.pickupMethod === 'drop_off'
                                    ? [
                                        { key: 'pickup_station_to_warehouse', label: 'Pickup Station → Warehouse', icon: <FaWarehouse className="h-4 w-4" />, color: 'blue', desc: 'Item travels from the pickup station to your warehouse.' },
                                        { key: 'warehouse_to_seller', label: 'Warehouse → Seller', icon: <FaStore className="h-4 w-4" />, color: 'purple', desc: 'Return item delivered back to the seller.' }
                                    ]
                                    : [
                                        { key: 'customer_to_warehouse', label: 'Customer → Warehouse', icon: <FaTruck className="h-4 w-4" />, color: 'orange', desc: 'Agent collects item from customer and delivers to warehouse.' },
                                        { key: 'warehouse_to_seller', label: 'Warehouse → Seller', icon: <FaStore className="h-4 w-4" />, color: 'purple', desc: 'Return item delivered back to the seller.' }
                                    ];

                                const colorMap = {
                                    orange: { bg: 'bg-orange-50', border: 'border-orange-100', icon: 'bg-orange-100 text-orange-600', badge: 'bg-orange-100 text-orange-700', btn: 'bg-orange-600 hover:bg-orange-700 text-white', title: 'text-orange-900' },
                                    blue:   { bg: 'bg-blue-50',   border: 'border-blue-100',   icon: 'bg-blue-100 text-blue-600',   badge: 'bg-blue-100 text-blue-700',   btn: 'bg-blue-600 hover:bg-blue-700 text-white',   title: 'text-blue-900' },
                                    purple: { bg: 'bg-purple-50', border: 'border-purple-100', icon: 'bg-purple-100 text-purple-600', badge: 'bg-purple-100 text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700 text-white', title: 'text-purple-900' }
                                };

                                return (
                                    <section>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3 flex items-center gap-2">
                                            <FaRoute className="text-gray-400 h-3 w-3" /> Return Logistics — Agent Assignments
                                        </label>
                                        <div className="space-y-3">
                                            {legs.map(({ key, label, icon, color, desc }) => {
                                                const task = getLegTask(key);
                                                const c = colorMap[color];
                                                const isAssigning = assigningLeg === key;
                                                const isWarehouseToSeller = key === 'warehouse_to_seller';
                                                const canCreateW2S = isWarehouseToSeller && !task && selectedReturn.status === 'item_received';

                                                return (
                                                    <div key={key} className={`p-4 rounded-2xl border ${c.bg} ${c.border}`}>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`p-2 rounded-xl ${c.icon}`}>{icon}</div>
                                                                <div>
                                                                    <p className={`text-[11px] font-black uppercase ${c.title}`}>{label}</p>
                                                                    <p className="text-[9px] text-gray-400 font-medium">{desc}</p>
                                                                </div>
                                                            </div>
                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${task ? (task.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : task.deliveryAgentId ? 'bg-indigo-100 text-indigo-700' : 'bg-yellow-100 text-yellow-700') : 'bg-gray-100 text-gray-400'}`}>
                                                                {task ? (task.status === 'completed' ? '✓ Done' : task.deliveryAgentId ? '● Assigned' : '○ Pending') : '— Not Created'}
                                                            </span>
                                                        </div>

                                                        {/* Show assigned agent */}
                                                        {task?.deliveryAgent && (
                                                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/60">
                                                                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-[10px] font-black">
                                                                    {task.deliveryAgent.name?.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black text-gray-800 uppercase">{task.deliveryAgent.name}</p>
                                                                    <p className="text-[9px] text-gray-500 font-bold">{task.deliveryAgent.phone}</p>
                                                                </div>
                                                                {task.status !== 'completed' && (
                                                                    <button onClick={() => { setAssigningLeg(key); setSelectedLegAgent(''); }} className="ml-auto text-[9px] font-black text-indigo-500 hover:text-indigo-700 uppercase">Reassign</button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Create warehouse-to-seller task button */}
                                                        {canCreateW2S && !isAssigning && (
                                                            <button
                                                                onClick={() => handleCreateWarehouseToSellerTask(selectedReturn.id)}
                                                                disabled={legSubmitting}
                                                                className={`mt-2 w-full py-2 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 ${c.btn} shadow-sm`}
                                                            >
                                                                {legSubmitting ? <FaSpinner className="animate-spin h-3 w-3" /> : <FaPlus className="h-3 w-3" />}
                                                                Create Warehouse → Seller Task
                                                            </button>
                                                        )}

                                                        {/* Assign agent button (for tasks without agent, or reassigning) */}
                                                        {task && !task.deliveryAgent && !isAssigning && task.status !== 'completed' && (
                                                            <button
                                                                onClick={() => { setAssigningLeg(key); setSelectedLegAgent(''); }}
                                                                className={`mt-2 w-full py-2 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 ${c.btn} shadow-sm`}
                                                            >
                                                                <FaUserPlus className="h-3 w-3" /> Assign Agent
                                                            </button>
                                                        )}

                                                        {/* Agent selection dropdown */}
                                                        {isAssigning && (
                                                            <div className="mt-3 space-y-2">
                                                                <select
                                                                    value={selectedLegAgent}
                                                                    onChange={e => setSelectedLegAgent(e.target.value)}
                                                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
                                                                >
                                                                    <option value="">— Select Agent —</option>
                                                                    {drivers.map(d => (
                                                                        <option key={d.id} value={d.id}>
                                                                            {d.name || d.user?.name} {d.phone || d.user?.phone ? `(${d.phone || d.user?.phone})` : ''}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => handleAssignAgentLeg(selectedReturn.id, key)}
                                                                        disabled={legSubmitting || !selectedLegAgent}
                                                                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-xl disabled:opacity-50 flex items-center justify-center gap-1"
                                                                    >
                                                                        {legSubmitting ? <FaSpinner className="animate-spin h-3 w-3" /> : null}
                                                                        Confirm
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setAssigningLeg(null)}
                                                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-black uppercase rounded-xl"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Seller Info */}
                                            {selectedReturn.order?.seller && (
                                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                                                        <FaStore className="text-gray-500 h-3.5 w-3.5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Return Destination — Seller</p>
                                                        <p className="text-xs font-black text-gray-800 uppercase">{selectedReturn.order.seller.businessName || selectedReturn.order.seller.name}</p>
                                                        {selectedReturn.order.seller.businessAddress && (
                                                            <p className="text-[10px] text-gray-400 font-medium">{selectedReturn.order.seller.businessAddress}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Approve Modal */}
            {isApproveModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                            <FaCheckCircle className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 uppercase text-center mb-2">Approve Return</h3>
                        <p className="text-xs text-gray-500 text-center mb-8 font-bold uppercase tracking-tight">This will authorize the return and prepare the pickup task.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Internal Review Notes</label>
                                <textarea 
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px] shadow-inner transition-all"
                                    placeholder="Add any internal processing notes..."
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 mt-8">
                            <button 
                                onClick={handleApprove}
                                disabled={submitting}
                                className="w-full py-4 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {submitting ? 'Processing Approval...' : 'Confirm Approval'}
                            </button>
                            <button 
                                onClick={() => setIsApproveModalOpen(false)}
                                className="w-full py-4 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-gray-600 transition-colors"
                            >
                                Not yet, Go Back
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Refund Modal */}
            {isRefundModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                            <FaMoneyBillWave className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 uppercase text-center mb-2">Process Refund</h3>
                        <p className="text-xs text-gray-500 text-center mb-8 font-bold uppercase tracking-tight">Funds will be credited to the customer's wallet.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Refund Amount (UGX)</label>
                                <input 
                                    type="number"
                                    value={refundAmount}
                                    onChange={(e) => setRefundAmount(e.target.value)}
                                    className="w-full bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-xl font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Notes to Customer</label>
                                <textarea 
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none min-h-[100px] shadow-inner"
                                    placeholder="Explain the refund reasoning..."
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 mt-8">
                            <button 
                                onClick={handleRefund}
                                disabled={submitting || !refundAmount}
                                className="w-full py-4 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-100 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {submitting ? 'Processing Refund...' : 'Confirm & Send Ugandan Shillings'}
                            </button>
                            <button 
                                onClick={() => setIsRefundModalOpen(false)}
                                className="w-full py-4 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-gray-600"
                            >
                                Cancel Transaction
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Side Modals / Overlays */}
            {isAssignModalOpen && selectedReturn && (
                <DeliveryAssignmentModal
                    isOpen={isAssignModalOpen}
                    onClose={() => setIsAssignModalOpen(false)}
                    onAssign={(data) => handleAssignAgent(selectedReturn.orderId, data)}
                    order={selectedReturn.order}
                    drivers={drivers}
                />
            )}

            {isRejectModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-xl font-black text-red-600 uppercase mb-4">Reject Return</h3>
                        <p className="text-xs text-gray-600 mb-4 font-medium">Please provide a reason. This will be visible to the customer.</p>
                        
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Rejection Reason</label>
                        <textarea 
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-medium focus:ring-2 focus:ring-red-500 outline-none min-h-[100px]"
                            placeholder="Why are you rejecting this request?"
                            required
                        />

                        <div className="flex gap-2 mt-6">
                            <button 
                                onClick={() => setIsRejectModalOpen(false)}
                                className="flex-1 py-3 bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleReject}
                                disabled={submitting || !adminNotes}
                                className="flex-1 py-3 bg-red-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-700 shadow-lg shadow-red-100 active:scale-95 transition-all"
                            >
                                {submitting ? 'Rejecting...' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
