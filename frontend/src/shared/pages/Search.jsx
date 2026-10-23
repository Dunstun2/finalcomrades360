import React, { useEffect, useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '@/shared/services/api';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import HomeProductCard from '@/modules/products/components/HomeProductCard';
import FastFoodCard from '@/modules/fastfood/components/FastFoodCard';
import ServiceCard from '@/modules/services/components/ServiceCard';
import { useCart } from '@/contexts/CartContext';
import Footer from '@/shared/components/Footer';

export default function Search() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cart } = useCart();
  const [results, setResults] = useState({ products: [], services: [], fastfood: [] });
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    let ignore = false;
    const params = new URLSearchParams(location.search || '');
    const query = params.get('q') || '';
    setQ(query);

    if (query.trim()) {
      setLoading(true);
      api.get(`/search?q=${encodeURIComponent(query)}`)
        .then(r => {
          if (!ignore) {
            setResults({
              products: r.data.products || [],
              services: r.data.services || [],
              fastfood: r.data.fastfood || []
            });
            setHasSearched(true);
          }
        })
        .catch(err => {
          if (!ignore) {
            console.error('Search failed:', err);
            setResults({ products: [], services: [], fastfood: [] });
            setHasSearched(true);
          }
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    } else {
      setResults({ products: [], services: [], fastfood: [] });
      setHasSearched(false);
    }

    return () => {
      ignore = true;
    };
  }, [location.search]);

  const totalResults = results.products.length + results.services.length + results.fastfood.length;

  const cartItemIds = new Set((cart?.items || []).map(i => i.productId || i.fastFoodId));

  const getCombinedResults = () => {
    const combined = [];
    const maxLen = Math.max(results.products.length, results.services.length, results.fastfood.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < results.products.length) combined.push({ ...results.products[i], _type: 'product' });
      if (i < results.fastfood.length) combined.push({ ...results.fastfood[i], _type: 'fastfood' });
      if (i < results.services.length) combined.push({ ...results.services[i], _type: 'service' });
    }
    return combined;
  };

  const renderItem = (item) => {
    if (item._type === 'product') {
      return (
        <HomeProductCard
          key={`product-${item.id}`}
          product={item}
          isInCart={cartItemIds.has(item.id)}
          navigate={navigate}
          className="w-full min-w-0 max-w-none"
        />
      );
    }
    if (item._type === 'fastfood') {
      return (
        <FastFoodCard
          key={`ff-${item.id}`}
          item={item}
          navigate={navigate}
          className="w-full min-w-0 max-w-none"
        />
      );
    }
    if (item._type === 'service') {
      return (
        <ServiceCard
          key={`svc-${item.id}`}
          service={item}
          navigate={navigate}
          className="w-full min-w-0 max-w-none"
        />
      );
    }
    return null;
  };

  // Always show 'All', hide category tabs that have 0 results
  const TABS = [
    { id: 'all', label: `All (${totalResults})` },
    results.products.length > 0 && { id: 'products', label: `Products (${results.products.length})` },
    results.fastfood.length > 0 && { id: 'fastfood', label: `Fast Food (${results.fastfood.length})` },
    results.services.length > 0 && { id: 'services', label: `Services (${results.services.length})` },
  ].filter(Boolean);

  const visibleItems = (() => {
    if (activeTab === 'all') return getCombinedResults();
    if (activeTab === 'products') return results.products.map(p => ({ ...p, _type: 'product' }));
    if (activeTab === 'fastfood') return results.fastfood.map(f => ({ ...f, _type: 'fastfood' }));
    if (activeTab === 'services') return results.services.map(s => ({ ...s, _type: 'service' }));
    return [];
  })();

  return (
    <>
      <div className="max-w-7xl mx-auto px-0 md:px-4 py-8 min-h-screen">
        {/* Unified Top Toolbar: Back Button + Title + Filter Tabs on one horizontal line */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-gray-200 px-4 md:px-0">
          {/* Left: Back to Home + Search Results */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const stored = sessionStorage.getItem('search_return_path');
                const returnPath = (stored && !stored.startsWith('/search')) ? stored : '/';
                navigate(returnPath);
              }}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors text-sm shrink-0 !m-0 leading-none"
            >
              <FaArrowLeft className="mr-1.5" /> Back
            </button>
            <span className="text-gray-300 select-none text-sm leading-none self-center">|</span>
            <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight shrink-0 !m-0 !p-0 leading-none inline-flex items-center">
              Search Results
            </h1>
          </div>

          {/* Right: Category filter tabs as modern pill buttons (stay mounted during background live searches) */}
          {totalResults > 0 && TABS.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-0.5">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content area: only show full spinner on initial empty load; live keystroke updates are silent */}
        {loading && !hasSearched ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : !loading && totalResults === 0 && q ? (
          <div className="text-center py-20 bg-gray-50 md:rounded-xl mx-4 md:mx-0">
            <p className="text-lg text-gray-600 mb-2">No results found for "{q}"</p>
            <p className="text-gray-500">Try checking your spelling or using different keywords.</p>
          </div>
        ) : !q ? (
          <div className="text-center py-20 bg-gray-50 rounded-xl">
            <p className="text-lg text-gray-600">Enter a keyword to start searching</p>
          </div>
        ) : (
          <div>
            {/* Results Grid: updates silently in-place without unmounting or layout shifts */}
            <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-4 md:px-0 transition-opacity duration-150 ${loading ? 'opacity-70' : 'opacity-100'}`}>
              {visibleItems.map(item => renderItem(item))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
