import React, { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaCheckCircle, FaSpinner, FaExclamationTriangle, FaMobileAlt, FaWallet, FaBan, FaShieldAlt, FaTimes } from 'react-icons/fa';
import api from '../../services/api';

const PaymentVerificationModal = ({ isOpen, onClose, order, onPaymentVerified }) => {
    const [loading, setLoading] = useState(false);
    const [walletLoading, setWalletLoading] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, processing, completed, failed
    const [paymentId, setPaymentId] = useState(null);
    const [error, setError] = useState(null);
    const [pollInterval, setPollInterval] = useState(null);
    const [walletBalance, setWalletBalance] = useState(null);

    useEffect(() => {
        if (isOpen && order) {
            setPhoneNumber(order.customerPhone || '');
            if (order.paymentConfirmed) {
                setPaymentStatus('completed');
            } else {
                setPaymentStatus('pending');
                fetchWalletBalance();
                checkExistingPayment();
            }
            setError(null);
            setLoading(false);
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [isOpen, order]);

    const checkExistingPayment = async () => {
        if (!order?.id) return;
        try {
            // Check if there's already a successful payment for this order
            const res = await api.get(`/orders/${order.id}/payments`);
            const payments = res.data.payments || [];
            const completedPayment = payments.find(p => p.status === 'completed');
            if (completedPayment) {
                setPaymentStatus('completed');
            }
        } catch (err) {
            console.error('Failed to check existing payments:', err);
        }
    };

    const fetchWalletBalance = async () => {
        if (!order?.userId) return;
        try {
            setWalletLoading(true);
            const res = await api.get(`/users/${order.userId}/wallet`);
            setWalletBalance(res.data.balance || 0);
        } catch (err) {
            console.error('Failed to fetch wallet balance:', err);
        } finally {
            setWalletLoading(false);
        }
    };

    useEffect(() => {
        if (paymentId && paymentStatus === 'processing') {
            const interval = setInterval(async () => {
                try {
                    const res = await api.get(`/payments/status/${paymentId}`);
                    const status = res.data.payment.status;

                    if (status === 'completed') {
                        setPaymentStatus('completed');
                        clearInterval(interval);
                    } else if (status === 'failed') {
                        setPaymentStatus('failed');
                        setError(res.data.payment.failureReason || 'Payment failed');
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error('Error polling payment status:', err);
                }
            }, 3000);

            setPollInterval(interval);
            return () => clearInterval(interval);
        }
    }, [paymentId, paymentStatus]);

    const handleInitiateMpesa = async (e) => {
        e?.preventDefault();
        if (!phoneNumber) return;

        try {
            setLoading(true);
            setError(null);

            const res = await api.post('/payments/mpesa/initiate', {
                orderId: order.id,
                phoneNumber: phoneNumber,
                amount: order.total
            });

            if (res.data.success) {
                setPaymentId(res.data.payment.id);
                setPaymentStatus('processing');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to initiate M-Pesa payment');
        } finally {
            setLoading(false);
        }
    };

    const handlePayViaWallet = async () => {
        if (!window.confirm(`Deduct KES ${order.total} from customer's wallet?`)) return;

        try {
            setLoading(true);
            setError(null);
            const res = await api.post('/payments/wallet/pay', { orderId: order.id });
            if (res.data.success) {
                setPaymentStatus('completed');
                setWalletBalance(res.data.order.walletBalance);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to process wallet payment');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmManually = async () => {
        if (!window.confirm("Are you sure you want to MANUALLY confirm this payment? Use this only after verifying the customer's payment screenshot or bank statement.")) return;

        try {
            setLoading(true);
            setError(null);
            const res = await api.post('/payments/verify', { 
                orderId: order.id,
                manual: true
            });
            if (res.data.success) {
                setPaymentStatus('completed');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to manually verify payment');
        } finally {
            setLoading(false);
        }
    };

    const handleProceed = () => {
        if (onPaymentVerified) {
            onPaymentVerified();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col transform transition-all scale-100 animate-in flip-in-x duration-300">

                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 flex justify-between items-center text-white flex-shrink-0 rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <FaShieldAlt className="text-xl" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight leading-none uppercase">Payment Verification</h3>
                            <p className="text-[10px] text-emerald-100 font-bold tracking-widest uppercase mt-1 opacity-75">Secure Checkout Engine</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white hover:text-emerald-100 focus:outline-none transition-colors p-2 -mr-2 rounded-xl hover:bg-white/20 flex items-center justify-center">
                        <FaTimes className="text-lg" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <div className="text-center mb-8">
                        <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                            Order #{order?.orderNumber}
                        </div>
                        <div className="text-5xl font-black text-gray-900 tracking-tight">
                            KES {order?.total?.toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-widest">Total Payable Amount</p>

                        <div className="mt-4 p-3 bg-gray-50 rounded-2xl border border-gray-100 inline-flex flex-col items-center min-w-[200px]">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Selected Payment Mode</span>
                            <div className="flex items-center gap-2 mt-1">
                                {order?.paymentType === 'prepay' ? (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase">
                                        <FaCheckCircle className="text-[8px]" /> Pre-paid
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-bold uppercase">
                                        <FaMoneyBillWave className="text-[8px]" /> Cash on Delivery
                                    </div>
                                )}
                                <span className="text-sm font-black text-gray-700 uppercase">
                                    {order?.paymentSubType?.replace(/_/g, ' ') || order?.paymentMethod || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {paymentStatus === 'completed' ? (
                        <div className="mb-8 p-8 bg-emerald-50 border-2 border-emerald-100 rounded-[2rem] text-center shadow-sm animate-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
                                <FaCheckCircle className="text-white text-3xl" />
                            </div>
                            <h4 className="text-emerald-900 font-black text-2xl uppercase italic">Confirmed</h4>
                            <p className="text-emerald-600 text-sm font-bold mt-1">Payment has been successfully verified!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Security Warning */}
                            <div className="flex items-center gap-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl mb-6">
                                <FaBan className="text-red-500 text-xl flex-shrink-0" />
                                <p className="text-[11px] text-red-700 font-black leading-tight uppercase">
                                    No Cash Allowed! <span className="block font-medium normal-case text-red-600">All payments must be processed via the system for tracking and security.</span>
                                </p>
                            </div>

                            {/* Wallet Option */}
                            <div className="group bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl p-4 transition-all duration-200 cursor-pointer relative overflow-hidden" onClick={handlePayViaWallet}>
                                <FaWallet className="absolute -bottom-4 -right-4 text-blue-200/50 text-8xl rotate-12 transition-transform group-hover:scale-110" />
                                <div className="relative z-10 flex justify-between items-center">
                                    <div>
                                        <h5 className="font-black text-blue-900 text-sm flex items-center gap-2">
                                            PAY VIA WALLET
                                        </h5>
                                        <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider mt-1">
                                            Balance: {walletLoading ? 'Checking...' : `KES ${walletBalance?.toLocaleString() || 0}`}
                                        </p>
                                    </div>
                                    <div className="text-blue-600 animate-pulse">
                                        {loading ? <FaSpinner className="animate-spin" /> : <div className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md">Pay</div>}
                                    </div>
                                </div>
                            </div>

                            {/* M-Pesa Option */}
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm">
                                <h5 className="font-black text-emerald-900 text-sm flex items-center gap-2 mb-4">
                                    <FaMobileAlt /> M-PESA STK PUSH
                                </h5>

                                {paymentStatus === 'processing' ? (
                                    <div className="p-6 bg-white rounded-xl border border-emerald-100 shadow-inner text-center">
                                        <FaSpinner className="animate-spin text-emerald-500 text-4xl mx-auto mb-3" />
                                        <p className="text-sm font-black text-emerald-900 uppercase italic">Confirming Payment...</p>
                                        <p className="text-[10px] text-gray-500 mt-1">Check terminal at {phoneNumber}</p>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            placeholder="Phonenumber"
                                            className="flex-1 px-4 py-3 bg-white border-2 border-emerald-100 rounded-xl text-sm font-bold outline-none focus:border-emerald-500 transition-all text-gray-900"
                                        />
                                        <button
                                            onClick={handleInitiateMpesa}
                                            disabled={loading || !phoneNumber}
                                            className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 active:scale-95 disabled:opacity-50 shadow-md shadow-emerald-200 transition-all"
                                        >
                                            PUSH
                                        </button>
                                    </div>
                                )}
                                {error && (
                                    <div className="mt-3 flex items-center gap-2 text-red-500 animate-shake">
                                        <FaExclamationTriangle className="text-xs" />
                                        <p className="text-[10px] font-bold italic">{error}</p>
                                    </div>
                                )}
                            </div>

                            {/* Manual Verification Option (Show Screenshot) */}
                            {order?.paymentProofUrl ? (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
                                    <h5 className="font-black text-amber-900 text-sm flex items-center gap-2 mb-3 uppercase tracking-tight">
                                        <FaCheckCircle className="text-amber-500" /> Manual Payment Verification
                                    </h5>
                                    
                                    <div className="mb-4 aspect-video bg-gray-200 rounded-xl overflow-hidden border-2 border-white shadow-inner group relative">
                                        <img 
                                            src={order.paymentProofUrl} 
                                            alt="Payment Proof" 
                                            className="w-full h-full object-contain cursor-zoom-in"
                                            onClick={() => window.open(order.paymentProofUrl, '_blank')}
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                            <span className="text-white text-[10px] font-black uppercase tracking-widest">Click to Expand</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleConfirmManually}
                                        disabled={loading}
                                        className="w-full bg-amber-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-700 active:scale-95 disabled:opacity-50 shadow-md shadow-amber-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading ? <FaSpinner className="animate-spin" /> : <>Confirm Payment Manually</>}
                                    </button>
                                    <p className="text-[9px] text-amber-700 font-bold text-center mt-2 italic uppercase">Verify screenshot before confirming</p>
                                </div>
                            ) : (
                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl border-dashed text-center">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">No manual payment screenshot uploaded</p>
                                    <button
                                        onClick={handleConfirmManually}
                                        disabled={loading}
                                        className="mt-2 text-blue-600 text-[10px] font-black uppercase hover:underline"
                                    >
                                        Force Manual Confirm
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="mt-10 flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-4 border-2 border-gray-100 rounded-2xl text-gray-400 font-black uppercase tracking-widest text-xs hover:border-gray-200 hover:text-gray-600 transition-all"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleProceed}
                            disabled={paymentStatus !== 'completed'}
                            className={`flex-[2] px-6 py-4 rounded-2xl text-white font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95 ${paymentStatus === 'completed'
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:shadow-emerald-200'
                                : 'bg-gray-200 text-gray-400 grayscale cursor-not-allowed'
                                }`}
                        >
                            Next Step &rarr;
                        </button>
                    </div>
                </div>

                {/* Progress bar info for multi-step */}
                <div className="bg-gray-50 px-6 py-3 flex items-center gap-2 justify-center">
                    <div className="w-8 h-1 bg-emerald-500 rounded-full" title="Step 1: Payment"></div>
                    <div className="w-8 h-1 bg-gray-200 rounded-full" title="Step 2: Delivery"></div>
                </div>
            </div>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.2s ease-in-out 0s 2;
                }
            `}</style>
        </div>
    );
};

export default PaymentVerificationModal;
