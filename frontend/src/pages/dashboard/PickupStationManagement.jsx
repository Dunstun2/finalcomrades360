import React, { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaMapMarkerAlt, FaStore, FaSnowflake, FaCheck } from 'react-icons/fa';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import AdminPasswordDialog from '../../components/AdminPasswordDialog';

const PickupStationManagement = () => {
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentStation, setCurrentStation] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        contactPhone: '',
        operatingHours: '',
        price: 0,
        isActive: true,
        notes: ''
    });

    const [passwordDialog, setPasswordDialog] = useState({
        isOpen: false,
        actionDescription: '',
        onConfirm: null
    });

    useEffect(() => {
        fetchStations();
    }, []);

    const fetchStations = async () => {
        try {
            const response = await api.get('/pickup-stations');
            if (response.data.success) {
                setStations(response.data.stations);
            }
        } catch (error) {
            console.error('Failed to fetch stations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (currentStation) {
                await api.put(`/pickup-stations/${currentStation.id}`, formData);
            } else {
                await api.post('/pickup-stations', formData);
            }
            await fetchStations();
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            console.error('Operation failed:', error);
            alert('Failed to save pickup station');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (station) => {
        setCurrentStation(station);
        setFormData({
            name: station.name,
            location: station.location,
            contactPhone: station.contactPhone || '',
            operatingHours: station.operatingHours || '',
            price: station.price || 0,
            isActive: station.isActive,
            notes: station.notes || ''
        });
        setIsModalOpen(true);
    };

    const handleDeactivate = async (id) => {
        if (window.confirm('Are you sure you want to deactivate this station?')) {
            try {
                await api.delete(`/pickup-stations/${id}`);
                fetchStations();
            } catch (error) {
                console.error('Failed to deactivate station:', error);
            }
        }
    };

    const handleActivate = async (id) => {
        if (window.confirm('Are you sure you want to reactivate this station?')) {
            try {
                await api.patch(`/pickup-stations/${id}/activate`);
                fetchStations();
            } catch (error) {
                console.error('Failed to activate station:', error);
                alert('Failed to activate station');
            }
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
        console.log(`[DEBUG] Attempting hard delete for station ID: ${id}`);
        try {
            const url = `/pickup-stations/hard/${id}`;
            console.log(`[DEBUG] Calling delete URL: ${url}`);
            const res = await api.delete(url, { data: { password } });
            if (res.data.success) {
                alert(res.data.message || 'Station permanently deleted successfully');
                fetchStations();
            }
        } catch (error) {
            console.error('Failed to hard delete station:', error);
            alert(error.response?.data?.message || 'Failed to permanently delete station');
        }
    };

    const resetForm = () => {
        setCurrentStation(null);
        setFormData({
            name: '',
            location: '',
            contactPhone: '',
            operatingHours: '',
            price: 0,
            isActive: true,
            notes: ''
        });
    };

    const filteredStations = stations.filter(station =>
        station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && !isModalOpen) return <LoadingSpinner />;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Pickup Station Management</h1>
                    <p className="text-gray-600">Manage pickup locations for customer orders</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                >
                    <FaPlus /> Add Station
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6 relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search stations by name or location..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStations.map(station => (
                    <div key={station.id} className={`relative bg-white rounded-lg shadow-sm border p-5 transition-all hover:shadow-md ${!station.isActive ? 'opacity-75 bg-gray-50' : ''}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${station.isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                                    <FaStore size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 line-clamp-1">{station.name}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${station.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {station.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                            <div className="flex items-start gap-2">
                                <FaMapMarkerAlt className="mt-1 flex-shrink-0" />
                                <span className="line-clamp-2">{station.location}</span>
                            </div>
                            {station.operatingHours && (
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs uppercase tracking-wide text-gray-500">Hours:</span>
                                    <span>{station.operatingHours}</span>
                                </div>
                            )}
                            {station.contactPhone && (
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs uppercase tracking-wide text-gray-500">Phone:</span>
                                    <span>{station.contactPhone}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs uppercase tracking-wide text-gray-500">Delivery Fee:</span>
                                <span className="font-medium text-gray-900">{station.price > 0 ? `KES ${station.price}` : 'Free'}</span>
                            </div>
                        </div>

                        <div className="flex gap-1.5 mt-auto pt-4 border-t border-gray-100">
                            <button
                                onClick={() => handleEdit(station)}
                                className="flex-1 px-2 py-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm border border-blue-100"
                                title="Edit Station"
                            >
                                <FaEdit size={10} /> Edit
                            </button>
                            {station.isActive ? (
                                <button
                                    onClick={() => handleDeactivate(station.id)}
                                    className="flex-1 px-2 py-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm border border-amber-100"
                                    title="Deactivate Station"
                                >
                                    <FaTrash size={10} /> Deact
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleActivate(station.id)}
                                    className="flex-1 px-2 py-1.5 text-[10px] font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm border border-green-100"
                                    title="Activate Station"
                                >
                                    <FaCheck size={10} /> Act
                                </button>
                            )}
                            <button
                                onClick={async () => {
                                    const password = await requirePassword(`Permanently Delete "${station.name}"`);
                                    if (password) {
                                        await handleHardDelete(station.id, password);
                                    }
                                }}
                                className="px-2 py-1.5 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm border border-red-100"
                                title="Permanently Delete (Requires Password)"
                            >
                                <FaTrash size={10} /> Delete
                            </button>
                        </div>

                    </div>
                ))}
            </div>

            {filteredStations.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <FaSnowflake className="mx-auto text-4xl mb-3 text-gray-300" />
                    <p>No pickup stations found matching your search.</p>
                </div>
            )}

            {/* Edit/Add Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold">{currentStation ? 'Edit Pickup Station' : 'Add New Pickup Station'}</h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Station Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Westlands Pick Station"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Location / Address *</label>
                                <textarea
                                    name="location"
                                    required
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    rows="2"
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Westlands, Nairobi (Near Sarit Centre)"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                                    <input
                                        type="text"
                                        name="contactPhone"
                                        value={formData.contactPhone}
                                        onChange={handleInputChange}
                                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. 0712345678"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Fee (KES)</label>
                                    <input
                                        type="number"
                                        name="price"
                                        min="0"
                                        value={formData.price}
                                        onChange={handleInputChange}
                                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Operating Hours</label>
                                <input
                                    type="text"
                                    name="operatingHours"
                                    value={formData.operatingHours}
                                    onChange={handleInputChange}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Mon-Fri: 8am - 6pm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Internal)</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    rows="2"
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Additional details..."
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="isActive" className="text-sm text-gray-700">Active (Visible to customers)</label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Station'}
                                </button>
                            </div>
                        </form>
                    </div>
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
};

export default PickupStationManagement;
