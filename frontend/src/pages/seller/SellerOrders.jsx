import React, { useEffect, useState, useRef } from 'react'
import api from '../../services/api'
import { getSocket } from '../../services/socket'
import { recursiveParse, ensureArray, normalizeIngredient } from '../../utils/parsingUtils'
import DispatchDetailsModal from '../../components/seller/DispatchDetailsModal'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/use-toast'
import LogisticsDestination from '../../components/delivery/LogisticsDestination'
import { resolveImageUrl, FALLBACK_IMAGE } from '../../utils/imageUtils'
import HandoverCodeWidget from '../../components/delivery/HandoverCodeWidget'
import { FaUtensils, FaClock } from 'react-icons/fa'

import { buildOrderLifecycleSteps } from '../../utils/orderLifecycle';
export default function SellerOrders() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [message, setMessage] = useState('')
  const [communicationLog, setCommunicationLog] = useState([])
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [shippingType, setShippingType] = useState('shipped_from_seller')
  const [warehouses, setWarehouses] = useState([])
  const [pickupStations, setPickupStations] = useState([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [selectedPickupStationId, setSelectedPickupStationId] = useState('')
  const [destinationType, setDestinationType] = useState('warehouse') // 'warehouse' or 'pickup_station'
  const [submissionDeadline, setSubmissionDeadline] = useState(null)
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [activeTab, setActiveTab] = useState('pending')
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 })
  const [currentPage, setCurrentPage] = useState(1)
  const [processingOrderId, setProcessingOrderId] = useState(null)
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [selectedOrderIds, setSelectedOrderIds] = useState([])
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [sellerSettings, setSellerSettings] = useState({
    autoConfirmFastFood: false,
    autoConfirmProducts: false,
    defaultProductShippingType: 'collected_from_seller'
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const hasFetchedRef = useRef(false)
  const pageSize = 15;

  const isFastFoodOnlyOrder = (order) => {
    const items = Array.isArray(order?.OrderItems) ? order.OrderItems : [];
    if (!items.length) return false;

    const hasFastFood = items.some((item) => !!item?.FastFood || String(item?.itemType || '').toLowerCase() === 'fastfood');
    const hasNonFastFood = items.some((item) => {
      if (item?.Product) return true;
      const itemType = String(item?.itemType || '').toLowerCase();
      return itemType && itemType !== 'fastfood';
    });

    return hasFastFood && !hasNonFastFood;
  };

  const PENDING_STATUSES = [
    'order_placed', 'seller_confirmed', 'en_route_to_warehouse',
    'at_warehouse', 'ready_for_pickup', 'in_transit',
    'processing', 'super_admin_confirmed'
  ]
  const DELIVERED_STATUSES = ['delivered']
  const FINALIZED_STATUSES = ['completed', 'failed', 'cancelled']
  const RETURN_STATUSES = [
    'return_approved', 'return_at_pick_station', 'return_in_transit', 
    'return_at_warehouse', 'returned', 'return_rejected'
  ]

  // Filtered rows are now fetched directly from server based on activeTab
  const filteredRows = rows;

  useEffect(() => {
    let alive = true
    const loadLogisticsData = async () => {
      try {
        const [wRes, pRes] = await Promise.all([
          api.get('/warehouses?active=true'),
          api.get('/pickup-stations?activeOnly=true')
        ])
        if (alive) {
          setWarehouses(wRes.data.warehouses || [])
          setPickupStations(pRes.data.stations || [])
        }
      } catch (e) {
        console.error('Failed to load logistics data:', e)
      }
    }
    loadLogisticsData()
    fetchSellerProfile()
    return () => { alive = false }
  }, [])

  const fetchSellerProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data) {
        setSellerSettings({
          autoConfirmFastFood: res.data.autoConfirmFastFood || false,
          autoConfirmProducts: res.data.autoConfirmProducts || false,
          defaultProductShippingType: res.data.defaultProductShippingType || 'collected_from_seller'
        });
      }
    } catch (err) {
      console.error('Failed to fetch seller settings:', err);
    }
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      setIsSavingSettings(true);
      const res = await api.patch('/seller/settings', newSettings);
      if (res.data.success) {
        setSellerSettings(res.data.settings);
        setShowSettingsModal(false);
        alert('Settings saved successfully!');
      }
    } catch (err) {
      alert('Failed to save settings: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSavingSettings(false);
    }
  };


  const isFetchingRef = useRef(false);

  useEffect(() => {
    let alive = true

    const loadOrders = async (showLoading = true) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        if (showLoading) setLoading(true)
        const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('Orders Timeout')), ms));

        // Map activeTab to status parameter
        let statuses = '';
        if (activeTab === 'pending') statuses = [...new Set(PENDING_STATUSES)].join(',');
        else if (activeTab === 'delivered') statuses = [...new Set(DELIVERED_STATUSES)].join(',');
        else if (activeTab === 'finalized') statuses = [...new Set(FINALIZED_STATUSES)].join(',');
        else if (activeTab === 'returns') statuses = [...new Set(RETURN_STATUSES)].join(',');

        const url = `/seller/orders?status=${statuses}&page=${currentPage}&pageSize=${pageSize}`;
        const res = await Promise.race([api.get(url), timeout(30000)]);

        if (alive) {
          const dataObj = res.data;
          const list = Array.isArray(dataObj.data) ? dataObj.data : (dataObj.data?.data || []);
          const metaData = dataObj.meta || { total: list.length, page: 1, totalPages: 1 };

          setRows(list);
          setMeta(metaData);
        }
      } catch (e) {
        console.error('Failed to load orders:', e)
        if (showLoading && alive) {
          toast({ title: 'Load Error', description: 'The server is taking too long to respond.', variant: 'destructive' });
        }
      } finally {
        if (alive && showLoading) setLoading(false)
        isFetchingRef.current = false;
      }
    }

    loadOrders(true)

    // Polling every 30 seconds as fallback
    const interval = setInterval(() => {
      loadOrders(false);
    }, 30000);

    return () => {
      alive = false;
      clearInterval(interval);
      isFetchingRef.current = false;
    }
  }, [activeTab, currentPage])

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedOrderIds([]); // Clear selection on tab change
  };

  useEffect(() => {
    const socket = getSocket()
    const handleStatusUpdate = (data) => {
      // data: { orderId, status, orderNumber, warehouseId, pickupStationId, shippingType ... }
      setRows(prevRows => prevRows.map(order =>
        order.id === data.orderId ? { ...order, ...data } : order
      ))

      // Update selectedOrder if it's currently being viewed in a modal
      setSelectedOrder(current => {
        if (current && current.id === data.orderId) {
          return { ...current, ...data };
        }
        return current;
      });
    }

    socket.on('orderStatusUpdate', handleStatusUpdate)
    
    const handleNewOrder = (data) => {
      // If we receive a new order notification, we should ideally re-fetch or add it if it belongs to this seller
      // For now, simpler to just trigger a silent refresh of the pending list
      console.log('🔔 Real-time new order notification:', data);
      if (activeTab === 'pending') {
        loadOrders(false); // Silent refresh
      }
    };
    socket.on('orderNotification', handleNewOrder);

    const handleOrderMessage = (data) => {
      console.log('Received real-time order message:', data);
      if (selectedOrder && selectedOrder.id === data.orderId) {
        loadCommunicationLog(data.orderId);
      }
    }
    socket.on('orderMessage', handleOrderMessage)
    socket.on('handover:generated', handleHandoverGenerated)

    return () => {
      socket.off('orderStatusUpdate', handleStatusUpdate)
      socket.off('orderNotification', handleNewOrder)
      socket.off('orderMessage', handleOrderMessage)
      socket.off('handover:generated', handleHandoverGenerated)
    }
  }, [selectedOrder, activeTab])

  const handleHandoverGenerated = (data) => {
    // data: { orderId, orderNumber, handoverType, label ... }
    setRows(prevRows => prevRows.map(order =>
      order.id === data.orderId ? { ...order, activeHandoverCode: true } : order
    ))
    toast({ title: 'New Handover Code', description: `A code for ${data.label} has been generated.` })
  }

  // Sync modal local state with selectedOrder's logistics data (handles group consolidation sync)
  useEffect(() => {
    if (selectedOrder) {
      if (selectedOrder.destinationWarehouseId || selectedOrder.warehouseId) {
        setSelectedWarehouseId(selectedOrder.destinationWarehouseId || selectedOrder.warehouseId);
        setDestinationType('warehouse');
      }
      if (selectedOrder.destinationPickStationId || selectedOrder.pickupStationId) {
        setSelectedPickupStationId(selectedOrder.destinationPickStationId || selectedOrder.pickupStationId);
        setDestinationType('pickup_station');
      }
      if (selectedOrder.shippingType) {
        setShippingType(selectedOrder.shippingType);
      }
    }
  }, [selectedOrder])

  const toggleOrderSelection = (id) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
    );
  };

  const toggleAllSelection = () => {
    const confirmableOnPage = rows.filter(o => o.status === 'super_admin_confirmed' && !o.sellerConfirmed).map(o => o.id);
    if (selectedOrderIds.length === confirmableOnPage.length && confirmableOnPage.length > 0) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(confirmableOnPage);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus, notes = '') => {
    if (processingOrderId === orderId) return
    setProcessingOrderId(orderId)
    try {
      const res = await api.patch(`/orders/${orderId}/seller-status`, {
        status: newStatus,
        notes: notes
      })
      if (res.data.success) {
        setRows(rows.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        ))
        toast({ title: 'Status Updated', description: `Order updated to ${newStatus.replace(/_/g, ' ')}` })
      }
    } catch (error) {
      toast({ title: 'Update Failed', description: error.response?.data?.error || error.message, variant: 'destructive' })
    } finally {
      setProcessingOrderId(null)
    }
  }

  const handleConfirmOrder = async (orderId) => {
    if (processingOrderId === 'bulk' || processingOrderId === orderId) return
    const isBulk = Array.isArray(orderId);
    setProcessingOrderId(isBulk ? 'bulk' : orderId)
    try {
      // For bulk, we use the first selected order to determine fastFoodOnly (simplification)
      const fastFoodOnly = isFastFoodOnlyOrder(selectedOrder);

      const payload = {
        shippingType: fastFoodOnly ? null : shippingType,
        warehouseId: fastFoodOnly ? null : ((shippingType === 'shipped_from_seller' && destinationType === 'warehouse') ? selectedWarehouseId : null),
        pickupStationId: fastFoodOnly ? null : ((shippingType === 'shipped_from_seller' && destinationType === 'pickup_station') ? selectedPickupStationId : null),
        submissionDeadline: fastFoodOnly ? null : (shippingType === 'shipped_from_seller' ? submissionDeadline : null),
        message: message || null
      };

      let res;
      if (isBulk) {
        res = await api.post('/orders/bulk-seller-confirm', {
          orderIds: orderId,
          ...payload
        });
      } else {
        res = await api.post(`/orders/${orderId}/seller-confirm`, payload);
      }

      if (res.data.success) {
        const successIds = isBulk ? res.data.results.success : [orderId];
        
        setRows(prevRows => prevRows.map(order =>
          successIds.includes(order.id)
            ? { ...order, sellerConfirmed: true, status: fastFoodOnly ? 'awaiting_delivery_assignment' : 'seller_confirmed' }
            : order
        ));
        
        setShowConfirmModal(false)
        setMessage('')
        setShippingType('shipped_from_seller')
        setSelectedWarehouseId('')
        setSelectedPickupStationId('')
        setDestinationType('warehouse')
        setSubmissionDeadline(null)
        setSelectedOrderIds([])
        
        const msg = isBulk 
          ? `Successfully confirmed ${successIds.length} orders!${res.data.results.failed.length > 0 ? ` (${res.data.results.failed.length} failed)` : ''}` 
          : 'Order confirmed successfully!';
        
        toast({ title: isBulk ? 'Bulk Confirmation' : 'Confirmed', description: msg })
      }
    } catch (error) {
      toast({ title: 'Error', description: error.response?.data?.message || error.message, variant: 'destructive' })
    } finally {
      setProcessingOrderId(null)
    }
  }

  const handleSendMessage = async (orderId) => {
    try {
      const res = await api.post(`/orders/${orderId}/message`, {
        message: message
      })
      if (res.data.success) {
        // Ideally append to local log instead of reload if possible, but reload is safer
        const newMsg = { sender: 'seller', senderName: 'Me', message, timestamp: new Date() }
        setCommunicationLog([...communicationLog, newMsg])
        setMessage('')
        // setShowMessageModal(false) // Keep open for chat flow?
      }
    } catch (error) {
      alert('Failed to send message: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleHandover = async (orderId) => {
    if (!window.confirm('Confirm that this order has been collected from you?')) return;
    if (processingOrderId === orderId) return
    setProcessingOrderId(orderId)
    try {
      const res = await api.post(`/orders/${orderId}/seller-handover`);
      if (res.data.success) {
        setRows(rows.map(order =>
          order.id === orderId ? { ...order, sellerHandoverConfirmed: true, sellerHandoverConfirmedAt: res.data.order.sellerHandoverConfirmedAt } : order
        ));
        toast({ title: 'Handover Confirmed', description: 'Handover confirmed successfully!' });
      }
    } catch (error) {
      toast({ title: 'Handover Failed', description: error.response?.data?.error || error.message, variant: 'destructive' });
    } finally {
      setProcessingOrderId(null)
    }
  };

  const getOrderItemImage = (item) => {
    if (!item) return null;

    if (item.FastFood || item.fastFood) {
      const f = item.FastFood || item.fastFood;
      return f.mainImage || f.image || f.coverImage;
    }

    if (item.Product || item.product) {
      const p = item.Product || item.product;

      const firstImage = (imgField) => {
        if (!imgField) return null;
        if (Array.isArray(imgField)) return imgField[0];
        if (typeof imgField === 'string' && imgField.startsWith('[')) {
          try { return JSON.parse(imgField)[0]; } catch (e) { return null; }
        }
        return imgField;
      };

      return (
        p.coverImage ||
        p.mainImage ||
        firstImage(p.images) ||
        firstImage(p.galleryImages) ||
        p.image
      );
    }

    if (item.Service || item.service) {
      const s = item.Service || item.service;
      return s.mainImage || s.image || s.coverImage;
    }

    return item.image || item.imageUrl || null;
  };

  const loadCommunicationLog = async (orderId) => {
    try {
      const res = await api.get(`/orders/${orderId}/communication`)
      if (res.data.success) {
        setCommunicationLog(res.data.communicationLog || [])
      }
    } catch (error) {
      console.error('Failed to load communication log:', error)
      setCommunicationLog([])
    }
  }

  const getStatusBadge = (status) => {
    const statusColors = {
      'order_placed': 'bg-amber-100 text-amber-800 border border-amber-200',
      'seller_confirmed': 'bg-blue-100 text-blue-800 border border-blue-200',
      'en_route_to_warehouse': 'bg-indigo-100 text-indigo-800 border border-indigo-200',
      'at_warehouse': 'bg-teal-100 text-teal-800 border border-teal-200',
      'super_admin_confirmed': 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      'processing': 'bg-purple-100 text-purple-800 border border-purple-200',
      'ready_for_pickup': 'bg-sky-100 text-sky-800 border border-sky-200',
      'in_transit': 'bg-orange-100 text-orange-800 border border-orange-200',
      'delivered': 'bg-green-100 text-green-800 border border-green-200',
      'completed': 'bg-gray-900 text-white shadow-lg',
      'failed': 'bg-red-600 text-white shadow-sm',
      'cancelled': 'bg-red-100 text-red-800 border border-red-200',
      'returned': 'bg-pink-600 text-white shadow-sm',
      'return_approved': 'bg-pink-100 text-pink-800 border border-pink-200',
      'return_at_pick_station': 'bg-pink-100 text-pink-800 border border-pink-200',
      'return_in_transit': 'bg-pink-100 text-pink-800 border border-pink-200',
      'return_at_warehouse': 'bg-pink-100 text-pink-800 border border-pink-200',
      'return_rejected': 'bg-gray-100 text-gray-800 border border-gray-200'
    }
    return statusColors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-0 sm:p-6 flex flex-col flex-1">
      <div className="flex justify-between items-center mb-6 gap-4">
        <div className="flex-1">
          <h1 className="text-[clamp(1.1rem,4vw,1.8rem)] font-black text-gray-800 leading-tight">My Sales Management</h1>

        </div>
        <button
          onClick={() => setShowSettingsModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-[clamp(0.65rem,1.8vw,0.75rem)] font-black text-gray-700 shadow-sm hover:bg-gray-50 transition-all active:scale-95 whitespace-nowrap"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="hidden xs:inline">Logistics Settings</span>
          <span className="xs:hidden">Settings</span>
        </button>
      </div>


      {/* Tabs */}
      <div className="flex space-x-2 sm:space-x-6 mb-8 border-b border-gray-100 overflow-x-auto no-scrollbar">
        {[
          { id: 'pending', label: 'Pending Orders' },
          { id: 'delivered', label: 'Delivered' },
          { id: 'finalized', label: 'Finalized' },
          { id: 'returns', label: 'Returns', color: 'pink' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`pb-3 px-1 text-[clamp(0.65rem,2.2vw,0.875rem)] font-black transition-all uppercase tracking-tight whitespace-nowrap ${activeTab === tab.id 
              ? `border-b-2 border-${tab.color || 'blue'}-600 text-${tab.color || 'blue'}-600` 
              : 'text-gray-400 hover:text-gray-600'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

        {/* Professional Table View (Scrollable on Mobile) */}
        <div className="overflow-x-auto pb-4">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-gray-50/50 text-gray-700">
            <tr>
              <th className="p-1.5 sm:p-4 w-[12%]">
                {activeTab === 'pending' && (
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
                    checked={selectedOrderIds.length > 0 && selectedOrderIds.length === rows.filter(o => o.status === 'super_admin_confirmed' && !o.sellerConfirmed).length}
                    onChange={toggleAllSelection}
                  />
                )}
              </th>
              <th className="text-left p-1.5 sm:p-4 font-black uppercase tracking-wider text-[9px] text-gray-400 w-[53%] md:w-[30%]">Order #</th>
              <th className="text-left p-1.5 sm:p-4 font-black uppercase tracking-wider text-[9px] text-gray-400 w-[35%] md:w-[20%]">Status</th>
              <th className="hidden md:table-cell text-right p-1.5 sm:p-4 font-black uppercase tracking-wider text-[9px] text-gray-400 md:w-[20%]">Total</th>
              <th className="hidden md:table-cell text-left p-1.5 sm:p-4 font-black uppercase tracking-wider text-[9px] text-gray-400 md:w-[20%]">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                    <span className="text-xs font-bold animate-pulse text-blue-600 uppercase tracking-widest">Loading Sales...</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-12 text-center text-gray-500 font-medium italic">
                  No {activeTab} sales found.
                </td>
              </tr>
            ) : (
              filteredRows.map(o => {
                const directDeliveryOrder = o.adminRoutingStrategy === 'direct_delivery' || isFastFoodOnlyOrder(o);
                const isExpanded = expandedOrderId === o.id;
                const isSelected = selectedOrderIds.includes(o.id);
                const itemCount = (o.OrderItems || []).reduce((a, b) => a + (b.quantity || 0), 0);
                return (
                  <React.Fragment key={o.id}>
                    <tr 
                      className={`border-t hover:bg-gray-50 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/30' : ''} ${isSelected ? 'bg-blue-50/50' : ''}`}
                      onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                    >
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        {o.status === 'super_admin_confirmed' && !o.sellerConfirmed ? (
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            checked={isSelected}
                            onChange={() => toggleOrderSelection(o.id)}
                          />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                      </td>
                      <td className="p-4 min-w-0">
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                              </svg>
                            </span>
                            <span className="font-black text-gray-900 text-[11px] truncate">{o.orderNumber}</span>
                          </div>
                          
                          {/* Fulfillment Visibility At-A-Glance */}
                          {(o.batch || o.deliveryTimePreference) && (
                            <div className="flex items-center gap-1.5 ml-5">
                              <div className="px-2 py-0.5 bg-blue-50 border border-blue-100 rounded text-[9px] font-black text-blue-600 uppercase flex items-center gap-1">
                                <FaClock className="h-2 w-2" />
                                {o.batch ? o.batch.name : o.deliveryTimePreference}
                              </div>
                              {o.batch?.expectedDeliveryTime && (
                                <span className="text-[9px] font-bold text-gray-400">@{o.batch.expectedDeliveryTime}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${getStatusBadge(o.status)}`}>
                          {o.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="hidden md:table-cell p-4 text-right font-black text-blue-600 whitespace-nowrap">KES {Number(o.sellerTotal || 0).toLocaleString()}</td>
                      <td className="hidden md:table-cell p-4 text-[11px] font-bold text-gray-500 uppercase whitespace-nowrap">{new Date(o.createdAt).toLocaleString()}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-blue-50/30 border-b-2 border-blue-100">
                        <td colSpan="5" className="p-1 sm:p-4">
                          {/* Pinned Container: Flushed to the left margin */}
                          <div className="sticky left-0 w-[calc(100vw-20px)] sm:w-full ml-0">
                            <div className="bg-white rounded-2xl border border-blue-100 shadow-xl p-4 sm:p-6 animate-in slide-in-from-top-4 duration-300">
                              <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-100">
                                <div>
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Earnings</p>
                                  <p className="text-lg font-black text-blue-600">KES {Number(o.sellerTotal || 0).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Order Date</p>
                                  <p className="text-[11px] font-black text-gray-900 uppercase">{new Date(o.createdAt).toLocaleDateString()}</p>
                                  <p className="text-[9px] font-bold text-gray-400">{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                              </div>
                              <div className="flex justify-between items-center mb-6">
                                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Ordered Items ({itemCount})</h4>
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Order ID: {o.id}</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                {(o.OrderItems || []).map((item) => (
                                  <div key={item.id} className="flex items-start gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-blue-200 transition-colors">
                                    <div className="w-14 h-14 bg-white rounded-xl overflow-hidden border border-gray-100 flex-shrink-0 shadow-sm mt-0.5">
                                      <img
                                        src={resolveImageUrl(getOrderItemImage(item))}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-black text-gray-900 leading-tight mb-1">{item.itemLabel || item.name || item.Product?.name || item.FastFood?.name}</p>
                                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Qty: {item.quantity} × KES {Number(item.Product?.basePrice || item.FastFood?.basePrice || 0).toLocaleString()}</p>
                                      <p className="text-sm font-black text-blue-600 mt-1">KES {Number((item.Product?.basePrice || item.FastFood?.basePrice || 0) * item.quantity).toLocaleString()}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {o.deliveryInstructions && (
                                <div className="mb-8 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-start gap-3">
                                  <div className="p-2 bg-orange-200 rounded-lg text-orange-700 flex-shrink-0">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1">Special Instructions</p>
                                    <p className="text-xs font-medium text-orange-800 italic leading-relaxed">"{o.deliveryInstructions}"</p>
                                  </div>
                                </div>
                              )}

                              {/* Actions Section */}
                              <div className="pt-6 border-t border-gray-100">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Available Actions</p>
                                <div className="flex flex-row gap-1.5 sm:gap-3">
                                  {o.status === 'order_placed' && (
                                    <div className="flex-1 min-w-0 flex items-center justify-center gap-1 px-1 py-2 bg-amber-50 text-amber-700 text-[9px] xs:text-[10px] rounded-xl font-bold border border-amber-100">
                                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse flex-shrink-0"></div>
                                      <span className="truncate">Awaiting Admin</span>
                                    </div>
                                  )}
                                  {o.status === 'super_admin_confirmed' && !o.sellerConfirmed && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedOrder(o);
                                        if (o.adminRoutingStrategy === 'warehouse' && o.destinationWarehouseId) {
                                          setShippingType('shipped_from_seller'); setDestinationType('warehouse'); setSelectedWarehouseId(o.destinationWarehouseId);
                                        } else if (o.adminRoutingStrategy === 'pick_station' && o.destinationPickStationId) {
                                          setShippingType('shipped_from_seller'); setDestinationType('pickup_station'); setSelectedPickupStationId(o.destinationPickStationId);
                                        } else if (directDeliveryOrder) {
                                          setShippingType('collected_from_seller');
                                        }
                                        const dl = new Date(); dl.setHours(dl.getHours() + 24); setSubmissionDeadline(dl.toISOString());
                                        setShowConfirmModal(true);
                                      }}
                                      className="flex-1 min-w-0 px-1 py-2.5 bg-green-600 text-white text-[9px] xs:text-[10px] font-black uppercase rounded-xl shadow-md hover:bg-green-700 active:scale-95 transition-all flex flex-col xs:flex-row items-center justify-center gap-1"
                                    >
                                      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                      <span className="truncate">Confirm</span>
                                    </button>
                                  )}
                                  
                                  {o.status === 'seller_confirmed' && o.shippingType === 'shipped_from_seller' && !directDeliveryOrder && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); setShowDispatchModal(true); }}
                                      className="flex-1 min-w-0 px-1 py-2.5 bg-indigo-600 text-white text-[9px] xs:text-[10px] font-black uppercase rounded-xl shadow-md hover:bg-indigo-700 active:scale-95 transition-all flex flex-col xs:flex-row items-center justify-center gap-1"
                                    >
                                      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                      <span className="truncate">Dispatch</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOrder(o); setShowMessageModal(true); loadCommunicationLog(o.id);
                                    }}
                                    className="flex-1 min-w-0 px-1 py-2.5 bg-blue-600 text-white text-[9px] xs:text-[10px] font-black uppercase rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition-all flex flex-col xs:flex-row items-center justify-center gap-1"
                                  >
                                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                    <span className="truncate">Chat</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOrder(o); setShowDetailsModal(true);
                                    }}
                                    className="flex-1 min-w-0 px-1 py-2.5 bg-gray-600 text-white text-[9px] xs:text-[10px] font-black uppercase rounded-xl shadow-md hover:bg-gray-700 active:scale-95 transition-all flex flex-col xs:flex-row items-center justify-center gap-1"
                                  >
                                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span className="truncate">Details</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
            </tbody>
          </table>
        </div>

      {/* Floating Selection Bar */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-white border-2 border-blue-600 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 min-w-[300px]">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Selected Items</span>
              <span className="text-lg font-black text-gray-900">{selectedOrderIds.length} Orders</span>
            </div>
            <div className="h-10 w-[1px] bg-gray-100" />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const firstSelected = rows.find(r => r.id === selectedOrderIds[0]);
                  setSelectedOrder(firstSelected);
                  const fastFoodOnly = isFastFoodOnlyOrder(firstSelected);
                  if (firstSelected.adminRoutingStrategy === 'warehouse' && firstSelected.destinationWarehouseId) {
                    setShippingType('shipped_from_seller'); setDestinationType('warehouse'); setSelectedWarehouseId(firstSelected.destinationWarehouseId);
                  } else if (firstSelected.adminRoutingStrategy === 'pick_station' && firstSelected.destinationPickStationId) {
                    setShippingType('shipped_from_seller'); setDestinationType('pickup_station'); setSelectedPickupStationId(firstSelected.destinationPickStationId);
                  }
                  const dl = new Date(); dl.setHours(dl.getHours() + 24); setSubmissionDeadline(dl.toISOString());
                  setShowConfirmModal(true);
                }}
                className="px-6 py-2.5 bg-green-600 text-white text-xs font-black uppercase rounded-xl shadow-lg shadow-green-600/20 hover:bg-green-700 active:scale-95 transition-all"
              >
                Confirm All
              </button>
              <button
                onClick={() => setSelectedOrderIds([])}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 text-xs font-black uppercase rounded-xl hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {meta.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <div className="flex items-center gap-1">
            {[...Array(meta.totalPages)].map((_, i) => {
              const page = i + 1;
              if (page === 1 || page === meta.totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${currentPage === page ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {page}
                  </button>
                );
              } else if (page === currentPage - 2 || page === currentPage + 2) {
                return <span key={page} className="px-1 text-gray-400">...</span>;
              }
              return null;
            })}
          </div>
          <button
            disabled={currentPage === meta.totalPages}
            onClick={() => setCurrentPage(prev => Math.min(meta.totalPages, prev + 1))}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Confirm Order Modal */}
      {showConfirmModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            {(() => {
              const fastFoodOnly = isFastFoodOnlyOrder(selectedOrder);
              const requiresHubDestination = !fastFoodOnly && shippingType === 'shipped_from_seller' && selectedOrder.adminRoutingStrategy !== 'direct_delivery';
              return (
                <>
            <h3 className="text-lg font-semibold mb-4">
              {selectedOrderIds.length > 1 ? `Bulk Confirm ${selectedOrderIds.length} Orders` : `Confirm Order ${selectedOrder.orderNumber}`}
            </h3>

            {/* Admin Routing Info Banner */}
            {selectedOrder.adminRoutingStrategy && (
              <div className="mb-4 p-3 bg-emerald-50 border-2 border-emerald-200 rounded-lg">
                <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  Admin Has Set Delivery Routing
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase">Customer Preference</p>
                    <p className="font-bold text-gray-800">
                      {selectedOrder.deliveryMethod === 'home_delivery' ? '🏠 Home Delivery' : '🏪 Pick Station'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase">Routing Strategy</p>
                    <p className="font-bold text-gray-800 capitalize">{selectedOrder.adminRoutingStrategy.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                {selectedOrder.adminRoutingStrategy === 'warehouse' && selectedOrder.DestinationWarehouse && (
                  <div className="mt-2 p-2 bg-white rounded border border-emerald-100">
                    <p className="text-[10px] font-bold text-blue-700 uppercase">Destination Warehouse</p>
                    <p className="text-sm font-bold">{selectedOrder.DestinationWarehouse.name}</p>
                    <p className="text-[10px] text-gray-500">{selectedOrder.DestinationWarehouse.address}</p>
                  </div>
                )}
                {selectedOrder.adminRoutingStrategy === 'pick_station' && selectedOrder.DestinationPickStation && (
                  <div className="mt-2 p-2 bg-white rounded border border-emerald-100">
                    <p className="text-[10px] font-bold text-purple-700 uppercase">Destination Pick Station</p>
                    <p className="text-sm font-bold">{selectedOrder.DestinationPickStation.name}</p>
                    <p className="text-[10px] text-gray-500">{selectedOrder.DestinationPickStation.location}</p>
                  </div>
                )}
                {selectedOrder.adminRoutingStrategy === 'direct_delivery' && (
                  <div className="mt-2 p-2 bg-white rounded border border-emerald-100">
                    <p className="text-[10px] font-bold text-green-700 uppercase">Direct Delivery to Customer</p>
                    <p className="text-sm font-bold">{selectedOrder.deliveryAddress || 'Customer address'}</p>
                    <p className="text-[10px] text-gray-500 italic">A driver will be assigned to collect from you.</p>
                  </div>
                )}
                {selectedOrder.adminRoutingNotes && (
                  <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-700 uppercase">Admin Notes</p>
                    <p className="text-xs text-gray-700">{selectedOrder.adminRoutingNotes}</p>
                  </div>
                )}
              </div>
            )}

            {selectedOrder.adminRoutingStrategy === 'direct_delivery' || fastFoodOnly ? (
              <div className="mb-4 p-4 bg-green-50 rounded-xl border-2 border-green-200">
                <p className="text-[10px] font-black text-green-800 uppercase tracking-widest mb-1">Direct Delivery Order</p>
                <p className="text-sm text-gray-700">A driver will be assigned to collect items from you and deliver directly to the customer.</p>
                <p className="text-sm font-bold mt-2">📍 {selectedOrder.deliveryAddress || 'Customer address on file'}</p>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Logistics Method (To Warehouse):</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 border p-2 rounded cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="shippingType"
                      value="shipped_from_seller"
                      checked={shippingType === 'shipped_from_seller'}
                      onChange={(e) => setShippingType(e.target.value)}
                    />
                    <div>
                      <div className="font-medium">Deliver to Warehouse</div>
                      <div className="text-xs text-gray-500">I will bring the item to the central warehouse myself</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 border p-2 rounded cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="shippingType"
                      value="collected_from_seller"
                      checked={shippingType === 'collected_from_seller'}
                      onChange={(e) => setShippingType(e.target.value)}
                    />
                    <div>
                      <div className="font-medium">Request Collection</div>
                      <div className="text-xs text-gray-500">I need the admin to arrange collection (Cost logic TBD)</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {requiresHubDestination && (
              <div className="mb-4 p-4 bg-blue-50 rounded-2xl border-2 border-blue-100 shadow-sm">
                <label className="block text-[10px] font-black text-blue-800 uppercase tracking-widest mb-3">Target Destination:</label>

                {/* Destination Toggle */}
                <div className="flex bg-white/50 p-1 rounded-xl border border-blue-200 mb-4">
                  <button
                    onClick={() => setDestinationType('warehouse')}
                    disabled={!!selectedOrder.destinationWarehouseId || !!selectedOrder.destinationPickStationId || !!selectedOrder.warehouseId || !!selectedOrder.pickupStationId}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${destinationType === 'warehouse' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-600 hover:bg-blue-50'}`}
                  >
                    Warehouse
                  </button>
                  <button
                    onClick={() => setDestinationType('pickup_station')}
                    disabled={!!selectedOrder.destinationWarehouseId || !!selectedOrder.destinationPickStationId || !!selectedOrder.warehouseId || !!selectedOrder.pickupStationId}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${destinationType === 'pickup_station' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-600 hover:bg-blue-50'}`}
                  >
                    Pickup Station
                  </button>
                </div>

                {(selectedOrder.adminRoutingStrategy) && (
                  <div className="mb-3 flex items-center gap-2 px-2 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                    <span className="text-[10px] font-black uppercase">Admin Assigned</span>
                    <p className="text-[9px] font-bold leading-tight">
                      Destination set by admin. Cannot be changed.
                    </p>
                  </div>
                )}

                {destinationType === 'warehouse' ? (
                  <select
                    className="w-full p-3 border-2 border-blue-200/50 rounded-xl bg-white text-sm font-bold text-gray-900 focus:border-blue-500 outline-none transition-all"
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    disabled={!!selectedOrder.destinationWarehouseId || !!selectedOrder.warehouseId || !!selectedOrder.pickupStationId}
                    required
                  >
                    <option value="">-- Choose Warehouse --</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} - {w.town || w.address}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    className="w-full p-3 border-2 border-blue-200/50 rounded-xl bg-white text-sm font-bold text-gray-900 focus:border-blue-500 outline-none transition-all"
                    value={selectedPickupStationId}
                    onChange={(e) => setSelectedPickupStationId(e.target.value)}
                    disabled={!!selectedOrder.destinationPickStationId || !!selectedOrder.warehouseId || !!selectedOrder.pickupStationId}
                    required
                  >
                    <option value="">-- Choose Pickup Station --</option>
                    {pickupStations.map(ps => (
                      <option key={ps.id} value={ps.id}>{ps.name} ({ps.location})</option>
                    ))}
                  </select>
                )}

                {(selectedOrder.warehouseId || selectedOrder.pickupStationId) && (
                  <div className="mt-3 flex items-center gap-2 px-2 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                    <span className="text-[10px] font-black uppercase animate-pulse">Synced!</span>
                    <p className="text-[9px] font-bold leading-tight uppercase">
                      Destination locked because it was selected for another item in this order group.
                    </p>
                  </div>
                )}
                <div className="mt-3">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Submission Deadline</span>
                  <div className="text-sm font-black text-red-600">
                    {new Date(submissionDeadline).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Please ensure the item reaches the hub by this time.</p>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Note to Admin (Optional):</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-2 border rounded"
                rows="2"
                placeholder="Any special instructions..."
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handleConfirmOrder(selectedOrderIds.length > 1 ? selectedOrderIds : selectedOrder.id)}
                disabled={!!processingOrderId}
                className="flex-1 py-3 bg-green-600 text-white font-black uppercase rounded-xl shadow-lg hover:bg-green-700 disabled:opacity-50 transition-all"
              >
                {processingOrderId ? 'Confirming...' : (selectedOrderIds.length > 1 ? `Confirm ${selectedOrderIds.length} Orders` : 'Confirm Order')}
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-black uppercase rounded-xl hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
            </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Chat with Admin - Order #{selectedOrder.orderNumber}</h3>

            {/* Communication Log */}
            <div className="flex-1 overflow-y-auto mb-4 border rounded p-3 bg-gray-50 min-h-[200px]">
              {communicationLog.length === 0 ? (
                <p className="text-gray-500 text-center italic mt-10">No messages yet. Start the conversation!</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {communicationLog.map((msg, index) => {
                    const isMe = msg.sender === 'seller' || msg.senderId === user?.id; // broad check
                    return (
                      <div key={index} className={`max-w-[80%] p-2 rounded-lg ${isMe ? 'bg-blue-100 self-end ml-auto' : 'bg-white border self-start'}`}>
                        <div className="flex justify-between items-baseline gap-4 mb-1">
                          <span className="text-xs font-bold text-gray-700">{msg.senderName || msg.sender}</span>
                          <span className="text-[10px] text-gray-500">{new Date(msg.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-sm dark:text-gray-900">{msg.message}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* New Message */}
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 p-2 border rounded"
                placeholder="Type a message..."
                onKeyDown={(e) => e.key === 'Enter' && message.trim() && handleSendMessage(selectedOrder.id)}
              />
              <button
                onClick={() => handleSendMessage(selectedOrder.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={!message.trim()}
              >
                Send
              </button>
            </div>

            <button
              onClick={() => setShowMessageModal(false)}
              className="mt-2 text-sm text-gray-500 hover:text-gray-700 underline self-center"
            >
              Close Chat
            </button>
          </div>
        </div>
      )}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Order Details #{selectedOrder.orderNumber}</h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-500">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Financial Summary
                </h4>
                {(() => {
                  const actualTotalEarning = (selectedOrder.OrderItems || []).reduce((sum, item) => sum + ((item.Product?.basePrice || item.FastFood?.basePrice || 0) * item.quantity), 0);
                  return (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-900 flex justify-between"><strong>Date:</strong> <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span></p>
                      <p className="text-sm text-gray-900 flex justify-between font-bold border-t pt-1 mt-1">
                        <strong>Total Seller Earning:</strong>
                        <span className="text-green-600">KES {actualTotalEarning.toLocaleString()}</span>
                      </p>
                      <p className="text-[10px] text-gray-500 italic text-right">Base price only. Fees not included.</p>
                    </div>
                  );
                })()}
              </div>

              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100/50">
                <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  Logistics Context
                </h4>
                <div className="space-y-1 text-sm">
                  <p className="flex justify-between"><strong>Shipping Mode:</strong> <span className="capitalize">{selectedOrder.shippingType?.replace(/_/g, ' ') || 'N/A'}</span></p>
                  <p className="flex justify-between"><strong>Delivery Target:</strong> <span>{selectedOrder.adminRoutingStrategy === 'fastfood_pickup_point' ? 'Pickup Point' : (selectedOrder.deliveryMethod === 'pick_station' ? 'Pickup Station' : 'Customer Address')}</span></p>

                  {selectedOrder.warehouse && (
                    <div className="mt-2 pt-2 border-t border-blue-100">
                      <p className="font-bold text-[11px] text-blue-700 uppercase">Target Warehouse</p>
                      <p className="text-sm">{selectedOrder.warehouse.name}</p>
                      <p className="text-[10px] text-gray-500">{selectedOrder.warehouse.address}</p>
                    </div>
                  )}

                  {selectedOrder.submissionDeadline && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded">
                      <p className="text-[10px] font-bold text-red-700 uppercase">Collection/Drop-off Deadline</p>
                      <p className="text-sm font-black text-red-600">{new Date(selectedOrder.submissionDeadline).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Special Prep / Batch Info Blocks */}
              {(selectedOrder.deliveryInstructions || selectedOrder.batch) && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedOrder.deliveryInstructions && (
                    <div className="bg-orange-50 border-2 border-orange-200 p-4 rounded-xl shadow-sm">
                      <h4 className="font-black text-orange-900 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                        <FaUtensils size={14} className="text-orange-600" />
                        Special Prep Instructions
                      </h4>
                      <p className="text-sm font-bold text-orange-800 leading-relaxed bg-white/50 p-3 rounded-lg border border-orange-100 italic">
                        "{selectedOrder.deliveryInstructions}"
                      </p>
                    </div>
                  )}

                  {selectedOrder.batch && (
                    <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-xl shadow-sm">
                      <h4 className="font-black text-blue-900 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                        <FaClock size={14} className="text-blue-600" />
                        Fulfillment Batch
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/50 p-2 rounded-lg border border-blue-100">
                          <p className="text-[9px] text-blue-600 font-bold uppercase">Name</p>
                          <p className="text-xs font-black text-blue-900">{selectedOrder.batch.name}</p>
                        </div>
                        <div className="bg-white/50 p-2 rounded-lg border border-blue-100">
                          <p className="text-[9px] text-blue-600 font-bold uppercase">Expected Delivery</p>
                          <p className="text-xs font-black text-blue-900">{selectedOrder.batch.expectedDelivery}</p>
                        </div>
                        <div className="bg-white/50 p-2 rounded-lg border border-blue-100 col-span-2">
                          <p className="text-[9px] text-blue-600 font-bold uppercase">Preparation Window</p>
                          <p className="text-xs font-black text-blue-900">{selectedOrder.batch.startTime} - {selectedOrder.batch.endTime}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Routing Info */}
              {selectedOrder.adminRoutingStrategy && (
                <div className="md:col-span-2 bg-emerald-50/50 p-4 rounded-lg border border-emerald-100">
                  <h4 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-600 rounded-full"></span>
                    Admin Routing Decision
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">Routing Strategy</p>
                      <p className="font-bold capitalize">{selectedOrder.adminRoutingStrategy.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">Customer Preference</p>
                      <p className="font-bold">{selectedOrder.deliveryMethod === 'home_delivery' ? '🏠 Home Delivery' : '🏪 Pickup'}</p>
                    </div>
                  </div>
                  {selectedOrder.adminRoutingStrategy === 'warehouse' && selectedOrder.DestinationWarehouse && (
                    <div className="mt-2 p-2 bg-white rounded border border-emerald-100">
                      <p className="text-[10px] font-bold text-blue-700 uppercase">Destination Warehouse</p>
                      <p className="text-sm font-bold">{selectedOrder.DestinationWarehouse.name}</p>
                      <p className="text-[10px] text-gray-500">{selectedOrder.DestinationWarehouse.address}</p>
                    </div>
                  )}
                  {selectedOrder.adminRoutingStrategy === 'pick_station' && selectedOrder.DestinationPickStation && (
                    <div className="mt-2 p-2 bg-white rounded border border-emerald-100">
                      <p className="text-[10px] font-bold text-purple-700 uppercase">Destination Pick Station</p>
                      <p className="text-sm font-bold">{selectedOrder.DestinationPickStation.name}</p>
                      <p className="text-[10px] text-gray-500">{selectedOrder.DestinationPickStation.location}</p>
                    </div>
                  )}
                  {selectedOrder.adminRoutingStrategy === 'direct_delivery' && (
                    <div className="mt-2 p-2 bg-white rounded border border-emerald-100">
                      <p className="text-[10px] font-bold text-green-700 uppercase">Direct Delivery</p>
                      <p className="text-sm font-bold">{selectedOrder.deliveryAddress || 'Customer address'}</p>
                    </div>
                  )}
                  {selectedOrder.adminRoutingNotes && (
                    <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-700 uppercase">Admin Notes</p>
                      <p className="text-xs text-gray-700">{selectedOrder.adminRoutingNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Status Timeline */}
              <div className="md:col-span-2">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                  Status Lifecycle
                </h4>
                {(() => {
                  const steps = buildOrderLifecycleSteps(selectedOrder);

                  return (
                    <div className="flex flex-wrap gap-4 items-start justify-between relative before:absolute before:h-0.5 before:bg-gray-100 before:top-4 before:left-0 before:right-0 before:-z-10">
                      {steps.map((step, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-1 bg-white px-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step.done ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>
                            {step.done ? '✓' : idx + 1}
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-tighter ${step.done ? 'text-green-700' : 'text-gray-400'}`}>{step.label}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Driver / Dispatcher Info */}
              {(selectedOrder.selfDispatcherName || (selectedOrder.deliveryTasks && selectedOrder.deliveryTasks.length > 0)) && (
                <div className="md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-3 border-b pb-1">Transport Details</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Internal Dispatcher (Seller's choice) */}
                    {selectedOrder.selfDispatcherName && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-indigo-600 uppercase">Independent Dispatcher</p>
                        <p className="text-sm"><strong>Name:</strong> {selectedOrder.selfDispatcherName}</p>
                        <p className="text-sm"><strong>Contact:</strong> {selectedOrder.selfDispatcherContact}</p>
                        {selectedOrder.expectedWarehouseArrival && (
                          <p className="text-sm"><strong>ETA:</strong> {new Date(selectedOrder.expectedWarehouseArrival).toLocaleString()}</p>
                        )}
                      </div>
                    )}

                    {/* Assigned System Agents */}
                    {(selectedOrder.deliveryTasks || []).filter(t => t.status !== 'cancelled').map((task, idx) => (
                      <div key={idx} className="space-y-1">
                        <p className="text-[10px] font-bold text-blue-600 uppercase">
                          Leg: {(() => {
                            const type = task.deliveryType;
                            const routing = selectedOrder.adminRoutingStrategy;
                            const oStatus = selectedOrder.status;

                            if (type === 'seller_to_warehouse') return 'Leg 1: Seller to Warehouse';
                            if (type === 'warehouse_to_customer') return 'Leg 2: Warehouse to Customer';
                            if (type === 'warehouse_to_pickup_station') return 'Leg 2: Warehouse to Pick Station';
                            if (type === 'pickup_station_to_customer') return 'Leg 3: Pick Station to Customer';
                            if (type === 'seller_to_pickup_station') return 'Leg 1: Seller to Pick Station';
                            if (type === 'seller_to_customer') return 'Direct: Seller to Customer';
                            
                            // Context fallback
                            if (routing === 'warehouse') {
                                if (['order_placed', 'seller_confirmed', 'super_admin_confirmed', 'en_route_to_warehouse'].includes(oStatus)) return 'Leg 1: Seller to Warehouse';
                                if (['at_warehouse', 'at_warehouse'].includes(oStatus)) return 'Leg 2: Warehouse to Customer';
                            }

                            return type?.replace(/_/g, ' ').toUpperCase() || 'DELIVERY LEG';
                          })()}
                        </p>
                        {task.deliveryAgent ? (
                          <>
                            <p className="text-sm text-gray-900 font-medium">{task.deliveryAgent.name}</p>
                            {task.deliveryAgent.phone && (
                              <p className="text-xs text-gray-600 font-bold">📞 {task.deliveryAgent.phone || task.deliveryAgent.businessPhone}</p>
                            )}
                            <p className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 inline-block font-bold">STATUS: {task.status.toUpperCase()}</p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400 italic">Agent assignment pending...</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <h4 className="font-bold text-gray-900 border-l-4 border-blue-600 pl-3">Order Information</h4>
            <div className="mt-4">
              <LogisticsDestination order={selectedOrder} />
            </div>
            <div className="mt-4 space-y-3 font-medium">
              {(selectedOrder.OrderItems || []).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    {/* Item Image */}
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                      <img
                        src={resolveImageUrl(getOrderItemImage(item))}
                        alt={item.itemLabel || item.name || item.Product?.name || item.FastFood?.name || 'Item'}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                      />
                    </div>

                    <div>
                      <h5 className="font-bold text-gray-900 text-base">{item.itemLabel || item.name || item.Product?.name || item.FastFood?.name || 'Unknown Item'}</h5>
                      <p className="text-sm text-gray-600">Quantity: <span className="font-semibold">{item.quantity}</span></p>

                      {/* Fast Food Details */}
                      {item.FastFood && (
                        <div className="mt-1 space-y-1">
                          {ensureArray(item.FastFood.ingredients).length > 0 && (
                            <p className="text-[10px] text-gray-500 line-clamp-2">
                              <strong>Ingredients:</strong> {ensureArray(item.FastFood.ingredients).map(i => {
                                const { name, quantity } = normalizeIngredient(i);
                                return quantity ? `${name} (${quantity})` : name;
                              }).filter(Boolean).join(', ')}
                            </p>
                          )}
                          {ensureArray(item.FastFood.allergens).length > 0 && (
                            <p className="text-[10px] text-red-500">
                              <strong>Allergens:</strong> {ensureArray(item.FastFood.allergens).join(', ')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {/* Display SELLER EARNINGS (Base Price), not Customer Price */}
                    <p className="font-bold text-blue-600 text-lg">
                      KES {((item.Product?.basePrice || item.FastFood?.basePrice || 0) * item.quantity).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      KES {(item.Product?.basePrice || item.FastFood?.basePrice || 0).toLocaleString()} per unit
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logistics Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">

            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Logistics Settings</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Automate your fulfillment workflow</p>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-white rounded-xl transition-colors shadow-sm border border-transparent hover:border-gray-100">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-orange-50/30 rounded-2xl border border-orange-100/50">
                <div>
                  <h4 className="text-sm font-black text-orange-900 uppercase">Auto-Confirm FastFood</h4>
                  <p className="text-[10px] text-orange-700/70 font-bold uppercase tracking-tighter mt-1">Accept meal orders instantly</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={sellerSettings.autoConfirmFastFood}
                    onChange={(e) => setSellerSettings({...sellerSettings, autoConfirmFastFood: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                  <div>
                    <h4 className="text-sm font-black text-blue-900 uppercase">Auto-Confirm Products</h4>
                    <p className="text-[10px] text-blue-700/70 font-bold uppercase tracking-tighter mt-1">Accept product orders instantly</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={sellerSettings.autoConfirmProducts}
                      onChange={(e) => setSellerSettings({...sellerSettings, autoConfirmProducts: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {sellerSettings.autoConfirmProducts && (
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 animate-in slide-in-from-top-2 duration-300">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Default Product Routing</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSellerSettings({...sellerSettings, defaultProductShippingType: 'collected_from_seller'})}
                        className={`p-3 rounded-xl border text-[10px] font-black uppercase transition-all ${sellerSettings.defaultProductShippingType === 'collected_from_seller' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-200'}`}
                      >
                        Request Collection
                      </button>
                      <button
                        onClick={() => setSellerSettings({...sellerSettings, defaultProductShippingType: 'seller_to_warehouse'})}
                        className={`p-3 rounded-xl border text-[10px] font-black uppercase transition-all ${sellerSettings.defaultProductShippingType === 'seller_to_warehouse' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-200'}`}
                      >
                        Drop at Warehouse
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowSettingsModal(false)} className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={() => handleSaveSettings(sellerSettings)} disabled={isSavingSettings} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Details Modal */}
      <DispatchDetailsModal
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        order={selectedOrder}
        initialEta={selectedOrder?.submissionDeadline}
        onConfirm={async (data) => {
          try {
            const res = await api.patch(`/orders/${selectedOrder.id}/seller-status`, {
              status: 'en_route_to_warehouse',
              ...data
            });
            if (res.data.success) {
              setRows(rows.map(order => order.id === selectedOrder.id ? { ...order, status: 'en_route_to_warehouse' } : order));
              alert('Order dispatched with internal details!');
              setShowDispatchModal(false);
            }
          } catch (err) {
            alert('Failed: ' + (err.response?.data?.error || err.message));
          }
        }}
      />
      </div>


    </div>
  )
}

