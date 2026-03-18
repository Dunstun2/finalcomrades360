import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

// Map each handoverType to a human label and icon
const HANDOVER_META = {
    seller_to_agent:    { label: 'Seller → Agent Pickup',           giverTitle: 'Seller Handover Code', receiverTitle: 'Agent Collection Confirmation', giverHint: 'Share this code with the delivery agent when they arrive to collect the order.', receiverHint: 'Enter the code given to you by the seller to confirm you have collected the order.' },
    agent_to_warehouse: { label: 'Agent → Warehouse Drop-off',      giverTitle: 'Agent Drop-off Code',  receiverTitle: 'Warehouse Receipt Confirmation',  giverHint: 'Share this code with the warehouse staff when dropping off the order.', receiverHint: 'Enter the code from the delivery agent to confirm the order has been received at the warehouse.' },
    warehouse_to_agent: { label: 'Warehouse → Agent Pickup',        giverTitle: 'Warehouse Release Code', receiverTitle: 'Agent Warehouse Pickup Confirmation', giverHint: 'Share this code with the delivery agent collecting from the warehouse.', receiverHint: 'Enter the code from warehouse staff to confirm you have collected the order.' },
    agent_to_station:   { label: 'Agent → Pickup Station Drop-off', giverTitle: 'Agent Drop-off Code',  receiverTitle: 'Station Receipt Confirmation',    giverHint: 'Share this code with the pickup station staff when dropping off the order.', receiverHint: 'Enter the code from the delivery agent to confirm receipt at the pickup station.' },
    agent_to_customer:  { label: 'Agent → Customer Delivery',       giverTitle: 'Delivery Code',        receiverTitle: 'Customer Delivery Confirmation',  giverHint: 'Share this code with the customer when delivering their order.', receiverHint: 'Enter the code provided by the delivery agent to confirm you have received your order.' },
    station_to_customer:{ label: 'Station → Customer Collection',     giverTitle: 'Pickup Code',         receiverTitle: 'Customer Pickup Confirmation',    giverHint: 'Share this code with the customer when they arrive for collection.', receiverHint: 'Enter the code provided by the station manager to confirm you have picked up your order.' },
};

/**
 * HandoverCodeWidget
 *
 * @param {string}   mode          - 'giver' | 'receiver'
 * @param {string}   handoverType  - one of the keys in HANDOVER_META
 * @param {number}   orderId       - the order ID
 * @param {number}   [taskId]      - optional delivery task ID
 * @param {function} [onConfirmed] - callback fired when confirmation succeeds
 * @param {string}   [buttonLabel] - custom label for the generate button
 */
