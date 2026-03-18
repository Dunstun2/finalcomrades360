import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { FaBox, FaSync, FaSignOutAlt, FaExclamationCircle } from 'react-icons/fa';
import DeliveryTaskConsole from '../../components/delivery/DeliveryTaskConsole';
import HandoverCodeWidget from '../../components/delivery/HandoverCodeWidget';
import { Link } from 'react-router-dom';

const StationManagerDashboard = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);
  const [station, setStation] = useState(null);
  const [counts, setCounts] = useState({ total: 0, enRouteToWarehouse: 0, atWarehouse: 0, readyForPickup: 0 });
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const stationType = user?.stationType || station?.stationType;

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/station-manager/dashboard');
      console.log('[DEBUG] Station Dashboard Data:', res.data);
      setOrders(res.data.orders || []);
      setStation(res.data.station || null);
      setCounts(res.data.counts || { total: 0, enRouteToWarehouse: 0, atWarehouse: 0, readyForPickup: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load station dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleMarkWarehouseReceived = async (e, orderId) => {
    e.stopPropagation();
    try {
      await api.post(`/station-manager/orders/${orderId}/warehouse-received`);
      await loadDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark order at warehouse');
    }
  };

  const handleMarkReadyForPickup = async (e, orderId) => {
    e.stopPropagation();
    try {
      await api.post(`/station-manager/orders/${orderId}/ready-for-pickup`);
      await loadDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark ready for pickup');
    }
  };

  const toggleExpand = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const title = useMemo(() => {
    if (stationType === 'warehouse') return 'Warehouse Hub Dashboard (V4)';
    if (stationType === 'pickup_station') return 'Pick Station Manager (V4)';
    return 'Station Manager Dashboard (V4)';
  }, [stationType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h1>
              </div>
              <p className="text-sm text-gray-500 font-medium italic mt-1 uppercase tracking-wider">
                Managed by {station?.stationName || user?.stationName || user?.name}
              </p>
            </div>
            <div className="flex gap-2 self-start md:self-auto">
              <button
                onClick={loadDashboard}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
              >
                <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <FaSignOutAlt /> Sign out
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700 flex items-center gap-3 animate-pulse">
            <FaExclamationCircle className="h-5 w-5" /> {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Shipments" value={counts.total} color="blue" />
          <StatCard label="En Route" value={counts.enRouteToWarehouse} color="orange" />
          <StatCard label="At Warehouse" value={counts.atWarehouse} color="emerald" />
          <StatCard label="Ready / Station" value={counts.readyForPickup} color="indigo" />
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-black text-gray-800 uppercase tracking-widest">Station Assignments</h2>
            <span className="text-[10px] font-black bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{orders.length} Records</span>
          </div>

          {orders.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-20 text-center text-gray-400">
              <FaBox className="mx-auto h-12 w-12 opacity-20 mb-4" />
              <p className="font-bold">No orders currently at this station.</p>
              <p className="text-xs">Incoming shipments will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => (
                <DeliveryTaskConsole
                  key={order.id}
                  order={order}
                  isExpanded={expandedOrderId === order.id}
                  onToggleExpand={() => toggleExpand(order.id)}
                  agentSharePercent={70} // Match delivery agent dashboard for visual consistency
                >
                  <div className="flex flex-col gap-4 w-full mt-2 pt-4 border-t border-gray-50">
                    {stationType === 'warehouse' ? (
                      // Warehouse Hub: Receive from Agent
                      ['en_route_to_warehouse', 'super_admin_confirmed', 'seller_confirmed'].includes(order.status) ? (
                        <HandoverCodeWidget
                          orderId={order.id}
                          handoverType="agent_to_warehouse"
                          mode="receiver"
                          onConfirmed={loadDashboard}
                        />
                      ) : (
                        <span className="px-4 py-2 text-[10px] font-black rounded-xl bg-gray-100 text-gray-500 uppercase tracking-widest self-end">
                          {order.status === 'at_warehouse' ? '✓ Received at Warehouse' : 'Processed'}
                        </span>
                      )
                    ) : (
                      // Pickup Station: Receive from Agent OR Give to Customer
                      <div className="flex flex-col gap-3">
                        {['at_warehouse', 'en_route_to_warehouse', 'super_admin_confirmed', 'seller_confirmed'].includes(order.status) ? (
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Receive from Delivery Agent</p>
                            <HandoverCodeWidget
                              orderId={order.id}
                              handoverType="agent_to_station"
                              mode="receiver"
                              onConfirmed={loadDashboard}
                            />
                          </div>
                        ) : order.status === 'ready_for_pickup' ? (
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Handover to Customer</p>
                            <p className="text-[10px] text-gray-500 font-medium">Generate a code and give it to the customer. They will enter it to confirm collection.</p>
                            <HandoverCodeWidget
                              orderId={order.id}
                              handoverType="station_to_customer"
                              mode="giver"
                              buttonLabel="Generate Pickup Code"
                              onConfirmed={loadDashboard}
                            />
                          </div>
                        ) : (
                          <span className="px-4 py-2 text-[10px] font-black rounded-xl bg-gray-100 text-gray-500 uppercase tracking-widest self-end">
                            {order.status === 'completed' || order.status === 'delivered' ? '✓ Handed Over to Customer' : 'Processed'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </DeliveryTaskConsole>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color = 'blue' }) => {
  const colors = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    orange: 'text-orange-600 bg-orange-50 border-orange-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100'
  };

  return (
    <div className={`bg-white border rounded-2xl p-4 shadow-sm transition-all hover:shadow-md ${colors[color].split(' ')[2]}`}>
      <p className="text-[10px] uppercase tracking-[0.15em] font-black text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-black ${colors[color].split(' ')[0]}`}>{value || 0}</p>
    </div>
  );
};

export default StationManagerDashboard;
