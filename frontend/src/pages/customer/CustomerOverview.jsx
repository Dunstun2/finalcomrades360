import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  FaWhatsapp,
  FaFacebook,
  FaTwitter,
  FaTelegram,
  FaEnvelope,
  FaSms,
  FaLinkedin,
  FaReddit,
  FaCopy,
  FaUser,
  FaEdit
} from 'react-icons/fa';
import AccountStats from '../../components/AccountStats';
import userService from '../../services/userService';

export default function CustomerOverview() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [walletBalance, setWalletBalance] = useState(0)
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [includeLink, setIncludeLink] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [copiedType, setCopiedType] = useState('') // '' | 'code' | 'link'

  useEffect(() => {
    let mounted = true
    const fetchData = async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        const [user, balance] = await Promise.all([
          userService.getFullProfile(),
          userService.getWalletBalance()
        ]);
        if (mounted) {
          setMe(user);
          setWalletBalance(balance);
        }
      } catch (error) {
        if (showLoading) console.error('Error fetching overview data:', error);
      } finally {
        if (mounted && showLoading) setLoading(false);
      }
    };

    fetchData(true);

    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    }
  }, [])

  const copy = (text, type = '') => {
    if (!text) return;
    
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
        setCopiedType(type);
        setTimeout(() => setCopiedType(''), 2000);
      })
      .catch((err) => {
        console.error('Copy failed:', err);
        // Silently fail or could add a toast if available
      });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match('image.*')) {
      alert('Please select an image file (JPEG, PNG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('profileImage', file);

    try {
      setIsUploading(true);
      const response = await api.patch('/users/me', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update the local state with the new image URL
      setMe(prev => ({
        ...prev,
        ...response.data.user
      }));

      alert('Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert(error.response?.data?.message || 'Failed to update profile picture');
    } finally {
      setIsUploading(false);
      // Reset the file input
      e.target.value = '';
    }
  }

  const shareVia = (platform) => {
    let message = `Join me on Comrades360! Use my referral code: ${referral}`

    // Include the link in the message if the checkbox is checked
    if (includeLink) {
      message += ` - ${referralLink}`
    }

    const encodedMessage = encodeURIComponent(message)
    const encodedLink = encodeURIComponent(referralLink)

    // For platforms that support both text and URL, we'll include both
    const shareUrls = {
      whatsapp: `https://wa.me/?text=${encodedMessage}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}&quote=${encodeURIComponent(message)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message + ' ')}&url=${encodedLink}`,
      telegram: `https://t.me/share/url?url=${encodedLink}&text=${encodeURIComponent(message)}`,
      email: `mailto:?subject=Join me on Comrades360!&body=${encodedMessage}`,
      sms: `sms:?body=${encodedMessage}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}&title=${encodeURIComponent('Join me on Comrades360!')}&summary=${encodeURIComponent(message)}`,
      reddit: `https://www.reddit.com/submit?url=${encodedLink}&title=${encodeURIComponent(message)}`
    }

    if (platform in shareUrls) {
      window.open(shareUrls[platform], '_blank', 'noopener,noreferrer')
    }
  }

  const name = me?.name || 'Your Name'
  const email = me?.email || 'you@example.com'
  const phone = me?.phone || '+254...'
  const referral = me?.referralCode || 'XXXX-XXXX'
  const referralLink = `${window.location.origin}?ref=${encodeURIComponent(referral)}`
  const shareText = encodeURIComponent(`Join me on Comrades360! Use my referral: ${referral} ${referralLink}`)

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Profile Overview</h2>
      <div className="card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-3xl overflow-hidden cursor-pointer shadow-md border-2 border-white">
                {me?.profileImage ? (
                  <img
                    src={me.profileImage}
                    alt={name}
                    className="w-full h-full rounded-full object-cover group-hover:opacity-80 transition-opacity"
                  />
                ) : (
                  <FaUser className="text-gray-500 text-2xl group-hover:opacity-80 transition-opacity" />
                )}
                <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="profile-photo-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="profile-photo-upload"
                className="absolute inset-0 cursor-pointer"
                title="Change profile photo"
              />
            </div>
            <div className="flex-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-lg text-gray-900">{name}</div>
                <div className="text-sm text-gray-600 break-all">{email}</div>
                <div className="text-sm text-gray-500">{phone}</div>
              </div>
              <button
                onClick={() => navigate('/customer/settings', { state: { isEditing: true } })}
                className="w-full sm:w-auto px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-bold"
              >
                <FaEdit /> Edit Profile
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <AccountStats userData={me} walletBalance={walletBalance} />

      {/* Referral Section */}
      <div className="card p-4 sm:p-6">
        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-4">Share and Earn</h3>

        {/* Referral Code */}
        <div className="mb-4">
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Your Referral Code</label>
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <code className="px-3 py-3 bg-gray-50 rounded-xl text-sm font-black font-mono border border-gray-100 flex-1 text-blue-600 tracking-widest text-center sm:text-left">
              {referral}
            </code>
            <button
              onClick={() => copy(referral, 'code')}
              className={`px-4 py-3 rounded-xl font-bold transition-all text-xs uppercase tracking-widest flex items-center gap-2 justify-center sm:min-w-[120px] ${
                copiedType === 'code' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              {copiedType === 'code' ? (
                <>✓ Copied</>
              ) : (
                <><FaCopy /> Copy Code</>
              )}
            </button>
          </div>
        </div>

        {/* Referral Link */}
        <div className="mb-6">
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Your Referral Link</label>
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <code className="px-3 py-3 bg-gray-50 rounded-xl text-[10px] break-all font-mono border border-gray-100 flex-1 flex items-center justify-center sm:justify-start">
              {referralLink}
            </code>
            <button
              onClick={() => copy(referralLink, 'link')}
              className={`px-4 py-3 rounded-xl font-bold transition-all text-xs uppercase tracking-widest flex items-center gap-2 justify-center sm:min-w-[120px] ${
                copiedType === 'link' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              {copiedType === 'link' ? (
                <>✓ Copied</>
              ) : (
                <><FaCopy /> Copy Link</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
