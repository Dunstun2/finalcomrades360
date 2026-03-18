import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../components/ui/use-toast';
import { resolveImageUrl, FALLBACK_IMAGE } from '../../utils/imageUtils';

export default function ProductDeletionRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const { toast } = useToast();

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/products/deletion-requests');
            setRequests(res.data || []);
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to fetch deletion requests', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (requestId) => {
        if (!window.confirm('Are you sure you want to approve this deletion? The product will be moved to the recycle bin.')) return;
        setProcessing(requestId);
        try {
            await api.post('/admin/products/deletion-approve', { requestId });
            toast({ title: 'Success', description: 'Product deletion approved.' });
            setRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || 'Failed to approve deletion', variant: 'destructive' });
        } finally {
            setProcessing(null);
        }
    };

    const handleDeny = async (requestId) => {
        const notes = window.prompt('Reason for denial:');
        if (notes === null) return;
        setProcessing(requestId);
        try {
            await api.post('/admin/products/deletion-deny', { requestId, notes });
            toast({ title: 'Success', description: 'Deletion request denied.' });
            setRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || 'Failed to deny request', variant: 'destructive' });
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Product Deletion Requests</h1>
                <button
                    onClick={fetchRequests}
                    className="text-sm bg-white border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-50 font-medium"
                >
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500 border border-dashed border-gray-200">
                    <p className="text-4xl mb-3">✅</p>
                    <h3 className="text-lg font-medium">No pending deletion requests</h3>
                    <p className="text-sm">All requests have been processed.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {requests.map(req => (
                        <div key={req.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 flex flex-col md:flex-row hover:shadow-md transition-shadow">
                            <div className="w-full md:w-56 h-48 bg-gray-50">
                                <img
                                    src={resolveImageUrl(req.Product?.coverImage)}
                                    alt={req.Product?.name}
                                    className="w-full h-full object-cover"
                                    onError={e => e.target.src = FALLBACK_IMAGE}
                                />
                            </div>
                            <div className="p-6 flex-grow flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">{req.Product?.name || 'Product Not Found'}</h2>
                                            <p className="text-xs text-gray-500">ID: {req.productId} · Request ID: {req.id}</p>
                                        </div>
                                        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-1 rounded font-bold uppercase tracking-wider">Pending Approval</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <div className="text-sm">
                                            <p className="text-gray-500">Seller Information</p>
                                            <p className="font-semibold text-gray-800">{req.seller?.name || 'N/A'}</p>
                                            <p className="text-gray-600">{req.seller?.email || 'N/A'}</p>
                                            <p className="text-gray-600">{req.seller?.phone || 'N/A'}</p>
                                        </div>
                                        <div className="text-sm">
                                            <p className="text-gray-500">Submission Date</p>
                                            <p className="font-semibold text-gray-800">{new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString()}</p>
                                            <p className="text-gray-500 mt-1">Price: KES {req.Product?.displayPrice || req.Product?.basePrice || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100 italic text-gray-700 relative">
                                        <span className="absolute -top-2 left-3 bg-gray-50 px-2 text-[10px] font-bold text-gray-400 uppercase">Seller's Reason</span>
                                        "{req.reason || 'No reason provided'}"
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-50">
                                    <button
                                        onClick={() => handleDeny(req.id)}
                                        disabled={processing === req.id}
                                        className="px-5 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        Deny Request
                                    </button>
                                    <button
                                        onClick={() => handleApprove(req.id)}
                                        disabled={processing === req.id}
                                        className="px-5 py-2 text-sm font-semibold bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors shadow-sm hover:shadow disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {processing === req.id ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                                Finalizing...
                                            </>
                                        ) : (
                                            'Approve & Delete Product'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
