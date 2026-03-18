import React, { useState, useEffect, useCallback, useRef } from 'react';
import { resolveImageUrl, FALLBACK_IMAGE } from '../../../utils/imageUtils';
import { FaBox, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaArrowLeft as FaBack, FaEdit, FaSave, FaTimes, FaFilter, FaSearch, FaSync, FaEnvelope, FaPaperPlane } from 'react-icons/fa';
import { adminApi, productApi } from '../../../services/api';
import debounce from 'lodash/debounce';
import { useAuth } from '../../../contexts/AuthContext';


const ITEMS_PER_PAGE = 10;

const getInventoryItemImage = (item) => item.coverImage || item.mainImage || item.image || item.images?.[0] || FALLBACK_IMAGE;

const normalizeLegacyProductItem = (product) => ({
  ...product,
  itemType: 'product',
  stockTracked: true,
  stock: Number(product.stock || 0),
  lowStockThreshold: Number(product.lowStockThreshold || 5),
  seller: product.seller || null,
  coverImage: product.coverImage || product.images?.[0] || null,
  images: Array.isArray(product.images)
    ? product.images
    : [product.coverImage, ...(Array.isArray(product.galleryImages) ? product.galleryImages : [])].filter(Boolean)
});

const normalizeLegacyFastFoodItem = (item) => ({
  ...item,
  itemType: 'fastfood',
  stockTracked: false,
  stock: null,
  lowStockThreshold: null,
  seller: item.vendorDetail || null,
  mainImage: item.mainImage || item.galleryImages?.[0] || null,
  images: [item.mainImage, ...(Array.isArray(item.galleryImages) ? item.galleryImages : [])].filter(Boolean)
});

const computeOverviewFromItems = (items) => {
  const trackedItems = items.filter(item => item.stockTracked);
  const untrackedItems = items.filter(item => !item.stockTracked);

  return trackedItems.reduce((overview, item) => {
    if (item.stock === 0) {
      overview.outOfStock += 1;
    } else if (item.stock <= item.lowStockThreshold) {
      overview.lowStock += 1;
    } else {
      overview.inStock += 1;
    }

    overview.totalProducts = trackedItems.length + untrackedItems.length;
    overview.totalTracked = trackedItems.length;
    overview.stockUntracked = untrackedItems.length;
    overview.fastFoodItems = untrackedItems.filter(entry => entry.itemType === 'fastfood').length;
    return overview;
  }, {
    totalProducts: items.length,
    totalTracked: trackedItems.length,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    stockUntracked: untrackedItems.length,
    fastFoodItems: untrackedItems.filter(entry => entry.itemType === 'fastfood').length
  });
};

const sortInventoryItems = (items, sortBy, sortOrder) => {
  const direction = sortOrder === 'desc' ? -1 : 1;
  return [...items].sort((left, right) => {
    if (sortBy === 'stock') {
      const leftValue = left.stockTracked ? Number(left.stock || 0) : Number.MAX_SAFE_INTEGER;
      const rightValue = right.stockTracked ? Number(right.stock || 0) : Number.MAX_SAFE_INTEGER;
      return (leftValue - rightValue) * direction;
    }

    if (sortBy === 'dateAdded') {
      const leftValue = new Date(left.createdAt || 0).getTime();
      const rightValue = new Date(right.createdAt || 0).getTime();
      return (leftValue - rightValue) * direction;
    }

    return String(left.name || '').localeCompare(String(right.name || '')) * direction;
  });
};

const filterInventoryItems = (items, filters) => {
  const searchTerm = String(filters.search || '').trim().toLowerCase();

  return items.filter((item) => {
    if (searchTerm) {
      const sellerName = item.seller?.name || '';
      const matchesSearch = [item.name, sellerName, item.id].some((value) => String(value || '').toLowerCase().includes(searchTerm));
      if (!matchesSearch) {
        return false;
      }
    }

    if (filters.stockStatus === 'untracked') {
      return !item.stockTracked;
    }

    if (!item.stockTracked) {
      return filters.stockStatus === 'all';
    }

    if (filters.stockStatus === 'inStock') {
      return item.stock > item.lowStockThreshold;
    }

    if (filters.stockStatus === 'lowStock') {
      return item.stock > 0 && item.stock <= item.lowStockThreshold;
    }

    if (filters.stockStatus === 'outOfStock') {
      return item.stock === 0;
    }

    return true;
  });
};

const InventoryManagement = ({ onBack }) => {
  const [inventoryData, setInventoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ stock: '', lowStockThreshold: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    stockStatus: 'all', // all, inStock, lowStock, outOfStock
    sortBy: 'name', // name, stock, dateAdded
    sortOrder: 'asc' // asc, desc
  });
  const [products, setProducts] = useState([]);
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  const [usingLegacyInventoryFallback, setUsingLegacyInventoryFallback] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  // Contact Seller State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedSellerForContact, setSelectedSellerForContact] = useState(null);
  const [contactMessage, setContactMessage] = useState('');
  const hasLoadedInitialDataRef = useRef(false);

  // Debounce search input
  const debouncedLoadProducts = useCallback(
    debounce(() => {
      setCurrentPage(1);
      setProducts([]);
      loadProducts(1);
    }, 500),
    [filters]
  );

  useEffect(() => {
    // Guard duplicate initial fetches in React.StrictMode dev mounts.
    if (hasLoadedInitialDataRef.current) return;
    hasLoadedInitialDataRef.current = true;
    loadInitialData();
  }, []);

  useEffect(() => {
    debouncedLoadProducts();
    return () => debouncedLoadProducts.cancel();
  }, [filters, debouncedLoadProducts]);

  const applyClientInventoryPage = useCallback((items, nextFilters, page) => {
    const filtered = sortInventoryItems(filterInventoryItems(items, nextFilters), nextFilters.sortBy, nextFilters.sortOrder);
    const offset = (page - 1) * ITEMS_PER_PAGE;
    const paginated = filtered.slice(offset, offset + ITEMS_PER_PAGE);

    setProducts(paginated);
    setHasMore(offset + ITEMS_PER_PAGE < filtered.length);
    setCurrentPage(page);
  }, []);

  const loadLegacyInventorySnapshot = useCallback(async () => {
    const [productsResponse, fastFoodResponse] = await Promise.all([
      productApi.getAllAdmin({ page: 1, limit: 5000, withSeller: true }),
      productApi.get('/fastfood', { params: { page: 1, limit: 5000, includeInactive: 'true' } })
    ]);

    const legacyProducts = (productsResponse.data.products || []).map(normalizeLegacyProductItem);
    const fastFoodRows = Array.isArray(fastFoodResponse.data?.data)
      ? fastFoodResponse.data.data
      : Array.isArray(fastFoodResponse.data)
        ? fastFoodResponse.data
        : [];
    const legacyFastFoods = fastFoodRows.map(normalizeLegacyFastFoodItem);

    return [...legacyProducts, ...legacyFastFoods];
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      try {
        const [overviewRes, alertsRes, itemsResponse] = await Promise.all([
          adminApi.getInventoryOverview(),
          adminApi.getLowStockAlerts(),
          adminApi.getInventoryItems({
            page: 1,
            limit: ITEMS_PER_PAGE,
            search: filters.search,
            stockStatus: filters.stockStatus === 'all' ? undefined : filters.stockStatus,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder
          })
        ]);

        setUsingLegacyInventoryFallback(false);
        setAllInventoryItems([]);
        setInventoryData({
          overview: overviewRes.data.overview,
          alerts: alertsRes.data
        });

        const initialProducts = itemsResponse.data.items || [];
        setProducts(initialProducts);
        setHasMore((itemsResponse.data.pagination?.currentPage || 1) < (itemsResponse.data.pagination?.totalPages || 1));
        setCurrentPage(1);
      } catch (endpointError) {
        if (endpointError?.response?.status !== 404) {
          throw endpointError;
        }

        const [alertsRes, legacyItems] = await Promise.all([
          adminApi.getLowStockAlerts(),
          loadLegacyInventorySnapshot()
        ]);

        setUsingLegacyInventoryFallback(true);
        setAllInventoryItems(legacyItems);
        setInventoryData({
          overview: computeOverviewFromItems(legacyItems),
          alerts: alertsRes.data
        });
        applyClientInventoryPage(legacyItems, filters, 1);
      }
    } catch (err) {
      setError('Failed to load inventory data');
      console.error('Inventory load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (page) => {
    try {
      if (usingLegacyInventoryFallback) {
        applyClientInventoryPage(allInventoryItems, filters, page);
        return;
      }

      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = {
        page,
        limit: ITEMS_PER_PAGE,
        search: filters.search,
        stockStatus: filters.stockStatus === 'all' ? undefined : filters.stockStatus,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };

      const response = await adminApi.getInventoryItems(params);
      const newProducts = response.data.items || [];

      setProducts(prev => page === 1 ? newProducts : [...prev, ...newProducts]);
      setHasMore((response.data.pagination?.currentPage || page) < (response.data.pagination?.totalPages || page));
      setCurrentPage(page);
    } catch (err) {
      if (err?.response?.status === 404) {
        try {
          const legacyItems = allInventoryItems.length > 0 ? allInventoryItems : await loadLegacyInventorySnapshot();
          setUsingLegacyInventoryFallback(true);
          setAllInventoryItems(legacyItems);
          setInventoryData(prev => ({
            ...prev,
            overview: computeOverviewFromItems(legacyItems),
            alerts: prev?.alerts || []
          }));
          applyClientInventoryPage(legacyItems, filters, page);
          return;
        } catch (fallbackError) {
          setError('Failed to load products');
          console.error('Products load error:', fallbackError);
        }
      } else {
        setError('Failed to load products');
        console.error('Products load error:', err);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadProducts(currentPage + 1);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      stockStatus: 'all',
      sortBy: 'name',
      sortOrder: 'asc'
    });
  };

  const handleEditStock = (product) => {
    if (!product.stockTracked) return;
    setEditingProduct(product);
    setEditForm({
      stock: product.stock || 0,
      lowStockThreshold: product.lowStockThreshold || 5
    });
  };

  const { user: currentUser } = useAuth();

  const handleSaveStock = async () => {
    if (!editingProduct) return;

    try {
      // Check if the product belongs to the current admin or if user is superadmin
      const isOwnProduct = editingProduct.seller?.id === currentUser?.id;
      const isAdmin = ['superadmin', 'super_admin', 'admin'].includes(String(currentUser?.role || '').toLowerCase());

      if (!isOwnProduct && !isAdmin) {
        setError('You can only update stock for your own products');
        return;
      }

      await adminApi.updateStockLevels(editingProduct.id, editForm);
      setEditingProduct(null);

      // Update the local state to reflect changes
      const updatedFields = {
        stock: Number(editForm.stock || 0),
        lowStockThreshold: Number(editForm.lowStockThreshold || 0)
      };

      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.id === editingProduct.id
            ? { ...p, ...updatedFields }
            : p
        )
      );

      if (usingLegacyInventoryFallback) {
        setAllInventoryItems(prevItems => prevItems.map(item => (
          item.id === editingProduct.id && item.itemType === 'product'
            ? { ...item, ...updatedFields }
            : item
        )));
      }

      // Update the overview data
      if (inventoryData && editingProduct.stockTracked) {
        const overviewItems = usingLegacyInventoryFallback
          ? allInventoryItems.map(item => (
            item.id === editingProduct.id && item.itemType === 'product'
              ? { ...item, ...updatedFields }
              : item
          ))
          : products.map(item => (
            item.id === editingProduct.id && item.itemType === 'product'
              ? { ...item, ...updatedFields }
              : item
          ));

        setInventoryData(prev => ({
          ...prev,
          overview: usingLegacyInventoryFallback ? computeOverviewFromItems(overviewItems) : prev.overview
        }));
      }
    } catch (err) {
      setError('Failed to update stock levels');
      console.error('Update stock error:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditForm({ stock: '', lowStockThreshold: '' });
  };

  const handleSendContactMessage = async () => {
    if (!selectedSellerForContact || !contactMessage.trim()) {
      alert('Please enter a message');
      return;
    }

    setIsSendingReminder(true);
    try {
      await adminApi.notifySellerForProduct(selectedSellerForContact.productId, {
        type: 'CUSTOM_MESSAGE',
        title: `Admin Message regarding ${selectedSellerForContact.productName}`,
        message: contactMessage
      });

      alert('Message sent successfully!');
      setIsContactModalOpen(false);
      setContactMessage('');
      setSelectedSellerForContact(null);
    } catch (err) {
      setError('Failed to send message');
      console.error('Send message error:', err);
    } finally {
      setIsSendingReminder(false);
    }
  };

  // Deprecated: Old handleSendReminder replaced by contact modal
  // const handleSendReminder = async (product) => { ... }

  const renderStockStatus = (stock, threshold) => {
    if (stock === null || threshold === null || stock === undefined) return 'Not Tracked';
    if (stock === 0) return 'Out of Stock';
    if (stock <= threshold) return 'Low Stock';
    return 'In Stock';
  };

  const getStatusClass = (stock, threshold) => {
    if (stock === null || threshold === null || stock === undefined) return 'bg-slate-100 text-slate-700';
    if (stock === 0) return 'bg-red-100 text-red-800';
    if (stock <= threshold) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-gray-100">
              <FaBack className="text-lg text-gray-500" />
            </button>
            <div>
              <h2 className="text-xl md:text-2xl font-semibold">Inventory Management</h2>
              <p className="text-sm text-gray-500">Track and update product stock levels</p>
            </div>
          </div>
        </div>
        <div className="text-center py-12">
          <FaTimesCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Inventory</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button onClick={loadInitialData} className="mt-4 btn">Try Again</button>
        </div>
      </div>
    );
  }

  // Guard against null data if loading is false but data isn't ready
  if (!inventoryData) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const { overview, alerts } = inventoryData;

  return (
    <div className="bg-white rounded-lg shadow p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-gray-100">
            <FaBack className="text-lg text-gray-500" />
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-semibold">Inventory Management</h2>
            <p className="text-sm text-gray-500">Track and update product stock levels</p>
          </div>
        </div>
        <button onClick={loadInitialData} className="btn-outline">Refresh</button>
      </div>

      {/* Stock Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div
          onClick={() => setFilters(prev => ({ ...prev, stockStatus: prev.stockStatus === 'inStock' ? 'all' : 'inStock' }))}
          className={`rounded-lg p-4 cursor-pointer transition-all duration-200 border-2 ${filters.stockStatus === 'inStock' ? 'bg-green-100 border-green-500 scale-105 shadow-md' : 'bg-green-50 border-transparent hover:border-green-200 hover:shadow-sm'}`}
        >
          <div className="flex items-center">
            <FaCheckCircle className="text-green-600 text-2xl mr-3" />
            <div>
              <div className="text-2xl font-bold text-green-600">{overview.inStock}</div>
              <div className="text-sm text-gray-600">Tracked In Stock</div>
            </div>
          </div>
        </div>

        <div
          onClick={() => setFilters(prev => ({ ...prev, stockStatus: prev.stockStatus === 'lowStock' ? 'all' : 'lowStock' }))}
          className={`rounded-lg p-4 cursor-pointer transition-all duration-200 border-2 ${filters.stockStatus === 'lowStock' ? 'bg-yellow-100 border-yellow-500 scale-105 shadow-md' : 'bg-yellow-50 border-transparent hover:border-yellow-200 hover:shadow-sm'}`}
        >
          <div className="flex items-center">
            <FaExclamationTriangle className="text-yellow-600 text-2xl mr-3" />
            <div>
              <div className="text-2xl font-bold text-yellow-600">{overview.lowStock}</div>
              <div className="text-sm text-gray-600">Tracked Low Stock</div>
            </div>
          </div>
        </div>

        <div
          onClick={() => setFilters(prev => ({ ...prev, stockStatus: prev.stockStatus === 'outOfStock' ? 'all' : 'outOfStock' }))}
          className={`rounded-lg p-4 cursor-pointer transition-all duration-200 border-2 ${filters.stockStatus === 'outOfStock' ? 'bg-red-100 border-red-500 scale-105 shadow-md' : 'bg-red-50 border-transparent hover:border-red-200 hover:shadow-sm'}`}
        >
          <div className="flex items-center">
            <FaTimesCircle className="text-red-600 text-2xl mr-3" />
            <div>
              <div className="text-2xl font-bold text-red-600">{overview.outOfStock}</div>
              <div className="text-sm text-gray-600">Tracked Out of Stock</div>
            </div>
          </div>
        </div>

        <div
          onClick={() => setFilters(prev => ({ ...prev, stockStatus: prev.stockStatus === 'untracked' ? 'all' : 'untracked' }))}
          className={`rounded-lg p-4 cursor-pointer transition-all duration-200 border-2 ${filters.stockStatus === 'untracked' ? 'bg-slate-100 border-slate-500 scale-105 shadow-md' : 'bg-slate-50 border-transparent hover:border-slate-200 hover:shadow-sm'}`}
        >
          <div className="flex items-center">
            <FaBox className="text-slate-600 text-2xl mr-3" />
            <div>
              <div className="text-2xl font-bold text-slate-700">{overview.stockUntracked || 0}</div>
              <div className="text-sm text-gray-600">Stock Untracked</div>
            </div>
          </div>
        </div>

        <div
          onClick={() => setFilters(prev => ({ ...prev, stockStatus: 'all' }))}
          className={`rounded-lg p-4 cursor-pointer transition-all duration-200 border-2 ${filters.stockStatus === 'all' ? 'bg-blue-100 border-blue-500 scale-105 shadow-md' : 'bg-blue-50 border-transparent hover:border-blue-200 hover:shadow-sm'}`}
        >
          <div className="flex items-center">
            <FaBox className="text-blue-600 text-2xl mr-3" />
            <div>
              <div className="text-2xl font-bold text-blue-600">{overview.totalProducts}</div>
              <div className="text-sm text-gray-600">Total Inventory Items</div>
            </div>
          </div>
        </div>
      </div>

      {/* Product List with Filters */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="w-full sm:w-1/3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search products..."
                className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              <FaFilter />
              <span>Filters</span>
            </button>
            <button
              onClick={resetFilters}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Status</label>
                <select
                  name="stockStatus"
                  value={filters.stockStatus}
                  onChange={handleFilterChange}
                  className="w-full border rounded-md p-2"
                >
                  <option value="all">All Products</option>
                  <option value="inStock">In Stock</option>
                  <option value="lowStock">Low Stock</option>
                  <option value="outOfStock">Out of Stock</option>
                  <option value="untracked">Stock Not Tracked</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  name="sortBy"
                  value={filters.sortBy}
                  onChange={handleFilterChange}
                  className="w-full border rounded-md p-2"
                >
                  <option value="name">Name</option>
                  <option value="stock">Stock Level</option>
                  <option value="dateAdded">Date Added</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <select
                  name="sortOrder"
                  value={filters.sortOrder}
                  onChange={handleFilterChange}
                  className="w-full border rounded-md p-2"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Products Table */}
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Threshold</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No products found. Try adjusting your filters.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {getInventoryItemImage(product) !== FALLBACK_IMAGE ? (
                            <img
                              className="h-10 w-10 rounded-md object-cover"
                              src={resolveImageUrl(getInventoryItemImage(product))}
                              alt={product.name}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center">
                              <FaBox className="text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">{product.itemType === 'fastfood' ? 'Fast Food' : 'Product'}</div>
                          <div className="text-sm text-gray-500">ID: {product.id || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.seller ? (
                        <div>
                          <div className="text-sm text-gray-500">ID: {product.seller.id}</div>
                          <div className="text-sm font-medium text-gray-900">{product.seller.name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{product.seller.email || 'N/A'}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.stockTracked && editingProduct?.id === product.id ? (
                        <input
                          type="number"
                          value={editForm.stock}
                          onChange={(e) => setEditForm(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                          className="w-20 px-2 py-1 border rounded"
                          min="0"
                        />
                      ) : !product.stockTracked ? (
                        <span className="text-gray-500">-</span>
                      ) : (
                        <span className={`font-medium ${product.stock === 0 ? 'text-red-600' : product.stock <= (product.lowStockThreshold || 5) ? 'text-yellow-600' : 'text-green-600'}`}>
                          {product.stock}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.stockTracked && editingProduct?.id === product.id ? (
                        <input
                          type="number"
                          value={editForm.lowStockThreshold}
                          onChange={(e) => setEditForm(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 0 }))}
                          className="w-20 px-2 py-1 border rounded"
                          min="0"
                        />
                      ) : !product.stockTracked ? (
                        <span className="text-gray-500">-</span>
                      ) : (
                        <span className="text-gray-600">{product.lowStockThreshold || 5}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(product.stock, product.lowStockThreshold || 5)}`}>
                        {renderStockStatus(product.stock, product.lowStockThreshold || 5)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {product.stockTracked && editingProduct?.id === product.id ? (
                          <>
                            <button
                              onClick={handleSaveStock}
                              className="text-green-600 hover:text-green-800"
                              title="Save"
                            >
                              <FaSave />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-gray-600 hover:text-gray-800"
                              title="Cancel"
                            >
                              <FaTimes />
                            </button>
                          </>
                        ) : (
                          <>
                            {product.stockTracked && (
                              <button
                                onClick={() => handleEditStock(product)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit Stock"
                              >
                                <FaEdit />
                              </button>
                            )}
                            {product.seller && product.itemType === 'product' && (
                              <button
                                onClick={() => {
                                  setSelectedSellerForContact({
                                    id: product.seller.id,
                                    name: product.seller.name,
                                    email: product.seller.email,
                                    productId: product.id,
                                    productName: product.name
                                  });
                                  setContactMessage(`Regarding your product: ${product.name}`);
                                  setIsContactModalOpen(true);
                                }}
                                className="text-yellow-600 hover:text-yellow-800"
                                title="Contact Seller"
                              >
                                <FaEnvelope />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Load More Button */}
        {hasMore && !loading && products.length > 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      {/* Contact Seller Modal */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Contact Seller</h3>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1">To:</label>
              <div className="text-gray-700">{selectedSellerForContact?.name} ({selectedSellerForContact?.email})</div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-1">Product:</label>
              <div className="text-gray-700">{selectedSellerForContact?.productName}</div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">Message:</label>
              <textarea
                className="w-full border rounded p-2 h-32"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Enter your message here..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSendContactMessage}
                disabled={isSendingReminder}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {isSendingReminder ? <FaSync className="animate-spin mr-2" /> : <FaPaperPlane className="mr-2" />}
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Automated Alerts Configuration */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Automated Stock Alerts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Email Notifications</h4>
            <p className="text-sm text-gray-600 mb-3">
              Automatically send email alerts to sellers when products go below stock threshold.
            </p>
            <div className="flex items-center space-x-3">
              <input type="checkbox" id="email-alerts" className="rounded" defaultChecked />
              <label htmlFor="email-alerts" className="text-sm">Enable email alerts</label>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Dashboard Alerts</h4>
            <p className="text-sm text-gray-600 mb-3">
              Show low stock warnings in the admin dashboard.
            </p>
            <div className="flex items-center space-x-3">
              <input type="checkbox" id="dashboard-alerts" className="rounded" defaultChecked />
              <label htmlFor="dashboard-alerts" className="text-sm">Show dashboard alerts</label>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
};

export default InventoryManagement;