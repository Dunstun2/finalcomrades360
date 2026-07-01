import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    FaShieldAlt, FaUsers, FaCoins, FaHistory, FaSearch, 
    FaFileInvoiceDollar, FaArrowRight, FaWallet, FaExclamationTriangle,
    FaChevronLeft, FaChevronRight, FaRegClock, FaCheckCircle,
    FaMoneyBillWave, FaDownload, FaUser, FaChartBar, FaFilter, FaTable, FaBox, FaTruck
} from 'react-icons/fa';
import api from '@/shared/services/api';
import { formatPrice } from '@/utils/currency';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { toast } from 'react-toastify';
import AdminProcessPayoutModal from '@/modules/finance/components/AdminProcessPayoutModal';

// ─── Helpers ────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
    const map = {
        pending: 'bg-amber-100 text-amber-700 border-amber-200',
        success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        paid: 'bg-blue-100 text-blue-700 border-blue-200',
        cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
        failed: 'bg-rose-100 text-rose-700 border-rose-200',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${map[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {status}
        </span>
    );
};

export default function RoleEarningVerification({ role = 'all', hideHeader = false, initialTab = null, subTab: subTabProp = null }) {
    const searchParams = new URLSearchParams(window.location.search);
    const urlTab = searchParams.get('tab');
    
    const [activeMainTab, setActiveMainTab] = useState('audit'); // 'audit' | 'history'

    // ── Audit Tab State
    const [partners, setPartners] = useState([]);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [selectedTxIds, setSelectedTxIds] = useState(new Set());

    // ── History Tab State
    const [history, setHistory] = useState([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historySearch, setHistorySearch] = useState('');

    // ── Loading & UI states
    const [loadingSidebar, setLoadingSidebar] = useState(false);
    const [loadingTx, setLoadingTx] = useState(false);
    const [processingPayout, setProcessingPayout] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [autoVerifyEnabled, setAutoVerifyEnabled] = useState(false);
    const [loadingAutoVerify, setLoadingAutoVerify] = useState(false);
    
    const derivedSubTab = subTabProp || initialTab || (urlTab === 'audit' ? 'audit' : 'payouts');
    const [subTab, setSubTab] = useState(derivedSubTab);

    useEffect(() => {
        setSubTab(derivedSubTab);
        setSelectedPartner(null);
    }, [derivedSubTab]);

    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

    const roleLabels = {
        marketer: 'Marketer',
        seller: 'Seller',
        delivery_agent: 'Delivery Agent',
        all: 'Partner'
    };

    // ── Lifecycle
    useEffect(() => {
        if (activeMainTab === 'audit') {
            fetchPartners();
            fetchAutoVerifyStatus();
        }
        else fetchHistory();
    }, [role, activeMainTab, historyPage, subTab]);

    const fetchAutoVerifyStatus = async () => {
        try {
            const payoutType = role === 'delivery_agent' ? 'delivery' : 'earning';
            const res = await api.get(`/finance/automatic-payout-status?type=${payoutType}`);
            setAutoVerifyEnabled(res.data.enabled);
        } catch (error) {
            console.error('Error fetching auto-verify status:', error);
        }
    };

    const toggleAutoVerify = async () => {
        try {
            setLoadingAutoVerify(true);
            const payoutType = role === 'delivery_agent' ? 'delivery' : 'earning';
            const res = await api.post('/finance/toggle-automatic-payout', { 
                enabled: !autoVerifyEnabled,
                type: payoutType
            });
            setAutoVerifyEnabled(res.data.enabled);
            toast.success(res.data.message || 'Automatic verification updated');
        } catch (error) {
            console.error('Error toggling auto-verify:', error);
            toast.error('Failed to update automatic verification setting');
        } finally {
            setLoadingAutoVerify(false);
        }
    };

    // ── Data Fetching: Audit ───────────────────────────────────────────────

    const fetchPartners = async () => {
        try {
            setLoadingSidebar(true);
            const endpoint = subTab === 'payouts' ? '/finance/pending-payouts' : '/finance/success-balances';
            const res = await api.get(endpoint, { params: { role } });
            
            if (subTab === 'payouts') {
                const userMap = new Map();
                res.data.filter(tx => tx.type === 'debit').forEach(tx => {
                    if (role && role !== 'all' && tx.User?.role !== role) {
                        return;
                    }
                    const userId = tx.userId;
                    if (!userMap.has(userId)) {
                        userMap.set(userId, {
                            ...tx.User,
                            wallet: { successBalance: 0, pendingPayoutAmount: 0 },
                            pendingTransactions: []
                        });
                    }
                    const user = userMap.get(userId);
                    user.wallet.pendingPayoutAmount += parseFloat(tx.amount) || 0;
                    user.pendingTransactions.push(tx);
                });
                setPartners(Array.from(userMap.values()));
            } else {
                setPartners(res.data || []);
            }
            
            // Keep selection if still in the list
            if (selectedPartner) {
                const stillExists = res.data.find(p => (p.id || p.userId) === (selectedPartner.id || selectedPartner.userId));
                if (!stillExists) setSelectedPartner(null);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load partners list');
        } finally {
            setLoadingSidebar(false);
        }
    };

    const fetchTransactions = useCallback(async (user) => {
        setSelectedPartner(user);
        try {
            setLoadingTx(true);
            if (subTab === 'payouts') {
                setTransactions(user.pendingTransactions || []);
                setSelectedTxIds(new Set(user.pendingTransactions?.map(t => t.id) || []));
            } else {
                const res = await api.get(`/finance/success-transactions/${user.id}`);
                setTransactions(res.data || []);
                setSelectedTxIds(new Set()); // Reset selection
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load transactions');
        } finally {
            setLoadingTx(false);
        }
    }, [subTab]);

    const handleProcessPayout = async () => {
        if (selectedTxIds.size === 0 || !selectedPartner) return;

        if (subTab === 'payouts') {
            setIsPayoutModalOpen(true);
            return;
        }

        const count = selectedTxIds.size;
        const totalAmount = transactions
            .filter(t => selectedTxIds.has(t.id))
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        if (!window.confirm(`Verify ${count} earning(s) totaling ${formatPrice(totalAmount)} for ${selectedPartner.name}? \n\nApproved funds will be moved from their pending pool to their withdrawable wallet balance.`)) {
            return;
        }

        try {
            setProcessingPayout(true);
            await api.post('/finance/verify-earnings', {
                transactionIds: Array.from(selectedTxIds)
            });

            toast.success(`Verified ${count} transactions for ${selectedPartner.name}`);
            setSelectedTxIds(new Set());
            await fetchTransactions(selectedPartner);
            await fetchPartners();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Verification failed');
        } finally {
            setProcessingPayout(false);
        }
    };

    // ── Data Fetching: History ─────────────────────────────────────────────

    const fetchHistory = async () => {
        try {
            setLoadingHistory(true);
            let endpoint = '';
            let params = { page: historyPage, limit: 50, role };

            if (subTab === 'payouts') {
                endpoint = '/finance/withdrawal-history';
            } else if (role === 'delivery_agent') {
                endpoint = '/finance/delivery-task-history';
            } else if (role === 'marketer') {
                endpoint = '/commissions';
            } else if (role === 'seller') {
                endpoint = '/finance/seller-sales-history';
            } else {
                setHistory([]);
                setLoadingHistory(false);
                return;
            }

            const res = await api.get(endpoint, { params });
            
            if (subTab === 'payouts') {
                setHistory(res.data || []);
                setHistoryTotal(res.data.length || 0);
                setHistoryTotalPages(1);
            } else if (role === 'marketer') {
                setHistory(res.data.commissions || []);
                setHistoryTotal(res.data.total || 0);
                setHistoryTotalPages(Math.ceil((res.data.total || 0) / 50));
            } else {
                setHistory(res.data.data || []);
                setHistoryTotal(res.data.total || 0);
                setHistoryTotalPages(res.data.totalPages || 1);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load history data');
        } finally {
            setLoadingHistory(false);
        }
    };

    // ── Interaction Handlers ───────────────────────────────────────────────

    const toggleTxSelection = (id) => {
        const next = new Set(selectedTxIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedTxIds(next);
    };

    const toggleAllTx = () => {
        if (selectedTxIds.size === transactions.length) {
            setSelectedTxIds(new Set());
        } else {
            setSelectedTxIds(new Set(transactions.map(t => t.id)));
        }
    };

    const filteredPartners = partners.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone?.includes(searchTerm)
    );

    const filteredHistory = history.filter(h => {
        if (!historySearch) return true;
        const q = historySearch.toLowerCase();
        if (subTab === 'payouts') {
            return (
                h.User?.name?.toLowerCase().includes(q) ||
                h.User?.phone?.includes(q) ||
                h.id?.toString().includes(q) ||
                h.status?.toLowerCase().includes(q)
            );
        }
        if (role === 'marketer') {
            return (
                h.marketer?.name?.toLowerCase().includes(q) ||
                h.referralCode?.toLowerCase().includes(q) ||
                (h.Order?.orderNumber || '').toLowerCase().includes(q)
            );
        } else if (role === 'delivery_agent') {
            return (
                h.agent?.name?.toLowerCase().includes(q) ||
                (h.orderNumber || '').toLowerCase().includes(q)
            );
        }
        return true;
    });

    // ── Render Helpers ─────────────────────────────────────────────────────

    const renderAuditTab = () => (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px]">
            {/* Left Column: Partners Sidebar */}
            <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-50 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <FaUsers className="text-blue-500" />
                            {subTab === 'payouts' ? 'Payout Requests' : `${roleLabels[role]}s`}
                        </h3>
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-black">
                            {partners.length} {subTab === 'payouts' ? 'PENDING' : 'CLEARED'}
                        </span>
                    </div>


                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={12} />
                        <input
                            type="text"
                            placeholder={`Search ${subTab === 'payouts' ? 'Requests' : roleLabels[role]}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {loadingSidebar ? (
                        <div className="flex flex-col items-center justify-center p-10 opacity-50">
                            <LoadingSpinner size="sm" />
                            <p className="text-[10px] mt-2 font-bold text-gray-400">LOADING LIST...</p>
                        </div>
                    ) : filteredPartners.length === 0 ? (
                        <div className="text-center py-10">
                            <FaRegClock className="mx-auto text-gray-100 mb-2" size={30} />
                            <p className="text-xs text-gray-400">No {roleLabels[role].toLowerCase()}s awaiting verification.</p>
                        </div>
                    ) : (
                        filteredPartners.map(p => (
                            <button
                                key={p.id}
                                onClick={() => {
                                    fetchTransactions(p);
                                }}
                                className={`w-full text-left p-3 rounded-xl transition-all border ${selectedPartner?.id === p.id
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100'
                                    : 'bg-white border-transparent hover:bg-gray-50 text-gray-700'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <p className={`font-bold truncate text-sm ${selectedPartner?.id === p.id ? 'text-white' : 'text-gray-900'}`}>{p.name}</p>
                                    <p className={`text-[10px] font-black ${selectedPartner?.id === p.id ? 'text-white' : subTab === 'payouts' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                        {formatPrice(subTab === 'payouts' ? p.wallet?.pendingPayoutAmount : p.wallet?.successBalance)}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className={`text-[10px] ${selectedPartner?.id === p.id ? 'text-white opacity-70' : 'text-gray-400'}`}>{p.phone || p.email}</p>
                                    <div className="flex items-center gap-1">
                                        {subTab === 'payouts' && <FaMoneyBillWave size={10} className={selectedPartner?.id === p.id ? 'text-white' : 'text-emerald-500'} />}
                                        {selectedPartner?.id === p.id && <FaArrowRight size={10} className="animate-pulse" />}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right Column: Transaction Audit */}
            <div className="lg:col-span-8 flex flex-col h-full">
                {selectedPartner ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
                        {/* Audit Header */}
                        <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-blue-600">
                                    <FaFileInvoiceDollar size={18} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">Verification Audit</h4>
                                    <p className="text-[10px] text-gray-500 flex items-center gap-1 uppercase tracking-tighter">
                                        Partner: <span className="text-gray-900 font-black">{selectedPartner.name}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 font-black uppercase leading-none mb-1">To Verify</p>
                                    <p className="text-lg font-black text-emerald-600">
                                        {formatPrice(Array.from(selectedTxIds).reduce((sum, id) => {
                                            const tx = transactions.find(t => t.id === id);
                                            return sum + (parseFloat(tx?.amount) || 0);
                                        }, 0))}
                                    </p>
                                </div>
                                <button
                                    onClick={handleProcessPayout}
                                    disabled={selectedTxIds.size === 0 || processingPayout}
                                    className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all shadow-lg flex items-center gap-2 ${selectedTxIds.size === 0 || processingPayout
                                        ? 'bg-gray-100 text-gray-400 shadow-none cursor-not-allowed'
                                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'}`}
                                >
                                    {processingPayout ? (
                                        <LoadingSpinner size="xs" />
                                    ) : (
                                        <>
                                            <FaCheckCircle />
                                            {`VERIFY ${selectedTxIds.size} ITEMS`}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Transactions List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-gray-50/30">
                            {loadingTx ? (
                                <div className="flex flex-col items-center justify-center p-20 opacity-30">
                                    <LoadingSpinner size="md" />
                                    <p className="text-xs mt-4 font-bold tracking-widest uppercase">Fetching Records...</p>
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                                    <FaCoins className="mx-auto text-gray-100 mb-4" size={50} />
                                    <p className="text-sm text-gray-400 font-medium">No cleared transactions found for this audit.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-xl border border-gray-100 mb-4 sticky top-0 z-10 shadow-sm">
                                        <input
                                            type="checkbox"
                                            checked={selectedTxIds.size === transactions.length}
                                            onChange={toggleAllTx}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select All Transactions ({transactions.length})</span>
                                    </div>

                                    {transactions.map(tx => (
                                        <div
                                            key={tx.id}
                                            onClick={() => toggleTxSelection(tx.id)}
                                            className={`p-4 rounded-2xl border transition-all cursor-pointer group flex items-center gap-4 ${selectedTxIds.has(tx.id)
                                                ? 'bg-emerald-50 border-emerald-200'
                                                : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-sm'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedTxIds.has(tx.id)}
                                                readOnly
                                                className="w-5 h-5 rounded-lg border-gray-300 text-emerald-600"
                                            />
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm">
                                                            {tx.description || (tx.type === 'commission' ? 'Sales Commission' : tx.type === 'delivery_earning' ? 'Delivery Earnings' : tx.type === 'debit' ? 'Withdrawal Request' : 'Partner Earning')}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">Ref: #{tx.id.toString().slice(-8).toUpperCase()}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`font-black ${tx.type === 'debit' ? 'text-rose-600' : 'text-gray-900'}`}>{tx.type === 'debit' ? '-' : ''}{formatPrice(tx.amount)}</p>
                                                        <p className="text-[10px] text-gray-400 uppercase font-black">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase">
                                                        {tx.order?.orderNumber || (tx.type === 'debit' ? 'Manual Withdrawal' : 'Legacy Record')}
                                                    </span>
                                                    {tx.metadata && (
                                                        <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase">
                                                            {typeof tx.metadata === 'string' ? JSON.parse(tx.metadata).paymentMethod : tx.metadata.paymentMethod || 'Wallet'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>

                        {/* Audit Footer */}
                        <div className="p-3 bg-amber-50 border-t border-amber-100 flex items-center gap-2 text-[10px] text-amber-700 font-bold uppercase tracking-tighter">
                            <FaExclamationTriangle size={12} className="shrink-0" />
                            Security Protocol: Transactions must be verified manually before they move to the final withdrawable balance.
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col items-center justify-center p-20 text-center animate-fadeIn">
                        <div className="w-24 h-24 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mb-6 relative">
                            <FaWallet size={40} />
                            <div className="absolute -top-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white border-4 border-white">
                                <FaShieldAlt size={12} />
                            </div>
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">Ready for Verification</h3>
                        <p className="text-sm text-gray-400 mt-2 max-w-xs font-medium">Select a {roleLabels[role]?.toLowerCase() || 'partner'} from the list on the left to start auditing their cleared transactions.</p>
                        <div className="mt-10 grid grid-cols-2 gap-6 opacity-30">
                            <div className="text-center">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pending Audit</div>
                                <div className="text-2xl font-black text-gray-900">{partners.length}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Audit Protocol</div>
                                <div className="text-2xl font-black text-gray-900">V.2.1</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderHistoryTab = () => (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden animate-fadeIn">
            {/* Toolbar */}
            <div className="p-4 border-b flex flex-col md:flex-row gap-3 items-start md:items-center justify-between bg-gray-50/50">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    <FaHistory className={subTab === 'payouts' ? 'text-emerald-500' : 'text-blue-500'} />
                    {subTab === 'payouts' ? 'Global Withdrawal History' : `${roleLabels[role]} Transaction History`}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ml-1 uppercase ${subTab === 'payouts' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {historyTotal} RECORDS
                    </span>
                </h2>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                        <input
                            type="text"
                            placeholder="Search records..."
                            value={historySearch}
                            onChange={e => setHistorySearch(e.target.value)}
                            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-52 bg-white"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                {loadingHistory ? (
                    <div className="p-20 flex flex-col items-center justify-center opacity-30">
                        <LoadingSpinner size="md" />
                        <p className="text-[10px] font-black mt-4 tracking-widest uppercase">ACCESSING LEDGER...</p>
                    </div>
                ) : filteredHistory.length === 0 ? (
                    <div className="p-20 text-center text-gray-300">
                        <FaTable size={48} className="mx-auto mb-4 opacity-10" />
                        <p className="font-bold uppercase text-xs tracking-widest">No historical data found</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                {subTab === 'payouts' ? (
                                    <>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User Details</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction Ref</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Fee</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Net Paid</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Date</th>
                                    </>
                                ) : role === 'delivery_agent' ? (
                                    <>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Agent</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Fee</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Revenue</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Settlement</th>
                                    </>
                                ) : role === 'marketer' ? (
                                    <>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Marketer</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Sale</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Commission</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Date</th>
                                    </>
                                ) : role === 'seller' ? (
                                    <>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order #</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Seller</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Gross Sale</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Commission</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Net Earning</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Date</th>
                                    </>
                                ) : (
                                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Details</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredHistory.map(row => (
                                <tr key={row.id} className="hover:bg-emerald-50/10 transition-colors">
                                    {subTab === 'payouts' ? (
                                        <>
                                            <td className="p-4">
                                                <div className="font-bold text-gray-900 text-xs">{row.User?.name || '—'}</div>
                                                <div className="text-[9px] text-gray-400 uppercase">{row.User?.role || '—'} • {row.User?.phone || '—'}</div>
                                            </td>
                                            <td className="p-4 font-mono font-bold text-gray-700 text-xs">
                                                {(() => {
                                                    try {
                                                        const meta = row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : {};
                                                        return meta.paymentReference || row.referenceNumber || `TX-${row.id}`;
                                                    } catch (e) {
                                                        return row.referenceNumber || `TX-${row.id}`;
                                                    }
                                                })()}
                                            </td>
                                            <td className="p-4 text-right font-bold text-gray-500">{formatPrice(row.fee || 0)}</td>
                                            <td className="p-4 text-right font-black text-emerald-600">{formatPrice(row.amount - (row.fee || 0))}</td>
                                            <td className="p-4 text-center">
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${row.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                                    {row.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center text-[10px] text-gray-400 font-bold uppercase">{new Date(row.createdAt).toLocaleDateString()}</td>
                                        </>
                                    ) : role === 'delivery_agent' ? (
                                        <>
                                            <td className="p-4 font-bold text-gray-900">#{row.orderNumber}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-xs">{row.agent?.name}</div>
                                                <div className="text-[9px] text-gray-400 uppercase">{row.agent?.phone}</div>
                                            </td>
                                            <td className="p-4 text-right font-bold text-gray-600">{formatPrice(row.totalDeliveryFee)}</td>
                                            <td className="p-4 text-right font-black text-blue-600">{formatPrice(row.systemRevenue)}</td>
                                            <td className="p-4 text-center"><StatusBadge status={row.status} /></td>
                                            <td className="p-4 text-center">
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${row.systemRevenueClaimed ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                    {row.systemRevenueClaimed ? 'SETTLED' : 'PENDING'}
                                                </span>
                                            </td>
                                        </>
                                    ) : role === 'marketer' ? (
                                        <>
                                            <td className="p-4">
                                                <div className="font-bold text-gray-900 text-xs">{row.marketer?.name || `#${row.marketerId}`}</div>
                                                <div className="text-[9px] text-gray-400 font-mono">{row.referralCode}</div>
                                            </td>
                                            <td className="p-4 font-bold text-gray-700">#{row.Order?.orderNumber || row.orderId}</td>
                                            <td className="p-4">
                                                <div className="text-xs text-gray-600 font-medium truncate max-w-[150px]">
                                                    {row.Product?.name || row.FastFood?.name || 'Platform Service'}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-[9px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-black uppercase">
                                                    {row.commissionType || 'Referral'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-bold text-gray-500">{formatPrice(row.saleAmount)}</td>
                                            <td className="p-4 text-right font-black text-emerald-600">{formatPrice(row.commissionAmount)}</td>
                                            <td className="p-4 text-center"><StatusBadge status={row.status} /></td>
                                            <td className="p-4 text-center text-[10px] text-gray-400 font-bold uppercase">{new Date(row.createdAt).toLocaleDateString()}</td>
                                        </>
                                    ) : role === 'seller' ? (
                                        <>
                                            <td className="p-4 font-bold text-blue-600 font-mono">#{row.orderNumber}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-gray-900 text-xs">{row.seller?.name || '—'}</div>
                                                <div className="text-[9px] text-gray-400">{row.seller?.phone}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-gray-900 text-xs">{row.customer?.name || '—'}</div>
                                                <div className="text-[9px] text-gray-400">{row.customer?.phone}</div>
                                            </td>
                                            <td className="p-4 text-right font-bold text-gray-600">{formatPrice(row.grossSale)}</td>
                                            <td className="p-4 text-right font-bold text-rose-500">{formatPrice(row.totalCommission)}</td>
                                            <td className="p-4 text-right font-black text-emerald-600">{formatPrice(row.netEarning)}</td>
                                            <td className="p-4 text-center"><StatusBadge status={row.status} /></td>
                                            <td className="p-4 text-center text-[10px] text-gray-400 font-bold uppercase">{new Date(row.createdAt).toLocaleDateString()}</td>
                                        </>
                                    ) : (
                                        <td className="p-4 text-gray-400 italic">No details available</td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {historyTotalPages > 1 && (
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Page {historyPage} of {historyTotalPages}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                            disabled={historyPage === 1}
                            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <FaChevronLeft size={10} />
                        </button>
                        <span className="px-3 text-xs font-black text-blue-600">{historyPage}</span>
                        <button
                            onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                            disabled={historyPage === historyTotalPages}
                            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <FaChevronRight size={10} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="w-full space-y-4">
            {/* Main Header & Tabs */}
            {!hideHeader && (
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                                {subTab === 'payouts' ? (
                                    <>
                                        <FaMoneyBillWave className="text-emerald-600" />
                                        Withdrawal Request Disbursements
                                    </>
                                ) : (
                                    <>
                                        <FaShieldAlt className="text-blue-600" />
                                        {roleLabels[role]} Earning Verification
                                    </>
                                )}
                            </h1>
                            <p className="text-sm text-gray-500 font-medium">
                                {subTab === 'payouts' 
                                    ? 'Process payouts and review historical disbursement records securely.' 
                                    : 'Standardized financial auditing and settlement portal.'}
                            </p>
                        </div>
                        <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveMainTab('audit')}
                                className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${activeMainTab === 'audit' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {subTab === 'payouts' ? (
                                    <>
                                        <FaMoneyBillWave size={12} /> Withdrawal Disbursements
                                    </>
                                ) : (
                                    <>
                                        <FaCoins size={12} /> Earning Audit
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveMainTab('history')}
                                className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${activeMainTab === 'history' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {subTab === 'payouts' ? (
                                    <>
                                        <FaHistory size={12} /> Withdrawal History
                                    </>
                                ) : (
                                    <>
                                        <FaHistory size={12} /> Task History & Revenue
                                    </>
                                )}
                            </button>
                        </div>
                        
                        {/* Auto-Verify Toggle - ONLY show on Audit > Earnings tab */}
                        {activeMainTab === 'audit' && subTab === 'audit' && (
                            <div className="flex items-center gap-3 bg-white border border-gray-100 px-4 py-2 rounded-2xl shadow-sm animate-in fade-in zoom-in duration-300">
                                <div className="flex flex-col text-right">
                                    <span className="text-[10px] font-black text-gray-900 uppercase leading-none mb-1">Auto-Verify Earnings</span>
                                    <span className={`text-[8px] font-bold uppercase ${autoVerifyEnabled ? 'text-emerald-500' : 'text-amber-500'}`}>
                                        {autoVerifyEnabled ? 'Earnings Verified Automatically' : 'Manual Earning Audit Required'}
                                    </span>
                                </div>
                                <button
                                    onClick={toggleAutoVerify}
                                    disabled={loadingAutoVerify}
                                    className={`w-12 h-6 rounded-full transition-all relative ${autoVerifyEnabled ? 'bg-emerald-500' : 'bg-gray-200'} ${loadingAutoVerify ? 'opacity-50' : 'hover:shadow-md'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${autoVerifyEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Awaiting verification</p>
                            <p className="text-2xl font-black text-gray-900">{partners.length}</p>
                            <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase">Partners cleared</p>
                        </div>
                        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Audit Type</p>
                            <p className="text-2xl font-black text-gray-900 uppercase">{role || 'Unified'}</p>
                            <p className="text-[10px] text-emerald-600 font-bold mt-1 uppercase">Standardized Flow</p>
                        </div>
                        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">System Status</p>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <p className="text-2xl font-black text-gray-900 uppercase">Secure</p>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">End-to-End Encryption</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Sub-Tabs (if hideHeader is true, we still show them) */}
            {hideHeader && (
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-xl w-fit border border-gray-100">
                        <button
                            onClick={() => setActiveMainTab('audit')}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${activeMainTab === 'audit' ? 'bg-white text-emerald-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {subTab === 'payouts' ? (
                                <>
                                    <FaMoneyBillWave size={10} /> Withdrawal Disbursements
                                </>
                            ) : (
                                <>
                                    <FaCoins size={10} /> Earning Audit
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveMainTab('history')}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${activeMainTab === 'history' ? 'bg-white text-emerald-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {subTab === 'payouts' ? (
                                <>
                                    <FaHistory size={10} /> Withdrawal History
                                </>
                            ) : (
                                <>
                                    <FaHistory size={10} /> Task History & Revenue
                                </>
                            )}
                        </button>
                    </div>

                    {/* Auto-Verify Toggle (Compact version for embedded views) */}
                    {subTab !== 'payouts' && (
                        <div className="flex items-center gap-3 bg-white border border-gray-100 px-3 py-1.5 rounded-xl shadow-sm">
                            <div className="flex flex-col text-right">
                                <span className="text-[9px] font-black text-gray-900 uppercase leading-none mb-0.5">Auto-Verify</span>
                                <span className={`text-[7px] font-bold uppercase ${autoVerifyEnabled ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {autoVerifyEnabled ? 'Active' : 'Manual'}
                                </span>
                            </div>
                            <button
                                onClick={toggleAutoVerify}
                                disabled={loadingAutoVerify}
                                className={`w-10 h-5 rounded-full transition-all relative ${autoVerifyEnabled ? 'bg-emerald-500' : 'bg-gray-200'} ${loadingAutoVerify ? 'opacity-50' : ''}`}
                            >
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${autoVerifyEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Content Area */}
            {activeMainTab === 'audit' ? renderAuditTab() : renderHistoryTab()}

            {/* Payout Processing Modal */}
            <AdminProcessPayoutModal
                isOpen={isPayoutModalOpen}
                onClose={() => setIsPayoutModalOpen(false)}
                transactions={transactions.filter(t => selectedTxIds.has(t.id))}
                user={selectedPartner}
                onSuccess={async () => {
                    await fetchPartners();
                    setSelectedPartner(null);
                }}
            />
        </div>
    );
}
