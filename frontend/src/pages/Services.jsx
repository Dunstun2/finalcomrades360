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
import PageLayout from '../components/layout/PageLayout';
import MaintenanceOverlay from '../components/MaintenanceOverlay';

const Services = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const urlSearchQuery = new URLSearchParams(location.search).get('search') || '';
  const { user } = useAuth();
  const { categories } = useCategories();
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
  const isMaintenanceActive = !isAdmin && (maintenanceSettings.enabled || maintenanceSettings.sections?.services?.enabled);

  // Handle URL parameters for subcategory filtering
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const subcategoryId = urlParams.get('subcategoryId');
    if (subcategoryId) {
      let foundSubcategory = null;
      for (const category of categories) {
        const subcategory = category.subcategories?.find(sub => sub.id === parseInt(subcategoryId));
        if (subcategory) {
          foundSubcategory = subcategory;
          break;
        }
      }
      if (foundSubcategory) setSelectedSubcategory(foundSubcategory);
    }
  }, [location.search, categories]);

  // Fetch approved services when page, subcategory or location changes
  useEffect(() => {
    fetchServices();
  }, [selectedSubcategory, currentPage, userLocation, urlSearchQuery]);

  // Get user location on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => console.warn('📍 Geolocation tracking failed/denied:', error.message),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  }, []);

  const fetchServices = async () => {
    try {
      if (currentPage === 1) setLoading(true);
      else setLoadingMore(true);

      const isMarketingMode = localStorage.getItem('marketing_mode') === 'true';
      const params = {
        status: 'approved',
        limit: servicesPerPage.toString(),
        page: currentPage.toString(),
        search: urlSearchQuery,
        ...(isMarketingMode && { marketing: 'true' })
      };
      if (selectedSubcategory) params.subcategoryId = selectedSubcategory.id;
      if (userLocation) {
        params.userLat = userLocation.lat;
        params.userLng = userLocation.lng;
        params.sortBy = 'distance';
      }

      const response = await serviceApi.getServices(params);
      const fetchedServices = response.services || response || [];
      const pagination = response.pagination || {};

      if (currentPage === 1) setServices(fetchedServices);
      else setServices(prev => [...prev, ...fetchedServices]);

      setTotalCount(pagination.totalServices || pagination.totalCount || fetchedServices.length);
      setTotalPages(pagination.totalPages || Math.ceil((pagination.totalCount || fetchedServices.length) / servicesPerPage));
    } catch (err) {
      console.error('Error fetching services:', err);
      setError('Failed to load services. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSubcategorySelect = (subcategory) => {
    setSelectedSubcategory(subcategory);
    setCurrentPage(1);
    const params = new URLSearchParams(location.search);
    if (subcategory) params.set('subcategoryId', subcategory.id.toString());
    else params.delete('subcategoryId');
    navigate(`${location.pathname}?${params.toString()}`);
  };

  const clearSubcategoryFilter = () => {
    setSelectedSubcategory(null);
    setCurrentPage(1);
    navigate(location.pathname);
  };

  const studentSubcategories = categories.find(cat => cat.name === 'Student Services')?.subcategories || [];

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
              <h3 className="text-lg font-semibold text-red-800">Error Loading Services</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button onClick={() => window.location.reload()} className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Try Again</button>
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
        message={maintenanceSettings.sections?.services?.message} 
      />
      
      <div className={isMaintenanceActive ? "blur-md pointer-events-none opacity-50 select-none transition-all duration-700" : "transition-all duration-700"}>
        <PageLayout>
          <div className="min-h-screen flex flex-col bg-gray-50 pb-20">
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
                    <button onClick={clearSubcategoryFilter} className="text-sm text-blue-600 hover:text-blue-800">Clear Filter</button>
                  )}
                </div>

                <div className="flex space-x-3 overflow-x-auto pb-2">
                  <button
                    onClick={() => handleSubcategorySelect(null)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg border font-medium transition-colors ${!selectedSubcategory ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'}`}
                  >
                    All Services
                  </button>
                  {studentSubcategories.map(subcategory => (
                    <button
                      key={subcategory.id}
                      onClick={() => handleSubcategorySelect(subcategory)}
                      className={`flex-shrink-0 px-4 py-2 rounded-lg border font-medium transition-colors ${selectedSubcategory?.id === subcategory.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'}`}
                    >
                      <span className="mr-2">{subcategory.emoji || '🛠️'}</span>
                      {subcategory.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Services Grid */}
            <div className="w-full px-0 md:px-4 py-8 flex-grow">
              {(loading && services.length === 0) ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="bg-gray-200 rounded-xl h-64 animate-pulse"></div>
                  ))}
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
                </div>
              ) : (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">All Services</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {services.map(service => <ServiceCard key={service.id} service={service} />)}
                  </div>
                </div>
              )}

              {loadingMore && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 mt-4">
                  {[...Array(6)].map((_, i) => <div key={i} className="bg-gray-200 rounded-xl h-64 animate-pulse"></div>)}
                </div>
              )}

              <div ref={observerSentinel} className="h-4 w-full"></div>

              {currentPage >= totalPages && services.length > 0 && (
                <div className="text-center mt-8 py-4 text-gray-500">
                  <p>🎉 You've seen all {totalCount} services!</p>
                </div>
              )}
            </div>

            <Footer />
          </div>
        </PageLayout>
      </div>
    </div>
  );
};

export default Services;