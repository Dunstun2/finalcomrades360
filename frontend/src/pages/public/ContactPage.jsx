import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Zap, Send, Check } from 'lucide-react';
import {
  FaTiktok,
  FaFacebook,
  FaWhatsapp,
  FaInstagram,
  FaYoutube,
  FaTwitter,
  FaLinkedin,
  FaTelegram,
  FaSnapchat,
  FaPinterest,
  FaGlobe
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatform } from '../../contexts/PlatformContext';
import api from '../../shared/services/api';
import Footer from '../../shared/components/Footer';

const ContactPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = usePlatform();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cmsLoading, setCmsLoading] = useState(true);
  const [contactInfo, setContactInfo] = useState(null);
  const [phoneError, setPhoneError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    phoneNumber: '',
    message: ''
  });

  // Phone validation and formatting helper
  const formatKenyanPhone = (phone) => {
    if (!phone) return '';

    // Remove all non-digit characters
    let digits = phone.replace(/\D/g, '');

    // Handle different Kenyan number formats
    // Format 1: 0712345678 (10 digits starting with 0)
    if (digits.length === 10 && digits.startsWith('0')) {
      digits = '254' + digits.substring(1);
    }
    // Format 2: 712345678 (9 digits without leading 0)
    else if (digits.length === 9) {
      digits = '254' + digits;
    }
    // Format 3: 254712345678 (already in international format)
    else if (digits.length === 12 && digits.startsWith('254')) {
      // Already correct
    }
    // Format 4: +254712345678 (with + sign)
    else if (phone.startsWith('+254')) {
      digits = digits.substring(0, 12); // Ensure it's exactly 12 digits
    }

    return digits;
  };

  const validateKenyanPhone = (phone) => {
    if (!phone) return true; // Optional field

    const formatted = formatKenyanPhone(phone);

    // Check if it's a valid Kenyan number (254 + 9 digits)
    if (formatted.length === 12 && formatted.startsWith('254')) {
      const localPart = formatted.substring(3);
      // Valid Kenyan prefixes: 7XX, 1XX (Safaricom, Airtel, Telkom)
      if (localPart.match(/^[71]\d{8}$/)) {
        return true;
      }
    }

    return false;
  };

  // Fetch CMS contact data
  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        setCmsLoading(true);
        const response = await api.get('/cms/contact');
        if (response.data?.content) {
          setContactInfo(response.data.content);
        }
      } catch (error) {
        // Silently fail - use fallback data
        // console.error('Error fetching contact info:', error);
      } finally {
        setCmsLoading(false);
      }
    };

    fetchContactInfo();
  }, []);

  // Autofill name and email if user is logged in
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value
    });

    // Validate phone number on change
    if (name === 'phoneNumber') {
      if (value && !validateKenyanPhone(value)) {
        setPhoneError('Please enter a valid Kenyan phone number');
      } else {
        setPhoneError('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate phone if provided
    if (formData.phoneNumber && !validateKenyanPhone(formData.phoneNumber)) {
      setPhoneError('Please enter a valid Kenyan phone number');
      return;
    }

    setLoading(true);

    try {
      // Format phone number before sending
      const submitData = {
        ...formData,
        phoneNumber: formData.phoneNumber ? '+' + formatKenyanPhone(formData.phoneNumber) : ''
      };

      await api.post('/contact', submitData);
      setSuccess(true);

      // Reset form but keep name/email if logged in
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        subject: '',
        phoneNumber: '',
        message: ''
      });
      setPhoneError('');

      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      console.error('Contact form error:', error);
      alert(error.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get contact info from CMS or fallback to settings
  const supportEmail = contactInfo?.email || settings.platform?.supportEmail || 'hello@dunstun@gmail.com';
  const supportPhone = contactInfo?.phone || settings.platform?.supportPhone || '+254757588385';
  const location = contactInfo?.location || `${contactInfo?.city || ''}${contactInfo?.city && contactInfo?.country ? ', ' : ''}${contactInfo?.country || ''}` || settings.platform?.location || 'Nairobi, Kenya';
  const pageTitle = contactInfo?.pageTitle || 'Get In Touch';
  const pageSubtitle = contactInfo?.pageSubtitle || 'Have a project, opportunity, or idea? I\'d be happy to hear from you.';
  const availabilityText = contactInfo?.availabilityText || 'Open to selected opportunities and collaborations';
  const responseTimeText = contactInfo?.responseTimeText || 'I typically respond within 1-2 business days.';
  const socialMediaLinks = contactInfo?.socialMediaLinks || [];
  const googleMapsEmbedUrl = contactInfo?.googleMapsEmbedUrl || null;

  // Helper to get social media icon component
  const getSocialIcon = (platform) => {
    const iconMap = {
      tiktok: FaTiktok,
      facebook: FaFacebook,
      whatsapp: FaWhatsapp,
      instagram: FaInstagram,
      youtube: FaYoutube,
      twitter: FaTwitter,
      linkedin: FaLinkedin,
      telegram: FaTelegram,
      snapchat: FaSnapchat,
      pinterest: FaPinterest,
      custom: FaGlobe,
    };

    const Icon = iconMap[platform?.toLowerCase()] || FaGlobe;
    return <Icon className="w-5 h-5" />;
  };

  // Helper to format social media URL
  const formatSocialUrl = (item) => {
    if (!item.value) return '#';

    // If it's a phone type (WhatsApp, Telegram), format as WhatsApp URL
    if (item.type === 'phone' && item.platform === 'whatsapp') {
      const cleanPhone = item.value.replace(/\D/g, '');
      return `https://wa.me/${cleanPhone}`;
    }

    // For other types, return the value as-is (should be a URL)
    return item.value;
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Title with Back Button */}
        <div className="flex items-center justify-between mb-16">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium hidden sm:inline">Back</span>
          </button>

          <div className="text-center flex-1">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              <span className="text-orange-500">Get In</span>{' '}
              <span className="text-gray-900">Touch</span>
            </h1>
            <p className="text-gray-600 text-lg">
              {pageSubtitle}
            </p>
          </div>

          {/* Spacer for symmetry */}
          <div className="w-[100px] sm:w-[120px]"></div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Side - Contact Info */}
          <div className="space-y-8">
            {/* Get In Touch Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-6">
                <span className="text-orange-500">Get In</span>{' '}
                <span className="text-white">Touch</span>
              </h2>

              <div className="space-y-6">
                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="bg-blue-600 p-3 rounded-lg shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm text-gray-400 uppercase mb-1">EMAIL</h3>
                    <a
                      href={`mailto:${supportEmail}`}
                      className="text-white hover:text-blue-400 transition-colors"
                    >
                      {supportEmail}
                    </a>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="bg-blue-600 p-3 rounded-lg shrink-0">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm text-gray-400 uppercase mb-1">PHONE</h3>
                    <a
                      href={`tel:${supportPhone}`}
                      className="text-white hover:text-blue-400 transition-colors"
                    >
                      {supportPhone}
                    </a>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-4">
                  <div className="bg-blue-600 p-3 rounded-lg shrink-0">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm text-gray-400 uppercase mb-1">LOCATION</h3>
                    <p className="text-white">{location}</p>
                  </div>
                </div>

                {/* Availability */}
                <div className="flex items-start gap-4">
                  <div className="bg-green-600 p-3 rounded-lg shrink-0">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm text-gray-400 uppercase mb-1">AVAILABILITY</h3>
                    <p className="text-green-400 font-semibold">
                      {availabilityText}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Find Us Online Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-6">
                <span className="text-orange-500">Find Us</span>{' '}
                <span className="text-white">Online</span>
              </h2>

              <p className="text-gray-400 mb-6">
                Connect with me or explore my work across these platforms.
              </p>

              {socialMediaLinks.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                  {socialMediaLinks.map((item, index) => (
                    <a
                      key={item.id || index}
                      href={formatSocialUrl(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-white"
                    >
                      {getSocialIcon(item.platform)}
                      <span className="font-medium">{item.name || item.platform}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm italic">
                  No social media links configured yet. Check back soon!
                </p>
              )}
            </div>

            {/* Response Time Info */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
              <p className="text-gray-400 text-sm italic">
                {responseTimeText}
              </p>
            </div>
          </div>

          {/* Right Side - Contact Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">
              <span className="text-orange-500">Send a</span>{' '}
              <span className="text-white">Message</span>
            </h2>

            <p className="text-gray-400 mb-6">
              Feel free to drop a message, and I will get back to you as soon as possible.
            </p>

            {success ? (
              <div className="bg-green-600/20 border border-green-600 rounded-lg p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Message Sent!</h3>
                <p className="text-gray-300">
                  Thank you for reaching out. We'll get back to you soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2 uppercase">
                    Your Name <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2 uppercase">
                    Email Address <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. jb@gmail.com"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2 uppercase">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="e.g. Collaboration Proposal"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-300 mb-2 uppercase">
                    Phone Number <span className="text-gray-500 text-xs">(optional - for WhatsApp reply)</span>
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="e.g. 0712345678 or +254712345678"
                    className={`w-full px-4 py-3 bg-slate-800 border ${phoneError ? 'border-red-500' : 'border-slate-700'
                      } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                  />
                  {phoneError && (
                    <p className="text-red-400 text-xs mt-1">{phoneError}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    ✅ Accepts: 0712345678, 0110123456, 712345678, +254712345678, or 254712345678
                  </p>
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2 uppercase">
                    Message <span className="text-orange-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    value={formData.message}
                    onChange={handleChange}
                    rows="5"
                    placeholder="Type your message details here..."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                  ></textarea>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Google Maps Section */}
        {(googleMapsEmbedUrl || (contactInfo?.latitude && contactInfo?.longitude)) && (
          <div className="mt-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                <span className="text-orange-500">Find Us</span>{' '}
                <span className="text-gray-900">Here</span>
              </h2>
              <p className="text-gray-600">Visit our location or explore the area around us</p>
            </div>

            <div className="bg-gray-100 rounded-2xl overflow-hidden shadow-lg border border-gray-200">
              {googleMapsEmbedUrl ? (
                <iframe
                  src={googleMapsEmbedUrl}
                  width="100%"
                  height="450"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Our Location"
                  className="w-full"
                  onError={(e) => console.error('Map iframe error:', e)}
                ></iframe>
              ) : contactInfo?.latitude && contactInfo?.longitude ? (
                <iframe
                  src={`https://maps.google.com/maps?q=${contactInfo.latitude},${contactInfo.longitude}&z=15&output=embed`}
                  width="100%"
                  height="450"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Our Location"
                  className="w-full"
                  onError={(e) => console.error('Map iframe error:', e)}
                ></iframe>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ContactPage;
