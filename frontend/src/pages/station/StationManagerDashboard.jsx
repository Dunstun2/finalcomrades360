import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { FaBox, FaSync, FaSignOutAlt, FaExclamationCircle, FaUndoAlt, FaCheckCircle, FaArrowRight, FaSearch } from 'react-icons/fa';
import DeliveryTaskConsole from '../../components/delivery/DeliveryTaskConsole';
import HandoverCodeWidget from '../../components/delivery/HandoverCodeWidget';
import { getOrderDeliveryTask } from '../../components/delivery/DeliveryTaskComponents';
import { resolveImageUrl } from '../../utils/imageUtils';
import { formatPrice } from '../../utils/currency';
import { Link } from 'react-router-dom';

const StationManagerDashboard = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [activeFilter, setActiveFilter] = useState('active');
  const [station, setStation] = useState(null);
  const [counts, setCounts] = useState({ total: 0, enRoute: 0, atStation: 0, finalDestination: 0, returns: 0 });
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [expandedReturnId, setExpandedReturnId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const stationType = user?.stationType || station?.stationType;

  const loadDashboard = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const res = await api.get('/station-manager/dashboard', {
        params: { filter: activeFilter }
      });
      console.log('[DEBUG] Station Dashboard Data:', res.data);
      setOrders(res.data.orders || []);
      setReturns(res.data.returns || []);
      setStation(res.data.station || null);
      setCounts(res.data.counts || { total: 0, enRoute: 0, atStation: 0, finalDestination: 0, returns: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load station dashboard');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    // Keep station dashboard live by reacting to global real-time updates.
    const onRealtimeUpdate = (event) => {
      const scope = event?.detail?.scope || event?.detail?.payload?.scope;
      const eventName = event?.detail?.eventName;
      if (['orders', 'delivery', 'returns', 'admin'].includes(scope) || eventName === 'orderStatusUpdate') {
        loadDashboard(true);
      }
    };

    window.addEventListener('realtime:data-updated', onRealtimeUpdate);
    return () => window.removeEventListener('realtime:data-updated', onRealtimeUpdate);
  }, [loadDashboard]);

  useEffect(() => {
    // Fallback sync in case some backend actions don't emit socket events yet.
    const interval = setInterval(() => {
      loadDashboard(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [loadDashboard]);

  const handleMarkWarehouseReceived = useCallback(async (e, orderId) => {
    e.stopPropagation();
    try {
      await api.post(`/station-manager/orders/${orderId}/warehouse-received`);
      await loadDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark order at warehouse');
    }
  }, [loadDashboard]);

  const handleMarkReadyForPickup = useCallback(async (e, orderId) => {
    e.stopPropagation();
    try {
      await api.post(`/station-manager/orders/${orderId}/ready-for-pickup`);
      await loadDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark ready for pickup');
    }
  }, [loadDashboard]);

  const handleMarkReturnReceived = useCallback(async (returnId) => {
    try {
      const msg = stationType === 'warehouse' ? 'Confirm return received from agent/customer at warehouse?' : 'Confirm that you have received this return item from the customer?';
      if (!window.confirm(msg)) return;
      const endpoint = stationType === 'warehouse' ? `/station-manager/returns/${returnId}/receive-warehouse` : `/station-manager/returns/${returnId}/receive`;
      await api.post(endpoint);
      await loadDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to confirm return reception');
    }
  }, [stationType, loadDashboard]);

  const toggleExpand = useCallback((orderId) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
    setExpandedReturnId(null);
  }, []);

  const toggleExpandReturn = useCallback((returnId) => {
    setExpandedReturnId(prev => prev === returnId ? null : returnId);
    setExpandedOrderId(null);
  }, []);

  const ReturnRequestConsole = ({ ret, isExpanded, onToggleExpand, onConfirmDropoff }) => {
    const items = ret.items || [];
    
    return (
      <div className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 ${isExpanded ? 'ring-2 ring-pink-500 border-transparent shadow-xl' : 'hover:border-pink-300'}`}>
        <div 
          onClick={onToggleExpand}
          className="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-2xl bg-pink-50 flex items-center justify-center text-xl text-pink-600">
              <FaUndoAlt />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Return #{ret.id}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  ret.status === 'at_pick_station' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-pink-100 text-pink-700 border-pink-200'
                }`}>
                  {ret.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Order #{ret.order?.orderNumber} • {items.length} items • {ret.user?.name || 'Customer'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Reason</p>
              <p className="text-sm font-black text-pink-600">{ret.reasonCategory}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-full text-gray-300">
              <FaArrowRight className={isExpanded ? '-rotate-90 transition-transform' : ''} />
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="px-5 pb-6 border-t border-gray-100 bg-gray-50/30 animate-in slide-in-from-top-2">
            <div className="mt-4 space-y-3">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Items in Return Request</h4>
                  {items.map((item, idx) => {
                    const orderItem = ret.order?.OrderItems?.find(oi => Number(oi.id) === Number(item.orderItemId));
                    const product = orderItem?.Product || orderItem?.FastFood;
                    const imageUrl = product?.coverImage || product?.mainImage || product?.images?.[0];

                return (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-white border border-gray-100 rounded-xl shadow-sm">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-50 text-emerald-600">
                      {imageUrl ? (
                        <img 
                          src={resolveImageUrl(imageUrl)} 
                          alt="Product" 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = ''; e.currentTarget.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-300"><FaBox /></div>'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <FaBox />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-gray-900 truncate">{orderItem?.name || `Item #${item.orderItemId}`}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">
                          Qty: {item.quantity} • {item.reason || 'Standard Return'}
                        </p>
                        {orderItem?.price && (
                          <p className="text-[10px] font-black text-gray-900">{formatPrice(orderItem.price)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between items-center">
                 <div className="text-[10px] text-gray-500 max-w-[60%]">
                    <p className="font-bold uppercase text-gray-400 mb-1">Customer Notes</p>
                    <p className="italic">{ret.description || 'No additional notes provided.'}</p>
                 </div>
                              {ret.status === 'item_received' ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black border border-indigo-100">
                      <FaCheckCircle /> Received at Warehouse
                    </div>
                  ) : (ret.status === 'at_pick_station' && stationType === 'warehouse') || (ret.status === 'item_collected' && stationType === 'warehouse') ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); onConfirmDropoff(ret.id); }}
                      className={`flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black hover:opacity-90 transition-colors shadow-lg`}
                    >
                      <FaCheckCircle /> Confirm Warehouse Receipt
                    </button>
                  ) : (ret.status === 'approved' && stationType === 'pickup_station') || (ret.status === 'at_pick_station' && stationType === 'pickup_station') ? (
                    <div className="w-full space-y-2">
                       <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Release Return to Agent</p>
                       <p className="text-[10px] text-gray-500 font-medium">Generate a code for the delivery agent to confirm they have collected this return item.</p>
                       <HandoverCodeWidget
                         orderId={ret.orderId}
                         taskId={getOrderDeliveryTask(ret.order)?.id}
                         handoverType={getOrderDeliveryTask(ret.order)?.deliveryType || 'pickup_station_to_warehouse'}
                         mode="giver"
                         buttonLabel="Generate Release Code"
                         onConfirmed={loadDashboard}
                       />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black border border-emerald-100">
                      <FaCheckCircle /> Processed
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
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
    <div className="min-h-screen bg-gray-50 p-2 md:p-4 lg:p-6">
      <div className="w-full space-y-4">
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total Shipments" value={counts.total} color="blue" active={activeFilter === 'total'} onClick={() => setActiveFilter('total')} />
          <StatCard label="En Route" value={counts.enRoute} color="orange" active={activeFilter === 'enRoute'} onClick={() => setActiveFilter('enRoute')} />
          <StatCard label={stationType === 'warehouse' ? "At Warehouse" : "At Station"} value={counts.atStation} color="emerald" active={activeFilter === 'atStation'} onClick={() => setActiveFilter('atStation')} />
          <StatCard label="Final destination" value={counts.finalDestination} color="indigo" active={activeFilter === 'finalDestination'} onClick={() => setActiveFilter('finalDestination')} />
          {stationType && (
            <StatCard label="Returns" value={counts.returns} color="pink" active={activeFilter === 'returns'} onClick={() => setActiveFilter('returns')} />
          )}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between px-2 gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black text-gray-800 uppercase tracking-widest">Station Assignments</h2>
              <span className="text-[10px] font-black bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{orders.length + returns.length} Records</span>
            </div>
            
            <div className="w-full md:max-w-xs relative text-gray-600">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order # or tracking #..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
              />
            </div>
          </div>

          {/* Integrated Returns & Orders List */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            {/* Returns (Show when filter matches return status) */}
            {returns.map((ret) => {
              const matchesSearch = !searchQuery || 
                (ret.order?.orderNumber && ret.order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (ret.order?.trackingNumber && ret.order.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()));

              const shouldShowReturn = matchesSearch && (
                activeFilter === 'active' || 
                activeFilter === 'total' || 
                activeFilter === 'returns' ||
                (activeFilter === 'atStation' && (stationType === 'warehouse' ? ['item_received', 'at_pick_station', 'item_collected'].includes(ret.status) : ['approved', 'at_pick_station'].includes(ret.status))) ||
                (activeFilter === 'enRoute' && (stationType === 'warehouse' ? ['approved', 'at_pick_station', 'item_collected'].includes(ret.status) : ['pending'].includes(ret.status)))
              );

              if (!shouldShowReturn) return null;

              return (
                <ReturnRequestConsole
                  key={ret.id}
                  ret={ret}
                  isExpanded={expandedReturnId === ret.id}
                  onToggleExpand={() => toggleExpandReturn(ret.id)}
                  onConfirmDropoff={handleMarkReturnReceived}
                />
              );
            })}
          </div>

          {orders.length === 0 && returns.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-20 text-center text-gray-400">
              <FaBox className="mx-auto h-12 w-12 opacity-20 mb-4" />
              <p className="font-bold">No orders or returns currently at this station.</p>
              <p className="text-xs">Incoming shipments or returns will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              {orders.map((order) => {
                const matchesSearch = !searchQuery || 
                  (order.orderNumber && order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (order.trackingNumber && order.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()));

                const shouldShow = matchesSearch && (activeFilter === 'active' || activeFilter === 'total' || 
                                   (activeFilter === 'enRoute' && (stationType === 'warehouse' ? ['en_route_to_warehouse', 'seller_confirmed', 'super_admin_confirmed'].includes(order.status) : ['in_transit', 'en_route_to_pick_station', 'processing', 'awaiting_delivery_assignment'].includes(order.status))) ||
                                   (activeFilter === 'atStation' && (stationType === 'warehouse' ? ['at_warehouse', 'at_warehouse', 'processing', 'awaiting_delivery_assignment', 'return_at_warehouse'].includes(order.status) : ['at_pick_station', 'ready_for_pickup', 'return_at_pick_station'].includes(order.status))) ||
                                   (activeFilter === 'finalDestination' && (stationType === 'warehouse' ? ['en_route_to_pick_station', 'in_transit', 'shipped', 'delivered', 'completed'].includes(order.status) : ['delivered', 'completed'].includes(order.status)))
                                  );

                if (!shouldShow) return null;

                return (
                  <DeliveryTaskConsole
                    key={order.id}
                    order={order}
                    isExpanded={expandedOrderId === order.id}
                    onToggleExpand={() => toggleExpand(order.id)}
                    agentSharePercent={70}
                  >
                    <div className="flex flex-col gap-4 w-full mt-2 pt-4 border-t border-gray-50">
                      {stationType === 'warehouse' ? (
                        <div className="flex flex-col gap-3">
                          {['en_route_to_warehouse', 'super_admin_confirmed', 'seller_confirmed', 'in_transit'].includes(order.status) && 
                           (order.status !== 'in_transit' || ['agent_to_warehouse', 'seller_to_warehouse'].includes(order.deliveryType)) ? (() => {
                            const activeTask = getOrderDeliveryTask(order);
                            return (
                            <div className="space-y-2">
                               <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Receive from Agent / Seller</p>
                               <HandoverCodeWidget
                                 orderId={order.id}
                                 taskId={activeTask?.id}
                                 handoverType="agent_to_warehouse"
                                 mode="receiver"
                                 onConfirmed={loadDashboard}
                               />
                            </div>
                            );
                           })() : null
                          }
                          {['at_warehouse', 'at_warehouse', 'ready_for_pickup', 'awaiting_delivery_assignment', 'processing', 'en_route_to_pick_station', 'in_transit', 'shipped'].includes(order.status) && (() => {
                            const activeTask = getOrderDeliveryTask(order);
                            const isAgentWaiting = activeTask?.status === 'arrived_at_pickup';
                            return (
                            <div className={`space-y-2 p-3 rounded-2xl transition-all ${isAgentWaiting ? 'bg-amber-50 border-2 border-amber-500 shadow-lg animate-pulse' : ''}`}>
                               <div className="flex justify-between items-center">
                                 <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Release to Delivery Agent</p>
                                 {isAgentWaiting && (
                                   <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Agent Waiting</span>
                                 )}
                               </div>
                               <HandoverCodeWidget
                                 orderId={order.id}
                                 taskId={activeTask?.id}
                                 handoverType="warehouse_to_agent"
                                 mode="giver"
                                 onConfirmed={loadDashboard}
                               />
                            </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {['in_transit', 'en_route_to_pick_station', 'super_admin_confirmed', 'seller_confirmed'].includes(order.status) ? (
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Receive from Delivery Agent</p>
                              <HandoverCodeWidget
                                orderId={order.id}
                                handoverType="agent_to_station"
                                mode="receiver"
                                onConfirmed={loadDashboard}
                              />
                            </div>
                          ) : ['ready_for_pickup', 'at_pick_station'].includes(order.status) ? (
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color = 'blue', active, onClick }) => {
  const colors = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100 ring-blue-300',
    orange: 'text-orange-600 bg-orange-50 border-orange-100 ring-orange-300',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100 ring-emerald-300',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100 ring-indigo-300',
    pink: 'text-pink-600 bg-pink-50 border-pink-100 ring-pink-300'
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white border rounded-2xl p-4 shadow-sm transition-all hover:shadow-md cursor-pointer select-none ${active ? `ring-2 ${colors[color].split(' ')[3]} bg-gray-50/50 scale-[1.02]` : ''} ${colors[color].split(' ')[2]}`}
    >
      <p className="text-[10px] uppercase tracking-[0.15em] font-black text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-black ${colors[color].split(' ')[0]}`}>{value || 0}</p>
    </div>
  );
};

export default StationManagerDashboard;
