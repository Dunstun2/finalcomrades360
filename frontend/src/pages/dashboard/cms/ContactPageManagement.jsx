import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Mail, Phone, MapPin, Zap, Clock, Globe, Plus, Trash2, Edit2, X } from 'lucide-react';
import { FaTiktok, FaFacebook, FaWhatsapp, FaInstagram, FaYoutube, FaTwitter, FaLinkedin, FaTelegram, FaSnapchat, FaPinterest } from 'react-icons/fa';
import api from '../../../shared/services/api';
import { toast } from 'react-toastify';

// Predefined social media platforms
const SOCIAL_PLATFORMS = [
  { value: 'tiktok', label: 'TikTok', icon: FaTiktok, type: 'url', placeholder: 'https://tiktok.com/@username' },
  { value: 'facebook', label: 'Facebook', icon: FaFacebook, type: 'url', placeholder: 'https://facebook.com/username' },
  { value: 'whatsapp', label: 'WhatsApp', icon: FaWhatsapp, type: 'phone', placeholder: '+254757588385' },
  { value: 'instagram', label: 'Instagram', icon: FaInstagram, type: 'url', placeholder: 'https://instagram.com/username' },
  { value: 'youtube', label: 'YouTube', icon: FaYoutube, type: 'url', placeholder: 'https://youtube.com/@channel' },
  { value: 'twitter', label: 'Twitter/X', icon: FaTwitter, type: 'url', placeholder: 'https://twitter.com/username' },
  { value: 'linkedin', label: 'LinkedIn', icon: FaLinkedin, type: 'url', placeholder: 'https://linkedin.com/in/username' },
  { value: 'telegram', label: 'Telegram', icon: FaTelegram, type: 'phone', placeholder: '+254757588385 or @username' },
  { value: 'snapchat', label: 'Snapchat', icon: FaSnapchat, type: 'url', placeholder: 'https://snapchat.com/add/username' },
  { value: 'pinterest', label: 'Pinterest', icon: FaPinterest, type: 'url', placeholder: 'https://pinterest.com/username' },
  { value: 'custom', label: 'Custom', icon: Globe, type: 'url', placeholder: 'Enter custom URL' }
];

