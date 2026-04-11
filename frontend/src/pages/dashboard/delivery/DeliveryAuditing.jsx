import React, { useState, useEffect, useCallback } from 'react';
import {
    FaUser, FaHistory, FaMoneyBillWave, FaSearch,
    FaFileInvoiceDollar, FaShieldAlt, FaExclamationTriangle,
    FaToggleOn, FaToggleOff, FaRobot, FaTruck, FaCheckCircle,
    FaTable, FaFilter, FaTimes, FaCoins, FaChevronLeft,
    FaChevronRight, FaSortAmountDown
} from 'react-icons/fa';
import api from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { toast } from 'react-toastify';
import DeliveryTaskConsole from '../../../components/delivery/DeliveryTaskConsole';

// ─── Helpers ────────────────────────────────────────────────────────────────

const DELIVERY_TYPE_LABELS = {
    seller_to_customer: 'Seller → Customer',
    seller_to_warehouse: 'Seller → Warehouse',
    warehouse_to_customer: 'Warehouse → Customer',
    customer_to_warehouse: 'Customer → Warehouse',
};

const StatusBadge = ({ status }) => {
    const colors = {
        completed: 'bg-green-100 text-green-700',
        delivered: 'bg-blue-100 text-blue-700',
        failed: 'bg-red-100 text-red-600',
    };
    return (
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${colors[status] || 'bg-gray-100 text-gray-500'}`}>
            {status?.replace(/_/g, ' ')}
        </span>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const DeliveryAuditing = () => {
    const [activeTab, setActiveTab] = useState('agents'); // 'agents' | 'history'

    // ── Agents tab state
    const [agents, setAgents] = useState([]);
    const [loadingAgents, setLoadingAgents] = useState(true);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loadingTx, setLoadingTx] = useState(false);
    const [selectedTxIds, setSelectedTxIds] = useState(new Set());
    const [processingPayout, setProcessingPayout] = useState(false);

    // ── Auto payout
    const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(false);
    const [loadingAutoStatus, setLoadingAutoStatus] = useState(true);

    // ── History tab state
    const [history, setHistory] = useState([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyFilter, setHistoryFilter] = useState('');
    const [showUnclaimedOnly, setShowUnclaimedOnly] = useState(false);
    // Summary totals for history
    const totalSystemRevenue = history.reduce((s, r) => s + (r.systemRevenue || 0), 0);
    const settledRevenue = history.filter(r => r.systemRevenueClaimed).reduce((s, r) => s + (r.systemRevenue || 0), 0);
    const pendingRevenue = history.filter(r => !r.systemRevenueClaimed).reduce((s, r) => s + (r.systemRevenue || 0), 0);

    // ── Initial load
    useEffect(() => {
        fetchAgents();
        fetchAutoPayoutStatus();
    }, []);

    useEffect(() => {
        if (activeTab === 'history') fetchHistory();
    }, [activeTab, historyPage, showUnclaimedOnly]);

    // ── Data fetchers ──────────────────────────────────────────────────────
    const fetchAutoPayoutStatus = async () => {
        try {
            setLoadingAutoStatus(true);
            const res = await api.get('/finance/automatic-payout-status');
            setAutoPayoutEnabled(res.data.enabled);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingAutoStatus(false);
        }
    };

    const fetchAgents = async () => {
        try {
            setLoadingAgents(true);
            const res = await api.get('/finance/delivery-success-balances');
            setAgents(res.data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load agents');
        } finally {
            setLoadingAgents(false);
        }
    };

    const fetchAgentTransactions = async (agent) => {
        setSelectedAgent(agent);
        setLoadingTx(true);
        setSelectedTxIds(new Set());
        try {
            const res = await api.get(`/finance/agent-success-transactions/${agent.id}`);
            setTransactions(res.data);
        } catch (error) {
            toast.error('Failed to load transaction history');
        } finally {
            setLoadingTx(false);
        }
    };

    const fetchHistory = useCallback(async () => {
        try {
            setLoadingHistory(true);
            const params = new URLSearchParams({
                page: historyPage,
                pageSize: 50,
            });
            const res = await api.get(`/finance/delivery-task-history?${params}`);
            let data = res.data.data || [];
            if (showUnclaimedOnly) data = data.filter(r => !r.systemRevenueClaimed);
            setHistory(data);
            setHistoryTotal(res.data.total || 0);
            setHistoryTotalPages(res.data.totalPages || 1);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load task history');
        } finally {
            setLoadingHistory(false);
        }
    }, [historyPage, showUnclaimedOnly]);

    // ── Actions ────────────────────────────────────────────────────────────
    const toggleAutoPayout = async () => {
        try {
            const res = await api.post('/finance/toggle-automatic-payout', { enabled: !autoPayoutEnabled });
            setAutoPayoutEnabled(res.data.enabled);
            toast.success(`Automatic Payout ${res.data.enabled ? 'Enabled' : 'Disabled'}`);
        } catch {
            toast.error('Failed to update automatic payout mode');
        }
    };

    const toggleTxSelection = (id) => {
        setSelectedTxIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAllTx = () => {
        setSelectedTxIds(selectedTxIds.size === transactions.length
            ? new Set()
            : new Set(transactions.map(t => t.id))
        );
    };

    const handleProcessPayout = async () => {
        if (selectedTxIds.size === 0) return;
        if (!window.confirm(`Process payouts for ${selectedTxIds.size} selected transactions?`)) return;
        setProcessingPayout(true);
        try {
            await api.post('/finance/process-payout', { transactionIds: Array.from(selectedTxIds) });
            toast.success('Payouts processed successfully');
            await fetchAgentTransactions(selectedAgent);
            await fetchAgents();
        } catch {
            toast.error('Failed to process payout');
        } finally {
            setProcessingPayout(false);
        }
    };


    // ── Filtered history rows
    const filteredHistory = history.filter(r => {
        if (!historyFilter) return true;
        const q = historyFilter.toLowerCase();
        return (
            r.orderNumber?.toLowerCase().includes(q) ||
            r.agent?.name?.toLowerCase().includes(q) ||
            r.customer?.name?.toLowerCase().includes(q)
        );
    });

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="p-4 w-full space-y-4 sm:space-y-6">
            {/* ── Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                        <FaShieldAlt className="text-blue-600" />
                        Auditing
                    </h1>
                    <p className="text-gray-500 text-[10px] sm:text-sm mt-0.5">Verify earnings and settle system revenue.</p>
                </div>

                <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border ${autoPayoutEnabled ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={`p-1.5 sm:p-2 rounded-full ${autoPayoutEnabled ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        <FaRobot size={12} className="sm:w-[14px] sm:h-[14px]" />
                    </div>
                    <div>
                        <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-0.5">Auto-Mode</p>
                        <p className={`text-[10px] sm:text-xs font-bold ${autoPayoutEnabled ? 'text-indigo-700' : 'text-gray-500'}`}>
                            {autoPayoutEnabled ? 'ACTIVE' : 'Manual'}
                        </p>
                    </div>
                    <button onClick={toggleAutoPayout} className={`ml-1 text-xl sm:text-2xl ${autoPayoutEnabled ? 'text-indigo-600' : 'text-gray-300'}`}>
                        {autoPayoutEnabled ? <FaToggleOn /> : <FaToggleOff />}
                    </button>
                </div>
            </div>

            {/* ── Tabs */}
            <div className="flex border-b border-gray-200 gap-1">
                {[
                    { id: 'agents', label: 'Agents with Cleared Funds', icon: <FaUser size={12} /> },
                    { id: 'history', label: 'Task History & System Revenue', icon: <FaTable size={12} /> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold border-b-2 transition-all -mb-px ${activeTab === tab.id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        {tab.icon}{tab.label}
                    </button>
                ))}
            </div>

            {/* ═══════════════ AGENTS TAB ═══════════════ */}
            {activeTab === 'agents' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Agent List */}
                    <div className="lg:col-span-4">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                                    <FaUser className="text-blue-500" size={13} /> Agents with Cleared Funds
                                </h2>
                                <span className="bg-blue-100 text-blue-700 text-xs py-1 px-2.5 rounded-full font-bold">{agents.length}</span>
                            </div>
                            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                                {loadingAgents ? (
                                    <div className="p-10 flex justify-center"><LoadingSpinner size="md" /></div>
                                ) : agents.length === 0 ? (
                                    <div className="p-10 text-center text-gray-400">
                                        <FaCheckCircle size={32} className="mx-auto mb-3 opacity-20" />
                                        <p className="font-medium">No agents with cleared funds</p>
                                        <p className="text-xs mt-1">All balances are at zero or pending</p>
                                    </div>
                                ) : (
                                    agents.map(agent => (
                                        <button
                                            key={agent.id}
                                            onClick={() => fetchAgentTransactions(agent)}
                                            className={`w-full text-left p-4 hover:bg-blue-50 transition-colors flex items-center justify-between group ${selectedAgent?.id === agent.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                        >
                                            <div>
                                                <h3 className="font-semibold text-gray-800 group-hover:text-blue-700">{agent.name}</h3>
                                                <p className="text-xs text-gray-400">{agent.phone}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-green-600">{formatPrice(agent.wallet?.successBalance || 0)}</p>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-tighter font-semibold">Cleared Balance</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Audit Pane */}
                    <div className="lg:col-span-8">
                        {selectedAgent ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[500px] flex flex-col">
                                <div className="p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                            <FaUser size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">{selectedAgent.name} — Audit View</h2>
                                            <p className="text-xs text-gray-400">Select transactions to process payout</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Selected Payout</p>
                                            <p className="text-xl font-black text-green-600">
                                                {formatPrice(Array.from(selectedTxIds).reduce((sum, id) => {
                                                    const tx = transactions.find(t => t.id === id);
                                                    return sum + (tx?.amount || 0);
                                                }, 0))}
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleProcessPayout}
                                            disabled={selectedTxIds.size === 0 || processingPayout}
                                            className={`px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 ${selectedTxIds.size === 0 || processingPayout
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                        >
                                            <FaMoneyBillWave size={13} />
                                            {processingPayout ? 'Processing...' : `Payout ${selectedTxIds.size} Items`}
                                        </button>
                                    </div>
                                </div>

                                {loadingTx ? (
                                    <div className="flex-1 flex items-center justify-center p-20"><LoadingSpinner size="md" /></div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                                        {transactions.length > 0 && (
                                            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                                <input type="checkbox"
                                                    checked={selectedTxIds.size === transactions.length && transactions.length > 0}
                                                    onChange={toggleAllTx}
                                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                                                />
                                                <span className="text-xs text-gray-500 font-medium">Select All ({transactions.length})</span>
                                            </div>
                                        )}
                                        {transactions.length === 0 ? (
                                            <div className="py-16 text-center text-gray-400">
                                                <FaHistory size={36} className="mx-auto mb-3 opacity-20" />
                                                <p>No cleared transactions found for this agent.</p>
                                            </div>
                                        ) : (
                                            transactions.map(tx => {
                                                const isSelected = selectedTxIds.has(tx.id);
                                                return (
                                                    <DeliveryTaskConsole
                                                        key={tx.id}
                                                        order={tx.order}
                                                        task={tx.order?.deliveryTasks?.find(t => t.deliveryAgentId === selectedAgent.id)}
                                                        isExpanded={isSelected}
                                                        onToggleExpand={() => toggleTxSelection(tx.id)}
                                                        checkbox={
                                                            <input
                                                                type="checkbox"
                                                                className="w-5 h-5 rounded border-gray-300 text-indigo-600 cursor-pointer"
                                                                checked={isSelected}
                                                                onChange={() => toggleTxSelection(tx.id)}
                                                            />
                                                        }
                                                    />
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                <div className="p-4 bg-gray-50 border-t rounded-b-2xl text-xs text-gray-400 flex items-center gap-2">
                                    <FaExclamationTriangle className="text-amber-500" />
                                    Audit Tip: Compare route addresses with system logs to ensure accuracy.
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col items-center justify-center p-20 text-center">
                                <div className="w-20 h-20 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mb-6">
                                    <FaFileInvoiceDollar size={38} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">Select an agent to begin audit</h3>
                                <p className="text-gray-400 max-w-xs text-sm">Pick an agent from the left with cleared funds to view their transactions and process payouts.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════ HISTORY TAB ═══════════════ */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-5">
                            <p className="text-[9px] sm:text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Total System Revenue</p>
                            <p className="text-lg sm:text-2xl font-black text-gray-900">{formatPrice(totalSystemRevenue)}</p>
                            <p className="text-[8px] sm:text-xs text-gray-400 mt-1">{history.length} tasks</p>
                        </div>
                        <div className="bg-white rounded-xl sm:rounded-2xl border border-amber-100 shadow-sm p-3 sm:p-5">
                            <p className="text-[9px] sm:text-xs text-amber-600 font-bold uppercase tracking-widest mb-1">Awaiting Settlement</p>
                            <p className="text-lg sm:text-2xl font-black text-amber-600">{formatPrice(pendingRevenue)}</p>
                            <p className="text-[8px] sm:text-xs text-gray-400 mt-1">{history.filter(r => !r.systemRevenueClaimed).length} pending</p>
                        </div>
                        <div className="bg-white rounded-xl sm:rounded-2xl border border-green-100 shadow-sm p-3 sm:p-5 col-span-2 md:col-span-1">
                            <p className="text-[9px] sm:text-xs text-green-600 font-bold uppercase tracking-widest mb-1">Settled Revenue</p>
                            <p className="text-lg sm:text-2xl font-black text-green-600">{formatPrice(settledRevenue)}</p>
                            <p className="text-[8px] sm:text-xs text-gray-400 mt-1">{history.filter(r => r.systemRevenueClaimed).length} finalized</p>
                        </div>
                    </div>

                    {/* Table toolbar */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                            <h2 className="font-bold text-gray-800 flex items-center gap-2">
                                <FaHistory className="text-blue-500" /> Delivery Task Records
                                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold ml-1">{historyTotal} total</span>
                            </h2>
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Search */}
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                    <input
                                        type="text"
                                        placeholder="Search order, agent, customer..."
                                        value={historyFilter}
                                        onChange={e => setHistoryFilter(e.target.value)}
                                        className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-52"
                                    />
                                </div>
                                {/* Unclaimed filter */}
                                <button
                                    onClick={() => { setShowUnclaimedOnly(v => !v); setHistoryPage(1); }}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${showUnclaimedOnly ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                >
                                    <FaFilter size={10} /> {showUnclaimedOnly ? 'Pending Only' : 'All Tasks'}
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            {loadingHistory ? (
                                <div className="p-12 flex justify-center"><LoadingSpinner size="md" /></div>
                            ) : filteredHistory.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">
                                    <FaHistory size={36} className="mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">No task records found</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50 border-b">
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">Order</th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">Agent</th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left hidden sm:table-cell">Type</th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">Fee</th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">Earnings</th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">System</th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Status</th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Settlement</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredHistory.map(row => (
                                            <tr key={row.id} className={`hover:bg-gray-50 transition-colors ${row.systemRevenueClaimed ? 'opacity-60' : ''}`}>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3">
                                                    <p className="font-bold text-gray-900 text-[10px] sm:text-xs">#{row.orderNumber || row.orderId}</p>
                                                    <p className="text-[9px] text-gray-400">{new Date(row.completedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</p>
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3">
                                                    <p className="font-semibold text-gray-800 text-[10px] sm:text-xs">{row.agent?.name?.split(' ')[0] || '—'}</p>
                                                    <p className="text-[9px] text-gray-400">{row.agent?.phone}</p>
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 hidden sm:table-cell">
                                                    <span className="text-[10px] text-gray-500 font-medium">
                                                        {DELIVERY_TYPE_LABELS[row.deliveryType] || row.deliveryType?.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-gray-700 text-[10px] sm:text-xs">
                                                    {formatPrice(row.totalDeliveryFee)}
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs">
                                                    <span className="text-blue-700 font-bold">{formatPrice(row.agentEarnings)}</span>
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                                                    <span className={`font-black text-xs sm:text-sm ${row.systemRevenueClaimed ? 'text-green-600' : 'text-amber-600'}`}>
                                                        {formatPrice(row.systemRevenue)}
                                                    </span>
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                                                    <StatusBadge status={row.status} />
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                                                    {row.systemRevenueClaimed ? (
                                                        <span className="text-[9px] sm:text-[10px] font-black text-green-600 bg-green-50 px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1 w-fit mx-auto">
                                                            <FaCheckCircle size={8} /> <span className="hidden sm:inline">Settled</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] sm:text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 sm:px-2 py-0.5 rounded-full w-fit mx-auto block">
                                                            <span className="hidden sm:inline">Awaiting</span> Payout
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-[10px] sm:text-sm">
                                            <td colSpan={2} className="px-2 sm:px-4 py-2 sm:py-3 text-gray-700">Totals</td>
                                            <td className="hidden sm:table-cell" />
                                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-gray-900">{formatPrice(filteredHistory.reduce((s, r) => s + r.totalDeliveryFee, 0))}</td>
                                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-blue-700">{formatPrice(filteredHistory.reduce((s, r) => s + r.agentEarnings, 0))}</td>
                                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-amber-600">{formatPrice(filteredHistory.reduce((s, r) => s + r.systemRevenue, 0))}</td>
                                            <td colSpan={1} />
                                            <td colSpan={1} />
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>

                        {/* Pagination */}
                        {historyTotalPages > 1 && (
                            <div className="p-4 border-t flex items-center justify-between bg-gray-50">
                                <p className="text-xs text-gray-500">
                                    Page {historyPage} of {historyTotalPages} · {historyTotal} total records
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                        disabled={historyPage === 1}
                                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        <FaChevronLeft size={11} />
                                    </button>
                                    <span className="text-xs font-bold text-gray-700 px-2">{historyPage}</span>
                                    <button
                                        onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                                        disabled={historyPage === historyTotalPages}
                                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        <FaChevronRight size={11} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryAuditing;
