import React, { useState, useEffect } from 'react';
import api, { adminApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';


export default function ApprovedApplications() {
  console.log('Rendering ApprovedApplications component');
  
  const { user: currentUser } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus] = useState('approved');
  const [selectedApplications, setSelectedApplications] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Log component mount and auth state
  useEffect(() => {
    console.log('Component mounted');
    console.log('Current user:', currentUser);
    return () => console.log('Component unmounted');
  }, []);
  
  // Log applications state changes
  useEffect(() => {
    console.log('Applications state updated:', {
      applications,
      loading,
      error,
      success,
      searchTerm,
      filterStatus,
      selectedApplications,
      selectAll
    });
  }, [applications, loading, error, success, searchTerm, filterStatus, selectedApplications, selectAll]);

  const resetAlerts = () => { setError(''); setSuccess(''); };

  const loadApplications = async () => {
    try {
      setLoading(true);
      resetAlerts();
      
      console.log('Fetching approved applications...');
      let response;
      
      try {
        console.log('Trying /api/role-applications endpoint...');
        response = await api.get('/role-applications', {
          params: { status: 'approved' }
        });
        console.log('Response from /api/role-applications:', response);
      } catch (error) {
        console.error('Error from /api/role-applications:', error);
        throw error;
      }
      
      const apps = response.data.data || response.data || [];
      console.log('Applications loaded:', apps);
      setApplications(Array.isArray(apps) ? apps : []);
      
      if (apps.length === 0) {
        console.log('No approved applications found');
        setError('No approved applications found.');
      } else {
        setSuccess(`Loaded ${apps.length} approved applications`);
      }
    } catch (e) {
      console.error('Error in loadApplications:', {
        message: e.message,
        response: e.response,
        stack: e.stack
      });
      setError(e.response?.data?.message || 'Failed to load applications. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  // Filter applications based on search term
  const filteredApplications = Array.isArray(applications)
    ? applications.filter(app => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
          (app.user?.name?.toLowerCase().includes(searchLower)) ||
          (app.user?.email?.toLowerCase().includes(searchLower)) ||
          (app.role?.toLowerCase().includes(searchLower)) ||
          (app.status?.toLowerCase().includes(searchLower))
        );
      })
    : [];

  // Handle individual checkbox selection
  const handleSelectApplication = (applicationId) => {
    setSelectedApplications(prev => {
      if (prev.includes(applicationId)) {
        return prev.filter(id => id !== applicationId);
      } else {
        return [...prev, applicationId];
      }
    });
    setSelectAll(false);
  };

  // Handle select all checkbox
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedApplications([]);
      setSelectAll(false);
    } else {
      setSelectedApplications(filteredApplications.map(app => app.id));
      setSelectAll(true);
    }
  };

  // Clear all selections
  const clearSelections = () => {
    setSelectedApplications([]);
    setSelectAll(false);
  };

  // Export selected applications
  const exportSelected = () => {
    if (selectedApplications.length === 0) {
      setError('Please select applications to export');
      return;
    }
    
    const selectedApps = filteredApplications.filter(app =>
      selectedApplications.includes(app.id)
    );
    
    const csvData = selectedApps.map(app => ({
      'Applicant Name': app.user?.name || 'N/A',
      'Email': app.user?.email || 'N/A',
      'Phone': app.user?.phone || 'N/A',
      'Applied Role': app.appliedRole || 'N/A',
      'Status': app.status || 'N/A',
      'Applied Date': formatDate(app.createdAt),
      'Review Date': formatDate(app.reviewedAt)
    }));
    
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `approved-applications-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    setSuccess(`Exported ${selectedApplications.length} approved applications`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Test if component is rendering
  console.log('Rendering ApprovedApplications UI');
  
  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Approved Role Applications</h3>
          <p className="text-sm text-gray-600">View all approved role requests</p>
        </div>
        
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search applications..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            onClick={loadApplications}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Refresh
          </button>
          {selectedApplications.length > 0 && (
            <button
              onClick={exportSelected}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              📄 Export Selected ({selectedApplications.length})
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && <div className="p-3 rounded bg-red-100 text-red-700 border border-red-200">{error}</div>}
      {success && <div className="p-3 rounded bg-green-100 text-green-700 border border-green-200">{success}</div>}

      {/* Bulk Operations Bar */}
      {selectedApplications.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-700">
                {selectedApplications.length} application(s) selected
              </span>
              <button
                onClick={clearSelections}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear Selection
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={exportSelected}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
              >
                <span>📄</span>
                Export Selected ({selectedApplications.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Applications Table */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading applications...</p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">
            {searchTerm 
              ? 'No approved applications match your search.' 
              : 'No approved applications found.'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '800px' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={selectAll}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Approved On
                  </th>
                  
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={selectedApplications.includes(app.id)}
                        onChange={() => handleSelectApplication(app.id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
                          {app.user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {app.user?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {app.user?.phone || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{app.user?.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {app.user?.role || app.role || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(app.updatedAt || app.updated_at)}
                    </td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
