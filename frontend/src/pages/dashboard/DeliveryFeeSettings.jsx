import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { FaPercent, FaRoute, FaSave, FaSyncAlt, FaInfoCircle } from 'react-icons/fa';

export default function DeliveryFeeSettings() {
    const [agentShare, setAgentShare] = useState(80);
    const [routeFees, setRouteFees] = useState({
        seller_to_warehouse: { fee: 0, label: 'Seller to Warehouse' },
        warehouse_to_seller: { fee: 0, label: 'Warehouse to Seller' },
        seller_to_pickup_station: { fee: 0, label: 'Seller to Pickup Station' },
        pickup_station_to_seller: { fee: 0, label: 'Pickup Station to Seller' },
        warehouse_to_customer: { fee: 0, label: 'Warehouse to Customer' },
        seller_to_customer: { fee: 0, label: 'Direct Seller to Customer' }
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadSettings = async () => {
        setLoading(true);
        setError('');
        try {
            const financeRes = await api.get('/finance/config');
            if (financeRes.data && financeRes.data.agentShare !== undefined) {
                setAgentShare(financeRes.data.agentShare);
            }

            const routeRes = await api.get('/admin/config/delivery_route_fees').catch(() => ({ data: { success: false } }));
            if (routeRes.data && routeRes.data.success && routeRes.data.data) {
                const loadedFees = typeof routeRes.data.data === 'string' ? JSON.parse(routeRes.data.data) : routeRes.data.data;
                setRouteFees(prev => ({ ...prev, ...loadedFees }));
            }
        } catch (err) {
            console.error('Failed to load delivery settings', err);
            setError('Failed to load settings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const handleSaveAgentShare = async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.post('/finance/config', { agentShare: parseFloat(agentShare) });
            setSuccess('Agent share updated successfully!');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update agent share');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRouteFees = async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.post('/admin/config/delivery_route_fees', { value: JSON.stringify(routeFees) });
            setSuccess('Route fees updated successfully!');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update route fees');
        } finally {
            setLoading(false);
        }
    };

    const updateRouteFee = (key, fee) => {
        setRouteFees(prev => ({
            ...prev,
            [key]: { ...prev[key], fee: parseFloat(fee) || 0 }
        }));
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Delivery & Logistics Settings</h1>
                    <p className="text-gray-500">Configure delivery agent earnings and route-based fees.</p>
                </div>
                <button
                    onClick={loadSettings}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    title="Refresh Settings"
                >
                    <FaSyncAlt className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {error && <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded shadow-sm">{error}</div>}
            {success && <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded shadow-sm">{success}</div>}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                        <FaPercent />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Delivery Agent Share</h2>
                        <p className="text-sm text-gray-500">Percentage of the delivery fee that goes to the agent.</p>
                    </div>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Agent Earning Percentage (%)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={agentShare}
                                    onChange={(e) => setAgentShare(e.target.value)}
                                    className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="e.g. 70"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                            </div>
                        </div>
                        <button
                            onClick={handleSaveAgentShare}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            <FaSave /> Save Changes
                        </button>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex gap-3">
                        <FaInfoCircle className="text-gray-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-600">
                            The system will keep <strong className="text-blue-600">{(100 - (parseFloat(agentShare) || 0)).toFixed(1)}%</strong> of every delivery fee as platform revenue.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center gap-3">
                    <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
                        <FaRoute />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Route-Based Delivery Fees (Logistics Transfers)</h2>
                        <p className="text-sm text-gray-500">Fixed fees for transfers between Sellers and Hubs (Warehouses/Stations).</p>
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                        {Object.entries(routeFees).filter(([key]) =>
                            ['seller_to_warehouse', 'warehouse_to_seller', 'seller_to_pickup_station', 'pickup_station_to_seller'].includes(key)
                        ).map(([key, config]) => (
                            <div key={key} className="space-y-1">
                                <label className="block text-sm font-semibold text-gray-700">{config.label}</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">KES</span>
                                    <input
                                        type="number"
                                        value={config.fee}
                                        onChange={(e) => updateRouteFee(key, e.target.value)}
                                        className="w-full pl-12 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 italic">Key: {key}</p>
                            </div>
                        ))}
                    </div>
                    <div className="pt-4 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                            <FaInfoCircle className="text-blue-500" />
                            <span>These are <strong>Internal Logistics Fees</strong> (Agent Pay). Customer pick station prices are managed <Link to="/dashboard/pickup-stations" className="text-blue-600 hover:underline font-bold">here</Link>.</span>
                        </div>
                        <button
                            onClick={handleSaveRouteFees}
                            disabled={loading}
                            className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 px-8 rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <FaSave /> Save Route Fees
                        </button>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-100 flex gap-3">
                        <FaInfoCircle className="text-orange-400 shrink-0 mt-0.5" />
                        <div className="text-sm text-orange-800 leading-relaxed">
                            <p className="font-bold mb-1">Fee Calculation Logic:</p>
                            <ul className="list-disc ml-4 space-y-1">
                                <li><strong>Seller ↔ Hub (Warehouse/Station)</strong>: Uses the <strong>fixed fees</strong> configured above. These are internal logistics costs typically shared with the seller.</li>
                                <li><strong>Hub → Customer</strong>: Uses <strong>per-item delivery fees</strong> set by the seller during product listing.</li>
                                <li><strong>Direct Seller → Customer</strong>: Uses <strong>per-item delivery fees</strong>.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
