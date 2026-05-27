import React, { useState, useEffect, useCallback, useRef } from 'react';
import api, { orderApi } from '../../services/api';
import { fastFoodService } from '../../services/fastFoodService';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeKenyanPhone } from '../../utils/validation';
import { 
  ClipboardList, Send, CheckCircle2, XCircle, AlertCircle, Loader2, Phone, MapPin, 
  ShoppingCart, UserCheck, UserPlus, ArrowRight, RefreshCw, Package,
  Clock, ChevronDown, ChevronRight, PlusCircle, ListOrdered, Store, User, Shield, Mail, Trash2, Copy
} from 'lucide-react';
import { toast } from '../../components/ui/use-toast';
import PhoneVerification from '../../components/PhoneVerification';

const STATUS_COLORS = {
  order_placed:    { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Placed' },
  confirmed:       { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Confirmed' },
  processing:      { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Processing' },
  in_transit:      { bg: 'bg-purple-50', text: 'text-purple-700', label: 'In Transit' },
  delivered:       { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Delivered' },
  cancelled:       { bg: 'bg-red-50',    text: 'text-red-700',    label: 'Cancelled' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_COLORS[status] || { bg: 'bg-gray-50', text: 'text-gray-700', label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
};

const OrderRow = ({ order, showMarketer = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [showSourceBlock, setShowSourceBlock] = useState(false);
  const items = order.OrderItems || [];
  const customer = order.user;
  const seller = order.seller;
  const marketer = order.marketer;
  const date = new Date(order.createdAt).toLocaleString();

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
      <button 
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm text-gray-900 font-mono">{order.orderNumber}</p>
            <p className="text-[11px] text-gray-500 truncate">
              {customer?.name || order.customerName || 'Guest'} · {order.customerPhone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-[9px] font-black text-gray-400 uppercase">Seller</span>
            <span className="text-[10px] font-bold text-gray-700 truncate max-w-[100px]">{seller?.businessName || seller?.name || '—'}</span>
          </div>

          {showMarketer && marketer && (
            <div className="hidden lg:flex flex-col items-end mr-4">
              <span className="text-[9px] font-black text-amber-400 uppercase">Placed By</span>
              <span className="text-[10px] font-bold text-amber-600 truncate max-w-[100px]">{marketer.name}</span>
            </div>
          )}

          <StatusBadge status={order.status} />
          <span className="text-xs font-bold text-gray-700 hidden sm:block">KES {parseFloat(order.total || 0).toLocaleString()}</span>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-50 bg-gray-50/50 p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Customer</p>
              <p className="font-semibold text-gray-800">{customer?.name || order.customerName || 'Guest'}</p>
              <p className="text-gray-500">{order.customerPhone}</p>
              {order.customerEmail && <p className="text-gray-500 italic">{order.customerEmail}</p>}
            </div>
            <div>
              <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Seller Information</p>
              <p className="font-semibold text-gray-800">{seller?.businessName || seller?.name || '—'}</p>
              <p className="text-gray-500">{seller?.phone || '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Delivery Address</p>
              <p className="font-semibold text-gray-800">{order.deliveryAddress || '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Logistics & Agent</p>
              {order.deliveryTasks && order.deliveryTasks.length > 0 ? (
                <div className="space-y-1">
                  {order.deliveryTasks.map((t, idx) => (
                    <div key={idx} className="flex flex-col">
                      <span className="font-semibold text-blue-600 uppercase text-[10px]">
                        {t.status} · {t.deliveryType}
                      </span>
                      {t.deliveryAgent ? (
                        <span className="text-gray-700 font-bold">{t.deliveryAgent.name}</span>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No task created</p>
              )}
            </div>
            <div>
              <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">
                {marketer ? 'Placed By Marketer' : 'Placed By'}
              </p>
              <p className="font-semibold text-gray-800">{marketer ? marketer.name : 'System Admin'}</p>
              <p className="text-gray-500">{date}</p>
            </div>
          </div>

          <div>
            <p className="text-gray-400 font-bold uppercase tracking-wider text-[9px] mb-2">Order Items</p>
            <div className="space-y-1">
              {items.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No items found</p>
              ) : items.map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                  <div>
                    <span className="text-xs font-bold text-gray-800">{item.name}</span>
                    {item.variantId && <span className="ml-1 text-[10px] text-blue-500">({item.variantId})</span>}
                    {item.comboId && <span className="ml-1 text-[10px] text-purple-500">(Combo)</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>x{item.quantity}</span>
                    <span className="font-bold text-gray-800">KES {parseFloat(item.total || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-100">
            <div>
              {order.originalTextBlock && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowSourceBlock(true); }}
                  className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 rounded-md hover:bg-amber-100 transition-colors font-bold uppercase text-[9px]"
                >
                  <ClipboardList className="w-3 h-3" />
                  View Source Block
                </button>
              )}
            </div>
            <span className="font-black text-gray-900">Total Amount: KES {parseFloat(order.total || 0).toLocaleString()}</span>
          </div>

          {/* Source Block Modal */}
          {showSourceBlock && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowSourceBlock(false)}>
              <div 
                className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-amber-500" />
                      Original Order Block
                    </h3>
                    <button onClick={() => setShowSourceBlock(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <Trash2 className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 relative group">
                    <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap leading-relaxed">
                      {order.originalTextBlock}
                    </pre>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(order.originalTextBlock);
                        toast({ title: 'Copied!', description: 'Original block copied to clipboard.' });
                      }}
                      className="absolute top-3 right-3 p-2 bg-white shadow-sm border border-gray-100 rounded-xl text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button 
                    onClick={() => setShowSourceBlock(false)}
                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DirectOrders = () => {
  const { user: currentUser } = useAuth();
  const role = currentUser?.role;
  const roles = currentUser?.roles || [];
  
  const isAdmin = ['admin', 'superadmin', 'super_admin'].includes(role) || roles.some(r => ['admin', 'superadmin', 'super_admin'].includes(r));
  const isMarketer = role === 'marketer' || roles.includes('marketer');
  const canPlace = isAdmin || isMarketer;

  const [activeTab, setActiveTab] = useState(canPlace ? 'new' : 'manage');
  const [manageSubTab, setManageSubTab] = useState('admin');

  // --- New Order State ---
  const [textBlock, setTextBlock] = useState('');
  const [type, setType] = useState('fastfood');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('input');
  const [parsedData, setParsedData] = useState({ items: [] });
  const [userExists, setUserExists] = useState(false);
  const [userConflict, setUserConflict] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(true); 
  const [confirmPhone, setConfirmPhone] = useState('');
  const [suggestedPickupStation, setSuggestedPickupStation] = useState(null);
  const [selectedPickupStationId, setSelectedPickupStationId] = useState(null);
  const [pickupStations, setPickupStations] = useState([]);
  const [orderResult, setOrderResult] = useState(null);
  const [addressError, setAddressError] = useState(false);
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [deliveryTimePreference, setDeliveryTimePreference] = useState('');
  const [batchSystemEnabled, setBatchSystemEnabled] = useState(false);
  const submittingRef = useRef(false);

  // --- Promo Code State ---
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');

  // Prefill order block if coming from AdminOrders "Reconvert/Duplicate as Direct Order" action
  useEffect(() => {
    const prefillBlock = localStorage.getItem('direct_order_prefill_block');
    const prefillType = localStorage.getItem('direct_order_prefill_type');
    if (prefillBlock) {
      setTextBlock(prefillBlock);
      if (prefillType) setType(prefillType);
      localStorage.removeItem('direct_order_prefill_block');
      localStorage.removeItem('direct_order_prefill_type');
      setActiveTab('new');
    }
  }, []);

  // --- Manage Orders State ---
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const { data } = await orderApi.listDirect();
      if (data.success) setOrders(data.orders || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch direct orders.', variant: 'destructive' });
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'manage') fetchOrders();
  }, [activeTab, fetchOrders]);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const { data } = await api.get('/pickup-stations?activeOnly=true');
        setPickupStations(data.stations || []);
      } catch (err) {
        console.error('Failed to fetch pickup stations', err);
      }
    };
    if (canPlace) fetchStations();
  }, [canPlace]);
  
  useEffect(() => {
    const fetchBatchConfig = async () => {
      try {
        const res = await fastFoodService.getPublicBatchSystemConfig();
        if (res.success) {
          const enabled = res.data === true || String(res.data).toLowerCase() === 'true';
          setBatchSystemEnabled(enabled);
        }
      } catch (err) {
        console.error('Failed to fetch batch system config', err);
        setBatchSystemEnabled(false);
      }
    };
    if (canPlace) fetchBatchConfig();
  }, [canPlace]);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const { data } = await api.get('/batches/active');
        setBatches(data?.batches || []);
      } catch (err) {
        console.error('Failed to fetch active batches', err);
      }
    };
    if (canPlace && type === 'fastfood' && batchSystemEnabled) {
      fetchBatches();
    } else {
      setBatches([]);
      setSelectedBatchId(null);
    }
  }, [canPlace, type, batchSystemEnabled]);

  const handleParse = async () => {
    console.log('[DirectOrder] handleParse triggered. TextBlock length:', textBlock?.length);
    if (!textBlock.trim()) {
      toast({ title: 'Error', description: 'Please paste the order text block.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      console.log('[DirectOrder] Sending parse request to backend...');
      const { data } = await orderApi.parseDirect({ textBlock, type });
      console.log('[DirectOrder] Backend Response received:', data);
      
      if (data.success) {
        setParsedData(data.parsedData);
        setUserExists(data.userExists);
        setUserConflict(data.userConflict);
        setIsPhoneVerified(true);
        setConfirmPhone(data.parsedData.customerPhone || '');
        setSuggestedPickupStation(data.suggestedPickupStation);
        setSelectedPickupStationId(data.suggestedPickupStation?.id || null);
        setStep('review');

        const missing = [];
        if (data.parsedData.items.length === 0) missing.push('Items');
        if (!data.parsedData.customerPhone) missing.push('Phone Number');
        if (!data.parsedData.deliveryAddress || data.parsedData.deliveryAddress === 'N/A') missing.push('Delivery Address');
        
        if (missing.length > 0) {
          toast({ 
            title: 'Partial Data', 
            description: `We're missing: ${missing.join(', ')}. Please edit them below.`,
            variant: 'warning'
          });
        }
      } else {
        console.warn('[DirectOrder] Parse failed but returned 200:', data);
        toast({ title: 'Parsing Failed', description: data.message || 'Server returned an unsuccessful status.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('[DirectOrder] Parsing error caught:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Check format: Item(Qty)\nPhone\nAddress';
      toast({ title: 'Parsing Failed', description: errorMsg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshMatches = async (idx) => {
    const item = parsedData.items[idx];
    if (!item?.name) return;
    setLoading(true);
    try {
      const { data } = await orderApi.parseDirect({ textBlock: item.name, type });
      if (data.success) {
        const newItems = [...parsedData.items];
        const refreshedMatches = data.matches || data.parsedData?.items?.[0]?.matches || [];
        const refreshedType = data.parsedData?.items?.[0]?.type || type;
        newItems[idx].matches = refreshedMatches;
        if (refreshedMatches.length === 1) {
          newItems[idx].selectedId = refreshedMatches[0].id;
          newItems[idx].type = refreshedMatches[0].type || refreshedType;
        }
        setParsedData({ ...parsedData, items: newItems });
        toast({ title: 'Matches Updated', description: `Found ${refreshedMatches.length} items for "${item.name}"` });
      }
    } catch (error) {
      console.error('[DirectOrder] refresh matches error:', error?.response?.status, error?.response?.data, error?.message);
      toast({ title: 'Search Failed', description: 'Could not refresh item matches.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    // Prevent double-invocation (double-click before loading state propagates)
    if (submittingRef.current) {
      console.log('[DirectOrder] Blocked by submittingRef.current === true');
      return;
    }
    submittingRef.current = true;

    console.log('[DirectOrder] Finalizing Order. Items:', parsedData.items);
    
    const unselectedIdx = parsedData.items.findIndex(i => !i.selectedId);
    if (unselectedIdx !== -1) {
      console.warn('[DirectOrder] Blocked: Item at index', unselectedIdx, 'has no selectedId');
      toast({ 
        title: 'Item Selection Missing', 
        description: `Item #${unselectedIdx + 1} (${parsedData.items[unselectedIdx].name}) has no match selected.`, 
        variant: 'destructive' 
      });
      submittingRef.current = false;
      return;
    }

    const normPhone = normalizeKenyanPhone(parsedData?.customerPhone) || (parsedData?.customerPhone || '').replace(/\D/g, '');
    const normConfirm = normalizeKenyanPhone(confirmPhone || parsedData?.customerPhone) || (confirmPhone || parsedData?.customerPhone || '').replace(/\D/g, '');

    console.log('[DirectOrder] Phone Comparison:', { original: parsedData.customerPhone, confirm: confirmPhone, normPhone, normConfirm });

    if (!normPhone || normPhone.length < 9) {
      console.log('[DirectOrder] Blocked: Phone number missing or short');
      toast({ title: 'Phone Number Missing', description: 'The phone number was not detected or is too short.', variant: 'destructive' });
      submittingRef.current = false;
      return;
    }
    if (confirmPhone && normPhone !== normConfirm) {
      console.log('[DirectOrder] Blocked: Phone Mismatch');
      toast({ title: 'Phone Mismatch', description: 'The phone number and its confirmation do not match.', variant: 'destructive' });
      submittingRef.current = false;
      return;
    }
    const addressMissing = !parsedData?.deliveryAddress || parsedData?.deliveryAddress === 'N/A' || parsedData?.deliveryAddress.trim().length < 3;
    if (addressMissing) {
      console.log('[DirectOrder] Blocked: Delivery Address Missing', { address: parsedData?.deliveryAddress });
      setAddressError(true);
      toast({ title: 'Delivery Address Missing', description: 'Please type the delivery address in the field highlighted below.', variant: 'destructive' });
      submittingRef.current = false;
      return;
    }

    // Enforce batch selection if the batch system is enabled and active batches cover this time window
    if (batchSystemEnabled && type === 'fastfood' && batches.length > 0 && !selectedBatchId) {
      console.log('[DirectOrder] Blocked: Batch Selection Required');
      toast({ 
        title: 'Batch Selection Required', 
        description: 'An active batch must be selected to place a fast food order during batch operating hours.', 
        variant: 'destructive' 
      });
      submittingRef.current = false;
      return;
    }

    setAddressError(false);
    setLoading(true);
    try {
      const payload = {
        items: parsedData.items.map(i => ({
          itemId: i.selectedId,
          quantity: i.quantity,
          type: i.type || type // Use item type or fallback to global type
        })),
        type, // Global fallback
        customerPhone: parsedData.customerPhone,
        deliveryAddress: parsedData.deliveryAddress,
        pickupStationId: selectedPickupStationId,
        customerName: parsedData.customerName,
        customerEmail: parsedData.customerEmail,
        originalTextBlock: textBlock,
        batchId: selectedBatchId,
        deliveryTimePreference: deliveryTimePreference,
        promoCode: appliedPromo?.code || null
      };

      console.log('[DirectOrder] Sending confirm payload:', payload);
      const { data } = await orderApi.confirmDirect(payload);
      
      if (data.success) {
        setOrderResult(data);
        setStep('success');
        toast({ title: 'Success', description: 'Order placed successfully!' });
      } else {
        toast({ title: 'Order Failed', description: data.message || 'Server rejected the order.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('[DirectOrder] confirm error:', error?.response?.status, error?.response?.data, error?.message);
      toast({ title: 'Order Failed', description: error.response?.data?.message || 'Could not place order.', variant: 'destructive' });
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCodeInput) return;
    setApplyingPromo(true);
    setPromoError('');
    try {
      const res = await api.post('/promo-codes/apply', { 
        code: promoCodeInput.trim().toUpperCase(), 
        orderType: type, // 'fastfood' or 'product'
        customerPhone: parsedData.customerPhone,
        customerEmail: parsedData.customerEmail
      });
      setAppliedPromo(res.data.data);
      toast({ title: 'Promo Code Applied', description: `Success! discount of ${res.data.data.discountPercentage}% applied.` });
    } catch (err) {
      setAppliedPromo(null);
      setPromoError(err.response?.data?.message || 'Invalid promo code');
      toast({ title: 'Promo Code Error', description: err.response?.data?.message || 'Invalid promo code', variant: 'destructive' });
    } finally {
      setApplyingPromo(false);
    }
  };

  const reset = () => {
    setStep('input');
    setTextBlock('');
    setParsedData({ items: [] });
    setIsPhoneVerified(true);
    setConfirmPhone('');
    setOrderResult(null);
    setAddressError(false);
    setSelectedBatchId(null);
    setDeliveryTimePreference('');
    setPromoCodeInput('');
    setAppliedPromo(null);
    setPromoError('');
    submittingRef.current = false;
  };

  const getSubtotal = () => {
    return (parsedData?.items || []).reduce((sum, item) => {
      const selectedMatch = item.matches?.find(m => m.id === item.selectedId);
      const price = selectedMatch ? parseFloat(selectedMatch.price || 0) : 0;
      return sum + (price * (item.quantity || 1));
    }, 0);
  };

  const getDeliveryFee = () => {
    if (selectedPickupStationId) {
      const station = pickupStations.find(s => s.id === selectedPickupStationId);
      return station ? parseFloat(station.price || 0) : 0;
    }
    return 0;
  };

  const getDiscountableSubtotal = () => {
    if (!appliedPromo) return 0;
    let promoProductIds = appliedPromo.applicableProductIds || [];
    if (typeof promoProductIds === 'string') {
      try { promoProductIds = JSON.parse(promoProductIds); } catch(e) { promoProductIds = []; }
    }
    if (Array.isArray(promoProductIds) && promoProductIds.length > 0) {
      return (parsedData?.items || []).reduce((sum, item) => {
        const selectedMatch = item.matches?.find(m => m.id === item.selectedId);
        if (!selectedMatch) return sum;
        
        const price = parseFloat(selectedMatch.price || 0);
        const typePrefixId = `${item.type || type}_${selectedMatch.id}`;
        
        const isApplicable = promoProductIds.some(promoId => 
          promoId === String(selectedMatch.id) || 
          promoId === typePrefixId || 
          promoId.startsWith(typePrefixId + ':') || 
          promoId.startsWith(String(selectedMatch.id) + ':')
        );
        
        return sum + (isApplicable ? price * (item.quantity || 1) : 0);
      }, 0);
    }
    return getSubtotal();
  };

  const subtotal = getSubtotal();
  const deliveryFee = getDeliveryFee();
  const discountableSubtotal = getDiscountableSubtotal();
  let discountAmount = 0;
  if (appliedPromo) {
    discountAmount = (discountableSubtotal * appliedPromo.discountPercentage) / 100;
    if (appliedPromo.maxDiscountAmount && discountAmount > appliedPromo.maxDiscountAmount) {
      discountAmount = appliedPromo.maxDiscountAmount;
    }
  }
  const finalTotal = Math.max(0, subtotal + deliveryFee - discountAmount);

  const allFilteredOrders = orders.filter(o =>
    !searchTerm || 
    o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerPhone?.includes(searchTerm) ||
    o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.seller?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.seller?.businessName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.marketer?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const adminPlacedOrders = allFilteredOrders.filter(o => 
    o.marketerId === null || 
    (o.marketer?.role && ['admin', 'superadmin', 'super_admin'].includes(o.marketer.role)) ||
    (o.marketer?.roles && o.marketer.roles.some(r => ['admin', 'superadmin', 'super_admin'].includes(r)))
  );
  
  const marketerPlacedOrders = allFilteredOrders.filter(o => 
    o.marketerId !== null && 
    !(o.marketer?.role && ['admin', 'superadmin', 'super_admin'].includes(o.marketer.role)) &&
    !(o.marketer?.roles && o.marketer.roles.some(r => ['admin', 'superadmin', 'super_admin'].includes(r)))
  );

  const displayOrders = isAdmin 
    ? (manageSubTab === 'admin' ? adminPlacedOrders : marketerPlacedOrders)
    : allFilteredOrders;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase flex items-center gap-2">
            <ClipboardList className="w-8 h-8 text-blue-600" />
            Direct Orders
          </h1>
          <p className="text-sm text-gray-500">Rapid order placement · Track & manage</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
          {canPlace && (
            <button
              onClick={() => setActiveTab('new')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'new' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <PlusCircle className="w-4 h-4" /> New Order
            </button>
          )}
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'manage' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <ListOrdered className="w-4 h-4" /> Manage Orders
          </button>
        </div>
      </div>

      {activeTab === 'new' && canPlace && (
        <>
          {step === 'input' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Paste Order Block</label>
                  <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs">
                    <button onClick={() => setType('fastfood')} className={`px-3 py-1 rounded-md font-bold transition-all ${type === 'fastfood' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Fast Food</button>
                    <button onClick={() => setType('product')} className={`px-3 py-1 rounded-md font-bold transition-all ${type === 'product' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Product</button>
                  </div>
                </div>

                <textarea
                  value={textBlock}
                  onChange={e => setTextBlock(e.target.value)}
                  placeholder={"Example:\nOmena(2)\nJohn Doe\n0757588395\nNyayo 1\nPickup: Nyayo Gate"}
                  className="w-full h-44 p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-sm resize-none"
                />

                <button
                  onClick={handleParse}
                  disabled={loading || !textBlock.trim()}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Parse &amp; Review Order
                </button>
              </div>
              <div className="bg-amber-50 p-3 border-t border-amber-100 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 font-medium">Supports multiple lines. Auto-detects Name, Phone, Address. Use <b>Pickup: [Name]</b> to set a specific point.</p>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Header with Back Button */}
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setStep('input')}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  ← Go Back & Edit Original Block
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Step 2: Review & Match Items</span>
                </div>
              </div>

              {/* Secondary: Customer & Delivery */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Details</h3>
                    <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase">Contact</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={parsedData?.customerName || ''}
                      onChange={(e) => setParsedData({ ...parsedData, customerName: e.target.value })}
                      placeholder="Customer Name"
                      className="w-full text-sm font-bold bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:bg-white outline-none"
                    />
                    <input
                      type="text"
                      value={parsedData?.customerPhone || ''}
                      onChange={(e) => {
                        const phoneValue = e.target.value;
                        setParsedData({ ...parsedData, customerPhone: phoneValue });
                        if (!confirmPhone || confirmPhone === parsedData.customerPhone) {
                          setConfirmPhone(phoneValue);
                        }
                      }}
                      placeholder="Phone"
                      className="w-full text-sm font-bold bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:bg-white outline-none"
                    />
                    <input
                      type="text"
                      value={confirmPhone}
                      onChange={(e) => setConfirmPhone(e.target.value)}
                      placeholder="Confirm Phone"
                      className="w-full text-sm font-bold bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:bg-white outline-none"
                    />
                    <input
                      type="email"
                      value={parsedData?.customerEmail || ''}
                      onChange={(e) => setParsedData({ ...parsedData, customerEmail: e.target.value })}
                      placeholder="Email (Optional)"
                      className="w-full text-sm font-bold bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:bg-white outline-none"
                    />
                  </div>
                  {(userExists || userConflict) && (
                    <div className="pt-1">
                      {userExists && !userConflict && (
                        <div className="flex items-center gap-1.5 text-green-600">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-[9px] font-bold uppercase">Account Linked</span>
                        </div>
                      )}
                      {userConflict && (
                        <div className="flex items-center gap-1.5 text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          <span className="text-[9px] font-black uppercase">Identity Conflict Detected</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Logistics</h3>
                    <span className="text-[9px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold uppercase">Delivery</span>
                  </div>
                  <textarea
                    value={parsedData?.deliveryAddress === 'N/A' ? '' : (parsedData?.deliveryAddress || '')}
                    onChange={(e) => {
                      setAddressError(false);
                      setParsedData({ ...parsedData, deliveryAddress: e.target.value });
                    }}
                    className={`w-full text-sm font-bold bg-gray-50 border rounded-lg px-3 py-2 h-[42px] resize-none outline-none focus:bg-white transition-all ${
                      addressError ? 'border-red-400 ring-2 ring-red-400/20 bg-red-50' : 'border-gray-200'
                    }`}
                    placeholder="Type delivery address here (required)"
                  />
                  {addressError && (
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-wide flex items-center gap-1 mt-0.5">
                      <AlertCircle className="w-3 h-3" /> Delivery address is required
                    </p>
                  )}
                </div>
              </div>

              {/* Promo Code Card */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-500" />
                    Promo Code (Optional)
                  </h3>
                  {appliedPromo && (
                    <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Applied
                    </span>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter promo code"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    disabled={appliedPromo || applyingPromo}
                    className="flex-1 text-sm font-bold bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none disabled:opacity-50"
                  />
                  {!appliedPromo ? (
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      disabled={!promoCodeInput || applyingPromo}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 uppercase tracking-wider text-center"
                    >
                      {applyingPromo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedPromo(null);
                        setPromoCodeInput('');
                      }}
                      className="px-6 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition-all active:scale-[0.98] uppercase tracking-wider text-center"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {promoError && (
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {promoError}
                  </p>
                )}
                
                {appliedPromo && (
                  <div className="bg-green-50/50 border border-green-100 rounded-xl p-3.5 text-xs text-green-800 space-y-1">
                    <p className="font-bold">🎉 Promo Code Applied: <span className="font-black text-green-900">{appliedPromo.code}</span></p>
                    <p className="font-medium text-[11px] text-green-700">Benefits: {appliedPromo.discountPercentage}% discount on applicable items.</p>
                  </div>
                )}
              </div>

              {/* Batch Selection — only when batch system is ON and batches available */}
              {batchSystemEnabled && type === 'fastfood' && batches.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assign to Batch</h3>
                    <span className="text-[9px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-bold uppercase">Batch System</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {batches.map(batch => (
                      <button
                        key={batch.id}
                        onClick={() => setSelectedBatchId(selectedBatchId === batch.id ? null : batch.id)}
                        className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden ${
                          selectedBatchId === batch.id
                            ? 'border-orange-500 bg-orange-50 ring-4 ring-orange-500/10 shadow-md'
                            : 'border-gray-100 bg-gray-50 hover:border-orange-200 hover:bg-orange-50/30'
                        }`}
                      >
                        {selectedBatchId === batch.id && (
                          <div className="absolute top-0 right-0 p-1.5 bg-orange-500 text-white rounded-bl-xl shadow-lg">
                            <CheckCircle2 className="w-3 h-3" />
                          </div>
                        )}
                        <p className={`text-sm font-black uppercase tracking-tight ${
                          selectedBatchId === batch.id ? 'text-orange-700' : 'text-gray-800'
                        }`}>{batch.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-[11px] font-bold text-gray-500">{batch.startTime} – {batch.endTime}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Package className="w-3 h-3 text-green-500" />
                          <span className="text-[11px] font-bold text-gray-500">Delivery: {batch.expectedDelivery}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {!selectedBatchId && (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <p className="text-[10px] text-red-600 font-black uppercase">Required: Please select a batch for this order</p>
                    </div>
                  )}
                </div>
              )}

              {/* Primary: Items List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Order Items</h3>
                  <button 
                    onClick={() => {
                      setParsedData({ ...parsedData, items: [...(parsedData?.items || []), { name: '', quantity: 1, matches: [], selectedId: null }] });
                    }}
                    className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase hover:bg-blue-50 px-3 py-1.5 rounded-full transition-all"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Add Item Manually
                  </button>
                </div>

                {(!parsedData?.items || parsedData.items.length === 0) && (
                  <div className="bg-white p-8 rounded-3xl border border-dashed border-gray-200 text-center space-y-3">
                    <Package className="w-10 h-10 text-gray-300 mx-auto" />
                    <p className="text-sm font-bold text-gray-500">No items were detected in your text block.</p>
                    <p className="text-xs text-gray-400">You can try editing the block or add an item manually using the button above.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {(parsedData?.items || []).map((item, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4 relative group transition-all hover:shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">
                          Item #{idx + 1}
                        </span>
                        <button 
                          onClick={() => {
                            const newItems = parsedData.items.filter((_, i) => i !== idx);
                            setParsedData({ ...parsedData, items: newItems });
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Search / Item Name</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const newItems = [...parsedData.items];
                              newItems[idx].name = e.target.value;
                              setParsedData({ ...parsedData, items: newItems });
                            }}
                            className="flex-1 text-sm font-bold bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                            placeholder="e.g. Bhajia"
                          />
                          <button 
                            onClick={() => handleRefreshMatches(idx)}
                            className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                            title="Search for matches"
                          >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {item.matches.length > 0 ? 'Select Variant / Combo' : 'No matches found'}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Qty:</span>
                            <input 
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...parsedData.items];
                                newItems[idx].quantity = parseInt(e.target.value) || 1;
                                setParsedData({ ...parsedData, items: newItems });
                              }}
                              className="w-12 text-center text-sm font-black bg-gray-100 rounded-lg py-1 outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {item.matches.map(match => (
                            <button
                              key={match.id}
                              onClick={() => {
                                const newItems = [...parsedData.items];
                                newItems[idx].selectedId = match.id;
                                newItems[idx].type = match.type || type;
                                setParsedData({ ...parsedData, items: newItems });
                              }}
                              className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${item.selectedId === match.id ? (match.isOpen === false ? 'border-red-400 bg-red-50 ring-4 ring-red-400/5' : 'border-blue-600 bg-blue-50 shadow-md ring-4 ring-blue-500/5') : (match.isOpen === false ? 'border-red-100 bg-red-50/30 grayscale-[0.5]' : 'border-gray-100 bg-white hover:border-blue-200')}`}
                            >
                              {item.selectedId === match.id && (
                                <div className={`absolute top-0 right-0 p-1.5 ${match.isOpen === false ? 'bg-red-500' : 'bg-blue-600'} text-white rounded-bl-xl shadow-lg`}>
                                  {match.isOpen === false ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                </div>
                              )}
                              <p className={`text-sm font-black uppercase tracking-tight leading-tight ${item.selectedId === match.id ? (match.isOpen === false ? 'text-red-700' : 'text-blue-700') : 'text-gray-900'}`}>{match.name}</p>
                              <div className="flex items-center justify-between mt-1.5">
                                <p className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                  <span className="text-[10px] text-gray-300">PRICE:</span> 
                                  KES {match.price?.toLocaleString()}
                                </p>
                                {match.isOpen === false && (
                                  <span className="text-[9px] font-black text-red-600 uppercase bg-red-100 px-1.5 py-0.5 rounded-md">CLOSED</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                        {!item.selectedId && item.matches.length > 0 && (
                          <div className="flex items-center gap-2 px-2 py-2 bg-amber-50 rounded-xl">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                            <p className="text-[10px] text-amber-600 font-black uppercase animate-pulse">Please select a match above</p>
                          </div>
                        )}
                        {item.matches.length === 0 && (
                          <div className="flex items-center gap-2 px-2 py-2 bg-red-50 rounded-xl">
                            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                            <p className="text-[10px] text-red-500 font-black uppercase">Search returned no results</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Footer */}
              <div className="bg-gray-900 rounded-3xl p-8 text-white flex flex-col lg:flex-row justify-between items-center gap-6 shadow-2xl relative overflow-hidden mt-2">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -translate-y-32 translate-x-32 blur-3xl pointer-events-none" />
                <div className="space-y-3 relative z-10 text-center lg:text-left flex-1 w-full">
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Checkout Summary</h3>
                    <p className="text-2xl font-black tracking-tight">{(parsedData?.items || []).length} Items Selected</p>
                    <p className="text-xs text-gray-400 font-medium mt-1">Customer: <span className="text-white font-bold">{parsedData?.customerName || parsedData?.customerPhone || '—'}</span></p>
                  </div>
                  
                  {/* Price Breakdown */}
                  {subtotal > 0 && (
                    <div className="border-t border-gray-800 pt-3 space-y-1.5 text-xs text-gray-400 max-w-xs mx-auto lg:mx-0">
                      <div className="flex justify-between">
                        <span>Items Subtotal:</span>
                        <span className="font-bold text-white">KES {subtotal.toLocaleString()}</span>
                      </div>
                      {deliveryFee > 0 && (
                        <div className="flex justify-between">
                          <span>Delivery Fee:</span>
                          <span className="font-bold text-white">KES {deliveryFee.toLocaleString()}</span>
                        </div>
                      )}

                      {appliedPromo && discountAmount > 0 && (
                        <div className="flex justify-between text-green-400 font-bold">
                          <span>Discount ({appliedPromo.discountPercentage}%):</span>
                          <span>- KES {discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-black text-white border-t border-gray-800 pt-1.5 mt-1">
                        <span>Estimated Total:</span>
                        <span className="text-blue-400">KES {finalTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 relative z-10 w-full lg:w-auto shrink-0">
                  <button onClick={reset} className="flex-1 lg:flex-none px-8 py-4 text-sm font-black text-gray-400 hover:text-white transition-all uppercase tracking-widest">Cancel</button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading || (parsedData?.items || []).length === 0 || (parsedData?.items || []).some(i => !i.selectedId) || userConflict}
                    className="flex-1 lg:flex-none px-10 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    Finalize Order
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="max-w-md mx-auto py-12 text-center space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase">Order Confirmed!</h2>
                <p className="text-gray-500 text-sm mt-1">The direct order has been placed successfully.</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Order Number:</span>
                  <span className="font-black text-gray-900 font-mono">{orderResult?.orderNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Customer:</span>
                  <span className="font-bold text-gray-900">{parsedData?.customerName || parsedData?.customerPhone || '—'}</span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={reset} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all">Place Another Order</button>
                <button onClick={() => { reset(); setActiveTab('manage'); fetchOrders(); }} className="w-full py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                  View All Direct Orders <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'manage' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button onClick={fetchOrders} disabled={ordersLoading} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {isAdmin && (
            <div className="flex items-center justify-between border-b border-gray-100 px-1">
              <div className="flex">
                <button
                  onClick={() => setManageSubTab('admin')}
                  className={`px-4 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${manageSubTab === 'admin' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  Admin Managed
                </button>
                <button
                  onClick={() => setManageSubTab('marketers')}
                  className={`px-4 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${manageSubTab === 'marketers' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  Marketers Direct Orders
                </button>
              </div>
              <div className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-full uppercase">
                Admin Mode
              </div>
            </div>
          )}

          {ordersLoading ? (
            <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Loading orders...</p>
            </div>
          ) : displayOrders.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <ClipboardList className="w-8 h-8 text-gray-400" />
              </div>
              <p className="font-bold text-gray-700">{searchTerm ? 'No matching orders' : 'No direct orders here yet'}</p>
              <p className="text-xs text-gray-400">Orders will appear here once they are placed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 font-bold px-1">{displayOrders.length} order{displayOrders.length !== 1 ? 's' : ''} found</p>
              {displayOrders.map(order => (
                <OrderRow 
                  key={order.id} 
                  order={order} 
                  showMarketer={isAdmin && manageSubTab === 'marketers'} 
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DirectOrders;
