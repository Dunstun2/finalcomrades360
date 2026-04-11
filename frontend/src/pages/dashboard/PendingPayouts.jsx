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
    FaListAlt,
    FaEye,
    FaTimes,
    FaUniversity,
    FaMobile,
    FaBuilding,
    FaImage,
    FaArrowRight
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
    const [viewPayout, setViewPayout] = useState(null); // selected payout for view modal
    const [fulfillmentPayout, setFulfillmentPayout] = useState(null); // selected payout for fulfillment modal
    const [payoutReference, setPayoutReference] = useState('');
    const [proofFile, setProofFile] = useState(null);
    const [uploading, setUploading] = useState(false);

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

    const processPayoutById = async (id) => {
        setProcessing(true);
        try {
            await api.post('/finance/process-payout', { transactionIds: [id] });
            showToast('Payout processed successfully!');
            setViewPayout(null);
            await fetchPayouts();
        } catch {
            showToast('Failed to process payout.', 'error');
        } finally {
            setProcessing(false);
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

    const processPayoutWithProof = async (id) => {
        if (!payoutReference) {
            showToast('Please enter a reference number.', 'error');
            return;
        }

        setProcessing(true);
        try {
            let proofUrl = null;
            if (proofFile) {
                setUploading(true);
                const formData = new FormData();
                formData.append('file', proofFile);
                const uploadRes = await api.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                proofUrl = uploadRes.data.url;
                setUploading(false);
            }

            await api.post('/finance/process-payout', { 
                transactionIds: [id],
                referenceNumber: payoutReference,
                proofUrl
            });

            showToast('Payout fulfilled successfully!');
            setFulfillmentPayout(null);
            setPayoutReference('');
            setProofFile(null);
            await fetchPayouts();
        } catch (err) {
            console.error('Failed to process payout:', err);
            showToast('Failed to fulfill payout.', 'error');
        } finally {
            setProcessing(false);
            setUploading(false);
        }
    };

    const totalSelected = filteredPayouts
        .filter(tx => selectedIds.has(tx.id))
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const roles = ['all', ...new Set(payouts.map(tx => tx.User?.role).filter(Boolean))];

    // Parse metadata from a transaction to get payment details
    const parsePaymentMeta = (tx) => {
        try {
            const meta = tx.metadata
                ? (typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata)
                : null;
            return meta || {};
        } catch {
            return {};
        }
    };

    const getPaymentMethodLabel = (method) => {
        const map = { mpesa: 'M-Pesa', bank: 'Bank Transfer', cash: 'Cash Pickup' };
        return map[method] || method || 'Not specified';
    };

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
                                    <th className="px-6 py-4 text-left">Payment Method</th>
                                    <th className="px-6 py-4 text-left">Date</th>
                                    <th className="px-6 py-4 text-left">Role</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredPayouts.map(tx => {
                                    const meta = parsePaymentMeta(tx);
                                    return (
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
                                            </td>
                                            <td className="px-6 py-4">
                                                {meta.method ? (
                                                    <div className="flex items-center gap-1.5">
                                                        {meta.method === 'mpesa' ? <FaMobile className="text-green-500 h-3 w-3" /> :
                                                         meta.method === 'bank' ? <FaUniversity className="text-blue-500 h-3 w-3" /> :
                                                         <FaBuilding className="text-gray-400 h-3 w-3" />}
                                                        <span className="text-[11px] font-bold text-gray-700 uppercase">{getPaymentMethodLabel(meta.method)}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-gray-400">—</span>
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
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* View button */}
                                                    <button
                                                        onClick={() => setViewPayout(tx)}
                                                        className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                                                        title="View payout details"
                                                    >
                                                        <FaEye className="w-3 h-3" /> View
                                                    </button>
                                                    {/* Pay button */}
                                                    <button
                                                        onClick={() => {
                                                            setPayoutReference('');
                                                            setProofFile(null);
                                                            setFulfillmentPayout(tx);
                                                        }}
                                                        className="text-xs bg-green-50 hover:bg-green-100 text-green-700 font-bold px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                                                    >
                                                        <FaCheckCircle className="w-3 h-3" /> Pay
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
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
                        and are cleared for payout. When you click <strong>"Pay"</strong>, the transaction is marked as completed,
                        the amount moves from the user's <strong>Success</strong> balance to their <strong>Available (Paid)</strong> balance,
                        and the user receives a notification. You are then responsible for sending the actual payment via
                        the user's specified method (M-Pesa or Bank Transfer) shown in the View details.
                    </p>
                </div>
            </div>

            {/* Payout Details Modal */}
            {viewPayout && (() => {
                const meta = parsePaymentMeta(viewPayout);
                const user = viewPayout.User || viewPayout.user;
                return (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white relative flex-shrink-0">
                                <button
                                    onClick={() => setViewPayout(null)}
                                    className="absolute top-5 right-5 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                >
                                    <FaTimes />
                                </button>
                                <FaMoneyBillWave className="text-3xl mb-3 opacity-60" />
                                <h3 className="text-xl font-black uppercase tracking-tight">Payout Details</h3>
                                <p className="text-blue-100 text-sm font-bold mt-0.5">Review before processing</p>
                            </div>

                            <div className="p-6 space-y-5 overflow-y-auto">
                                {/* Amount */}
                                <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Payout Amount</span>
                                    <span className="text-2xl font-black text-green-600 font-mono">{formatPrice(viewPayout.amount)}</span>
                                </div>

                                {/* User Info */}
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Payee</p>
                                    <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-blue-600 font-black text-sm">
                                            {user?.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900">{user?.name || 'Unknown'}</p>
                                            <p className="text-xs text-gray-500 font-bold">{user?.phone || '—'}</p>
                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full tracking-wider">
                                                {user?.role?.replace('_', ' ') || '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Method Details */}
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Payment Instructions</p>
                                    <div className={`rounded-2xl p-4 border space-y-3 ${meta.method === 'mpesa' ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'}`}>
                                        {/* Method badge */}
                                        <div className="flex items-center gap-2">
                                            {meta.method === 'mpesa'
                                                ? <FaMobile className="text-green-600 text-lg" />
                                                : meta.method === 'bank'
                                                    ? <FaUniversity className="text-blue-600 text-lg" />
                                                    : <FaBuilding className="text-gray-500 text-lg" />}
                                            <span className={`text-sm font-black uppercase tracking-wider ${meta.method === 'mpesa' ? 'text-green-800' : 'text-blue-800'}`}>
                                                {getPaymentMethodLabel(meta.method)}
                                            </span>
                                        </div>

                                        {meta.method === 'mpesa' && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-green-700 uppercase">M-Pesa Number</span>
                                                <span className="font-black text-green-900 font-mono text-sm">{meta.mpesaNumber || meta.details || '—'}</span>
                                            </div>
                                        )}

                                        {meta.method === 'bank' && (
                                            <>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-blue-700 uppercase">Bank Name</span>
                                                    <span className="font-black text-blue-900 text-sm">{meta.bankName || '—'}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-blue-700 uppercase">Account Number</span>
                                                    <span className="font-black text-blue-900 font-mono text-sm">{meta.accountNumber || meta.details || '—'}</span>
                                                </div>
                                            </>
                                        )}

                                        {!meta.method && (
                                            <p className="text-[11px] text-gray-500 italic font-bold">No payment details provided by user.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Description */}
                                {viewPayout.description && (
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Description</p>
                                        <p className="text-sm text-gray-600 font-medium">{viewPayout.description}</p>
                                    </div>
                                )}

                                {/* Date */}
                                <p className="text-[10px] text-gray-400 font-bold">
                                    Requested on {new Date(viewPayout.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                            {/* Action buttons */}
                            <div className="p-6 pt-0 flex-shrink-0">
                                <div className="flex gap-3 pt-2 border-t border-gray-100">
                                    <button
                                        onClick={() => setViewPayout(null)}
                                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black uppercase text-xs rounded-2xl transition-colors"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={() => {
                                            setFulfillmentPayout(viewPayout);
                                            setViewPayout(null);
                                        }}
                                        disabled={processing}
                                        className="flex-2 flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-xs rounded-2xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <FaCheckCircle className="h-3 w-3" /> Fulfill Payout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ---- FULFILLMENT MODAL ---- */}
            {fulfillmentPayout && (() => {
                const meta = parsePaymentMeta(fulfillmentPayout);
                const user = fulfillmentPayout.User || fulfillmentPayout.user;
                return (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
                            {/* Header */}
                            <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-6 text-white relative flex-shrink-0 rounded-t-3xl">
                                <button
                                    onClick={() => { setFulfillmentPayout(null); setPayoutReference(''); setProofFile(null); }}
                                    className="absolute top-5 right-5 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                >
                                    <FaTimes />
                                </button>
                                <FaCheckCircle className="text-3xl mb-3 opacity-60" />
                                <h3 className="text-xl font-black uppercase tracking-tight">Fulfill Payout</h3>
                                <p className="text-green-100 text-sm font-bold mt-0.5">Mark as paid & attach proof</p>
                            </div>

                            <div className="p-6 space-y-5 overflow-y-auto">
                                {/* Summary */}
                                <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Paying Out To</p>
                                        <p className="font-black text-gray-900 mt-0.5">{user?.name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-500">{user?.phone || '—'}</p>
                                    </div>
                                    <span className="text-2xl font-black text-green-600 font-mono">{formatPrice(fulfillmentPayout.amount)}</span>
                                </div>

                                {/* Payment details reminder */}
                                <div className={`rounded-2xl p-4 border space-y-2 ${meta.method === 'mpesa' ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'}`}>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Send Payment To</p>
                                    {meta.method === 'mpesa' && (
                                        <div className="flex items-center gap-2">
                                            <FaMobile className="text-green-600" />
                                            <span className="font-black text-green-900 font-mono">{meta.mpesaNumber || meta.details || '—'}</span>
                                        </div>
                                    )}
                                    {meta.method === 'bank' && (
                                        <div className="space-y-1 text-sm">
                                            <p><span className="font-bold text-gray-500">Bank:</span> <span className="font-black">{meta.bankName || '—'}</span></p>
                                            <p><span className="font-bold text-gray-500">Account #:</span> <span className="font-black font-mono">{meta.accountNumber || meta.details || '—'}</span></p>
                                            {meta.accountName && <p><span className="font-bold text-gray-500">Name:</span> <span className="font-black">{meta.accountName}</span></p>}
                                        </div>
                                    )}
                                    {!meta.method && <p className="text-xs text-gray-400 italic">No payment details provided by user.</p>}
                                </div>

                                {/* Reference Number */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                                        Transaction Reference <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. QHJ7XYZ123 or bank ref #"
                                        value={payoutReference}
                                        onChange={e => setPayoutReference(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-green-500 transition-all"
                                    />
                                    <p className="text-[10px] text-gray-400">Enter the M-Pesa confirmation code or bank transaction reference.</p>
                                </div>

                                {/* Proof Upload */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                                        Payment Proof <span className="text-red-500">*</span>
                                    </label>
                                    <label className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${proofFile ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'}`}>
                                        <FaImage className={proofFile ? 'text-green-600' : 'text-gray-400'} />
                                        <span className={`text-sm font-bold ${proofFile ? 'text-green-700' : 'text-gray-500'}`}>
                                            {proofFile ? proofFile.name : 'Click to upload screenshot / receipt'}
                                        </span>
                                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setProofFile(e.target.files[0] || null)} />
                                    </label>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="p-6 pt-0 flex-shrink-0">
                                <div className="flex gap-3 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => { setFulfillmentPayout(null); setPayoutReference(''); setProofFile(null); }}
                                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black uppercase text-xs rounded-2xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => processPayoutWithProof(fulfillmentPayout.id)}
                                        disabled={processing || uploading || !payoutReference.trim() || !proofFile}
                                        className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-xs rounded-2xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {processing || uploading
                                            ? <><FaSpinner className="animate-spin" /> {uploading ? 'Uploading...' : 'Processing...'}</>
                                            : <><FaCheckCircle /> Confirm Payment</>
                                        }
                                    </button>
                                </div>
            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default PendingPayouts;
