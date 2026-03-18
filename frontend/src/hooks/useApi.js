import { useState, useEffect, useCallback } from 'react';
import api, { productApi, adminApi } from '../services/api';

/**
 * Custom hook for API operations
 * Provides a wrapper around the api functions with loading and error states
 */
export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (apiCall, ...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall(...args);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Convenience methods for common operations
  const get = useCallback((url, config) => execute(api.get, url, config), [execute, api]);
  const post = useCallback((url, data, config) => execute(api.post, url, data, config), [execute, api]);
  const put = useCallback((url, data, config) => execute(api.put, url, data, config), [execute, api]);
  const del = useCallback((url, config) => execute(api.delete, url, config), [execute, api]);

  // Product API methods
  const product = useCallback({
    getAll: () => execute(productApi.getAll),
    getById: (id) => execute(productApi.getById, id),
    create: (data) => execute(productApi.create, data),
    update: (id, data) => execute(productApi.update, id, data),
    delete: (id) => execute(productApi.delete, id),
    search: (query) => execute(productApi.search, query),
    getCategories: () => execute(productApi.getCategories),
    getPending: () => execute(productApi.getPending),
    approve: (id, data) => execute(productApi.approve, id, data),
    reject: (id, reason) => execute(productApi.reject, id, reason),
    checkDuplicate: (params) => execute(productApi.checkDuplicate, params),
    toggleVisibility: (id) => execute(productApi.toggleVisibility, id),
    suspend: (id, data) => execute(productApi.suspend, id, data),
  }, [execute]);

  // Admin API methods
  const admin = useCallback({
    getAllUsers: (params) => execute(adminApi.getAllUsers, params),
    createUser: (data) => execute(adminApi.createUser, data),
    updateUser: (userId, data) => execute(adminApi.updateUser, userId, data),
    deleteUser: (userId) => execute(adminApi.deleteUser, userId),
    updateUserRole: (userId, role) => execute(adminApi.updateUserRole, userId, role),
    updateUserStatus: (userId, isDeactivated) => execute(adminApi.updateUserStatus, userId, isDeactivated),
    updateUserFrozen: (userId, isFrozen, adminPassword) => execute(adminApi.updateUserFrozen, userId, isFrozen, adminPassword),
    verifyAdminPassword: (password) => execute(adminApi.verifyAdminPassword, password),
    exportUserReport: () => execute(adminApi.exportUserReport),
    bulkUserOperation: (userIds, action) => execute(adminApi.bulkUserOperation, userIds, action),
  }, [execute]);

  // Orders API methods (for order cancellation)
  const orders = useCallback({
    get: (id) => execute(api.get, `/orders/${id}`),
    cancel: (id, data) => execute(api.put, `/orders/${id}/cancel`, data),
  }, [execute]);

  return {
    // Loading and error states
    loading,
    error,
    
    // Generic API methods
    get,
    post,
    put,
    delete: del,
    
    // Specialized API methods
    product,
    admin,
    orders,
    
    // Direct access to raw API instances if needed
    api,
    productApi,
    adminApi,
  };
};

export default useApi;