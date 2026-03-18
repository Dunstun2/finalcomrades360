import React, { useState } from 'react';
import { FaTimes, FaTruck, FaUser, FaPhone, FaClock, FaMapMarkerAlt, FaWarehouse, FaStore } from 'react-icons/fa';

export default function DispatchDetailsModal({ isOpen, onClose, onConfirm, order, initialEta }) {
    // Format initialEta (ISO string) for datetime-local input (YYYY-MM-DDThh:mm)
    const formatForInput = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        // Adjust to local time and format
        const offset = d.getTimezoneOffset() * 60000;
        const localDate = new Date(d.getTime() - offset);
        return localDate.toISOString().slice(0, 16);
    };

    const [formData, setFormData] = useState({
        dispatcherName: '',
        dispatcherContact: '',
        eta: (order?.expectedWarehouseArrival || initialEta) ? formatForInput(order?.expectedWarehouseArrival || initialEta) : ''
    });
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await onConfirm(formData);
        setLoading(false);
        onClose();
    };

    const getDestinationInfo = () => {
        if (!order) return null;

        // Prioritize Admin Routing Destination
        const warehouse = order.DestinationWarehouse || order.Warehouse;
        const pickStation = order.DestinationPickStation || order.PickupStation;

        if (order.adminRoutingStrategy === 'warehouse' || (!order.adminRoutingStrategy && warehouse)) {
            return {
                type: 'Warehouse Hub',
                name: warehouse?.name || 'Warehouse',
                address: warehouse?.address || 'Main Warehouse Location',
                icon: <FaWarehouse className="text-indigo-600" />,
                landmark: warehouse?.landmark
            };
        } else if (order.adminRoutingStrategy === 'pick_station' || (!order.adminRoutingStrategy && pickStation)) {
            return {
                type: 'Pickup Station',
                name: pickStation?.name || 'Station',
                address: pickStation?.location || 'Station Location',
                icon: <FaStore className="text-indigo-600" />,
                landmark: pickStation?.landmark
            };
        }
        return null;
    };

    const dest = getDestinationInfo();

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60] flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <FaTruck /> Dispatch Order #{order?.orderNumber}
                    </h3>
                    <button onClick={onClose} className="text-white hover:text-indigo-200 transition-colors">
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 font-medium">
                        Enter dispatch details for delivery to the destination determined by admin routing.
                    </p>

                    {/* Destination Banner */}
                    {dest && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="bg-white p-2 rounded-lg shadow-sm h-fit">
                                {dest.icon}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{dest.type}</p>
                                <p className="text-sm font-bold text-gray-900">{dest.name}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{dest.address}</p>
                                {dest.landmark && (
                                    <p className="text-[10px] text-blue-600 font-bold mt-1">📍 {dest.landmark}</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Dispatcher Name / Service
                            </label>
                            <div className="relative">
                                <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Self, G4S, Speedaf"
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    value={formData.dispatcherName}
                                    onChange={(e) => setFormData({ ...formData, dispatcherName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Contact Phone
                            </label>
                            <div className="relative">
                                <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    required
                                    type="tel"
                                    placeholder="e.g. 0712345678"
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    value={formData.dispatcherContact}
                                    onChange={(e) => setFormData({ ...formData, dispatcherContact: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Expected Arrival at {dest?.type || 'Warehouse'}
                            </label>
                            <div className="relative">
                                <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    required
                                    type="datetime-local"
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    value={formData.eta}
                                    onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Confirm Dispatch'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
