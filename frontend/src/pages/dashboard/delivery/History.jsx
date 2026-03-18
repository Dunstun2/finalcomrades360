import React, { useState, useEffect } from 'react';
import { FaHistory, FaCalendarAlt, FaMapMarkerAlt, FaClock, FaChevronDown, FaChevronUp, FaUser, FaMoneyBillWave } from 'react-icons/fa';
import { formatPrice } from '../../../utils/currency';
import api from '../../../services/api';
import DeliveryTaskConsole from '../../../components/delivery/DeliveryTaskConsole';

const DeliveryAgentHistory = () => {
  const [history, setHistory] = useState([]);
  const [rawOrders, setRawOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [expandedDays, setExpandedDays] = useState(new Set());
  const [visibleDays, setVisibleDays] = useState(5);
  const [visibleItemsPerDay, setVisibleItemsPerDay] = useState({});

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(() => {
      fetchHistory(false);
    }, 60000); // Increased from 5s to 60s
    return () => clearInterval(interval);
  }, []);

  const fetchHistory = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await api.get('/delivery/orders?history=true&pageSize=100');
      const orders = res.data.data || res.data.orders || (Array.isArray(res.data) ? res.data : []);
      setRawOrders(orders);

      // Group orders by date
      const grouped = groupOrdersByDate(orders);
      setHistory(grouped);
    } catch (err) {
      console.error('Failed to load delivery history:', err);
    } finally {
      setLoading(false);
    }
  };

  const groupOrdersByDate = (orders) => {
    const grouped = {};

    orders.forEach(order => {
      const dateObj = new Date(order.updatedAt);
      const dateKey = dateObj.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: dateKey,
          dateObj: dateObj,
          ordersCompleted: 0,
          totalEarnings: 0,
          orders: [],
          totalTime: 0
        };
      }

      const deliveryTime = calculateDeliveryTime(order);
      const agentEarnings = (order.deliveryTasks && order.deliveryTasks[0]) ? order.deliveryTasks[0].agentEarnings : (order.deliveryFee || 0);

      grouped[dateKey].ordersCompleted++;
      grouped[dateKey].totalEarnings += parseFloat(agentEarnings || 0);
      grouped[dateKey].totalTime += deliveryTime;
      grouped[dateKey].orders.push({
        id: order.id,
        orderNumber: order.orderNumber,
        customer: order.user?.name || 'Customer',
        address: order.deliveryType === 'seller_to_pickup_station' || order.deliveryType === 'warehouse_to_pickup_station' ? (order.PickupStation?.location || order.deliveryAddress) : (order.deliveryAddress || 'No address'),
        pickupName: order.deliveryType === 'warehouse_to_customer' || order.deliveryType === 'warehouse_to_pickup_station' ? (order.Warehouse?.name || 'Warehouse') : (order.seller?.name || 'Seller'),
        pickupAddress: order.deliveryType === 'warehouse_to_customer' || order.deliveryType === 'warehouse_to_pickup_station' ? (order.Warehouse?.address || 'Address pending') : (order.seller?.businessAddress || 'Collection Address'),
        deliveryName: order.deliveryType === 'seller_to_warehouse' || order.deliveryType === 'customer_to_warehouse' ? (order.Warehouse?.name || 'Warehouse') : (order.deliveryType === 'seller_to_pickup_station' || order.deliveryType === 'warehouse_to_pickup_station' ? (order.PickupStation?.name || 'Pickup Station') : (order.user?.name || 'Customer')),
        deliveryType: order.deliveryType,
        completedTime: dateObj.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        payment: parseFloat(agentEarnings || 0),
        totalValue: order.total,
        deliveryTime: deliveryTime
      });
    });

    // Convert to array and sort by date (newest first)
    return Object.values(grouped).sort((a, b) =>
      b.dateObj - a.dateObj
    ).map(day => ({
      ...day,
      avgTime: day.ordersCompleted > 0
        ? `${Math.round(day.totalTime / day.ordersCompleted)} mins`
        : 'N/A'
    }));
  };

  const calculateDeliveryTime = (order) => {
    if (order.createdAt && order.updatedAt) {
      const start = new Date(order.createdAt);
      const end = new Date(order.updatedAt);
      return Math.round((end - start) / (1000 * 60)); // minutes
    }
    return 0;
  };

  const toggleDay = (date) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <FaHistory className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No delivery history</h3>
        <p className="text-gray-600">Your completed deliveries will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Delivery History</h2>
          <p className="text-gray-600">Your delivery performance over time</p>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {history.slice(0, visibleDays).map((day) => {
              const isExpanded = expandedDays.has(day.date);
              const dayVisibleCount = visibleItemsPerDay[day.date] || 5;

              return (
                <div key={day.date} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Day Summary - Clickable */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleDay(day.date)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <FaCalendarAlt className="text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{day.date}</h3>
                          <p className="text-sm text-gray-500">{day.ordersCompleted} orders completed</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8 text-center mr-4">
                        <div>
                          <p className="text-sm text-gray-500">Earnings</p>
                          <p className="font-semibold text-green-600">{formatPrice(day.totalEarnings)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Avg. Time</p>
                          <p className="font-semibold text-blue-600">{day.avgTime}</p>
                        </div>
                      </div>

                      <div className="text-gray-400">
                        {isExpanded ? (
                          <FaChevronUp className="h-5 w-5" />
                        ) : (
                          <FaChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Orders List */}
                  {isExpanded && (
                    <div className="bg-gray-50 border-t border-gray-200 p-4">
                      <div className="space-y-3">
                        {day.orders.slice(0, dayVisibleCount).map((orderSummary) => {
                          const fullOrder = rawOrders.find(o => o.id === orderSummary.id);
                          if (!fullOrder) return null;
                          const isOrderExpanded = expandedOrders.has(fullOrder.id);

                          return (
                            <DeliveryTaskConsole
                              key={fullOrder.id}
                              order={fullOrder}
                              agentSharePercent={80}
                              isExpanded={isOrderExpanded}
                              onToggleExpand={() => {
                                setExpandedOrders(prev => {
                                  const next = new Set(prev);
                                  next.has(fullOrder.id) ? next.delete(fullOrder.id) : next.add(fullOrder.id);
                                  return next;
                                });
                              }}
                            >
                              <div className="flex items-center justify-between w-full mt-4 bg-white border border-green-100 rounded-xl p-4 shadow-sm text-right">
                                <div className="text-left">
                                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Completed At</p>
                                  <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
                                    <FaClock size={10} className="text-blue-500" />
                                    {orderSummary.completedTime}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Time Taken</p>
                                  <p className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-block">
                                    {orderSummary.deliveryTime} mins
                                  </p>
                                </div>
                              </div>
                            </DeliveryTaskConsole>
                          );
                        })}

                        {/* Load More Orders within this day */}
                        {day.orders.length > dayVisibleCount && (
                          <div className="text-center pt-2">
                            <button
                              onClick={() => setVisibleItemsPerDay(prev => ({ ...prev, [day.date]: (prev[day.date] || 5) + 5 }))}
                              className="px-5 py-2 bg-white hover:bg-blue-50 text-blue-600 font-bold text-xs rounded-xl border border-blue-200 transition-all"
                            >
                              Load {Math.min(5, day.orders.length - dayVisibleCount)} more in {day.date}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Load More Days */}
            {history.length > visibleDays && (
              <div className="text-center pt-4">
                <button
                  onClick={() => setVisibleDays(d => d + 5)}
                  className="px-6 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm rounded-xl border border-blue-200 transition-all flex items-center gap-2 mx-auto"
                >
                  Load More Days ({history.length - visibleDays} remaining)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryAgentHistory;