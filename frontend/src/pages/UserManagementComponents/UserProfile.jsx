import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import ProfileCompletionTab from './UserProfileTabs/ProfileCompletionTab';
// import RequirementsSettingsTab from './UserProfileTabs/RequirementsSettingsTab';
// import DocumentVerificationTab from './UserProfileTabs/DocumentVerificationTab';
// import ChangeRequestsTab from './UserProfileTabs/ChangeRequestsTab';
// import PoliciesAutomationTab from './UserProfileTabs/PoliciesAutomationTab';

export default function UserProfile() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('completion');
  const [stats, setStats] = useState({
    pendingDocuments: 0,
    pendingChanges: 0,
    incompleteProfiles: 0,
    completionRate: 0
  });
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Role-based tab permissions
  const getAvailableTabs = () => {
    const allTabs = [
      { id: 'completion', name: 'Profile Completion Status', icon: '✅', roles: ['admin', 'super_admin', 'ops_manager'] },
      { id: 'requirements', name: 'Requirements & Settings', icon: '⚙️', roles: ['admin', 'super_admin'] },
      { id: 'documents', name: 'Document Verification', icon: '📄', roles: ['admin', 'super_admin', 'ops_manager'] },
      { id: 'changes', name: 'Change Requests', icon: '🔄', roles: ['admin', 'super_admin', 'ops_manager'] },
      { id: 'policies', name: 'Policies & Automation', icon: '🤖', roles: ['admin', 'super_admin'] }
    ];

    return allTabs.filter(tab => tab.roles.includes(currentUser?.role));
  };

  const tabs = getAvailableTabs();

  useEffect(() => {
    loadStats();
  }, [refreshTrigger]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getProfileManagementStats();
      setStats(response.data || {
        pendingDocuments: 0,
        pendingChanges: 0,
        incompleteProfiles: 0,
        completionRate: 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({
        pendingDocuments: 0,
        pendingChanges: 0,
        incompleteProfiles: 0,
        completionRate: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const renderTab = () => {
    const commonProps = {
      currentUser,
      onUpdate: refreshData,
      refreshTrigger
    };

    switch (activeTab) {
      case 'completion':
        return <ProfileCompletionTab {...commonProps} />;
      // case 'requirements':
      //   return <RequirementsSettingsTab {...commonProps} />;
      // case 'documents':
      //   return <DocumentVerificationTab {...commonProps} />;
      // case 'changes':
      //   return <ChangeRequestsTab {...commonProps} />;
      // case 'policies':
      //   return <PoliciesAutomationTab {...commonProps} />;
      default:
        return <ProfileCompletionTab {...commonProps} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">User Profile Management</h2>
          <p className="text-gray-600">Monitor profile completion, verify documents, and manage user data changes</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl">📄</div>
              <div className={`px-2 py-1 rounded text-xs font-bold ${stats.pendingDocuments > 0 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                {stats.pendingDocuments}
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-900">{stats.pendingDocuments}</div>
            <div className="text-sm text-blue-700">Pending Documents</div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl">🔄</div>
              <div className={`px-2 py-1 rounded text-xs font-bold ${stats.pendingChanges > 0 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                {stats.pendingChanges}
              </div>
            </div>
            <div className="text-2xl font-bold text-orange-900">{stats.pendingChanges}</div>
            <div className="text-sm text-orange-700">Pending Changes</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl">⚠️</div>
              <div className={`px-2 py-1 rounded text-xs font-bold ${stats.incompleteProfiles > 0 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                {stats.incompleteProfiles}
              </div>
            </div>
            <div className="text-2xl font-bold text-yellow-900">{stats.incompleteProfiles}</div>
            <div className="text-sm text-yellow-700">Incomplete Profiles</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl">✅</div>
              <div className="text-xs font-medium text-green-700">Overall</div>
            </div>
            <div className="text-2xl font-bold text-green-900">{stats.completionRate}%</div>
            <div className="text-sm text-green-700">Completion Rate</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex space-x-1 p-2 min-w-max">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTab()}
        </div>
      </div>
    </div>
  );
}
