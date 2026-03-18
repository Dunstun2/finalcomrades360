import React from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

const ConfirmationDialog = ({
    isOpen,
    onClose,
    success = true,
    title,
    message
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[201] animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className={`p-6 border-b border-gray-100 flex justify-between items-center ${success ? 'bg-gradient-to-r from-green-50 to-emerald-50' : 'bg-gradient-to-r from-red-50 to-orange-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${success ? 'bg-green-100' : 'bg-red-100'}`}>
                            {success ? (
                                <CheckCircle className="text-green-600" size={20} />
                            ) : (
                                <AlertCircle className="text-red-600" size={20} />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{title || (success ? 'Success' : 'Failed')}</h2>
                            <p className="text-sm text-gray-500">{success ? 'Action completed' : 'Action failed'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/50 rounded-full transition-all text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-gray-700 leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="p-6 pt-0">
                    <Button
                        onClick={onClose}
                        className={`w-full ${success ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                        OK
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationDialog;
