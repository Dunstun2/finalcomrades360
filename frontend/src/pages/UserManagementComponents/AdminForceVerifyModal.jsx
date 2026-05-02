import React, { useState, useMemo } from 'react';
import { adminApi } from '../../services/api';
import { FaSearch, FaCheck, FaTimes, FaEnvelope, FaPhone, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

// ── Validation helpers ──────────────────────────────────────────────────────
import { validateKenyanPhone, formatKenyanPhoneInput } from '../../utils/validation';

const isValidEmail = (email) => {
  if (!email || !email.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
};

const isValidPhone = (phone) => validateKenyanPhone(phone);
// ───────────────────────────────────────────────────────────────────────────

const AdminForceVerifyModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [searching, setSearching] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchError, setSearchError] = useState('');

  const [selectedUser, setSelectedUser] = useState(null);
  const [editedEmail, setEditedEmail] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [verifyEmail, setVerifyEmail] = useState(false);
  const [verifyPhone, setVerifyPhone] = useState(false);

  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Live validation flags
  const emailValid = useMemo(() => isValidEmail(editedEmail), [editedEmail]);
  const phoneValid = useMemo(() => isValidPhone(editedPhone), [editedPhone]);

  const handleClose = () => {
    setStep(1);
    setIdentifier('');
    setUsers([]);
    setSearchError('');
    setSelectedUser(null);
    setEditedEmail('');
    setEditedPhone('');
    setVerifyEmail(false);
    setVerifyPhone(false);
    setVerifyError('');
    onClose();
  };

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchError('');
    setSearching(true);
    try {
      const response = await adminApi.adminSearchUserForVerify({ identifier });
      setUsers(response.data.users);
    } catch (err) {
      setSearchError(err.response?.data?.message || 'No users found matching that identifier.');
      setUsers([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setEditedEmail(user.email || '');
    setEditedPhone(user.phone || '');
    // Auto-check only if field has a valid real value and isn't already verified
    setVerifyEmail(!user.emailVerified && isValidEmail(user.email));
    setVerifyPhone(!user.phoneVerified && isValidPhone(user.phone));
    setVerifyError('');
    setStep(2);
  };

  // When the email field changes, uncheck verify if it's no longer valid
  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEditedEmail(val);
    if (!isValidEmail(val)) setVerifyEmail(false);
  };

  // When the phone field changes, uncheck verify if it's no longer valid
  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setEditedPhone(val);
    if (!isValidPhone(val)) setVerifyPhone(false);
  };

  const canSubmit = verifyEmail || verifyPhone ||
    (editedEmail !== selectedUser?.email && emailValid) ||
    (editedPhone !== selectedUser?.phone && phoneValid);

  const handleVerify = async (e) => {
    e.preventDefault();

    // Frontend guard: ensure verifiable fields are real
    if (verifyEmail && !emailValid) {
      setVerifyError('Please enter a valid email address before marking it as verified.');
      return;
    }
    if (verifyPhone && !phoneValid) {
      setVerifyError('Please enter a valid phone number (+254...) before marking it as verified.');
      return;
    }
    if (!canSubmit) {
      setVerifyError('No changes to apply. Please update an email or phone, or select a verification option.');
      return;
    }

    setVerifyError('');
    setVerifying(true);
    try {
      const res = await adminApi.adminForceVerify({
        userId: selectedUser.id,
        email: editedEmail || undefined,
        phone: editedPhone || undefined,
        verifyEmail,
        verifyPhone,
      });
      onSuccess(res.data?.message);
      handleClose();
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Failed to update and verify user.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/70">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {step === 1 ? '🔍 Find User to Verify' : '✏️ Update & Verify User'}
            </h2>
            {step === 2 && selectedUser && (
              <p className="text-xs text-gray-500 mt-0.5">
                Editing: <span className="font-semibold text-gray-700">{selectedUser.name}</span>
                {' · '}
                <span className="capitalize text-indigo-600">{selectedUser.role}</span>
              </p>
            )}
          </div>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <FaTimes />
          </button>
        </div>

        <div className="p-5">
          {/* ── STEP 1: Search ── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Search by the user's <strong>name</strong>, <strong>email</strong>, or <strong>phone number</strong>.
              </p>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. john@example.com, +254712..."
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
                <button
                  type="submit"
                  disabled={searching || !identifier.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                >
                  {searching
                    ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white" />
                    : <FaSearch className="text-xs" />}
                  Search
                </button>
              </form>

              {searchError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <FaExclamationTriangle className="shrink-0" />
                  {searchError}
                </div>
              )}

              {users.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Results ({users.length})</p>
                  {users.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="p-3 border border-gray-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer transition-all"
                    >
                      <p className="font-semibold text-gray-800 text-sm">{user.name || '(No Name)'}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                        <FaEnvelope className="text-gray-400" />
                        <span>{user.email || <em className="text-gray-400">No email</em>}</span>
                        {user.email
                          ? user.emailVerified
                            ? <span className="ml-1 text-green-700 bg-green-100 px-1.5 py-0.5 rounded text-[10px] font-medium">Verified</span>
                            : <span className="ml-1 text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[10px] font-medium">Unverified</span>
                          : null}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <FaPhone className="text-gray-400" />
                        <span>{user.phone || <em className="text-gray-400">No phone</em>}</span>
                        {user.phone
                          ? user.phoneVerified
                            ? <span className="ml-1 text-green-700 bg-green-100 px-1.5 py-0.5 rounded text-[10px] font-medium">Verified</span>
                            : <span className="ml-1 text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[10px] font-medium">Unverified</span>
                          : null}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Edit & Verify ── */}
          {step === 2 && selectedUser && (
            <form onSubmit={handleVerify} className="space-y-4">

              {/* Email field */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <FaEnvelope className="text-gray-400 text-xs" /> Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={editedEmail}
                    onChange={handleEmailChange}
                    className={`w-full px-4 py-2.5 pr-10 border rounded-lg text-sm focus:ring-2 transition-colors ${
                      editedEmail
                        ? emailValid
                          ? 'border-green-400 focus:ring-green-400 bg-green-50'
                          : 'border-red-400 focus:ring-red-400 bg-red-50'
                        : 'border-gray-300 focus:ring-indigo-500'
                    }`}
                    placeholder="Enter real email address"
                  />
                  {editedEmail && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${emailValid ? 'text-green-500' : 'text-red-400'}`}>
                      {emailValid ? <FaCheckCircle /> : <FaExclamationTriangle />}
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-2 mt-1">
                  <input
                    type="checkbox"
                    id="verifyEmail"
                    checked={verifyEmail}
                    disabled={!emailValid}
                    onChange={(e) => setVerifyEmail(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="verifyEmail" className={`text-sm leading-tight ${emailValid ? 'text-gray-700 cursor-pointer' : 'text-gray-400'}`}>
                    Mark Email as Verified
                    {!emailValid && editedEmail && (
                      <span className="block text-xs text-red-500 mt-0.5">Enter a valid email first (e.g. user@example.com)</span>
                    )}
                    {!editedEmail && (
                      <span className="block text-xs text-gray-400 mt-0.5">Enter an email address above to enable this</span>
                    )}
                  </label>
                </div>
              </div>

              {/* Phone field */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <FaPhone className="text-gray-400 text-xs" /> Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={editedPhone}
                    onChange={handlePhoneChange}
                    onInput={(e) => e.target.value = formatKenyanPhoneInput(e.target.value)}
                    maxLength={13}
                    className={`w-full px-4 py-2.5 pr-10 border rounded-lg text-sm focus:ring-2 transition-colors ${
                      editedPhone
                        ? phoneValid
                          ? 'border-green-400 focus:ring-green-400 bg-green-50'
                          : 'border-red-400 focus:ring-red-400 bg-red-50'
                        : 'border-gray-300 focus:ring-indigo-500'
                    }`}
                    placeholder="+254712345678 or 0712345678"
                  />
                  {editedPhone && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${phoneValid ? 'text-green-500' : 'text-red-400'}`}>
                      {phoneValid ? <FaCheckCircle /> : <FaExclamationTriangle />}
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-2 mt-1">
                  <input
                    type="checkbox"
                    id="verifyPhone"
                    checked={verifyPhone}
                    disabled={!phoneValid}
                    onChange={(e) => setVerifyPhone(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="verifyPhone" className={`text-sm leading-tight ${phoneValid ? 'text-gray-700 cursor-pointer' : 'text-gray-400'}`}>
                    Mark Phone as Verified
                    {!phoneValid && editedPhone && (
                      <span className="block text-xs text-red-500 mt-0.5">Enter a valid Kenyan number first (+254... or 07...)</span>
                    )}
                    {!editedPhone && (
                      <span className="block text-xs text-gray-400 mt-0.5">Enter a phone number above to enable this</span>
                    )}
                  </label>
                </div>
              </div>

              {verifyError && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <FaExclamationTriangle className="shrink-0 mt-0.5" />
                  {verifyError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={verifying || !canSubmit}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium flex justify-center items-center gap-2 transition-colors"
                >
                  {verifying
                    ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white" />
                    : <FaCheck className="text-xs" />}
                  Update & Verify
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminForceVerifyModal;
