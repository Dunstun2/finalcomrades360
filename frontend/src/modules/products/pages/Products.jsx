import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Star, ArrowLeft, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCategories } from '@/contexts/CategoriesContext';
import api, { productApi } from '@/shared/services/api';
import HomeProductCard from '@/modules/products/components/HomeProductCard';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import MaintenanceOverlay from '@/shared/components/MaintenanceOverlay';
import HeroBanner from '@/modules/marketing/components/HeroBanner';
import Footer from '@/shared/components/Footer';
import useHeroPromotions from '@/hooks/useHeroPromotions';
import PageLayout from '@/shared/components/PageLayout';

// Fallback categories in case backend is down (strictly product categories)
const fallbackCategories = [
  { id: 1, name: 'Books & Stationery', emoji: '📚', productCount: 23, taxonomyType: 'product' },
  { id: 2, name: 'Electronics & Gadgets', emoji: '📱', productCount: 32, taxonomyType: 'product' },
  { id: 3, name: 'Fashion & Beauty', emoji: '👗', productCount: 26, taxonomyType: 'product' },
  { id: 5, name: 'Home & Living', emoji: '🏠', productCount: 20, taxonomyType: 'product' },
  { id: 6, name: 'Campus Life', emoji: '🎒', productCount: 11, taxonomyType: 'product' },
  { id: 8, name: 'Sports & Fitness', emoji: '⚽', productCount: 9, taxonomyType: 'product' }
];

