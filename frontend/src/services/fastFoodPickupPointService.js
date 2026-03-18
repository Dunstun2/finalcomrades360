import api from './api';

const fastFoodPickupPointService = {
    // Public: Get active pickup points
    getActivePickupPoints: async () => {
        const response = await api.get('/fastfood/pickup-points/list');
        return response.data;
    },

    // Admin: Get all pickup points
    getAdminPickupPoints: async () => {
        const response = await api.get('/fastfood/pickup-points/admin/all');
        return response.data;
    },

    // Admin: Create pickup point
    createPickupPoint: async (data) => {
        const response = await api.post('/fastfood/pickup-points', data);
        return response.data;
    },

    // Admin: Update pickup point
    updatePickupPoint: async (id, data) => {
        const response = await api.put(`/fastfood/pickup-points/${id}`, data);
        return response.data;
    },

    // Admin: Delete pickup point
    deletePickupPoint: async (id) => {
        const response = await api.delete(`/fastfood/pickup-points/${id}`);
        return response.data;
    }
};

export default fastFoodPickupPointService;
