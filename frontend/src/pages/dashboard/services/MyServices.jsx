import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaClock, FaCheckCircle, FaPauseCircle, FaEye, FaEdit, FaTrash, FaPlus, FaTimesCircle, FaStore, FaStoreSlash } from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
import serviceApi from '../../../services/serviceApi';

const MyServices = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('approved');
  const [services, setServices] = useState({
    pending: [],
    approved: [],
    suspended: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch services from API
  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await serviceApi.getMyServices();
        setServices(data);
      } catch (error) {
        console.error('Error fetching services:', error);
        setError(error.response?.data?.error || 'Failed to fetch services');
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const tabs = [
    {
      id: 'pending',
      label: 'Pending Approval',
      count: services.pending?.length || 0,
      icon: <FaClock className="text-yellow-500" />,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    {
      id: 'approved',
      label: 'Approved Services',
      count: services.approved?.length || 0,
      icon: <FaCheckCircle className="text-green-500" />,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      id: 'suspended',
      label: 'Suspended Services',
      count: services.suspended?.length || 0,
      icon: <FaPauseCircle className="text-red-500" />,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    }
  ];

  const ServiceCard = ({ service, tab }) => {
    const navigate = useNavigate();

    const handleEdit = () => {
      navigate(`/service-provider-dashboard/create-service?edit=${service.id}`);
    };

    const handleView = () => {
      navigate(`/service-provider-dashboard/create-service?edit=${service.id}`);
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.title}</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-2">
              <span className="bg-gray-100 px-2 py-1 rounded">{service.category?.name || 'No Category'}</span>
              {service.subcategory && (
                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                  {service.subcategory.emoji || '🛠️'} {service.subcategory.name}
                </span>
              )}
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-medium">KES {service.price}</span>
              {tab === 'pending' && (
                <span>Submitted: {new Date(service.createdAt).toLocaleDateString()}</span>
              )}
              {tab === 'approved' && (
                <span>Approved: {new Date(service.updatedAt).toLocaleDateString()}</span>
              )}
              {tab === 'suspended' && (
                <span>Suspended: {new Date(service.updatedAt).toLocaleDateString()}</span>
              )}
            </div>
            <p className="text-gray-600 text-sm line-clamp-2">{service.description}</p>
            {service.suspensionReason && (
              <p className="text-red-600 text-sm mt-2">Reason: {service.suspensionReason}</p>
            )}
            {service.reason && (
              <p className="text-red-600 text-sm mt-2">Reason: {service.reason}</p>
            )}
          </div>
          <div className="flex flex-col items-center gap-2">
            {tab === 'approved' && (
              <div className="flex flex-col items-center gap-2">
                {/* Real-time Status Badge */}
                {(() => {
                  const status = serviceApi.getAvailabilityStatus(service);
                  const isOpen = status.isAvailable;
                  return (
                    <div className="flex flex-col items-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shadow-sm whitespace-nowrap ${isOpen ? 'bg-green-500 text-white animate-pulse' : 'bg-gray-200 text-gray-500'
                        }`}>
                        {status.state}
                      </span>
                      {status.reason && <span className="text-[8px] text-gray-400 mt-1 max-w-[60px] truncate">{status.reason}</span>}
                    </div>
                  );
                })()}

                <div className="flex items-center space-x-2">
                  {/* 3-State Toggle Button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      const modes = ['AUTO', 'OPEN', 'CLOSED'];
                      const currentMode = service.availabilityMode || 'AUTO';
                      const nextMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];

                      const formData = new FormData();
                      formData.append('availabilityMode', nextMode);

                      serviceApi.updateService(service.id, formData).then(() => {
                        window.location.reload();
                      });
                    }}
                    className={`p-2 rounded transition-all shadow-sm border ${service.availabilityMode === 'OPEN' ? 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100' :
                      service.availabilityMode === 'CLOSED' ? 'text-red-500 bg-red-50 border-red-200 hover:bg-red-100' :
                        'text-blue-500 bg-blue-50 border-blue-200 hover:bg-blue-100'
                      }`}
                    title={`Current: ${service.availabilityMode || 'AUTO'}. Click to cycle: AUTO -> OPEN -> CLOSED`}
                  >
                    {service.availabilityMode === 'OPEN' ? <FaStore className="text-sm" /> :
                      service.availabilityMode === 'CLOSED' ? <FaStoreSlash className="text-sm" /> :
                        <FaClock className="text-sm" />}
                  </button>

                  <button
                    onClick={handleView}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="View Details"
                  >
                    <FaEye className="text-sm" />
                  </button>
                  <button
                    onClick={handleEdit}
                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                    title="Edit Service"
                  >
                    <FaEdit className="text-sm" />
                  </button>
                </div>
              </div>
            )}
            {tab === 'pending' && (
              <button
                onClick={handleEdit}
                className="p-2 text-orange-600 hover:bg-orange-50 rounded"
                title="Edit Service"
              >
                <FaEdit className="text-sm" />
              </button>
            )}
            {tab === 'suspended' && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this service?')) {
                    serviceApi.deleteService?.(service.id).then(() => window.location.reload());
                  }
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
                title="Delete Service"
              >
                <FaTrash className="text-sm" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {tab === 'pending' && (
              <span className="flex items-center text-yellow-600 text-sm">
                <FaClock className="mr-1" />
                Pending Review
              </span>
            )}
            {tab === 'approved' && (
              <span className="flex items-center text-green-600 text-sm">
                <FaCheckCircle className="mr-1" />
                Active
              </span>
            )}
            {tab === 'suspended' && (
              <span className="flex items-center text-red-600 text-sm">
                <FaPauseCircle className="mr-1" />
                Suspended
              </span>
            )}
          </div>

          <Link
            to={`/service-provider-dashboard/create-service?edit=${service.id}`}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {tab === 'pending' ? 'Edit' : 'View Details'}
          </Link>
        </div>
      </div>
    );
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
          onClick={() => window.location.reload()}
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Services</h1>
          <p className="text-gray-600 mt-1">Manage your service offerings and track their status</p>
        </div>
        <Link
          to="/service-provider-dashboard/create-service"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <FaPlus className="text-sm" />
          <span>Create New Service</span>
        </Link>
      </div>

      {/* Service Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`${tab.bgColor} ${tab.borderColor} border rounded-lg p-6 cursor-pointer transition-all hover:shadow-md`}
            onClick={() => setActiveTab(tab.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{tab.label}</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">{tab.count}</p>
              </div>
              <div className="p-3 rounded-full bg-white shadow-sm">
                {tab.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Services List */}
      <div className="space-y-4">
        {services[activeTab]?.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <FaClock className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No {tabs.find(t => t.id === activeTab)?.label.toLowerCase()} found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === 'pending' && 'Your services are under review. You\'ll be notified once approved.'}
              {activeTab === 'approved' && 'Start by creating your first service.'}
              {activeTab === 'suspended' && 'No suspended services at the moment.'}
            </p>
            <div className="mt-6">
              <Link
                to="/service-provider-dashboard/create-service"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <FaPlus className="-ml-1 mr-2 h-5 w-5" />
                Create New Service
              </Link>
            </div>
          </div>
        ) : (
          services[activeTab]?.map((service) => (
            <ServiceCard key={service.id} service={service} tab={activeTab} />
          ))
        )}
      </div>
    </div>
  );
};

export default MyServices;