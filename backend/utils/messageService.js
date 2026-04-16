const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const P = require('pino');
const africastalking = require('africastalking');
const { sendWhatsAppCloud } = require('./metaWhatsAppService');
const fs = require('fs');
const path = require('path');

// State management
let sock = null;
let isWhatsAppReady = false;
let latestQr = null;
let whatsappStatus = 'initializing'; // initializing, qr_ready, authenticated, ready, disconnected, error

// Prepare session directory
const sessionDir = path.join(process.cwd(), '.wwebjs_auth/baileys_session');
if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
}

const initWhatsApp = async () => {
    // 1. Fetch config from DB
    let method = 'local';
    try {
        const { PlatformConfig } = require('../models');
        const configRecord = await PlatformConfig.findOne({ where: { key: 'whatsapp_config' } });
        if (configRecord) {
            const dbConfig = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
            method = dbConfig.method || 'local';
        }
    } catch (err) {
        console.warn('⚠️ [WhatsApp] Could not load config, defaulting to local:', err.message);
    }

    // 2. Guard: skip if explicitly disabled or set to cloud
    if (process.env.WHATSAPP_ENABLED !== 'true' || method === 'cloud') {
        whatsappStatus = method === 'cloud' ? 'cloud_active' : 'disabled';
        console.log(`ℹ️ [WhatsApp] Local Engine ${method === 'cloud' ? 'using Cloud API' : 'disabled'}. Skipping.`);
        return;
    }

    console.log('🔄 [WhatsApp] Initializing Baileys (No-Browser Engine)...');
    whatsappStatus = 'initializing';
    latestQr = null;

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })),
            },
            printQRInTerminal: true,
            logger: P({ level: 'silent' }),
            browser: ['Comrades360', 'MacOS', '3.0']
        });

        // Event: Connection Update (QR and Status)
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('📱 [WhatsApp] New QR Code generated. Please scan in Admin Dashboard.');
                latestQr = qr;
                whatsappStatus = 'qr_ready';
            }

            if (connection === 'connecting') {
                whatsappStatus = 'initializing';
            }

            if (connection === 'open') {
                console.log('✅ [WhatsApp] Baileys Connected & Ready!');
                isWhatsAppReady = true;
                whatsappStatus = 'ready';
                latestQr = null;
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('❌ [WhatsApp] Connection closed. Should reconnect:', shouldReconnect);
                isWhatsAppReady = false;
                whatsappStatus = 'disconnected';
                
                if (shouldReconnect) {
                    setTimeout(initWhatsApp, 5000);
                }
            }
        });

        // Event: Save Credentials
        sock.ev.on('creds.update', saveCreds);

    } catch (err) {
        console.error('❌ [WhatsApp] Baileys Initialization Failed:', err.message);
        whatsappStatus = 'error';
        isWhatsAppReady = false;
        sock = null;
    }
};

// Auto-start
if (process.env.WHATSAPP_ENABLED === 'true') {
    initWhatsApp();
} else {
    whatsappStatus = 'disabled';
}

/**
 * Public control functions
 */
const getWhatsAppStatus = () => {
    return {
        isReady: isWhatsAppReady,
        status: whatsappStatus,
        qr: latestQr
    };
};

const restartWhatsApp = async () => {
    console.log('🔄 [WhatsApp] Manual restart requested...');
    isWhatsAppReady = false;
    latestQr = null;
    if (sock) {
        try { sock.logout(); } catch (e) {}
    }
    setTimeout(initWhatsApp, 1000);
    return { success: true };
};

const sendMessage = async (to, message, method = 'whatsapp') => {
    if (method === 'whatsapp') {
        try {
            const { PlatformConfig } = require('../models');
            const configRecord = await PlatformConfig.findOne({ where: { key: 'whatsapp_config' } });
            if (configRecord) {
                const dbConfig = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
                if (dbConfig.method === 'cloud') {
                    return sendWhatsAppCloud(to, message, dbConfig);
                }
            }
        } catch (err) {}
        return sendWhatsAppLocal(to, message);
    } else {
        return sendSms(to, message);
    }
};

const sendWhatsAppLocal = async (to, message) => {
    if (!isWhatsAppReady || !sock) {
        throw new Error('WhatsApp service is not ready. Please scan the QR code first.');
    }

    try {
        let cleanedPhone = to.replace(/[\s\-\(\)\+]/g, '');
        if (cleanedPhone.startsWith('0')) {
            cleanedPhone = '254' + cleanedPhone.substring(1);
        }
        
        const jid = `${cleanedPhone}@s.whatsapp.net`;
        console.log(`[Baileys WhatsApp] Sending to: ${jid}...`);
        
        const result = await sock.sendMessage(jid, { text: message });
        console.log('✅ [Baileys WhatsApp] Message sent successfully!');
        return { success: true, messageId: result.key.id };
    } catch (error) {
        console.error('❌ [Baileys WhatsApp] Error:', error.message);
        throw error;
    }
};

const sendSms = async (to, message) => {
    let username = (process.env.AFRICASTALKING_USERNAME || '').trim();
    let apiKey = (process.env.AFRICASTALKING_API_KEY || '').trim();

    try {
        const { PlatformConfig } = require('../models');
        const configRecord = await PlatformConfig.findOne({ where: { key: 'sms_config' } });
        if (configRecord) {
            const dbConfig = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
            if (dbConfig.username) username = dbConfig.username.trim();
            if (dbConfig.apiKey) apiKey = dbConfig.apiKey.trim();
        }
    } catch (err) {}

    if (!username || !apiKey) {
        console.log(`[MOCK SMS] To: ${to}, Message: ${message}`);
        return { success: true, mock: true };
    }

    const at = africastalking({ username, apiKey });
    try {
        const result = await at.SMS.send({ to: [to], message, enqueue: true });
        console.log('✅ [SMS] Sent:', JSON.stringify(result));
        return { success: true, data: result };
    } catch (error) {
        console.error('❌ [SMS] Error:', error);
        throw error;
    }
};

module.exports = { sendMessage, getWhatsAppStatus, restartWhatsApp };
