import React, { useState, useEffect } from 'react';
import {
  FaClock,
  FaEyeSlash,
  FaPause,
  FaCheckCircle,
  FaBox,
  FaFilter,
  FaSearch,
  FaEye,
  FaBan,
  FaTrash,
  FaEdit,
  FaCheck,
  FaTimes
} from 'react-icons/fa';
import { productApi } from '../../services/api';
import { useToast } from '../ui/use-toast';
import { getProductMainImage, FALLBACK_IMAGE } from '../../utils/imageUtils';

const CompactProductDashboard = ({ onBack, onViewProduct, onListProduct }) => {
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'pending', 'hidden', 'suspended', 'recent'
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // Fetch all products
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        setLoading(true);
        const response = await productApi.getAll();
        const products = Array.isArray(response?.data) ? response.data : [];

        // Format products
        const formattedProducts = products.map(product => ({
          ...product,
          Seller: product.Seller || product.seller,
          Category: product.Category || product.category,
          Subcategory: product.Subcategory || product.subcategory,
        }));

        setAllProducts(formattedProducts);
        setFilteredProducts(formattedProducts);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast({
          title: 'Error',
          description: 'Failed to load products',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAllProducts();

    // Set up polling interval for real-time updates
    const interval = setInterval(() => {
      fetchAllProducts();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Get product category
  const getProductCategory = (product) => {
    const isSuspended = product.status === 'suspended' || !!product.suspensionReason;
    const isHidden = product.visibilityStatus === 'hidden' || product.status === 'hidden' || product.reviewStatus === 'rejected';
    const isPending = !product.approved && !isHidden && !isSuspended;
    const isRecentlyApproved = product.approved && product.reviewStatus === 'approved' &&
      new Date(product.updatedAt || Date.now()) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    if (isSuspended) return 'suspended';
    if (isHidden) return 'hidden';
    if (isPending) return 'pending';
    if (isRecentlyApproved) return 'recent';
    return 'approved';
  };

  // Filter products based on active filter and search
  useEffect(() => {
    let filtered = allProducts;

    // Apply category filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(product => getProductCategory(product) === activeFilter);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.Seller?.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.Category?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [allProducts, activeFilter, searchQuery]);

  // Get counts for each category
  const getCategoryCounts = () => {
    const counts = {
      all: allProducts.length,
      pending: 0,
      hidden: 0,
      suspended: 0,
      recent: 0
    };

    allProducts.forEach(product => {
      const category = getProductCategory(product);
      if (counts[category] !== undefined) {
        counts[category]++;
      }
    });

    return counts;
  };

  const counts = getCategoryCounts();

  // Action handlers
  const handleApprove = async (productId) => {
    const displayPrice = prompt('Enter display price:');
    if (!displayPrice || isNaN(parseFloat(displayPrice))) return;

    setActionLoading(productId);
    try {
      await productApi.approve(productId, { displayPrice: parseFloat(displayPrice) });
      toast({ title: 'Success', description: 'Product approved' });
      window.location.reload();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to approve', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (productId) => {
    if (!window.confirm('Reject this product?')) return;

    setActionLoading(productId);
    try {
      await productApi.reject(productId);
      toast({ title: 'Success', description: 'Product rejected' });
      window.location.reload();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reject', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (productId) => {
    if (!window.confirm('Suspend this product?')) return;

    setActionLoading(productId);
    try {
      await productApi.update(productId, {
        status: 'suspended',
        suspensionReason: 'Suspended by admin',
        visibilityStatus: 'hidden'
      });
      toast({ title: 'Success', description: 'Product suspended' });
      window.location.reload();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to suspend', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnsuspend = async (productId) => {
    setActionLoading(productId);
    try {
      await productApi.update(productId, {
        status: 'approved',
        suspensionReason: null,
        visibilityStatus: 'active',
        approved: true,
        reviewStatus: 'approved'
      });
      toast({ title: 'Success', description: 'Product unsuspended' });
      window.location.reload();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to unsuspend', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleVisibility = async (productId) => {
    setActionLoading(productId);
    try {
      const product = allProducts.find(p => p.id === productId);
      const isHidden = product.visibilityStatus === 'hidden' || product.status === 'hidden' || product.reviewStatus === 'rejected';

      await productApi.update(productId, {
        visibilityStatus: isHidden ? 'active' : 'hidden',
        status: isHidden ? 'approved' : 'hidden',
        approved: isHidden,
        reviewStatus: isHidden ? 'approved' : 'rejected'
      });
      toast({ title: 'Success', description: `Product ${isHidden ? 'unhidden' : 'hidden'}` });
      window.location.reload();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update visibility', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Delete this product?')) return;

    setActionLoading(productId);
    try {
      await productApi.delete(productId);
      toast({ title: 'Success', description: 'Product deleted' });
      window.location.reload();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  // Filter tabs
  const filterTabs = [
    { id: 'all', label: 'All Products', count: counts.all, color: 'bg-blue-500' },
    { id: 'pending', label: 'Pending', count: counts.pending, color: 'bg-yellow-500' },
    { id: 'hidden', label: 'Hidden', count: counts.hidden, color: 'bg-gray-500' },
    { id: 'suspended', label: 'Suspended', count: counts.suspended, color: 'bg-red-500' },
    { id: 'recent', label: 'Recently Approved', count: counts.recent, color: 'bg-green-500' }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Product Management Dashboard</h2>
          {onBack && (
            <button onClick={onBack} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded">
              Back
            </button>
          )}
        </div>

        {/* Search and Stats */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Showing {filteredProducts.length} of {allProducts.length} products
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-6">
          <div className="flex space-x-2 overflow-x-auto">
            {filterTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`flex items-center px-4 py-2 rounded-full text-white text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === tab.id ? tab.color : 'bg-gray-400 hover:bg-gray-500'
                  }`}
              >
                <span>{tab.label}</span>
                <span className="ml-2 bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="p-6">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => {
              const category = getProductCategory(product);
              const isSuspended = category === 'suspended';
              const isHidden = category === 'hidden';
              const isPending = category === 'pending';

              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-all ${isSuspended ? 'border-red-200' : isHidden ? 'border-gray-200' : 'border-gray-100'
                    }`}
                >
                  {/* Product Image */}
                  <div className="relative h-32 bg-gray-50 rounded-t-lg overflow-hidden">
                    <img
                      src={getProductMainImage(product) || FALLBACK_IMAGE}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = FALLBACK_IMAGE; }}
                    />
                    {(isSuspended || isHidden) && (
                      <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${isSuspended ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                        {isSuspended ? 'Suspended' : 'Hidden'}
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2">
                      <div className={`w-3 h-3 rounded-full ${isSuspended ? 'bg-red-500' :
                        isHidden ? 'bg-gray-500' :
                          isPending ? 'bg-yellow-500' : 'bg-green-500'
                        }`}></div>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-3">
                    <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2">
                      {product.Seller?.businessName || 'No seller'}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        KES {product.displayPrice || product.basePrice || '0'}
                      </p>
                      {product.displayPrice && product.basePrice && product.displayPrice < product.basePrice && (
                        <p className="text-[10px] text-gray-400 line-through">
                          KES {product.basePrice}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-3 flex justify-between items-center">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => onViewProduct('view', product)}
                          className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                          title="View"
                        >
                          <FaEye className="h-3 w-3" />
                        </button>

                        {isPending && (
                          <>
                            <button
                              onClick={() => handleApprove(product.id)}
                              disabled={actionLoading === product.id}
                              className="p-1 text-green-600 hover:text-green-700 transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              <FaCheck className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleReject(product.id)}
                              disabled={actionLoading === product.id}
                              className="p-1 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                              title="Reject"
                            >
                              <FaTimes className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>

                      <div className="flex space-x-1">
                        {!isHidden && !isSuspended && (
                          <button
                            onClick={() => handleToggleVisibility(product.id)}
                            className="p-1 text-gray-600 hover:text-gray-700 transition-colors"
                            title="Hide"
                          >
                            <FaEyeSlash className="h-3 w-3" />
                          </button>
                        )}

                        {(isHidden || isSuspended) && (
                          <button
                            onClick={() => isSuspended ? handleUnsuspend(product.id) : handleToggleVisibility(product.id)}
                            disabled={actionLoading === product.id}
                            className={`p-1 transition-colors disabled:opacity-50 ${isSuspended ? 'text-orange-600 hover:text-orange-700' : 'text-gray-600 hover:text-gray-700'
                              }`}
                            title={isSuspended ? 'Unsuspend' : 'Unhide'}
                          >
                            <FaEye className="h-3 w-3" />
                          </button>
                        )}

                        {!isSuspended && (
                          <button
                            onClick={() => handleSuspend(product.id)}
                            className="p-1 text-orange-600 hover:text-orange-700 transition-colors"
                            title="Suspend"
                          >
                            <FaBan className="h-3 w-3" />
                          </button>
                        )}

                        <button
                          onClick={() => onListProduct(product)}
                          className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                          title="Edit"
                        >
                          <FaEdit className="h-3 w-3" />
                        </button>

                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-1 text-red-600 hover:text-red-700 transition-colors"
                          title="Delete"
                        >
                          <FaTrash className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <FaBox className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
            <p className="text-gray-500">
              {searchQuery ? 'Try adjusting your search terms' : 'No products match the selected filter'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompactProductDashboard;