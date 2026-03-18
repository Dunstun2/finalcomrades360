import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaMapMarkerAlt, FaEdit, FaSave, FaTimes, FaCheckCircle } from 'react-icons/fa';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice } from '../utils/currency';

export default function UpdateOrderAddress() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

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

  // Mock pick stations data (same as in Checkout.jsx)
  const pickStations = [
    { id: '1', name: 'Westlands Pick Station', location: 'Westlands, Nairobi' },
    { id: '2', name: 'Koinange Street Pick Station', location: 'CBD, Nairobi' },
    { id: '3', name: 'Luthuli Avenue Pick Station', location: 'River Road, Nairobi' },
    { id: '4', name: 'Mombasa Road Pick Station', location: 'Mombasa Road, Nairobi' },
    { id: '5', name: 'Koinange Street Pick Station', location: 'CBD, Nairobi' }
  ];

  // Address form state
  const [addressForm, setAddressForm] = useState({
    county: '',
    town: '',
    estate: '',
    houseNumber: ''
  });

  // Pick station form state
  const [pickStationForm, setPickStationForm] = useState({
    pickStation: ''
  });

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      // Get order details - you might need to create this endpoint
      const response = await api.get('/orders/my');
      const userOrders = response.data;
      const foundOrder = userOrders.find(o => o.id == orderId);

      if (!foundOrder) {
        setError('Order not found');
        return;
      }

      // Check if order can be updated
      const allowedStatuses = ['order_placed', 'seller_confirmed', 'super_admin_confirmed', 'processing'];
      if (!allowedStatuses.includes(foundOrder.status)) {
        setError('Order address cannot be updated at this stage');
        return;
      }

      setOrder(foundOrder);

      // Load current user address for pre-filling
      const profileResponse = await api.get('/users/me');
      const userProfile = profileResponse.data;

      setAddressForm({
        county: userProfile.county || '',
        town: userProfile.town || '',
        estate: userProfile.estate || '',
        houseNumber: userProfile.houseNumber || ''
      });

      // Set pick station if order has one
      setPickStationForm({
        pickStation: foundOrder.pickStation || ''
      });

    } catch (err) {
      console.error('Failed to load order:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAddressForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveAddress = async () => {
    // Validate required fields based on delivery method
    if (order.deliveryMethod === 'home_delivery') {
      if (!addressForm.county || !addressForm.town || !addressForm.estate || !addressForm.houseNumber) {
        alert('Please fill in all required fields');
        return;
      }
    } else if (order.deliveryMethod === 'pick_station') {
      if (!pickStationForm.pickStation) {
        alert('Please select a pick station');
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);

      let updateData = {};

      if (order.deliveryMethod === 'home_delivery') {
        // Update home delivery address
        updateData = {
          deliveryAddress: `${addressForm.houseNumber}, ${addressForm.estate}, ${addressForm.town}, ${addressForm.county}`,
          addressDetails: addressForm
        };
      } else if (order.deliveryMethod === 'pick_station') {
        // Update pick station
        const selectedStation = pickStations.find(station => station.id === pickStationForm.pickStation);
        updateData = {
          pickStation: pickStationForm.pickStation,
          deliveryAddress: selectedStation ? `${selectedStation.name} - ${selectedStation.location}` : null
        };
      }

      // Update order delivery address
      const response = await api.patch(`/orders/${orderId}/address`, updateData);

      if (response.data.success) {
        setSuccess(true);
        setOrder(prev => ({
          ...prev,
          deliveryAddress: updateData.deliveryAddress,
          pickStation: updateData.pickStation || prev.pickStation
        }));
      } else {
        setError(response.data.message || 'Failed to update address');
      }
    } catch (err) {
      console.error('Update address error:', err);
      setError(err.response?.data?.message || 'Failed to update address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset form to original values
    if (order) {
      if (order.deliveryMethod === 'home_delivery') {
        // Parse current delivery address back to form fields (simplified)
        // In a real implementation, you'd store the structured address
        setAddressForm({
          county: order.deliveryAddress?.split(', ')[3] || '',
          town: order.deliveryAddress?.split(', ')[2] || '',
          estate: order.deliveryAddress?.split(', ')[1] || '',
          houseNumber: order.deliveryAddress?.split(', ')[0] || ''
        });
      } else if (order.deliveryMethod === 'pick_station') {
        setPickStationForm({
          pickStation: order.pickStation || ''
        });
      }
    }
    setIsEditing(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading order details...</span>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-0 md:px-4">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <FaTimes className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              to="/customer/orders"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FaArrowLeft className="mr-2" />
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-0 md:px-4">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <FaCheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Address Updated Successfully</h2>
            <p className="text-gray-600 mb-4">
              Your delivery address for Order #{order.orderNumber} has been updated.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-blue-800">
                <strong>New Delivery Address:</strong><br />
                {addressForm.houseNumber}, {addressForm.estate}, {addressForm.town}, {addressForm.county}
              </p>
            </div>
            <Link
              to="/customer/orders"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <FaArrowLeft className="mr-2" />
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-0 md:px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/customer/orders"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <FaArrowLeft className="mr-2" />
            Back to Orders
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Update Delivery Address</h1>
          <p className="mt-2 text-gray-600">Update the delivery address for your order</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Details */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Order #{order.orderNumber}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Order Date</p>
                  <p className="font-medium">{formatDate(order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Amount</p>
                  <p className="font-medium text-lg">{formatPrice(order.total)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <p className="font-medium">{order.status}</p>
                </div>
                <div>
                  <p className="text-gray-600">Payment</p>
                  <p className="font-medium">{order.paymentMethod}</p>
                </div>
              </div>
            </div>

            {/* Address Update Form */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <FaMapMarkerAlt className="text-blue-600 mr-3" size={20} />
                  <h3 className="text-lg font-semibold text-gray-900">Delivery Address</h3>
                </div>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium"
                  >
                    <FaEdit className="mr-1" size={14} />
                    Edit Address
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveAddress}
                      disabled={saving}
                      className="text-green-600 hover:text-green-800 flex items-center text-sm font-medium disabled:opacity-50"
                    >
                      <FaSave className="mr-1" size={14} />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="text-gray-600 hover:text-gray-800 flex items-center text-sm font-medium"
                    >
                      <FaTimes className="mr-1" size={14} />
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Current Address Display */}
              {!isEditing && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Current {order.deliveryMethod === 'pick_station' ? 'Pick Station' : 'Delivery Address'}:
                  </h4>
                  <p className="text-gray-700">
                    {order.deliveryMethod === 'pick_station' && order.pickStation ?
                      pickStations.find(station => station.id === order.pickStation)?.name + ' - ' +
                      pickStations.find(station => station.id === order.pickStation)?.location :
                      order.deliveryAddress || 'No address specified'
                    }
                  </p>
                </div>
              )}

              {/* Address Edit Form */}
              {isEditing && (
                <div className="space-y-4">
                  {order.deliveryMethod === 'home_delivery' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          County *
                        </label>
                        <select
                          name="county"
                          value={addressForm.county}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
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
                          name="town"
                          value={addressForm.town}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter town, city, or institution name"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Estate/Building/Hostel *
                        </label>
                        <input
                          type="text"
                          name="estate"
                          value={addressForm.estate}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter estate, building, or hostel name"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          House/Room/Door Number *
                        </label>
                        <input
                          type="text"
                          name="houseNumber"
                          value={addressForm.houseNumber}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter house, room, or door number"
                          required
                        />
                      </div>
                    </>
                  )}

                  {order.deliveryMethod === 'pick_station' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Pick Station *
                      </label>
                      <select
                        name="pickStation"
                        value={pickStationForm.pickStation}
                        onChange={(e) => setPickStationForm({ pickStation: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Choose a pick station</option>
                        {pickStations.map(station => (
                          <option key={station.id} value={station.id}>
                            {station.name} - {station.location}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Information Sidebar */}
          <div className="space-y-6">
            {/* Address Update Policy */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h4 className="font-medium text-blue-900 mb-3">
                {order.deliveryMethod === 'pick_station' ? 'Pick Station Update Policy' : 'Address Update Policy'}
              </h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start">
                  <FaCheckCircle className="mr-2 mt-0.5 flex-shrink-0" />
                  <span>Address can only be updated for pending or processing orders</span>
                </li>
                <li className="flex items-start">
                  <FaCheckCircle className="mr-2 mt-0.5 flex-shrink-0" />
                  <span>Changes apply only to this specific order</span>
                </li>
                <li className="flex items-start">
                  <FaCheckCircle className="mr-2 mt-0.5 flex-shrink-0" />
                  <span>Your account address remains unchanged</span>
                </li>
                <li className="flex items-start">
                  <FaCheckCircle className="mr-2 mt-0.5 flex-shrink-0" />
                  <span>Delivery agent will use the updated {order.deliveryMethod === 'pick_station' ? 'pick station' : 'address'}</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveAddress}
                    disabled={saving || (order.deliveryMethod === 'home_delivery' && (!addressForm.county || !addressForm.town || !addressForm.estate || !addressForm.houseNumber)) || (order.deliveryMethod === 'pick_station' && !pickStationForm.pickStation)}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {saving ? 'Updating...' : order.deliveryMethod === 'pick_station' ? 'Update Pick Station' : 'Update Address'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel Changes
                  </button>
                </>
              ) : (
                <Link
                  to="/customer/orders"
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 text-center block font-medium"
                >
                  Back to Orders
                </Link>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <FaTimes className="text-red-500 mr-2" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}