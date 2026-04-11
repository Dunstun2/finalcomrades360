import React, { useEffect, useState } from 'react';
import { FaUndo, FaClock, FaCheckCircle, FaTruck, FaWarehouse, FaMoneyBillWave, FaTimes, FaInbox, FaArrowLeft, FaMapMarkerAlt, FaInfoCircle, FaPhoneAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { formatPrice } from '../../utils/currency';
import { ensureArray } from '../../utils/parsingUtils';

export default function CustomerReturnsList() {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReturns();
    }, []);

    const loadReturns = async () => {
        try {
            setLoading(true);
            const res = await api.get('/returns/my-returns');
            setReturns(res.data);
        } catch (err) {
            console.error('Failed to load returns:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStep = (status) => {
        const steps = {
            'pending': 1,
            'approved': 2,
            'item_collected': 3,
            'item_received': 4,
            'completed': 5,
            'rejected': 0
        };
        return steps[status] || 0;
    };

    const StatusBadge = ({ status }) => {
        const config = {
            pending: { label: 'Reviewing', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: FaClock },
            approved: { label: 'Ready for Pickup', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: FaCheckCircle },
            item_collected: { label: 'Collected', color: 'text-orange-600', bg: 'bg-orange-50', icon: FaTruck },
            item_received: { label: 'Received at WH', color: 'text-purple-600', bg: 'bg-purple-50', icon: FaWarehouse },
            completed: { label: 'Refunded', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: FaMoneyBillWave },
            rejected: { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-50', icon: FaTimes }
        };
        const c = config[status] || config.pending;
        const Icon = c.icon;
        return (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${c.bg} ${c.color} border border-current/10 shadow-sm`}>
                <Icon size={10} />
                {c.label}
            </div>
        );
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="p-4 sm:p-8 space-y-8 bg-gray-50/50 min-h-screen pb-20">
            <header className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <Link to="/customer/orders" className="text-blue-600 hover:text-blue-800 flex items-center font-bold text-xs uppercase tracking-wider mb-2">
                        <FaArrowLeft className="mr-2" /> Back to Orders
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tight">My Returns</h1>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Track your return progress & status</p>
                </div>
            </header>

            {returns.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-gray-200 shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FaUndo className="h-8 w-8 text-gray-200" />
                    </div>
                    <h2 className="text-xl font-black text-gray-400 uppercase tracking-tight">No Returns Found</h2>
                    <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">You haven't requested any returns yet. Only delivered items can be returned within 7 days.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {returns.map(ret => {
                        const total = ensureArray(ret.items).reduce((sum, i) => sum + (i.price * i.quantity), 0);
                        const activeTask = ret.order?.deliveryTasks?.find(t => t.deliveryType?.includes('to_warehouse') && t.status !== 'completed');
                        const currentStep = getStatusStep(ret.status);

                        return (
                            <div key={ret.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-6 sm:p-8 border-b border-gray-50">
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                                                <FaUndo size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-blue-900 uppercase tracking-tight leading-none">Order #{ret.order?.orderNumber}</h3>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-widest">Requested on {new Date(ret.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <StatusBadge status={ret.status} />
                                    </div>

                                    {/* Tracking Steps */}
                                    {ret.status !== 'rejected' && (
                                        <div className="relative mb-10 px-2 sm:px-10">
                                            <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-100 hidden sm:block"></div>
                                            <div className="relative flex justify-between">
                                                {[
                                                    { id: 1, label: 'Review', icon: FaClock },
                                                    { id: 2, label: 'Approval', icon: FaCheckCircle },
                                                    { id: 3, label: 'Pickup', icon: FaTruck },
                                                    { id: 4, label: 'Warehouse', icon: FaWarehouse },
                                                    { id: 5, label: 'Refunded', icon: FaMoneyBillWave }
                                                ].map((step) => {
                                                    const isActive = currentStep >= step.id;
                                                    const Icon = step.icon;
                                                    return (
                                                        <div key={step.id} className="flex flex-col items-center gap-2 z-10">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${isActive ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-110' : 'bg-white border-gray-100 text-gray-300'}`}>
                                                                <Icon size={12} />
                                                            </div>
                                                            <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-indigo-900' : 'text-gray-300'}`}>
                                                                {step.label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Items & Value */}
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                                <FaInbox className="text-blue-500" /> Items in Return
                                            </h4>
                                            <div className="space-y-3">
                                                {ensureArray(ret.items).map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-4 bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                                                        <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 overflow-hidden flex-shrink-0">
                                                            {item.image ? (
                                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-300"><FaBox size={20} /></div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-black text-gray-900 uppercase truncate leading-tight mb-0.5">{item.name}</p>
                                                            <p className="text-[9px] font-bold text-indigo-600 uppercase">Qty: {item.quantity} • {formatPrice(item.price)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs font-black text-gray-900">{formatPrice(item.price * item.quantity)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-between items-center px-4 pt-4 border-t border-dashed border-gray-200">
                                                <span className="text-[10px] font-black text-gray-400 uppercase">Estimated Refund Value</span>
                                                <span className="text-xl font-black text-emerald-700">{formatPrice(total)}</span>
                                            </div>
                                        </div>

                                        {/* Logistics Tracking */}
                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                                    <FaMapMarkerAlt className="text-blue-500" /> Pickup Instructions
                                                </h4>
                                                <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6 relative overflow-hidden group shadow-sm">
                                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                        <FaMapMarkerAlt size={48} />
                                                    </div>
                                                    <div className="flex flex-col gap-4 relative">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl shadow-lg flex items-center justify-center">
                                                                {ret.pickupMethod === 'drop_off' ? <FaWarehouse /> : <FaTruck />}
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">Method</p>
                                                                <p className="text-xs font-black text-blue-900 uppercase">{ret.pickupMethod === 'drop_off' ? 'Drop-off at Station' : 'Agent Home Pickup'}</p>
                                                            </div>
                                                        </div>

                                                        <div className="pl-1">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-2">Location Details</p>
                                                            {ret.pickupMethod === 'drop_off' ? (
                                                                <div className="space-y-1">
                                                                    <p className="text-xs font-black text-blue-800 uppercase leading-tight font-bold">{ret.pickupStation?.name || 'Selected Pickup Station'}</p>
                                                                    <p className="text-[11px] text-blue-600 font-bold italic leading-relaxed">{ret.pickupStation?.location || 'Please refer to the station address mentioned in approval details.'}</p>
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs font-bold text-blue-900 border-l-4 border-blue-400 pl-4 py-1 italic bg-white/50 rounded-r-xl">
                                                                    {ret.pickupAddress}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Assigned Agent Card */}
                                            {activeTask?.deliveryAgent && (
                                                <div className="bg-indigo-600 text-white rounded-3xl p-6 shadow-xl shadow-indigo-100 relative overflow-hidden">
                                                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
                                                    <h5 className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                                        Pickup Agent Assigned
                                                    </h5>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner border border-white/10">
                                                            <FaTruck size={24} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-black uppercase tracking-tight leading-none mb-1">{activeTask.deliveryAgent.name}</p>
                                                            <p className="text-[11px] font-bold text-indigo-100 flex items-center gap-1.5 opacity-80 uppercase tracking-tighter">
                                                                {activeTask.status === 'assigned' ? 'En route to you' : activeTask.status.replace('_', ' ')}
                                                            </p>
                                                        </div>
                                                        <a 
                                                            href={`tel:${activeTask.deliveryAgent.phone}`}
                                                            className="w-12 h-12 bg-white text-indigo-600 rounded-2xl flex items-center justify-center hover:bg-indigo-50 active:scale-95 transition-all shadow-lg"
                                                            title="Call Agent"
                                                        >
                                                            <FaPhoneAlt size={18} />
                                                        </a>
                                                    </div>
                                                </div>
                                            )}

                                            {ret.status === 'pending' && (
                                                <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-2xl flex items-start gap-3">
                                                    <FaInfoCircle className="text-yellow-600 h-5 w-5 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs font-black text-yellow-900 uppercase">Reviewing Request</p>
                                                        <p className="text-[10px] text-yellow-700 leading-tight mt-1 font-medium">Our logistics team is reviewing your reason and evidence photos. You will receive an update within 24 hours.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {ret.adminNotes && (
                                    <div className="bg-gray-50/50 p-4 px-8 flex items-center gap-3 border-t border-gray-50">
                                        <FaInfoCircle className="text-blue-500 h-4 w-4" />
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Admin Note: <span className="text-gray-900 normal-case ml-1">"{ret.adminNotes}"</span></p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
