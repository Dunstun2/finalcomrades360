import React, { useEffect, useState } from 'react';
import { FaBox, FaTruck, FaCheckCircle, FaClock, FaMapMarkerAlt, FaCreditCard, FaStore, FaEye, FaArrowLeft, FaStar } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getSocket, joinUserRoom } from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import PaymentStatusTracker from '../components/PaymentStatusTracker';
import DeliveryRating from '../components/DeliveryRating';
import { resolveImageUrl, FALLBACK_IMAGE } from '../utils/imageUtils';
import { formatPrice } from '../utils/currency';

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [superAdminOrders, setSuperAdminOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('my-orders');

  // Helper function to extract image from order item based on type
  const getOrderItemImage = (item) => {
    console.log('🖼️ [Orders] Getting image for item:', item);

    // Try to get image from FastFood
    if (item.FastFood || item.fastFood) {
      const image = item.FastFood?.mainImage || item.fastFood?.mainImage;
      console.log('🖼️ [Orders] FastFood image:', image);
      return image;
    }

    // Try to get image from Product
    if (item.Product || item.product) {
      const image = (
        item.Product?.coverImage || item.product?.coverImage ||
        item.Product?.galleryImages?.[0] || item.product?.galleryImages?.[0] ||
        item.Product?.mainImage || item.product?.mainImage
      );
      console.log('🖼️ [Orders] Product image:', image);
      return image;
    }

    console.log('🖼️ [Orders] No image found - returning null');
    // Return null for services or other types
    return null;
  };

  // Order status configuration
  const orderStatuses = {
    'order_placed': { icon: FaClock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    'seller_confirmed': { icon: FaBox, color: 'text-blue-600', bg: 'bg-blue-100' },
    'super_admin_confirmed': { icon: FaCheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    // Capitalized versions sent by backend status masking
    'Processing': { icon: FaBox, color: 'text-blue-600', bg: 'bg-blue-100' },
    'Shipped': { icon: FaTruck, color: 'text-purple-600', bg: 'bg-purple-100' },
    // Lowercase aliases (kept for compatibility)
    'processing': { icon: FaBox, color: 'text-blue-600', bg: 'bg-blue-100' },
    'shipped': { icon: FaTruck, color: 'text-purple-600', bg: 'bg-purple-100' },
    'transit': { icon: FaTruck, color: 'text-purple-600', bg: 'bg-purple-100' },
    'delivered': { icon: FaCheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    'Delivered': { icon: FaCheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    'completed': { icon: FaCheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    'failed': { icon: FaClock, color: 'text-red-600', bg: 'bg-red-100' },
    'cancelled': { icon: FaClock, color: 'text-red-600', bg: 'bg-red-100' },
    'returned': { icon: FaClock, color: 'text-gray-600', bg: 'bg-gray-100' },
    'en_route_to_warehouse': { icon: FaTruck, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    'at_warehouse': { icon: FaBox, color: 'text-blue-600', bg: 'bg-blue-100' },
    'ready_for_pickup': { icon: FaBox, color: 'text-sky-600', bg: 'bg-sky-100' },
    'in_transit': { icon: FaTruck, color: 'text-orange-600', bg: 'bg-orange-100' }
  };

  // Display names for customer-facing statuses
  const statusDisplayNames = {
    'order_placed': 'Pending Order',
    'seller_confirmed': 'Confirmed',
    'super_admin_confirmed': 'Confirmed',
    // Capitalized versions from backend masking
    'Processing': 'Processing',
    'Shipped': 'Shipped',
    'Delivered': 'Delivered',
    // Lowercase aliases
    'processing': 'Processing',
    'shipped': 'Shipped',
    'transit': 'Transit',
    'delivered': 'Delivered',
    'completed': 'Completed',
    'failed': 'Failed',
    'cancelled': 'Cancelled',
    'returned': 'Returned',
    'en_route_to_warehouse': 'En Route',
    'at_warehouse': 'At Warehouse',
    'ready_for_pickup': 'Ready for Pickup',
    'in_transit': 'In Transit'
  };

  // Order timeline stages
  const getOrderTimeline = (status) => {
    const stages = [
      { name: 'Order Placed', status: status === 'order_placed' ? 'current' : ['seller_confirmed', 'super_admin_confirmed', 'processing', 'shipped', 'transit', 'delivered', 'completed'].includes(status) ? 'completed' : status === 'cancelled' ? 'cancelled' : 'pending' },
      { name: 'Confirmed', status: ['seller_confirmed', 'super_admin_confirmed'].includes(status) ? (status === 'seller_confirmed' ? 'current' : 'completed') : ['processing', 'shipped', 'transit', 'delivered', 'completed'].includes(status) ? 'completed' : 'pending' },
      { name: 'Processing', status: status === 'processing' ? 'current' : ['shipped', 'transit', 'delivered', 'completed'].includes(status) ? 'completed' : 'pending' },
      { name: 'Shipped', status: status === 'shipped' ? 'current' : ['transit', 'delivered', 'completed'].includes(status) ? 'completed' : 'pending' },
      { name: 'Transit', status: ['transit', 'in_transit'].includes(status) ? 'current' : ['delivered', 'completed'].includes(status) ? 'completed' : 'pending' },
      { name: 'Delivered', status: status === 'delivered' ? 'current' : status === 'completed' ? 'completed' : 'pending' },
      { name: 'Complete', status: status === 'completed' ? 'completed' : status === 'cancelled' ? 'cancelled' : 'pending' }
    ];
    return stages;
  };

  useEffect(() => {
    loadOrders();

    // Set up real-time updates
    const socketInstance = getSocket();

    // Join user room for real-time updates
    if (user?.id) {
      joinUserRoom(user.id);
    }

    // Listen for order status updates
    socketInstance.on('orderStatusUpdate', (data) => {
      console.log('Real-time order status update:', data);
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === data.orderId
            ? { ...order, status: data.status }
            : order
        )
      );
    });

    return () => {
      socketInstance.off('orderStatusUpdate');
    };
  }, [user?.id]);

  useEffect(() => {
    const handleRealtimeUpdate = (event) => {
      const scope = event?.detail?.payload?.scope;
      const eventName = event?.detail?.eventName;
      if (scope === 'orders' || scope === 'payments' || eventName === 'orderStatusUpdate') {
        loadOrders(false);
      }
    };

    window.addEventListener('realtime:data-updated', handleRealtimeUpdate);
    return () => window.removeEventListener('realtime:data-updated', handleRealtimeUpdate);
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders/my');
      setOrders(response.data);

      // Load super admin product orders if user is super admin
      if (user?.role === 'super_admin') {
        try {
          const superAdminResponse = await api.get('/orders/super-admin-products');
          setSuperAdminOrders(superAdminResponse.data);
        } catch (superAdminError) {
          console.error('Failed to load super admin orders:', superAdminError);
        }
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWarehouseReceived = async (orderId) => {
    try {
      const res = await api.post(`/orders/${orderId}/warehouse-received`);
      if (res.data.success) {
        // Update both lists if necessary
        const updatedOrder = res.data.order;
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedOrder } : o));
        setSuperAdminOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedOrder } : o));
      }
    } catch (error) {
      console.error('Failed to mark received:', error);
      alert(error.response?.data?.message || 'Failed to mark as received');
    }
  };

  const handleStationReady = async (orderId) => {
    try {
      const res = await api.post(`/orders/${orderId}/ready-at-pickup-station`);
      if (res.data.success) {
        const updatedOrder = res.data.order;
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedOrder } : o));
        setSuperAdminOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedOrder } : o));
      }
    } catch (error) {
      console.error('Failed to mark station ready:', error);
      alert(error.response?.data?.message || 'Failed to mark as ready for pickup');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusInfo = (status) => {
    return orderStatuses[status] || orderStatuses['order_placed'];
  };

  const getStatusDisplayName = (status) => {
    return statusDisplayNames[status] || 'Processing';
  };

  // Check if order can be cancelled (within 10 minutes and not shipped)
  const canCancelOrder = (order) => {
    const orderTime = new Date(order.createdAt);
    const now = new Date();
    const timeDiff = (now - orderTime) / (1000 * 60); // minutes

    console.log(`🕐 Orders.jsx - Cancel Check for Order ${order.id}:`);
    console.log(`  Order createdAt: ${order.createdAt}`);
    console.log(`  Order time: ${orderTime.toISOString()}`);
    console.log(`  Current time: ${now.toISOString()}`);
    console.log(`  Time diff: ${timeDiff.toFixed(2)} minutes`);
    console.log(`  Status: ${order.status}`);
    console.log(`  Can cancel: ${timeDiff <= 10 && ['order_placed', 'seller_confirmed', 'super_admin_confirmed', 'processing'].includes(order.status)}`);

    return timeDiff <= 10 && ['order_placed', 'seller_confirmed', 'super_admin_confirmed', 'processing'].includes(order.status);
  };

  // Handle order cancellation with reason selection
  const handleCancelOrder = async (order) => {
    // Show reason selection modal
    const reasons = [
      'Changed my mind',
      'Found better price elsewhere',
      'Wrong product selected',
      'Wrong delivery address',
      'Delivery time too long',
      'Payment issues',
      'Other'
    ];

    const reason = prompt(
      'Please select a reason for cancellation:\n\n' +
      reasons.map((r, i) => `${i + 1}. ${r}`).join('\n') +
      '\n\nEnter the number (1-7):'
    );

    if (!reason) return; // User cancelled

    const reasonIndex = parseInt(reason) - 1;
    if (isNaN(reasonIndex) || reasonIndex < 0 || reasonIndex >= reasons.length) {
      alert('Invalid selection. Please try again.');
      return;
    }

    const selectedReason = reasons[reasonIndex];

    // Additional confirmation
    if (!window.confirm(`Are you sure you want to cancel this order?\n\nReason: ${selectedReason}\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const response = await api.post(`/orders/${order.id}/cancel`, {
        reason: selectedReason,
        cancelledBy: 'customer'
      });

      if (response.data.success) {
        const refundMessage = response.data.refundMessage ?
          `\n\n${response.data.refundMessage}` : '';
        alert(`Order cancelled successfully.${refundMessage}`);
        // Refresh orders list
        loadOrders();
      } else {
        alert('Failed to cancel order: ' + response.data.message);
      }
    } catch (error) {
      console.error('Cancel order error:', error);
      alert('Failed to cancel order. Please try again.');
    }
  };

  // Handle address update
  const handleUpdateAddress = (order) => {
    // For now, redirect to account settings - could be enhanced to modal
    alert('Address update feature coming soon. Please update your address in Account Settings.');
    // Could implement modal here or redirect to addresses page
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading orders...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-0 md:px-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6 font-medium transition-colors"
        >
          <FaArrowLeft className="mr-2" /> Back
        </button>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="mt-2 text-gray-600">Track your order history and status</p>
        </div>

        {/* Tab Navigation for Super Admin */}
        {user?.role === 'super_admin' && (
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('my-orders')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'my-orders'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  My Orders
                </button>
                <button
                  onClick={() => setActiveTab('super-admin-orders')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'super-admin-orders'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  My Sales ({superAdminOrders.length})
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Orders Content */}
        {activeTab === 'my-orders' ? (
          <>
            {orders.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <FaBox className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                <p className="text-gray-600">When you place your first order, it will appear here.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => {
                  const statusInfo = getStatusInfo(order.status);
                  const StatusIcon = statusInfo.icon || FaClock;
                  const timeline = getOrderTimeline(order.status);

                  return (
                    <div key={order.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                      {/* Order Header - Clickable */}
                      <div className="p-6 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`p-2 rounded-full ${statusInfo.bg}`}>
                              <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                            </div>
                            <div>
                              <button className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                                Order #{order.orderNumber}
                              </button>
                              <p className="text-sm text-gray-600">
                                Placed on {formatDate(order.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                              <StatusIcon className="mr-1 h-4 w-4" />
                              {getStatusDisplayName(order.status)}
                            </div>
                            <p className="text-lg font-bold text-gray-900 mt-1">
                              {formatPrice(order.total)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Order Details */}
                      {selectedOrder?.id === order.id && (
                        <>
                          {/* Order Actions */}
                          <div className="px-6 py-3 bg-blue-50 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                {/* Order Tracking - for all orders */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent expanding/collapsing order details
                                    navigate(`/customer/orders/${order.id}/tracking`);
                                  }}
                                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  Track Order
                                </button>

                                {/* Order Cancellation - only for pending/processing orders within time window */}
                                {canCancelOrder(order) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent expanding/collapsing order details
                                      navigate(`/customer/orders/${order.id}/cancel`);
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                                  >
                                    Cancel Order
                                  </button>
                                )}

                                {/* Address Update - only for orders not yet shipped */}
                                {(order.status === 'order_placed' || order.status === 'seller_confirmed' || order.status === 'super_admin_confirmed' || order.status === 'processing') && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent expanding/collapsing order details
                                      navigate(`/customer/orders/${order.id}/update-address`);
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                                  >
                                    Update Address
                                  </button>
                                )}
                              </div>

                              <div className="text-sm text-gray-600">
                                Order placed {formatDate(order.createdAt)}
                              </div>
                            </div>
                          </div>

                          {/* Order Timeline */}
                          <div className="px-6 py-4 bg-gray-50">
                            <div className="flex items-center justify-between">
                              {timeline.map((stage, index) => (
                                <div key={stage.name} className="flex flex-col items-center flex-1">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stage.status === 'completed' ? 'bg-green-500 text-white' :
                                    stage.status === 'current' ? 'bg-blue-500 text-white' :
                                      stage.status === 'cancelled' ? 'bg-red-500 text-white' :
                                        'bg-gray-300 text-gray-600'
                                    }`}>
                                    {stage.status === 'completed' ? (
                                      <FaCheckCircle className="h-4 w-4" />
                                    ) : stage.status === 'current' ? (
                                      <FaClock className="h-4 w-4" />
                                    ) : (
                                      <div className="w-2 h-2 bg-current rounded-full"></div>
                                    )}
                                  </div>
                                  <span className={`text-xs mt-2 text-center ${stage.status === 'current' ? 'text-blue-600 font-medium' :
                                    stage.status === 'completed' ? 'text-green-600' :
                                      'text-gray-500'
                                    }`}>
                                    {stage.name}
                                  </span>
                                  {index < timeline.length - 1 && (
                                    <div className={`absolute top-4 left-1/2 w-full h-0.5 ${stage.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                                      }`} style={{ transform: 'translateX(50%)', zIndex: -1 }}></div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Order Details */}
                          <div className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Delivery Information */}
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                  <FaMapMarkerAlt className="mr-2 text-gray-500" />
                                  Delivery Information
                                </h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p><strong>Method:</strong> {order.deliveryMethod === 'home_delivery' ? 'Home Delivery' : 'Pick Station'}</p>
                                  {order.deliveryMethod === 'home_delivery' && order.deliveryAddress && (
                                    <p><strong>Address:</strong> {order.deliveryAddress}</p>
                                  )}
                                  {order.deliveryMethod === 'pick_station' && order.pickStation && (
                                    <p><strong>Pick Station:</strong> {order.pickStation}</p>
                                  )}
                                  {order.deliveryAgentId && (
                                    <p><strong>Delivery Agent:</strong> Assigned</p>
                                  )}
                                </div>
                              </div>

                              {/* Payment Information */}
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                  <FaCreditCard className="mr-2 text-gray-500" />
                                  Payment Information
                                </h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p><strong>Method:</strong> {order.paymentMethod || 'Cash on Delivery'}</p>
                                  <p><strong>Type:</strong> {order.paymentType === 'prepay' ? 'Prepay' : 'Cash on Delivery'}</p>
                                  <p><strong>Status:</strong>
                                    <span className={`ml-1 px-2 py-1 rounded text-xs ${order.paymentConfirmed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                      {order.paymentConfirmed ? 'Paid' : 'Pending'}
                                    </span>
                                  </p>
                                  {order.total && (
                                    <p><strong>Total:</strong> {formatPrice(order.total)}</p>
                                  )}
                                </div>

                                {/* Payment Status Tracker for pending prepay orders */}
                                {order.paymentType === 'prepay' && !order.paymentConfirmed && (
                                  <div className="mt-4">
                                    <PaymentStatusTracker
                                      orderId={order.id}
                                      onStatusChange={(payment) => {
                                        // Refresh order data when payment status changes
                                        if (payment.status === 'completed') {
                                          loadOrders();
                                        }
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Order Items */}
                            {order.OrderItems && order.OrderItems.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <h4 className="font-medium text-gray-900 mb-3">Order Items ({order.OrderItems.length})</h4>
                                <div className="space-y-3">
                                  {order.OrderItems.map((item) => (
                                    <div key={item.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                                        <img
                                          src={resolveImageUrl(getOrderItemImage(item))}
                                          alt={item.name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <h5 className="font-medium text-gray-900">{item.itemLabel || item.name}</h5>
                                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-medium text-gray-900">{formatPrice(item.price * item.quantity)}</p>
                                        <p className="text-sm text-gray-600">{formatPrice(item.price)} × {item.quantity}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Delivery Rating - Show for delivered orders without rating */}
                            {order.status === 'delivered' && !order.deliveryRating && order.deliveryAgentId && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <DeliveryRating
                                  orderId={order.id}
                                  onRated={(rating, review) => {
                                    // Update local state
                                    setOrders(prevOrders =>
                                      prevOrders.map(o =>
                                        o.id === order.id
                                          ? { ...o, deliveryRating: rating, deliveryReview: review, deliveryRatedAt: new Date() }
                                          : o
                                      )
                                    );
                                  }}
                                />
                              </div>
                            )}

                            {/* Show existing rating */}
                            {order.deliveryRating && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <h4 className="font-semibold text-gray-900 mb-2">Your Delivery Rating</h4>
                                  <div className="flex items-center space-x-2 mb-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <FaStar
                                        key={star}
                                        className={`h-5 w-5 ${star <= order.deliveryRating
                                          ? 'text-yellow-400 fill-current'
                                          : 'text-gray-300'
                                          }`}
                                      />
                                    ))}
                                    <span className="text-sm text-gray-600">
                                      ({order.deliveryRating}/5)
                                    </span>
                                  </div>
                                  {order.deliveryReview && (
                                    <p className="mt-2 text-sm text-gray-700 italic">"{order.deliveryReview}"</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">My Sales</h2>
            {superAdminOrders.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <FaBox className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No sales yet</h3>
                <p className="text-gray-600">Orders for products you've added will appear here.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {superAdminOrders.map((order) => {
                  const statusInfo = getStatusInfo(order.status);
                  const StatusIcon = statusInfo.icon || FaClock;
                  const timeline = getOrderTimeline(order.status);

                  return (
                    <div key={order.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                      {/* Order Header - Clickable */}
                      <div className="p-6 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`p-2 rounded-full ${statusInfo.bg}`}>
                              <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                            </div>
                            <div>
                              <button className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                                Order #{order.orderNumber}
                              </button>
                              <p className="text-sm text-gray-600">
                                Customer: {order.user?.name || 'Unknown'} • Placed on {formatDate(order.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                              <StatusIcon className="mr-1 h-4 w-4" />
                              {getStatusDisplayName(order.status)}
                            </div>
                            <p className="text-lg font-bold text-gray-900 mt-1">
                              {formatPrice(order.total)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Order Details */}
                      {selectedOrder?.id === order.id && (
                        <>
                          {/* Order Actions */}
                          <div className="px-6 py-3 bg-blue-50 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                {/* Order Tracking - for all orders */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent expanding/collapsing order details
                                    navigate(`/customer/orders/${order.id}/tracking`);
                                  }}
                                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  Track Order
                                </button>

                                {/* Order Status Handlers */}
                                {order.status === 'seller_confirmed' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleWarehouseReceived(order.id);
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                                  >
                                    Mark as Picked Up
                                  </button>
                                )}

                                {['en_route_to_warehouse', 'seller_confirmed', 'at_warehouse'].includes(order.status) && (() => {
                                  const isAtWarehouse = order.status === 'at_warehouse';
                                  const isToStation = !!order.destinationPickStationId;

                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isAtWarehouse) {
                                          if (isToStation) {
                                            handleStationReady(order.id);
                                          } else {
                                            handleWarehouseReceived(order.id);
                                          }
                                        }
                                      }}
                                      disabled={!isAtWarehouse}
                                      className={`px-4 py-2 text-sm rounded-lg transition-colors ${isAtWarehouse
                                        ? (isToStation ? 'bg-sky-600 text-white hover:bg-sky-700' : 'bg-green-600 text-white hover:bg-green-700')
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }`}
                                      title={isAtWarehouse
                                        ? (isToStation ? 'Mark order as ready for pickup at station' : 'Process receiving of items at hub/warehouse')
                                        : 'Locked: Waiting for delivery agent to bring items to destinationhub'
                                      }
                                    >
                                      {isAtWarehouse
                                        ? (isToStation ? 'Mark Ready at Station' : 'Process Warehouse Receipt')
                                        : `🔒 ${isToStation ? 'Station' : 'Warehouse'} Receipt (Awaiting Transit)`}
                                    </button>
                                  );
                                })()}
                              </div>

                              <div className="text-sm text-gray-600">
                                Order placed {formatDate(order.createdAt)}
                              </div>
                            </div>
                          </div>

                          {/* Order Timeline */}
                          <div className="px-6 py-4 bg-gray-50">
                            <div className="flex items-center justify-between">
                              {timeline.map((stage, index) => (
                                <div key={stage.name} className="flex flex-col items-center flex-1">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stage.status === 'completed' ? 'bg-green-500 text-white' :
                                    stage.status === 'current' ? 'bg-blue-500 text-white' :
                                      stage.status === 'cancelled' ? 'bg-red-500 text-white' :
                                        'bg-gray-300 text-gray-600'
                                    }`}>
                                    {stage.status === 'completed' ? (
                                      <FaCheckCircle className="h-4 w-4" />
                                    ) : stage.status === 'current' ? (
                                      <FaClock className="h-4 w-4" />
                                    ) : (
                                      <div className="w-2 h-2 bg-current rounded-full"></div>
                                    )}
                                  </div>
                                  <span className={`text-xs mt-2 text-center ${stage.status === 'current' ? 'text-blue-600 font-medium' :
                                    stage.status === 'completed' ? 'text-green-600' :
                                      'text-gray-500'
                                    }`}>
                                    {stage.name}
                                  </span>
                                  {index < timeline.length - 1 && (
                                    <div className={`absolute top-4 left-1/2 w-full h-0.5 ${stage.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                                      }`} style={{ transform: 'translateX(50%)', zIndex: -1 }}></div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Order Details */}
                          <div className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Customer Information */}
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                  <FaStore className="mr-2 text-gray-500" />
                                  Customer Information
                                </h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p><strong>Name:</strong> {order.user?.name || 'Unknown'}</p>
                                  <p><strong>Email:</strong> {order.user?.email || 'Unknown'}</p>
                                  <p><strong>Phone:</strong> {order.user?.phone || 'Not provided'}</p>
                                </div>
                              </div>

                              {/* Delivery Information */}
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                  <FaMapMarkerAlt className="mr-2 text-gray-500" />
                                  Delivery Information
                                </h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p><strong>Method:</strong> {order.deliveryMethod === 'home_delivery' ? 'Home Delivery' : 'Pick Station'}</p>
                                  {order.deliveryMethod === 'home_delivery' && order.deliveryAddress && (
                                    <p><strong>Address:</strong> {order.deliveryAddress}</p>
                                  )}
                                  {order.deliveryMethod === 'pick_station' && order.pickStation && (
                                    <p><strong>Pick Station:</strong> {order.pickStation}</p>
                                  )}
                                  {order.deliveryAgentId && (
                                    <p><strong>Delivery Agent:</strong> Assigned</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Order Items */}
                            {order.OrderItems && order.OrderItems.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <h4 className="font-medium text-gray-900 mb-3">Order Items ({order.OrderItems.length})</h4>
                                <div className="space-y-3">
                                  {order.OrderItems.map((item) => (
                                    <div key={item.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                                        <img
                                          src={resolveImageUrl(getOrderItemImage(item))}
                                          alt={item.name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <h5 className="font-medium text-gray-900">{item.itemLabel || item.name}</h5>
                                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-medium text-gray-900">{formatPrice(item.total)}</p>
                                        <p className="text-sm text-gray-600">{formatPrice(item.price)}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
