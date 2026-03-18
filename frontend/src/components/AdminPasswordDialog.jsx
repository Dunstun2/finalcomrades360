import React, { useState } from 'react';
import { X, Lock, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import api from '../services/api';

const AdminPasswordDialog = ({
    isOpen,
    onClose,
    onConfirm,
    actionDescription,
    title = "Confirm Action",
    requiresReason = false,
    reasonLabel = "Reason"
}) => {
    const [password, setPassword] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Verify password with backend
            const response = await api.post('/auth/verify-password', { password });

            if (response.data.success || response.data.verified) {
                // Password correct, execute action with reason and password
                await onConfirm(reason, password);
                setPassword('');
                setReason('');
                onClose();
            } else {
                setError(response.data.message || 'Incorrect password');
            }

        } catch (err) {
            // Handle 401 errors (incorrect password) without redirecting
            if (err.response?.status === 401) {
                setError('Incorrect password. Please try again.');
            } else {
                setError(err.response?.data?.message || 'Failed to verify password');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setPassword('');
        setReason('');
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200] animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-orange-50 to-red-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <Lock className="text-orange-600" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                            <p className="text-sm text-gray-500">Authentication required</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-white/50 rounded-full transition-all text-gray-400 hover:text-gray-600"
                        disabled={loading}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6">
                    {/* Action Description */}
                    <div className="mb-6 p-4 bg-orange-50 border border-orange-100 rounded-lg">
                        <p className="text-sm font-medium text-gray-700">
                            You are about to:
                        </p>
                        <p className="text-base font-bold text-orange-700 mt-1">
                            {actionDescription}
                        </p>
                    </div>

                    {/* Password Input */}
                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Enter your password to continue
                        </label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                            }}
                            placeholder="Your account password"
                            className="w-full"
                            autoFocus
                            disabled={loading}
                            required
                        />
                    </div>

                    {/* Reason Input (shown only for Suspend/Delete) */}
                    {requiresReason && (
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                {reasonLabel} <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => {
                                    setReason(e.target.value);
                                    setError('');
                                }}
                                placeholder="Enter reason for this action..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[80px] resize-y"
                                disabled={loading}
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                This reason will be sent to the vendor as a notification.
                            </p>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                            <p className="text-sm text-red-700 font-medium">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            className="flex-1"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-orange-600 hover:bg-orange-700"
                            disabled={loading || !password || (requiresReason && !reason.trim())}
                        >
                            {loading ? 'Verifying...' : 'Confirm'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminPasswordDialog;
