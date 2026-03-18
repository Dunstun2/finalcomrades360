import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { FaLocationArrow, FaBox, FaUser, FaStore, FaSpinner, FaSearch, FaTimes } from 'react-icons/fa';
import api from '../../../services/api';

// Fix for default Leaflet icons in Vite/Webpack
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
});

// Custom Icons
const driverIcon = new L.DivIcon({
    className: 'custom-driver-icon',
    html: `<div style="background-color: #2563EB; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" style="color: white; font-size: 14px;" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M444.52 3.52L28.74 195.42c-47.97 22.39-31.98 92.75 19.19 92.75h175.91v175.91c0 51.17 70.36 67.17 92.75 19.19l191.9-415.78c15.99-38.39-25.59-79.97-63.97-63.97z"></path></svg></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

const restaurantIcon = new L.DivIcon({
    className: 'custom-restaurant-icon',
    html: `<div style="background-color: #EF4444; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 576 512" style="color: white; font-size: 12px;" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.991 48.284 48.27 42.606 11.666 213.371 11.666 213.371 11.666s170.765 0 213.371-11.666c23.497-6.279 42.003-24.62 48.284-48.27 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-47.407 182.259l-83.333 48-83.333-48V204h166.666zM245.333 204v102.342l-83.333 48-83.333-48V204h166.666z"></path></svg></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

const customerIcon = new L.DivIcon({
    className: 'custom-customer-icon',
    html: `<div style="background-color: #10B981; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 448 512" style="color: white; font-size: 12px;" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0 96 57.3 96 128s57.3 128 128 128zm89.6 32h-16.7c-22.2 10.2-46.9 16-72.9 16s-50.6-5.8-72.9-16h-16.7C60.2 288 0 348.2 0 422.4V464c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48v-41.6c0-74.2-60.2-134.4-134.4-134.4z"></path></svg></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

// Component to recenter map when order/location changes
const RecenterMap = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
};

const center = {
    lat: -1.2921, // Nairobi
    lng: 36.8219
};

const DeliveryLiveMap = () => {
    const [currentLocation, setCurrentLocation] = useState(center);
    const [activeOrder, setActiveOrder] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/delivery/profile');
            setIsOnline(!!res.data?.isActive);
        } catch (e) { console.error('Failed to fetch status', e); }
    };

    const fetchActiveOrder = async (query = '') => {
        try {
            if (query) setIsSearching(true);
            setSearchError(null);

            // Fetch orders. If query exists, search specifically for that order number
            const endpoint = query ? `/delivery/orders?q=${encodeURIComponent(query)}` : '/delivery/orders';
            const res = await api.get(endpoint);
            const orders = res.data.data || [];

            let targetOrder = null;
            if (query) {
                // When searching, try to find an exact match or the first partial match
                targetOrder = orders.find(o => o.orderNumber.toLowerCase().includes(query.toLowerCase()));
                if (!targetOrder) setSearchError(`Order #${query} not found in your assignments.`);
            } else {
                // Default: find the first in-progress order
                targetOrder = orders.find(o => ['in_progress', 'ready_for_pickup'].includes(o.status));
            }

            if (targetOrder) {
                // Map to component format
                const orderData = {
                    id: targetOrder.orderNumber,
                    pickup: {
                        lat: parseFloat(targetOrder.seller?.businessLat || center.lat),
                        lng: parseFloat(targetOrder.seller?.businessLng || center.lng),
                        name: targetOrder.seller?.name || 'Seller'
                    },
                    customer: {
                        lat: parseFloat(targetOrder.deliveryLat || center.lat + 0.005),
                        lng: parseFloat(targetOrder.deliveryLng || center.lng + 0.005),
                        name: targetOrder.user?.name || targetOrder.customerName || 'Customer'
                    },
                    status: targetOrder.status
                };
                setActiveOrder(orderData);
            } else if (!query) {
                setActiveOrder(null);
            }
        } catch (e) {
            console.error('Failed to fetch order', e);
            if (query) setSearchError('Search failed. Please try again.');
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        fetchActiveOrder(searchQuery.trim());
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchError(null);
        fetchActiveOrder();
    };

    useEffect(() => {
        fetchStatus();
        fetchActiveOrder();

        if ("geolocation" in navigator && !window._geoDenied) {
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    setCurrentLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    });
                },
                (err) => {
                    if (err.code === 1) { // PERMISSION_DENIED
                        window._geoDenied = true;
                        console.warn('[GPS] Live Map: Geolocation denied by user.');
                    } else {
                        console.error('[GPS] Live Map Error:', err.message);
                    }
                },
                {
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        }

        const interval = setInterval(fetchActiveOrder, 30000);
        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
            clearInterval(interval);
        };
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2"><FaSpinner className="animate-spin" /> Initializing Map...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow gap-4">
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-900">Live Map (Real-Time)</h2>
                    <p className="text-sm text-gray-500">{isOnline ? 'You are online and tracking deliveries' : 'You are offline'}</p>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex-1 max-w-sm w-full">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Enter Order # to track..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-10 pr-10 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${searchError ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                        />
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <FaTimes />
                            </button>
                        )}
                    </div>
                    {searchError && <p className="text-[10px] text-red-600 mt-1 ml-2 font-bold">{searchError}</p>}
                </form>

                <div className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {isOnline ? 'Active & Live' : 'Offline'}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-2 relative h-[600px] border border-gray-200">

                <MapContainer
                    center={[center.lat, center.lng]}
                    zoom={14}
                    style={{ height: '100%', width: '100%', borderRadius: '0.5rem', zIndex: 0 }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <RecenterMap center={[currentLocation.lat, currentLocation.lng]} />

                    {/* Driver Marker */}
                    {isOnline && (
                        <Marker position={[currentLocation.lat, currentLocation.lng]} icon={driverIcon}>
                            <Popup>
                                <div className="text-center">
                                    <strong>You</strong><br />
                                    Moving to destination...
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Active Order Markers */}
                    {activeOrder && (
                        <>
                            <Marker position={[activeOrder.pickup.lat, activeOrder.pickup.lng]} icon={restaurantIcon}>
                                <Popup>
                                    <strong>{activeOrder.pickup.name}</strong><br />
                                    Pickup Location
                                </Popup>
                            </Marker>
                            <Marker position={[activeOrder.customer.lat, activeOrder.customer.lng]} icon={customerIcon}>
                                <Popup>
                                    <strong>{activeOrder.customer.name}</strong><br />
                                    Dropoff Location
                                </Popup>
                            </Marker>
                        </>
                    )}
                </MapContainer>

                {/* Floating Info Card */}
                {activeOrder && isOnline && (
                    <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-xl z-[400] w-64 border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-2 border-b pb-2">Active Delivery</h3>
                        <div className="space-y-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start">
                                    <FaStore className="text-red-500 mt-1 mr-2" />
                                    <div>
                                        <p className="text-xs text-gray-500">Pickup</p>
                                        <p className="text-sm font-medium">{activeOrder.pickup.name}</p>
                                    </div>
                                </div>
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${activeOrder.pickup.lat},${activeOrder.pickup.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                    title="Navigate to Pickup"
                                >
                                    <FaLocationArrow className="w-3 h-3" />
                                </a>
                            </div>
                            <div className="flex items-start justify-between">
                                <div className="flex items-start">
                                    <FaUser className="text-green-500 mt-1 mr-2" />
                                    <div>
                                        <p className="text-xs text-gray-500">Dropoff</p>
                                        <p className="text-sm font-medium">{activeOrder.customer.name}</p>
                                    </div>
                                </div>
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${activeOrder.customer.lat},${activeOrder.customer.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                    title="Navigate to Dropoff"
                                >
                                    <FaLocationArrow className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeliveryLiveMap;
