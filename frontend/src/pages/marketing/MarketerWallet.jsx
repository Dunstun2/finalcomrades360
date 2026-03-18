import React, { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaWallet, FaHistory, FaCheckCircle, FaClock, FaArrowRight, FaBullhorn, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import { formatPrice } from '../../utils/currency';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/use-toast';

const MarketerWallet = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'success', or 'paid'
    const [walletData, setWalletData] = useState({
        balance: 0,
        pendingBalance: 0,
        successBalance: 0,
        transactions: []
    });

    useEffect(() => {
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/marketing/wallet');
            setWalletData(res.data);
        } catch (error) {
            console.error('Failed to fetch wallet data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        const amount = parseFloat(withdrawAmount);

        if (isNaN(amount) || amount <= 0) {
            toast({ title: 'Invalid Amount', description: 'Please enter a valid amount to withdraw.', variant: 'destructive' });
            return;
        }

        if (amount > walletData.balance) {
            toast({ title: 'Insufficient Balance', description: 'You cannot withdraw more than your available balance.', variant: 'destructive' });
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/marketing/wallet/withdraw', { amount });
            toast({ title: 'Request Sent', description: `Your withdrawal request for ${formatPrice(amount)} has been submitted for approval.` });
            setShowWithdrawModal(false);
            setWithdrawAmount('');
            fetchWalletData(); // Refresh data
        } catch (error) {
            console.error('Withdrawal failed:', error);
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to submit withdrawal request.', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const filteredTransactions = (walletData.transactions || []).filter(tx => {
        if (activeTab === 'pending') return tx.status === 'pending';
        if (activeTab === 'success') return tx.status === 'success';
        return tx.status === 'completed' || tx.status === 'paid' || tx.status === 'approved';
    });

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 animate-fadeIn relative">
            {/* Header Section */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Marketer Wallet</h1>
                    <p className="text-gray-500">Track and manage your affiliate commissions</p>
                </div>
                <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full">
                    <FaBullhorn className="text-purple-500" />
                    <span>Marketer Dashboard</span>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Available Balance */}
                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-purple-100 font-medium tracking-wide uppercase text-[10px] font-black">Available for Withdrawal</span>
                            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                                <FaCheckCircle className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-3xl font-black mb-6">{formatPrice(walletData.balance)}</div>
                        <button
                            onClick={() => setShowWithdrawModal(true)}
                            disabled={walletData.balance <= 0}
                            className="bg-white text-purple-700 w-full py-3 rounded-xl font-black text-xs uppercase hover:bg-purple-50 transition-all flex items-center justify-center group shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Request Payout
                            <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Success/Cleared Balance */}
                <div className="bg-white border border-green-100 rounded-2xl p-6 shadow-sm relative overflow-hidden bg-green-50/20">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className="text-green-600 font-bold uppercase text-[10px] tracking-widest">Success (Cleared)</span>
                            <div className="text-3xl font-black mt-1 text-gray-900">{formatPrice(walletData.successBalance)}</div>
                        </div>
                        <div className="bg-green-100 p-3 rounded-xl text-green-600">
                            <FaHistory className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-[10px] text-green-700 mt-4 leading-relaxed font-bold bg-green-100/50 p-2 rounded-lg border border-green-100">
                        Order delivered. Awaiting admin clearance to your available balance.
                    </p>
                </div>

                {/* Pending Balance */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Uncleared Commissions</span>
                            <div className="text-3xl font-black mt-1 text-gray-900">{formatPrice(walletData.pendingBalance)}</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-xl text-orange-500">
                            <FaClock className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-4 leading-relaxed bg-gray-50 p-2 rounded-lg italic">
                        Commissions from recent referrals. Clears after successful delivery and return period.
                    </p>
                </div>
            </div>

            {/* Transactions Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                    <h2 className="text-lg font-black text-gray-800 flex items-center uppercase tracking-tight">
                        <FaHistory className="mr-2 text-purple-500" />
                        Earnings History
                    </h2>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 h-14 bg-white">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`flex-1 flex items-center justify-center font-black text-[11px] uppercase tracking-widest transition-all relative ${activeTab === 'pending' ? 'text-purple-600 bg-purple-50/50' : 'text-gray-400 hover:text-gray-700'
                            }`}
                    >
                        Pending
                        {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('success')}
                        className={`flex-1 flex items-center justify-center font-black text-[11px] uppercase tracking-widest transition-all relative ${activeTab === 'success' ? 'text-purple-600 bg-purple-50/50' : 'text-gray-400 hover:text-gray-700'
                            }`}
                    >
                        Success
                        {activeTab === 'success' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('paid')}
                        className={`flex-1 flex items-center justify-center font-black text-[11px] uppercase tracking-widest transition-all relative ${activeTab === 'paid' ? 'text-purple-600 bg-purple-50/50' : 'text-gray-400 hover:text-gray-700'
                            }`}
                    >
                        Paid
                        {activeTab === 'paid' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600"></div>}
                    </button>
                </div>

                {/* List */}
                <div className="divide-y divide-gray-50 min-h-[400px]">
                    {filteredTransactions.length > 0 ? (
                        filteredTransactions.map((tx) => (
                            <div key={tx.id} className="p-6 hover:bg-gray-50/50 transition-colors flex items-center justify-between group">
                                <div className="flex items-center space-x-4">
                                    <div className={`p-4 rounded-2xl shadow-sm transition-transform group-hover:scale-110 ${tx.status === 'pending' ? 'bg-orange-50 text-orange-500' :
                                        tx.status === 'success' ? 'bg-green-50 text-green-500' :
                                            'bg-purple-50 text-purple-600'
                                        }`}>
                                        {tx.status === 'pending' ? <FaClock className="w-5 h-5" /> :
                                            tx.status === 'success' ? <FaCheckCircle className="w-5 h-5" /> :
                                                <FaMoneyBillWave className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-gray-900 leading-tight">{tx.description}</h3>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter mt-1">
                                            {new Date(tx.createdAt).toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-xl font-black font-mono ${tx.type === 'credit' ? 'text-green-600' : 'text-red-500'
                                        }`}>
                                        {tx.type === 'credit' ? '+' : '-'}{formatPrice(tx.amount)}
                                    </div>
                                    <span className={`text-[9px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full mt-2 inline-block shadow-sm ${tx.status === 'pending' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                        tx.status === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
                                            'bg-purple-100 text-purple-700 border border-purple-200'
                                        }`}>
                                        {tx.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center p-20 text-center">
                            <div className="bg-gray-50 p-8 rounded-full mb-6">
                                <FaHistory className="w-16 h-16 text-gray-200" />
                            </div>
                            <h3 className="text-lg font-black text-gray-400 uppercase tracking-widest">No Records Found</h3>
                            <p className="text-sm text-gray-300 mt-2 font-bold">Your {activeTab} transactions will appear here.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Withdrawal Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-8 text-white relative">
                            <button
                                onClick={() => setShowWithdrawModal(false)}
                                className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                            >
                                <FaTimes />
                            </button>
                            <FaWallet className="text-4xl mb-4 opacity-50" />
                            <h3 className="text-2xl font-black uppercase tracking-tight">Request Payout</h3>
                            <p className="text-purple-100 font-bold text-sm mt-1">Transfer funds to your account</p>
                        </div>

                        <div className="p-8">
                            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 mb-8 flex items-center justify-between">
                                <span className="text-purple-800 font-black uppercase text-[10px]">Available</span>
                                <span className="text-purple-900 font-black text-xl font-mono">{formatPrice(walletData.balance)}</span>
                            </div>

                            <form onSubmit={handleWithdraw}>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Amount to Withdraw (KES)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <span className="text-gray-400 font-black">KES</span>
                                            </div>
                                            <input
                                                type="number"
                                                value={withdrawAmount}
                                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                                placeholder="0.00"
                                                required
                                                min="1"
                                                max={walletData.balance}
                                                className="w-full pl-14 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xl font-black focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100 flex items-start gap-4">
                                        <FaExclamationTriangle className="text-orange-500 mt-1 flex-shrink-0" />
                                        <p className="text-[11px] text-orange-800 font-bold leading-relaxed">
                                            Payouts are processed within 24-48 hours. Please ensure your payment details in "Configure" are up to date.
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                                        className="w-full py-5 bg-gray-900 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-gray-200 hover:bg-black hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2"
                                    >
                                        {submitting ? (
                                            <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <>Confirm Withdrawal <FaArrowRight /></>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketerWallet;
