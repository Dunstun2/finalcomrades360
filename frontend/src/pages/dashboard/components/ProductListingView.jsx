import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FaBox, FaClock } from 'react-icons/fa';
import { Eye, EyeOff, Ban, Trash2, Edit, X, Filter, Search, ArrowUpDown, Plus } from 'lucide-react';
import { productApi } from '../../../services/api'; // Ensure this api export has .get() method on it (wrapper)
import { useToast } from '../../../components/ui/use-toast';
import ComradesProductForm from '../comrades/ComradesProductForm';
import HomeProductCard from '../../../components/HomeProductCard';
import ServiceCard from '../../../components/ServiceCard';
import FastFoodCard from '../../../components/FastFoodCard';
import ServiceForm from '../../../components/services/ServiceForm';
import FastFoodForm from '../FastFoodForm';
import { useNavigate } from 'react-router-dom';
import DeleteConfirmationModal from '../../../components/modals/DeleteConfirmationModal';

// Helper to normalize data structures
const normalizeItem = (item, type) => {
  if (!item) return null;
  return {
    ...item,
    itemType: type,
    // Ensure consistent ID and Name
    id: item.id || item._id,
    title: item.name || item.title || 'Untitled',
    name: item.name || item.title || 'Untitled', // Keep both for safety
    // Normalize logic for images
    images: item.images || item.extraImages || [],
    image: item.coverImage || item.mainImage || (item.images?.[0]) || null,
    // Price normalization - Use basePrice for seller dashboard views
    price: item.basePrice || item.displayPrice || item.price || 0,
    displayPrice: item.displayPrice || item.price || 0,
    basePrice: item.basePrice || item.price || 0,
    // Status flags
    isHidden: item.isHidden || item.visibilityStatus === 'hidden',
    suspended: item.suspended || !!item.suspensionReason
  };
};

