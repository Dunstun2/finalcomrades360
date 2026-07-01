import api from './api';

const subscriptionService = {
  // --- PUBLIC / GUEST ---
  getPlans: async (type = null) => {
    const params = type ? { type } : {};
    const response = await api.get('/subscriptions/plans', { params });
    return response.data;
  },

  subscribe: async (payload) => {
    // payload can include planId and optional guest fields (guestName, guestEmail, etc)
    const response = await api.post('/subscriptions/subscribe', payload);
    return response.data;
  },

  // --- CUSTOMER / SELLER ---
  getMySubscriptions: async () => {
    const response = await api.get('/subscriptions/my');
    return response.data;
  },

  upgrade: async (newPlanId) => {
    const response = await api.post('/subscriptions/upgrade', { newPlanId });
    return response.data;
  },

  cancel: async (subscriptionId) => {
    const response = await api.post(`/subscriptions/${subscriptionId}/cancel`);
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
  }
};

export default subscriptionService;
