import React, { useState, useEffect } from 'react';
import {
  FaTruck,
  FaMapMarkedAlt,
  FaClipboardCheck,
  FaClock,
  FaCheckCircle,
  FaExclamationCircle,
  FaBox,
  FaChevronDown,
  FaChevronUp,
  FaMotorcycle,
  FaStore,
  FaComments,
  FaLocationArrow
} from 'react-icons/fa';
import { useOutletContext } from 'react-router-dom';
import api from '../../../services/api';
import { resolveImageUrl } from '../../../utils/imageUtils';
import { formatPrice } from '../../../utils/currency';
import CollectionConfirmationModal from '../../../components/delivery/CollectionConfirmationModal';
import PaymentVerificationModal from '../../../components/delivery/PaymentVerificationModal';
import DeliveryChat from '../../../components/delivery/DeliveryChat';
import DeliveryTaskConsole from '../../../components/delivery/DeliveryTaskConsole';
import HandoverCodeWidget from '../../../components/delivery/HandoverCodeWidget';

const getLatestTask = (order) => {
  if (!order.deliveryTasks || order.deliveryTasks.length === 0) return null;
  return [...order.deliveryTasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
};

const DeliveryAgentOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  // Delivery & Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatOrder, setChatOrder] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [autoGenerateCodeOrderId, setAutoGenerateCodeOrderId] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const [agentSharePercent, setAgentSharePercent] = useState(70);
  const [blockingReason, setBlockingReason] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [activeTab, setActiveTab] = useState('in_progress'); // 'in_progress', 'completed', 'cancelled'
  const activeTabRef = React.useRef('in_progress'); // Ref to avoid stale closures in polling
  
  // Real-time context from DeliveryAgentDashboard Shell
  const { lastUpdate } = useOutletContext() || {};

  const isPollingRef = React.useRef(false);
  const failureCountRef = React.useRef(0);
  const intervalRef = React.useRef(null);

  useEffect(() => {
    loadMyDeliveries();
    loadFinanceConfig();
  }, []); // Initial load

  // React to socket updates — use activeTabRef to avoid stale closure
  useEffect(() => {
    if (lastUpdate && lastUpdate !== null) {
      loadMyDeliveries(false, activeTabRef.current);
    }
  }, [lastUpdate]);

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        await loadMyDeliveries(false, activeTabRef.current); // Always poll for current tab
        failureCountRef.current = 0;
      } catch (_) {
        failureCountRef.current += 1;
        if (failureCountRef.current >= 10) {
          clearInterval(intervalRef.current);
          console.warn('[Orders] Too many consecutive failures — stopped auto-refresh');
        }
      } finally {
        isPollingRef.current = false;
      }
    }, 30000);

    return () => clearInterval(intervalRef.current);
  }, []);

  const loadFinanceConfig = async () => {
    try {
      const res = await api.get('/finance/config');
      if (res.data?.agentShare != null) {
        setAgentSharePercent(parseFloat(res.data.agentShare));
      }
    } catch (err) {
      console.warn('Failed to load agent share config, using fallback');
    }
  };

  const loadMyDeliveries = async (showLoading = true, tab = activeTab) => {
    try {
      if (showLoading) setLoading(true);
      
      let endpoint = '/delivery/orders';
      if (tab === 'completed') {
        endpoint = '/delivery/orders?history=true';
      } else if (tab === 'cancelled') {
        endpoint = '/delivery/orders?cancelled=true';
      }

      const res = await api.get(endpoint);
      setOrders(res.data.data || []);
      setBlockingReason(res.data.blockingReason || null);
      setMissingFields(res.data.missingFields || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load deliveries:', err);
      if (showLoading) setError('Failed to load your assignments. Please try again.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    activeTabRef.current = tab; // Keep ref in sync
    setVisibleCount(20); // Reset to default page size
    loadMyDeliveries(true, tab);
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const res = await api.patch(`/delivery/orders/${orderId}/status`, { status: newStatus });
      if (res.data) {
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      }
    } catch (err) {
      alert('Failed to update status: ' + (err.response?.data?.message || err.message));
    }
  };

  const openDeliveryFlow = (order) => {
    setSelectedOrder(order);
    // Force payment verification if it's COD and not yet paid
    const isCOD = order.paymentType === 'cash_on_delivery';
    const isPaid = order.paymentConfirmed;

    if (isCOD && !isPaid) {
      setShowPaymentModal(true);
    }
  };

  const handlePaymentVerified = () => {
    if (selectedOrder?.id) {
      const paidOrderId = selectedOrder.id;
      setOrders(prev => prev.map(o => o.id === paidOrderId ? { ...o, paymentConfirmed: true } : o));
      setSelectedOrder(prev => prev ? { ...prev, paymentConfirmed: true } : prev);
      setAutoGenerateCodeOrderId(paidOrderId);
    }
    setShowPaymentModal(false);
    alert('Payment confirmed. Delivery code is now generated for customer confirmation.');
    loadMyDeliveries(false);
  };

  const handleAcceptTask = async (taskId) => {
    try {
      await api.post(`/delivery/tasks/${taskId}/accept`);
      loadMyDeliveries();
    } catch (err) {
      alert('Failed to accept task: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleRejectTask = async (taskId) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;
    try {
      await api.post(`/delivery/tasks/${taskId}/reject`, { reason });
      loadMyDeliveries();
    } catch (err) {
      alert('Failed to reject task: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleConfirmCollection = async (taskId, notes) => {
    try {
      const res = await api.post(`/delivery/tasks/${taskId}/confirm-collection`, {
        notes,
        location: null
      });

      if (res.data.success) {
        alert('Collection confirmed successfully!');
        loadMyDeliveries();
      }
    } catch (err) {
      console.error('Failed to confirm collection:', err);
      throw err;
    }
  };

  const handleMarkArrived = async (taskId) => {
    try {
      const res = await api.post(`/delivery/tasks/${taskId}/mark-arrived`);
      if (res.data.success) {
        alert('Arrival confirmed!');
        loadMyDeliveries();
      }
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleHubArrival = async (task) => {
    const isWarehouse = task.deliveryType.includes('warehouse');
    const destinationName = isWarehouse ? 'warehouse' : 'pickup station';

    if (!confirm(`Confirm that the item has arrived at the ${destinationName}?`)) return;
    try {
      await api.patch(`/delivery/tasks/${task.id}/status`, {
        status: 'completed',
        agentNotes: `Item delivered to ${destinationName}`
      });
      alert(`Arrival confirmed! Order is now at ${destinationName}.`);
      loadMyDeliveries();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const openCollectionModal = (task, parentOrder) => {
    const enrichedTask = { ...task, order: parentOrder };
    setSelectedTask(enrichedTask);
    setShowCollectionModal(true);
  };

  const toggleExpand = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleBulkStatusChange = async (targetAction) => {
    if (selectedOrders.length === 0) return;
    if (targetAction === 'delivered') {
      alert('Bulk delivered is disabled. Each order must be completed with a unique customer confirmation code.');
      return;
    }
    setBulkProcessing(true);
    try {
      for (const orderId of selectedOrders) {
        const order = orders.find(o => o.id === orderId);
        const task = order ? getLatestTask(order) : null;
        if (!task) continue;
        const taskId = task.id;

        if (targetAction === 'arrived') {
          if (task.status === 'accepted') {
            await api.post(`/delivery/tasks/${taskId}/mark-arrived`);
          }
        } else if (targetAction === 'collected') {
          if (task.status === 'arrived_at_pickup') {
            await api.post(`/delivery/tasks/${taskId}/confirm-collection`, { notes: 'Bulk collection confirmed' });
          }
        }
      }
      alert(`Bulk action "${targetAction}" completed for ${selectedOrders.length} orders.`);
      setSelectedOrders([]);
      loadMyDeliveries();
    } catch (err) {
      alert('One or more bulk updates failed. Please refresh and try individual updates.');
    } finally {
      setBulkProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {activeTab === 'in_progress' ? 'Active Assignments' : activeTab === 'completed' ? 'Delivery History' : 'Cancelled Assignments'}
            </h2>
            <p className="text-sm text-gray-500">
              {activeTab === 'in_progress' ? 'Manage your active pickups and deliveries' : activeTab === 'completed' ? 'View your past successful deliveries' : 'History of failed or rejected assignments'}
            </p>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
            <button
              onClick={() => handleTabChange('in_progress')}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'in_progress' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              In Progress
            </button>
            <button
              onClick={() => handleTabChange('completed')}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'completed' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Completed
            </button>
            <button
              onClick={() => handleTabChange('cancelled')}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'cancelled' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Cancelled
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center">
              <FaExclamationCircle className="mr-2" /> {error}
            </div>
          )}

          {/* Bulk Agent Action Bar */}
          {selectedOrders.length > 0 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-lg border border-blue-400/30 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 relative">
              <div className="flex items-center gap-3">
                <div className="bg-white text-blue-700 px-3 py-1 rounded-full text-sm font-black shadow-inner">
                  {selectedOrders.length}
                </div>
                <div className="text-white">
                  <p className="text-sm font-black leading-none italic">Bulk Agent Operations</p>
                  <p className="text-[10px] text-blue-100 font-bold uppercase tracking-wider mt-1 opacity-80">Action multiple shipments at once</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => handleBulkStatusChange('arrived')}
                  disabled={bulkProcessing}
                  className="px-4 py-2 bg-indigo-500/30 hover:bg-indigo-500/50 text-white border border-indigo-400/50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  <FaMapMarkedAlt className="h-3 w-3" /> Mark Arrived
                </button>
                <button
                  onClick={() => handleBulkStatusChange('collected')}
                  disabled={bulkProcessing}
                  className="px-4 py-2 bg-green-500/30 hover:bg-green-500/50 text-white border border-green-400/50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  <FaBox className="h-3 w-3" /> Confirm Collected
                </button>
                <button
                  onClick={() => alert('Final delivery requires customer code confirmation per order.')}
                  disabled={bulkProcessing}
                  className="px-4 py-2 bg-blue-500/30 hover:bg-blue-500/50 text-white border border-blue-400/50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  <FaCheckCircle className="h-3 w-3" /> Delivery via Code
                </button>
                <button
                  onClick={() => setSelectedOrders([])}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
              </div>

              {bulkProcessing && (
                <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-[1px] rounded-2xl flex items-center justify-center z-10">
                  <div className="flex items-center gap-2 text-white font-black text-xs uppercase animate-pulse">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Syncing Assignments...
                  </div>
                </div>
              )}
            </div>
          )}

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
                onClick={() => loadMyDeliveries()}
                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Check Status Again
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FaTruck className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p>
                {activeTab === 'in_progress' ? 'No active assignments found.' : 
                 activeTab === 'completed' ? 'No completed deliveries found.' : 
                 'No cancelled or failed assignments.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {orders.slice(0, visibleCount).map((order) => (
                <DeliveryTaskConsole
                  key={order.id}
                  order={order}
                  agentSharePercent={agentSharePercent}
                  isExpanded={expandedOrderId === order.id}
                  onToggleExpand={() => toggleExpand(order.id)}
                  checkbox={
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectOrder(order.id);
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                    />
                  }
                >
                  {(() => {
                    const task = getLatestTask(order);
                    if (!task) return null;

                    return (
                  <div className="flex gap-2 w-full justify-end flex-wrap">
                    {/* Chat Button */}
                    {['accepted', 'out_for_delivery', 'arrived_at_pickup', 'in_progress'].includes(task.status) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatOrder(order);
                          setShowChatModal(true);
                        }}
                        className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 border border-blue-200 shadow-sm flex items-center gap-2"
                      >
                        <FaComments /> Chat with Admin
                      </button>
                    )}

                    {/* Step 1: Accept/Reject */}
                    {task.status === 'assigned' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAcceptTask(task.id); }}
                          className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm"
                        >
                          Accept Assignment
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRejectTask(task.id); }}
                          className="px-4 py-2 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200 border border-red-200 shadow-sm"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Step 2: Arrived */}
                        {task.status === 'accepted' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMarkArrived(task.id); }}
                            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2"
                          >
                            <FaMapMarkedAlt /> Arrived at Pickup
                          </button>
                        )}

                        {/* Step 3: Collect — agent enters code given by seller or hub */}
                        {['accepted', 'arrived_at_pickup'].includes(task.status) && (() => {
                          let collectHandoverType = 'seller_to_agent';
                          let pickupLat = order.seller?.businessLat || order.seller?.lat;
                          let pickupLng = order.seller?.businessLng || order.seller?.lng;
                          
                          if (task.deliveryType && task.deliveryType.startsWith('warehouse')) {
                            collectHandoverType = 'warehouse_to_agent';
                            const wh = order.Warehouse || order.DestinationWarehouse; // Fallbacks
                            pickupLat = wh?.lat || pickupLat;
                            pickupLng = wh?.lng || pickupLng;
                          } else if (task.deliveryType && task.deliveryType.startsWith('pickup_station')) {
                            collectHandoverType = 'station_to_agent';
                            const ps = order.PickupStation || order.DestinationPickStation;
                            pickupLat = ps?.lat || pickupLat;
                            pickupLng = ps?.lng || pickupLng;
                          }

                          return (
                            <div className="w-full mt-2 space-y-2">
                              {pickupLat && pickupLng && (
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${pickupLat},${pickupLng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 border border-blue-200 shadow-sm"
                                >
                                  <FaLocationArrow /> Navigate to Pickup
                                </a>
                              )}
                              {task.status === 'arrived_at_pickup' && (
                                <HandoverCodeWidget
                                  mode="receiver"
                                  handoverType={collectHandoverType}
                                  orderId={order.id}
                                  taskId={task.id}
                                  onConfirmed={() => {
                                    alert('Handover confirmed! Order is now in your collection.');
                                    loadMyDeliveries();
                                  }}
                                />
                              )}
                            </div>
                          );
                        })()}

                        {/* Step 4: Drop-off — agent generates code for the final destination */}
                        {(() => {
                           if (task.status !== 'in_progress') return null;

                           let dropoffHandoverType = 'agent_to_customer';
                           let isCustomerDropoff = true;

                           if (task.deliveryType && task.deliveryType.endsWith('_to_warehouse')) {
                             dropoffHandoverType = 'agent_to_warehouse';
                             isCustomerDropoff = false;
                           } else if (task.deliveryType && (task.deliveryType.endsWith('_to_pickup_station') || task.deliveryType.endsWith('_to_station'))) {
                             dropoffHandoverType = 'agent_to_station';
                             isCustomerDropoff = false;
                           } else if (task.deliveryType && task.deliveryType.endsWith('_to_customer')) {
                             dropoffHandoverType = 'agent_to_customer';
                             isCustomerDropoff = true;
                           } else if (order.deliveryMethod === 'pick_station') {
                             // Fallback
                             dropoffHandoverType = 'agent_to_station';
                             isCustomerDropoff = false;
                           }

                           return (
                             <div className="flex flex-col gap-3 w-full mt-2">
                               <div className="flex gap-2">
                                 <a
                                   href={`https://www.google.com/maps/dir/?api=1&destination=${order.deliveryLat || 0},${order.deliveryLng || 0}`}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 border border-blue-200 shadow-sm flex items-center gap-2"
                                 >
                                   <FaLocationArrow /> Navigate to Dropoff
                                 </a>
                                 <button
                                   onClick={(e) => { e.stopPropagation(); handleStatusUpdate(order.id, 'failed'); }}
                                   className="px-4 py-2 bg-red-50 text-red-500 text-xs font-bold rounded-lg hover:bg-red-100 border border-red-100 shadow-sm"
                                 >
                                   Failed
                                 </button>
                               </div>

                               <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                 <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 px-1">
                                    {isCustomerDropoff ? 'Customer Delivery Confirmation' : 'Hub Drop-off Confirmation'}
                                 </p>
                                 {isCustomerDropoff && order.paymentType === 'cash_on_delivery' && !order.paymentConfirmed ? (
                                   <div className="flex flex-col gap-2">
                                     <p className="text-xs text-amber-700 font-bold bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                                       💰 Payment required before delivery
                                     </p>
                                     <button
                                       onClick={(e) => { e.stopPropagation(); openDeliveryFlow(order); }}
                                       className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 active:scale-95 transition-all"
                                     >
                                       Confirm Payment First
                                     </button>
                                   </div>
                                 ) : (
                                   <HandoverCodeWidget
                                     mode="giver"
                                     handoverType={dropoffHandoverType}
                                     orderId={order.id}
                                     taskId={task.id}
                                     buttonLabel={isCustomerDropoff ? "Mark Delivered" : "Dispatch"}
                                     autoGenerate={autoGenerateCodeOrderId === order.id}
                                     onConfirmed={() => {
                                       setAutoGenerateCodeOrderId(null);
                                       loadMyDeliveries();
                                     }}
                                   />
                                 )}
                               </div>
                             </div>
                           );
                        })()}
                      </>
                    )}
                  </div>
                    );
                  })()}
                </DeliveryTaskConsole>
              ))}

              {/* Load More */}
              {orders.length > visibleCount && (
                <div className="text-center pt-6">
                  <button
                    onClick={() => setVisibleCount(c => c + 20)}
                    className="px-6 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm rounded-xl border border-blue-200 transition-all flex items-center gap-2 mx-auto"
                  >
                    Load More ({orders.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <CollectionConfirmationModal
        isOpen={showCollectionModal}
        task={selectedTask}
        onClose={() => { setShowCollectionModal(false); setSelectedTask(null); }}
        onConfirm={handleConfirmCollection}
      />

      <PaymentVerificationModal
        isOpen={showPaymentModal}
        order={selectedOrder}
        onClose={() => { setShowPaymentModal(false); setSelectedOrder(null); }}
        onPaymentVerified={handlePaymentVerified}
      />

      {showChatModal && chatOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <FaComments className="text-xl" />
                <div>
                  <h3 className="font-bold">Chat with Admin</h3>
                  <p className="text-[10px] text-blue-100 italic">Order #{chatOrder.orderNumber}</p>
                </div>
              </div>
              <button onClick={() => setShowChatModal(false)} className="text-white hover:text-blue-100 text-2xl">&times;</button>
            </div>
            <div className="p-4">
              <DeliveryChat orderId={chatOrder.id} receiverId={1} receiverName="System Administrator" />
            </div>
            <div className="p-4 bg-gray-50 border-t text-center">
              <button onClick={() => setShowChatModal(false)} className="text-xs font-bold text-gray-500 hover:text-gray-700">Close Chat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryAgentOrders;
