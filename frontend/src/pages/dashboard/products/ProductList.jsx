import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Plus, Edit, Trash2, Search, Loader2, ChevronDown, ChevronUp, PackageSearch } from 'lucide-react';
import { productApi } from '../../../utils/api';
import DeleteConfirmationModal from '../../../components/modals/DeleteConfirmationModal';
import { useToast } from '../../../components/ui/use-toast';
import { getSellerProductPrice } from '../../../utils/priceDisplay';


const ProductList = () => {
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
  const resolveThumb = (p) => {
    // Priority 1: Useoptimized coverImage from lite API
    const cover = p?.coverImage;
    if (cover) {
      if (/^https?:\/\//i.test(cover)) return cover;
      if (/^\//.test(cover)) return cover;
      return `/${cover}`;
    }

    // Priority 2: Use existing thumbnail/images logic
    const t = p?.thumbnail;
    if (t && /^https?:\/\//i.test(t)) return t;
    const imgs = Array.isArray(p?.images) ? p.images : [];
    const first = imgs[0];
    if (first) {
      if (/^https?:\/\//i.test(first)) return first;
      if (/^\//.test(first)) return first;
      return `/${first}`;
    }
    if (t) {
      if (/^\//.test(t)) return t;
      return `/${t}`;
    }
    return FALLBACK_IMG;
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let response;
      const params = { lite: true };

      if (filters.status === 'pending') {
        // Fetch only pending products with lite optimization
        console.log('Fetching pending products (lite)...');
        response = await productApi.getPending(params);
        console.log('Pending products response:', response);
      } else if (filters.status === 'active') {
        // Fetch only approved products with lite optimization
        response = await productApi.getAll({ ...params, approved: true });
        if (response.data && Array.isArray(response.data)) {
          response.data = response.data.filter(product => product.approved);
        }
      } else {
        // Fetch all products with lite optimization
        response = await productApi.getAll(params);
      }

      const productsData = response?.data?.products || response?.data || [];

      if (Array.isArray(productsData)) {
        // Map the response to ensure consistent data structure
        const formattedProducts = productsData.map(product => ({
          ...product,
          status: product.reviewStatus || (product.approved ? 'active' : 'pending'),
          category: product.Category || product.category,
          subcategory: product.Subcategory || product.subcategory,
          seller: product.Seller || product.seller
        }));
        console.log('Formatted products:', formattedProducts);
        setProducts(formattedProducts);
      } else {
        console.warn('No valid product data received, loading sample data');
        loadSampleData();
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      loadSampleData();
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    const sampleProducts = [
      {
        id: 1,
        name: 'Sample Product 1',
        sku: 'SP001',
        price: 99.99,
        originalPrice: 129.99,
        status: 'active',
        approved: true,
        reviewStatus: 'approved',
        category: { name: 'Electronics' },
        subcategory: { name: 'Gadgets' },
        thumbnail: FALLBACK_IMG,
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Sample Product 2',
        sku: 'SP002',
        price: 199.99,
        status: 'pending',
        approved: false,
        reviewStatus: 'pending',
        category: { name: 'Clothing' },
        subcategory: { name: 'Men' },
        thumbnail: FALLBACK_IMG,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 3,
        name: 'Sample Product 3',
        sku: 'SP003',
        price: 49.99,
        status: 'rejected',
        approved: false,
        reviewStatus: 'rejected',
        category: { name: 'Home & Kitchen' },
        subcategory: { name: 'Cookware' },
        thumbnail: FALLBACK_IMG,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ];

    let filteredProducts = [...sampleProducts];

    if (filters.status === 'pending') {
      filteredProducts = filteredProducts.filter(
        (p) => p.reviewStatus === 'pending' || p.status === 'pending'
      );
    } else if (filters.status === 'active') {
      filteredProducts = filteredProducts.filter(
        (p) => p.approved === true || p.status === 'active'
      );
    } else if (filters.status === 'rejected') {
      filteredProducts = filteredProducts.filter(
        (p) => p.reviewStatus === 'rejected' || p.status === 'rejected'
      );
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredProducts = filteredProducts.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(searchLower)) ||
          (p.sku && p.sku.toLowerCase().includes(searchLower))
      );
    }

    filteredProducts.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'oldest':
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'price_asc':
          return (a.price || 0) - (b.price || 0);
        case 'price_desc':
          return (b.price || 0) - (a.price || 0);
        default:
          return 0;
      }
    });

    setProducts(filteredProducts);
  };

  useEffect(() => {
    fetchProducts();
  }, [filters, searchTerm]);

  const handleSearchChange = (e) => setSearchTerm(e.target.value);
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
      console.error('Error deleting product:', error);
      toast({ title: "Error", description: error.response?.data?.message || "Failed to delete product", variant: "destructive" });
      throw error;
    }
  };

  const getStatusVariant = (status) => {
    const statusStr = String(status || '').toLowerCase();
    switch (statusStr) {
      case 'active':
      case 'approved':
        return 'default';
      case 'pending':
      case 'pending_review':
        return 'secondary';
      case 'rejected':
      case 'rejection':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const toggleExpand = (productId) => {
    setExpandedProductId(expandedProductId === productId ? null : productId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button onClick={() => (window.location.href = '/dashboard/products/add')}>
          <Plus className="h-4 w-4 mr-2" /> Add Product
        </Button>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-wrap gap-4">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-8 w-full"
          />
        </div>
        <select
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
          className="border rounded p-2"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          name="sortBy"
          value={filters.sortBy}
          onChange={handleFilterChange}
          className="border rounded p-2"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name_asc">Name (A-Z)</option>
          <option value="name_desc">Name (Z-A)</option>
          <option value="price_asc">Price (Low to High)</option>
          <option value="price_desc">Price (High to Low)</option>
        </select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center items-center h-32">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : products.length > 0 ? (
          products.map((product) => (
            <Card
              key={product.id}
              className={`overflow-hidden transition-all ${expandedProductId === product.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                }`}
            >
              {/* Product Header */}
              <div
                className="p-4 cursor-pointer flex items-center justify-between"
                onClick={() => toggleExpand(product.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-md overflow-hidden bg-muted">
                    <img
                      src={resolveThumb(product)}
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
                    <p className="text-sm text-muted-foreground">{product.sku}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
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

              {/* Expanded Content */}
              {expandedProductId === product.id && (
                <div className="border-t p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Category</p>
                      <p>{product.category?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Subcategory</p>
                      <p>{product.subcategory?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Base Price (Your Cost)</p>
                      <div className="flex items-center">
                        <span className="font-medium">KES {getSellerProductPrice(product).toFixed(2)}</span>
                        {product.displayPrice && product.displayPrice > getSellerProductPrice(product) && (
                          <span className="ml-2 text-xs text-green-600">
                            (Customer: KES {Number(product.displayPrice).toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stock</p>
                      <p>{product.stock || 0} units</p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/dashboard/products/edit/${product.id}`;
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
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <PackageSearch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No products found</h3>
            <p className="text-muted-foreground mt-1">
              {searchTerm || filters.status !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding a new product.'}
            </p>
            {!searchTerm && filters.status === 'all' && (
              <Button
                className="mt-4"
                onClick={() => (window.location.href = '/dashboard/products/add')}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Product
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Comrades Products Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Comrades Products</h2>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" /> Add Comrade Product
            </Button>
          </div>

          <div className="border rounded-lg p-4 bg-muted/20">
            <div className="text-center py-8">
              <PackageSearch className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium">No comrades products yet</h3>
              <p className="text-muted-foreground mt-1">
                Add comrades products to start managing them here
              </p>
              <Button className="mt-4" variant="outline">
                <Plus className="h-4 w-4 mr-2" /> Add Comrade Product
              </Button>
            </div>
          </div>
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

export default ProductList;
