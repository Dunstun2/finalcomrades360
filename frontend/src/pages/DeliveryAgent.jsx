import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

export default function DeliveryAgent({ user }) {
  const [activeTab, setActiveTab] = useState('assigned'); // assigned | history
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '', processing, shipped, delivered

  // Delivery profile state
  const [profile, setProfile] = useState({ availability: { days: [], from: '', to: '' }, isActive: true });
  const [profileLoading, setProfileLoading] = useState(false);

  const resetAlerts = () => { setError(''); setSuccess(''); };

  const loadOrders = async (status, page = meta.page, pageSize = meta.pageSize) => {
    try {
      setLoading(true);
      const params = { page, pageSize };
      if (status) params.status = status;
      const r = await api.get('/delivery/orders', { params });
      // r.data shape: { data: rows, meta: { page, pageSize, total, totalPages } }
      if (r.data && Array.isArray(r.data.data)) {
        setOrders(r.data.data);
        setMeta(r.data.meta || { page, pageSize, total: 0, totalPages: 1 });
      } else {
        setOrders([]);
        setMeta({ page, pageSize, total: 0, totalPages: 1 });
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'assigned') {
      // show anything not delivered/cancelled
      loadOrders(statusFilter || undefined, 1, meta.pageSize);
    } else {
      // history: fetch delivered by default
      loadOrders('delivered', 1, meta.pageSize);
    }
  }, [activeTab]);

  // Load profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        const r = await api.get('/delivery/profile');
        const p = r.data || {};
        let availability = p.availability;
        try { availability = typeof availability === 'string' ? JSON.parse(availability) : availability; } catch (_) { }
        setProfile({
          availability: availability || { days: [], from: '', to: '' },
          isActive: typeof p.isActive === 'boolean' ? p.isActive : true,
        });
      } catch (e) {
        // soft fail, don't block
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const assignedOrders = useMemo(() => orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled'), [orders]);
  const historyOrders = useMemo(() => orders.filter(o => o.status === 'delivered' || o.status === 'cancelled'), [orders]);

  const renderActions = (o) => (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
        ⚠️ Manual status updates are disabled here for security.
      </p>
      <a 
        href="/delivery/orders" 
        className="btn bg-blue-600 text-white text-center py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go to Delivery Dashboard
      </a>
    </div>
  );

  const list = activeTab === 'assigned' ? assignedOrders : historyOrders;

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Delivery Dashboard</h1>
        {user && (
          <div className="text-sm text-gray-600">Signed in as <span className="font-medium">{user.name}</span> ({user.role})</div>
        )}
      </div>

      {error && <div className="mb-4 p-3 rounded bg-red-100 text-red-700">{error}</div>}
      {success && <div className="mb-4 p-3 rounded bg-green-100 text-green-700">{success}</div>}

      {/* Profile card */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">My Availability</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!profile.isActive}
              onChange={(e) => setProfile(p => ({ ...p, isActive: e.target.checked }))}
            />
            Active for auto-assignment
          </label>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">From</label>
            <input
              type="time"
              className="border rounded p-2 w-full"
              value={profile.availability?.from || ''}
              onChange={(e) => setProfile(p => ({ ...p, availability: { ...(p.availability || {}), from: e.target.value } }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">To</label>
            <input
              type="time"
              className="border rounded p-2 w-full"
              value={profile.availability?.to || ''}
              onChange={(e) => setProfile(p => ({ ...p, availability: { ...(p.availability || {}), to: e.target.value } }))}
            />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-sm mb-1">Available Days</div>
          <div className="flex flex-wrap gap-3">
            {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(d => (
              <label key={d} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Array.isArray(profile.availability?.days) && profile.availability.days.includes(d)}
                  onChange={(e) => setProfile(p => {
                    const days = new Set(Array.isArray(p.availability?.days) ? p.availability.days : []);
                    if (e.target.checked) days.add(d); else days.delete(d);
                    return { ...p, availability: { ...(p.availability || {}), days: Array.from(days) } };
                  })}
                />
                {d.toUpperCase()}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <button
            className="btn"
            disabled={profileLoading}
            onClick={async () => {
              try {
                setProfileLoading(true);
                await api.put('/delivery/profile', {
                  availability: profile.availability,
                  isActive: !!profile.isActive,
                });
                setSuccess('Profile saved');
              } catch (e) {
                setError(e.response?.data?.error || 'Failed to save profile');
              } finally {
                setProfileLoading(false);
              }
            }}
          >{profileLoading ? 'Saving...' : 'Save Profile'}</button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button className={`px-4 py-2 rounded ${activeTab === 'assigned' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={() => setActiveTab('assigned')}>Assigned</button>
        <button className={`px-4 py-2 rounded ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={() => setActiveTab('history')}>History</button>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">{activeTab === 'assigned' ? 'Active Assignments' : 'Delivered / Cancelled'}</h2>
          <div className="flex gap-2 items-center">
            {activeTab === 'assigned' && (
              <>
                <label className="text-sm">Status</label>
                <select
                  className="border rounded p-1"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); loadOrders(e.target.value || undefined, 1, meta.pageSize); }}
                >
                  <option value="">All</option>
                  <option value="processing">processing</option>
                  <option value="shipped">shipped</option>
                </select>
              </>
            )}
            <button className="btn" onClick={() => activeTab === 'assigned' ? loadOrders(statusFilter || undefined, meta.page, meta.pageSize) : loadOrders('delivered', meta.page, meta.pageSize)}>Refresh</button>
          </div>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : list.length === 0 ? (
          <div className="text-gray-600">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">Order #</th>
                  <th className="p-2">Customer</th>
                  <th className="p-2">Total</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Payment</th>
                  <th className="p-2">Created</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map(o => (
                  <tr key={o.id} className="border-b">
                    <td className="p-2 font-mono">{o.orderNumber}</td>
                    <td className="p-2">{o.User ? `${o.User.name} (${o.User.email})` : o.userId}</td>
                    <td className="p-2">{o.total?.toFixed(2)}</td>
                    <td className="p-2">{o.status}</td>
                    <td className="p-2">
                      {o.paymentConfirmed ? (
                        <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs">Paid</span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700 text-xs">Unpaid</span>
                      )}
                    </td>
                    <td className="p-2">{new Date(o.createdAt).toLocaleString()}</td>
                    <td className="p-2">
                      {renderActions(o)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between mt-3 text-sm">
              <div>
                Page {meta.page} of {meta.totalPages} · {meta.total} total
              </div>
              <div className="flex gap-2">
                <button
                  className="btn"
                  disabled={meta.page <= 1}
                  onClick={() => activeTab === 'assigned' ? loadOrders(statusFilter || undefined, meta.page - 1, meta.pageSize) : loadOrders('delivered', meta.page - 1, meta.pageSize)}
                >Prev</button>
                <button
                  className="btn"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => activeTab === 'assigned' ? loadOrders(statusFilter || undefined, meta.page + 1, meta.pageSize) : loadOrders('delivered', meta.page + 1, meta.pageSize)}
                >Next</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
