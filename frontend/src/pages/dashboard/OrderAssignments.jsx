import React, { useEffect, useState, useMemo } from 'react';
import api from '../../services/api';
import { DeliveryTaskBadge, DeliveryTypeBadge, getOrderDeliveryTask } from '../../components/delivery/DeliveryTaskComponents';
import AdminPasswordDialog from '../../components/AdminPasswordDialog';

export default function OrderAssignments() {
  const [orders, setOrders] = useState([]);
  const [deliveryAgents, setDeliveryAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState(null);

  const resetAlerts = () => { setError(''); setSuccess(''); };

  const loadData = async () => {
    try {
      const [ordersRes, agentsRes] = await Promise.all([
        api.get('/orders'),
        api.get('/admin/delivery/agents')
      ]);
      const ordersData = Array.isArray(ordersRes.data.orders) ? ordersRes.data.orders : (Array.isArray(ordersRes.data) ? ordersRes.data : []);
      setOrders(ordersData);
      setDeliveryAgents(Array.isArray(agentsRes.data) ? agentsRes.data : []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load data');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const confirmAssign = (orderId, deliveryAgentId) => {
    setPendingAssignment({ orderId, deliveryAgentId });
    setIsPasswordDialogOpen(true);
  };

  const assignDelivery = async (reason, password) => {
    if (!pendingAssignment) return;
    const { orderId, deliveryAgentId } = pendingAssignment;
    resetAlerts();
    try {
      await api.patch(`/orders/${orderId}/assign`, {
        deliveryAgentId,
        password
      });
      setSuccess('Delivery assignment updated');

      // Add tracking update for assignment
      const trackingData = {
        status: 'Processing', // Assuming assignment happens during processing
        message: 'Delivery agent assigned',
        location: null
      };
      await api.post(`/orders/${orderId}/tracking`, trackingData);

      loadData();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to assign delivery agent');
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    resetAlerts();
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      setSuccess('Order status updated');
      loadData();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to update order status');
    }
  };

  // Helper functions for matching
  const matchesLocation = (orderLoc, agentLoc) => {
    if (!orderLoc || !agentLoc) return false;
    const a = String(orderLoc).toLowerCase();
    const b = String(agentLoc).toLowerCase();
    return a.includes(b) || b.includes(a);
  };

  const isAgentAvailableNow = (agent) => {
    const prof = agent?.deliveryProfile || {};
    if (!prof.isActive) return false;
    let av = null;
    try { av = prof.availability ? (typeof prof.availability === 'string' ? JSON.parse(prof.availability) : prof.availability) : null } catch (_) { }
    const now = new Date();
    const days = Array.isArray(av?.days) ? av.days : [];
    const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const cur = dayMap[now.getDay()];
    if (days.length && !days.includes(cur)) return false;
    if (av?.from && av?.to) {
      const [fh, fm] = av.from.split(':').map(n => parseInt(n, 10));
      const [th, tm] = av.to.split(':').map(n => parseInt(n, 10));
      const mins = now.getHours() * 60 + now.getMinutes();
      const fromM = (fh || 0) * 60 + (fm || 0);
      const toM = (th || 0) * 60 + (tm || 0);
      if (!(mins >= fromM && mins <= toM)) return false;
    }
    return true;
  };

  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (filterStatus !== 'all') {
      filtered = filtered.filter(o => o.status === filterStatus);
    }
    return filtered;
  }, [orders, filterStatus]);

  const orderStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Order Assignments</h1>
        <div className="flex gap-2">
          <select
            className="border rounded p-2"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Orders</option>
            {orderStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn" onClick={loadData}>Refresh</button>
        </div>
      </div>

      {/* Alerts */}
      {error && <div className="p-3 rounded bg-red-100 text-red-700">{error}</div>}
      {success && <div className="p-3 rounded bg-green-100 text-green-700">{success}</div>}

      {filteredOrders.length === 0 ? (
        <div className="card p-6 text-center text-gray-600">No orders found.</div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-3">Order #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Delivery Agent</th>
                  <th className="p-3">Available Agents</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const availableAgents = deliveryAgents.filter(agent =>
                    matchesLocation(order.deliveryLocation, agent.deliveryProfile?.location) &&
                    isAgentAvailableNow(agent)
                  );

                  return (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono font-medium">{order.orderNumber}</td>
                      <td className="p-3">
                        {order.User ? `${order.User.name} (${order.User.email})` : order.userId}
                      </td>
                      <td className="p-3">
                        <select
                          className="border rounded p-1"
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        >
                          {orderStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="p-3">{order.deliveryLocation || '-'}</td>
                      <td className="p-3">
                        {order.deliveryAgentId ? (
                          <span className="text-green-600">
                            {deliveryAgents.find(a => a.id === order.deliveryAgentId)?.name || `#${order.deliveryAgentId}`}
                          </span>
                        ) : (
                          <span className="text-gray-500">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          {availableAgents.length > 0 ? (
                            <span className="text-green-600">{availableAgents.length} available</span>
                          ) : (
                            <span className="text-red-600">None available</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <div className="flex flex-col gap-1">
                            {availableAgents.slice(0, 3).map(agent => (
                              <button
                                key={agent.id}
                                className="btn btn-xs"
                                onClick={() => confirmAssign(order.id, agent.id)}
                              >
                                Assign {agent.name}
                              </button>
                            ))}
                            {availableAgents.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{availableAgents.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{filteredOrders.length}</div>
          <div className="text-gray-600">Total Orders</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {filteredOrders.filter(o => !o.deliveryAgentId && o.status !== 'delivered' && o.status !== 'cancelled').length}
          </div>
          <div className="text-gray-600">Unassigned Orders</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {filteredOrders.filter(o => o.deliveryAgentId && o.status !== 'delivered' && o.status !== 'cancelled').length}
          </div>
          <div className="text-gray-600">Assigned Orders</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{deliveryAgents.length}</div>
          <div className="text-gray-600">Delivery Agents</div>
        </div>
      </div>

      <AdminPasswordDialog
        isOpen={isPasswordDialogOpen}
        onClose={() => setIsPasswordDialogOpen(false)}
        onConfirm={assignDelivery}
        title="Confirm Assignment"
        actionDescription="Assigning delivery agent to this order. Authentication required."
      />
    </div>
  );
}