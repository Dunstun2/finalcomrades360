// Send SMS via Twilio if configured; otherwise fallback to console log.
async function sendSms(to, text) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env || {};
  const canUseTwilio = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM;

  if (canUseTwilio) {
    try {
      const twilio = require('twilio');
      const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      const msg = await client.messages.create({ from: TWILIO_FROM, to, body: text });
      console.log(`✅ [SMS SENT] To: ${to} | Sid: ${msg.sid}`);
      return { success: true, method: 'twilio', sid: msg.sid };
    } catch (e) {
      console.warn('⚠️ [SMS FAILED] Twilio send failed, falling back to console log:', e.message);
    }
  }

  // Fallback: console log (SIMULATION MODE)
  console.log('\n' + '='.repeat(80));
  console.log('📱 [SMS SIMULATION - DEV MODE]');
  console.log('='.repeat(80));
  console.log(`To: ${to}`);
  console.log('-'.repeat(80));
  console.log(text);
  console.log('='.repeat(80) + '\n');
  return { success: true, method: 'simulation' };
}

module.exports = { sendSms };
