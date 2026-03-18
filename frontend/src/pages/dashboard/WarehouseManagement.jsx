import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaWarehouse, FaSearch, FaMapMarkerAlt, FaPhone, FaEnvelope, FaCheck } from 'react-icons/fa';
import api from '../../services/api';
import AdminPasswordDialog from '../../components/AdminPasswordDialog';

export default function WarehouseManagement() {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        address: '',
        county: '',
        town: '',
        landmark: '',
        contactPerson: '',
        contactPhone: '',
        contactEmail: '',
        capacity: '',
        operatingHours: '',
        isActive: true,
        notes: ''
    });

    const [passwordDialog, setPasswordDialog] = useState({
        isOpen: false,
        actionDescription: '',
        onConfirm: null
    });

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        try {
            setLoading(true);
            const response = await api.get('/warehouses');
            setWarehouses(response.data.warehouses || []);
        } catch (error) {
            console.error('Error fetching warehouses:', error);
            alert('Failed to load warehouses');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingWarehouse) {
                await api.put(`/warehouses/${editingWarehouse.id}`, formData);
                alert('Warehouse updated successfully!');
            } else {
                await api.post('/warehouses', formData);
                alert('Warehouse created successfully!');
            }
            resetForm();
            fetchWarehouses();
        } catch (error) {
            console.error('Error saving warehouse:', error);
            alert(error.response?.data?.message || 'Failed to save warehouse');
        }
    };

    const handleEdit = (warehouse) => {
        setEditingWarehouse(warehouse);
        setFormData({
            name: warehouse.name || '',
            code: warehouse.code || '',
            address: warehouse.address || '',
            county: warehouse.county || '',
            town: warehouse.town || '',
            landmark: warehouse.landmark || '',
            contactPerson: warehouse.contactPerson || '',
            contactPhone: warehouse.contactPhone || '',
            contactEmail: warehouse.contactEmail || '',
            capacity: warehouse.capacity || '',
            operatingHours: warehouse.operatingHours || '',
            isActive: warehouse.isActive ?? true,
            notes: warehouse.notes || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to deactivate this warehouse?')) return;

        try {
            await api.delete(`/warehouses/${id}`);
            alert('Warehouse deactivated successfully');
            fetchWarehouses();
        } catch (error) {
            console.error('Error deleting warehouse:', error);
            alert('Failed to delete warehouse');
        }
    };

    const handleActivate = async (id) => {
        if (!confirm('Are you sure you want to reactivate this warehouse?')) return;

        try {
            await api.patch(`/warehouses/${id}/activate`);
            alert('Warehouse activated successfully');
            fetchWarehouses();
        } catch (error) {
            console.error('Error activating warehouse:', error);
            alert('Failed to activate warehouse');
        }
    };

    const requirePassword = (actionDescription) => {
        return new Promise((resolve) => {
            setPasswordDialog({
                isOpen: true,
                actionDescription,
                onConfirm: (reason, password) => resolve(password)
            });
        });
    };

    const handleHardDelete = async (id, password) => {
        console.log(`[DEBUG] Attempting hard delete for warehouse ID: ${id}`);
        try {
            const url = `/warehouses/hard/${id}`;
            console.log(`[DEBUG] Calling delete URL: ${url}`);
            const res = await api.delete(url, { data: { password } });
            if (res.data.success) {
                alert(res.data.message || 'Warehouse permanently deleted successfully');
                fetchWarehouses();
            }
        } catch (error) {
            console.error('Error hard deleting warehouse:', error);
            alert(error.response?.data?.message || 'Failed to permanently delete warehouse');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '', code: '', address: '', county: '', town: '', landmark: '',
            contactPerson: '', contactPhone: '', contactEmail: '', capacity: '',
            operatingHours: '', isActive: true, notes: ''
        });
        setEditingWarehouse(null);
        setShowForm(false);
    };

    const filteredWarehouses = warehouses.filter(w =>
        w.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.town?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FaWarehouse className="text-blue-600" />
                        Warehouse Management
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">Manage warehouse locations for delivery pickups</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-sm"
                >
                    <FaPlus /> {showForm ? 'Cancel' : 'Add Warehouse'}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
                    <h2 className="text-lg font-bold mb-4">{editingWarehouse ? 'Edit Warehouse' : 'New Warehouse'}</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Warehouse Name * <span className="text-red-500">(Required)</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Main Warehouse Nairobi"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Code</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., WH-NBI-01"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Address * <span className="text-red-500">(Required)</span>
                            </label>
                            <textarea
                                required
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                rows="2"
                                placeholder="Full physical address"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                            <input
                                type="text"
                                value={formData.county}
                                onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Nairobi"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Town/City</label>
                            <input
                                type="text"
                                value={formData.town}
                                onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Westlands"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Landmark</label>
                            <input
                                type="text"
                                value={formData.landmark}
                                onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Near Sarit Centre"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                            <input
                                type="text"
                                value={formData.contactPerson}
                                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="Manager name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                            <input
                                type="tel"
                                value={formData.contactPhone}
                                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="0712345678"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                            <input
                                type="email"
                                value={formData.contactEmail}
                                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="warehouse@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Operating Hours</label>
                            <input
                                type="text"
                                value={formData.operatingHours}
                                onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="Mon-Fri 8AM-5PM"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                            <input
                                type="number"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="Storage capacity"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm font-medium text-gray-700">Active Warehouse</span>
                            </label>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                rows="2"
                                placeholder="Additional notes or instructions"
                            />
                        </div>

                        <div className="md:col-span-2 flex gap-3">
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                            >
                                {editingWarehouse ? 'Update Warehouse' : 'Create Warehouse'}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Search */}
            <div className="mb-4">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search warehouses..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Warehouse List */}
            {loading ? (
                <div className="text-center py-8">Loading warehouses...</div>
            ) : filteredWarehouses.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <FaWarehouse className="mx-auto text-gray-400 text-4xl mb-2" />
                    <p className="text-gray-600">No warehouses found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredWarehouses.map(warehouse => (
                        <div key={warehouse.id} className="relative bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-gray-900">{warehouse.name}</h3>
                                    {warehouse.code && (
                                        <p className="text-xs text-gray-500">Code: {warehouse.code}</p>
                                    )}
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full ${warehouse.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {warehouse.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600 mb-4">
                                <div className="flex items-start gap-2">
                                    <FaMapMarkerAlt className="text-gray-400 mt-1 flex-shrink-0" />
                                    <span>{warehouse.address}</span>
                                </div>
                                {warehouse.contactPhone && (
                                    <div className="flex items-center gap-2">
                                        <FaPhone className="text-gray-400" />
                                        <span>{warehouse.contactPhone}</span>
                                    </div>
                                )}
                                {warehouse.contactEmail && (
                                    <div className="flex items-center gap-2">
                                        <FaEnvelope className="text-gray-400" />
                                        <span className="text-xs">{warehouse.contactEmail}</span>
                                    </div>
                                )}
                                {warehouse.operatingHours && (
                                    <p className="text-xs text-gray-500">⏰ {warehouse.operatingHours}</p>
                                )}
                            </div>

                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => handleEdit(warehouse)}
                                    className="flex-1 px-2 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded hover:bg-blue-100 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                                    title="Edit Warehouse"
                                >
                                    <FaEdit size={10} /> Edit
                                </button>
                                {warehouse.isActive ? (
                                    <button
                                        onClick={() => handleDelete(warehouse.id)}
                                        className="flex-1 px-2 py-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded hover:bg-amber-100 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                                        title="Deactivate Warehouse"
                                    >
                                        <FaTrash size={10} /> Deact
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleActivate(warehouse.id)}
                                        className="flex-1 px-2 py-1.5 bg-green-50 text-green-600 border border-green-100 rounded hover:bg-green-100 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                                        title="Activate Warehouse"
                                    >
                                        <FaCheck size={10} /> Act
                                    </button>
                                )}
                                <button
                                    onClick={async () => {
                                        const password = await requirePassword(`Permanently Delete "${warehouse.name}"`);
                                        if (password) {
                                            await handleHardDelete(warehouse.id, password);
                                        }
                                    }}
                                    className="px-2 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded hover:bg-red-600 hover:text-white text-[10px] font-bold flex items-center justify-center gap-1 transition-all shadow-sm"
                                    title="Permanently Delete (Requires Password)"
                                >
                                    <FaTrash size={10} /> Delete
                                </button>
                            </div>

                        </div>
                    ))}
                </div>
            )}

            {/* Password Verification Dialog */}
            <AdminPasswordDialog
                isOpen={passwordDialog.isOpen}
                onClose={() => setPasswordDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={passwordDialog.onConfirm}
                actionDescription={passwordDialog.actionDescription}
                title="Super Admin Verification"
            />
        </div>
    );
}