const ProductListingView = ({ onBack, onViewProduct, onListProduct }) => {
  const { toast } = useToast();
  // Data States
  const [pendingProducts, setPendingProducts] = useState([]);
  const [rawProducts, setRawProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [fastFoodItems, setFastFoodItems] = useState([]);
  const navigate = useNavigate();

  // Categorized States (explicitly kept for tabs, but also derived in activeProducts)
  const [hiddenProducts, setHiddenProducts] = useState([]);
  const [suspendedProducts, setSuspendedProducts] = useState([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingLoadAttempted, setPendingLoadAttempted] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeSection, setActiveSection] = useState('all');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, product: null });

  // Search, Filter, Sort States
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, product, service, fastfood
  const [sortOrder, setSortOrder] = useState('newest'); // newest, oldest, price-asc, price-desc, name-asc, name-desc

  // Infinite Scroll State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [initialProductsLoaded, setInitialProductsLoaded] = useState(false);
  const LIST_PAGE_SIZE = 20;
  const observer = useRef();
  const pendingFetchInFlight = useRef(false);
  const servicesFetchInFlight = useRef(false);
  const fastFoodFetchInFlight = useRef(false);

  const lastProductElementRef = useCallback(node => {
    if (loading || isFetchingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && activeSection === 'all') {
        setPage(prevPage => {
          const nextPage = prevPage + 1;
          fetchProductsOnly(nextPage, true);
          return nextPage;
        });
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, isFetchingMore, activeSection]);

  // --- Derived Data ---
  const activeProducts = useMemo(() => {
    // console.log('🔄 Recalculating activeProducts...');
    // console.log(`📊 Raw counts: ${rawProducts.length} products, ${services.length} services, ${fastFoodItems.length} fastfood`);

    // 1. Normalize and Gather All Valid Items
    // Filter Products: Approved, Not Hidden, Not Suspended
    const validProducts = rawProducts.filter((p) => {
      // If approval status is undefined, assume it's a legacy/superadmin product and treat as approved
      // Otherwise check explicit flags
      const isApproved = p.approved === undefined || p.approved === true || p.reviewStatus === 'approved';
      const isRejected = p.reviewStatus === 'rejected';

      const isHidden = p.isHidden === true || p.visibilityStatus === 'hidden' || p.status === 'hidden';
      const isSuspended = p.suspended === true || !!p.suspensionReason || p.status === 'suspended';

      return isApproved && !isRejected && !isHidden && !isSuspended;
    }).map(p => normalizeItem(p, 'product'));

    // Services & FastFood are presumed approved if filtered in fetch
    const validServices = services.map(s => normalizeItem(s, 'service'));
    const validFastFood = fastFoodItems.map(f => normalizeItem(f, 'fastfood'));

    // console.log(`✨ Filtered counts: ${validProducts.length} products, ${validServices.length} services, ${validFastFood.length} fastfood`);

    // Combine all
    let combined = [...validProducts, ...validServices, ...validFastFood];

    // DEDUPLICATION STEP: Ensure unique keys (itemType + id)
    // The logs showed duplicates (e.g. product-143), so we must filter them out.
    const uniqueItems = new Map();
    combined.forEach(item => {
      const uniqueKey = `${item.itemType}-${item.id}`;
      if (!uniqueItems.has(uniqueKey)) {
        uniqueItems.set(uniqueKey, item);
      }
    });
    combined = Array.from(uniqueItems.values());

    // 2. Apply Type Filter
    if (typeFilter !== 'all') {
      combined = combined.filter(item => item.itemType === typeFilter);
    }

    // 3. Apply Search Filter
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      combined = combined.filter(item =>
        (item.name && item.name.toLowerCase().includes(lowerTerm)) ||
        (item.shortDescription && item.shortDescription.toLowerCase().includes(lowerTerm)) ||
        (item.description && item.description.toLowerCase().includes(lowerTerm)) ||
        (item.price !== undefined && item.price !== null && item.price.toString().includes(lowerTerm)) ||
        (item.id && item.id.toString().toLowerCase().includes(lowerTerm))
      );
    }

    // 4. Apply Sorting
    combined.sort((a, b) => {
      switch (sortOrder) {
        case 'oldest':
          return new Date(a.createdAt || a.dateAdded || 0) - new Date(b.createdAt || b.dateAdded || 0);
        case 'price-asc':
          return (a.price || 0) - (b.price || 0);
        case 'price-desc':
          return (b.price || 0) - (a.price || 0);
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'newest':
        default:
          return new Date(b.createdAt || b.dateAdded || 0) - new Date(a.createdAt || a.dateAdded || 0);
      }
    });

    return combined;
  }, [rawProducts, services, fastFoodItems, searchTerm, typeFilter, sortOrder]);

  const recentlyApprovedItems = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return activeProducts.filter((item) => {
      const status = String(item.reviewStatus || item.status || '').toLowerCase();
      const isApproved = item.approved === true || status === 'approved' || status === 'active';
      const lastChangedAt = item.updatedAt || item.createdAt || item.dateAdded;
      if (!isApproved || !lastChangedAt) return false;

      const date = new Date(lastChangedAt);
      return !Number.isNaN(date.getTime()) && date >= sevenDaysAgo;
    });
  }, [activeProducts]);

  // --- Robust Fetching Logic WITH DEBUG LOGGING ---
  const fetchPendingProducts = async () => {
    if (pendingFetchInFlight.current) return;
    pendingFetchInFlight.current = true;
    setPendingLoading(true);
    try {
      // console.log('🔍 Fetching pending products...');
      const response = await productApi.getPending();
      // console.log('📦 Pending products raw response:', response);

      let products = [];
      if (Array.isArray(response?.data)) products = response.data;
      else if (Array.isArray(response?.data?.data)) products = response.data.data;
      else if (Array.isArray(response?.data?.products)) products = response.data.products;

      // console.log(`✅ Extracted ${products.length} pending products`);
      setPendingProducts(products.map(p => normalizeItem(p, 'product')));
    } catch (e) { console.error('❌ Error fetching pending:', e); }
    finally {
      setPendingLoadAttempted(true);
      setPendingLoading(false);
      pendingFetchInFlight.current = false;
    }
  };

  const fetchServices = async () => {
    if (servicesFetchInFlight.current) return;
    servicesFetchInFlight.current = true;
    try {
      // console.log('🔍 Fetching services...');
      // Use configured api instance via productApi.get wrapper if available or fallback to direct usage
      const response = await productApi.get('/services', { params: { status: 'approved', limit: 40 } });
      // console.log('📦 Services raw response:', response);

      let servicesData = [];
      if (Array.isArray(response?.data?.services)) servicesData = response.data.services;
      else if (Array.isArray(response?.data?.data)) servicesData = response.data.data;
      else if (Array.isArray(response?.data)) servicesData = response.data;

      // console.log(`✅ Extracted ${servicesData.length} services`);
      setServices(servicesData.map(s => normalizeItem(s, 'service')));
    } catch (e) { console.error('❌ Error fetching services:', e); }
    finally { servicesFetchInFlight.current = false; }
  };

  const fetchFastFood = async () => {
    if (fastFoodFetchInFlight.current) return;
    fastFoodFetchInFlight.current = true;
    try {
      // console.log('🔍 Fetching fast food...');
      const response = await productApi.get('/fastfood', {
        params: {
          limit: 40,
          page: 1,
          includeInactive: 'false'
        }
      });
      // console.log('📦 Fast food raw response:', response);

      let data = [];
      if (Array.isArray(response?.data)) data = response.data;
      else if (Array.isArray(response?.data?.data)) data = response.data.data;
      else if (Array.isArray(response?.data?.items)) data = response.data.items;

      // if (data.length > 0) {
      //   console.log('🔬 First fast food item keys:', Object.keys(data[0]));
      //   console.log('🔬 First fast food item sample:', data[0]);
      // }

      const approved = data.filter(i => i.isActive !== false); // Default to true if undefined, checks isActive
      // console.log(`✅ Extracted ${approved.length} fast food items (${data.length} total)`);
      setFastFoodItems(approved.map(f => normalizeItem(f, 'fastfood')));
    } catch (e) { console.error('❌ Error fetching fastfood:', e); }
    finally { fastFoodFetchInFlight.current = false; }
  };

  const fetchProductsOnly = async (pageNum = 1, shouldAppend = false) => {
    if (!shouldAppend) setLoading(true);
    else setIsFetchingMore(true);

    try {
      let response;
      try {
        response = await productApi.getAllAdmin({ limit: LIST_PAGE_SIZE, page: pageNum, lite: true });
      } catch (e) {
        console.warn('Admin API failed, fallback to public products endpoint', e);
        response = await productApi.getAll();
      }

      let newBatch = [];
      if (Array.isArray(response?.data?.products)) newBatch = response.data.products;
      else if (Array.isArray(response?.data?.data)) newBatch = response.data.data;
      else if (Array.isArray(response?.data)) newBatch = response.data;

      newBatch = newBatch.filter(item => typeof item === 'object' && item !== null && !Array.isArray(item));

      setHasMore(newBatch.length === LIST_PAGE_SIZE);

      const normalizedBatch = newBatch.map(p => normalizeItem(p, 'product'));

      const batchHidden = normalizedBatch.filter(p => (p.isHidden || p.visibilityStatus === 'hidden' || p.status === 'hidden' || p.reviewStatus === 'rejected') && !p.suspended);
      const batchSuspended = normalizedBatch.filter(p => p.suspended || p.suspensionReason || p.status === 'suspended');

      if (shouldAppend) {
        setRawProducts(prev => [...prev, ...newBatch]);
        setHiddenProducts(prev => [...prev, ...batchHidden]);
        setSuspendedProducts(prev => [...prev, ...batchSuspended]);
      } else {
        setRawProducts(newBatch);
        setHiddenProducts(batchHidden);
        setSuspendedProducts(batchSuspended);
      }
    } catch (e) {
      console.error('❌ Fetch products error:', e);
      toast({ title: "Error", description: "Failed to load products", variant: "destructive" });
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    const loadInitialProducts = async () => {
      setPage(1);
      setHasMore(true);
      await fetchProductsOnly(1, false);
      setInitialProductsLoaded(true);
    };

    loadInitialProducts();
  }, []);

  useEffect(() => {
    if (!initialProductsLoaded) return;
    const shouldLoadPending =
      activeSection === 'pending' &&
      !pendingLoading &&
      (!pendingLoadAttempted || pendingProducts.length === 0);
    if (shouldLoadPending) fetchPendingProducts();
  }, [initialProductsLoaded, activeSection, pendingProducts.length, pendingLoadAttempted, pendingLoading]);

  useEffect(() => {
    if (!initialProductsLoaded) return;
    const shouldLoadServices =
      services.length === 0 &&
      (activeSection === 'all' || activeSection === 'recent' || typeFilter === 'service');
    if (shouldLoadServices) fetchServices();
  }, [initialProductsLoaded, activeSection, typeFilter, services.length]);

  useEffect(() => {
    if (!initialProductsLoaded) return;
    const shouldLoadFastFood =
      fastFoodItems.length === 0 &&
      (activeSection === 'all' || activeSection === 'recent' || typeFilter === 'fastfood');
    if (shouldLoadFastFood) fetchFastFood();
  }, [initialProductsLoaded, activeSection, typeFilter, fastFoodItems.length]);

  const handleRefresh = () => {
    setInitialProductsLoaded(false);
    setPage(1);
    setHasMore(true);
    setRawProducts([]);
    setPendingProducts([]);
    setPendingLoadAttempted(false);
    setPendingLoading(false);
    setServices([]);
    setFastFoodItems([]);
    setHiddenProducts([]);
    setSuspendedProducts([]);

    // Re-fetch only the primary list; non-product data remains lazy-loaded by section/filter effects.
    fetchProductsOnly(1, false).finally(() => setInitialProductsLoaded(true));
  };

  // --- Actions ---
  const handleToggleVisibility = async (id) => {
    setActionLoading(id);
    try { await productApi.toggleVisibility(id); await fetchProductsOnly(page, false); toast({ title: "Updated", description: "Visibility toggled" }); }
    catch (e) { toast({ title: "Error", variant: "destructive" }); }
    finally { setActionLoading(null); }
  };

  const handleDelete = (product) => {
    setDeleteModal({ isOpen: true, product });
  };

  const handleConfirmedDelete = async (productId, reason, password) => {
    setActionLoading(productId);
    try {
      const config = { data: { password, reason } };
      await productApi.delete(productId, config);

      // Optimistic Update: Remove from all possible state arrays immediately
      const filterOut = (prev) => prev.filter(item => (item.id || item._id) !== productId);

      setRawProducts(filterOut);
      setPendingProducts(filterOut);
      setServices(filterOut);
      setFastFoodItems(filterOut);
      setHiddenProducts(filterOut);
      setSuspendedProducts(filterOut);

      toast({ title: "Deleted", description: "Item removed successfully" });

      // Comprehensive refresh in background to ensure data consistency
      handleRefresh();
    } catch (e) {
      toast({ title: "Error", description: e.response?.data?.message || "Failed to delete", variant: "destructive" });
      throw e;
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspendProduct = async (id) => {
    setActionLoading(id);
    try { await productApi.suspend(id, { reason: 'Admin' }); await fetchProductsOnly(page, false); toast({ title: "Suspended", description: "Item suspended" }); }
    catch (e) { toast({ title: "Error", variant: "destructive" }); }
    finally { setActionLoading(null); }
  };

  const handleUnsuspendProduct = async (id) => {
    setActionLoading(id);
    try { await productApi.update(id, { status: 'approved', suspended: false }); await fetchProductsOnly(page, false); toast({ title: "Unsuspended", description: "Item active" }); }
    catch (e) { toast({ title: "Error", variant: "destructive" }); }
    finally { setActionLoading(null); }
  };

  const handleListProduct = (item) => {
    setSelectedProduct(item);
    setShowForm(true);
  };

  const getCurrentList = () => {
    switch (activeSection) {
      case 'pending': return pendingProducts;
      case 'hidden': return hiddenProducts;
      case 'suspended': return suspendedProducts;
      case 'recent': return recentlyApprovedItems;
      case 'all': default: return activeProducts;
    }
  };
  const currentList = getCurrentList();
  const getSectionTitle = () => activeSection.charAt(0).toUpperCase() + activeSection.slice(1);

  const renderCommonActions = ({ handleView }, product) => (
    <div className="mt-1 flex flex-wrap gap-1 w-full">
      <button
        onClick={handleView}
        className="flex-1 min-w-[30%] px-1 py-1 text-[10px] sm:text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center justify-center truncate"
        title="View Details"
      >
        <Eye className="h-3 w-3 mr-1 flex-shrink-0" /> View
      </button>

      {activeSection === 'pending' && (
        <button onClick={(e) => { e.stopPropagation(); handleListProduct(product); }} className="flex-1 min-w-[30%] px-2 py-1.5 text-xs sm:text-sm font-bold text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors flex items-center justify-center truncate" style={{ color: '#ffffff', fontWeight: 'bold' }} title="Edit Listing">
          <Edit className="h-3 w-3 mr-1 flex-shrink-0" style={{ color: '#ffffff' }} /> <span style={{ color: '#ffffff' }}>List</span>
        </button>
      )}

      {(activeSection === 'hidden' || (activeSection === 'all' && product.isHidden)) && (
        <button onClick={(e) => { e.stopPropagation(); handleToggleVisibility(product.id); }} className="flex-1 min-w-[30%] px-1 py-1 text-[10px] sm:text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center justify-center truncate" title="Unhide Product">
          <Eye className="h-3 w-3 mr-1 flex-shrink-0" /> Show
        </button>
      )}

      {(activeSection === 'all' && !product.isHidden && !product.suspended) && (
        <>
          <button onClick={(e) => { e.stopPropagation(); handleToggleVisibility(product.id); }} className="flex-1 min-w-[30%] px-1 py-1 text-[10px] sm:text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center justify-center truncate" title="Hide Product">
            <EyeOff className="h-3 w-3 mr-1 flex-shrink-0" /> Hide
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleSuspendProduct(product.id); }} className="flex-1 min-w-[30%] px-1 py-1 text-[10px] sm:text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600 transition-colors flex items-center justify-center truncate" title="Suspend Product">
            <Ban className="h-3 w-3 mr-1 flex-shrink-0" /> Sus
          </button>
        </>
      )}

      {activeSection === 'suspended' && (
        <button onClick={(e) => { e.stopPropagation(); handleUnsuspendProduct(product.id); }} className="flex-1 min-w-[30%] px-1 py-1 text-[10px] sm:text-xs font-medium text-white bg-orange-500 rounded hover:bg-orange-600 transition-colors flex items-center justify-center truncate" title="Unsuspend Product">
          <Ban className="h-3 w-3 mr-1 flex-shrink-0" /> Unsus
        </button>
      )}

      <button onClick={(e) => { e.stopPropagation(); handleDelete(product); }} className="flex-1 min-w-[30%] px-1 py-1 text-[10px] sm:text-xs font-medium text-red-600 bg-white border border-red-300 rounded hover:bg-red-50 transition-colors flex items-center justify-center truncate" title="Delete Product">
        <Trash2 className="h-3 w-3 mr-1 flex-shrink-0" /> Del
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none p-4 bg-white border-b border-gray-200">
        {/* --- Search, Filter, Sort & Refresh Controls (Single Row -- Strict Widths) --- */}
        <div className="flex flex-row flex-nowrap gap-2 mb-3 p-2 bg-gray-50/50 rounded-lg border border-gray-100 items-center overflow-x-auto min-w-0">
          {/* Search - Fixed width that scales slightly (approx 35%) but never dominates */}
          <div className="relative w-[110px] sm:w-[150px] md:w-[200px] flex-shrink-0">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <Search className="h-3 w-3 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs h-8 transition-shadow"
            />
          </div>

          {/* Type Filter - Fixed width approx 25% */}
          <div className="relative flex-shrink-0 w-[90px] sm:w-[120px]">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <Filter className="h-3 w-3 text-gray-400" />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs h-8 appearance-none bg-white cursor-pointer hover:border-blue-400 transition-colors truncate pr-4"
            >
              <option value="all">All</option>
              <option value="product">Product</option>
              <option value="service">Service</option>
              <option value="fastfood">Food</option>
            </select>
          </div>

          {/* Sort - Fixed width approx 25% */}
          <div className="relative flex-shrink-0 w-[100px] sm:w-[130px]">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <ArrowUpDown className="h-3 w-3 text-gray-400" />
            </div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs h-8 appearance-none bg-white cursor-pointer hover:border-blue-400 transition-colors truncate pr-4"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="price-asc">Low $</option>
              <option value="price-desc">High $</option>
              <option value="name-asc">A-Z</option>
            </select>
          </div>

          {/* Refresh Button - Auto or explicit width */}
          <button
            onClick={handleRefresh}
            className="flex-shrink-0 flex items-center justify-center px-2 py-1 bg-white text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm h-8 text-xs whitespace-nowrap ml-auto"
            title="Refresh"
          >
            <FaClock className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
          {[
            { id: 'all', label: 'All Products' },
            { id: 'pending', label: 'Pending Approval' },
            { id: 'hidden', label: 'Hidden Products' },
            { id: 'suspended', label: 'Suspended' },
            { id: 'recent', label: 'Recently Approved' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex-1 min-w-[120px] px-4 py-2 text-sm font-medium rounded-md transition-all ${activeSection === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {(loading && currentList.length === 0) || (activeSection === 'pending' && pendingLoading && currentList.length === 0) ? (
          <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : currentList.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {currentList.map((item, index) => {
              const isLast = index === currentList.length - 1;
              const ref = isLast ? lastProductElementRef : null;

              // Render Content
              let CardComponent;
              if (item.itemType === 'service') CardComponent = ServiceCard;
              else if (item.itemType === 'fastfood') CardComponent = FastFoodCard;
              else CardComponent = HomeProductCard;

              const props = item.itemType === 'service' ? { service: item, navigate } : item.itemType === 'fastfood' ? { item: item, navigate } : { product: item };


              return (
                <div key={`${item.itemType}-${item.id}`} ref={ref} className="relative group w-full">
                  {/* Visual Badges */}
                  <div className="absolute top-2 left-2 z-10 flex flex-col space-y-1">
                    {item.suspended && <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-red-600 rounded-full shadow-sm animate-pulse">SUSPENDED</span>}
                    {item.isHidden && <span className="px-2 py-0.5 text-[10px] font-bold text-gray-600 bg-gray-200 rounded-full shadow-sm">HIDDEN</span>}
                    {item.reviewStatus === 'rejected' && <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-sm">REJECTED</span>}
                  </div>

                  <CardComponent
                    {...props}
                    onView={() => onViewProduct('view', item)}
                    renderActions={(p) => renderCommonActions(p, item)}
                    clickable={item.itemType === 'fastfood' ? false : true}
                    className="w-full"
                    contentClassName=""
                  />
                </div>
              );
            })}
            {isFetchingMore && (
              <div className="col-span-full py-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <FaBox className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No items found</h3>
            <p className="text-gray-500">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">List Product</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700"><X /></button>
            </div>
            {selectedProduct?.itemType === 'service' ? (
              <ServiceForm
                initialData={selectedProduct}
                id={selectedProduct?.id}
                onSuccess={() => { setShowForm(false); handleRefresh(); }}
                isEditing={true}
                mode="edit"
              />
            ) : selectedProduct?.itemType === 'fastfood' ? (
              <FastFoodForm
                product={selectedProduct}
                id={selectedProduct.id}
                onSuccess={() => { setShowForm(false); handleRefresh(); }}
                mode="edit"
              />
            ) : (
              <ComradesProductForm
                product={selectedProduct}
                id={selectedProduct?.id}
                mode="list"
                onSuccess={() => { setShowForm(false); handleRefresh(); }}
                onCancel={() => setShowForm(false)}
              />
            )}
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, product: null })}
        product={deleteModal.product}
        onConfirm={handleConfirmedDelete}
      />
    </div>
  );
};

export default ProductListingView;