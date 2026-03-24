const africastalking = require('africastalking');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Initialize WhatsApp Client with LocalAuth for session persistence
let whatsappClient = null;
let isWhatsAppReady = false;

const initWhatsApp = () => {
  console.log('🔄 [WhatsApp] Initializing Open Source Client...');
  
  whatsappClient = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-extensions'
      ]
    }
  });

  whatsappClient.on('qr', (qr) => {
    console.log('📱 [WhatsApp] SCAN THIS QR CODE WITH YOUR PHONE:');
    qrcode.generate(qr, { small: true });
  });

  whatsappClient.on('ready', () => {
    console.log('✅ [WhatsApp] Client is READY and connected!');
    isWhatsAppReady = true;
  });

  whatsappClient.on('authenticated', () => {
    console.log('🔓 [WhatsApp] Authenticated successfully.');
  });

  whatsappClient.on('auth_failure', (msg) => {
    console.error('❌ [WhatsApp] Authentication failure:', msg);
  });

  whatsappClient.on('disconnected', (reason) => {
    console.log('❌ [WhatsApp] Client disconnected:', reason);
    isWhatsAppReady = false;
    // Attempt re-init
    setTimeout(initWhatsApp, 5000);
  });

  try {
    whatsappClient.initialize();
  } catch (err) {
    console.error('❌ [WhatsApp] Initialization Failed (Puppeteer conflict?):', err.message);
  }
};

// Start initialization immediately when this module is loaded
initWhatsApp();

/**
 * Send SMS or WhatsApp message
 * @param {string} to - Recipient phone number in E.164 format (+254...)
 * @param {string} message - Content of the message
 * @param {string} method - 'sms' or 'whatsapp'
 */
const sendMessage = async (to, message, method = 'sms') => {
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
    // Format number for whatsapp-web.js: 2547XXXXXXXX@c.us
    const chatId = to.replace('+', '') + '@c.us';
    console.log(`[Local WhatsApp] Sending to: ${chatId}...`);
    
    const result = await whatsappClient.sendMessage(chatId, message);
    console.log('✅ [Local WhatsApp] Message sent successfully!');
    return { success: true, data: result.id };
  } catch (error) {
    console.error('❌ [Local WhatsApp] Error:', error.message);
    throw error;
  }
};

module.exports = { sendMessage };
