import React, { useState, useEffect } from 'react';
import {
    FaShieldAlt, FaToggleOn, FaToggleOff, FaRobot
} from 'react-icons/fa';
import api from '../../../services/api';
import { toast } from 'react-toastify';
import RoleEarningVerification from '../components/RoleEarningVerification';

const DeliveryEarningVerification = () => {
    const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(false);
    const [loadingAutoStatus, setLoadingAutoStatus] = useState(true);

    useEffect(() => {
        fetchAutoPayoutStatus();
    }, []);

    const fetchAutoPayoutStatus = async () => {
        try {
            setLoadingAutoStatus(true);
            const res = await api.get('/finance/automatic-payout-status');
            setAutoPayoutEnabled(res.data.enabled);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingAutoStatus(false);
        }
    };

    const toggleAutoPayout = async () => {
        try {
            const next = !autoPayoutEnabled;
            await api.post('/finance/toggle-automatic-payout', { enabled: next });
            setAutoPayoutEnabled(next);
            toast.success(`Auto-Verification ${next ? 'Enabled' : 'Disabled'}`);
        } catch (e) {
            toast.error('Failed to toggle auto-verification');
        }
    };

    return (
        <div className="p-4 w-full space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <FaShieldAlt className="text-blue-600" />
                        Delivery Earning Verification
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">Audit agent earnings and settle platform revenue.</p>
                </div>

                <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all ${autoPayoutEnabled ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={`p-2 rounded-full ${autoPayoutEnabled ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        <FaRobot size={14} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-0.5">Auto-Verification</p>
                        <p className={`text-xs font-bold ${autoPayoutEnabled ? 'text-blue-700' : 'text-gray-500'}`}>
                            {autoPayoutEnabled ? 'ACTIVE' : 'Manual Mode'}
                        </p>
                    </div>
                    <button onClick={toggleAutoPayout} className={`ml-1 text-2xl ${autoPayoutEnabled ? 'text-blue-600' : 'text-gray-300'}`}>
                        {autoPayoutEnabled ? <FaToggleOn /> : <FaToggleOff />}
                    </button>
                </div>
            </div>

            <RoleEarningVerification role="delivery_agent" hideHeader={true} />
        </div>
    );
};

export default DeliveryEarningVerification;
