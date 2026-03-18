import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import AdminPasswordDialog from '../../components/AdminPasswordDialog';

export default function DeliveryAgents() {
  const [agents, setAgents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [agentDetailsOpen, setAgentDetailsOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [assignmentsModalOpen, setAssignmentsModalOpen] = useState(false);
  const [assignmentsModalAgent, setAssignmentsModalAgent] = useState(null);
  const [assignmentsModalType, setAssignmentsModalType] = useState('available');
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState(null);

  // New filter states
  const [filters, setFilters] = useState({
    vehicleType: '',
    location: '',
    isActive: '',
    minRating: ''
  });

  const resetAlerts = () => { setError(''); setSuccess(''); };

  const loadData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.vehicleType) queryParams.append('vehicleType', filters.vehicleType);
      if (filters.location) queryParams.append('location', filters.location);
      if (filters.isActive !== '') queryParams.append('isActive', filters.isActive);
      if (filters.minRating) queryParams.append('minRating', filters.minRating);

      const [agentsRes, ordersRes] = await Promise.all([
        api.get(`/admin/delivery/agents?${queryParams.toString()}`),
        api.get('/orders')
      ]);
      setAgents(Array.isArray(agentsRes.data) ? agentsRes.data : []);
      const ordersData = Array.isArray(ordersRes.data.orders) ? ordersRes.data.orders : (Array.isArray(ordersRes.data) ? ordersRes.data : []);
      setOrders(ordersData);
      setError('');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const applyFilters = () => {
    loadData();
  };

  const clearFilters = () => {
    setFilters({ vehicleType: '', location: '', isActive: '', minRating: '' });
    setTimeout(loadData, 100);
  };

  const openAgentDetails = (agent) => {
    setSelectedAgent(agent);
    setAgentDetailsOpen(true);
  };

  const openAssignmentsModal = (agent, type) => {
    setAssignmentsModalAgent(agent);
    setAssignmentsModalType(type);
    setAssignmentsModalOpen(true);
  };

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
        status: 'Processing',
        message: 'Delivery agent assigned',
        location: null
      };
      await api.post(`/orders/${orderId}/tracking`, trackingData);

      loadData();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to assign delivery agent');
    }
  };

  // Helper functions
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

  if (loading && agents.length === 0) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Delivery Agents</h1>
        <button className="btn" onClick={loadData}>Refresh</button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <h3 className="font-semibold mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm text-gray-600">Vehicle Type</label>
            <select
              className="w-full border rounded p-2"
              value={filters.vehicleType}
              onChange={(e) => setFilters({ ...filters, vehicleType: e.target.value })}
            >
              <option value="">All Vehicles</option>
              <option value="bike">Bike</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="car">Car</option>
              <option value="van">Van</option>
              <option value="truck">Truck</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Location</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Search location..."
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Status</label>
            <select
              className="w-full border rounded p-2"
              value={filters.isActive}
              onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Min Rating</label>
            <select
              className="w-full border rounded p-2"
              value={filters.minRating}
              onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
            >
              <option value="">Any Rating</option>
              <option value="4">4+ Stars</option>
              <option value="3">3+ Stars</option>
              <option value="2">2+ Stars</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button className="btn" onClick={applyFilters}>Apply Filters</button>
          <button className="btn-outline" onClick={clearFilters}>Clear</button>
        </div>
      </div>

      {/* Alerts */}
      {error && <div className="p-3 rounded bg-red-100 text-red-700">{error}</div>}
      {success && <div className="p-3 rounded bg-green-100 text-green-700">{success}</div>}

      {agents.length === 0 ? (
        <div className="card p-6 text-center text-gray-600">No delivery agents found.</div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-3">Name</th>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Rating</th>
                  <th className="p-3">Deliveries</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Active Tasks</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(agent => {
                  const prof = agent.deliveryProfile || {};
                  const isAvailable = isAgentAvailableNow(agent);

                  return (
                    <tr key={agent.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <button
                          className="text-blue-600 hover:underline font-medium"
                          onClick={() => openAgentDetails(agent)}
                        >
                          {agent.name}
                        </button>
                      </td>
                      <td className="p-3">
                        {prof.vehicleType ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {prof.vehicleType}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-3">{prof.location || '-'}</td>
                      <td className="p-3">
                        {prof.rating > 0 ? (
                          <span className="flex items-center">
                            ⭐ {prof.rating.toFixed(1)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-3">{prof.completedDeliveries || 0}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${prof.isActive && isAvailable
                          ? 'bg-green-100 text-green-800'
                          : prof.isActive
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                          }`}>
                          {prof.isActive && isAvailable ? 'Online (Available)' :
                            prof.isActive ? 'Online (Outside Shift)' : 'Offline (Inactive)'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold">{agent.activeTasks || 0}</span>
                      </td>
                      <td className="p-3">
                        <button
                          className="btn-outline btn-xs"
                          onClick={() => openAgentDetails(agent)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Agent Details Modal */}
      {agentDetailsOpen && selectedAgent && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded shadow-lg w-[95%] max-w-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold text-lg">{selectedAgent.name}</div>
              <button className="btn" onClick={() => setAgentDetailsOpen(false)}>Close</button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500">Email</div>
                <div>{selectedAgent.email || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500">Phone</div>
                <div>{selectedAgent.phone || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500">Location</div>
                <div>{selectedAgent.deliveryProfile?.location || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500">Vehicle</div>
                <div>{selectedAgent.deliveryProfile?.vehicleType || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500">Vehicle Plate</div>
                <div>{selectedAgent.deliveryProfile?.vehiclePlate || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500">Max Capacity</div>
                <div>{selectedAgent.deliveryProfile?.maxLoadCapacity ? `${selectedAgent.deliveryProfile.maxLoadCapacity} kg` : '-'}</div>
              </div>
              <div>
                <div className="text-gray-500">Rating</div>
                <div>⭐ {selectedAgent.deliveryProfile?.rating?.toFixed(1) || '0.0'}</div>
              </div>
              <div>
                <div className="text-gray-500">Completed Deliveries</div>
                <div>{selectedAgent.deliveryProfile?.completedDeliveries || 0}</div>
              </div>
              <div>
                <div className="text-gray-500">Total Earnings</div>
                <div>KES {selectedAgent.deliveryProfile?.totalEarnings?.toFixed(2) || '0.00'}</div>
              </div>
              <div>
                <div className="text-gray-500">Status</div>
                <div>{selectedAgent.deliveryProfile?.isActive ? 'Active' : 'Inactive'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-gray-500">License Number</div>
                <div>{selectedAgent.deliveryProfile?.licenseNumber || '-'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-gray-500">Emergency Contact</div>
                <div>{selectedAgent.deliveryProfile?.emergencyContact || '-'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{agents.length}</div>
          <div className="text-gray-600">Total Agents</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {agents.filter(a => a.deliveryProfile?.isActive && isAgentAvailableNow(a)).length}
          </div>
          <div className="text-gray-600">Available Now</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {agents.reduce((sum, a) => sum + (a.activeTasks || 0), 0)}
          </div>
          <div className="text-gray-600">Active Tasks</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {agents.reduce((sum, a) => sum + (a.deliveryProfile?.completedDeliveries || 0), 0)}
          </div>
          <div className="text-gray-600">Total Deliveries</div>
        </div>

        <AdminPasswordDialog
          isOpen={isPasswordDialogOpen}
          onClose={() => setIsPasswordDialogOpen(false)}
          onConfirm={assignDelivery}
          title="Confirm Assignment"
          actionDescription="Assigning delivery agent to this order. Authentication required."
        />
      </div>
    </div>
  );
}

