import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaTruck,
  FaUserTie,
  FaStore,
  FaUser,
  FaBullhorn,
  FaArrowRight,
  FaCubes,
  FaChartLine,
  FaShoppingCart,
  FaBox,
  FaCheckCircle,
  FaClock,
  FaDollarSign,
  FaStar,
  FaShoppingBag,
  FaUsers,
  FaShareAlt,
  FaMedal,
  FaTachometerAlt
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';

const OtherDashboards = () => {
  const { user } = useAuth();

  const dashboardOptions = [
    {
      title: 'Delivery Dashboard',
      description: 'Complete delivery management system for agents with order tracking, delivery assignments, and performance analytics.',
      icon: <FaTruck className="text-4xl text-blue-500" />,
      path: '/delivery/orders',
      features: ['My Deliveries', 'Available Orders', 'Completed Deliveries', 'Delivery History', 'Account Management'],
      color: 'blue',
      status: 'Fully Functional',
      stats: '5 Active Assignments'
    },
    {
      title: 'Service Provider',
      description: 'Comprehensive service management platform for managing appointments, clients, and service delivery operations.',
      icon: <FaUserTie className="text-4xl text-green-500" />,
      path: '/dashboard/service-provider',
      features: ['Service Management', 'Client Appointments', 'Availability Calendar', 'Service Reviews', 'Earnings Tracking'],
      color: 'green',
      status: 'Fully Functional',
      stats: '8 Scheduled Appointments'
    },
    {
      title: 'Seller Dashboard',
      description: 'Complete e-commerce platform for sellers to manage products, orders, earnings, and business analytics.',
      icon: <FaStore className="text-4xl text-purple-500" />,
      path: '/seller',
      features: ['Product Management', 'Order Processing', 'Earnings Tracking', 'Sales Analytics', 'Wallet & Reports'],
      color: 'purple',
      status: 'Fully Functional',
      stats: '24 Active Products'
    },
    {
      title: 'Customer Dashboard',
      description: 'Full-featured customer portal for managing orders, wishlist, addresses, and account preferences.',
      icon: <FaUser className="text-4xl text-indigo-500" />,
      path: '/customer',
      features: ['Order History', 'Wishlist Management', 'Account Settings', 'Wallet & Payments', 'Addresses'],
      color: 'indigo',
      status: 'Fully Functional',
      stats: '3 Pending Orders'
    },
    {
      title: 'Marketer Dashboard',
      description: 'Advanced marketing platform with affiliate management, commission tracking, and promotional campaign tools.',
      icon: <FaBullhorn className="text-4xl text-orange-500" />,
      path: '/marketing',
      features: ['Affiliate Management', 'Commission Tracking', 'Campaign Analytics', 'Social Media Integration', 'Leaderboards'],
      color: 'orange',
      status: 'Fully Functional',
      stats: 'KES 12,450 Earned'
    },
    {
      title: 'Operations Dashboard',
      description: 'Central panel for reviewing and approving products, monitoring pending items, and overseeing catalog quality.',
      icon: <FaCubes className="text-4xl text-blue-500" />,
      path: '/ops',
      features: ['Pending Product Review', 'All Products View', 'Approval & Rejection', 'Change Requests'],
      color: 'blue',
      status: 'Fully Functional',
      stats: '12 Pending Approvals'
    },
    {
      title: 'Logistics Dashboard',
      description: 'End-to-end logistics management including orders, delivery agents, and assignment tracking.',
      icon: <FaTruck className="text-4xl text-green-500" />,
      path: '/dashboard/orders',
      features: ['Orders Overview', 'Delivery Agent Management', 'Assignment Tracking', 'Status Filters'],
      color: 'green',
      status: 'Fully Functional',
      stats: '4 Active Assignments'
    },
    {
      title: 'Finance Dashboard',
      description: 'Financial control center for sales, payments, and marketer commissions.',
      icon: <FaDollarSign className="text-4xl text-purple-500" />,
      path: '/dashboard/finance',
      features: ['Sales Metrics', 'Orders Overview', 'Commission Management', 'Bulk Payouts'],
      color: 'purple',
      status: 'Fully Functional',
      stats: 'KES 250,000 Total Sales'
    }
  ];

  const getColorClasses = (color) => {
    const colorMap = {
      blue: 'border-blue-200 hover:border-blue-400 hover:shadow-blue-100',
      green: 'border-green-200 hover:border-green-400 hover:shadow-green-100',
      purple: 'border-purple-200 hover:border-purple-400 hover:shadow-purple-100',
      indigo: 'border-indigo-200 hover:border-indigo-400 hover:shadow-indigo-100',
      orange: 'border-orange-200 hover:border-orange-400 hover:shadow-orange-100'
    };
    return colorMap[color] || 'border-gray-200 hover:border-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <FaCubes className="text-2xl text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Role-Based Dashboards</h1>
            <p className="text-gray-600">Access fully functional role-based dashboards and management interfaces</p>
          </div>
        </div>

        <div className="mt-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          >
            <FaTachometerAlt className="text-sm" />
            <span>Back to Admin Dashboard</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <FaCheckCircle className="text-blue-600" />
              <span className="font-medium text-blue-900">Fully Functional</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">All dashboards include complete CRUD operations and real-time data</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <FaUsers className="text-green-600" />
              <span className="font-medium text-green-900">Role-Based Access</span>
            </div>
            <p className="text-sm text-green-700 mt-1">Each dashboard provides specific functionality for different user roles</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <FaMedal className="text-purple-600" />
              <span className="font-medium text-purple-900">Admin Privileges</span>
            </div>
            <p className="text-sm text-purple-700 mt-1">Super admin access to view operations from all user perspectives</p>
          </div>
        </div>
      </div>

      {/* Dashboard Options Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dashboardOptions.map((dashboard, index) => (
          <div
            key={index}
            className={`bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6 transition-all duration-200 ${getColorClasses(dashboard.color)}`}
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {dashboard.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {dashboard.title}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <FaCheckCircle className="text-green-500 text-sm" />
                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                      {dashboard.status}
                    </span>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-3">
                  {dashboard.description}
                </p>

                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <div className="flex items-center space-x-2 text-sm">
                    <FaChartLine className="text-gray-500" />
                    <span className="text-gray-700 font-medium">Current Activity:</span>
                    <span className="text-gray-900">{dashboard.stats}</span>
                  </div>
                </div>

                {/* Features List */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Key Features:</h4>
                  <div className="grid grid-cols-2 gap-1">
                    {dashboard.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center space-x-1 text-xs text-gray-600">
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Access Button */}
                <Link
                  to={dashboard.path}
                  className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${dashboard.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                    dashboard.color === 'green' ? 'bg-green-600 hover:bg-green-700 text-white' :
                      dashboard.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700 text-white' :
                        dashboard.color === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' :
                          'bg-orange-600 hover:bg-orange-700 text-white'
                    }`}
                >
                  <span>Access Dashboard</span>
                  <FaArrowRight className="text-sm" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Information */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Super Admin Access Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
              <FaCheckCircle className="text-green-500" />
              <span>Functional Status</span>
            </h4>
            <ul className="space-y-1">
              <li>• All dashboards are fully operational</li>
              <li>• Complete backend API integration</li>
              <li>• Real-time data updates</li>
              <li>• Full CRUD functionality</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
              <FaUsers className="text-blue-500" />
              <span>Administrative Access</span>
            </h4>
            <ul className="space-y-1">
              <li>• Full access to all role-based dashboards</li>
              <li>• View operations from all user perspectives</li>
              <li>• Monitor performance across all roles</li>
              <li>• Cross-dashboard navigation</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
              <FaMedal className="text-purple-500" />
              <span>Dashboard Features</span>
            </h4>
            <ul className="space-y-1">
              <li>• Real-time analytics and reporting</li>
              <li>• Complete user management</li>
              <li>• Order and transaction tracking</li>
              <li>• Financial reporting and earnings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtherDashboards;