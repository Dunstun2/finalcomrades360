import React, { useState, useEffect } from 'react';
import { resolveImageUrl, FALLBACK_IMAGE } from '../../utils/imageUtils';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from '../../components/ui/use-toast';
import { productApi } from '../../services/api';
import { FaArrowLeft, FaPause, FaCalendarAlt, FaExclamationTriangle } from 'react-icons/fa';


const SuspendProduct = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState(null);
  const [formData, setFormData] = useState({
    reason: '',
    duration: '',
    durationUnit: 'days',
    additionalNotes: ''
  });

  useEffect(() => {
    // Get product data from sessionStorage
    const suspendProductData = sessionStorage.getItem('suspend_product');
    if (suspendProductData) {
      try {
        const parsedProduct = JSON.parse(suspendProductData);
        setProduct(parsedProduct);
      } catch (error) {
        console.error('Error parsing suspend product data:', error);
        navigate('/dashboard/products');
      }
    } else {
      navigate('/dashboard/products');
    }
  }, [navigate]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.reason.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a reason for suspension',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.duration || parseInt(formData.duration) <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a valid suspension duration',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const suspensionData = {
        reason: formData.reason.trim(),
        duration: parseInt(formData.duration),
        durationUnit: formData.durationUnit,
        additionalNotes: formData.additionalNotes.trim(),
        productId: product.id
      };

      await productApi.suspend(product.id, suspensionData);

      toast({
        title: 'Success',
        description: 'Product suspended successfully. Notification sent to seller.',
      });

      // Clear session storage and navigate back
      sessionStorage.removeItem('suspend_product');
      navigate('/dashboard/products');

    } catch (error) {
      console.error('Error suspending product:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to suspend product',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    sessionStorage.removeItem('suspend_product');
    navigate('/dashboard/products');
  };

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={handleCancel}
                className="mr-4 p-2 rounded-full hover:bg-gray-100"
                aria-label="Go back"
              >
                <FaArrowLeft className="text-lg text-gray-500" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Suspend Product</h1>
                <p className="text-gray-600">Temporarily suspend a product with reason and duration</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Information */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Information</h2>

              {/* Product Image */}
              <div className="mb-4">
                <img
                  src={product.images?.[0] ? resolveImageUrl(product.images[0]) : '/placeholder.jpg'}
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  onError={(e) => { e.target.src = FALLBACK_IMAGE; }}
                />
              </div>

              {/* Product Details */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Product Name</label>
                  <p className="text-gray-900 font-medium">{product.name}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Seller</label>
                  <p className="text-gray-900">{product.Seller?.name || product.seller?.name || 'Unknown'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Current Price</label>
                  <p className="text-gray-900 font-semibold">KES {product.basePrice?.toLocaleString()}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p className="text-gray-900">{product.Category?.name || product.category?.name || 'Uncategorized'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Stock</label>
                  <p className="text-gray-900">{product.stock} units</p>
                </div>
              </div>
            </div>
          </div>

          {/* Suspension Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-6">
                <div className="bg-orange-100 p-3 rounded-full mr-3">
                  <FaPause className="text-orange-600 text-xl" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Suspension Details</h2>
                  <p className="text-gray-600">Provide reason and duration for product suspension</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Suspension Reason */}
                <div>
                  <Label htmlFor="reason" className="text-base font-medium">
                    Reason for Suspension *
                  </Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => handleInputChange('reason', e.target.value)}
                    placeholder="Please provide a detailed reason for suspending this product..."
                    rows={4}
                    className="mt-2"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    This reason will be communicated to the seller
                  </p>
                </div>

                {/* Suspension Duration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration" className="text-base font-medium">
                      Suspension Duration *
                    </Label>
                    <div className="flex mt-2">
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        value={formData.duration}
                        onChange={(e) => handleInputChange('duration', e.target.value)}
                        placeholder="Enter duration"
                        className="rounded-r-none"
                        required
                      />
                      <select
                        value={formData.durationUnit}
                        onChange={(e) => handleInputChange('durationUnit', e.target.value)}
                        className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-sm"
                      >
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Expected End Date</Label>
                    <div className="flex items-center mt-2 p-3 bg-gray-50 rounded-md">
                      <FaCalendarAlt className="text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">
                        {formData.duration && formData.durationUnit ? (
                          (() => {
                            const now = new Date();
                            const duration = parseInt(formData.duration);
                            switch (formData.durationUnit) {
                              case 'hours':
                                now.setHours(now.getHours() + duration);
                                break;
                              case 'days':
                                now.setDate(now.getDate() + duration);
                                break;
                              case 'weeks':
                                now.setDate(now.getDate() + duration * 7);
                                break;
                              case 'months':
                                now.setMonth(now.getMonth() + duration);
                                break;
                            }
                            return now.toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          })()
                        ) : (
                          'Select duration to see end date'
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <Label htmlFor="additionalNotes" className="text-base font-medium">
                    Additional Notes (Optional)
                  </Label>
                  <Textarea
                    id="additionalNotes"
                    value={formData.additionalNotes}
                    onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                    placeholder="Any additional information or instructions for the seller..."
                    rows={3}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    These notes will also be shared with the seller
                  </p>
                </div>

                {/* Warning Message */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex">
                    <FaExclamationTriangle className="text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-amber-800">Important Notice</h3>
                      <div className="mt-2 text-sm text-amber-700">
                        <ul className="list-disc list-inside space-y-1">
                          <li>The product will be hidden from customer view during suspension</li>
                          <li>The seller will receive a notification with the suspension details</li>
                          <li>The seller can appeal the suspension through their dashboard</li>
                          <li>Product will automatically become active again after the suspension period</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>
                        Suspending...
                      </>
                    ) : (
                      <>
                        <FaPause className="mr-2" />
                        Suspend Product
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuspendProduct;