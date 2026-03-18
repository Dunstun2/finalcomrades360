import api from './api';

export const platformService = {
    // Get config by key
    getConfig: async (key) => {
        try {
            const response = await api.get(`/fastfood/config/${key}`);
            return response.data;
        } catch (error) {
            console.error(`Get config error (${key}):`, error);
            return { success: false, message: error.response?.data?.message || 'Failed to fetch config' };
        }
    },

    // Update config (Super Admin)
    updateConfig: async (key, value) => {
        try {
            const response = await api.post(`/fastfood/config/${key}`, { value });
            return response.data;
        } catch (error) {
            console.error(`Update config error (${key}):`, error);
            throw error.response?.data || error;
        }
    }
};
