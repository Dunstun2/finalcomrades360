import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { FaMotorcycle, FaStore, FaWarehouse, FaMapMarkerAlt, FaUser, FaSearch, FaSync, FaInfoCircle } from 'react-icons/fa';
import api from '../../services/api';
import AdminPasswordDialog from '../../components/AdminPasswordDialog';

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

// --- Custom Icons ---
const agentIcon = (vehicleType) => new L.DivIcon({
    className: 'custom-agent-icon',
    html: `<div style="background-color: #10B981; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); color: white;">
        <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="18px" width="18px" xmlns="http://www.w3.org/2000/svg">
            <path d="M504.6 244.6C495 224.2 473.6 211.2 451.2 211.2H427.7C392.5 211.2 360.5 233.1 346.1 265.4L329.4 303.1L274.6 200.7C275.5 197.8 276 194.8 276 191.6V64C276 28.7 247.3 0 212 0H100C64.7 0 36 28.7 36 64V191.6C36 197.3 36.7 203 38.1 208.3L3.1 364.6C-2.3 388.9 12.3 413.5 36.6 418.9C39.4 419.5 42.2 419.8 45 419.8C66.5 419.8 86.4 406.4 94.1 385.4L112.5 334.6L130.9 385.4C138.6 406.4 158.5 419.8 180 419.8C182.8 419.8 185.6 419.5 188.4 418.9C212.7 413.5 227.3 388.9 221.9 364.6L186.9 208.3C188.3 203 189 197.3 189 191.6V64C189 51.5 199.1 41.3 211.6 41.3H212.4C224.9 41.3 235 51.5 235 64V191.6C235 191.9 235 192.1 235 192.4L303.4 330.4C308.8 341.2 320 348 332.1 348H444.6L437.1 270.3C436.2 260.6 427.9 253.3 418.2 253.3H400C389 253.3 380 262.3 380 273.3V285.4C380 293.7 373.3 300.4 365 300.4C356.7 300.4 350 293.7 350 285.4V273.3C350 245.7 372.4 223.3 400 223.3H418.2C442.5 223.3 463.3 241.6 466.1 267L471.1 319.4L501.1 326C525.4 331.4 540 356 534.6 380.3C529.2 404.6 504.6 419.2 480.3 413.8L450.3 407.2C446.4 406.4 442.8 404.7 439.7 402.4V480C439.7 497.7 425.4 512 407.7 512C390 512 375.7 497.7 375.7 480V454L439.7 468.2V480L407.7 473.8L375.7 480L343.7 473.8V413.2H427.7V378.1L389.3 370.4L343.3 361.3L354.7 335.5L400.7 344.6L427.7 350V338.1C427.7 331.5 423.5 325.6 417.3 323.4L346.1 265.4V265.4z"></path>
        </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

const sellerIcon = new L.DivIcon({
    className: 'custom-seller-icon',
    html: `<div style="background-color: #2563EB; width: 26px; height: 26px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 640 512" style="color: white; font-size: 13px;" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M608 128H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h576c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32zm-512 64H64v-32h32v32zm128 0h-32v-32h32v32zm128 0h-32v-32h32v32zm128 0h-32v-32h32v32zM32 256v192c0 17.67 14.33 32 32 32h576c17.67 0 32-14.33 32-32V256H32zm448 128h-32v-32h32v32zm-128 0h-32v-32h32v32zm-128 0h-32v-32h32v32zm-128 0H64v-32h32v32z"></path></svg></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
});

const warehouseIcon = new L.DivIcon({
    className: 'custom-wh-icon',
    html: `<div style="background-color: #F59E0B; width: 26px; height: 26px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" style="color: white; font-size: 13px;" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M504 144.3c-1.3-3.7-4.1-6.8-7.7-8.6L266.3 11c-6.1-3-13.4-3-19.5 0L15.7 135.7c-3.6 1.8-6.4 4.9-7.7 8.6-1.3 3.7-1 7.8 1 11.2l24 40.2c2 3.4 5.6 5.4 9.4 5.4h427.3c3.8 0 7.4-2.1 9.4-5.4l24-40.2c2-3.4 2.3-7.5 1-11.2zM288 464V320h-64v144c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16zm192-32V224H32v208c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48z"></path></svg></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
});

const stationIcon = new L.DivIcon({
    className: 'custom-station-icon',
    html: `<div style="background-color: #8B5CF6; width: 26px; height: 26px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" style="color: white; font-size: 13px;" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M448 0H64C28.7 0 0 28.7 0 64v384c0 35.3 28.7 64 64 64h384c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64zm-16 448H80V64h352v384zM160 144h192v32H160zm0 64h192v32H160zm0 64h128v32H160z"></path></svg></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
});

