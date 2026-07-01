import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaShieldAlt, FaPaperPlane, FaWhatsapp, FaSms, FaPlus, FaCheck } from 'react-icons/fa';
import { adminApi } from '@/shared/services/api';
import { validateKenyanPhone, formatKenyanPhoneInput } from '@/utils/validation';

const AdminDirectCreateUserModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'customer',
    notificationChannels: ['whatsapp']
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setFormData(prev => {
      let newChannels = [...prev.notificationChannels];
      const hasEmail = !!prev.email.trim();
      const hasPhone = !!prev.phone.trim();

      if (!hasEmail) newChannels = newChannels.filter(c => c !== 'email');
      if (!hasPhone) newChannels = newChannels.filter(c => c !== 'whatsapp' && c !== 'sms');

      if (newChannels.length === 0) {
        if (hasEmail) newChannels.push('email');
        else if (hasPhone) newChannels.push('whatsapp');
      }

      if (JSON.stringify(newChannels) === JSON.stringify(prev.notificationChannels)) {
        return prev;
      }
      return { ...prev, notificationChannels: newChannels };
    });
  }, [formData.email, formData.phone]);

  const roles = [
    { value: 'customer', label: 'Customer' },
    { value: 'marketer', label: 'Marketer' },
    { value: 'seller', label: 'Seller' },
    { value: 'delivery_agent', label: 'Delivery Agent' },
    { value: 'service_provider', label: 'Service Provider' },
    { value: 'ops_manager', label: 'Ops Manager' },
    { value: 'logistics_manager', label: 'Logistics Manager' },
    { value: 'finance_manager', label: 'Finance Manager' },
    { value: 'admin', label: 'Admin' }
  ];

  const channels = [
    { value: 'whatsapp', label: 'WhatsApp', icon: FaWhatsapp, color: 'text-green-500' },
    { value: 'sms', label: 'SMS', icon: FaSms, color: 'text-blue-500' },
    { value: 'email', label: 'Email', icon: FaEnvelope, color: 'text-red-500' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const toggleChannel = (value) => {
    setFormData(prev => {
      const current = prev.notificationChannels;
      if (current.includes(value)) {
        if (current.length === 1) return prev; // Keep at least one
        return { ...prev, notificationChannels: current.filter(c => c !== value) };
      }
      return { ...prev, notificationChannels: [...current, value] };
    });
  };

  const validate = () => {
    // Name is no longer required
    if (!formData.email && !formData.phone) return 'Either Email or Phone is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Invalid email format';
    if (formData.phone && !validateKenyanPhone(formData.phone)) return 'Invalid Kenyan phone number';
    if (!formData.role) return 'Role is required';
    if (formData.notificationChannels.length === 0) return 'Select at least one notification channel';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await adminApi.adminDirectCreateUser(formData);
      setSuccess('User created successfully and credentials sent!');
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess('');
        setFormData({
          name: '',
          email: '',
          phone: '',
          role: 'customer',
          notificationChannels: ['whatsapp']
        });
      }, 2000);
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <FaPlus className="text-blue-200" /> Create Account Directly
            </h3>
            <p className="text-blue-100 text-sm mt-1">Create a new user and send initial login details</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <FaTimes className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg flex items-center gap-3">
              <div className="bg-red-500 text-white rounded-full p-1"><FaTimes size={10} /></div>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-r-lg flex items-center gap-3">
              <div className="bg-green-500 text-white rounded-full p-1"><FaPaperPlane size={10} /></div>
              <p className="text-sm font-medium">{success}</p>
            </div>
          )}

          {/* Full Name (Optional) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <FaUser className="text-blue-500" /> Full Name (Optional)
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter full name (auto-generated if empty)"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <FaEnvelope className="text-blue-500" /> Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="email@example.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <FaPhone className="text-blue-500" /> Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onInput={(e) => e.target.value = formatKenyanPhoneInput(e.target.value)}
                onChange={handleInputChange}
                placeholder="07xxxxxxxx"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <FaShieldAlt className="text-blue-500" /> Assign Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all appearance-none cursor-pointer"
            >
              {roles.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Notification Channels */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Send Credentials Via (Select multiple if needed)</label>
            <div className="grid grid-cols-3 gap-3">
              {channels.map(c => {
                const Icon = c.icon;
                const isSelected = formData.notificationChannels.includes(c.value);
                const hasEmail = !!formData.email.trim();
                const hasPhone = !!formData.phone.trim();
                
                let isDisabled = false;
                if (c.value === 'email' && !hasEmail) isDisabled = true;
                if ((c.value === 'whatsapp' || c.value === 'sms') && !hasPhone) isDisabled = true;

                return (
                  <button
                    key={c.value}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => toggleChannel(c.value)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all relative ${
                      isSelected 
                        ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-100' 
                        : 'border-gray-100 hover:border-blue-200 bg-gray-50'
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                  >
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-blue-600 text-white rounded-full p-0.5">
                        <FaCheck size={8} />
                      </div>
                    )}
                    <Icon className={`text-xl mb-1 ${isSelected ? c.color : 'text-gray-400'}`} />
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <FaPaperPlane />
              )}
              {loading ? 'Creating Account...' : 'Create Account & Send Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminDirectCreateUserModal;
