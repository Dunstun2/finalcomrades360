import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaBox, FaCamera, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimesCircle, FaMapMarkerAlt } from 'react-icons/fa';
import api from '../../services/api';
import { resolveImageUrl, FALLBACK_IMAGE } from '../../utils/imageUtils';
import { formatPrice } from '../../utils/currency';

const REASON_CATEGORIES = [
    { id: 'wrong_size', label: 'Wrong Size/Fit' },
    { id: 'damaged', label: 'Item Damaged on Arrival' },
    { id: 'defective', label: 'Item Defective/Not Working' },
    { id: 'not_as_described', label: 'Item Not as Described' },
    { id: 'changed_mind', label: 'Changed my Mind' },
    { id: 'other', label: 'Other' }
];

export default function ReturnRequestPage() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Form state
    const [selectedItems, setSelectedItems] = useState([]);
    const [reasonCategory, setReasonCategory] = useState('');
    const [description, setDescription] = useState('');
    const [imagePreviews, setImagePreviews] = useState([]); // { file, url } objects
    const [uploadedImageUrls, setUploadedImageUrls] = useState([]); // server URLs after upload
    const [uploadingImages, setUploadingImages] = useState(false);
    const [pickupMethod, setPickupMethod] = useState('agent_pickup');
    const [pickupAddress, setPickupAddress] = useState('');

    // Pickup station state
    const [pickupStations, setPickupStations] = useState([]);
    const [loadingStations, setLoadingStations] = useState(false);
    const [selectedStationId, setSelectedStationId] = useState('');

    useEffect(() => {
        loadOrder();
    }, [orderId]);

    useEffect(() => {
        if (pickupMethod === 'drop_off' && pickupStations.length === 0) {
            loadPickupStations();
        }
    }, [pickupMethod]);

    const loadOrder = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/orders/${orderId}`);
            setOrder(res.data);
            setPickupAddress(res.data.deliveryAddress || '');

            const deliveryDate = res.data.actualDelivery || res.data.updatedAt;
            const diffDays = Math.ceil(Math.abs(Date.now() - new Date(deliveryDate)) / (1000 * 60 * 60 * 24));
            if (diffDays > 7) {
                setError('Return window (7 days) has expired for this order.');
                return;
            }
            if (res.data.status !== 'delivered' && res.data.status !== 'completed') {
                setError('This order is not eligible for return yet.');
            }
        } catch (err) {
            console.error('Failed to load order:', err);
            setError('Failed to load order details');
        } finally {
            setLoading(false);
        }
    };

    const loadPickupStations = async () => {
        try {
            setLoadingStations(true);
            const res = await api.get('/pickup-stations?activeOnly=true');
            // API returns { success, stations } — extract the array
            const data = res.data;
            const stationList = Array.isArray(data) ? data : (data.stations || data.data || []);
            setPickupStations(stationList);
        } catch (err) {
            console.error('Failed to load pickup stations:', err);
        } finally {
            setLoadingStations(false);
        }
    };

    const toggleItem = (item) => {
        const isSelected = selectedItems.find(si => si.orderItemId === item.id);
        if (isSelected) {
            setSelectedItems(selectedItems.filter(si => si.orderItemId !== item.id));
        } else {
            setSelectedItems([...selectedItems, {
                orderItemId: item.id,
                orderId: item.orderId,
                quantity: item.quantity,
                name: item.name || item.Product?.name || item.itemLabel
            }]);
        }
    };

    const handleImageSelect = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        // Limit to 5 images total
        const remaining = 5 - imagePreviews.length;
        const filesToAdd = files.slice(0, remaining);

        // Create local previews immediately
        const newPreviews = filesToAdd.map(file => ({
            file,
            url: URL.createObjectURL(file),
            id: Date.now() + Math.random()
        }));
        setImagePreviews(prev => [...prev, ...newPreviews]);

        // Upload files to server
        setUploadingImages(true);
        try {
            const uploaded = [];
            for (const preview of newPreviews) {
                const formData = new FormData();
                formData.append('file', preview.file); // backend expects field name 'file'
                const res = await api.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                // backend returns { url: '/uploads/filename.ext' }
                if (res.data.url) uploaded.push(res.data.url);
            }
            setUploadedImageUrls(prev => [...prev, ...uploaded]);
        } catch (err) {
            console.error('Image upload failed:', err);
            // Still allow submission even if image upload fails
            alert('Could not upload images. You can still submit the request without photos.');
            // Remove the failed previews
            setImagePreviews(prev => prev.filter(p => !newPreviews.find(n => n.id === p.id)));
        } finally {
            setUploadingImages(false);
        }

        // Reset file input
        e.target.value = '';
    };

    const removeImage = (id) => {
        setImagePreviews(prev => {
            const idx = prev.findIndex(p => p.id === id);
            const updated = prev.filter(p => p.id !== id);
            // Also remove from uploaded URLs by index
            setUploadedImageUrls(u => u.filter((_, i) => i !== idx));
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedItems.length === 0) return alert('Please select at least one item to return');
        if (!reasonCategory) return alert('Please select a reason category');
        if (pickupMethod === 'drop_off' && !selectedStationId) return alert('Please select a pickup station');
        if (pickupMethod === 'agent_pickup' && !pickupAddress.trim()) return alert('Please enter your pickup address');

        try {
            setSubmitting(true);

            // Group items by their original orderId (for grouped/multi-seller orders)
            const itemsByOrder = selectedItems.reduce((acc, item) => {
                const key = item.orderId || orderId;
                if (!acc[key]) acc[key] = [];
                acc[key].push(item);
                return acc;
            }, {});

            const orderIdsToReturn = Object.keys(itemsByOrder);

            for (const id of orderIdsToReturn) {
                const payload = {
                    orderId: id,
                    items: itemsByOrder[id],
                    reasonCategory,
                    description,
                    images: uploadedImageUrls,
                    pickupMethod,
                    pickupAddress: pickupMethod === 'agent_pickup' ? pickupAddress : null,
                    pickupStationId: pickupMethod === 'drop_off' ? parseInt(selectedStationId) : null,
                };
                await api.post('/returns/request', payload);
            }

            alert(orderIdsToReturn.length > 1
                ? `Return requests submitted for ${orderIdsToReturn.length} sellers. Our team will review shortly.`
                : 'Return request submitted! Our team will review it shortly.');
            navigate('/customer/orders');
        } catch (err) {
            console.error('Return request failed:', err);
            alert(err.response?.data?.error || 'Failed to submit return request');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 text-center shadow-xl shadow-blue-50">
                <FaExclamationTriangle className="mx-auto h-16 w-16 text-amber-500 mb-4" />
                <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Return Unavailable</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <Link to="/customer/orders" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all uppercase tracking-wider">
                    <FaArrowLeft className="mr-2" /> Back to Orders
                </Link>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-6 sm:py-10 px-4">
            <div className="max-w-3xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <Link to="/customer/orders" className="text-blue-600 hover:text-blue-800 flex items-center font-bold text-sm uppercase tracking-wider mb-2">
                            <FaArrowLeft className="mr-2" /> Back
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tight">Request Return</h1>
                        <p className="text-sm text-gray-500 font-medium">Order #{order.orderNumber}</p>
                    </div>
                    <div className="hidden sm:block">
                        <FaBox className="h-12 w-12 text-blue-100" />
                    </div>
                </header>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Step 1 — Item Selection */}
                    <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-5 h-5 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-[10px]">1</span>
                            Select Items to Return
                        </h2>
                        <div className="space-y-3">
                            {(order.OrderItems || []).map(item => {
                                const isSelected = selectedItems.some(si => si.orderItemId === item.id);
                                const itemName = item.itemLabel || item.name || item.Product?.name || 'Order Item';
                                const imageUrl = resolveImageUrl(item.Product?.coverImage || item.product?.image);
                                return (
                                    <div
                                        key={item.id}
                                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50/30' : 'border-gray-50 hover:border-gray-200 bg-white'}`}
                                        onClick={() => toggleItem(item)}
                                    >
                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200'}`}>
                                            {isSelected && <FaCheckCircle className="h-4 w-4" />}
                                        </div>
                                        <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                                            <img src={imageUrl} alt={itemName} className="w-full h-full object-cover" onError={e => e.target.src = FALLBACK_IMAGE} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight truncate">{itemName}</h3>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Qty: {item.quantity} • {formatPrice(item.price)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Step 2 — Reason */}
                    <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-5 h-5 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-[10px]">2</span>
                            Why are you returning?
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Reason Category *</label>
                                <select
                                    value={reasonCategory}
                                    onChange={e => setReasonCategory(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    required
                                >
                                    <option value="">Select a reason...</option>
                                    {REASON_CATEGORIES.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Details (Optional)</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Tell us more about the issue..."
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[100px]"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Step 3 — Evidence (Images) */}
                    <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <span className="w-5 h-5 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-[10px]">3</span>
                            Evidence (Images)
                        </h2>
                        <p className="text-[10px] text-gray-400 font-medium mb-4 italic">
                            Photos help us process your return faster, especially for damaged items. Up to 5 photos.
                        </p>

                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleImageSelect}
                        />

                        <div className="flex flex-wrap gap-3">
                            {/* Image previews */}
                            {imagePreviews.map(preview => (
                                <div key={preview.id} className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-blue-200 group">
                                    <img src={preview.url} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(preview.id)}
                                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <FaTimesCircle className="text-white h-6 w-6" />
                                    </button>
                                </div>
                            ))}

                            {/* Add photo button */}
                            {imagePreviews.length < 5 && (
                                <button
                                    type="button"
                                    className={`w-20 h-20 bg-gray-50 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${uploadingImages ? 'border-blue-300 text-blue-400 cursor-wait animate-pulse' : 'border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 cursor-pointer'}`}
                                    onClick={() => !uploadingImages && fileInputRef.current?.click()}
                                    disabled={uploadingImages}
                                >
                                    <FaCamera className="h-5 w-5" />
                                    <span className="text-[8px] font-black uppercase">
                                        {uploadingImages ? 'Uploading...' : 'Add Photo'}
                                    </span>
                                </button>
                            )}
                        </div>

                        {uploadedImageUrls.length > 0 && (
                            <p className="text-[10px] text-green-600 font-bold mt-2">
                                ✓ {uploadedImageUrls.length} photo{uploadedImageUrls.length > 1 ? 's' : ''} uploaded
                            </p>
                        )}
                    </section>

                    {/* Step 4 — Logistics */}
                    <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-5 h-5 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-[10px]">4</span>
                            How should we collect the item?
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div
                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${pickupMethod === 'agent_pickup' ? 'border-blue-600 bg-blue-50/30' : 'border-gray-50 bg-gray-50/50 hover:border-gray-200'}`}
                                onClick={() => setPickupMethod('agent_pickup')}
                            >
                                <p className="text-xs font-black text-gray-900 uppercase">Agent Pickup</p>
                                <p className="text-[10px] text-gray-500 mt-1">An agent will collect from your address.</p>
                            </div>
                            <div
                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${pickupMethod === 'drop_off' ? 'border-blue-600 bg-blue-50/30' : 'border-gray-50 bg-gray-50/50 hover:border-gray-200'}`}
                                onClick={() => setPickupMethod('drop_off')}
                            >
                                <p className="text-xs font-black text-gray-900 uppercase">Drop-off at Station</p>
                                <p className="text-[10px] text-gray-500 mt-1">Drop off at a nearby pickup station.</p>
                            </div>
                        </div>

                        {/* Agent pickup — address input */}
                        {pickupMethod === 'agent_pickup' && (
                            <div className="mt-4">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Pickup Address *</label>
                                <input
                                    type="text"
                                    value={pickupAddress}
                                    onChange={e => setPickupAddress(e.target.value)}
                                    placeholder="Enter the address where agent should collect"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    required={pickupMethod === 'agent_pickup'}
                                />
                            </div>
                        )}

                        {/* Drop-off — pickup station selector */}
                        {pickupMethod === 'drop_off' && (
                            <div className="mt-4 space-y-3">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                                    Select Nearest Pickup Station *
                                </label>

                                {loadingStations ? (
                                    <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        <span className="text-xs text-gray-500 font-medium">Loading nearby stations...</span>
                                    </div>
                                ) : pickupStations.length === 0 ? (
                                    <p className="text-xs text-amber-600 font-bold p-4 bg-amber-50 rounded-xl">
                                        No pickup stations available at this time.
                                    </p>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                        {pickupStations.map(station => (
                                            <div
                                                key={station.id}
                                                className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedStationId == station.id ? 'border-blue-600 bg-blue-50/30' : 'border-gray-50 bg-gray-50/50 hover:border-gray-200'}`}
                                                onClick={() => setSelectedStationId(station.id)}
                                            >
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${selectedStationId == station.id ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                                                    {selectedStationId == station.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black text-gray-900 uppercase truncate">{station.name}</p>
                                                    <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                                                        <FaMapMarkerAlt className="text-blue-400 flex-shrink-0" />
                                                        {station.location || station.address || 'Location not specified'}
                                                    </p>
                                                    {station.contactPhone && (
                                                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">📞 {station.contactPhone}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Policy note */}
                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-3">
                        <FaInfoCircle className="text-blue-600 h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-black text-blue-900 uppercase tracking-tight">Return Policy</p>
                            <p className="text-[10px] text-blue-700 leading-tight mt-1 font-medium">
                                Once submitted, our team will review your request within 1-2 business days.
                                After approval, keep the item in its original packaging for collection.
                            </p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || selectedItems.length === 0 || uploadingImages}
                        className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 ${submitting || selectedItems.length === 0 || uploadingImages ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'}`}
                    >
                        {submitting ? 'Submitting Request...' : uploadingImages ? 'Uploading Images...' : 'Submit Return Request'}
                    </button>
                </form>
            </div>
        </div>
    );
}
