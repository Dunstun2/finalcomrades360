import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function HeroPromotionManager() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const resetAlerts = () => { setError(''); setSuccess(''); };

  const loadPromotions = async () => {
    try {
      const r = await api.get('/admin/hero-promotions');
      setPromotions(r.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load hero promotions');
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const togglePromotionStatus = async (id, currentStatus) => {
    resetAlerts();
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await api.patch(`/admin/hero-promotions/${id}`, { status: newStatus });
      setSuccess(`Promotion ${newStatus}`);
      loadPromotions();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to update promotion status');
    }
  };

  const deletePromotion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this promotion?')) return;
    resetAlerts();
    try {
      await api.delete(`/admin/hero-promotions/${id}`);
      setSuccess('Promotion deleted');
      loadPromotions();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to delete promotion');
    }
  };

  const fileBase = api.defaults.baseURL?.replace(/\/?api\/?$/, '') || '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Hero Promotions</h1>
        <div className="flex gap-2">
          <button
            className="btn btn-success"
            onClick={() => setShowCreateForm(true)}
          >
            Create New Promotion
          </button>
          <button className="btn" onClick={loadPromotions}>Refresh</button>
        </div>
      </div>

      {/* Alerts */}
      {error && <div className="p-3 rounded bg-red-100 text-red-700">{error}</div>}
      {success && <div className="p-3 rounded bg-green-100 text-green-700">{success}</div>}

      {promotions.length === 0 ? (
        <div className="card p-6 text-center text-gray-600">No hero promotions found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promotions.map(promotion => (
            <div key={promotion.id} className="card p-4">
              {promotion.imageUrl && (
                <img
                  src={`${fileBase}/${promotion.imageUrl}`}
                  alt={promotion.title}
                  className="w-full h-32 object-cover rounded mb-3"
                />
              )}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{promotion.title}</h3>
                <p className="text-sm text-gray-600">{promotion.description}</p>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Priority:</span>
                  <span className="font-medium">{promotion.priority}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    promotion.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {promotion.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Clicks:</span>
                  <span className="font-medium">{promotion.clickCount || 0}</span>
                </div>

                <div className="text-xs text-gray-500">
                  Created: {new Date(promotion.createdAt).toLocaleDateString()}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    className={`btn btn-xs flex-1 ${
                      promotion.status === 'active' ? 'btn-warning' : 'btn-success'
                    }`}
                    onClick={() => togglePromotionStatus(promotion.id, promotion.status)}
                  >
                    {promotion.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    className="btn-danger btn-xs"
                    onClick={() => deletePromotion(promotion.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Promotion Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded shadow-lg w-[95%] max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold text-lg">Create Hero Promotion</div>
              <button className="btn" onClick={() => setShowCreateForm(false)}>Close</button>
            </div>
            <div className="p-4">
              <div className="text-center text-gray-600">
                <p>Hero promotion creation form would go here.</p>
                <p className="text-sm mt-2">This would include fields for title, description, image upload, priority, and target URL.</p>
                <button
                  className="btn mt-4"
                  onClick={() => setShowCreateForm(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{promotions.length}</div>
          <div className="text-gray-600">Total Promotions</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {promotions.filter(p => p.status === 'active').length}
          </div>
          <div className="text-gray-600">Active Promotions</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {promotions.reduce((sum, p) => sum + (p.clickCount || 0), 0)}
          </div>
          <div className="text-gray-600">Total Clicks</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {promotions.length > 0 ? (promotions.reduce((sum, p) => sum + (p.clickCount || 0), 0) / promotions.length).toFixed(1) : 0}
          </div>
          <div className="text-gray-600">Avg Clicks/Promotion</div>
        </div>
      </div>
    </div>
  );
}