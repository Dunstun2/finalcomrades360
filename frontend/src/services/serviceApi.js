import api from './api';

const serviceApi = {
  // Create a new service
  createService: async (serviceData) => {
    try {
      const response = await api.post('/services', serviceData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error creating service:', error);
      throw error;
    }
  },

  // Availability Logic Utility
  getAvailabilityStatus: (service) => {
    if (!service) return { isAvailable: false, state: 'ERROR', reason: 'Missing service data' };

    try {
      const now = new Date();
      const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDay = DAYS[now.getDay()];
      const currentTimeString = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

      // 1. Basic Visibility Checks
      if (service.status === 'suspended') {
        return { isAvailable: false, state: 'OFFLINE', reason: 'Service Suspended' };
      }

      if (service.status !== 'approved' && service.status !== 'active') {
        return { isAvailable: false, state: 'HIDDEN', reason: 'Awaiting Approval' };
      }

      // 2. Manual Status Override (3-State System)
      const mode = service.availabilityMode || 'AUTO';

      if (mode === 'OPEN') {
        return { isAvailable: true, state: 'OPEN', reason: 'Manually opened by provider' };
      }

      if (mode === 'CLOSED') {
        return { isAvailable: false, state: 'CLOSED', reason: 'CLOSED' };
      }

      // Legacy support for isAvailable (if mode is AUTO)
      if (service.isAvailable === false && mode === 'AUTO') {
        return { isAvailable: false, state: 'CLOSED', reason: 'CLOSED' };
      }

      // 3. Parse and Check Availability Days
      let availabilityDays = [];
      try {
        if (typeof service.availabilityDays === 'string') {
          availabilityDays = JSON.parse(service.availabilityDays);
        } else if (Array.isArray(service.availabilityDays)) {
          availabilityDays = service.availabilityDays;
        }
      } catch (e) {
        console.error('Error parsing availabilityDays:', e);
      }

      if (!Array.isArray(availabilityDays) || availabilityDays.length === 0) {
        // Fallback or default behavior if no schedule is defined
        return { isAvailable: true, state: 'OPEN', reason: null };
      }

      // Check current day and "All Days"
      const daySchedule = availabilityDays.find(d => d.day === currentDay);
      const allDaysSchedule = availabilityDays.find(d => d.day === 'All Days');
      const effectiveSchedule = daySchedule || allDaysSchedule;

      if (!effectiveSchedule || !effectiveSchedule.available) {
        return { isAvailable: false, state: 'CLOSED', reason: `Closed on ${currentDay}s` };
      }

      // Time Window Check
      if (effectiveSchedule.from && effectiveSchedule.to) {
        if (currentTimeString < effectiveSchedule.from || currentTimeString > effectiveSchedule.to) {
          return { isAvailable: false, state: 'CLOSED', reason: `Closed until ${effectiveSchedule.from}` };
        }
      }

      return { isAvailable: true, state: 'OPEN', reason: null };

    } catch (error) {
      console.error('Error calculating availability status:', error);
      return { isAvailable: true, state: 'OPEN', reason: null };
    }
  },

  // Update an existing service
  updateService: async (serviceId, serviceData) => {
    try {
      const response = await api.put(`/services/${serviceId}`, serviceData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error updating service:', error);
      throw error;
    }
  },

  // Get all services
  getServices: async (params = {}) => {
    try {
      const response = await api.get('/services', { params });
      console.log('[serviceApi] Services response:', response);
      // The backend returns {services: [...], totalCount: ..., currentPage: ..., totalPages: ...}
      // Return the data in a consistent format
      if (response.data && response.data.services) {
        return response.data;
      }
      return response.data || response;
    } catch (error) {
      console.error('Error fetching services:', error);
      throw error;
    }
  },

  // Get a single service by ID
  getServiceById: async (serviceId) => {
    try {
      const response = await api.get(`/services/${serviceId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching service:', error);
      throw error;
    }
  },

  // Delete a service
  deleteService: async (serviceId) => {
    try {
      const response = await api.delete(`/services/${serviceId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting service:', error);
      throw error;
    }
  },

  // Delete a service image
  deleteServiceImage: async (serviceId, imageId) => {
    try {
      const response = await api.delete(`/services/${serviceId}/images/${imageId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting service image:', error);
      throw error;
    }
  },

  // Get all categories
  getCategories: async () => {
    try {
      const response = await api.get('/categories');
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  // Get subcategories for a category
  getSubcategories: async (categoryId) => {
    try {
      const response = await api.get(`/categories/${categoryId}/subcategories`);
      return response.data;
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      throw error;
    }
  },

  // Get services by current user (for service providers)
  getMyServices: async () => {
    try {
      const response = await api.get('/services/my-services');
      return response.data;
    } catch (error) {
      console.error('Error fetching my services:', error);
      throw error;
    }
  },

  // Get pending services for admin approval
  getPendingServices: async () => {
    try {
        const response = await api.get('/services/pending');
        return response.data;
    } catch (error) {
        console.error('Error fetching pending services:', error);
        throw error;
    }
  },

  // Approve a service (admin only)
  approveService: async (serviceId) => {
    try {
      const response = await api.patch(`/services/${serviceId}/approve`);
      return response.data;
    } catch (error) {
      console.error('Error approving service:', error);
      throw error;
    }
  },

  // Suspend a service (admin only)
  suspendService: async (serviceId, reason) => {
    try {
      const response = await api.patch(`/services/${serviceId}/suspend`, { reason });
      return response.data;
    } catch (error) {
      console.error('Error suspending service:', error);
      throw error;
    }
  },

  // Withdraw funds
  withdrawFunds: async (amount) => {
    try {
        const response = await api.post('/wallet/withdraw', { amount });
        return response.data;
    } catch (error) {
        console.error('Error in withdrawFunds API:', error);
        throw error;
    }
  },
};

export default serviceApi;
