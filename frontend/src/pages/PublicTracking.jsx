import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { getProductMainImage, resolveImageUrl, FALLBACK_IMAGE } from '../utils/imageUtils';
import { FaTruck, FaCheckCircle, FaClock, FaMapMarkerAlt, FaSearch, FaArrowLeft, FaRoute, FaUser, FaBox } from 'react-icons/fa';

const getCustomerFriendlyStatus = (rawStatus, trackingObj = null) => {
  if (!rawStatus) return 'Processing';
  const s = rawStatus.toLowerCase().replace(/ /g, '_');
  
  if (['delivered', 'completed'].includes(s)) return 'Delivered';
  if (['cancelled', 'failed', 'returned'].includes(s)) return 'Cancelled';

  // Determine if this is the final transit leg
  let isTerminalLeg = false;
  if (trackingObj && trackingObj.order) {
    const tasks = Array.isArray(trackingObj.order.deliveryTasks) ? trackingObj.order.deliveryTasks : [];
    isTerminalLeg = tasks.some(task => {
        const isToCustomer = ['seller_to_customer', 'warehouse_to_customer', 'pickup_station_to_customer'].includes(task.deliveryType);
        const isToStation = trackingObj.order.deliveryMethod === 'pick_station' && ['seller_to_pickup_station', 'warehouse_to_pickup_station'].includes(task.deliveryType);
        return (isToCustomer || isToStation) && task.status === 'in_progress';
    });
  }
  
  if (isTerminalLeg || ['in_transit'].includes(s) || (['in_transit', 'shipped'].includes(s) && isTerminalLeg)) {
      return 'In Transit';
  }

  if (s === 'order_placed') return 'Order Placed';
  if (s === 'ready_for_pickup') return 'Ready for Pickup';
  if (['at_warehouse', 'at_warehouse', 'en_route_to_warehouse', 'shipped', 'in_transit'].includes(s)) return 'Shipped';
  
  return 'Processing';
};

