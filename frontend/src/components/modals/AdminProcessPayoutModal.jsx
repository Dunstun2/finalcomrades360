import React, { useState } from 'react';
import { 
    FaTimes, FaMoneyBillWave, FaCheckCircle, FaSpinner, 
    FaArrowRight, FaClipboardList, FaFileInvoiceDollar 
} from 'react-icons/fa';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { formatPrice } from '../../utils/currency';

const AdminProcessPayoutModal = ({ isOpen, onClose, transactions = [], user = {}, onSuccess }) => {
    const [referenceNumber, setReferenceNumber] = useState('');
    const [proofUrl, setProofUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const totalAmount = transactions.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
    const count = transactions.length;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!referenceNumber) {
            toast.error('Reference number is required');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/finance/process-payout', {
                transactionIds: transactions.map(t => t.id),
                referenceNumber,
                proofUrl
            });

            toast.success(`Successfully processed payout for ${user.name}`);
            onSuccess && onSuccess();
            onClose();
        } catch (error) {
            console.error('Payout failed:', error);
            toast.error(error.response?.data?.error || 'Failed to process payout');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-8 text-white relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all"
                    >
                        <FaTimes className="text-sm" />
                    </button>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                            <FaMoneyBillWave className="text-2xl" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tight">Process Payout</h3>
                            <p className="text-emerald-100 text-sm font-bold opacity-80">Finalise Disbursement</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {/* Summary Card */}
                    <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Payable to</p>
                                <p className="text-lg font-black text-gray-900">{user.name}</p>
                                <p className="text-xs text-gray-500 font-bold">{user.phone || user.email}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Amount</p>
                                <p className="text-2xl font-black text-emerald-600">{formatPrice(totalAmount)}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase mt-1">{count} Transaction(s)</p>
                            </div>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <FaClipboardList className="text-emerald-500" />
                                Payment Reference (Required)
                            </label>
                            <input 
                                type="text"
                                required
                                value={referenceNumber}
                                onChange={e => setReferenceNumber(e.target.value)}
                                placeholder="e.g. M-Pesa Transaction ID (RKB123...)"
                                className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-emerald-500 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <FaFileInvoiceDollar className="text-emerald-500" />
                                Proof URL / Receipt Link (Optional)
                            </label>
                            <input 
                                type="url"
                                value={proofUrl}
                                onChange={e => setProofUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-emerald-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-[10px] text-amber-700 font-bold uppercase leading-relaxed">
                        ⚠️ Security Protocol: Ensure the payment has been successfully completed in your payment gateway (e.g., M-Pesa B2C portal) before confirming this payout.
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-widest rounded-[1.5rem] shadow-xl shadow-emerald-100 transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
                    >
                        {submitting ? (
                            <FaSpinner className="animate-spin text-lg" />
                        ) : (
                            <>
                                <FaCheckCircle className="text-lg" />
                                Confirm & Close Request
                                <FaArrowRight className="text-[10px] opacity-60 ml-2" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminProcessPayoutModal;
