import React, { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaChartLine, FaWallet, FaHistory, FaCalendarAlt, FaDownload, FaArrowUp, FaArrowDown, FaStar } from 'react-icons/fa';
import { formatPrice } from '../../../utils/currency';
import api from '../../../services/api';
import DeliveryTaskConsole from '../../../components/delivery/DeliveryTaskConsole';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const DeliveryEarnings = () => {
    const [period, setPeriod] = useState('weekly'); // daily, weekly, monthly
    const [loading, setLoading] = useState(true);
    const [expandedOrders, setExpandedOrders] = useState(new Set());
    const [agentSharePercent, setAgentSharePercent] = useState(80);
    const [stats, setStats] = useState({
        totalEarnings: 0,
        pendingPayout: 0,
        completedDeliveries: 0,
        recentTransactions: [],
        chartData: { labels: [], datasets: [] }
    });

    useEffect(() => {
        fetchEarnings();
        const interval = setInterval(() => {
            fetchEarnings(false);
        }, 5000);
        return () => clearInterval(interval);
    }, [period]);

    const fetchEarnings = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const res = await api.get(`/delivery/stats?period=${period}`);
            const data = res.data;

            setStats({
                totalEarnings: data.totalEarnings || 0,
                pendingPayout: data.pendingPayout || 0,
                completedDeliveries: data.completedDeliveries || 0,
                recentTransactions: data.recentTransactions || [],
                chartData: data.chartData || { labels: [], datasets: [] }
            });
            if (data.agentShare) setAgentSharePercent(data.agentShare);
        } catch (error) {
            console.error('Failed to fetch earnings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCashout = async () => {
        if (stats.pendingPayout < 500) {
            alert('Minimum cashout amount is KES 500');
            return;
        }
        // Implement cashout logic
        alert('Cashout request submitted!');
    };

    if (loading) return <div className="p-8 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div></div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
                    <p className="text-gray-500">Track your income and payouts</p>
                </div>
                <div className="flex space-x-2">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="border rounded-lg px-4 py-2 bg-gray-50"
                    >
                        <option value="daily">Today</option>
                        <option value="weekly">This Week</option>
                        <option value="monthly">This Month</option>
                    </select>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                        <FaDownload />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm">Total Earnings</p>
                            <h3 className="text-2xl font-bold text-gray-900">{formatPrice(stats.totalEarnings)}</h3>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full text-green-600">
                            <FaMoneyBillWave />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-green-600 italic">
                        <span>Earnings updated in real-time</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm">Pending Payout</p>
                            <h3 className="text-2xl font-bold text-gray-900">{formatPrice(stats.pendingPayout)}</h3>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                            <FaWallet />
                        </div>
                    </div>
                    <button
                        onClick={handleCashout}
                        className="mt-4 w-full py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                        disabled={stats.pendingPayout < 500}
                    >
                        Cash Out Now
                    </button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm">Deliveries</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats.completedDeliveries}</h3>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                            <FaChartLine />
                        </div>
                    </div>
                    <p className="mt-4 text-sm text-gray-500">~{formatPrice(stats.totalEarnings / (stats.completedDeliveries || 1))} per delivery</p>
                </div>
            </div>

            {/* Main Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Earnings Overview</h3>
                <div className="h-80">
                    <Line
                        data={stats.chartData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        callback: (value) => `KES ${value}`
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    display: false
                                }
                            }
                        }}
                    />
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                </div>
                <div className="divide-y divide-gray-200">
                    {stats.recentTransactions.map((tx) => {
                        const isPayout = tx.type === 'payout';
                        if (!isPayout && tx.Order) {
                            const isExpanded = expandedOrders.has(tx.Order.id);
                            return (
                                <div key={tx.id} className="p-2 border-b border-gray-50">
                                    <DeliveryTaskConsole
                                        order={tx.Order}
                                        agentSharePercent={agentSharePercent}
                                        isExpanded={isExpanded}
                                        onToggleExpand={() => {
                                            setExpandedOrders(prev => {
                                                const next = new Set(prev);
                                                next.has(tx.Order.id) ? next.delete(tx.Order.id) : next.add(tx.Order.id);
                                                return next;
                                            });
                                        }}
                                    >
                                        <div className="flex items-center justify-between w-full mt-4 bg-white border border-blue-50 rounded-xl p-4 shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                                                    <FaMoneyBillWave />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Transaction Detail</p>
                                                    <p className="text-xs font-bold text-gray-900">{tx.date}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-green-600 font-bold uppercase mb-0.5">Earned</p>
                                                <p className="text-lg font-black text-green-600">+{formatPrice(tx.amount)}</p>
                                            </div>
                                        </div>
                                    </DeliveryTaskConsole>
                                </div>
                            );
                        }

                        return (
                            <div key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center space-x-4">
                                    <div className={`p-2 rounded-full ${tx.type === 'payout' ? 'bg-green-100 text-green-600' :
                                        'bg-blue-100 text-blue-600'
                                        }`}>
                                        {tx.type === 'payout' ? <FaWallet /> : <FaMoneyBillWave />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {tx.type === 'payout' ? 'Payout to M-Pesa' : tx.description || 'Delivery Earnings'}
                                        </p>
                                        <p className="text-sm text-gray-500">{tx.date}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${tx.type === 'payout' ? 'text-red-500' : 'text-green-600'}`}>
                                        {tx.type === 'payout' ? '-' : '+'}{formatPrice(tx.amount)}
                                    </p>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        {tx.status}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default DeliveryEarnings;
