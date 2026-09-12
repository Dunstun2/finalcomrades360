const axios = require('axios');
const africastalking = require('africastalking');
const { sendWhatsAppCloud } = require('./metaWhatsAppService');

// State & Config caching
let configCache = new Map();
const CACHE_TTL = 300000; // 5 minutes

// WhatsApp Worker URL (Isolated PM2 process running on internal port)
const WHATSAPP_WORKER_URL = process.env.WHATSAPP_WORKER_URL || 'http://127.0.0.1:5005';

/**
 * Normalizes phone numbers to E.164 format for WhatsApp and SMS (Kenyan focus)
 */
const normalizePhone = (phone) => {
    let clean = String(phone || '').replace(/[\s\-\(\)\+]/g, '');
    if (clean.startsWith('0')) {
        clean = '254' + clean.substring(1);
    } else if (clean.startsWith('7') || clean.startsWith('1')) {
        clean = '254' + clean;
    }
    return clean.startsWith('254') ? `+${clean}` : `+${clean}`;
};

/**
 * Retrieve Platform WhatsApp configuration from DB (cached)
 */
const getWhatsAppConfig = async () => {
    const now = Date.now();
    if (configCache.has('whatsapp_config') && (now - configCache.get('whatsapp_config').timestamp < CACHE_TTL)) {
        return configCache.get('whatsapp_config').value;
    }
    try {
        const { PlatformConfig } = require('../database/models.registry');
        const configRecord = await PlatformConfig.findOne({ where: { key: 'whatsapp_config' } });
        if (configRecord) {
            const dbConfig = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
            configCache.set('whatsapp_config', { value: dbConfig, timestamp: now });
            return dbConfig;
        }
    } catch (err) {
        console.error('[messageService] Failed to load whatsapp_config from DB:', err.message);
    }
    return null;
};

/**
 * Public control function to check current WhatsApp status
 */
const getWhatsAppStatus = async () => {
    const dbConfig = await getWhatsAppConfig();
    const method = dbConfig?.method || 'local';

    if (method === 'cloud') {
        const hasCredentials = Boolean(
            dbConfig?.metaAccessToken || 
            process.env.META_WHATSAPP_TOKEN || 
            process.env.WHATSAPP_CLOUD_TOKEN
        );
        return {
            isReady: hasCredentials,
            status: hasCredentials ? 'cloud_active' : 'cloud_unconfigured',
            method: 'cloud',
            qr: null
        };
    }

    // Query the isolated local WhatsApp Worker
    try {
        const response = await axios.get(`${WHATSAPP_WORKER_URL}/status`, { timeout: 3000 });
        return {
            ...response.data,
            method: 'local'
        };
    } catch (err) {
        return {
            isReady: false,
            status: 'worker_offline',
            method: 'local',
            qr: null,
            message: 'WhatsApp worker is offline. Run `pm2 start whatsapp-worker.js --name comrades-whatsapp`'
        };
    }
};

/**
 * Restart WhatsApp connection
 */
const restartWhatsApp = async () => {
    const dbConfig = await getWhatsAppConfig();
    if (dbConfig?.method === 'cloud') {
        return { success: true, message: 'Cloud API is stateless and does not need restart.' };
    }

    try {
        const response = await axios.post(`${WHATSAPP_WORKER_URL}/restart`, {}, { timeout: 5000 });
        return response.data;
    } catch (err) {
        console.error('[messageService] Failed to restart WhatsApp worker:', err.message);
        throw new Error('Could not connect to WhatsApp worker.');
    }
};

/**
 * Logout and clear WhatsApp session
 */
const logoutWhatsApp = async () => {
    const dbConfig = await getWhatsAppConfig();
    if (dbConfig?.method === 'cloud') {
        return { success: true, message: 'Cloud API session managed via Meta Dashboard.' };
    }

    try {
        const response = await axios.post(`${WHATSAPP_WORKER_URL}/logout`, {}, { timeout: 5000 });
        return response.data;
    } catch (err) {
        console.error('[messageService] Failed to logout WhatsApp worker:', err.message);
        throw new Error('Could not connect to WhatsApp worker.');
    }
};

/**
 * Primary Message Dispatcher
 */
const sendMessage = async (to, message, method = 'whatsapp') => {
    const formattedPhone = normalizePhone(to);
    console.log(`[Messaging] 🚀 ROUTING: ${method.toUpperCase()} | TARGET: ${formattedPhone}`);

    if (method === 'whatsapp') {
        const dbConfig = await getWhatsAppConfig();
        const activeMethod = dbConfig?.method || 'local';

        // 1. Meta Official Cloud API (Option 2)
        if (activeMethod === 'cloud') {
            return sendWhatsAppCloud(formattedPhone, message, dbConfig || {});
        }

        // 2. Local Baileys Isolated Worker (Option 1)
        try {
            const cleanNumber = formattedPhone.replace('+', '');
            const response = await axios.post(
                `${WHATSAPP_WORKER_URL}/send`,
                { to: cleanNumber, message },
                { timeout: 15000 }
            );
            return response.data;
        } catch (workerErr) {
            const errorMsg = workerErr.response?.data?.message || workerErr.message;
            console.error('❌ [WhatsApp Worker Error]:', errorMsg);
            throw new Error(`WhatsApp Dispatch Failed: ${errorMsg}`);
        }
    } else {
        return sendSms(formattedPhone, message);
    }
};

/**
 * SMS Dispatcher via Africa's Talking
 */
const sendSms = async (to, message) => {
    let username = '';
    let apiKey = '';
    let from = '';

    try {
        const now = Date.now();
        let dbConfig = null;

        if (configCache.has('sms_config') && (now - configCache.get('sms_config').timestamp < CACHE_TTL)) {
            dbConfig = configCache.get('sms_config').value;
        } else {
            const { PlatformConfig } = require('../database/models.registry');
            const configRecord = await PlatformConfig.findOne({ where: { key: 'sms_config' } });
            if (configRecord) {
                dbConfig = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
                configCache.set('sms_config', { value: dbConfig, timestamp: now });
            }
        }

        if (dbConfig) {
            username = (dbConfig.username || '').trim();
            apiKey = (dbConfig.apiKey || '').trim();
            from = (dbConfig.senderId || dbConfig.from || '').trim();
        }
    } catch (err) {
        console.error('[SMS Service] Failed to fetch database config:', err.message);
    }

    if (!username) username = (process.env.AFRICASTALKING_USERNAME || '').trim();
    if (!apiKey) apiKey = (process.env.AFRICASTALKING_API_KEY || '').trim();
    if (!from) from = (process.env.AFRICASTALKING_FROM || '').trim();

    if (!username || !apiKey) {
        console.log(`⚠️ [SMS MOCK] Credentials missing. To: ${to}, Message: ${message}`);
        return { success: true, mock: true };
    }

    const at = africastalking({ username, apiKey });
    try {
        console.log(`[Africatalking SMS] Dispatching to: ${to} (Sender: ${from || 'Default'})...`);

        const options = {
            to: [to],
            message,
            enqueue: true
        };

        if (from) options.from = from;

        const result = await at.SMS.send(options);
        console.log('✅ [SMS] Africatalking Response:', JSON.stringify(result, null, 2));
        return { success: true, data: result };
    } catch (error) {
        console.error('❌ [SMS] Africatalking FATAL Error:', error);
        throw error;
    }
};

module.exports = { sendMessage, getWhatsAppStatus, restartWhatsApp, logoutWhatsApp };
