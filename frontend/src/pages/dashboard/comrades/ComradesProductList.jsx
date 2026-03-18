import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Plus, Edit, Trash2, Search, Loader2, ChevronDown, ChevronUp, PackageSearch, ArrowLeft } from 'lucide-react';
import { productApi } from '../../../utils/api';
import DeleteConfirmationModal from '../../../components/modals/DeleteConfirmationModal';
import { useToast } from '../../../components/ui/use-toast';
import { getSellerProductPrice } from '../../../utils/priceDisplay';

const ComradesProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    sortBy: 'newest',
  });
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, product: null });
  const { toast } = useToast();

  const FALLBACK_IMG = 'data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22150%22 viewBox=%220 0 150 150%22%3E%3Crect width=%22150%22 height=%22150%22 fill=%22%23e5e7eb%22/%3E%3Ctext x=%2275%22 y=%2278%22 font-size=%2212%22 text-anchor=%22middle%22 fill=%22%236b7280%22%3ENo Image%3C/text%3E%3C/svg%3E';

  // fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productApi.getAll();
      if (response.data && Array.isArray(response.data)) {
        setProducts(response.data);
      } else {
        loadSampleData();
      }
    } catch (error) {
      console.error('Error fetching comrades products:', error);
      loadSampleData();
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    setProducts([
      {
        id: 1,
        name: 'Comrade Product 1',
        sku: 'CP-001',
        price: 99.99,
        status: 'active',
        stock: 10,
        description: 'Sample comrade product',
        thumbnail: FALLBACK_IMG,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSearch = (e) => setSearchTerm(e.target.value);

  const handleFilterChange = (e) =>
    setFilters({ ...filters, [e.target.name]: e.target.value });

  const handleDelete = (product) => {
    setDeleteModal({ isOpen: true, product });
  };

  const handleConfirmedDelete = async (productId, reason, password) => {
    try {
      const config = { data: { password, reason } };
      await productApi.delete(productId, config);

      // Optimistic Update: Remove from local state immediately
      if (setProducts) {
        setProducts(prev => prev.filter(p => (p.id || p._id) !== productId));
      }

      fetchProducts();
      toast({ title: "Deleted", description: "Product removed successfully" });
    } catch (error) {
      console.error('Error deleting comrade product:', error);
      toast({ title: "Error", description: error.response?.data?.message || "Failed to delete product", variant: "destructive" });
      throw error;
    }
  };

  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const toggleExpand = (productId) => {
    setExpandedProductId(expandedProductId === productId ? null : productId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.history.back()}
            className="h-8 w-8 p-0"
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Our Products</h1>
        </div>
        <Button onClick={() => (window.location.href = '/dashboard/products/comrades/new')}>
          <Plus className="h-4 w-4 mr-2" /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="relative w-full md:w-1/3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search comrades products..."
                className="pl-10"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            <div className="flex gap-2">
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                name="sortBy"
                value={filters.sortBy}
                onChange={handleFilterChange}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="price-asc">Price (Low to High)</option>
                <option value="price-desc">Price (High to Low)</option>
              </select>
            </div>
          </div>

          {/* Product list */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : products.length > 0 ? (
            <div className="space-y-4">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className={`overflow-hidden transition-all ${expandedProductId === product.id
                    ? 'ring-2 ring-primary'
                    : 'hover:shadow-md'
                    }`}
                >
                  {/* Card Header */}
                  <div
                    className="p-4 cursor-pointer flex items-center justify-between"
                    onClick={() => toggleExpand(product.id)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-md overflow-hidden bg-muted">
                        <img
                          src={product.thumbnail || FALLBACK_IMG}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = FALLBACK_IMG;
                          }}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          SKU: {product.sku || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">KES {getSellerProductPrice(product).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.stock || 0} in stock
                        </p>
                      </div>
                      <Badge variant={getStatusVariant(product.status)} className="capitalize">
                        {product.status?.toLowerCase() || 'N/A'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(product.id);
                        }}
                      >
                        {expandedProductId === product.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedProductId === product.id && (
                    <div className="border-t p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                          <p className="mt-1">{product.description || 'No description available'}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">Details</h4>
                          <div className="mt-1 space-y-1">
                            <p>SKU: {product.sku || 'N/A'}</p>
                            <p>Base Price: KES {getSellerProductPrice(product).toFixed(2)}</p>
                            {product.displayPrice && product.displayPrice > getSellerProductPrice(product) && (
                              <p className="text-green-600">Customer Price: KES {Number(product.displayPrice).toFixed(2)}</p>
                            )}
                            <p>Stock: {product.stock || 0} units</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/dashboard/products/comrades/${product.id}/edit`;
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(product);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <PackageSearch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No comrades products found</h3>
              <p className="text-muted-foreground mt-1">
                {searchTerm || filters.status !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by adding a new comrade product.'}
              </p>
              <Button
                className="mt-4"
                onClick={() => (window.location.href = '/dashboard/products/comrades/new')}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Comrade Product
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, product: null })}
        product={deleteModal.product}
        onConfirm={handleConfirmedDelete}
      />
    </div>
  );
};

export default ComradesProductList;
