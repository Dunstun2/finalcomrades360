import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  FaUsers,
  FaUserCheck,
  FaUserTimes,
  FaUserShield,
  FaUserGraduate,
  FaStore,
  FaTruck,
  FaUserCog,
  FaChartLine,
  FaUserPlus,
  FaFileAlt,
  FaBan,
  FaFilter,
  FaSync,
  FaDownload,
  FaArrowRight
} from 'react-icons/fa';

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  link,
  description,
  change
}) => (
  <Link
    to={link}
    className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 border border-gray-200"
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
        {change && (
          <p className={`text-xs mt-1 ${change.positive ? 'text-green-600' : 'text-red-600'}`}>
            {change.positive ? '↗' : '↘'} {change.value}
          </p>
        )}
      </div>
      <div className="ml-4">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  </Link>
);

const NavigationCard = ({
  title,
  description,
  icon: Icon,
  color,
  link,
  badge
}) => (
  <Link
    to={link}
    className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 border border-gray-200 group"
  >
    <div className="flex items-center space-x-4">
      <div className={`p-3 rounded-full ${color} group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
        {badge && (
          <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <FaArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
    </div>
  </Link>
);

export default function UserManagementOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
    marketers: 0,
    sellers: 0,
    deliveryAgents: 0,
    serviceProviders: 0,
    opsManagers: 0,
    logisticsManagers: 0,
    financeManagers: 0,
    customers: 0,
    pendingApplications: 0,
    recentGrowth: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch user analytics
      const response = await api.get('/admin/analytics/users');
      const data = response.data;

      setStats({
        total: data.totalUsers || 0,
        active: data.activeUsers || 0,
        inactive: data.deactivatedUsers || 0,
        admins: (data.roleCounts?.admin || 0) + (data.roleCounts?.super_admin || 0),
        marketers: data.roleCounts?.marketer || 0,
        sellers: data.roleCounts?.seller || 0,
        deliveryAgents: data.roleCounts?.delivery_agent || 0,
        serviceProviders: data.roleCounts?.service_provider || 0,
        opsManagers: data.roleCounts?.ops_manager || 0,
        logisticsManagers: data.roleCounts?.logistics_manager || 0,
        financeManagers: data.roleCounts?.finance_manager || 0,
        customers: data.roleCounts?.customer || 0,
        pendingApplications: data.pendingApplications || 0,
        recentGrowth: data.recentRegistrations || 0
      });

      setLastUpdated(new Date());
    } catch (e) {
      console.error('Error loading user statistics:', e);
      setError('Failed to load user statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleExportUsers = async () => {
    try {
      const response = await api.get('/admin/users/export', {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting users:', error);
      setError('Failed to export users data');
    }
  };

  const mainStats = [
    {
      title: "Total Users",
      value: loading ? '...' : stats.total.toLocaleString(),
      icon: FaUsers,
      color: "bg-blue-500",
      link: "/dashboard/user-management?status=all",
      description: "All registered users"
    },
    {
      title: "Active Users",
      value: loading ? '...' : stats.active.toLocaleString(),
      icon: FaUserCheck,
      color: "bg-green-500",
      link: "/dashboard/user-management?status=active",
      description: "Currently active accounts",
      change: {
        positive: stats.recentGrowth > 0,
        value: `+${stats.recentGrowth} this month`
      }
    },
    {
      title: "Pending Applications",
      value: loading ? '...' : stats.pendingApplications.toLocaleString(),
      icon: FaFileAlt,
      color: "bg-orange-500",
      link: "/dashboard/users/role-applications",
      description: "Awaiting review",
      badge: stats.pendingApplications > 0 ? `${stats.pendingApplications} new` : null
    },
    {
      title: "Administrators",
      value: loading ? '...' : stats.admins.toLocaleString(),
      icon: FaUserShield,
      color: "bg-purple-500",
      link: "/dashboard/user-management?role=admin",
      description: "Admin & Super Admin users"
    }
  ];

  const userCategories = [
    {
      title: "Our Users",
      description: "View and manage all user accounts",
      icon: FaUsers,
      color: "bg-blue-500",
      link: "/dashboard/user-management"
    },
    {
      title: "Marketers",
      description: "Marketing team members and affiliates",
      icon: FaChartLine,
      color: "bg-indigo-500",
      link: "/dashboard/users/marketers",
      badge: stats.marketers > 0 ? `${stats.marketers} active` : null
    },
    {
      title: "Sellers",
      description: "Product sellers and vendors",
      icon: FaStore,
      color: "bg-orange-500",
      link: "/dashboard/users/sellers",
      badge: stats.sellers > 0 ? `${stats.sellers} active` : null
    },
    {
      title: "Delivery Agents",
      description: "Delivery and logistics team",
      icon: FaTruck,
      color: "bg-teal-500",
      link: "/dashboard/users/delivery-agents",
      badge: stats.deliveryAgents > 0 ? `${stats.deliveryAgents} active` : null
    },
    {
      title: "Service Providers",
      description: "Professional service providers",
      icon: FaUserCog,
      color: "bg-indigo-500",
      link: "/dashboard/users/service-providers",
      badge: stats.serviceProviders > 0 ? `${stats.serviceProviders} active` : null
    },
    {
      title: "Regular Customers",
      description: "Standard customer accounts",
      icon: FaUserGraduate,
      color: "bg-gray-500",
      link: "/dashboard/users/customers",
      badge: stats.customers > 0 ? `${stats.customers} active` : null
    }
  ];

  const quickActions = [
    {
      title: "Role Applications",
      description: "Review pending role applications",
      icon: FaFileAlt,
      color: "bg-yellow-500",
      link: "/dashboard/users/role-applications",
      badge: stats.pendingApplications > 0 ? stats.pendingApplications : null
    },
    {
      title: "Create New User",
      description: "Add a new user account manually",
      icon: FaUserPlus,
      color: "bg-green-500",
      link: "/dashboard/user-management/create"
    },
    {
      title: "Export Data",
      description: "Download users data as CSV",
      icon: FaDownload,
      color: "bg-blue-500",
      onClick: handleExportUsers
    },
    {
      title: "Bulk Operations",
      description: "Perform actions on multiple users",
      icon: FaFilter,
      color: "bg-purple-500",
      link: "/dashboard/user-management/bulk"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="mt-2 text-gray-600">
                Comprehensive user administration and overview
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {lastUpdated.toLocaleString()}
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button
                onClick={loadStats}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <FaSync className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-100 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        {/* Main Statistics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mainStats.map((stat, index) => (
              <StatCard
                key={index}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
                link={stat.link}
                description={stat.description}
                change={stat.change}
              />
            ))}
          </div>
        </div>

        {/* User Categories */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userCategories.map((category, index) => (
              <NavigationCard
                key={index}
                title={category.title}
                description={category.description}
                icon={category.icon}
                color={category.color}
                link={category.link}
                badge={category.badge}
              />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <NavigationCard
                key={index}
                title={action.title}
                description={action.description}
                icon={action.icon}
                color={action.color}
                link={action.link}
                onClick={action.onClick}
                badge={action.badge}
              />
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {loading ? '...' : Math.round((stats.active / (stats.total || 1)) * 100)}%
              </div>
              <p className="text-sm text-gray-600">Active User Rate</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.active} of {stats.total} users
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {loading ? '...' : stats.recentGrowth}
              </div>
              <p className="text-sm text-gray-600">New This Month</p>
              <p className="text-xs text-gray-500 mt-1">
                Recent registrations
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {loading ? '...' : stats.pendingApplications}
              </div>
              <p className="text-sm text-gray-600">Pending Reviews</p>
              <p className="text-xs text-gray-500 mt-1">
                Awaiting admin action
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}