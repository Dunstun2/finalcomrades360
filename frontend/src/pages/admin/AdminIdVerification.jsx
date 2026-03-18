import React, { useState, useEffect } from 'react';
import api from '../../services/api'; // Adjust import based on your structure
import { FaCheck, FaTimes, FaSearch, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';

const AdminIdVerification = () => {
    const [verifications, setVerifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
    const [showRejectionInput, setShowRejectionInput] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [nationalIdNumber, setNationalIdNumber] = useState('');

    const fetchVerifications = async () => {
        try {
            const response = await api.get('/verification/admin/pending');
            if (response.data.success) {
                setVerifications(response.data.users);
            }
        } catch (error) {
            console.error('Error fetching verifications:', error);
            toast.error('Failed to load pending verifications');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVerifications();
    }, []);

    const handleAction = async (userId, action) => {
        setProcessing(userId);
        setFeedback(null);
        try {
            const response = await api.post('/verification/admin/review', {
                userId,
                action,
                rejectionReason: action === 'reject' ? rejectionReason : null,
                nationalIdNumber: action === 'approve' ? nationalIdNumber : null
            });

            if (response.data.success) {
                const msg = `User ${action}ed successfully!`;
                setFeedback({ type: 'success', message: msg });
                toast.success(msg);

                // Remove from list after a short delay so they see the success message
                setTimeout(() => {
                    setVerifications(prev => prev.filter(u => u.id !== userId));
                    closeModal();
                }, 2000);
            }
        } catch (error) {
            console.error(`Error ${action}ing user:`, error);
            const errMsg = error.response?.data?.message || `Failed to ${action} user. Please try again.`;
            setFeedback({ type: 'error', message: errMsg });
            toast.error(errMsg);
        } finally {
            setProcessing(null);
        }
    };

    const closeModal = () => {
        setSelectedImage(null);
        setFeedback(null);
        setShowRejectionInput(false);
        setRejectionReason('');
        setNationalIdNumber('');
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 font-outfit">Pending Identity Verifications</h1>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading pending list...</p>
                </div>
            ) : verifications.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center text-gray-500">
                    <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaCheck className="text-gray-300 text-3xl" />
                    </div>
                    <h3 className="text-gray-900 font-bold text-lg">All caught up!</h3>
                    <p className="mt-1">No pending verifications at the moment.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="overflow-x-auto rounded-2xl">
                        <table className="min-w-full md:min-w-full" style={{ minWidth: '700px' }}>
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider font-outfit whitespace-nowrap">User</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider font-outfit whitespace-nowrap">Email</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider font-outfit whitespace-nowrap">Submitted</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider font-outfit whitespace-nowrap">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {verifications.map((user) => (
                                <tr key={user.id} className="hover:bg-blue-50/20 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-gray-900">{user.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <button
                                            onClick={() => setSelectedImage({ url: user.nationalIdUrl, user })}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
                                        >
                                            <FaEye /> Review Verification
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {/* Image Modal */}
            {selectedImage && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold font-outfit tracking-tight">Review Identity Document</h3>
                                <p className="text-blue-100 text-sm">{selectedImage.user.name} • {selectedImage.user.email}</p>
                            </div>
                            <button onClick={closeModal} className="p-2 hover:bg-blue-500 rounded-full transition-colors">
                                <FaTimes size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">

                            <div className="space-y-4">
                                {(() => {
                                    try {
                                        const urls = JSON.parse(selectedImage.url);
                                        const getImageUrl = (path) => {
                                            if (!path) return '';
                                            if (path.startsWith('http')) return path;
                                            return path.startsWith('/') ? path : `/${path}`;
                                        };

                                        return Array.isArray(urls) ? urls.map((url, i) => (
                                            <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/50 p-2">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Document {i + 1}</p>
                                                {url.toLowerCase().endsWith('.pdf') ? (
                                                    <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-dashed border-gray-200">
                                                        <a href={getImageUrl(url)} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-3 text-blue-600 hover:text-blue-700 transition-colors">
                                                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
                                                                <FaFilePdf size={32} />
                                                            </div>
                                                            <span className="font-bold text-sm tracking-tight line-clamp-1">View PDF Document</span>
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={getImageUrl(url)}
                                                        alt={`ID Document ${i + 1}`}
                                                        className="w-full h-auto rounded-xl shadow-sm border border-gray-100"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        )) : null;
                                    } catch (e) {
                                        const getImageUrl = (path) => {
                                            if (!path) return '';
                                            if (path.startsWith('http')) return path;
                                            return path.startsWith('/') ? path : `/${path}`;
                                        };

                                        return (
                                            <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/50 p-2">
                                                {selectedImage.url.toLowerCase().endsWith('.pdf') ? (
                                                    <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-dashed border-gray-200">
                                                        <a href={getImageUrl(selectedImage.url)} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-3 text-blue-600">
                                                            <FaFilePdf size={48} className="text-red-500" />
                                                            <span className="font-bold">View PDF</span>
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={getImageUrl(selectedImage.url)}
                                                        alt="National ID"
                                                        className="w-full h-auto rounded-xl shadow-sm border border-gray-100"
                                                    />
                                                )}
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-gray-100">
                            {/* In-Modal Feedback (Now at bottom for visibility) */}
                            {feedback && (
                                <div className={`mb-4 p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${feedback.type === 'success'
                                    ? 'bg-green-50 border-green-100 text-green-700'
                                    : 'bg-red-50 border-red-100 text-red-700'
                                    }`}>
                                    {feedback.type === 'success' ? <FaCheck className="flex-shrink-0" /> : <FaTimes className="flex-shrink-0" />}
                                    <p className="font-bold text-sm tracking-tight">{feedback.message}</p>
                                </div>
                            )}

                            {showRejectionInput ? (
                                <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 font-outfit">Reason for Rejection</label>
                                        <textarea
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            placeholder="Please provide a clear reason why the document was rejected..."
                                            className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm min-h-[100px]"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowRejectionInput(false)}
                                            className="px-6 py-3 border border-gray-200 text-gray-600 rounded-2xl text-sm font-bold hover:bg-white transition-colors flex-1"
                                        >
                                            Go Back
                                        </button>
                                        <button
                                            onClick={() => handleAction(selectedImage.user.id, 'reject')}
                                            disabled={!rejectionReason.trim() || processing}
                                            className={`px-8 py-3 rounded-2xl text-white text-sm font-bold shadow-lg transition-all flex-[2] ${!rejectionReason.trim() || processing
                                                ? 'bg-gray-300'
                                                : 'bg-red-600 hover:bg-red-700 active:scale-95 shadow-red-100'
                                                }`}
                                        >
                                            {processing === selectedImage.user.id ? 'Processing...' : 'Confirm Rejection'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1 text-red-500">Identity Information (Required)</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={nationalIdNumber}
                                                onChange={(e) => setNationalIdNumber(e.target.value)}
                                                placeholder="Key in the National ID number appearing on the document"
                                                className="w-full px-0 py-2 bg-transparent text-gray-900 font-bold placeholder:text-gray-300 focus:outline-none text-base border-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setShowRejectionInput(true)}
                                            disabled={processing}
                                            className="flex-1 px-6 py-4 border-2 border-red-500 text-red-600 rounded-2xl text-sm font-black uppercase tracking-wider hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleAction(selectedImage.user.id, 'approve')}
                                            disabled={processing || !nationalIdNumber.trim()}
                                            className={`flex-[2] px-8 py-4 text-white rounded-2xl text-sm font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 disabled:opacity-50 ${processing || !nationalIdNumber.trim()
                                                ? 'bg-gray-300 shadow-none'
                                                : 'bg-green-600 hover:bg-green-700 shadow-green-100'
                                                }`}
                                        >
                                            {processing === selectedImage.user.id ? 'Processing...' : 'Confirm Approval'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminIdVerification;
