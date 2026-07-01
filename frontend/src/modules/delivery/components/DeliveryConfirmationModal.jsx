import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaClipboardList, FaTruck, FaTimes } from 'react-icons/fa';

const DeliveryConfirmationModal = ({ isOpen, onClose, order, onConfirm }) => {
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setNotes('');
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        try {
            setIsSubmitting(true);
            if (onConfirm) {
                await onConfirm(notes);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col transform transition-all scale-100 animate-in flip-in-y duration-300">

                {/* Header — sticky so X is always visible */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5 flex justify-between items-center text-white flex-shrink-0 rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <FaTruck className="text-xl" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight leading-none uppercase">Final Confirmation</h3>
                            <p className="text-[10px] text-blue-100 font-bold tracking-widest uppercase mt-1 opacity-75">Step 2: Logistics Completion</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white hover:text-blue-100 focus:outline-none transition-colors p-2 -mr-2 rounded-xl hover:bg-white/20 flex items-center justify-center">
                        <FaTimes className="text-lg" />
                    </button>
                </div>

                {/* Body — scrollable */}
                <div className="p-8 overflow-y-auto flex-1">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-100">
                            <FaCheckCircle className="text-blue-600 text-4xl" />
                        </div>
                        <h4 className="text-xl font-black text-gray-900 uppercase">Handover Confirmed?</h4>
                        <p className="text-sm text-gray-500 font-medium px-4 mt-2">
                            You are marking order <span className="font-black text-gray-800">#{order?.orderNumber}</span> as successfully delivered.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <FaClipboardList /> Delivery Notes (Optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="E.g. Handed to customer, left at security desk..."
                                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 transition-all text-gray-900 min-h-[100px] resize-none"
                            />
                        </div>

                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                                <span>Status</span>
                                <span className="text-blue-600">Pre-Verified</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-800">Payment Status</span>
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase">PAID</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 mt-10">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-4 border-2 border-gray-100 rounded-2xl text-gray-400 font-black uppercase tracking-widest text-xs hover:border-gray-200 hover:text-gray-600 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isSubmitting}
                            className="flex-[2] px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-100 hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Confirming...' : 'MARK DELIVERED'}
                        </button>
                    </div>
                </div>

                {/* Progress bar info for multi-step */}
                <div className="bg-gray-50 px-6 py-3 flex items-center gap-2 justify-center">
                    <div className="w-8 h-1 bg-emerald-500/50 rounded-full" title="Step 1: Payment (Complete)"></div>
                    <div className="w-8 h-1 bg-blue-600 rounded-full" title="Step 2: Delivery"></div>
                </div>
            </div>
        </div>
    );
};

export default DeliveryConfirmationModal;
