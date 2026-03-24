import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import api from '../services/api';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import HomeProductCard from '../components/HomeProductCard';
import HeroBanner from '../components/HeroBanner';

export default function Category() {
  const { id } = useParams(); // App.jsx route uses :id for Category page
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, removeFromCart, cart } = useCart();
  const { user } = useAuth();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    setLoading(true);

    // Fetch products and filter by category ID or name depending on backend
    // Assuming backend endpoint supports category filtration or we fetch all and filter
    const fetchCurrentCategory = async () => {
      try {
        // Ideally use the same endpoint as Products.jsx: /products?categoryId=...
        // Checking App.jsx: <Route path="/category/:id" element={<Category />} />
        // Check if 'id' is a number (ID) or string (Name). 
        // ProductController supports query param categoryId.

        let url = '/products';
        // If id is numeric
        if (!isNaN(id)) {
          url += `?categoryId=${id}&limit=50`;
        } else {
          // If it's a name (fallback logic from original file imply filtering)
          url += '?limit=100';
        }

        const r = await api.get(url);
        if (!alive) return;

        let filtered = r.data.products || [];

        // If filtering by name client-side (legacy behavior support)
        if (isNaN(id)) {
          const target = decodeURIComponent(id).toLowerCase();
          filtered = filtered.filter(p => {
            const catName = (p.Category?.name || p.category || 'Other').toLowerCase();
            return catName === target;
          });
        }

        setItems(filtered);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentCategory();
    return () => alive = false;
  }, [id]);

  const handleAddToCart = async (productId) => {
    const isItemInCart = cart?.items?.some(item => String(item.productId || item.product?.id || '') === String(productId));
    if (isItemInCart) {
      await removeFromCart(productId);
    } else {
      await addToCart(productId);
    }
  };

  const handleWishlistToggle = async (productId) => {
    if (!user) { navigate('/login'); return; }
    await toggleWishlist(productId);
  };

  return (
    <div className="md:container md:mx-auto px-0 md:px-4 py-6">
      <button
        onClick={() => navigate('/products')}
        className="flex items-center text-blue-600 hover:text-blue-800 mb-6 font-medium transition-colors ml-4 md:ml-0"
      >
        <FaArrowLeft className="mr-2" /> Back to All Products
      </button>
      <div className="px-4 md:px-0">
        <HeroBanner
          title="Category Products"
          subtitle={`Discover quality items available in this section`}
        />
      </div>
      <div className="mt-8"></div>
      {loading ? (
        <div className="px-4 md:px-0">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 px-4 md:px-0">
          {items.map(p => {
            const isItemInCart = cart?.items?.some(item => String(item.productId || item.product?.id || '') === String(p.id));
            return (
              <div key={p.id}>
                <HomeProductCard
                  product={p}
                  isInCart={!!isItemInCart}
                  onAddToCart={handleAddToCart}
                  onWishlistToggle={handleWishlistToggle}
                  onView={(prod) => navigate(`/product/${prod.id}`)}
                  user={user}
                  navigate={navigate}
                />
              </div>
            );
          })}
          {items.length === 0 && <div>No products found in this category.</div>}
        </div>
      )}
    </div>
  );
}