const STATUS_CONFIG = {
  'Order Placed':    { color: 'text-blue-600 bg-blue-50',   icon: FaClock },
  'Processing':      { color: 'text-yellow-600 bg-yellow-50', icon: FaClock },
  'Shipped':         { color: 'text-purple-600 bg-purple-50', icon: FaTruck },
  'In Transit':      { color: 'text-indigo-600 bg-indigo-50', icon: FaTruck },
  'Ready for Pickup':{ color: 'text-sky-600 bg-sky-50',     icon: FaBox },
  'Delivered':       { color: 'text-green-600 bg-green-50',  icon: FaCheckCircle },
  'Cancelled':       { color: 'text-red-600 bg-red-50',     icon: FaClock },
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function PublicTracking() {
  const { trackingNumber: urlParam } = useParams();
  const navigate = useNavigate();

  const [query, setQuery] = useState(urlParam || '');
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (urlParam) {
      doSearch(urlParam);
    }
  }, [urlParam]);

  const doSearch = async (q) => {
    const term = (q || query).trim();
    if (!term) return;
    setLoading(true);
    setError(null);
    setTracking(null);
    try {
      const res = await api.get(`/orders/public-track/${encodeURIComponent(term)}`);
      setTracking(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('No order found with that tracking number or order number. Please double-check and try again.');
      } else {
        setError('Something went wrong. Please try again in a moment.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate(`/track/${encodeURIComponent(query.trim())}`);
    doSearch();
  };

  const displayStatus = tracking ? getCustomerFriendlyStatus(tracking.status, tracking) : null;
  const cfg = displayStatus ? (STATUS_CONFIG[displayStatus] || STATUS_CONFIG['Processing']) : null;
  const StatusIcon = cfg?.icon || FaClock;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="text-blue-600 hover:text-blue-800 transition-colors">
            <FaArrowLeft />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Track Your Order</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {/* Search Box */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <p className="text-gray-500 text-sm mb-5 text-center">
            Enter your <strong>tracking number</strong> (e.g. <code className="bg-gray-100 px-1 rounded">TRK-…</code>) or your <strong>order number</strong>.
          </p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="TRK-1774040712186-686 or ORD-..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
            />
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FaSearch />
              )}
              Track
            </button>
          </form>
          {error && <p className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
        </div>

        {/* Results */}
        {tracking && (
          <div className="space-y-5 animate-fadeIn">
            {/* Status Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-1">Order</p>
                  <p className="text-lg font-bold text-gray-900">#{tracking.orderNumber}</p>
                  {tracking.trackingNumber && (
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{tracking.trackingNumber}</p>
                  )}
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${cfg?.color}`}>
                  <StatusIcon className="h-4 w-4" />
                  {displayStatus}
                </div>
              </div>

              {/* Timeline progress bar */}
              {(() => {
                const steps = ['Order Placed', 'Processing', 'Shipped', 'In Transit', 'Delivered'];
                const idx = steps.indexOf(displayStatus);
                return (
                  <div className="mt-4">
                    <div className="flex items-center justify-between relative">
                      <div className="absolute top-3 left-0 right-0 h-1 bg-gray-100 z-0 mx-4" />
                      <div
                        className="absolute top-3 left-0 h-1 bg-blue-500 z-0 ml-4 transition-all duration-700"
                        style={{ width: idx >= 0 ? `${(idx / (steps.length - 1)) * (100 - 8)}%` : '0%' }}
                      />
                      {steps.map((step, i) => (
                        <div key={step} className="flex flex-col items-center gap-1 z-10">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                            i <= idx
                              ? 'bg-blue-500 border-blue-500 text-white'
                              : 'bg-white border-gray-200 text-gray-300'
                          }`}>
                            {i < idx ? <FaCheckCircle className="h-3 w-3" /> : i + 1}
                          </div>
                          <span className={`text-[9px] font-medium leading-tight text-center max-w-[48px] ${i <= idx ? 'text-blue-600' : 'text-gray-300'}`}>
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {tracking.estimatedDelivery && (
                <p className="text-xs text-gray-500 mt-4">
                  Estimated delivery: <strong>{formatDate(tracking.estimatedDelivery)}</strong>
                </p>
              )}
            </div>

            {/* Delivery Agent */}
            {tracking.deliveryAgent && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <FaUser className="text-blue-500" /> Delivery Agent
                </h3>
                <div className="space-y-1 text-sm text-gray-700">
                  <p><strong>Name:</strong> {tracking.deliveryAgent.name}</p>
                  {tracking.deliveryAgent.phone && (
                    <p><strong>Phone:</strong>{' '}
                      <a href={`tel:${tracking.deliveryAgent.phone}`} className="text-blue-600 hover:underline">
                        {tracking.deliveryAgent.phone}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Pickup / Destination */}
            {(tracking.pickup || tracking.destination) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-blue-500" /> Delivery Info
                </h3>
                <div className="space-y-2 text-sm text-gray-700">
                  {tracking.pickup?.name && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">From</p>
                      <p className="font-medium">{tracking.pickup.name}</p>
                      {tracking.pickup.address && <p className="text-gray-500">{tracking.pickup.address}</p>}
                    </div>
                  )}
                  {tracking.destination?.address && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">To</p>
                      <p className="font-medium">{tracking.destination.address}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            {tracking.trackingUpdates && tracking.trackingUpdates.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <FaRoute className="text-blue-500" /> Tracking Updates
                </h3>
                <div className="space-y-4">
                  {tracking.trackingUpdates.map((update, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${i === 0 ? 'bg-blue-500' : 'bg-gray-200'}`} />
                        {i < tracking.trackingUpdates.length - 1 && (
                          <div className="w-px flex-1 bg-gray-100 mt-1" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium text-gray-800">{update.message}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(update.timestamp)}</p>
                        {update.location && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <FaMapMarkerAlt className="h-2.5 w-2.5" /> {update.location}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-center text-xs text-gray-400">
              Have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
              {' '}for full order management.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
