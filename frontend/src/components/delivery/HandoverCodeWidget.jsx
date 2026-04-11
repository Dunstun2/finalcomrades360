import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';

// Map each handoverType to a human label and icon
const HANDOVER_META = {
    seller_to_agent:    { label: 'Seller → Agent Pickup',           giverTitle: 'Seller Handover Code', receiverTitle: 'Agent Collection Confirmation', giverHint: 'Share this code with the delivery agent when they arrive to collect the order.', receiverHint: 'Enter the code given to you by the seller to confirm you have collected the order.' },
    agent_to_warehouse: { label: 'Agent → Warehouse Drop-off',      giverTitle: 'Agent Drop-off Code',  receiverTitle: 'Warehouse Receipt Confirmation',  giverHint: 'Share this code with the warehouse staff when dropping off the order.', receiverHint: 'Enter the code from the delivery agent to confirm the order has been received at the warehouse.' },
    warehouse_to_agent: { label: 'Warehouse → Agent Pickup',        giverTitle: 'Warehouse Release Code', receiverTitle: 'Agent Warehouse Pickup Confirmation', giverHint: 'Share this code with the delivery agent collecting from the warehouse.', receiverHint: 'Enter the code from warehouse staff to confirm you have collected the order.' },
    agent_to_station:   { label: 'Agent → Pickup Station Drop-off', giverTitle: 'Agent Drop-off Code',  receiverTitle: 'Station Receipt Confirmation',    giverHint: 'Share this code with the pickup station staff when dropping off the order.', receiverHint: 'Enter the code from the delivery agent to confirm receipt at the pickup station.' },
    agent_to_customer:  { label: 'Agent → Customer Delivery',       giverTitle: 'Delivery Code',        receiverTitle: 'Customer Delivery Confirmation',  giverHint: 'Share this code with the customer when delivering their order.', receiverHint: 'Enter the code provided by the delivery agent to confirm you have received your order.' },
    station_to_customer:{ label: 'Station → Customer Collection',     giverTitle: 'Pickup Code',         receiverTitle: 'Customer Pickup Confirmation',    giverHint: 'Share this code with the customer when they arrive for collection.', receiverHint: 'Enter the code provided by the station manager to confirm you have picked up your order.' },
    seller_to_warehouse:{ label: 'Seller → Warehouse (Internal)',    giverTitle: 'Dispatch Code',        receiverTitle: 'Warehouse Receipt Confirmation',  giverHint: 'Share this code with the warehouse staff when dropping off the order.', receiverHint: 'Enter the code from the seller/internal dispatcher to confirm receipt at the warehouse.' },
    pickup_station_to_warehouse: { label: 'Station → Warehouse Drop-off', giverTitle: 'Station Release Code', receiverTitle: 'Warehouse Receipt Confirmation', giverHint: 'Share this code with the delivery agent or warehouse staff.', receiverHint: 'Enter the code from the station manager to confirm receipt.' },
    station_to_agent:      { label: 'Station → Agent Pickup',         giverTitle: 'Station Release Code', receiverTitle: 'Agent Pickup Confirmation',     giverHint: 'Share this code with the delivery agent when they collect the item.', receiverHint: 'Enter the code from the station manager to confirm collection.' },
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
export default function HandoverCodeWidget({
    mode,
    handoverType,
    orderId,
    orderIds, // Stable memoization handled below
    taskId,
    onConfirmed,
    buttonLabel,
    autoGenerate = false,
    title,
    containerClass
}) {
    const meta = HANDOVER_META[handoverType] || {};
    const defaultContainerClass = `rounded-xl border-2 border-blue-200 bg-blue-50`;
    const activeContainerClass = containerClass || defaultContainerClass;

    // Normalize IDs: if orderIds is provided, use it. Otherwise use [orderId].
    const ids = useMemo(() => {
        const baseIds = orderIds || [];
        return baseIds.length > 0 ? baseIds : (orderId ? [orderId] : []);
    }, [orderId, orderIds]);
    const isBulk = ids.length > 1;

    // GIVER state
    const [code, setCode] = useState('');
    const [expiresAt, setExpiresAt] = useState(null);
    const [autoConfirmAt, setAutoConfirmAt] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [autoTimeLeft, setAutoTimeLeft] = useState('');

    // RECEIVER state
    const [inputCode, setInputCode] = useState('');
    const [confirming, setConfirming] = useState(false);

    // Shared
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [isCodeHidden, setIsCodeHidden] = useState(false);
    const [hasActiveCode, setHasActiveCode] = useState(false);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const [actualType, setActualType] = useState(null);

    // On mount: check status of the FIRST order in the set (proxy for the group)
    const checkStatus = useCallback(async () => {
        if (ids.length === 0) return;
        try {
            const res = await api.get(`/handover/status/${ids[0]}/${handoverType}`);
            setHasActiveCode(res.data.active);
            if (res.data.active) {
                if (res.data.code) setCode(res.data.code);
                if (res.data.actualHandoverType) setActualType(res.data.actualHandoverType);
                setExpiresAt(new Date(res.data.expiresAt));
                if (res.data.autoConfirmAt) {
                    setAutoConfirmAt(new Date(res.data.autoConfirmAt));
                }
            }
            if (res.data.confirmed) {
                setIsConfirmed(true);
            }
            setInitialLoadDone(true);
        } catch (err) {
            setInitialLoadDone(true);
        }
    }, [ids, handoverType]);

    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    // Poll for confirmation
    useEffect(() => {
        if (mode !== 'giver' || !code || isConfirmed || ids.length === 0) return;
        const interval = setInterval(async () => {
            try {
                const res = await api.get(`/handover/status/${ids[0]}/${handoverType}`);
                if (res.data.confirmed) {
                    setIsConfirmed(true);
                    setSuccess('✅ Bulk handover confirmed!');
                    clearInterval(interval);
                    if (onConfirmed) onConfirmed(res.data);
                }
            } catch (err) {}
        }, 5000);
        return () => clearInterval(interval);
    }, [mode, code, isConfirmed, ids, handoverType, onConfirmed]);

    // Countdown timer for the giver (code expiration)
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
    }, [expiresAt, isConfirmed]);

    // Countdown timer for automatic confirmation (3-minute fallback)
    useEffect(() => {
        if (!autoConfirmAt || isConfirmed) return;
        const interval = setInterval(() => {
            const diffMs = new Date(autoConfirmAt) - Date.now();
            if (diffMs <= 0) {
                setAutoTimeLeft('Due now...');
                clearInterval(interval);
            } else {
                const mins = Math.floor(diffMs / 60000);
                const secs = Math.floor((diffMs % 60000) / 1000);
                setAutoTimeLeft(`${mins}m ${String(secs).padStart(2, '0')}s`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [autoConfirmAt, isConfirmed]);
    
    // Auto-hide code after 30 seconds
    useEffect(() => {
        if (code && !isConfirmed && !isCodeHidden) {
            const timer = setTimeout(() => {
                setIsCodeHidden(true);
            }, 30000); // 30 seconds
            return () => clearTimeout(timer);
        }
    }, [code, isConfirmed, isCodeHidden]);

    const handleGenerate = useCallback(async () => {
        if (ids.length === 0) return;
        setError('');
        setGenerating(true);
        try {
            let res;
            if (isBulk) {
                // Use the bulk generation endpoint
                res = await api.post('/handover/bulk-generate', { orderIds: ids, handoverType });
            } else {
                res = await api.post('/handover/generate', { orderId: ids[0], taskId, handoverType });
            }
            
            setCode(res.data.code);
            setExpiresAt(new Date(res.data.expiresAt));
            if (res.data.autoConfirmAt) {
                setAutoConfirmAt(new Date(res.data.autoConfirmAt));
            }
            setIsCodeHidden(false);
            setIsConfirmed(false);
            setSuccess('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate code.');
        } finally {
            setGenerating(false);
        }
    }, [ids, isBulk, taskId, handoverType]);

    useEffect(() => {
        if (mode !== 'giver' || !autoGenerate || ids.length === 0) return;
        if (code || generating || isConfirmed) return;
        handleGenerate();
    }, [mode, autoGenerate, ids, code, generating, isConfirmed, handleGenerate]);

    const handleConfirm = useCallback(async () => {
        if (inputCode.length !== 5) {
            setError('Please enter the full 5-digit code.');
            return;
        }
        if (ids.length === 0) return;
        
        setError('');
        setConfirming(true);
        try {
            let res;
            if (isBulk) {
                 res = await api.post('/handover/bulk-confirm', {
                    code: inputCode.trim(),
                    orderIds: ids,
                    handoverType: handoverType
                });
            } else {
                res = await api.post('/handover/confirm', {
                    code: inputCode.trim(),
                    orderId: ids[0],
                    handoverType: actualType || handoverType,
                    taskId
                });
            }
            setSuccess(res.data.message || '✅ Confirmed!');
            setError('');
            if (onConfirmed) onConfirmed(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid code.');
        } finally {
            setConfirming(false);
        }
    }, [inputCode, ids, isBulk, handoverType, actualType, taskId, onConfirmed]);

    // ═══════════════ GIVER UI ═════════════════════════════════════════════════
    if (mode === 'giver') {
        if (isConfirmed) {
            return (
                <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4 text-center space-y-2">
                    <p className="text-green-700 font-bold text-lg">✅ Confirmed!</p>
                    <p className="text-green-600 text-sm">{success || 'Handover confirmed successfully.'}</p>
                    <button 
                        onClick={handleGenerate} 
                        disabled={generating}
                        className="w-full py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-[10px] uppercase tracking-wider font-black rounded-lg border border-green-300 transition-all active:scale-95"
                    >
                        {generating ? 'Regenerating...' : '🔄 Regenerate release code anyway?'}
                    </button>
                </div>
            );
        }

        return (
            <div className={`${activeContainerClass} ${code ? 'p-4' : 'p-1'} transition-all duration-300`}>
                {(title && code && !isCodeHidden) && (
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${activeContainerClass.includes('teal') ? 'text-teal-600' : (activeContainerClass.includes('amber') ? 'text-amber-600' : 'text-blue-600')}`}>
                        {title}
                    </p>
                )}

                {code ? (
                    <div className="flex flex-col items-center gap-2 bg-white rounded-xl p-2 border border-blue-300 shadow-inner">
                        {isCodeHidden ? (
                            <button
                                onClick={() => setIsCodeHidden(false)}
                                className="w-full py-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
                            >
                                <span className="text-sm">👁</span>
                                <span className="text-[9px] uppercase tracking-wider">Show Handover Code</span>
                            </button>
                        ) : (
                            <>
                                {/* Big code display */}
                                <div className="flex gap-2">
                                    {(code || '').split('').map((digit, i) => (
                                        <span key={i} className="w-10 h-11 flex items-center justify-center text-2xl font-black text-blue-700 bg-blue-100 rounded-lg border-2 border-blue-300 tracking-widest select-all">
                                            {digit}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 text-center">
                                    {timeLeft && timeLeft !== 'Expired'
                                        ? <span className="text-green-600 font-semibold">⏱ Code expires in {timeLeft}</span>
                                        : <span className="text-red-500 font-semibold italic">⚠ Code has expired</span>
                                    }
                                </p>
                                {autoTimeLeft && (
                                    <div className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-700 leading-tight">
                                        <p className="font-bold">✨ Auto-completion Active</p>
                                        <p>If the customer doesn't enter the code, the order will automatically mark as <b>Delivered</b> in <b>{autoTimeLeft}</b>.</p>
                                    </div>
                                )}
                            </>
                        )}
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="text-[9px] text-blue-500 underline hover:text-blue-700 mt-1 font-bold"
                        >
                            {generating ? 'Regenerating...' : 'Regenerate Code'}
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className={`w-full py-1 rounded-lg font-bold text-[9px] text-white uppercase tracking-wider shadow-md transition-all ${generating ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
                    >
                        {generating ? 'Generating...' : (buttonLabel || (meta.giverTitle ? `🔑 ${meta.giverTitle}` : '🔑 Generate'))}
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

        if (initialLoadDone && !hasActiveCode && !isConfirmed) {
            return (
                <div className="rounded-xl border-2 border-amber-100 bg-amber-50 p-4 text-center space-y-3">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-amber-500 animate-pulse">
                            <span className="text-xl">⏳</span>
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-amber-800 text-sm">Waiting for Handover Code</p>
                            <p className="text-[10px] text-amber-600 max-w-[200px] mx-auto">The giver hasn't generated a release code for this leg yet. Please ask them to click "Generate Code" on their screen.</p>
                        </div>
                    </div>
                    <button 
                        onClick={checkStatus} 
                        className="px-4 py-2 bg-white hover:bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-amber-200 transition-all active:scale-95 shadow-sm flex items-center gap-2 mx-auto"
                    >
                        🔄 Refresh Status
                    </button>
                    {error && <p className="text-xs text-red-600 font-semibold text-center bg-red-50 rounded-lg p-2">{error}</p>}
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

                {autoTimeLeft && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 space-y-1 shadow-sm">
                        <div className="flex items-center gap-2">
                             <span className="animate-pulse">⏱</span>
                             <p className="font-bold">Smartphone-free Delivery Support</p>
                        </div>
                        <p>If you cannot enter the code now, this delivery will automatically confirm in <b>{autoTimeLeft}</b>. Your payment serves as proof of delivery.</p>
                    </div>
                )}

                {error && <p className="text-xs text-red-600 font-semibold text-center bg-red-50 rounded-lg p-2">{error}</p>}
            </div>
        );
    }

    return null;
}
