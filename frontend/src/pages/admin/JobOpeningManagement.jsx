import React, { useEffect, useState } from 'react';
import { jobOpeningApi } from '../../services/api';
import { FaPlus, FaEdit, FaTrash, FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';
import Dialog from '../../components/Dialog';

export default function JobOpeningManagement() {
    const [openings, setOpenings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        role: 'seller',
        title: '',
        description: '',
        requirements: '',
        targetCount: 1,
        deadline: '',
        status: 'active'
    });
    const [submitting, setSubmitting] = useState(false);

    // Dialog state
    const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'info' });

    const fetchOpenings = async () => {
        try {
            setLoading(true);
            const res = await jobOpeningApi.getAll();
            setOpenings(res.data?.data || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch job openings:', err);
            setError('Failed to load job openings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOpenings();
    }, []);

    const handleEdit = (opening) => {
        setEditingId(opening.id);
        setFormData({
            role: opening.role,
            title: opening.title,
            description: opening.description,
            requirements: opening.requirements || '',
            targetCount: opening.targetCount,
            deadline: opening.deadline ? new Date(opening.deadline).toISOString().split('T')[0] : '',
            status: opening.status
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this job opening? This cannot be undone if there are no applications.')) return;
        try {
            await jobOpeningApi.delete(id);
            setDialog({ isOpen: true, title: 'Deleted', message: 'Job opening deleted successfully.', type: 'success' });
            fetchOpenings();
        } catch (err) {
            setDialog({ isOpen: true, title: 'Error', message: err.response?.data?.message || 'Failed to delete.', type: 'error' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                await jobOpeningApi.update(editingId, formData);
                setDialog({ isOpen: true, title: 'Updated', message: 'Job opening updated successfully.', type: 'success' });
            } else {
                await jobOpeningApi.create(formData);
                setDialog({ isOpen: true, title: 'Created', message: 'Job opening created successfully.', type: 'success' });
            }
            setShowForm(false);
            setEditingId(null);
            setFormData({ role: 'seller', title: '', description: '', requirements: '', targetCount: 1, deadline: '', status: 'active' });
            fetchOpenings();
        } catch (err) {
            setDialog({ isOpen: true, title: 'Error', message: err.response?.data?.message || 'Failed to save.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1"><FaCheckCircle /> Active</span>;
            case 'closed': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs flex items-center gap-1"><FaTimesCircle /> Closed</span>;
            case 'filled': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center gap-1"><FaCheckCircle /> Filled</span>;
            default: return null;
        }
    };

    return (
        <div className="container-fluid p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Job Opening Management</h1>
                <button
                    onClick={() => { setEditingId(null); setShowForm(true); }}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <FaPlus /> New Opening
                </button>
            </div>

            {error && <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}

            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                        <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Job Opening' : 'Create New Job Opening'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Role Type</label>
                                    <select
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full p-2 border rounded-lg"
                                        required
                                    >
                                        <option value="seller">Seller</option>
                                        <option value="marketer">Marketer</option>
                                        <option value="delivery_agent">Delivery Agent</option>
                                        <option value="service_provider">Service Provider</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Target Number of People</label>
                                    <input
                                        type="number" min="1"
                                        value={formData.targetCount}
                                        onChange={e => setFormData({ ...formData, targetCount: e.target.value })}
                                        className="w-full p-2 border rounded-lg"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full p-2 border rounded-lg"
                                    placeholder="e.g. Campus Delivery Agent - North Campus"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-2 border rounded-lg h-24"
                                    placeholder="Responsibilities and overview..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Requirements (one per line)</label>
                                <textarea
                                    value={formData.requirements}
                                    onChange={e => setFormData({ ...formData, requirements: e.target.value })}
                                    className="w-full p-2 border rounded-lg h-24"
                                    placeholder="- Must have a smartphone\n- Available on weekends..."
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Deadline (Optional)</label>
                                    <input
                                        type="date"
                                        value={formData.deadline}
                                        onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                                        className="w-full p-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full p-2 border rounded-lg"
                                        required
                                    >
                                        <option value="active">Active</option>
                                        <option value="closed">Closed</option>
                                        <option value="filled">Filled</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn btn-primary min-w-[100px]"
                                >
                                    {submitting ? 'Saving...' : 'Save Opening'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="card shadow-sm border-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table mb-0">
                        <thead className="bg-gray-50 border-bottom">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Opening</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Filled / Target</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deadline</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-400">Loading openings...</td>
                                </tr>
                            ) : openings.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-400">No job openings found.</td>
                                </tr>
                            ) : openings.map(op => (
                                <tr key={op.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900">{op.title}</div>
                                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{op.description}</div>
                                    </td>
                                    <td className="px-4 py-3 capitalize text-sm text-gray-600">
                                        {op.role.replace('_', ' ')}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="text-sm font-semibold">{op.approvedCount || 0} / {op.targetCount}</div>
                                        <div className="w-24 h-1.5 bg-gray-100 rounded-full mx-auto mt-1 overflow-hidden">
                                            <div
                                                className={`h-full bg-blue-500 transition-all duration-500`}
                                                style={{ width: `${Math.min(100, ((op.approvedCount || 0) / op.targetCount) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        {op.deadline ? new Date(op.deadline).toLocaleDateString() : 'No deadline'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {getStatusBadge(op.status)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleEdit(op)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><FaEdit /></button>
                                            <button onClick={() => handleDelete(op.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><FaTrash /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog
                isOpen={dialog.isOpen}
                onClose={() => setDialog({ ...dialog, isOpen: false })}
                title={dialog.title}
                message={dialog.message}
                type={dialog.type}
            />
        </div>
    );
}
