const axios = require('axios');

/**
 * Send WhatsApp message using the Official Meta Cloud API (Graph API)
 * 
 * @param {string} to - Recipient phone number in E.164 format (e.g., 254712345678 or +254712345678)
 * @param {string} message - Content of the message
 * @param {Object} [config] - Optional configuration object from PlatformConfig
 * @returns {Promise<Object>} - Response from Meta API
 */
const sendWhatsAppCloud = async (to, message, config = {}) => {
    const metaAccessToken = (
        config.metaAccessToken || 
        process.env.META_WHATSAPP_TOKEN || 
        process.env.META_ACCESS_TOKEN || 
        process.env.WHATSAPP_CLOUD_TOKEN || 
        ''
    ).trim();

    const metaPhoneNumberId = (
        config.metaPhoneNumberId || 
        process.env.META_WHATSAPP_PHONE_ID || 
        process.env.META_PHONE_NUMBER_ID || 
        process.env.WHATSAPP_CLOUD_PHONE_ID || 
        ''
    ).trim();

    if (!metaAccessToken || !metaPhoneNumberId) {
        console.error('❌ [Meta WhatsApp] Missing credentials (metaAccessToken or metaPhoneNumberId)');
        throw new Error('WhatsApp Cloud API credentials are not configured. Please add them in Admin Settings or .env.');
    }

    // Clean phone number (remove +, spaces, dashes, parentheses)
    let cleanedPhone = String(to || '').replace(/[\s\-\(\)\+]/g, '');

    // Format Kenyan phone numbers to international format (254...)
    if (cleanedPhone.startsWith('0')) {
        cleanedPhone = '254' + cleanedPhone.substring(1);
    } else if (cleanedPhone.startsWith('7') || cleanedPhone.startsWith('1')) {
        cleanedPhone = '254' + cleanedPhone;
    }

    const url = `https://graph.facebook.com/v17.0/${metaPhoneNumberId}/messages`;

    try {
        console.log(`[Meta WhatsApp] Dispatching to ${cleanedPhone}...`);

        const response = await axios.post(
            url,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: cleanedPhone,
                type: 'text',
                text: {
                    preview_url: false,
                    body: message
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${metaAccessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        const messageId = response.data?.messages?.[0]?.id;
        console.log('✅ [Meta WhatsApp] Message sent successfully! ID:', messageId);
        return { success: true, messageId, data: response.data };
    } catch (error) {
        const errorDetail = error.response?.data?.error?.message || error.message;
        const errorCode = error.response?.data?.error?.code;
        console.error(`❌ [Meta WhatsApp] API Error (${errorCode}):`, errorDetail);

        if (errorCode === 131030) {
            throw new Error('Meta WhatsApp Error: Recipient phone number is not in your allow-list (test mode).');
        }
        if (errorCode === 190) {
            throw new Error('Meta WhatsApp Error: Access token is invalid or expired.');
        }

        throw new Error(`Meta WhatsApp API Error: ${errorDetail}`);
    }
};

module.exports = { sendWhatsAppCloud };
