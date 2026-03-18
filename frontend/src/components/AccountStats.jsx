import React from 'react';
import { FaWallet, FaShoppingBag, FaStar, FaHistory, FaCalendarAlt } from 'react-icons/fa';

const AccountStats = ({ userData, walletBalance }) => {
    const stats = [
        {
            label: 'Wallet Balance',
            value: `KSh ${walletBalance?.toLocaleString() || '0'}`,
            icon: <FaWallet />,
            color: 'from-green-500 to-emerald-600',
            shadow: 'shadow-green-100'
        },
        {
            label: 'Loyalty Points',
            value: userData?.loyaltyPoints?.toLocaleString() || '0',
            icon: <FaStar />,
            color: 'from-amber-400 to-orange-500',
            shadow: 'shadow-amber-100'
        },
        {
            label: 'Total Orders',
            value: userData?.totalOrders?.toLocaleString() || '0',
            icon: <FaShoppingBag />,
            color: 'from-blue-500 to-indigo-600',
            shadow: 'shadow-blue-100'
        },
        {
            label: 'Member Since',
            value: userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }) : 'Oct 24, 2023',
            icon: <FaCalendarAlt />,
            color: 'from-purple-500 to-pink-600',
            shadow: 'shadow-purple-100'
        }
    ];

    return (
        <div className="flex gap-4 overflow-x-auto pb-2 mb-8 snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0 scrollbar-hide">
            {stats.map((stat, index) => (
                <div
                    key={index}
                    className="min-w-[220px] sm:min-w-0 snap-start bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group overflow-hidden relative flex-shrink-0 sm:flex-shrink"
                >
                    {/* Background Decorative Shape */}
                    <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-5 rounded-full group-hover:scale-110 transition-transform`}></div>

                    <div className="flex items-center gap-4 relative z-10">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} text-white ${stat.shadow} shadow-lg group-hover:scale-110 transition-transform`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">
                                {stat.label}
                            </p>
                            <h4 className="text-lg font-black text-gray-900 tracking-tight">
                                {stat.value}
                            </h4>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AccountStats;