export default function HandoverCodeWidget({ mode, handoverType, orderId, taskId, onConfirmed, buttonLabel, autoGenerate = false }) {
    const meta = HANDOVER_META[handoverType] || {};

    // GIVER state
    const [code, setCode] = useState('');
    const [expiresAt, setExpiresAt] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');

    // RECEIVER state
    const [inputCode, setInputCode] = useState('');
    const [confirming, setConfirming] = useState(false);

    // Shared
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);

    // On mount: check if there's already an active or confirmed code
    useEffect(() => {
        if (!orderId) return;
        api.get(`/handover/status/${orderId}/${handoverType}`)
            .then(res => {
                if (res.data.active) {
                    setCode(res.data.code);
                    setExpiresAt(new Date(res.data.expiresAt));
                }
                if (res.data.confirmed) {
                    setIsConfirmed(true);
                }
            })
            .catch(() => {}); // Silent fail
    }, [orderId, handoverType]);

    // Poll for confirmation if we are in giver mode and have a code
    useEffect(() => {
        if (mode !== 'giver' || !code || isConfirmed) return;
        const interval = setInterval(async () => {
            try {
                const res = await api.get(`/handover/status/${orderId}/${handoverType}`);
                if (res.data.confirmed) {
                    setIsConfirmed(true);
                    setSuccess('✅ Handover confirmed and completed!');
                    clearInterval(interval);
                }
            } catch (err) {}
        }, 5000);
        return () => clearInterval(interval);
    }, [mode, code, isConfirmed, orderId, handoverType]);

    // Countdown timer for the giver
    useEffect(() => {
        if (!expiresAt || isConfirmed) return;
        const interval = setInterval(() => {
            const diffMs = new Date(expiresAt) - Date.now();
            if (diffMs <= 0) {
                setTimeLeft('Expired');
                setCode('');
                setExpiresAt(null);
                clearInterval(interval);
            } else {
                const mins = Math.floor(diffMs / 60000);
                const secs = Math.floor((diffMs % 60000) / 1000);
                setTimeLeft(`${mins}m ${String(secs).padStart(2, '0')}s`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    const handleGenerate = useCallback(async () => {
        setError('');
        setGenerating(true);
        try {
            const res = await api.post('/handover/generate', { orderId, taskId, handoverType });
            setCode(res.data.code);
            setExpiresAt(new Date(res.data.expiresAt));
            setSuccess('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate code. Please try again.');
        } finally {
            setGenerating(false);
        }
    }, [orderId, taskId, handoverType]);

    useEffect(() => {
        if (mode !== 'giver' || !autoGenerate || !orderId) return;
        if (code || generating || isConfirmed) return;
        handleGenerate();
    }, [mode, autoGenerate, orderId, code, generating, isConfirmed, handleGenerate]);

    const handleConfirm = useCallback(async () => {
        if (inputCode.length !== 5) {
            setError('Please enter the full 5-digit code.');
            return;
        }
        setError('');
        setConfirming(true);
        try {
            const res = await api.post('/handover/confirm', {
                code: inputCode.trim(),
                orderId,
                handoverType
            });
            setSuccess(res.data.message || '✅ Handover confirmed!');
            setError('');
            if (onConfirmed) onConfirmed(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid or expired code. Please check and try again.');
        } finally {
            setConfirming(false);
        }
    }, [inputCode, orderId, handoverType, onConfirmed]);

    // ═══════════════ GIVER UI ═════════════════════════════════════════════════
    if (mode === 'giver') {
        if (isConfirmed) {
            return (
                <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4 text-center space-y-1">
                    <p className="text-green-700 font-bold text-lg">✅ Confirmed!</p>
                    <p className="text-green-600 text-sm">{success || 'Handover confirmed successfully.'}</p>
                </div>
            );
        }

        return (
            <div className={`rounded-xl border-2 border-blue-200 bg-blue-50 ${code ? 'p-4' : 'p-2'} space-y-3`}>
                {/* Header removed as requested by user */}

                {code ? (
                    <div className="flex flex-col items-center gap-2 bg-white rounded-xl p-4 border border-blue-300 shadow-inner">
                        {/* Big code display */}
                        <div className="flex gap-2">
                            {code.split('').map((digit, i) => (
                                <span key={i} className="w-10 h-12 flex items-center justify-center text-2xl font-black text-blue-700 bg-blue-100 rounded-lg border-2 border-blue-300 tracking-widest select-all">
                                    {digit}
                                </span>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500">
                            {timeLeft && timeLeft !== 'Expired'
                                ? <span className="text-green-600 font-semibold">⏱ Expires in {timeLeft}</span>
                                : <span className="text-red-500 font-semibold">⚠ Code has expired</span>
                            }
                        </p>
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="text-xs text-blue-600 underline hover:text-blue-800 transition-colors"
                        >
                            {generating ? 'Regenerating...' : 'Regenerate new code'}
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all ${generating ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
                    >
                        {generating ? 'Generating...' : (buttonLabel || (meta.giverTitle ? `🔑 ${meta.giverTitle}` : '🔑 Generate Code'))}
                    </button>
                )}

                {error && <p className="text-xs text-red-600 font-semibold text-center">{error}</p>}
            </div>
        );
    }

    // ═══════════════ RECEIVER UI ══════════════════════════════════════════════
    if (mode === 'receiver') {
        if (success) {
            return (
                <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4 text-center space-y-1">
                    <p className="text-green-700 font-bold text-lg">✅ Confirmed!</p>
                    <p className="text-green-600 text-sm">{success}</p>
                </div>
            );
        }

        return (
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <span className="text-amber-600 text-xl">🔑</span>
                    <div>
                        <p className="font-bold text-amber-800 text-sm">{meta.receiverTitle || 'Enter Handover Code'}</p>
                        <p className="text-[11px] text-amber-600">{meta.receiverHint}</p>
                    </div>
                </div>

                <div className="flex gap-2 items-center">
                    <input
                        type="text"
                        inputMode="numeric"
                        maxLength={5}
                        value={inputCode}
                        onChange={e => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                            setInputCode(val);
                            setError('');
                        }}
                        placeholder="_ _ _ _ _"
                        className="flex-1 text-center text-2xl font-black tracking-[0.4em] border-2 border-amber-300 rounded-xl py-3 px-4 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all text-amber-800"
                    />
                    <button
                        onClick={handleConfirm}
                        disabled={confirming || inputCode.length !== 5}
                        className={`px-5 py-3 rounded-xl font-bold text-white text-sm shadow-md transition-all ${confirming || inputCode.length !== 5 ? 'bg-gray-300 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 active:scale-95 shadow-amber-200'}`}
                    >
                        {confirming ? '...' : '✓ Confirm'}
                    </button>
                </div>

                {error && <p className="text-xs text-red-600 font-semibold text-center bg-red-50 rounded-lg p-2">{error}</p>}
            </div>
        );
    }

    return null;
}
