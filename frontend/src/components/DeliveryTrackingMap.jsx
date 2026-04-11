import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { FaLocationArrow, FaBox, FaUser, FaStore, FaCheckCircle, FaWarehouse, FaMapMarkerAlt } from 'react-icons/fa';

// Fix for default Leaflet icons
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

const warehouseIcon = new L.DivIcon({
    className: 'custom-wh-icon',
    html: `<div style="background-color: #F59E0B; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" style="color: white; font-size: 12px;" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M504 144.3c-1.3-3.7-4.1-6.8-7.7-8.6L266.3 11c-6.1-3-13.4-3-19.5 0L15.7 135.7c-3.6 1.8-6.4 4.9-7.7 8.6-1.3 3.7-1 7.8 1 11.2l24 40.2c2 3.4 5.6 5.4 9.4 5.4h427.3c3.8 0 7.4-2.1 9.4-5.4l24-40.2c2-3.4 2.3-7.5 1-11.2zM288 464V320h-64v144c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16zm192-32V224H32v208c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48z"></path></svg></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

const stationIcon = new L.DivIcon({
    className: 'custom-station-icon',
    html: `<div style="background-color: #8B5CF6; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" style="color: white; font-size: 12px;" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M448 0H64C28.7 0 0 28.7 0 64v384c0 35.3 28.7 64 64 64h384c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64zm-16 448H80V64h352v384zM160 144h192v32H160zm0 64h192v32H160zm0 64h128v32H160z"></path></svg></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

// Helper to recenter map
const RecenterMap = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
};

// Main Component
const DeliveryTrackingMap = ({
    status,
    pickupLocation, // { lat, lng, name }
    dropoffLocation, // { lat, lng, name }
    agentLocation, // { lat, lng } (Live from backend)
    pois = { warehouse: null, pickupStation: null }
}) => {
    // Default center (Nairobi)
    const defaultCenter = { lat: -1.2921, lng: 36.8219 };

    // Resolve effective locations (handle missing data with defaults/simulation)
    const effectivePickup = pickupLocation?.lat ? pickupLocation : { ...defaultCenter, name: 'Restaurant' };

    // Simulate dropoff if missing lat/lng (offset by ~1km)
    const effectiveDropoff = dropoffLocation?.lat ? dropoffLocation : {
        lat: effectivePickup.lat - 0.008,
        lng: effectivePickup.lng + 0.008,
        name: dropoffLocation?.name || 'Customer Address'
    };

    const [simulatedLocation, setSimulatedLocation] = useState(effectivePickup);
    const simulationRef = useRef(null);

    // Final location to display
    const currentDriverLocation = agentLocation?.lat ? agentLocation : simulatedLocation;

    // Simulation Logic (Only if live agentLocation is missing)
    useEffect(() => {
        if (agentLocation?.lat) return;

        // If delivered, driver is at dropoff
        if (status === 'delivered') {
            setSimulatedLocation(effectiveDropoff);
            return;
        }

        // If not started or cancelled, driver might be at pickup or undefined
        if (['order_placed', 'seller_confirmed', 'processing', 'ready_for_pickup', 'cancelled'].includes(status)) {
            setSimulatedLocation(effectivePickup);
            return;
        }

        // Active delivery: Simulate movement
        if (['in_transit', 'en_route_to_warehouse', 'transit', 'in_transit'].includes(status)) {
            const start = effectivePickup;
            const end = effectiveDropoff;
            const speed = 0.00005; // Simulation speed

            const move = () => {
                setSimulatedLocation(prev => {
                    const dLat = end.lat - prev.lat;
                    const dLng = end.lng - prev.lng;
                    const distance = Math.sqrt(dLat * dLat + dLng * dLng);

                    if (distance < speed * 2) return prev; // Near enough

                    const ratio = speed / distance;
                    return {
                        lat: prev.lat + dLat * ratio,
                        lng: prev.lng + dLng * ratio
                    };
                });
                simulationRef.current = requestAnimationFrame(move);
            };
            simulationRef.current = requestAnimationFrame(move);
        }

        return () => {
            if (simulationRef.current) cancelAnimationFrame(simulationRef.current);
        };
    }, [status, effectivePickup.lat, effectivePickup.lng, effectiveDropoff.lat, effectiveDropoff.lng, agentLocation]);

    // Build Journey Flow
    const journeyPoints = [
        [effectivePickup.lat, effectivePickup.lng]
    ];
    if (pois.warehouse?.lat) journeyPoints.push([pois.warehouse.lat, pois.warehouse.lng]);
    if (pois.pickupStation?.lat) journeyPoints.push([pois.pickupStation.lat, pois.pickupStation.lng]);
    journeyPoints.push([effectiveDropoff.lat, effectiveDropoff.lng]);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-[400px] relative z-0">
            <MapContainer
                center={[effectivePickup.lat, effectivePickup.lng]}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <RecenterMap center={currentDriverLocation} />

                {/* Journey Flow Polyline */}
                <Polyline
                    positions={journeyPoints}
                    color="#D1D5DB"
                    weight={3}
                    dashArray="5, 10"
                />

                {/* Real-time Flow (from origin to current driver location) */}
                <Polyline
                    positions={[journeyPoints[0], [currentDriverLocation.lat, currentDriverLocation.lng]]}
                    color="#2563EB"
                    weight={4}
                />

                {/* Pickup Marker */}
                <Marker position={[effectivePickup.lat, effectivePickup.lng]} icon={restaurantIcon}>
                    <Popup>
                        <div className="p-1">
                            <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Origin (Seller)</p>
                            <p className="text-xs font-bold text-gray-900">{effectivePickup.name}</p>
                        </div>
                    </Popup>
                </Marker>

                {/* Warehouse Marker */}
                {pois.warehouse?.lat && (
                    <Marker position={[pois.warehouse.lat, pois.warehouse.lng]} icon={warehouseIcon}>
                        <Popup>
                            <div className="p-1">
                                <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">Warehouse</p>
                                <p className="text-xs font-bold text-gray-900">{pois.warehouse.name}</p>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Pickup Station Marker */}
                {pois.pickupStation?.lat && (
                    <Marker position={[pois.pickupStation.lat, pois.pickupStation.lng]} icon={stationIcon}>
                        <Popup>
                            <div className="p-1">
                                <p className="text-[10px] font-bold text-purple-600 uppercase mb-1">Pickup Station</p>
                                <p className="text-xs font-bold text-gray-900">{pois.pickupStation.name}</p>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Dropoff Marker */}
                <Marker position={[effectiveDropoff.lat, effectiveDropoff.lng]} icon={customerIcon}>
                    <Popup>
                        <div className="p-1">
                            <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Your Delivery Address</p>
                            <p className="text-xs font-bold text-gray-900">{effectiveDropoff.name}</p>
                        </div>
                    </Popup>
                </Marker>

                {/* Driver Marker */}
                {['in_transit', 'transit', 'delivered', 'in_transit'].includes(status) && (
                    <Marker position={[currentDriverLocation.lat, currentDriverLocation.lng]} icon={driverIcon}>
                        <Popup>
                            <div className="p-1">
                                <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">
                                    {agentLocation?.lat ? 'Live: Delivery Agent' : 'Simulated: Delivery Agent'}
                                </p>
                                <p className="text-xs font-bold text-gray-900">{status === 'delivered' ? 'Arrived at Destination' : 'On the way to you'}</p>
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>

            <div className="absolute top-2 right-2 bg-white/90 px-3 py-1 rounded text-xs font-semibold shadow z-[400] flex items-center gap-2">
                {agentLocation?.lat && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
                {agentLocation?.lat ? 'Live Tracking' : 'Tracking'} • {status.replace(/_/g, ' ')}
            </div>
        </div>
    );
};

export default DeliveryTrackingMap;
