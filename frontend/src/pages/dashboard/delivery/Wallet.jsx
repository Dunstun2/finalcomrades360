import React, { useState, useEffect } from 'react';
import {
    FaMoneyBillWave, FaWallet, FaCheckCircle, FaClock, FaArrowRight,
    FaTruck, FaMotorcycle, FaWarehouse, FaMapMarkerAlt, FaChevronDown,
    FaChevronUp, FaSearch, FaClipboardCheck, FaExclamationCircle
} from 'react-icons/fa';

import { formatPrice } from '../../../utils/currency';
import { resolveImageUrl } from '../../../utils/imageUtils';
import api from '../../../services/api';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import DeliveryTaskConsole from '../../../components/delivery/DeliveryTaskConsole';

// Helpers
const getDeliveryLabel = (type) => ({
    seller_to_customer: 'Seller → Customer',
    seller_to_warehouse: 'Seller → Warehouse',
    warehouse_to_customer: 'Warehouse → Customer',
    customer_to_warehouse: 'Customer → Warehouse',
}[type] || type?.replace(/_/g, ' ') || 'Standard');

const DeliveryTypeIcon = ({ type }) => {
    if (type?.includes('warehouse')) return <FaWarehouse className="text-indigo-500" />;
    return <FaMotorcycle className="text-blue-500" />;
};

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
        case 'out_for_delivery':
        case 'in_transit':
            return { label: 'In Transit', color: 'blue', bg: 'bg-blue-100', icon: <FaTruck className="text-blue-600" /> };
        case 'en_route_to_warehouse':
            return { label: 'To Warehouse', color: 'indigo', bg: 'bg-indigo-100', icon: <FaTruck className="text-indigo-600" /> };
        case 'delivered':
            return { label: 'Delivered', color: 'green', bg: 'bg-green-100', icon: <FaCheckCircle className="text-green-600" /> };
        case 'failed':
            return { label: 'Failed Delivery', color: 'red', bg: 'bg-red-100', icon: <FaExclamationCircle className="text-red-600" /> };
        default:
            return { label: status?.replace(/_/g, ' ').toUpperCase(), color: 'gray', bg: 'bg-gray-100', icon: <FaClipboardCheck className="text-gray-500" /> };
    }
};