const Products = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { cart, addToCart, removeFromCart, refresh: refreshCart } = useCart();
  const { toggleWishlist } = useWishlist();
  const { categories, loading: categoriesLoadingFromContext } = useCategories();
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  // Filter categories strictly for products (excluding fast food and services)
  const displayCategories = useMemo(() => {
    const rawCategories = categories && categories.length > 0 ? categories : fallbackCategories;
    return rawCategories.filter(cat => {
      if (!cat) return false;
      const type = String(cat.taxonomyType || '').toLowerCase();
      const name = String(cat.name || '').toLowerCase();
      if (type === 'fast_food' || type === 'service' || type === 'services') return false;
      if (name.includes('fast food') || name.includes('food & drinks') || name.includes('services')) return false;
      return true;
    });
  }, [categories]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [filtering, setFiltering] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const observerSentinel = useRef(null);
  const { heroPromotions } = useHeroPromotions('products');
  const productHeroPromotions = useMemo(() => {
    if (!Array.isArray(heroPromotions)) return [];
    return heroPromotions.filter(p => p.promoType !== 'fastfood' && p.promoType !== 'service');
  }, [heroPromotions]);

  const productsPerPage = 24;

  // --- Granular Maintenance Check ---
  const [maintenanceSettings, setMaintenanceSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('maintenance_settings') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleUpdate = (e) => {
      const data = e.detail || (e.key === 'maintenance_settings' ? JSON.parse(e.newValue || '{}') : null);
      if (data) setMaintenanceSettings(data);
    };
    window.addEventListener('maintenance-settings-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('maintenance-settings-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const userRoles = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : []);
  const isAdmin = (userRoles.includes('admin') || userRoles.includes('super_admin') || userRoles.includes('superadmin'));
  const isMaintenanceActive = !isAdmin && (maintenanceSettings.enabled || maintenanceSettings.sections?.products?.enabled);

  // Handle URL parameters for category and subcategory filtering
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const categoryId = urlParams.get('categoryId');
    const subcategoryId = urlParams.get('subcategoryId');

    if (categoryId) {
      const category = displayCategories.find(cat => cat.id === parseInt(categoryId));
      if (category) {
        if (!selectedCategory || selectedCategory.id !== category.id) {
          setSelectedCategory(category);
        }
        if (subcategoryId && category.subcategories) {
          const subcategory = category.subcategories.find(sub => sub.id === parseInt(subcategoryId));
          if (subcategory && (!selectedSubcategory || selectedSubcategory.id !== subcategory.id)) {
            setSelectedSubcategory(subcategory);
          }
        }
      }
    } else {
      if (selectedCategory) setSelectedCategory(null);
      if (selectedSubcategory) setSelectedSubcategory(null);
    }
  }, [location.search, displayCategories]);

  // Derive search query from URL
  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get('search') || '';

  // Fetch products when page, category, subcategory, or search query changes
  useEffect(() => {
    fetchProducts();
  }, [currentPage, selectedCategory, selectedSubcategory, searchQuery]);

  const fetchProducts = async () => {
    try {
      if (currentPage === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const isMarketingMode = localStorage.getItem('marketing_mode') === 'true';

      const response = await productApi.getAll({
        limit: productsPerPage,
        page: currentPage,
        categoryId: selectedCategory?.id,
        subcategoryId: selectedSubcategory?.id,
        search: searchQuery,
        lite: true,
        ...(isMarketingMode && { marketing: 'true' })
      });
      const productsData = response.data.products || [];
      const pagination = response.data.pagination || {};

      if (currentPage === 1) {
        setProducts(productsData);
      } else {
        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNewProducts = productsData.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueNewProducts];
        });
      }

      setTotalCount(pagination.totalProducts || productsData.length);
      setTotalPages(Math.ceil((pagination.totalProducts || productsData.length) / productsPerPage));

    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (currentPage < totalPages && !loadingMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleViewProduct = (product) => {
    navigate(`/product/${product.id}`);
  };

  const handleAddToCart = async (productId) => {
    try {
      const isInCart = cart?.items?.some(item => item.productId === productId || item.product?.id === productId);
      if (isInCart) {
        await removeFromCart(productId);
      } else {
        await addToCart(productId, 1);
      }
      await refreshCart();
    } catch (error) {
      console.error('Cart operation failed:', error);
    }
  };

  const handleWishlistToggle = async (productId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await toggleWishlist(productId);
    } catch (error) {
      console.error('Wishlist toggle error:', error);
    }
  };

  const handleCategorySelect = async (category) => {
    setSelectedCategory(category);
    setCurrentPage(1); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const params = new URLSearchParams(location.search);
    if (category) {
      params.set('categoryId', category.id.toString());
    } else {
      params.delete('categoryId');
    }
    navigate(`${location.pathname}?${params.toString()}`);
  };

  // Infinite scrolling logic
  useEffect(() => {
    if (loading || loadingMore || currentPage >= totalPages) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && currentPage < totalPages) {
          setCurrentPage(prev => prev + 1);
        }
      },
      { threshold: 0.1, rootMargin: '1500px' }
    );
    if (observerSentinel.current) observer.observe(observerSentinel.current);
    return () => {
      if (observerSentinel.current) observer.unobserve(observerSentinel.current);
    };
  }, [loading, loadingMore, currentPage, totalPages]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center">
            <div className="text-red-600 mr-3">⚠️</div>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error Loading Products</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button
                onClick={() => { setCurrentPage(1); fetchProducts(); }}
                className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <MaintenanceOverlay 
        isVisible={isMaintenanceActive} 
        message={maintenanceSettings.sections?.products?.message} 
      />
      
      <div className={isMaintenanceActive ? "blur-md pointer-events-none opacity-50 select-none transition-all duration-700" : "transition-all duration-700"}>
        <div className="min-h-screen bg-gray-50 pb-20 px-1.5 sm:px-4">
            {/* Back button */}
            <div className="w-full px-1.5 sm:px-4 py-2 sm:py-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors text-xs sm:text-sm"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Back
              </button>
            </div>

            {productHeroPromotions && productHeroPromotions.length > 0 && (
              <HeroBanner
                promotions={productHeroPromotions}
                onAddToCart={handleAddToCart}
              />
            )}

            {/* Category Filter */}
            {/* Mobile: "Our Products" pill left + Category dropdown right */}
            <div className="md:hidden mt-4 mb-4 px-2 sm:px-0 flex items-center gap-2">
              {/* Our Products pill — click to clear category filter */}
              <button
                type="button"
                onClick={() => handleCategorySelect(null)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 rounded-xl border font-bold text-sm transition-all shadow-sm ${
                  !selectedCategory
                    ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                <span className="text-base">🛍️</span>
                <span className="whitespace-nowrap">Our Products</span>
              </button>

              {/* Category Dropdown — takes remaining width */}
              <div className="relative flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-xl border font-bold text-sm transition-all shadow-sm ${
                    selectedCategory
                      ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-base shrink-0">
                      {!selectedCategory ? '🗂️' : (selectedCategory.emoji || '📦')}
                    </span>
                    <span className="truncate">
                      {!selectedCategory ? 'Category' : selectedCategory.name}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 shrink-0 ml-1 transition-transform duration-200 ${
                    isCategoryDropdownOpen ? 'rotate-180' : ''
                  } ${selectedCategory ? 'text-white/80' : 'text-gray-400'}`} />
                </button>

                {isCategoryDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsCategoryDropdownOpen(false)}
                    />
                    <div className="absolute top-full right-0 left-0 mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 max-h-72 overflow-y-auto divide-y divide-gray-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          handleCategorySelect(null);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors ${
                          !selectedCategory
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>🛍️</span>
                          <span>Our Products</span>
                        </span>
                        {!selectedCategory && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                      {displayCategories.map(category => (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => {
                            handleCategorySelect(category);
                            setIsCategoryDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors ${
                            selectedCategory?.id === category.id
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {category.emoji && <span>{category.emoji}</span>}
                            <span>{category.name}</span>
                          </span>
                          {selectedCategory?.id === category.id && <Check className="w-4 h-4 text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Desktop Navigation Bar (>= md) */}
            <div className="hidden md:block bg-white border rounded-lg shadow-sm mt-4 mb-6 relative group overflow-hidden">
              <div className="px-4 py-4">
                <div className="relative">
                  <div className="flex space-x-3 overflow-x-auto pb-2 scroll-smooth">
                    <button
                      onClick={() => handleCategorySelect(null)}
                      className={`flex-shrink-0 px-4 py-2 rounded-lg border font-medium transition-colors whitespace-nowrap ${!selectedCategory
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:text-blue-600'
                      }`}
                    >
                      Our Products
                    </button>

                    {displayCategories.map(category => (
                      <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category)}
                        className={`flex-shrink-0 px-4 py-2 rounded-lg border font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${selectedCategory?.id === category.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:text-blue-600'
                        }`}
                      >
                        {category.emoji && <span>{category.emoji}</span>}
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="w-full px-0 md:px-4 py-8">
              {(loading && products.length === 0) ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div key={`skeleton-${index}`} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
                      <div className="aspect-[3/4] bg-gray-100 animate-pulse"></div>
                      <div className="p-3 flex-grow flex flex-col">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
                    <Search className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-500">No products are currently available.</p>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                      {products.map(product => {
                        const isProductInCart = cart?.items?.some(item => String(item.productId || item.product?.id || '') === String(product.id));
                        return (
                          <HomeProductCard
                            key={product.id}
                            product={product}
                            isInCart={!!isProductInCart}
                            onView={handleViewProduct}
                            onAddToCart={handleAddToCart}
                            onWishlistToggle={handleWishlistToggle}
                            user={user}
                            navigate={navigate}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {loadingMore && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 mt-4">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div key={`pag-skeleton-${index}`} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
                          <div className="aspect-[3/4] bg-gray-100 animate-pulse"></div>
                          <div className="p-3 flex-grow flex flex-col">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div ref={observerSentinel} className="h-4 w-full" aria-hidden="true"></div>

                  {currentPage >= totalPages && products.length > 0 && (
                    <div className="text-center mt-8 py-4 text-gray-500">
                      <p>🎉 You've seen all {totalCount} products!</p>
                    </div>
                  )}
                </>
              )}
            </div>



            <Footer />
          </div>
      </div>
    </div>
  );
};

export default Products;