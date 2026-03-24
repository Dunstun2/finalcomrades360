const axios = require('axios');

// Airtel Money API Configuration
const AIRTEL_CONFIG = {
  baseUrl: process.env.AIRTEL_ENVIRONMENT === 'production'
    ? 'https://openapi.airtel.africa'
    : 'https://openapi.airtel.africa/airtel-money', // Sandbox usually has different base or suffix
  clientId: process.env.AIRTEL_CLIENT_ID,
  clientSecret: process.env.AIRTEL_CLIENT_SECRET,
  pin: process.env.AIRTEL_PIN,
  merchantCode: process.env.AIRTEL_MERCHANT_CODE,
  callbackUrl: process.env.AIRTEL_CALLBACK_URL || `${process.env.BASE_URL}/api/payments/airtel/callback`,
  mockMode: process.env.AIRTEL_MOCK_MODE === 'true'
};

class AirtelMoneyService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Generate Airtel access token
  async getAccessToken() {
    try {
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      if (AIRTEL_CONFIG.mockMode) {
        this.accessToken = 'mock_airtel_token_' + Date.now();
        this.tokenExpiry = Date.now() + 3540 * 1000;
        return this.accessToken;
      }

      const response = await axios.post(`${AIRTEL_CONFIG.baseUrl}/auth/oauth2/token`, {
        client_id: AIRTEL_CONFIG.clientId,
        client_secret: AIRTEL_CONFIG.clientSecret,
        grant_type: 'client_credentials'
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
      return this.accessToken;
    } catch (error) {
      console.error('❌ Failed to get Airtel access token:', error.message);
      throw new Error(`Airtel Auth Failed: ${error.message}`);
    }
  }

  // Initiate STK Push
  async initiateSTKPush(phoneNumber, amount, orderNumber) {
    try {
      if (AIRTEL_CONFIG.mockMode) {
        return {
          success: true,
          transactionId: `MOCK-AIRTEL-${Date.now()}`,
          message: 'Airtel Money STK Push initiated (Mock Mode)',
          isMock: true
        };
      }

      const accessToken = await this.getAccessToken();
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const payload = {
        reference: `ORD-${orderNumber}`,
        subscriber: {
          country: 'KE',
          currency: 'KES',
          msisdn: formattedPhone
        },
        transaction: {
          amount: Math.round(amount),
          country: 'KE',
          currency: 'KES',
          id: `TX-${Date.now()}`
        }
      };

      const response = await axios.post(
        `${AIRTEL_CONFIG.baseUrl}/merchant/v1/payments/`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Country': 'KE',
            'X-Currency': 'KES'
          }
        }
      );

      return {
        success: response.data.status?.success || false,
        transactionId: response.data.data?.transaction?.id,
        message: response.data.status?.message || 'Initiation successful'
      };
    } catch (error) {
      console.error('❌ Airtel STK Push failed:', error.message);
      return {
        success: false,
        error: error.response?.data?.status?.message || error.message
      };
    }
  }

  // Format phone number to 7XXXXXXXX (Airtel format often requires leading 7 or 1)
  formatPhoneNumber(phoneNumber) {
    let cleaned = String(phoneNumber).replace(/\D/g, '');
    if (cleaned.startsWith('254')) cleaned = cleaned.slice(3);
    if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
    return cleaned; // Returns 7XXXXXXXX or 1XXXXXXXX
  }
}

module.exports = new AirtelMoneyService();
