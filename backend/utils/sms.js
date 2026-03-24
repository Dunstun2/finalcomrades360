const africastalking = require('africastalking');

/**
 * Send SMS using Africatalking
 * @param {string} to - Recipient phone number in E.164 format (e.g., +254...)
 * @param {string} message - SMS content
 */
const sendSms = async (to, message) => {
  // Use .trim() to prevent issues with whitespace in .env file
  const username = (process.env.AFRICASTALKING_USERNAME || '').trim();
  const apiKey = (process.env.AFRICASTALKING_API_KEY || '').trim();

  if (!username || !apiKey) {
    console.warn('⚠️ [Africatalking] Credentials missing. Logging SMS to console only.');
    console.log(`[SMS MOCK] To: ${to}, Message: ${message}`);
    return { success: true, message: 'SMS logged to console (Mock)' };
  }

  // Initialize Africatalking
  const at = africastalking({ username, apiKey });
  const sms = at.SMS;

  try {
    console.log(`[Africatalking] Sending to: ${to}...`);
    const result = await sms.send({
      to: [to],
      message: message,
      enqueue: true // Enqueue for reliability
    });
    
    // Log detailed status for each recipient
    if (result.SMSMessageData && result.SMSMessageData.Recipients) {
      result.SMSMessageData.Recipients.forEach(rec => {
        console.log(`[Africatalking] Recipient: ${rec.number}, Status: ${rec.status}, StatusCode: ${rec.statusCode}, Cost: ${rec.cost}`);
      });
    }

    console.log('✅ [Africatalking] API Response:', JSON.stringify(result, null, 2));
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ [Africatalking] Error sending SMS:', error);
    throw error;
  }
};

module.exports = { sendSms };
