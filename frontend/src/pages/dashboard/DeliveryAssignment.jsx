import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { FaTruck, FaUserTie, FaClock, FaExclamationCircle, FaSearch, FaMapMarkerAlt, FaCheckCircle, FaBox, FaFilter, FaPlus, FaMinus, FaLock, FaUserPlus, FaChevronRight } from 'react-icons/fa';
import { formatPrice } from '../../utils/currency';
import DeliveryAssignmentModal from '../../components/delivery/DeliveryAssignmentModal';
import { DeliveryTaskBadge, DeliveryTypeBadge, getOrderDeliveryTask } from '../../components/delivery/DeliveryTaskComponents';
import LogisticsDestination from '../../components/delivery/LogisticsDestination';

const DeliveryAssignment = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [expandedGroups, setExpandedGroups] = useState([]);
    const [workflowFilter, setWorkflowFilter] = useState('awaiting_collection');
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [orderToAssign, setOrderToAssign] = useState(null);
    const [isBulkAssign, setIsBulkAssign] = useState(false);
    const [backendStats, setBackendStats] = useState(null);

    // Order status configuration (Sync with AdminOrders)
    const orderStatuses = {
        'order_placed': { icon: FaClock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Order Placed' },
        'seller_confirmed': { icon: FaBox, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Seller Confirmed' },
        'en_route_to_warehouse': { icon: FaTruck, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'En Route to Warehouse' },
        'at_warehouse': { icon: FaBox, color: 'text-teal-600', bg: 'bg-teal-100', label: 'At Warehouse' },
        'ready_for_pickup': { icon: FaBox, color: 'text-sky-600', bg: 'bg-sky-100', label: 'Ready for Pickup' },
        'in_transit': { icon: FaTruck, color: 'text-orange-600', bg: 'bg-orange-100', label: 'In Transit' },
        'returned': { icon: FaMinus, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Returned' },
        'failed': { icon: FaExclamationCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Failed' },
        'super_admin_confirmed': { icon: FaCheckCircle, color: 'text-blue-700', bg: 'bg-blue-50', label: 'Admin Confirmed' }
    };

    // Logistics Workflow Stages for Assignments
    const logisticsStages = {
        'awaiting_collection': {
            label: 'Collection from Seller',
            statuses: ['seller_confirmed', 'super_admin_confirmed'],
            description: 'Needs pickup from seller to warehouse or direct to customer.',
            icon: FaUserPlus
        },
        'dispatch_ready': {
            label: 'Dispatch from Hub',
            statuses: ['ready_for_pickup', 'at_warehouse'],
            description: 'Sorted at hub and ready for last-mile delivery.',
            icon: FaCheckCircle
        },
        'returns': {
            label: 'Returns Logistics',
            statuses: ['returned', 'failed'],
            description: 'Item returns or failed delivery legs.',
            icon: FaTruck
        },
        'all': {
            label: 'All Assignable',
            statuses: ['order_placed', 'seller_confirmed', 'super_admin_confirmed', 'en_route_to_warehouse', 'at_warehouse', 'ready_for_pickup', 'returned', 'failed'],
            icon: FaBox
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [workflowFilter, searchTerm]);

    const fetchOrders = async (silently = false) => {
        try {
            if (!silently) setLoading(true);
            const statusStr = logisticsStages[workflowFilter].statuses.join(',');
            const res = await api.get('/orders', {
                params: {
                    status: statusStr,
                    q: searchTerm || undefined
                }
            });
            const ordersData = Array.isArray(res.data.orders) ? res.data.orders : (Array.isArray(res.data) ? res.data : []);
            setOrders(ordersData);
            if (res.data.stats) setBackendStats(res.data.stats);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch assignment data:', err);
            setError('Could not load orders. Please refresh.');
        } finally {
            if (!silently) setLoading(false);
        }
    };

    const handleAssignDriver = async (orderId, assignmentData) => {
        try {
            let res;
            if (isBulkAssign) {
                res = await api.patch('/orders/bulk-assign', {
                    ...assignmentData,
                    orderIds: selectedOrders
                });
            } else {
                res = await api.patch(`/orders/${orderId}/assign`, assignmentData);
            }

            if (res.data.success) {
                fetchOrders(true);
                setSelectedOrders([]);
                setIsBulkAssign(false);
                setIsAssignModalOpen(false);
                alert(isBulkAssign ? 'Batch assignment successful!' : 'Driver assigned successfully!');
            }
        } catch (err) {
            alert('Failed: ' + (err.response?.data?.error || err.message));
        }
    };

    // Helper for assignment status & countdown (Sync with AdminOrders)
    const AssignmentIndicator = ({ order }) => {
        const activeTask = order.deliveryTasks?.find(t => t.status === 'assigned');
        const [timeLeft, setTimeLeft] = useState(null);

        useEffect(() => {
            if (!activeTask) return;

            const calculateTimeLeft = () => {
                const assignedAt = new Date(activeTask.assignedAt);
                const expiryTime = new Date(assignedAt.getTime() + 30 * 60 * 1000); // 30 mins
                const now = new Date();
                const diff = expiryTime - now;

                if (diff <= 0) return 'Expired';
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            };

            setTimeLeft(calculateTimeLeft());
            const timer = setInterval(() => {
                const remaining = calculateTimeLeft();
                setTimeLeft(remaining);
                if (remaining === 'Expired') clearInterval(timer);
            }, 1000);

            return () => clearInterval(timer);
        }, [activeTask]);

        if (!activeTask) {
            const isAccepted = order.deliveryTasks?.some(t => ['accepted', 'in_progress', 'arrived_at_pickup'].includes(t.status));
            if (isAccepted) {
                return (
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                        <FaCheckCircle className="h-2 w-2" /> AGENT ACTIVE
                    </div>
                );
            }
            return null;
        }

        return (
            <div className={`flex items-center gap-1.5 text-[9px] font-black px-2 py-0.5 rounded border ${timeLeft === 'Expired' ? 'text-red-600 bg-red-50 border-red-100' : 'text-blue-600 bg-blue-50 border-blue-100'}`}>
                <FaClock className={`h-2 w-2 ${timeLeft !== 'Expired' && 'animate-pulse'}`} />
                {timeLeft === 'Expired' ? 'TIMEOUT: REASSIGN' : `WAITING: ${timeLeft}`}
            </div>
        );
    };

    const groupedOrders = (() => {
        const groups = {};
        const result = [];

        orders.forEach(order => {
            if (order.checkoutOrderNumber) {
                if (!groups[order.checkoutOrderNumber]) groups[order.checkoutOrderNumber] = [];
                groups[order.checkoutOrderNumber].push(order);
            } else {
                result.push({ ...order, isStandalone: true });
            }
        });

        Object.entries(groups).forEach(([groupNumber, subOrders]) => {
            if (subOrders.length > 1) {
                result.push({
                    id: `group-${groupNumber}`,
                    orderNumber: groupNumber,
                    isGroup: true,
                    subOrders: subOrders,
                    total: subOrders.reduce((sum, o) => sum + parseFloat(o.total), 0),
                    createdAt: subOrders[0].createdAt,
                    user: subOrders[0].User || subOrders[0].user,
                    status: subOrders.every(o => o.status === subOrders[0].status) ? subOrders[0].status : 'mixed',
                    checkoutOrderNumber: groupNumber
                });
            } else {
                result.push({ ...subOrders[0], isStandalone: true });
            }
        });

        return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    })();

    const handleSelectOrder = (orderId, subOrderIds = []) => {
        setSelectedOrders(prev => {
            const allToAdd = orderId ? [orderId] : subOrderIds;
            const allPresent = allToAdd.every(id => prev.includes(id));
            if (allPresent) return prev.filter(id => !allToAdd.includes(id));
            return [...new Set([...prev, ...allToAdd])];
        });
    };

    const getStatusInfo = (status) => {
        return orderStatuses[status] || { icon: FaClock, color: 'text-gray-600', bg: 'bg-gray-100', label: status };
    };

    if (loading && orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Synchronizing Assignments...</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 font-outfit tracking-tight flex items-center gap-3">
                        <FaTruck className="text-orange-600" /> Logistics Assignment
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">Coordinate pickups and last-mile delivery dispatches.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Find Order or Customer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl w-full md:w-80 outline-none focus:ring-2 focus:ring-orange-500 shadow-sm font-medium text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Workflow Navigation */}
            <div className="flex flex-wrap gap-2 pb-2">
                {Object.entries(logisticsStages).map(([key, stage]) => {
                    const isActive = workflowFilter === key;
                    const count = key === 'all' ? (backendStats?.all_assignable ?? orders.length) : (backendStats?.[`wf_${key}`] ?? orders.length);
                    return (
                        <button
                            key={key}
                            onClick={() => {
                                setWorkflowFilter(key);
                                setSelectedOrders([]);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border shadow-sm ${isActive
                                ? 'bg-gray-900 text-white border-gray-900 scale-105'
                                : 'bg-white text-gray-600 hover:bg-orange-50 border-gray-100'}`}
                        >
                            {stage.icon && <stage.icon className={`h-3 w-3 ${isActive ? 'text-white' : 'text-gray-400'}`} />}
                            {stage.label}
                            <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Bulk Actions (If any selected) */}
            {selectedOrders.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">
                            {selectedOrders.length}
                        </div>
                        <div>
                            <p className="text-xs font-black text-orange-900 uppercase">Selected for Batch Dispatch</p>
                            <p className="text-[10px] text-orange-700 font-bold">Assign a single driver to handle all these shipments.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setIsBulkAssign(true);
                                setOrderToAssign(orders.find(o => selectedOrders.includes(o.id)));
                                setIsAssignModalOpen(true);
                            }}
                            className="px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg active:scale-95"
                        >
                            <FaUserPlus /> Batch Assign Driver
                        </button>
                        <button onClick={() => setSelectedOrders([])} className="p-2 text-orange-400 hover:text-orange-600">
                            <FaLock className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center text-red-600 text-sm font-bold">
                    <FaExclamationCircle className="mr-2" /> {error}
                </div>
            )}

            {groupedOrders.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-100">
                    <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaTruck className="text-orange-200 text-3xl" />
                    </div>
                    <h3 className="text-gray-900 font-black text-lg">Queue Clear</h3>
                    <p className="text-gray-400 max-w-xs mx-auto mt-1 font-medium text-sm">No orders in this stage require assignment at the moment.</p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead className="bg-gray-50/50">
                                <tr className="border-b border-gray-100">
                                    <th className="px-6 py-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.length === orders.length && orders.length > 0}
                                            onChange={() => setSelectedOrders(selectedOrders.length === orders.length ? [] : orders.map(o => o.id))}
                                            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Shipment</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Logistics Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Route Leg</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Recipient</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Dispatch Control</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {groupedOrders.map((item) => {
                                    const isGroup = item.isGroup;
                                    const ordersToRender = isGroup ? [item, ...(expandedGroups.includes(item.checkoutOrderNumber) ? item.subOrders : [])] : [item];

                                    return ordersToRender.map((order, idx) => {
                                        const isParentRow = isGroup && idx === 0;
                                        const isChildRow = isGroup && idx > 0;
                                        const statusInfo = getStatusInfo(order.status);
                                        const StatusIcon = statusInfo.icon;
                                        const isSelected = isParentRow
                                            ? order.subOrders.every(so => selectedOrders.includes(so.id))
                                            : selectedOrders.includes(order.id);

                                        return (
                                            <tr key={order.id} className={`group transition-colors ${isParentRow ? 'bg-orange-50/50 font-bold border-l-4 border-orange-500' : isChildRow ? 'bg-gray-50/30' : 'hover:bg-gray-50/80'}`}>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => isParentRow ? handleSelectOrder(null, order.subOrders.map(so => so.id)) : handleSelectOrder(order.id)}
                                                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {isParentRow ? (
                                                            <button
                                                                onClick={() => setExpandedGroups(prev => prev.includes(order.checkoutOrderNumber) ? prev.filter(g => g !== order.checkoutOrderNumber) : [...prev, order.checkoutOrderNumber])}
                                                                className="p-1 bg-white border border-orange-200 rounded text-orange-600 shadow-sm hover:scale-110 transition-transform"
                                                            >
                                                                {expandedGroups.includes(order.checkoutOrderNumber) ? <FaMinus className="h-2 w-2" /> : <FaPlus className="h-2 w-2" />}
                                                            </button>
                                                        ) : isChildRow ? (
                                                            <FaChevronRight className="h-3 w-3 text-gray-300 ml-4" />
                                                        ) : (
                                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                                <FaBox size={14} />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="text-sm font-black text-gray-900 leading-tight">#{order.orderNumber}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                                                {isParentRow ? 'Consolidated Group' : `${order.OrderItems?.length || 0} items • ${formatPrice(order.total)}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider w-fit border ${order.status === 'mixed' ? 'bg-orange-100 text-orange-700 border-orange-200' : `${statusInfo.bg} ${statusInfo.color} border-current/20`}`}>
                                                            <StatusIcon className="mr-1.5 h-2.5 w-2.5" />
                                                            {order.status === 'mixed' ? 'Mixed Batch Status' : statusInfo.label}
                                                        </div>
                                                        {!isParentRow && <AssignmentIndicator order={order} />}
                                                        {!isParentRow && order.deliveryType && <DeliveryTypeBadge deliveryType={order.deliveryType} />}
                                                        {!isParentRow && getOrderDeliveryTask(order) && <DeliveryTaskBadge task={getOrderDeliveryTask(order)} />}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {isParentRow ? (
                                                        <span className="text-[10px] font-black text-orange-700 bg-orange-100/50 px-2 py-1 rounded uppercase">Multi-Route Package</span>
                                                    ) : (
                                                        <LogisticsDestination order={order} condensed={true} />
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="text-xs font-black text-gray-800 leading-tight">{order.user?.name || (order.User?.name) || 'Walk-in Customer'}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium">{order.user?.email || (order.User?.email) || 'No contact info'}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {isParentRow ? (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedOrders(order.subOrders.map(so => so.id));
                                                                setIsBulkAssign(true);
                                                                setOrderToAssign(order.subOrders[0]);
                                                                setIsAssignModalOpen(true);
                                                            }}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-100 transition-all active:scale-95"
                                                        >
                                                            <FaUserPlus /> Consolidated Dispatch
                                                        </button>
                                                    ) : (
                                                        (() => {
                                                            const activeTask = getOrderDeliveryTask(order);
                                                            const isLocked = activeTask && ['accepted', 'in_progress'].includes(activeTask.status);
                                                            // If a driver is already assigned, don't block reassignment even if the order is "order_placed"
                                                            const isAwaitingConfirmation = order.status === 'order_placed' && !order.deliveryAgentId && !activeTask?.deliveryAgentId;

                                                            return (
                                                                <button
                                                                    disabled={isLocked || isAwaitingConfirmation}
                                                                    onClick={() => {
                                                                        setOrderToAssign(order);
                                                                        setIsBulkAssign(false);
                                                                        setIsAssignModalOpen(true);
                                                                    }}
                                                                    className={`inline-flex items-center gap-2 px-4 py-2 ${isLocked || isAwaitingConfirmation
                                                                        ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed'
                                                                        : order.deliveryAgentId
                                                                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-100'
                                                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100'
                                                                        } rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-lg transition-all active:scale-95`}
                                                                    title={isLocked ? "Agent has already started" : isAwaitingConfirmation ? "Awaiting Seller Conf." : ""}
                                                                >
                                                                    {isLocked ? (
                                                                        <><FaLock /> In Progress</>
                                                                    ) : isAwaitingConfirmation ? (
                                                                        <><FaClock /> Pending Conf.</>
                                                                    ) : (
                                                                        <><FaTruck /> {order.deliveryAgentId ? 'Reassign Agent' : 'Assign Agent'}</>
                                                                    )}
                                                                </button>
                                                            );
                                                        })()
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    });
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modals */}
            <DeliveryAssignmentModal
                isOpen={isAssignModalOpen}
                order={orderToAssign}
                isBulk={isBulkAssign}
                selectedOrderIds={selectedOrders}
                onClose={() => {
                    setIsAssignModalOpen(false);
                    setOrderToAssign(null);
                    setIsBulkAssign(false);
                }}
                onAssign={handleAssignDriver}
            />
        </div>
    );
};

export default DeliveryAssignment;

