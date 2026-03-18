import api from './api';

export const reviewService = {
    // Create new review
    createReview: async (payload) => {
        try {
            const response = await api.post('/fastfood/reviews', payload);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Get public reviews for an item
    getPublicReviews: async (fastFoodId) => {
        try {
            const response = await api.get(`/fastfood/reviews/item/${fastFoodId}`);
            return response.data;
        } catch (error) {
            console.error('Get public reviews error:', error);
            return { success: false, data: [] };
        }
    },

    // Vendor: Get my reviews
    getVendorReviews: async (vendorId = 'me') => {
        try {
            const response = await api.get(`/fastfood/reviews/vendor/${vendorId}`);
            return response.data;
        } catch (error) {
            console.error('Get vendor reviews error:', error);
            return { success: false, data: [] };
        }
    },

    // Admin: Get all reviews
    getAllReviews: async (filters = {}) => {
        try {
            const params = new URLSearchParams(filters).toString();
            const response = await api.get(`/fastfood/reviews/admin/all?${params}`);
            return response.data;
        } catch (error) {
            console.error('Get all reviews error:', error);
            throw error;
        }
    },

    // Admin: Update Status
    updateReviewStatus: async (id, status) => {
        try {
            const response = await api.put(`/fastfood/reviews/admin/${id}`, { status });
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Admin: Delete
    deleteReview: async (id) => {
        try {
            const response = await api.delete(`/fastfood/reviews/admin/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    }
};
