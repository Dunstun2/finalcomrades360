import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Star, Clock, MapPin, Wifi, Users, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCategories } from '../contexts/CategoriesContext';
import serviceApi from '../services/serviceApi';
import ServiceCard from '../components/ServiceCard';
import HeroBanner from '../components/HeroBanner';
import Footer from '../components/Footer';
import useHeroPromotions from '../hooks/useHeroPromotions';

const Services = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const urlSearchQuery = new URLSearchParams(location.search).get('search') || '';
  const { user } = useAuth();
  const { categories, getSubcategoriesByCategory } = useCategories();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerSentinel = useRef(null);
  const { heroPromotions } = useHeroPromotions();

  const servicesPerPage = 12;

  // Handle URL parameters for subcategory filtering
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const subcategoryId = urlParams.get('subcategoryId');
    if (subcategoryId) {
      // Find the subcategory in all categories
      let foundSubcategory = null;
      for (const category of categories) {
        const subcategory = category.subcategories?.find(sub => sub.id === parseInt(subcategoryId));
        if (subcategory) {
          foundSubcategory = subcategory;
          break;
        }
      }
      if (foundSubcategory) {
        setSelectedSubcategory(foundSubcategory);
      }
    }
  }, [location.search, categories]);

  // Fetch approved services when page or subcategory changes
  // Fetch approved services when page, subcategory or location changes
  useEffect(() => {
    fetchServices();
  }, [selectedSubcategory, currentPage, userLocation, urlSearchQuery]);

  // Get user location on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('📍 User Location Found:', position.coords.latitude, position.coords.longitude);
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('📍 Geolocation tracking failed/denied:', error.message);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  }, []);

  const fetchServices = async () => {
    try {
      if (currentPage === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const limit = servicesPerPage;
      const page = currentPage;

      const isMarketingMode = localStorage.getItem('marketing_mode') === 'true';

      // Build query parameters
      const params = {
        status: 'approved',
        limit: limit.toString(),
        page: page.toString(),
        search: urlSearchQuery,
        ...(isMarketingMode && { marketing: 'true' })
      };

      // Add subcategory filter if selected
      if (selectedSubcategory) {
        params.subcategoryId = selectedSubcategory.id;
      }

      // Add location filters for smart menu
      if (userLocation) {
        params.userLat = userLocation.lat;
        params.userLng = userLocation.lng;
        params.sortBy = 'distance';
      }

      // Fetch services with optional category filter
      const servicesResponse = await serviceApi.getServices(params);
      // Handle the simplified response structure from serviceApi.getServices
      const fetchedServices = servicesResponse.services || servicesResponse || [];
      const pagination = servicesResponse.pagination || {};

      let finalServices = fetchedServices;
      if (isMarketingMode) {
        finalServices = fetchedServices.filter(service => {
          const commission = parseFloat(service.marketingCommission || 0);
          const isEligible = commission > 1;
          if (isEligible) {
            console.log(`✅ [ServicesPage] ALLOWED Service: "${service.title}" (ID: ${service.id}). Commission: ${commission}`);
          } else {
            console.log(`❌ [ServicesPage] REJECTED Service: "${service.title}" (ID: ${service.id}). Commission: ${commission} (<= 1)`);
          }
          return isEligible;
        });
      }

      if (currentPage === 1) {
        setServices(finalServices);
      } else {
        setServices(prev => [...prev, ...finalServices]);
      }

      setTotalCount(pagination.totalServices || pagination.totalCount || finalServices.length);
      setTotalPages(pagination.totalPages || Math.ceil((pagination.totalServices || finalServices.length) / servicesPerPage));

    } catch (err) {
      console.error('Error fetching services:', err);
      setError('Failed to load services. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleViewService = (serviceId) => {
    navigate(`/service/${serviceId}`);
  };

  const handleSubcategorySelect = (subcategory) => {
    setSelectedSubcategory(subcategory);
    setCurrentPage(1);
    // Update URL without page reload
    const params = new URLSearchParams(location.search);
    if (subcategory) {
      params.set('subcategoryId', subcategory.id.toString());
    } else {
      params.delete('subcategoryId');
    }
    navigate(`${location.pathname}?${params.toString()}`);
  };

  const clearSubcategoryFilter = () => {
    setSelectedSubcategory(null);
    setCurrentPage(1);
    navigate(location.pathname); // Remove query parameters
  };

  // Get subcategories for specifically 'Student Services'
  const getFilteredSubcategories = () => {
    const studentServicesCategory = categories.find(
      cat => cat.name === 'Student Services'
    );
    return studentServicesCategory?.subcategories || [];
  };

  const studentSubcategories = getFilteredSubcategories();

  // Infinite scrolling logic using IntersectionObserver
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

    if (observerSentinel.current) {
      observer.observe(observerSentinel.current);
    }

    return () => {
      if (observerSentinel.current) {
        observer.unobserve(observerSentinel.current);
      }
    };
  }, [loading, loadingMore, currentPage, totalPages]);





  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center">
            <div className="text-red-600 mr-3">⚠️</div>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error Loading Services</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button
                onClick={() => window.location.reload()}
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Back Button */}
      <div className="w-full px-0 md:px-4 py-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors ml-4 md:ml-0"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Homepage
        </button>
      </div>

      <HeroBanner
        title="Browse Services"
        subtitle="Professional services from trusted campus providers"
        promotions={heroPromotions}
        loading={loading}
      />

      {/* Subcategory Filter */}
      <div className="bg-white border-b shadow-sm">
        <div className="w-full px-0 md:px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Filter by Service Type</h2>
            {selectedSubcategory && (
              <button
                onClick={clearSubcategoryFilter}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                Clear Filter
              </button>
            )}
          </div>

          <div className="flex space-x-3 overflow-x-auto pb-2">
            {/* All Services Button */}
            <button
              onClick={() => handleSubcategorySelect(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg border font-medium transition-colors ${!selectedSubcategory
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:text-blue-600'
                }`}
            >
              All Services
            </button>

            {/* Subcategory Buttons */}
            {studentSubcategories.map(subcategory => (
              <button
                key={subcategory.id}
                onClick={() => handleSubcategorySelect(subcategory)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg border font-medium transition-colors ${selectedSubcategory?.id === subcategory.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:text-blue-600'
                  }`}
              >
                <span className="mr-2">{subcategory.emoji || '🛠️'}</span>
                {subcategory.name}
              </button>
            ))}
          </div>

          {selectedSubcategory && (
            <div className="mt-3 text-sm text-gray-600">
              Showing services in <span className="font-medium">{selectedSubcategory.name}</span> type
            </div>
          )}
        </div>
      </div>

      {/* Services Grid */}
      <div className="w-full px-0 md:px-4 py-8 flex-grow">
        {(loading && services.length === 0) ? (
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
        ) : services.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
              <Star className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
            <p className="text-gray-500">
              No services are currently available.
            </p>
          </div>
        ) : (
          <>
            {/* All Services - Grid Layout (matching homepage) */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                All Services
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {services.map(service => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Pagination Skeletons for continuous feel */}
        {loadingMore && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 mt-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`pag-service-skeleton-${index}`} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
                <div className="aspect-[3/4] bg-gray-100 animate-pulse"></div>
                <div className="p-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        )}



        {/* Observer Sentinel */}
        <div ref={observerSentinel} className="h-4 w-full" aria-hidden="true"></div>

        {/* No More Services Message */}
        {currentPage >= totalPages && services.length > 0 && (
          <div className="text-center mt-8 py-4 text-gray-500">
            <p>
              🎉 You've seen all {totalCount} services!
            </p>
          </div>
        )}
      </div>

      {/* Call to Action */}
      {!user && (
        <div className="bg-blue-50 border-t">
          <div className="w-full px-0 md:px-4 py-12 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Want to offer your services?</h3>
            <p className="text-gray-600 mb-6">
              Join our platform and start providing services to our community.
            </p>
            <Link
              to="/register"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Services;