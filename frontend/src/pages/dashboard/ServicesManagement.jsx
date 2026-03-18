import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Search, Plus, CheckCircle, Star, Clock, AlertCircle, List, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import serviceApi from '../../services/serviceApi';

const ServicesManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch services from API
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);

        // Fetch all services from the backend
        const response = await serviceApi.getServices();
        const fetchedServices = response.services || response;

        // Transform backend data to match frontend expectations
        const transformedServices = fetchedServices.map(service => ({
          id: service.id,
          name: service.title, // Map title to name for compatibility
          title: service.title,
          status: service.status === 'approved' ? 'active' : service.status === 'pending' ? 'pending' : 'inactive',
          rating: 4.5, // Default rating since backend doesn't provide it
          reviews: 0, // Default reviews since backend doesn't provide it
          description: service.description,
          category: service.category?.name || 'No Category',
          price: service.price,
          provider: service.provider?.name || 'Unknown Provider',
          createdAt: service.createdAt,
          images: service.images
        }));

        setServices(transformedServices);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching services:', err);
        setError('Failed to load services. Please try again.');
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const serviceCards = [
    {
      id: 'create-service',
      title: 'Create Service',
      description: 'Add new services to your platform',
      icon: <Plus className="w-8 h-8 text-blue-500" />,
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      textColor: 'text-blue-600',
      action: () => navigate('/dashboard/services/create')
    },
    {
      id: 'approve-service',
      title: 'Approve Services',
      description: 'Review and approve pending service submissions',
      icon: <CheckCircle className="w-8 h-8 text-green-500" />,
      bgColor: 'bg-green-50 hover:bg-green-100',
      textColor: 'text-green-600',
      action: () => navigate('/dashboard/services-approval')
    },
    {
      id: 'service-reviews',
      title: 'Service Reviews',
      description: 'Manage customer reviews and ratings',
      icon: <Star className="w-8 h-8 text-yellow-500" />,
      bgColor: 'bg-yellow-50 hover:bg-yellow-100',
      textColor: 'text-yellow-600',
      action: () => navigate('/dashboard/services/reviews')
    },
    {
      id: 'our-services',
      title: 'Public Services',
      description: 'View services as customers see them',
      icon: <List className="w-8 h-8 text-purple-500" />,
      bgColor: 'bg-purple-50 hover:bg-purple-100',
      textColor: 'text-purple-600',
      action: () => navigate('/services')
    }
  ];

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'active' && service.status === 'active') ||
      (activeTab === 'pending' && service.status === 'pending') ||
      (activeTab === 'inactive' && service.status === 'inactive');

    return matchesSearch && matchesTab;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading services...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Services Management</h1>
        <p className="text-gray-600 mt-1">Manage all service-related activities</p>
      </div>

      {/* Service Management Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {serviceCards.map((card) => (
          <div
            key={card.id}
            onClick={card.action}
            onMouseDown={card.action}
            role="button"
            tabIndex={0}
            style={{ pointerEvents: 'auto' }}
            className={`${card.bgColor} rounded-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-md`}
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-white shadow-sm mr-4">
                {card.icon}
              </div>
              <div>
                <h3 className={`font-semibold text-lg ${card.textColor}`}>{card.title}</h3>
                <p className="text-sm text-gray-600">{card.description}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={`${card.textColor} font-medium`}>View details</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </div>
          </div>
        ))}
      </div>

      {/* Search and Tabs */}
      <div className="mb-6">
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search services..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <List className="h-4 w-4" /> All
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" /> Active
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" /> Pending
            </TabsTrigger>
            <TabsTrigger value="inactive" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" /> Inactive
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredServices.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-200">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No services found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm
                    ? 'No services match your search criteria.'
                    : 'Get started by creating a new service.'}
                </p>
                <div className="mt-6">
                  <Button
                    onClick={() => navigate('/dashboard/services/create')}
                    className="inline-flex items-center"
                  >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    New Service
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredServices.map((service) => (
                  <ServiceItem key={service.id} service={service} navigate={navigate} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const ServiceItem = ({ service, navigate }) => {
  const statusVariant = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-red-100 text-red-800',
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
      <div className="flex items-center space-x-4">
        <div className="p-2 rounded-lg bg-gray-50">
          <Star className="h-5 w-5 text-gray-400" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{service.title || service.name}</h3>
          <div className="flex items-center text-sm text-gray-500 space-x-2 mt-1">
            <span className="bg-gray-100 px-2 py-1 rounded">{service.category || 'No Category'}</span>
            {service.price && (
              <span className="bg-blue-100 px-2 py-1 rounded">KES {service.price}</span>
            )}
            <div className="flex items-center">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 mr-1" />
              <span>{service.rating || 4.5}</span>
              <span className="mx-1">•</span>
              <span>{service.reviews || 0} reviews</span>
            </div>
          </div>
          {service.description && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-1">{service.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Badge className={`${statusVariant[service.status]} px-2.5 py-0.5 text-xs font-medium`}>
          {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => navigate(`/dashboard/services/${service.id}`)}
        >
          View
        </Button>
      </div>
    </div>
  );
};

export default ServicesManagement;