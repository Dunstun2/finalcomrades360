import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaClock, FaStar, FaTruck } from 'react-icons/fa';
import { formatPrice } from '../../../utils/currency';
import api from '../../../services/api';
import DeliveryTaskConsole from '../../../components/delivery/DeliveryTaskConsole';

const DeliveryAgentCompleted = () => {
  const [completedOrders, setCompletedOrders] = useState([]);
  const [rawOrders, setRawOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState(new Set());

  useEffect(() => {
    const fetchCompletedOrders = async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        const res = await api.get('/delivery/orders?history=true');

        // Filter for today's orders only
        const today = new Date().toDateString();
        const orders = res.data.data || res.data.orders || (Array.isArray(res.data) ? res.data : []);
        setRawOrders(orders);
        const todaysOrders = orders.filter(order =>
          new Date(order.updatedAt).toDateString() === today
        ).map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customer: order.user?.name || 'Customer',
          address: order.deliveryType === 'seller_to_pickup_station' || order.deliveryType === 'warehouse_to_pickup_station' ? (order.PickupStation?.location || order.deliveryAddress) : (order.deliveryAddress || 'No address'),
          pickupName: order.deliveryType === 'warehouse_to_customer' || order.deliveryType === 'warehouse_to_pickup_station' ? (order.Warehouse?.name || 'Warehouse') : (order.seller?.name || 'Seller'),
          pickupAddress: order.deliveryType === 'warehouse_to_customer' || order.deliveryType === 'warehouse_to_pickup_station' ? (order.Warehouse?.address || 'Address pending') : (order.seller?.businessAddress || 'Collection Address'),
          deliveryName: order.deliveryType === 'seller_to_warehouse' || order.deliveryType === 'customer_to_warehouse' ? (order.Warehouse?.name || 'Warehouse') : (order.deliveryType === 'seller_to_pickup_station' || order.deliveryType === 'warehouse_to_pickup_station' ? (order.PickupStation?.name || 'Pickup Station') : (order.user?.name || 'Customer')),
          completedTime: new Date(order.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          deliveryTime: calculateDeliveryTime(order),
          rating: order.deliveryRating || 5, // Use deliveryRating from Order model
          payment: parseFloat((() => {
            const t = order.deliveryTasks && order.deliveryTasks.length > 0 
              ? [...order.deliveryTasks].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0] 
              : null;
            return t?.agentEarnings || order.deliveryFee || 0;
          })()), // Use persisted agentEarnings
          totalValue: order.total,
        }));

        setCompletedOrders(todaysOrders);
      } catch (err) {
        console.error('Failed to load completed orders:', err);
      } finally {
        if (showLoading) setLoading(false);
      }
    };

    fetchCompletedOrders();
    const interval = setInterval(() => {
      fetchCompletedOrders(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const calculateDeliveryTimeMins = (order) => {
    if (order.createdAt && order.updatedAt) {
      const start = new Date(order.createdAt);
      const end = new Date(order.updatedAt);
      return Math.round((end - start) / (1000 * 60));
    }
    return 0;
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <FaStar
        key={index}
        className={`text-sm ${index < rating ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ));
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
          <h2 className="text-xl font-semibold text-gray-900">Completed Deliveries</h2>
          <p className="text-gray-600">Your successful delivery history for today</p>
        </div>

        <div className="p-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <FaCheckCircle className="text-green-600" />
                <span className="font-semibold text-green-900">Completed</span>
              </div>
              <p className="text-2xl font-bold text-green-700 mt-1">{completedOrders.length}</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <FaTruck className="text-blue-600" />
                <span className="font-semibold text-blue-900">Avg. Time</span>
              </div>
              <p className="text-2xl font-bold text-blue-700 mt-1">22 mins</p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <FaStar className="text-yellow-600" />
                <span className="font-semibold text-yellow-900">Avg. Rating</span>
              </div>
              <p className="text-2xl font-bold text-yellow-700 mt-1">
                {completedOrders.length > 0
                  ? (completedOrders.reduce((sum, o) => sum + (o.rating || 0), 0) / completedOrders.length).toFixed(1)
                  : '-'}
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-purple-900">Total Earnings</span>
              </div>
              <p className="text-2xl font-bold text-purple-700 mt-1">
                {formatPrice(completedOrders.reduce((sum, order) => sum + order.payment, 0))}
              </p>
            </div>
          </div>

          {/* Completed Orders List */}
          <div className="space-y-4">
            {completedOrders.map((orderSummary) => {
              const fullOrder = rawOrders.find(o => o.id === orderSummary.id);
              if (!fullOrder) return null;
              const isExpanded = expandedOrders.has(fullOrder.id);

              return (
                <DeliveryTaskConsole
                  key={fullOrder.id}
                  order={fullOrder}
                  agentSharePercent={80} // Default agent share
                  isExpanded={isExpanded}
                  onToggleExpand={() => {
                    setExpandedOrders(prev => {
                      const next = new Set(prev);
                      next.has(fullOrder.id) ? next.delete(fullOrder.id) : next.add(fullOrder.id);
                      return next;
                    });
                  }}
                >
                  <div className="flex items-center justify-between w-full mt-4 bg-white border border-green-100 rounded-xl p-4 shadow-sm">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Delivered At</p>
                      <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
                        <FaClock size={10} className="text-blue-500" />
                        {orderSummary.completedTime}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-green-600 font-bold uppercase mb-1">Daily Earning</p>
                      <p className="text-lg font-black text-green-600">
                        +{formatPrice(orderSummary.payment)}
                      </p>
                    </div>
                  </div>
                </DeliveryTaskConsole>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryAgentCompleted;