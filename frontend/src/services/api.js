import axios from 'axios';

// Backend API base URL - relative path for production, key for Vite proxy in development
// Using VITE_API_URL ensures absolute URLs are used in production to prevent mobile routing issues
const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Returns true if the currently logged-in user has an admin or superadmin role.
 * Admins bypass maintenance mode entirely on the frontend — they can browse all pages.
 */
const isAdminUser = () => {
  try {
    const adminRoles = ['admin', 'super_admin', 'superadmin'];
    
    // 1. Check stored user object in localStorage
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      // Check primary role
      if (user?.role && adminRoles.includes(user.role)) return true;
      // Check roles array
      const roles = Array.isArray(user?.roles) ? user.roles : [];
      if (roles.some(r => adminRoles.includes(r))) return true;
    }

    // 2. Check current path as fallback (for dashboard-login page before secondary auth is verified)
    // This ensures that even before the backend knows the user is an admin, the frontend
    // doesn't redirect them away from the login page.
    const adminPaths = ['/dashboard', '/dashboard-login', '/maintenance', '/login'];
    if (adminPaths.some(p => window.location.pathname.startsWith(p))) return true;
  } catch (_) {
    // Fail silent, assume not admin
  }
  return false;
};

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Accept': 'application/json',
  },
  withCredentials: true, // Important for sending cookies with cross-origin requests
  timeout: 60000, // 60 seconds timeout for better stability during heavy operations
});

// Deduplicate identical in-flight GET requests (common in React StrictMode dev mounts)
const inFlightGetRequests = new Map();

const stableStringify = (value) => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${k}:${stableStringify(value[k])}`)
      .join(',')}}`;
  }
  return String(value);
};

const buildGetDedupeKey = (url, config = {}) => {
  const params = stableStringify(config.params || {});
  const base = config.baseURL || API_BASE;
  return `${base}|${url}|${params}`;
};

const originalGet = api.get.bind(api);
api.get = (url, config = {}) => {
  if (config?.skipDedupe === true) {
    return originalGet(url, config);
  }

  const key = buildGetDedupeKey(url, config);
  if (inFlightGetRequests.has(key)) {
    return inFlightGetRequests.get(key);
  }

  const requestPromise = originalGet(url, config).finally(() => {
    inFlightGetRequests.delete(key);
  });

  inFlightGetRequests.set(key, requestPromise);
  return requestPromise;
};

// Request interceptor to add auth token to requests and handle FormData
api.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem('token');
    if (token) {
      if (token === 'undefined' || token === 'null') {
        console.warn(`[api] Invalid token string found: ${token}. Clearing it.`);
        localStorage.removeItem('token');
        token = null;
      } else {
        config.headers.Authorization = `Bearer ${token}`;
        // Duplicate as a custom header to bypass server-side stripping of 'Authorization'
        config.headers['X-Access-Token'] = token;
      }
    }

    console.log(`[api] ${config.method.toUpperCase()} request to ${config.url}${token ? ' (Authenticated)' : ' (Public)'}`);

    // Log the data size if it's FormData
    if (config.data instanceof FormData) {
      let size = 0;
      for (let pair of config.data.entries()) {
        if (pair[1] instanceof File) {
          size += pair[1].size;
        } else if (typeof pair[1] === 'string') {
          size += pair[1].length;
        }
      }
      console.log(`[api] Payload size: ${(size / 1024 / 1024).toFixed(2)} MB`);
    }

    // Don't set Content-Type for FormData - let the browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.log(`[api] Interceptor caught ${error.response.status} error for URL: ${error.config?.url}`, JSON.stringify(error.response.data));
      if (error.response.status === 503 && error.response.data?.maintenance) {
        // System is in maintenance mode
        // Admins (by role or by being on a dashboard path) always bypass
        if (!isAdminUser() && window.location.pathname !== '/maintenance') {
          const msg = error.response.data?.message;
          if (msg) sessionStorage.setItem('maintenance_message', msg);
          // Store return path for automatic re-entry
          sessionStorage.setItem('maintenance_return_path', window.location.pathname + window.location.search);
          window.location.href = '/maintenance';
        }
        return Promise.reject(error);
      }
      if (error.response.status === 401) {
        // Don't redirect for password verification endpoint
        if (error.config?.url?.includes('/auth/verify-password')) {
          console.log('[api] Skipping 401 redirect for verify-password');
          return Promise.reject(error);
        }
        // Clear local storage and redirect to login
        console.log('[api] 401 encountered, Clearing auth and redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
        // Only redirect if not already on the login page
        const loginPath = window.location.pathname.startsWith('/station') ? '/station/login' : '/login';
        if (window.location.pathname !== loginPath) {
          window.location.href = loginPath;
        }
      } else if (error.response.status === 403) {
        // Handle 403 Forbidden errors
        const errorMessage = error.response.data?.message || 'You do not have permission to perform this action';
        console.error('Forbidden:', errorMessage);
      }
    }
    return Promise.reject(error);
  }
);

// Create a dedicated axios instance for admin endpoints
const adminClient = axios.create({
  baseURL: `${API_BASE}/admin`,
  headers: {
    'Accept': 'application/json, text/csv, */*',
    'Content-Type': 'application/json'
  },
  withCredentials: true,
  timeout: 60000, // 60 seconds timeout for admin operations (consistent with main api)
});

// Create a dedicated axios instance for products
const productsClient = axios.create({
  baseURL: `${API_BASE}/products`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 120000, // 120 seconds timeout for large product payloads (increased from 60s)
});

// Apply interceptors to productsClient
productsClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData - let the browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    const method = config.method ? config.method.toUpperCase() : 'UNKNOWN';
    console.log(`[api-products] ${method} request to ${config.url}`);

    // Log the data size if it's FormData
    if (config.data instanceof FormData) {
      let size = 0;
      for (let pair of config.data.entries()) {
        if (pair[1] instanceof File) {
          size += pair[1].size;
        } else if (typeof pair[1] === 'string') {
          size += pair[1].length;
        }
      }
      console.log(`[api-products] Payload size: ${(size / 1024 / 1024).toFixed(2)} MB`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

productsClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 503 && error.response.data?.maintenance) {
        if (!isAdminUser()) {
          const msg = error.response.data?.message;
          if (msg) sessionStorage.setItem('maintenance_message', msg);
          sessionStorage.setItem('maintenance_return_path', window.location.pathname + window.location.search);
          window.location.href = '/maintenance';
        }
        return Promise.reject(error);
      }
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
        const loginPath = window.location.pathname.startsWith('/station') ? '/station/login' : '/login';
        if (window.location.pathname !== loginPath) {
          window.location.href = loginPath;
        }
      }
    }
    return Promise.reject(error);
  }
);

// Apply interceptors to adminClient
adminClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // For file downloads, we need to set responseType to 'blob' and adjust headers
    if (config.url && config.url.includes('/export')) {
      config.responseType = 'blob';
      config.headers['Accept'] = 'text/csv';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

adminClient.interceptors.response.use(
  (response) => {
    // If this is a file download, return the response as is
    if (response.config.responseType === 'blob') {
      return response;
    }
    return response;
  },
  (error) => {
    if (error.response) {
      if (error.response.status === 503 && error.response.data?.maintenance) {
        if (!isAdminUser()) {
          const msg = error.response.data?.message;
          if (msg) sessionStorage.setItem('maintenance_message', msg);
          sessionStorage.setItem('maintenance_return_path', window.location.pathname + window.location.search);
          window.location.href = '/maintenance';
        }
        return Promise.reject(error);
      }
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
        const loginPath = window.location.pathname.startsWith('/station') ? '/station/login' : '/login';
        if (window.location.pathname !== loginPath) {
          window.location.href = loginPath;
        }
      } else if (error.response.status === 403) {
        const errorMessage = error.response.data?.message || 'You do not have permission to perform this action';
        console.error('Forbidden:', errorMessage);
      }
    }
    return Promise.reject(error);
  }
);

// API functions for products
export const productApi = {
  // Client for direct API calls
  client: productsClient,

  // Get all products (public/homepage)
  getAll: (params) => productsClient.get('/', { params }),

  // Generic get method to handle specific endpoints like /services or /fastfood
  get: (url, config) => api.get(url, config),


  // Get all products as admin (includes hidden/unapproved)
  // Uses main api client so the URL is /api/products/admin/all
  getAllAdmin: (params) => api.get('/products/admin/all', { params }),

  // Get products added by super admin
  getBySuperAdmin: () => api.get('/products/superadmin'),

  // Hero promotions API
  getHeroPromotions: {
    // Get active hero promotions
    getActive: () => api.get('/hero-promotions/active'),
  },

  // Get pending products for approval (admin endpoint)
  getPending: (params = {}) => adminClient.get('/products/pending', { params }),

  // Approve/reject products
  approve: (id, data = {}) => api.put(`/products/${id}/approve`, data),
  reject: (id, reason) => api.put(`/products/${id}/reject`, { reason }),

  // Super Admin Security Management
  // Super Admin Security Management
  initiateSecurityChange: (data) => api.post('/superadmin/security/initiate', data),
  finalizeSecurityChange: (data) => api.post('/superadmin/security/finalize', data),

  // Get a single product by ID
  getById: async (id) => {
    try {
      if (!id) {
        throw new Error('Product ID is required');
      }

      console.log(`Fetching product with ID: ${id}`);
      const response = await productsClient.get(`/${id}`);

      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }

      console.log('Product API response:', response);
      return response;

    } catch (error) {
      console.error('Error in productApi.getById:', error);

      // Enhance the error with more context
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const { status, data } = error.response;
        console.error('Response data:', data);
        console.error('Response status:', status);

        // Provide more specific error messages based on the status code
        if (status === 404) {
          error.message = data?.message || 'Product not found. It may have been deleted or you may not have permission to view it.';
        } else if (status === 403) {
          error.message = 'You do not have permission to view this product.';
        } else if (status >= 500) {
          error.message = 'Server error while fetching product. Please try again later.';
        }

        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received from server. Please check your connection.');
        error.message = 'Unable to connect to the server. Please check your internet connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
      }

      throw error; // Re-throw the enhanced error to be handled by the caller
    }
  },

  // Create a new product
  create: (productData) => {
    // Check if we have form data (for file uploads)
    const isFormData = productData instanceof FormData;

    // Set the appropriate content type
    const config = isFormData
      ? {}
      : {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      };

    // If it's not FormData, ensure we're sending JSON
    const data = isFormData ? productData : JSON.stringify(productData);

    return productsClient.post('/', data, config);
  },

  // Update a product
  update: (id, productData) => {
    // Check if we have form data (for file uploads)
    const isFormData = productData instanceof FormData;

    // Set the appropriate content type
    const config = isFormData
      ? {}
      : {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      };

    // If it's not FormData, ensure we're sending JSON
    const data = isFormData ? productData : JSON.stringify(productData);

    return productsClient.put(`/${id}`, data, config);
  },

  // Delete a product
  delete: (id, config) => productsClient.delete(`/${id}`, config),

  // Search products
  search: (query) => productsClient.get(`/search?q=${encodeURIComponent(query)}`),

  // Category methods
  getCategories: () => api.get('/categories'),
  getCategory: (id) => api.get(`/categories/${id}`),
  getSubcategories: (categoryId) => api.get(`/categories/${categoryId}/subcategories`),
  getSubcategory: (categoryId, subcategoryId) => api.get(`/categories/${categoryId}/subcategories/${subcategoryId}`),

  // Admin category methods
  createCategory: (categoryData) => api.post('/admin/categories', categoryData),
  createSubcategory: (categoryId, subcategoryData) => api.post(`/admin/categories/${categoryId}/subcategories`, subcategoryData),
  updateCategory: (id, categoryData) => api.put(`/admin/categories/${id}`, categoryData),
  updateSubcategory: (categoryId, subcategoryId, subcategoryData) => api.put(`/admin/categories/${categoryId}/subcategories/${subcategoryId}`, subcategoryData),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  deleteSubcategory: (categoryId, subcategoryId) => api.delete(`/admin/categories/${categoryId}/subcategories/${subcategoryId}`),

  // Check for duplicate products
  checkDuplicate: (params) => productsClient.get('/check-duplicate', { params }),

  // Toggle product visibility (hide/unhide)
  toggleVisibility: (id) => productsClient.put(`/${id}/toggle-visibility`),

  // Suspend product
  suspend: (id, suspensionData) => productsClient.put(`/${id}/suspend`, suspensionData),

  // Recycle Bin / Deletion Management
  getDeleted: (params) => api.get('/products/deleted', { params }),
  restore: (id, data) => api.post(`/products/${id}/restore`, data),
  permanentlyDelete: (id, data) => api.delete(`/products/${id}/permanent`, { data }),

  // Social Media Account Management
  getSocialMediaAccounts: () => api.get('/social-media-accounts'),
  addSocialMediaAccount: (data) => api.post('/social-media-accounts', data),
  updateSocialMediaAccount: (id, data) => api.put(`/social-media-accounts/${id}`, data),
  deleteSocialMediaAccount: (id) => api.delete(`/social-media-accounts/${id}`),

  // Get all products for a specific seller (admin view)
  getSellerProducts: (sellerId, params = {}) => api.get(`/admin-tools/products/by-seller/${sellerId}`, { params }),

};

// Role Applications API functions
export const roleApi = {
  getUserApplications: (userId) => api.get(`/role-applications/user/${userId}`),
};

export const jobOpeningApi = {
  getAll: (params) => api.get('/job-openings', { params }),
  create: (data) => api.post('/job-openings', data),
  update: (id, data) => api.put(`/job-openings/${id}`, data),
  delete: (id) => api.delete(`/job-openings/${id}`),
};

// Admin API functions
export const adminApi = {
  // Role Applications
  getPendingRoleApplications: () => adminClient.get('/roles/pending'),

  // Inventory management
  getInventoryOverview: () => adminClient.get('/inventory/overview'),
  getInventoryItems: (params = {}) => adminClient.get('/inventory/items', { params }),
  getLowStockAlerts: () => adminClient.get('/inventory/low-stock-alerts'),
  updateStockLevels: (productId, payload) => api.patch(`/products/${productId}/stock`, payload),
  // Product analytics
  getProductAnalytics: () => adminClient.get('/analytics/products'),
  getTopPerformingProducts: () => adminClient.get('/analytics/top-products'),
  getProductPerformanceMetrics: (productId) => adminClient.get(`/products/${productId}/performance`),
  // User management analytics
  getUserAnalytics: () => adminClient.get('/analytics/users'),
  getAllUsers: (params = {}) => api.get('/admin/users', { params }),
  createUser: (userData) => api.post('/admin/users', userData),
  adminDirectCreateUser: (userData) => api.post('/users/admin/create', userData),
  adminSearchUserForVerify: (data) => api.post('/users/admin/force-verify/search', data),
  adminForceVerify: (data) => api.post('/users/admin/force-verify', data),
  
  // Admin Tools
  adminForceResetPassword: (userId) => api.post(`/admin-tools/users/force-reset-password`, { userId }),
  adminMergeAccounts: (data) => api.post(`/admin-tools/users/merge-accounts`, data),
  adminImpersonateUser: (userId) => api.post(`/admin-tools/users/impersonate`, { userId }),
  adminWalletAdjust: (data) => api.post(`/admin-tools/users/wallet-adjust`, data),
  adminGetUserActivity: (userId) => api.get(`/admin-tools/users/${userId}/activity`),
  adminForceOrderStatus: (data) => api.post(`/admin-tools/orders/force-status`, data),
  adminReassignDeliveryAgent: (data) => api.post(`/admin-tools/orders/reassign-agent`, data),
  adminIssueRefund: (data) => api.post(`/admin-tools/orders/issue-refund`, data),
  adminCloneOrder: (data) => api.post(`/admin-tools/orders/clone`, data),
  adminForceShopStatus: (data) => api.post(`/admin-tools/products/force-shop-status`, data),
  adminBulkToggleItems: (data) => api.post(`/admin-tools/products/bulk-toggle`, data),
  adminGenerateOTP: (data) => api.post(`/admin-tools/comms/generate-otp`, data),
  adminResendNotification: (data) => api.post(`/admin-tools/comms/resend-notification`, data),
  adminBroadcastMessage: (data) => api.post(`/admin-tools/comms/broadcast`, data),
  adminRunCleanup: (data) => api.post(`/admin-tools/system/cleanup`, data),
  adminManualConfirmPayment: (data) => api.post(`/admin-tools/orders/manual-confirm-payment`, data),
  adminGetAuditLogs: (params = {}) => api.get(`/admin-tools/audit-logs`, { params }),
  adminSearchPayments: (params = {}) => api.get(`/admin-tools/orders/payments/search`, { params }),
  adminGetBlockedIPs: () => api.get(`/admin-tools/security/ip-blocklist`),
  adminBlockIP: (data) => api.post(`/admin-tools/security/ip-blocklist`, data),
  adminUnblockIP: (id) => api.delete(`/admin-tools/security/ip-blocklist/${id}`),
  adminGetAdvancedAnalytics: () => api.get(`/admin-tools/analytics/advanced`),
  adminGetUserSessions: (userId) => api.get(`/admin-tools/users/${userId}/sessions`),
  adminForceLogout: (data) => api.post(`/admin-tools/users/force-logout`, data),
  adminGetTemplates: () => api.get(`/admin-tools/comms/templates`),
  adminUpdateTemplate: (data) => api.put(`/admin-tools/comms/templates`, data),
  adminGetOrder: (orderId) => api.get(`/orders/${orderId}`),
  getRoleApplications: (params = {}) => api.get('/role-applications/', { params }),
  updateApplicationStatus: (id, data) => api.put(`/role-applications/${id}/status`, data),
  updateUserRole: (userId, role) => api.patch(`/admin/users/${userId}/role`, { role }),
  updateUserStatus: (userId, isDeactivated) => api.patch(`/admin/users/${userId}/status`, { isDeactivated }),
  updateUser: (userId, userData) => api.patch(`/admin/users/${userId}`, userData),
  updateUserFrozen: (userId, isFrozen, adminPassword) => api.patch(`/admin/users/${userId}/freeze`, { isFrozen, adminPassword }),
  updateUserVerification: (userId, verificationData) => api.patch(`/admin/users/${userId}/verification`, verificationData),
  updateUserAccess: (userId, accessData) => api.patch(`/admin/users/${userId}/access`, accessData),
  verifyAdminPassword: (password) => api.post('/admin/verify-password', { password }),

  // Role-specific suspension (Point to generic endpoints internally)
  suspendMarketer: (userId, data) => api.post(`/admin/users/${userId}/roles/suspend`, { ...data, role: 'marketer' }),
  reactivateMarketer: (userId) => api.post(`/admin/users/${userId}/roles/reactivate`, { role: 'marketer' }),
  suspendSeller: (userId, data) => api.post(`/admin/users/${userId}/roles/suspend`, { ...data, role: 'seller' }),
  reactivateSeller: (userId) => api.post(`/admin/users/${userId}/roles/reactivate`, { role: 'seller' }),
  suspendDeliveryAgent: (userId, data) => api.post(`/admin/users/${userId}/roles/suspend`, { ...data, role: 'delivery_agent' }),
  reactivateDeliveryAgent: (userId) => api.post(`/admin/users/${userId}/roles/reactivate`, { role: 'delivery_agent' }),

  // Generic role suspension (For any role like warehouse_manager, finance_manager, etc.)
  suspendUserRole: (userId, role, adminPassword) => api.post(`/admin/users/${userId}/roles/suspend`, { role, adminPassword }),
  reactivateUserRole: (userId, role) => api.post(`/admin/users/${userId}/roles/reactivate`, { role }),

  bulkUserOperation(userIds, action) {
    return api.post('/admin/users/bulk', { userIds, action });
  },
  sendBulkNotification(data) {
    return api.post('/notifications/bulk', data);
  },

  // Export user data to CSV
  exportUserReport() {
    return api.get('/admin/users/export', {
      responseType: 'blob', // Important for file downloads
      headers: {
        'Accept': 'text/csv',
        'Content-Type': 'text/csv',
      }
    });
  },

  // User Profile Management APIs - Verification Focused
  getProfileManagementStats: () => api.get('/profile-management/stats'),
  getUsersWithCompletion: (params) => api.get('/profile-management/users', { params }),
  sendProfileReminder: (userId, data) => api.post(`/profile-management/users/${userId}/remind`, data),
  markSectionComplete: (userId, data) => api.post(`/profile-management/users/${userId}/mark-complete`, data),
  waiveRequirement: (userId, data) => api.post(`/profile-management/users/${userId}/waive`, data),

  // Requirements & Settings
  getProfileRequirements: () => api.get('/profile-management/requirements'),
  updateProfileRequirement: (data) => api.post('/profile-management/requirements', data),

  // Document Verification
  getDocumentsForVerification: (params) => api.get('/profile-management/documents', { params }),
  approveDocument: (docId) => api.post(`/profile-management/documents/${docId}/approve`),
  rejectDocument: (docId, data) => api.post(`/profile-management/documents/${docId}/reject`, data),
  bulkApproveDocuments: () => api.post('/profile-management/documents/bulk-approve'),

  // Change Requests
  getChangeRequests: (params) => api.get('/profile-management/change-requests', { params }),
  approveChangeRequest: (requestId) => api.post(`/profile-management/change-requests/${requestId}/approve`),
  rejectChangeRequest: (requestId, data) => api.post(`/profile-management/change-requests/${requestId}/reject`, data),

  // Policies & Automation
  getProfilePolicies: () => api.get('/profile-management/policies'),
  updateProfilePolicy: (data) => api.post('/profile-management/policies', data),

  // Legacy APIs (keep for backward compatibility)
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  restoreUser: (userId) => api.post(`/admin/users/${userId}/restore`),
  approvePendingEmail: (userId) => api.post(`/admin/users/${userId}/approve-email`),
  rejectPendingEmail: (userId) => api.post(`/admin/users/${userId}/reject-email`),
  approvePendingPhone: (userId) => api.post(`/admin/users/${userId}/approve-phone`),
  rejectPendingPhone: (userId) => api.post(`/admin/users/${userId}/reject-phone`),
  getRevenueAnalytics: () => api.get('/analytics/revenue'),
  getPlatformWalletDetails: () => api.get('/finance/platform-wallet'),
  withdrawPlatformFunds: (data) => api.post('/finance/platform-wallet/withdraw', data),
  
  // Orders & Products
  getAllOrders: (params = {}) => api.get('/orders', { params }),
  getAllProducts: (params = {}) => api.get('/products/admin/all', { params }),

  // Platform Config
  getPlatformConfig: (key) => api.get(`/admin/config/${key}`),
  updatePlatformConfig: (key, value) => api.post(`/admin/config/${key}`, { value })
};

export const orderApi = {
  parseDirect: (data) => api.post('/orders/direct/parse', data),
  confirmDirect: (data) => api.post('/orders/direct/confirm', data),
  listDirect: () => api.get('/orders/direct/list'),
};

export default api;
export const supportApi = {
  sendMessage: (data) => api.post('/support/send', data),
  getHistory: (otherUserId) => api.get(`/support/history?otherUserId=${otherUserId}`),
  getSummary: () => api.get('/support/summary'),
  markAsRead: (messageId) => api.patch(`/support/${messageId}/read`),
  sendBulkMessages: (data) => api.post('/support/bulk', data)
};

export const fastFoodApi = {
  // Get all fast food items for a specific vendor (used by admin bulk tools)
  getVendorProducts: (vendorId, params = {}) => api.get(`/admin-tools/products/fastfood-by-vendor/${vendorId}`, { params }),
  // Get all fast food items (public listing)
  getAll: (params = {}) => api.get('/fastfood', { params }),
  // Get a single fast food item by ID
  getById: (id) => api.get(`/fastfood/${id}`),
};