const DeliveryWallet = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');
    const [walletData, setWalletData] = useState({ balance: 0, pendingBalance: 0, successBalance: 0, transactions: [] });
    const [orders, setOrders] = useState([]);
    const [expandedOrders, setExpandedOrders] = useState(new Set());
    const [agentSharePercent, setAgentSharePercent] = useState(70);
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleWalletCount, setVisibleWalletCount] = useState(10);


    useEffect(() => {
        fetchAll();
        const interval = setInterval(() => {
            fetchAll(false);
        }, 30000); // Increased from 5s to 30s to reduce API spam
        return () => clearInterval(interval);
    }, []);

    const fetchAll = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const [walletRes, configRes] = await Promise.all([
                api.get('/delivery/wallet'),
                api.get('/finance/config').catch(() => ({ data: { agentShare: 70 } }))
            ]);
            setWalletData(walletRes.data);
            setAgentSharePercent(configRes.data.agentShare || 70);
        } catch (err) {
            console.error('Failed to fetch wallet data:', err);
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

    // Filter transactions based on active tab and search
    const filteredTransactions = (walletData.transactions || []).filter(tx => {
        const matchesTab = tx.status === activeTab || (activeTab === 'paid' && tx.status === 'completed');
        const matchesSearch = (tx.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
            || (tx.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const tabLabels = {
        pending: { icon: <FaClock />, label: 'Pending', color: 'orange' },
        success: { icon: <FaCheckCircle />, label: 'Success (Cleared)', color: 'green' },
        paid: { icon: <FaMoneyBillWave />, label: 'Paid Out', color: 'blue' },
    };

    if (loading) {
        return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" /></div>;
    }

    return (
        <div className="p-4 md:p-6 space-y-8 animate-fadeIn max-w-5xl mx-auto">

            {/* ── Header ── */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Delivery Wallet</h1>
                <p className="text-gray-500 text-sm">Manage your earnings and payouts</p>
            </div>

            {/* ── Balance Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Withdrawable */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-blue-100 font-medium text-sm">Available (Paid)</span>
                            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                                <FaCheckCircle className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="text-3xl font-bold mb-4">{formatPrice(walletData.balance)}</div>
                        <button className="bg-white text-blue-700 w-full py-2 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors flex items-center justify-center group">
                            Withdraw <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Success / Cleared */}
                <div className="bg-white border border-green-100 rounded-2xl p-6 shadow-sm bg-green-50/20">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className="text-green-600 font-medium text-sm">Success (Cleared)</span>
                            <div className="text-3xl font-bold mt-1 text-gray-900">{formatPrice(walletData.successBalance)}</div>
                        </div>
                        <div className="bg-green-100 p-3 rounded-xl text-green-600"><FaCheckCircle className="w-6 h-6" /></div>
                    </div>
                    <p className="text-[10px] text-green-600 leading-relaxed font-medium">Task completed. Awaiting admin payout to your available balance.</p>
                </div>

                {/* Pending */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className="text-gray-500 font-medium text-sm">Pending Payment</span>
                            <div className="text-3xl font-bold mt-1 text-gray-900">{formatPrice(walletData.pendingBalance)}</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-xl text-orange-500"><FaClock className="w-6 h-6" /></div>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed">Earnings from tasks in progress. Clears after task completion.</p>
                </div>
            </div>

            {/* ── Earning Records — Transaction-based ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header + Search */}
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <h2 className="text-base font-bold text-gray-800 flex items-center">
                        <FaWallet className="mr-2 text-blue-500" /> Earning Records
                    </h2>
                    <div className="relative w-full md:w-56">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                        <input
                            type="text" placeholder="Search order # or desc"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm w-full outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 h-14 bg-gray-50/50">
                    {Object.entries(tabLabels).map(([key, { label }]) => (
                        <button
                            key={key} onClick={() => handleTabChange(key)}
                            className={`flex-1 flex items-center justify-center font-bold text-sm transition-all relative ${activeTab === key ? 'text-blue-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {label}
                            {activeTab === key && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />}
                        </button>
                    ))}
                </div>

                {/* Transaction Cards */}
                <div className="divide-y divide-gray-50 min-h-[300px]">
                    {filteredTransactions.slice(0, visibleWalletCount).length > 0 ? filteredTransactions.slice(0, visibleWalletCount).map((tx) => {
                        const isExpanded = expandedOrders.has(tx.id);
                        const txDate = new Date(tx.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
                        const txTime = new Date(tx.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                        // Prepare order object for DeliveryTaskConsole
                        const orderObj = tx.order ? {
                            ...tx.order,
                            OrderItems: tx.orderItems?.map(oi => ({
                                ...oi,
                                deliveryFee: oi.deliveryFee // Already provided by backend
                            }))
                        } : null;

                        // Identify the specific task from the order's tasks that matches this transaction
                        const taskObj = tx.order?.deliveryTasks?.find(t =>
                            tx.description.includes(t.deliveryType) ||
                            Math.abs(t.agentEarnings - tx.amount) < 0.01
                        ) || tx.order?.deliveryTasks?.[0];

                        return (
                            <div key={tx.id} className="p-1">
                                {orderObj ? (
                                    <DeliveryTaskConsole
                                        order={orderObj}
                                        task={taskObj}
                                        agentSharePercent={taskObj?.agentShare || agentSharePercent}
                                        isExpanded={isExpanded}
                                        onToggleExpand={() => toggleOrder(tx.id)}
                                    >
                                        <div className="flex items-center justify-between w-full mt-4 bg-white border border-blue-50 rounded-xl p-4 shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg bg-blue-100`}>
                                                    <FaTruck className="text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Transaction Date</p>
                                                    <p className="text-xs font-bold text-gray-900">{txDate} at {txTime}</p>
                                                    <p className="text-[9px] text-blue-500 font-medium">{tx.description}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-green-600 font-bold uppercase mb-0.5">Net Earnings</p>
                                                <p className="text-lg font-black text-green-600">+{formatPrice(tx.amount)}</p>
                                            </div>
                                        </div>
                                    </DeliveryTaskConsole>
                                ) : (
                                    <div className="p-4 bg-white border border-gray-100 rounded-xl mb-2 flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{tx.description}</p>
                                            <p className="text-xs text-gray-500">{txDate} at {txTime}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-green-600">+{formatPrice(tx.amount)}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{tx.status}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    }) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
                            <FaWallet className="w-12 h-12 mb-4 opacity-10" />
                            <p className="font-medium">No {activeTab} records found</p>
                        </div>
                    )}

                    {/* Load More */}
                    {filteredTransactions.length > visibleWalletCount && (
                        <div className="p-4 text-center">
                            <button
                                onClick={() => setVisibleWalletCount(c => c + 10)}
                                className="px-6 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm rounded-xl border border-blue-200 transition-all"
                            >
                                Load More ({filteredTransactions.length - visibleWalletCount} remaining)
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeliveryWallet;
