import React, { useEffect, useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import HomeProductCard from '../components/HomeProductCard';
import FastFoodCard from '../components/FastFoodCard';
import ServiceCard from '../components/ServiceCard';
import { useCart } from '../contexts/CartContext';

export default function Search() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cart } = useCart();
  const [results, setResults] = useState({ products: [], services: [], fastfood: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const query = params.get('q') || '';
    setQ(query);

    if (query.trim()) {
      setLoading(true);
      api.get(`/search?q=${encodeURIComponent(query)}`)
        .then(r => {
          setResults({
            products: r.data.products || [],
            services: r.data.services || [],
            fastfood: r.data.fastfood || []
          });
        })
        .catch(err => {
          console.error('Search failed:', err);
          setResults({ products: [], services: [], fastfood: [] });
        })
        .finally(() => setLoading(false));
    } else {
      setResults({ products: [], services: [], fastfood: [] });
    }
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

  const TABS = [
    { id: 'all', label: `All (${totalResults})` },
    { id: 'products', label: `Products (${results.products.length})` },
    { id: 'fastfood', label: `Fast Food (${results.fastfood.length})` },
    { id: 'services', label: `Services (${results.services.length})` },
  ];

  const visibleItems = (() => {
    if (activeTab === 'all') return getCombinedResults();
    if (activeTab === 'products') return results.products.map(p => ({ ...p, _type: 'product' }));
    if (activeTab === 'fastfood') return results.fastfood.map(f => ({ ...f, _type: 'fastfood' }));
    if (activeTab === 'services') return results.services.map(s => ({ ...s, _type: 'service' }));
    return [];
  })();

  return (
    <div className="max-w-7xl mx-auto px-0 md:px-4 py-8 min-h-screen">
      <button
        onClick={() => navigate('/')}
        className="flex items-center text-blue-600 hover:text-blue-800 mb-6 font-medium transition-colors ml-4 md:ml-0"
      >
        <FaArrowLeft className="mr-2" /> Back to Home
      </button>

      <div className="mb-8 px-4 md:px-0">
        <h1 className="text-2xl font-bold text-gray-900">Search Results</h1>
        <p className="text-gray-500 mt-1">
          {loading ? 'Searching...' : q ? `Found ${totalResults} result${totalResults !== 1 ? 's' : ''} for "${q}"` : 'Enter a keyword to start searching'}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : totalResults === 0 && q ? (
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
          {/* Tabs */}
          <div className="flex border-b mb-6 overflow-x-auto scrollbar-hide">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {visibleItems.map(item => renderItem(item))}
          </div>
        </div>
      )}
    </div>
  );
}
