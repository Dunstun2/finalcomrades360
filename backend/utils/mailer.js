// Attempt to send real email using Nodemailer if SMTP env vars are set and nodemailer is installed.
// Falls back to console logging in development.
async function sendEmail(to, subject, text) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env || {};
  const hasSmtp = SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS;

  if (hasSmtp) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
        auth: { user: SMTP_USER, pass: SMTP_PASS }
      });
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
