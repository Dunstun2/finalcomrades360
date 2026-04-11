// Attempt to send real email using Nodemailer if SMTP env vars are set and nodemailer is installed.
// Falls back to console logging in development.

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env || {};
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;
  try {
    const nodemailer = require('nodemailer');
    _transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      pool: true,          // reuse connections
      maxConnections: 3,
      maxMessages: 100,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
    console.log('[Mailer] SMTP transporter created (pooled)');
    return _transporter;
  } catch (e) {
    console.warn('[Mailer] Failed to create transporter:', e.message);
    return null;
  }
}

async function sendEmail(to, subject, text) {
  const transporter = getTransporter();
  const { SMTP_USER, SMTP_FROM } = process.env || {};

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: SMTP_FROM || `Comrades360 <${SMTP_USER}>`,
        to,
        subject,
        text
      });
      console.log(`✅ [EMAIL SENT] To: ${to} | Subject: ${subject} | MessageId: ${info.messageId}`);
      return { success: true, method: 'smtp', messageId: info.messageId };
    } catch (e) {
      console.warn('⚠️ [EMAIL FAILED] SMTP send failed, falling back to console log:', e.message);
    }
  }

  // Fallback: console log (SIMULATION MODE)
  console.log('\n' + '='.repeat(80));
  console.log('📧 [EMAIL SIMULATION - DEV MODE]');
  console.log('='.repeat(80));
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('-'.repeat(80));
  console.log(text);
  console.log('='.repeat(80) + '\n');
  return { success: true, method: 'simulation' };
}

module.exports = { sendEmail };