export default function ContactPageManagement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [geocoding, setGeocoding] = useState(false);

  const [contactData, setContactData] = useState({
    email: '',
    phone: '',
    location: '',
    availabilityText: 'Open to selected opportunities and collaborations',
    pageTitle: 'Get In Touch',
    pageSubtitle: 'Have a project, opportunity, or idea? I\'d be happy to hear from you.',
    socialMediaLinks: [],
    responseTimeText: 'I typically respond within 1-2 business days.',
    googleMapsEmbedUrl: '',
    // Enhanced location fields
    country: 'Kenya',
    city: '',
    address: '',
    latitude: '',
    longitude: ''
  });

  const [newSocialItem, setNewSocialItem] = useState({
    platform: 'tiktok',
    customName: '',
    value: ''
  });

  useEffect(() => {
    fetchContactData();
  }, []);

  const fetchContactData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cms/contact');
      if (response.data?.content) {
        setContactData(response.data.content);
      }
    } catch (error) {
      console.error('Error fetching contact data:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to load contact page data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setContactData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddSocialMedia = () => {
    if (!newSocialItem.value.trim()) {
      toast.error('Please enter a value');
      return;
    }

    const selectedPlatform = SOCIAL_PLATFORMS.find(p => p.value === newSocialItem.platform);

    const newItem = {
      id: Date.now(),
      platform: newSocialItem.platform,
      name: newSocialItem.platform === 'custom' && newSocialItem.customName
        ? newSocialItem.customName
        : selectedPlatform.label,
      value: newSocialItem.value,
      type: selectedPlatform.type,
      icon: selectedPlatform.value
    };

    if (editingIndex !== null) {
      const updated = [...contactData.socialMediaLinks];
      updated[editingIndex] = newItem;
      setContactData(prev => ({ ...prev, socialMediaLinks: updated }));
      setEditingIndex(null);
      toast.success('Social media link updated!');
    } else {
      setContactData(prev => ({
        ...prev,
        socialMediaLinks: [...prev.socialMediaLinks, newItem]
      }));
      toast.success('Social media link added!');
    }

    setNewSocialItem({ platform: 'tiktok', customName: '', value: '' });
    setShowAddModal(false);
  };

  const handleEditSocialMedia = (index) => {
    const item = contactData.socialMediaLinks[index];
    setNewSocialItem({
      platform: item.platform,
      customName: item.platform === 'custom' ? item.name : '',
      value: item.value
    });
    setEditingIndex(index);
    setShowAddModal(true);
  };

  const handleDeleteSocialMedia = (index) => {
    if (window.confirm('Are you sure you want to delete this social media link?')) {
      setContactData(prev => ({
        ...prev,
        socialMediaLinks: prev.socialMediaLinks.filter((_, i) => i !== index)
      }));
      toast.success('Social media link deleted!');
    }
  };

  const getIconComponent = (platformValue) => {
    const platform = SOCIAL_PLATFORMS.find(p => p.value === platformValue);
    return platform ? platform.icon : Globe;
  };

  const handleGeocodeAddress = async () => {
    const fullAddress = `${contactData.address}, ${contactData.city}, ${contactData.country}`;

    if (!contactData.address && !contactData.city) {
      toast.error('Please enter at least a city or address first');
      return;
    }

    try {
      setGeocoding(true);

      // Using Google Geocoding API via a public endpoint
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=YOUR_GOOGLE_API_KEY`
      );

      if (!response.ok) {
        // Fallback: Use Nominatim (OpenStreetMap) which doesn't require API key
        const nominatimResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`
        );

        const nominatimData = await nominatimResponse.json();

        if (nominatimData && nominatimData.length > 0) {
          const { lat, lon } = nominatimData[0];
          setContactData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lon
          }));
          toast.success('Coordinates found successfully!');
        } else {
          toast.error('Could not find coordinates for this address');
        }
      } else {
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry.location;
          setContactData(prev => ({
            ...prev,
            latitude: lat.toString(),
            longitude: lng.toString()
          }));
          toast.success('Coordinates found successfully!');
        } else {
          toast.error('Could not find coordinates for this address');
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Failed to fetch coordinates. Please enter them manually.');
    } finally {
      setGeocoding(false);
    }
  };

  const extractDataFromMapsUrl = async (url) => {
    if (!url || url.trim() === '') {
      toast.error('Please paste a Google Maps URL first');
      return;
    }

    try {
      setGeocoding(true);

      // Extract coordinates from various Google Maps URL formats
      let lat = null;
      let lng = null;

      // Format 1: !3d-1.2864!4d36.8219 (embed URL format)
      const embedMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
      if (embedMatch) {
        lat = embedMatch[1];
        lng = embedMatch[2];
      }

      // Format 2: @-1.2864,36.8219 (share URL format)
      const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (atMatch && !lat) {
        lat = atMatch[1];
        lng = atMatch[2];
      }

      // Format 3: q=-1.2864,36.8219 (query format)
      const qMatch = url.match(/q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (qMatch && !lat) {
        lat = qMatch[1];
        lng = qMatch[2];
      }

      // Format 4: ll=-1.2864,36.8219 (ll parameter)
      const llMatch = url.match(/ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (llMatch && !lat) {
        lat = llMatch[1];
        lng = llMatch[2];
      }

      if (lat && lng) {
        // Convert to embed URL format
        const embedUrl = `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d15000!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2s!4v${Date.now()}`;

        // Now reverse geocode to get address details
        try {
          const nominatimResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );

          const locationData = await nominatimResponse.json();

          if (locationData && locationData.address) {
            const addr = locationData.address;

            // OVERRIDE all location data with new values INCLUDING the converted embed URL
            const updates = {
              latitude: lat,
              longitude: lng,
              country: addr.country || '',
              city: addr.city || addr.town || addr.village || addr.county || '',
              address: '',
              googleMapsEmbedUrl: embedUrl // Convert URL to embed format
            };

            // Build address from available components
            const addressParts = [
              addr.road,
              addr.suburb,
              addr.neighbourhood
            ].filter(Boolean);

            if (addressParts.length > 0) {
              updates.address = addressParts.join(', ');
            }

            // Apply all updates (overriding existing data)
            setContactData(prev => ({
              ...prev,
              ...updates
            }));

            toast.success('✅ Location data applied with embed URL! Review the fields below, then click "Save All Changes".');
          } else {
            // Only update coordinates and URL if reverse geocoding fails
            setContactData(prev => ({
              ...prev,
              latitude: lat,
              longitude: lng,
              googleMapsEmbedUrl: embedUrl
            }));
            toast.success('Coordinates extracted and URL converted! Please fill in address details manually.');
          }
        } catch (reverseGeoError) {
          console.error('Reverse geocoding error:', reverseGeoError);
          setContactData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            googleMapsEmbedUrl: embedUrl
          }));
          toast.warning('Coordinates extracted and URL converted! Address details may need to be entered manually.');
        }
      } else {
        toast.error('Could not extract coordinates from URL. Please paste a valid Google Maps URL.');
      }
    } catch (error) {
      console.error('Error extracting data from maps URL:', error);
      toast.error('Failed to extract data from URL');
    } finally {
      setGeocoding(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post('/cms/contact', contactData);
      toast.success('Contact page updated successfully!');
    } catch (error) {
      console.error('Error saving contact data:', error);
      toast.error('Failed to save contact page');
    } finally {
      setSaving(false);
    }
  };

  const selectedPlatform = SOCIAL_PLATFORMS.find(p => p.value === newSocialItem.platform);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contact page data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/cms')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Contact Page Management</h1>
              <p className="text-gray-600 mt-1">Manage contact information and social media links</p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="space-y-6">
          {/* Page Header Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Page Header
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Title
                </label>
                <input
                  type="text"
                  value={contactData.pageTitle}
                  onChange={(e) => handleChange('pageTitle', e.target.value)}
                  placeholder="Get In Touch"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Subtitle
                </label>
                <textarea
                  value={contactData.pageSubtitle}
                  onChange={(e) => handleChange('pageSubtitle', e.target.value)}
                  rows="2"
                  placeholder="Have a project, opportunity, or idea?..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Get In Touch Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Get In Touch Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={contactData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="hello@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={contactData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+254757588385"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </label>
                <input
                  type="text"
                  value={contactData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="Nairobi, Kenya"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Availability Text
                </label>
                <input
                  type="text"
                  value={contactData.availabilityText}
                  onChange={(e) => handleChange('availabilityText', e.target.value)}
                  placeholder="Open to selected opportunities and collaborations"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Find Me Online Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                Find Me Online - Social Media Links
              </h2>

              <button
                onClick={() => {
                  setNewSocialItem({ platform: 'tiktok', customName: '', value: '' });
                  setEditingIndex(null);
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add Social Media
              </button>
            </div>

            {contactData.socialMediaLinks.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No social media links added yet</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Link
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {contactData.socialMediaLinks.map((item, index) => {
                  const IconComponent = getIconComponent(item.platform);
                  return (
                    <div
                      key={item.id || index}
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <IconComponent className="w-6 h-6 text-gray-700" />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-600 truncate">{item.value}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditSocialMedia(index)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSocialMedia(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Response Time Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Response Time Message
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Response Time Text
              </label>
              <input
                type="text"
                value={contactData.responseTimeText}
                onChange={(e) => handleChange('responseTimeText', e.target.value)}
                placeholder="I typically respond within 1-2 business days."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Google Maps Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Location & Google Maps Integration
            </h2>

            <div className="space-y-4">
              {/* Country Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <select
                  value={contactData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Kenya">Kenya</option>
                  <option value="Uganda">Uganda</option>
                  <option value="Tanzania">Tanzania</option>
                  <option value="Rwanda">Rwanda</option>
                  <option value="Ethiopia">Ethiopia</option>
                  <option value="South Africa">South Africa</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="Ghana">Ghana</option>
                  <option value="Egypt">Egypt</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* City/Town */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City / Town
                </label>
                <input
                  type="text"
                  value={contactData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="e.g., Nairobi, Mombasa, Kampala"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address / Area
                </label>
                <input
                  type="text"
                  value={contactData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="e.g., University Way, CBD"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* GPS Coordinates */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    GPS Coordinates (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={handleGeocodeAddress}
                    disabled={geocoding || (!contactData.address && !contactData.city)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MapPin className="w-4 h-4" />
                    {geocoding ? 'Finding...' : 'Get Coordinates'}
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Latitude
                    </label>
                    <input
                      type="text"
                      value={contactData.latitude}
                      onChange={(e) => handleChange('latitude', e.target.value)}
                      placeholder="e.g., -1.2864"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Longitude
                    </label>
                    <input
                      type="text"
                      value={contactData.longitude}
                      onChange={(e) => handleChange('longitude', e.target.value)}
                      placeholder="e.g., 36.8219"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  💡 Click "Get Coordinates" to automatically fetch latitude and longitude from your address, or enter them manually
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-6"></div>

              {/* Google Maps Embed URL */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Google Maps Embed URL (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => extractDataFromMapsUrl(contactData.googleMapsEmbedUrl)}
                    disabled={!contactData.googleMapsEmbedUrl || geocoding}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    <MapPin className="w-4 h-4" />
                    {geocoding ? 'Applying...' : 'Apply URL Data'}
                  </button>
                </div>
                <textarea
                  value={contactData.googleMapsEmbedUrl}
                  onChange={(e) => handleChange('googleMapsEmbedUrl', e.target.value)}
                  rows="3"
                  placeholder="Paste any Google Maps URL here - then click 'Apply URL Data' to auto-fill location details!"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 mb-2">🎯 How to use:</p>
                  <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Go to <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Google Maps</a></li>
                    <li>Search for your location</li>
                    <li>Click <strong>"Share"</strong> → <strong>"Embed a map"</strong></li>
                    <li>Copy and paste the embed URL in the field above</li>
                    <li>Click <strong>"Apply URL Data"</strong> button to auto-fill all location fields</li>
                    <li>Review the auto-filled data, then click <strong>"Save All Changes"</strong> at the bottom</li>
                  </ol>
                </div>
              </div>

              {/* Preview Link */}
              {(contactData.city || contactData.address) && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(
                      `${contactData.address}, ${contactData.city}, ${contactData.country}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                  >
                    <MapPin className="w-4 h-4" />
                    Search on Google Maps
                  </a>

                  {contactData.latitude && contactData.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${contactData.latitude},${contactData.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                    >
                      <MapPin className="w-4 h-4" />
                      View Pinned Location
                    </a>
                  )}
                </div>
              )}

              {/* Map Preview */}
              {contactData.latitude && contactData.longitude && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">📍 Location Preview</p>
                  <div className="aspect-video w-full rounded-lg overflow-hidden border border-gray-300">
                    <iframe
                      src={`https://maps.google.com/maps?q=${contactData.latitude},${contactData.longitude}&z=15&output=embed`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen=""
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Location Preview"
                    ></iframe>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Preview of your pinned location: {contactData.latitude}, {contactData.longitude}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold text-lg"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {/* Add/Edit Social Media Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">
                {editingIndex !== null ? 'Edit Social Media Link' : 'Add Social Media Link'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingIndex(null);
                  setNewSocialItem({ platform: 'tiktok', customName: '', value: '' });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Platform
                </label>
                <select
                  value={newSocialItem.platform}
                  onChange={(e) => setNewSocialItem({ ...newSocialItem, platform: e.target.value, customName: '' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {SOCIAL_PLATFORMS.map(platform => (
                    <option key={platform.value} value={platform.value}>
                      {platform.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Name Field (only for custom platform) */}
              {newSocialItem.platform === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Platform Name
                  </label>
                  <input
                    type="text"
                    value={newSocialItem.customName}
                    onChange={(e) => setNewSocialItem({ ...newSocialItem, customName: e.target.value })}
                    placeholder="e.g., Discord, Reddit, etc."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Value Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedPlatform?.type === 'phone' ? 'Phone Number / Username' : 'URL'}
                </label>
                <input
                  type={selectedPlatform?.type === 'phone' ? 'text' : 'url'}
                  value={newSocialItem.value}
                  onChange={(e) => setNewSocialItem({ ...newSocialItem, value: e.target.value })}
                  placeholder={selectedPlatform?.placeholder}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {selectedPlatform?.type === 'phone' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Enter with country code for WhatsApp/Telegram (e.g., +254757588385)
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingIndex(null);
                    setNewSocialItem({ platform: 'tiktok', customName: '', value: '' });
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSocialMedia}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  {editingIndex !== null ? 'Update' : 'Add'} Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
