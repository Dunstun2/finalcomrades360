import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaClock,
  FaEyeSlash,
  FaPause,
  FaCheckCircle,
  FaBox,
  FaArrowRight,
  FaSpinner
} from 'react-icons/fa';
import { adminApi, productApi } from '../../services/api';

const AdminProductListingCard = () => {
  const [stats, setStats] = useState({
    pending: 0,
    hidden: 0,
    suspended: 0,
    recentlyApproved: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to count products by status
  const countProductsByStatus = (products, status) => {
    return products.filter(product => {
      switch (status) {
        case 'pending':
          return !product.approved && product.reviewStatus !== 'rejected' && !product.isHidden;
        case 'hidden':
          return product.isHidden || product.visibilityStatus === 'hidden' || product.status === 'hidden' || product.reviewStatus === 'rejected';
        case 'suspended':
          return product.suspended === true || product.suspensionReason || product.status === 'suspended';
        default:
          return false;
      }
    }).length;
  };

  // Fetch product statistics for each section
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch recently approved products using public endpoint (no auth required)
        // Note: Backend returns products approved in last 30 days, but we limit to recent ones
        const recentResponse = await productApi.get('/recently-approved');
        const allRecentlyApproved = Array.isArray(recentResponse?.data) ? recentResponse.data : [];
        
        // Filter to last 7 days and limit to 14 products for better UX
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentlyApprovedProducts = allRecentlyApproved
          .filter(product => {
            const updatedAt = product.updatedAt || product.createdAt;
            return updatedAt && new Date(updatedAt) >= sevenDaysAgo;
          })
          .slice(0, 14); // Limit to 14 most recent products
        
        console.log('📊 AdminProductListingCard - Recently approved products:', recentlyApprovedProducts.length);
        
        // For other categories, try to fetch all products (may require auth)
        let allProducts = [];
        let pendingCount = 0;
        let hiddenCount = 0;
        let suspendedCount = 0;
        
        try {
          const allResponse = await productApi.getAllAdmin();
          allProducts = Array.isArray(allResponse?.data) ? allResponse.data : [];
          
          // Calculate other stats if we have all products
          pendingCount = countProductsByStatus(allProducts, 'pending');
          hiddenCount = countProductsByStatus(allProducts, 'hidden');
          suspendedCount = countProductsByStatus(allProducts, 'suspended');
          
          console.log('📊 AdminProductListingCard - All products fetched:', allProducts.length);
        } catch (authError) {
          console.log('📊 AdminProductListingCard - Auth failed, using fallback for some stats');
          // If auth fails, we can't get detailed stats for other categories
          // But we can still show recently approved count
        }
        
        const statsData = {
          pending: pendingCount,
          hidden: hiddenCount,
          suspended: suspendedCount,
          recentlyApproved: recentlyApprovedProducts.length
        };
        
        console.log('📊 AdminProductListingCard - Calculated stats:', statsData);
        
        setStats(statsData);
      } catch (error) {
        console.error('Error fetching product stats:', error);
        setError('Failed to load product statistics');
        
        // Set default values on error
        setStats({
          pending: 0,
          hidden: 0,
          suspended: 0,
          recentlyApproved: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Product sections configuration
  const sections = [
    {
      id: 'pending',
      title: 'Pending Approval',
      description: 'Products awaiting review',
      count: stats.pending,
      icon: FaClock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-200',
      link: '/dashboard/products/pending'
    },
    {
      id: 'hidden',
      title: 'Hidden Products',
      description: 'Products not visible to customers',
      count: stats.hidden,
      icon: FaEyeSlash,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-200',
      link: '/dashboard/products/hidden'
    },
    {
      id: 'suspended',
      title: 'Suspended Products',
      description: 'Products temporarily disabled',
      count: stats.suspended,
      icon: FaPause,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-200',
      link: '/dashboard/products/suspended'
    },
    {
      id: 'recentlyApproved',
      title: 'Recently Approved',
      description: 'Products approved in last 7 days',
      count: stats.recentlyApproved,
      icon: FaCheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-200',
      link: '/dashboard/products/recent'
    }
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-32">
          <FaSpinner className="text-2xl text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-600">Loading product statistics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg mr-4">
              <FaBox className="text-2xl" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Product Management</h3>
              <p className="text-blue-100 text-sm">Monitor product status and approvals</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {stats.pending + stats.hidden + stats.suspended + stats.recentlyApproved}
            </div>
            <div className="text-blue-100 text-sm">Total Products</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sections.map((section) => {
            const IconComponent = section.icon;
            return (
              <Link
                key={section.id}
                to={section.link}
                className={`group relative bg-white border-2 ${section.borderColor} rounded-lg p-4 hover:shadow-lg transition-all duration-200 hover:scale-105`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className={`${section.bgColor} p-2 rounded-lg inline-block mb-3`}>
                      <IconComponent className={`text-lg ${section.color}`} />
                    </div>
                    <h4 className="font-semibold text-gray-800 text-sm mb-1 group-hover:text-blue-600 transition-colors">
                      {section.title}
                    </h4>
                    <p className="text-xs text-gray-500 mb-2">{section.description}</p>
                    <div className="text-2xl font-bold text-gray-900">
                      {section.count}
                    </div>
                  </div>
                  <div className="ml-2">
                    <FaArrowRight className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
                
                {/* Badge for high priority items */}
                {section.id === 'pending' && section.count > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                    {section.count > 9 ? '9+' : section.count}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboard/products/smart-create"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <FaBox className="mr-2 text-xs" />
              Add New Product
            </Link>
            <Link
              to="/dashboard/products"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              View All Products
            </Link>
            <Link
              to="/dashboard/products/analytics"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              View Analytics
            </Link>
          </div>
        </div>

        {/* Recent Activity Summary */}
        {stats.recentlyApproved > 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <FaCheckCircle className="text-green-600 mr-2" />
              <span className="text-sm text-green-800">
                <strong>{stats.recentlyApproved}</strong> products were approved in the last 7 days
              </span>
            </div>
          </div>
        )}

        {stats.pending > 0 && (
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <FaClock className="text-yellow-600 mr-2" />
              <span className="text-sm text-yellow-800">
                <strong>{stats.pending}</strong> products need your review
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProductListingCard;