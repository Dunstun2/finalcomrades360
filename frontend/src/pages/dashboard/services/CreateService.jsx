import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ServiceForm from '../../../components/services/ServiceForm';
import serviceApi from '../../../services/serviceApi';
import Dialog from '../../../components/Dialog';
import { useAuth } from '../../../contexts/AuthContext';

const CreateService = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const editId = searchParams.get('edit');

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(!!editId);

  useEffect(() => {
    const fetchService = async () => {
      if (!editId) return;

      try {
        setLoading(true);
        const data = await serviceApi.getServiceById(editId);
        setInitialData(data);
      } catch (error) {
        console.error('Error fetching service for edit:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [editId]);

  const handleSuccess = (service) => {
    console.log('Service saved successfully:', service);
    navigate('/service-provider-dashboard/my-services');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Services
        </Button>
        <h1 className="text-2xl font-bold">
          {editId ? 'Edit Service' : 'Create New Service'}
        </h1>
        <p className="text-gray-600">
          {editId
            ? 'Update the details for your service'
            : 'Fill in the details to add a new service to the platform'}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <ServiceForm
          onSuccess={handleSuccess}
          initialData={initialData}
          isEditing={!!editId}
          mode={editId ? 'edit' : 'create'}
        />
      </div>
    </div>
  );
};

export default CreateService;
