import React, { useState, useEffect, useCallback } from 'react';
import {
    FaWallet,
    FaHistory,
    FaClock,
    FaCheckCircle,
    FaArrowUp,
    FaArrowDown,
    FaSearch,
    FaFileInvoiceDollar,
    FaExchangeAlt,
    FaExclamationTriangle,
    FaSync
} from 'react-icons/fa';
import api from '@/shared/services/api';
import { useAuth } from '@/contexts/AuthContext';
import WithdrawalModal from '@/shared/components/WithdrawalModal';

const StationWallet = () => {
    const { user } = useAuth();
    const [walletData, setWalletData] = useState({
        balance: 0,
        pendingBalance: 0,
        successBalance: 0,
        transactions: []
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); 
    const [searchQuery, setSearchQuery] = useState('');
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [error, setError] = useState('');

    const fetchWallet = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            setError('');
            const response = await api.get('/station-manager/wallet');
            setWalletData(response.data);
        } catch (err) {
            console.error('Error fetching station wallet:', err);
            setError(err.response?.data?.message || 'Failed to load wallet data');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWallet();
    }, [fetchWallet]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES'
        }).format(amount || 0);
    };

    const filteredTransactions = (walletData.transactions || []).filter(tx => {
        const matchesSearch = tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.type?.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesTab = true;
        if (activeTab === 'pending') matchesTab = tx.status === 'pending';
        else if (activeTab === 'completed') matchesTab = tx.status === 'completed' || tx.status === 'success';

        return matchesSearch && matchesTab;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <FaWallet className="text-blue-600" /> Station Wallet
                    </h1>
                    <p className="text-gray-500 font-medium uppercase tracking-widest text-[10px] mt-1">
                        Earnings & Financial Overview for {user?.stationName || 'Your Station'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => fetchWallet()}
                        className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                    >
                        <FaSync className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button 
                        onClick={() => setShowWithdrawModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 transition-all flex items-center gap-2 active:scale-95"
                    >
                        <FaArrowUp /> Withdraw Funds
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold animate-shake">
                    <FaExclamationTriangle className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Wallet Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-blue-500/5 group-hover:scale-110 transition-transform duration-500">
                        <FaWallet size={120} />
                    </div>
                    <p className="text-gray-400 font-black mb-1 uppercase tracking-widest text-[10px]">Available Balance</p>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">{formatCurrency(walletData.balance)}</h2>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase">
                        <FaCheckCircle /> Ready for payout
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-amber-500/5 group-hover:scale-110 transition-transform duration-500">
                        <FaClock size={120} />
                    </div>
                    <p className="text-gray-400 font-black mb-1 uppercase tracking-widest text-[10px]">Pending Earnings</p>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">{formatCurrency(walletData.pendingBalance)}</h2>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase">
                        <FaClock /> Clears after order completion
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-emerald-500/5 group-hover:scale-110 transition-transform duration-500">
                        <FaCheckCircle size={120} />
                    </div>
                    <p className="text-gray-400 font-black mb-1 uppercase tracking-widest text-[10px]">Lifetime Earnings</p>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">{formatCurrency(walletData.successBalance)}</h2>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase">
                        <FaHistory /> Total processed to date
                    </div>
                </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <h3 className="text-xl font-black text-gray-900 flex items-center gap-3 uppercase tracking-tight">
                        <FaExchangeAlt className="text-blue-600" /> Transaction Logs
                    </h3>

                    <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'all' ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            All Logs
                        </button>
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white text-amber-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setActiveTab('completed')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-white text-emerald-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Cleared
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50 text-gray-400 uppercase text-[10px] font-black tracking-widest text-left">
                                <th className="px-8 py-5">Source / Activity</th>
                                <th className="px-8 py-5">Date</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50/30 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${tx.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                    {tx.type === 'credit' ? <FaArrowDown /> : <FaArrowUp />}
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 group-hover:text-blue-600 transition-colors">{tx.description}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{tx.walletType?.replace(/_/g, ' ') || 'Wallet Transfer'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-sm font-bold text-gray-700">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                                                tx.status === 'completed' || tx.status === 'success'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                : tx.status === 'pending'
                                                ? 'bg-amber-50 text-amber-700 border-amber-100'
                                                : 'bg-gray-50 text-gray-500 border-gray-100'
                                            }`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <p className={`text-lg font-black ${tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount).replace('KES', '')}
                                            </p>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-8 py-24 text-center">
                                        <div className="max-w-xs mx-auto space-y-4">
                                            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-gray-300 shadow-inner">
                                                <FaFileInvoiceDollar size={40} />
                                            </div>
                                            <h4 className="text-xl font-black text-gray-300 uppercase tracking-widest">No Activity</h4>
                                            <p className="text-sm text-gray-400 font-medium">
                                                Your earnings from delivery handling fees will appear here.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Notice */}
            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 flex items-start gap-6 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200 text-xl">
                    <FaExclamationTriangle />
                </div>
                <div>
                    <h4 className="text-blue-900 font-black text-sm uppercase mb-1 tracking-widest">Financial Policy</h4>
                    <p className="text-blue-700 text-sm font-bold leading-relaxed opacity-80">
                        Station handling fees are credited as "Pending" when an order leg starts and move to "Available" once the order is successfully completed.
                        Withdrawals are processed within 24-48 business hours to your registered M-Pesa or Bank account.
                    </p>
                </div>
            </div>

            <WithdrawalModal 
                isOpen={showWithdrawModal}
                onClose={() => setShowWithdrawModal(false)}
                onSuccess={() => fetchWallet(true)}
                balance={walletData.balance}
                role="station_manager"
                endpoint="/station-manager/wallet/withdraw"
            />
        </div>
    );
};

export default StationWallet;
