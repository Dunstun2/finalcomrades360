import React, { useState, useEffect } from 'react';
import {
    FaWallet,
    FaHistory,
    FaClock,
    FaCheckCircle,
    FaArrowUp,
    FaArrowDown,
    FaFilter,
    FaSearch,
    FaFileInvoiceDollar,
    FaExchangeAlt,
    FaExclamationTriangle
} from 'react-icons/fa';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/use-toast';

const ServiceProviderWallet = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [walletData, setWalletData] = useState({
        balance: 0,
        pendingBalance: 0,
        successBalance: 0,
        transactions: []
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'success', or 'paid'
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchWallet = async () => {
            try {
                setLoading(true);
                const response = await api.get('/services/wallet');
                setWalletData(response.data);
            } catch (error) {
                console.error('Error fetching service provider wallet:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load wallet data',
                    variant: 'destructive'
                });
            } finally {
                setLoading(false);
            }
        };
        fetchWallet();
    }, [toast]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES'
        }).format(amount || 0);
    };

    const filteredTransactions = (walletData.transactions || []).filter(tx => {
        const matchesSearch = tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.type?.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesTab = false;
        if (activeTab === 'pending') matchesTab = tx.status === 'pending';
        else if (activeTab === 'success') matchesTab = tx.status === 'success';
        else matchesTab = tx.status === 'completed' || tx.status === 'paid';

        return matchesSearch && matchesTab;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground font-medium">Loading Wallet...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Wallet Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-primary to-indigo-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <FaWallet size={100} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-primary-foreground/80 font-medium mb-1 uppercase tracking-wider text-[10px]">Available (Paid)</p>
                        <h2 className="text-3xl font-black mb-4 tracking-tight">{formatCurrency(walletData.balance)}</h2>
                        <button className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 border border-white/20 active:scale-95">
                            <FaArrowUp /> Withdraw Funds
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-green-100 bg-green-50/20 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-8 text-green-500/10 group-hover:scale-110 transition-transform duration-500">
                        <FaCheckCircle size={100} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-green-600 font-medium mb-1 uppercase tracking-wider text-[10px]">Success (Cleared)</p>
                        <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">{formatCurrency(walletData.successBalance)}</h2>
                        <div className="text-[10px] text-green-600 font-bold">
                            Awaiting admin payout to available balance
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-8 text-amber-500/10 group-hover:scale-110 transition-transform duration-500">
                        <FaClock size={100} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-slate-500 font-medium mb-1 uppercase tracking-wider text-[10px]">Pending Payments</p>
                        <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">{formatCurrency(walletData.pendingBalance)}</h2>
                        <div className="text-[10px] text-slate-400 font-bold">
                            Clears after service completion
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction History Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-6 border-b border-slate-50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                            <FaExchangeAlt className="text-primary" /> Service History
                        </h3>

                        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'pending'
                                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                    }`}
                            >
                                <FaClock /> Pending
                            </button>
                            <button
                                onClick={() => setActiveTab('success')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'success'
                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                    }`}
                            >
                                <FaCheckCircle /> Success
                            </button>
                            <button
                                onClick={() => setActiveTab('paid')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'paid'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                    }`}
                            >
                                <FaCheckCircle /> Paid
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 relative group">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search records..."
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-primary/30 focus:bg-white transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest text-left">
                                <th className="px-6 py-4">Transaction Details</th>
                                <th className="px-6 py-4">Date & Time</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${tx.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                                    }`}>
                                                    {tx.type === 'credit' ? <FaArrowDown size={20} /> : <FaArrowUp size={20} />}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 group-hover:text-primary transition-colors">{tx.description}</p>
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{tx.type}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-sm font-bold text-slate-600">
                                                {new Date(tx.createdAt).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs text-slate-400 font-medium tracking-tight">
                                                {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 ${tx.status === 'completed'
                                                ? 'bg-green-50 text-green-700 border-green-100'
                                                : 'bg-amber-50 text-amber-700 border-amber-100'
                                                }`}>
                                                {tx.status === 'completed' ? <FaCheckCircle /> : <FaClock />}
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <p className={`text-lg font-black font-mono ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount).replace('KES', '')}
                                            </p>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-20 text-center">
                                        <div className="max-w-xs mx-auto space-y-4">
                                            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-slate-400 shadow-inner">
                                                <FaFileInvoiceDollar size={32} />
                                            </div>
                                            <h4 className="text-lg font-black text-slate-400">No History Found</h4>
                                            <p className="text-sm text-slate-400 font-medium">
                                                {searchQuery ? `No results for "${searchQuery}"` : "You haven't had any cleared or successful transactions yet."}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Info Notice */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                    <FaExclamationTriangle />
                </div>
                <div>
                    <h4 className="text-blue-900 font-black text-sm uppercase mb-1">Service Clearance Policy</h4>
                    <p className="text-blue-700 text-sm font-bold leading-relaxed opacity-80">
                        Pending clears are balances from services that have been booked but not yet marked as completed by the customer.
                        Once marked as complete, funds will move to your available balance following our 24h safety clearing period.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ServiceProviderWallet;
