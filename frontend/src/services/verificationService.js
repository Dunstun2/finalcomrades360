// Verification Service - Centralized verification status management
import api from './api';

class VerificationService {
    async getStatus() {
        try {
            const response = await api.get('/verification/status');
            return response.data;
        } catch (error) {
            console.error('[VerificationService] Error fetching verification status:', error);
            throw error;
        }
    }

    async refreshStatus() {
        return this.getStatus();
    }
}

export default new VerificationService();
