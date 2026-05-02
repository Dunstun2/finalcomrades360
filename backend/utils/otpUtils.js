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
  if (!contact && !socketId) return;

  try {
    const io = getIO();
    if (io) {
      const payload = {
        otp,
        type,
        timestamp: new Date().toISOString()
      };

      // 1. Emit to a specific room for this contact (Cross-device support)
      if (contact) {
        const room = `otp:${contact.toLowerCase().trim()}`;
        console.log(`[OTP-Mirror] Mirroring ${type} OTP to room: ${room}`);
        io.to(room).emit('otp:received', payload);
      }

      // 2. Fallback: Emit to specific socket if provided (Same-device support)
      if (socketId) {
        console.log(`[OTP-Mirror] Mirroring ${type} OTP to socket: ${socketId}`);
        io.to(socketId).emit('otp:received', payload);
      }
    }
  } catch (err) {
    console.error('[OTP-Mirror] Failed to mirror OTP:', err.message);
  }
};

module.exports = {
  mirrorOtp,
  mirrorOtpToSocket: mirrorOtp // Maintain backward compatibility for a transition period if needed
};
