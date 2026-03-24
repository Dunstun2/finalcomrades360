import React, { useState, useEffect, useCallback } from 'react';
import {
    FaMoneyBillWave,
    FaCheckCircle,
    FaClock,
    FaUser,
    FaFilter,
    FaSearch,
    FaSpinner,
    FaExclamationTriangle,
    FaListAlt
} from 'react-icons/fa';
import api from '../../services/api';

const formatPrice = (amount) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount || 0);

const PendingPayouts = () => {
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchPayouts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/finance/pending-payouts');
            setPayouts(res.data || []);
        } catch (err) {
            console.error('Failed to fetch pending payouts:', err);
            showToast('Failed to load pending payouts.', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPayouts();
    }, [fetchPayouts]);

    const filteredPayouts = payouts.filter(tx => {
        const matchSearch =
            tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.User?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.User?.phone?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchRole = filterRole === 'all' || tx.User?.role === filterRole;
        return matchSearch && matchRole;
    });

    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredPayouts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredPayouts.map(tx => tx.id)));
        }
    };

    const processSelected = async () => {
        if (selectedIds.size === 0) return;
        setProcessing(true);
        try {
            await api.post('/finance/process-payout', { transactionIds: Array.from(selectedIds) });
            showToast(`Successfully processed ${selectedIds.size} payout(s)!`);
            setSelectedIds(new Set());
            await fetchPayouts();
        } catch (err) {
            console.error('Failed to process payouts:', err);
            showToast('Failed to process payouts. Please try again.', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const totalSelected = filteredPayouts
        .filter(tx => selectedIds.has(tx.id))
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const roles = ['all', ...new Set(payouts.map(tx => tx.User?.role).filter(Boolean))];

    return (
        <div className="p-6 space-y-6 animate-fadeIn relative">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-xl text-white text-sm font-bold flex items-center gap-3 transition-all ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
                    {toast.type === 'error' ? <FaExclamationTriangle /> : <FaCheckCircle />}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <span className="p-2 bg-blue-100 text-blue-600 rounded-xl"><FaMoneyBillWave /></span>
                        Pending Payouts
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        Review and process cleared earnings awaiting transfer to user accounts.
                    </p>
                </div>

                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3">
                        <div className="text-sm">
                            <span className="font-bold text-blue-700">{selectedIds.size}</span>
                            <span className="text-blue-600"> selected · </span>
                            <span className="font-bold text-blue-700">{formatPrice(totalSelected)}</span>
                        </div>
                        <button
                            onClick={processSelected}
                            disabled={processing}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {processing ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                            {processing ? 'Processing...' : 'Process Payouts'}
                        </button>
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Total Clearing</p>
                    <p className="text-2xl font-black text-gray-900">
                        {formatPrice(payouts.reduce((s, tx) => s + (tx.amount || 0), 0))}
                    </p>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Transactions</p>
                    <p className="text-2xl font-black text-gray-900">{payouts.length}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Unique Payees</p>
                    <p className="text-2xl font-black text-gray-900">
                        {new Set(payouts.map(tx => tx.userId)).size}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by user, description..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                    />
                </div>
                <div className="relative">
                    <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                        value={filterRole}
                        onChange={e => setFilterRole(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-8 py-3 text-sm focus:outline-none focus:border-blue-400 transition-all appearance-none capitalize"
                    >
                        {roles.map(r => (
                            <option key={r} value={r}>{r === 'all' ? 'All Roles' : r.replace('_', ' ')}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-gray-400">
                        <FaSpinner className="animate-spin text-3xl mr-3" />
                        Loading payouts...
                    </div>
                ) : filteredPayouts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <FaListAlt className="text-5xl mb-4 opacity-20" />
                        <p className="font-bold">No pending payouts found</p>
                        <p className="text-sm mt-1">All cleared earnings have been paid out or no records match your filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 text-gray-400 text-[11px] uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 text-left w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === filteredPayouts.length && filteredPayouts.length > 0}
                                            onChange={toggleSelectAll}
                                            className="rounded accent-blue-600 w-4 h-4 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left">User</th>
                                    <th className="px-6 py-4 text-left">Description</th>
                                    <th className="px-6 py-4 text-left">Date</th>
                                    <th className="px-6 py-4 text-left">Role</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredPayouts.map(tx => (
                                    <tr
                                        key={tx.id}
                                        onClick={() => toggleSelect(tx.id)}
                                        className={`hover:bg-blue-50/30 transition-colors cursor-pointer group ${selectedIds.has(tx.id) ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(tx.id)}
                                                onChange={() => toggleSelect(tx.id)}
                                                onClick={e => e.stopPropagation()}
                                                className="rounded accent-blue-600 w-4 h-4 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-blue-600">
                                                    <FaUser className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">{tx.User?.name || tx.user?.name || 'Unknown'}</p>
                                                    <p className="text-xs text-gray-400">{tx.User?.phone || tx.user?.phone || '-'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-700">{tx.description}</div>
                                            {tx.metadata && (
                                                <div className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded inline-block mt-1 font-bold">
                                                    {(() => {
                                                        try {
                                                            const meta = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
                                                            return `${meta.method?.toUpperCase()}: ${meta.details}`;
                                                        } catch (e) { return null; }
                                                    })()}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(tx.createdAt).toLocaleDateString('en-GB', {
                                                day: 'numeric', month: 'short', year: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wider capitalize">
                                                {(tx.User?.role || tx.user?.role)?.replace('_', ' ') || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-black text-green-600 text-sm">{formatPrice(tx.amount)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={async () => {
                                                    setProcessing(true);
                                                    try {
                                                        await api.post('/finance/process-payout', { transactionIds: [tx.id] });
                                                        showToast('Payout processed!');
                                                        await fetchPayouts();
                                                    } catch {
                                                        showToast('Failed to process payout.', 'error');
                                                    } finally {
                                                        setProcessing(false);
                                                    }
                                                }}
                                                className="text-xs bg-green-50 hover:bg-green-100 text-green-700 font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 mx-auto"
                                            >
                                                <FaCheckCircle className="w-3 h-3" /> Pay
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Info Banner */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-4 items-start text-sm">
                <FaClock className="text-amber-400 mt-0.5 shrink-0 text-lg" />
                <div>
                    <p className="font-bold text-amber-800">How Payouts Work</p>
                    <p className="text-amber-600 mt-1 leading-relaxed">
                        These are earnings that have completed their operation cycle (e.g. delivered orders, completed tasks)
                        and are cleared for payout. Clicking "Pay" moves the amount from the user's <strong>Success</strong> balance
                        to their <strong>Available (Paid)</strong> balance for withdrawal.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PendingPayouts;
