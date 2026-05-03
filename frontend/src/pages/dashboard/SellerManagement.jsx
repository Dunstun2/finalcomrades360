import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { toast } from 'react-toastify';
import RoleEarningVerification from './components/RoleEarningVerification';

export default function SellerManagement() {
    const { tab } = useParams();
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState(tab || 'all-sellers');
    const [profileSeller, setProfileSeller] = useState(null);

    useEffect(() => {
        if (tab) {
            setActiveTab(tab);
        }
    }, [tab]);

    const resetAlerts = () => { setError(''); setSuccess(''); };

    const loadSellers = async () => {
        try {
            setLoading(true);
            const r = await adminApi.getAllUsers({ role: 'seller', limit: 1000 });
            setSellers(r.data.users || []);
        } catch (e) {
            setError('Failed to load sellers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSellers();
    }, []);

    const suspendSeller = async (userId) => {
        const password = window.prompt('Please enter admin password to suspend this seller:');
        if (!password) return;
        resetAlerts();
        try {
            await adminApi.suspendSeller(userId, { adminPassword: password });
            setSuccess('Seller suspended from dashboard access');
            loadSellers();
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to suspend seller');
        }
    };

    const reactivateSeller = async (userId) => {
        resetAlerts();
        try {
            await adminApi.reactivateSeller(userId);
            setSuccess('Seller reactivated');
            loadSellers();
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to reactivate seller');
        }
    };

    const handleImpersonate = async (userId) => {
        if (!window.confirm('Are you sure you want to impersonate this seller? You will be logged out of your admin account.')) return;
        try {
            const res = await adminApi.adminImpersonateUser(userId);
            const currentToken = localStorage.getItem('token');
            if (currentToken) {
                localStorage.setItem('admin_token_backup', currentToken);
            }
            localStorage.setItem('token', res.data.token);
            toast.success('Impersonation started. Redirecting...');
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        } catch (e) {
            toast.error(e.response?.data?.message || 'Impersonation failed');
        }
    };

    const tabs = [
        { id: 'all-sellers', name: 'All Sellers', icon: '🏪' },
        { id: 'earning-verification', name: 'Earning Verification', icon: '✅' },
    ];

    const renderTabContent = () => {
        if (loading) return <div className="p-10 text-center">Loading...</div>;

        switch (activeTab) {
            case 'all-sellers':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold text-gray-800">Seller Management</h1>
                            <button className="btn" onClick={loadSellers}>Refresh</button>
                        </div>

                        {error && <div className="p-3 rounded bg-red-100 text-red-700">{error}</div>}
                        {success && <div className="p-3 rounded bg-green-100 text-green-700">{success}</div>}

                        {sellers.length === 0 ? (
                            <div className="card p-6 text-center text-gray-600">No sellers found.</div>
                        ) : (
                            <div className="card">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                                                <th className="p-3 text-left">Seller Name</th>
                                                <th className="p-3 text-left">Email</th>
                                                <th className="p-3 text-left">Phone</th>
                                                <th className="p-3 text-left">Status</th>
                                                <th className="p-3 text-left">Sales (KES)</th>
                                                <th className="p-3 text-left">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sellers.map(seller => (
                                                <tr key={seller.id} className="border-b hover:bg-gray-50 transition-colors">
                                                    <td className="p-3">
                                                        <div className="font-bold text-gray-800">{seller.name}</div>
                                                        <div className="text-xs text-gray-500 italic">{seller.businessName || 'No business name'}</div>
                                                    </td>
                                                    <td className="p-3 text-gray-600">{seller.email}</td>
                                                    <td className="p-3 text-gray-600 font-medium">{seller.phone}</td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${!seller.isSellerSuspended && !seller.isDeactivated
                                                                ? 'bg-green-100 text-green-700 border border-green-200'
                                                                : 'bg-red-100 text-red-700 border border-red-200'
                                                            }`}>
                                                            {seller.isSellerSuspended ? 'Suspended' : seller.isDeactivated ? 'Global Deactivated' : 'Active'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 font-bold text-green-600">
                                                        KES {(seller.wallet?.successBalance || 0).toLocaleString()}
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex gap-2">
                                                            {!seller.isSellerSuspended ? (
                                                                <button
                                                                    className="px-2.5 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs font-medium rounded-lg hover:bg-yellow-100 transition-colors"
                                                                    onClick={() => suspendSeller(seller.id)}
                                                                >
                                                                    Suspend
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-medium rounded-lg hover:bg-green-100 transition-colors"
                                                                    onClick={() => reactivateSeller(seller.id)}
                                                                >
                                                                    Reactivate
                                                                </button>
                                                            )}
                                                            <button
                                                                className="px-2.5 py-1 bg-gray-50 text-gray-600 border border-gray-200 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors"
                                                                onClick={() => setProfileSeller(seller)}
                                                            >
                                                                View Profile
                                                            </button>
                                                            <button
                                                                className="px-2.5 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 text-xs font-medium rounded-lg hover:bg-indigo-100 transition-colors"
                                                                onClick={() => handleImpersonate(seller.id)}
                                                                title="Login as this seller"
                                                            >
                                                                Impersonate
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'earning-verification':
                return (
                    <div className="animate-fadeIn">
                        <RoleEarningVerification role="seller" hideHeader />
                    </div>
                );
            default:
                return (
                    <div className="p-6 text-center text-gray-600">
                        <h2 className="text-xl font-semibold mb-4">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Dashboard</h2>
                        <p>This role-specific analytics section is coming soon.</p>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Seller Management</h1>
                <div className="flex flex-wrap gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.name}
                        </button>
                    ))}
                </div>
            </div>
            {renderTabContent()}

            {profileSeller && (
                <SellerProfileModal
                    seller={profileSeller}
                    onClose={() => setProfileSeller(null)}
                />
            )}
        </div>
    );
}

function SellerProfileModal({ seller, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xl uppercase">
                            {seller.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{seller.name}</h2>
                            <p className="text-sm text-gray-500">Seller ID: {seller.id} • {seller.businessName || 'Independent Seller'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">✕</button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                            <div className="text-xs font-bold text-orange-400 uppercase mb-1">Sales Balance</div>
                            <div className="text-2xl font-black text-orange-600">KES {(seller.wallet?.successBalance || 0).toLocaleString()}</div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <div className="text-xs font-bold text-blue-400 uppercase mb-1">Pending Balance</div>
                            <div className="text-2xl font-black text-blue-600">KES {(seller.wallet?.pendingBalance || 0).toLocaleString()}</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-900 border-b pb-2">Business Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <InfoRow label="Email" value={seller.email} />
                            <InfoRow label="Phone" value={seller.phone} />
                            <InfoRow label="Business Address" value={seller.businessAddress || 'N/A'} />
                            <InfoRow label="Location" value={`${seller.businessCounty || '--'}, ${seller.businessTown || '--'}`} />
                            <InfoRow label="ID Status" value={seller.nationalIdStatus} highlight />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button onClick={onClose} className="px-6 py-2 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all">
                            Close Profile
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value, highlight }) {
    return (
        <div>
            <div className="text-xs text-gray-400 uppercase font-bold">{label}</div>
            <div className={`mt-0.5 font-medium ${highlight ? 'text-blue-600' : 'text-gray-900'}`}>{value || 'Not provided'}</div>
        </div>
    );
}
