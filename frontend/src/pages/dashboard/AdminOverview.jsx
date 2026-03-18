import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { adminApi } from '../../services/api';
import { FaUsers, FaUserCog, FaUserCheck, FaUserTimes, FaUserClock, FaUserShield, FaCogs } from 'react-icons/fa';

export default function AdminOverview() {
  console.log('AdminOverview component rendering...');
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    pendingApprovals: 0,
    admins: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  // Debug: Log navigation object
  console.log('Navigation object:', { navigate: typeof navigate });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [usersRes, analyticsRes] = await Promise.all([
          adminApi.getAllUsers({ limit: 1000 }),
          adminApi.getUserAnalytics()
        ]);

        const users = usersRes.data?.users || [];
        const analytics = analyticsRes.data || {};

        setStats({
          totalUsers: analytics.totalUsers || users.length,
          activeUsers: analytics.activeUsers || users.filter(u => !u.isDeactivated).length,
          inactiveUsers: analytics.deactivatedUsers || users.filter(u => u.isDeactivated).length,
          pendingApprovals: analytics.pendingApplications || 0,
          admins: analytics.roleCounts?.admin ?? users.filter(u => u.role === 'admin' || u.role === 'super_admin').length
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleCardClick = (path) => {
    console.log('handleCardClick called with path:', path);
    try {
      navigate(path);
      console.log('Navigation successful');
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  };

  // Debug: Log when component mounts
  console.log('AdminOverview component mounted');

  const StatCard = ({ icon: Icon, title, value, path, search = '', bgColor, textColor, className = '' }) => {
    const targetPath = search ? `${path}${search}` : path;
    
    console.log(`Rendering card: ${title} with path: ${targetPath}`);
    
    const handleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Card clicked, navigating to:', targetPath);
      window.location.href = targetPath; // Use direct navigation as fallback
      // Try programmatic navigation first
      try {
        navigate(targetPath);
      } catch (err) {
        console.error('Navigation error:', err);
        // Fallback to window.location if navigate fails
        window.location.href = targetPath;
      }
    };

    return (
      <div 
        className={`relative rounded-lg shadow-md overflow-hidden ${bgColor} ${textColor} ${className}`}
        style={{
          minHeight: '120px',
          cursor: 'pointer',
          userSelect: 'none',
          position: 'relative'
        }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick(e)}
      >
        <div className="absolute inset-0" />
        <div className="p-6 h-full flex flex-col justify-between">
          <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-2xl font-bold">{loading ? '...' : value}</p>
            </div>
            <div className="p-3 rounded-full bg-white bg-opacity-20">
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6" style={{ position: 'relative', zIndex: 1 }}>
      <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
      
      {error && (
        <div className="p-4 mb-6 text-sm text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard
          icon={FaUsers}
          title="Our Users 👥"
          value={stats.totalUsers}
          path="/dashboard/user-management"
          bgColor="bg-blue-500 hover:bg-blue-600"
          textColor="text-white"
          className="h-full transition-transform duration-200 hover:shadow-lg"
        />
        
        <StatCard
          icon={FaUserCheck}
          title="Active Users"
          value={stats.activeUsers}
          path="/dashboard/user-management"
          search="?status=active"
          bgColor="bg-green-500 hover:bg-green-600"
          textColor="text-white"
          className="h-full transition-transform duration-200 hover:shadow-lg"
        />
        
        <StatCard
          icon={FaUserTimes}
          title="Inactive Users"
          value={stats.inactiveUsers}
          path="/dashboard/user-management"
          search="?status=inactive"
          bgColor="bg-yellow-500 hover:bg-yellow-600"
          textColor="text-white"
          className="h-full transition-transform duration-200 hover:shadow-lg"
        />
        
        <StatCard
          icon={FaUserClock}
          title="Pending Approvals"
          value={stats.pendingApprovals}
          path="/dashboard/users/role-applications"
          bgColor="bg-purple-500 hover:bg-purple-600"
          textColor="text-white"
          className="h-full transition-transform duration-200 hover:shadow-lg"
        />
        
        <StatCard
          icon={FaUserShield}
          title="Admins"
          value={stats.admins}
          path="/dashboard/user-management"
          search="?role=admin"
          bgColor="bg-red-500 hover:bg-red-600"
          textColor="text-white"
          className="h-full transition-transform duration-200 hover:shadow-lg"
        />
      </div>
    </div>
  );
}
