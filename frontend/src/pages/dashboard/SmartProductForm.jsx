import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DynamicFormSwitcher from '../../components/forms/DynamicFormSwitcher';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';

const SmartProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const handleSuccess = (product) => {
    console.log('Product saved successfully:', product);
    // Navigate back to the appropriate product management page
    navigate('/dashboard/products');
  };

  const handleBack = () => {
    navigate('/dashboard/products');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditMode ? 'Edit Product' : 'Create New Product - Updated'}
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              The form type will be automatically selected based on your category choice
            </p>
          </div>
        </div>

        {/* Smart Form Wrapper */}
        <DynamicFormSwitcher
          id={id}
          onSuccess={handleSuccess}
          className="shadow-xl"
        />

        {/* Instructions for users */}
        {!isEditMode && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              💡 How it works
            </h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>
                <strong>Smart Form Selection:</strong> The system automatically detects the appropriate form type based on your category selection.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                    <span className="font-semibold">Food & Drinks</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Restaurant items, beverages, snacks, and food-related products
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                    <span className="font-semibold">Services</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Professional services, consultations, repairs, and maintenance
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                    <span className="font-semibold">Regular Products</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    General merchandise, electronics, clothing, books, etc.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartProductForm;