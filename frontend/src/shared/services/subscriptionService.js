import api from './api';

const subscriptionService = {
  // --- PUBLIC / GUEST ---
  getPlans: async (type = null) => {
    const params = type ? { type } : {};
    const response = await api.get('/subscriptions/plans', { params });
    return response.data;
  },

  // Enhanced subscription flow with validation and confirmation
  validateSubscriptionEligibility: async (planId, guestData = null) => {
    const response = await api.post('/subscriptions/validate-eligibility', { 
      planId, 
      guestData 
    });
    return response.data;
  },

  createSubscriptionPayment: async (planId, paymentMethod, guestData = null) => {
    const response = await api.post('/subscriptions/create-payment', { 
      planId,
      paymentMethod,
      guestData
    });
    return response.data;
  },

  confirmSubscriptionPayment: async (paymentId, subscriptionData = null) => {
    const response = await api.post('/subscriptions/confirm-payment', { 
      paymentId,
      subscriptionData
    });
    return response.data;
  },

  // --- CUSTOMER / SELLER ---
  getMySubscriptions: async (type = null) => {
    const params = type ? { type } : {};
    const response = await api.get('/subscriptions/my', { params });
    return response.data;
  },

  upgrade: async (newPlanId) => {
    const response = await api.post('/subscriptions/upgrade', { newPlanId });
    return response.data;
  },

  cancel: async (subscriptionId, data = {}) => {
    const response = await api.post(`/subscriptions/${subscriptionId}/cancel`, data);
    return response.data;
  },

  getMealSchedule: async (subscriptionId) => {
    const response = await api.get(`/subscriptions/${subscriptionId}/schedule`);
    return response.data;
  },

  saveMealSchedule: async (subscriptionId, schedule) => {
    const response = await api.post(`/subscriptions/${subscriptionId}/schedule`, { schedule });
    return response.data;
  },

  getMealOccurrences: async (subscriptionId) => {
    const response = await api.get(`/subscriptions/${subscriptionId}/occurrences`);
    return response.data;
  },

  skipMeal: async (occurrenceId) => {
    const response = await api.post(`/subscriptions/occurrences/${occurrenceId}/skip`);
    return response.data;
  },

  updateOccurrenceAddress: async (occurrenceId, deliveryAddress, pickupStationId = null) => {
    const payload = { deliveryAddress };
    if (pickupStationId) payload.pickupStationId = pickupStationId;
    const response = await api.put(`/subscriptions/occurrences/${occurrenceId}/address`, payload);
    return response.data;
  },

  // --- ADMIN ---
  getAllSubscriptions: async () => {
    const response = await api.get('/subscriptions/all');
    return response.data;
  },

  getAllPlans: async (type = null) => {
    const params = { all: true };
    if (type) params.type = type;
    const response = await api.get('/subscriptions/plans', { params });
    return response.data;
  },

  createPlan: async (payload) => {
    const response = await api.post('/subscriptions/plans', payload);
    return response.data;
  },

  updatePlan: async (planId, payload) => {
    const response = await api.put(`/subscriptions/plans/${planId}`, payload);
    return response.data;
  },

  deletePlan: async (planId) => {
    const response = await api.delete(`/subscriptions/plans/${planId}`);
    return response.data;
  },

  checkPlanDeletion: async (planId) => {
    const response = await api.get(`/subscriptions/plans/${planId}/check-deletion`);
    return response.data;
  },

  // --- BENEFIT PACKAGES (ADMIN) ---
  getBenefitPackages: async () => {
    const response = await api.get('/subscriptions/benefit-packages');
    return response.data;
  },

  createBenefitPackage: async (payload) => {
    const response = await api.post('/subscriptions/benefit-packages', payload);
    return response.data;
  },

  updateBenefitPackage: async (packageId, payload) => {
    const response = await api.put(`/subscriptions/benefit-packages/${packageId}`, payload);
    return response.data;
  },

  deleteBenefitPackage: async (packageId) => {
    const response = await api.delete(`/subscriptions/benefit-packages/${packageId}`);
    return response.data;
  },

  checkPackageDeletion: async (packageId) => {
    const response = await api.get(`/subscriptions/benefit-packages/${packageId}/check-deletion`);
    return response.data;
  },

  // --- CUSTOMER-FACING ENDPOINTS ---
  getAvailablePackages: async () => {
    const response = await api.get('/subscriptions/benefit-packages/available');
    return response.data;
  },

  createUserPlan: async (payload) => {
    const response = await api.post('/subscriptions/my/plans', payload);
    return response.data;
  },

  getSubscriptionBenefits: async (subscriptionId) => {
    const response = await api.get(`/subscriptions/${subscriptionId}/benefits`);
    return response.data;
  }
};

export default subscriptionService;
