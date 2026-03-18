import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';

export default function CustomerManagement() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('all-customers');

    const resetAlerts = () => { setError(''); setSuccess(''); };

    const loadCustomers = async () => {
        try {
            setLoading(true);
            const r = await adminApi.getAllUsers({ role: 'customer' });
            setCustomers(r.data.users || []);
        } catch (e) {
            setError('Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCustomers();
    }, []);

    const suspendCustomer = async (userId) => {
        if (!window.confirm('Are you sure you want to suspend this customer?')) return;
        resetAlerts();
        try {
            await adminApi.updateUserStatus(userId, true);
            setSuccess('Customer suspended');
            loadCustomers();
        } catch (e) {
            setError('Failed to suspend customer');
        }
    };

    const reactivateCustomer = async (userId) => {
        resetAlerts();
        try {
            await adminApi.updateUserStatus(userId, false);
            setSuccess('Customer reactivated');
            loadCustomers();
        } catch (e) {
            setError('Failed to reactivate customer');
        }
    };

    const tabs = [
        { id: 'all-customers', name: 'Regular Customers', icon: '👤' },
        { id: 'orders', name: 'Order History', icon: '🛒' },
        { id: 'wishlist', name: 'Wishlists', icon: '❤️' }
    ];

    const renderTabContent = () => {
        if (loading) return <div className="p-10 text-center">Loading...</div>;

        switch (activeTab) {
            case 'all-customers':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold text-gray-800">Regular Customer Management</h1>
                            <button className="btn" onClick={loadCustomers}>Refresh</button>
                        </div>

                        {error && <div className="p-3 rounded bg-red-100 text-red-700">{error}</div>}
                        {success && <div className="p-3 rounded bg-green-100 text-green-700">{success}</div>}

                        {customers.length === 0 ? (
                            <div className="card p-6 text-center text-gray-600">No regular customers found.</div>
                        ) : (
                            <div className="card">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="text-left border-b">
                                                <th className="p-3">Name</th>
                                                <th className="p-3">Email</th>
                                                <th className="p-3">Phone</th>
                                                <th className="p-3">Status</th>
                                                <th className="p-3">Orders</th>
                                                <th className="p-3">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {customers.map(customer => (
                                                <tr key={customer.id} className="border-b hover:bg-gray-50">
                                                    <td className="p-3 font-medium">{customer.name}</td>
                                                    <td className="p-3">{customer.email}</td>
                                                    <td className="p-3">{customer.phone}</td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-1 rounded text-xs ${!customer.isDeactivated && !customer.isFrozen
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                            }`}>
                                                            {!customer.isDeactivated && !customer.isFrozen ? 'Active' : 'Suspended/Frozen'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-gray-500 italic">N/A</td>
                                                    <td className="p-3">
                                                        <div className="flex gap-2">
                                                            {(!customer.isDeactivated && !customer.isFrozen) ? (
                                                                <button
                                                                    className="btn-warning btn-xs"
                                                                    onClick={() => suspendCustomer(customer.id)}
                                                                >
                                                                    Suspend
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    className="btn-success btn-xs"
                                                                    onClick={() => reactivateCustomer(customer.id)}
                                                                >
                                                                    Reactivate
                                                                </button>
                                                            )}
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
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Regular Customer Management</h1>
                <div className="flex flex-wrap gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-blue-500 text-white'
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
        </div>
    );
}