const orderIcon = new L.DivIcon({
    className: 'custom-order-icon',
    html: `<div style="background-color: #EF4444; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" style="color: white; font-size: 14px;" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"></path></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
});

// --- Helper Components ---
const RecenterMap = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, 13);
    }, [center, map]);
    return null;
};

// --- Utils ---
const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

const AdminLiveMap = () => {
    const [data, setData] = useState({ agents: [], orders: [], pois: { warehouses: [], pickupStations: [] } });
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [mapCenter, setMapCenter] = useState([-1.2921, 36.8219]); // Nairobi Center

    // Assignment State
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [pendingAssignment, setPendingAssignment] = useState(null);
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

    const fetchData = useCallback(async () => {
        try {
            const res = await api.get('/admin/delivery/global-map-data');
            if (res.data.success) {
                setData(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch global map data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Update every 30s
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleOrderSelect = (order) => {
        if (selectedOrder?.id === order.id) {
            setSelectedOrder(null);
        } else {
            setSelectedOrder(order);
            setMapCenter([order.origin.lat, order.origin.lng]);
        }
    };

    const initiateAssignment = (agentId) => {
        if (!selectedOrder) {
            setStatusMessage({ type: 'error', text: 'Please select an order from the list first.' });
            setTimeout(() => setStatusMessage({ type: '', text: '' }), 3000);
            return;
        }
        setPendingAssignment({ orderId: selectedOrder.id, deliveryAgentId: agentId });
        setIsPasswordDialogOpen(true);
    };

    const handleAssignConfirm = async (reason, password) => {
        if (!pendingAssignment) return;
        try {
            const { orderId, deliveryAgentId } = pendingAssignment;
            await api.patch(`/orders/${orderId}/assign`, { deliveryAgentId, password });

            // Add tracking update
            await api.post(`/orders/${orderId}/tracking`, {
                status: 'Processing',
                message: 'Delivery agent assigned via Live Map proximity logic.',
                location: null
            });

            setStatusMessage({ type: 'success', text: 'Agent assigned successfully!' });
            fetchData();
            setSelectedOrder(null);
        } catch (error) {
            setStatusMessage({ type: 'error', text: error.response?.data?.error || 'Assignment failed' });
        } finally {
            setIsPasswordDialogOpen(false);
            setPendingAssignment(null);
            setTimeout(() => setStatusMessage({ type: '', text: '' }), 4000);
        }
    };

    const getNearestAgents = (order) => {
        if (!order || !data.agents.length) return [];
        return data.agents
            .map(agent => ({
                ...agent,
                distance: getDistance(order.origin.lat, order.origin.lng, agent.location.lat, agent.location.lng)
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 3);
    };

    const filteredOrders = data.orders.filter(o =>
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.origin.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-100px)] overflow-hidden bg-gray-100 rounded-xl border border-gray-200 shadow-sm">
            {/* Sidebar / Job List */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <FaMapMarkerAlt className="text-blue-600" /> Global Live Map
                    </h2>
                    <div className="relative mt-4">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input
                            type="text"
                            placeholder="Search Order # or Location..."
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-20 text-gray-500 animate-pulse text-sm">Loading markers...</div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 italic text-sm">No active jobs found.</div>
                    ) : (
                        filteredOrders.map(order => (
                            <button
                                key={order.id}
                                onClick={() => handleOrderSelect(order)}
                                className={`w-full text-left p-3 rounded-xl border transition-all ${selectedOrder?.id === order.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-100 hover:border-blue-200 hover:bg-gray-50'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-blue-700 text-xs">#{order.orderNumber}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-tight ${order.status === 'in_transit' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {order.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-600 truncate mb-1">From: <span className="font-medium text-gray-900">{order.origin.name}</span></div>
                                <div className="text-xs text-gray-500 truncate italic">To: {order.destination.name}</div>

                                {selectedOrder?.id === order.id && (
                                    <div className="mt-3 pt-2 border-t border-blue-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Nearest Agents</p>
                                        <div className="space-y-1.5">
                                            {getNearestAgents(order).map(agent => (
                                                <div key={agent.id} className="flex justify-between items-center text-[11px] bg-white p-1.5 rounded-lg border border-blue-100 shadow-sm">
                                                    <span className="font-medium truncate">{agent.name}</span>
                                                    <span className="text-blue-600 font-bold ml-2 whitespace-nowrap">{agent.distance.toFixed(2)} km</span>
                                                </div>
                                            ))}
                                            {getNearestAgents(order).length === 0 && <p className="text-[10px] text-red-500 italic">No online agents nearby</p>}
                                        </div>
                                    </div>
                                )}
                            </button>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500">
                    <span>{data.agents.length} Online Agents</span>
                    <button onClick={fetchData} className="p-2 hover:bg-white rounded-full transition-colors"><FaSync className={loading ? 'animate-spin' : ''} /></button>
                </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative">
                <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <RecenterMap center={mapCenter} />

                    {/* Agents */}
                    {data.agents.map(agent => (
                        <Marker key={agent.id} position={[agent.location.lat, agent.location.lng]} icon={agentIcon(agent.vehicleType)}>
                            <Popup className="custom-popup">
                                <div className="p-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold uppercase">{agent.name[0]}</div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm leading-tight">{agent.name}</h4>
                                            <p className="text-[10px] text-gray-500">{agent.vehicleType || 'Courier'}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1 border-t pt-2 border-gray-100">
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <FaInfoCircle className="text-gray-400" />
                                            <span>{agent.phone || 'N/A'}</span>
                                        </div>
                                        <button
                                            onClick={() => initiateAssignment(agent.id)}
                                            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] py-1.5 rounded transition-colors font-bold uppercase disabled:opacity-50"
                                            disabled={!selectedOrder}
                                        >
                                            {selectedOrder ? 'Assign This Order' : 'Select Order First'}
                                        </button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Orders (Origins and Destinations) */}
                    {data.orders.map(order => (
                        <React.Fragment key={order.id}>
                            {/* Origin (Seller or Warehouse) */}
                            <Marker position={[order.origin.lat, order.origin.lng]} icon={order.deliveryType === 'warehouse_to_customer' ? warehouseIcon : sellerIcon}>
                                <Popup>
                                    <div className="p-1">
                                        <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Order Pickup origin</p>
                                        <p className="text-xs font-bold text-gray-900">{order.origin.name}</p>
                                        <p className="text-[10px] text-gray-500 mt-1">Order #{order.orderNumber}</p>
                                    </div>
                                </Popup>
                            </Marker>

                            {/* Destination (Customer or Station) */}
                            <Marker position={[order.destination.lat, order.destination.lng]} icon={orderIcon}>
                                <Popup>
                                    <div className="p-1">
                                        <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Delivery target</p>
                                        <p className="text-xs font-bold text-gray-900">{order.destination.name}</p>
                                        <p className="text-[10px] text-gray-500 mt-1">Order #{order.orderNumber}</p>
                                    </div>
                                </Popup>
                            </Marker>

                            {/* Visual link between origin and dest */}
                            {selectedOrder?.id === order.id && (
                                <Polyline
                                    positions={[
                                        [order.origin.lat, order.origin.lng],
                                        [order.destination.lat, order.destination.lng]
                                    ]}
                                    color="#3B82F6"
                                    dashArray="10, 10"
                                    weight={2}
                                />
                            )}
                        </React.Fragment>
                    ))}

                    {/* Infrastructure POIs */}
                    {data.pois.warehouses.map(wh => (
                        <Marker key={`wh-${wh.id}`} position={[wh.lat, wh.lng]} icon={warehouseIcon}>
                            <Popup>
                                <div className="p-1 text-xs">
                                    <p className="font-bold text-orange-600">Warehouse: {wh.name}</p>
                                    <p className="text-gray-500 mt-1">{wh.address}</p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {data.pois.pickupStations.map(ps => (
                        <Marker key={`ps-${ps.id}`} position={[ps.lat, ps.lng]} icon={stationIcon}>
                            <Popup>
                                <div className="p-1 text-xs">
                                    <p className="font-bold text-purple-600">Pickup Station: {ps.name}</p>
                                    <p className="text-gray-500 mt-1">{ps.location}</p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                </MapContainer>

                {/* Legend Overlay */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-gray-200 shadow-xl z-[400] flex items-center justify-center gap-6 text-[10px] font-bold text-gray-600 uppercase">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div> Agent</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600"></div> Seller</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Warehouse</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Station</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> Job</div>
                </div>

                {statusMessage.text && (
                    <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-lg shadow-xl border text-sm font-bold flex items-center gap-2 animate-bounce
                        ${statusMessage.type === 'success' ? 'bg-green-500 border-green-600 text-white' : 'bg-red-500 border-red-600 text-white'}`}>
                        {statusMessage.text}
                    </div>
                )}

                <AdminPasswordDialog
                    isOpen={isPasswordDialogOpen}
                    onClose={() => setIsPasswordDialogOpen(false)}
                    onConfirm={handleAssignConfirm}
                    title="Confirm Map Assignment"
                    actionDescription="Assigning a delivery agent based on live proximity data."
                />
            </div>
        </div>
    );
};

export default AdminLiveMap;
