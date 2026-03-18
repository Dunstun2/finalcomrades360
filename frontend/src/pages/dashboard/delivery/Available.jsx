import React, { useState, useEffect } from 'react';
import { FaMapMarkedAlt, FaClock, FaCheckCircle, FaDollarSign, FaSpinner, FaChevronDown, FaChevronUp, FaBox, FaStore, FaTruck, FaClipboardCheck } from 'react-icons/fa';
import api from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import { resolveImageUrl } from '../../../utils/imageUtils';
import Dialog from '../../../components/Dialog';
import DeliveryTaskConsole from '../../../components/delivery/DeliveryTaskConsole';

const DeliveryAgentAvailable = () => {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [stats, setStats] = useState({ totalEarnings: 0 });
  const [agentShare, setAgentShare] = useState(80);
  const [blockingReason, setBlockingReason] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [coords, setCoords] = useState(null);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/finance/config');
      if (res.data?.agentShare) setAgentShare(res.data.agentShare);
    } catch (err) {
      console.error('Failed to load delivery config:', err);
    }
  };

  const fetchAvailableOrders = async (showLoading = true, isLoadMore = false) => {
    try {
      if (showLoading) {
        if (isLoadMore) setLoadingMore(true);
        else setLoading(true);
      }

      // Try to get current location for proximity sorting
      let currentCoords = coords;
      if (!currentCoords || currentCoords.denied) {
        if ((currentCoords?.denied || window._geoDenied) && !isLoadMore) {
          // Skip GPS if already denied and not a deliberate load more attempt
          if (window._geoDenied && !currentCoords?.denied) {
            setCoords({ denied: true });
            currentCoords = { denied: true };
          }
        } else {
          try {
            const pos = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
                enableHighAccuracy: false, // Less battery drain, fewer timeouts
                maximumAge: 60000
              });
            });
            currentCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCoords(currentCoords);
          } catch (e) {
            if (e.code === 1) { // PERMISSION_DENIED
              console.warn('[GPS] Geolocation permission denied.');
              window._geoDenied = true;
              setCoords({ denied: true });
              currentCoords = { denied: true };
            } else {
              console.warn('Geolocation suppressed:', e.message);
            }
          }
        }
      }

      const currentPage = isLoadMore ? page + 1 : 1;
      const params = new URLSearchParams({
        page: currentPage,
        pageSize: 20
      });

      if (currentCoords && !currentCoords.denied) {
        params.append('lat', currentCoords.lat);
        params.append('lng', currentCoords.lng);
      }

      const res = await api.get(`/delivery/available?${params.toString()}`);
      const newOrders = res.data.data || [];
      const totalPages = res.data.meta?.totalPages || 1;

      if (isLoadMore) {
        setAvailableOrders(prev => [...prev, ...newOrders]);
        setPage(currentPage);
      } else {
        setAvailableOrders(newOrders);
        setPage(1);
      }

      setHasMore(currentPage < totalPages);
      setBlockingReason(res.data.blockingReason || null);
      setMissingFields(res.data.missingFields || []);

      // Update requestedOrders based on backend data
      const alreadyRequested = newOrders.filter(o => o.hasRequested).map(o => o.id);
      if (isLoadMore) {
        setRequestedOrders(prev => [...new Set([...prev, ...alreadyRequested])]);
      } else {
        setRequestedOrders(alreadyRequested);
      }
    } catch (err) {
      if (showLoading) console.error('Failed to load available orders:', err);
    } finally {
      if (showLoading) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/delivery/stats');
      setStats(res.data || { totalEarnings: 0 });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  useEffect(() => {
    const initFetch = async () => {
      await Promise.all([
        fetchConfig(),
        fetchStats(),
        fetchAvailableOrders()
      ]);
    };
    initFetch();
  }, []); // Only fetch on mount, agentShare is fetched inside fetchConfig

  useEffect(() => {
    const interval = setInterval(() => {
      // Silently refresh current set of orders
      const currentSize = page * 20;
      const params = new URLSearchParams({ page: 1, pageSize: currentSize });

      // Use memoized or current state without triggering effect again
      if (coords && !coords.denied) {
        params.append('lat', coords.lat);
        params.append('lng', coords.lng);
      }

      Promise.all([
        fetchStats(),
        api.get(`/delivery/available?${params.toString()}`).then(res => {
          setAvailableOrders(res.data.data || []);
          setBlockingReason(res.data.blockingReason || null);
          setMissingFields(res.data.missingFields || []);
        })
      ]).catch(() => { });
    }, 30000); // Increased to 30s to reduce server load

    return () => clearInterval(interval);
  }, [page]); // Removed coords from dependencies to avoid interval spam

  const [requestedOrders, setRequestedOrders] = useState([]);
  const [requestingIds, setRequestingIds] = useState([]); // Track loading state per order
  const [modal, setModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });

  const handleRequestAssignment = async (orderId) => {
    try {
      if (requestingIds.includes(orderId)) return; // Prevent double click
      setRequestingIds(prev => [...prev, orderId]);

      await api.post(`/delivery/orders/${orderId}/request`);

      setRequestedOrders([...requestedOrders, orderId]);
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Request Sent',
        message: 'Your request has been sent! Waiting for admin approval.'
      });
    } catch (err) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Request Failed',
        message: err.response?.data?.error || err.message
      });
    } finally {
      setRequestingIds(prev => prev.filter(id => id !== orderId));
    }
  };

  const closeModal = () => setModal({ ...modal, isOpen: false });

  const toggleExpand = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'ready_for_pickup':
        return { label: 'Ready', color: 'yellow', bg: 'bg-yellow-100', icon: <FaClock className="text-yellow-600" /> };
      case 'at_warehouse':
        return { label: 'At Warehouse', color: 'indigo', bg: 'bg-indigo-100', icon: <FaStore className="text-indigo-600" /> };
      default:
        return { label: status?.replace(/_/g, ' ').toUpperCase() || 'ORDERED', color: 'blue', bg: 'bg-blue-100', icon: <FaBox className="text-blue-600" /> };
    }
  };

  const getOrderItemImage = (item) => {
    if (item.FastFood || item.fastFood) {
      return item.FastFood?.mainImage || item.fastFood?.mainImage;
    }
    if (item.Product || item.product) {
      const p = item.Product || item.product;
      return (
        p.coverImage ||
        p.mainImage ||
        (Array.isArray(p.images) && p.images[0]) ||
        (Array.isArray(p.galleryImages) && p.galleryImages[0]) ||
        (typeof p.images === 'string' && p.images.startsWith('[') ? JSON.parse(p.images)[0] : null)
      );
    }
    return null;
  };

  const computeOrderTotals = (order) => {
    const items = order.OrderItems || [];
    const itemsTotal = items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
    // Use order.deliveryFee directly from backend (handles grouping)
    const orderDeliveryFee = Number(order.deliveryFee) || 0;
    const agentEarnings = orderDeliveryFee * (agentShare / 100);
    const orderTotal = Number(order.total) || (itemsTotal + orderDeliveryFee);
    return { itemsTotal, deliveryTotal: orderDeliveryFee, agentEarnings, orderTotal };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Available Orders</h2>
          <p className="text-gray-600">Request assignment for orders in your area</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Available Now</h3>
                  <p className="text-blue-100">{availableOrders.length} orders</p>
                </div>
                <FaMapMarkedAlt className="text-3xl text-blue-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Today's Earnings</h3>
                  <p className="text-green-100">{formatPrice(stats.totalEarnings || 0)}</p>
                </div>
                <FaDollarSign className="text-3xl text-green-200" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {blockingReason ? (
              <div className="text-center py-12 bg-red-50 rounded-lg border-2 border-dashed border-red-200">
                <FaCheckCircle className="mx-auto h-12 w-12 text-red-400 mb-4 rotate-180" />
                <h3 className="text-lg font-medium text-red-900">Access Restricted</h3>
                <p className="mt-2 text-sm text-red-600 max-w-md mx-auto">{blockingReason}</p>
                {missingFields.length > 0 && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {missingFields.map(f => (
                      <span key={f} className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase tracking-wider">{f}</span>
                    ))}
                  </div>
                )}
                <button
                  onClick={fetchAvailableOrders}
                  className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Check Status Again
                </button>
              </div>
            ) : availableOrders.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <FaMapMarkedAlt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No Orders Available</h3>
                <p className="mt-2 text-sm text-gray-500">There are currently no orders waiting for delivery in your area.</p>
                <button
                  onClick={fetchAvailableOrders}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Refresh List
                </button>
              </div>
            ) : (
              availableOrders.map((order) => {
                const { agentEarnings } = computeOrderTotals(order);
                const isExpanded = expandedOrderId === order.id;

                return (
                  <DeliveryTaskConsole
                    key={order.id}
                    order={order}
                    agentSharePercent={agentShare}
                    isExpanded={isExpanded}
                    onToggleExpand={() => toggleExpand(order.id)}
                  >
                    <div className="flex justify-between items-center w-full mt-4 bg-white border border-blue-100 rounded-xl p-4 shadow-sm">
                      <div className="flex gap-8">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase mb-1">Item Pickup</p>
                          <p className="text-sm font-bold text-gray-900 truncate max-w-[200px]">
                            {['at_warehouse', 'received_at_warehouse'].includes(order.status)
                              ? (order.DestinationWarehouse?.address || order.Warehouse?.address || 'Warehouse Hub')
                              : ['at_pick_station', 'ready_for_pickup'].includes(order.status)
                                ? (order.DestinationPickStation?.location || order.PickupStation?.location || order.DestinationFastFoodPickupPoint?.address || 'Pickup Hub')
                                : (order.seller?.businessAddress || 'Seller Location')}
                          </p>
                        </div>
                        {order.distanceText && (
                          <div>
                          <p className="text-[10px] text-gray-400 uppercase mb-1">Pickup Distance</p>
                            <p className="text-sm font-bold text-gray-900">{order.distanceText}</p>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); handleRequestAssignment(order.id); }}
                        disabled={requestedOrders.includes(order.id) || requestingIds.includes(order.id)}
                        className={`px-8 py-3 rounded-xl transition-all font-black uppercase tracking-widest text-xs flex items-center justify-center min-w-[180px] shadow-lg ${requestedOrders.includes(order.id)
                          ? 'bg-gray-300 text-gray-600 cursor-not-allowed shadow-none'
                          : requestingIds.includes(order.id)
                            ? 'bg-blue-400 text-white cursor-wait'
                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95'
                          }`}
                      >
                        {requestingIds.includes(order.id) ? (
                          <FaSpinner className="animate-spin h-5 w-5" />
                        ) : requestedOrders.includes(order.id) ? (
                          <span className="flex items-center gap-2"><FaCheckCircle /> Requested</span>
                        ) : (
                          'Request Assignment'
                        )}
                      </button>
                    </div>
                  </DeliveryTaskConsole>
                );
              })
            )}
            {availableOrders.length > 0 && (
              <div className="pt-8 pb-12 flex flex-col items-center gap-4">
                {hasMore ? (
                  <button
                    onClick={() => fetchAvailableOrders(true, true)}
                    disabled={loadingMore}
                    className="group flex flex-col items-center gap-2 px-12 py-4 bg-white hover:bg-blue-600 text-blue-600 hover:text-white rounded-2xl border-2 border-blue-600 transition-all shadow-xl active:scale-95 disabled:opacity-50 min-w-[300px]"
                  >
                    {loadingMore ? (
                      <>
                        <FaSpinner className="animate-spin text-xl text-current" />
                        <span className="text-xs font-black uppercase tracking-widest">Loading Assignments...</span>
                      </>
                    ) : (
                      <>
                        <FaChevronDown className="text-lg group-hover:translate-y-1 transition-transform" />
                        <span className="text-xs font-black uppercase tracking-widest">Load More Assignments</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-2 p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <FaClipboardCheck className="text-gray-300 text-2xl" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                      No more assignments found in your area<br/>
                      <span className="font-medium lowercase">Showing all available {availableOrders.length} orders</span>
                    </p>
                  </div>
                )}
                
                <button 
                  onClick={() => fetchAvailableOrders(true, false)}
                  className="text-[10px] font-bold text-gray-400 hover:text-blue-500 uppercase tracking-widest transition-colors"
                >
                  Refresh Entire List
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
};

export default DeliveryAgentAvailable;