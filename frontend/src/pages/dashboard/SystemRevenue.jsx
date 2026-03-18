import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import {
    FaMoneyBillWave, FaTruck, FaTimes, FaChevronRight, FaCogs, FaClock, FaArrowLeft
} from 'react-icons/fa';

export default function SystemRevenue() {
    const [revenueStats, setRevenueStats] = useState({
        summary: {
            itemSaleRevenue: 0,
            marketerRevenue: 0,
            deliveryRevenue: 0,
            agentRevenue: 0
        },
        orders: []
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedRevenueOrder, setSelectedRevenueOrder] = useState(null);
    const [activeRevenueType, setActiveRevenueType] = useState('overview'); // 'overview', 'item', 'delivery'

    const navigate = useNavigate();

    const formatCurrency = (val) => new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0
    }).format(val || 0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const revenueRes = await adminApi.getRevenueAnalytics();
                if (revenueRes.data) {
                    setRevenueStats(revenueRes.data);
                }
            } catch (err) {
                console.error('Error fetching revenue data:', err);
                setError('Failed to load system revenue statistics');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const RevenueCard = ({ icon: Icon, title, platformValue, otherValue, otherLabel, type, bgColor, textColor }) => (
        <div
            onClick={() => {
                setActiveRevenueType(type);
                window.scrollTo(0, 0);
            }}
            className={`relative p-8 rounded-3xl shadow-xl overflow-hidden ${bgColor} ${textColor} transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer group`}
        >
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className="p-4 rounded-2xl bg-white bg-opacity-20 backdrop-blur-md">
                        <Icon className="w-8 h-8" />
                    </div>
                    <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.2em] font-black opacity-70 mb-1">{title}</p>
                        <h3 className="text-3xl font-black">
                            {loading ? '...' : formatCurrency(platformValue)}
                        </h3>
                    </div>
                </div>
                <div className="flex justify-between items-center py-4 border-t border-white border-opacity-10">
                    <span className="text-sm opacity-80">{otherLabel}</span>
                    <span className="text-lg font-bold">{loading ? '...' : formatCurrency(otherValue)}</span>
                </div>
                <div className="mt-4 text-center">
                    <span className="text-xs font-bold uppercase tracking-widest px-6 py-2 bg-white bg-opacity-10 rounded-full group-hover:bg-opacity-20 transition-all border border-white border-opacity-10">
                        Explore Records
                    </span>
                </div>
            </div>
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white bg-opacity-5 rounded-full transform rotate-12 transition-transform group-hover:scale-150 duration-700"></div>
        </div>
    );

    const renderOverview = () => (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-200">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">System Revenue</h1>
                    <p className="text-slate-500 mt-2 font-medium">Financial yield and partner distribution auditing.</p>
                </div>
                <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Financial Ledger</span>
                </div>
            </header>

            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Financial Hub</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <RevenueCard
                    icon={FaMoneyBillWave}
                    title="Sales Revenue (Platform)"
                    platformValue={revenueStats.summary.itemSaleRevenue}
                    otherValue={revenueStats.summary.marketerRevenue}
                    otherLabel="Marketer Share"
                    type="item"
                    bgColor="bg-slate-900"
                    textColor="text-white"
                />
                <RevenueCard
                    icon={FaTruck}
                    title="Logistics Revenue (Platform)"
                    platformValue={revenueStats.summary.deliveryRevenue}
                    otherValue={revenueStats.summary.agentRevenue}
                    otherLabel="Agent Share"
                    type="delivery"
                    bgColor="bg-blue-600"
                    textColor="text-white"
                />
            </div>
        </section>
    );

    const renderAuditTable = () => (
        <section className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-6">
                <button
                    onClick={() => setActiveRevenueType('overview')}
                    className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm group"
                >
                    <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                </button>
                <div>
                    <h2 className="text-3xl font-black text-slate-900">
                        {activeRevenueType === 'item' ? 'Sales Revenue Audits' : 'Logistics Revenue Audits'}
                    </h2>
                    <p className="text-slate-500 font-bold mt-1">Validated financial records for every order cycle.</p>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-900 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">
                            <th className="px-10 py-8">Order Cycle</th>
                            <th className="px-10 py-8 text-right">Platform Yield</th>
                            <th className="px-10 py-8 text-right">{activeRevenueType === 'item' ? 'Marketer' : 'Agent'} Share</th>
                            <th className="px-10 py-8 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {revenueStats.orders.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="py-32 text-center">
                                    <div className="w-24 h-24 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-center mx-auto mb-8 text-slate-300 text-4xl">
                                        <FaCogs />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Zero Financials Captured</h3>
                                </td>
                            </tr>
                        ) : (
                            revenueStats.orders.map((order) => (
                                <tr key={order.id} className="hover:bg-blue-50/30 transition-all group">
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-6">
                                            <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black tracking-widest shadow-lg group-hover:scale-110 transition-transform">
                                                #{order.orderNumber}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 text-sm">
                                                    {new Date(order.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <p className="text-xl font-black text-emerald-600">
                                            {formatCurrency(activeRevenueType === 'item' ? order.itemSaleRevenue : order.deliveryRevenue)}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Direct Rev</p>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <p className="text-lg font-bold text-slate-900">
                                            {formatCurrency(activeRevenueType === 'item' ? order.marketerRevenue : order.agentRevenue)}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Paid Out</p>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <button
                                            onClick={() => setSelectedRevenueOrder(order)}
                                            className="px-6 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm flex items-center gap-2 ml-auto"
                                        >
                                            <FaChevronRight size={10} /> Details
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-12 bg-transparent min-h-screen">
            {error && (
                <div className="p-6 bg-rose-50 border border-rose-100 text-rose-700 rounded-3xl flex items-center justify-between">
                    <p className="font-extrabold">{error}</p>
                    <button onClick={() => window.location.reload()} className="px-6 py-2 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest">Retry</button>
                </div>
            )}

            {activeRevenueType === 'overview' ? renderOverview() : renderAuditTable()}

            {/* Item Extraction Modal ProjectPro */}
            {selectedRevenueOrder && (
                <div className="fixed inset-0 z-[110] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-5xl h-full max-h-[90vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                        <div className="p-12 border-b bg-slate-50 flex justify-between items-center">
                            <div>
                                <span className="px-5 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full">Auditing</span>
                                <h2 className="text-4xl font-black text-slate-900 mt-4 tracking-tighter">Order #{selectedRevenueOrder.orderNumber}</h2>
                            </div>
                            <button
                                onClick={() => setSelectedRevenueOrder(null)}
                                className="p-5 hover:bg-slate-200 rounded-3xl transition-all shadow-sm bg-white"
                            >
                                <FaTimes className="text-slate-400" size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-12 space-y-16">
                            <section className="space-y-8">
                                <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.5em]">Margin Control Audit</h3>
                                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden text-sm">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                                <th className="px-8 py-6">Product</th>
                                                <th className="px-8 py-6 text-right">Retail</th>
                                                <th className="px-8 py-6 text-right">Acquisition</th>
                                                <th className="px-8 py-6 text-right">Qty</th>
                                                <th className="px-8 py-6 text-right">Yield</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {selectedRevenueOrder.items?.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-8 py-8">
                                                        <p className="font-black text-slate-800">{item.name}</p>
                                                    </td>
                                                    <td className="px-8 py-8 text-right font-bold">{formatCurrency(item.sellingPrice)}</td>
                                                    <td className="px-8 py-8 text-right text-slate-400">{formatCurrency(item.basePrice)}</td>
                                                    <td className="px-8 py-8 text-right font-black">{item.quantity}</td>
                                                    <td className="px-8 py-8 text-right font-black text-emerald-600">+{formatCurrency(item.markup)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <div className="grid md:grid-cols-2 gap-10 pb-10">
                                <div className="bg-indigo-600 p-10 rounded-[3rem] text-white">
                                    <h4 className="text-[10px] font-black uppercase opacity-60 tracking-[0.3em] mb-8">Sales Distribution</h4>
                                    <div className="flex justify-between items-center bg-white/10 p-4 rounded-2xl mb-4">
                                        <span className="text-xs font-bold">Platform Yield</span>
                                        <span className="text-2xl font-black">{formatCurrency(selectedRevenueOrder.itemSaleRevenue)}</span>
                                    </div>
                                </div>
                                <div className="bg-cyan-600 p-10 rounded-[3rem] text-white">
                                    <h4 className="text-[10px] font-black uppercase opacity-60 tracking-[0.3em] mb-8">Logistics Distribution</h4>
                                    <div className="flex justify-between items-center bg-white/10 p-4 rounded-2xl mb-4">
                                        <span className="text-xs font-bold">Network Yield</span>
                                        <span className="text-2xl font-black">{formatCurrency(selectedRevenueOrder.deliveryRevenue)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 bg-slate-50 border-t flex justify-end">
                            <button onClick={() => setSelectedRevenueOrder(null)} className="px-14 py-5 bg-slate-900 text-white font-black uppercase text-xs tracking-[0.3em] rounded-3xl">Exit Audit</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
