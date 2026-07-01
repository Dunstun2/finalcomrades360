const { getIO } = require('../realtime/socket');

/**
 * Mirror an OTP to a specific socket room (based on contact) for automatic prefilling.
 * Enables cross-device prefilling if multiple devices are listening for the same contact.
 * 
 * @param {string} contact - The email or phone number receiving the OTP.
 * @param {string} otp - The 6-digit OTP code.
 * @param {string} [type='registration'] - The type of OTP (for frontend context).
 * @param {string} [socketId] - Optional specific socketId to also target directly.
 */
const mirrorOtp = (contact, otp, type = 'registration', socketId = null) => {
  // CRITICAL SECURITY FIX: 
  // We NEVER send the actual OTP back to the frontend over WebSockets.
  // If we do, a malicious user can request an OTP for someone else's email/phone 
  // and the backend will hand them the OTP instantly via the socket, bypassing verification.
  // 
  // Auto-filling is now STRICTLY handled by the WebOTP API on the frontend 
  // (which intercepts actual SMS messages securely via the OS).
  console.log(`[OTP-Mirror] Blocked insecure socket mirror attempt for type: ${type}`);
  return;
};

module.exports = {
  mirrorOtp,
  mirrorOtpToSocket: mirrorOtp // Maintain backward compatibility for a transition period if needed
};
