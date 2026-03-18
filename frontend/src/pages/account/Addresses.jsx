import React, { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaUser, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import userService from '../../services/userService';
import { toast } from 'react-toastify';
import { validateKenyanPhone, PHONE_VALIDATION_ERROR } from '../../utils/validation';

const Addresses = ({ setActiveTab, cameFromVerification }) => {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);

  // Kenya counties list
  const kenyaCounties = [
    'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa', 'Homa Bay',
    'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii',
    'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera',
    'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang\'a', 'Nairobi City', 'Nakuru',
    'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta',
    'Tana River', 'Tharaka-Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga',
    'Wajir', 'West Pokot'
  ];

  // Form states
  const [basicAddress, setBasicAddress] = useState({
    name: '',
    email: '',
    phone: '',
    additionalPhone: ''
  });

  const [customerAddress, setCustomerAddress] = useState({
    county: '',
    town: '',
    estate: '',
    houseNumber: ''
  });

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        const profile = await userService.getProfile();
        setUserData(profile);

        // Populate basic address form
        setBasicAddress({
          name: profile.name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          additionalPhone: profile.additionalPhone || ''
        });

        // Populate customer address form
        setCustomerAddress({
          county: profile.county || '',
          town: profile.town || '',
          estate: profile.estate || '',
          houseNumber: profile.houseNumber || ''
        });
      } catch (error) {
        toast.error('Failed to load address data');
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadUserData();
    }
  }, [user]);

  // Handle basic address save
  const handleBasicAddressSave = async () => {
    try {
      setSaving(true);
      if (basicAddress.additionalPhone && !validateKenyanPhone(basicAddress.additionalPhone)) {
        toast.error(PHONE_VALIDATION_ERROR);
        return;
      }

      await userService.updateProfile({
        ...userData,
        additionalPhone: basicAddress.additionalPhone
      });
      setUserData(prev => ({ ...prev, additionalPhone: basicAddress.additionalPhone }));
      setIsEditingBasic(false);
      toast.success('Basic address updated successfully');
    } catch (error) {
      toast.error('Failed to update basic address');
      console.error('Error updating basic address:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle customer address save
  const handleCustomerAddressSave = async () => {
    try {
      setSaving(true);
      await userService.updateProfile({
        ...userData,
        county: customerAddress.county,
        town: customerAddress.town,
        estate: customerAddress.estate,
        houseNumber: customerAddress.houseNumber
      });
      setUserData(prev => ({
        ...prev,
        county: customerAddress.county,
        town: customerAddress.town,
        estate: customerAddress.estate,
        houseNumber: customerAddress.houseNumber
      }));
      setIsEditingCustomer(false);
      toast.success('Customer address updated successfully');

      // Automatically move to next step if in verification flow
      if (cameFromVerification && setActiveTab) {
        setTimeout(() => {
          setActiveTab('security');
        }, 1500);
      }
    } catch (error) {
      toast.error('Failed to update customer address');
      console.error('Error updating customer address:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading address information...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Address Management</h1>
        <p className="mt-2 text-gray-600">Manage your basic contact information and delivery addresses</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Address Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <FaUser className="text-blue-600 mr-3" size={20} />
                <h2 className="text-xl font-semibold text-gray-900">Basic Address</h2>
              </div>
              {!isEditingBasic ? (
                <button
                  onClick={() => setIsEditingBasic(true)}
                  className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium"
                >
                  <FaEdit className="mr-1" size={14} />
                  Edit
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleBasicAddressSave}
                    disabled={saving}
                    className="text-green-600 hover:text-green-800 flex items-center text-sm font-medium disabled:opacity-50"
                  >
                    <FaSave className="mr-1" size={14} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingBasic(false);
                      // Reset form to original values
                      setBasicAddress({
                        name: userData?.name || '',
                        email: userData?.email || '',
                        phone: userData?.phone || '',
                        additionalPhone: userData?.additionalPhone || ''
                      });
                    }}
                    className="text-gray-600 hover:text-gray-800 flex items-center text-sm font-medium"
                  >
                    <FaTimes className="mr-1" size={14} />
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={basicAddress.name}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-filled from your profile</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={basicAddress.email}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-filled from your profile</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Phone Number
                </label>
                <input
                  type="tel"
                  value={basicAddress.phone}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-filled from your profile</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={basicAddress.additionalPhone}
                  onChange={(e) => setBasicAddress(prev => ({ ...prev, additionalPhone: e.target.value }))}
                  readOnly={!isEditingBasic}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isEditingBasic ? 'focus:ring-2 focus:ring-blue-500 focus:border-transparent' : 'bg-gray-50 text-gray-600'
                    }`}
                  placeholder="Enter additional phone number"
                />
              </div>
            </div>

            {/* Display basic address summary when not editing */}
            {!isEditingBasic && (basicAddress.name || basicAddress.email || basicAddress.phone || basicAddress.additionalPhone) && (
              <div className="mt-6 p-4 bg-blue-50 rounded-md">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Current Basic Information:</h3>
                <div className="text-sm text-blue-800 space-y-1">
                  {basicAddress.name && <p><strong>Name:</strong> {basicAddress.name}</p>}
                  {basicAddress.email && <p><strong>Email:</strong> {basicAddress.email}</p>}
                  {basicAddress.phone && <p><strong>Phone:</strong> {basicAddress.phone}</p>}
                  {basicAddress.additionalPhone && <p><strong>Additional Phone:</strong> {basicAddress.additionalPhone}</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customer Address Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <FaMapMarkerAlt className="text-green-600 mr-3" size={20} />
                <h2 className="text-xl font-semibold text-gray-900">Customer Address</h2>
              </div>
              {!isEditingCustomer ? (
                <button
                  onClick={() => setIsEditingCustomer(true)}
                  className="text-green-600 hover:text-green-800 flex items-center text-sm font-medium"
                >
                  <FaEdit className="mr-1" size={14} />
                  Edit
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleCustomerAddressSave}
                    disabled={saving}
                    className="text-green-600 hover:text-green-800 flex items-center text-sm font-medium disabled:opacity-50"
                  >
                    <FaSave className="mr-1" size={14} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingCustomer(false);
                      // Reset form to original values
                      setCustomerAddress({
                        county: userData?.county || '',
                        town: userData?.town || '',
                        estate: userData?.estate || '',
                        houseNumber: userData?.houseNumber || ''
                      });
                    }}
                    className="text-gray-600 hover:text-gray-800 flex items-center text-sm font-medium"
                  >
                    <FaTimes className="mr-1" size={14} />
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  County *
                </label>
                <select
                  value={customerAddress.county}
                  onChange={(e) => setCustomerAddress(prev => ({ ...prev, county: e.target.value }))}
                  disabled={!isEditingCustomer}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isEditingCustomer ? 'focus:ring-2 focus:ring-green-500 focus:border-transparent' : 'bg-gray-50 text-gray-600'
                    }`}
                >
                  <option value="">Select County</option>
                  {kenyaCounties.map(county => (
                    <option key={county} value={county}>{county}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Town/City/Institution *
                </label>
                <input
                  type="text"
                  value={customerAddress.town}
                  onChange={(e) => setCustomerAddress(prev => ({ ...prev, town: e.target.value }))}
                  readOnly={!isEditingCustomer}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isEditingCustomer ? 'focus:ring-2 focus:ring-green-500 focus:border-transparent' : 'bg-gray-50 text-gray-600'
                    }`}
                  placeholder="Enter town, city, or institution name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estate/Building/Hostel *
                </label>
                <input
                  type="text"
                  value={customerAddress.estate}
                  onChange={(e) => setCustomerAddress(prev => ({ ...prev, estate: e.target.value }))}
                  readOnly={!isEditingCustomer}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isEditingCustomer ? 'focus:ring-2 focus:ring-green-500 focus:border-transparent' : 'bg-gray-50 text-gray-600'
                    }`}
                  placeholder="Enter estate, building, or hostel name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  House/Room/Door Number *
                </label>
                <input
                  type="text"
                  value={customerAddress.houseNumber}
                  onChange={(e) => setCustomerAddress(prev => ({ ...prev, houseNumber: e.target.value }))}
                  readOnly={!isEditingCustomer}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isEditingCustomer ? 'focus:ring-2 focus:ring-green-500 focus:border-transparent' : 'bg-gray-50 text-gray-600'
                    }`}
                  placeholder="Enter house, room, or door number"
                />
              </div>
            </div>

            {/* Display full address when not editing */}
            {!isEditingCustomer && (customerAddress.county || customerAddress.town || customerAddress.estate || customerAddress.houseNumber) && (
              <div className="mt-6 p-4 bg-gray-50 rounded-md">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Current Address:</h3>
                <p className="text-sm text-gray-600">
                  {[customerAddress.houseNumber, customerAddress.estate, customerAddress.town, customerAddress.county]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Information Section */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Address Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">Basic Address</h4>
            <ul className="space-y-1 text-xs">
              <li>• Full name and email are auto-filled from your profile</li>
              <li>• Primary phone number is from your verified account</li>
              <li>• Additional phone number is optional for deliveries</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Customer Address</h4>
            <ul className="space-y-1 text-xs">
              <li>• Required for delivery services</li>
              <li>• Select your county from the list of 47 Kenyan counties</li>
              <li>• Provide specific location details for accurate delivery</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Addresses;