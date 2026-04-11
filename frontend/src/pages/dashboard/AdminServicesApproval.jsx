import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaTimesCircle, FaClock, FaEye, FaUser } from 'react-icons/fa';
import serviceApi from '../../services/serviceApi';
import { resolveImageUrl, FALLBACK_IMAGE } from '../../utils/imageUtils';

const AdminServicesApproval = () => {
  const [pendingServices, setPendingServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState({});
  const [error, setError] = useState(null);

  // Fetch pending services
  useEffect(() => {
    fetchPendingServices();
  }, []);

  const fetchPendingServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await serviceApi.getPendingServices();
      setPendingServices(data);
    } catch (error) {
      console.error('Error fetching pending services:', error);
      setError(error.response?.data?.error || 'Failed to fetch pending services');
    } finally {
      setLoading(false);
    }
  };

  const approveService = async (serviceId) => {
    setApproving(prev => ({ ...prev, [serviceId]: true }));
    
    try {
      await serviceApi.approveService(serviceId);
      // Remove the approved service from the list
      setPendingServices(prev => prev.filter(service => service.id !== serviceId));
      alert('Service approved successfully!');
    } catch (error) {
      console.error('Error approving service:', error);
      alert(error.response?.data?.error || 'Failed to approve service');
    } finally {
      setApproving(prev => ({ ...prev, [serviceId]: false }));
    }
  };

  const suspendService = async (serviceId) => {
    setApproving(prev => ({ ...prev, [serviceId]: true }));
    
    try {
      await serviceApi.suspendService(serviceId, 'Requires modification');
      // Remove the suspended service from the pending list
      setPendingServices(prev => prev.filter(service => service.id !== serviceId));
      alert('Service suspended successfully!');
    } catch (error) {
      console.error('Error suspending service:', error);
      alert(error.response?.data?.error || 'Failed to suspend service');
    } finally {
      setApproving(prev => ({ ...prev, [serviceId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <FaTimesCircle className="text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error Loading Services</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
        <button
          onClick={fetchPendingServices}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service Approval</h1>
        <p className="text-gray-600 mt-1">Review and approve pending service submissions</p>
      </div>

      {/* Stats Card */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <FaClock className="text-yellow-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
            <p className="text-sm text-gray-600">{pendingServices.length} services awaiting approval</p>
          </div>
        </div>
      </div>

      {/* Pending Services List */}
      {pendingServices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-200">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <FaCheckCircle className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No pending services</h3>
          <p className="mt-1 text-sm text-gray-500">
            All service submissions have been reviewed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingServices.map((service) => (
            <div key={service.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.title}</h3>
                  
                  {/* Service Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Category</p>
                      <p className="text-sm font-medium text-gray-900">{service.category?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Subcategory</p>
                      <p className="text-sm font-medium text-gray-900">{service.subcategory?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Price</p>
                      <p className="text-sm font-medium text-gray-900">KES {service.price}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Delivery Time</p>
                      <p className="text-sm font-medium text-gray-900">{service.deliveryTime}</p>
                    </div>
                  </div>

                  {/* Service Description */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">Description</p>
                    <p className="text-sm text-gray-900">{service.description}</p>
                  </div>

                  {/* Provider Info */}
                  <div className="flex items-center text-sm text-gray-600 mb-4">
                    <FaUser className="mr-2" />
                    <span>Submitted by: {service.provider?.name} ({service.provider?.email})</span>
                    <span className="mx-2">•</span>
                    <span>{new Date(service.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Service Images */}
                  {service.images && service.images.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Service Images</p>
                      <div className="flex flex-wrap gap-2">
                        {service.images.map((image, index) => (
                          <img
                            key={index}
                            src={resolveImageUrl(image.imageUrl)}
                            alt={`Service image ${index + 1}`}
                            className="h-20 w-20 object-cover rounded border"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => window.open(`/api/services/${service.id}`, '_blank')}
                  className="flex items-center px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  <FaEye className="mr-2" />
                  View Details
                </button>
                
                <button
                  onClick={() => suspendService(service.id)}
                  disabled={approving[service.id]}
                  className="flex items-center px-3 py-2 text-sm text-red-700 bg-red-100 rounded hover:bg-red-200 disabled:opacity-50"
                >
                  <FaTimesCircle className="mr-2" />
                  {approving[service.id] ? 'Processing...' : 'Suspend'}
                </button>
                
                <button
                  onClick={() => approveService(service.id)}
                  disabled={approving[service.id]}
                  className="flex items-center px-4 py-2 text-sm text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  <FaCheckCircle className="mr-2" />
                  {approving[service.id] ? 'Processing...' : 'Approve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminServicesApproval;