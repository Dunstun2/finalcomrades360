import React, { useState, useEffect, useCallback } from 'react';
import {
  FaUser, FaLock, FaEye, FaEyeSlash, FaCalendarAlt, FaPhone,
  FaEnvelope, FaIdCard, FaEdit, FaSave, FaTimes, FaShare,
  FaGoogle, FaFacebook, FaShieldAlt, FaClock, FaLaptop,
  FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaCopy,
  FaCopy as FaCopyIcon, FaSpinner, FaChevronDown, FaChevronUp,
  FaGlobe, FaUserSecret, FaLink, FaMobile, FaDesktop, FaQuestionCircle
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import userService from '../services/userService';

const ProfileComponent = ({
  userData,
  setUserData,
  isEditing,
  setIsEditing,
  editForm,
  setEditForm,
  loading,
  onSaveProfile,
  isSaved,
  setIsSaved,
  setActiveTab
}) => {
  console.log('ProfileComponent Prop [userData]:', userData);
  const { user: authUser, updateUser } = useAuth();
  const [activeSection, setActiveSection] = useState('personal');

  // Calculate profile completion percentage

  // Calculate profile completion percentage
  const calculateProfileCompletion = () => {
    if (!userData) return 0;

    const fields = ['username', 'email', 'phone', 'gender', 'dateOfBirth', 'bio'];
    const completedFields = fields.filter(field => userData[field] && userData[field].trim() !== '');
    return Math.round((completedFields.length / fields.length) * 100);
  };

  // Handle form field changes
  const handleInputChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  // Copy state for visual feedback
  const [copied, setCopied] = useState(false);

  // Copy referral link – works on mobile too (clipboard API fallback)
  const copyReferralLink = () => {
    if (!userData?.referralCode) {
      toast.error('Referral code not available');
      return;
    }
    const text = userData.referralCode;
    const tryClipboard = () => {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
      }
      // Fallback for non-HTTPS / older mobile browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok ? Promise.resolve() : Promise.reject();
    };
    tryClipboard()
      .then(() => {
        toast.success('Referral code copied!');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error('Copy failed – please copy manually.'));
  };

  // Social share
  const shareReferral = (platform) => {
    if (!userData?.referralCode) {
      toast.error('Referral code not available');
      return;
    }
    const referralLink = `${window.location.origin}/register?ref=${userData.referralCode}`;
    const text = `Join me on this amazing platform! Use my referral code: ${userData.referralCode}`;

    let shareUrl = '';
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + referralLink)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank');
    }
  };

  // Navigation tabs for profile sections
  const profileTabs = [
    { id: 'personal', name: 'Personal Info', icon: <FaUser className="mr-2" /> },
    { id: 'account', name: 'Account Details', icon: <FaIdCard className="mr-2" /> },
    { id: 'security', name: 'Security', icon: <FaLock className="mr-2" /> },
    { id: 'login-history', name: 'Login History', icon: <FaClock className="mr-2" /> }
  ];

  // Don't render if userData is not loaded
  if (!userData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <FaSpinner className="animate-spin text-3xl text-blue-600 mx-auto mb-4" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Profile Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
            <p className="text-sm text-gray-600 mt-1">Manage your personal information and account settings</p>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4">
            {/* Profile Completion Bar */}
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Profile Completion</div>
              <div className="w-28 sm:w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${calculateProfileCompletion()}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">{calculateProfileCompletion()}% Complete</div>
            </div>
            <button
              onClick={() => {
                if (isEditing) {
                  if (isSaved) {
                    setIsSaved(false);
                  } else {
                    setIsEditing(false);
                    setEditForm({});
                    if (setIsSaved) setIsSaved(false);
                  }
                } else {
                  setEditForm(userData || {});
                  setIsEditing(true);
                  if (setIsSaved) setIsSaved(false);
                }
              }}
              className={`flex items-center px-3 py-2 text-white rounded-md hover:opacity-90 text-sm whitespace-nowrap ${isSaved ? 'bg-green-600' : 'bg-blue-600'}`}
            >
              {isEditing ? (
                isSaved ? (
                  <><FaEdit className="mr-1.5" />Edit Again</>
                ) : (
                  <><FaTimes className="mr-1.5" />Cancel</>
                )
              ) : (
                <><FaEdit className="mr-1.5" />Edit Profile</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Profile Navigation Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex px-4 sm:px-6 min-w-max sm:min-w-0">
          {profileTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'security' || tab.id === 'login-history') {
                  if (setActiveTab) setActiveTab('security');
                } else {
                  setActiveSection(tab.id);
                }
              }}
              className={`py-3 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center ${
                activeSection === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Content */}
      <div className="p-6">
        {/* Personal Info Section */}
        {activeSection === 'personal' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isSaved ? 'bg-gray-50 text-gray-500' : ''}`}
                    placeholder="Enter your full name"
                    disabled={isSaved}
                  />
                ) : (
                  <p className="text-gray-900 py-2">{userData.name || 'Not set'}</p>
                )}
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                {isEditing ? (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={editForm.username || ''}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isSaved ? 'bg-gray-50 text-gray-500' : ''}`}
                      placeholder="Enter your public username"
                      disabled={isSaved}
                    />
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      <FaInfoCircle /> Public identity used for reviews and forums.
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-900 py-2">{userData.username || 'Not set'}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between items-center">
                  Email Address
                  {!isEditing && (
                    userData.emailVerified ? (
                      <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <FaCheckCircle className="text-[8px]" /> VERIFIED
                      </span>
                    ) : (
                      <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <FaExclamationTriangle className="text-[8px]" /> UNVERIFIED
                      </span>
                    )
                  )}
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={editForm.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                    title="Email cannot be changed directly. Use the Security tab to verify/change email."
                  />
                ) : (
                  <p className="text-gray-900 py-2 border-b border-transparent">{userData.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between items-center">
                  Phone Number
                  {!isEditing && (
                    userData.phoneVerified ? (
                      <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <FaCheckCircle className="text-[8px]" /> VERIFIED
                      </span>
                    ) : (
                      <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <FaExclamationTriangle className="text-[8px]" /> UNVERIFIED
                      </span>
                    )
                  )}
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={editForm.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${isSaved ? 'bg-gray-50 text-gray-500' : ''}`}
                    disabled={isSaved}
                  />
                ) : (
                  <p className="text-gray-900 py-2 border-b border-transparent">{userData.phone || 'Not set'}</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                {isEditing ? (
                  <select
                    value={editForm.gender || ''}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isSaved ? 'bg-gray-50 text-gray-500' : ''}`}
                    disabled={isSaved}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                ) : (
                  <p className="text-gray-900 py-2">{userData.gender || 'Not set'}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editForm.dateOfBirth || ''}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isSaved ? 'bg-gray-50 text-gray-500' : ''}`}
                    disabled={isSaved}
                  />
                ) : (
                  <p className="text-gray-900 py-2">
                    {userData.dateOfBirth ? new Date(userData.dateOfBirth).toLocaleDateString() : 'Not set'}
                  </p>
                )}
              </div>

              {/* Profile Visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Visibility
                </label>
                {isEditing ? (
                  <select
                    value={editForm.profileVisibility || 'public'}
                    onChange={(e) => handleInputChange('profileVisibility', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                ) : (
                  <div className="flex items-center py-2">
                    {userData.profileVisibility === 'public' ? (
                      <FaGlobe className="text-green-600 mr-2" />
                    ) : (
                      <FaUserSecret className="text-gray-600 mr-2" />
                    )}
                    <span className="text-gray-900 capitalize">{userData.profileVisibility}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bio */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                About / Bio
              </label>
              {isEditing ? (
                <textarea
                  value={editForm.bio || ''}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isSaved ? 'bg-gray-50 text-gray-500' : ''}`}
                  placeholder="Tell us about yourself..."
                  disabled={isSaved}
                />
              ) : (
                <p className="text-gray-900 py-2 min-h-[2rem]">
                  {userData.bio || 'No bio provided'}
                </p>
              )}
            </div>

            {/* Save Button */}
            {isEditing && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={onSaveProfile}
                  disabled={loading.profile}
                  className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading.profile ? (
                    <FaSpinner className="animate-spin mr-2" />
                  ) : isSaved ? (
                    <FaCheckCircle className="mr-2" />
                  ) : (
                    <FaSave className="mr-2" />
                  )}
                  {isSaved ? 'Saved' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Account Details Section */}
        {activeSection === 'account' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approved Roles
                </label>
                <div className="flex flex-wrap gap-2 py-1">
                  {(userData?.roles || [userData?.role || 'customer']).map((role, index) => (
                    <div key={index} className="flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100 italic font-medium text-xs">
                      <FaShieldAlt className="mr-1.5 text-[10px]" />
                      {role.replace('_', ' ').toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>

              {/* Last Profile Update */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Profile Update
                </label>
                <div className="flex items-center py-2">
                  <FaClock className="text-gray-600 mr-3" />
                  <span className="text-gray-900">
                    {userData?.updatedAt ? new Date(userData.updatedAt).toLocaleDateString() : 'Never updated'}
                  </span>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-3 rounded-full text-blue-600 shrink-0">
                      <FaLock />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Security & Password</h4>
                      <p className="text-sm text-gray-500">Manage your password and 2FA settings</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab && setActiveTab('security')}
                    className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors text-sm shadow-lg shadow-blue-100"
                  >
                    Update Security
                  </button>
                </div>
              </div>

              {/* Referral Code */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Referral Code
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md overflow-hidden">
                    <span className="font-mono text-base sm:text-lg font-bold text-blue-600 break-all">{userData?.referralCode || 'Not available'}</span>
                  </div>
                  <button
                    onClick={copyReferralLink}
                    className={`flex items-center justify-center px-4 py-2 rounded-md text-white text-sm transition-colors ${
                      copied ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                    disabled={!userData?.referralCode}
                  >
                    <FaCopyIcon className="mr-2" />
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">Share this code to earn rewards when friends join!</p>

                {/* Social Share */}
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Share on:</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => shareReferral('facebook')}
                      className="flex items-center px-3 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900 text-sm"
                      disabled={!userData?.referralCode}
                    >
                      <FaFacebook className="mr-1.5" />
                      Facebook
                    </button>
                    <button
                      onClick={() => shareReferral('twitter')}
                      className="flex items-center px-3 py-2 bg-blue-400 text-white rounded-md hover:bg-blue-500 text-sm"
                      disabled={!userData?.referralCode}
                    >
                      <FaShare className="mr-1.5" />
                      Twitter
                    </button>
                    <button
                      onClick={() => shareReferral('whatsapp')}
                      className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      disabled={!userData?.referralCode}
                    >
                      <FaShare className="mr-1.5" />
                      WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security and Login History sections are now handled in the main AccountSettings 'Security' tab */}
      </div>
    </div>
  );
};

export default ProfileComponent;