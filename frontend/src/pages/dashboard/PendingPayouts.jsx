import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaMoneyBillWave, FaChevronRight, FaCoins, FaHistory } from 'react-icons/fa';
import RoleEarningVerification from './components/RoleEarningVerification';

const PendingPayouts = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') === 'audit' ? 'audit' : 'payouts';
    const [filterRole, setFilterRole] = useState('all');

    return (
        <div className="p-6 space-y-6 animate-fadeIn relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard/admin-tools" className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors" title="Back to Admin Tools">
                        <FaChevronRight className="rotate-180" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <span className={`p-2 rounded-xl transition-all ${activeTab === 'payouts' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                <FaMoneyBillWave />
                            </span>
                            {activeTab === 'payouts' ? 'Global Withdrawal Disbursements' : 'Global Earning Verification'}
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm">
                            {activeTab === 'payouts' 
                                ? 'Process and disburse cash withdrawal requests from user balances.' 
                                : 'Audit and verify partner earnings to transfer them from successBalance to withdrawable balance.'
                            }
                        </p>
                    </div>
                </div>

                {/* Sub-Tab Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-2xl shadow-sm border border-gray-200/50 w-fit">
                    <button
                        onClick={() => setSearchParams({ tab: 'audit' })}
                        className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === 'audit' ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <span className="flex items-center gap-1.5"><FaCoins size={12} /> Earnings</span>
                    </button>
                    <button
                        onClick={() => setSearchParams({ tab: 'payouts' })}
                        className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === 'payouts' ? 'bg-white text-emerald-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <span className="flex items-center gap-1.5"><FaMoneyBillWave size={12} /> Withdrawals</span>
                    </button>
                </div>
            </div>

            {/* Role Filter Tabs */}
            <div className="flex border-b border-gray-200 gap-1 overflow-x-auto custom-scrollbar">
                {[
                    { id: 'all', label: 'All Roles' },
                    { id: 'seller', label: 'Sellers' },
                    { id: 'marketer', label: 'Marketers' },
                    { id: 'delivery_agent', label: 'Agents' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilterRole(tab.id)}
                        className={`px-6 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                            filterRole === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* The Verification Engine */}
            <RoleEarningVerification key={`${filterRole}-${activeTab}`} role={filterRole} subTab={activeTab} hideHeader />

        </div>
    );
};

export default PendingPayouts;
