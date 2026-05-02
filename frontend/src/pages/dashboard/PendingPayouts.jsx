import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaMoneyBillWave, FaChevronRight } from 'react-icons/fa';
import RoleEarningVerification from './components/RoleEarningVerification';

const PendingPayouts = () => {
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
                            <span className="p-2 bg-blue-100 text-blue-600 rounded-xl"><FaMoneyBillWave /></span>
                            Global Earning Verification
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm">
                            Master view for all roles. Individual management is also available in respective role dashboards.
                        </p>
                    </div>
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
            <RoleEarningVerification key={filterRole} role={filterRole} hideHeader />

        </div>
    );
};

export default PendingPayouts;
