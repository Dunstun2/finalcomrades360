import React, { useState, useEffect } from 'react';
import {
    FaHistory, FaChartLine, FaMoneyBillWave, FaCalendarAlt,
    FaCheckCircle, FaStar, FaChevronDown, FaChevronUp,
    FaUser, FaMapMarkerAlt, FaClock, FaSearch, FaTruck, FaBox,
    FaStore, FaMotorcycle, FaWarehouse, FaClipboardCheck, FaExclamationCircle, FaMapMarkedAlt
} from 'react-icons/fa';
import { formatPrice } from '../../../utils/currency';
import { resolveImageUrl } from '../../../utils/imageUtils';
import api from '../../../services/api';
import DeliveryTaskConsole from '../../../components/delivery/DeliveryTaskConsole';

import {
    Chart as ChartJS,
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// Delivery type label helper
const getDeliveryLabel = (type) => ({
    seller_to_customer: 'Seller → Customer',
    seller_to_warehouse: 'Seller → Warehouse',
    warehouse_to_customer: 'Warehouse → Customer',
    customer_to_warehouse: 'Customer → Warehouse',
}[type] || type?.replace(/_/g, ' ') || 'Standard');

// Pick icon for delivery type
const DeliveryTypeIcon = ({ type }) => {
    if (type?.includes('warehouse')) return <FaWarehouse className="text-indigo-500" />;
    if (type === 'seller_to_customer') return <FaMotorcycle className="text-blue-500" />;
    return <FaTruck className="text-blue-500" />;
};

// Reusable order item image getter
const getOrderItemImage = (item) => {
    if (item.FastFood || item.fastFood) return item.FastFood?.mainImage || item.fastFood?.mainImage;
    if (item.Product || item.product) {
        const p = item.Product || item.product;
        return p.coverImage || p.mainImage || (Array.isArray(p.images) && p.images[0]) || null;
    }
    return null;
};

const getStatusInfo = (status) => {
    switch (status) {
        case 'ready_for_pickup':
            return { label: 'Ready for Pickup', color: 'yellow', bg: 'bg-yellow-100', icon: <FaClock className="text-yellow-600" /> };
        case 'processing':
            return { label: 'Processing', color: 'yellow', bg: 'bg-yellow-100', icon: <FaClipboardCheck className="text-yellow-600" /> };
        case 'out_for_delivery':
        case 'in_transit':
            return { label: 'In Transit', color: 'blue', bg: 'bg-blue-100', icon: <FaTruck className="text-blue-600" /> };
        case 'en_route_to_warehouse':
            return { label: 'To Warehouse', color: 'indigo', bg: 'bg-indigo-100', icon: <FaTruck className="text-indigo-600" /> };
        case 'at_warehouse':
            return { label: 'At Warehouse', color: 'indigo', bg: 'bg-indigo-100', icon: <FaWarehouse className="text-indigo-600" /> };
        case 'delivered':
            return { label: 'Delivered', color: 'green', bg: 'bg-green-100', icon: <FaCheckCircle className="text-green-600" /> };
        case 'failed':
            return { label: 'Failed Delivery', color: 'red', bg: 'bg-red-100', icon: <FaExclamationCircle className="text-red-600" /> };
        default:
            return { label: status?.replace(/_/g, ' ').toUpperCase(), color: 'gray', bg: 'bg-gray-100', icon: <FaClipboardCheck className="text-gray-500" /> };
    }
};

const DeliveryLogistics = () => {
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('weekly');
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedOrders, setExpandedOrders] = useState(new Set());
    const [agentSharePercent, setAgentSharePercent] = useState(70);
    const [stats, setStats] = useState({
        totalEarnings: 0, pendingPayout: 0, completedDeliveries: 0,
        avgRating: 0, chartData: { labels: [], datasets: [] }
    });
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            fetchData(false);
        }, 60000); // Increased from 5s to 60s
        return () => clearInterval(interval);
    }, [period]);

    const fetchData = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const [statsRes, ordersRes, configRes] = await Promise.all([
                api.get(`/delivery/stats?period=${period}`),
                api.get('/delivery/orders?history=true&pageSize=100'),
                api.get('/finance/config').catch(() => ({ data: { agentShare: 70 } }))
            ]);

            const ratio = (configRes.data.agentShare || 70);
            setAgentSharePercent(ratio);

            const statsData = statsRes.data;
            const rawOrders = ordersRes.data.data || ordersRes.data.orders || (Array.isArray(ordersRes.data) ? ordersRes.data : []);

            setStats({
                totalEarnings: statsData.totalEarnings || 0,
                pendingPayout: statsData.pendingPayout || 0,
                completedDeliveries: statsData.completedDeliveries || 0,
                avgRating: statsData.avgRating || 5.0,
                chartData: statsData.chartData || { labels: [], datasets: [] }
            });

            // Compute agentEarnings per order matches Orders.jsx logic style
            const enriched = rawOrders.map(order => {
                const task = (order.deliveryTasks && order.deliveryTasks.length > 0) 
                  ? [...order.deliveryTasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] 
                  : null;
                const items = order.OrderItems || [];
                const itemsTotal = items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
                const itemDeliveryTotal = items.reduce((sum, item) => sum + ((Number(item.deliveryFee) || 0) * (item.quantity || 1)), 0);
                const taskFee = Number(task?.deliveryFee) || 0;

                // Effective fee priority matches computeOrderTotals in Orders.jsx
                const effectiveDeliveryFee = taskFee > 0 ? taskFee : (itemDeliveryTotal || Number(order.deliveryFee) || 0);

                // Use locked share if available
                const lockedShare = parseFloat(task?.agentShare);
                const currentShare = lockedShare || ratio;
                const agentEarnings = effectiveDeliveryFee * (currentShare / 100);

                return {
                    ...order,
                    _agentEarnings: agentEarnings,
                    _itemsTotal: itemsTotal,
                    _deliveryTotal: effectiveDeliveryFee,
                    _pickupName: order.deliveryType === 'warehouse_to_customer' || order.deliveryType === 'warehouse_to_pickup_station' ? (order.Warehouse?.name || 'Warehouse') : (order.seller?.name || 'Seller'),
                    _pickupAddress: order.deliveryType === 'warehouse_to_customer' || order.deliveryType === 'warehouse_to_pickup_station' ? (order.Warehouse?.address || 'Address pending') : (order.seller?.businessAddress || 'Collection Address'),
                    _deliveryName: order.deliveryType === 'seller_to_warehouse' || order.deliveryType === 'customer_to_warehouse' ? (order.Warehouse?.name || 'Warehouse') : (order.deliveryType === 'seller_to_pickup_station' || order.deliveryType === 'warehouse_to_pickup_station' ? (order.PickupStation?.name || 'Pickup Station') : (order.user?.name || 'Customer')),
                    _deliveryAddress: order.deliveryType === 'seller_to_pickup_station' || order.deliveryType === 'warehouse_to_pickup_station' ? (order.PickupStation?.location || order.deliveryAddress) : (task?.deliveryLocation || order.deliveryAddress || 'No address')
                };
            });

            setOrders(enriched);
        } catch (err) {
            console.error('Failed to fetch logistics data:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleOrder = (id) => {
        setExpandedOrders(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch = (order.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
            || (order.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        if (filter === 'today') {
            return matchesSearch && new Date(order.updatedAt).toDateString() === new Date().toDateString();
        }
        return matchesSearch;
    });

    if (loading && !orders.length) {
        return <div className="p-8 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div></div>;
    }

    return (
        <div className="space-y-6 p-4 md:p-6 animate-fadeIn max-w-5xl mx-auto">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Logistics &amp; Earnings</h1>
                    <p className="text-gray-500 text-sm">Consolidated view of your performance and income</p>
                </div>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="mt-4 md:mt-0 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="daily">Today's Chart</option>
                    <option value="weekly">This Week</option>
                    <option value="monthly">This Month</option>
                </select>
            </div>

            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: `${period === 'weekly' ? 'Weekly' : period === 'daily' ? 'Daily' : 'Monthly'} Earnings`, value: formatPrice(stats.totalEarnings), icon: <FaMoneyBillWave />, color: 'green' },
                    { label: 'Deliveries Completed', value: stats.completedDeliveries, icon: <FaCheckCircle />, color: 'blue' },
                    { label: 'Avg. Rating', value: `★ ${stats.avgRating}`, icon: <FaStar />, color: 'yellow' },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                        <div className={`p-3 bg-${s.color}-50 text-${s.color}-600 rounded-2xl mb-3 text-lg`}>{s.icon}</div>
                        <p className="text-gray-400 text-xs mb-1">{s.label}</p>
                        <h3 className="text-xl font-bold text-gray-900">{s.value}</h3>
                    </div>
                ))}
                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-5 rounded-2xl shadow-lg flex flex-col items-center text-center text-white">
                    <div className="p-3 bg-white/20 rounded-2xl mb-3 text-lg"><FaChartLine /></div>
                    <p className="text-blue-100 text-xs mb-1">Wallet Balance</p>
                    <h3 className="text-xl font-bold">{formatPrice(stats.pendingPayout)}</h3>
                </div>
            </div>

            {/* ── Performance Chart ── */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-base font-bold text-gray-900 flex items-center mb-4">
                    <FaChartLine className="mr-2 text-blue-500" /> Earnings Performance
                </h3>
                <div className="h-56 relative">
                    {stats.chartData.labels?.length > 0 ? (
                        <Line
                            data={{
                                ...stats.chartData,
                                datasets: stats.chartData.datasets.map(ds => ({
                                    ...ds, fill: true,
                                    backgroundColor: 'rgba(59,130,246,0.06)',
                                    borderColor: 'rgb(59,130,246)',
                                    pointBackgroundColor: 'rgb(59,130,246)',
                                    tension: 0.4
                                }))
                            }}
                            options={{
                                responsive: true, maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
                                    x: { grid: { display: false } }
                                }
                            }}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 italic text-sm">No data for this period</div>
                    )}
                </div>
            </div>

            {/* ── Delivery History ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Table Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <h3 className="text-base font-bold text-gray-900 flex items-center">
                        <FaHistory className="mr-2 text-blue-500" /> Delivery History
                    </h3>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-56">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                            <input
                                type="text" placeholder="Search order # or customer"
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm w-full outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
                            {['all', 'today'].map(f => (
                                <button key={f} onClick={() => setFilter(f)}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${filter === f ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Orders List */}
                <div className="divide-y divide-gray-50">
                    {filteredOrders.length > 0 ? filteredOrders.map((order) => {
                        const isExpanded = expandedOrders.has(order.id);
                        const statusInfo = getStatusInfo(order.status);
                        const deliveredAt = new Date(order.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                        const deliveredDate = new Date(order.updatedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });

                        return (
                            <DeliveryTaskConsole
                                key={order.id}
                                order={order}
                                agentSharePercent={agentSharePercent}
                                isExpanded={isExpanded}
                                onToggleExpand={() => toggleOrder(order.id)}
                            >
                                <div className="flex items-center justify-between w-full mt-4 bg-white border border-blue-50 rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${statusInfo.bg}`}>
                                            {statusInfo.icon}
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Completion Record</p>
                                            <p className="text-xs font-bold text-gray-900">{deliveredDate} at {deliveredAt}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-green-600 font-bold uppercase mb-0.5">Performance Stat</p>
                                        <p className="text-lg font-black text-gray-900">+{formatPrice(order._agentEarnings)} earned</p>
                                    </div>
                                </div>
                            </DeliveryTaskConsole>
                        );
                    }) : (
                        <div className="py-20 text-center">
                            <FaHistory className="mx-auto h-12 w-12 text-gray-100 mb-4" />
                            <p className="text-gray-400 font-medium">No deliveries found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeliveryLogistics;
