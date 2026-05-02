import { useEffect } from 'react';

/**
 * Hook to handle WebOTP API for automatic SMS code capture.
 * 
 * @param {Object} options
 * @param {boolean} options.enabled - Whether the hook should be active (e.g. only in the OTP entry step)
 * @param {function} options.onCapture - Callback when a code is captured
 */
const useWebOTP = ({ enabled, onCapture }) => {
  useEffect(() => {
    if (!enabled) return;
    if (!('OTPCredential' in window)) {
      console.log('[WebOTP] API not supported in this browser.');
      return;
    }

    const ac = new AbortController();

    const requestOTP = async () => {
      try {
        console.log('[WebOTP] Listening for SMS...');
        const credential = await navigator.credentials.get({
          otp: { transport: ['sms'] },
          signal: ac.signal
        });

        if (credential && credential.code) {
          console.log('[WebOTP] Code captured:', credential.code);
          // Standard numeric extraction just in case
          const digits = credential.code.replace(/\D/g, '').slice(0, 6);
          onCapture(digits);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('[WebOTP] capture failed:', err);
        }
      }
    };

    requestOTP();

    return () => {
      console.log('[WebOTP] Aborting capture...');
      ac.abort();
    };
  }, [enabled, onCapture]);
};

export default useWebOTP;
