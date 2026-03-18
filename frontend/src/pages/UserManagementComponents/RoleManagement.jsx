import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';

const RoleManagement = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState([]);
  const [newRole, setNewRole] = useState({
    id: '',
    name: '',
    description: '',
    accessLevels: {
      marketplace: true,
      sellerPortal: false,
      marketingTools: false,
      commissionAccess: false,
      adminPanel: false,
      dashboard: false
    }
  });
  const [editingRole, setEditingRole] = useState(null);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const ACCESS_SECTIONS = [
    { id: 'marketplace', label: '🛒 Marketplace' },
    { id: 'sellerPortal', label: '🏪 Seller Portal' },
    { id: 'marketingTools', label: '📣 Marketing Tools' },
    { id: 'commissionAccess', label: '💰 Commission Access' },
    { id: 'adminPanel', label: '🛡️ Admin Panel' },
    { id: 'dashboard', label: '📊 Dashboard' }
  ];

  // Fetch all roles
  const fetchRoles = async () => {
    try {
      const response = await api.get('/roles');
      const rolesData = response.data || [];
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (error) {
      setError('Failed to fetch roles');
      console.error('Error fetching roles:', error);
      setRoles([]);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // Handle role creation
  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRole.id.trim() || !newRole.name.trim()) {
      setError('Role ID and Name are required');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/roles',
        newRole,
        { headers: { 'X-Admin-Password': password } }
      );
      setNewRole({
        id: '',
        name: '',
        description: '',
        accessLevels: {
          marketplace: true,
          sellerPortal: false,
          marketingTools: false,
          commissionAccess: false,
          adminPanel: false,
          dashboard: false
        }
      });
      setPassword('');
      setSuccess('Role created successfully');
      fetchRoles();
    } catch (error) {
      console.error('Error creating role:', error);
      setError(error.response?.data?.message || 'Failed to create role');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle role update
  const handleUpdateRole = async (id, updatedData) => {
    setIsLoading(true);
    setError('');

    try {
      await api.put(
        `/roles/${id}`,
        updatedData,
        { headers: { 'X-Admin-Password': password } }
      );
      setEditingRole(null);
      setPassword('');
      setSuccess('Role updated successfully');
      fetchRoles();
    } catch (error) {
      console.error('Error updating role:', error);
      setError(error.response?.data?.message || 'Failed to update role');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle role deletion
  const handleDeleteRole = async (id) => {
    if (!window.confirm('Are you sure you want to delete this role?')) {
      return;
    }

    if (!password) {
      setError('Admin password is required to delete roles');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await api.delete(`/roles/${id}`, {
        headers: { 'X-Admin-Password': password }
      });
      setPassword('');
      setSuccess('Role deleted successfully');
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      setError(error.response?.data?.message || 'Failed to delete role');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded shadow-sm">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded shadow-sm">
          <p className="font-medium">Success</p>
          <p>{success}</p>
        </div>
      )}

      {/* Create Role Form */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Create New Role</h3>
        <form onSubmit={handleCreateRole} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="roleId" className="block text-sm font-medium text-gray-700 mb-1">
                Role Identity (Slug)
              </label>
              <input
                type="text"
                id="roleId"
                value={newRole.id}
                onChange={(e) => setNewRole({ ...newRole, id: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="e.g. store_manager"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Lowercase, no spaces. Used as unique identifier.</p>
            </div>

            <div>
              <label htmlFor="roleName" className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                id="roleName"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="e.g. Store Manager"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="roleDesc" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="roleDesc"
              value={newRole.description}
              onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="What can users with this role do?"
              rows="2"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-3">System Access Levels</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {ACCESS_SECTIONS.map((section) => (
                <label key={section.id} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={newRole.accessLevels[section.id]}
                    onChange={(e) => setNewRole({
                      ...newRole,
                      accessLevels: { ...newRole.accessLevels, [section.id]: e.target.checked }
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">{section.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-end gap-6">
            <div className="flex-1">
              <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Verify Identity (Super Admin Password)
              </label>
              <input
                type="password"
                id="adminPassword"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Enter your password to authorize"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 shadow-sm transition-all h-[42px]"
            >
              {isLoading ? 'Processing...' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>

      {/* Roles List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">Existing Roles</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Access Levels</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{role.name}</div>
                    <div className="text-xs text-gray-500 font-mono">{role.id}</div>
                    <div className="text-xs text-gray-600 mt-1 italic">{role.description || 'No description'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {ACCESS_SECTIONS.filter(s => role.accessLevels?.[s.id]).map(s => (
                        <span key={s.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {s.label.split(' ')[1]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                      {role.count || 0} Users
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium space-x-3">
                    {role.isSystem ? (
                      <span className="text-gray-400 cursor-not-allowed italic">System Role</span>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setNewRole({
                              id: role.id,
                              name: role.name,
                              description: role.description || '',
                              accessLevels: role.accessLevels || {}
                            });
                            // Scroll to top
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-blue-600 hover:text-blue-900 font-semibold"
                          title="Clicking this will populate the creation form above to let you edit/re-create"
                        >
                          Modify
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="text-red-600 hover:text-red-900 font-semibold"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;
