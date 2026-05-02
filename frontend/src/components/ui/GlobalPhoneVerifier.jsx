import React, { useState, useEffect } from 'react';
import { FaPhone, FaTimes, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import api from '../../services/api';
import { validateKenyanPhone } from '../../utils/validation';

export const usePhoneVerification = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [phonesToVerify, setPhonesToVerify] = useState([]);
  const [verificationPromise, setVerificationPromise] = useState(null);

  // Call this function before form submission
  // returns true if all are verified, false if verification was aborted
  const verifyPhones = async (phones) => {
    return new Promise(async (resolve) => {
      // Filter out empty/invalid formats first (form validation should handle these)
      const validPhones = phones.filter(p => p && validateKenyanPhone(p));
      
      if (validPhones.length === 0) {
        resolve(true);
        return;
      }

      // Check which phones need verification
      const unverified = [];
      for (const phone of validPhones) {
        try {
          const res = await api.get(`/verification/check-phone?phone=${encodeURIComponent(phone)}`);
          if (!res.data.isVerified) {
            unverified.push(phone);
          }
        } catch (err) {
          console.error("Phone verification check failed:", err);
          // If check fails, fail-safe is to require verification
          unverified.push(phone);
        }
      }

      if (unverified.length === 0) {
        resolve(true);
        return;
      }

      // Need verification for some numbers
      setPhonesToVerify(unverified);
      setIsOpen(true);
      setVerificationPromise({ resolve });
    });
  };

  const handleVerificationComplete = (success) => {
    setIsOpen(false);
    if (verificationPromise) {
      verificationPromise.resolve(success);
      setVerificationPromise(null);
    }
  };

  return {
    verifyPhones,
    isOpen,
    phonesToVerify,
    handleVerificationComplete
  };
};

export const GlobalPhoneVerifierModal = ({ isOpen, phonesToVerify, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (isOpen && phonesToVerify.length > 0) {
      setCurrentIndex(0);
      setOtp('');
      setError('');
      setOtpSent(false);
      sendOtp(phonesToVerify[0]);
    }
  }, [isOpen, phonesToVerify]);

  const sendOtp = async (phone) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/verification/request-guest-otp', { phone, method: 'whatsapp' });
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const currentPhone = phonesToVerify[currentIndex];
      await api.post('/verification/verify-guest-otp', { phone: currentPhone, otp });
      
      // Success for this phone
      setOtp('');
      setOtpSent(false);
      
      if (currentIndex + 1 < phonesToVerify.length) {
        const nextPhone = phonesToVerify[currentIndex + 1];
        setCurrentIndex(currentIndex + 1);
        sendOtp(nextPhone);
      } else {
        // All done
        onComplete(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || phonesToVerify.length === 0) return null;

  const currentPhone = phonesToVerify[currentIndex];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/70">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FaPhone className="text-indigo-600" />
            Verify Phone Number
          </h2>
          <button onClick={() => onComplete(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <FaTimes />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 text-sm mb-4">
            The phone number <strong className="text-indigo-600">{currentPhone}</strong> has not been verified yet. 
            We need to verify it before proceeding.
          </p>

          {phonesToVerify.length > 1 && (
            <p className="text-xs text-gray-400 mb-4 font-medium uppercase tracking-wider">
              Step {currentIndex + 1} of {phonesToVerify.length}
            </p>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              <FaExclamationTriangle className="shrink-0" />
              {error}
            </div>
          )}

          {!otpSent ? (
            <div className="text-center py-6">
              <button 
                onClick={() => sendOtp(currentPhone)} 
                disabled={loading}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors"
              >
                {loading ? 'Sending...' : 'Send Verification Code (WhatsApp/SMS)'}
              </button>
            </div>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Enter OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit code"
                  className="w-full px-4 py-3 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-center tracking-widest text-xl font-bold transition-all outline-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => sendOtp(currentPhone)}
                  disabled={loading}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                >
                  Resend Code
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Verifying...' : <><FaCheckCircle /> Verify</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
