import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaArrowLeft,
    FaPlus,
    FaList,
    FaClock,
    FaCalendarAlt,
    FaCheckCircle,
    FaUtensils,
    FaTrash,
    FaSync,
    FaEdit,
    FaTimes,
    FaToggleOn,
    FaToggleOff
} from 'react-icons/fa';
import { fastFoodService } from '../../services/fastFoodService';

const BatchSystem = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('list'); // 'list' or 'create'
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [batchSystemEnabled, setBatchSystemEnabled] = useState(false);
    const [historyGroups, setHistoryGroups] = useState([]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        await Promise.all([
            fetchBatches(),
            fetchConfig()
        ]);
        setLoading(false);
    };

    const fetchConfig = async () => {
        try {
            const data = await fastFoodService.getBatchSystemConfig();
            if (data.success) {
                const enabled = data.data === true || String(data.data).toLowerCase() === 'true';
                setBatchSystemEnabled(enabled);
            }
        } catch (err) {
            console.error('Failed to fetch config:', err);
        }
    };

    const fetchBatches = async () => {
        try {
            const data = await fastFoodService.getAllBatches();
            if (data.success) {
                setBatches(data.batches);
            }
        } catch (err) {
            console.error('Failed to fetch batches:', err);
            setError('Failed to load batches.');
        }
    };

    const fetchBatchHistory = async () => {
        try {
            setHistoryLoading(true);
            const data = await fastFoodService.getBatchHistory();
            if (data.success) {
                setHistoryGroups(data.batches);
            }
        } catch (err) {
            console.error('Failed to fetch batch history:', err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleToggleSystem = async () => {
        try {
            const newValue = !batchSystemEnabled;
            const res = await fastFoodService.updateBatchSystemConfig(newValue);
            if (res.success) {
                setBatchSystemEnabled(newValue);
            }
        } catch (err) {
            console.error('Error toggling system:', err);
            alert('Failed to toggle system');
        }
    };

    const [formData, setFormData] = useState({
        name: '',
        startTime: '',
        endTime: '',
        expectedDelivery: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Automatically calculate expected delivery time (30 mins after endTime)
    useEffect(() => {
        if (formData.endTime) {
            try {
                const [hours, minutes] = formData.endTime.split(':').map(Number);
                const date = new Date();
                date.setHours(hours);
                date.setMinutes(minutes + 30);
                
                const expHours = String(date.getHours()).padStart(2, '0');
                const expMinutes = String(date.getMinutes()).padStart(2, '0');
                const calculatedTime = `${expHours}:${expMinutes}`;
                
                setFormData(prev => {
                    // Only update if it's different to avoid infinite loops if somehow triggered by itself
                    if (prev.expectedDelivery !== calculatedTime) {
                        return { ...prev, expectedDelivery: calculatedTime };
                    }
                    return prev;
                });
            } catch (err) {
                console.error('Error calculating expected delivery time:', err);
            }
        }
    }, [formData.endTime]);

    const handleEdit = (batch) => {
        setEditingId(batch.id);
        setFormData({
            name: batch.name,
            startTime: batch.startTime,
            endTime: batch.endTime,
            expectedDelivery: batch.expectedDelivery
        });
        setActiveTab('create');
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ name: '', startTime: '', endTime: '', expectedDelivery: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            let res;
            if (editingId) {
                res = await fastFoodService.updateBatch(editingId, formData);
            } else {
                res = await fastFoodService.createBatch(formData);
            }

            if (res.success) {
                await fetchBatches();
                setActiveTab('list');
                resetForm();
                alert(editingId ? 'Batch updated successfully!' : 'Batch scheduled successfully!');
            }
        } catch (err) {
            console.error('Error saving batch:', err);
            alert(err.response?.data?.error || 'Failed to save batch');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteBatch = async (id) => {
        if (!window.confirm('Are you sure you want to delete this batch?')) return;
        try {
            const res = await fastFoodService.deleteBatch(id);
            if (res.success) {
                setBatches(batches.filter(b => b.id !== id));
            }
        } catch (err) {
            console.error('Error deleting batch:', err);
            alert('Failed to delete batch');
        }
    };

    const handleToggleAutomation = async (batch) => {
        try {
            const res = await fastFoodService.toggleAutomation(batch.id);
            if (res.success) {
                setBatches(batches.map(b => b.id === batch.id ? res.batch : b));
            }
        } catch (err) {
            console.error('Error toggling automation:', err);
            alert('Failed to toggle automation');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">

                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col">
                        <button
                            onClick={() => navigate('/dashboard/fastfood')}
                            className="flex items-center text-gray-600 hover:text-orange-600 mb-4 transition-colors font-semibold group"
                        >
                            <FaArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
                            Back to Fast Food Management
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-600 p-3 rounded-xl shadow-lg shadow-orange-100">
                                <FaUtensils className="text-white text-xl" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Batch System</h1>
                                <p className="text-sm text-gray-500 font-medium">Manage and track your food production batches</p>
                            </div>
                        </div>
                    </div>

                    {/* Global System Toggle */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Batch System Control</p>
                            <p className="text-sm font-bold text-gray-700">{batchSystemEnabled ? 'System Active' : 'System Disabled'}</p>
                        </div>
                        <button
                            onClick={handleToggleSystem}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-transparent ring-offset-2 ${batchSystemEnabled ? 'bg-green-600' : 'bg-gray-200'}`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${batchSystemEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                        </button>
                    </div>
                </div>

                {/* Top Navigation Bar */}
                <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 mb-8 flex items-center max-w-lg">
                    <button
                        onClick={() => {
                            setActiveTab('list');
                            resetForm();
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'list'
                            ? 'bg-orange-600 text-white shadow-md shadow-orange-100'
                            : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <FaList size={14} />
                        Our Batches
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('history');
                            fetchBatchHistory();
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'history'
                            ? 'bg-orange-600 text-white shadow-md shadow-orange-100'
                            : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <FaClock size={14} />
                        History
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'create'
                            ? 'bg-orange-600 text-white shadow-md shadow-orange-100'
                            : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <FaPlus size={14} />
                        {editingId ? 'Edit' : 'Create'}
                    </button>
                </div>

                {/* View Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <FaSync className="text-orange-600 text-4xl animate-spin mb-4" />
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading Batches...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 p-8 rounded-3xl border border-red-100 text-center max-w-xl mx-auto">
                        <p className="text-red-600 font-bold mb-4">{error}</p>
                        <button
                            onClick={fetchBatches}
                            className="bg-red-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-red-100 active:scale-95 transition-all"
                        >
                            Retry
                        </button>
                    </div>
                ) : activeTab === 'list' ? (
                    batches.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                            <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaUtensils className="text-orange-600 text-2xl" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">No Batches Yet</h3>
                            <p className="text-gray-500 mb-6">Schedule your first production batch to get started.</p>
                            <button
                                onClick={() => setActiveTab('create')}
                                className="bg-orange-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-orange-100 active:scale-95 transition-all uppercase tracking-widest text-sm"
                            >
                                Create Batch
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {batches.map(batch => (
                                <div key={batch.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-orange-50 p-2 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                            <FaCalendarAlt size={16} />
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm ${batch.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                            batch.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                batch.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                                    'bg-orange-100 text-orange-700'
                                            }`}>
                                            {batch.status}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">{batch.name}</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center text-sm text-gray-600 font-medium">
                                            <FaClock className="mr-2 text-orange-500" />
                                            <span className="text-gray-400 mr-1 italic">Period:</span> {batch.startTime} - {batch.endTime}
                                        </div>
                                        <div className="flex items-center text-sm text-gray-600 font-medium">
                                            <FaCheckCircle className="mr-2 text-green-500" />
                                            <span className="text-gray-400 mr-1 italic">Delivered By:</span> {batch.expectedDelivery}
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(batch)}
                                                className="bg-gray-50 p-2 rounded-lg text-blue-600 shadow-sm hover:bg-blue-600 hover:text-white transition-all transform hover:scale-110"
                                                title="Edit Batch"
                                            >
                                                <FaEdit size={12} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleAutomation(batch)}
                                                className={`p-2 rounded-lg shadow-sm transition-all transform hover:scale-110 flex items-center gap-1 ${batch.isAutomated ? 'bg-green-600 text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-200'}`}
                                                title={batch.isAutomated ? 'Automation ON' : 'Turn ON Automation'}
                                            >
                                                {batch.isAutomated ? <FaToggleOn size={12} /> : <FaToggleOff size={12} />}
                                                <span className="text-[8px] font-black uppercase tracking-tighter">Auto</span>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteBatch(batch.id)}
                                                className="bg-gray-50 p-2 rounded-lg text-red-600 shadow-sm hover:bg-red-600 hover:text-white transition-all transform hover:scale-110"
                                                title="Delete Batch"
                                            >
                                                <FaTrash size={12} />
                                            </button>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                            {new Date(batch.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : activeTab === 'history' ? (
                    historyLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                            <FaSync className="text-orange-600 text-4xl animate-spin mb-4" />
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading Order History...</p>
                        </div>
                    ) : historyGroups.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaClock className="text-gray-400 text-2xl" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">No Batch History</h3>
                            <p className="text-gray-500">Orders associated with batches will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {historyGroups.map(group => (
                                <div key={group.batch.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="bg-gray-50 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                                                <FaUtensils size={16} />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-gray-900">{group.batch.name}</h3>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                    {group.batch.startTime} - {group.batch.endTime} • Delivery: {group.batch.expectedDelivery}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">{group.orders.length} Order{group.orders.length !== 1 ? 's' : ''}</span>
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm ${group.batch.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {group.batch.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-white border-b border-gray-50">
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order #</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Items</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {group.orders.map(order => (
                                                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <span className="text-sm font-bold text-gray-900">#{order.orderNumber}</span>
                                                            <p className="text-[10px] text-gray-400 font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-sm font-bold text-gray-700">{order.user?.name || 'Guest'}</span>
                                                            <p className="text-[10px] text-gray-400">{order.user?.phone || 'No phone'}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-wrap gap-1">
                                                                {order.OrderItems.map((item, idx) => (
                                                                    <span key={idx} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                                                        {item.quantity}x {item.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 font-black text-sm text-gray-900">
                                                            KES {order.total.toLocaleString()}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                                    'bg-orange-100 text-orange-700'
                                                                }`}>
                                                                {order.status.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden max-w-2xl relative">
                        <button
                            onClick={() => {
                                setActiveTab('list');
                                resetForm();
                            }}
                            className="absolute right-6 top-6 text-white/80 hover:text-white z-10 p-2 hover:bg-white/10 rounded-full transition-all"
                            title="Close"
                        >
                            <FaTimes size={20} />
                        </button>
                        <div className={`${editingId ? 'bg-blue-600' : 'bg-orange-600'} p-6 text-white transition-colors duration-500`}>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                {editingId ? <FaEdit /> : <FaPlus />} {editingId ? 'Update Production Batch' : 'New Production Batch'}
                            </h2>
                            <p className={`${editingId ? 'text-blue-100' : 'text-orange-100'} text-sm mt-1`}>
                                {editingId ? `Editing Batch #${editingId}` : 'Fill in the details to schedule a new batch'}
                            </p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Batch Name</label>
                                <input
                                    required
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Afternoon Snack Batch"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-semibold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Start Time</label>
                                    <input
                                        required
                                        type="time"
                                        name="startTime"
                                        value={formData.startTime}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-semibold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">End Time</label>
                                    <input
                                        required
                                        type="time"
                                        name="endTime"
                                        value={formData.endTime}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-semibold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Expected Delivery Time</label>
                                <div className="relative">
                                    <FaClock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        required
                                        type="time"
                                        name="expectedDelivery"
                                        value={formData.expectedDelivery}
                                        onChange={handleInputChange}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-semibold text-gray-900"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 italic px-1">This is when customers should expect their orders from this batch.</p>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className={`w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-xl shadow-lg shadow-orange-100 transition-all transform active:scale-95 uppercase tracking-widest mt-4 flex items-center justify-center gap-2 ${submitting ? 'opacity-70 cursor-not-allowed' : ''
                                    }`}
                            >
                                {submitting ? (
                                    <>
                                        <FaSync className="animate-spin" />
                                        {editingId ? 'Updating...' : 'Scheduling...'}
                                    </>
                                ) : (
                                    editingId ? 'Update Batch' : 'Schedule Batch'
                                )}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BatchSystem;
