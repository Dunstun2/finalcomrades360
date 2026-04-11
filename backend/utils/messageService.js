const africastalking = require('africastalking');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Initialize WhatsApp Client with LocalAuth for session persistence
let whatsappClient = null;
let isWhatsAppReady = false;
let latestQr = null;
let whatsappStatus = 'initializing'; // initializing, qr_ready, authenticated, ready, disconnected, error

const initWhatsApp = () => {
  console.log('🔄 [WhatsApp] Initializing Open Source Client...');
  whatsappStatus = 'initializing';
  latestQr = null;
  
  whatsappClient = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth/session_alt'
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions'
      ]
    }
  });

  whatsappClient.on('qr', (qr) => {
    console.log('📱 [WhatsApp] SCAN THIS QR CODE WITH YOUR PHONE:');
    latestQr = qr;
    whatsappStatus = 'qr_ready';
    qrcode.generate(qr, { small: true });
  });

  whatsappClient.on('ready', () => {
    console.log('✅ [WhatsApp] Client is READY and connected!');
    isWhatsAppReady = true;
    whatsappStatus = 'ready';
    latestQr = null;
  });

  whatsappClient.on('authenticated', () => {
    console.log('🔓 [WhatsApp] Authenticated successfully.');
    whatsappStatus = 'authenticated';
  });

  whatsappClient.on('auth_failure', (msg) => {
    console.error('❌ [WhatsApp] Authentication failure:', msg);
    whatsappStatus = 'error';
    isWhatsAppReady = false;
  });

  whatsappClient.on('disconnected', (reason) => {
    console.log('❌ [WhatsApp] Client disconnected:', reason);
    isWhatsAppReady = false;
    whatsappStatus = 'disconnected';
    // Attempt re-init
    setTimeout(initWhatsApp, 5000);
  });

  try {
    whatsappClient.initialize();
  } catch (err) {
    console.error('❌ [WhatsApp] Initialization Failed (Puppeteer conflict?):', err.message);
    whatsappStatus = 'error';
  }
};

// Start initialization immediately when this module is loaded
initWhatsApp();

/**
 * Public control functions for UI integration
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
  try {
    if (whatsappClient) {
      await whatsappClient.destroy();
    }
  } catch (e) {
    console.warn('⚠️ [WhatsApp] Error during destroy:', e.message);
  }
  initWhatsApp();
  return { success: true };
};

/**
 * Send SMS or WhatsApp message
 * @param {string} to - Recipient phone number in E.164 format (+254...)
 * @param {string} message - Content of the message
 * @param {string} method - 'sms' or 'whatsapp'
 */
const sendMessage = async (to, message, method = 'whatsapp') => {
  if (method === 'email') {
    return sendEmail(to, message.subject, message.body);
  }
  if (method === 'whatsapp') {
    return sendWhatsAppLocal(to, message);
  } else {
    return sendSms(to, message);
  }
};

const sendSms = async (to, message) => {
  let username = (process.env.AFRICASTALKING_USERNAME || '').trim();
  let apiKey = (process.env.AFRICASTALKING_API_KEY || '').trim();

  // Try to load from database
  try {
    const { PlatformConfig } = require('../models');
    const configRecord = await PlatformConfig.findOne({ where: { key: 'sms_config' } });
    if (configRecord) {
      const dbConfig = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
      if (dbConfig.username) username = dbConfig.username.trim();
      if (dbConfig.apiKey) apiKey = dbConfig.apiKey.trim();
    }
  } catch (err) {
    console.warn('⚠️ [SMS] Could not load config from DB, using fallback:', err.message);
  }

  if (!username || !apiKey) {
    console.warn('⚠️ [SMS] Credentials missing. Logging to console only.');
    console.log(`[MOCK SMS] To: ${to}, Message: ${message}`);
    return { success: true, mock: true };
  }


  const at = africastalking({ username, apiKey });
  const sms = at.SMS;
  try {
    console.log(`[Africatalking SMS] Sending to: ${to}...`);
    const result = await sms.send({
      to: [to],
      message: message,
      enqueue: true
    });
    console.log('✅ [Africatalking SMS] Response:', JSON.stringify(result, null, 2));
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ [Africatalking SMS] Error:', error);
    throw error;
  }
};

const sendWhatsAppLocal = async (to, message) => {
  if (!isWhatsAppReady) {
    console.warn('⚠️ [WhatsApp] Client not ready yet. Please ensure you scanned the QR code.');
    throw new Error('WhatsApp service is initializing. Please try again in a few moments.');
  }

  try {
    // Clean phone number (remove spaces, etc)
    let cleanedPhone = to.replace(/[\s\-\(\)]/g, '');
    
    // Ensure 254 format if starting with 07 or 01
    if (cleanedPhone.startsWith('0')) {
        cleanedPhone = '254' + cleanedPhone.substring(1);
    } else if (cleanedPhone.startsWith('+')) {
        cleanedPhone = cleanedPhone.substring(1);
    }
    
    // Format number for whatsapp-web.js: 2547XXXXXXXX@c.us
    const chatId = cleanedPhone + '@c.us';
    console.log(`[Local WhatsApp] Sending to: ${chatId}...`);
    
    const result = await whatsappClient.sendMessage(chatId, message);
    console.log('✅ [Local WhatsApp] Message sent successfully!');
    return { success: true, data: result.id };
  } catch (error) {
    console.error('❌ [Local WhatsApp] Error:', error.message);
    throw error;
  }
};

module.exports = { sendMessage, getWhatsAppStatus, restartWhatsApp };
