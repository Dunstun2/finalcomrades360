import React, { useEffect } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PendingApplications from './PendingApplications';
import ApprovedApplications from './ApprovedApplications';
import RejectedApplications from './RejectedApplications';
import RoleManagement from './RoleManagement';

export default function RoleApplicationsManager() {
  const navigate = useNavigate();
  const { tab = 'pending' } = useParams();
  const [searchParams] = useSearchParams();
  
  const tabs = [
    { 
      id: 'pending', 
      label: '⏳ Pending', 
      component: <PendingApplications key="pending" /> 
    },
    { 
      id: 'approved', 
      label: '✅ Approved', 
      component: <ApprovedApplications key="approved" /> 
    },
    { 
      id: 'rejected', 
      label: '❌ Rejected', 
      component: <RejectedApplications key="rejected" />
    },
    { 
      id: 'manage-roles', 
      label: '👑 Manage Roles', 
      component: <RoleManagement />
    },
    { 
      id: 'notifications', 
      label: '💬 Notifications', 
      component: <div className="p-6">Notifications will be shown here</div> 
    },
  ];

  const handleTabChange = (newTab) => {
    // Preserve any search parameters when changing tabs
    const search = searchParams.toString();
    navigate(`/dashboard/users/role-applications/${newTab}${search ? `?${search}` : ''}`);
  };

  // Find the active tab, default to 'pending' if not found
  const activeTab = tabs.find(t => t.id === tab) || tabs[0];
  
  // Force remount of the component when tab changes
  const activeComponent = React.cloneElement(activeTab.component, { key: tab });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Role Applications Management</h3>
          <p className="text-sm text-gray-600">Manage all role applications in one place</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto scrollbar-hide">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 py-2 min-w-max" aria-label="Tabs">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.id}
              onClick={() => handleTabChange(tabItem.id)}
              className={`
                whitespace-nowrap py-4 px-2 sm:px-1 border-b-2 font-bold text-xs sm:text-sm transition-all
                ${
                  tabItem.id === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tabItem.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {activeComponent}
      </div>
    </div>
  );
}
